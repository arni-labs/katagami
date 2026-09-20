import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Spines } from "./spines";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the spines — Katagami",
  description: "One long shelf, a spine for every style. Pull one and it turns to face you.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function SpinesPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Spines styles={atlas.styles} families={atlas.families} />;
}
