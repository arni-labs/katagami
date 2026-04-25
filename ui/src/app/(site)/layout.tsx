import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="relative border-b border-border/70 bg-background/70 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:gap-6 md:gap-8">
          <Link
            href="/"
            aria-label="katagami home"
            className="group flex shrink-0 items-center gap-2 font-display sm:gap-2.5"
          >
            <span className="relative block h-8 w-9 sm:h-9 sm:w-10">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-5 w-5 rounded-full bg-[var(--sakura)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[-6deg] dark:mix-blend-screen sm:h-6 sm:w-6"
              />
              <span
                aria-hidden
                className="absolute right-0 top-0 h-5 w-5 rounded-full bg-[var(--yuzu)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[6deg] dark:mix-blend-screen sm:h-6 sm:w-6"
              />
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[var(--sumire)] mix-blend-multiply transition-transform duration-300 ease-out group-hover:translate-y-[3px] dark:mix-blend-screen sm:h-6 sm:w-6"
              />
            </span>
            <span className="text-[18px] font-semibold leading-none tracking-[-0.02em] sm:text-[22px]">
              katagami
            </span>
          </Link>
          <HeaderNav />
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <span className="stamp text-[var(--teal)]">v0.1.0</span>
          </div>
          <div className="ml-auto flex items-center md:hidden">
            <ThemeToggle />
          </div>
        </nav>
        <span
          className="washi-tape absolute -top-2 right-24 hidden rotate-[-6deg] md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, color-mix(in oklch, var(--salad) 75%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--salad) 40%, var(--paper-tape-mix)) 7px 14px)",
          }}
        />
        <span
          className="washi-tape absolute -top-1.5 right-6 hidden rotate-[8deg] md:block"
          style={{
            width: "48px",
            background:
              "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sumire) 70%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--sumire) 30%, var(--paper-tape-mix)) 7px 14px)",
          }}
        />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="relative mt-24 border-t border-border/70">
        <span
          aria-hidden
          className="washi-tape absolute -top-2 left-[12%] hidden rotate-[-5deg] md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, color-mix(in oklch, var(--matcha) 75%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--matcha) 40%, var(--paper-tape-mix)) 7px 14px)",
          }}
        />
        <span
          aria-hidden
          className="washi-tape absolute -top-1.5 right-[14%] hidden rotate-[7deg] md:block"
          style={{
            width: "52px",
            background:
              "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sakura) 75%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--sakura) 35%, var(--paper-tape-mix)) 7px 14px)",
          }}
        />

        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-8 pt-10 sm:pt-12">
          <div className="flex flex-wrap items-start justify-between gap-6 sm:gap-10">
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-5xl font-bold leading-none tracking-[-0.04em] sm:text-[56px]">
                  型紙
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-display text-lg font-semibold">
                    katagami
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    no.001
                  </span>
                </div>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                A SPEC.md-compatible library of design languages — versioned,
                forked, and curated for agents.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="stamp text-[var(--sumire)]">say hi</span>
              <div className="flex items-center gap-2">
                <SocialSticker
                  href="https://x.com/arni0x9053"
                  label="X (@arni0x9053)"
                  accent="var(--yuzu)"
                >
                  <XIcon />
                </SocialSticker>
                <SocialSticker
                  href="https://github.com/rita-aga"
                  label="GitHub (@rita-aga)"
                  accent="var(--matcha)"
                >
                  <GithubIcon />
                </SocialSticker>
              </div>
            </div>
          </div>

          <div className="sticker-perforation" />

          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
            <span>
              built by{" "}
              <a
                href="https://x.com/arni0x9053"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-block text-foreground transition-transform hover:-translate-y-[1px]"
              >
                <span className="relative z-10">@arni0x9053</span>
                <span
                  aria-hidden
                  className="absolute inset-x-[-2px] bottom-0 z-0 h-[5px] rounded-[1px] bg-[var(--yuzu)] opacity-80"
                  style={{ transform: "rotate(-1deg)" }}
                />
              </a>{" "}
              · 2026
            </span>
            <span>型紙 · v0.1.0</span>
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}

function SocialSticker({
  href,
  label,
  accent,
  children,
}: {
  href: string;
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="group relative inline-flex h-10 w-10 items-center justify-center border border-border bg-card/70 text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-4deg] hover:text-foreground"
      style={{
        ["--accent" as string]: accent,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-40"
      />
      <span className="relative">{children}</span>
    </a>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[15px] w-[15px]"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[17px] w-[17px]"
      fill="currentColor"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
