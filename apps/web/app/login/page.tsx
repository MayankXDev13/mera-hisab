"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogin, useRegister } from "@/lib/mutations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { ThemeToggle } from "@/components/app/theme-toggle";

function extractError(e: unknown): string {
  const err = e as {
    response?: {
      data?: {
        error?: string;
        details?: unknown;
      };
    };
    message?: string;
  };

  return err.response?.data?.error || err.message || "Something went wrong";
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const login = useLogin();
  const register = useRegister();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [regForm, setRegForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login.mutateAsync(loginForm);
      toast.add({
        title: "Welcome back",
        description: "Signed in successfully",
        type: "success",
      });
      router.replace("/");
    } catch (e) {
      toast.add({
        title: "Sign in failed",
        description: extractError(e),
        type: "error",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await register.mutateAsync(regForm);
      toast.add({
        title: "Account created",
        description: "You can now sign in",
        type: "success",
      });
      router.replace("/");
    } catch (e) {
      toast.add({
        title: "Sign up failed",
        description: extractError(e),
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 size-140 rounded-full bg-muted blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-130 rounded-full bg-primary/5 blur-3xl dark:bg-white/5" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-280 flex-col px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm ring-1 ring-foreground/10">
              <span className="text-sm font-semibold">M</span>
            </div>

            <span className="text-[15px] font-semibold tracking-tight">
              Mera Hisaab
            </span>

            <span className="hidden sm:inline text-[10px] tracking-[0.14em] uppercase text-muted-foreground font-medium border border-border rounded-full px-2 py-0.5">
              Bahi Khata
            </span>
          </div>

          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8 md:py-10">
          <div className="w-full max-w-md">
            <div className="flex flex-col justify-center">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full p-1 h-10">
                  <TabsTrigger value="login" className="rounded-full">
                    Sign in
                  </TabsTrigger>

                  <TabsTrigger value="register" className="rounded-full">
                    Create account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[18px]">
                        Welcome back
                      </CardTitle>

                      <CardDescription>
                        Sign in to open your khata.
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>

                          <Input
                            id="login-email"
                            type="email"
                            required
                            value={loginForm.email}
                            onChange={(e) =>
                              setLoginForm({
                                ...loginForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="you@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>

                          <Input
                            id="login-password"
                            type="password"
                            required
                            value={loginForm.password}
                            onChange={(e) =>
                              setLoginForm({
                                ...loginForm,
                                password: e.target.value,
                              })
                            }
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full rounded-full h-10"
                          disabled={login.isPending}
                        >
                          {login.isPending ? "Signing in…" : "Sign in"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[18px]">
                        Create your khata
                      </CardTitle>

                      <CardDescription>
                        First account becomes the owner.
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reg-email">Email</Label>

                          <Input
                            id="reg-email"
                            type="email"
                            required
                            value={regForm.email}
                            onChange={(e) =>
                              setRegForm({
                                ...regForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="you@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reg-password">Password</Label>

                          <Input
                            id="reg-password"
                            type="password"
                            required
                            minLength={8}
                            value={regForm.password}
                            onChange={(e) =>
                              setRegForm({
                                ...regForm,
                                password: e.target.value,
                              })
                            }
                            placeholder="At least 8 characters"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full rounded-full h-10"
                          disabled={register.isPending}
                        >
                          {register.isPending ? "Creating…" : "Create account"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
