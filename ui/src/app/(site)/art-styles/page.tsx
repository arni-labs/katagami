import {
  artStyleDisplayName,
  getFileUrl,
  listArtStyles,
  parseJson,
} from "@/lib/odata";
import { PageHero, Marker } from "@/components/page-hero";
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

export default async function ArtStylesPage() {
  // Owners also see archived art styles (so they can spot what's hidden); the
  // public catalog stays Published-only.
  const owner = await isOwner();
  const filter = owner
    ? "Status eq 'Published' or Status eq 'Archived'"
    : "Status eq 'Published'";
  const rows = await listArtStyles(filter).catch(() => []);
  const items: ArtStyleItem[] = rows
    .map((r) => ({
      id: r.entity_id,
      name: artStyleDisplayName(r.fields),
      slug: r.fields.slug ?? "",
      status: r.status,
      medium: r.fields.medium ?? "",
      promptTemplate: r.fields.prompt_template ?? "",
      refs: refUrls(r.fields.reference_image_file_ids),
      proofs: refUrls(r.fields.proof_shots_file_ids),
      thumb: r.fields.thumbnail_file_id ? getFileUrl(r.fields.thumbnail_file_id) : "",
      tags: parseJson<string[]>(r.fields.tags) ?? [],
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
      />
      <div className="mt-10">
        <ArtStyleCatalog items={items} />
      </div>
    </div>
  );
}
