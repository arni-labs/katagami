"use client";

import Image from "next/image";
import { useState } from "react";
import {
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
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const resolved = galleryImageSrc(current);
  const optimize = canOptimizeGallerySrc(resolved);

  const handleError = () => {
    if (fallbackSrc && current !== fallbackSrc) {
      setCurrent(fallbackSrc);
      return;
    }
    setFailed(true);
    onError?.();
  };

  if (failed || !resolved) return null;

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
