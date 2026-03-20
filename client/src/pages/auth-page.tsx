import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiDiscord } from "react-icons/si";

export default function AuthPage() {
  const { login, register, isLoggingIn, isRegistering, loginError } = useAuth();
  const [location] = useLocation();
  const defaultTab = location === "/register" ? "register" : "login";
  const isBanned = loginError?.toLowerCase().includes("banned");

  const { data: discordStatus } = useQuery<{ enabled: boolean; configured: boolean }>({
    queryKey: ["/api/discord-status"],
    staleTime: 30000,
  });
  const discordEnabled = discordStatus?.enabled !== false;

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "", email: "" },
  });

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between mb-2">
          <a href="/" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back
          </a>
          <a href="/" className="text-xl font-black text-orange-500 tracking-tighter">Hexed</a>
        </div>

        {/* Discord Login Button */}
        {discordEnabled ? (
          <a
            href="/auth/discord"
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all border border-[#5865F2]/40 hover:border-[#5865F2] hover:bg-[#5865F2]/10"
            style={{ background: "rgba(88,101,242,0.08)" }}
            data-testid="button-discord-login"
          >
            <SiDiscord className="w-5 h-5 text-[#5865F2]" />
            Continue with Discord
          </a>
        ) : (
          <div
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm text-gray-600 border border-white/[0.05] cursor-not-allowed select-none"
            style={{ background: "rgba(255,255,255,0.02)" }}
            data-testid="button-discord-login-disabled"
          >
            <SiDiscord className="w-5 h-5 text-gray-700" />
            Continue with Discord
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/[0.06] text-gray-500">SOON</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#111] border border-orange-500/20">
            <TabsTrigger value="login" className="data-[state=active]:bg-orange-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest">Login</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-orange-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            {isBanned ? (
              <Card className="bg-[#0c0c0c] border-red-500/30">
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                  <div className="text-5xl">🚫</div>
                  <div>
                    <h2 className="text-xl font-black text-red-400 mb-1">You have been banned</h2>
                    <p className="text-gray-500 text-sm">Your account has been suspended. Contact support if you believe this is a mistake.</p>
                  </div>
                  <Button variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={() => window.location.href = "/"}>
                    Go Home
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#0c0c0c] border-white/[0.06]">
                <CardHeader>
                  <CardTitle className="text-orange-500 font-black">Welcome back</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit((data: any) => login(data))} className="space-y-4">
                      <FormField control={loginForm.control} name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-400 text-[11px] font-black uppercase tracking-widest">Username</FormLabel>
                            <FormControl><Input {...field} className="bg-black border-white/5 focus:border-orange-500/50" data-testid="input-username" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={loginForm.control} name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-400 text-[11px] font-black uppercase tracking-widest">Password</FormLabel>
                            <FormControl><Input type="password" {...field} className="bg-black border-white/5 focus:border-orange-500/50" data-testid="input-password" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <Button type="submit" className="w-full bg-orange-500 text-black font-black hover:bg-white hover:text-black border border-orange-500 hover:border-white transition-all" disabled={isLoggingIn} data-testid="button-login">
                        {isLoggingIn ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="register">
            <Card className="bg-[#0c0c0c] border-white/[0.06]">
              <CardHeader>
                <CardTitle className="text-orange-500 font-black">Create account</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data: any) => register(data))} className="space-y-4">
                    <FormField control={registerForm.control} name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[11px] font-black uppercase tracking-widest">Username</FormLabel>
                          <FormControl><Input {...field} className="bg-black border-white/5 focus:border-orange-500/50" data-testid="input-reg-username" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    <FormField control={registerForm.control} name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[11px] font-black uppercase tracking-widest">Email</FormLabel>
                          <FormControl><Input type="email" {...field} className="bg-black border-white/5 focus:border-orange-500/50" data-testid="input-reg-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    <FormField control={registerForm.control} name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[11px] font-black uppercase tracking-widest">Password</FormLabel>
                          <FormControl><Input type="password" {...field} className="bg-black border-white/5 focus:border-orange-500/50" data-testid="input-reg-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    <Button type="submit" className="w-full bg-orange-500 text-black font-black hover:bg-white hover:text-black border border-orange-500 hover:border-white transition-all" disabled={isRegistering} data-testid="button-register">
                      {isRegistering ? "Creating account..." : "Get Started"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-[10px] text-gray-600 font-black uppercase tracking-widest">
          <a href="/shop" className="hover:text-gray-400 transition-colors">Visit Shop</a>
        </p>
      </div>
    </div>
  );
}
