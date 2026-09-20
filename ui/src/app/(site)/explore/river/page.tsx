import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { River } from "./river";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the river — Katagami",
  description: "The whole library as one winding ribbon, like beside like, its colour shifting along the flow.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function RiverPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <River styles={atlas.styles} families={atlas.families} />;
}
