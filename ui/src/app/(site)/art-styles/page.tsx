import { countArtStyles, pageArtStyles } from "@/lib/odata";
import { toArtStyleItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { InfiniteArtStyles } from "@/components/infinite-galleries";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Art Styles — Katagami",
  description: "Engine-agnostic art-style recipes: reference images + portable prompts.",
};

export default async function ArtStylesPage() {
  // Published-only. Keyset-paginated + server-searched so the catalog stays fast
  // at any size — the first page renders here, the rest load on scroll.
  const owner = await isOwner();
  const [first, total] = await Promise.all([
    pageArtStyles({ limit: 48 }),
    countArtStyles(),
  ]);
  const items = first.items.map(toArtStyleItem);

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
        description="Engine-agnostic style recipes — reference images plus a portable subject/palette prompt. Remix them onto any UI language and palette in the Studio."
        rightSlot={<HeroStat value={total} label="art styles" accent="sakura" />}
      />
      <div className="mt-10">
        <InfiniteArtStyles
          initialItems={items}
          initialCursor={first.nextCursor}
          canArchive={owner}
        />
      </div>
    </div>
  );
}
