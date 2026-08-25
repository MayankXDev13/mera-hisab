"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

export function Topbar() {
  const [health, setHealth] = useState<"ok" | "down" | "checking">("checking");
  useEffect(() => {
    fetch(`${API_URL}/api/v1/health`, { cache: "no-store" })
      .then((r) => (r.ok ? setHealth("ok") : setHealth("down")))
      .catch(() => setHealth("down"));
  }, []);
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-paper/80 border-b border-line/60">
      <div className="flex items-center gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <div className="display font-bold text-sm tracking-tight">Mera Hisab</div>
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          <span className="text-[10px] tracking-widest uppercase text-muted">Bahi-Khata</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: health === "ok" ? "var(--teal)" : health === "down" ? "var(--vermillion)" : "var(--line)" }} />
          <span>API {health === "ok" ? "connected" : health === "down" ? "offline" : "checking"}</span>
          <span className="opacity-30">·</span>
          <span>IST ledger</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href="/login" className="text-xs text-muted hover:text-ink underline underline-offset-4">Sign out</a>
        </div>
      </div>
    </header>
  );
}
