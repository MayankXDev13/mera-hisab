"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin, useRegister } from "@/lib/mutations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { useEffect } from "react";

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
    <div className="min-h-dvh grid place-items-center bg-kagaz px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            mera hisab
          </h1>
          <p className="text-sm text-muted-foreground mt-2 tracking-wide uppercase">Khata • Hisab • Clear</p>
          <div className="mt-3 mx-auto h-px w-12 bg-border" />
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Sign in to your khata</CardTitle>
                <CardDescription>Use your email and password. Better Auth cookie session.</CardDescription>
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
                  <Button type="submit" className="w-full" disabled={login.isPending}>
                    {login.isPending ? "Signing in…" : "Sign in"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">API: {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}</p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create owner account</CardTitle>
                <CardDescription>First user becomes the khata owner.</CardDescription>
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
                    <Input id="reg-password" type="password" required minLength={8} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={register.isPending}>
                    {register.isPending ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">Every rupee is stored as integer paise. 100 paise = ₹1.</p>
      </div>
    </div>
  );
}
