import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { users, profiles, badges, tracks, viewLogs, links, templates, discordEvents, tickets, ticketMessages, botSettings, announcements, isStaff, canManageBadges, canGiveBadges, canAccessBotSettings, canManageTeam, canManageWebsite, ROLE_HIERARCHY } from "@shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { registerUploadRoutes } from "./localUploads";
import rateLimit from "express-rate-limit";

// Helper: check if user is staff
const isAdminOrStaff = (role: string) => isStaff(role);

// ─── Per-route rate limiters ───────────────────────────────────────────────────
// keyGenerator uses userId when available; falls back to "anon" for guests
// validate.ip=false suppresses IPv6 handler warning since we don't use req.ip
const makeKeyGen = (req: any) => (req.user as any)?.id?.toString() ?? "anon";

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { error: "Too many messages. Please slow down." },
  skip: () => process.env.NODE_ENV !== "production",
});

const ticketCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { message: "Too many tickets. Please wait before opening another." },
});

const ticketMsgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { message: "Sending too fast. Please slow down." },
});

// Force-logout a user by deleting their sessions from the store
async function forceLogoutUser(userId: number) {
  try {
    await pool.query(
      `DELETE FROM session WHERE sess->'passport'->>'user' = $1`,
      [String(userId)]
    );
  } catch (_) {}
}

// Protected badge names that cannot be deleted
const PROTECTED_BADGES = ["Premium", "Rich", "Silver Donator", "Lovely Donator"];

// Shop products definition
export const SHOP_PRODUCTS = [
  {
    id: "premium",
    name: "Premium",
    price: 4.99,
    icon: "💎",
    description: "Access all premium features of Hexed.",
    features: [
      "Remove Hexed watermark from your profile",
      "Unlock advanced visual effects (retro, glitch, VHS, oldtv, night)",
      "Premium badge on your profile",
      "Priority support",
      "Unlimited music tracks",
      "Custom badge slot",
      "Early access to new features",
    ],
    badgeName: "Premium",
    grantsPremium: true,
    color: "#9333ea",
    bgColor: "#1e1040",
  },
  {
    id: "rich-badge",
    name: "Rich Badge",
    price: 20.00,
    icon: "💸",
    description: "Show your richness on Hexed.",
    features: [
      "Show your richness with the rich badge",
      "Support Hexed with your contribution",
      "Help us pay for servers and keep the lights on",
      "Invest in the future of us with your donation",
    ],
    badgeName: "Rich",
    grantsPremium: false,
    color: "#f59e0b",
    bgColor: "#1c1200",
  },
  {
    id: "silver-donator",
    name: "Silver Donator",
    price: 1.99,
    icon: "🥈",
    description: "Support Hexed and get the Silver Donator badge.",
    features: [
      "Silver Donator badge on your profile",
      "Support Hexed development",
      "Help keep the servers running",
    ],
    badgeName: "Silver Donator",
    grantsPremium: false,
    color: "#94a3b8",
    bgColor: "#0f1622",
  },
  {
    id: "lovely-donator",
    name: "Lovely Donator",
    price: 3.99,
    icon: "💝",
    description: "Show your love for Hexed with this special badge.",
    features: [
      "Lovely Donator badge on your profile",
      "Show your support with a beautiful badge",
      "Help the community grow",
    ],
    badgeName: "Lovely Donator",
    grantsPremium: false,
    color: "#ec4899",
    bgColor: "#1a0a10",
  },
  {
    id: "alias-slot",
    name: "+1 Alias Slot",
    price: 1.00,
    icon: "🔗",
    description: "Add an extra alias to your profile URL.",
    features: [
      "+1 additional alias slot for your profile",
      "Be found under a custom URL like /yourchoice",
      "Great for personal branding",
    ],
    badgeName: null,
    grantsPremium: false,
    color: "#6366f1",
    bgColor: "#0d0d1c",
  },
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Load saved bot settings from DB into process.env before auth setup
  try {
    const rows = await pool.query("SELECT key, value FROM bot_settings");
    for (const row of rows.rows) {
      if (!row.value) continue;
      // Skip DISCORD_CALLBACK_URL if it's a full Discord OAuth URL (accidentally saved)
      if (row.key === "DISCORD_CALLBACK_URL") {
        const val: string = row.value;
        if (val.startsWith("https://discord.com") || !val.includes("/auth/discord/callback")) {
          console.warn("[startup] Ignoring invalid DISCORD_CALLBACK_URL stored in DB:", val.slice(0, 60));
          continue;
        }
      }
      process.env[row.key] = row.value;
    }
  } catch (_) {} // table may not exist yet on first boot

  setupAuth(app);
  registerUploadRoutes(app);

  // Auto-create templates table if needed
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        preview_image_url TEXT,
        profile_snapshot JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        uses INTEGER DEFAULT 0
      )
    `);
  } catch (_) {}

  // ─── Auto-migrate columns ────────────────────────────────────────────────
  try {
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_order INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS role_id TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_badges JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS easter_egg_claimed BOOLEAN DEFAULT false`);
  } catch (_) {}

  // Auto-seed admin user
  const adminUsername = "abdz1";
  const adminEmail = "admin@example.com";
  const existingAdmin = await storage.getUserByUsername(adminUsername);
  const existingEmail = await db.select().from(users).where(eq(users.email, adminEmail));

  if (!existingAdmin && existingEmail.length === 0) {
    const hashedPassword = await bcrypt.hash("man1", 10);
    const [user] = await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      email: adminEmail,
      role: "owner",
    }).returning();
    await db.insert(profiles).values({ userId: user.id, displayName: "abdz1", bio: "Platform Owner" });
  }

  // Auto-seed protected badges
  for (const product of SHOP_PRODUCTS) {
    if (!product.badgeName) continue;
    const existing = await db.select().from(badges).where(eq(badges.name, product.badgeName));
    if (existing.length === 0) {
      const iconMap: Record<string, string> = {
        "Premium": "💎",
        "Rich": "💸",
        "Silver Donator": "🥈",
        "Lovely Donator": "💝",
      };
      const colorMap: Record<string, string> = {
        "Premium": "#9333ea",
        "Rich": "#f59e0b",
        "Silver Donator": "#94a3b8",
        "Lovely Donator": "#ec4899",
      };
      await db.insert(badges).values({
        name: product.badgeName,
        icon: iconMap[product.badgeName] || "⭐",
        color: colorMap[product.badgeName] || "#F97316",
        isProtected: true,
      });
    }
  }

  // ─── Admin: Databank ───────────────────────────────────────────────────────

  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role === "user") return res.sendStatus(403);
    const requestingRole = (req.user as any).role;
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);

    const { role, badges: userBadges, maxTracks, maxTags, isPremium, maxAliases, alias: adminAlias } = req.body;

    if (targetId === (req.user as any).id && role !== undefined) {
      return res.status(400).json({ message: "Cannot modify your own role" });
    }
    if (targetUser.role === "owner" && role !== undefined) {
      return res.status(403).json({ message: "Owner role cannot be changed" });
    }
    if (role === "owner") return res.status(403).json({ message: "Cannot promote to owner" });
    if (role === "admin" && requestingRole !== "owner") return res.status(403).json({ message: "Only owners can promote to admin" });

    const updateObj: any = {};
    if (userBadges !== undefined) updateObj.badges = userBadges;
    if (maxTracks !== undefined) updateObj.maxTracks = maxTracks;
    if (maxTags !== undefined) updateObj.maxTags = maxTags;
    if (maxAliases !== undefined) updateObj.maxAliases = maxAliases;
    if (role !== undefined) updateObj.role = role;
    if (adminAlias !== undefined) {
      if (adminAlias === null || adminAlias === "") {
        updateObj.alias = null;
      } else {
        const clean = (adminAlias as string).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
        if (clean.length >= 2 && clean.length <= 30) {
          updateObj.alias = clean;
        }
      }
    }
    if (isPremium !== undefined) {
      updateObj.isPremium = isPremium;
      const curr: string[] = (targetUser.badges as string[]) || [];
      if (isPremium && !curr.includes("Premium")) {
        updateObj.badges = userBadges !== undefined ? userBadges : [...curr, "Premium"];
      } else if (!isPremium && curr.includes("Premium")) {
        updateObj.badges = userBadges !== undefined ? userBadges : curr.filter((b: string) => b !== "Premium");
      }
    }

    const [updated] = await db.update(users).set(updateObj).where(eq(users.id, targetId)).returning();

    if (role === "banned") {
      await forceLogoutUser(targetId);
    }

    res.json(updated);
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "owner") return res.status(403).json({ message: "Cannot delete owner" });
    if (targetId === (req.user as any).id) return res.status(400).json({ message: "Cannot delete yourself" });
    await db.delete(tracks).where(eq(tracks.userId, targetId));
    await db.delete(viewLogs).where(eq(viewLogs.userId, targetId));
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, targetId));
    if (profile) await db.delete(links).where(eq(links.profileId, profile.id));
    await db.delete(profiles).where(eq(profiles.userId, targetId));
    await db.delete(users).where(eq(users.id, targetId));
    res.sendStatus(200);
  });


  // ─── Tracks ───────────────────────────────────────────────────────────────

  app.get("/api/tracks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userTracks = await db.select().from(tracks).where(eq(tracks.userId, (req.user as any).id));
    res.json(userTracks);
  });

  app.post("/api/tracks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const isPremium = user.isPremium;
    const maxTracks = isPremium ? 20 : (user.maxTracks || 3);
    const currentTracks = await db.select().from(tracks).where(eq(tracks.userId, user.id));
    if (currentTracks.length >= maxTracks) {
      return res.status(400).send("Max tracks reached");
    }
    const [newTrack] = await db.insert(tracks).values({ ...req.body, userId: user.id }).returning();
    res.json(newTrack);
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.delete(tracks).where(sql`${tracks.id} = ${parseInt(req.params.id)} AND ${tracks.userId} = ${(req.user as any).id}`);
    res.sendStatus(200);
  });

  // ─── Badges ───────────────────────────────────────────────────────────────

  app.get("/api/badges", async (_req, res) => {
    const allBadges = await db.select().from(badges);
    res.json(allBadges);
  });

  app.post("/api/admin/badges", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const BADGE_ALLOWED_FIELDS = ["name", "icon", "color", "description", "howToGet", "visibleTo", "available", "roleId"];
    const insertData: Record<string, any> = {};
    for (const k of BADGE_ALLOWED_FIELDS) {
      if (req.body[k] !== undefined) insertData[k] = req.body[k];
    }
    const [newBadge] = await db.insert(badges).values(insertData).returning();
    res.json(newBadge);
  });

  app.patch("/api/admin/badges/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canGiveBadges((req.user as any).role)) return res.sendStatus(403);
    const userRole = (req.user as any).role;
    const badgeId = parseInt(req.params.id);
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId));
    if (!badge) return res.sendStatus(404);
    const BADGE_ALLOWED_FIELDS = ["name", "icon", "color", "description", "howToGet", "visibleTo", "available", "roleId", "badgeOrder"];
    const rawData = req.body;
    const updateData: Record<string, any> = {};
    for (const k of BADGE_ALLOWED_FIELDS) {
      if (rawData[k] !== undefined) updateData[k] = rawData[k];
    }
    if (badge.isProtected) delete updateData.isProtected;
    // Moderators can only update the visibleTo (badge assignment), not create/delete
    if (!canManageBadges(userRole)) {
      const allowed = ["visibleTo"];
      for (const k of Object.keys(updateData)) {
        if (!allowed.includes(k)) delete updateData[k];
      }
    }
    if (Object.keys(updateData).length === 0) return res.json(badge);
    const [updated] = await db.update(badges).set(updateData).where(eq(badges.id, badgeId)).returning();
    res.json(updated);
  });

  app.delete("/api/admin/badges/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const badgeId = parseInt(req.params.id);
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId));
    if (!badge) return res.sendStatus(404);
    if (badge.isProtected) return res.status(403).json({ message: `The "${badge.name}" badge is protected and cannot be deleted.` });
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      const userBadges = (user.badges as string[]) || [];
      if (userBadges.includes(badge.name)) {
        await db.update(users).set({ badges: userBadges.filter(b => b !== badge.name) }).where(eq(users.id, user.id));
      }
    }
    await db.delete(badges).where(eq(badges.id, badgeId));
    res.sendStatus(200);
  });

  // Badge reorder
  app.post("/api/admin/badges/reorder", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const { order } = req.body; // array of { id, badgeOrder } objects OR badge IDs
    if (!Array.isArray(order)) return res.status(400).json({ message: "order array required" });
    for (const item of order) {
      if (typeof item === "object" && item.id !== undefined) {
        await db.update(badges).set({ badgeOrder: item.badgeOrder }).where(eq(badges.id, item.id));
      } else {
        const idx = order.indexOf(item);
        await db.update(badges).set({ badgeOrder: idx }).where(eq(badges.id, item));
      }
    }
    res.json({ ok: true });
  });

  // Fetch Discord roles from guild
  app.get("/api/admin/discord-roles", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!botToken || !guildId) return res.status(400).json({ message: "Bot token or Guild ID not configured", roles: [] });
    try {
      const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!r.ok) return res.status(400).json({ message: "Failed to fetch roles", roles: [] });
      const data = await r.json() as any[];
      res.json({ roles: data.map((role: any) => ({ id: role.id, name: role.name, color: role.color })) });
    } catch {
      res.status(500).json({ message: "Error fetching Discord roles", roles: [] });
    }
  });

  // User: toggle badge visibility
  app.post("/api/user/badge-visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { badgeName, hidden } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    const hiddenBadges: string[] = (user as any).hiddenBadges || [];
    let updated: string[];
    if (hidden) {
      updated = hiddenBadges.includes(badgeName) ? hiddenBadges : [...hiddenBadges, badgeName];
    } else {
      updated = hiddenBadges.filter(b => b !== badgeName);
    }
    await pool.query(`UPDATE users SET hidden_badges = $1 WHERE id = $2`, [JSON.stringify(updated), userId]);
    res.json({ hiddenBadges: updated });
  });

  // Team management endpoints
  app.get("/api/admin/team", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    const teamMembers = allUsers.filter(u => isStaff(u.role));
    const discordUsers = allUsers.filter(u => u.discordId && !isStaff(u.role));
    res.json({ team: teamMembers, discordUsers });
  });

  app.post("/api/admin/team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingRole = (req.user as any).role;
    if (!canManageTeam(requestingRole)) return res.status(403).json({ message: "Only administrators+ can manage team" });
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ message: "userId and role required" });
    const validRoles = ["support", "moderator", "administrator", "developer", "owner"];
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
    // Check hierarchy
    const requestingLevel = ROLE_HIERARCHY[requestingRole] || 0;
    const targetLevel = ROLE_HIERARCHY[role] || 0;
    if (targetLevel >= requestingLevel) return res.status(403).json({ message: "Cannot assign a role equal or higher than your own" });
    const [target] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!target) return res.sendStatus(404);
    if (target.role === "owner") return res.status(403).json({ message: "Cannot modify the owner" });
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, parseInt(userId))).returning();
    res.json(updated);
  });

  app.delete("/api/admin/team/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingRole = (req.user as any).role;
    if (!canManageTeam(requestingRole)) return res.status(403).json({ message: "Cannot manage team" });
    const targetId = parseInt(req.params.id);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    if (target.role === "owner") return res.status(403).json({ message: "Cannot remove owner" });
    const requestingLevel = ROLE_HIERARCHY[requestingRole] || 0;
    const targetLevel = ROLE_HIERARCHY[target.role] || 0;
    if (targetLevel >= requestingLevel) return res.status(403).json({ message: "Cannot remove someone equal or higher rank" });
    const [updated] = await db.update(users).set({ role: "user" }).where(eq(users.id, targetId)).returning();
    res.json(updated);
  });

  // ─── Profile ──────────────────────────────────────────────────────────────

  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!profile) [profile] = await db.insert(profiles).values({ userId }).returning();
    res.json(profile);
  });

  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const user = req.user as any;
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!existing) await db.insert(profiles).values({ userId });
    
    const updateData = { ...req.body };
    if (!user.isPremium && updateData.showWatermark === false) {
      updateData.showWatermark = true;
    }

    const [updated] = await db.update(profiles).set(updateData).where(eq(profiles.userId, userId)).returning();
    res.json(updated);
  });

  // ─── Links ────────────────────────────────────────────────────────────────

  app.get("/api/links", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.json([]);
    const userLinks = await db.select().from(links).where(eq(links.profileId, profile.id));
    res.json(userLinks.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
  });

  app.post("/api/links", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) [profile] = await db.insert(profiles).values({ userId: (req.user as any).id }).returning();
    const existingLinks = await db.select().from(links).where(eq(links.profileId, profile.id));
    const [newLink] = await db.insert(links).values({ ...req.body, profileId: profile.id, order: existingLinks.length }).returning();
    res.json(newLink);
  });

  app.patch("/api/links/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.sendStatus(403);
    const [updated] = await db.update(links)
      .set(req.body)
      .where(and(eq(links.id, parseInt(req.params.id)), eq(links.profileId, profile.id)))
      .returning();
    res.json(updated);
  });

  app.delete("/api/links/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.sendStatus(403);
    await db.delete(links).where(and(eq(links.id, parseInt(req.params.id)), eq(links.profileId, profile.id)));
    res.sendStatus(200);
  });

  // ─── Alias Management ─────────────────────────────────────────────────────

  app.get("/api/user/alias", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [user] = await db.select().from(users).where(eq(users.id, (req.user as any).id));
    res.json({ alias: user?.alias || null, maxAliases: user?.maxAliases ?? 1 });
  });

  app.patch("/api/user/alias", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { alias } = req.body;
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    if (alias !== null && alias !== "") {
      const clean = (alias as string).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
      if (!clean) return res.status(400).json({ message: "Invalid alias" });
      if (clean.length < 2 || clean.length > 30) return res.status(400).json({ message: "Alias must be 2-30 characters" });
      const reserved = ["dashboard", "login", "register", "shop", "tos", "api", "admin", "profile", "options", "miscellaneous", "extras", "markdowns", "templates"];
      if (reserved.includes(clean)) return res.status(400).json({ message: "This alias is reserved" });
      const [existingUser] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
      if (existingUser) return res.status(400).json({ message: "This alias is already taken" });
      const [existingAlias] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
      if (existingAlias) return res.status(400).json({ message: "This alias is already taken" });
      await db.update(users).set({ alias: clean }).where(eq(users.id, userId));
      return res.json({ alias: clean });
    }

    await db.update(users).set({ alias: null }).where(eq(users.id, userId));
    res.json({ alias: null });
  });

  // ─── Views History ─────────────────────────────────────────────────────────

  app.get("/api/user/views-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM view_logs
        WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [userId]);
      
      // Fill in missing days with 0
      const today = new Date();
      const days: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const found = result.rows.find((r: any) => r.date?.toISOString?.()?.split("T")?.[0] === dateStr || r.date === dateStr);
        days.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
      }
      res.json(days);
    } catch (e) {
      res.json([]);
    }
  });

  // ─── Shop ─────────────────────────────────────────────────────────────────

  app.get("/api/shop/products", async (_req, res) => {
    res.json(SHOP_PRODUCTS);
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  app.get("/api/templates", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM templates ORDER BY created_at DESC LIMIT 50
      `);
      res.json(result.rows);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { name, description, previewImageUrl, profileSnapshot } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Template name required" });
    try {
      const result = await pool.query(`
        INSERT INTO templates (user_id, username, name, description, preview_image_url, profile_snapshot)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [user.id, user.username, name.trim(), description || "", previewImageUrl || null, JSON.stringify(profileSnapshot || {})]);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      res.json(result.rows[0]);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  app.post("/api/templates/:id/use", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      const tmpl = result.rows[0];
      const snapshot = tmpl.profile_snapshot || {};
      
      // Apply template settings to user's profile
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!existing) await db.insert(profiles).values({ userId });
      
      // Merge settings (keep user's own avatar/banner/bio/links, apply visual settings)
      const settingsToApply = { ...snapshot };
      delete settingsToApply.avatarUrl;
      delete settingsToApply.bannerUrl;
      delete settingsToApply.bio;
      delete settingsToApply.displayName;
      delete settingsToApply.location;
      
      const updateData: any = {};
      if (settingsToApply.themeColor) updateData.themeColor = settingsToApply.themeColor;
      if (settingsToApply.backgroundUrl) updateData.backgroundUrl = settingsToApply.backgroundUrl;
      if (settingsToApply.backgroundVideoUrl) updateData.backgroundVideoUrl = settingsToApply.backgroundVideoUrl;
      if (settingsToApply.settings) updateData.settings = settingsToApply.settings;
      
      await db.update(profiles).set(updateData).where(eq(profiles.userId, userId));
      
      // Increment template uses
      await pool.query(`UPDATE templates SET uses = uses + 1 WHERE id = $1`, [req.params.id]);
      
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to apply template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      if (result.rows[0].user_id !== userId && (req.user as any).role === "user") return res.sendStatus(403);
      await pool.query(`DELETE FROM templates WHERE id = $1`, [req.params.id]);
      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  // ─── Public Profile ───────────────────────────────────────────────────────

  app.get("/api/public/profile/:username", async (req, res) => {
    let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
    if (!user) {
      const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
      if (aliasUser) user = aliasUser;
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "banned") {
      const { password: _, ...safeUser } = user as any;
      return res.status(200).json({ user: safeUser, profile: null, links: [], isBanned: true });
    }
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (!profile) [profile] = await db.insert(profiles).values({ userId: user.id }).returning();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipString = (Array.isArray(ip) ? ip[0] : ip || 'unknown').split(',')[0].trim();
    const [existingView] = await db.select().from(viewLogs)
      .where(and(eq(viewLogs.userId, user.id), eq(viewLogs.ipAddress, ipString))).limit(1);

    if (!existingView) {
      await db.insert(viewLogs).values({ userId: user.id, ipAddress: ipString });
      await db.update(users).set({ views: (user.views || 0) + 1 }).where(eq(users.id, user.id));
    }

    const profileLinks = await db.select().from(links)
      .where(and(eq(links.profileId, profile.id), eq(links.enabled, true)));
    profileLinks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const { password: _, ...safeUser } = user as any;
    res.json({ user: safeUser, profile, links: profileLinks.map(l => ({ ...l, position: l.order })) });
  });

  app.get("/api/public/tracks/:username", async (req, res) => {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
    if (!user) return res.json([]);
    const userTracks = await db.select().from(tracks).where(eq(tracks.userId, user.id));
    res.json(userTracks.sort((a, b) => (a.order || 0) - (b.order || 0)));
  });

  app.get("/api/public/members", async (_req, res) => {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
    }).from(users).limit(100);
    const result = [];
    for (const u of allUsers) {
      const [profile] = await db.select({ avatarUrl: profiles.avatarUrl, displayName: profiles.displayName })
        .from(profiles).where(eq(profiles.userId, u.id));
      result.push({ id: u.id, username: u.username, displayName: profile?.displayName || u.username, avatarUrl: profile?.avatarUrl || null });
    }
    res.json(result);
  });

  app.get("/api/public/user-count", async (_req, res) => {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
    res.json({ count: Number(row?.count ?? 0) });
  });

  // ─── Discord Invite Proxy ─────────────────────────────────────────
  app.get("/api/discord-invite/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
      if (!r.ok) return res.status(404).json({ error: "Invite not found" });
      const data = await r.json() as any;
      res.json({
        name: data.guild?.name || null,
        icon: data.guild?.icon
          ? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png?size=128`
          : null,
        memberCount: data.approximate_member_count || null,
        onlineCount: data.approximate_presence_count || null,
        code: data.code || code,
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // ─── Username Change ──────────────────────────────────────────────
  app.patch("/api/user/username", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { username } = req.body;
    if (!username || typeof username !== "string") return res.status(400).json({ message: "Username required" });
    const clean = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (clean.length < 3 || clean.length > 30) return res.status(400).json({ message: "Username must be 3–30 characters (letters, numbers, _ -)" });
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, clean));
    if (taken && taken.id !== (req.user as any).id) return res.status(400).json({ message: "Username already taken" });
    const [updated] = await db.update(users).set({ username: clean }).where(eq(users.id, (req.user as any).id)).returning();
    res.json(updated);
  });

  // ─── Admin Badges: Sync with Discord ──────────────────────────────
  app.post("/api/admin/badges/sync-discord", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role === "user") return res.sendStatus(403);
    try {
      const allBadges = await db.select().from(badges);
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        const badgeLines = allBadges.map(b => {
          const vis = !b.visibleTo || b.visibleTo === "all" ? "All members" : `Custom: ${b.visibleTo}`;
          return `${b.icon} **${b.name}** — ${b.description || "No description"} | Visible: ${vis}`;
        }).join("\n");
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "🏅 Hexed Badge Sync",
              description: badgeLines || "No badges found.",
              color: 0xF97316,
              footer: { text: `${allBadges.length} badge(s) synced • Hexed` },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
      res.json({ synced: allBadges.length });
    } catch (e) {
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // ─── Admin Discord Events ─────────────────────────────────────────
  app.get("/api/admin/discord-events", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const events = await db.select().from(discordEvents).orderBy(desc(discordEvents.createdAt)).limit(100);
    res.json(events);
  });

  // ─── Auto-create new tables ──────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        discord_id TEXT,
        discord_username TEXT,
        discord_avatar TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        claimed_by_user_id INTEGER REFERENCES users(id),
        claimed_by_discord_username TEXT,
        claimed_by_discord_avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) NOT NULL,
        sender_type TEXT NOT NULL DEFAULT 'user',
        sender_name TEXT,
        sender_avatar TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── Bot Settings (Admin) ─────────────────────────────────────────────────
  app.get("/api/admin/bot-settings", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const rows = await db.select().from(botSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    // Also return current env values as defaults
    const defaults: Record<string, string> = {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
      DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL || "",
      DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",
      DISCORD_LOGIN_ENABLED: process.env.DISCORD_LOGIN_ENABLED ?? "true",
    };
    res.json({ ...defaults, ...settings });
  });

  app.post("/api/admin/bot-settings", async (req, res) => {
    if (!req.isAuthenticated() || !canAccessBotSettings((req.user as any).role)) return res.sendStatus(403);
    const allowed = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_BOT_TOKEN", "DISCORD_CALLBACK_URL", "DISCORD_GUILD_ID", "DISCORD_LOGIN_ENABLED"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        let val = String(req.body[key]);

        // Validate DISCORD_CALLBACK_URL — reject full Discord OAuth URLs that were accidentally pasted
        if (key === "DISCORD_CALLBACK_URL" && val) {
          if (val.startsWith("https://discord.com") || !val.includes("/auth/discord/callback")) {
            return res.status(400).json({ message: "Invalid Callback URL. It must end with /auth/discord/callback on your own domain, not a discord.com URL." });
          }
          // Strip any query params — only the bare URL is needed
          try { val = val.split("?")[0]; } catch (_) {}
        }

        const existing = await db.select().from(botSettings).where(eq(botSettings.key, key));
        if (existing.length > 0) {
          await db.update(botSettings).set({ value: val, updatedAt: new Date() }).where(eq(botSettings.key, key));
        } else {
          await db.insert(botSettings).values({ key, value: val });
        }
        // Also update process.env for the running process
        process.env[key] = val;
      }
    }
    res.json({ ok: true });
  });

  // ─── Tickets ──────────────────────────────────────────────────────────────
  // Create ticket (any user, Discord login required)
  app.post("/api/tickets", ticketCreateLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.discordId) return res.status(400).json({ message: "Discord login required to open a ticket" });
    const { firstMessage } = req.body;
    if (!firstMessage?.trim()) return res.status(400).json({ message: "Message required" });

    const [ticket] = await db.insert(tickets).values({
      userId: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername || user.username,
      discordAvatar: user.discordAvatar,
      status: "open",
    }).returning();

    await db.insert(ticketMessages).values({
      ticketId: ticket.id,
      senderType: "user",
      senderName: user.discordUsername || user.username,
      senderAvatar: user.discordAvatar,
      content: firstMessage.trim(),
    });

    res.json(ticket);
  });

  // Get my tickets
  app.get("/api/tickets/mine", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const myTickets = await db.select().from(tickets).where(eq(tickets.userId, user.id)).orderBy(desc(tickets.createdAt));
    res.json(myTickets);
  });

  // Get single ticket messages (user or admin)
  app.get("/api/tickets/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);
    const isAdmin = isStaff(user.role);
    if (!isAdmin && ticket.userId !== user.id) return res.sendStatus(403);
    const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
    res.json({ ticket, messages: msgs });
  });

  // Send message to ticket
  app.post("/api/tickets/:id/messages", ticketMsgLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);
    const userIsStaff = isStaff(user.role);
    if (!userIsStaff && ticket.userId !== user.id) return res.sendStatus(403);
    if (ticket.status === "closed") return res.status(400).json({ message: "Ticket is closed" });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });

    const senderType = userIsStaff ? "support" : "user";
    const [msg] = await db.insert(ticketMessages).values({
      ticketId,
      senderType,
      senderName: user.discordUsername || user.username,
      senderAvatar: user.discordAvatar,
      content: content.trim(),
    }).returning();

    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    res.json(msg);
  });

  // Admin: get all tickets
  app.get("/api/admin/tickets", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.updatedAt));
    res.json(allTickets);
  });

  // Admin: claim ticket
  app.post("/api/tickets/:id/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);

    await db.update(tickets).set({
      claimedByUserId: user.id,
      claimedByDiscordUsername: user.discordUsername || user.username,
      claimedByDiscordAvatar: user.discordAvatar,
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticketId));

    const claimMsg = `**${user.discordUsername || user.username}** will be assisting you today, how can our Support help you?`;
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "Support",
      senderAvatar: null,
      content: claimMsg,
    });

    res.json({ ok: true });
  });

  // Admin: close ticket
  app.post("/api/tickets/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.update(tickets).set({ status: "closed", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "System",
      content: "This ticket has been closed.",
    });
    res.json({ ok: true });
  });

  // Admin: reopen ticket
  app.post("/api/tickets/:id/reopen", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.update(tickets).set({ status: "open", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "System",
      content: "This ticket has been reopened.",
    });
    res.json({ ok: true });
  });

  // Admin: delete ticket
  app.delete("/api/tickets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticketId));
    await db.delete(tickets).where(eq(tickets.id, ticketId));
    res.json({ ok: true });
  });

  app.post("/api/ai/chat", aiChatLimiter, async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
    const systemPrompt = `You are Hex, a short and friendly AI support assistant for Hexed — a free customizable link-in-bio profile platform. Help users navigate the site and customize their profiles. Keep answers brief (2-4 sentences max).

SITE NAVIGATION:
- Dashboard (/dashboard): Main control panel with tabs: Profile, Options, Miscellaneous, Extras, Markdowns
- Profile tab: change display name, bio, location, avatar, banner image, social links
- Options tab: change background (upload image/video or URL), theme/accent color, visual effects (particles, snow, rain, fireflies, coins, cursor trails), card tilt effect
- Miscellaneous tab: enable music player (upload tracks or YouTube/Spotify/SoundCloud embed), view counter, UID display
- Extras tab: advanced social features
- Markdowns tab: add custom HTML/markdown content sections
- Shop (/shop): buy Premium (€4.99 one-time), badges, extra alias slots
- Premium unlocks: removes watermark, unlocks advanced effects, up to 20 music tracks, exclusive badge
- Templates (/templates): browse and apply pre-made profile designs
- Public profile: accessible at hexed.app/[username]

When users ask how to change/find something, tell them exactly which tab/section to go to. Be helpful and concise.`;

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer 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`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      const data = await groqRes.json() as any;
      if (data.choices?.[0]?.message?.content) {
        res.json({ reply: data.choices[0].message.content });
      } else {
        res.status(500).json({ error: "No response from AI" });
      }
    } catch (e) {
      res.status(500).json({ error: "AI unavailable" });
    }
  });

  // ─── Auto-create announcements table ─────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'info',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── Announcements (public read) ───────────────────────────────────────────
  app.get("/api/announcements", async (_req, res) => {
    try {
      const rows = await db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt));
      res.json(rows);
    } catch {
      res.json([]);
    }
  });

  // ─── Announcements CRUD (dev/owner only) ───────────────────────────────────
  app.get("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const { title, content, type } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });
    const [row] = await db.insert(announcements).values({ title: title.trim(), content: content || "", type: type || "info", active: true }).returning();
    res.json(row);
  });

  app.patch("/api/admin/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const { title, content, type, active } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (type !== undefined) update.type = type;
    if (active !== undefined) update.active = active;
    const [row] = await db.update(announcements).set(update).where(eq(announcements.id, id)).returning();
    res.json(row);
  });

  app.delete("/api/admin/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    await db.delete(announcements).where(eq(announcements.id, parseInt(req.params.id)));
    res.sendStatus(200);
  });

  // ─── Admin: User Info (dev/owner only) ────────────────────────────────────
  app.get("/api/admin/user-info/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(req.params.id)));
    if (!user) return res.sendStatus(404);
    res.json(user);
  });

  // ─── Admin: Login as user (dev/owner only) ────────────────────────────────
  app.post("/api/admin/login-as/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    req.login(target, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.json({ ok: true, username: target.username });
    });
  });

  // ─── Discord Badge Sync ────────────────────────────────────────────────────
  app.post("/api/user/sync-discord-badges", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.discordId) return res.status(400).json({ message: "No Discord account linked" });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!botToken || !guildId) return res.status(400).json({ message: "Bot not configured" });

    try {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.discordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!memberRes.ok) return res.status(400).json({ message: "Not a member of the server" });

      const member = await memberRes.json() as any;
      const memberRoleIds: string[] = member.roles || [];

      const allBadges = await db.select().from(badges);
      const badgesWithRoles = allBadges.filter(b => b.roleId && b.roleId.trim() !== "");

      const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
      let currentBadges: string[] = (currentUser.badges as string[]) || [];
      let changed = false;

      for (const badge of badgesWithRoles) {
        const hasRole = memberRoleIds.includes(badge.roleId!);
        const hasBadge = currentBadges.includes(badge.name);
        if (hasRole && !hasBadge) {
          currentBadges = [...currentBadges, badge.name];
          changed = true;
        } else if (!hasRole && hasBadge) {
          currentBadges = currentBadges.filter(b => b !== badge.name);
          changed = true;
        }
      }

      if (changed) {
        await db.update(users).set({ badges: currentBadges }).where(eq(users.id, user.id));
      }

      res.json({ synced: true, badges: currentBadges });
    } catch (e) {
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // ─── Easter Egg Claim ─────────────────────────────────────────────────────
  app.post("/api/easter-egg/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.easterEggClaimed) return res.status(409).json({ message: "Already claimed" });
    await db.update(users).set({
      easterEggClaimed: true,
      maxTracks: (user.maxTracks || 3) + 1,
      maxTags: (user.maxTags || 5) + 1,
    }).where(eq(users.id, user.id));
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
