"use client";

import { useEffect, useRef, useState } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
import { injectTheme, themeOverrideStyle, type Roles } from "@/lib/remix-theme";

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
  initialHtml,
}: {
  compositionUrl: string;
  roles: Roles;
  hero?: string;
  /** Server-read landing HTML so --primary is in the SSR iframe, not payload-only. */
  initialHtml?: string;
}) {
  const [raw, setRaw] = useState<{ url: string; html: string } | null>(() =>
    compositionUrl && initialHtml ? { url: compositionUrl, html: initialHtml } : null,
  );
  const rawRef = useRef(raw);
  rawRef.current = raw;

  useEffect(() => {
    if (!compositionUrl) return;
    const have = rawRef.current;
    if (have?.url === compositionUrl && have.html) return;
    let cancelled = false;
    fetch(compositionUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        if (!cancelled) setRaw({ url: compositionUrl, html: t });
      })
      .catch(() => {
        if (!cancelled) {
          setRaw((prev) =>
            prev?.url === compositionUrl && prev.html
              ? prev
              : { url: compositionUrl, html: "" },
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [compositionUrl]);

  const fresh = raw && raw.url === compositionUrl ? raw.html : null;
  const tokens = (
    <div
      hidden
      data-remix-theme=""
      dangerouslySetInnerHTML={{ __html: themeOverrideStyle(roles, hero) }}
    />
  );

  if (!compositionUrl) {
    return (
      <div className="grid aspect-[16/10] w-full place-items-center bg-muted text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        no composition
      </div>
    );
  }
  if (fresh === null) {
    return (
      <>
        {tokens}
        <div className="aspect-[16/10] w-full animate-pulse bg-muted" />
      </>
    );
  }

  const html = injectTheme(fresh, roles, hero);
  return (
    <>
      {tokens}
      <ScaledFrame html={html} title="Remix preview" />
    </>
  );
}
