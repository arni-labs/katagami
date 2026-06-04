"use client";

import { useEffect, useRef, useState } from "react";

// Compositions are authored for the desktop breakpoint. We render them at a
// fixed internal width and scale the whole iframe down to fit whatever column
// it lives in — so a 1440px landing always shows its true desktop proportions,
// scaled, and never overflows or gets cropped by a narrow panel. This is the
// ONE rendering path shared by the studio preview and the detail-page viewer.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 360;
const MAX_HEIGHT = 6000;

// Injected at the top of <head> before render: caps runaway 100vh layouts and
// freezes animations/transitions so the preview is static and measurable.
const SAFETY_CSS = `<style>
  html, body { max-height: ${MAX_HEIGHT}px !important; overflow: hidden !important; }
  *, *::before, *::after {
    animation-duration: 0s !important; animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important; transition-delay: 0s !important;
  }
</style>`;

function patchHtml(html: string): string {
  if (html.includes("<head>")) return html.replace("<head>", `<head>${SAFETY_CSS}`);
  const m = html.match(/<html[^>]*>/i);
  if (m) return html.replace(m[0], `${m[0]}<head>${SAFETY_CSS}</head>`);
  return SAFETY_CSS + html;
}

/**
 * Renders self-contained HTML at a fixed desktop width and scales it to fit the
 * container width. Auto-measures content height. Remount or change `html` to
 * re-measure. No scripts (sandbox=""); srcdoc inherits same-origin so we can
 * read the document height.
 */
export function ScaledFrame({
  html,
  title = "preview",
  viewportWidth = VIEWPORT_WIDTH,
}: {
  html: string;
  title?: string;
  viewportWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);

  const srcDoc = html ? patchHtml(html) : "";

  // A ResizeObserver fires an initial callback on observe(), so it sets the
  // first scale too — no synchronous setState-in-effect needed. The iframe's
  // onLoad re-measures height; changing `html` reloads the iframe and re-fires
  // onLoad, so height stays correct without an explicit reset.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setScale(w / viewportWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportWidth]);

  function measureContent() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const measured = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight ?? 0,
        doc.body?.offsetHeight ?? 0,
        MIN_HEIGHT,
      );
      setContentHeight(Math.min(measured, MAX_HEIGHT));
    } catch {
      /* keep default */
    }
  }

  const ready = Boolean(srcDoc) && scale !== null;

  // One persistent container holds the ref so the ResizeObserver keeps tracking
  // it across loading -> loaded and on window resize. Before we have a scale (or
  // content), it holds the desktop aspect ratio as a placeholder.
  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-card"
      style={
        ready
          ? { height: contentHeight * (scale as number) }
          : { aspectRatio: `${viewportWidth} / ${DEFAULT_HEIGHT}` }
      }
    >
      {ready ? (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="absolute left-0 top-0 border-0"
          style={{
            width: `${viewportWidth}px`,
            height: `${contentHeight}px`,
            transform: `scale(${scale as number})`,
            transformOrigin: "top left",
          }}
          sandbox=""
          onLoad={() => setTimeout(measureContent, 400)}
          title={title}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}
