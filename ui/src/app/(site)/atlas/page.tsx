import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { AtlasView } from "./atlas-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atlas — Katagami",
  description:
    "The library as a map: every design language and art style placed by how alike they are, in families, with the ones that stand alone at the edges.",
};

export default async function AtlasPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <AtlasView styles={atlas.styles} families={atlas.families} holes={atlas.holes} unplaced={atlas.unplaced} sample={tier === "sample"} />;
}
