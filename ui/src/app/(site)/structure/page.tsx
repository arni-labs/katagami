import { notFound } from "next/navigation";
import { NarrativeStructureCard } from "@/components/narrative-structure-card";
import { HeroStat, Marker, PageHero } from "@/components/page-hero";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadNarrativeStructures } from "@/lib/narrative-structure-data";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Narrative structures — Katagami",
  description: "Reusable plans for arranging a complete work before drafting begins.",
  robots: { index: false, follow: false },
};

export default async function NarrativeStructuresPage() {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { structures, source } = await loadNarrativeStructures();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Narrative structures"
        eyebrowAccent="ramune"
        title={
          <>
            Plan the <Marker color="ramune">whole work</Marker>
          </>
        }
        description="A structure tells an agent how to arrange a complete work before the sentences exist. Fixed sequences name every required part; variable rules explain what repeats and how the units relate."
        rightSlot={<HeroStat value={structures.length} label="structures" accent="ramune" />}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Every card includes the movements, so you can compare the order before opening the full record.
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {source === "fixture" ? "approved fixture" : "Temper records"}
        </span>
      </div>

      {structures.length ? (
        <div className="mt-8 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {structures.map((structure, index) => (
            <NarrativeStructureCard key={structure.id} structure={structure} index={index} />
          ))}
        </div>
      ) : (
        <div className="sticker-card mt-10 max-w-xl p-6">
          <p className="text-[17px] leading-relaxed text-muted-foreground">No narrative structures are available.</p>
        </div>
      )}
    </div>
  );
}
