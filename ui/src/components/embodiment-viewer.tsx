"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ExternalLink } from "lucide-react";
import { getFileUrl } from "@/lib/odata";

// Desktop viewport — embodiments render at 1440px internal width so
// their responsive CSS lands on the desktop breakpoint.
const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 400;
// Max internal body height on the detail page — generous enough for
// most tall designs but capped to prevent runaway 100vh layouts.
const MAX_HEIGHT = 5000;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Safety CSS injected at the top of <head> in the embodiment HTML
// before it's rendered via srcdoc. Prevents runaway body heights and
// kills continuous GPU work from animations/transitions.
const SAFETY_CSS = `<style>
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
</style>`;

function patchHtml(html: string): string {
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${SAFETY_CSS}`);
  }
  const m = html.match(/<html[^>]*>/i);
  if (m) {
    return html.replace(m[0], `${m[0]}<head>${SAFETY_CSS}</head>`);
  }
  return SAFETY_CSS + html;
}

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  // Auto-render the safety-patched preview by default. The srcdoc
  // injection caps layout from first paint, so mounting is safe.
  const url = getFileUrl(fileId);
  return <SafePreview fileId={fileId} url={url} />;
}

// ── Safety-patched in-page preview ─────────────────────────────────

function SafePreview({ fileId, url }: { fileId: string; url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const measuredRef = useRef(false);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(DEFAULT_HEIGHT);
  const [status, setStatus] = useState<"loading" | "ok" | "failed">(
    "loading",
  );

  // Fetch + patch the HTML before it hits the iframe renderer.
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        if (cancelled) return;
        setSrcDoc(patchHtml(html));
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Measure container width synchronously before paint.
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

  function measureContent() {
    if (measuredRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      // srcdoc iframes are treated as same-origin (inherit parent) so
      // contentDocument is accessible without allow-same-origin.
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
    setTimeout(measureContent, 400);
  }

  if (status === "loading" || scale === null || !srcDoc) {
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
        className="relative w-full overflow-hidden bg-card"
        style={{ height: scaledHeight }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="absolute left-0 top-0 border-0"
          style={{
            width: `${VIEWPORT_WIDTH}px`,
            height: `${contentHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          // No scripts, no same-origin — srcdoc already has patched content.
          sandbox=""
          onLoad={onIframeLoad}
          title="Design language embodiment"
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group absolute right-2 top-2 inline-flex items-center gap-1 rounded-[3px] border border-border bg-card/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground shadow-[0_1px_2px_rgba(30,35,45,0.08)] transition-all hover:-translate-y-[1px] hover:text-foreground"
      >
        <span className="hidden sm:inline">open full</span>
        <span className="sm:hidden">full</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
