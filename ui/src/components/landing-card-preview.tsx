"use client";

import { useEffect, useRef, useState } from "react";
import { getFileUrl } from "@/lib/odata";
import { ScaledFrame } from "@/components/scaled-frame";
import { ThumbnailPreview } from "@/components/thumbnail-preview";

/**
 * Gallery card visual that prefers the language's bespoke LANDING over the
 * embodiment thumbnail. There is no stored landing screenshot, so we render the
 * self-contained landing HTML live in a ScaledFrame (the same desktop-render-
 * then-scale path the detail page uses). The frame is pinned to the top of the
 * landing — its full-bleed hero — and clipped to the card's aspect box, so the
 * card shows the marketing hero rather than a 600x400 of the element showcase.
 *
 * To keep a wall of 90+ cards cheap we defer the landing fetch until the card is
 * near the viewport (IntersectionObserver). If the landing is missing or fails
 * to load we fall back to the embodiment thumbnail, so a card is never blank.
 */
export function LandingCardPreview({
  landingFileId,
  thumbnailFileId,
  thumbnailAssetUrl,
  alt,
  placeholderTint,
  paletteColors = [],
  eager = false,
}: {
  landingFileId: string;
  thumbnailFileId?: string;
  thumbnailAssetUrl?: string;
  alt: string;
  placeholderTint: string;
  paletteColors?: string[];
  eager?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(eager);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const url = getFileUrl(landingFileId);

  // Mount the live landing only once the card is near the viewport.
  useEffect(() => {
    if (eager || near) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "1200px 0px 1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, near]);

  // Fetch the self-contained landing HTML once near.
  useEffect(() => {
    if (!near || html !== null || failed) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => {
        if (!cancelled) setHtml(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [near, url, html, failed]);

  // Landing unavailable → fall back to the embodiment thumbnail (never blank).
  if (failed) {
    return (
      <ThumbnailPreview
        fileId={thumbnailFileId}
        src={thumbnailAssetUrl}
        alt={alt}
        eager={eager}
        placeholderTint={placeholderTint}
        paletteColors={paletteColors}
      />
    );
  }

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden" aria-label={alt}>
      {html ? (
        // The landing is taller than the card box; pin it to the top so the
        // hero shows, and disable pointer events so the whole card stays a link.
        <div className="pointer-events-none absolute inset-x-0 top-0">
          <ScaledFrame html={html} title={alt} />
        </div>
      ) : (
        <LandingPlaceholder
          paletteColors={paletteColors}
          placeholderTint={placeholderTint}
        />
      )}
    </div>
  );
}

function LandingPlaceholder({
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
