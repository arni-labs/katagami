"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getFileUrl } from "@/lib/odata";
import { ScaledFrame } from "@/components/scaled-frame";

const VIEWPORT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;

/**
 * Fetches a self-contained embodiment (by file id or URL) and renders it via the
 * shared ScaledFrame — the same desktop-render-then-scale path the studio uses,
 * so nothing overflows or crops. Adds an "open full" escape hatch to the source.
 */
export function EmbodimentViewer({
  fileId,
  src,
}: {
  fileId?: string;
  src?: string;
}) {
  const url = src ?? (fileId ? getFileUrl(fileId) : "");
  // Keyed by url inside the state so a changed source shows loading until its
  // own fetch resolves — correct whether or not the parent remounts us, and we
  // only ever setState from async callbacks (no synchronous setState-in-effect).
  const [data, setData] = useState<{ url: string; html: string | null; failed: boolean }>({
    url,
    html: null,
    failed: false,
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        if (!cancelled) setData({ url, html: t, failed: false });
      })
      .catch(() => {
        if (!cancelled) setData({ url, html: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const fresh = data.url === url ? data : { url, html: null, failed: false };
  if (!url || fresh.failed) return <UnavailablePreview />;
  if (fresh.html === null) {
    return (
      <div
        className="w-full animate-pulse bg-muted"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${DEFAULT_HEIGHT}` }}
      />
    );
  }

  return (
    <div className="relative">
      <ScaledFrame html={fresh.html} title="Design language embodiment" />
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

function UnavailablePreview() {
  return (
    <div
      className="flex w-full items-center justify-center border border-dashed border-border bg-muted text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground"
      style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${DEFAULT_HEIGHT}` }}
    >
      embodiment not available
    </div>
  );
}
