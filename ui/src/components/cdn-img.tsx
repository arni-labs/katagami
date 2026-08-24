"use client";

import { useState } from "react";

/** Reset `current` when the src prop identity changes. Comparing `current`
 *  to `src` is wrong: after a 404 fallback those already differ, and that
 *  check would snap back to the dead CDN URL on every render. */
export function alignCdnImgCurrent(
  src: string,
  seenSrc: string,
  current: string,
): { seenSrc: string; current: string } {
  if (seenSrc !== src) {
    return { seenSrc: src, current: src };
  }
  return { seenSrc, current };
}

/** An absolute-URL image (assets.katagami.ai CDN) with a one-shot fallback to
 *  the governed /api/file proxy. ARN-354: art-style surfaces used to skip the
 *  CDN entirely because a few published asset URLs 404 — this heals those few
 *  client-side instead of forcing every image through the slow proxy. */
export function CdnImg({
  src,
  fallbackSrc,
  alt,
  className = "",
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}) {
  const [seenSrc, setSeenSrc] = useState(src);
  const [current, setCurrent] = useState(src);
  const aligned = alignCdnImgCurrent(src, seenSrc, current);
  if (aligned.seenSrc !== seenSrc) {
    setSeenSrc(aligned.seenSrc);
    setCurrent(aligned.current);
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={aligned.current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fallbackSrc && aligned.current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
      className={className}
    />
  );
}
