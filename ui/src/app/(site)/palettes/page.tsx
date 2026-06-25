import {
  countPaletteSystems,
  listFeaturedPaletteSystems,
  pagePaletteSystems,
} from "@/lib/odata";
import { toPaletteItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { InfinitePalettes } from "@/components/infinite-galleries";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Palettes — Katagami",
  description: "Curated color systems: roles, ramps, and contrast guidance.",
};

export default async function PalettesPage() {
  // Published-only. Keyset-paginated + server-searched so the catalog stays fast
  // at any size — the first page renders here, the rest load on scroll.
  const owner = await isOwner();
  const [first, total, featuredRows] = await Promise.all([
    pagePaletteSystems({ limit: 48 }),
    countPaletteSystems(),
    listFeaturedPaletteSystems(),
  ]);
  const items = first.items.map(toPaletteItem);
  const featured = featuredRows.map(toPaletteItem);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="ramune"
        title={
          <>
            The <Marker color="ramune">palette</Marker> catalog
          </>
        }
        description="Curated color systems — semantic roles, tonal ramps, and contrast guidance. Pair any of these with a UI language and an art style in the Studio."
        rightSlot={<HeroStat value={total} label="palettes" accent="ramune" />}
      />
      <div className="mt-10">
        <InfinitePalettes
          featured={featured}
          initialItems={items}
          initialCursor={first.nextCursor}
          canArchive={owner}
        />
      </div>
    </div>
  );
}
