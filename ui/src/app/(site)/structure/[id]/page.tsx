import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { NarrativeMovementsView } from "@/components/narrative-movements";
import { StructureHandoff } from "@/components/structure-handoff";
import { InkStamp, StatusStamp } from "@/components/encyclopedia/chrome";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadNarrativeStructure } from "@/lib/narrative-structure-data";
import { buildStructureHandoff, orderedMovements } from "@/lib/narrative-structures";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Narrative structure — Katagami",
  robots: { index: false, follow: false },
};

const SOURCE_LABEL = {
  public_domain: "public domain",
  cited_and_paraphrased: "cited and paraphrased",
} as const;

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="pt-6">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span aria-hidden className="inline-block h-[3px] w-6 bg-[var(--sakura)]" />
        {eyebrow}
      </div>
      {children}
    </section>
  );
}

export default async function NarrativeStructureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { id } = await params;
  const loaded = await loadNarrativeStructure(id);
  if (!loaded) notFound();

  const { structure, source } = loaded;
  const movements = orderedMovements(structure.movements);
  const handoff = buildStructureHandoff(structure);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24">
      <div className="pt-6 sm:pt-8">
        <Link
          href="/structure"
          className="group inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
          all narrative structures
        </Link>
      </div>

      <header className="riso-reveal relative pt-7">
        <span
          aria-hidden
          className="halftone-wash -right-8 -top-2 hidden h-44 w-64 sm:block"
          style={{ ["--wash-ink" as string]: "var(--ramune)" }}
        />
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <StatusStamp status={structure.status} />
          <InkStamp ink={structure.movements.kind === "fixed" ? "var(--ramune)" : "var(--yuzu)"} tilt={1}>
            {structure.movements.kind === "fixed" ? "fixed sequence" : "variable rule"}
          </InkStamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {source === "fixture" ? "approved fixture" : "Temper record"}
          </span>
        </div>
        <h1 className="font-display text-[34px] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[44px]">
          {structure.name}
        </h1>
        <p className="mt-4 max-w-3xl text-[19px] leading-[1.55] text-foreground">{structure.instruction}</p>
        {structure.aliases.length ? (
          <div className="mt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Also known as</p>
            <ul className="flex flex-wrap gap-2">
              {structure.aliases.map((alias) => (
                <li
                  key={alias}
                  lang={/[^\u0000-\u007f]/.test(alias) ? "und" : undefined}
                  className="bg-[color-mix(in_srgb,var(--ramune)_10%,var(--paper-stamp-mix))] px-2.5 py-1 text-[17px] text-foreground shadow-[var(--shadow-sticker)]"
                >
                  {alias}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <span aria-hidden className="sticker-perforation mt-7 block" />
      </header>

      <div className="space-y-10 pt-9">
        <StructureHandoff text={handoff} id={structure.id} name={structure.name} />

        <Section eyebrow="ordered movements">
          <div
            className="sticker-card p-5 sm:p-7"
            style={{
              ["--card-ink" as string]: structure.movements.kind === "fixed" ? "var(--ramune)" : "var(--yuzu)",
            }}
          >
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">
                {structure.movements.kind === "fixed" ? "Every part, in order" : "The rule and one possible outline"}
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                {movements.length} {structure.movements.kind === "fixed" ? "parts" : "example units"}
              </span>
            </div>
            <NarrativeMovementsView movements={structure.movements} />
          </div>
        </Section>

        <Section eyebrow="named works">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {structure.exemplars.map((exemplar, index) => (
              <article
                key={`${exemplar.work}-${exemplar.creator ?? ""}`}
                className="sticker-card p-5"
                style={{
                  ["--card-ink" as string]: ["var(--sakura)", "var(--yuzu)", "var(--ramune)"][index % 3],
                }}
              >
                <h3 className="font-display text-[20px] font-bold leading-tight tracking-[-0.02em]">{exemplar.work}</h3>
                {exemplar.creator ? (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {exemplar.creator}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </Section>

        <Section eyebrow="sources">
          <div className="grid gap-4">
            {structure.sources.map((item) => (
              <article key={item.url} className="sticker-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-2xl text-[18px] font-semibold leading-relaxed text-foreground">{item.title}</h3>
                  <InkStamp ink={item.handling === "public_domain" ? "var(--yuzu)" : "var(--ramune)"} tilt={-1}>
                    {SOURCE_LABEL[item.handling]}
                  </InkStamp>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-foreground underline decoration-[var(--ramune)] decoration-2 underline-offset-[3px] hover:decoration-[var(--yuzu)]"
                >
                  open the source <ArrowUpRight size={12} aria-hidden />
                </a>
              </article>
            ))}
          </div>
        </Section>

        {structure.encyclopediaCellIds.length ? (
          <Section eyebrow="encyclopedia">
            <p className="mb-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              The encyclopedia records the corresponding form or genre. This page supplies the instructions for arranging a new work.
            </p>
            <ul className="flex flex-wrap gap-3">
              {structure.encyclopediaCellIds.map((cellId) => (
                <li key={cellId}>
                  <Link
                    href={`/encyclopedia?cell=${encodeURIComponent(cellId)}`}
                    className="inline-flex h-10 items-center bg-[color-mix(in_srgb,var(--sakura)_12%,var(--paper-stamp-mix))] px-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] motion-reduce:hover:translate-y-0"
                  >
                    {cellId.replace(/-/g, " ")}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
