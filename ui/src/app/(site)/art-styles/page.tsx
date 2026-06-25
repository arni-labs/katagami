import { listArtStyles, taxonomyFamilyIndex } from "@/lib/odata";
import { toArtStyleItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { ArtStyleCatalog } from "@/components/lane-catalog";
import type { ArtStyleItem } from "@/components/art-style-card";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Art Styles — Katagami",
  description: "Engine-agnostic art-style recipes: reference images + portable prompts.",
};

export default async function ArtStylesPage() {
  // Published-only everywhere — draft/archived art styles never appear in the
  // catalog or counts. Owners can still archive published art styles.
  const owner = await isOwner();
  const [rows, taxFamily] = await Promise.all([
    listArtStyles("Status eq 'Published'").catch(() => []),
    taxonomyFamilyIndex().catch(() => new Map<string, { name: string; parentId: string }>()),
  ]);
  // id → category name, so the lane can shelve by taxonomy like the home gallery.
  const categoryNames: Record<string, string> = {};
  for (const [id, info] of taxFamily) categoryNames[id] = info.name;
  const items: ArtStyleItem[] = rows
    .map(toArtStyleItem)
    // Keep archived items last so they never crowd the live catalog.
    .sort((a, b) => Number(a.status === "Archived") - Number(b.status === "Archived"));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Art lane"
        eyebrowAccent="sakura"
        title={<>The <Marker color="sakura">art style</Marker> catalog</>}
        description="Engine-agnostic style recipes — reference images plus a portable subject/palette prompt. Remix them onto any UI language and palette in the Studio."
        rightSlot={<HeroStat value={items.length} label="art styles" accent="sakura" />}
      />
      <div className="mt-10">
        <ArtStyleCatalog items={items} canArchive={owner} categoryNames={categoryNames} />
      </div>
    </div>
  );
}
