import {
  artStyleDisplayName,
  getFileUrl,
  paletteCore,
  paletteDisplayName,
  paletteRoles,
  parseJson,
  type LaneEntity,
} from "@/lib/odata";
import { artStyleCardHero } from "@/lib/gallery-image";
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

/** A published asset value from reference_assets / *_asset_url fields — accept
 *  a plain https URL or an object carrying one. Anything else is unusable. */
function publishedAssetUrl(value: unknown): string {
  const url =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? String((value as { url?: unknown }).url ?? "")
        : "";
  return url.startsWith("https://") ? url.trim() : "";
}

// ARN-354: art-style images are CDN-first. Each governed file id resolves to
// its published assets.katagami.ai URL when one exists (fast, cached at the
// edge), with the /api/file proxy as the per-image fallback — recorded in a
// src->proxy map so <CdnImg> can heal the few failed-publish CDN values that
// 404, instead of the old blanket "proxy everything" workaround that made the
// whole lane slow.
export interface ArtStyleImageSet {
  refs: string[];
  proofs: string[];
  thumb: string;
  /** CDN src -> proxy fallback, for images whose primary is a published URL. */
  fallbacks: Record<string, string>;
}

export function artStyleImages(
  fields: Record<string, string | undefined>,
): ArtStyleImageSet {
  const assets = parseJson<Record<string, unknown>>(fields.reference_assets);
  const assetMap =
    assets && typeof assets === "object" && !Array.isArray(assets)
      ? assets
      : {};
  const fallbacks: Record<string, string> = {};

  const urlFor = (id: string): string => {
    const proxy = getFileUrl(id);
    const cdn = publishedAssetUrl(assetMap[id]);
    if (!cdn) return proxy;
    fallbacks[cdn] = proxy;
    return cdn;
  };

  // Collect reference file ids from the manifest (full set), the
  // reference_assets KEYS (file ids), and the guard-limited id field —
  // reference_image_file_ids alone is capped to one id on some styles.
  const ids: string[] = [];
  const add = (id: unknown) => {
    if (typeof id === "string" && id.startsWith("fl-") && !ids.includes(id))
      ids.push(id);
  };
  const manifest = parseJson<{
    items?: Array<{ file?: string; file_id?: string }>;
    references?: Array<{ file?: string; file_id?: string }>;
  }>(fields.reference_manifest);
  (manifest?.items ?? manifest?.references ?? []).forEach((it) =>
    add(it?.file_id ?? it?.file),
  );
  Object.keys(assetMap).forEach(add);
  (parseJson<string[]>(fields.reference_image_file_ids) ?? []).forEach(add);

  const proofIds = parseJson<string[]>(fields.proof_shots_file_ids) ?? [];

  const thumbCdn = publishedAssetUrl(fields.thumbnail_asset_url);
  const thumbProxy = fields.thumbnail_file_id
    ? getFileUrl(fields.thumbnail_file_id)
    : "";
  if (thumbCdn && thumbProxy) fallbacks[thumbCdn] = thumbProxy;

  return {
    refs: ids.map(urlFor),
    proofs: proofIds.map(urlFor),
    thumb: thumbCdn || thumbProxy,
    fallbacks,
  };
}

/** The composition line for a voice, derived from its credits: which
 *  public-domain authors the corpus draws on, single or blend. */
export function voiceComposition(creditsRaw: string | undefined, basis: string): string {
  const credits =
    parseJson<Array<{ name?: string; kind?: string }>>(creditsRaw) ?? [];
  const writers = credits.filter((c) => c.kind === "writer").map((c) => c.name ?? "");
  const translators = credits.filter((c) => c.kind === "translator").map((c) => c.name ?? "");
  if (basis === "public_domain" && writers.length) {
    const who = writers.join(" + ") + (translators.length ? ` (${translators.join(", ")}, translator)` : "");
    return writers.length > 1 ? `a blend of ${who}` : `one author: ${who}`;
  }
  if (basis === "original") return "original corpus, authored in-register";
  if (basis === "opt_in") return "personal corpus, contributed with consent";
  return "";
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
    composition: voiceComposition(r.fields.credits, consent.basis ?? ""),
    tags: parseJson<string[]>(r.fields.tags) ?? [],
  };
}

/** An ArtStyle row -> the item the art-style catalog renders.
 *  The card shows ONE image (the thumbnail). Proofs stay on the detail page
 *  so a first page of 48 cards is 48 images, not ~190 originals. */
export function toArtStyleItem(r: LaneEntity): ArtStyleItem {
  const images = artStyleImages(r.fields);
  const hero = artStyleCardHero({
    thumb: images.thumb,
    refs: images.refs,
  });
  const imageCount = new Set(
    [images.thumb, ...images.refs, ...images.proofs].filter((url) =>
      Boolean((url ?? "").trim()),
    ),
  ).size;
  return {
    id: r.entity_id,
    name: artStyleDisplayName(r.fields),
    slug: r.fields.slug ?? "",
    status: r.status,
    medium: r.fields.medium ?? "",
    promptTemplate: r.fields.prompt_template ?? "",
    refs: hero ? [hero] : [],
    proofs: [],
    thumb: hero,
    imageCount,
    imageFallbacks:
      hero && images.fallbacks[hero] ? { [hero]: images.fallbacks[hero] } : {},
    tags: parseJson<string[]>(r.fields.tags) ?? [],
    taxonomyIds: parseJson<string[]>(r.fields.taxonomy_ids) ?? [],
  };
}
