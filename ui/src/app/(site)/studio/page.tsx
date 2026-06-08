import {
  listDesignLanguages,
  listPaletteSystems,
  listArtStyles,
  listRemixes,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import Link from "next/link";
import { PageHero, Marker } from "@/components/page-hero";
import { InlineRemix } from "@/components/remix/inline-remix";
import { SavedMixes, type SavedMix } from "@/components/remix/saved-mixes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Remix Studio — Katagami",
  description: "Mix a UI language, a palette, and an art style into a portable creative brief.",
};

export default async function StudioPage() {
  const [languages, palettes, artStyles, savedRemixes] = await Promise.all([
    listDesignLanguages("Status eq 'Published'").catch(() => []),
    listPaletteSystems().catch(() => []),
    listArtStyles().catch(() => []),
    listRemixes("Status eq 'Saved'").catch(() => []),
  ]);

  const ui = toLanguageOpts(languages);
  const pal = toPaletteOpts(palettes);
  const art = toArtOpts(artStyles);

  const names = {
    ui: Object.fromEntries(ui.map((o) => [o.id, o.name])),
    palette: Object.fromEntries(pal.map((o) => [o.id, o.name])),
    art: Object.fromEntries(art.map((o) => [o.id, o.name])),
  };
  const saved: SavedMix[] = savedRemixes.map((r) => ({
    id: r.entity_id,
    ui: r.fields.design_language_id ?? "",
    palette: r.fields.palette_system_id ?? "",
    art: r.fields.art_style_id ?? "",
    composition: r.fields.composition_key ?? "",
    rating: Number(r.fields.rating ?? r.fields.Rating ?? 0),
  }));

  const haveAll = ui.length > 0 && pal.length > 0 && art.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Remix lane"
        eyebrowAccent="salad"
        title={<>The <Marker color="salad">remix</Marker> studio</>}
        description="Pick a UI language, a palette, and an art style. The preview is that language's own landing & dashboard — recolored by the palette, given the art style's hero. Live, no generation."
      />

      {!haveAll ? (
        <div className="paper-card mt-8 rounded-[var(--radius-lg)] p-5 text-sm text-muted-foreground">
          Needs a Published entry in each lane — see the{" "}
          <Link href="/palettes" className="ink-underline text-foreground">palettes</Link> and{" "}
          <Link href="/art-styles" className="ink-underline text-foreground">art styles</Link> catalogs.
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <InlineRemix languages={ui} palettes={pal} art={art} variant="command" enableSave />
          <SavedMixes saved={saved} names={names} />
        </div>
      )}
    </div>
  );
}
