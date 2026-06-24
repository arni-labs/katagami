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

// The backend SubmitForReview guard forced reference_image_file_ids to a single
// id on some styles, so that field shows only one image. The full set lives in
// reference_assets (the public serving plane). Prefer it; fall back to the ids.
function refImageUrls(fields: Record<string, string | undefined>): string[] {
  const assets = parseJson<Record<string, unknown> | unknown[]>(fields.reference_assets);
  const urls: string[] = [];
  const push = (u: unknown) => {
    if (typeof u === "string" && u.startsWith("http")) urls.push(u);
    else if (u && typeof u === "object" && typeof (u as { url?: string }).url === "string") urls.push((u as { url: string }).url);
  };
  if (Array.isArray(assets)) assets.forEach(push);
  else if (assets && typeof assets === "object") Object.values(assets).forEach(push);
  return urls.length ? urls : refUrls(fields.reference_image_file_ids);
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
