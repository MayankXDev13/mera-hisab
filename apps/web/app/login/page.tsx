"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogin, useRegister } from "@/lib/mutations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { RiBookOpenLine, RiVerifiedBadgeLine, RiQuillPenLine, RiShieldCheckLine } from "@remixicon/react";

function extractError(e: unknown): string {
  const err = e as { response?: { data?: { error?: string; details?: unknown } }; message?: string };
  return err.response?.data?.error || err.message || "Something went wrong";
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const login = useLogin();
  const register = useRegister();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/");
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync(loginForm);
      toast.add({ title: "Welcome back", description: "Signed in successfully", type: "success" });
      router.replace("/");
    } catch (e) {
      toast.add({ title: "Sign in failed", description: extractError(e), type: "error" });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(regForm);
      toast.add({ title: "Account created", description: "You can now sign in", type: "success" });
      router.replace("/");
    } catch (e) {
      toast.add({ title: "Sign up failed", description: extractError(e), type: "error" });
    }
  };

  if (isLoading) return <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-dvh bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 size-[560px] rounded-full bg-muted blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-[520px] rounded-full bg-primary/5 blur-3xl dark:bg-white/5" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-[1120px] flex-col px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm ring-1 ring-foreground/10">
              <RiBookOpenLine className="size-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              mera hisab
            </span>
            <span className="hidden sm:inline text-[10px] tracking-[0.14em] uppercase text-muted-foreground font-medium border border-border rounded-full px-2 py-0.5">
              Bahi Khata
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8 md:py-10">
          <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.92fr] lg:gap-8 items-stretch">
            {/* Brand folio */}
            <div className="relative overflow-hidden rounded-[24px] border bg-card p-6 md:p-8 shadow-sm flex flex-col">
              <div className="absolute right-0 top-0 size-[280px] opacity-[0.06] dark:opacity-[0.08]">
                <div className="absolute inset-0 rounded-full border-[1.5px] border-primary" />
                <div className="absolute inset-3 rounded-full border border-dashed border-primary" />
                <div className="absolute inset-8 rounded-full border border-primary/50" />
              </div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-[11px] font-medium tracking-wide">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Khata. Hisab. Clear.
                </div>
                <h1
                  className="mt-5 text-[32px] md:text-[40px] font-semibold leading-[0.95] tracking-tight"
                >
                  Your bahi,
                  <br />
                  <span className="text-muted-foreground font-normal">without the bahi.</span>
                </h1>
                <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                  For dukaan, studio, and side-hustle. Record denā–lenā, track every source, and know who owes what — to the paise.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { k: "Paise ledger", v: "No rounding", icon: RiQuillPenLine },
                  { k: "Single writer", v: "Ledger only", icon: RiVerifiedBadgeLine },
                  { k: "Locked & local", v: "Your khata", icon: RiShieldCheckLine },
                ].map((f) => (
                  <div key={f.k} className="rounded-2xl border bg-background p-3">
                    <f.icon className="size-4 text-primary" />
                    <div className="mt-2 text-xs font-medium leading-none">{f.k}</div>
                    <div className="text-[11px] text-muted-foreground">{f.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <div className="rounded-2xl bg-primary text-primary-foreground p-4 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 size-24 rounded-full border border-white/20" />
                  <div className="absolute -right-2 -top-2 size-12 rounded-full border border-white/15" />
                  <div className="relative">
                    <div className="text-[10px] tracking-[0.16em] uppercase opacity-80">The promise</div>
                    <div className="mt-1 text-sm font-medium leading-snug">
                      Debit is money you gave. Credit is money you got back. Everything else is just hisab.
                    </div>
                    <div className="h-px bg-primary-foreground/20 mt-3" />
                    <div className="mt-2 text-xs opacity-70">100 paise = ₹1 • Stored as integer, always.</div>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">Trusted like a lal-bahi on the first day of Diwali.</p>
              </div>
            </div>

            {/* Auth card */}
            <div className="flex flex-col justify-center">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full p-1 h-10">
                  <TabsTrigger value="login" className="rounded-full">Sign in</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-full">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[18px]">Welcome back</CardTitle>
                      <CardDescription>Sign in to open your khata.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input id="login-email" type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input id="login-password" type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                        </div>
                        <Button type="submit" className="w-full rounded-full h-10" disabled={login.isPending}>
                          {login.isPending ? "Signing in…" : "Sign in"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[18px]">Create your khata</CardTitle>
                      <CardDescription>First account becomes the owner.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reg-name">Name</Label>
                          <Input id="reg-name" required value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="Ramesh" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-email">Email</Label>
                          <Input id="reg-email" type="email" required value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-password">Password</Label>
                          <Input id="reg-password" type="password" required minLength={8} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} placeholder="At least 8 characters" />
                        </div>
                        <Button type="submit" className="w-full rounded-full h-10" disabled={register.isPending}>
                          {register.isPending ? "Creating…" : "Create account"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <p className="mt-4 text-center text-xs text-muted-foreground">By continuing you agree to keep your own books straight.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] tracking-wide text-muted-foreground">Crafted for the counter, not the boardroom.</p>
      </div>
    </div>
  );
}
