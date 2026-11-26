import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import "./globals.css";

// The shell reads `?category=` via useSearchParams, so routes must be rendered
// per request instead of prerendered as static HTML.
export const dynamic = "force-dynamic"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Marketplace",
  description: "A Facebook Marketplace-style public board.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
