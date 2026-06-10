import Link from "next/link";
import { listDesignLanguages, parseJson } from "@/lib/odata";

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

/** "More like this" — other sheets from the drawer that share tags with the
 *  current language. Tag overlap is the signal; ships empty-safe. */
export async function RelatedLanguages({
  currentId,
  currentTags,
}: {
  currentId: string;
  currentTags: string[];
}) {
  if (currentTags.length === 0) return null;

  let candidates: Awaited<ReturnType<typeof listDesignLanguages>>;
  try {
    candidates = await listDesignLanguages("Status eq 'Published'", undefined, [
      "Id",
      "Status",
      "name",
      "slug",
      "tags",
      "tokens",
    ]);
  } catch {
    return null;
  }

  const wanted = new Set(currentTags.map((t) => t.toLowerCase()));
  const scored = candidates
    .filter((l) => l.entity_id !== currentId && l.fields.name)
    .map((l) => {
      const tags = (parseJson<string[]>(l.fields.tags) ?? []).map((t) =>
        t.toLowerCase(),
      );
      const shared = tags.filter((t) => t !== "specimen" && wanted.has(t));
      return { lang: l, shared, score: shared.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.lang.fields.name!.localeCompare(b.lang.fields.name!))
    .slice(0, 6);

  if (scored.length === 0) return null;

  return (
    <section aria-label="Related design languages">
      <div className="sticker-perforation mb-8" />
      <div className="mb-5 flex items-end gap-3">
        <span className="ink-stamp shrink-0" style={{ ["--ink" as string]: "var(--ramune)" }}>
          same drawer
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          More like this
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scored.map(({ lang, shared }) => {
          const colors =
            parseJson<TokensLite>(lang.fields.tokens)?.colors ?? {};
          const swatch = [colors.primary, colors.secondary, colors.accent].filter(
            (c): c is string => Boolean(c),
          );
          const ink = swatch[0] ?? "var(--teal)";
          return (
            <Link
              key={lang.entity_id}
              href={`/language/${lang.entity_id}`}
              prefetch={false}
              className="group relative flex items-center gap-3 bg-card/80 px-4 py-3.5 transition-all duration-200 hover:-translate-y-[2px]"
              style={{
                boxShadow: `0 1px 2px rgba(33,33,60,0.03), 3px 4px 0 color-mix(in srgb, ${ink} 18%, transparent)`,
              }}
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
                  shares {shared.slice(0, 3).join(" · ")}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 font-mono text-[12px] text-muted-foreground transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
