"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ExternalLink, Play } from "lucide-react";
import { getFileUrl } from "@/lib/odata";

// Fixed desktop viewport — embodiments are authored at ~1200–1440px.
// Lock the iframe's CSS width to 1440 so the embodiment's responsive CSS
// always lands on its desktop breakpoint, then transform-scale the whole
// iframe to fit whatever container width it's rendered in.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 400;
// Cap measured height to prevent feedback loops with embodiments that use
// 100vh / min-height: 100vh in their CSS.
const MAX_HEIGHT = 6000;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  // Don't auto-load the iframe — some embodiments have content (heavy
  // inline assets, complex CSS, runaway layouts) that crash the tab
  // before a single user interaction. User opts in by clicking.
  const [loaded, setLoaded] = useState(false);
  const url = getFileUrl(fileId);

  if (!loaded) {
    return (
      <div
        className="relative flex w-full flex-col items-center justify-center gap-3 border border-dashed border-border bg-muted/30 p-8 text-center"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${DEFAULT_HEIGHT}` }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          preview paused
        </div>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Some embodiments render heavy layouts that can freeze the tab.
          Click to load the in-page preview, or open it in its own tab.
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group inline-flex items-center gap-1.5 border border-foreground/80 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground shadow-[0_1px_2px_rgba(30,35,45,0.08)] transition-all hover:-translate-y-[1px] hover:shadow-[0_3px_6px_rgba(30,35,45,0.12)]"
          >
            <Play className="h-3 w-3" />
            show preview
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 border border-border bg-white/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[1px] hover:text-foreground"
          >
            open full
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return <LivePreview fileId={fileId} />;
}

// ── Live preview — actual iframe render ─────────────────────────────

function LivePreview({ fileId }: { fileId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const measuredRef = useRef(false);
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);
  const [status, setStatus] = useState<"loading" | "ok" | "failed">(
    "loading",
  );
  const url = getFileUrl(fileId);

  useEffect(() => {
    fetch(url, { method: "HEAD" })
      .then((res) => setStatus(res.ok ? "ok" : "failed"))
      .catch(() => setStatus("failed"));
  }, [url]);

  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w > 0) setScale(w / VIEWPORT_WIDTH);
  }, []);

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

  function injectSafetyStyles() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      // Inject hard caps + animation kill inside the iframe. Prevents:
      //   - runaway body height from 100vh-based CSS (we set iframe height,
      //     iframe internal 100vh = that, body fills it, content grows)
      //   - continuous GPU work from CSS animations / transitions
      //   - internal scrollbars causing reflow thrash
      const style = doc.createElement("style");
      style.textContent = `
        html, body {
          max-height: ${MAX_HEIGHT}px !important;
          overflow: hidden !important;
        }
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      doc.head.appendChild(style);
    } catch {
      // Cross-origin or other error — skip
    }
  }

  function measureContent() {
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
    // Cap the embodiment's internal layout BEFORE we measure / render.
    injectSafetyStyles();
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
          // No allow-scripts — blocks rAF loops, setInterval, and other
          // JS that can crash the tab. Static HTML + CSS still renders.
          sandbox="allow-same-origin"
          onLoad={onIframeLoad}
          title="Design language embodiment"
        />
      </div>
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
