import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import Dashboard from "./pages/dashboard";
import UserDashboard from "./pages/user-dashboard";
import PublicProfile from "./pages/public-profile";
import Landing from "./pages/Landing";
import Shop from "./pages/shop";
import TOS from "./pages/tos";
import Templates from "./pages/templates";
import SecretPage from "./pages/secret";
import TeamPage from "./pages/team";
import { Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// ─── Global Fun Fact Toast ────────────────────────────────────────────────────

const FUN_FACTS = [
  "Fun fact: Hexed was created by Byte & Mr Pain — and before it was called Hexed, it was called Voidlink.",
  "Did you know? This whole platform took over 2 weeks to go from idea to live.",
  "A fun side effect of building Hexed: the founders had to wait ages to actually get the hexed.at domain.",
  "Hexed started as a small side project between two friends. Now you're using it.",
  "The name 'Voidlink' didn't stick, so here we are. Hexed just felt right.",
];

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    ctx.close();
  } catch (_) {}
}

function FunFactToast() {
  const [visible, setVisible] = useState(false);
  const [factIdx, setFactIdx] = useState(0);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let cycleTimer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => {
      showTimer = setTimeout(() => {
        setFactIdx(Math.floor(Math.random() * FUN_FACTS.length));
        setVisible(true);
        playDing();
        hideTimer = setTimeout(() => {
          setVisible(false);
          const next = 35000 + Math.random() * 30000;
          cycleTimer = setTimeout(() => schedule(0), next);
        }, 7000);
      }, delay);
    };

    schedule(12000 + Math.random() * 10000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(cycleTimer); };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-4 left-1/2 z-[9999] -translate-x-1/2 max-w-xs w-[90vw] pointer-events-auto"
        >
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border text-[11px] leading-relaxed shadow-2xl"
            style={{ background: "rgba(8,8,8,0.94)", borderColor: "rgba(249,115,22,0.28)", backdropFilter: "blur(20px)", color: "#d4d4d4" }}
          >
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <span>{FUN_FACTS[factIdx]}</span>
            <button
              onClick={() => setVisible(false)}
              className="ml-auto shrink-0 text-gray-600 hover:text-gray-400 transition-colors text-sm leading-none"
            >✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] text-orange-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <Landing />
      </Route>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>
      <Route path="/register">
        {user ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>
      <Route path="/dashboard">
        {!user ? <Redirect to="/login" /> : <Dashboard />}
      </Route>
      <Route path="/profile">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="profile" />}
      </Route>
      <Route path="/options">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="options" />}
      </Route>
      <Route path="/miscellaneous">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="miscellaneous" />}
      </Route>
      <Route path="/extras">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="extras" />}
      </Route>
      <Route path="/dashboard/tags">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="extras" extrasSection="tags" />}
      </Route>
      <Route path="/dashboard/visual">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="extras" extrasSection="visual" />}
      </Route>
      <Route path="/dashboard/tracks">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="extras" extrasSection="tracks" />}
      </Route>
      <Route path="/dashboard/alias">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="extras" extrasSection="alias" />}
      </Route>
      <Route path="/dashboard/user/:username">
        {!user ? <Redirect to="/login" /> : <UserDashboard />}
      </Route>
      <Route path="/markdowns">
        {!user ? <Redirect to="/login" /> : <Dashboard activeTab="markdowns" />}
      </Route>
      <Route path="/shop/:productId">
        <Shop />
      </Route>
      <Route path="/shop">
        <Shop />
      </Route>
      <Route path="/tos">
        <TOS />
      </Route>
      <Route path="/team">
        <TeamPage />
      </Route>
      <Route path="/templates">
        <Templates />
      </Route>
      <Route path="/hexed/secret">
        {!user ? <Redirect to="/login" /> : <SecretPage />}
      </Route>
      <Route path="/:username" component={PublicProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <FunFactToast />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
