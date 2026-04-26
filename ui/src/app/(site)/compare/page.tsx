import { Suspense } from "react";
import { getDesignLanguage, listDesignLanguages, parseJson } from "@/lib/odata";
import { SpecPanel } from "@/components/spec-panel";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { CompareSelector } from "@/components/compare-selector";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  SectionHeading,
  Stamp,
  Perforation,
} from "@/components/scrapbook";

async function ComparisonView({ idA, idB }: { idA: string; idB: string }) {
  const [langA, langB] = await Promise.all([
    getDesignLanguage(idA),
    getDesignLanguage(idB),
  ]);

  const sides = [
    { lang: langA, tint: "sakura" as const, tape: "sakura" as const },
    { lang: langB, tint: "teal" as const, tape: "teal" as const },
  ];

  return (
    <div className="space-y-12">
      {/* Side-by-side headers */}
      <div className="relative grid gap-6 md:grid-cols-2">
        {sides.map(({ lang, tint, tape }, i) => (
          <StickyNote key={lang.entity_id} tint={tint} className="p-5">
            <WashiTape
              color={tape}
              rotate={i === 0 ? -5 : 5}
              className={i === 0 ? "-left-3 -top-2" : "-right-3 -top-2"}
            />
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>{i === 0 ? "side A" : "side B"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{lang.fields.slug || lang.entity_id.slice(0, 10)}</span>
            </div>
            <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em]">
              {lang.fields.name ?? "Untitled"}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Stamp color={tint}>{lang.status}</Stamp>
              <Stamp color="sumire" rotate={-1}>
                {lang.fields.lineage_type ?? "original"}
              </Stamp>
              <Stamp color="salad" rotate={2}>
                v{lang.counters.version ?? 0}
              </Stamp>
            </div>
          </StickyNote>
        ))}
        {/* VS marker floating between */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <span className="font-display text-4xl font-black italic text-foreground/80">
            <Marker color="yuzu">vs.</Marker>
          </span>
        </div>
      </div>

      <Perforation />

      {/* Spec comparison */}
      <section>
        <SectionHeading eyebrow="the specs" eyebrowColor="sumire">
          <Marker color="sumire">specification</Marker>
        </SectionHeading>
        <div className="grid gap-6 md:grid-cols-2">
          {sides.map(({ lang }) => (
            <StickyNote key={lang.entity_id} className="p-5">
              <SpecPanel
                languageId={lang.entity_id}
                name={lang.fields.name}
                slug={lang.fields.slug}
                philosophy={lang.fields.philosophy}
                tokens={lang.fields.tokens}
                rules={lang.fields.rules}
                layout={lang.fields.layout_principles}
                guidance={lang.fields.guidance}
                designMdFileId={lang.fields.design_md_file_id}
                designMdLintResult={lang.fields.design_md_lint_result}
                hasDesignMd={lang.booleans.has_design_md}
                hasValidDesignMd={lang.booleans.has_valid_design_md}
              />
            </StickyNote>
          ))}
        </div>
      </section>

      <Perforation />

      {/* Token diff */}
      <section>
        <SectionHeading eyebrow="token diff" eyebrowColor="yuzu">
          <Marker color="yuzu">what&rsquo;s different</Marker>
        </SectionHeading>
        <StickyNote className="p-5">
          <TokenDiff
            tokensA={parseJson<Record<string, unknown>>(langA.fields.tokens)}
            tokensB={parseJson<Record<string, unknown>>(langB.fields.tokens)}
            nameA={langA.fields.name ?? "A"}
            nameB={langB.fields.name ?? "B"}
          />
        </StickyNote>
      </section>

      <Perforation />

      {/* Embodiment comparison */}
      <section>
        <SectionHeading eyebrow="in the wild" eyebrowColor="sakura">
          <Marker color="salad">embodiments</Marker>
        </SectionHeading>
        <div className="grid gap-6 md:grid-cols-2">
          {sides.map(({ lang, tape }, i) => (
            <div key={lang.entity_id} className="relative">
              <WashiTape
                color={tape}
                rotate={i === 0 ? -3 : 3}
                className={i === 0 ? "-left-3 -top-3" : "-right-3 -top-3"}
                width={90}
              />
              <div className="relative rounded-[2px] border border-border bg-card p-3 pb-8 shadow-[0_3px_12px_rgba(30,35,45,0.07)]">
                {lang.fields.embodiment_file_id &&
                (lang.fields.embodiment_format ?? "html") !== "tsx" ? (
                  <EmbodimentViewer fileId={lang.fields.embodiment_file_id} />
                ) : lang.fields.embodiment_file_id ? (
                  <div className="flex h-[500px] items-center justify-center p-6 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    tsx preview not rendered
                  </div>
                ) : (
                  <div className="flex h-[500px] items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    no embodiment
                  </div>
                )}
                <span className="absolute bottom-2 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                  {lang.fields.name ?? "side"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TokenDiff({
  tokensA,
  tokensB,
  nameA,
  nameB,
}: {
  tokensA: Record<string, unknown> | null;
  tokensB: Record<string, unknown> | null;
  nameA: string;
  nameB: string;
}) {
  if (!tokensA && !tokensB) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        no tokens to compare
      </p>
    );
  }

  const allKeys = new Set([
    ...Object.keys(tokensA ?? {}),
    ...Object.keys(tokensB ?? {}),
  ]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-dashed border-border">
            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              token
            </th>
            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {nameA}
            </th>
            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {nameB}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...allKeys].sort().map((key, i) => {
            const a = tokensA?.[key];
            const b = tokensB?.[key];
            const differs = JSON.stringify(a) !== JSON.stringify(b);
            return (
              <tr
                key={key}
                className="border-b border-dotted border-border/60"
                style={
                  differs
                    ? {
                        background:
                          "color-mix(in oklch, var(--yuzu) 22%, transparent)",
                      }
                    : i % 2 === 0
                      ? { background: "rgba(255,255,255,0.3)" }
                      : undefined
                }
              >
                <td className="p-2 text-muted-foreground">{key}</td>
                <td className="p-2">{formatTokenValue(a)}</td>
                <td className="p-2">{formatTokenValue(b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTokenValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;

  let languages: { entity_id: string; fields: { name?: string } }[] = [];
  try {
    languages = await listDesignLanguages();
  } catch {
    // keep empty
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-10 sm:py-10">
      <PageHero
        eyebrowAccent="sumire"
        eyebrow="side-by-side"
        title={
          <>
            <Marker color="sakura">compare</Marker>{" "}
            <Marker color="teal">two</Marker> design languages
          </>
        }
        description="Pick two design languages to see their philosophies, tokens, and embodied previews side by side. Differences are highlighted."
        rightSlot={
          <>
            <Stamp color="sumire">diff mode</Stamp>
            <Stamp color="yuzu" rotate={3}>
              A vs B
            </Stamp>
          </>
        }
      />

      <CompareSelector
        languages={languages.map((l) => ({
          id: l.entity_id,
          name: l.fields.name ?? l.entity_id,
        }))}
        initialA={sp.a}
        initialB={sp.b}
      />

      {sp.a && sp.b && (
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-80 animate-pulse border border-border bg-muted/50" />
              <div className="h-80 animate-pulse border border-border bg-muted/50" />
            </div>
          }
        >
          <ComparisonView idA={sp.a} idB={sp.b} />
        </Suspense>
      )}

      {(!sp.a || !sp.b) && (
        <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
          pick two design languages above to compare them
        </StickyNote>
      )}
    </div>
  );
}
