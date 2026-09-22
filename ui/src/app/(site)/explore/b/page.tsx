import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { libraryAtlas, type AtlasStyle } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { galleryImageSrc } from "@/lib/gallery-image";
import pictureShapes from "@/data/picture-shapes.json";
import { Prints, type Print } from "./prints";

// The signed-in tier decides how much of the library is handed over, so this cannot be one cached page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Index — Katagami",
  description: "The whole library as one calm page of pictures, each at its own proportions. Say what you are making and the fits come first.",
  // A second way into the library the owner is trying out quietly: not in the menu, not offered to search engines.
  robots: { index: false },
};

const SHAPES = pictureShapes.shapes as Record<string, number>;
const keyOf = (src: string) => createHash("sha256").update(galleryImageSrc(src)).digest("hex").slice(0, 12);
// Until a picture has been measured (scripts/picture-shapes.mjs), it is given the shape most of its kind have:
// language pictures are 1.6 landing screenshots, art-style references mostly 3:2. The browser corrects it on arrival.
const USUAL = { language: 1.6, art_style: 1.5 } as const;

/** The library as a sampler: the most typical style of each family in turn, largest families first. Left in the
 *  order it is stored, the first screens were forty landing-page screenshots before a single art style. */
function sampler(styles: AtlasStyle[], families: { id: string; count: number; x: number; y: number }[]): AtlasStyle[] {
  const centre = new Map(families.map((f) => [f.id, f]));
  const groups = new Map<string, AtlasStyle[]>();
  for (const s of styles) {
    const key = s.family && centre.has(s.family) ? s.family : `solo:${s.id}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const ordered = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([key, members]) => {
      const c = centre.get(key);
      return c ? [...members].sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)) : members;
    });
  const out: AtlasStyle[] = [];
  for (let round = 0; out.length < styles.length; round++) for (const g of ordered) if (g[round]) out.push(g[round]);
  return out;
}

export default async function IndexPage() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const [atlas, asked] = await Promise.all([libraryAtlas(tier), headers()]);
  // Which picture size to send has to be settled before the page reaches the browser, so the pictures in the first
  // screen can be fetched straight from the HTML. A phone is told from its user agent; a wrong guess costs bytes,
  // never layout.
  const phone = /Mobi|Android|iPhone|iPod/i.test(asked.get("user-agent") ?? "");
  // Only what the page draws crosses the wire: the canvas's traits, DNA and neighbours would be most of the payload.
  const prints: Print[] = sampler(atlas.styles, atlas.families).map((s) => {
    const shape = s.picture ? SHAPES[keyOf(s.picture)] : undefined;
    return { id: s.id, kind: s.kind, name: s.name, href: s.href, src: s.picture, spare: s.thumbnail_url && s.thumbnail_url !== s.picture ? s.thumbnail_url : null, shape: shape ?? USUAL[s.kind] };
  });
  return <Prints prints={prints} whole={atlas.whole} phone={phone} />;
}
