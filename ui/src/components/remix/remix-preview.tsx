"use client";

import { useEffect, useRef, useState } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
import {
  compositionBindDecls,
  injectTheme,
  themeOverrideStyle,
  type Roles,
} from "@/lib/remix-theme";

function remixAccent(roles: Roles): string {
  return roles.accent || "#3a6df0";
}

/**
 * Leftover 1 lives here: iframe srcDoc --primary is the selected accent.
 * Contrast-max / live Bluet wrote --primary:#FFD400 and left Ember in
 * sr-only (--primary:#C8442A count 0). Rewrite every --primary:#hex, then
 * append a final :root bind. Empty HTML stays empty (leftover 2).
 */
export function remixPreviewSrcDoc(
  fresh: string,
  roles: Roles,
  hero?: string,
): string {
  if (!fresh) return "";
  const accent = remixAccent(roles);
  const themed = injectTheme(fresh, roles, hero);
  const rebound = themed.replace(
    /--primary\s*:\s*#[0-9A-Fa-f]{3,8}/g,
    `--primary:${accent}`,
  );
  const tail = `<style id="remix-preview-primary">:root{--primary:${accent}}</style>`;
  return rebound.includes("</body>")
    ? rebound.replace("</body>", `${tail}</body>`)
    : rebound + tail;
}

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
  const accent = remixAccent(roles);
  const tokens = (
    <div
      hidden
      data-remix-theme=""
      dangerouslySetInnerHTML={{
        __html: themeOverrideStyle(roles, hero, [
          `--primary:${accent}`,
          ...compositionBindDecls(fresh || "", roles, hero),
        ]),
      }}
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

  const html = remixPreviewSrcDoc(fresh, roles, hero);
  return (
    <>
      {tokens}
      <ScaledFrame html={html} title="Remix preview" />
    </>
  );
}
