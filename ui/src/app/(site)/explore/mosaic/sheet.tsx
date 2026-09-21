import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { Mosaic } from "./mosaic";

/** The sheet, loaded for whoever is asking. The front door at "/" and the
 *  address we have been iterating on at "/explore/mosaic" are the same screen,
 *  so they share this rather than each keeping a copy that can drift. */
export async function MosaicSheet() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const atlas = await libraryAtlas(tier);
  return <Mosaic styles={atlas.styles} families={atlas.families} holes={atlas.holes} whole={atlas.whole} />;
}
