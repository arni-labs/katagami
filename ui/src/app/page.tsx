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
    languages = await listDesignLanguages(filter);
  } catch {
    return (
      <div className="paper-card mx-auto max-w-md rounded-[var(--radius-lg)] p-8 text-center text-sm text-muted-foreground">
        Could not load design languages.
        <div className="mt-1 font-mono text-[11px]">check the Temper server</div>
      </div>
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

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <section className="relative">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              <span className="inline-block h-[3px] w-9 bg-[var(--teal)] rounded-[2px]" />
              a library of design languages
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
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
            <span className="stamp text-[var(--teal)] rotate-[3deg]">no.000</span>
            <span className="pt-1">since 2026</span>
          </div>
        </div>
      </section>

      <GalleryFilters taxonomies={taxonomies} />

      <Suspense
        fallback={
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
