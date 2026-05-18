import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";
import { GalleryFilters } from "@/components/gallery-filters";

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
  };
}) {
  const filters = {
    status: initialFilters?.status ?? "Published",
    taxonomy: initialFilters?.taxonomy ?? "all",
    search: initialFilters?.search ?? "",
  };

  return (
    <>
      <GalleryFilters
        taxonomies={taxonomies}
        initialStatus={filters.status}
        initialTaxonomy={filters.taxonomy}
        initialSearch={filters.search}
      />

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {languages.map((lang, index) => {
          const attrs = galleryCardAttributes(lang);
          return (
            <div
              key={lang.entity_id}
              data-gallery-card
              data-status={attrs.status}
              data-taxonomy-ids={attrs.taxonomyIds}
              data-search-text={attrs.searchText}
              hidden={!matchesFilters(attrs, filters)}
            >
              <LanguageCard
                lang={lang}
                index={index}
                canDelete={canDelete}
              />
            </div>
          );
        })}
      </div>

      <div
        data-gallery-empty
        hidden={languages.some((lang) =>
          matchesFilters(galleryCardAttributes(lang), filters),
        )}
        className="paper-card mx-auto max-w-md rounded-[var(--radius-lg)] p-8 text-center text-sm text-muted-foreground"
      >
        No design languages found.
        <div className="mt-1 font-mono text-[11px]">
          adjust the gallery filters
        </div>
      </div>
    </>
  );
}

function galleryCardAttributes(lang: DesignLanguage) {
  const fields = lang.fields as Record<string, unknown>;
  const taxonomyIds = listFieldValues(fields.taxonomy_ids).join("\t");
  const searchText = [fields.name, fields.tags]
    .map(searchTextFromValue)
    .join(" ")
    .toLowerCase();
  return {
    status: lang.status,
    taxonomyIds,
    searchText,
  };
}

function matchesFilters(
  attrs: ReturnType<typeof galleryCardAttributes>,
  filters: { status: string; taxonomy: string; search: string },
) {
  const matchesStatus = filters.status === "all" || attrs.status === filters.status;
  const matchesTaxonomy =
    filters.taxonomy === "all" ||
    attrs.taxonomyIds.split("\t").includes(filters.taxonomy);
  const query = filters.search.trim().toLowerCase();
  const matchesSearch = !query || attrs.searchText.includes(query);
  return matchesStatus && matchesTaxonomy && matchesSearch;
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
