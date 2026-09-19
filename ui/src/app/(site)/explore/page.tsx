import type { Metadata } from "next";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Explore } from "./explore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katagami — what are you making?",
  description:
    "Say what you are making, pick a colour or answer a few questions, and watch the whole library of design languages and art styles light up on one map.",
};

// Preview of the combined Ask + atlas home. Not linked from the menu: it takes
// over "/" only once the owner has used it on a phone and a desktop.
export default async function ExplorePage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Explore styles={atlas.styles} families={atlas.families} holes={atlas.holes} sample={tier === "sample"} />;
}
