"use client";

import { useState } from "react";

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
  const [current, setCurrent] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
      className={className}
    />
  );
}
