"use client";

import { useEffect, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";
import { LANGUAGE_CARD_SIZES } from "@/lib/gallery-image";
import { getFileUrl } from "@/lib/odata";
import {
  advanceThumbnailPreviewState,
  alignThumbnailPreviewState,
  thumbnailSourcesKey,
} from "@/lib/thumbnail-sources";

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
  const [seenSourcesKey, setSeenSourcesKey] = useState(() =>
    thumbnailSourcesKey(sources),
  );
  const aligned = alignThumbnailPreviewState(sources, {
    sourcesKey: seenSourcesKey,
    failed,
    loaded,
    srcIndex,
  });
  // Align during render. A new first URL, or a same-landing replace of an
  // exhausted set, resets failed/srcIndex/loaded. Growing the list while
  // [0] is already loaded must keep `loaded` — otherwise the 8s hang
  // timer swaps a working thumb to the new fallback. First-src + length
  // is not the key: see thumbnailSourcesKey.
  if (aligned.sourcesKey !== seenSourcesKey) {
    setSeenSourcesKey(aligned.sourcesKey);
    setFailed(aligned.failed);
    setLoaded(aligned.loaded);
    setSrcIndex(aligned.srcIndex);
  }
  const src = aligned.src;

  const advanceOrFail = () => {
    const next = advanceThumbnailPreviewState(sources, {
      sourcesKey: aligned.sourcesKey,
      failed: aligned.failed,
      loaded: aligned.loaded,
      srcIndex: aligned.srcIndex,
    });
    setSeenSourcesKey(next.sourcesKey);
    setFailed(next.failed);
    setLoaded(next.loaded);
    setSrcIndex(next.srcIndex);
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
    if (!src || aligned.failed || aligned.loaded || !near) return;
    const timer = window.setTimeout(advanceOrFail, THUMBNAIL_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, aligned.failed, aligned.loaded, aligned.srcIndex, near]);

  return (
    <div ref={rootRef} className="absolute inset-0">
      <ThumbnailPlaceholder
        paletteColors={paletteColors}
        placeholderTint={placeholderTint}
      />
      {aligned.failed || !src || !near ? null : (
        <GalleryImage
          key={src}
          src={src}
          attempt={aligned.srcIndex}
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
