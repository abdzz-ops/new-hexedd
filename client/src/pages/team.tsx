import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

const TEAM = [
  {
    name: "Byte",
    role: "Founder & Lead Developer",
    discordId: "1243269414900596787",
    avatar: "https://cdn.discordapp.com/avatars/1243269414900596787/549d88c80e293b757c3f84a9087ab0b0.png?size=256",
    tag: "@sheluvbyte",
    bio: "Byte is the one who built Hexed. He handled the design, wrote the code, and built every feature from day one. Byte is making sure that there the buges always being fixed as soon as possible. And that the user are having a great experience with Hexed.",
    highlights: ["Platform Designer", "Full-stack Developer", "UI & UX design", "Full-Stack Coder"],
    accent: "#F97316",
  },
  {
    name: "Mr Pain",
    role: "Co-Founder & Community Lead",
    discordId: "970654818521722881",
    avatar: "https://cdn.discordapp.com/avatars/970654818521722881/9ffa9a856e2add01c17df818731fda28.png?size=256",
    tag: "@mrpain.000",
    bio: "Co-Founder of hexed. Mr Pain, the eye behind the community. Withouth him there would not has been a start. Mr pain is focused on Managing the Discord, handling support, and making sure every user has a great experience on Hexed.",
    highlights: ["Community management", "Discord moderation", "User support", "Project strategy"],
    accent: "#a855f7",
  },
];

function TeamCard({ member, index }: { member: typeof TEAM[0]; index: number }) {
  const [winking, setWinking] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-[#0e0e0e] border border-white/[0.06] rounded-3xl p-8 flex flex-col gap-6 max-w-sm w-full"
      style={{ boxShadow: `0 0 40px 0 ${member.accent}10` }}
    >
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${member.accent}12 0%, transparent 60%)` }}
      />

      <div className="flex items-start gap-5 relative">
        <div
          className="relative w-20 h-20 shrink-0 cursor-pointer select-none"
          onMouseEnter={() => setWinking(true)}
          onMouseLeave={() => setWinking(false)}
        >
          <img
            src={member.avatar}
            alt={member.name}
            className="w-20 h-20 rounded-2xl object-cover"
            style={{ border: `2px solid ${member.accent}55` }}
          />
          <AnimatePresence>
            {winking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <span className="text-3xl select-none" style={{ lineHeight: 1 }}>😉</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">{member.name}</h2>
          <p className="text-sm font-semibold mt-0.5" style={{ color: member.accent }}>{member.role}</p>
          <p className="text-[11px] text-gray-600 mt-1 font-mono">{member.tag}</p>
        </div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed relative">{member.bio}</p>

      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2.5">Responsibilities</p>
        <div className="flex flex-wrap gap-1.5">
          {member.highlights.map(h => (
            <span
              key={h}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: member.accent + "18", color: member.accent, border: `1px solid ${member.accent}30` }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
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
            Two people. One platform. Everything you see on Hexed was built by this team.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-start justify-center gap-6">
          {TEAM.map((member, i) => (
            <TeamCard key={member.name} member={member} index={i} />
          ))}
        </div>

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
