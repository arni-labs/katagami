import { listTaxonomies, listDesignLanguages, parseJson } from "@/lib/odata";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function TaxonomyPage() {
  let taxonomies;
  try {
    taxonomies = await listTaxonomies();
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Taxonomy Browser</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse design languages by movement and aesthetic direction.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taxonomies.map((tax) => {
          const chars = parseJson<string[]>(tax.fields.characteristics) ?? [];
          const langs = langsByTaxonomy.get(tax.entity_id) ?? [];

          return (
            <Card key={tax.entity_id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {tax.fields.name ?? "Untitled"}
                  </CardTitle>
                  <Badge variant="secondary">{tax.status}</Badge>
                </div>
                {tax.fields.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {tax.fields.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {chars.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chars.slice(0, 4).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
                {tax.fields.historical_context && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tax.fields.historical_context}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {tax.counters.language_count ?? langs.length} language
                  {(tax.counters.language_count ?? langs.length) !== 1 ? "s" : ""}
                </div>
                {langs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {langs.map((l) => (
                      <Link key={l.entity_id} href={`/language/${l.entity_id}`}>
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

      {taxonomies.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No taxonomies found. Run the curation pipeline to generate them.
        </div>
      )}
    </div>
  );
}
