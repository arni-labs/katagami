import { listPaletteSystems, parseJson, paletteRoles, paletteCore } from "@/lib/odata";
import { PageHero, Marker } from "@/components/page-hero";
import { PaletteCatalog } from "@/components/lane-catalog";
import type { PaletteItem } from "@/components/palette-card";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Palettes — Katagami",
  description: "Curated color systems: roles, ramps, and contrast guidance.",
};

export default async function PalettesPage() {
  const rows = await listPaletteSystems("Status eq 'Published'").catch(() => []);
  const items: PaletteItem[] = rows.map((r) => ({
    id: r.entity_id,
    name: r.fields.name ?? "Untitled",
    slug: r.fields.slug ?? "",
    status: r.status,
    roles: paletteRoles(r.fields),
    core: paletteCore(r.fields),
    ramps: parseJson<Record<string, Record<string, string>>>(r.fields.ramps) ?? {},
    tags: parseJson<string[]>(r.fields.tags) ?? [],
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="ramune"
        title={<>The <Marker color="ramune">palette</Marker> catalog</>}
        description="Curated color systems — semantic roles, tonal ramps, and contrast guidance. Pair any of these with a UI language and an art style in the Studio."
      />
      <div className="mt-10">
        <PaletteCatalog items={items} />
      </div>
    </div>
  );
}
