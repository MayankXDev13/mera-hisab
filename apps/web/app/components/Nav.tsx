"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon },
  { href: "/cards", label: "Cards", icon: CardsIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { href: "/charges", label: "Charges", icon: ChargesIcon },
  { href: "/audit", label: "Audit log", icon: AuditIcon },
  { href: "/exports", label: "Exports", icon: ExportsIcon },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop spine */}
      <aside className="hidden md:flex flex-col w-[220px] lg:w-[240px] shrink-0 border-r border-line bg-paper sticky top-0 h-screen">
        {/* spine accent */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#8B1E1E] hidden lg:block" aria-hidden />
        <div className="px-5 pt-6 pb-4 border-b border-line/60 lg:pl-7">
          <Link href="/" className="block">
            <div className="display font-bold text-[17px] leading-none tracking-tight text-ink">
              Mera Hisab
            </div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-muted mt-1">Bahi-Khata</div>
            <div className="mt-2 h-[2px] w-10 bg-brass rounded-full" />
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brass shadow-[0_0_0_2px_color-mix(in_srgb,var(--brass)_25%,transparent)]" />
              <span className="text-[10px] text-muted">ledger</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin lg:pl-4">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo text-white shadow-sm"
                    : "text-muted hover:text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                <span className={clsx("shrink-0", active ? "text-white" : "text-muted")}>
                  <it.icon active={active} />
                </span>
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-line/60 text-xs text-muted lg:pl-7">
          <div className="h-px bg-line mb-3" />
          <p>One lender. One book.</p>
          <p className="mt-1 opacity-70">Amounts stored as paise.</p>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur border-t border-line flex items-center justify-around px-1 py-1 safe-bottom">
        {items.slice(0,5).map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={clsx("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium", active ? "text-indigo" : "text-muted")}>
              <it.icon active={active} />
              <span>{it.label}</span>
            </Link>
          );
        })}
        <Link href="/audit" className={clsx("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px]", pathname.startsWith("/audit") ? "text-indigo" : "text-muted")}>
          <AuditIcon active={pathname.startsWith("/audit")} />
          <span>Audit</span>
        </Link>
      </nav>
    </>
  );
}

function DashboardIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
);}
function AccountsIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>
);}
function CardsIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h4"/></svg>
);}
function CustomersIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><circle cx="9" cy="8" r="3.5"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 11l2 2 4-4"/></svg>
);}
function TransactionsIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h6"/><path d="M16 16l3 3-3 3"/></svg>
);}
function ChargesIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h5"/></svg>
);}
function AuditIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><path d="M12 8v5l3 2"/><circle cx="12" cy="12" r="8"/><path d="M9 3h6"/></svg>
);}
function ExportsIcon({ active }: { active?: boolean }) { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6}><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/></svg>
);}
