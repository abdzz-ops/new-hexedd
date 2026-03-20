import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, User as UserIcon, Shield, Settings, Grid, Database, Award,
  Ban, Upload, Music, Video, X, Check, Trash2, Plus, Eye, Hash,
  Calendar, ChevronRight, Unlock, Link as LinkIcon, Sparkles,
  MousePointer, Palette, LayoutTemplate, Type, Image as ImageIcon,
  ChevronUp, ChevronDown, GripVertical, Sliders, MonitorPlay,
  Tag, ExternalLink, Zap, Star, Monitor, AlignCenter, AlignLeft, AlignRight,
  Layers, Globe, Film, Cpu, Headphones, MessageSquare, Send, Key, Save, RefreshCw,
  Inbox, Lock, Users, Crown, UserCheck, EyeOff, EyeIcon, AlertCircle, CheckCircle2,
  ShieldCheck, Info, MoreHorizontal, Download, FileCode,
} from "lucide-react";
import { isStaff, canManageBadges as canManageBadgesPerm, canGiveBadges as canGiveBadgesPerm, canAccessBotSettings, canManageTeam, canManageWebsite, canManageChangelogs, ROLE_HIERARCHY } from "@shared/schema";
import { ChangeLogsTab } from "@/components/dashboard/tabs/ChangeLogsTab";
import {
  SiDiscord, SiX, SiInstagram, SiYoutube, SiTiktok, SiTwitch,
  SiGithub, SiLinkedin, SiSpotify, SiPaypal, SiCashapp, SiLinktree,
  SiSteam, SiReddit, SiSnapchat, SiTelegram, SiKofi, SiPatreon,
  SiKick, SiPinterest,
} from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUpload } from "@/hooks/use-upload";
import { VoidMark } from "@/lib/voidmark";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `${window.location.origin}${url}`;
  return url;
}

function isUploadedFile(url: string | null | undefined) {
  if (!url) return false;
  return url.includes("/objects/uploads/") || url.startsWith("/objects/");
}

function renderDiscordMarkdown(text: string): JSX.Element {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const isQuote = line.startsWith("> ");
        const content = isQuote ? line.slice(2) : line;
        const tokens = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|~~[^~]+~~|`[^`]+`)/);
        const rendered = tokens.map((tok, i) => {
          if (tok.startsWith("**") && tok.endsWith("**")) return <strong key={i} className="font-bold text-white">{tok.slice(2, -2)}</strong>;
          if (tok.startsWith("~~") && tok.endsWith("~~")) return <s key={i} className="opacity-60">{tok.slice(2, -2)}</s>;
          if ((tok.startsWith("*") && tok.endsWith("*")) || (tok.startsWith("_") && tok.endsWith("_"))) return <em key={i} className="italic">{tok.slice(1, -1)}</em>;
          if (tok.startsWith("`") && tok.endsWith("`")) return <code key={i} className="bg-black/40 px-1 rounded font-mono text-[9px]">{tok.slice(1, -1)}</code>;
          return <span key={i}>{tok}</span>;
        });
        if (isQuote) return (
          <div key={li} className="flex gap-1.5 my-0.5">
            <div className="w-0.5 bg-[#4e5058] rounded-full shrink-0" />
            <span className="text-[#949ba4] italic">{rendered}</span>
          </div>
        );
        return <span key={li}>{rendered}{li < lines.length - 1 ? <br /> : null}</span>;
      })}
    </>
  );
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function getEmbedType(url: string): "youtube" | "soundcloud" | "spotify" | "audio" | null {
  if (!url) return null;
  if (/(?:youtube\.com|youtu\.be)/.test(url)) return "youtube";
  if (/soundcloud\.com/.test(url)) return "soundcloud";
  if (/open\.spotify\.com/.test(url)) return "spotify";
  if (url.startsWith("http")) return "audio";
  return null;
}

function getEmbedServiceLabel(url: string): string {
  const t = getEmbedType(url);
  if (t === "youtube") return "YouTube";
  if (t === "soundcloud") return "SoundCloud";
  if (t === "spotify") return "Spotify";
  return "";
}

// ─── Platform Definitions ─────────────────────────────────────────────────────

export const PLATFORMS: { id: string; name: string; icon: any; color: string; domain: string; placeholder: string }[] = [
  { id: "discord",   name: "Discord",    icon: SiDiscord,   color: "#5865F2", domain: "discord.gg",              placeholder: "https://discord.gg/..." },
  { id: "x",         name: "X / Twitter",icon: SiX,         color: "#e7e7e7", domain: "x.com",                   placeholder: "https://x.com/username" },
  { id: "instagram", name: "Instagram",  icon: SiInstagram, color: "#E1306C", domain: "instagram.com",           placeholder: "https://instagram.com/username" },
  { id: "youtube",   name: "YouTube",    icon: SiYoutube,   color: "#FF0000", domain: "youtube.com",             placeholder: "https://youtube.com/@channel" },
  { id: "tiktok",    name: "TikTok",     icon: SiTiktok,    color: "#69C9D0", domain: "tiktok.com",              placeholder: "https://tiktok.com/@username" },
  { id: "twitch",    name: "Twitch",     icon: SiTwitch,    color: "#9146FF", domain: "twitch.tv",               placeholder: "https://twitch.tv/username" },
  { id: "github",    name: "GitHub",     icon: SiGithub,    color: "#e7e7e7", domain: "github.com",              placeholder: "https://github.com/username" },
  { id: "linkedin",  name: "LinkedIn",   icon: SiLinkedin,  color: "#0077B5", domain: "linkedin.com",            placeholder: "https://linkedin.com/in/username" },
  { id: "spotify",   name: "Spotify",    icon: SiSpotify,   color: "#1DB954", domain: "spotify.com",             placeholder: "https://open.spotify.com/..." },
  { id: "paypal",    name: "PayPal",     icon: SiPaypal,    color: "#003087", domain: "paypal.com",              placeholder: "https://paypal.me/username" },
  { id: "cashapp",   name: "Cash App",   icon: SiCashapp,   color: "#00D64F", domain: "cash.app",                placeholder: "https://cash.app/$username" },
  { id: "linktree",  name: "Linktree",   icon: SiLinktree,  color: "#39E09B", domain: "linktr.ee",               placeholder: "https://linktr.ee/username" },
  { id: "steam",     name: "Steam",      icon: SiSteam,     color: "#c6d4df", domain: "store.steampowered.com",  placeholder: "https://steamcommunity.com/id/..." },
  { id: "reddit",    name: "Reddit",     icon: SiReddit,    color: "#FF4500", domain: "reddit.com",              placeholder: "https://reddit.com/u/username" },
  { id: "snapchat",  name: "Snapchat",   icon: SiSnapchat,  color: "#FFFC00", domain: "snapchat.com",            placeholder: "https://snapchat.com/add/username" },
  { id: "telegram",  name: "Telegram",   icon: SiTelegram,  color: "#2CA5E0", domain: "t.me",                    placeholder: "https://t.me/username" },
  { id: "kofi",      name: "Ko-fi",      icon: SiKofi,      color: "#FF5E5B", domain: "ko-fi.com",               placeholder: "https://ko-fi.com/username" },
  { id: "patreon",   name: "Patreon",    icon: SiPatreon,   color: "#FF424D", domain: "patreon.com",             placeholder: "https://patreon.com/username" },
  { id: "kick",      name: "Kick",       icon: SiKick,      color: "#53FC18", domain: "kick.com",                placeholder: "https://kick.com/username" },
  { id: "pinterest", name: "Pinterest",  icon: SiPinterest, color: "#E60023", domain: "pinterest.com",           placeholder: "https://pinterest.com/username" },
];

export function getPlatform(id: string | undefined) {
  return PLATFORMS.find(p => p.id === id) ?? null;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">{children}</h3>;
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.03] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{label}</p>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 rounded-lg border border-white/10 overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: value }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <span className="text-xs font-mono text-gray-400">{value}</span>
    </div>
  );
}

function NumSlider({ value, onChange, min, max, step = 1, unit = "" }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1 w-32" />
      <span className="text-xs font-mono text-gray-400 w-12 text-right">{value}{unit}</span>
    </div>
  );
}

// ─── Smart Media Field ────────────────────────────────────────────────────────

function MediaField({
  label, value, onChange, accept, uploadId, mediaType, icon
}: {
  label: string; value: string; onChange: (v: string) => void;
  accept: string; uploadId: string; mediaType: "image" | "video" | "audio";
  icon?: React.ReactNode;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const hasValue = !!value;
  const resolved = resolveUrl(value);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onChange(result.publicUrl || `${window.location.origin}${result.objectPath}`);
      toast({ title: `${label || "File"} uploaded` });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    e.target.value = "";
  };

  const uploaded = isUploadedFile(value);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          {icon}{label}
        </Label>
      )}
      <AnimatePresence>
        {hasValue && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-xl overflow-hidden border border-white/5 bg-black/40 group">
            {mediaType === "image" && <img src={resolved} alt={label} className="w-full h-32 object-cover" onError={e => e.currentTarget.classList.add("opacity-20")} />}
            {mediaType === "video" && <video src={resolved} className="w-full h-32 object-cover" muted playsInline />}
            {mediaType === "audio" && (
              <div className="p-3 flex items-center gap-3">
                <Music className="w-5 h-5 text-orange-500 shrink-0" />
                <audio controls className="flex-1 h-8" src={resolved} />
              </div>
            )}
            {uploaded && mediaType !== "audio" && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded-full text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </div>
            )}
            <button type="button"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              onClick={() => onChange("")}><X className="w-3 h-3 text-white" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        {!uploaded ? (
          <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Paste URL or upload..."
            className="bg-black/60 border-white/5 focus:border-orange-500/50 text-xs h-9" />
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 h-9 bg-black/40 border border-white/5 rounded-md">
            <Check className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-xs text-gray-400 truncate flex-1">File saved</span>
            <button type="button" onClick={() => onChange("")} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
          </div>
        )}
        <label htmlFor={uploadId}
          className={`flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 cursor-pointer transition-colors shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
          <input id={uploadId} type="file" accept={accept} className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}

// ─── Badge Editor ─────────────────────────────────────────────────────────────

function BadgeEditor({ badge, onDone }: { badge?: any; onDone?: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(badge?.name || "");
  const [icon, setIcon] = useState(badge?.icon || "");
  const [description, setDescription] = useState(badge?.description || "");
  const [howToGet, setHowToGet] = useState(badge?.howToGet || "");
  const [visibleTo, setVisibleTo] = useState(badge?.visibleTo || "all");
  const [available, setAvailable] = useState(badge?.available !== false);
  const [roleId, setRoleId] = useState(badge?.roleId || "");
  const [activeEditorTab, setActiveEditorTab] = useState<"general" | "roleId">("general");
  const [visibleSearch, setVisibleSearch] = useState("");
  const [showVisiblePicker, setShowVisiblePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<any[]>([]);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const { uploadFile, isUploading } = useUpload();
  const { data: allUsers } = useQuery<any>({ queryKey: ["/api/admin/users"] });

  const fetchRoles = async () => {
    setFetchingRoles(true);
    try {
      const res = await fetch("/api/admin/discord-roles", { credentials: "include" });
      const data = await res.json();
      if (data.roles) setDiscordRoles(data.roles);
      else toast({ title: data.message || "Could not fetch roles", variant: "destructive" });
    } catch {
      toast({ title: "Error fetching roles", variant: "destructive" });
    }
    setFetchingRoles(false);
  };

  const visibleUsers: string[] = visibleTo !== "all" ? visibleTo.split(",").filter(Boolean) : [];
  const filteredUsers = (allUsers || []).filter((u: any) =>
    !visibleSearch || u.username.toLowerCase().includes(visibleSearch.toLowerCase())
  );

  const toggleUserVisible = (username: string) => {
    const curr = visibleTo !== "all" ? visibleTo.split(",").filter(Boolean) : [];
    const next = curr.includes(username) ? curr.filter((u: string) => u !== username) : [...curr, username];
    setVisibleTo(next.length === 0 ? "all" : next.join(","));
  };

  const save = async () => {
    if (!name.trim()) return toast({ title: "Badge name required", variant: "destructive" });
    setLoading(true);
    try {
      const payload = { name, icon, description, howToGet, visibleTo, available, roleId };
      if (badge) await apiRequest("PATCH", `/api/admin/badges/${badge.id}`, payload);
      else await apiRequest("POST", "/api/admin/badges", payload);
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: badge ? "Badge updated" : "Badge created" });
      onDone?.();
    } catch { toast({ title: "Error saving badge", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const deleteBadge = async () => {
    if (!badge || !confirm(`Delete badge "${badge.name}"? This removes it from all users.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/badges/${badge.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.message || "Delete failed", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Badge deleted" });
      onDone?.();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Verified" className="bg-black border-white/5 focus:border-orange-500/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Icon (Emoji or Upload)</Label>
        <div className="flex gap-2">
          <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="✔️ or paste URL..." className="bg-black border-white/5 focus:border-orange-500/50" />
          <label className={`flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-400" />}
            <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              if (file) { const r = await uploadFile(file); if (r) setIcon(r.publicUrl || r.objectPath); }
              e.target.value = "";
            }} />
          </label>
        </div>
        {icon && (
          <div className="flex items-center gap-2 mt-1 p-2 bg-black/40 rounded-lg border border-white/5">
            <span className="text-[10px] text-gray-500 uppercase font-black">Preview:</span>
            {icon.startsWith("http") || icon.includes("/objects/") ? <img src={resolveUrl(icon)} alt="preview" className="w-6 h-6 object-contain rounded" /> : <span className="text-lg">{icon}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What this badge represents..." className="bg-black border-white/5 focus:border-orange-500/50 text-sm min-h-[60px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">How to Get</Label>
        <Textarea value={howToGet} onChange={e => setHowToGet(e.target.value)} placeholder="How users can earn this badge..." className="bg-black border-white/5 focus:border-orange-500/50 text-sm min-h-[60px] resize-none" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visible To</Label>
          <span className="text-[10px] text-gray-500 font-mono">
            {visibleTo === "all" ? "All members" : `${visibleUsers.length} member(s)`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowVisiblePicker(!showVisiblePicker)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${showVisiblePicker ? "border-orange-500/50 bg-orange-500/5" : "border-white/10 bg-black hover:border-white/20"}`}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-400" />
            <span className="text-white">{visibleTo === "all" ? "Visible to All" : `Custom: ${visibleUsers.slice(0,3).join(", ")}${visibleUsers.length > 3 ? "..." : ""}`}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showVisiblePicker ? "rotate-180" : ""}`} />
        </button>
        {showVisiblePicker && (
          <div className="border border-white/10 rounded-xl bg-black/80 p-3 space-y-2 max-h-48 overflow-y-auto">
            <button
              onClick={() => { setVisibleTo("all"); setVisibleSearch(""); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${visibleTo === "all" ? "bg-orange-500/15 border border-orange-500/40 text-orange-400" : "border border-white/5 hover:bg-white/5 text-gray-300"}`}
            >
              <Globe className="w-4 h-4" /> Visible to All Members
            </button>
            <div className="h-px bg-white/5 my-1" />
            <Input
              value={visibleSearch}
              onChange={e => setVisibleSearch(e.target.value)}
              placeholder="Search members..."
              className="bg-black/60 border-white/5 h-8 text-sm"
            />
            {filteredUsers.map((u: any) => {
              const sel = visibleUsers.includes(u.username);
              return (
                <button key={u.id} onClick={() => toggleUserVisible(u.username)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${sel ? "bg-orange-500/15 border border-orange-500/40 text-orange-400" : "border border-white/5 hover:bg-white/5 text-gray-400"}`}>
                  {sel ? <Check className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                  @{u.username}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Available toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40">
        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available</Label>
          <p className="text-[10px] text-gray-600 mt-0.5">If disabled, badge shows as "Unavailable" to all users</p>
        </div>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`w-11 h-6 rounded-full transition-all relative ${available ? "bg-orange-500" : "bg-gray-700"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${available ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Discord Role ID */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discord Role ID</Label>
        <p className="text-[10px] text-gray-600">Users with this Discord role will automatically receive this badge</p>
        <div className="flex gap-2">
          <Input value={roleId} onChange={e => setRoleId(e.target.value)} placeholder="e.g. 123456789012345678" className="bg-black border-white/5 focus:border-orange-500/50 font-mono text-sm" />
          <Button type="button" onClick={fetchRoles} disabled={fetchingRoles} variant="outline" className="shrink-0 border-white/10 text-gray-400 hover:text-white text-xs px-3">
            {fetchingRoles ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
        {discordRoles.length > 0 && (
          <div className="border border-white/10 rounded-xl bg-black/80 p-2 space-y-1 max-h-36 overflow-y-auto">
            <p className="text-[9px] font-black uppercase text-gray-600 px-2 mb-1">Select a role</p>
            {discordRoles.map((r: any) => (
              <button key={r.id} type="button" onClick={() => { setRoleId(r.id); setDiscordRoles([]); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all ${roleId === r.id ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" : "hover:bg-white/5 text-gray-300 border border-transparent"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color ? `#${r.color.toString(16).padStart(6,"0")}` : "#555" }} />
                {r.name}
                <span className="ml-auto font-mono text-[10px] text-gray-600">{r.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black border-0">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : badge ? "Update" : "Create Badge"}
        </Button>
        {badge && <Button onClick={deleteBadge} disabled={loading} variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>}
      </div>
    </div>
  );
}

// ─── Manage User Dialog ───────────────────────────────────────────────────────

function ManageUserDialog({ u, badges, isOwner, isAdmin }: { u: any; badges: any[]; isOwner: boolean; isAdmin: boolean }) {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState({ ...u });
  const isBanned = localUser.role === "banned";
  const targetIsOwner = u.role === "owner";
  const [customBadgeName, setCustomBadgeName] = useState("");
  const [customBadgeIcon, setCustomBadgeIcon] = useState("");
  const [activeSection, setActiveSection] = useState<"badges"|"limits"|"custom"|"views">("badges");
  const [viewDelta, setViewDelta] = useState("");
  const { uploadFile, isUploading } = useUpload();

  const save = async (updates: any) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${u.id}`, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setLocalUser((p: any) => ({ ...p, ...updates }));
      toast({ title: "User updated" });
    } catch {
      toast({ title: "Action not allowed", variant: "destructive" });
    }
  };

  const toggleBadge = (badgeName: string, checked: boolean) => {
    const curr = localUser.badges || [];
    const next = checked ? [...curr, badgeName] : curr.filter((b: string) => b !== badgeName);
    setLocalUser((p: any) => ({ ...p, badges: next }));
    save({ badges: next });
  };

  const handleCustomBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setCustomBadgeIcon(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const grantCustomBadge = () => {
    if (!customBadgeName.trim()) return;
    const badgeName = `custom:${customBadgeName.trim()}`;
    const curr = localUser.badges || [];
    if (curr.includes(badgeName)) return;
    const next = [...curr, badgeName];
    setLocalUser((p: any) => ({ ...p, badges: next }));
    save({ badges: next });
    setCustomBadgeName("");
    setCustomBadgeIcon("");
  };

  const roleOptions = isOwner ? ["user", "admin"] : ["user"];

  return (
    <div className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-1">
      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-lg border border-orange-500/20">
          {u.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-black">{u.username}</p>
          <p className="text-[10px] text-gray-500 uppercase font-bold">UID #{u.id} · {u.views || 0} views</p>
        </div>
        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black uppercase ${localUser.role === "owner" ? "bg-red-500/20 text-red-500" : localUser.role === "admin" ? "bg-orange-500/20 text-orange-500" : localUser.role === "banned" ? "bg-red-900/40 text-red-400" : "bg-white/10 text-gray-400"}`}>
          {localUser.role}
        </span>
      </div>

      {targetIsOwner && (
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">Owner Account — Role Protected</p>
          <p className="text-[10px] text-gray-500 mt-1">Owner role cannot be changed. Badges and limits can still be updated.</p>
        </div>
      )}

      {!targetIsOwner && (isOwner || isAdmin) && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500/60">Role</Label>
          <div className="flex gap-2">
            {roleOptions.map(role => (
              <Button key={role} size="sm" onClick={() => save({ role })}
                className={`text-[10px] font-black uppercase flex-1 ${localUser.role === role ? "bg-orange-500 text-black" : "bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white/50"}`}>
                {role}
              </Button>
            ))}
          </div>
          {!isOwner && <p className="text-[10px] text-gray-600">Admins can demote users. Only owners can promote to admin.</p>}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
        {(["badges","limits","custom", ...(isOwner ? ["views"] : [])] as const).map((s: any) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`flex-1 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${activeSection === s ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"}`}>
            {s === "badges" ? "Badges" : s === "limits" ? "Limits" : s === "custom" ? "Custom Badge" : "Views"}
          </button>
        ))}
      </div>

      {activeSection === "badges" && (
        <div className="space-y-2">
          {badges?.length === 0 ? <p className="text-xs text-gray-600 text-center py-3">No badges created yet.</p> : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {badges?.map((badge: any) => {
                const owned = (localUser.badges || []).includes(badge.name);
                return (
                  <div key={badge.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${owned ? "border-orange-500/30 bg-orange-500/5" : "border-white/5 bg-black/30"}`} onClick={() => toggleBadge(badge.name, !owned)}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${owned ? "bg-orange-500 border-orange-500" : "border-white/20 bg-transparent"}`}>
                      {owned && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/") ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-6 h-6 object-contain" /> : <span className="text-xl">{badge.icon}</span>}
                    </div>
                    <span className="text-sm font-bold truncate">{badge.name}</span>
                    {owned && <span className="ml-auto text-[9px] font-black uppercase text-orange-500 shrink-0">Active</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === "limits" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Tracks</Label>
              <span className="text-xs font-mono text-orange-500">{localUser.maxTracks ?? 3}</span>
            </div>
            <input type="range" min={0} max={20} value={localUser.maxTracks ?? 3}
              onChange={e => setLocalUser((p: any) => ({ ...p, maxTracks: parseInt(e.target.value) }))}
              className="w-full accent-orange-500" />
            <Button size="sm" onClick={() => save({ maxTracks: localUser.maxTracks ?? 3 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Track Limit</Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Tags</Label>
              <span className="text-xs font-mono text-orange-500">{localUser.maxTags ?? 5}</span>
            </div>
            <input type="range" min={0} max={20} value={localUser.maxTags ?? 5}
              onChange={e => setLocalUser((p: any) => ({ ...p, maxTags: parseInt(e.target.value) }))}
              className="w-full accent-orange-500" />
            <Button size="sm" onClick={() => save({ maxTags: localUser.maxTags ?? 5 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Tag Limit</Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Aliases</Label>
              <span className="text-xs font-mono text-orange-500">{localUser.maxAliases ?? 1}</span>
            </div>
            <input type="range" min={0} max={5} value={localUser.maxAliases ?? 1}
              onChange={e => setLocalUser((p: any) => ({ ...p, maxAliases: parseInt(e.target.value) }))}
              className="w-full accent-orange-500" />
            <Button size="sm" onClick={() => save({ maxAliases: localUser.maxAliases ?? 1 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Alias Limit</Button>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">User Alias</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={localUser.alias || ""}
                placeholder="Set alias (e.g. xos)..."
                className="bg-black/60 border-white/5 h-8 text-sm"
                id={`alias-input-${u.id}`}
              />
              <Button size="sm" onClick={() => {
                const val = (document.getElementById(`alias-input-${u.id}`) as HTMLInputElement)?.value || "";
                save({ alias: val || null });
              }} className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0 shrink-0">Set</Button>
            </div>
            <p className="text-[10px] text-gray-600">Leave empty to clear alias. Current: {localUser.alias ? `/${localUser.alias}` : "none"}</p>
          </div>
        </div>
      )}

      {activeSection === "custom" && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">Grant this user a special custom badge only they have.</p>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-500">Badge Name</Label>
            <Input value={customBadgeName} onChange={e => setCustomBadgeName(e.target.value)} placeholder="e.g. Early Supporter" className="bg-black/60 border-white/5 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-500">Badge Icon</Label>
            <div className="flex gap-2">
              <Input value={customBadgeIcon} onChange={e => setCustomBadgeIcon(e.target.value)} placeholder="Emoji or URL..." className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
              <label className={`flex items-center justify-center w-9 h-9 rounded border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleCustomBadgeUpload} />
              </label>
            </div>
          </div>
          <Button onClick={grantCustomBadge} disabled={!customBadgeName.trim()} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full flex items-center gap-2 border-0">
            <Star className="w-4 h-4" /> Grant Custom Badge
          </Button>
          {(localUser.badges || []).filter((b: string) => b.startsWith("custom:")).length > 0 && (
            <div className="mt-2 space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-600">Current Custom Badges</Label>
              {(localUser.badges || []).filter((b: string) => b.startsWith("custom:")).map((b: string) => (
                <div key={b} className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                  <Star className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-xs font-bold flex-1">{b.replace("custom:", "")}</span>
                  <button onClick={() => toggleBadge(b, false)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === "views" && isOwner && (
        <div className="space-y-4">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Current Views</p>
              <p className="text-2xl font-black text-orange-500 mt-1">{localUser.views ?? 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Adjust Views</Label>
            <Input
              type="number"
              value={viewDelta}
              onChange={e => setViewDelta(e.target.value)}
              placeholder="Enter amount (use - to remove)"
              className="bg-black/60 border-white/5 h-9 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!viewDelta || isNaN(Number(viewDelta))}
                onClick={async () => {
                  const delta = parseInt(viewDelta);
                  if (isNaN(delta) || delta === 0) return;
                  try {
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/views`, { delta });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, views: data.views }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: `Views updated to ${data.views}` });
                    setViewDelta("");
                  } catch {
                    toast({ title: "Failed to update views", variant: "destructive" });
                  }
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black border-0"
              >
                Apply Change
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const current = localUser.views ?? 0;
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/views`, { delta: -current });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, views: data.views }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: "Views reset to 0" });
                    setViewDelta("");
                  } catch {
                    toast({ title: "Failed to reset views", variant: "destructive" });
                  }
                }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-black"
              >
                Reset to 0
              </Button>
            </div>
            <p className="text-[10px] text-gray-600">Positive numbers add views, negative numbers remove them.</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-white/5 space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-purple-500/60">Premium Status</Label>
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${localUser.isPremium ? "border-purple-500/30 bg-purple-500/5" : "border-white/5 bg-black/20"}`}>
          <div>
            <p className="text-sm font-bold flex items-center gap-2">💎 Premium{localUser.isPremium && <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-black uppercase">Active</span>}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{localUser.isPremium ? "User has premium. Revoke to remove badge." : "Grant premium access and Premium badge."}</p>
          </div>
          <Switch checked={!!localUser.isPremium} onCheckedChange={v => { setLocalUser((p: any) => ({ ...p, isPremium: v })); save({ isPremium: v }); }} />
        </div>
      </div>

      {!targetIsOwner && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-red-500/50">Account Control</Label>
          {isBanned ? (
            <Button className="w-full bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-black flex items-center gap-2 transition-all" onClick={() => save({ role: "user" })}>
              <Unlock className="w-4 h-4" /> Unban User
            </Button>
          ) : (
            <Button className="w-full bg-transparent border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white font-black flex items-center gap-2 transition-all" onClick={() => save({ role: "banned" })}>
              <Ban className="w-4 h-4" /> Ban User
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tabs ────────────────────────────────────────────────────────────

const TABS = [
  { value: "home",          label: "Home",       icon: Grid },
  { value: "profile",       label: "Bio",        icon: UserIcon },
  { value: "links",         label: "Links",      icon: LinkIcon },
  { value: "extras",        label: "Extras",     icon: Sparkles },
  { value: "miscellaneous", label: "Profile",    icon: Sliders },
  { value: "options",       label: "Options",    icon: Settings },
  { value: "badges",        label: "Badges",     icon: Award },
  { value: "markdowns",     label: "Markdowns",  icon: FileCode },
];

export default function Dashboard({ activeTab: initialTab = "home", extrasSection: initialExtrasSection }: { activeTab?: string; extrasSection?: string }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [localProfile, setLocalProfile] = useState<any>(null);

  const { data: adminUsers } = useQuery<any>({ queryKey: ["/api/admin/users"], enabled: user?.role === "admin" || user?.role === "owner" });
  const { data: profile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: badges } = useQuery<any>({ queryKey: ["/api/badges"] });
  const { data: userLinks, isLoading: linksLoading } = useQuery<any>({ queryKey: ["/api/links"] });
  const { data: userTracks } = useQuery<any>({ queryKey: ["/api/tracks"] });
  const { data: viewsHistory } = useQuery<any>({ queryKey: ["/api/user/views-history"] });
  const { data: userLikes } = useQuery<{ likes: number }>({ queryKey: ["/api/user/likes"] });

  useEffect(() => {
    if (!localProfile && profile !== undefined) setLocalProfile(profile || {});
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: (updates: any) => apiRequest("PATCH", "/api/profile", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "✓ Profile saved", description: "Your changes are now live on your public page.", duration: 3000 });
    },
  });

  const upd = (field: string, val: any) => setLocalProfile((p: any) => ({ ...p, [field]: val }));
  const updS = (key: string, val: any) => setLocalProfile((p: any) => ({
    ...p,
    settings: { ...(p?.settings || {}), [key]: val }
  }));
  const getS = (key: string, def: any) => localProfile?.settings?.[key] !== undefined ? localProfile.settings[key] : def;

  if (!user || profileLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>;
  }

  const isAdmin = isStaff(user.role);
  const isOwner = user.role === "owner";
  const isDev = user.role === "developer" || user.role === "owner";
  const canCreateBadge = canManageBadgesPerm(user.role);
  const canGiveBadge = canGiveBadgesPerm(user.role);
  const allTabs = isAdmin ? [...TABS, { value: "admin", label: "Admin", icon: Shield }] : TABS;

  return (
    <div className="h-screen bg-[#050505] text-white flex overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-56 shrink-0 bg-[#070707] border-r border-white/[0.05] flex flex-col h-screen sticky top-0 z-40">

        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.05]">
          <a href="/" className="text-2xl font-black text-orange-500 tracking-tighter block">Hexed</a>
          <p className="text-[10px] text-gray-600 mt-0.5 font-semibold uppercase tracking-widest">Dashboard</p>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 overflow-hidden">
              {(localProfile as any)?.avatarUrl ? (
                <img src={(localProfile as any).avatarUrl.startsWith("/objects/") ? `${window.location.origin}${(localProfile as any).avatarUrl}` : (localProfile as any).avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-500 font-black text-sm">{user.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{user.username}</p>
              <p className="text-[9px] text-orange-500 uppercase tracking-widest font-bold">{user.role}</p>
            </div>
          </div>
          {(user as any).isPremium && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px]">💎</span>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Premium</span>
            </div>
          )}
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allTabs.map(t => {
            const Icon = (t as any).icon || Grid;
            const isActive = activeTab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group relative ${
                  isActive
                    ? "bg-orange-500 text-black"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-black text-sm tracking-wide">{t.label}</span>
                {isActive && <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-orange-500" style={{ zIndex: -1 }} />}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/[0.05] space-y-1">
          <a href={`/${user.username}`} target="_blank" rel="noreferrer"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all">
            <Eye className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">View Profile</span>
          </a>
          <a href="/shop"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-500/[0.05] transition-all">
            <Star className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">Shop</span>
          </a>
          <button onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
            <X className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* HOME */}
            {activeTab === "home" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black">Dashboard</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage your Hexed profile</p>
                </div>
                <AnnouncementsBanner />
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-2 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-4">
                    <Avatar className="w-14 h-14 border border-white/10">
                      <AvatarImage src={resolveUrl(profile?.avatarUrl)} />
                      <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xl">{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-lg leading-tight">{profile?.displayName || user.username}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">@{user.username}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${user.role === "owner" ? "bg-red-500/20 text-red-400" : user.role === "admin" ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-gray-400"}`}>{user.role}</span>
                        {(user as any).isPremium && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/20">💎 Premium</span>}
                        {(user as any).discordId && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#5865F2]/20 text-[#7289da] border border-[#5865F2]/20 flex items-center gap-1"><SiDiscord className="w-2.5 h-2.5" />Discord</span>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Views</p>
                    <p className="text-4xl font-black text-orange-500 mt-2">{user.views || 0}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Profile views</p>
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1.5">❤ Likes</p>
                    <p className="text-4xl font-black text-pink-500 mt-2">{userLikes?.likes ?? 0}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Profile likes</p>
                  </div>
                </div>

                {/* Daily Reward */}
                <DailyRewardSection />

                {/* Daily Views Chart */}
                {viewsHistory && viewsHistory.length > 0 && (
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Views Last 30 Days</p>
                    <ResponsiveContainer width="100%" height={90}>
                      <BarChart data={viewsHistory} margin={{ top: 0, right: 0, left: -32, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false}
                          tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
                          interval={Math.max(0, Math.floor((viewsHistory.length - 1) / 6))}
                        />
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 11 }}
                          labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                          formatter={(v: number) => [v, "views"]}
                        />
                        <Bar dataKey="count" radius={[3,3,0,0]} maxBarSize={18}>
                          {viewsHistory.map((_: any, i: number) => (
                            <Cell key={i} fill={i === viewsHistory.length - 1 ? "#f97316" : "#f9731655"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Premium Advanced Analytics */}
                {(user as any).isPremium && userLinks && userLinks.length > 0 && (
                  <div className="bg-[#0e0e0e] border border-purple-500/20 rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 mb-4 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Advanced Analytics <span className="ml-1 text-[8px] bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded">Premium</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Total Clicks</p>
                        <p className="text-xl font-black text-white">{userLinks.reduce((s: number, l: any) => s + (l.clicks || 0), 0)}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Active Links</p>
                        <p className="text-xl font-black text-white">{userLinks.filter((l: any) => l.enabled).length}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Profile Likes</p>
                        <p className="text-xl font-black text-pink-400">{userLikes?.likes ?? 0}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Click Rate</p>
                        <p className="text-xl font-black text-orange-400">
                          {user.views > 0 ? ((userLinks.reduce((s: number, l: any) => s + (l.clicks || 0), 0) / user.views) * 100).toFixed(1) : "0.0"}%
                        </p>
                      </div>
                    </div>
                    {userLinks.filter((l: any) => l.clicks > 0).length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-2">Top Links by Clicks</p>
                        <div className="space-y-1.5">
                          {[...userLinks].filter((l: any) => l.clicks > 0).sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map((l: any) => {
                            const maxClicks = Math.max(...userLinks.map((x: any) => x.clicks || 0));
                            const pct = maxClicks > 0 ? ((l.clicks || 0) / maxClicks) * 100 : 0;
                            return (
                              <div key={l.id} className="flex items-center gap-2">
                                <p className="text-[10px] text-gray-400 truncate w-28 shrink-0">{l.title}</p>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500/70 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] font-black text-gray-500 w-8 text-right">{l.clicks}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!(user as any).isPremium && (
                  <a href="/shop/premium" className="flex items-center gap-4 p-5 bg-[#1a0f30] border border-purple-500/20 rounded-2xl hover:border-purple-500/40 transition-all group">
                    <span className="text-3xl">💎</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-purple-300 group-hover:text-purple-200 transition-colors">Go Premium — €4.99</p>
                      <p className="text-[11px] text-purple-500/70 mt-0.5">Remove watermark, unlock effects, 20 tracks, and more</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                  </a>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { label: "Bio & Info", desc: "Avatar, bio, banner, location", tab: "profile" },
                    { label: "Manage Links", desc: "Add and reorder your links", tab: "links" },
                    { label: "Profile Settings", desc: "Effects, colors, animations and more", tab: "miscellaneous" },
                    { label: "Options", desc: "Visibility settings", tab: "options" },
                    { label: "View Badges", desc: "See your earned badges", tab: "badges" },
                    { label: "Extras", desc: "Tags, custom badges, and more", tab: "extras" },
                    { label: "Challenges", desc: "Complete quests to earn rewards", tab: "extras" },
                    ...(isAdmin ? [{ label: "User Databank", desc: "Manage all users", tab: "databank" }] : []),
                  ].map(item => (
                    <button key={item.label} onClick={() => setActiveTab(item.tab)}
                      className="flex items-center justify-between p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.02] transition-all group text-left">
                      <div>
                        <p className="font-black text-sm group-hover:text-orange-500 transition-colors">{item.label}</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-2xl font-black">Profile Editor</h1>
                  <p className="text-gray-500 text-sm mt-1">Customize how your page looks</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Avatar</h3>
                    <MediaField label="Avatar Image" value={localProfile?.avatarUrl || ""} onChange={v => upd("avatarUrl", v)}
                      accept="image/*,video/*" uploadId="avatar-upload" mediaType="image" icon={<UserIcon className="w-3 h-3" />} />
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Banner</h3>
                    <MediaField label="Banner Image" value={localProfile?.bannerUrl || ""} onChange={v => upd("bannerUrl", v)}
                      accept="image/*,video/*" uploadId="banner-upload" mediaType="image" icon={<ImageIcon className="w-3 h-3" />} />
                  </div>
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Info</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Display Name</Label>
                      <Input value={localProfile?.displayName || ""} onChange={e => upd("displayName", e.target.value)}
                        placeholder={user.username} className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Bio</Label>
                      <Textarea value={localProfile?.bio || ""} onChange={e => upd("bio", e.target.value)}
                        placeholder="Write your bio... Supports Voidmark tags" rows={3}
                        className="bg-black/60 border-white/5 focus:border-orange-500/50 resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Location</Label>
                      <Input value={localProfile?.location || ""} onChange={e => upd("location", e.target.value)}
                        placeholder="City, Country" className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Content Direction</Label>
                      <div className="flex gap-2">
                        {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([v, Icon]) => (
                          <button key={v} onClick={() => updS("contentAlign", v)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-[11px] font-black uppercase transition-all ${getS("contentAlign","center") === v ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-white/10 text-gray-500 hover:border-white/30 hover:text-white"}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Background Media</h3>
                  <MediaField label="Background Image" value={localProfile?.backgroundUrl || ""} onChange={v => upd("backgroundUrl", v)}
                    accept="image/*" uploadId="bg-img-upload" mediaType="image" icon={<ImageIcon className="w-3 h-3" />} />
                  <MediaField label="Background Video (or YouTube URL)" value={localProfile?.backgroundVideoUrl || ""} onChange={v => upd("backgroundVideoUrl", v)}
                    accept="video/*" uploadId="bg-vid-upload" mediaType="video" icon={<Video className="w-3 h-3" />} />
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Reveal Screen</h3>
                  <SettingRow label="Enable Reveal Screen" desc="Show a gated screen before profile loads">
                    <Switch checked={!!localProfile?.revealEnabled} onCheckedChange={v => upd("revealEnabled", v)} />
                  </SettingRow>
                  {localProfile?.revealEnabled && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Reveal Text</Label>
                      <Input value={localProfile?.revealText || ""} onChange={e => upd("revealText", e.target.value)}
                        placeholder="Click to reveal" className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                  )}
                </div>

                <UsernameChangeSection user={user} />

                <Button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-400 text-black font-black px-8 border-0">
                  {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Profile"}
                </Button>
              </div>
            )}

            {/* LINKS */}
            {activeTab === "links" && (
              <LinksTab userLinks={userLinks} linksLoading={linksLoading} />
            )}

            {/* MISCELLANEOUS */}
            {activeTab === "miscellaneous" && (
              localProfile
                ? <MiscTab
                    localProfile={localProfile}
                    upd={upd}
                    updS={updS}
                    getS={getS}
                    userTracks={userTracks}
                    profileMutation={profileMutation}
                    user={user}
                  />
                : <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
            )}

            {/* OPTIONS */}
            {activeTab === "options" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-2xl font-black">Options</h1>
                  <p className="text-gray-500 text-sm mt-1">Visibility and layout settings</p>
                </div>
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
                  {[
                    { label: "Show View Count", field: "showViews", desc: "Display total profile views publicly", locked: false },
                    { label: "Show User ID", field: "showUid", desc: "Show your UID on your profile", locked: false },
                    { label: "Show Join Date", field: "showJoinDate", desc: "Display when you joined", locked: false },
                    { label: "Hide Watermark", field: "showWatermark", desc: (user as any).isPremium ? "Hide the Hexed corner watermark" : "Requires Premium to hide watermark", locked: !(user as any).isPremium, invert: true },
                  ].map(({ label, field, desc, locked, invert }) => (
                    <div key={field} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className={`text-sm font-bold flex items-center gap-2 ${locked ? "text-gray-500" : ""}`}>
                          {label}
                          {locked && <a href="/shop/premium" className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider hover:bg-purple-500/30 transition-colors">Premium</a>}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                      </div>
                      <Switch
                        disabled={locked}
                        checked={invert ? !localProfile?.[field] : !!localProfile?.[field]}
                        onCheckedChange={v => upd(field, invert ? !v : v)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-bold">Show Like Counter</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Display the like count badge on your profile (top left)</p>
                    </div>
                    <Switch
                      checked={getS("showLikeCounter", false)}
                      onCheckedChange={v => updS("showLikeCounter", v)}
                    />
                  </div>
                </div>

                {/* Meta Info Position */}
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div>
                    <h3 className="font-black text-sm">Meta Info Position</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Where to display UID, views, and join date on your profile</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: "default",   label: "Below Bio" },
                      { val: "top-right", label: "Top Right" },
                      { val: "center",    label: "Center" },
                    ].map(({ val, label }) => (
                      <button key={val}
                        onClick={() => updS("metaInfoPos", val)}
                        className={`px-4 py-2 rounded-xl font-black text-xs border transition-all duration-200 ${getS("metaInfoPos", "default") === val ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:border-orange-500/40 hover:text-white"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                  className="bg-orange-500 hover:bg-white hover:text-black text-black font-black px-8 border border-orange-500 hover:border-white transition-all">
                  {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Options"}
                </Button>
              </div>
            )}

            {/* BADGES */}
            {activeTab === "badges" && (
              <BadgesTab user={user} badges={badges} localProfile={localProfile} profileMutation={profileMutation} getS={getS} updS={updS} />
            )}

            {/* EXTRAS */}
            {activeTab === "extras" && localProfile && (
              <ExtrasTab user={user} localProfile={localProfile} upd={upd} updS={updS} getS={getS} profileMutation={profileMutation} userTracks={userTracks} defaultSection={initialExtrasSection} />
            )}

            {/* MARKDOWNS */}
            {activeTab === "markdowns" && <MarkdownsTab />}

            {/* ADMIN (consolidated) */}
            {activeTab === "admin" && isAdmin && (
              <AdminTab adminUsers={adminUsers} badges={badges} isOwner={isOwner} isAdmin={isAdmin} user={user} canCreateBadge={canCreateBadge} canGiveBadge={canGiveBadge} />
            )}

          </motion.div>
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Announcements Banner ─────────────────────────────────────────────────────

function AnnouncementsBanner() {
  const { data: annos = [] } = useQuery<any[]>({ queryKey: ["/api/announcements"] });
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("hexed_dismissed_announcements") || "[]");
    } catch { return []; }
  });

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("hexed_dismissed_announcements", JSON.stringify(next));
  };

  const visible = (annos || []).filter((a: any) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const typeStyles: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
    success: "border-green-500/30 bg-green-500/5 text-green-300",
    error: "border-red-500/30 bg-red-500/5 text-red-300",
  };

  return (
    <div className="space-y-2">
      {visible.map((a: any) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex items-start gap-3 p-4 rounded-2xl border ${typeStyles[a.type] || typeStyles.info}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">{a.title}</p>
            {a.content && <p className="text-[12px] mt-0.5 opacity-80">{a.content}</p>}
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Badges Tab ───────────────────────────────────────────────────────────────

function BadgesTab({ user, badges }: { user: any; badges: any[]; localProfile?: any; profileMutation?: any; getS?: any; updS?: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const hasDiscord = !!(user as any).discordId;

  const syncBadges = async () => {
    setSyncing(true);
    try {
      const res = await apiRequest("POST", "/api/user/sync-discord-badges", {});
      const data = res as any;
      toast({ title: "Badges synced!", description: `Your Discord role badges are now updated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast({ title: e?.message || "Sync failed", variant: "destructive" });
    }
    setSyncing(false);
  };

  const userBadgeNames: string[] = user.badges || [];
  const hiddenBadges: string[] = (user as any).hiddenBadges || [];

  // Show ALL badges visible to all (or to this user)
  const visibleBadges = (badges || [])
    .filter((b: any) => {
      if (!b.visibleTo || b.visibleTo === "all") return true;
      const specific = b.visibleTo.split(",").filter(Boolean);
      return specific.includes(user.username);
    })
    .sort((a: any, b: any) => (a.badgeOrder ?? a.id) - (b.badgeOrder ?? b.id));

  const filtered = visibleBadges.filter((b: any) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVisibility = async (badgeName: string, currentlyHidden: boolean) => {
    setTogglingId(badgeName);
    try {
      const res = await fetch("/api/user/badge-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ badgeName, hidden: !currentlyHidden }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
        // Force user refresh
        window.location.reload();
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">Badges</h1>
          <p className="text-gray-500 text-sm mt-1">
            {userBadgeNames.length} earned · {visibleBadges.length} total visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasDiscord && (
            <button
              onClick={syncBadges}
              disabled={syncing}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[#5865F2]/30 text-[#7289da] hover:bg-[#5865F2]/10 transition-all disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <SiDiscord className="w-3 h-3" />}
              Sync Roles
            </button>
          )}
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search badges..."
              className="h-9 w-44 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discord hint for non-discord users */}
      {!hasDiscord && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#5865F2]/20 bg-[#5865F2]/5">
          <SiDiscord className="w-4 h-4 text-[#7289da] shrink-0 mt-0.5" />
          <p className="text-[12px] text-gray-400 leading-relaxed">
            <span className="font-black text-white">Hint:</span> Login with{" "}
            <a href="/auth/discord" className="text-[#7289da] underline font-bold hover:text-[#5865F2] transition-colors">
              Discord
            </a>{" "}
            to sync your badges with your Discord roles and automatically receive role-linked badges.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <Award className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="font-black text-gray-500">No badges found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((badge: any) => {
            const isOwned = userBadgeNames.includes(badge.name);
            const isHidden = hiddenBadges.includes(badge.name);
            const isUnavailable = badge.available === false;

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isUnavailable
                    ? "bg-[#0a0a0a] border-white/[0.03] opacity-50"
                    : isOwned
                    ? "bg-[#0e0e0e] border-orange-500/20 hover:border-orange-500/40"
                    : "bg-[#0e0e0e] border-white/[0.06] hover:border-white/10"
                }`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isUnavailable ? "grayscale" : ""}`}
                  style={{ backgroundColor: isUnavailable ? "#111" : "#F97316" + "18", border: `1px solid ${isUnavailable ? "#222" : "#F97316" + "30"}` }}>
                  {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/")
                    ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-9 h-9 object-contain" />
                    : <span className="text-2xl">{badge.icon}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black ${isUnavailable ? "text-gray-600" : isOwned ? "text-orange-400" : "text-gray-300"}`}>
                      {badge.name}
                    </span>
                    {isUnavailable && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-800 text-gray-600 border border-gray-700">
                        Unavailable
                      </span>
                    )}
                    {isOwned && !isUnavailable && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        Earned
                      </span>
                    )}
                  </div>
                  {badge.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{badge.description}</p>
                  )}
                  {badge.howToGet && !isUnavailable && (
                    <p className="text-[10px] text-gray-600 mt-1 flex items-start gap-1">
                      <span className="text-orange-500/50 font-black shrink-0">HOW TO GET:</span>
                      <span className="leading-snug">{badge.howToGet}</span>
                    </p>
                  )}
                </div>

                {/* SHOW/HIDE button for owned badges */}
                {isOwned && !isUnavailable && (
                  <button
                    onClick={() => toggleVisibility(badge.name, isHidden)}
                    disabled={togglingId === badge.name}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                      isHidden
                        ? "border-gray-600 text-gray-500 hover:border-orange-500/40 hover:text-orange-400 bg-white/[0.02]"
                        : "border-orange-500/30 text-orange-400 hover:border-orange-500/60 bg-orange-500/5"
                    }`}
                  >
                    {togglingId === badge.name ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isHidden ? (
                      <><EyeOff className="w-3 h-3" />Show</>
                    ) : (
                      <><Eye className="w-3 h-3" />Hide</>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Manage Badges Tab (Admin) ─────────────────────────────────────────────────

function ManageBadgesTab({ badges, adminUsers }: { badges: any[]; adminUsers: any[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [orderedBadges, setOrderedBadges] = useState<any[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [envEditorOpen, setEnvEditorOpen] = useState(false);
  const [envText, setEnvText] = useState("");
  const [envSaving, setEnvSaving] = useState(false);

  const badgesToEnv = (list: any[]) =>
    list.map(b =>
      `[${b.name}]\nimage = ${b.icon || ""}\navailable = ${b.available !== false ? "true" : "false"}\ndiscordRoleID = ${b.roleId || ""}`
    ).join("\n\n");

  const downloadEnv = () => {
    const content = badgesToEnv(orderedBadges);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "badges.env";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openEnvEditor = () => {
    setEnvText(badgesToEnv(orderedBadges));
    setEnvEditorOpen(true);
    setMoreOpen(false);
  };

  const saveEnv = async () => {
    setEnvSaving(true);
    try {
      const sections = envText.split(/\n\n+/);
      for (const section of sections) {
        const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
        const nameMatch = lines[0]?.match(/^\[(.+)\]$/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const get = (key: string) => {
          const l = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + " ="));
          return l ? l.slice(l.indexOf("=") + 1).trim() : undefined;
        };
        const image = get("image");
        const available = get("available");
        const discordRoleID = get("discordRoleID");
        const existing = orderedBadges.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          const payload: any = {};
          if (image !== undefined) payload.icon = image;
          if (available !== undefined) payload.available = available === "true";
          if (discordRoleID !== undefined) payload.roleId = discordRoleID;
          await apiRequest("PATCH", `/api/admin/badges/${existing.id}`, payload);
        } else {
          await apiRequest("POST", "/api/admin/badges", { name, icon: image || "", available: available !== "false", roleId: discordRoleID || "" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Badges updated from .env!" });
      setEnvEditorOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setEnvSaving(false);
  };

  useEffect(() => {
    const sorted = [...(badges || [])].sort((a, b) => (a.badgeOrder ?? a.id) - (b.badgeOrder ?? b.id));
    setOrderedBadges(sorted);
  }, [badges]);

  const filteredBadges = orderedBadges.filter((b: any) =>
    !search.trim() || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const syncWithDiscord = async () => {
    setSyncing(true);
    try {
      await apiRequest("POST", "/api/admin/badges/sync-discord", {});
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Badges synced with Discord!" });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const saveOrder = async (newOrder: any[]) => {
    setSavingOrder(true);
    try {
      await apiRequest("POST", "/api/admin/badges/reorder", {
        order: newOrder.map((b: any, i: number) => ({ id: b.id, badgeOrder: i })),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Order saved" });
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
    }
    setSavingOrder(false);
  };

  const handleDragStart = (id: number) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    const newOrder = [...orderedBadges];
    const fromIdx = newOrder.findIndex(b => b.id === dragId);
    const toIdx = newOrder.findIndex(b => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, item);
    setOrderedBadges(newOrder);
  };
  const handleDrop = () => {
    saveOrder(orderedBadges);
    setDragId(null);
  };

  const toggleAvailability = async (badge: any) => {
    setTogglingAvail(badge.id);
    try {
      await apiRequest("PATCH", `/api/admin/badges/${badge.id}`, { available: !badge.available });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setTogglingAvail(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">Manage Badges</h1>
          <p className="text-gray-500 text-sm mt-1">Drag to reorder · Toggle availability · Edit badge details</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search badges..."
              className="h-9 w-44 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* More... dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/[0.06] font-black rounded-xl transition-all text-sm"
            >
              <MoreHorizontal className="w-4 h-4" /> More..
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
                <button onClick={() => { downloadEnv(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-black text-gray-300 hover:bg-white/5 transition-colors text-left">
                  <Download className="w-3.5 h-3.5" /> Download as .env
                </button>
                <button onClick={openEnvEditor}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-black text-gray-300 hover:bg-white/5 transition-colors text-left">
                  <FileCode className="w-3.5 h-3.5" /> Edit as .env
                </button>
              </div>
            )}
          </div>
          <button
            onClick={syncWithDiscord}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#7289da] border border-[#5865F2]/30 font-black rounded-xl transition-all text-sm disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SiDiscord className="w-4 h-4" />}
            Sync Roles
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm">
                <Plus className="w-4 h-4" /> New Badge
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e0e] border-white/5 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-black">Create Badge</DialogTitle></DialogHeader>
              <BadgeEditor />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* .env Editor Dialog */}
      {envEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setEnvEditorOpen(false)}>
          <div className="bg-[#0e0e0e] border border-white/[0.08] rounded-2xl p-5 w-full max-w-lg mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black flex items-center gap-2"><FileCode className="w-4 h-4 text-orange-500" /> Edit Badges as .env</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Edit badge properties. Each badge section: [Name], image, available, discordRoleID.</p>
              </div>
              <button onClick={() => setEnvEditorOpen(false)} className="text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={envText}
              onChange={e => setEnvText(e.target.value)}
              rows={16}
              className="w-full bg-black border border-white/5 rounded-xl p-3 text-xs font-mono text-gray-300 focus:border-orange-500/40 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={saveEnv} disabled={envSaving}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                {envSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
              </button>
              <button onClick={() => setEnvEditorOpen(false)}
                className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-gray-300 font-black rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {savingOrder && (
        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving order...
        </div>
      )}

      <div className="space-y-2">
        {filteredBadges.length === 0 && (
          <div className="text-center py-12 text-gray-600 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No badges match your search" : "No badges yet"}</p>
          </div>
        )}
        {filteredBadges.map((badge: any) => {
          const userCount = (adminUsers || []).filter((u: any) => (u.badges || []).includes(badge.name)).length;
          const visibleLabel = !badge.visibleTo || badge.visibleTo === "all" ? "All" : `${badge.visibleTo.split(",").filter(Boolean).length} user(s)`;
          const isUnavailable = badge.available === false;
          return (
            <div
              key={badge.id}
              draggable
              onDragStart={() => handleDragStart(badge.id)}
              onDragOver={e => handleDragOver(e, badge.id)}
              onDrop={handleDrop}
              className={`flex items-center gap-3 px-4 py-3 bg-[#0e0e0e] border rounded-2xl transition-all cursor-grab active:cursor-grabbing ${
                dragId === badge.id ? "opacity-40 border-orange-500/40 scale-[0.98]" : "border-white/[0.06] hover:border-white/10"
              }`}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-gray-700 shrink-0" />

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUnavailable ? "grayscale opacity-50" : ""}`}
                style={{ backgroundColor: "#F97316" + "18", border: "1px solid #F97316" + "25" }}>
                {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/")
                  ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-7 h-7 object-contain" />
                  : <span className="text-xl">{badge.icon}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-black text-sm truncate ${isUnavailable ? "text-gray-600" : "text-white"}`}>{badge.name}</p>
                  {isUnavailable && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-800 text-gray-600">UNAVAILABLE</span>}
                  {badge.roleId && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#5865F2]/10 text-[#7289da]"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />Role linked</span>}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badge.visibleTo === "all" || !badge.visibleTo ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}`}>{visibleLabel}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {badge.description && <p className="text-[10px] text-gray-600 truncate">{badge.description}</p>}
                  <span className="text-[10px] text-gray-700 shrink-0">{userCount} user{userCount !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Available toggle */}
              <button
                onClick={() => toggleAvailability(badge)}
                disabled={togglingAvail === badge.id}
                title={isUnavailable ? "Mark as available" : "Mark as unavailable"}
                className={`shrink-0 w-10 h-6 rounded-full transition-all relative ${isUnavailable ? "bg-gray-700" : "bg-orange-500"} ${togglingAvail === badge.id ? "opacity-50" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isUnavailable ? "left-0.5" : "left-[calc(100%-1.375rem)]"}`} />
              </button>

              {/* Edit */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="shrink-0 h-8 w-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#0e0e0e] border-white/5 text-white max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-black">Edit Badge</DialogTitle></DialogHeader>
                  <BadgeEditor badge={badge} />
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Tab (consolidated sub-tabs) ────────────────────────────────────────

function AdminTab({ adminUsers, badges, isOwner, isAdmin, user, canCreateBadge, canGiveBadge }: { adminUsers: any[]; badges: any[]; isOwner: boolean; isAdmin: boolean; user: any; canCreateBadge: boolean; canGiveBadge: boolean }) {
  const userRole = user.role;
  const canManageBadgesLocal = canManageBadgesPerm(userRole);
  const canAccessBot = canAccessBotSettings(userRole);
  const canManageTeamLocal = canManageTeam(userRole);

  const canWebsite = canManageWebsite(userRole);
  const canChangelogs = canManageChangelogs(userRole);

  const ADMIN_SUB_TABS = [
    { value: "databank", label: "DATABANK", show: true },
    { value: "manage-badges", label: "MANAGE BADGES", show: canManageBadgesLocal || canGiveBadge },
    { value: "team", label: "TEAM", show: true },
    { value: "discord-bot", label: "DISCORD BOT", show: canAccessBot },
    { value: "tickets", label: "TICKETS", show: true },
    { value: "website-management", label: "WEBSITE MANAGEMENT", show: canWebsite },
    { value: "changelogs", label: "CHANGE LOGS", show: canChangelogs },
  ].filter(t => t.show);

  const [sub, setSub] = useState("databank");

  // Role badge styling
  const roleMeta: Record<string, { color: string; label: string; icon: any }> = {
    support: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Support", icon: Headphones },
    moderator: { color: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "Moderator", icon: Shield },
    administrator: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "Administrator", icon: ShieldCheck },
    admin: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "Admin", icon: ShieldCheck },
    developer: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Developer", icon: Cpu },
    owner: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Owner", icon: Crown },
    user: { color: "bg-gray-500/15 text-gray-400 border-gray-500/30", label: "User", icon: UserIcon },
    banned: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Banned", icon: Ban },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Platform management tools</p>
        </div>
        {/* Current user's role badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${roleMeta[userRole]?.color || roleMeta.user.color}`}>
          {(() => { const M = roleMeta[userRole]?.icon || UserIcon; return <M className="w-3 h-3" />; })()}
          {roleMeta[userRole]?.label || userRole}
        </div>
      </div>

      <div className="flex gap-1 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-1.5 w-fit flex-wrap">
        {ADMIN_SUB_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setSub(t.value)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sub === t.value ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}>
          {sub === "databank" && <DatabankTab adminUsers={adminUsers} badges={badges} isOwner={isOwner} isAdmin={isAdmin} />}
          {sub === "manage-badges" && <ManageBadgesTab badges={badges} adminUsers={adminUsers} />}
          {sub === "team" && <TeamTab currentUser={user} adminUsers={adminUsers} roleMeta={roleMeta} canManageTeam={canManageTeamLocal} />}
          {sub === "discord-bot" && <DiscordBotTab />}
          {sub === "tickets" && <TicketsTab user={user} />}
          {sub === "website-management" && canWebsite && <WebsiteManagementTab adminUsers={adminUsers} currentUser={user} />}
          {sub === "changelogs" && canChangelogs && <ChangeLogsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Databank Tab ─────────────────────────────────────────────────────────────

function UsernameChangeSection({ user }: { user: any }) {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [editing, setEditing] = useState(false);

  const mutation = useMutation({
    mutationFn: (username: string) => apiRequest("PATCH", "/api/user/username", { username }),
    onSuccess: () => {
      toast({ title: "Username updated! Reloading..." });
      setTimeout(() => window.location.reload(), 1200);
    },
    onError: (err: any) => {
      const msg = (err?.message || "Failed").replace(/^\d+:\s*/, "");
      toast({ title: msg, variant: "destructive" });
    },
  });

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> Profile URL / Domain
          </h3>
          <p className="text-xs text-gray-600 mt-1">Your public link: <span className="text-orange-400 font-mono">/{user.username}</span></p>
        </div>
        {!editing && (
          <button onClick={() => { setEditing(true); setNewUsername(user.username); }}
            className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 border border-orange-500/30 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-all">
            Change
          </button>
        )}
      </div>
      {editing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-gray-600 text-sm font-mono">/</span>
            <Input
              value={newUsername}
              onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="new-username"
              className="bg-transparent border-0 p-0 h-auto text-sm font-mono text-white focus-visible:ring-0"
            />
          </div>
          <p className="text-[10px] text-gray-600">3–30 characters. Letters, numbers, _ and - only.</p>
          <div className="flex gap-2">
            <Button
              onClick={() => mutation.mutate(newUsername)}
              disabled={mutation.isPending || !newUsername.trim() || newUsername === user.username}
              className="bg-orange-500 hover:bg-orange-400 text-black font-black text-xs px-4 border-0"
            >
              {mutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : "Save URL"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="text-xs font-black border-white/10 hover:bg-white/5">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabankTab({ adminUsers, badges, isOwner, isAdmin }: { adminUsers: any[]; badges: any[]; isOwner: boolean; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const { data: discordLogs } = useQuery<any[]>({ queryKey: ["/api/admin/discord-events"] });

  const filtered = (adminUsers || []).filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id).includes(q) || u.role?.toLowerCase().includes(q) || u.discordId?.toLowerCase().includes(q) || u.discordUsername?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">User Databank</h1>
        <p className="text-gray-500 text-sm mt-1">{(adminUsers || []).length} registered users</p>
      </div>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username, email, ID, role, or Discord..."
        className="bg-[#0e0e0e] border-white/10 max-w-sm" />
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] text-[10px] font-black uppercase tracking-widest text-gray-600 px-5 py-3 border-b border-white/[0.04] gap-4">
          <span className="w-8">ID</span><span>User</span><span>Email</span><span className="w-16 text-center">Role</span><span className="w-10 text-right">Manage</span>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No users found</div>}
        {filtered.map((u: any) => (
          <div key={u.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.015] text-sm">
            <span className="w-8 text-[10px] font-mono text-gray-600">#{u.id}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-xs shrink-0 border border-orange-500/20">{u.username[0].toUpperCase()}</div>
              <div className="min-w-0">
                <span className="font-bold truncate block">{u.username}</span>
                {u.discordId && <span className="text-[9px] text-[#7289da] flex items-center gap-0.5"><SiDiscord className="w-2.5 h-2.5" /> {u.discordUsername || u.discordId}</span>}
              </div>
            </div>
            <span className="text-[11px] text-gray-500 truncate">{u.email}</span>
            <span className={`w-16 text-center text-[10px] font-black uppercase px-2 py-0.5 rounded ${u.role === "owner" ? "bg-red-500/20 text-red-400" : u.role === "admin" ? "bg-orange-500/20 text-orange-400" : u.role === "banned" ? "bg-red-900/30 text-red-500" : "bg-white/5 text-gray-500"}`}>{u.role}</span>
            <div className="w-10 flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Settings className="w-3.5 h-3.5" /></button>
                </DialogTrigger>
                <DialogContent className="bg-[#0e0e0e] border-white/5 text-white">
                  <DialogHeader><DialogTitle className="font-black">Manage {u.username}</DialogTitle></DialogHeader>
                  <ManageUserDialog u={u} badges={badges || []} isOwner={isOwner} isAdmin={isAdmin} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>

      {/* Discord Login Events */}
      <div>
        <h2 className="text-lg font-black flex items-center gap-2 mb-4">
          <SiDiscord className="w-4 h-4 text-[#5865F2]" /> Discord Login Events
        </h2>
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] text-[10px] font-black uppercase tracking-widest text-gray-600 px-5 py-3 border-b border-white/[0.04] gap-4">
            <span>Discord User</span><span>Email</span><span className="w-20 text-center">Action</span><span className="w-32 text-right">Time</span>
          </div>
          {(!discordLogs || discordLogs.length === 0) && (
            <div className="text-center py-8 text-gray-600 text-sm">No Discord logins yet</div>
          )}
          {(discordLogs || []).map((e: any) => (
            <div key={e.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.015] text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <SiDiscord className="w-3 h-3 text-[#5865F2] shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold truncate block text-[13px]">{e.discordGlobalName || e.discordUsername}</span>
                  <span className="text-[10px] text-gray-600 font-mono">@{e.discordUsername} · {e.discordId}</span>
                </div>
              </div>
              <span className="text-[11px] text-gray-500 truncate">{e.email || "—"}</span>
              <span className={`w-20 text-center text-[10px] font-black uppercase px-2 py-0.5 rounded ${e.action === "register" ? "bg-green-500/20 text-green-400" : "bg-[#5865F2]/20 text-[#7289da]"}`}>
                {e.isNewUser ? "New" : e.action}
              </span>
              <span className="w-32 text-right text-[10px] text-gray-600 font-mono">
                {new Date(e.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Reward Section ──────────────────────────────────────────────────────

function DailyRewardSection() {
  const { toast } = useToast();

  const { data: rewardData, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/user/daily-reward"],
    refetchOnWindowFocus: true,
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/daily-reward/claim", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/daily-reward"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      refetch();
      const msgs: string[] = [`Day ${data.streak} streak! 🔥`];
      if (data.rewards?.includes("alias_slot")) msgs.push("Bonus: +1 alias slot!");
      if (data.rewards?.includes("day7_badge")) msgs.push("Badge unlocked: Day 7 Streak! 🏅");
      toast({ title: "Daily reward claimed!", description: msgs.join(" ") });
    },
    onError: (err: any) => {
      toast({ title: err?.message?.replace(/^\d+:\s*/, "") || "Already claimed", variant: "destructive" });
    },
  });

  if (isLoading) return null;

  const streak = rewardData?.streak || 0;
  const canClaim = rewardData?.canClaim;
  const totalLogins = rewardData?.totalDailyLogins || 0;

  const days = [
    { day: 1, reward: "Daily XP", icon: "⭐" },
    { day: 2, reward: "Daily XP", icon: "⭐" },
    { day: 3, reward: "+1 Alias Slot", icon: "🔗" },
    { day: 4, reward: "Daily XP", icon: "⭐" },
    { day: 5, reward: "Daily XP", icon: "⭐" },
    { day: 6, reward: "Daily XP", icon: "⭐" },
    { day: 7, reward: "Day 7 Streak Badge", icon: "🏅" },
  ];

  return (
    <div className="bg-[#0e0e0e] border border-orange-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black flex items-center gap-2 text-orange-400">
            🔥 Daily Login Streak
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Current streak: <span className="text-orange-400 font-black">{streak}</span> day{streak !== 1 ? "s" : ""} · Total logins: {totalLogins}
          </p>
        </div>
        <button
          onClick={() => claimMutation.mutate()}
          disabled={!canClaim || claimMutation.isPending}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${canClaim ? "bg-orange-500 hover:bg-orange-400 text-black" : "bg-white/5 text-gray-600 cursor-not-allowed"}`}
        >
          {claimMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : canClaim ? "Claim" : "Claimed"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const completed = streak >= d.day;
          const isNext = d.day === streak + 1 && canClaim;
          return (
            <div key={d.day} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${completed ? "border-orange-500/40 bg-orange-500/10" : isNext ? "border-orange-500/30 bg-orange-500/5 ring-1 ring-orange-500/30" : "border-white/5 bg-black/20"}`}>
              <span className="text-base">{d.icon}</span>
              <span className={`text-[9px] font-black uppercase ${completed ? "text-orange-400" : "text-gray-600"}`}>Day {d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Challenges Section ────────────────────────────────────────────────────────

function ChallengesSection() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/challenges"],
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 flex justify-center py-8">
      <Loader2 className="animate-spin w-4 h-4 text-orange-500" />
    </div>
  );

  const challenges: any[] = data?.challenges || [];
  const totalCompleted: number = data?.totalCompleted || 0;
  const questerUnlocked: boolean = data?.questerUnlocked || false;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Profile Challenges</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Complete 5 challenges to earn the <span className="text-yellow-400">Quester</span> badge</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono px-2 py-1 bg-white/5 rounded-lg text-gray-400">{totalCompleted}/8</span>
          {questerUnlocked && <p className="text-[10px] text-yellow-400 mt-1">⚔️ Quester unlocked!</p>}
        </div>
      </div>

      <div className="space-y-2">
        {challenges.map((ch: any) => {
          const pct = ch.target > 0 ? Math.min((ch.current / ch.target) * 100, 100) : 0;
          return (
            <div key={ch.key} className={`p-3 rounded-xl border transition-all ${ch.completed ? "border-green-500/30 bg-green-500/5" : "border-white/5 bg-black/20"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-sm font-bold ${ch.completed ? "text-green-400" : "text-white"}`}>
                  {ch.completed ? "✅" : "⬜"} {ch.label}
                </p>
                <span className={`text-[10px] font-mono ${ch.completed ? "text-green-400" : "text-gray-500"}`}>
                  {ch.current}/{ch.target}
                </span>
              </div>
              {!ch.completed && (
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alias Section ─────────────────────────────────────────────────────────────

function AliasSection({ user }: { user: any }) {
  const { toast } = useToast();
  const [aliasInput, setAliasInput] = useState("");

  const { data: aliasData, isLoading: aliasLoading } = useQuery<any>({
    queryKey: ["/api/user/alias"],
  });

  const addAliasMutation = useMutation({
    mutationFn: (alias: string) => apiRequest("POST", "/api/user/aliases/add", { alias }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alias"] });
      setAliasInput("");
      toast({ title: "Alias added" });
    },
    onError: (err: any) => {
      const raw = err?.message || "Failed to add alias";
      toast({ title: raw.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const removeAliasMutation = useMutation({
    mutationFn: (alias: string) => apiRequest("POST", "/api/user/aliases/remove", { alias }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alias"] });
      toast({ title: "Alias removed" });
    },
    onError: (err: any) => {
      toast({ title: err?.message?.replace(/^\d+:\s*/, "") || "Failed to remove alias", variant: "destructive" });
    },
  });

  const aliases: string[] = aliasData?.aliases || [];
  const maxAliases = aliasData?.maxAliases ?? 1;
  const origin = window.location.origin;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> Profile Aliases</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Custom URLs to find your profile. Max {maxAliases}.</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 bg-white/5 rounded-lg text-gray-400">{aliases.length}/{maxAliases}</span>
      </div>

      {aliasLoading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin w-4 h-4 text-orange-500" /></div>
      ) : (
        <div className="space-y-3">
          {aliases.length > 0 && (
            <div className="space-y-2">
              {aliases.map((al: string) => (
                <div key={al} className="flex items-center gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                  <Globe className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-orange-400">/{al}</p>
                    <p className="text-[10px] text-gray-500 truncate">{origin}/{al}</p>
                  </div>
                  <button onClick={() => removeAliasMutation.mutate(al)} disabled={removeAliasMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {aliases.length < maxAliases ? (
            <>
              <p className="text-[11px] text-gray-500">Set a custom short URL for your profile (e.g. <span className="text-orange-400 font-bold">/xos</span>).</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-black/60 border border-white/5 rounded-lg overflow-hidden focus-within:border-orange-500/50 transition-colors">
                  <span className="text-gray-600 text-sm px-3 shrink-0">{origin}/</span>
                  <input
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    onKeyDown={e => e.key === "Enter" && aliasInput.trim() && addAliasMutation.mutate(aliasInput)}
                    placeholder="yourname"
                    maxLength={30}
                    className="flex-1 bg-transparent h-9 text-sm text-white outline-none pr-3"
                  />
                </div>
                <button
                  onClick={() => aliasInput.trim() && addAliasMutation.mutate(aliasInput)}
                  disabled={!aliasInput.trim() || aliasInput.length < 2 || addAliasMutation.isPending}
                  className="px-4 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-1">
                  {addAliasMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-600">2-30 characters, letters/numbers/dash/underscore only.</p>
            </>
          ) : aliases.length === 0 ? (
            <p className="text-[11px] text-gray-600 text-center py-2">You have no alias slots. Purchase one in the <a href="/shop" className="text-orange-500 hover:underline">Shop</a> or log in 3 days in a row!</p>
          ) : (
            <p className="text-[11px] text-gray-600 text-center py-2">All alias slots used. Get more from the <a href="/shop" className="text-orange-500 hover:underline">Shop</a>.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Extras Tab ───────────────────────────────────────────────────────────────

function ExtrasTab({ user, localProfile, upd, updS, getS, profileMutation, userTracks, defaultSection }: any) {
  const [extrasSection, setExtrasSection] = useState<"tags" | "tracks" | "alias" | "visual" | "embed" | "challenges">(defaultSection || "tags");
  const maxTags = user?.maxTags ?? 5;
  const tags: string[] = localProfile?.settings?.tags || [];
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t) || tags.length >= maxTags) return;
    updS("tags", [...tags, t]);
    setNewTag("");
  };
  const removeTag = (tag: string) => updS("tags", tags.filter((t: string) => t !== tag));

  const EXTRA_SECTIONS = [
    { id: "tags", label: "Tags", icon: Tag, url: "/dashboard/tags" },
    { id: "visual", label: "Visual", icon: Eye, url: "/dashboard/visual" },
    { id: "tracks", label: "Tracks", icon: Music, url: "/dashboard/tracks" },
    { id: "alias", label: "Alias", icon: Globe, url: "/dashboard/alias" },
    { id: "challenges", label: "Challenges", icon: Zap, url: "/dashboard/challenges" },
    { id: "embed", label: "Discord Embed", icon: SiDiscord, url: "/dashboard/embed" },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Extras</h1>
        <p className="text-gray-500 text-sm mt-1">Tags, tracks, status, pronouns, and visual extras</p>
      </div>

      {/* Sub-tab buttons — horizontal icon row with hover animations */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {EXTRA_SECTIONS.map(({ id, label, icon: Icon, url }) => (
          <motion.button
            key={id}
            onClick={() => { setExtrasSection(id); window.history.pushState({}, "", url); }}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-colors duration-150 border shrink-0 ${extrasSection === id ? "bg-orange-500 border-orange-500 text-black shadow-lg shadow-orange-500/25" : "border-white/10 text-gray-400 hover:border-orange-500/30 hover:text-white bg-[#0e0e0e]"}`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {extrasSection === "tags" && (
          <motion.div key="tags" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="space-y-4">
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black flex items-center gap-2"><Tag className="w-4 h-4 text-orange-500" /> Profile Tags</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Shown as chips on your profile. Max {maxTags}.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 bg-white/5 rounded-lg text-gray-400">{tags.length}/{maxTags}</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {tags.length === 0 && <p className="text-[11px] text-gray-600 py-1">No tags yet — add one below</p>}
                {tags.map((tag: string) => (
                  <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                  </motion.span>
                ))}
              </div>
              {tags.length < maxTags && (
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
                    placeholder="Add a tag... (press Enter)" maxLength={20}
                    className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm" />
                  <button onClick={addTag} disabled={!newTag.trim() || tags.length >= maxTags}
                    className="px-4 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg transition-all disabled:opacity-50">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
              <SettingRow label="Tags Position" desc="Where tags appear on your profile">
                <Select value={getS("tagsPosition", "default")} onValueChange={v => updS("tagsPosition", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="default" className="text-xs">Below bio</SelectItem>
                    <SelectItem value="above-links" className="text-xs">Above links</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                className="w-full h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2">
                {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Tags"}
              </button>
            </div>
            {/* Profile Bubbles */}
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profile Bubbles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</label>
                  <div className="flex gap-2">
                    <Input value={getS("statusEmoji", "")} onChange={e => updS("statusEmoji", e.target.value)}
                      placeholder="🔥" maxLength={4} className="bg-black/60 border-white/5 h-8 w-14 text-center text-sm shrink-0" />
                    <Input value={getS("statusMessage", "")} onChange={e => updS("statusMessage", e.target.value)}
                      placeholder="What's your status?" maxLength={80} className="bg-black/60 border-white/5 h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pronouns</label>
                  <Input value={getS("pronouns", "")} onChange={e => updS("pronouns", e.target.value)}
                    placeholder="e.g. he/him" maxLength={30} className="bg-black/60 border-white/5 h-8 text-sm" />
                </div>
              </div>
              <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                className="w-full h-8 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Bubbles"}
              </button>
            </div>
          </motion.div>
        )}
        {extrasSection === "visual" && (
          <motion.div key="visual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <SectionTitle>Visual Extras</SectionTitle>

            <SettingRow label="Match Links to Theme" desc="Link icons use your theme color (white icon on theme bg)">
              <Switch checked={getS("matchLinksToTheme", false)} onCheckedChange={v => updS("matchLinksToTheme", v)} />
            </SettingRow>

            <SettingRow label="Theme Colour Link Icons" desc="When on, all link icons use your theme colour instead of the platform colours">
              <Switch checked={getS("themeColorIcons", false)} onCheckedChange={v => updS("themeColorIcons", v)} />
            </SettingRow>

            <SettingRow label="Links Glow to Theme Colour" desc="Links get a clean outer glow in your theme colour">
              <Switch checked={getS("linksGlow", false)} onCheckedChange={v => updS("linksGlow", v)} />
            </SettingRow>

            <SettingRow label="Links Layout" desc="How regular links are arranged on your profile">
              <Select value={getS("linksLayout", "stacked")} onValueChange={v => updS("linksLayout", v)}>
                <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0e0e0e] border-white/10">
                  <SelectItem value="stacked" className="text-xs">Stacked</SelectItem>
                  <SelectItem value="grid" className="text-xs">Grid (2 col)</SelectItem>
                  <SelectItem value="split" className="text-xs">Split (2 col)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <div className="h-px bg-white/5" />

            <SettingRow label="Match Badges to Theme" desc="Badge icons tinted to match your theme color">
              <Switch checked={getS("matchBadgesToTheme", false)} onCheckedChange={v => updS("matchBadgesToTheme", v)} />
            </SettingRow>

            <SettingRow label="Badges Glow" desc="Badges glow with your theme color">
              <Switch checked={getS("badgesGlow", false)} onCheckedChange={v => updS("badgesGlow", v)} />
            </SettingRow>

            <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
              className="w-full h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2">
              {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save"}
            </button>
          </motion.div>
        )}
        {extrasSection === "tracks" && (
          <motion.div key="tracks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <TrackTab userTracks={userTracks} />
          </motion.div>
        )}
        {extrasSection === "alias" && (
          <motion.div key="alias" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <AliasSection user={user} />
          </motion.div>
        )}
        {extrasSection === "challenges" && (
          <motion.div key="challenges" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <ChallengesSection />
          </motion.div>
        )}
        {extrasSection === "embed" && (
          <motion.div key="embed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="space-y-4">
            <EmbedCustomizerSection
              localProfile={localProfile}
              user={user}
              getS={getS}
              updS={updS}
              profileMutation={profileMutation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Embed Customizer Section ────────────────────────────────────────────────

function EmbedCustomizerSection({ localProfile, user, getS, updS, profileMutation }: { localProfile: any; user: any; getS: (k: string, d: any) => any; updS: (k: string, v: any) => void; profileMutation: any }) {
  const { uploadFile, isUploading } = useUpload();
  const customImgRef = useRef<HTMLInputElement>(null);

  const isPremium = user?.isPremium;
  const showWatermark = localProfile?.showWatermark !== false;
  const defaultTitle = (isPremium && !showWatermark)
    ? (localProfile?.displayName || user?.username || "Your Name")
    : `${localProfile?.displayName || user?.username || "Your Name"} — Hexed`;

  const imageSize: "small" | "large" = getS("discordEmbedImageSize", "small");
  const customImage: string = getS("discordEmbedCustomImage", "");
  const showAvatar: boolean = getS("discordEmbedShowAvatar", true);

  const previewImage = (() => {
    if (customImage) return customImage;
    if (showAvatar && localProfile?.avatarUrl) return resolveUrl(localProfile.avatarUrl);
    return "";
  })();

  const descText = getS("discordEmbedDescription", "") || localProfile?.bio || "";

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-black flex items-center gap-2 text-[#5865F2]"><SiDiscord className="w-4 h-4" /> Discord Embed</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Customize how your profile looks when shared in Discord or other platforms.</p>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Title</label>
          <Input
            value={getS("discordEmbedTitle", "")}
            onChange={e => updS("discordEmbedTitle", e.target.value)}
            placeholder={defaultTitle}
            maxLength={100}
            className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 h-9 text-sm"
          />
          <p className="text-[10px] text-gray-600">
            Leave blank to use your display name{isPremium && !showWatermark ? "" : " — Hexed"} automatically.
            {!isPremium && <span className="text-[#9333ea] ml-1">Premium removes the "— Hexed" suffix.</span>}
          </p>
        </div>

        {/* Description with markdown hint */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Description</label>
          <Textarea
            value={getS("discordEmbedDescription", "")}
            onChange={(e: any) => updS("discordEmbedDescription", e.target.value)}
            placeholder={localProfile?.bio || "Write something about yourself..."}
            rows={3}
            maxLength={300}
            className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 text-sm resize-none font-mono"
          />
          <p className="text-[10px] text-gray-600">Supports Discord markdown: <code className="bg-white/5 px-1 rounded">**bold**</code> <code className="bg-white/5 px-1 rounded">*italic*</code> <code className="bg-white/5 px-1 rounded">~~strike~~</code> <code className="bg-white/5 px-1 rounded">`code`</code> <code className="bg-white/5 px-1 rounded">{"> quote"}</code></p>
        </div>

        {/* Image section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Image</label>
          <div className="flex gap-2">
            <button
              onClick={() => updS("discordEmbedShowAvatar", !showAvatar)}
              className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all ${showAvatar && !customImage ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}
            >
              Use Avatar
            </button>
            <button
              onClick={() => { updS("discordEmbedCustomImage", ""); if (customImgRef.current) customImgRef.current.value = ""; }}
              className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all ${!customImage && !showAvatar ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}
            >
              No Image
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              value={customImage}
              onChange={e => updS("discordEmbedCustomImage", e.target.value)}
              placeholder="Or paste an image URL / GIF link..."
              className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 h-9 text-sm flex-1"
            />
            <button
              onClick={() => customImgRef.current?.click()}
              disabled={isUploading}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-black text-gray-400 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
            </button>
            <input ref={customImgRef} type="file" accept="image/*,image/gif" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return;
              const url = await uploadFile(file);
              if (url) updS("discordEmbedCustomImage", url);
            }} />
          </div>
        </div>

        {/* Image size */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Image Layout</label>
          <div className="flex gap-2">
            {(["small", "large"] as const).map(size => (
              <button key={size} onClick={() => updS("discordEmbedImageSize", size)}
                className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all capitalize ${imageSize === size ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}>
                {size === "small" ? "Small Thumbnail" : "Large Image"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Preview</p>
        <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#313338] p-3 max-w-sm">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-[#5865F2]/30 flex items-center justify-center shrink-0">
              <SiDiscord className="w-4 h-4 text-[#5865F2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold text-[#5865F2]">Hexed</span>
                <span className="text-[9px] bg-[#5865F2] text-white font-bold px-1 py-0.5 rounded">BOT</span>
                <span className="text-[10px] text-[#949ba4]">Today</span>
              </div>
              <div className="rounded-lg overflow-hidden border-l-4 bg-[#2b2d31]" style={{ borderLeftColor: localProfile?.themeColor || "#F97316" }}>
                {imageSize === "large" ? (
                  <div className="p-3 space-y-1">
                    <p className="text-[11px] font-bold text-white truncate">
                      {getS("discordEmbedTitle", "") || defaultTitle}
                    </p>
                    <p className="text-[10px] text-[#b5bac1] leading-relaxed line-clamp-4">
                      {descText ? renderDiscordMarkdown(descText) : "No description set."}
                    </p>
                    <p className="text-[9px] text-[#949ba4] pt-0.5">hexed.at/{user?.username || "username"}</p>
                    {previewImage && (
                      <img src={previewImage} alt="" className="w-full rounded-lg object-cover mt-2 max-h-40" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[11px] font-bold text-white truncate">
                        {getS("discordEmbedTitle", "") || defaultTitle}
                      </p>
                      <p className="text-[10px] text-[#b5bac1] leading-relaxed line-clamp-3">
                        {descText ? renderDiscordMarkdown(descText) : "No description set."}
                      </p>
                      <p className="text-[9px] text-[#949ba4] pt-1">hexed.at/{user?.username || "username"}</p>
                    </div>
                    {previewImage && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#313338] border border-white/10">
                        <img src={previewImage} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
        className="w-full h-9 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2">
        {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Embed Settings"}
      </button>
    </div>
  );
}

// ─── Links Tab ────────────────────────────────────────────────────────────────

function DiscordEmbedPreview({ url }: { url: string }) {
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = (url || "").trim();
    const code = raw
      .replace(/https?:\/\/discord\.gg\//i, "")
      .replace(/https?:\/\/discord\.com\/invite\//i, "")
      .replace(/\?.*/, "")
      .trim();
    if (!code) { setLoading(false); return; }
    fetch(`/api/discord-invite/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setServer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-white/10 rounded w-28" />
        <div className="h-2.5 bg-white/5 rounded w-20" />
      </div>
      <div className="w-14 h-7 bg-white/10 rounded-lg" />
    </div>
  );

  if (!server?.name) return null;

  const joinUrl = `https://discord.gg/${server.code}`;
  return (
    <a
      href={joinUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/8 hover:bg-[#5865F2]/12 transition-colors"
    >
      {server.icon
        ? <img src={server.icon} alt="" className="w-10 h-10 rounded-full shrink-0" />
        : <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0">
            <span className="text-[#5865F2] font-black text-base">{server.name[0]}</span>
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate">{server.name}</p>
        <p className="text-[11px] text-gray-500">
          <span className="text-green-400 font-bold">{server.onlineCount?.toLocaleString() ?? "?"}</span> online
          {" · "}
          <span className="font-bold text-gray-400">{server.memberCount?.toLocaleString() ?? "?"}</span> members
        </p>
      </div>
      <span className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-lg text-xs transition-colors shrink-0">
        Join
      </span>
    </a>
  );
}

function LinksTab({ userLinks, linksLoading }: { userLinks: any[]; linksLoading: boolean }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [adding, setAdding] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStyle, setNewStyle] = useState("default");
  const [newIcon, setNewIcon] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");

  const platform = PLATFORMS.find(p => p.id === selectedPlatform);

  const resetForm = () => {
    setNewTitle(""); setNewUrl(""); setNewDesc(""); setNewStyle("default"); setNewIcon("");
    setSelectedPlatform(null); setPlatformSearch(""); setAdding(false);
  };

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/links", {
      title: newTitle || (selectedPlatform === "discord-embed" ? "Discord Server" : ""),
      url: newUrl,
      description: selectedPlatform === "discord-embed" ? "" : newDesc,
      platform: selectedPlatform || "",
      style: selectedPlatform === "discord-embed" ? "card" : newStyle,
      icon: newIcon,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      resetForm();
      toast({ title: "Link added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/links/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/links"] }); toast({ title: "Link deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: any) => apiRequest("PATCH", `/api/links/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const styleMutation = useMutation({
    mutationFn: ({ id, style }: any) => apiRequest("PATCH", `/api/links/${id}`, { style }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, order }: any) => apiRequest("PATCH", `/api/links/${id}`, { order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const moveLink = (link: any, dir: -1 | 1) => {
    const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex((l: any) => l.id === link.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    moveMutation.mutate({ id: link.id, order: swap.order ?? swapIdx });
    moveMutation.mutate({ id: swap.id, order: link.order ?? idx });
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setNewIcon(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const filteredPlatforms = platformSearch.trim()
    ? PLATFORMS.filter(p => p.name.toLowerCase().includes(platformSearch.toLowerCase()))
    : PLATFORMS;

  const LINK_STYLES = [
    { value: "default", label: "Default", desc: "Row with icon and text" },
    { value: "card", label: "Card", desc: "Large card with platform color" },
    { value: "icon", label: "Icon Only", desc: "Small icon button, grouped" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Links</h1>
          <p className="text-gray-500 text-sm mt-1">Add social platforms and custom links</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm">
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-[#0e0e0e] border border-orange-500/30 rounded-2xl p-5 space-y-4 overflow-hidden">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">New Link</h3>

            {/* Platform picker */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-500">Platform (Optional)</Label>
              {selectedPlatform === "discord-embed" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
                    <SiDiscord className="w-5 h-5 text-[#5865F2]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">Discord Server Card</p>
                    <p className="text-[10px] text-gray-500">Shows server icon, name, members & join button</p>
                  </div>
                  <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : selectedPlatform && selectedPlatform !== "custom" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${platform?.color}22` }}>
                    {platform && <platform.icon style={{ color: platform.color }} className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">{platform?.name}</p>
                    <p className="text-[10px] text-gray-500">{platform?.domain}</p>
                  </div>
                  <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); setNewIcon(""); }}
                    className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : selectedPlatform === "custom" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-black text-sm flex-1">Custom Link</p>
                  <button onClick={() => { setSelectedPlatform(null); setNewIcon(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input value={platformSearch} onChange={e => setPlatformSearch(e.target.value)}
                    placeholder="Search platforms or skip..." className="bg-black/60 border-white/5 h-8 text-xs" />
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto">
                    {filteredPlatforms.map(p => (
                      <button key={p.id} onClick={() => {
                        setSelectedPlatform(p.id);
                        if (!newTitle) setNewTitle(p.name);
                        setNewUrl(p.placeholder);
                        setPlatformSearch("");
                      }}
                        title={p.name}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${p.color}22` }}>
                          <p.icon style={{ color: p.color }} className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors truncate w-full text-center">{p.name.split("/")[0].trim()}</span>
                      </button>
                    ))}
                    <button onClick={() => { setSelectedPlatform("discord-embed"); setPlatformSearch(""); setNewTitle("Discord Server"); }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-[#5865F2]/40 bg-black/30 hover:bg-black/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5865F2]/10">
                        <SiDiscord className="w-4 h-4 text-[#5865F2]" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Server Card</span>
                    </button>
                    <button onClick={() => { setSelectedPlatform("custom"); setPlatformSearch(""); }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
                        <LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Custom</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedPlatform === "discord-embed" ? (
              /* Discord Embed: only needs invite URL */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Label (Optional)</Label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discord Server"
                    className="bg-black/60 border-white/5 focus:border-[#5865F2]/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Server Invite URL *</Label>
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://discord.gg/invite123"
                    className="bg-black/60 border-[#5865F2]/20 focus:border-[#5865F2]/50" />
                  <p className="text-[9px] text-gray-600">Server info (icon, name, members) is fetched automatically from the invite</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Title *</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Website"
                      className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">URL *</Label>
                    <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                      placeholder={platform?.placeholder || "https://..."}
                      className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Description</Label>
                  <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description..."
                    className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                </div>

                {/* Custom icon (for custom links) */}
                {selectedPlatform === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Custom Icon (Optional)</Label>
                    <div className="flex gap-2">
                      <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Paste image URL..."
                        className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm flex-1" />
                      <label className={`flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                      </label>
                    </div>
                    {newIcon && <img src={resolveUrl(newIcon)} alt="" className="w-10 h-10 object-contain rounded-lg border border-white/10" />}
                  </div>
                )}

                {/* Display style */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Display Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LINK_STYLES.map(s => (
                      <button key={s.value} onClick={() => setNewStyle(s.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${newStyle === s.value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
                        <p className={`text-xs font-black ${newStyle === s.value ? "text-orange-500" : "text-gray-300"}`}>{s.label}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addMutation.mutate()}
                disabled={!newUrl || (!newTitle && selectedPlatform !== "discord-embed") || addMutation.isPending}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {addMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Add Link"}
              </button>
              <button onClick={resetForm} className="px-4 h-9 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-black rounded-xl transition-all text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {linksLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <LinkIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="font-black text-gray-500">No links yet</p>
          <p className="text-[11px] text-gray-700 mt-1">Add your social platforms and websites above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((link: any, idx: number) => {
            const lp = getPlatform(link.platform);
            return (
              <motion.div key={link.id} layout className={`p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl group hover:border-white/10 transition-colors ${link.platform === "discord-embed" ? "border-[#5865F2]/20 hover:border-[#5865F2]/30" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveLink(link, -1)} disabled={idx === 0} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveLink(link, 1)} disabled={idx === sorted.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                  {link.platform === "discord-embed" ? (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
                      <SiDiscord className="w-5 h-5 text-[#5865F2]" />
                    </div>
                  ) : lp ? (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${lp.color}22` }}>
                      <lp.icon style={{ color: lp.color }} className="w-5 h-5" />
                    </div>
                  ) : link.icon ? (
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <img src={resolveUrl(link.icon)} alt="" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{link.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{link.url}</p>
                  </div>
                  {link.platform !== "discord-embed" && (
                    <Select value={link.style || "default"} onValueChange={style => styleMutation.mutate({ id: link.id, style })}>
                      <SelectTrigger className="w-24 bg-black/40 border-white/10 text-[10px] h-7 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0e0e0e] border-white/10">
                        <SelectItem value="default" className="text-xs">Default</SelectItem>
                        <SelectItem value="card" className="text-xs">Card</SelectItem>
                        <SelectItem value="icon" className="text-xs">Icon</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {link.platform === "discord-embed" && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#5865F2] bg-[#5865F2]/10 px-2 py-1 rounded-lg shrink-0">Embed</span>
                  )}
                  <Switch checked={link.enabled !== false} onCheckedChange={enabled => toggleMutation.mutate({ id: link.id, enabled })} />
                  <button onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(link.id); }}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {link.platform === "discord-embed" && link.url && (
                  <DiscordEmbedPreview url={link.url} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Track Tab ────────────────────────────────────────────────────────────────

function TrackTab({ userTracks }: { userTracks: any[] }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [adding, setAdding] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [artistProfile, setArtistProfile] = useState("");

  const addTrackMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tracks", { title: trackTitle, url: trackUrl, artistProfile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setTrackTitle(""); setTrackUrl(""); setArtistProfile(""); setAdding(false);
      toast({ title: "Track added" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setTrackUrl(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Track</h1>
          <p className="text-gray-500 text-sm mt-1">Manage music tracks for your profile player</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="px-5 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Track
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="border border-orange-500/20 rounded-2xl p-4 space-y-3 bg-orange-500/5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Track Title</Label>
              <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Song name..." className="bg-black/60 border-white/5 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Artist / Profile <span className="text-gray-600 normal-case font-normal">(optional)</span></Label>
              <Input value={artistProfile} onChange={e => setArtistProfile(e.target.value)} placeholder="Artist name or profile link..." className="bg-black/60 border-white/5 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Audio URL or Upload</Label>
              <div className="flex gap-2">
                <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://... or upload" className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
                <label className={`flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5 cursor-pointer ${isUploading ? "opacity-50" : "hover:border-orange-500/40"}`}>
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addTrackMutation.mutate()} disabled={!trackTitle || !trackUrl || addTrackMutation.isPending}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {addTrackMutation.isPending ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "Add Track"}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 h-9 text-gray-500 hover:text-white font-black rounded-xl border border-white/10 text-sm transition-all">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
        {(userTracks || []).length === 0 && !adding ? (
          <div className="py-12 text-center">
            <Music className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-bold">No tracks yet</p>
            <p className="text-[11px] text-gray-700 mt-1">Add your first track above</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {(userTracks || []).map((t: any, i: number) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] font-black text-gray-700 w-4 text-center">{i + 1}</span>
                <Music className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.title}</p>
                  {t.artistProfile && <p className="text-[11px] text-gray-500 truncate mt-0.5">{t.artistProfile}</p>}
                </div>
                <button onClick={() => deleteTrackMutation.mutate(t.id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Miscellaneous Tab ────────────────────────────────────────────────────────

function MiscTab({ localProfile, upd, updS, getS, userTracks, profileMutation, user }: any) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [miscSection, setMiscSection] = useState("tracks");
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");

  const addTrackMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tracks", { title: trackTitle, url: trackUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setTrackTitle(""); setTrackUrl(""); setAddingTrack(false);
      toast({ title: "Track added" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const handleTrackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setTrackUrl(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const SECTIONS = [
    { id: "tracks",     label: "Track Player",  icon: Music },
    { id: "effects",    label: "Effects",        icon: Sparkles },
    { id: "page",       label: "Page",           icon: Settings },
    { id: "colors",     label: "Colors",         icon: Palette },
    { id: "banner",     label: "Banner",         icon: ImageIcon },
    { id: "background", label: "Background",     icon: MonitorPlay },
    { id: "box",        label: "Profile Box",    icon: LayoutTemplate },
    { id: "username",   label: "Username",       icon: Type },
    { id: "avatar",     label: "Avatar",         icon: UserIcon },
    { id: "cursor",     label: "Cursor",         icon: MousePointer },
    { id: "alignment",  label: "Alignment",      icon: AlignCenter },
    { id: "reveal",     label: "Reveal Screen",  icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Miscellaneous</h1>
          <p className="text-gray-500 text-sm mt-1">Advanced visual effects and page settings</p>
        </div>
        <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
          className="px-5 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
          {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save"}
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left sidebar nav */}
        <div className="w-40 shrink-0 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-2 space-y-0.5 self-start">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMiscSection(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold ${
                miscSection === id ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Right content panel */}
        <div className="flex-1 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 min-h-[380px]">

          {/* TRACK PLAYER */}
          {miscSection === "tracks" && (
            <div className="space-y-4">
              <SectionTitle>Track Player</SectionTitle>
              <SettingRow label="Enable Track Player" desc="Show the music player on your profile">
                <Switch checked={getS("trackPlayerEnabled", true)} onCheckedChange={v => updS("trackPlayerEnabled", v)} />
              </SettingRow>
              <SettingRow label="Position" desc="Where to show the player widget">
                <Select value={getS("trackPlayerPos", "bottom-right")} onValueChange={v => updS("trackPlayerPos", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    {["top-left","top-right","bottom-left","bottom-right"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Autoplay" desc="Start playing music automatically when profile loads">
                <Switch checked={getS("trackPlayerAutoplay", true)} onCheckedChange={v => updS("trackPlayerAutoplay", v)} />
              </SettingRow>
              <SettingRow label="Random Start" desc="Begin on a random track each time the profile loads">
                <Switch checked={getS("trackRandomStart", false)} onCheckedChange={v => updS("trackRandomStart", v)} />
              </SettingRow>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-gray-600">Tracks ({(userTracks || []).length})</span>
                  <button onClick={() => setAddingTrack(a => !a)} className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Track
                  </button>
                </div>
                <AnimatePresence>
                  {addingTrack && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="border border-orange-500/20 rounded-xl p-3 space-y-2 bg-orange-500/5">
                      <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Track title..." className="bg-black/60 border-white/5 h-8 text-sm" />
                      <div className="flex gap-2">
                        <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://... or upload" className="bg-black/60 border-white/5 h-8 text-sm flex-1" />
                        <label className={`flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5 cursor-pointer ${isUploading ? "opacity-50" : ""}`}>
                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
                          <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleTrackUpload} />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addTrackMutation.mutate()} disabled={!trackTitle || !trackUrl || addTrackMutation.isPending}
                          className="flex-1 h-8 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                          {addTrackMutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : "Add"}
                        </button>
                        <button onClick={() => setAddingTrack(false)} className="px-3 h-8 text-gray-500 hover:text-white font-black rounded-lg border border-white/10 text-sm transition-all">Cancel</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {(userTracks || []).length === 0 && !addingTrack && (
                  <p className="text-[11px] text-gray-600 text-center py-2">No tracks yet — add one above</p>
                )}
                {(userTracks || []).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 bg-black/30 border border-white/5 rounded-xl group">
                    <Music className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-sm font-bold flex-1 truncate">{t.title}</span>
                    <button onClick={() => deleteTrackMutation.mutate(t.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EFFECTS */}
          {miscSection === "effects" && (
            <div className="space-y-4">
              <SectionTitle>Visual Effects</SectionTitle>
              <SettingRow label="Profile Effect" desc="Color grading and film effects over your entire profile">
                <Select value={getS("profileEffect", "none")} onValueChange={v => updS("profileEffect", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="retro" className="text-xs">Retro</SelectItem>
                    <SelectItem value="oldtv" className="text-xs">Old TV</SelectItem>
                    <SelectItem value="night" className="text-xs">Night</SelectItem>
                    <SelectItem value="vhs" className="text-xs">VHS</SelectItem>
                    <SelectItem value="glitch" className="text-xs">Glitch</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Background Particles" desc="Animated particles over the background">
                <Select value={getS("bgParticles", "none")} onValueChange={v => updS("bgParticles", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="particles" className="text-xs">Particles</SelectItem>
                    <SelectItem value="snow" className="text-xs">Snow</SelectItem>
                    <SelectItem value="rain" className="text-xs">Rain</SelectItem>
                    <SelectItem value="fireflies" className="text-xs">Fireflies</SelectItem>
                    <SelectItem value="coins" className="text-xs">Coins</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Page Overlay" desc="Decorative overlay over the background">
                <Select value={getS("pageOverlay", "none")} onValueChange={v => updS("pageOverlay", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    {["none","dark","grid","dots","scanlines","vignette"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SettingRow>
            </div>
          )}

          {/* PAGE */}
          {miscSection === "page" && (
            <div className="space-y-4">
              <SectionTitle>Page Settings</SectionTitle>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Favicon URL</Label>
                <Input value={getS("faviconUrl", "")} onChange={e => updS("faviconUrl", e.target.value)} placeholder="https://..." className="bg-black/60 border-white/5 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Page Title</Label>
                <Input value={getS("pageTitle", "")} onChange={e => updS("pageTitle", e.target.value)} placeholder="Custom browser tab title..." className="bg-black/60 border-white/5 h-9 text-sm" />
              </div>
              <SettingRow label="Title Animation" desc="How the page title animates in the browser tab">
                <Select value={getS("pageTitleAnim", "none")} onValueChange={v => updS("pageTitleAnim", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="scroll" className="text-xs">Scroll</SelectItem>
                    <SelectItem value="blink" className="text-xs">Blink</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              {getS("pageTitleAnim", "none") !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-gray-500">Animation Speed</Label>
                  <NumSlider value={getS("pageTitleAnimSpeed", 3)} onChange={v => updS("pageTitleAnimSpeed", v)} min={1} max={10} />
                </div>
              )}
              <SettingRow label="Enter Animation">
                <Select value={getS("pageEnterAnim", "fade")} onValueChange={v => updS("pageEnterAnim", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    {["fade","slide-up","scale","blur"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Enter Animation Speed</Label>
                <NumSlider value={getS("pageEnterSpeed", 0.4)} onChange={v => updS("pageEnterSpeed", v)} min={0.1} max={2} step={0.1} unit="s" />
              </div>
            </div>
          )}

          {/* COLORS */}
          {miscSection === "colors" && (
            <div className="space-y-4">
              <SectionTitle>Colors</SectionTitle>
              <SettingRow label="Theme / Accent Color">
                <ColorPicker value={localProfile?.themeColor || "#F97316"} onChange={v => upd("themeColor", v)} label="Theme" />
              </SettingRow>
              <SettingRow label="Primary Text Color">
                <ColorPicker value={getS("primaryTextColor", "#ffffff")} onChange={v => updS("primaryTextColor", v)} label="Primary" />
              </SettingRow>
              <SettingRow label="Secondary Text Color">
                <ColorPicker value={getS("secondaryTextColor", "#9ca3af")} onChange={v => updS("secondaryTextColor", v)} label="Secondary" />
              </SettingRow>
              <SettingRow label="Box Border Color">
                <ColorPicker value={getS("boxBorderColor", "#ffffff")} onChange={v => updS("boxBorderColor", v)} label="Border" />
              </SettingRow>
            </div>
          )}

          {/* BANNER */}
          {miscSection === "banner" && (
            <div className="space-y-4">
              <SectionTitle>Banner Settings</SectionTitle>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Banner Opacity</Label>
                <NumSlider value={getS("bannerOpacity", 1)} onChange={v => updS("bannerOpacity", v)} min={0} max={1} step={0.05} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Banner Blur</Label>
                <NumSlider value={getS("bannerBlur", 0)} onChange={v => updS("bannerBlur", v)} min={0} max={20} unit="px" />
              </div>
              <SettingRow label="Banner Height" desc="Height of the banner area">
                <Select value={getS("bannerHeight", "160")} onValueChange={v => updS("bannerHeight", v)}>
                  <SelectTrigger className="w-24 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="100" className="text-xs">Small</SelectItem>
                    <SelectItem value="160" className="text-xs">Medium</SelectItem>
                    <SelectItem value="220" className="text-xs">Large</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </div>
          )}

          {/* BACKGROUND */}
          {miscSection === "background" && (
            <div className="space-y-4">
              <SectionTitle>Background</SectionTitle>
              <SettingRow label="Background Size">
                <Select value={getS("bgSize", "cover")} onValueChange={v => updS("bgSize", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="cover" className="text-xs">Cover</SelectItem>
                    <SelectItem value="contain" className="text-xs">Contain</SelectItem>
                    <SelectItem value="100% 100%" className="text-xs">Stretch</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Background Opacity</Label>
                <NumSlider value={getS("bgOpacity", 0.4)} onChange={v => updS("bgOpacity", v)} min={0} max={1} step={0.05} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Background Blur</Label>
                <NumSlider value={getS("bgBlur", 0)} onChange={v => updS("bgBlur", v)} min={0} max={30} unit="px" />
              </div>
            </div>
          )}

          {/* PROFILE BOX */}
          {miscSection === "box" && (
            <div className="space-y-4">
              <SectionTitle>Profile Box</SectionTitle>
              <SettingRow label="3D Tilt on Hover" desc="Box tilts when you hover with the mouse">
                <Switch checked={getS("boxTilt", false)} onCheckedChange={v => updS("boxTilt", v)} />
              </SettingRow>
              {getS("boxTilt", false) && <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-gray-500">Tilt Intensity</Label>
                  <NumSlider value={getS("boxTiltIntensity", 12)} onChange={v => updS("boxTiltIntensity", v)} min={1} max={30} unit="°" />
                </div>
                <SettingRow label="Auto Tilt" desc="Tilt animates automatically on a timer">
                  <Switch checked={getS("autoTilt", false)} onCheckedChange={v => updS("autoTilt", v)} />
                </SettingRow>
                {getS("autoTilt", false) && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Auto Tilt Interval</Label>
                    <NumSlider value={getS("autoTiltInterval", 4)} onChange={v => updS("autoTiltInterval", v)} min={1} max={15} unit="s" />
                  </div>
                )}
              </>}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Box Width</Label>
                <NumSlider value={getS("boxWidth", 520)} onChange={v => updS("boxWidth", v)} min={320} max={800} unit="px" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Inner Spacing</Label>
                <NumSlider value={getS("boxPadding", 28)} onChange={v => updS("boxPadding", v)} min={8} max={60} unit="px" />
              </div>
              <SettingRow label="Box Color">
                <ColorPicker value={getS("boxColor", "#000000")} onChange={v => updS("boxColor", v)} label="Box" />
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Box Opacity</Label>
                <NumSlider value={getS("boxOpacity", 0.45)} onChange={v => updS("boxOpacity", v)} min={0} max={1} step={0.05} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius</Label>
                <NumSlider value={getS("boxRadius", 24)} onChange={v => updS("boxRadius", v)} min={0} max={60} unit="px" />
              </div>
            </div>
          )}

          {/* USERNAME */}
          {miscSection === "username" && (
            <div className="space-y-4">
              <SectionTitle>Username Style</SectionTitle>
              <SettingRow label="Sparkle Effect" desc="Animated sparkles around the username">
                <Switch checked={getS("usernameSparkles", false)} onCheckedChange={v => updS("usernameSparkles", v)} />
              </SettingRow>
              {getS("usernameSparkles", false) && (
                <SettingRow label="Sparkle Color">
                  <Select value={getS("sparkleColor", "theme")} onValueChange={v => updS("sparkleColor", v)}>
                    <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      <SelectItem value="theme" className="text-xs">Theme Color</SelectItem>
                      <SelectItem value="rainbow" className="text-xs">Rainbow</SelectItem>
                      <SelectItem value="red" className="text-xs">Red</SelectItem>
                      <SelectItem value="blue" className="text-xs">Blue</SelectItem>
                      <SelectItem value="green" className="text-xs">Green</SelectItem>
                      <SelectItem value="purple" className="text-xs">Purple</SelectItem>
                      <SelectItem value="white" className="text-xs">White</SelectItem>
                      <SelectItem value="gold" className="text-xs">Gold</SelectItem>
                      <SelectItem value="glitch" className="text-xs">Glitch</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
              <SettingRow label="Font">
                <Select value={getS("usernameFont", "inherit")} onValueChange={v => updS("usernameFont", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="inherit" className="text-xs">Default</SelectItem>
                    <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
                    <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
                    <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
                    <SelectItem value="Impact" className="text-xs" style={{ fontFamily: "Impact" }}>Impact</SelectItem>
                    <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
                    <SelectItem value="'Times New Roman'" className="text-xs" style={{ fontFamily: "Times New Roman" }}>Times New Roman</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Profile Font" desc="Font applied to all text on your profile">
                <Select value={getS("profileFont", "inherit")} onValueChange={v => updS("profileFont", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="inherit" className="text-xs">Default</SelectItem>
                    <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
                    <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
                    <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
                    <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </div>
          )}

          {/* AVATAR */}
          {miscSection === "avatar" && (
            <div className="space-y-4">
              <SectionTitle>Avatar</SectionTitle>
              <SettingRow label="Decoration" desc="Visual effect around the avatar">
                <Select value={getS("avatarDecoration", "none")} onValueChange={v => updS("avatarDecoration", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="ring-pulse" className="text-xs">Ring Pulse</SelectItem>
                    <SelectItem value="ring-spin" className="text-xs">Ring Spin</SelectItem>
                    <SelectItem value="neon" className="text-xs">Neon Glow</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius (0=square, 50=circle)</Label>
                <NumSlider value={getS("avatarRadius", 50)} onChange={v => updS("avatarRadius", v)} min={0} max={50} unit="%" />
              </div>
            </div>
          )}

          {/* CURSOR */}
          {miscSection === "cursor" && (
            <div className="space-y-4">
              <SectionTitle>Cursor</SectionTitle>

              {!user?.isPremium && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
                  <span className="text-lg">💎</span>
                  <div>
                    <p className="text-sm font-black text-purple-400">Premium Feature</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Custom cursors are exclusive to Premium users.</p>
                  </div>
                  <a href="/shop" className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-colors">
                    Upgrade
                  </a>
                </div>
              )}

              <div className={!user?.isPremium ? "opacity-40 pointer-events-none select-none" : ""}>
                <div className="space-y-4">
                  <SettingRow label="Cursor Style">
                    <Select value={getS("cursor", "default")} onValueChange={v => updS("cursor", v)}>
                      <SelectTrigger className="w-32 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0e0e0e] border-white/10">
                        {["default","none","crosshair","pointer","cell","zoom-in"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Custom Cursor Image" desc="Use a custom image as your cursor (PNG/GIF recommended, max 128px)">
                    <MediaField label="Cursor Image" value={localProfile?.customCursorUrl || ""} onChange={v => upd("customCursorUrl", v)}
                      accept="image/*" uploadId="cursor-img-upload" mediaType="image" icon={<MousePointer className="w-3 h-3" />} />
                  </SettingRow>
                  {localProfile?.customCursorUrl && (
                    <button onClick={() => upd("customCursorUrl", "")} className="text-[10px] text-red-400 hover:text-red-300">
                      Remove custom cursor image
                    </button>
                  )}
                  <SettingRow label="Cursor Trail" desc="Glowing trail that follows the cursor">
                    <Switch checked={getS("cursorTrail", false)} onCheckedChange={v => updS("cursorTrail", v)} />
                  </SettingRow>
                  {getS("cursorTrail", false) && (
                    <SettingRow label="Trail Color">
                      <ColorPicker value={getS("cursorTrailColor", "#F97316")} onChange={v => updS("cursorTrailColor", v)} label="Trail" />
                    </SettingRow>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ALIGNMENT */}
          {miscSection === "alignment" && (
            <div className="space-y-4">
              <SectionTitle>Content Alignment</SectionTitle>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-gray-500">Profile Content Alignment</Label>
                <p className="text-[11px] text-gray-600">Controls where the profile box and all text is aligned on your page.</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {([
                    { value: "left", icon: AlignLeft, label: "Left" },
                    { value: "center", icon: AlignCenter, label: "Center" },
                    { value: "right", icon: AlignRight, label: "Right" },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button key={value} onClick={() => updS("contentAlign", value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${getS("contentAlign", "center") === value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
                      <Icon className={`w-5 h-5 ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`} />
                      <span className={`text-xs font-black ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVEAL SCREEN */}
          {miscSection === "reveal" && (
            <div className="space-y-4">
              <SectionTitle>Reveal Screen</SectionTitle>
              <p className="text-[11px] text-gray-500">Configure the reveal screen in the Profile tab under Reveal Screen settings.</p>
              <SettingRow label="Background Blur" desc="Blur behind the reveal overlay">
                <NumSlider value={getS("revealBlur", 8)} onChange={v => updS("revealBlur", v)} min={0} max={30} unit="px" />
              </SettingRow>
              <SettingRow label="Auto Reveal" desc="Automatically reveal profile after a delay">
                <Switch checked={getS("autoReveal", false)} onCheckedChange={v => updS("autoReveal", v)} />
              </SettingRow>
              {getS("autoReveal", false) && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-gray-500">Auto Reveal Delay</Label>
                  <NumSlider value={getS("autoRevealDelay", 3)} onChange={v => updS("autoRevealDelay", v)} min={1} max={30} unit="s" />
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Markdowns Tab ────────────────────────────────────────────────────────────

const VOIDMARK_TAGS = [
  { tag: "[b]Bold[/b]", label: "Bold", desc: "Makes text bold", example: "[b]Bold[/b]" },
  { tag: "[em]Italic[/em]", label: "Italic", desc: "Makes text italic", example: "[em]Italic[/em]" },
  { tag: "[u]Underline[/u]", label: "Underline", desc: "Underlines text", example: "[u]Underline[/u]" },
  { tag: "[del]Strike[/del]", label: "Strikethrough", desc: "Crosses out text", example: "[del]Strikethrough[/del]" },
  { tag: "[h]Heading[/h]", label: "Heading", desc: "Large bold heading", example: "[h]Heading[/h]" },
  { tag: "[theme]Accent[/theme]", label: "Theme Color", desc: "Colors text in your accent color", example: "[theme]Accent[/theme]" },
  { tag: "[color=F97316]Color[/color]", label: "Custom Color", desc: "Any hex color (no # needed)", example: "[color=F97316]Color[/color]" },
  { tag: "[highlight]Text[/highlight]", label: "Highlight", desc: "Highlighted background on text", example: "[highlight]Highlight[/highlight]" },
  { tag: "[quote]Quote[/quote]", label: "Quote Block", desc: "Displays as a styled blockquote", example: "[quote]Quote[/quote]" },
  { tag: "[code]code[/code]", label: "Code", desc: "Monospace code styling", example: "[code]console.log(1)[/code]" },
  { tag: "[spoiler]Hidden[/spoiler]", label: "Spoiler", desc: "Blurred until clicked", example: "[spoiler]Hidden[/spoiler]" },
  { tag: "[typewriter]Text[/typewriter]", label: "Typewriter", desc: "Types out then loops back after 3s", example: "[typewriter]Typewriter[/typewriter]" },
  { tag: "[left]Text[/left]", label: "Align Left", desc: "Left-aligns a block of text", example: "[left]Left[/left]" },
  { tag: "[center]Text[/center]", label: "Center", desc: "Centers a block of text", example: "[center]Centered[/center]" },
  { tag: "[right]Text[/right]", label: "Align Right", desc: "Right-aligns a block of text", example: "[right]Right[/right]" },
  { tag: "[list][item]A[/item][item]B[/item][/list]", label: "List", desc: "Bullet list with items", example: "[list][item]Item A[/item][item]Item B[/item][/list]" },
  { tag: "[hr]", label: "Divider", desc: "Horizontal rule", example: "[hr]" },
  { tag: "[hr-theme]", label: "Themed Divider", desc: "Divider in your accent color", example: "[hr-theme]" },
  { tag: "[br]", label: "Line Break", desc: "Explicit line break", example: "[br]" },
];

const MIXED_EXAMPLE = `[h][theme]Welcome to my page![/theme][/h]
[br]
[b]About me:[/b] [em]I love [glow]creating[/glow] things[/em] and [highlight]sharing[/highlight] them online.
[br]
[rainbow]✦ My skills are growing every day ✦[/rainbow]
[br]
[quote][color=7289da]"Build things that matter."[/color][/quote]
[br]
[list]
[item][b]Design[/b] — UI & visual stuff[/item]
[item][b]Code[/b] — full stack[/item]
[item][b]Music[/b] — always [spoiler]trap beats[/spoiler][/item]
[/list]
[br]
[center][small]Made with [theme]Hexed[/theme][/small][/center]`;

function MarkdownsTab() {
  const { toast } = useToast();
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [mixedCopied, setMixedCopied] = useState(false);

  const copy = (example: string) => {
    navigator.clipboard.writeText(example).then(() => {
      setCopied(example);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const copyMixed = () => {
    navigator.clipboard.writeText(MIXED_EXAMPLE).then(() => {
      setMixedCopied(true);
      toast({ title: "Mixed example copied!" });
      setTimeout(() => setMixedCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">Markdowns</h1>
        <p className="text-gray-500 text-sm mt-1">Voidmark tags — mix and match them freely in your bio, reveal text, and anywhere text is shown</p>
      </div>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Live Preview</h3>
        <Textarea
          value={preview}
          onChange={e => setPreview(e.target.value)}
          placeholder="Mix all your Voidmark tags here to preview..."
          className="min-h-[80px] bg-black/60 border-white/5 focus:border-orange-500/50 resize-none font-mono text-sm"
        />
        {preview && (
          <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-sm leading-relaxed text-white">
            <VoidMark text={preview} themeColor="#F97316" />
          </div>
        )}
      </div>

      <div className="bg-[#0e0e0e] border border-orange-500/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Mix All Together</h3>
            <p className="text-[10px] text-gray-600 mt-0.5">All tags can be freely combined — no restrictions. Here's a full example:</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={copyMixed}
            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${mixedCopied ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-gray-400 hover:bg-orange-500/10 hover:text-orange-400"}`}
          >
            {mixedCopied ? "Copied!" : "Copy Example"}
          </motion.button>
        </div>
        <div className="bg-black/40 rounded-xl border border-white/5 p-3">
          <pre className="text-[11px] font-mono text-orange-400/80 whitespace-pre-wrap leading-relaxed">{MIXED_EXAMPLE}</pre>
        </div>
        <div className="p-3 bg-black/30 rounded-xl border border-orange-500/10 text-sm leading-relaxed text-white">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Preview</p>
          <VoidMark text={MIXED_EXAMPLE} themeColor="#F97316" />
        </div>
      </div>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">All Tags — click to copy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VOIDMARK_TAGS.map(({ tag, label, desc, example }) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => copy(example)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all w-full ${copied === example ? "border-orange-500/50 bg-orange-500/5" : "border-white/5 bg-black/30 hover:border-orange-500/20 hover:bg-orange-500/5"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{label}</span>
                  {copied === example && <span className="text-[9px] font-black uppercase text-orange-500">Copied!</span>}
                </div>
                <code className="text-[11px] font-mono text-orange-400 block mt-0.5 truncate">{tag}</code>
                <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-4">All tags can be freely mixed — nest them inside each other, combine styles, stack effects. Everything works together.</p>
      </div>
    </div>
  );
}

// ─── Tickets Tab ───────────────────────────────────────────────────────────────

function TicketsTab({ user }: { user: any }) {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketData, setTicketData] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: allTickets = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/tickets"],
    refetchInterval: 5000,
  });

  async function loadTicket(ticket: any) {
    setSelectedTicket(ticket);
    const res = await fetch(`/api/tickets/${ticket.id}/messages`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setTicketData(data);
    }
  }

  // Poll messages when ticket is open
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTicketData(data);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  useEffect(() => {
    if (ticketData) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [ticketData]);

  async function sendReply() {
    if (!replyInput.trim() || !selectedTicket || sending) return;
    setSending(true);
    try {
      await apiRequest("POST", `/api/tickets/${selectedTicket.id}/messages`, { content: replyInput.trim() });
      setReplyInput("");
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
      if (res.ok) setTicketData(await res.json());
    } catch (_) {}
    setSending(false);
  }

  async function claimTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/claim`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
  }

  async function closeTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/close`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
    setSelectedTicket((t: any) => ({ ...t, status: "closed" }));
  }

  async function reopenTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/reopen`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
    setSelectedTicket((t: any) => ({ ...t, status: "open" }));
  }

  async function deleteTicket(id: number) {
    await apiRequest("DELETE", `/api/tickets/${id}`, undefined);
    toast({ title: "Ticket deleted" });
    refetch();
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
      setTicketData(null);
    }
  }

  const openCount = (allTickets || []).filter((t: any) => t.status === "open").length;
  const closedCount = (allTickets || []).filter((t: any) => t.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Support Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">{openCount} open · {closedCount} closed</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-orange-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Ticket list ── */}
        <div className="space-y-2">
          {(!allTickets || allTickets.length === 0) && (
            <div className="text-center py-16 text-gray-600 text-sm bg-white/[0.02] rounded-2xl border border-white/[0.04]">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No tickets yet
            </div>
          )}
          {(allTickets || []).map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => loadTicket(ticket)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedTicket?.id === ticket.id
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {ticket.discordAvatar ? (
                    <img src={ticket.discordAvatar} alt="" className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0">
                      <SiDiscord className="w-3.5 h-3.5 text-[#7289da]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{ticket.discordUsername || "Unknown User"}</p>
                    <p className="text-[10px] text-gray-600">#{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    ticket.status === "open" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                  }`}>{ticket.status}</span>
                  {ticket.claimedByDiscordUsername && (
                    <span className="text-[9px] text-orange-400 font-bold truncate max-w-[70px]">
                      → {ticket.claimedByDiscordUsername}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteTicket(ticket.id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Ticket detail ── */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm flex-col gap-3">
              <MessageSquare className="w-8 h-8 opacity-30" />
              Select a ticket to view
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  {selectedTicket.discordAvatar ? (
                    <img src={selectedTicket.discordAvatar} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <SiDiscord className="w-4 h-4 text-[#7289da]" />
                  )}
                  <span className="text-xs font-bold">{selectedTicket.discordUsername || "Unknown"}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    ticketData?.ticket?.status === "open" || selectedTicket.status === "open"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}>{ticketData?.ticket?.status || selectedTicket.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedTicket.claimedByUserId && (selectedTicket.status === "open") && (
                    <button
                      onClick={claimTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {(ticketData?.ticket?.status === "open" || selectedTicket.status === "open") ? (
                    <button
                      onClick={closeTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> Close
                    </button>
                  ) : (
                    <button
                      onClick={reopenTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" /> Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteTicket(selectedTicket.id)}
                    className="text-[10px] font-bold px-3 py-1.5 bg-red-900/20 text-red-500 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ maxHeight: 300 }}>
                {(ticketData?.messages || []).map((m: any) => (
                  <div key={m.id}>
                    {m.senderType === "system" ? (
                      <div className="flex justify-center my-1">
                        <span className="text-[10px] text-gray-600 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">
                          {m.content}
                        </span>
                      </div>
                    ) : (
                      <div className={`flex ${m.senderType === "user" ? "justify-start" : "justify-end"} items-end gap-1.5`}>
                        {m.senderType === "user" && (
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                            {selectedTicket.discordAvatar ? (
                              <img src={selectedTicket.discordAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#5865F2]/30 flex items-center justify-center">
                                <SiDiscord className="w-3 h-3 text-[#7289da]" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                          <span className="text-[10px] text-gray-600 px-1">{m.senderName}</span>
                          <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                            m.senderType === "user"
                              ? "bg-white/[0.06] text-gray-200 border border-white/[0.06] rounded-bl-sm"
                              : "bg-orange-500 text-white rounded-br-sm"
                          }`}>
                            {m.content}
                          </div>
                        </div>
                        {m.senderType === "support" && (
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                            {m.senderAvatar ? (
                              <img src={m.senderAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-orange-500/20 flex items-center justify-center">
                                <Headphones className="w-3 h-3 text-orange-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              {(ticketData?.ticket?.status === "open" || selectedTicket.status === "open") && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.05]">
                  <form
                    onSubmit={e => { e.preventDefault(); sendReply(); }}
                    className="flex gap-2 items-center bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2"
                  >
                    <input
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                      placeholder="Reply as support..."
                      className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-600 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replyInput.trim() || sending}
                      className="text-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ currentUser, adminUsers, roleMeta, canManageTeam }: { currentUser: any; adminUsers: any[]; roleMeta: Record<string, any>; canManageTeam: boolean }) {
  const { toast } = useToast();
  const { data: teamData, isLoading: teamLoading } = useQuery<any>({ queryKey: ["/api/admin/team"] });
  const [addSearch, setAddSearch] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [rolePickFor, setRolePickFor] = useState<number | null>(null);

  const staffRoles = ["support", "moderator", "administrator", "developer", "owner"] as const;
  const teamMembers: any[] = teamData?.team || [];
  const teamIds = new Set(teamMembers.map((m: any) => m.id));

  // Assignable roles based on current user's level
  const myLevel = ROLE_HIERARCHY[currentUser.role as keyof typeof ROLE_HIERARCHY] || 0;
  const assignable = staffRoles.filter(r => (ROLE_HIERARCHY[r] || 0) < myLevel && r !== "owner");

  const nonTeamUsers = (adminUsers || []).filter((u: any) => !teamIds.has(u.id) && u.id !== currentUser.id && u.role === "user");

  const addToTeam = async (userId: number, role: string) => {
    setAddingId(userId);
    try {
      await apiRequest("POST", "/api/admin/team", { userId, role });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: `Added to team as ${role}` });
    } catch {
      toast({ title: "Failed to add", variant: "destructive" });
    }
    setAddingId(null);
    setRolePickFor(null);
  };

  const removeFromTeam = async (userId: number) => {
    if (!confirm("Remove this person from the team?")) return;
    setRemovingId(userId);
    try {
      await apiRequest("DELETE", `/api/admin/team/${userId}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Removed from team" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
    setRemovingId(null);
  };

  const changeRole = async (userId: number, role: string) => {
    try {
      await apiRequest("POST", "/api/admin/team", { userId, role });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: `Role updated to ${role}` });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
    setRolePickFor(null);
  };

  const filteredNonTeam = nonTeamUsers.filter((u: any) =>
    !addSearch || u.username.toLowerCase().includes(addSearch.toLowerCase()) || (u.discordUsername || "").toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Team</h1>
        <p className="text-gray-500 text-sm mt-1">Staff members with access to the admin panel</p>
      </div>

      {/* Role hierarchy legend */}
      <div className="flex flex-wrap gap-2">
        {staffRoles.map(r => {
          const m = roleMeta[r];
          const Icon = m?.icon;
          return (
            <div key={r} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${m?.color || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
              {Icon && <Icon className="w-3 h-3" />}
              {m?.label || r}
            </div>
          );
        })}
        <div className="text-[10px] text-gray-600 flex items-center gap-1 ml-1">← lowest · highest →</div>
      </div>

      {/* Current team */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Current Team ({teamMembers.length})</h2>
        {teamLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-orange-500" /></div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-10 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-gray-600 text-sm">No team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member: any) => {
              const meta = roleMeta[member.role] || roleMeta.user;
              const Icon = meta.icon || UserIcon;
              const memberLevel = ROLE_HIERARCHY[member.role as keyof typeof ROLE_HIERARCHY] || 0;
              const canEdit = canManageTeam && memberLevel < myLevel && member.id !== currentUser.id;
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.discordAvatar ? <img src={member.discordAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-orange-400" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">@{member.username}</p>
                    {member.discordUsername && <p className="text-[10px] text-gray-500 truncate"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />{member.discordUsername}</p>}
                  </div>
                  {/* Role badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black shrink-0 ${meta.color}`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </div>
                  {/* Change role / remove */}
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0 relative">
                      <button
                        onClick={() => setRolePickFor(rolePickFor === member.id ? null : member.id)}
                        className="h-7 px-2 text-[10px] font-black text-gray-500 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => removeFromTeam(member.id)}
                        disabled={removingId === member.id}
                        className="h-7 w-7 flex items-center justify-center text-gray-600 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all"
                      >
                        {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                      {rolePickFor === member.id && (
                        <div className="absolute top-full right-0 mt-1 bg-[#111] border border-white/10 rounded-xl p-1.5 space-y-0.5 z-20 min-w-[130px] shadow-2xl">
                          {assignable.map(r => {
                            const rm = roleMeta[r];
                            const RI = rm?.icon;
                            return (
                              <button key={r} onClick={() => changeRole(member.id, r)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${member.role === r ? "bg-orange-500/15 text-orange-400" : "hover:bg-white/5 text-gray-400"}`}>
                                {RI && <RI className="w-3 h-3" />}
                                {rm?.label || r}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add to team */}
      {canManageTeam && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Add Member</h2>
          <input
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
          />
          {filteredNonTeam.length === 0 && addSearch && (
            <p className="text-xs text-gray-600 text-center py-4">No users found</p>
          )}
          {filteredNonTeam.slice(0, 10).map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                {u.discordAvatar ? <img src={u.discordAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate text-gray-300">@{u.username}</p>
                {u.discordUsername && <p className="text-[10px] text-gray-600"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />{u.discordUsername}</p>}
              </div>
              <div className="flex gap-1">
                {assignable.map(r => {
                  const rm = roleMeta[r];
                  return (
                    <button key={r} onClick={() => addToTeam(u.id, r)} disabled={addingId === u.id}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${rm?.color || "border-gray-600 text-gray-500"} hover:opacity-90 disabled:opacity-40`}>
                      {addingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (rm?.label || r)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Discord Bot Tab ───────────────────────────────────────────────────────────

function DiscordBotTab() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    DISCORD_CLIENT_ID: "",
    DISCORD_CLIENT_SECRET: "",
    DISCORD_BOT_TOKEN: "",
    DISCORD_GUILD_ID: "",
    DISCORD_LOGIN_ENABLED: "true",
  });
  const [loaded, setLoaded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot-settings", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setSettings({
          DISCORD_CLIENT_ID: data.DISCORD_CLIENT_ID || "",
          DISCORD_CLIENT_SECRET: data.DISCORD_CLIENT_SECRET || "",
          DISCORD_BOT_TOKEN: data.DISCORD_BOT_TOKEN || "",
          DISCORD_GUILD_ID: data.DISCORD_GUILD_ID || "",
          DISCORD_LOGIN_ENABLED: data.DISCORD_LOGIN_ENABLED ?? "true",
        });
        setLoaded(true);
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      // Never send DISCORD_CALLBACK_URL — it is always auto-computed from the domain
      await apiRequest("POST", "/api/admin/bot-settings", {
        DISCORD_CLIENT_ID: settings.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: settings.DISCORD_CLIENT_SECRET,
        DISCORD_BOT_TOKEN: settings.DISCORD_BOT_TOKEN,
        DISCORD_GUILD_ID: settings.DISCORD_GUILD_ID,
        DISCORD_LOGIN_ENABLED: settings.DISCORD_LOGIN_ENABLED,
      });
      toast({ title: "Settings saved", description: "Changes are live immediately." });
    } catch (_) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  }

  const [callbackHint, setCallbackHint] = useState<string>("/auth/discord/callback");

  useEffect(() => {
    fetch("/api/admin/discord-callback-url", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setCallbackHint(data.url); })
      .catch(() => {
        if (typeof window !== "undefined")
          setCallbackHint(`${window.location.protocol}//${window.location.host}/auth/discord/callback`);
      });
  }, []);

  const discordEnabled = settings.DISCORD_LOGIN_ENABLED !== "false";
  const hasCredentials = !!(settings.DISCORD_CLIENT_ID && settings.DISCORD_CLIENT_SECRET);

  const FieldRow = ({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</Label>
        {optional && <span className="text-[9px] font-black uppercase tracking-widest text-gray-700 bg-white/[0.04] px-1.5 py-0.5 rounded">Optional</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-600 mb-1">{hint}</p>}
      {children}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Discord Login Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Configure Discord OAuth2 login, bot integration, and role syncing.</p>
      </div>

      {/* Enable / Disable Toggle */}
      <div className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black">Discord Login</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {discordEnabled
              ? "Enabled — users can log in with Discord on the login page."
              : "Disabled — the Discord button shows \"SOON\" on the login page."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, DISCORD_LOGIN_ENABLED: s.DISCORD_LOGIN_ENABLED === "false" ? "true" : "false" }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${discordEnabled ? "bg-[#5865F2]" : "bg-white/10"}`}
          data-testid="toggle-discord-enabled"
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${discordEnabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Redirect URL box — shown prominently so users know what to put in Discord */}
      <div className="bg-[#0a0a12] border border-[#5865F2]/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <SiDiscord className="w-3.5 h-3.5 text-[#7289da]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Your Redirect URL</span>
        </div>
        <p className="text-[10px] text-gray-500">Copy this exact URL and paste it into <b className="text-gray-300">Discord Developer Portal → OAuth2 → Redirects</b>. This is specific to your domain and must match exactly.</p>
        <div className="flex gap-2 mt-1">
          <code className="flex-1 bg-black/60 border border-[#5865F2]/20 rounded-lg px-3 py-2 text-[11px] font-mono text-[#7289da] break-all">
            {callbackHint}
          </code>
          <Button type="button" variant="outline" size="sm"
            onClick={() => { navigator.clipboard.writeText(callbackHint); toast({ title: "Copied!", description: "Paste this into Discord → OAuth2 → Redirects" }); }}
            className="shrink-0 border-[#5865F2]/30 text-[#7289da] hover:bg-[#5865F2]/10 h-auto px-3 text-xs font-black"
            data-testid="button-copy-redirect-url">
            Copy
          </Button>
        </div>
      </div>

      {/* Step guide */}
      <div className="bg-[#0a0a0a] border border-[#5865F2]/15 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-[#7289da]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Step-by-Step Setup Guide</span>
        </div>
        <div className="space-y-3 text-[11px] text-gray-400">
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">1.</span>
            <div>
              Go to{" "}
              <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-[#7289da] hover:underline font-bold">discord.com/developers/applications</a>
              {" "}and click <b className="text-white">New Application</b>. Give it any name (e.g. "Hexed Login") and click <b className="text-white">Create</b>.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">2.</span>
            <div>
              In the left sidebar, click <b className="text-white">OAuth2</b>. Under <b className="text-white">Client Information</b>, copy your <b className="text-white">Client ID</b> and click <b className="text-white">Reset Secret</b> to generate and copy the <b className="text-white">Client Secret</b>. Paste them into the fields below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">3.</span>
            <div>
              Still in <b className="text-white">OAuth2</b>, scroll down to <b className="text-white">Redirects</b>. Click <b className="text-white">Add Redirect</b> and paste the <b className="text-[#7289da]">Redirect URL</b> shown above — it must match your domain exactly. Click <b className="text-white">Save Changes</b>.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">4.</span>
            <div>
              <span className="text-gray-500">(Optional — for bot features)</span> In the sidebar, click <b className="text-white">Bot</b> → <b className="text-white">Add Bot</b>. Copy the <b className="text-white">Token</b> (click Reset Token if needed). Under <b className="text-white">Privileged Gateway Intents</b>, enable <b className="text-white">Server Members Intent</b>. Paste the token below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">5.</span>
            <div>
              <span className="text-gray-500">(Optional — for role sync)</span> Get your Discord server's <b className="text-white">Guild ID</b> by right-clicking your server icon in Discord and selecting <b className="text-white">Copy Server ID</b>. (You need <b className="text-white">Developer Mode</b> enabled: Discord Settings → Advanced → Developer Mode.) Paste it below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">6.</span>
            <div>
              Enable the <b className="text-white">Discord Login</b> toggle at the top, then click <b className="text-white">Save Settings</b>. Users can immediately log in with Discord — no restart needed.
            </div>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-[#0e0e0e] border border-[#5865F2]/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <SiDiscord className="w-4 h-4 text-[#7289da]" />
          <span className="font-black text-sm">OAuth2 &amp; Bot Credentials</span>
        </div>

        <FieldRow label="Client ID" hint="Discord Developer Portal → OAuth2 → Client Information → Client ID">
          <Input
            value={settings.DISCORD_CLIENT_ID}
            onChange={e => setSettings(s => ({ ...s, DISCORD_CLIENT_ID: e.target.value }))}
            placeholder="1234567890123456789"
            className="bg-black/60 border-white/5 h-9 text-sm font-mono"
            data-testid="input-discord-client-id"
          />
        </FieldRow>

        <FieldRow label="Client Secret" hint="Discord Developer Portal → OAuth2 → Client Information → Reset Secret">
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={settings.DISCORD_CLIENT_SECRET}
              onChange={e => setSettings(s => ({ ...s, DISCORD_CLIENT_SECRET: e.target.value }))}
              placeholder="••••••••••••••••••••••••••••••••"
              className="bg-black/60 border-white/5 h-9 text-sm font-mono pr-10"
              data-testid="input-discord-client-secret"
            />
            <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Bot Token" hint="Discord Developer Portal → Bot → Reset Token" optional>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={settings.DISCORD_BOT_TOKEN}
              onChange={e => setSettings(s => ({ ...s, DISCORD_BOT_TOKEN: e.target.value }))}
              placeholder="••••••••••••••••••••••••••••••••••••••"
              className="bg-black/60 border-white/5 h-9 text-sm font-mono pr-10"
              data-testid="input-discord-bot-token"
            />
            <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Guild ID (Server ID)" hint="Right-click your Discord server icon → Copy Server ID (requires Developer Mode in Discord settings)" optional>
          <Input
            value={settings.DISCORD_GUILD_ID}
            onChange={e => setSettings(s => ({ ...s, DISCORD_GUILD_ID: e.target.value }))}
            placeholder="1234567890123456789"
            className="bg-black/60 border-white/5 h-9 text-sm font-mono"
            data-testid="input-discord-guild-id"
          />
        </FieldRow>

        <div className="pt-3 border-t border-white/[0.05] flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0"
            data-testid="button-save-bot-settings"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
            Save Settings
          </Button>
          <p className="text-[11px] text-gray-600">Changes apply immediately without restart.</p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Discord Login",
            ok: discordEnabled && hasCredentials,
            warn: discordEnabled && !hasCredentials,
            desc: !discordEnabled ? "Toggle is off — shows SOON" : "Add Client ID & Secret above",
          },
          { label: "Role Sync", ok: !!(settings.DISCORD_BOT_TOKEN && settings.DISCORD_GUILD_ID), desc: "Add Bot Token & Guild ID above" },
        ].map(({ label, ok, warn, desc }) => (
          <div key={label} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${ok ? "bg-green-500/[0.04] border-green-500/20" : warn ? "bg-yellow-500/[0.03] border-yellow-500/10" : "bg-red-500/[0.03] border-red-500/10"}`}>
            {ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${warn ? "text-yellow-500" : "text-gray-600"}`} />}
            <div>
              <p className={`text-xs font-black ${ok ? "text-green-400" : warn ? "text-yellow-500" : "text-gray-500"}`}>{label}</p>
              <p className="text-[10px] text-gray-600">{ok ? "Active" : desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Website Management Tab ─────────────────────────────────────────────────

function WebsiteManagementTab({ adminUsers, currentUser }: { adminUsers: any[]; currentUser: any }) {
  const { toast } = useToast();
  const [wSub, setWSub] = useState<"announcements" | "users">("announcements");

  // ── Announcements ──
  const { data: announcements = [], isLoading: annosLoading } = useQuery<any[]>({ queryKey: ["/api/announcements"] });
  const [annoForm, setAnnoForm] = useState({ title: "", content: "", type: "info" });
  const [editAnno, setEditAnno] = useState<any | null>(null);
  const [creatingAnno, setCreatingAnno] = useState(false);

  const saveAnno = async () => {
    try {
      if (editAnno) {
        await apiRequest("PATCH", `/api/admin/announcements/${editAnno.id}`, annoForm);
        toast({ title: "Announcement updated" });
      } else {
        await apiRequest("POST", "/api/admin/announcements", annoForm);
        toast({ title: "Announcement created" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setCreatingAnno(false);
      setEditAnno(null);
      setAnnoForm({ title: "", content: "", type: "info" });
    } catch (e: any) {
      toast({ title: e?.message || "Failed", variant: "destructive" });
    }
  };

  const deleteAnno = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/announcements/${id}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  // ── User info / login-as ──
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [userInfoData, setUserInfoData] = useState<Record<number, any>>({});
  const [loadingInfo, setLoadingInfo] = useState<number | null>(null);
  const [loggingAs, setLoggingAs] = useState<number | null>(null);

  const fetchUserInfo = async (userId: number) => {
    if (userInfoData[userId]) { setExpandedUser(userId); return; }
    setLoadingInfo(userId);
    try {
      const data = await apiRequest("GET", `/api/admin/user-info/${userId}`, undefined) as any;
      setUserInfoData(prev => ({ ...prev, [userId]: data }));
      setExpandedUser(userId);
    } catch (e: any) {
      toast({ title: e?.message || "Failed to fetch info", variant: "destructive" });
    }
    setLoadingInfo(null);
  };

  const loginAs = async (userId: number) => {
    setLoggingAs(userId);
    try {
      await apiRequest("POST", `/api/admin/login-as/${userId}`, {});
      toast({ title: "Logged in as user, reloading..." });
      setTimeout(() => window.location.href = "/dashboard", 800);
    } catch (e: any) {
      toast({ title: e?.message || "Failed", variant: "destructive" });
    }
    setLoggingAs(null);
  };

  const typeColors: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
    success: "border-green-500/30 bg-green-500/5 text-green-400",
    error: "border-red-500/30 bg-red-500/5 text-red-400",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">Website Management</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage site-wide announcements and user accounts</p>
      </div>

      {/* Sub nav */}
      <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-1 w-fit">
        {(["announcements", "users"] as const).map(t => (
          <button
            key={t}
            onClick={() => setWSub(t)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${wSub === t ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t === "announcements" ? "Announcements" : "Registered Users"}
          </button>
        ))}
      </div>

      {/* ── ANNOUNCEMENTS ── */}
      {wSub === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{(announcements || []).length} announcement(s)</p>
            <button
              onClick={() => { setCreatingAnno(true); setEditAnno(null); setAnnoForm({ title: "", content: "", type: "info" }); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-all"
            >
              + New Announcement
            </button>
          </div>

          {(creatingAnno || editAnno) && (
            <div className="bg-[#0e0e0e] border border-orange-500/20 rounded-2xl p-5 space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">
                {editAnno ? "Edit Announcement" : "New Announcement"}
              </h3>
              <input
                value={annoForm.title}
                onChange={e => setAnnoForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
              />
              <textarea
                value={annoForm.content}
                onChange={e => setAnnoForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Content (optional)"
                rows={2}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 resize-none"
              />
              <div className="flex gap-2">
                {["info", "warning", "success", "error"].map(t => (
                  <button
                    key={t}
                    onClick={() => setAnnoForm(p => ({ ...p, type: t }))}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${annoForm.type === t ? typeColors[t] : "border-white/10 text-gray-600"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAnno}
                  className="px-4 py-2 bg-orange-500 text-black text-xs font-black rounded-lg hover:bg-orange-400 transition-all"
                >
                  {editAnno ? "Save Changes" : "Create"}
                </button>
                <button
                  onClick={() => { setCreatingAnno(false); setEditAnno(null); }}
                  className="px-4 py-2 border border-white/10 text-gray-400 text-xs font-black rounded-lg hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {annosLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-600" /></div>
          ) : (announcements || []).length === 0 ? (
            <div className="text-center py-12 bg-[#0e0e0e] border border-white/[0.04] rounded-2xl">
              <p className="text-gray-600 font-bold text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(announcements || []).map((a: any) => (
                <div key={a.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${typeColors[a.type] || typeColors.info}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white">{a.title}</p>
                    {a.content && <p className="text-xs mt-0.5 opacity-70">{a.content}</p>}
                    <p className="text-[10px] mt-1 opacity-40">{a.type.toUpperCase()} · ID #{a.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { setEditAnno(a); setAnnoForm({ title: a.title, content: a.content || "", type: a.type }); setCreatingAnno(false); }}
                      className="px-2 py-1 text-[10px] font-black border border-white/10 text-gray-400 rounded-lg hover:text-white hover:border-white/20 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAnno(a.id)}
                      className="px-2 py-1 text-[10px] font-black border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {wSub === "users" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{(adminUsers || []).length} registered user(s)</p>
          {(adminUsers || []).map((u: any) => (
            <div key={u.id} className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                  <AvatarImage src={u.discordAvatar || u.avatarUrl} />
                  <AvatarFallback className="bg-orange-500/10 text-orange-500 text-xs font-black">
                    {u.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm">{u.username}</p>
                  <p className="text-[10px] text-gray-600 font-mono">#{u.id} · {u.role}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => expandedUser === u.id ? setExpandedUser(null) : fetchUserInfo(u.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-white/10 text-gray-400 rounded-lg hover:text-white hover:border-white/20 transition-all"
                  >
                    {loadingInfo === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {expandedUser === u.id ? "Hide Info" : "Show Info"}
                  </button>
                  <a
                    href={`/dashboard/user/${u.username}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-all"
                  >
                    Go to Dashboard
                  </a>
                  {u.id !== currentUser.id && (
                    <button
                      onClick={() => loginAs(u.id)}
                      disabled={loggingAs === u.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all disabled:opacity-50"
                    >
                      {loggingAs === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Login as User
                    </button>
                  )}
                </div>
              </div>

              {expandedUser === u.id && userInfoData[u.id] && (
                <div className="border-t border-white/[0.04] p-4 bg-black/30 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Email", value: userInfoData[u.id].email },
                      { label: "Discord ID", value: userInfoData[u.id].discordId || "—" },
                      { label: "Discord User", value: userInfoData[u.id].discordUsername || "—" },
                      { label: "Premium", value: userInfoData[u.id].isPremium ? "✓ Yes" : "No" },
                      { label: "Joined", value: userInfoData[u.id].joinDate ? new Date(userInfoData[u.id].joinDate).toLocaleDateString() : "—" },
                      { label: "Views", value: String(userInfoData[u.id].views || 0) },
                      { label: "Max Tracks", value: String(userInfoData[u.id].maxTracks ?? 3) },
                      { label: "Max Tags", value: String(userInfoData[u.id].maxTags ?? 5) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/[0.02] rounded-xl p-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                        <p className="font-mono text-[11px] text-gray-300 break-all">{value}</p>
                      </div>
                    ))}
                  </div>
                  {(userInfoData[u.id].badges || []).length > 0 && (
                    <div className="bg-white/[0.02] rounded-xl p-2.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1.5">Badges</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(userInfoData[u.id].badges || []).map((b: string) => (
                          <span key={b} className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end">
                    <a
                      href={`/dashboard/user/${u.username}`}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-all"
                    >
                      View Full Dashboard →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
