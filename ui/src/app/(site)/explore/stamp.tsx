"use client";

import { GalleryImage } from "@/components/gallery-image";
import { canOptimizeGallerySrc, galleryImageSrc } from "@/lib/gallery-image";

/** The optimizer's URL for a thumbnail, for a plain <img>: a sheet that mounts stamps by the row as it is panned cannot afford a component with state per picture. */
const quick = (src: string, width: 128 | 256 | 384) => (canOptimizeGallerySrc(src) ? `/_next/image?url=${encodeURIComponent(galleryImageSrc(src))}&w=${width}&q=70` : src);

/** A perforated stamp carrying a style's picture. The hole pitch is fitted to each side so holes meet the corners evenly. */
export function Stamp({ src, ink, w, h, label, value, sizes = "160px", soon = false, veil = 0, lit, punch, fast }: { src: string | null; ink: string | null; w: number; h: number; label?: string; value?: string; sizes?: string; soon?: boolean; /** 0..1: how much of the picture is hidden under the style's ink (a stamp seen from far away). `--veil` on an ancestor scales it. */ veil?: number; /** Where the stamp's centre is, in the same pixel space as the light (--lx, --ly): makes it a light-reactive card. */ lit?: { x: number; y: number }; /** The colour the stamp lies on: holes are painted in it instead of cut, which is far cheaper across a sheet of hundreds. */ punch?: string; /** Draw the picture as a plain <img> at this optimizer width. */ fast?: 128 | 256 | 384 }) {
  // Too small for holes to read as holes: a plain tile of ink and picture.
  if (w < 26) return (
    <span className="relative block overflow-hidden [&_img]:object-cover" style={{ width: w, height: h, background: ink ?? "var(--muted)" }}>
      {src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-cover" /> : null}
      {veil > 0 ? <span aria-hidden className="absolute inset-0" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))` }} /> : null}
    </span>
  );
  const pitch = Math.max(5, Math.min(11, w / 9));
  const pw = w / Math.max(3, Math.round(w / pitch)), ph = h / Math.max(3, Math.round(h / pitch));
  const edge = Math.max(3, Math.round(Math.min(pw, ph) * 0.62)), foot = label ? Math.max(12, Math.round(h * (h > 300 ? 0.11 : 0.16))) : 0;
  return (
    <span className={`stamp relative block ${lit ? "lit" : ""} ${punch ? "stamp-punched" : ""}`} style={{ ...(punch ? { ["--punch" as string]: punch } : null), ...(lit ? { ["--cx" as string]: lit.x, ["--cy" as string]: lit.y } : null), width: w, height: h, ["--w" as string]: `${w}px`, ["--h" as string]: `${h}px`, ["--p" as string]: `${Math.min(pw, ph)}px`, ["--pw" as string]: `${pw}px`, ["--ph" as string]: `${ph}px` }}>
      <span className="absolute overflow-hidden [&_img]:object-cover" style={{ left: edge, right: edge, top: edge, bottom: edge + foot, background: soon ? undefined : ink ?? "var(--muted)" }}>
        {veil > 0 && !soon ? <span aria-hidden className="absolute inset-0 z-[1]" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))`, transition: "opacity 200ms" }} /> : null}
        {soon ? <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.55 }} /> : src && fast ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={quick(src, fast)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-cover" /> : null}
      </span>
      <span aria-hidden className="stamp-grain" />
      {punch ? <span aria-hidden className="stamp-holes" /> : null}
      {label ? (
        <span className="absolute flex items-baseline justify-between gap-1 text-black" style={{ left: edge + 1, right: edge + 1, bottom: edge - 1, height: foot, fontSize: Math.max(8, Math.min(19, foot * 0.5)), lineHeight: `${foot}px` }}>
          <span className="truncate font-semibold">{label}</span>
          {value ? <span className="shrink-0 font-mono" style={{ fontSize: "0.85em" }}>{value}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
