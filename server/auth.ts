import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as DiscordStrategy } from "passport-discord";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { db } from "./db";
import { users, profiles, discordEvents, badges } from "@shared/schema";
import { eq } from "drizzle-orm";

async function syncDiscordRoleBadges(userId: number, discordId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return;
  try {
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!memberRes.ok) return;
    const member = await memberRes.json() as any;
    const memberRoleIds: string[] = member.roles || [];
    const allBadges = await db.select().from(badges);
    const badgesWithRoles = allBadges.filter(b => b.roleId && b.roleId.trim() !== "");
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!currentUser) return;
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
      await db.update(users).set({ badges: currentBadges }).where(eq(users.id, userId));
    }
  } catch (_) {}
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const OWNER_DISCORD_IDS = ["1243269414900596787", "970654818521722881"];

// ─── Discord verify callback (shared between dynamic registrations) ────────────
const discordVerify = async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
  try {
    const discordId = profile.id;
    const discordUsername = profile.username;
    const discordGlobalName = profile.global_name || profile.username;
    const email = profile.email || `${discordId}@discord.user`;
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.png?size=256`
      : null;

    const [existing] = await db.select().from(users).where(eq(users.discordId, discordId));

    if (existing) {
      const [updated] = await db.update(users)
        .set({ discordAvatar: avatarUrl, discordUsername: discordGlobalName })
        .where(eq(users.id, existing.id))
        .returning();

      await db.insert(discordEvents).values({
        userId: existing.id,
        discordId,
        discordUsername,
        discordGlobalName,
        email: profile.email || null,
        action: "login",
        isNewUser: false,
      });

      // Sync Discord role badges (async, don't block login)
      syncDiscordRoleBadges(existing.id, discordId).catch(() => {});

      return done(null, updated);
    }

    const role = OWNER_DISCORD_IDS.includes(discordId) ? "owner" : "user";

    let baseUsername = discordUsername.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user";
    let username = baseUsername;
    let attempt = 0;
    while (true) {
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
      if (!taken) break;
      attempt++;
      username = `${baseUsername}${attempt}`;
    }

    let finalEmail = email;
    const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, finalEmail));
    if (emailTaken) finalEmail = `${discordId}_${Date.now()}@discord.user`;

    const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 10);

    const [newUser] = await db.insert(users).values({
      username,
      email: finalEmail,
      password: hashedPassword,
      role,
      discordId,
      discordAvatar: avatarUrl,
      discordUsername: discordGlobalName,
    }).returning();

    await db.insert(profiles).values({
      userId: newUser.id,
      displayName: discordGlobalName || discordUsername,
      avatarUrl: avatarUrl || "",
    });

    await db.insert(discordEvents).values({
      userId: newUser.id,
      discordId,
      discordUsername,
      discordGlobalName,
      email: profile.email || null,
      action: "register",
      isNewUser: true,
    });

    // Sync Discord role badges for new user (async, don't block login)
    syncDiscordRoleBadges(newUser.id, discordId).catch(() => {});

    return done(null, newUser);
  } catch (err) {
    return done(err as Error);
  }
};

// ─── Register Discord strategy with current credentials ───────────────────────
function registerDiscordStrategy(callbackURL: string) {
  const clientID = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientID || !clientSecret) return false;
  try {
    passport.use(new DiscordStrategy({ clientID, clientSecret, callbackURL, scope: ["identify", "email"] }, discordVerify));
    return true;
  } catch (_) {
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "voidlink-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Local Strategy ───────────────────────────────────────────────
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        if (user.role === "banned") {
          const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
          if (webhookUrl) {
            try {
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  embeds: [{
                    title: "🚫 Banned User Login Attempt",
                    description: `Banned user **${user.username}** (ID: ${user.id}) attempted to log in.`,
                    color: 0xff0000,
                    timestamp: new Date().toISOString(),
                    footer: { text: "Hexed Security" },
                  }],
                }),
              });
            } catch (_) {}
          }
          return done(null, false, { message: "You have been banned" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Register Discord strategy at startup if credentials are already present
  const initialCallback = process.env.DISCORD_CALLBACK_URL || "https://placeholder/auth/discord/callback";
  registerDiscordStrategy(initialCallback);

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user && user.role === "banned") {
        return done(null, false as any);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ─── Local Auth Routes ────────────────────────────────────────────
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        if (user.discordId) {
          syncDiscordRoleBadges(user.id, user.discordId).catch(() => {});
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // ─── Public Discord Status ────────────────────────────────────────
  app.get("/api/discord-status", (req, res) => {
    const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
    const configured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
    res.json({ enabled, configured });
  });

  // ─── Admin: Return the computed Discord callback URL ──────────────
  app.get("/api/admin/discord-callback-url", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const stored = process.env.DISCORD_CALLBACK_URL;
    const isValidOverride =
      stored &&
      !stored.startsWith("https://discord.com") &&
      stored.includes("/auth/discord/callback") &&
      /^https?:\/\//.test(stored);
    if (isValidOverride) return res.json({ url: stored });
    const replitDomain =
      process.env.REPLIT_DEV_DOMAIN ||
      (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (replitDomain) return res.json({ url: `https://${replitDomain}/auth/discord/callback` });
    const proto = (req.headers["x-forwarded-proto"] as string || req.protocol || "https")
      .split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] as string || req.hostname)
      .split(",")[0].trim();
    res.json({ url: `${proto}://${host}/auth/discord/callback` });
  });

  // ─── Discord OAuth Routes ─────────────────────────────────────────
  function getDiscordCallbackURL(req: any) {
    // Use explicit override if set and valid
    const stored = process.env.DISCORD_CALLBACK_URL;
    const isValidOverride =
      stored &&
      !stored.startsWith("https://discord.com") &&
      stored.includes("/auth/discord/callback") &&
      /^https?:\/\//.test(stored);

    if (isValidOverride) return stored!;

    // Prefer Replit's managed domain variable — always correct for this Repl
    const replitDomain =
      process.env.REPLIT_DEV_DOMAIN ||
      (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (replitDomain) return `https://${replitDomain}/auth/discord/callback`;

    // Fallback: compute from request headers
    const proto = (req.headers["x-forwarded-proto"] as string || req.protocol || "https")
      .split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] as string || req.hostname)
      .split(",")[0].trim();
    return `${proto}://${host}/auth/discord/callback`;
  }

  app.get("/auth/discord", (req, res, next) => {
    const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
    if (!enabled) return res.redirect("/login?error=discord_disabled");

    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientID || !clientSecret) return res.redirect("/login?error=discord_not_configured");

    const callbackURL = getDiscordCallbackURL(req);
    console.log("[discord] Starting OAuth with callbackURL:", callbackURL);

    // Re-register with latest credentials each time
    registerDiscordStrategy(callbackURL);

    passport.authenticate("discord", { callbackURL } as any)(req, res, next);
  });

  app.get(
    "/auth/discord/callback",
    (req, res, next) => {
      const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
      if (!enabled) return res.redirect("/login?error=discord_disabled");

      const clientID = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      if (!clientID || !clientSecret) return res.redirect("/login?error=discord_not_configured");

      const callbackURL = getDiscordCallbackURL(req);
      console.log("[discord] Callback received, using callbackURL:", callbackURL);

      // Re-register with latest credentials each time
      registerDiscordStrategy(callbackURL);

      passport.authenticate("discord", {
        failureRedirect: "/login?error=discord",
        callbackURL,
      } as any, (err: any, user: any) => {
        if (err) {
          console.error("[discord] OAuth error:", err.code || err.message || err);
          return res.redirect("/login?error=discord_" + encodeURIComponent(err.code || "unknown"));
        }
        if (!user) {
          return res.redirect("/login?error=discord");
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[discord] Login error:", loginErr);
            return res.redirect("/login?error=discord");
          }
          res.redirect("/dashboard");
        });
      })(req, res, next);
    }
  );
}
