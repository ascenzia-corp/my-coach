import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "MyCoach",
  description: "Coach personnel keto / IF / musculation — Laurent",
  applicationName: "MyCoach",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyCoach",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className="min-h-dvh bg-[var(--hf-bg)] text-[var(--hf-label)]">
        <main className="safe-top mx-auto max-w-md pb-[110px]">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
