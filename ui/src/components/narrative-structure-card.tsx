import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NarrativeMovementsView } from "@/components/narrative-movements";
import { orderedMovements, type NarrativeStructure } from "@/lib/narrative-structures";

export function NarrativeStructureCard({ structure, index }: { structure: NarrativeStructure; index: number }) {
  const count = orderedMovements(structure.movements).length;
  return (
    <article
      className="sticker-card riso-reveal flex flex-col p-5 sm:p-6"
      style={{
        ["--card-ink" as string]: structure.movements.kind === "fixed" ? "var(--ramune)" : "var(--yuzu)",
        ["--reveal-i" as string]: Math.min(index, 8),
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>{structure.movements.kind === "fixed" ? "fixed sequence" : "variable rule"}</span>
        <span className="tabular-nums">{count} {structure.movements.kind === "fixed" ? "parts" : "example units"}</span>
      </div>
      <h2 className="mt-4 font-display text-[25px] font-bold leading-[1.08] tracking-[-0.02em]">
        <Link
          href={`/structure/${structure.id}`}
          className="underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors hover:decoration-[var(--sakura)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ramune)]"
        >
          {structure.name}
        </Link>
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">{structure.instruction}</p>
      <span aria-hidden className="sticker-perforation my-5 block" />
      <NarrativeMovementsView movements={structure.movements} compact />
      <div className="mt-auto pt-6">
        <Link
          href={`/structure/${structure.id}`}
          aria-label={`Open ${structure.name}`}
          className="inline-flex h-9 items-center gap-2 bg-foreground px-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-background shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] motion-reduce:hover:translate-y-0"
        >
          Use this structure <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
