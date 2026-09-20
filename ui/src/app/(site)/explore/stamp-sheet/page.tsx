import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { StampSheets } from "./stamp-sheets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the stamp sheets — Katagami",
  description: "Every family a perforated sheet, every style a stamp. Answers are torn off and dropped on the desk.",
  robots: { index: false },
};

// A preview, linked from nowhere: one of the candidates for the landing page.
export default async function StampSheetsPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <StampSheets styles={atlas.styles} families={atlas.families} holes={atlas.holes} />;
}
