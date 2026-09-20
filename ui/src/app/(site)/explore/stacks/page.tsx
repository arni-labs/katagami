import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Stacks } from "./stacks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the stacks — Katagami",
  description: "A whole library wall: a spine for every style, shelved like beside like. Pull one and it opens.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function StacksPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Stacks styles={atlas.styles} families={atlas.families} />;
}
