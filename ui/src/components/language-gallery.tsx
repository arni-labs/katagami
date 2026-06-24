import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";
import { GalleryFilters } from "@/components/gallery-filters";
import { ShelfSpread } from "@/components/shelf-spread";
import { COLOR_MOOD_SHELVES, colorMoodShelfKey } from "@/lib/color-shelves";

/** Shelves only make sense once the catalog outgrows a single wall. */
const SHELF_THRESHOLD = 24;

export function LanguageGallery({
  languages,
  canDelete,
  taxonomies = [],
  taxonomyParents,
  taxonomyByLang,
  initialFilters,
}: {
  languages: DesignLanguage[];
  canDelete: boolean;
  taxonomies?: { entity_id: string; fields: { name?: string } }[];
  /** Full taxonomy tree (id → name + parentId) for grouping shelves by the
   *  root design family. Absent → the gallery falls back to color-mood. */
  taxonomyParents?: Map<string, { name: string; parentId: string }>;
  /** languageId → its leaf taxonomy ids (read canonically; the projected
   *  field is unreliable). Pairs with taxonomyParents to place each shelf. */
  taxonomyByLang?: Map<string, string[]>;
  initialFilters?: {
    status?: string;
    taxonomy?: string;
    search?: string;
    tag?: string;
    hue?: string;
    source?: string;
  };
}) {
  const filters = {
    status: initialFilters?.status ?? "Published",
    taxonomy: initialFilters?.taxonomy ?? "all",
    search: initialFilters?.search ?? "",
    tag: initialFilters?.tag ?? "all",
    hue: initialFilters?.hue ?? "all",
    source: initialFilters?.source ?? "all",
  };

  const attrsById = new Map(
    languages.map((lang) => [
      lang.entity_id,
      galleryCardAttributes(lang, taxonomyByLang),
    ]),
  );
  const topTags = collectTopTags(attrsById.values());
  const hasSpecimens = Array.from(attrsById.values()).some((a) => a.specimen);

  // The catalog is a cabinet of shelves, not a list. Each shelf is a
  // color-mood computed from the languages' own tokens (dark stock, loud
  // inks, quiet paper, warm/cold press) — a browser who doesn't know what
  // they want slides along shelves instead of scanning one huge grid.
  // Below the threshold everything lives on a single unlabeled wall.
  const shelves = buildShelves(languages, taxonomyParents, taxonomyByLang);
  // Global card position across shelves — drives eager thumbnail loading.
  const indexById = assignGlobalIndices(shelves);

  return (
    <>
      <GalleryFilters
        taxonomies={taxonomies}
        tags={topTags}
        hasSpecimens={hasSpecimens}
        totalCount={languages.length}
        initialStatus={filters.status}
        initialTaxonomy={filters.taxonomy}
        initialSearch={filters.search}
        initialTag={filters.tag}
        initialHue={filters.hue}
        initialSource={filters.source}
      />

      <div className="mt-10 space-y-12 sm:space-y-16">
        {shelves.map((shelf) => {
          const { key, label, blurb, ink, languages } = shelf;
          const anyVisible = languages.some((lang) =>
            matchesFilters(attrsById.get(lang.entity_id)!, filters),
          );
          return (
            <section
              key={key}
              data-shelf-section={key}
              hidden={label !== null && !anyVisible}
              className="min-w-0"
            >
              {label !== null && (
                <div className="mb-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className="ink-stamp shrink-0"
                    style={{ ["--ink" as string]: ink }}
                  >
                    {label}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {blurb ? `${blurb} · ` : ""}
                    {languages.length}
                  </span>
                  <span className="sticker-perforation hidden min-w-0 flex-1 sm:block" />
                  <ShelfSpread />
                </div>
              )}
              <div
                className={
                  label === null
                    ? "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
                    : "shelf-row"
                }
              >
                {languages.map((lang) => {
                  const attrs = attrsById.get(lang.entity_id)!;
                  return (
                    <div
                      key={lang.entity_id}
                      data-gallery-card
                      data-status={attrs.status}
                      data-taxonomy-ids={attrs.taxonomyIds}
                      data-search-text={attrs.searchText}
                      data-tags={attrs.tags.join("\t")}
                      data-hue={attrs.hue}
                      data-specimen={attrs.specimen ? "true" : undefined}
                      data-shelf={key}
                      hidden={!matchesFilters(attrs, filters)}
                    >
                      <LanguageCard
                        lang={lang}
                        index={indexById.get(lang.entity_id) ?? 0}
                        canDelete={canDelete}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div
        data-gallery-empty
        hidden={languages.some((lang) =>
          matchesFilters(attrsById.get(lang.entity_id)!, filters),
        )}
        className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground"
      >
        No design languages found.
        <div className="mt-1 font-mono text-[11px]">
          adjust the gallery filters
        </div>
      </div>
    </>
  );
}

interface Shelf {
  key: string;
  /** null = the single unlabeled wall used for small catalogs. */
  label: string | null;
  blurb: string;
  ink: string;
  languages: DesignLanguage[];
}

function isFeaturedLanguage(lang: DesignLanguage): boolean {
  const bag = lang as unknown as Record<string, unknown>;
  for (const c of [bag.booleans, bag.fields, bag.counters, bag]) {
    if (!c || typeof c !== "object") continue;
    const v = (c as Record<string, unknown>).featured;
    if (v === true || v === 1) return true;
    if (typeof v === "string" && v.toLowerCase() === "true") return true;
  }
  return false;
}

function shelfKeyFor(lang: DesignLanguage): string {
  const tokens = parseMaybeJson(lang.fields.tokens) as
    | { colors?: Record<string, string> }
    | undefined;
  const colors = tokens?.colors ?? {};
  return colorMoodShelfKey({
    primary: colors.primary ?? colors.accent,
    background: colors.background,
    featured: isFeaturedLanguage(lang),
  });
}

function buildShelves(
  languages: DesignLanguage[],
  taxonomyParents?: Map<string, { name: string; parentId: string }>,
  taxonomyByLang?: Map<string, string[]>,
): Shelf[] {
  if (languages.length <= SHELF_THRESHOLD) {
    return [
      { key: "all", label: null, blurb: "", ink: "var(--ramune)", languages },
    ];
  }
  // Group by the root design family (meaningful) when the taxonomy tree is
  // available; otherwise fall back to the self-organizing color-mood cabinet.
  if (taxonomyParents && taxonomyParents.size > 0 && taxonomyByLang) {
    const families = buildFamilyShelves(languages, taxonomyParents, taxonomyByLang);
    if (families && families.length > 0) return families;
  }
  const buckets = new Map<string, DesignLanguage[]>();
  for (const lang of languages) {
    const key = shelfKeyFor(lang);
    const bucket = buckets.get(key) ?? [];
    bucket.push(lang);
    buckets.set(key, bucket);
  }
  return COLOR_MOOD_SHELVES.filter(
    (def) => (buckets.get(def.key)?.length ?? 0) > 0,
  ).map((def) => ({ ...def, languages: buckets.get(def.key)! }));
}

/** Walk a leaf taxonomy up to its root family id (cycle-guarded). */
function rootFamilyOf(
  leafId: string,
  parents: Map<string, { name: string; parentId: string }>,
): string {
  let cur = leafId;
  const seen = new Set<string>();
  while (!seen.has(cur)) {
    const info = parents.get(cur);
    if (!info || !info.parentId || !parents.has(info.parentId)) break;
    seen.add(cur);
    cur = info.parentId;
  }
  return cur;
}

/** Trim a long family name down to a calm shelf stamp. */
function familyLabel(name: string): string {
  const trimmed = name
    .replace(/\b(systems?|interfaces?|design|lineages?)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (trimmed || name).toLowerCase();
}

// Categories that always sink to the bottom of the wall, regardless of size.
const BOTTOM_CATEGORY = "en-019efb96-d5ca-7330-9a3c-d5dc2b9f9ee3"; // Festival & Poster Graphics

// Spot-ink trio (sakura / yuzu / ramune) plus violet as a tasteful fourth —
// no muddy greens in the chrome.
const FAMILY_INKS = [
  "var(--sakura)",
  "var(--ramune)",
  "var(--yuzu)",
  "var(--sumire)",
];

/** Category (leaf) names are already clean — just match the calm stamp casing. */
function categoryLabel(name: string): string {
  return name.toLowerCase();
}

/**
 * Group the wall by the specific taxonomy CATEGORY (leaf) each language sits on
 * — "Swiss Typographic", "Glass & Soft-Depth", "Manga Panel" — not the broad
 * parent family. Categories cluster by family (shared tint, family shown as the
 * blurb) and order family-then-size. Featured languages lead in a curator's-
 * picks shelf; languages with no taxonomy collect in "mixed & more". Returns
 * null when no language carries usable taxonomy data, so the caller can fall
 * back to color-mood.
 */
function buildFamilyShelves(
  languages: DesignLanguage[],
  parents: Map<string, { name: string; parentId: string }>,
  taxonomyByLang: Map<string, string[]>,
): Shelf[] | null {
  const taxesOf = (lang: DesignLanguage) =>
    taxonomyByLang.get(lang.entity_id) ?? [];
  // A language's primary category is its first taxonomy id known in the tree —
  // a top-level canonical category OR a legacy leaf; both shelve directly.
  const primaryLeaf = (lang: DesignLanguage): string | null => {
    for (const t of taxesOf(lang)) if (parents.has(t)) return t;
    return null;
  };

  const featured: DesignLanguage[] = [];
  const byCategory = new Map<string, DesignLanguage[]>();
  const orphans: DesignLanguage[] = [];
  for (const lang of languages) {
    if (isFeaturedLanguage(lang)) {
      featured.push(lang);
      continue;
    }
    const leaf = primaryLeaf(lang);
    if (!leaf) {
      orphans.push(lang);
      continue;
    }
    const bucket = byCategory.get(leaf) ?? [];
    bucket.push(lang);
    byCategory.set(leaf, bucket);
  }
  if (byCategory.size === 0) return null;

  // Family totals so categories cluster under their family (biggest family first).
  const famSize = new Map<string, number>();
  for (const [leaf, v] of byCategory) {
    const fam = rootFamilyOf(leaf, parents);
    famSize.set(fam, (famSize.get(fam) ?? 0) + v.length);
  }
  const famRank = [...famSize.entries()].sort((a, b) => b[1] - a[1]);
  const rankOf = new Map<string, number>(famRank.map(([fam], i) => [fam, i]));
  const famInk = new Map<string, string>(
    famRank.map(([fam], i) => [fam, FAMILY_INKS[i % FAMILY_INKS.length]]),
  );

  const ordered = [...byCategory.entries()].sort((a, b) => {
    // Festival & Poster Graphics always sinks to the bottom of the wall.
    const aBottom = a[0] === BOTTOM_CATEGORY ? 1 : 0;
    const bBottom = b[0] === BOTTOM_CATEGORY ? 1 : 0;
    if (aBottom !== bBottom) return aBottom - bBottom;
    const fa = rootFamilyOf(a[0], parents);
    const fb = rootFamilyOf(b[0], parents);
    if (fa !== fb) return (rankOf.get(fa) ?? 99) - (rankOf.get(fb) ?? 99);
    if (a[1].length !== b[1].length) return b[1].length - a[1].length;
    return (parents.get(a[0])?.name ?? "").localeCompare(parents.get(b[0])?.name ?? "");
  });

  const shelves: Shelf[] = [];
  if (featured.length > 0) {
    shelves.push({
      key: "picks",
      label: "curator's picks",
      blurb: "pinned to the corkboard",
      ink: "var(--sakura)",
      languages: featured,
    });
  }
  for (const [leaf, v] of ordered) {
    const fam = rootFamilyOf(leaf, parents);
    shelves.push({
      key: leaf,
      label: categoryLabel(parents.get(leaf)?.name ?? leaf),
      // top-level canonical categories are their own family — no redundant blurb.
      blurb: fam !== leaf ? familyLabel(parents.get(fam)?.name ?? "") : "",
      ink: famInk.get(fam) ?? "var(--ramune)",
      languages: v,
    });
  }
  if (orphans.length > 0) {
    shelves.push({
      key: "mixed",
      label: "mixed & more",
      blurb: "uncategorized",
      ink: "var(--graphite)",
      languages: orphans,
    });
  }
  return shelves;
}

function assignGlobalIndices(shelves: Shelf[]): Map<string, number> {
  const indexById = new Map<string, number>();
  let i = 0;
  for (const shelf of shelves) {
    for (const lang of shelf.languages) {
      indexById.set(lang.entity_id, i);
      i += 1;
    }
  }
  return indexById;
}

function galleryCardAttributes(
  lang: DesignLanguage,
  taxonomyByLang?: Map<string, string[]>,
) {
  const fields = lang.fields as Record<string, unknown>;
  // Prefer the canonical leaf ids (the projected field is unreliable — ARN-97),
  // so the taxonomy filter actually matches.
  const taxonomyIds = (
    taxonomyByLang?.get(lang.entity_id) ?? listFieldValues(fields.taxonomy_ids)
  ).join("\t");
  const tags = listFieldValues(fields.tags).map((t) => t.toLowerCase());
  const searchText = [fields.name, fields.tags]
    .map(searchTextFromValue)
    .join(" ")
    .toLowerCase();
  return {
    status: lang.status,
    taxonomyIds,
    searchText,
    tags,
    hue: dominantHueBucket(lang),
    specimen: tags.includes("specimen"),
  };
}

function matchesFilters(
  attrs: ReturnType<typeof galleryCardAttributes>,
  filters: {
    status: string;
    taxonomy: string;
    search: string;
    tag: string;
    hue: string;
    source: string;
  },
) {
  const matchesStatus = filters.status === "all" || attrs.status === filters.status;
  const matchesTaxonomy =
    filters.taxonomy === "all" ||
    attrs.taxonomyIds.split("\t").includes(filters.taxonomy);
  const query = filters.search.trim().toLowerCase();
  const matchesSearch = !query || attrs.searchText.includes(query);
  const matchesTag = filters.tag === "all" || attrs.tags.includes(filters.tag);
  const matchesHue = filters.hue === "all" || attrs.hue === filters.hue;
  const matchesSource =
    filters.source === "all" ||
    (filters.source === "library" ? !attrs.specimen : attrs.specimen);
  return (
    matchesStatus &&
    matchesTaxonomy &&
    matchesSearch &&
    matchesTag &&
    matchesHue &&
    matchesSource
  );
}

/** The most common tags across the catalog become the "vibe" chips.
 *  "specimen" is housekeeping, not a vibe. */
function collectTopTags(
  attrs: Iterable<ReturnType<typeof galleryCardAttributes>>,
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const a of attrs) {
    for (const tag of a.tags) {
      if (tag === "specimen") continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([tag, count]) => ({ tag, count }));
}

/** Bucket a language's primary token color into a hue family so the ink
 *  explorer can filter the wall by color. Shared with the taste deck so
 *  both speak the same hue vocabulary. */
export function dominantHueBucket(lang: DesignLanguage): string {
  const tokens = parseMaybeJson(lang.fields.tokens) as
    | { colors?: Record<string, string> }
    | undefined;
  const hex =
    tokens?.colors?.primary ?? tokens?.colors?.accent ?? undefined;
  if (!hex || !/^#[0-9a-f]{3,8}$/i.test(hex)) return "neutral";
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return "neutral";
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < 0.14) return "neutral";
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  if (h >= 345 || h < 15) return "red";
  if (h < 45) return "orange";
  if (h < 75) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "teal";
  if (h < 260) return "blue";
  if (h < 300) return "violet";
  return "pink";
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function listFieldValues(value: unknown): string[] {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  return [];
}

function searchTextFromValue(value: unknown): string {
  const parsed = parseMaybeJson(value);
  if (parsed === null || parsed === undefined) return "";
  if (typeof parsed === "string") return parsed;
  if (typeof parsed === "number" || typeof parsed === "boolean") return String(parsed);
  if (Array.isArray(parsed)) return parsed.map(searchTextFromValue).join(" ");
  if (typeof parsed === "object") {
    return Object.values(parsed).map(searchTextFromValue).join(" ");
  }
  return "";
}
