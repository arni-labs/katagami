// Pictures resized once, ahead of time, and kept on the asset CDN (assets.katagami.ai, Cloudflare R2 with a year's
// immutable cache) instead of being resized per request by the image optimizer. The optimizer's cache is keyed on
// the browser's exact Accept header and does not hold: a picture warmed for one browser was a cold 400-900ms
// resize for the next, and a phone's Safari never met a warm one. A baked file is the same bytes for every browser
// and every deploy.
//
// The address of a picture's resizes is worked out from the picture's own address, so the page names them with no
// lookup. scripts/bake-card-images.mjs writes them; a picture it has not reached yet falls back to the optimizer.
//
// Plain .mjs: shared by the Next server, the browser bundle and the bake script.

export const BAKED_BASE = "https://assets.katagami.ai/published-assets/katagami-cards";
/** Cards on the sheet at every zoom (128 far out, 256 and 384 nearer) and the opened entry (750, and 1080 on a desk). */
export const BAKED_WIDTHS = [128, 256, 384, 750, 1080];

const ASSET_HOSTS = /^https:\/\/(?:assets|temperpaw-assets)\.katagami\.ai\//;
const FILE_PROXY = /^(?:https:\/\/(?:www\.)?katagami\.ai)?\/api\/file\/(fl-[0-9a-f-]+)(?:[?#].*)?$/;

/** Where under the bake a picture lives, or null for a picture the bake does not cover. */
export function bakedKey(src) {
  const s = String(src ?? "").trim();
  if (!s) return null;
  const file = s.match(FILE_PROXY);
  if (file) return `file/${file[1]}`;
  if (ASSET_HOSTS.test(s)) {
    const path = s.replace(ASSET_HOSTS, "").split(/[?#]/)[0];
    // Only plain path characters: anything odd is left to the optimizer rather than guessed at.
    return /^[A-Za-z0-9._\-/]+$/.test(path) && !path.split("/").includes("..") ? `asset/${path}` : null;
  }
  return null;
}

/** The baked resize of a picture at one of the baked widths, or null. */
export function bakedUrl(src, width) {
  if (!BAKED_WIDTHS.includes(width)) return null;
  const key = bakedKey(src);
  return key ? `${BAKED_BASE}/${key}/${width}.webp` : null;
}
