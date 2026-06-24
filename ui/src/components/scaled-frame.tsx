"use client";

import { useEffect, useRef, useState } from "react";

// Compositions are authored for the desktop breakpoint. We render them at a
// fixed internal width and scale the whole iframe down to fit whatever column
// it lives in — so a 1440px landing always shows its true desktop proportions,
// scaled, and never overflows horizontally.
//
// Two modes:
//  - WINDOWED (pass `windowHeight`): a fixed preview window of `windowHeight`
//    desktop px, scaled to fit width, top-pinned, overflow clipped. Deterministic
//    — it never expands to the full page height (no "overblown" tall previews)
//    and needs no height measurement. Use this for inline previews where an
//    "open full" link shows the complete composition.
//  - AUTO (omit `windowHeight`): measures the document and grows to fit it.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 360;
const MAX_HEIGHT = 16000;

// Injected at the top of <head> before render: freezes animations/transitions so
// the preview is static, and (auto mode only) caps runaway 100vh layouts.
function safetyCss(cap: number) {
  return `<style>
  html, body { max-height: ${cap}px !important; overflow: hidden !important; }
  *, *::before, *::after {
    animation-duration: 0s !important; animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important; transition-delay: 0s !important;
  }
</style>`;
}

function patchHtml(html: string, cap: number): string {
  const css = safetyCss(cap);
  if (html.includes("<head>")) return html.replace("<head>", `<head>${css}`);
  const m = html.match(/<html[^>]*>/i);
  if (m) return html.replace(m[0], `${m[0]}<head>${css}</head>`);
  return css + html;
}

/**
 * Renders self-contained HTML at a fixed desktop width and scales it to fit the
 * container width. No scripts (sandbox without allow-scripts) so the preview is
 * static; `allow-same-origin` lets a srcdoc load same-origin assets (e.g. the
 * hero image proxy) and lets auto mode read the document height.
 */
export function ScaledFrame({
  html,
  title = "preview",
  viewportWidth = VIEWPORT_WIDTH,
  windowHeight,
}: {
  html: string;
  title?: string;
  viewportWidth?: number;
  /** When set, render a fixed preview window of this many desktop px (no auto-grow). */
  windowHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);
  const measureTimers = useRef<number[]>([]);
  const docObserver = useRef<ResizeObserver | null>(null);

  const windowed = typeof windowHeight === "number" && windowHeight > 0;
  // In windowed mode the body is clamped to the window; in auto mode it can grow.
  const frameHeight = windowed ? (windowHeight as number) : contentHeight;
  const srcDoc = html ? patchHtml(html, windowed ? (windowHeight as number) : MAX_HEIGHT) : "";

  // Track container width → scale. The ResizeObserver fires immediately on
  // observe(), setting the first scale, so there's no setState-in-effect.
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

  // Tear down pending measurement work on unmount / html change.
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
      const measured = Math.max(
        doc.documentElement.scrollHeight,
        body?.scrollHeight ?? 0,
        MIN_HEIGHT,
      );
      setContentHeight((prev) => {
        const next = Math.min(measured, MAX_HEIGHT);
        return Math.abs(next - prev) > 1 ? next : prev;
      });
    } catch {
      /* keep default */
    }
  }

  // AUTO mode only: settle the measured height across load / fonts / images.
  function onFrameLoad() {
    if (windowed) return;
    measureTimers.current.forEach((t) => window.clearTimeout(t));
    measureTimers.current = [];
    docObserver.current?.disconnect();
    docObserver.current = null;

    measureContent();
    for (const delay of [120, 350, 700, 1400]) {
      measureTimers.current.push(window.setTimeout(measureContent, delay));
    }
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try {
      doc.fonts?.ready?.then(() => measureContent()).catch(() => {});
      for (const img of Array.from(doc.images)) {
        if (!img.complete) {
          img.addEventListener("load", measureContent, { once: true });
          img.addEventListener("error", measureContent, { once: true });
        }
      }
      if (doc.body && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => measureContent());
        ro.observe(doc.body);
        docObserver.current = ro;
      }
    } catch {
      /* timed passes still apply */
    }
  }

  const ready = Boolean(srcDoc) && scale !== null;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-card"
      style={
        ready
          ? { height: frameHeight * (scale as number) }
          : { aspectRatio: `${viewportWidth} / ${windowed ? (windowHeight as number) : DEFAULT_HEIGHT}` }
      }
    >
      {ready ? (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="absolute left-0 top-0 border-0"
          style={{
            width: `${viewportWidth}px`,
            height: `${frameHeight}px`,
            transform: `scale(${scale as number})`,
            transformOrigin: "top left",
          }}
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
