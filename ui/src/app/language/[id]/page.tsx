import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, GitCompare } from "lucide-react";
import { getDesignLanguage, listTaxonomies, parseJson } from "@/lib/odata";
import { SpecPanel } from "@/components/spec-panel";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { DesignShowcase } from "@/components/design-showcase";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  SectionHeading,
  Stamp,
  Perforation,
} from "@/components/scrapbook";

const statusColor: Record<string, string> = {
  Draft: "matcha",
  UnderReview: "yuzu",
  Published: "salad",
  Archived: "sakura",
};

export default async function LanguageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lang;
  try {
    lang = await getDesignLanguage(id);
  } catch {
    notFound();
  }

  const f = lang.fields;
  const c = lang.counters;
  const tags = parseJson<string[]>(f.tags) ?? [];
  const parentIds = parseJson<string[]>(f.parent_ids) ?? [];
  const taxonomyIds = parseJson<string[]>(f.taxonomy_ids) ?? [];
  const elementCount =
    c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);

  let taxonomyNames: { id: string; name: string }[] = [];
  if (taxonomyIds.length > 0) {
    try {
      const allTax = await listTaxonomies("Status eq 'Published'");
      taxonomyNames = taxonomyIds
        .map((tid) => {
          const tax = allTax.find((t) => t.entity_id === tid);
          return tax
            ? { id: tid, name: tax.fields.name ?? "Unnamed" }
            : null;
        })
        .filter((t): t is { id: string; name: string } => t !== null);
    } catch {
      // best-effort lookup
    }
  }

  const accent = statusColor[lang.status] ?? "teal";
  const name = f.name || "Untitled";

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      {/* Back link */}
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to gallery
      </Link>

      {/* Hero */}
      <PageHero
        eyebrowAccent={accent as never}
        eyebrow={
          <>
            <span>design language</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              {f.slug || id.slice(0, 12)}
            </span>
          </>
        }
        title={<Marker color={accent as never}>{name}</Marker>}
        description={
          <>
            A complete design system — philosophy, tokens, rules, imagery, and
            an embodied preview. Edit curator notes below, or open side-by-side
            comparison to see how it relates.
          </>
        }
        rightSlot={
          <>
            <Stamp color={accent as never}>{lang.status}</Stamp>
            <Stamp color="teal" rotate={3}>
              v{c.version ?? 0}
            </Stamp>
            <span className="pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {elementCount} elements
            </span>
          </>
        }
      />

      {/* Action row — sticker buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton href={`/compare?a=${id}`} tint="sumire">
          <GitCompare className="h-3.5 w-3.5" />
          Compare
        </ActionButton>
        <ActionButton href={`/lineage?root=${id}`} tint="salad">
          <GitBranch className="h-3.5 w-3.5" />
          Lineage
        </ActionButton>
      </div>

      {/* Meta strip — compact, divided, cute */}
      <section className="relative">
        <WashiTape
          color="salad"
          rotate={-4}
          className="-left-3 -top-2"
          width={72}
        />
        <WashiTape
          color="sakura"
          rotate={5}
          className="-right-3 -top-2"
          width={52}
        />
        <StickyNote className="p-4">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-dashed lg:divide-border">
            {/* Lineage */}
            <div className="lg:pl-0 lg:pr-4">
              <MiniRule label="lineage" color="sakura" />
              <div className="font-display text-[15px] font-bold leading-none tracking-tight">
                {f.lineage_type ?? "original"}
                {f.lineage_type !== "original" && (
                  <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">
                    gen {f.generation_number ?? "?"}
                  </span>
                )}
              </div>
              {parentIds.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {parentIds.slice(0, 2).map((pid) => (
                    <Link
                      key={pid}
                      href={`/language/${pid}`}
                      className="font-mono text-[10px] text-foreground/70 underline decoration-[var(--yuzu)] decoration-2 underline-offset-2 hover:text-foreground"
                    >
                      {pid.slice(0, 10)}…
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="lg:px-4">
              <MiniRule label="stats" color="teal" />
              <div className="flex items-baseline gap-3">
                <InlineStat value={c.usage_count ?? 0} label="uses" />
                <span className="text-foreground/15">·</span>
                <InlineStat value={c.fork_count ?? 0} label="forks" />
                <span className="text-foreground/15">·</span>
                <InlineStat value={elementCount} label="elem" />
              </div>
            </div>

            {/* Taxonomies */}
            <div className="lg:px-4">
              <MiniRule label="taxonomies" color="salad" />
              {taxonomyNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {taxonomyNames.map((t, i) => {
                    const rot = ((t.id.charCodeAt(0) % 7) - 3) * 0.4;
                    return (
                      <span
                        key={t.id}
                        className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium text-foreground/85"
                        style={{
                          transform: `rotate(${rot}deg)`,
                          background: `color-mix(in oklch, var(--${
                            ["salad", "teal", "sumire", "sakura", "yuzu"][i % 5]
                          }) 36%, white)`,
                        }}
                      >
                        {t.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="font-mono text-[11px] text-muted-foreground/80">
                  unclassified
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="lg:pl-4 lg:pr-0">
              <MiniRule label="tags" color="yuzu" />
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t, i) => {
                    const rot = ((t.charCodeAt(0) % 7) - 3) * 0.4;
                    return (
                      <span
                        key={t}
                        className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium text-foreground/85"
                        style={{
                          transform: `rotate(${rot}deg)`,
                          background: `color-mix(in oklch, var(--${
                            [
                              "sakura",
                              "yuzu",
                              "salad",
                              "teal",
                              "ramune",
                              "sumire",
                            ][i % 6]
                          }) 36%, white)`,
                        }}
                      >
                        {t}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="font-mono text-[11px] text-muted-foreground/80">
                  no tags yet
                </span>
              )}
            </div>
          </div>
        </StickyNote>
      </section>

      <Perforation />

      {/* Spec + Embodiment — side-by-side on lg+, narrower spec */}
      <div className="grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionHeading eyebrow="the spec" eyebrowColor="teal">
            <Marker color="teal">specification</Marker>
          </SectionHeading>
          <StickyNote className="p-5">
            <SpecPanel
              philosophy={f.philosophy}
              tokens={f.tokens}
              rules={f.rules}
              layout={f.layout_principles}
              guidance={f.guidance}
              imageryDirection={f.imagery_direction}
              generativeCanvas={f.generative_canvas}
            />
          </StickyNote>
        </section>

        <section className="lg:col-span-3">
          <SectionHeading eyebrow="in the wild" eyebrowColor="sakura">
            <Marker color="salad">design embodiment</Marker>
          </SectionHeading>
          {f.embodiment_file_id ? (
            <div className="relative">
              <WashiTape
                color="sakura"
                rotate={-4}
                className="-left-4 -top-3"
                width={100}
              />
              <WashiTape
                color="salad"
                rotate={5}
                className="-right-4 -top-3"
                width={80}
              />
              <div className="relative rounded-[2px] border border-border bg-white p-3 pb-10 shadow-[0_4px_16px_rgba(30,35,45,0.08)]">
                <EmbodimentViewer fileId={f.embodiment_file_id} />
                <span className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                  preview · {f.slug || id.slice(0, 12)}
                </span>
              </div>
            </div>
          ) : f.tokens ? (
            <StickyNote tint="teal" className="p-6">
              <DesignShowcase tokensRaw={f.tokens} languageName={name} />
            </StickyNote>
          ) : (
            <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
              no embodiment or tokens defined yet
            </StickyNote>
          )}
        </section>
      </div>
    </div>
  );
}

function ActionButton({
  href,
  tint,
  children,
}: {
  href: string;
  tint: "sakura" | "yuzu" | "salad" | "teal" | "sumire";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-1.5 border border-border bg-white/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg] hover:text-foreground"
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-40"
        style={{ background: `var(--${tint})` }}
      />
      <span className="relative flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

function MiniRule({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span
        className="inline-block h-[2px] w-4 rounded-[1px]"
        style={{ background: `var(--${color})` }}
      />
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function InlineStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-display text-base font-bold leading-none tracking-tight">
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
