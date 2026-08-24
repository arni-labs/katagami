/** Card-sized delivery for gallery images.
 *
 *  Language thumbs are already ~600×400. Art-style heroes and proofs are often
 *  the original generated file (1024–1536px, sometimes multi-MB). Cards display
 *  at ~300×188 (hero) or 32×32 (proof). Every gallery image goes through
 *  next/image so the browser fetches a ~640w variant, not the original.
 */

export const LANGUAGE_CARD_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

export const ART_STYLE_CARD_SIZES =
  "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

export const GALLERY_REMOTE_HOSTS = [
  "assets.katagami.ai",
  "temperpaw-assets.katagami.ai",
] as const;

/** Absolute /api/file URLs the browser serializes on production and on
 *  Vercel preview/deploy hosts. next/image only takes the relative form
 *  (canOptimizeGallerySrc is true for `/…` and for allowlisted CDN hosts —
 *  not for *.vercel.app). */
export function isGalleryFileProxyHost(hostname: string): boolean {
  return (
    hostname === "katagami.ai" ||
    hostname === "www.katagami.ai" ||
    hostname === "vercel.app" ||
    hostname.endsWith(".vercel.app")
  );
}

/** Strip the cache-bust query from local /api/file URLs. File ids are
 *  immutable; next/image rejects query strings on local paths. Absolute
 *  same-origin /api/file URLs (what the browser serializes) become relative
 *  so they take the optimizer path instead of the raw original. Preview
 *  hosts must rewrite the same way — a leftover *.vercel.app URL stays
 *  absolute and skips next/image. */
export function galleryImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed.split("?")[0] ?? trimmed;
  try {
    const parsed = new URL(trimmed);
    if (
      isGalleryFileProxyHost(parsed.hostname) &&
      parsed.pathname.startsWith("/api/file/")
    ) {
      return parsed.pathname;
    }
  } catch {
    /* not a URL */
  }
  return trimmed;
}

export function canOptimizeGallerySrc(url: string): boolean {
  const src = galleryImageSrc(url);
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return (GALLERY_REMOTE_HOSTS as readonly string[]).includes(host);
  } catch {
    return false;
  }
}

/** One primary card image: the dedicated thumbnail when present, else the
 *  first reference. Proofs stay on the detail page. Whitespace is not a
 *  thumb — trim before the fallback so `"   "` cannot hide refs[0]. */
export function artStyleCardHero(input: {
  thumb?: string;
  refs?: string[];
}): string {
  return (input.thumb ?? "").trim() || (input.refs?.[0] ?? "").trim();
}

/** Reset current/failed when the src *prop* identity changes, or when
 *  `attempt` hops (a parent retry of the same URL). Comparing
 *  `current !== src` is wrong: after a 404 fallback those already differ,
 *  and that check would snap back to the dead CDN URL on every render.
 *  `attempt` is not a remount key — ThumbnailPreview keeps key={src}. */
export function alignGalleryImageState(
  src: string,
  seenSrc: string,
  current: string,
  failed: boolean,
  attempt = 0,
  seenAttempt = 0,
): { seenSrc: string; current: string; failed: boolean; seenAttempt: number } {
  if (seenSrc !== src || attempt !== seenAttempt) {
    return { seenSrc: src, current: src, failed: false, seenAttempt: attempt };
  }
  return { seenSrc, current, failed, seenAttempt };
}
