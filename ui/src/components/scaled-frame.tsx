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
// Generous so a tall full-bleed landing (100svh hero + rich sections) is never
// clipped — the old 6000 cap cut long compositions off mid-page.
const MAX_HEIGHT = 16000;

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
  // Bookkeeping for the deferred re-measure passes + the in-iframe observers,
  // so a tab switch (which reloads the iframe) tears the old ones down cleanly.
  const measureTimers = useRef<number[]>([]);
  const docObserver = useRef<ResizeObserver | null>(null);

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

  // Tear down any pending measurement work on unmount / html change.
  useEffect(() => {
    return () => {
      measureTimers.current.forEach((t) => window.clearTimeout(t));
      measureTimers.current = [];
      docObserver.current?.disconnect();
      docObserver.current = null;
    };
  }, [srcDoc]);

  function measureContent() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const body = doc.body;
      // The true composition height is the largest of the document/body box
      // metrics AND the bottom edge of every child — absolutely-positioned or
      // transformed sections (full-bleed heroes, pinned footers) don't always
      // grow scrollHeight, so a pure scrollHeight read can under-measure and
      // clip the frame. getBoundingClientRect().bottom catches those.
      let maxBottom = 0;
      if (body) {
        for (const child of Array.from(body.children)) {
          const bottom = (child as HTMLElement).getBoundingClientRect().bottom;
          if (Number.isFinite(bottom) && bottom > maxBottom) maxBottom = bottom;
        }
      }
      const measured = Math.max(
        doc.documentElement.scrollHeight,
        doc.documentElement.offsetHeight,
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        Math.ceil(maxBottom),
        MIN_HEIGHT,
      );
      setContentHeight((prev) => {
        const next = Math.min(measured, MAX_HEIGHT);
        // Only grow / settle on a meaningfully different value to avoid a
        // measure→resize→measure feedback loop with the in-iframe observer.
        return Math.abs(next - prev) > 1 ? next : prev;
      });
    } catch {
      /* keep default */
    }
  }

  // Robust settle: measure now, after the deferred timers, once web fonts are
  // ready, after each in-frame <img> decodes, and on any later layout shift via
  // a ResizeObserver on the iframe's own <body> (same-origin srcdoc). This is
  // what makes a tall landing show in full instead of coming up cut.
  function onFrameLoad() {
    measureTimers.current.forEach((t) => window.clearTimeout(t));
    measureTimers.current = [];
    docObserver.current?.disconnect();
    docObserver.current = null;

    measureContent();
    for (const delay of [120, 350, 700, 1400]) {
      measureTimers.current.push(
        window.setTimeout(measureContent, delay),
      );
    }

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    try {
      // Re-measure once custom fonts have loaded (they reflow text height).
      doc.fonts?.ready?.then(() => measureContent()).catch(() => {});
      // Re-measure as each image finishes decoding.
      for (const img of Array.from(doc.images)) {
        if (!img.complete) {
          img.addEventListener("load", measureContent, { once: true });
          img.addEventListener("error", measureContent, { once: true });
        }
      }
      // Catch every later reflow (lazy assets, fonts, expanding sections).
      if (doc.body && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => measureContent());
        ro.observe(doc.body);
        ro.observe(doc.documentElement);
        docObserver.current = ro;
      }
    } catch {
      /* same-origin read failed — the timed passes above still apply */
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
          // allow-same-origin lets us read the srcdoc document for height
          // measurement + observe its reflows. Scripts stay disabled (no
          // allow-scripts), so the preview remains static and safe.
          sandbox="allow-same-origin"
          onLoad={onFrameLoad}
          title={title}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}
