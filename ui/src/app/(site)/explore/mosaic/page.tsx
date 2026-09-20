import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Mosaic } from "./mosaic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the mosaic — Katagami",
  description: "One sheet of stamps, a style each, that sorts itself into a picture: by colour, by family, by fit.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function MosaicPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Mosaic styles={atlas.styles} families={atlas.families} />;
}
