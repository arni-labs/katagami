"use client";

import { GalleryImage } from "@/components/gallery-image";
import { bakedUrl } from "@/lib/baked-image.mjs";
import { canOptimizeGallerySrc, galleryImageSrc } from "@/lib/gallery-image";

type Width = 128 | 256 | 384 | 750 | 1080;
/** The optimizer's URL for a picture: resized on request, and cold for any browser whose Accept header it has not seen. */
const optimized = (src: string, width: Width) => (canOptimizeGallerySrc(src) ? `/_next/image?url=${encodeURIComponent(galleryImageSrc(src))}&w=${width}&q=75` : src); // 75 is the only quality the production optimizer accepts (next.config sets no `qualities`); the dev server takes any
/** A picture at a width, for a plain <img>: the resize baked onto the asset CDN when there is one (src/lib/baked-image.mjs),
 *  else the optimizer. A sheet that mounts stamps by the row as it is panned cannot afford a component with state per picture. */
export const quick = (src: string, width: Width) => bakedUrl(src, width) ?? optimized(src, width);
/** Where a baked picture falls back to if its file is not on the CDN yet (a style published since the last bake). */
export const fallbackOf = (src: string, width: Width) => (bakedUrl(src, width) ? optimized(src, width) : undefined);
/** A card's picture is hidden until it has arrived whole, then eases in: nothing half-drawn, no broken-picture mark. */
export const markReady = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.dataset.ready = "1"; };

/** A picture that fails is never shown failing: it is hidden at once and the next address in its chain is tried.
 *  The chain is the picture, then (when the first is a baked file) the optimizer's resize of it, then the card's
 *  second picture (a handful of entries have reference files that are gone from the store but a perfectly good
 *  thumbnail) and its optimizer resize, and only then nothing, so the card shows its ink rather than a
 *  broken-picture mark. A baked file that is missing is not there a second later either, so it goes straight to its
 *  fallback. A fallback is tried twice (behind a missing baked file the original is usually gone too); a picture
 *  with no baked file is tried four times, further apart each time, because a phone on a patchy connection drops
 *  requests in bursts. The chain is read from attributes React sets and never rewrites, and starts again
 *  whenever React gives the picture a new address (a zoom changes its width). No state: a sheet of hundreds cannot
 *  afford a hook per picture. */
export function retryThenHide(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget, d = img.dataset;
  if (!img.getAttribute("src")) return; // between tries, with nothing asked for
  delete d.ready;
  const go = (url: string) => { img.src = url; d.mine = img.src.split("#")[0]; };
  const failed = img.src.split("#")[0];
  if (failed !== d.mine) { d.base = failed; d.link = "0"; d.tries = "0"; }
  const links = [d.base, d.fallback, d.spare, d.spareFallback];
  let i = Number(d.link);
  const tries = Number(d.tries);
  if (!(i % 2 === 0 && links[i + 1]) && tries < (i % 2 ? 1 : 3)) {
    d.tries = String(tries + 1);
    const again = links[i]!;
    img.removeAttribute("src");
    window.setTimeout(() => { if (img.isConnected && !img.getAttribute("src")) go(`${again}#try${tries + 1}`); }, 1200 * 2 ** tries);
    return;
  }
  for (i++; i < links.length && !links[i]; i++);
  if (i < links.length) { d.link = String(i); d.tries = "0"; go(links[i]!); return; }
  d.gone = "1";
  img.style.visibility = "hidden";
}

/** A picture that arrived, or failed, before the page came alive has already fired the event that would have
 *  handled it, so it is looked at once when it is attached. A lazy picture not yet asked for has no current source
 *  and is left alone. A stable function, so React calls it on attach and detach only. */
export function caughtUp(img: HTMLImageElement | null) {
  if (!img?.complete || !img.currentSrc) return;
  if (img.naturalWidth) img.dataset.ready = "1";
  else retryThenHide({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>);
}

// ---- the paper ----------------------------------------------------------------
// A stamp's paper is one small drawing: a sheet with a row of half-round bites out of every side, evenly
// spaced so each corner keeps a full tooth, lying on its own soft shadow. It is drawn as an SVG and used as
// a background image, so a sheet of hundreds shares one picture per size: no mask, no filter and no shadow to
// composite per stamp. An SVG with a blur in it is drawn afresh wherever it is used, which shows as lag when
// panning, so each size is rendered once to a bitmap and every stamp of that size is switched to it through one
// CSS variable on the root (no re-render). The drawing is larger than the stamp all round, to hold the shadow —
// by enough for it, since the shadow grows with the card and a fixed margin cut a large one off in a straight line
// instead of letting it fade. A gaussian blur is spent by about three times its deviation.
const blurOf = (w: number) => Math.max(1.4, w / 50);
const dropOf = (w: number) => Math.max(1.2, w / 48);
const padOf = (w: number) => Math.ceil(blurOf(w) * 3 + dropOf(w) + 2);
/** Ordinary paper, and the slightly greyer paper a place the library has not filled yet is printed on. */
const TONE = "%23fbfaf7", TONE_SOON = "%23f3f1ec";
/** Too small for holes to read as holes: below this a stamp is a plain tile of ink and picture, with no paper. */
export const TILE = 26;
const nameOf = (w: number, h: number, flat: boolean, tone: string) => `--paper-${w}x${h}${flat ? "f" : ""}${tone.replace(/\W/g, "")}`;
const papers = new Map<string, string>();
const drawn = new Set<string>(); // the papers whose bitmap has arrived, as opposed to still being the SVG
/** Returns `var(--paper-…)`; the variable holds the SVG at first and the bitmap once it is ready. */
function paper(w: number, h: number, flat: boolean, tone: string): string {
  const key = nameOf(w, h, flat, tone), had = papers.get(key);
  if (had) return had;
  const pitch = Math.max(5.5, Math.min(11, w / 13));
  const side = (len: number) => { const n = Math.max(5, Math.round(len / pitch)); return { n, step: len / n }; };
  const top = side(w), left = side(h), r = Math.min(top.step, left.step) * 0.3;
  // Clockwise round the sheet. A row of holes was punched along every edge of the sheet this stamp was torn from,
  // and one falls on each corner: so a corner is a quarter bite, and between corners the bites are half rounds.
  const f = (n: number) => n.toFixed(2), arc = (x: number, y: number) => `A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(y)}`;
  let d = `M${f(r)} 0`;
  for (let i = 1; i < top.n; i++) d += `H${f(i * top.step - r)}${arc(i * top.step + r, 0)}`;
  d += `H${f(w - r)}${arc(w, r)}`;
  for (let i = 1; i < left.n; i++) d += `V${f(i * left.step - r)}${arc(w, i * left.step + r)}`;
  d += `V${f(h - r)}${arc(w - r, h)}`;
  for (let i = top.n - 1; i >= 1; i--) d += `H${f(i * top.step + r)}${arc(i * top.step - r, h)}`;
  d += `H${f(r)}${arc(0, h - r)}`;
  for (let i = left.n - 1; i >= 1; i--) d += `V${f(i * left.step + r)}${arc(0, i * left.step - r)}`;
  d += `V${f(r)}${arc(r, 0)}Z`;
  const PAD = padOf(w), W = w + PAD * 2, H = h + PAD * 2, blur = blurOf(w), drop = dropOf(w);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='${-PAD} ${-PAD} ${W} ${H}'>` +
    (flat ? "" : `<filter id='s' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='${blur.toFixed(1)}'/></filter><path d='${d}' transform='translate(0 ${drop.toFixed(1)})' fill='rgb(24,28,40)' opacity='.26' filter='url(%23s)'/>`) +
    `<path d='${d}' fill='${tone}'/></svg>`;
  const data = `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`, ref = `var(${key})`;
  papers.set(key, ref);
  if (typeof document === "undefined") return ref;
  const root = document.documentElement;
  root.style.setProperty(key, `url("${data}")`);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(3, Math.ceil(window.devicePixelRatio || 1)), c = document.createElement("canvas");
    c.width = W * scale; c.height = H * scale;
    const g = c.getContext("2d");
    if (!g) return;
    g.drawImage(img, 0, 0, c.width, c.height);
    // A little tooth, baked in and kept to the paper itself ("source-atop"): nothing lies over the bites, and a
    // stamp needs no separate grain layer.
    const grain = document.createElement("canvas"); grain.width = grain.height = 96;
    const gg = grain.getContext("2d");
    if (gg) {
      const px = gg.createImageData(96, 96);
      for (let i = 0; i < px.data.length; i += 4) { const v = Math.random(); px.data[i] = px.data[i + 1] = px.data[i + 2] = v > 0.5 ? 255 : 40; px.data[i + 3] = Math.abs(v - 0.5) * 22; }
      gg.putImageData(px, 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = g.createPattern(grain, "repeat") ?? "transparent";
      g.fillRect(0, 0, c.width, c.height);
    }
    c.toBlob((blob) => { if (!blob) return; root.style.setProperty(key, `url("${URL.createObjectURL(blob)}")`); drawn.add(key); });
  };
  img.src = data;
  return ref;
}

/** Draw the paper stamps of this size will want, and say whether its bitmap is there yet.
 *  A canvas that changes the size of every stamp before the bitmap has arrived puts the SVG on screen instead, and
 *  an SVG with a blur in it is rasterised afresh for every stamp that uses it — which is the lag the bitmap exists
 *  to avoid, now spread over a whole sheet at once. So a canvas that is about to change size asks here first and
 *  waits, carrying the difference however it likes until the answer is yes. */
export function paperDrawn(w: number, h: number) {
  if (w < TILE) return true; // nothing is drawn at that size anyway
  paper(w, h, false, TONE); paper(w, h, false, TONE_SOON);
  return drawn.has(nameOf(w, h, false, TONE)) && drawn.has(nameOf(w, h, false, TONE_SOON));
}

/** A stamp's paper margin and the height of its name band. The margin stops growing at 14px and the band at 30:
 *  a large stamp is a small stamp's picture made bigger, not its paper. */
export function frameOf(w: number, h: number, label: boolean) {
  return { edge: Math.min(14, Math.max(5, Math.round(w * 0.075))), foot: label ? Math.min(30, Math.max(10, Math.round(h * 0.105))) : 0 };
}

/** A perforated stamp carrying a style's picture: paper with a bitten edge, an even margin, the picture in a window with a hairline of shade inside it, and (when there is room) the name set small and spaced along the foot. */
export function Stamp({ src, ink, w, h, label, value, sizes = "160px", soon = false, veil = 0, lit, flat = false, fast, under, onShape, windowed = false, eager, first = false, spare }: { src: string | null; ink: string | null; w: number; h: number; label?: string; value?: string; sizes?: string; soon?: boolean; /** 0..1: how much of the picture is hidden under the style's ink (a stamp seen from far away). `--veil` on an ancestor scales it. */ veil?: number; /** Where the stamp's centre is, in the same pixel space as the light (--lx, --ly): makes it a light-reactive card. */ lit?: { x: number; y: number }; /** No shadow: a stamp still on its sheet, touching its neighbours. */ flat?: boolean; /** Draw the picture as a plain <img> at this optimizer width. */ fast?: 128 | 256 | 384 | 750 | 1080; /** A smaller picture already in hand, shown soft until the large one arrives. */ under?: string; /** Told the picture's own shape (width over height) once it has loaded. */ onShape?: (ratio: number) => void; /** `w` and `h` are the picture window's size, and the paper is added round it: for a stamp cut to fit a picture's own shape. */ windowed?: boolean; /** On screen: fetch it now rather than when the browser judges it near. */ eager?: boolean; /** Among the first on screen to be fetched. */ first?: boolean; /** A second picture to draw if the first one is gone from the store. */ spare?: string | null }) {
  // A large picture with no say from the sheet is the opened entry's, wanted now; the sheet says for itself, so a
  // zoomed-in sheet asking for large pictures keeps its own order.
  const big = eager === undefined && Boolean(fast && fast > 384);
  const picture = src && fast ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={src} src={quick(src, fast)} alt="" loading={eager || big ? "eager" : "lazy"} fetchPriority={first || big ? "high" : eager ? "auto" : "low"} decoding="async" draggable={false} data-fallback={fallbackOf(src, fast)} data-spare={spare ? quick(spare, fast) : undefined} data-spare-fallback={spare ? fallbackOf(spare, fast) : undefined} onError={retryThenHide} ref={caughtUp} onLoad={(e) => { markReady(e); const i = e.currentTarget; if (onShape && i.naturalWidth > 0) onShape(i.naturalWidth / i.naturalHeight); }} className="kimg absolute inset-0 h-full w-full object-cover" />
  ) : src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-cover" /> : null;
  // Too small for holes to read as holes: a plain tile of ink and picture.
  if (w < TILE) return (
    <span className="kwin relative block overflow-hidden [&_img]:object-cover" style={{ width: w, height: h, background: ink ?? "var(--muted)" }}>
      {picture}
      {veil > 0 ? <span aria-hidden className="absolute inset-0" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))` }} /> : null}
    </span>
  );
  const { edge, foot } = frameOf(w, h, Boolean(label));
  if (windowed) { w = Math.round(w) + edge * 2; h = Math.round(h) + edge * 2 + foot; }
  return (
    <span className={`kcard kstamp relative block ${lit ? "lit" : ""}`} style={{ ["--bite" as string]: `${edge}px`, ...(lit ? { ["--cx" as string]: lit.x, ["--cy" as string]: lit.y } : null), width: w, height: h }}>
      <span aria-hidden className="stamp-paper absolute" style={{ inset: -padOf(w), backgroundImage: paper(w, h, flat, soon ? TONE_SOON : TONE) }} />
      <span className="stamp-window absolute overflow-hidden [&_img]:object-cover" style={{ left: edge, right: edge, top: edge, bottom: edge + foot, background: soon ? undefined : ink ?? "var(--muted)", ...(under ? { backgroundImage: `url("${under}")`, backgroundSize: "cover", backgroundPosition: "center" } : null) }}>
        {veil > 0 && !soon ? <span aria-hidden className="absolute inset-0 z-[1]" style={{ background: ink ?? "var(--muted)", opacity: `calc(${veil} * var(--veil, 1))`, transition: "opacity 200ms" }} /> : null}
        {soon ? <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.55 }} /> : picture}
      </span>
      {label ? (
        <span className="absolute flex items-center justify-between gap-1 font-mono uppercase text-[#22211e]" style={{ left: edge, right: edge, bottom: Math.round(edge * 0.55), height: foot, fontSize: Math.max(6.5, Math.min(13, foot * 0.52)), letterSpacing: "0.1em", lineHeight: 1 }}>
          <span className="truncate font-medium">{label}</span>
          {value ? <span className="shrink-0 font-bold">{value}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
