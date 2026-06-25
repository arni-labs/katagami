import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import {
  listDesignLanguages,
  getDesignLanguage,
  parseJson,
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

/** A small language chip — color swatch + name + status, linking to its page.
 *  Katagami sticker: sharp, borderless, tinted by the language's own ink. */
function LangChip({ lang }: { lang: DesignLanguage }) {
  const colors = swatch(lang.fields);
  const tint = colors[0] ?? "var(--ramune)";
  return (
    <Link
      href={`/language/${lang.entity_id}`}
      className="sticker-card group flex items-center gap-3 px-4 py-3"
      style={{ ["--card-ink" as string]: tint }}
    >
      <span className="flex shrink-0 overflow-hidden">
        {colors.length > 0 ? (
          colors.map((c, i) => (
            <span key={i} className="h-6 w-3.5" style={{ background: c }} />
          ))
        ) : (
          <span className="h-6 w-10 bg-foreground/10" />
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
 * Lineage for a design language — the ancestor(s) it descends from and the
 * children that descend from it. (The art style + palette a language is built
 * with live in the identity row at the top of the page; see LanguageIdentity.)
 */
export async function LanguageLineage({
  currentId,
  fields,
}: {
  currentId: string;
  fields: Record<string, string | undefined>;
}) {
  const parentIds = parseJson<string[]>(fields.parent_ids) ?? [];
  const lineageType = (fields.lineage_type || "").toLowerCase();

  // Published list drives children; parents are fetched by id directly (a
  // source parent is often still UnderReview).
  let published: DesignLanguage[] = [];
  try {
    published = await listDesignLanguages("Status eq 'Published'").catch(
      () => [],
    );
  } catch {
    /* empty-safe */
  }

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

  if (parents.length === 0 && children.length === 0) return null;

  const parentLabel = LINEAGE_LABEL[lineageType] || "Descended from";

  return (
    <section aria-label="Lineage" className="space-y-7">
      <div className="sticker-perforation" />
      <div className="flex items-end gap-3">
        <span
          className="ink-stamp shrink-0"
          style={{ ["--ink" as string]: "var(--matcha)" }}
        >
          lineage
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          Family
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
        ) : (
          <span />
        )}
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
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
