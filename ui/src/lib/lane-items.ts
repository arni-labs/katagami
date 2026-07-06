import {
  artStyleDisplayName,
  getFileUrl,
  paletteCore,
  paletteDisplayName,
  paletteRoles,
  parseJson,
  type LaneEntity,
} from "@/lib/odata";
import type { PaletteItem } from "@/components/palette-card";
import type { ArtStyleItem } from "@/components/art-style-card";

// Row -> card-item mappings shared by the palette/art-style galleries and the
// Under Review queue, so the two never drift.

/** A PaletteSystem row -> the item the palette catalog renders. */
export function toPaletteItem(r: LaneEntity): PaletteItem {
  const core = paletteCore(r.fields);
  return {
    id: r.entity_id,
    name: paletteDisplayName(r.fields, core),
    slug: r.fields.slug ?? "",
    status: r.status,
    roles: paletteRoles(r.fields),
    core,
    ramps:
      parseJson<Record<string, Record<string, string>>>(r.fields.ramps) ?? {},
    tags: parseJson<string[]>(r.fields.tags) ?? [],
    featured: /^(true|1)$/i.test(String(r.fields.featured ?? "")),
    taxonomyIds: parseJson<string[]>(r.fields.taxonomy_ids) ?? [],
  };
}

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

// Build image URLs from the governed File ids -> /api/file proxy. We DON'T use
// reference_assets VALUES (some are failed-publish CDN urls that 404), and
// reference_image_file_ids is guard-limited to one id on some styles — so collect
// file ids from the manifest (full set), the reference_assets KEYS (file ids),
// and the id field.
function refImageUrls(fields: Record<string, string | undefined>): string[] {
  const ids: string[] = [];
  const add = (id: unknown) => {
    if (typeof id === "string" && id.startsWith("fl-") && !ids.includes(id))
      ids.push(id);
  };
  const manifest = parseJson<{
    items?: Array<{ file?: string }>;
    references?: Array<{ file?: string }>;
  }>(fields.reference_manifest);
  (manifest?.items ?? manifest?.references ?? []).forEach((it) => add(it?.file));
  const assets = parseJson<Record<string, unknown>>(fields.reference_assets);
  if (assets && typeof assets === "object" && !Array.isArray(assets))
    Object.keys(assets).forEach(add);
  (parseJson<string[]>(fields.reference_image_file_ids) ?? []).forEach(add);
  return ids.map((id) => getFileUrl(id));
}

/** A WritingStyle row -> the item the voice catalog renders. */
export function toWritingStyleItem(r: LaneEntity): import("@/components/writing-style-card").WritingStyleItem {
  const consent = parseJson<{ basis?: string }>(r.fields.consent) ?? {};
  const exemplars = parseJson<Array<{ text?: string }>>(r.fields.exemplars) ?? [];
  return {
    id: r.entity_id,
    name: r.fields.name ?? "",
    slug: r.fields.slug ?? "",
    status: r.status,
    persona: r.fields.persona ?? "",
    signature: exemplars[0]?.text ?? "",
    basis: consent.basis ?? "",
    tags: parseJson<string[]>(r.fields.tags) ?? [],
  };
}

/** An ArtStyle row -> the item the art-style catalog renders. */
export function toArtStyleItem(r: LaneEntity): ArtStyleItem {
  return {
    id: r.entity_id,
    name: artStyleDisplayName(r.fields),
    slug: r.fields.slug ?? "",
    status: r.status,
    medium: r.fields.medium ?? "",
    promptTemplate: r.fields.prompt_template ?? "",
    refs: refImageUrls(r.fields),
    proofs: refUrls(r.fields.proof_shots_file_ids),
    thumb: r.fields.thumbnail_file_id
      ? getFileUrl(r.fields.thumbnail_file_id)
      : "",
    tags: parseJson<string[]>(r.fields.tags) ?? [],
    taxonomyIds: parseJson<string[]>(r.fields.taxonomy_ids) ?? [],
  };
}
