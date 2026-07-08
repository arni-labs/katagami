import { ArrowUpRight } from "lucide-react";
import { TrackedLink } from "@/components/tracked-link";
import {
  type DesignLanguage,
  listDesignLanguages,
  nearestDesignLanguages,
  parseJson,
} from "@/lib/odata";

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

const RELATED_LIMIT = 6;

/** "More like this" — the design languages nearest in taste-vector space, ranked
 *  by the kernel's Temper.Nearest over the declared `taste` vector path. Tag
 *  overlap is the fallback for the pre-embed / no-vector case only. Empty-safe. */
export async function RelatedLanguages({
  currentId,
  currentTags,
}: {
  currentId: string;
  currentTags: string[];
}) {
  const wanted = new Set(currentTags.map((t) => t.toLowerCase()));
  const sharedTags = (l: DesignLanguage) =>
    (parseJson<string[]>(l.fields.tags) ?? [])
      .map((t) => t.toLowerCase())
      .filter((t) => t !== "specimen" && wanted.has(t));

  // Primary path: the kernel ranks the nearest published languages in taste
  // space (deterministic, budgeted, governed) — the reference is excluded and
  // the Published filter is applied server-side before ranking.
  const neighbours = await nearestDesignLanguages({
    to: currentId,
    k: RELATED_LIMIT,
    filter: "Status eq 'Published'",
  });

  let scored: { lang: DesignLanguage; shared: string[] }[];
  if (neighbours && neighbours.length > 0) {
    scored = neighbours
      .filter((l) => l.entity_id !== currentId && l.fields.name)
      .map((l) => ({ lang: l, shared: sharedTags(l) }))
      .slice(0, RELATED_LIMIT);
  } else {
    // Fallback (pre-embed / no-vector window only): a language carrying no taste
    // vector yet still gets "More like this" via tag overlap, rather than an
    // empty section until the backfill reaches it.
    scored = await relatedByTagOverlap(currentId, currentTags, sharedTags);
  }

  if (scored.length === 0) return null;

  return (
    <section aria-label="Related design languages">
      <div className="sticker-perforation mb-8" />
      <div className="mb-5 flex items-end gap-3">
        <span className="ink-stamp shrink-0" style={{ ["--ink" as string]: "var(--ramune)" }}>
          related
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          More like this
        </h2>
      </div>
      <div data-reveal-children className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scored.map(({ lang, shared }) => {
          const colors =
            parseJson<TokensLite>(lang.fields.tokens)?.colors ?? {};
          const swatch = [colors.primary, colors.secondary, colors.accent].filter(
            (c): c is string => Boolean(c),
          );
          const ink = swatch[0] ?? "var(--teal)";
          return (
            <TrackedLink
              key={lang.entity_id}
              href={`/language/${lang.entity_id}`}
              prefetch={false}
              className="group relative flex items-center gap-3 bg-card/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-[2px]"
              style={{
                boxShadow: "var(--shadow-card)",
              }}
              event="language_click"
              data={{ language_id: lang.entity_id, language_name: lang.fields.name, source: "related" }}
            >
              <span aria-hidden className="flex shrink-0 flex-col gap-[2px]">
                {(swatch.length > 0 ? swatch : [ink]).slice(0, 3).map((c, i) => (
                  <span key={i} className="h-2.5 w-2.5" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold leading-snug text-foreground">
                  {lang.fields.name}
                </span>
                <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  {shared.length > 0
                    ? `shares ${shared.slice(0, 3).join(" · ")}`
                    : "nearest in taste"}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </TrackedLink>
          );
        })}
      </div>
    </section>
  );
}

/** Tag-overlap ranking over the published catalog — the fallback used only when
 *  the reference language carries no taste vector yet (the pre-embed window), so
 *  it still gets a "More like this" until the backfill reaches it. */
async function relatedByTagOverlap(
  currentId: string,
  currentTags: string[],
  sharedTags: (l: DesignLanguage) => string[],
): Promise<{ lang: DesignLanguage; shared: string[] }[]> {
  if (currentTags.length === 0) return [];
  let candidates: DesignLanguage[];
  try {
    // Full canonical read (no $select) — the projected $select read omits some
    // published languages, which would silently drop them from "related".
    candidates = await listDesignLanguages("Status eq 'Published'");
  } catch {
    return [];
  }
  return candidates
    .filter((l) => l.entity_id !== currentId && l.fields.name)
    .map((l) => ({ lang: l, shared: sharedTags(l) }))
    .filter((r) => r.shared.length > 0)
    .sort(
      (a, b) =>
        b.shared.length - a.shared.length ||
        a.lang.fields.name!.localeCompare(b.lang.fields.name!),
    )
    .slice(0, RELATED_LIMIT);
}
