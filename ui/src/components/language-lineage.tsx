import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import {
  listDesignLanguages,
  getDesignLanguage,
  listArtStyles,
  getFileUrl,
  parseJson,
  artStyleDisplayName,
  type DesignLanguage,
} from "@/lib/odata";

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

const isHex = (c?: string): c is string =>
  typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c);

function swatch(fields: { tokens?: string }): string[] {
  const colors = parseJson<TokensLite>(fields.tokens)?.colors ?? {};
  return [colors.primary, colors.secondary, colors.accent, colors.bg, colors.surface]
    .filter(isHex)
    .slice(0, 3);
}

const LINEAGE_LABEL: Record<string, string> = {
  refinement: "Refined from",
  refined: "Refined from",
  evolution: "Evolved from",
  reimagination: "Reimagined from",
  descendant: "Descended from",
};

/** A small language chip — color swatch + name + status, linking to its page. */
function LangChip({ lang }: { lang: DesignLanguage }) {
  const colors = swatch(lang.fields);
  return (
    <Link
      href={`/language/${lang.entity_id}`}
      className="group flex items-center gap-3 rounded-[16px] bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
    >
      <span className="flex shrink-0 overflow-hidden rounded-[9999px]">
        {colors.length > 0 ? (
          colors.map((c, i) => (
            <span key={i} className="h-5 w-3" style={{ background: c }} />
          ))
        ) : (
          <span className="h-5 w-9 bg-foreground/10" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold leading-tight tracking-[-0.01em]">
          {lang.fields.name || "Untitled"}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {lang.status}
        </span>
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

/**
 * Lineage + art style for a design language — surfaces the real entity graph
 * on the detail page: the art style the language is built with, the
 * ancestor(s) it descends from, and the children that descend from it.
 *
 * NOTE: the language→art-style link is carried today by
 * imagery_direction.pairs_with (a slug), not the first-class
 * default_art_style_id, so we resolve by slug. Once slugs are unique +
 * default_art_style_id is backfilled this becomes an exact id join.
 */
export async function LanguageLineage({
  currentId,
  fields,
}: {
  currentId: string;
  fields: Record<string, string | undefined>;
}) {
  const imagery = parseJson<{ pairs_with?: string }>(fields.imagery_direction) ?? {};
  const artSlug =
    fields.default_art_style_id ? undefined : imagery.pairs_with?.trim();
  const parentIds = parseJson<string[]>(fields.parent_ids) ?? [];
  const lineageType = (fields.lineage_type || "").toLowerCase();

  // Published list drives children + art-style resolve; parents are fetched by
  // id directly (a source parent is often still UnderReview).
  let published: DesignLanguage[] = [];
  let arts: Awaited<ReturnType<typeof listArtStyles>> = [];
  try {
    [published, arts] = await Promise.all([
      listDesignLanguages("Status eq 'Published'").catch(() => []),
      listArtStyles("Status eq 'Published'").catch(() => []),
    ]);
  } catch {
    /* empty-safe */
  }

  const art =
    fields.default_art_style_id
      ? arts.find((a) => a.entity_id === fields.default_art_style_id)
      : artSlug
        ? arts.find((a) => a.fields.slug === artSlug)
        : undefined;

  const parents = (
    await Promise.all(
      parentIds.map((pid) => getDesignLanguage(pid).catch(() => null)),
    )
  ).filter((l): l is DesignLanguage => Boolean(l && l.fields.name));

  const children = published.filter(
    (l) =>
      l.entity_id !== currentId &&
      (parseJson<string[]>(l.fields.parent_ids) ?? []).includes(currentId),
  );

  if (!art && parents.length === 0 && children.length === 0) return null;

  const artThumb = art?.fields.thumbnail_file_id
    ? getFileUrl(art.fields.thumbnail_file_id)
    : "";
  const parentLabel = LINEAGE_LABEL[lineageType] || "Descended from";

  return (
    <section aria-label="Lineage and art style" className="space-y-7">
      <div className="sticker-perforation" />
      <div className="flex items-end gap-3">
        <span
          className="ink-stamp shrink-0"
          style={{ ["--ink" as string]: "var(--matcha, #2f9e6e)" }}
        >
          lineage
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          Family &amp; art style
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Art style the language is built with */}
        {art ? (
          <div className="space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Built with the art style
            </span>
            <Link
              href={`/art-styles/${art.entity_id}`}
              className="group flex items-stretch gap-4 overflow-hidden rounded-[16px] bg-muted/50 transition-colors hover:bg-muted"
            >
              <span
                className="h-auto w-28 shrink-0 bg-cover bg-center sm:w-32"
                style={
                  artThumb
                    ? { backgroundImage: `url(${artThumb})` }
                    : { background: "var(--foreground)", opacity: 0.06 }
                }
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-4">
                <span className="font-display text-[18px] font-bold leading-tight tracking-[-0.01em]">
                  {artStyleDisplayName(art.fields)}
                </span>
                {art.fields.medium ? (
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {art.fields.medium}
                  </span>
                ) : null}
                <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-foreground/80 group-hover:text-foreground">
                  View art style
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </span>
            </Link>
          </div>
        ) : (
          <span />
        )}

        {/* Ancestry + descendants */}
        {parents.length > 0 || children.length > 0 ? (
          <div className="space-y-5">
            {parents.length > 0 ? (
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  {parentLabel}
                </span>
                <div className="grid gap-2">
                  {parents.map((p) => (
                    <LangChip key={p.entity_id} lang={p} />
                  ))}
                </div>
              </div>
            ) : null}
            {children.length > 0 ? (
              <div className="space-y-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {children.length} descendant{children.length === 1 ? "" : "s"}
                </span>
                <div className="grid gap-2">
                  {children.map((c) => (
                    <LangChip key={c.entity_id} lang={c} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
