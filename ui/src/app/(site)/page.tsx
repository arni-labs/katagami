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
          <div className="max-w-2xl">
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
            <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[56px]">
              Design{" "}
              <span className="marker">
                <span
                  aria-hidden
                  className="marker-fill"
                  style={{ background: "var(--yuzu)" }}
                />
                <span className="marker-text">language</span>
              </span>{" "}
              <span className="marker">
                <span
                  aria-hidden
                  className="marker-fill"
                  style={{ background: "var(--salad)" }}
                />
                <span className="marker-text">gallery</span>
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Browse, compare, and select design languages for your projects.
              Each card is a full system — palette, type, philosophy, embodied
              preview.
            </p>
          </div>
          <div className="relative hidden shrink-0 flex-col items-end gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="stamp text-[var(--sakura)]">katagami</span>
            <span className="stamp text-[var(--teal)] rotate-[3deg]">no.001</span>
            <span className="pt-1">since 2026</span>
          </div>
        </div>
      </section>

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
