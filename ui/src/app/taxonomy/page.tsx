import { listTaxonomies, listDesignLanguages, parseJson } from "@/lib/odata";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { TaxonomyClusterView } from "@/components/taxonomy-cluster-view";

export default async function TaxonomyPage() {
  let taxonomies;
  try {
    taxonomies = await listTaxonomies("Status ne 'Archived'");
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Taxonomy Browser</h1>
        <p className="text-muted-foreground">
          Could not load taxonomies. Ensure the server is running.
        </p>
      </div>
    );
  }

  let languages: Awaited<ReturnType<typeof listDesignLanguages>> = [];
  try {
    languages = await listDesignLanguages();
  } catch {
    // keep empty
  }

  // Group languages by taxonomy
  const langsByTaxonomy = new Map<string, typeof languages>();
  for (const lang of languages) {
    const taxIds = parseJson<string[]>(lang.fields.taxonomy_ids) ?? [];
    for (const tid of taxIds) {
      const existing = langsByTaxonomy.get(tid) ?? [];
      existing.push(lang);
      langsByTaxonomy.set(tid, existing);
    }
  }

  // Build taxonomy lookup for parent names
  const taxById = new Map(taxonomies.map((t) => [t.entity_id, t]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Taxonomy Browser</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse design languages by movement and aesthetic direction.
        </p>
      </div>

      <Tabs defaultValue="cluster">
        <TabsList>
          <TabsTrigger value="cluster">Clusters</TabsTrigger>
          <TabsTrigger value="grid">Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="cluster" className="mt-4">
          <TaxonomyClusterView taxonomies={taxonomies} languages={languages} />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {taxonomies.map((tax) => {
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

              return (
                <Card key={tax.entity_id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {parentName && (
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            {parentName} &rsaquo;
                          </p>
                        )}
                        <CardTitle className="text-base">
                          {tax.fields.name ?? "Untitled"}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {langCount} lang{langCount !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="secondary">{tax.status}</Badge>
                      </div>
                    </div>
                    {tax.fields.description && (
                      <CardDescription className="text-xs line-clamp-2">
                        {tax.fields.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {traits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {traits.slice(0, 5).map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {relatedNames.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Related: {relatedNames.join(", ")}
                      </p>
                    )}
                    {tax.fields.historical_context && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tax.fields.historical_context}
                      </p>
                    )}
                    {langs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {langs.map((l) => (
                          <Link
                            key={l.entity_id}
                            href={`/language/${l.entity_id}`}
                          >
                            <Badge
                              variant="secondary"
                              className="text-[10px] cursor-pointer hover:bg-accent"
                            >
                              {l.fields.name ?? l.entity_id.slice(0, 8)}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {taxonomies.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No taxonomies found. Run the curation pipeline to generate them.
        </div>
      )}
    </div>
  );
}
