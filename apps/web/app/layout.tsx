import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "./components/AppShell";
import "./globals.css";

const geistMono = localFont({ src: "./fonts/GeistMonoVF.woff", variable: "--font-geist-mono" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["600", "700"], display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-plex", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Mera Hisab \u2014 Bahi-Khata",
  description: "Private lending ledger. Every rupee given, received and charged, with a trail you can trust.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${plex.variable} ${geistMono.variable} bg-paper text-ink font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
