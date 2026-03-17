import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ExternalLink, MapPin, Calendar, Eye, Hash, Play, Pause, Music, Volume2, ChevronLeft, ChevronRight, Tag, Shuffle, User as UserIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { VoidMark } from "@/lib/voidmark";
import { getPlatform } from "./dashboard";

// ─── CSS Animations ───────────────────────────────────────────────────────────

const PROFILE_STYLES = `
@keyframes rainbow-cycle {
  0%   { color: #ff0000; }
  14%  { color: #ff8800; }
  28%  { color: #ffff00; }
  42%  { color: #00ff00; }
  57%  { color: #0088ff; }
  71%  { color: #8800ff; }
  85%  { color: #ff00cc; }
  100% { color: #ff0000; }
}
@keyframes glitch-text {
  0%,100% { text-shadow: none; transform: translate(0); clip-path: none; }
  10% { text-shadow: -2px 0 #ff0000; transform: translate(-2px,0); }
  20% { text-shadow: 2px 0 #0000ff; transform: translate(2px,0); }
  30% { text-shadow: 0 0 #00ff00; transform: translate(0,1px); }
  40% { text-shadow: -2px 0 #ff00ff; transform: translate(-1px,-1px); }
  50% { text-shadow: 2px 0 #00ffff; transform: translate(2px,0); }
  60% { text-shadow: none; transform: translate(0); }
}
@keyframes gold-pulse {
  0%,100% { color: #FFD700; text-shadow: 0 0 6px #FFD700aa; }
  50% { color: #FFA500; text-shadow: 0 0 12px #FFA500aa; }
}
@keyframes neon-flicker {
  0%,19%,21%,23%,25%,54%,56%,100% { opacity:1; }
  20%,24%,55% { opacity:0.4; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@keyframes coin-spin {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(0.1); }
  100% { transform: scaleX(1); }
}
`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function res(url?: string | null) {
  if (!url) return "";
  return url.startsWith("/objects/") ? `${window.location.origin}${url}` : url;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function isSoundCloudUrl(url: string): boolean {
  return /soundcloud\.com/.test(url);
}

function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com/.test(url);
}

function getEmbedType(url: string): "youtube" | "soundcloud" | "spotify" | "audio" {
  if (isYouTubeUrl(url)) return "youtube";
  if (isSoundCloudUrl(url)) return "soundcloud";
  if (isSpotifyUrl(url)) return "spotify";
  return "audio";
}

function getYouTubeEmbedUrl(url: string, autoplay = true, muted = false): string {
  const id = getYouTubeVideoId(url);
  if (!id) return "";
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=1&playlist=${id}&controls=1&enablejsapi=1`;
}

function getSoundCloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23F97316&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
}

function getSpotifyEmbedUrl(url: string): string {
  return url.replace("open.spotify.com/", "open.spotify.com/embed/").replace("?si=", "?utm_source=oembed&si=");
}

function Img({ src, alt, className, style, eager }: { src: string; alt: string; className?: string; style?: React.CSSProperties; eager?: boolean }) {
  const r = res(src);
  if (!r) return null;
  return <img src={r} alt={alt} className={className} style={style} loading={eager ? "eager" : undefined} fetchPriority={eager ? "high" : undefined} onError={e => e.currentTarget.style.opacity = "0"} />;
}

function getS(settings: Record<string, any>, key: string, def: any) {
  return settings?.[key] !== undefined ? settings[key] : def;
}

// ─── Particle Background Effect ───────────────────────────────────────────────

function BgEffect({ type, color }: { type: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !type || type === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      if (type === "particles") {
        return { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, alpha: Math.random() * 0.6 + 0.2 };
      }
      if (type === "snow") {
        return { x: Math.random() * canvas.width, y: -10, r: Math.random() * 3 + 1, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.7 + 0.3 };
      }
      if (type === "rain") {
        return { x: Math.random() * canvas.width, y: -20, len: Math.random() * 20 + 10, vy: Math.random() * 8 + 8, alpha: Math.random() * 0.4 + 0.1 };
      }
      if (type === "fireflies") {
        return { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2.5 + 1, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), alpha: 0, targetAlpha: Math.random() * 0.8 + 0.2, phase: "fade-in" as const };
      }
      if (type === "coins") {
        const sizes = [6, 8, 10, 12];
        return {
          x: Math.random() * canvas.width,
          y: -20,
          r: sizes[Math.floor(Math.random() * sizes.length)],
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 2 + 1.5,
          alpha: Math.random() * 0.6 + 0.4,
          spin: 0,
          spinSpeed: (Math.random() - 0.5) * 0.12,
          scaleX: 1,
          scaleDir: Math.random() > 0.5 ? 1 : -1,
        };
      }
      return null;
    };

    const initCount = type === "rain" ? 80 : type === "particles" ? 60 : type === "coins" ? 25 : 40;
    for (let i = 0; i < initCount; i++) {
      const p = spawn();
      if (p) {
        if (type === "snow") p.y = Math.random() * canvas.height;
        if (type === "rain") p.y = Math.random() * canvas.height;
        particles.push(p);
      }
    }

    const hexToRgb = (hex: string) => {
      const r2 = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r2},${g},${b}`;
    };
    const rgb = color.startsWith("#") ? hexToRgb(color) : "249,115,22";

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        if (type === "particles") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
          ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        } else if (type === "snow") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.y > canvas.height + 10) { particles[i] = spawn(); if (particles[i]) particles[i].y = -10; }
        } else if (type === "rain") {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.1, p.y + p.len);
          ctx.strokeStyle = `rgba(${rgb},${p.alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          p.y += p.vy; p.x -= 0.5;
          if (p.y > canvas.height + 30 || p.x < -20) { particles[i] = spawn(); if (particles[i]) { particles[i].x = Math.random() * canvas.width; particles[i].y = -20; } }
        } else if (type === "fireflies") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${rgb},0.8)`;
          ctx.fill();
          ctx.shadowBlur = 0;
          p.x += p.vx; p.y += p.vy;
          if (p.phase === "fade-in") { p.alpha += 0.01; if (p.alpha >= p.targetAlpha) p.phase = "fade-out"; }
          else { p.alpha -= 0.008; if (p.alpha <= 0) { particles[i] = spawn(); } }
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
          p.vx = Math.max(-1, Math.min(1, p.vx));
          p.vy = Math.max(-1, Math.min(1, p.vy));
          if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) particles[i] = spawn();
        } else if (type === "coins") {
          // Draw spinning coin (ellipse that scaleX oscillates)
          p.spin += p.spinSpeed;
          p.scaleX = Math.abs(Math.cos(p.spin));
          const cw = p.r * Math.max(0.08, p.scaleX);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          ctx.ellipse(0, 0, cw, p.r, 0, 0, Math.PI * 2);
          // Gold gradient
          const grad = ctx.createLinearGradient(-cw, -p.r, cw, p.r);
          grad.addColorStop(0, `rgba(255,215,0,${p.alpha})`);
          grad.addColorStop(0.4, `rgba(255,240,120,${p.alpha})`);
          grad.addColorStop(0.6, `rgba(255,180,0,${p.alpha})`);
          grad.addColorStop(1, `rgba(180,120,0,${p.alpha})`);
          ctx.fillStyle = grad;
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255,200,0,0.5)";
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
          // Coin drift
          p.x += p.vx; p.y += p.vy;
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vx = Math.max(-1.5, Math.min(1.5, p.vx));
          if (p.y > canvas.height + 20) {
            const np = spawn();
            if (np) { np.y = -20; particles[i] = np; }
          }
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [type, color]);

  if (!type || type === "none") return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
}

// ─── Cursor Trail ─────────────────────────────────────────────────────────────

function CursorTrail({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const onMove = (e: MouseEvent) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, alpha: 1 });
      if (pointsRef.current.length > 30) pointsRef.current.shift();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pointsRef.current = pointsRef.current.map(p => ({ ...p, alpha: p.alpha * 0.88 })).filter(p => p.alpha > 0.02);
      pointsRef.current.forEach((p, i) => {
        const size = 4 * (i / pointsRef.current.length) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    draw();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[9999]" />;
}

// ─── Sparkle Text ─────────────────────────────────────────────────────────────

const SPARKLE_COLORS_MAP: Record<string, string[]> = {
  rainbow: ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#8800ff", "#ff00cc"],
  red: ["#ff0000", "#ff4444", "#ff8888"],
  blue: ["#0088ff", "#00ccff", "#4488ff"],
  green: ["#00ff88", "#00cc44", "#88ff00"],
  purple: ["#8800ff", "#cc00ff", "#ff00cc"],
  white: ["#ffffff", "#eeeeee", "#dddddd"],
  gold: ["#FFD700", "#FFA500", "#FFEC8B"],
};

function SparkleText({ text, themeColor, colorMode = "theme" }: { text: string; themeColor: string; colorMode?: string }) {
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; size: number; color: string }[]>([]);
  const idRef = useRef(0);
  const colorIdxRef = useRef(0);

  const pickColor = () => {
    const palette = SPARKLE_COLORS_MAP[colorMode];
    if (palette) {
      const c = palette[colorIdxRef.current % palette.length];
      colorIdxRef.current++;
      return c;
    }
    return themeColor;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newSpark = {
        id: idRef.current++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: pickColor(),
      };
      setSparks(s => [...s.slice(-8), newSpark]);
      setTimeout(() => setSparks(s => s.filter(sp => sp.id !== newSpark.id)), 800);
    }, 200);
    return () => clearInterval(interval);
  }, [colorMode, themeColor]);

  if (colorMode === "glitch") {
    return (
      <span className="relative inline-block" style={{ animation: "glitch-text 2s infinite" }}>
        {text}
      </span>
    );
  }

  const textStyle: React.CSSProperties = colorMode === "rainbow"
    ? { animation: "rainbow-cycle 3s linear infinite" }
    : colorMode === "gold"
    ? { animation: "gold-pulse 2s ease-in-out infinite" }
    : {};

  return (
    <span className="relative inline-block" style={textStyle}>
      {sparks.map(s => (
        <motion.span
          key={s.id}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={{ opacity: 0, scale: 0, y: -16 }}
          transition={{ duration: 0.8 }}
          className="absolute pointer-events-none select-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size, color: s.color }}
        >✦</motion.span>
      ))}
      {text}
    </span>
  );
}

// ─── Tilt Box ─────────────────────────────────────────────────────────────────

function TiltBox({ children, intensity = 15, enabled = true, autoTilt = false, autoTiltInterval = 4, className = "", style, onTiltChange, externalTilt }: {
  children: React.ReactNode; intensity?: number; enabled?: boolean;
  autoTilt?: boolean; autoTiltInterval?: number;
  className?: string; style?: React.CSSProperties;
  onTiltChange?: (x: number, y: number) => void;
  externalTilt?: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const activeTilt = externalTilt ?? tilt;

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const nx = dy * intensity * -1;
    const ny = dx * intensity;
    setTilt({ x: nx, y: ny });
    onTiltChange?.(nx, ny);
  }, [enabled, intensity, onTiltChange]);

  const onMouseEnter = useCallback(() => setIsHovering(true), []);
  const onMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    onTiltChange?.(0, 0);
  }, [onTiltChange]);

  useEffect(() => {
    if (!enabled || !autoTilt || isHovering) return;
    let phase = 0;
    const steps = 60;
    let step = 0;
    let rafId: number;
    const animate = () => {
      step++;
      const t = (step / steps) * Math.PI * 2;
      const x = Math.sin(t + phase) * (intensity * 0.5);
      const y = Math.cos(t * 0.7 + phase) * (intensity * 0.5);
      setTilt({ x, y });
      onTiltChange?.(x, y);
      rafId = requestAnimationFrame(animate);
    };
    const interval = setInterval(() => {
      phase += 1.2;
      step = 0;
    }, autoTiltInterval * 1000);
    rafId = requestAnimationFrame(animate);
    return () => { clearInterval(interval); cancelAnimationFrame(rafId); setTilt({ x: 0, y: 0 }); onTiltChange?.(0, 0); };
  }, [enabled, autoTilt, autoTiltInterval, intensity, isHovering, onTiltChange]);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{
        ...style,
        transform: enabled ? `perspective(1000px) rotateX(${activeTilt.x}deg) rotateY(${activeTilt.y}deg)` : undefined,
        transition: activeTilt.x === 0 && activeTilt.y === 0 ? "transform 0.5s ease" : "transform 0.08s linear",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Music Player ─────────────────────────────────────────────────────────────

function EmbedPlayer({ track, themeColor, onNext, hasPrev, hasNext, onPrev, trackCount }: {
  track: { title: string; url: string; artistProfile?: string };
  themeColor: string;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  trackCount: number;
}) {
  const type = getEmbedType(track.url);
  let embedUrl = "";
  if (type === "youtube") embedUrl = getYouTubeEmbedUrl(track.url, true, false);
  else if (type === "soundcloud") embedUrl = getSoundCloudEmbedUrl(track.url);
  else if (type === "spotify") embedUrl = getSpotifyEmbedUrl(track.url);

  const iframeHeight = type === "spotify" ? 80 : type === "soundcloud" ? 120 : 155;

  return (
    <div className="bg-black/90 border rounded-2xl overflow-hidden" style={{ borderColor: themeColor + "44", width: 280 }}>
      <iframe
        src={embedUrl}
        width="280"
        height={iframeHeight}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ display: "block" }}
      />
      <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${themeColor}22` }}>
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-xs font-bold truncate text-white">{track.title}</p>
          {track.artistProfile && <p className="text-[10px] text-gray-400 truncate">{track.artistProfile}</p>}
        </div>
        {trackCount > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onPrev} disabled={!hasPrev} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={onNext} disabled={!hasNext} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MusicPlayer({ tracks, autoplay, position, themeColor, randomStart }: {
  tracks: { title: string; url: string; artistProfile?: string }[];
  autoplay: boolean;
  position: string;
  themeColor: string;
  randomStart?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => randomStart && tracks.length > 1 ? Math.floor(Math.random() * tracks.length) : 0);
  const [expanded, setExpanded] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const actualIdx = shuffled && shuffleOrder.length > 0 ? shuffleOrder[trackIdx] : trackIdx;
  const currentTrack = tracks[actualIdx];
  const currentEmbedType = currentTrack ? getEmbedType(currentTrack.url) : "audio";
  const isEmbed = currentEmbedType !== "audio";

  const posClass = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  }[position] || "bottom-4 right-4";

  const buildShuffle = () => {
    const arr = tracks.map((_, i) => i).sort(() => Math.random() - 0.5);
    setShuffleOrder(arr);
    setTrackIdx(0);
  };

  useEffect(() => {
    if (!isEmbed && audioRef.current && autoplay && tracks.length > 0 && !playing) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [autoplay]);

  useEffect(() => {
    if (!isEmbed && audioRef.current) {
      audioRef.current.src = res(currentTrack?.url);
      if (playing) audioRef.current.play().catch(() => {});
    }
  }, [trackIdx, shuffleOrder]);

  const togglePlay = () => {
    if (isEmbed) return;
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const prev = () => setTrackIdx(i => (i - 1 + tracks.length) % tracks.length);
  const next = () => setTrackIdx(i => (i + 1) % tracks.length);

  const toggleShuffle = () => {
    if (!shuffled) { buildShuffle(); setShuffled(true); }
    else { setShuffled(false); setTrackIdx(actualIdx); }
  };

  if (!tracks.length) return null;

  if (isEmbed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`fixed ${posClass} z-50`}
      >
        <EmbedPlayer
          track={currentTrack}
          themeColor={themeColor}
          onPrev={prev}
          onNext={next}
          hasPrev={trackIdx > 0}
          hasNext={trackIdx < tracks.length - 1}
          trackCount={tracks.length}
        />
      </motion.div>
    );
  }

  return (
    <>
      <audio ref={audioRef} src={res(currentTrack?.url)} loop={tracks.length === 1} onEnded={next} />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`fixed ${posClass} z-50 flex flex-col gap-1`}
        style={{ maxWidth: "260px" }}
      >
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-black/90 border rounded-xl px-3 py-2 text-white"
              style={{ borderColor: themeColor + "44" }}
            >
              <p className="text-xs font-bold truncate flex items-center gap-1">
                <Volume2 className="w-3 h-3 shrink-0" style={{ color: themeColor }} />
                {currentTrack?.title || "Track"}
              </p>
              {currentTrack?.artistProfile && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5 ml-4">{currentTrack.artistProfile}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className="flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-full border px-2 py-1.5"
          style={{ borderColor: themeColor + "44" }}
        >
          {tracks.length > 1 && (
            <button onClick={prev} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ backgroundColor: themeColor }}
          >
            {playing ? <Pause className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-black ml-0.5" />}
          </button>
          {tracks.length > 1 && (
            <button onClick={next} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {tracks.length > 1 && (
            <button onClick={toggleShuffle} className={`w-5 h-5 flex items-center justify-center transition-colors ${shuffled ? "" : "text-gray-500 hover:text-white"}`}
              style={shuffled ? { color: themeColor } : undefined}>
              <Shuffle className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="w-5 h-5 flex items-center justify-center">
            <Music className="w-3 h-3 text-gray-500 hover:text-white transition-colors" />
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Page Overlay ─────────────────────────────────────────────────────────────

function PageOverlay({ type }: { type: string }) {
  if (type === "none" || !type) return null;
  if (type === "dark") return <div className="fixed inset-0 bg-black/50 pointer-events-none z-[1]" />;
  if (type === "grid") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
    />
  );
  if (type === "dots") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
    />
  );
  if (type === "scanlines") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.2) 2px,rgba(0,0,0,0.2) 4px)" }}
    />
  );
  if (type === "vignette") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)" }}
    />
  );
  return null;
}

// ─── Profile Effect Overlays ──────────────────────────────────────────────────

function ProfileEffect({ effect }: { effect: string }) {
  if (!effect || effect === "none") return null;

  if (effect === "retro") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", mixBlendMode: "multiply" }}
      />
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)" }} />
      <style>{`body { filter: sepia(0.35) saturate(0.7) contrast(1.1); }`}</style>
    </>
  );
  if (effect === "oldtv") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.3) 1px,rgba(0,0,0,0.3) 2px)" }}
      />
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.85) 100%)" }} />
      <style>{`body { filter: grayscale(0.4) contrast(1.2) brightness(0.9); }`}</style>
    </>
  );
  if (effect === "night") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "linear-gradient(180deg, rgba(10,20,60,0.4) 0%, rgba(5,5,30,0.5) 100%)", mixBlendMode: "color" }} />
      <style>{`body { filter: brightness(0.85) saturate(0.6) hue-rotate(200deg); }`}</style>
    </>
  );
  if (effect === "vhs") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)" }}
      />
      <style>{`
        body { filter: saturate(1.3) contrast(1.1); }
        body::before { content:''; position:fixed; inset:0; background: rgba(255,0,0,0.03); mix-blend-mode:screen; pointer-events:none; z-index:9999; }
      `}</style>
    </>
  );
  if (effect === "glitch") return (
    <style>{`
      @keyframes glitch-bg {
        0%,100% { transform: translate(0); }
        20% { transform: translate(-2px,1px); }
        40% { transform: translate(2px,-1px); }
        60% { transform: translate(-1px,2px); }
        80% { transform: translate(1px,-2px); }
      }
      body { animation: glitch-bg 4s infinite; }
    `}</style>
  );
  return null;
}

// ─── Avatar Decoration ────────────────────────────────────────────────────────

function AvatarWrapper({ src, username, radius, decoration, themeColor, size = 112 }: {
  src?: string; username: string; radius: number; decoration: string; themeColor: string; size?: number;
}) {
  const s = size;
  const borderRadius = `${radius}%`;
  const isYT = src ? isYouTubeUrl(src) : false;

  const decoStyle: React.CSSProperties = {};
  if (decoration === "ring-pulse") {
    decoStyle.boxShadow = `0 0 0 3px ${themeColor}, 0 0 0 6px ${themeColor}44`;
    decoStyle.animation = "pulse 2s infinite";
  } else if (decoration === "neon") {
    decoStyle.boxShadow = `0 0 15px ${themeColor}88, 0 0 30px ${themeColor}44`;
  } else if (decoration === "rainbow") {
    decoStyle.outline = "3px solid transparent";
    decoStyle.backgroundClip = "padding-box";
    decoStyle.animation = "spin 3s linear infinite";
  }

  return (
    <div className="relative" style={{ width: s, height: s }}>
      {decoration === "ring-spin" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{ borderRadius, background: `conic-gradient(${themeColor}, transparent, ${themeColor})`, padding: "3px" }}
        />
      )}
      <div className="absolute inset-0 overflow-hidden bg-[#111]" style={{ borderRadius, ...decoStyle }}>
        {src && isYT ? (
          <iframe
            src={getYouTubeEmbedUrl(src, true, true)}
            width={s}
            height={s}
            frameBorder="0"
            allow="autoplay; mute"
            style={{ display: "block", pointerEvents: "none" }}
          />
        ) : src ? (
          <Img src={src} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/20">
            {username[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Link Renderers ────────────────────────────────────────────────────────────

function LinkCard({ link, themeColor, primaryText, secondaryText, matchToTheme, linksGlow, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;

  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? "#ffffff" : (lp?.color || themeColor));
  const iconBg = matchToTheme ? `${themeColor}22` : (lp ? `${lp.color}22` : "rgba(255,255,255,0.05)");
  const iconBorder = matchToTheme ? `${themeColor}44` : `1px solid ${lp ? lp.color + "33" : "rgba(255,255,255,0.1)"}`;
  const bg = matchToTheme ? `${themeColor}08` : (lp ? `${lp.color}18` : `rgba(255,255,255,0.03)`);
  const borderColor = matchToTheme ? `${themeColor}22` : (lp ? `${lp.color}33` : "rgba(255,255,255,0.05)");

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-4 p-4 rounded-2xl border transition-all group relative overflow-hidden"
      style={{ backgroundColor: bg, borderColor, boxShadow: linksGlow ? `0 0 18px 2px ${themeColor}30, 0 0 40px 4px ${themeColor}14` : undefined }}
    >
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: matchToTheme ? `linear-gradient(135deg, ${themeColor}12, ${themeColor}22)` : (lp ? `linear-gradient(135deg, ${lp.color}12, ${lp.color}22)` : `linear-gradient(135deg, ${themeColor}08, ${themeColor}14)`) }}
      />
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ backgroundColor: iconBg, border: iconBorder }}>
        {iconSrc ? (
          <img src={res(iconSrc)} alt="" className="w-7 h-7 object-contain" style={matchToTheme ? { filter: "brightness(0) invert(1)" } : undefined} />
        ) : IconEl ? (
          <IconEl style={{ color: iconColor }} className="w-6 h-6" />
        ) : (
          <ExternalLink className="w-5 h-5" style={{ color: iconColor }} />
        )}
      </div>
      <div className="flex-1 min-w-0 relative">
        <p className="font-black text-base leading-tight" style={{ color: primaryText }}>{link.title}</p>
        {link.description && <p className="text-xs mt-0.5 leading-snug" style={{ color: secondaryText }}>{link.description}</p>}
        {lp && <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-60" style={{ color: matchToTheme ? themeColor : lp.color }}>{lp.name}</p>}
      </div>
    </motion.a>
  );
}

function LinkIcon({ link, themeColor, matchToTheme, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;
  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? themeColor : (lp?.color || themeColor));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.25, y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 flex items-center justify-center transition-all"
          title={link.title}
        >
          {iconSrc ? (
            <img src={res(iconSrc)} alt="" className="w-7 h-7 object-contain drop-shadow-md" />
          ) : IconEl ? (
            <IconEl style={{ color: iconColor }} className="w-6 h-6 drop-shadow-md" />
          ) : (
            <ExternalLink className="w-5 h-5 drop-shadow-md" style={{ color: iconColor }} />
          )}
        </motion.a>
      </TooltipTrigger>
      <TooltipContent className="bg-black border-white/10 text-xs font-bold">{link.title}</TooltipContent>
    </Tooltip>
  );
}

// ─── Discord Server Embed Card ─────────────────────────────────────────────────
function DiscordEmbedCard({ link, themeColor }: any) {
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = (link.url || "").trim();
    const code = raw
      .replace(/https?:\/\/discord\.gg\//i, "")
      .replace(/https?:\/\/discord\.com\/invite\//i, "")
      .replace(/\?.*/,"")
      .trim();
    if (!code) { setLoading(false); return; }
    fetch(`/api/discord-invite/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setServer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [link.url]);

  if (loading) return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#5865F2]/20 bg-[#5865F2]/5 animate-pulse">
      <div className="w-14 h-14 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-32" />
        <div className="h-3 bg-white/5 rounded w-20" />
      </div>
      <div className="w-16 h-8 bg-white/10 rounded-xl" />
    </div>
  );

  if (!server?.name) return null;

  const joinUrl = `https://discord.gg/${server.code}`;
  return (
    <motion.a
      href={joinUrl}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.01, y: -1 }}
      className="flex items-center gap-4 p-4 rounded-2xl border relative overflow-hidden cursor-pointer"
      style={{ backgroundColor: "#5865F211", borderColor: "#5865F233" }}
    >
      <motion.div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "linear-gradient(135deg, #5865F212, #5865F224)" }} />
      {server.icon
        ? <img src={server.icon} alt="" className="w-14 h-14 rounded-full shrink-0 relative" />
        : <div className="w-14 h-14 rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0 relative">
            <span className="text-[#5865F2] text-xl font-black">{server.name[0]}</span>
          </div>
      }
      <div className="flex-1 min-w-0 relative">
        <p className="font-black text-base leading-tight truncate">{server.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          <span className="text-green-400 font-bold">{server.onlineCount?.toLocaleString() ?? "?"}</span> online
          {" · "}
          <span className="font-bold">{server.memberCount?.toLocaleString() ?? "?"}</span> members
        </p>
        <p className="text-[10px] font-black uppercase tracking-wider mt-1 text-[#7289da] opacity-80">discord · via hexed.at</p>
      </div>
      <span
        className="relative px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-xl text-sm transition-colors shrink-0"
      >
        Join
      </span>
    </motion.a>
  );
}

function LinkDefault({ link, themeColor, primaryText, secondaryText, matchToTheme, linksGlow, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;
  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? "#ffffff" : (lp?.color || secondaryText));
  const iconBgColor = matchToTheme ? `${themeColor}22` : "rgba(0,0,0,0.5)";
  const iconBorderColor = matchToTheme ? `${themeColor}44` : `${lp?.color || themeColor}22`;

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.01, x: 3 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 transition-all group relative overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", boxShadow: linksGlow ? `0 0 18px 2px ${themeColor}30, 0 0 40px 4px ${themeColor}14` : undefined }}
    >
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${themeColor}08, ${themeColor}14)` }}
      />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 relative"
        style={{ backgroundColor: iconBgColor, borderColor: iconBorderColor }}>
        {iconSrc ? (
          <img src={res(iconSrc)} alt="" className="w-5 h-5 object-contain" style={matchToTheme ? { filter: "brightness(0) invert(1)" } : undefined} />
        ) : IconEl ? (
          <IconEl style={{ color: iconColor }} className="w-4 h-4" />
        ) : (
          <ExternalLink className="w-4 h-4" style={{ color: iconColor }} />
        )}
      </div>
      <div className="flex-1 text-left relative">
        <p className="font-black text-sm leading-tight" style={{ color: primaryText }}>{link.title}</p>
        {link.description && <p className="text-[11px] mt-0.5 leading-tight" style={{ color: secondaryText }}>{link.description}</p>}
      </div>
    </motion.a>
  );
}

// ─── Main Profile ─────────────────────────────────────────────────────────────

export default function PublicProfile() {
  const [, params] = useRoute("/:username");
  const [revealed, setRevealed] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const [splitTilt, setSplitTilt] = useState({ x: 0, y: 0 });
  const username = params?.username;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/public/profile/${username}`],
    enabled: !!username,
    retry: false,
  });

  const { data: badgeData } = useQuery<any>({ queryKey: ["/api/badges"] });
  const { data: tracksData } = useQuery<any>({
    queryKey: [`/api/public/tracks/${username}`],
    enabled: !!username,
  });

  const { user, profile } = data || {};
  const s: Record<string, any> = profile?.settings || {};

  const themeColor       = profile?.themeColor || "#F97316";
  const primaryText      = getS(s, "primaryTextColor", "#ffffff");
  const secondaryText    = getS(s, "secondaryTextColor", "#9ca3af");
  const faviconUrl       = getS(s, "faviconUrl", "");
  const pageTitle        = getS(s, "pageTitle", "");
  const pageTitleAnim    = getS(s, "pageTitleAnim", "none");
  const pageTitleSpeed   = getS(s, "pageTitleAnimSpeed", 3);
  const pageOverlay      = getS(s, "pageOverlay", "none");
  const enterAnim        = getS(s, "pageEnterAnim", "fade");
  const enterSpeed       = getS(s, "pageEnterSpeed", 0.4);
  const bannerOpacity    = getS(s, "bannerOpacity", 1);
  const bannerBlur       = getS(s, "bannerBlur", 0);
  const boxTilt          = getS(s, "boxTilt", true);
  const boxTiltIntensity = getS(s, "boxTiltIntensity", 12);
  const autoTilt         = getS(s, "autoTilt", false);
  const autoTiltInterval = getS(s, "autoTiltInterval", 4);
  const boxWidth         = getS(s, "boxWidth", 520);
  const boxPadding       = getS(s, "boxPadding", 28);
  const boxColor         = getS(s, "boxColor", "#000000");
  const boxOpacity       = getS(s, "boxOpacity", 0.45);
  const boxRadius        = getS(s, "boxRadius", 24);
  const bgSize           = getS(s, "bgSize", "cover");
  const bgBlur           = getS(s, "bgBlur", 0);
  const bgOpacity        = getS(s, "bgOpacity", 0.4);
  const bgParticles      = getS(s, "bgParticles", "none");
  const usernameSparkles = getS(s, "usernameSparkles", false);
  const sparkleColor     = getS(s, "sparkleColor", "theme");
  const usernameFont     = getS(s, "usernameFont", "inherit");
  const avatarDecoration = getS(s, "avatarDecoration", "none");
  const avatarRadius     = getS(s, "avatarRadius", 50);
  const cursor           = getS(s, "cursor", "default");
  const cursorTrail      = getS(s, "cursorTrail", false);
  const cursorTrailColor = getS(s, "cursorTrailColor", themeColor);
  const revealBlur       = getS(s, "revealBlur", 8);
  const autoReveal       = getS(s, "autoReveal", false);
  const autoRevealDelay  = getS(s, "autoRevealDelay", 3);
  const trackPlayerEnabled  = getS(s, "trackPlayerEnabled", true);
  const trackPlayerPos      = getS(s, "trackPlayerPos", "bottom-right");
  const trackPlayerAutoplay = getS(s, "trackPlayerAutoplay", true);
  const trackRandomStart    = getS(s, "trackRandomStart", false);
  const profileEffect      = getS(s, "profileEffect", "none");
  const contentAlign       = getS(s, "contentAlign", "center");
  const tags: string[]     = getS(s, "tags", []);
  const tagsPosition       = getS(s, "tagsPosition", "default");
  const profileFont        = getS(s, "profileFont", "inherit");
  const pronouns           = getS(s, "pronouns", "");
  const statusMsg          = getS(s, "statusMessage", "");
  const statusEmoji        = getS(s, "statusEmoji", "");
  const metaInfoPos        = getS(s, "metaInfoPos", "default");
  const matchLinksToTheme  = getS(s, "matchLinksToTheme", false);
  const matchBadgesToTheme = getS(s, "matchBadgesToTheme", false);
  const badgesGlow         = getS(s, "badgesGlow", false);
  const linksLayout        = getS(s, "linksLayout", "stacked");
  const linksGlow          = getS(s, "linksGlow", false);
  const themeColorIcons    = getS(s, "themeColorIcons", false);
  const boxBorderColor     = getS(s, "boxBorderColor", null);

  // Page title effect
  useEffect(() => {
    if (!data) return;
    const base = pageTitle || (profile ? `${profile.displayName || user?.username} — Hexed` : "Hexed");
    if (pageTitleAnim === "scroll") {
      const full = `${base}   `;
      let i = 0;
      const t = setInterval(() => {
        document.title = full.slice(i) + full.slice(0, i);
        i = (i + 1) % full.length;
      }, pageTitleSpeed * 100);
      return () => clearInterval(t);
    } else if (pageTitleAnim === "blink") {
      let on = true;
      const t = setInterval(() => {
        document.title = on ? base : "· · ·";
        on = !on;
      }, pageTitleSpeed * 300);
      return () => clearInterval(t);
    } else {
      document.title = base;
    }
  }, [data, pageTitle, pageTitleAnim, pageTitleSpeed]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = res(faviconUrl);
  }, [faviconUrl]);

  // Reveal
  useEffect(() => {
    if (data?.profile && !data.profile.revealEnabled) { setRevealed(true); setMusicStarted(true); }
  }, [data]);

  // Auto-reveal timer
  useEffect(() => {
    if (!data?.profile?.revealEnabled || revealed || !autoReveal) return;
    const t = setTimeout(() => { setRevealed(true); setMusicStarted(true); }, autoRevealDelay * 1000);
    return () => clearTimeout(t);
  }, [data, revealed, autoReveal, autoRevealDelay]);  

  const enterVariants: Record<string, any> = {
    fade:       { initial: { opacity: 0 }, animate: { opacity: 1 } },
    "slide-up": { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
    scale:      { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } },
    blur:       { initial: { opacity: 0, filter: "blur(20px)" }, animate: { opacity: 1, filter: "blur(0px)" } },
  };
  const ev = enterVariants[enterAnim] || enterVariants.fade;

  const tracks = (tracksData || []).map((t: any) => ({ title: t.title, url: t.url, artistProfile: t.artistProfile || "" }));
  if (profile?.musicUrl && tracks.length === 0) {
    tracks.push({ title: "Music", url: profile.musicUrl, artistProfile: "" });
  }

  const handleReveal = () => { setRevealed(true); setMusicStarted(true); };

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-black mb-2 tracking-widest" style={{ color: themeColor }}>404</h1>
      <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">User not found</p>
      <a href="/" className="mt-8 text-xs font-black tracking-widest uppercase border border-white/20 px-6 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all" style={{ color: primaryText }}>Go Home</a>
    </div>
  );

  if (data?.isBanned) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-3xl font-black mb-2 tracking-widest text-red-400">This user has been banned!</h1>
      <p className="text-gray-600 font-bold tracking-widest uppercase text-xs">This account has been disabled.</p>
      <a href="/" className="mt-8 text-xs font-black tracking-widest uppercase border border-white/20 px-6 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all text-white">Go Home</a>
    </div>
  );

  const showReveal = profile?.revealEnabled && !revealed;

  const getBadgeIcon = (name: string) => badgeData?.find((b: any) => b.name === name)?.icon || "";

  const hexToRgb = (hex: string) => {
    try {
      const r2 = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r2},${g},${b}`;
    } catch { return "0,0,0"; }
  };
  const boxRgb = hexToRgb(boxColor.startsWith("#") ? boxColor : "#000000");
  const boxBg = `rgba(${boxRgb},${boxOpacity})`;

  const alignClass = contentAlign === "left" ? "items-start" : contentAlign === "right" ? "items-end" : "items-center";
  const textAlignClass = contentAlign === "left" ? "text-left" : contentAlign === "right" ? "text-right" : "text-center";

  // Separate icon-style links from others
  const iconLinks = (data.links || []).filter((l: any) => l.style === "icon");
  const regularLinks = (data.links || []).filter((l: any) => l.style !== "icon");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "#050505", color: primaryText, cursor, fontFamily: profileFont !== "inherit" ? profileFont : undefined }}
    >
      <style>{PROFILE_STYLES}</style>

      {/* Background Media */}
      {profile?.backgroundVideoUrl ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <video src={res(profile.backgroundVideoUrl)} autoPlay loop muted playsInline
            className="w-full h-full"
            style={{ objectFit: bgSize as any, opacity: bgOpacity, filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined }}
          />
        </div>
      ) : profile?.backgroundUrl ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Img src={profile.backgroundUrl} alt="bg" className="w-full h-full" eager
            style={{ objectFit: bgSize as any, opacity: bgOpacity, filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined }}
          />
        </div>
      ) : null}

      <BgEffect type={bgParticles} color={themeColor} />
      <PageOverlay type={pageOverlay} />
      {cursorTrail && <CursorTrail color={cursorTrailColor} />}
      <ProfileEffect effect={profileEffect} />

      {trackPlayerEnabled && tracks.length > 0 && (
        <MusicPlayer tracks={tracks} autoplay={trackPlayerAutoplay && musicStarted} position={trackPlayerPos} themeColor={themeColor} randomStart={trackRandomStart} />
      )}

      <AnimatePresence mode="wait">
        {/* Reveal Screen */}
        {showReveal ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer"
            style={{ backgroundColor: "#000" }}
            onClick={handleReveal}
          >
            {profile?.backgroundVideoUrl ? (
              <div className="absolute inset-0 pointer-events-none">
                <video src={res(profile.backgroundVideoUrl)} autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.15, filter: `blur(${revealBlur}px)` }}
                />
              </div>
            ) : profile?.backgroundUrl && (
              <div className="absolute inset-0 pointer-events-none">
                <Img src={profile.backgroundUrl} alt="bg" className="w-full h-full object-cover"
                  style={{ opacity: 0.15, filter: `blur(${revealBlur}px)` }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-black/70 pointer-events-none" />
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="relative z-10 text-center px-8"
            >
              <h2 className="text-3xl font-black uppercase tracking-[0.25em]" style={{ color: themeColor }}>
                <VoidMark text={profile.revealText || "Click to reveal"} themeColor={themeColor} />
              </h2>
            </motion.div>
          </motion.div>
        ) : (
          /* Main Profile */
          <motion.div
            key="profile"
            initial={ev.initial}
            animate={ev.animate}
            transition={{ duration: enterSpeed }}
            className="relative z-10 py-8"
            style={{ width: "100%", maxWidth: boxWidth }}
          >
            <TiltBox
              enabled={boxTilt}
              intensity={boxTiltIntensity}
              autoTilt={autoTilt}
              autoTiltInterval={autoTiltInterval}
              onTiltChange={linksLayout === "split" ? (x, y) => setSplitTilt({ x, y }) : undefined}
              className="rounded-3xl overflow-hidden relative"
              style={{
                background: boxBg,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: boxRadius,
                padding: boxPadding,
              }}
            >
              {/* Banner */}
              {profile?.bannerUrl && (
                <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: 160, borderRadius: `${boxRadius}px ${boxRadius}px 0 0` }}>
                  {isYouTubeUrl(profile.bannerUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(profile.bannerUrl, true, true)}
                      className="w-full h-full"
                      style={{ opacity: bannerOpacity, filter: bannerBlur > 0 ? `blur(${bannerBlur}px)` : undefined, pointerEvents: "none", border: "none" }}
                      allow="autoplay; mute"
                      frameBorder="0"
                    />
                  ) : (
                    <Img src={profile.bannerUrl} alt="banner" className="w-full h-full object-cover"
                      style={{ opacity: bannerOpacity, filter: bannerBlur > 0 ? `blur(${bannerBlur}px)` : undefined }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                </div>
              )}

              {/* Top-right meta chips — overlap banner */}
              {metaInfoPos === "top-right" && (
                <div className="absolute top-3 right-3 z-20 flex flex-wrap justify-end gap-1.5 max-w-[65%]">
                  {profile.location && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{profile.location}
                    </span>
                  )}
                  {pronouns && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <UserIcon className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{pronouns}
                    </span>
                  )}
                  {profile.showJoinDate && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{new Date(user.joinDate).toLocaleDateString()}
                    </span>
                  )}
                  {profile.showUid && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Hash className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />UID {user.id}
                    </span>
                  )}
                  {profile.showViews && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Eye className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{user.views} views
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`relative ${profile?.bannerUrl ? "mt-28" : ""}`}>
                {/* Avatar row */}
                <div className={`flex ${contentAlign === "center" ? "flex-col items-center" : "items-end gap-4"} mb-4`}>
                  <AvatarWrapper
                    src={profile?.avatarUrl}
                    username={user.username}
                    radius={avatarRadius}
                    decoration={avatarDecoration}
                    themeColor={themeColor}
                    size={contentAlign === "center" ? 100 : 88}
                  />
                  <div className={`pb-1 min-w-0 ${contentAlign === "center" ? "mt-3 text-center" : ""}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${contentAlign === "center" ? "justify-center" : ""}`}>
                      <h1
                        className="text-2xl font-black leading-tight"
                        style={{ color: primaryText, fontFamily: usernameFont !== "inherit" ? usernameFont : undefined }}
                      >
                        {usernameSparkles
                          ? <SparkleText text={profile.displayName || user.username} themeColor={themeColor} colorMode={sparkleColor} />
                          : (profile.displayName || user.username)
                        }
                      </h1>
                    </div>
                        {/* Badges — icon only, tooltip on hover */}
                        {user.badges && user.badges.length > 0 && (
                          <TooltipProvider delayDuration={50}> {/* <--- CHANGE THIS LINE */}
                            <div className={`flex items-center gap-2 mt-1.5 flex-wrap ${contentAlign === "center" ? "justify-center" : ""}`}>
                              {user.badges.map((badgeName: string) => {
                                const icon = getBadgeIcon(badgeName);
                                const displayName = badgeName.startsWith("custom:") ? badgeName.replace("custom:", "") : badgeName;
                                const isImg = icon?.startsWith("http") || icon?.startsWith("/objects/") || icon?.includes("/objects/");
                            
                            // Luminance check — if theme colour is very light (e.g. white), darken for glow so it stays visible
                            const themeLuminance = (() => {
                              const r = parseInt(themeColor.slice(1,3),16);
                              const g = parseInt(themeColor.slice(3,5),16);
                              const b = parseInt(themeColor.slice(5,7),16);
                              return 0.299*r + 0.587*g + 0.114*b;
                            })();
                            const isLightTheme = themeLuminance > 200;
                            const glowColor = isLightTheme ? "#aaaaaa" : themeColor;

                            // Glow: shape-hugging drop-shadow (applied directly to inner content)
                            const glowDrop = badgesGlow
                              ? `drop-shadow(0 0 5px ${glowColor}dd) drop-shadow(0 0 10px ${glowColor}88)`
                              : "";

                            // Compute hue rotation so sepia (~30°) maps to theme color hue
                            const hexToHue = (hex: string) => {
                              const r = parseInt(hex.slice(1,3),16)/255;
                              const g = parseInt(hex.slice(3,5),16)/255;
                              const b = parseInt(hex.slice(5,7),16)/255;
                              const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
                              if (d===0) return 0;
                              let h = max===r ? ((g-b)/d)%6 : max===g ? (b-r)/d+2 : (r-g)/d+4;
                              return Math.round(h*60);
                            };
                            const themeHue = hexToHue(themeColor);
                            const hueRot = `${themeHue - 30}deg`;

                            const tintFilter = `sepia(0.15) saturate(1.2) hue-rotate(${hueRot}) brightness(1.05)`;

                            let imgFilter = "";
                            if (matchBadgesToTheme && isImg) {
                              imgFilter = [tintFilter, glowDrop].filter(Boolean).join(" ");
                            } else if (badgesGlow && isImg) {
                              imgFilter = glowDrop;
                            }

                            const emojiStyle: React.CSSProperties = (() => {
                              if (badgesGlow) return { filter: glowDrop };
                              return {};
                            })();

                            return (
                              <Tooltip key={badgeName}>
                                <TooltipTrigger asChild>
                                  <motion.span
                                    whileHover={{ scale: 1.2 }}
                                    className="text-base leading-none cursor-default select-none inline-flex items-center justify-center p-0.5"
                                  >
                                    {isImg
                                      ? <img src={res(icon)} alt={displayName} className="w-5 h-5 object-contain inline-block" style={imgFilter ? { filter: imgFilter } : undefined} />
                                      : <span style={emojiStyle}>{icon}</span>
                                    }
                                  </motion.span>
                                </TooltipTrigger>
                                <TooltipContent
                                  className="border text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                  style={{ backgroundColor: "#111", borderColor: themeColor + "40", color: themeColor }}
                                >
                                  {displayName}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div className={`mb-4 text-sm leading-relaxed ${textAlignClass}`} style={{ color: secondaryText }}>
                    <VoidMark text={profile.bio} themeColor={themeColor} />
                  </div>
                )}

                {/* Status bubble */}
                {(statusMsg || statusEmoji) && (
                  <div className={`flex mb-2 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[11px] font-semibold" style={{ color: secondaryText }}>
                      {statusEmoji && <span className="text-sm">{statusEmoji}</span>}
                      {statusMsg}
                    </span>
                  </div>
                )}

                {/* Meta chips — shown inline when NOT top-right (top-right is rendered over banner above) */}
                {metaInfoPos !== "top-right" && (
                  <div className={`flex flex-wrap gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest ${metaInfoPos === "center" || contentAlign === "center" ? "justify-center" : ""}`}>
                    {profile.location && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <MapPin className="w-3 h-3" style={{ color: themeColor }} />{profile.location}
                      </span>
                    )}
                    {pronouns && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <UserIcon className="w-3 h-3" style={{ color: themeColor }} />{pronouns}
                      </span>
                    )}
                    {profile.showJoinDate && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Calendar className="w-3 h-3" style={{ color: themeColor }} />{new Date(user.joinDate).toLocaleDateString()}
                      </span>
                    )}
                    {profile.showUid && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Hash className="w-3 h-3" style={{ color: themeColor }} />UID {user.id}
                      </span>
                    )}
                    {profile.showViews && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Eye className="w-3 h-3" style={{ color: themeColor }} />{user.views} views
                      </span>
                    )}
                  </div>
                )}

                {/* Tags — default position (below bio/status) */}
                {tags.length > 0 && (tagsPosition === "default") && (
                  <div className={`flex flex-wrap gap-1.5 mb-5 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    {tags.map((tag: string) => (
                      <span key={tag}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ color: themeColor, borderColor: themeColor + "44", backgroundColor: themeColor + "12" }}>
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Icon links row */}
                {iconLinks.length > 0 && (
                  <TooltipProvider>
                    <div className={`flex flex-wrap gap-2 mb-4 ${contentAlign === "center" ? "justify-center" : ""}`}>
                      {iconLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                        <LinkIcon key={link.id} link={link} themeColor={themeColor} matchToTheme={matchLinksToTheme} themeColorIcons={themeColorIcons} />
                      ))}
                    </div>
                  </TooltipProvider>
                )}

                {/* Tags — above-links position */}
                {tags.length > 0 && tagsPosition === "above-links" && (
                  <div className={`flex flex-wrap gap-1.5 mb-3 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    {tags.map((tag: string) => (
                      <span key={tag}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ color: themeColor, borderColor: themeColor + "44", backgroundColor: themeColor + "12" }}>
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card/Default links — stacked or grid inside the box */}
                {linksLayout !== "split" && (
                  linksLayout === "grid"
                    ? <div className="grid grid-cols-2 gap-2">
                        {regularLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                          link.platform === "discord-embed"
                            ? <DiscordEmbedCard key={link.id} link={link} themeColor={themeColor} />
                            : link.style === "card"
                              ? <LinkCard key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                              : <LinkDefault key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                        ))}
                      </div>
                    : <div className="space-y-2">
                        {regularLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                          link.platform === "discord-embed"
                            ? <DiscordEmbedCard key={link.id} link={link} themeColor={themeColor} />
                            : link.style === "card"
                              ? <LinkCard key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                              : <LinkDefault key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                        ))}
                      </div>
                )}

              </div>
            </TiltBox>

            {/* Split layout — links live OUTSIDE the box with same 3D tilt as the card */}
            {linksLayout === "split" && regularLinks.length > 0 && (
              <div
                className="mt-4 grid grid-cols-2 gap-2.5 px-1"
                style={{
                  transform: boxTilt ? `perspective(1000px) rotateX(${splitTilt.x}deg) rotateY(${splitTilt.y}deg)` : undefined,
                  transition: splitTilt.x === 0 && splitTilt.y === 0 ? "transform 0.5s ease" : "transform 0.08s linear",
                  willChange: "transform",
                }}
              >
                {regularLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                  link.platform === "discord-embed"
                    ? <DiscordEmbedCard key={link.id} link={link} themeColor={themeColor} />
                    : link.style === "card"
                      ? <LinkCard key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                      : <LinkDefault key={link.id} link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed watermark — bottom-right corner, only if not premium or premium with showWatermark=true */}
      {profile.showWatermark && (
        <a
          href="/"
          className="fixed bottom-4 right-4 z-50 text-[9px] font-black uppercase tracking-[0.25em] opacity-30 hover:opacity-70 transition-opacity select-none"
          style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          Hexed
        </a>
      )}
    </div>
  );
}
