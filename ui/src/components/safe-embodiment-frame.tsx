"use client";

import { useEffect, useState } from "react";

/**
 * Renders an embodiment's HTML inside an iframe AFTER injecting a safety
 * stylesheet into the HTML source. The crucial difference from a normal
 * iframe: the patched content hits the renderer from the first paint, so
 * heavy designs never get a chance to exhaust GPU/CPU before we cap them.
 *
 * The safety stylesheet:
 *   - caps html/body height and hides overflow (no runaway 100vh layouts)
 *   - zeroes all animation and transition durations (no continuous GPU work)
 *
 * Using srcdoc (not src) lets the browser render from the patched string
 * immediately; we don't need allow-same-origin or post-hoc contentDocument
 * access.
 */

const SAFETY_CSS = `<style>
  html, body {
    max-height: 1800px !important;
    overflow: hidden !important;
  }
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
</style>`;

function patchHtml(html: string): string {
  // Inject the safety CSS as the FIRST thing in <head> so it sits above
  // whatever rules the embodiment defines — our !important beats theirs.
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${SAFETY_CSS}`);
  }
  if (html.match(/<html[^>]*>/i)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${SAFETY_CSS}</head>`);
  }
  // Fallback: just prepend
  return SAFETY_CSS + html;
}

// Per-session cache of patched HTML by fileId so re-mounting (scroll past
// and back) doesn't re-fetch.
const patchedCache = new Map<string, string>();

export function SafeEmbodimentFrame({
  fileId,
  url,
  width,
  height,
  scale,
  title,
}: {
  fileId: string;
  url: string;
  width: number;
  height: number;
  scale: number;
  title: string;
}) {
  const [srcDoc, setSrcDoc] = useState<string | null>(() =>
    patchedCache.get(fileId) ?? null,
  );

  useEffect(() => {
    if (patchedCache.has(fileId)) {
      setSrcDoc(patchedCache.get(fileId)!);
      return;
    }
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        if (cancelled) return;
        const patched = patchHtml(html);
        patchedCache.set(fileId, patched);
        setSrcDoc(patched);
      })
      .catch(() => {
        if (!cancelled) setSrcDoc("");
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, url]);

  if (!srcDoc) {
    // Caller's outer container already shows a placeholder; render nothing.
    return null;
  }

  return (
    <iframe
      srcDoc={srcDoc}
      className="absolute left-0 top-0 border-0 opacity-0 transition-opacity duration-200"
      onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        pointerEvents: "none",
      }}
      tabIndex={-1}
      loading="lazy"
      sandbox=""
      title={title}
      aria-hidden
    />
  );
}
