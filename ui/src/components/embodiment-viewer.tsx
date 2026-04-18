"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getFileUrl } from "@/lib/odata";

// Fixed desktop viewport — embodiments are authored at ~1200–1440px.
// Lock the iframe's CSS width to 1440 so the embodiment's responsive CSS
// always lands on its desktop breakpoint, then transform-scale the whole
// iframe to fit whatever container width it's rendered in.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 400;
// Cap measured height to prevent feedback loops with embodiments that use
// 100vh / min-height: 100vh in their CSS — re-measuring after setting the
// iframe height grows the body, which grows the measurement, which grows
// the iframe height, which grows the body, ad infinitum until the tab
// dies. ~8 screens worth of height is plenty for real designs.
const MAX_HEIGHT = 6000;

// Use layoutEffect on the browser, regular effect on the server (SSR safe).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // null = not measured yet — we don't render the iframe until we know
  // the correct scale, so mobile never flashes a clipped "left side only".
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const url = getFileUrl(fileId);

  useEffect(() => {
    fetch(url, { method: "HEAD" })
      .then((res) => setStatus(res.ok ? "ok" : "failed"))
      .catch(() => setStatus("failed"));
  }, [url]);

  // Measure container width synchronously before paint so the first visible
  // frame already has the correct scale.
  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w > 0) setScale(w / VIEWPORT_WIDTH);
  }, []);

  // Track subsequent resizes (window resize, orientation change, etc.)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setScale(w / VIEWPORT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measuredRef = useRef(false);

  function measureContent() {
    // Only measure once — re-measuring after setting the iframe height
    // creates a feedback loop with embodiments using 100vh-based CSS.
    if (measuredRef.current) return;
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
      measuredRef.current = true;
      setContentHeight(Math.min(measured, MAX_HEIGHT));
    } catch {
      // Cross-origin or other error — keep default
    }
  }

  function onIframeLoad() {
    // Wait for layout to settle (fonts, images, reflow) then measure once.
    setTimeout(measureContent, 400);
  }

  if (status === "loading" || scale === null) {
    return (
      <div
        ref={containerRef}
        className="w-full animate-pulse bg-muted"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${DEFAULT_HEIGHT}` }}
      />
    );
  }

  if (status === "failed") {
    return (
      <div
        className="flex w-full items-center justify-center border border-dashed border-border bg-muted text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${DEFAULT_HEIGHT}` }}
      >
        embodiment not available
      </div>
    );
  }

  const scaledHeight = contentHeight * scale;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-white"
        style={{ height: scaledHeight }}
      >
        <iframe
          ref={iframeRef}
          src={url}
          className="absolute left-0 top-0 border-0"
          style={{
            width: `${VIEWPORT_WIDTH}px`,
            height: `${contentHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          // Deliberately NO allow-scripts — embodiments with heavy JS
          // (rAF loops, setInterval, layout-thrashing listeners) can crash
          // the tab. Static HTML + CSS still renders; JS animations are
          // sacrificed. allow-same-origin so we can measure contentDocument.
          sandbox="allow-same-origin"
          onLoad={onIframeLoad}
          title="Design language embodiment"
        />
      </div>
      {/* Mobile-friendly escape hatch: open the raw embodiment in its own
          tab, where pinch-zoom and native scroll work cleanly. */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group absolute right-2 top-2 inline-flex items-center gap-1 rounded-[3px] border border-border bg-white/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground shadow-[0_1px_2px_rgba(30,35,45,0.08)] transition-all hover:-translate-y-[1px] hover:text-foreground"
      >
        <span className="hidden sm:inline">open full</span>
        <span className="sm:hidden">full</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
