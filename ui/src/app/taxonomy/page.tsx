import { listTaxonomies, listDesignLanguages, parseJson } from "@/lib/odata";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { TaxonomyClusterView } from "@/components/taxonomy-cluster-view";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  Stamp,
  Perforation,
} from "@/components/scrapbook";

const accentCycle = [
  "sakura",
  "yuzu",
  "salad",
  "matcha",
  "teal",
  "ramune",
  "sumire",
] as const;

export default async function TaxonomyPage() {
  let taxonomies;
  try {
    taxonomies = await listTaxonomies("Status ne 'Archived'");
  } catch {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <PageHero
          eyebrowAccent="salad"
          eyebrow="categorization"
          title={<Marker color="salad">taxonomy</Marker>}
          description="Could not reach the server."
        />
        <StickyNote className="p-6 text-center font-mono text-sm text-muted-foreground">
          ensure the temper server is running
        </StickyNote>
      </div>
    );
  }

  let languages: Awaited<ReturnType<typeof listDesignLanguages>> = [];
  try {
    languages = await listDesignLanguages();
  } catch {
    // keep empty
  }

  const langsByTaxonomy = new Map<string, typeof languages>();
  for (const lang of languages) {
    const taxIds = parseJson<string[]>(lang.fields.taxonomy_ids) ?? [];
    for (const tid of taxIds) {
      const existing = langsByTaxonomy.get(tid) ?? [];
      existing.push(lang);
      langsByTaxonomy.set(tid, existing);
    }
  }

  const taxById = new Map(taxonomies.map((t) => [t.entity_id, t]));

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <PageHero
        eyebrowAccent="salad"
        eyebrow="categorization"
        title={
          <>
            <Marker color="salad">taxonomy</Marker> browser
          </>
        }
        description="Browse design languages by movement, aesthetic direction, and stylistic family. Clusters group related languages; the grid gives a flat overview."
        rightSlot={
          <>
            <Stamp color="salad">{taxonomies.length} categories</Stamp>
            <Stamp color="teal" rotate={3}>
              curated
            </Stamp>
          </>
        }
      />

      <Tabs defaultValue="cluster">
        <TabsList className="h-auto gap-1 rounded-none bg-transparent p-0">
          <ScrapbookTab value="cluster">clusters</ScrapbookTab>
          <ScrapbookTab value="grid">grid view</ScrapbookTab>
        </TabsList>

        <TabsContent value="cluster" className="mt-6">
          <StickyNote className="p-5">
            <TaxonomyClusterView
              taxonomies={taxonomies}
              languages={languages}
            />
          </StickyNote>
        </TabsContent>

        <TabsContent value="grid" className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {taxonomies.map((tax, i) => {
              const chars = parseJson<{ key_traits?: string[] }>(
                tax.fields.characteristics,
              );
              const traits = chars?.key_traits ?? [];
              const langs = langsByTaxonomy.get(tax.entity_id) ?? [];
              const langCount = tax.counters.language_count ?? langs.length;
              const related =
                parseJson<string[]>(tax.fields.related_taxonomy_ids) ?? [];
              const relatedNames = related
                .map((rid) => taxById.get(rid)?.fields.name)
                .filter((n): n is string => !!n);
              const parentId = tax.fields.parent_id;
              const parentName = parentId
                ? taxById.get(parentId)?.fields.name
                : null;
              const tint = accentCycle[i % accentCycle.length];
              const tapeColor = accentCycle[(i + 3) % accentCycle.length];

              return (
                <StickyNote
                  key={tax.entity_id}
                  tint={tint}
                  className="p-5 transition-transform duration-200 hover:-translate-y-[2px] hover:rotate-[-0.4deg]"
                >
                  <WashiTape
                    color={tapeColor}
                    rotate={((i % 5) - 2) * 2 - 4}
                    className="-left-3 -top-2"
                    width={72}
                  />
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      {parentName && (
                        <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          {parentName} &rsaquo;
                        </p>
                      )}
                      <h3 className="font-display text-lg font-bold leading-tight tracking-[-0.02em]">
                        {tax.fields.name ?? "Untitled"}
                      </h3>
                    </div>
                    <Stamp color={tint}>
                      {langCount} lang{langCount !== 1 ? "s" : ""}
                    </Stamp>
                  </div>
                  {tax.fields.description && (
                    <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                      {tax.fields.description}
                    </p>
                  )}

                  {traits.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {traits.slice(0, 5).map((c, j) => {
                        const rot = ((c.charCodeAt(0) % 7) - 3) * 0.6;
                        return (
                          <span
                            key={c}
                            className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium text-foreground/80"
                            style={{
                              transform: `rotate(${rot}deg)`,
                              background: `color-mix(in oklch, var(--${
                                accentCycle[(j + i) % accentCycle.length]
                              }) 32%, white)`,
                            }}
                          >
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {relatedNames.length > 0 && (
                    <p className="mb-3 font-mono text-[10px] text-muted-foreground">
                      related: {relatedNames.join(" · ")}
                    </p>
                  )}

                  {tax.fields.historical_context && (
                    <p className="mb-3 line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">
                      &ldquo;{tax.fields.historical_context}&rdquo;
                    </p>
                  )}

                  {langs.length > 0 && (
                    <>
                      <Perforation className="mb-2 mt-2" />
                      <div className="flex flex-wrap gap-1">
                        {langs.slice(0, 8).map((l) => (
                          <Link
                            key={l.entity_id}
                            href={`/language/${l.entity_id}`}
                            className="rounded-[3px] border border-border bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/75 transition-colors hover:bg-white hover:text-foreground"
                          >
                            {l.fields.name ?? l.entity_id.slice(0, 8)}
                          </Link>
                        ))}
                        {langs.length > 8 && (
                          <span className="px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            +{langs.length - 8} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </StickyNote>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {taxonomies.length === 0 && (
        <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
          no taxonomies yet · run the curation pipeline
        </StickyNote>
      )}
    </div>
  );
}

function ScrapbookTab({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group relative rounded-none border-0 bg-transparent px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute inset-x-1 bottom-0.5 z-0 h-[6px] rounded-[1px] bg-[var(--yuzu)] opacity-0 transition-opacity group-data-[state=active]:opacity-85"
        style={{ transform: "rotate(-0.8deg)" }}
      />
    </TabsTrigger>
  );
}
