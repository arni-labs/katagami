import {
  artStyleDisplayName,
  getFileUrl,
  listArtStyles,
  parseJson,
  taxonomyFamilyIndex,
} from "@/lib/odata";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { ArtStyleCatalog } from "@/components/lane-catalog";
import type { ArtStyleItem } from "@/components/art-style-card";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Art Styles — Katagami",
  description: "Engine-agnostic art-style recipes: reference images + portable prompts.",
};

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

// Build image URLs from the governed File ids -> /api/file proxy (reliable for
// every style). We DON'T use reference_assets VALUES: some are assets.katagami.ai
// CDN urls whose publish never completed (404). And reference_image_file_ids is
// guard-limited to one id on some styles. So collect file ids from the manifest
// (full set), the reference_assets KEYS (which are file ids), and the id field.
function refImageUrls(fields: Record<string, string | undefined>): string[] {
  const ids: string[] = [];
  const add = (id: unknown) => {
    if (typeof id === "string" && id.startsWith("fl-") && !ids.includes(id)) ids.push(id);
  };
  const manifest = parseJson<{ items?: Array<{ file?: string }>; references?: Array<{ file?: string }> }>(fields.reference_manifest);
  (manifest?.items ?? manifest?.references ?? []).forEach((it) => add(it?.file));
  const assets = parseJson<Record<string, unknown>>(fields.reference_assets);
  if (assets && typeof assets === "object" && !Array.isArray(assets)) Object.keys(assets).forEach(add);
  (parseJson<string[]>(fields.reference_image_file_ids) ?? []).forEach(add);
  return ids.map((id) => getFileUrl(id));
}

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
    .map((r) => ({
      id: r.entity_id,
      name: artStyleDisplayName(r.fields),
      slug: r.fields.slug ?? "",
      status: r.status,
      medium: r.fields.medium ?? "",
      promptTemplate: r.fields.prompt_template ?? "",
      refs: refImageUrls(r.fields),
      proofs: refUrls(r.fields.proof_shots_file_ids),
      thumb: r.fields.thumbnail_file_id ? getFileUrl(r.fields.thumbnail_file_id) : "",
      tags: parseJson<string[]>(r.fields.tags) ?? [],
      taxonomyIds: parseJson<string[]>(r.fields.taxonomy_ids) ?? [],
    }))
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
