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
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/lib/mutations/auth";
import { useRouter } from "next/navigation";
import {
  RiDashboardLine,
  RiGroupLine,
  RiBankCardLine,
  RiWalletLine,
  RiExchangeLine,
  RiLogoutBoxLine,
  RiBookOpenLine,
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

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <RiBookOpenLine className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[15px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              mera hisab
            </span>
            <span className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground -mt-0.5">Bahi Khata</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Khata</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.title} render={<Link href={item.url} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 space-y-2">
          <div className="text-xs">
            <div className="font-medium truncate">{user?.name ?? user?.email ?? "—"}</div>
            <div className="text-muted-foreground truncate text-[11px]">{user?.email ?? ""}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await logout.mutateAsync();
              router.replace("/login");
            }}
          >
            <RiLogoutBoxLine /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
