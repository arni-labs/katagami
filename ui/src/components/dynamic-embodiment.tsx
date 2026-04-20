"use client";

import { useEffect, useState, useRef, Component, type ReactNode } from "react";
import { getFileUrl } from "@/lib/odata";
import { fetchAndCompileTsx } from "@/lib/tsx-runtime";

// Fixed desktop viewport for iframe fallback (same as EmbodimentViewer)
const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

/**
 * Renders a design language embodiment.
 *
 * - `format === "tsx"` → fetches TSX, compiles in-browser via Sucrase,
 *    renders as a live React component in a style-isolated wrapper.
 * - `format === "html"` (default) → renders via sandboxed iframe (legacy path).
 */
export function DynamicEmbodiment({
  fileId,
  format = "html",
  className,
}: {
  fileId: string;
  format?: "html" | "tsx";
  className?: string;
}) {
  if (format === "tsx") {
    return <TsxEmbodiment fileId={fileId} className={className} />;
  }
  return <HtmlEmbodiment fileId={fileId} className={className} />;
}

// ── HTML (iframe) path ──────────────────────────────────────────────

function HtmlEmbodiment({
  fileId,
  className,
}: {
  fileId: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const [scale, setScale] = useState(0.5);
  const ref = useRef<HTMLDivElement>(null);
  const url = getFileUrl(fileId);

  useEffect(() => {
    fetch(url, { method: "HEAD" })
      .then((res) => setStatus(res.ok ? "ok" : "failed"))
      .catch(() => setStatus("failed"));
  }, [url]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setScale(w / VIEWPORT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (status === "loading") {
    return (
      <div
        className={`w-full animate-pulse bg-muted ${className ?? ""}`}
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
      />
    );
  }

  if (status === "failed") {
    return (
      <div
        className={`flex w-full items-center justify-center border border-dashed border-border bg-muted text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground ${className ?? ""}`}
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
      >
        embodiment not available
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden bg-card ${className ?? ""}`}
      style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
    >
      <iframe
        src={url}
        className="absolute left-0 top-0 border-0"
        style={{
          width: `${VIEWPORT_WIDTH}px`,
          height: `${VIEWPORT_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        sandbox="allow-scripts"
        title="Design language embodiment"
      />
    </div>
  );
}

// ── TSX (live React component) path ─────────────────────────────────

function TsxEmbodiment({
  fileId,
  className,
}: {
  fileId: string;
  className?: string;
}) {
  const [state, setState] = useState<{
    status: "loading" | "ok" | "failed";
    Component?: React.ComponentType;
    error?: string;
  }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchAndCompileTsx(fileId)
      .then((Component) => {
        if (!cancelled) setState({ status: "ok", Component });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ status: "failed", error: String(err.message ?? err) });
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (state.status === "loading") {
    return (
      <div
        className={`flex w-full items-center justify-center bg-muted ${className ?? ""}`}
        style={{ minHeight: 400 }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            compiling tsx…
          </span>
        </div>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center gap-2 border border-dashed border-destructive/30 bg-destructive/5 p-8 ${className ?? ""}`}
        style={{ minHeight: 200 }}
      >
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-destructive">
          tsx compilation failed
        </span>
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
          {state.error}
        </pre>
      </div>
    );
  }

  const { Component } = state;
  if (!Component) return null;

  return (
    <EmbodimentErrorBoundary>
      <div
        className={`katagami-embodiment-root ${className ?? ""}`}
        style={{
          isolation: "isolate",
          contain: "layout style",
        }}
      >
        <Component />
      </div>
    </EmbodimentErrorBoundary>
  );
}

// ── Error boundary ──────────────────────────────────────────────────

class EmbodimentErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-destructive/30 bg-destructive/5 p-8">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-destructive">
            embodiment render error
          </span>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
            {this.state.error}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
