"use client";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  if (isLogin) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-ink text-paper px-3 py-2 rounded-md text-sm z-50">Skip to content</a>
      <div className="flex flex-1 min-h-0">
        <Nav />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main id="main" className="flex-1 max-w-[1280px] w-full mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-line/60 px-4 py-4 md:px-6 lg:px-8 text-xs text-muted">
            <div className="max-w-[1280px] mx-auto flex items-center justify-between">
              <span>Mera Hisab — private ledger. Amounts in paise, shown in rupees.</span>
              <span className="hidden sm:inline">IST · 00:05 monthly charges</span>
            </div>
          </footer>
        </div>
      </div>
      {/* mobile bottom nav is inside Nav */}
    </div>
  );
}
