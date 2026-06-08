"use client";

import { useEffect, useState } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
import { injectTheme, type Roles } from "@/lib/remix-theme";

/**
 * Live remix preview: fetches a language's bespoke composition HTML (landing or
 * dashboard), injects the chosen palette's roles + the art style's hero image,
 * and renders it scaled via the shared ScaledFrame. The single recolor+preview
 * path used by the studio and all detail-page remixes.
 */
export function RemixPreview({
  compositionUrl,
  roles,
  hero,
}: {
  compositionUrl: string;
  roles: Roles;
  hero?: string;
}) {
  const [raw, setRaw] = useState<{ url: string; html: string } | null>(null);

  useEffect(() => {
    if (!compositionUrl) return;
    let cancelled = false;
    fetch(compositionUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        if (!cancelled) setRaw({ url: compositionUrl, html: t });
      })
      .catch(() => {
        if (!cancelled) setRaw({ url: compositionUrl, html: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [compositionUrl]);

  const fresh = raw && raw.url === compositionUrl ? raw.html : null;

  if (!compositionUrl) {
    return (
      <div className="grid aspect-[16/10] w-full place-items-center bg-muted text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        no composition
      </div>
    );
  }
  if (fresh === null) {
    return <div className="aspect-[16/10] w-full animate-pulse bg-muted" />;
  }

  const html = injectTheme(fresh, roles, hero);
  return <ScaledFrame html={html} title="Remix preview" />;
}
