"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { Taxonomy, DesignLanguage } from "@/lib/odata";
import { parseJson } from "@/lib/odata";
import { Marker } from "@/components/page-hero";
import { Perforation, Stamp, WashiTape } from "@/components/scrapbook";

type AccentColor =
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

interface TaxonomyFamily {
  root: Taxonomy;
  taxonomies: Taxonomy[];
  languages: DesignLanguage[];
}

const accentCycle: AccentColor[] = [
  "sakura",
  "yuzu",
  "salad",
  "matcha",
  "teal",
  "ramune",
  "sumire",
];

function hashInt(s: string, salt = "") {
  let h = 0;
  const str = s + salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function tintFor(taxId: string): AccentColor {
  return accentCycle[hashInt(taxId, "tint") % accentCycle.length];
}

function languageName(lang: DesignLanguage) {
  return lang.fields.name ?? lang.entity_id.slice(0, 10);
}

function isVisibleLanguage(lang: DesignLanguage) {
  return lang.status === "Published" || lang.status === "UnderReview";
}

function languageStatusRank(lang: DesignLanguage) {
  if (lang.status === "Published") return 0;
  if (lang.status === "UnderReview") return 1;
  return 2;
}

function traitsFor(tax: Taxonomy, limit: number) {
  const chars = parseJson<{ key_traits?: string[] }>(
    tax.fields.characteristics,
  );
  return (chars?.key_traits ?? []).slice(0, limit);
}

function uniqueLanguages(langs: DesignLanguage[]) {
  const byId = new Map<string, DesignLanguage>();
  for (const lang of langs) {
    if (!isVisibleLanguage(lang)) continue;
    byId.set(lang.entity_id, lang);
  }
  return [...byId.values()].sort((a, b) => {
    const status = languageStatusRank(a) - languageStatusRank(b);
    if (status !== 0) return status;
    return languageName(a).localeCompare(languageName(b));
  });
}

function buildFamilies(
  taxonomies: Taxonomy[],
  langsByTaxonomy: Map<string, DesignLanguage[]>,
): TaxonomyFamily[] {
  const byId = new Map(taxonomies.map((tax) => [tax.entity_id, tax]));
  const childrenByParent = new Map<string, Taxonomy[]>();

  for (const tax of taxonomies) {
    const parentId = tax.fields.parent_id;
    if (!parentId || !byId.has(parentId)) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(tax);
    childrenByParent.set(parentId, children);
  }

  const roots = taxonomies.filter((tax) => {
    const parentId = tax.fields.parent_id;
    return !parentId || !byId.has(parentId);
  });

  const visit = (
    root: Taxonomy,
    seen = new Set<string>(),
  ): Taxonomy[] => {
    if (seen.has(root.entity_id)) return [];
    seen.add(root.entity_id);
    const children = childrenByParent.get(root.entity_id) ?? [];
    return [root, ...children.flatMap((child) => visit(child, seen))];
  };

  return roots
    .map((root) => {
      const all = visit(root);
      const languages = uniqueLanguages(
        all.flatMap((tax) => langsByTaxonomy.get(tax.entity_id) ?? []),
      );
      const usefulTaxonomies = all
        .filter((tax) => tax.entity_id !== root.entity_id)
        .filter((tax) =>
          (langsByTaxonomy.get(tax.entity_id) ?? []).some(isVisibleLanguage),
        )
        .sort((a, b) => {
          const aCount = (langsByTaxonomy.get(a.entity_id) ?? []).filter(
            isVisibleLanguage,
          ).length;
          const bCount = (langsByTaxonomy.get(b.entity_id) ?? []).filter(
            isVisibleLanguage,
          ).length;
          if (aCount !== bCount) return bCount - aCount;
          return (a.fields.name ?? "").localeCompare(b.fields.name ?? "");
        });
      return { root, taxonomies: usefulTaxonomies, languages };
    })
    .filter(
      (family) => family.languages.length > 0 || family.taxonomies.length > 0,
    )
    .sort((a, b) => {
      if (a.languages.length !== b.languages.length) {
        return b.languages.length - a.languages.length;
      }
      return (a.root.fields.name ?? "").localeCompare(b.root.fields.name ?? "");
    });
}

function TraitPills({
  traits,
  tint,
}: {
  traits: string[];
  tint: AccentColor;
}) {
  if (traits.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {traits.map((trait) => (
        <span
          key={trait}
          className="px-2 py-1 text-[11px] font-medium text-foreground/80"
          style={{
            background: `color-mix(in oklch, var(--${tint}) 20%, var(--paper-tape-mix))`,
          }}
        >
          {trait}
        </span>
      ))}
    </div>
  );
}

function LanguageChip({ lang }: { lang: DesignLanguage }) {
  return (
    <Link
      href={`/language/${lang.entity_id}`}
      className="inline-flex max-w-full items-center gap-1 border border-border/70 bg-[var(--paper-sticker)] px-2 py-1 text-[11px] font-medium text-foreground/80 shadow-[0_1px_0_rgba(30,35,45,0.04)] transition-colors hover:border-foreground/30 hover:bg-[var(--paper-sticker-hover)] hover:text-foreground"
    >
      <span className="truncate">{languageName(lang)}</span>
      <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function TaxonomyCard({
  tax,
  langs,
}: {
  tax: Taxonomy;
  langs: DesignLanguage[];
}) {
  const tint = tintFor(tax.entity_id);
  const visibleLangs = uniqueLanguages(langs);
  const traits = traitsFor(tax, 4);

  return (
    <article className="sticker-card group/tax relative overflow-hidden p-4">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-[3px] w-14 opacity-80 transition-all duration-200 group-hover/tax:w-20"
        style={{ background: `var(--${tint})` }}
      />
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[16px] font-bold leading-tight text-foreground">
          {tax.fields.name}
        </h3>
        <Stamp color={tint} className="shrink-0">
          {visibleLangs.length} lang{visibleLangs.length === 1 ? "" : "s"}
        </Stamp>
      </div>

      {tax.fields.description && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {tax.fields.description}
        </p>
      )}

      <div className="mt-3">
        <TraitPills traits={traits} tint={tint} />
      </div>

      {visibleLangs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {visibleLangs.slice(0, 5).map((lang) => (
            <LanguageChip key={lang.entity_id} lang={lang} />
          ))}
          {visibleLangs.length > 5 && (
            <Link
              href={`/?taxonomy=${tax.entity_id}`}
              className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
            >
              +{visibleLangs.length - 5} more
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function FamilySection({
  family,
  index,
  langsByTaxonomy,
  collapsed,
  onToggle,
}: {
  family: TaxonomyFamily;
  index: number;
  langsByTaxonomy: Map<string, DesignLanguage[]>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const tint = tintFor(family.root.entity_id);
  const traits = traitsFor(family.root, 6);
  const contentId = `taxonomy-family-${family.root.entity_id}`;

  return (
    <section className="relative pt-9">
      <Perforation className="absolute inset-x-0 top-0" />
      <WashiTape
        color={tint}
        rotate={index % 2 === 0 ? -3 : 3}
        className="-top-2 left-3"
        width={54}
        height={12}
      />
      <div
        className={
          collapsed
            ? "flex flex-wrap items-start justify-between gap-4"
            : "grid gap-5 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.8fr)]"
        }
      >
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              family {String(index + 1).padStart(2, "0")}
            </span>
            <Stamp color={tint}>{family.taxonomies.length} categories</Stamp>
            <Stamp color="teal">{family.languages.length} languages</Stamp>
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={contentId}
              aria-label={`${collapsed ? "Open" : "Fold"} ${
                family.root.fields.name ?? "taxonomy family"
              }`}
              onClick={onToggle}
              className="inline-flex h-7 items-center gap-1 border border-border bg-[var(--paper-sticker)] px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-[0_1px_0_rgba(30,35,45,0.04)] transition-colors hover:border-foreground/30 hover:bg-[var(--paper-sticker-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  collapsed ? "-rotate-90" : ""
                }`}
              />
              {collapsed ? "open" : "fold"}
            </button>
          </div>

          <div>
            <h2
              className={`font-display font-bold leading-tight text-foreground ${
                collapsed
                  ? "text-[24px] sm:text-[28px]"
                  : "text-[26px] sm:text-[32px]"
              }`}
            >
              <Marker color={tint}>{family.root.fields.name}</Marker>
            </h2>
            {!collapsed && family.root.fields.description && (
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
                {family.root.fields.description}
              </p>
            )}
          </div>

          {!collapsed && <TraitPills traits={traits} tint={tint} />}

          {!collapsed && family.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {family.languages.slice(0, 8).map((lang) => (
                <LanguageChip key={lang.entity_id} lang={lang} />
              ))}
            </div>
          )}
        </div>

        <div
          id={contentId}
          className={collapsed ? "hidden" : "grid gap-3 sm:grid-cols-2"}
        >
          {family.taxonomies.map((tax) => (
            <TaxonomyCard
              key={tax.entity_id}
              tax={tax}
              langs={langsByTaxonomy.get(tax.entity_id) ?? []}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TaxonomyClusterView({
  taxonomies,
  languages,
}: {
  taxonomies: Taxonomy[];
  languages: DesignLanguage[];
}) {
  const visibleLanguages = useMemo(
    () => languages.filter(isVisibleLanguage),
    [languages],
  );

  const langsByTaxonomy = useMemo(() => {
    const map = new Map<string, DesignLanguage[]>();
    for (const lang of visibleLanguages) {
      const taxIds = parseJson<string[]>(lang.fields.taxonomy_ids) ?? [];
      for (const taxId of taxIds) {
        const existing = map.get(taxId) ?? [];
        existing.push(lang);
        map.set(taxId, existing);
      }
    }
    return map;
  }, [visibleLanguages]);

  const families = useMemo(
    () => buildFamilies(taxonomies, langsByTaxonomy),
    [taxonomies, langsByTaxonomy],
  );
  const [collapsedFamilyIds, setCollapsedFamilyIds] = useState<Set<string>>(
    () => new Set(),
  );

  const categoryCount = families.reduce(
    (total, family) => total + family.taxonomies.length,
    0,
  );
  const languageCount = new Set(visibleLanguages.map((lang) => lang.entity_id))
    .size;

  if (families.length === 0) {
    return (
      <div className="sticker-card flex items-center justify-center p-12 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
        no published taxonomy families yet
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="relative py-5">
        <Perforation className="absolute inset-x-0 top-0" />
        <Perforation className="absolute inset-x-0 bottom-0" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="families" value={families.length} />
          <Stat label="active categories" value={categoryCount} />
          <Stat label="visible languages" value={languageCount} />
        </div>
      </div>

      <div className="space-y-10">
        {families.map((family, index) => (
          <FamilySection
            key={family.root.entity_id}
            family={family}
            index={index}
            langsByTaxonomy={langsByTaxonomy}
            collapsed={collapsedFamilyIds.has(family.root.entity_id)}
            onToggle={() => {
              setCollapsedFamilyIds((current) => {
                const next = new Set(current);
                if (next.has(family.root.entity_id)) {
                  next.delete(family.root.entity_id);
                } else {
                  next.add(family.root.entity_id);
                }
                return next;
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-3 sm:block">
      <div className="font-display text-[28px] font-bold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
