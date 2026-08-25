"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../../lib/api";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
      if (res.ok) router.push("/dashboard");
      else { const j = await res.json().catch(() => null) as {message?:string}|null; setErr(j?.message ?? "Login failed. Check email and password."); }
    } catch { setErr("Could not reach the server."); } finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-paper">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="display font-bold text-3xl tracking-tight">Mera Hisab</div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-muted mt-1">Bahi-Khata</div>
          <div className="mx-auto mt-3 h-[2px] w-12 bg-brass rounded-full" />
          <div className="mx-auto mt-2 flex items-center justify-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-brass" /> private ledger</div>
        </div>
        <div className="rounded-2xl border border-line bg-paper shadow-sm p-6 md:p-8">
          <h1 className="font-semibold text-lg">Sign in</h1>
          <p className="text-sm text-muted mt-1">Only the ledger owner can sign in.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </Field>
            {err && <div className="rounded-lg border border-vermillion/20 bg-vermillion/5 px-3 py-2.5 text-sm text-vermillion">{err}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted text-center">Session stored in a secure cookie. Use Sign out to end it.</p>
        </div>
      </div>
    </div>
  );
}
