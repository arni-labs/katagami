import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  CommandPalette,
  CommandPaletteTrigger,
  type PaletteIndexItem,
} from "@/components/command-palette";
import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  paletteCore,
  parseJson,
} from "@/lib/odata";

/** The signature trio, in registration-bar order. */
const REGISTRATION_INKS = [
  "var(--sakura)",
  "var(--yuzu)",
  "var(--ramune)",
];

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

async function buildSearchIndex(): Promise<PaletteIndexItem[]> {
  const items: PaletteIndexItem[] = [];

  try {
    // Search only surfaces the public catalog — Published only (palettes and
    // art styles are already Published-only via their default filter).
    // Full canonical read (no $select): Temper's projected $select read path
    // silently omits some published languages, which would hide them from search.
    const languages = await listDesignLanguages("Status eq 'Published'");
    for (const lang of languages) {
      if (!lang.fields.name) continue;
      const colors = parseJson<TokensLite>(lang.fields.tokens)?.colors ?? {};
      const swatch = [colors.primary, colors.secondary, colors.accent].filter(
        (c): c is string => Boolean(c),
      );
      items.push({
        id: lang.entity_id,
        kind: "language",
        name: lang.fields.name,
        href: `/language/${lang.entity_id}`,
        tags: parseJson<string[]>(lang.fields.tags) ?? undefined,
        swatch,
      });
    }
  } catch {
    // search degrades to whatever lanes loaded
  }

  try {
    for (const palette of await listPaletteSystems()) {
      if (!palette.fields.name) continue;
      const core = paletteCore(palette.fields);
      items.push({
        id: palette.entity_id,
        kind: "palette",
        name: palette.fields.name,
        href: `/palettes/${palette.entity_id}`,
        tags: parseJson<string[]>(palette.fields.tags) ?? undefined,
        swatch: core.signature.slice(0, 4).map((s) => s.hex),
      });
    }
  } catch {
    // ignore
  }

  try {
    for (const style of await listArtStyles()) {
      if (!style.fields.name) continue;
      items.push({
        id: style.entity_id,
        kind: "art-style",
        name: style.fields.name,
        href: `/art-styles/${style.entity_id}`,
        tags: parseJson<string[]>(style.fields.tags) ?? undefined,
      });
    }
  } catch {
    // ignore
  }

  for (const page of [
    { name: "Gallery", href: "/" },
    { name: "Palettes", href: "/palettes" },
    { name: "Art Styles", href: "/art-styles" },
    { name: "Studio", href: "/studio" },
    { name: "Taxonomy", href: "/taxonomy" },
    { name: "Lineage", href: "/lineage" },
    { name: "Compare", href: "/compare" },
  ]) {
    items.push({
      id: page.href,
      kind: "page",
      name: page.name,
      href: page.href,
    });
  }

  return items;
}

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchIndex = await buildSearchIndex();

  return (
    <div className="flex min-h-full w-full max-w-full flex-col overflow-x-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="relative max-w-full overflow-x-clip bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:gap-6 md:gap-8">
          <Link
            href="/"
            aria-label="katagami home"
            className="group flex shrink-0 items-center gap-2 font-display sm:gap-2.5"
          >
            {/* Three overprinting ink dots — the trademark, now blended
                with the drum (multiply by day, screen by night). */}
            <span className="relative block h-8 w-9 sm:h-9 sm:w-10">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-5 w-5 rounded-full bg-[var(--sakura)] transition-transform duration-300 ease-out group-hover:-translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[-6deg] sm:h-6 sm:w-6"
                style={{ mixBlendMode: "var(--ink-blend)" as never }}
              />
              <span
                aria-hidden
                className="absolute right-0 top-0 h-5 w-5 rounded-full bg-[var(--yuzu)] transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[1px] group-hover:rotate-[6deg] sm:h-6 sm:w-6"
                style={{ mixBlendMode: "var(--ink-blend)" as never }}
              />
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[var(--ramune)] transition-transform duration-300 ease-out group-hover:translate-y-[3px] sm:h-6 sm:w-6"
                style={{ mixBlendMode: "var(--ink-blend)" as never }}
              />
            </span>
            <span className="text-[18px] font-semibold leading-none tracking-[-0.02em] sm:text-[22px]">
              katagami
            </span>
          </Link>
          <HeaderNav />
          <div className="ml-auto hidden items-center gap-2.5 md:flex">
            <CommandPaletteTrigger />
            <ThemeToggle />
          </div>
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <CommandPaletteTrigger />
            <ThemeToggle />
          </div>
        </nav>
        {/* Halftone rule instead of a border — the header's bottom edge
            screens out like a printed gradient. */}
        <div className="sticker-perforation mx-auto max-w-7xl px-4" />
      </header>

      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>

      <footer className="relative mt-24 max-w-full overflow-x-clip">
        <div className="sticker-perforation mx-auto max-w-7xl px-4" />
        <span
          aria-hidden
          className="washi-tape -top-1.5 left-[12%] hidden md:block"
          style={{ ["--strip-ink" as string]: "var(--ramune)", position: "absolute" }}
        />
        <span
          aria-hidden
          className="washi-tape -top-1 right-[14%] hidden md:block"
          style={{
            ["--strip-ink" as string]: "var(--sakura)",
            position: "absolute",
            width: "52px",
          }}
        />

        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-8 pt-10 sm:pt-12">
          <div className="flex flex-wrap items-start justify-between gap-6 sm:gap-10">
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span
                  className="riso-double font-display text-5xl font-bold leading-none tracking-[-0.04em] sm:text-[56px]"
                  data-text="型紙"
                  style={{ ["--ink" as string]: "var(--sakura)" }}
                >
                  型紙
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-display text-lg font-semibold">
                    katagami
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    no.002
                  </span>
                </div>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                A DESIGN.md-compatible library of design languages — versioned,
                forked, and curated for agents.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="stamp text-[var(--sakura)]">say hi</span>
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
                  accent="var(--ramune)"
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
                  className="absolute inset-x-[-2px] bottom-0 z-0 h-[5px] bg-[var(--yuzu)] opacity-80"
                  style={{
                    transform: "rotate(-1deg) skewX(-6deg)",
                    mixBlendMode: "var(--ink-blend)" as never,
                  }}
                />
              </a>{" "}
              · 2026
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="flex gap-[2px]">
                {REGISTRATION_INKS.map((ink) => (
                  <span key={ink} className="h-2 w-2" style={{ background: ink }} />
                ))}
              </span>
              型紙 · v0.2.0
            </span>
          </div>
        </div>
      </footer>
      <MobileNav />
      <CommandPalette items={searchIndex} />
      <ScrollReveal />
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
      className="group relative inline-flex h-10 w-10 items-center justify-center bg-card text-foreground/80 transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-4deg] hover:text-foreground"
      style={{
        ["--accent" as string]: accent,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-40"
        style={{ mixBlendMode: "var(--ink-blend)" as never }}
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
