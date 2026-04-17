"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import type { Taxonomy, DesignLanguage } from "@/lib/odata";
import { parseJson } from "@/lib/odata";
import { Marker } from "@/components/page-hero";
import { StickyNote, WashiTape, Stamp } from "@/components/scrapbook";

interface TaxonomyCluster {
  label: string;
  anchorId: string;
  taxonomies: Taxonomy[];
}

type AccentColor =
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

const accentCycle: AccentColor[] = [
  "sakura",
  "yuzu",
  "salad",
  "matcha",
  "teal",
  "ramune",
  "sumire",
];

const clusterLeadCycle: AccentColor[] = [
  "sakura",
  "teal",
  "salad",
  "sumire",
  "ramune",
  "yuzu",
];

function hashInt(s: string, salt = "") {
  let h = 0;
  const str = s + salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Each taxonomy gets its own stable color from the full palette cycle. */
function tintFor(taxId: string): AccentColor {
  return accentCycle[hashInt(taxId, "tint") % accentCycle.length];
}

/** Pair color for washi tape — different from the card tint. */
function tapeFor(taxId: string, tint: AccentColor): AccentColor {
  const candidates = accentCycle.filter((c) => c !== tint);
  return candidates[hashInt(taxId, "tape") % candidates.length];
}

function buildClusters(taxonomies: Taxonomy[]): TaxonomyCluster[] {
  const byId = new Map(taxonomies.map((t) => [t.entity_id, t]));

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

  const rootIds = new Set(roots.map((r) => r.entity_id));
  const adj = new Map<string, Set<string>>();
  for (const root of roots) adj.set(root.entity_id, new Set());
  for (const root of roots) {
    const related =
      parseJson<string[]>(root.fields.related_taxonomy_ids) ?? [];
    for (const rid of related) {
      if (rootIds.has(rid)) {
        adj.get(root.entity_id)!.add(rid);
        adj.get(rid)?.add(root.entity_id);
      }
    }
  }

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
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }

  components.sort((a, b) => b.length - a.length);

  const clusters: TaxonomyCluster[] = [];
  for (const component of components) {
    const anchor = component.reduce((best, tax) => {
      const bestRel =
        (parseJson<string[]>(best.fields.related_taxonomy_ids) ?? []).length;
      const taxRel =
        (parseJson<string[]>(tax.fields.related_taxonomy_ids) ?? []).length;
      return taxRel > bestRel ? tax : best;
    });

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

    clusters.push({
      label,
      anchorId: anchor.entity_id,
      taxonomies: allInCluster,
    });
  }

  const allClustered = new Set(
    clusters.flatMap((c) => c.taxonomies.map((t) => t.entity_id)),
  );
  const orphans = taxonomies.filter((t) => !allClustered.has(t.entity_id));
  if (orphans.length > 0) {
    clusters.push({ label: "Other", anchorId: "", taxonomies: orphans });
  }

  return clusters;
}

// ── Taxonomy card ──────────────────────────────────────────────────

function TaxonomyCard({
  tax,
  langs,
  allTaxonomies,
  isAnchor,
}: {
  tax: Taxonomy;
  langs: DesignLanguage[];
  allTaxonomies: Map<string, Taxonomy>;
  isAnchor: boolean;
}) {
  const chars = parseJson<{ key_traits?: string[] }>(
    tax.fields.characteristics,
  );
  const traits = chars?.key_traits ?? [];
  const related =
    parseJson<string[]>(tax.fields.related_taxonomy_ids) ?? [];
  const relatedNames = related
    .map((rid) => allTaxonomies.get(rid)?.fields.name)
    .filter((n): n is string => !!n);
  const parentId = tax.fields.parent_id;
  const parentName = parentId
    ? allTaxonomies.get(parentId)?.fields.name
    : null;
  const langCount = tax.counters.language_count ?? langs.length;

  const tint = tintFor(tax.entity_id);
  const tapeColor = tapeFor(tax.entity_id, tint);
  const rot = ((hashInt(tax.entity_id, "r") % 9) - 4) * 0.2;
  const tapeRot = ((hashInt(tax.entity_id, "t") % 11) - 5) * 0.7 - 3;

  return (
    <StickyNote
      tint={tint}
      className={`group/card relative p-4 transition-transform duration-300 hover:-translate-y-[2px] hover:rotate-0 ${
        isAnchor ? "p-5 sm:p-6" : "p-4"
      }`}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <WashiTape
        color={tapeColor}
        rotate={tapeRot}
        className="-left-3 -top-2"
        width={isAnchor ? 92 : 60}
      />
      {isAnchor && (
        <WashiTape
          color={tint}
          rotate={tapeRot + 10}
          className="-right-3 -top-1"
          width={52}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {parentName && (
            <p className="mb-1 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {parentName} &rsaquo;
            </p>
          )}
          <h4
            className={`font-display font-bold leading-tight tracking-[-0.02em] ${
              isAnchor ? "text-2xl sm:text-[26px]" : "text-[15px]"
            }`}
          >
            {isAnchor ? (
              <Marker color={tint}>{tax.fields.name ?? "Untitled"}</Marker>
            ) : (
              tax.fields.name ?? "Untitled"
            )}
          </h4>
        </div>
        <Stamp color={tint}>
          {langCount} lang{langCount !== 1 ? "s" : ""}
        </Stamp>
      </div>

      {tax.fields.description && (
        <p
          className={`mt-2 leading-relaxed text-muted-foreground ${
            isAnchor ? "text-[14px]" : "line-clamp-2 text-[12px]"
          }`}
        >
          {tax.fields.description}
        </p>
      )}

      {traits.length > 0 && (
        <div className={`mt-3 flex flex-wrap gap-1 ${isAnchor ? "gap-1.5" : ""}`}>
          {traits.slice(0, isAnchor ? 10 : 4).map((t, i) => {
            const r = ((hashInt(t, "p") % 7) - 3) * 0.3;
            return (
              <span
                key={t}
                className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium text-foreground/85"
                style={{
                  transform: `rotate(${r}deg)`,
                  background: `color-mix(in oklch, var(--${accentCycle[(i + hashInt(tax.entity_id)) % accentCycle.length]}) 32%, white)`,
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      )}

      {isAnchor && tax.fields.historical_context && (
        <blockquote
          className="mt-3 bg-white/40 py-1.5 pl-3 pr-2 text-[12px] italic leading-relaxed text-foreground/75"
          style={{ borderLeft: `2px solid var(--${tint})` }}
        >
          {tax.fields.historical_context}
        </blockquote>
      )}

      {relatedNames.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
          <span className="text-[var(--sumire)]">↦</span>
          <span className="uppercase tracking-[0.12em]">related:</span>
          <span className="text-foreground/70">
            {relatedNames.slice(0, isAnchor ? 5 : 3).join(" · ")}
            {relatedNames.length > (isAnchor ? 5 : 3) &&
              ` +${relatedNames.length - (isAnchor ? 5 : 3)}`}
          </span>
        </div>
      )}

      {langs.length > 0 && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              languages
            </span>
            <span
              aria-hidden
              className="h-[1px] flex-1 border-t border-dashed border-border"
            />
            <span className="font-mono text-[9px] text-muted-foreground">
              {langs.length}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {langs.slice(0, isAnchor ? 14 : 6).map((l) => (
              <LanguageChip
                key={l.entity_id}
                lang={l}
              />
            ))}
            {langs.length > (isAnchor ? 14 : 6) && (
              <Link
                href={`/?taxonomy=${tax.entity_id}`}
                className="inline-flex items-center gap-1 border border-dashed border-border bg-white/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-solid hover:bg-white hover:text-foreground"
              >
                +{langs.length - (isAnchor ? 14 : 6)} more
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </>
      )}
    </StickyNote>
  );
}

// ── Language chip — clearly clickable bookmark-tab ─────────────────

function LanguageChip({ lang }: { lang: DesignLanguage }) {
  const name = lang.fields.name ?? lang.entity_id.slice(0, 10);
  const dotColor = accentCycle[hashInt(lang.entity_id, "dot") % accentCycle.length];
  return (
    <Link
      href={`/language/${lang.entity_id}`}
      className="group/chip relative inline-flex items-center gap-1.5 border border-border bg-white px-2 py-1 text-[11px] font-medium text-foreground/85 shadow-[0_1px_2px_rgba(30,35,45,0.06)] transition-all duration-200 hover:-translate-y-[1.5px] hover:text-foreground hover:shadow-[0_3px_6px_rgba(30,35,45,0.1)]"
    >
      {/* color wash on hover */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/chip:opacity-35"
        style={{
          background: `color-mix(in oklch, var(--${dotColor}) 60%, white)`,
        }}
      />
      {/* palette dot */}
      <span
        aria-hidden
        className="relative h-1.5 w-1.5 rounded-full border border-foreground/15"
        style={{ background: `var(--${dotColor})` }}
      />
      <span className="relative whitespace-nowrap">{name}</span>
      <ArrowUpRight className="relative h-3 w-3 text-muted-foreground/70 transition-all duration-200 group-hover/chip:translate-x-[1px] group-hover/chip:-translate-y-[1px] group-hover/chip:text-foreground" />
    </Link>
  );
}

// ── Unfold button — obvious "click me" affordance ──────────────────

function UnfoldButton({
  count,
  color,
}: {
  count: number;
  color: AccentColor;
}) {
  return (
    <summary className="group/unfold relative flex cursor-pointer list-none items-center justify-center py-5 [&::-webkit-details-marker]:hidden">
      {/* dashed perforation line across */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-0 border-t border-dashed border-border"
      />
      {/* central button floating over the line */}
      <span
        className="relative inline-flex items-center gap-2.5 border border-border bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 shadow-[0_2px_6px_rgba(30,35,45,0.08)] transition-all duration-200 group-hover/unfold:-translate-y-[2px] group-hover/unfold:text-foreground group-hover/unfold:shadow-[0_4px_12px_rgba(30,35,45,0.12)]"
      >
        {/* accent wash on hover + when open */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/unfold:opacity-40 group-open/cluster:opacity-25"
          style={{
            background: `color-mix(in oklch, var(--${color}) 60%, white)`,
          }}
        />
        <ChevronDown className="relative h-4 w-4 transition-transform duration-200 group-open/cluster:rotate-180" />
        <span className="relative font-semibold">
          <span className="group-open/cluster:hidden">
            unfold {count} more
          </span>
          <span className="hidden group-open/cluster:inline">fold up</span>
        </span>
        <ChevronDown className="relative h-4 w-4 transition-transform duration-200 group-open/cluster:rotate-180" />
      </span>
      {/* little corner "tape" to reinforce "tear here" feeling */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-6 top-1/2 h-[2px] w-6 -translate-y-1/2 opacity-70"
        style={{ background: `var(--${color})` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 top-1/2 h-[2px] w-6 -translate-y-1/2 opacity-70"
        style={{ background: `var(--${color})` }}
      />
    </summary>
  );
}

// ── Cluster spread ─────────────────────────────────────────────────

function ClusterSpread({
  cluster,
  index,
  langsByTaxonomy,
  allTaxonomies,
}: {
  cluster: TaxonomyCluster;
  index: number;
  langsByTaxonomy: Map<string, DesignLanguage[]>;
  allTaxonomies: Map<string, Taxonomy>;
}) {
  const leadColor = clusterLeadCycle[index % clusterLeadCycle.length];
  const anchor = cluster.taxonomies.find((t) => t.entity_id === cluster.anchorId);
  const siblings = cluster.taxonomies.filter(
    (t) => t.entity_id !== cluster.anchorId,
  );

  const taxCount = cluster.taxonomies.length;
  const allLangs = new Set<string>();
  for (const t of cluster.taxonomies) {
    for (const l of langsByTaxonomy.get(t.entity_id) ?? []) {
      allLangs.add(l.entity_id);
    }
  }
  const clusterLangCount = allLangs.size;

  return (
    <section className="relative">
      {/* Cluster header */}
      <div className="relative mb-5">
        <WashiTape
          color={leadColor}
          rotate={-4}
          className="-left-2 -top-2"
          width={80}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 pl-1">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              spread no.{String(index + 1).padStart(3, "0")}
            </span>
            <h3 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[26px]">
              <Marker color={leadColor}>{cluster.label}</Marker>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Stamp color={leadColor}>{taxCount} tax</Stamp>
            <Stamp color="teal" rotate={2}>
              {clusterLangCount} lang
            </Stamp>
          </div>
        </div>
      </div>

      {/* Anchor — always visible, full width */}
      {anchor && (
        <div className="mb-2">
          <TaxonomyCard
            tax={anchor}
            langs={langsByTaxonomy.get(anchor.entity_id) ?? []}
            allTaxonomies={allTaxonomies}
            isAnchor
          />
        </div>
      )}

      {/* Siblings collapse — with obvious unfold affordance */}
      {siblings.length > 0 && (
        <details className="group/cluster">
          <UnfoldButton count={siblings.length} color={leadColor} />
          <div className="mt-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((tax) => (
              <TaxonomyCard
                key={tax.entity_id}
                tax={tax}
                langs={langsByTaxonomy.get(tax.entity_id) ?? []}
                allTaxonomies={allTaxonomies}
                isAnchor={false}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ── Root ───────────────────────────────────────────────────────────

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

  if (clusters.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground/70">
        no clusters yet
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {clusters.map((cluster, i) => (
        <ClusterSpread
          key={cluster.label + i}
          cluster={cluster}
          index={i}
          langsByTaxonomy={langsByTaxonomy}
          allTaxonomies={allTaxonomies}
        />
      ))}
    </div>
  );
}
