import { notFound } from "next/navigation";
import Link from "next/link";
import { getBakeoffModel } from "@/lib/bakeoff";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { ModelSubmissions } from "./model-submissions";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getBakeoffModel(slug);
  return {
    title: model
      ? `${model.name} — Model Bake Off — Katagami`
      : "Bake-off model — Katagami",
    description: model
      ? `Every design ${model.name} produced across the Katagami model bake-off.`
      : undefined,
  };
}

export default async function BakeoffModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getBakeoffModel(slug);
  if (!model) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <Link
        href="/model-bake-off"
        className="ink-underline inline-block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        All models
      </Link>
      <div className="mt-3">
        <PageHero
          eyebrow="Bake-off · by model"
          eyebrowAccent="ramune"
          title={
            <>
              Everything <Marker color="ramune">{model.name}</Marker> made
            </>
          }
          description={`Every design ${model.name} produced across the bake-off — one per round, each answering a different reimagine brief. Switch any surface between its landing, dashboard, and embodiment right here.`}
          rightSlot={
            <HeroStat value={model.count} label="designs" accent="ramune" />
          }
        />
      </div>

      <ModelSubmissions submissions={model.submissions} />
    </div>
  );
}
