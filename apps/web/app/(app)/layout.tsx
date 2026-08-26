import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AuthGuard } from "@/components/app/auth-guard";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center gap-3 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 px-3 md:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live ledger</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col p-3 md:p-6 lg:p-8 gap-6 max-w-[1440px] w-full mx-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
