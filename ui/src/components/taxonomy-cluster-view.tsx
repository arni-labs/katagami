"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Taxonomy, DesignLanguage } from "@/lib/odata";
import { parseJson } from "@/lib/odata";

interface TaxonomyCluster {
  label: string;
  taxonomies: Taxonomy[];
}

function buildClusters(taxonomies: Taxonomy[]): TaxonomyCluster[] {
  const byId = new Map(taxonomies.map((t) => [t.entity_id, t]));

  // Separate roots and children
  const roots: Taxonomy[] = [];
  const childrenByParent = new Map<string, Taxonomy[]>();

  for (const tax of taxonomies) {
    const parentId = tax.fields.parent_id;
    if (parentId && byId.has(parentId)) {
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(tax);
      childrenByParent.set(parentId, siblings);
    } else {
      roots.push(tax);
    }
  }

  // Build adjacency graph for roots using RelatedTaxonomyIds
  const rootIds = new Set(roots.map((r) => r.entity_id));
  const adj = new Map<string, Set<string>>();
  for (const root of roots) {
    adj.set(root.entity_id, new Set());
  }
  for (const root of roots) {
    const related = parseJson<string[]>(root.fields.related_taxonomy_ids) ?? [];
    for (const rid of related) {
      if (rootIds.has(rid)) {
        adj.get(root.entity_id)!.add(rid);
        adj.get(rid)?.add(root.entity_id);
      }
    }
  }

  // BFS to find connected components among roots
  const visited = new Set<string>();
  const components: Taxonomy[][] = [];

  for (const root of roots) {
    if (visited.has(root.entity_id)) continue;
    const component: Taxonomy[] = [];
    const queue = [root.entity_id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(byId.get(current)!);
      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  // Sort components by size descending, then build clusters
  components.sort((a, b) => b.length - a.length);

  const clusters: TaxonomyCluster[] = [];
  for (const component of components) {
    // Find the most connected node as the cluster label
    const anchor = component.reduce((best, tax) => {
      const bestRelated = (parseJson<string[]>(best.fields.related_taxonomy_ids) ?? []).length;
      const taxRelated = (parseJson<string[]>(tax.fields.related_taxonomy_ids) ?? []).length;
      return taxRelated > bestRelated ? tax : best;
    });

    // Include children of each root in the cluster
    const allInCluster: Taxonomy[] = [];
    for (const root of component) {
      allInCluster.push(root);
      const children = childrenByParent.get(root.entity_id) ?? [];
      allInCluster.push(...children);
    }

    const label =
      component.length === 1
        ? anchor.fields.name ?? "Unnamed"
        : `${anchor.fields.name ?? "Unnamed"} cluster`;

    clusters.push({ label, taxonomies: allInCluster });
  }

  // Add orphaned children (parent not in current set)
  const allClustered = new Set(
    clusters.flatMap((c) => c.taxonomies.map((t) => t.entity_id)),
  );
  const orphans = taxonomies.filter((t) => !allClustered.has(t.entity_id));
  if (orphans.length > 0) {
    clusters.push({ label: "Other", taxonomies: orphans });
  }

  return clusters;
}

function TaxonomyCard({
  tax,
  langs,
  allTaxonomies,
}: {
  tax: Taxonomy;
  langs: DesignLanguage[];
  allTaxonomies: Map<string, Taxonomy>;
}) {
  const chars = parseJson<{ key_traits?: string[] }>(tax.fields.characteristics);
  const traits = chars?.key_traits ?? [];
  const related = parseJson<string[]>(tax.fields.related_taxonomy_ids) ?? [];
  const relatedNames = related
    .map((rid) => allTaxonomies.get(rid)?.fields.name)
    .filter((n): n is string => !!n);
  const parentId = tax.fields.parent_id;
  const parentName = parentId ? allTaxonomies.get(parentId)?.fields.name : null;
  const langCount = tax.counters.language_count ?? langs.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            {parentName && (
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {parentName} &rsaquo;
              </p>
            )}
            <CardTitle className="text-sm">{tax.fields.name ?? "Untitled"}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {langCount} lang{langCount !== 1 ? "s" : ""}
            </Badge>
            <Badge
              variant="outline"
              className={
                tax.status === "Published"
                  ? "text-[10px] border-green-300 text-green-700"
                  : "text-[10px]"
              }
            >
              {tax.status}
            </Badge>
          </div>
        </div>
        {tax.fields.description && (
          <CardDescription className="text-xs line-clamp-2">
            {tax.fields.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {traits.slice(0, 5).map((trait) => (
              <Badge key={trait} variant="outline" className="text-[10px]">
                {trait}
              </Badge>
            ))}
          </div>
        )}
        {relatedNames.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Related: {relatedNames.join(", ")}
          </p>
        )}
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
}

export function TaxonomyClusterView({
  taxonomies,
  languages,
}: {
  taxonomies: Taxonomy[];
  languages: DesignLanguage[];
}) {
  const clusters = useMemo(() => buildClusters(taxonomies), [taxonomies]);
  const allTaxonomies = useMemo(
    () => new Map(taxonomies.map((t) => [t.entity_id, t])),
    [taxonomies],
  );

  // Build language-by-taxonomy map
  const langsByTaxonomy = useMemo(() => {
    const m = new Map<string, DesignLanguage[]>();
    for (const lang of languages) {
      const taxIds = parseJson<string[]>(lang.fields.taxonomy_ids) ?? [];
      for (const tid of taxIds) {
        const existing = m.get(tid) ?? [];
        existing.push(lang);
        m.set(tid, existing);
      }
    }
    return m;
  }, [languages]);

  return (
    <div className="space-y-8">
      {clusters.map((cluster) => (
        <section key={cluster.label}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">{cluster.label}</h3>
            <Badge variant="outline" className="text-[10px]">
              {cluster.taxonomies.length}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cluster.taxonomies.map((tax) => (
              <TaxonomyCard
                key={tax.entity_id}
                tax={tax}
                langs={langsByTaxonomy.get(tax.entity_id) ?? []}
                allTaxonomies={allTaxonomies}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
