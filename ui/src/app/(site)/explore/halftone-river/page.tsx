import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { HalftoneRiver } from "./halftone-river";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the halftone river — Katagami",
  description: "The library as a river of dots that turn into stamps, then pictures, where you look.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function HalftoneRiverPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <HalftoneRiver styles={atlas.styles} families={atlas.families} />;
}
