import { Suspense } from "react";
import Link from "next/link";
import {
  DESIGN_LANGUAGE_GALLERY_FIELDS,
  listDesignLanguages,
  listTaxonomies,
  parseJson,
} from "@/lib/odata";
import { LanguageGallery, dominantHueBucket } from "@/components/language-gallery";
import { RisoHeroPress } from "@/components/riso-hero";
import { SurpriseChip } from "@/components/hero-actions";
import { TasteDeck, type DeckEntry } from "@/components/taste-deck";
import { isOwner } from "@/lib/owner";

async function GalleryGrid({
  status,
  taxonomy,
  search,
  tag,
  hue,
  source,
  demo,
  taxonomies,
}: {
  status?: string;
  taxonomy?: string;
  search?: string;
  tag?: string;
  hue?: string;
  source?: string;
  demo?: boolean;
  taxonomies: { entity_id: string; fields: { name?: string } }[];
}) {
  const canDelete = demo ? false : await isOwner();

  let languages: Awaited<ReturnType<typeof listDesignLanguages>>;
  try {
    languages = await listDesignLanguages(
      undefined,
      undefined,
      DESIGN_LANGUAGE_GALLERY_FIELDS,
    );
  } catch {
    return (
      <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        Could not load design languages.
        <div className="mt-1 font-mono text-[11px]">check the Temper server</div>
      </div>
    );
  }

  // Filter out empty drafts (no name set = incomplete/abandoned)
  languages = languages.filter((l) => l.fields.name);

  if (languages.length === 0) {
    return (
      <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        No design languages found.
        <div className="mt-1 font-mono text-[11px]">
          run the bootstrap pipeline
        </div>
      </div>
    );
  }

  // Featured languages lead the main catalog. After that, published languages
  // read newest-to-oldest by publish/create time; UpdatedAt is intentionally
  // last so owner toggles don't reshuffle the public catalog. The backend model
  // defines timestamp fields, but older production rows often omit them;
  // UUID-v7-ish Katagami entity ids carry a creation timestamp, so use that as
  // fallback. OData queries use PascalCase (Featured / DisplayOrder), but the
  // JSON response might put values in any of several shapes — check them all.
  function isFeatured(l: (typeof languages)[number]): boolean {
    const bag = l as unknown as Record<string, unknown>;
    const candidates = [
      bag.booleans,
      bag.fields,
      bag.counters,
      bag, // top-level, in case it's flattened
    ];
    for (const c of candidates) {
      if (!c || typeof c !== "object") continue;
      const rec = c as Record<string, unknown>;
      const v = rec.featured ?? rec.Featured ?? rec.isFeatured;
      if (v === true || v === 1) return true;
      if (typeof v === "string" && v.toLowerCase() === "true") return true;
    }
    return false;
  }
  function displayOrder(l: (typeof languages)[number]): number {
    const bag = l as unknown as Record<string, unknown>;
    const candidates = [bag.counters, bag.fields, bag];
    for (const c of candidates) {
      if (!c || typeof c !== "object") continue;
      const rec = c as Record<string, unknown>;
      const v = rec.display_order ?? rec.displayOrder ?? rec.DisplayOrder;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n)) return n;
      }
    }
    return 0;
  }
  function dateValue(raw?: string): number {
    if (!raw) return 0;
    const time = Date.parse(raw);
    return Number.isNaN(time) ? 0 : time;
  }
  function uuidV7Time(id?: string): number {
    const match = id?.match(/(?:^|-)0?([0-9a-f]{8})-([0-9a-f]{4})-/i);
    if (!match) return 0;
    return parseInt(`${match[1]}${match[2]}`, 16);
  }
  function recency(l: (typeof languages)[number]): number {
    const f = l.fields;
    return (
      dateValue(f.PublishedAt ?? f.published_at) ||
      dateValue(f.CreatedAt ?? f.created_at) ||
      uuidV7Time(l.entity_id) ||
      uuidV7Time(f.Id) ||
      dateValue(f.UpdatedAt ?? f.updated_at) ||
      l.sequence_nr ||
      l.total_event_count ||
      0
    );
  }
  // Tie-breakers after featured: Published -> UnderReview -> Draft -> Archived,
  // then recency. Featured languages still honor display_order when present.
  const STATUS_PRIORITY: Record<string, number> = {
    Published: 0,
    UnderReview: 1,
    Draft: 2,
    Archived: 3,
  };
  languages.sort((a, b) => {
    const fa = isFeatured(a) ? 0 : 1;
    const fb = isFeatured(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (fa === 0) {
      const oa = displayOrder(a);
      const ob = displayOrder(b);
      if (oa !== ob) return oa - ob;
    }
    const sa = STATUS_PRIORITY[a.status] ?? 99;
    const sb = STATUS_PRIORITY[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    const ra = recency(a);
    const rb = recency(b);
    if (ra !== rb) return rb - ra;
    return a.entity_id.localeCompare(b.entity_id);
  });

  // Today's pull — one sheet from the drawer, rotated daily. A fixed
  // starting point for browsers who arrive with no destination.
  const pullPool = languages.filter((l) => l.status === "Published");
  const pull =
    pullPool.length > 0 ? pullPool[dailyIndex(pullPool.length)] : undefined;

  // The taste deck deals from the published catalog.
  const deckEntries: DeckEntry[] = pullPool.map((l) => {
    const tokens = parseJson<{
      colors?: Record<string, string>;
      typography?: { heading_font?: string };
    }>(l.fields.tokens);
    const colors = tokens?.colors ?? {};
    const name = l.fields.name ?? "Untitled";
    return {
      id: l.entity_id,
      name,
      // editions of one house ("Art Deco Gilt · Night") share a family so
      // the deck never deals near-clones back to back
      family: name.split("·")[0].trim(),
      href: `/language/${l.entity_id}`,
      summary: parseJson<{ summary?: string }>(l.fields.philosophy)
        ?.summary?.replace(/\s+/g, " ")
        .trim(),
      tags: (parseJson<string[]>(l.fields.tags) ?? []).map((t) =>
        t.toLowerCase(),
      ),
      hue: dominantHueBucket(l),
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        background: colors.background,
        text: colors.text,
      },
      headingFont: tokens?.typography?.heading_font,
      thumb: l.fields.thumbnail_asset_url || undefined,
    };
  });

  return (
    <>
      {pull ? <TodaysPull lang={pull} /> : null}
      {deckEntries.length > 2 ? <TasteDeck entries={deckEntries} /> : null}
      <LanguageGallery
        languages={languages}
        canDelete={canDelete}
        taxonomies={taxonomies}
        initialFilters={{
          status: status ?? "Published",
          taxonomy: taxonomy ?? "all",
          search: search ?? "",
          tag: tag ?? "all",
          hue: hue ?? "all",
          source: source ?? "all",
        }}
      />
    </>
  );
}

/** Which sheet gets pulled today — server-side daily rotation. */
function dailyIndex(poolSize: number): number {
  if (poolSize <= 0) return 0;
  return Math.floor(Date.now() / 86_400_000) % poolSize;
}

function TodaysPull({
  lang,
}: {
  lang: Awaited<ReturnType<typeof listDesignLanguages>>[number];
}) {
  const tokens = parseJson<{ colors?: Record<string, string> }>(
    lang.fields.tokens,
  );
  const colors = tokens?.colors ?? {};
  const swatch = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.background,
  ].filter((c): c is string => Boolean(c));
  const ink = swatch[0] ?? "var(--sakura)";
  const summary = parseJson<{ summary?: string }>(lang.fields.philosophy)
    ?.summary?.replace(/\s+/g, " ")
    .trim();

  return (
    <Link
      href={`/language/${lang.entity_id}`}
      prefetch={false}
      className="group relative flex flex-wrap items-center gap-x-5 gap-y-3 bg-card/80 px-5 py-4 transition-all duration-200 hover:-translate-y-[2px] sm:flex-nowrap"
      style={{
        boxShadow: `0 1px 2px rgba(33,33,60,0.03), 5px 6px 0 color-mix(in srgb, ${ink} 20%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="washi-tape -left-3 -top-2"
        style={{ ["--strip-ink" as string]: "var(--sakura)", transform: "rotate(-5deg) skewX(-8deg)" }}
      />
      <span className="ink-stamp shrink-0" style={{ ["--ink" as string]: "var(--sakura)" }}>
        ✦ today&apos;s pull
      </span>
      <span aria-hidden className="flex shrink-0 gap-[3px]">
        {swatch.slice(0, 4).map((c, i) => (
          <span key={i} className="h-3.5 w-3.5" style={{ background: c }} />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[18px] font-bold leading-tight tracking-[-0.015em] text-foreground">
          {lang.fields.name}
        </span>
        {summary ? (
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground transition-transform group-hover:translate-x-1">
        open →
      </span>
    </Link>
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
  let taxonomies: { entity_id: string; fields: { name?: string } }[] = [];
  try {
    taxonomies = await listTaxonomies("Status eq 'Published'");
  } catch {
    // Taxonomy listing may fail if no data yet
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 overflow-x-hidden px-4 py-6 sm:space-y-14 sm:overflow-visible sm:py-10">
      {/* ── Hero: the print bed ─────────────────────────────────── */}
      <section className="relative min-w-0 overflow-x-hidden pb-2 pt-4 sm:overflow-visible sm:pt-8">
        <RisoHeroPress className="opacity-90 max-sm:opacity-40" />

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
                className="absolute inset-x-[-3px] bottom-[1px] z-0 h-[6px] bg-[var(--yuzu)] opacity-85"
                style={{
                  transform: "rotate(-0.8deg) skewX(-6deg)",
                  mixBlendMode: "var(--ink-blend)" as never,
                }}
              />
            </a>
          </div>

          <h1
            className="riso-reveal font-display text-[44px] font-bold leading-[0.98] tracking-[-0.03em] sm:text-[64px] lg:text-[76px]"
            style={{ ["--reveal-i" as string]: 1 }}
          >
            <span
              className="riso-double"
              data-text="Design"
              style={{ ["--ink" as string]: "var(--sakura)" }}
            >
              Design
            </span>{" "}
            <span
              className="riso-double"
              data-text="languages."
              style={{ ["--ink" as string]: "var(--ramune)" }}
            >
              languages.
            </span>
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
              className="group relative inline-flex items-center gap-2 bg-foreground px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg]"
              style={{
                boxShadow:
                  "4px 5px 0 color-mix(in srgb, var(--sakura) 38%, transparent)",
              }}
            >
              Browse gallery
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <SurpriseChip />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              or press <kbd className="font-bold text-foreground">⌘K</kbd> to search
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works — one quiet strip, three passes ─────────── */}
      <section
        aria-label="How katagami works"
        className="riso-reveal relative grid gap-6 sm:grid-cols-3"
        style={{ ["--reveal-i" as string]: 4 }}
      >
        {(
          [
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
          ] as const
        ).map((step) => (
          <div key={step.n} className="relative pl-12">
            <span
              aria-hidden
              className="riso-double absolute left-0 top-0 font-display text-[34px] font-bold leading-none text-foreground/90"
              data-text={step.n}
              style={{ ["--ink" as string]: `var(--${step.ink})` }}
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
      </section>

      {/* ── Gallery ──────────────────────────────────────────────── */}
      <section id="gallery" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span
                className="inline-block h-[7px] w-9 skew-x-[-8deg] bg-[var(--ramune)]"
                style={{ mixBlendMode: "var(--ink-blend)" as never }}
              />
              choose a language
            </div>
            <h2
              className="riso-double font-display text-[28px] font-bold leading-none tracking-[-0.02em]"
              data-text="Gallery"
              style={{ ["--ink" as string]: "var(--ramune)" }}
            >
              Gallery
            </h2>
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
          <GalleryGrid
            status={sp.status}
            taxonomy={sp.taxonomy}
            search={sp.q}
            tag={sp.tag}
            hue={sp.hue}
            source={sp.src}
            demo={demo}
            taxonomies={taxonomies}
          />
        </Suspense>
      </section>
    </div>
  );
}
