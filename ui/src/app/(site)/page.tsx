import { Suspense } from "react";
import { listDesignLanguages, listTaxonomies } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";
import { GalleryFilters } from "@/components/gallery-filters";

async function GalleryGrid({
  status,
  taxonomy,
  search,
}: {
  status?: string;
  taxonomy?: string;
  search?: string;
}) {
  let filter: string | undefined;
  if (status && status !== "all") {
    filter = `Status eq '${status}'`;
  }

  let languages: Awaited<ReturnType<typeof listDesignLanguages>>;
  try {
    // Order featured first, then by display_order. The client-side sort
    // below is still applied as a safety net in case the backend ignores
    // $orderby on these specific fields.
    languages = await listDesignLanguages(
      filter,
      "Featured desc,DisplayOrder asc",
    );
  } catch {
    return (
      <div className="paper-card mx-auto max-w-md rounded-[var(--radius-lg)] p-8 text-center text-sm text-muted-foreground">
        Could not load design languages.
        <div className="mt-1 font-mono text-[11px]">check the Temper server</div>
      </div>
    );
  }

  // TEMP DEBUG: dump shape of first language so we can see how Temper
  // actually serializes `featured` / `display_order`. Safe to remove
  // after confirming.
  if (languages[0]) {
    console.log(
      "[gallery] first language shape:",
      JSON.stringify(
        {
          entity_id: languages[0].entity_id,
          status: languages[0].status,
          keys: Object.keys(languages[0]),
          booleans: languages[0].booleans,
          counters: languages[0].counters,
          fields_featured: (
            languages[0].fields as Record<string, unknown>
          )?.featured,
          fields_display_order: (
            languages[0].fields as Record<string, unknown>
          )?.display_order,
        },
        null,
        0,
      ),
    );
  }

  // Filter out empty drafts (no name set = incomplete/abandoned)
  languages = languages.filter((l) => l.fields.name);

  // Client-side filters for taxonomy and search (OData filter on JSON fields
  // is not yet reliable in Temper)
  if (taxonomy) {
    languages = languages.filter((l) => {
      const ids = l.fields.taxonomy_ids ?? "[]";
      return ids.includes(taxonomy);
    });
  }
  if (search) {
    const q = search.toLowerCase();
    languages = languages.filter((l) => {
      const name = (l.fields.name ?? "").toLowerCase();
      const tags = (l.fields.tags ?? "").toLowerCase();
      return name.includes(q) || tags.includes(q);
    });
  }

  if (languages.length === 0) {
    return (
      <div className="paper-card mx-auto max-w-md rounded-[var(--radius-lg)] p-8 text-center text-sm text-muted-foreground">
        No design languages found.
        <div className="mt-1 font-mono text-[11px]">
          run the bootstrap pipeline
        </div>
      </div>
    );
  }

  // Sort: featured languages first (by display_order asc), then the rest.
  // OData queries use PascalCase (Featured / DisplayOrder) but the JSON
  // response might put values in any of several shapes — check them all.
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
  languages.sort((a, b) => {
    const fa = isFeatured(a) ? 1 : 0;
    const fb = isFeatured(b) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const oa = displayOrder(a);
    const ob = displayOrder(b);
    if (oa !== ob) return oa - ob;
    return a.entity_id.localeCompare(b.entity_id);
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {languages.map((lang) => (
        <LanguageCard key={lang.entity_id} lang={lang} />
      ))}
    </div>
  );
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; taxonomy?: string; q?: string }>;
}) {
  const sp = await searchParams;
  let taxonomies: { entity_id: string; fields: { name?: string } }[] = [];
  try {
    taxonomies = await listTaxonomies("Status eq 'Published'");
  } catch {
    // Taxonomy listing may fail if no data yet
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <section className="relative">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              <span className="inline-block h-[3px] w-9 rounded-[2px] bg-[var(--teal)]" />
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
                  style={{ transform: "rotate(-0.8deg)" }}
                />
              </a>
            </div>
            {/* Title + stamps flow inline on the same line; wraps cleanly
                on narrow widths. */}
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <h1 className="font-display text-[40px] font-bold leading-[1] tracking-[-0.03em] sm:text-[56px] lg:text-[68px]">
                Design{" "}
                <span className="marker">
                  <span
                    aria-hidden
                    className="marker-fill"
                    style={{ background: "var(--salad)" }}
                  />
                  <span className="marker-text">languages</span>
                </span>
                .
              </h1>
              <div className="relative z-10 flex flex-wrap items-center gap-2.5 pb-2">
                <span
                  className="stamp text-[var(--sakura)] whitespace-nowrap"
                  style={{
                    transform: "rotate(-5deg)",
                    fontSize: 14,
                    padding: "5px 12px",
                    letterSpacing: "0.14em",
                    borderWidth: 2,
                  }}
                >
                  <span className="mr-1 text-[var(--sumire)]">✦</span>
                  for agents
                </span>
                <span
                  className="stamp text-[var(--sumire)] whitespace-nowrap"
                  style={{
                    transform: "rotate(4deg)",
                    fontSize: 11,
                    padding: "3px 10px",
                    letterSpacing: "0.14em",
                    borderWidth: 1.5,
                  }}
                >
                  by agents
                </span>
              </div>
            </div>

            {/* "Give your agent taste" — styled like a handwritten planner
                note in the margin: tiny sparkle, wavy underline doodle,
                hand-drawn circle around spec.md, slight card tilt. */}
            <div
              className="relative mt-6 max-w-xl"
              style={{ transform: "rotate(-0.4deg)" }}
            >
              {/* Margin doodle — ✦ + "note" running up the side (desktop) */}
              <div className="pointer-events-none absolute -left-9 top-1 hidden flex-col items-center gap-1 lg:flex">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-[var(--sumire)]"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
                </svg>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80"
                  style={{ writingMode: "vertical-rl" }}
                >
                  margin note
                </span>
              </div>

              <div className="relative px-2 py-3">
                <p className="font-display text-[20px] font-bold leading-snug tracking-[-0.015em] text-foreground sm:text-[24px]">
                  Give your agent{" "}
                  <span className="relative inline-block">
                    <span className="marker">
                      <span
                        aria-hidden
                        className="marker-fill"
                        style={{ background: "var(--sakura)" }}
                      />
                      <span className="marker-text">taste</span>
                    </span>
                    {/* Squiggly hand-drawn underline under "taste" */}
                    <svg
                      aria-hidden
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                      className="absolute -bottom-[6px] left-0 h-[7px] w-full text-[var(--sumire)]"
                    >
                      <path
                        d="M 2 6 Q 12 1, 22 5 T 44 5 T 66 5 T 88 5 T 100 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  .{" "}
                  {/* Inline doodle: little arrow "→ yes." */}
                  <span
                    className="ml-1 inline-block font-mono text-[13px] font-semibold text-[var(--beni)]"
                    style={{ transform: "rotate(-4deg)" }}
                  >
                    ← yes.
                  </span>
                </p>

                <p className="mt-4 font-mono text-[12px] leading-relaxed text-foreground/80 sm:text-[13px]">
                  a vocabulary of{" "}
                  <span className="font-semibold text-foreground">
                    design movements
                  </span>
                  <br />
                  you can hand off as a{" "}
                  {/* spec.md — wrapped in a slightly-irregular SVG circle,
                      no border/chip, the doodle IS the highlight */}
                  <span className="relative inline-block px-2">
                    <svg
                      aria-hidden
                      viewBox="0 0 72 26"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full text-[var(--teal)]"
                    >
                      <path
                        d="M 10 4 C 2 6, 2 20, 14 22 C 28 25, 52 24, 64 20 C 74 17, 70 4, 58 3 C 42 1, 20 2, 10 4 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="relative font-semibold text-foreground">
                      spec.md
                    </span>
                  </span>
                  .
                </p>

                {/* Bottom corner doodle — curly arrow pointing to spec.md */}
                <svg
                  aria-hidden
                  viewBox="0 0 60 40"
                  className="pointer-events-none absolute -bottom-3 right-4 h-8 w-14 text-[var(--sumire)]"
                >
                  <path
                    d="M 4 34 C 10 28, 14 20, 26 16 C 38 12, 48 12, 54 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 48 4 L 54 8 L 50 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-1 left-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70"
                  style={{ transform: "rotate(-3deg)" }}
                >
                  ✎ hand it over
                </span>
              </div>
            </div>
          </div>
          <div className="relative hidden shrink-0 flex-col items-end gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="stamp text-[var(--sakura)]">katagami</span>
            <span className="stamp text-[var(--teal)] rotate-[3deg]">
              no.001
            </span>
            <span className="pt-1">since 2026</span>
          </div>
        </div>
      </section>

      {/* Collapsible "What you can do" — compact 4-card row, scrapbook vibe.
          Folds up so the gallery below is always quick to reach. */}
      <details
        open
        className="group/cando relative"
        aria-labelledby="what-you-can-do"
      >
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-block h-[3px] w-9 rounded-[2px] bg-[var(--sumire)]" />
              <h2
                id="what-you-can-do"
                className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] sm:text-[26px]"
              >
                What you can{" "}
                <span className="marker">
                  <span
                    aria-hidden
                    className="marker-fill"
                    style={{ background: "var(--yuzu)" }}
                  />
                  <span className="marker-text">do</span>
                </span>{" "}
                with it
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="stamp text-[var(--teal)] shrink-0"
                style={{
                  transform: "rotate(3deg)",
                  fontSize: 10,
                  padding: "3px 9px",
                  letterSpacing: "0.14em",
                }}
              >
                ✎ field guide
              </span>
              {/* Fold/unfold toggle — styled as a stamp pill; rotates +
                  swaps its label based on open state */}
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-transform hover:-translate-y-[1px]"
                style={{
                  transform: "rotate(-2deg)",
                  border: "1.5px solid var(--sumire)",
                  color: "var(--sumire)",
                  background:
                    "color-mix(in oklch, var(--sumire) 8%, white)",
                  padding: "4px 10px",
                  borderRadius: 2,
                }}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 12 12"
                  className="h-3 w-3 shrink-0 transition-transform group-open/cando:rotate-180"
                  fill="currentColor"
                >
                  <path d="M6 8.5 L1.5 4 L10.5 4 Z" />
                </svg>
                <span className="hidden group-open/cando:inline">fold</span>
                <span className="inline group-open/cando:hidden">show</span>
              </span>
            </div>
          </div>
        </summary>

        {/* Card row — responsive across every size:
              mobile (< sm):  horizontal scroll-snap, 240px fixed cards
              sm–md:          2-col grid
              lg+:            4-col grid
            No gray borders anywhere. */}
        <div
          className="mt-5 flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-4"
          style={{ scrollPaddingLeft: "1rem" }}
        >
          {(
            [
              {
                outcome: "Skip the cold start.",
                you: "Name what you like.",
                agent: "Receive a vocabulary.",
                prompt: "rebuild this landing in Sumi-e Editorial",
                tint: "sakura",
                tape: "yuzu",
                tapeRot: -4,
              },
              {
                outcome: "Commit with confidence.",
                you: "Compare moods quickly.",
                agent: "Stay on-style, session to session.",
                prompt: "preview this page — calm, aggressive, playful",
                tint: "salad",
                tape: "sumire",
                tapeRot: 5,
              },
              {
                outcome: "Remix freely.",
                you: "Remix languages.",
                agent: "Cite tokens precisely.",
                prompt: "apply CRT Terminal tokens to the Sumi-e layout",
                tint: "teal",
                tape: "sakura",
                tapeRot: -6,
              },
              {
                outcome: "Explore wider.",
                you: "Discover new movements.",
                agent: "Stop inventing defaults.",
                prompt: "research sci-fi × editorial typography",
                tint: "sumire",
                tape: "salad",
                tapeRot: 4,
              },
            ] as const
          ).map((row, i) => (
            <article
              key={row.outcome}
              className="relative w-[240px] shrink-0 snap-start sm:w-full sm:max-w-[360px] sm:shrink lg:max-w-none"
            >
              {/* Washi tape corner */}
              <span
                aria-hidden
                className="pointer-events-none absolute -left-1.5 -top-1.5 z-20 h-[13px] w-[62px] rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
                style={{
                  background: `repeating-linear-gradient(45deg, color-mix(in oklch, var(--${row.tape}) 78%, white) 0 6px, color-mix(in oklch, var(--${row.tape}) 42%, white) 6px 12px)`,
                  transform: `rotate(${row.tapeRot}deg)`,
                }}
              />
              {/* Index sticker — small round, in card corner */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white font-mono text-[11px] font-black text-foreground shadow-[1px_1px_0_rgba(30,35,45,0.1)]"
                style={{
                  transform: "rotate(6deg)",
                  border: `1.5px solid var(--${row.tint})`,
                  color: `color-mix(in oklch, var(--${row.tint}), black 30%)`,
                }}
              >
                {i + 1}
              </span>

              <div
                className="relative flex h-full flex-col overflow-hidden px-4 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_6px_18px_rgba(30,35,45,0.06)]"
                style={{
                  background: `color-mix(in srgb, var(--${row.tint}) 10%, rgba(255, 255, 255, 0.92))`,
                }}
              >
                {/* Thin colored top ribbon — card identity */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[4px]"
                  style={{ background: `var(--${row.tint})` }}
                />

                <h3 className="mt-2 font-display text-[17px] font-bold leading-[1.12] tracking-[-0.015em]">
                  {row.outcome}
                </h3>

                {/* Stacked for you / for agent — hand-written style, no borders */}
                <div className="mt-3 space-y-2.5">
                  <div>
                    <span
                      className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
                      style={{
                        color: `color-mix(in oklch, var(--teal), black 25%)`,
                      }}
                    >
                      ✎ for you
                    </span>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/90">
                      {row.you}
                    </p>
                  </div>
                  <div>
                    <span
                      className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
                      style={{
                        color: `color-mix(in oklch, var(--sumire), black 20%)`,
                      }}
                    >
                      ✦ for agent
                    </span>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/90">
                      {row.agent}
                    </p>
                  </div>
                </div>

                {/* Perforation separator */}
                <div className="sticker-perforation my-3" />

                {/* Prompt — scroll-note style, no border, just yuzu wash */}
                <div className="mt-auto flex items-start gap-1.5">
                  <span
                    aria-hidden
                    className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--beni)" }}
                  >
                    → try
                  </span>
                  <span
                    className="flex-1 font-mono text-[10.5px] italic leading-snug text-foreground/75"
                    style={{
                      background:
                        "linear-gradient(transparent 68%, color-mix(in oklch, var(--yuzu) 60%, white) 68%)",
                      padding: "0 2px",
                    }}
                  >
                    &ldquo;{row.prompt}&rdquo;
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Gallery cue — dashed perforation, washi tape snippet, and a
            tilted "gallery below" stamp in place of the plain text hint. */}
        <div className="relative mt-6 flex items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-x-0 top-1/2 border-t border-dashed border-border"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-[18%] top-1/2 hidden h-[12px] w-[52px] -translate-y-1/2 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.06)] sm:block"
            style={{
              background:
                "repeating-linear-gradient(45deg, color-mix(in oklch, var(--salad) 78%, white) 0 6px, color-mix(in oklch, var(--salad) 42%, white) 6px 12px)",
              transform: "translateY(-50%) rotate(-6deg)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[18%] top-1/2 hidden h-[12px] w-[52px] -translate-y-1/2 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.06)] sm:block"
            style={{
              background:
                "repeating-linear-gradient(45deg, color-mix(in oklch, var(--yuzu) 78%, white) 0 6px, color-mix(in oklch, var(--yuzu) 42%, white) 6px 12px)",
              transform: "translateY(-50%) rotate(5deg)",
            }}
          />
          <span
            className="relative inline-flex items-center gap-1.5 bg-background px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              transform: "rotate(-2deg)",
              border: "1.5px solid var(--sumire)",
              color: "var(--sumire)",
              background:
                "color-mix(in oklch, var(--sumire) 8%, var(--background))",
              padding: "3px 12px",
              borderRadius: 2,
            }}
          >
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className="h-3 w-3 shrink-0"
              fill="currentColor"
            >
              <path d="M6 9.5 L1.5 4.5 L10.5 4.5 Z" />
            </svg>
            the gallery
          </span>
        </div>
      </details>

      <GalleryFilters taxonomies={taxonomies} />

      <Suspense
        fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-[var(--radius-xl)] border border-border bg-muted/50"
              />
            ))}
          </div>
        }
      >
        <GalleryGrid
          status={sp.status}
          taxonomy={sp.taxonomy}
          search={sp.q}
        />
      </Suspense>
    </div>
  );
}
