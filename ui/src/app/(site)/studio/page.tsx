import {
  listDesignLanguages,
  listPaletteSystems,
  listArtStyles,
  listRemixes,
  getFileUrl,
  parseJson,
  paletteRoles,
} from "@/lib/odata";
import { RemixStudio } from "@/components/remix-studio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Remix Studio — Katagami",
  description: "Mix a UI language, a palette, and an art style into a portable creative brief.",
};

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

export default async function StudioPage() {
  const [languages, palettes, artStyles, savedRemixes] = await Promise.all([
    listDesignLanguages("Status eq 'Published'").catch(() => []),
    listPaletteSystems().catch(() => []),
    listArtStyles().catch(() => []),
    listRemixes("Status eq 'Saved'").catch(() => []),
  ]);

  const ui = languages.map((l) => ({
    id: l.entity_id,
    name: l.fields.name ?? "Untitled",
    tokens: l.fields.tokens ?? "",
    landingUrl: l.fields.landing_file_id ? getFileUrl(l.fields.landing_file_id) : "",
    dashboardUrl: l.fields.dashboard_file_id ? getFileUrl(l.fields.dashboard_file_id) : "",
  }));
  const pal = palettes.map((p) => ({
    id: p.entity_id,
    name: p.fields.name ?? "Untitled",
    roles: JSON.stringify(paletteRoles(p.fields)),
    thumb: p.fields.thumbnail_file_id ? getFileUrl(p.fields.thumbnail_file_id) : "",
  }));
  const art = artStyles.map((a) => ({
    id: a.entity_id,
    name: a.fields.name ?? "Untitled",
    medium: a.fields.medium ?? "",
    promptTemplate: a.fields.prompt_template ?? "",
    negativePrompt: a.fields.negative_prompt ?? "",
    slotRecipes: a.fields.slot_recipes ?? "{}",
    refs: refUrls(a.fields.reference_image_file_ids),
    thumb: a.fields.thumbnail_file_id ? getFileUrl(a.fields.thumbnail_file_id) : "",
  }));

  const saved = savedRemixes.map((r) => ({
    id: r.entity_id,
    ui: r.fields.design_language_id ?? "",
    palette: r.fields.palette_system_id ?? "",
    art: r.fields.art_style_id ?? "",
    composition: r.fields.composition_key ?? "",
    rating: Number(r.fields.rating ?? r.fields.Rating ?? 0),
  }));

  return <RemixStudio ui={ui} palettes={pal} art={art} saved={saved} />;
}
