import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink } from "lucide-react";

const ROLE_ORDER: Record<string, number> = { Founder: 0, Manager: 1, Admin: 2, Staff: 3 };
const ROLE_LABELS: Record<string, string> = { Founder: "Founder", Manager: "Manager", Admin: "Admin", Staff: "Staff" };

function TeamCard({ member, index }: { member: any; index: number }) {
  const [winking, setWinking] = useState(false);
  const accent = member.colour || "#F97316";
  const tags: string[] = Array.isArray(member.tags) ? member.tags : [];
  const isFounder = member.role === "Founder";
  const avatarSize = isFounder ? "w-24 h-24" : "w-20 h-20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className={`relative bg-[#0e0e0e] border border-white/[0.06] rounded-3xl flex flex-col gap-6 w-full ${isFounder ? "p-10 max-w-md" : "p-8 max-w-sm"}`}
      style={{ boxShadow: `0 0 ${isFounder ? "60px" : "40px"} 0 ${accent}${isFounder ? "28" : "18"}` }}
    >
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}${isFounder ? "20" : "15"} 0%, transparent 60%)` }}
      />

      <div className="flex items-start gap-5 relative">
        <div
          className={`relative ${avatarSize} shrink-0 cursor-pointer select-none`}
          onMouseEnter={() => setWinking(true)}
          onMouseLeave={() => setWinking(false)}
        >
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              className={`${avatarSize} rounded-2xl object-cover`}
              style={{ border: `2px solid ${accent}55` }}
            />
          ) : (
            <div
              className={`${avatarSize} rounded-2xl flex items-center justify-center font-black`}
              style={{ border: `2px solid ${accent}55`, background: accent + "15", color: accent, fontSize: isFounder ? "2rem" : "1.75rem" }}
            >
              {member.name[0]}
            </div>
          )}
          <AnimatePresence>
            {winking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.65)" }}
              >
                <span className={`select-none ${isFounder ? "text-4xl" : "text-3xl"}`} style={{ lineHeight: 1 }}>😉</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-0">
          <h2 className={`font-black text-white ${isFounder ? "text-2xl" : "text-xl"}`}>{member.name}</h2>
          <p className={`font-semibold mt-0.5 ${isFounder ? "text-base" : "text-sm"}`} style={{ color: accent }}>
            {ROLE_LABELS[member.role] || member.role}
          </p>
          {member.discordUser && (
            <p className="text-[11px] text-gray-600 mt-1 font-mono">
              {member.discordUser}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed relative">{member.description}</p>

      {tags.length > 0 && (
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2.5">Responsibilities</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span
                key={t}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: accent + "18", color: accent, border: `1px solid ${accent}30` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {member.profile && (
        <a
          href={member.profile}
          target="_blank"
          rel="noreferrer"
          className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest self-start px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ background: accent + "15", color: accent, border: `1px solid ${accent}30` }}
        >
          <ExternalLink className="w-2.5 h-2.5" /> View Profile
        </a>
      )}
    </motion.div>
  );
}

export default function TeamPage() {
  const { data: members = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/our-team"] });

  const sorted = [...(members as any[])].sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 99;
    const rb = ROLE_ORDER[b.role] ?? 99;
    return ra !== rb ? ra - rb : (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return (
    <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 mb-3">The people behind it</p>
          <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Our Team
          </h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            The people who build and run Hexed every day.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-sm">No team members listed yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {sorted.map((member, i) => (
              <TeamCard key={member.id} member={member} index={i} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <Link href="/">
            <button className="text-xs font-semibold px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              ← Back to Home
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
