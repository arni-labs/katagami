import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  taxonomyFamilyIndex,
} from "@/lib/odata";
import { toArtStyleItem, toPaletteItem } from "@/lib/lane-items";
import { ArtStyleCatalog, PaletteCatalog } from "@/components/lane-catalog";
import { LanguageCard } from "@/components/language-card";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Under Review — Katagami",
  description:
    "Submissions awaiting curation — design languages, palettes, and art styles in the queue, separate from the published catalog.",
};

const UNDER_REVIEW = "Status eq 'UnderReview'";

function SectionHeading({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h2 className="font-display text-[24px] font-bold leading-none tracking-[-0.02em]">
        {label}
      </h2>
      <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
        <span
          className="font-bold tabular-nums"
          style={{ color: `var(--${accent})` }}
        >
          {count}
        </span>{" "}
        in review
      </span>
    </div>
  );
}

function NoneYet({ what }: { what: string }) {
  return (
    <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
      No {what} under review.
    </p>
  );
}

export default async function UnderReviewPage() {
  // UnderReview-only — the published catalog lives on the gallery pages; this is
  // the curation queue, kept deliberately separate so the two never mix.
  const owner = await isOwner();
  const [languages, paletteRows, artRows, taxFamily] = await Promise.all([
    listDesignLanguages(UNDER_REVIEW).catch(() => []),
    listPaletteSystems(UNDER_REVIEW).catch(() => []),
    listArtStyles(UNDER_REVIEW).catch(() => []),
    taxonomyFamilyIndex().catch(
      () => new Map<string, { name: string; parentId: string }>(),
    ),
  ]);
  const categoryNames: Record<string, string> = {};
  for (const [id, info] of taxFamily) categoryNames[id] = info.name;

  const langs = languages.filter((l) => l.fields.name);
  const palettes = paletteRows.map(toPaletteItem);
  const artStyles = artRows.map(toArtStyleItem);
  const total = langs.length + palettes.length + artStyles.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Curation queue"
        eyebrowAccent="yuzu"
        title={
          <>
            Under <Marker color="yuzu">review</Marker>
          </>
        }
        description="Submissions awaiting a curator — across design languages, palettes, and art styles. These aren't published yet; they're shown here, separate from the live catalog, so you can see everything in the queue at once."
        rightSlot={<HeroStat value={total} label="in review" accent="yuzu" />}
      />

      {total === 0 ? (
        <div className="sticker-card mx-auto mt-10 max-w-md p-8 text-center text-sm text-muted-foreground">
          Nothing is under review right now.
          <div className="mt-1 font-mono text-[11px]">
            new submissions land here first
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-16">
          <section className="space-y-5">
            <SectionHeading
              label="Design languages"
              count={langs.length}
              accent="matcha"
            />
            {langs.length ? (
              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {langs.map((l, i) => (
                  <LanguageCard
                    key={l.entity_id}
                    lang={l}
                    index={i}
                    canDelete={owner}
                  />
                ))}
              </div>
            ) : (
              <NoneYet what="design languages" />
            )}
          </section>

          <section className="space-y-5">
            <SectionHeading
              label="Palettes"
              count={palettes.length}
              accent="ramune"
            />
            {palettes.length ? (
              <PaletteCatalog
                items={palettes}
                canArchive={owner}
                categoryNames={categoryNames}
              />
            ) : (
              <NoneYet what="palettes" />
            )}
          </section>

          <section className="space-y-5">
            <SectionHeading
              label="Art styles"
              count={artStyles.length}
              accent="sakura"
            />
            {artStyles.length ? (
              <ArtStyleCatalog
                items={artStyles}
                canArchive={owner}
                categoryNames={categoryNames}
              />
            ) : (
              <NoneYet what="art styles" />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
