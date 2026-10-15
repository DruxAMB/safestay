import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ShieldCheck } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SafeStay — deposit history landlords can't rewrite",
  description:
    "Check any landlord's on-chain deposit record before you pay. Signed, queryable, and impossible to edit — Arkiv entities on Tiramisu.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "SafeStay — deposit history landlords can't rewrite",
    description:
      "Check any landlord's on-chain deposit record before you pay. Signed, queryable, impossible to edit — Arkiv entities on Tiramisu.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-card/80 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-4 sm:px-6" aria-label="Main">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={20} className="text-primary" aria-hidden />
              SafeStay
            </Link>
            <div className="ml-auto flex items-center gap-0.5 text-sm">
              <Link href="/feed" className="min-h-11 inline-flex items-center rounded-md px-2 sm:px-3 [@media(hover:hover)]:hover:bg-muted">
                Feed
              </Link>
              <Link href="/record" className="min-h-11 inline-flex items-center rounded-md px-2 sm:px-3 [@media(hover:hover)]:hover:bg-muted">
                Record
              </Link>
              <Link href="/about" className="min-h-11 inline-flex items-center rounded-md px-2 sm:px-3 [@media(hover:hover)]:hover:bg-muted">
                About
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-muted-foreground sm:px-6">
            <span>Built on Arkiv · Tiramisu testnet · Next.js</span>
            <a href="https://tiramisu.explorer.arkiv.network" target="_blank" rel="noopener noreferrer"
               className="text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
              Tiramisu explorer
            </a>
            <span className="ml-auto">Synthetic demo data — no real tenants or landlords</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
