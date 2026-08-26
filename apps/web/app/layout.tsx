import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mera Hisab — Khata. Hisab. Clear.",
  description: "Track customers, accounts, cards and ledger in one place. Every rupee in paise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Toaster />
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("mera-hisab-theme");var d=s==="dark"||(!s&&matchMedia("(prefers-color-scheme:dark)").matches)||s==="system"&&matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.classList.toggle("dark",!!d);document.documentElement.style.colorScheme=d?"dark":"light"}catch{}})()`,
          }}
        />
      </body>
    </html>
  );
}
