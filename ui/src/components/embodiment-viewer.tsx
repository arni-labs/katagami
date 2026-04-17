"use client";

import { useEffect, useRef, useState } from "react";
import { getFileUrl } from "@/lib/odata";

// Fixed desktop viewport — embodiments are authored at ~1200–1440px.
// We lock the iframe's viewport width to 1440 so responsive CSS always
// lands on the desktop breakpoint, then transform-scale the iframe to
// fit whatever container width it's rendered in.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 400;

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.5);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const url = getFileUrl(fileId);

  useEffect(() => {
    fetch(url, { method: "HEAD" })
      .then((res) => setStatus(res.ok ? "ok" : "failed"))
      .catch(() => setStatus("failed"));
  }, [url]);

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
      setContentHeight(measured);
    } catch {
      // Cross-origin or other error — keep default
    }
  }

  // Re-measure a few times after load in case the embodiment's layout
  // settles asynchronously (fonts loading, images, etc.)
  function onIframeLoad() {
    measureContent();
    const delays = [60, 160, 400, 1000];
    delays.forEach((t) => setTimeout(measureContent, t));
  }

  if (status === "loading") {
    return (
      <div
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

  // The container grows to match the scaled content height so the entire
  // embodiment is visible — no cropping.
  const scaledHeight = contentHeight * scale;

  return (
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
        sandbox="allow-scripts allow-same-origin"
        onLoad={onIframeLoad}
        title="Design language embodiment"
      />
    </div>
  );
}
