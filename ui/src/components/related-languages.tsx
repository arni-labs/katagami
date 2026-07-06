import { ArrowUpRight } from "lucide-react";
import { TrackedLink } from "@/components/tracked-link";
import { listDesignLanguages, parseJson } from "@/lib/odata";
import { cosineSimilarity, parseStoredTasteVector } from "@/lib/embeddings";

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

/** "More like this" — nearest neighbors in the stored taste-vector space when
 *  the current language carries one; tag overlap otherwise. Ships empty-safe. */
export async function RelatedLanguages({
  currentId,
  currentTags,
}: {
  currentId: string;
  currentTags: string[];
}) {
  let candidates: Awaited<ReturnType<typeof listDesignLanguages>>;
  try {
    // Full canonical read (no $select) — the projected $select read omits some
    // published languages, which would silently drop them from "related".
    candidates = await listDesignLanguages("Status eq 'Published'");
  } catch {
    return null;
  }

  const wanted = new Set(currentTags.map((t) => t.toLowerCase()));
  const sharedTags = (l: (typeof candidates)[number]) =>
    (parseJson<string[]>(l.fields.tags) ?? [])
      .map((t) => t.toLowerCase())
      .filter((t) => t !== "specimen" && wanted.has(t));

  const currentVector = parseStoredTasteVector(
    candidates.find((l) => l.entity_id === currentId)?.fields ?? {},
  );

  const siblings = candidates.filter(
    (l) => l.entity_id !== currentId && l.fields.name,
  );
  const byScoreThenName = (
    a: { score: number; lang: (typeof candidates)[number] },
    b: { score: number; lang: (typeof candidates)[number] },
  ) =>
    b.score - a.score || a.lang.fields.name!.localeCompare(b.lang.fields.name!);

  // Vector-ranked neighbors first; siblings without a stored vector (e.g.
  // published while the embed service was down) still surface via tag overlap
  // rather than disappearing from every "More like this" until a backfill.
  const vectorRanked = currentVector
    ? siblings
        .map((l) => {
          const vector = parseStoredTasteVector(l.fields);
          return {
            lang: l,
            shared: sharedTags(l),
            score: vector ? cosineSimilarity(currentVector, vector) : -1,
          };
        })
        .filter((r) => r.score > 0)
        .sort(byScoreThenName)
    : [];
  const inVectorList = new Set(vectorRanked.map((r) => r.lang.entity_id));
  const tagRanked =
    currentTags.length > 0
      ? siblings
          .filter(
            (l) =>
              !inVectorList.has(l.entity_id) &&
              (!currentVector || !parseStoredTasteVector(l.fields)),
          )
          .map((l) => {
            const shared = sharedTags(l);
            return { lang: l, shared, score: shared.length };
          })
          .filter((r) => r.score > 0)
          .sort(byScoreThenName)
      : [];
  const scored = [...vectorRanked, ...tagRanked].slice(0, 6);

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
