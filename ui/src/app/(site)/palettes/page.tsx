import { listPaletteSystems, taxonomyFamilyIndex } from "@/lib/odata";
import { toPaletteItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { PaletteCatalog } from "@/components/lane-catalog";
import type { PaletteItem } from "@/components/palette-card";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Palettes — Katagami",
  description: "Curated color systems: roles, ramps, and contrast guidance.",
};

export default async function PalettesPage() {
  // Published-only everywhere — draft/archived palettes never appear in the
  // catalog or counts. Owners can still archive published palettes.
  const owner = await isOwner();
  const [rows, taxFamily] = await Promise.all([
    listPaletteSystems("Status eq 'Published'").catch(() => []),
    taxonomyFamilyIndex().catch(() => new Map<string, { name: string; parentId: string }>()),
  ]);
  // id → category name, so the lane can shelve by taxonomy like the home gallery.
  const categoryNames: Record<string, string> = {};
  for (const [id, info] of taxFamily) categoryNames[id] = info.name;
  const items: PaletteItem[] = rows
    .map(toPaletteItem)
    // Keep archived items last so they never crowd the live catalog.
    .sort((a, b) => Number(a.status === "Archived") - Number(b.status === "Archived"));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="ramune"
        title={<>The <Marker color="ramune">palette</Marker> catalog</>}
        description="Curated color systems — semantic roles, tonal ramps, and contrast guidance. Pair any of these with a UI language and an art style in the Studio."
        rightSlot={<HeroStat value={items.length} label="palettes" accent="ramune" />}
      />
      <div className="mt-10">
        <PaletteCatalog items={items} canArchive={owner} categoryNames={categoryNames} />
      </div>
    </div>
  );
}
