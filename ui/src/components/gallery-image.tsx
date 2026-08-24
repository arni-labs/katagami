"use client";

import Image from "next/image";
import { useState } from "react";
import {
  alignGalleryImageState,
  canOptimizeGallerySrc,
  galleryImageSrc,
} from "@/lib/gallery-image";

/** Card image: next/image when the host is allowlisted (CDN or /api/file),
 *  otherwise a lazy <img>. One fallback hop for a 404 CDN URL. */
export function GalleryImage({
  src,
  fallbackSrc,
  alt,
  sizes,
  className = "",
  eager = false,
  onLoad,
  onError,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const [seenSrc, setSeenSrc] = useState(src);
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const aligned = alignGalleryImageState(src, seenSrc, current, failed);
  // Reset during render when the src prop identity changes. A useEffect
  // would paint the previous failed/null frame first. Comparing current
  // to src would snap a live proxy fallback back to the dead CDN URL.
  if (aligned.seenSrc !== seenSrc) {
    setSeenSrc(aligned.seenSrc);
    setCurrent(aligned.current);
    setFailed(aligned.failed);
  }
  const resolved = galleryImageSrc(aligned.current);
  const optimize = canOptimizeGallerySrc(resolved);

  const handleError = () => {
    if (fallbackSrc && aligned.current !== fallbackSrc) {
      setCurrent(fallbackSrc);
      return;
    }
    setFailed(true);
    onError?.();
  };

  if (aligned.failed || !resolved) return null;

  if (optimize) {
    return (
      <Image
        key={resolved}
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        quality={70}
        priority={eager}
        loading={eager ? "eager" : "lazy"}
        className={className}
        onLoad={onLoad}
        onError={handleError}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={resolved}
      src={resolved}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
