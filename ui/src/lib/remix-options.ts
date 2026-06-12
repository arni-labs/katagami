// Shared builders that turn OData rows into the option shapes InlineRemix needs,
// so the studio and every detail-page remix map data identically.
import {
  getFileUrl,
  parseJson,
  paletteRoles,
  paletteCore,
  paletteDisplayName,
} from "@/lib/odata";
import type { LanguageOpt, PaletteOpt, ArtOpt } from "@/components/remix/inline-remix";

type Row = {
  entity_id: string;
  status: string;
  fields: Record<string, string | undefined>;
};

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

export function toLanguageOpts(rows: Row[]): LanguageOpt[] {
  return rows.map((l) => {
    const philosophy = parseJson<{ summary?: string }>(l.fields.philosophy);
    const thumb =
      l.fields.thumbnail_asset_url ||
      (l.fields.thumbnail_file_id ? getFileUrl(l.fields.thumbnail_file_id) : "");
    return {
      id: l.entity_id,
      name: l.fields.name ?? "Untitled",
      tokens: l.fields.tokens ?? "",
      landingUrl: l.fields.landing_file_id ? getFileUrl(l.fields.landing_file_id) : "",
      dashboardUrl: l.fields.dashboard_file_id ? getFileUrl(l.fields.dashboard_file_id) : "",
      thumb,
      tagline: philosophy?.summary,
      tags: parseJson<string[]>(l.fields.tags) ?? [],
    };
  });
}

export function toPaletteOpts(rows: Row[]): PaletteOpt[] {
  return rows.map((p) => {
    const core = paletteCore(p.fields);
    const roles = paletteRoles(p.fields);
    const swatches = [
      ...core.signature.map((s) => s.hex),
      core.neutrals.surface,
      core.neutrals.text,
    ].filter(Boolean) as string[];
    return {
      id: p.entity_id,
      name: paletteDisplayName(p.fields, core),
      roles,
      swatches,
      mood: core.mood.summary,
      temperature: core.mood.temperature,
      keyHue: core.mood.key_hue,
      tags: parseJson<string[]>(p.fields.tags) ?? [],
    };
  });
}

export function toArtOpts(rows: Row[]): ArtOpt[] {
  return rows.map((a) => {
    const refs = refUrls(a.fields.reference_image_file_ids);
    const thumb = a.fields.thumbnail_file_id ? getFileUrl(a.fields.thumbnail_file_id) : "";
    return {
      id: a.entity_id,
      name: a.fields.name ?? "Untitled",
      medium: a.fields.medium ?? "",
      hero: refs[0] || thumb || "",
      promptTemplate: a.fields.prompt_template ?? "",
      negativePrompt: a.fields.negative_prompt ?? "",
      slotRecipes: a.fields.slot_recipes ?? "{}",
      refs,
      tags: parseJson<string[]>(a.fields.tags) ?? [],
    };
  });
}
