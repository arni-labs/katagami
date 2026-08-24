"use client";

import { useEffect, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";
import { LANGUAGE_CARD_SIZES } from "@/lib/gallery-image";
import { getFileUrl } from "@/lib/odata";

// A hung source must not pin a *visible* card on a blank image. Advance to
// the next URL (CDN → file id) or the swatch. Never start this clock for a
// card the browser has not approached — that is what left 51/60 language
// cards on the palette dots after 8s of being off-screen.
const THUMBNAIL_LOAD_TIMEOUT_MS = 8000;
const LOAD_AHEAD_MARGIN = "400px 0px";

export function ThumbnailPreview({
  fileId,
  src: assetSrc,
  srcs,
  alt,
  placeholderTint,
  paletteColors = [],
  eager = false,
}: {
  fileId?: string;
  src?: string;
  srcs?: string[];
  alt: string;
  placeholderTint: string;
  paletteColors?: string[];
  eager?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const sources =
    srcs && srcs.length > 0
      ? srcs
      : assetSrc
        ? [assetSrc]
        : fileId
          ? [getFileUrl(fileId)]
          : [];
  const src = sources[srcIndex] ?? "";

  const advanceOrFail = () => {
    setLoaded(false);
    if (srcIndex + 1 < sources.length) {
      setSrcIndex((i) => i + 1);
      return;
    }
    setFailed(true);
  };

  useEffect(() => {
    if (near) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: LOAD_AHEAD_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!src || failed || loaded || !near) return;
    const timer = window.setTimeout(advanceOrFail, THUMBNAIL_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, failed, loaded, srcIndex, near]);

  return (
    <div ref={rootRef} className="absolute inset-0">
      <ThumbnailPlaceholder
        paletteColors={paletteColors}
        placeholderTint={placeholderTint}
      />
      {failed || !src || !near ? null : (
        <GalleryImage
          key={src}
          src={src}
          alt={alt}
          sizes={LANGUAGE_CARD_SIZES}
          eager={eager}
          className="object-cover"
          onLoad={() => setLoaded(true)}
          onError={advanceOrFail}
        />
      )}
    </div>
  );
}

function ThumbnailPlaceholder({
  paletteColors,
  placeholderTint,
}: {
  paletteColors: string[];
  placeholderTint: string;
}) {
  const dots = paletteColors.length > 0 ? paletteColors : [placeholderTint];

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `color-mix(in srgb, ${placeholderTint} 6%, var(--paper-tape-mix))`,
      }}
    >
      <div className="flex gap-1.5">
        {dots.slice(0, 4).map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}
