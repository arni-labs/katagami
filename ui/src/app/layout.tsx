import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Katagami 型紙",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <nav className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight"
            >
              型紙 <span className="text-muted-foreground font-normal text-sm">katagami</span>
            </Link>
            <div className="flex gap-4 text-sm">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/taxonomy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Taxonomy
              </Link>
              <Link
                href="/lineage"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Lineage
              </Link>
              <Link
                href="/compare"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Compare
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
