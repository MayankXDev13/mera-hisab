import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/toast";

const instrumentSansHeading = Instrument_Sans({subsets:['latin'],variable:'--font-heading'});
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });

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
  description: "Bahi-khata for modern India. Track customers, accounts, cards and ledger in one place. Every rupee in paise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, instrumentSansHeading.variable, fraunces.variable)}
    >
      <body className="min-h-full flex flex-col bg-kagaz">
        <QueryProvider>
          <AuthProvider>
            <Toaster />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
