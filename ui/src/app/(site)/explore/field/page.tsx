import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { HalftoneField } from "./halftone-field";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the halftone field — Katagami",
  description: "The whole library as one halftone: a dot for every style, in its own colour. A lens turns the dots under it into pictures.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function FieldPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <HalftoneField styles={atlas.styles} families={atlas.families} holes={atlas.holes} />;
}
