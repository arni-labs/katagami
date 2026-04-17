import type { Metadata } from "next";
import { Nunito, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { HeaderNav } from "@/components/header-nav";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "katagami",
  description:
    "A versioned, agent-maintained library of complete design languages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="relative border-b border-border/70 bg-background/70 backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4">
            <Link
              href="/"
              aria-label="katagami home"
              className="group flex items-center gap-2.5 font-display"
            >
              <span className="relative block h-9 w-10">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-6 w-6 rounded-full bg-[var(--sakura)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[-6deg]"
                />
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-6 w-6 rounded-full bg-[var(--yuzu)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[6deg]"
                />
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[var(--sumire)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:translate-y-[3px]"
                />
              </span>
              <span className="text-[22px] font-semibold leading-none tracking-[-0.02em]">
                katagami
              </span>
            </Link>
            <HeaderNav />
            <div className="ml-auto hidden items-center gap-2 md:flex">
              <span className="stamp text-[var(--teal)]">Draft · v0</span>
            </div>
          </nav>
          {/* two layered washi tapes for that scrapbook feel */}
          <span
            className="washi-tape absolute -top-2 right-24 hidden rotate-[-6deg] md:block"
            style={{
              background:
                "repeating-linear-gradient(45deg, color-mix(in oklch, var(--salad) 75%, white) 0 7px, color-mix(in oklch, var(--salad) 40%, white) 7px 14px)",
            }}
          />
          <span
            className="washi-tape absolute -top-1.5 right-6 hidden rotate-[8deg] md:block"
            style={{
              width: "48px",
              background:
                "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sumire) 70%, white) 0 7px, color-mix(in oklch, var(--sumire) 30%, white) 7px 14px)",
            }}
          />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-border/70 py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground">
            <span className="font-mono">katagami</span>
            <span>agent-maintained design language library</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
