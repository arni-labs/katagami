import { notFound } from "next/navigation";
import { countWritingStyles, pageWritingStyles } from "@/lib/odata";
import { isOwner } from "@/lib/owner";
import { toWritingStyleItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { WritingStyleCard } from "@/components/writing-style-card";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Voice — Katagami",
  description:
    "Verifiable, consent-clean voice contracts: tone, refusals, and mechanical bands a checker can enforce.",
};

export default async function VoicePage() {
  // Owner-only while the lane seeds: rita's signed-in Google identity
  // (KATAGAMI_OWNER_SUBS) or a plain 404 — the section does not exist
  // for the public yet.
  if (!(await isOwner())) notFound();
  // The voice catalog is young — a single server-rendered page (96) covers it.
  // Keyset infinite scroll joins when the lane outgrows one page.
  const [first, total] = await Promise.all([
    pageWritingStyles({ limit: 96 }),
    countWritingStyles(),
  ]);
  const items = first.items.map(toWritingStyleItem);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Voice lane"
        eyebrowAccent="matcha"
        title={
          <>
            The <Marker color="matcha">voice</Marker> catalog
          </>
        }
        description="Writing styles as checkable contracts: a consented corpus, tone with numbers, refusals that carry the weight, and mechanical bands the finalizer verifies before anything publishes."
        rightSlot={<HeroStat value={total} label="voices" accent="matcha" />}
      />
      <div className="mt-8">
        <a
          href="/voice/intake"
          className="rounded-[9999px] bg-foreground px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85"
        >
          Find your style
        </a>
      </div>

      {items.length ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WritingStyleCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="sticker-card mt-10 max-w-xl p-6">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            The first voices are being verified. Every voice here publishes
            only after its own corpus passes its own mechanical bands and its
            consent basis is attested — a contract, or nothing.
          </p>
        </div>
      )}
    </div>
  );
}
