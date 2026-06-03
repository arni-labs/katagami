import { listArtStyles, getFileUrl, parseJson } from "@/lib/odata";
import { PageHero, Marker } from "@/components/page-hero";
import { ArtStyleCatalog } from "@/components/lane-catalog";
import type { ArtStyleItem } from "@/components/art-style-card";

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
  const rows = await listArtStyles("Status eq 'Published'").catch(() => []);
  const items: ArtStyleItem[] = rows.map((r) => ({
    id: r.entity_id,
    name: r.fields.name ?? "Untitled",
    slug: r.fields.slug ?? "",
    status: r.status,
    medium: r.fields.medium ?? "",
    promptTemplate: r.fields.prompt_template ?? "",
    refs: refUrls(r.fields.reference_image_file_ids),
    thumb: r.fields.thumbnail_file_id ? getFileUrl(r.fields.thumbnail_file_id) : "",
    tags: parseJson<string[]>(r.fields.tags) ?? [],
  }));

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
