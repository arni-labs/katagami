import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { countArtStyles, pageArtStyles } from "@/lib/odata";
import { toArtStyleItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { InfiniteArtStyles } from "@/components/infinite-galleries";
import { CardGridSkeleton } from "@/components/gallery-skeleton";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Art Styles — Katagami",
  description: "Engine-agnostic art-style recipes with portable, reference-independent prompts.",
};

const FIRST_PAGE = 24;

const cachedArtStyleFirstPage = unstable_cache(
  async () => {
    const first = await pageArtStyles({ limit: FIRST_PAGE });
    return {
      items: first.items.map(toArtStyleItem),
      nextCursor: first.nextCursor,
    };
  },
  ["art-style-gallery-first-v1"],
  { revalidate: 60 },
);

const cachedArtStyleCount = unstable_cache(
  () => countArtStyles(),
  ["art-style-gallery-count-v1"],
  { revalidate: 60 },
);

async function ArtStyleCount() {
  const total = await cachedArtStyleCount();
  return <HeroStat value={total} label="art styles" accent="sakura" />;
}

async function ArtStyleGrid({ owner }: { owner: boolean }) {
  const first = await cachedArtStyleFirstPage();
  return (
    <InfiniteArtStyles
      initialItems={first.items}
      initialCursor={first.nextCursor}
      canArchive={owner}
    />
  );
}

export default async function ArtStylesPage() {
  // Owner check is cookie-bound and must stay off the public cache.
  // The catalog itself is Published-only and is cached as a slim card page
  // so a header click is not a 4s Temper collection round-trip.
  const owner = await isOwner();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Art lane"
        eyebrowAccent="sakura"
        title={
          <>
            The <Marker color="sakura">art style</Marker> catalog
          </>
        }
        description="Engine-agnostic style recipes built from portable aesthetic facts. Optional reference images illustrate the result; the prompt works without them."
        rightSlot={
          <Suspense fallback={<HeroStat value="…" label="art styles" accent="sakura" />}>
            <ArtStyleCount />
          </Suspense>
        }
      />
      <div className="mt-10">
        <Suspense fallback={<CardGridSkeleton count={8} />}>
          <ArtStyleGrid owner={owner} />
        </Suspense>
      </div>
    </div>
  );
}
