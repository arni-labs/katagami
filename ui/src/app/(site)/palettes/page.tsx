import {
  listPaletteSystems,
  paletteCore,
  paletteDisplayName,
  paletteRoles,
  parseJson,
} from "@/lib/odata";
import { PageHero, Marker } from "@/components/page-hero";
import { PaletteCatalog } from "@/components/lane-catalog";
import type { PaletteItem } from "@/components/palette-card";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Palettes — Katagami",
  description: "Curated color systems: roles, ramps, and contrast guidance.",
};

export default async function PalettesPage() {
  // Owners also see archived palettes (so they can spot what's hidden); the
  // public catalog stays Published-only.
  const owner = await isOwner();
  const filter = owner
    ? "Status eq 'Published' or Status eq 'Archived'"
    : "Status eq 'Published'";
  const rows = await listPaletteSystems(filter).catch(() => []);
  const items: PaletteItem[] = rows
    .map((r) => {
      const core = paletteCore(r.fields);
      return {
        id: r.entity_id,
        name: paletteDisplayName(r.fields, core),
        slug: r.fields.slug ?? "",
        status: r.status,
        roles: paletteRoles(r.fields),
        core,
        ramps: parseJson<Record<string, Record<string, string>>>(r.fields.ramps) ?? {},
        tags: parseJson<string[]>(r.fields.tags) ?? [],
      };
    })
    // Keep archived items last so they never crowd the live catalog.
    .sort((a, b) => Number(a.status === "Archived") - Number(b.status === "Archived"));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="ramune"
        title={<>The <Marker color="ramune">palette</Marker> catalog</>}
        description="Curated color systems — semantic roles, tonal ramps, and contrast guidance. Pair any of these with a UI language and an art style in the Studio."
      />
      <div className="mt-10">
        <PaletteCatalog items={items} canArchive={owner} />
      </div>
    </div>
  );
}
