"use client";

import { useEffect, useRef, useState } from "react";
import { getFileUrl } from "@/lib/odata";

// Fixed desktop viewport — embodiments are authored at ~1200–1440px.
// Anything wider leaves blank margins, anything narrower triggers tablet
// breakpoints in responsive designs.
const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

export function EmbodimentViewer({ fileId }: { fileId: string }) {
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
        className="w-full animate-pulse bg-muted"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
      />
    );
  }

  if (status === "failed") {
    return (
      <div
        className="flex w-full items-center justify-center border border-dashed border-border bg-muted text-center font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
      >
        embodiment not available
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-white"
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
