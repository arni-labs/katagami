import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";
import { GalleryFilters } from "@/components/gallery-filters";
import { RegMark } from "@/components/scrapbook";

/** Drawers only make sense once the catalog outgrows a single wall. */
const DRAWER_THRESHOLD = 24;
const DRAWER_INKS = ["var(--ramune)", "var(--sakura)", "var(--yuzu)"];

export function LanguageGallery({
  languages,
  canDelete,
  taxonomies = [],
  initialFilters,
}: {
  languages: DesignLanguage[];
  canDelete: boolean;
  taxonomies?: { entity_id: string; fields: { name?: string } }[];
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
    languages.map((lang) => [lang.entity_id, galleryCardAttributes(lang)]),
  );
  const topTags = collectTopTags(attrsById.values());
  const hasSpecimens = Array.from(attrsById.values()).some((a) => a.specimen);

  // Organize the wall into labeled drawers by dominant vibe, like a flat
  // file in a print shop — a browser who doesn't know what they want can
  // pull a drawer instead of scanning an undifferentiated grid. Below the
  // threshold everything lives in one unlabeled drawer.
  const drawers = buildDrawers(languages, attrsById, topTags);
  // Global card position across drawers — drives eager thumbnail loading.
  const indexById = assignGlobalIndices(drawers);

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

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {drawers.map((drawer, drawerIdx) => {
          const { label, languages } = drawer;
          const ink = DRAWER_INKS[drawerIdx % DRAWER_INKS.length];
          const anyVisible = languages.some((lang) =>
            matchesFilters(attrsById.get(lang.entity_id)!, filters),
          );
          return (
            <div key={label ?? "all"} className="contents">
              {label !== null && (
                <div
                  data-drawer-header={label}
                  hidden={!anyVisible}
                  className="col-span-full mt-3 flex min-w-0 items-center gap-3 first:mt-0"
                >
                  <span
                    aria-hidden
                    className="h-[11px] w-10 shrink-0 skew-x-[-8deg] opacity-75"
                    style={{
                      background: ink,
                      mixBlendMode: "var(--ink-blend)" as never,
                    }}
                  />
                  <span
                    className="ink-stamp shrink-0"
                    style={{ ["--ink" as string]: ink }}
                  >
                    {label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {languages.length}
                  </span>
                  <span className="sticker-perforation min-w-0 flex-1" />
                  <RegMark className="shrink-0" />
                </div>
              )}
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
                    data-drawer={label ?? undefined}
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

interface Drawer {
  /** null = the single unlabeled drawer used for small catalogs. */
  label: string | null;
  languages: DesignLanguage[];
}

/** Assign every language to its most popular tag's drawer (first match in
 *  topTags order). Languages matching no top tag land in "miscellany". */
function buildDrawers(
  languages: DesignLanguage[],
  attrsById: Map<string, ReturnType<typeof galleryCardAttributes>>,
  topTags: Array<{ tag: string; count: number }>,
): Drawer[] {
  if (languages.length <= DRAWER_THRESHOLD || topTags.length === 0) {
    return [{ label: null, languages }];
  }
  const order = topTags.map((t) => t.tag);
  const byLabel = new Map<string, DesignLanguage[]>();
  for (const lang of languages) {
    const attrs = attrsById.get(lang.entity_id)!;
    const home = order.find((tag) => attrs.tags.includes(tag)) ?? "miscellany";
    const bucket = byLabel.get(home) ?? [];
    bucket.push(lang);
    byLabel.set(home, bucket);
  }
  const drawers: Drawer[] = [];
  for (const tag of [...order, "miscellany"]) {
    const bucket = byLabel.get(tag);
    if (bucket && bucket.length > 0) drawers.push({ label: tag, languages: bucket });
  }
  return drawers;
}

function assignGlobalIndices(drawers: Drawer[]): Map<string, number> {
  const indexById = new Map<string, number>();
  let i = 0;
  for (const drawer of drawers) {
    for (const lang of drawer.languages) {
      indexById.set(lang.entity_id, i);
      i += 1;
    }
  }
  return indexById;
}

function galleryCardAttributes(lang: DesignLanguage) {
  const fields = lang.fields as Record<string, unknown>;
  const taxonomyIds = listFieldValues(fields.taxonomy_ids).join("\t");
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
 *  explorer can filter the wall by color. */
function dominantHueBucket(lang: DesignLanguage): string {
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
