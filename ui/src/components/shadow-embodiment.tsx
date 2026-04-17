"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEmbodimentHtml } from "@/lib/html-cache";

/** Renders an embodiment's HTML inside a Shadow DOM attached to the host div.
 *
 *  Compared to an iframe: no separate browsing context, no separate document,
 *  no separate JS engine, no separate style resolver. Styles inside the
 *  shadow root are fully isolated from the parent (and vice-versa). Scripts
 *  are stripped before injection for security.
 *
 *  The host is rendered at a fixed 1440×PREVIEW_HEIGHT virtual viewport and
 *  transform-scaled to fit its parent container — same trick we used with
 *  iframes, but vastly cheaper.
 */

const VIRTUAL_WIDTH = 1440;
const VIRTUAL_HEIGHT = 960;

export function ShadowEmbodiment({
  fileId,
  scale,
}: {
  fileId: string;
  scale: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetchEmbodimentHtml(fileId)
      .then((h) => {
        if (!cancelled) setHtml(h);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!html) {
      if (host.shadowRoot) host.shadowRoot.innerHTML = "";
      return;
    }
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.innerHTML = html;
  }, [html]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
        not available
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="absolute left-0 top-0"
      style={{
        width: `${VIRTUAL_WIDTH}px`,
        height: `${VIRTUAL_HEIGHT}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        pointerEvents: "none",
      }}
    />
  );
}
