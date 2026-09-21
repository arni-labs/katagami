import type { Metadata } from "next";
import { MosaicSheet } from "./sheet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore, the mosaic — Katagami",
  description: "One sheet of stamps, a style each, that sorts itself into a picture: by colour, by family, by fit.",
  // The sheet lives at "/" now. This address still works, because it is the one
  // in the notes we have been iterating against, but a search engine should
  // only ever be offered the one at the front door.
  robots: { index: false },
};

export default function MosaicPage() {
  return <MosaicSheet />;
}
