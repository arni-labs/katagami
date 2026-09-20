"use client";

import { GalleryImage } from "@/components/gallery-image";
import { canOptimizeGallerySrc, galleryImageSrc } from "@/lib/gallery-image";

/** The optimizer's URL for a thumbnail, for a plain <img>: a sheet that mounts stamps by the row as it is panned cannot afford a component with state per picture. */
export const quick = (src: string, width: 128 | 256 | 384 | 750 | 1080) => (canOptimizeGallerySrc(src) ? `/_next/image?url=${encodeURIComponent(galleryImageSrc(src))}&w=${width}&q=75` : src); // 75 is the only quality the production optimizer accepts (next.config sets no `qualities`); the dev server takes any

/** A picture that fails is asked for once more (a cold optimizer under a burst of requests sometimes times out);
 *  if it fails again it is hidden, and the stamp shows its ink instead of a broken-picture mark. No state: a sheet
 *  of hundreds cannot afford a hook per picture. */
function retryThenHide(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.retried) { img.style.visibility = "hidden"; return; }
  img.dataset.retried = "1";
  const again = img.src;
  window.setTimeout(() => { if (img.isConnected) img.src = `${again}${again.includes("#") ? "" : "#again"}`; }, 1400);
  img.removeAttribute("src");
}

// ---- the paper ----------------------------------------------------------------
// A stamp's paper is one small drawing: a sheet with a row of half-round bites out of every side, evenly
// spaced so each corner keeps a full tooth, lying on its own soft shadow. It is drawn as an SVG and used as
// a background image, so a sheet of hundreds shares one picture per size: no mask, no filter and no shadow to
// composite per stamp. An SVG with a blur in it is drawn afresh wherever it is used, which shows as lag when
// panning, so each size is rendered once to a bitmap and every stamp of that size is switched to it through one
// CSS variable on the root (no re-render). The drawing is larger than the stamp by PAD all round, to hold the shadow.
const PAD = 12;
const papers = new Map<string, string>();
/** Returns `var(--paper-…)`; the variable holds the SVG at first and the bitmap once it is ready. */
function paper(w: number, h: number, flat: boolean, tone: string): string {
  const key = `--paper-${w}x${h}${flat ? "f" : ""}${tone.replace(/\W/g, "")}`, had = papers.get(key);
  if (had) return had;
  const pitch = Math.max(6.5, Math.min(13, w / 10.5));
  const side = (len: number) => { const n = Math.max(4, Math.round(len / pitch)); return { n, step: len / n }; };
  const top = side(w), left = side(h), r = Math.min(top.step, left.step) * 0.29;
  // Clockwise round the sheet; each bite is a half circle cut inward, centred between two teeth.
  let d = `M0 0`;
  for (let i = 0; i < top.n; i++) { const c = (i + 0.5) * top.step; d += `H${(c - r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(c + r).toFixed(2)} 0`; }
  d += `H${w}`;
  for (let i = 0; i < left.n; i++) { const c = (i + 0.5) * left.step; d += `V${(c - r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${w} ${(c + r).toFixed(2)}`; }
  d += `V${h}`;
  for (let i = top.n - 1; i >= 0; i--) { const c = (i + 0.5) * top.step; d += `H${(c + r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(c - r).toFixed(2)} ${h}`; }
  d += `H0`;
  for (let i = left.n - 1; i >= 0; i--) { const c = (i + 0.5) * left.step; d += `V${(c + r).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 0 ${(c - r).toFixed(2)}`; }
  d += `Z`;
  const W = w + PAD * 2, H = h + PAD * 2, blur = Math.max(1.6, w / 42), drop = Math.max(1.5, w / 36);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='${-PAD} ${-PAD} ${W} ${H}'>` +
    (flat ? "" : `<filter id='s' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='${blur.toFixed(1)}'/></filter><path d='${d}' transform='translate(0 ${drop.toFixed(1)})' fill='rgb(24,28,40)' opacity='.42' filter='url(%23s)'/>`) +
    `<path d='${d}' fill='${tone}'/><path d='${d}' fill='none' stroke='rgba(60,48,30,.16)' stroke-width='.75'/></svg>`;
  const data = `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`, ref = `var(${key})`;
  papers.set(key, ref);
  if (typeof document === "undefined") return ref;
  const root = document.documentElement;
  root.style.setProperty(key, `url("${data}")`);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(3, Math.ceil(window.devicePixelRatio || 1)), c = document.createElement("canvas");
    c.width = W * scale; c.height = H * scale;
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((blob) => { if (blob) root.style.setProperty(key, `url("${URL.createObjectURL(blob)}")`); });
  };
  img.src = data;
  return ref;
}

/** A perforated stamp carrying a style's picture: paper with a bitten edge, an even margin, the picture in a window with a hairline of shade inside it, and (when there is room) the name set small and spaced along the foot. */
export function Stamp({ src, ink, w, h, label, value, sizes = "160px", soon = false, veil = 0, lit, flat = false, fast }: { src: string | null; ink: string | null; w: number; h: number; label?: string; value?: string; sizes?: string; soon?: boolean; /** 0..1: how much of the picture is hidden under the style's ink (a stamp seen from far away). `--veil` on an ancestor scales it. */ veil?: number; /** Where the stamp's centre is, in the same pixel space as the light (--lx, --ly): makes it a light-reactive card. */ lit?: { x: number; y: number }; /** No shadow: a stamp still on its sheet, touching its neighbours. */ flat?: boolean; /** Draw the picture as a plain <img> at this optimizer width. */ fast?: 128 | 256 | 384 }) {
  // Too small for holes to read as holes: a plain tile of ink and picture.
  if (w < 26) return (
    <span className="relative block overflow-hidden [&_img]:object-cover" style={{ width: w, height: h, background: ink ?? "var(--muted)" }}>
      {src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-cover" /> : null}
      {veil > 0 ? <span aria-hidden className="absolute inset-0" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))` }} /> : null}
    </span>
  );
  const edge = Math.max(5, Math.round(w * 0.085)), foot = label ? Math.max(11, Math.round(h * (h > 300 ? 0.085 : 0.115))) : 0;
  return (
    <span className={`stamp relative block ${lit ? "lit" : ""}`} style={{ ...(lit ? { ["--cx" as string]: lit.x, ["--cy" as string]: lit.y } : null), width: w, height: h }}>
      <span aria-hidden className="stamp-paper absolute" style={{ inset: -PAD, backgroundImage: paper(w, h, flat, soon ? "%23f3ede0" : "%23f7f2e6") }} />
      {w >= 70 ? <span aria-hidden className="stamp-grain" style={{ inset: Math.ceil(w * 0.03) }} /> : null /* too small to see, and one layer fewer on a sheet of hundreds */}
      <span className="stamp-window absolute overflow-hidden [&_img]:object-cover" style={{ left: edge, right: edge, top: edge, bottom: edge + foot, background: soon ? undefined : ink ?? "var(--muted)" }}>
        {veil > 0 && !soon ? <span aria-hidden className="absolute inset-0 z-[1]" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))`, transition: "opacity 200ms" }} /> : null}
        {soon ? <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.55 }} /> : src && fast ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={quick(src, fast)} alt="" loading="lazy" decoding="async" draggable={false} onError={retryThenHide} className="absolute inset-0 h-full w-full object-cover" />
        ) : src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-cover" /> : null}
      </span>
      {label ? (
        <span className="absolute flex items-center justify-between gap-1 font-mono uppercase text-[#1b1a17]" style={{ left: edge, right: edge, bottom: Math.round(edge * 0.62), height: foot, fontSize: Math.max(6.5, Math.min(15, foot * 0.56)), letterSpacing: "0.09em", lineHeight: 1 }}>
          <span className="truncate font-bold">{label}</span>
          {value ? <span className="shrink-0 font-bold">{value}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
