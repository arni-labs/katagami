import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Sentence } from "./sentence";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the sentence — Katagami",
  description: "Say what you are making in one sentence; the styles that fit are dealt to you as a hand of cards.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function SentencePage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Sentence styles={atlas.styles} families={atlas.families} />;
}
