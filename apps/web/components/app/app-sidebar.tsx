"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/lib/mutations/auth";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/app/theme-toggle";
import {
  RiDashboardLine,
  RiGroupLine,
  RiBankCardLine,
  RiWalletLine,
  RiExchangeLine,
  RiLogoutBoxLine,
  RiBookOpenLine,
  RiVerifiedBadgeLine,
} from "@remixicon/react";

const items = [
  { title: "Dashboard", url: "/", icon: RiDashboardLine },
  { title: "Customers", url: "/customers", icon: RiGroupLine },
  { title: "Accounts", url: "/accounts", icon: RiWalletLine },
  { title: "Cards", url: "/cards", icon: RiBankCardLine },
  { title: "Ledger", url: "/transactions", icon: RiExchangeLine },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-[10px] bg-primary grid place-items-center text-primary-foreground shadow-sm ring-1 ring-foreground/10">
            <RiBookOpenLine className="size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[17px] font-semibold leading-none tracking-tight"
              >
                mera hisab
              </span>
              <RiVerifiedBadgeLine className="size-3.5 text-muted-foreground" />
            </div>
            <span className="text-[10px] leading-none tracking-[0.16em] uppercase text-muted-foreground font-medium">
              Bahi Khata
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Har hisaab saaf. Every rupee in paise.
        </p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70">
            Khata
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                      className={
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground data-active:bg-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      }
                    >
                      <item.icon className={isActive ? "text-primary-foreground" : ""} />
                      <span className="font-medium tracking-tight">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold ring-1 ring-foreground/10">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium leading-none">{user?.name ?? "—"}</div>
            <div className="truncate text-[11px] text-muted-foreground leading-none mt-1">{user?.email ?? ""}</div>
          </div>
          <ThemeToggle />
        </div>
        <Separator className="my-2 bg-sidebar-border" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await logout.mutateAsync();
            router.replace("/login");
          }}
        >
          <RiLogoutBoxLine /> Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
