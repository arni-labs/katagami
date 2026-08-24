"use client";

import { useEffect, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";
import { LANGUAGE_CARD_SIZES } from "@/lib/gallery-image";
import { getFileUrl } from "@/lib/odata";
import {
  advanceThumbnailPreviewState,
  alignThumbnailPreviewState,
  thumbnailSourcesKey,
} from "@/lib/thumbnail-sources";

// A hung source must not pin the card on a blank image. Advance to the next
// URL (CDN → file id) or the swatch. 8s, not 30s — measured /api/file 404s
// used to sit that long.
const THUMBNAIL_LOAD_TIMEOUT_MS = 8000;

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
    if (!src || aligned.failed || aligned.loaded) return;
    const timer = window.setTimeout(advanceOrFail, THUMBNAIL_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, aligned.failed, aligned.loaded, aligned.srcIndex]);

  return (
    <div className="absolute inset-0">
      <ThumbnailPlaceholder
        paletteColors={paletteColors}
        placeholderTint={placeholderTint}
      />
      {aligned.failed || !src ? null : (
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
