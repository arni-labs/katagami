import { Suspense } from "react";
import {
  countDesignLanguages,
  listFeaturedDesignLanguages,
  pageDesignLanguages,
} from "@/lib/odata";
import { InfiniteLanguages } from "@/components/infinite-galleries";
import { RisoHeroPress } from "@/components/riso-hero";
import { RisoInkField } from "@/components/riso-ink-field";
import { isOwner } from "@/lib/owner";

const HOW_STEPS = [
  {
    n: "01",
    ink: "sakura",
    title: "Browse",
    body: "Filter by ink, vibe, or movement — or let the shuffle pick a language you didn't know you wanted.",
  },
  {
    n: "02",
    ink: "ramune",
    title: "Open a language",
    body: "Every language ships its philosophy, tokens, rules, and working landing + dashboard embodiments.",
  },
  {
    n: "03",
    ink: "yuzu",
    title: "Hand it to your agent",
    body: "Copy DESIGN.md (or the shadcn/ui kit) and your agent stays on-style, session after session.",
  },
] as const;

/** The three-step explainer, folded into one quiet index tab that unfolds
 *  to the full passes. Native <details> — works without JS, calm by default. */
function HowItWorksFold() {
  return (
    <details className="group/how">
      {/* gentle katagami dashes — the hero's underline */}
      <span aria-hidden className="sticker-perforation block" />
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
          how it works
        </span>
        <span className="hidden min-w-0 flex-wrap items-center gap-x-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex">
          {HOW_STEPS.map((s, i) => (
            <span key={s.n} className="inline-flex items-center gap-1.5">
              <span
                className="font-bold"
                style={{
                  color: `color-mix(in oklch, var(--${s.ink}) 72%, var(--foreground))`,
                }}
              >
                {s.n}
              </span>
              {s.title}
              {i < HOW_STEPS.length - 1 ? (
                <span aria-hidden className="text-muted-foreground/35">
                  ·
                </span>
              ) : null}
            </span>
          ))}
        </span>
        <span
          aria-hidden
          className="ml-auto text-muted-foreground transition-transform duration-200 group-open/how:rotate-180"
        >
          <svg
            viewBox="0 0 10 6"
            className="h-[6px] w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
        </span>
      </summary>
      <div className="mt-2 grid gap-6 pb-5 sm:grid-cols-3">
        {HOW_STEPS.map((step) => (
          <div key={step.n} className="relative pl-12">
            <span
              aria-hidden
              className="absolute left-0 top-0 font-display text-[34px] font-bold leading-none"
              style={{
                color: `color-mix(in oklch, var(--${step.ink}) 70%, var(--foreground))`,
              }}
            >
              {step.n}
            </span>
            <h3 className="font-display text-[17px] font-bold leading-tight tracking-[-0.015em]">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

async function GalleryGrid({ demo }: { demo?: boolean }) {
  const canDelete = demo ? false : await isOwner();
  let first: Awaited<ReturnType<typeof pageDesignLanguages>>;
  let featured: Awaited<ReturnType<typeof listFeaturedDesignLanguages>>;
  try {
    // Curator's picks lead the gallery; the rest paginate in.
    [first, featured] = await Promise.all([
      pageDesignLanguages({ limit: 48 }),
      listFeaturedDesignLanguages(),
    ]);
  } catch {
    return (
      <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        Could not load design languages.
        <div className="mt-1 font-mono text-[11px]">check the Temper server</div>
      </div>
    );
  }
  if (first.items.length === 0 && featured.length === 0) {
    return (
      <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        No design languages found.
        <div className="mt-1 font-mono text-[11px]">run the bootstrap pipeline</div>
      </div>
    );
  }
  return (
    <InfiniteLanguages
      featured={featured}
      initialItems={first.items}
      initialCursor={first.nextCursor}
      canDelete={canDelete}
    />
  );
}


export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    taxonomy?: string;
    q?: string;
    tag?: string;
    hue?: string;
    src?: string;
    demo?: string;
  }>;
}) {
  const sp = await searchParams;
  const demo = sp.demo !== undefined && sp.demo !== "0" && sp.demo !== "false";
  // The published-language count uses OData $count (no rows), so the Gallery
  // header's figure renders immediately without waiting on the streamed gallery.
  const languageCount = await countDesignLanguages("Status eq 'Published'");

  return (
    <div className="w-full overflow-x-hidden">
      {/* ── Hero: full-bleed print bed — the ink connects to the header
          and both screen edges, no padding around it ─────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="hero-art pointer-events-none">
          <RisoInkField opacity={0.9} />
          <RisoHeroPress className="opacity-95" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:pb-14 sm:pt-12">
          <div className="relative max-w-3xl">
          <div
            className="riso-reveal mb-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
            style={{ ["--reveal-i" as string]: 0 }}
          >
            <span aria-hidden className="flex gap-[2px]">
              {["var(--sakura)", "var(--yuzu)", "var(--ramune)"].map((ink) => (
                <span key={ink} className="h-2.5 w-2.5" style={{ background: ink }} />
              ))}
            </span>
            <span>agent-maintained · ideas by</span>
            <a
              href="https://x.com/arni0x9053"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center text-foreground transition-transform duration-200 hover:-translate-y-[1px]"
            >
              <span className="relative z-10">@arni0x9053</span>
              <span
                aria-hidden
                className="absolute inset-x-[-3px] bottom-[1px] z-0 h-[6px] rounded-[1px] bg-[var(--yuzu)] opacity-85"
                style={{
                  transform: "rotate(-0.8deg)",
                  mixBlendMode: "var(--ink-blend)" as never,
                }}
              />
            </a>
          </div>

          <h1
            className="riso-reveal font-display text-[44px] font-bold leading-[0.98] tracking-[-0.03em] sm:text-[64px] lg:text-[76px]"
            style={{ ["--reveal-i" as string]: 1 }}
          >
            Design{" "}
            <span className="marker">
              <span
                aria-hidden
                className="marker-fill"
                style={{ background: "var(--sakura)" }}
              />
              <span className="marker-text">languages</span>
            </span>
            .
          </h1>

          <p
            className="riso-reveal mt-6 font-display text-[22px] font-bold leading-snug tracking-[-0.015em] text-foreground sm:text-[26px]"
            style={{ ["--reveal-i" as string]: 2 }}
          >
            Give your agent{" "}
            <span className="marker">
              <span
                aria-hidden
                className="marker-fill"
                style={{ background: "var(--yuzu)" }}
              />
              <span className="marker-text">taste</span>
            </span>
            .
          </p>
          <p
            className="riso-reveal mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]"
            style={{ ["--reveal-i" as string]: 2 }}
          >
            a vocabulary of design movements you can hand off as{" "}
            <span className="font-mono text-[0.92em] font-semibold text-foreground">
              DESIGN.md
            </span>
            .
          </p>

          <div
            className="riso-reveal mt-8 flex flex-wrap items-center gap-3"
            style={{ ["--reveal-i" as string]: 3 }}
          >
            <a
              href="#gallery"
              className="group relative inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg]"
            >
              Browse gallery
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
          </div>
        </div>
      </section>

      {/* ── How it works — folded as a clever dashed underline beneath the hero ── */}
      <div className="mx-auto w-full max-w-7xl px-4">
        <HowItWorksFold />
      </div>

      {/* ── Everything below the hero stays in the content column ── */}
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-16 pt-8 sm:space-y-16">
      {/* ── Gallery ──────────────────────────────────────────────── */}
      <section id="gallery" className="scroll-mt-20 space-y-4">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-[26px] font-bold leading-none tracking-[-0.02em]">
              Gallery
            </h2>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="font-bold tabular-nums text-foreground">
                {languageCount}
              </span>{" "}
              languages
            </span>
          </div>
          <span className="stamp text-[var(--ramune)]">details inside</span>
        </div>

        <Suspense
          fallback={
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse bg-muted/50"
                />
              ))}
            </div>
          }
        >
          <GalleryGrid demo={demo} />
        </Suspense>
      </section>
      </div>
    </div>
  );
}
