import type { Metadata } from "next";
import { MosaicSheet } from "../mosaic/sheet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, quietly — Katagami",
  description: "The library as one calm sheet of pictures you move across, and one line to ask it.",
  robots: { index: false },
};

// A: the front door's sheet with most of it taken away. Linked from nowhere, for comparing against "/".
export default function QuietSheetPage() {
  return <MosaicSheet quiet />;
}
