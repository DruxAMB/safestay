import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Inter, Geist_Mono } from "next/font/google";
import { SafeStayMark } from "@/components/SafeStayMark";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/Toaster";
import { LinkHint } from "@/components/LinkHint";
import { ConnectWallet } from "@/components/ConnectWallet";
import { NavLoader } from "@/components/NavLoader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>
        <WalletProvider>
        <header className="border-b border-border bg-background bg-stipple">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6" aria-label="Main">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <SafeStayMark size={24} />
              SafeStay
              <LinkHint />
            </Link>
            <div className="ml-auto flex items-center gap-0.5 text-sm">
              <Link href="/feed" className="min-h-11 inline-flex items-center rounded-md px-2 text-muted-foreground transition-colors sm:px-3 [@media(hover:hover)]:hover:bg-foreground/5 [@media(hover:hover)]:hover:text-foreground">
                Feed
                <LinkHint />
              </Link>
              <Link href="/record" className="min-h-11 inline-flex items-center rounded-md px-2 text-muted-foreground transition-colors sm:px-3 [@media(hover:hover)]:hover:bg-foreground/5 [@media(hover:hover)]:hover:text-foreground">
                Record
                <LinkHint />
              </Link>
              <Link href="/about" className="min-h-11 inline-flex items-center rounded-md px-2 text-muted-foreground transition-colors sm:px-3 [@media(hover:hover)]:hover:bg-foreground/5 [@media(hover:hover)]:hover:text-foreground">
                About
                <LinkHint />
              </Link>
              <ConnectWallet />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <Suspense><NavLoader /></Suspense>
        <footer className="relative z-10 border-t border-border-inverse bg-surface-inverse">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-text-inverse-muted sm:px-6">
            <span>
              Built on Arkiv by{" "}
              <a href="https://druxamb.dev" target="_blank" rel="noopener noreferrer"
                 className="text-text-inverse underline underline-offset-2">
                DruxAMB
              </a>{" "}
              · Tiramisu testnet · Next.js
            </span>
            <a href="https://tiramisu.explorer.arkiv.network" target="_blank" rel="noopener noreferrer"
               className="text-text-inverse underline underline-offset-2">
              Tiramisu explorer
            </a>
            <span className="ml-auto">
              Synthetic demo data — tenants or landlords can{" "}
              <Link
                href="/record"
                className="text-text-inverse underline underline-offset-2"
              >
                register at /record<LinkHint />
              </Link>
            </span>
          </div>
        </footer>
        </WalletProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
