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

  let languages = await listDesignLanguages(filter);

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
      <div className="text-center py-16 text-muted-foreground">
        No design languages found. Run the bootstrap pipeline to generate them.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Design Language Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse, compare, and select design languages for your projects.
        </p>
      </div>

      <GalleryFilters taxonomies={taxonomies} />

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-lg bg-muted animate-pulse"
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
