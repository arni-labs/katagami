"use client";

import { createContext, useContext } from "react";
import { Stamp, quick } from "./stamp";

// The card a style is shown as on the explore canvas, in six materials to choose between. Every skin takes the
// same things (a picture, the style's ink, a size, a name) and answers to light the same way (`.lit`), so the
// canvas, the results and the opened entry do not know which one they are drawing.
//   stamp     a perforated postage stamp (stamp.tsx)
//   stencil   katagami proper: persimmon-dyed stencil paper with the picture showing through a cut window
//   swatch    a paint chip: the picture over its inks, with a colour code
//   proof     a risograph proof: registration crosses, a colour bar, a block of ink out of register
//   slide     a 35mm transparency in its mount
//   specimen  a museum label: the picture, and a typed accession line under it

export const SKINS = ["stamp", "stencil", "swatch", "proof", "slide", "specimen"] as const;
export type Skin = (typeof SKINS)[number];
export const SKIN_NAME: Record<Skin, string> = { stamp: "Stamp", stencil: "Stencil", swatch: "Swatch", proof: "Riso proof", slide: "Slide", specimen: "Specimen" };
export const SkinContext = createContext<Skin>("stamp");

type CardProps = { src: string | null; ink: string | null; w: number; h: number; label?: string; value?: string; soon?: boolean; lit?: { x: number; y: number }; fast?: 128 | 256 | 384 | 750 | 1080; under?: string; /** `w`/`h` are the picture's size; the card is built round it. */ windowed?: boolean; /** A steady number for this entry, for skins that print one. */ code?: string };

/** What each skin puts round the picture: margins, and the height of the band that carries the name. Margins stop growing, so a large card is a large picture, not a large frame. */
function frame(skin: Skin, w: number, label: boolean) {
  const cap = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
  switch (skin) {
    case "stencil": return { x: cap(w * 0.09, 6, 18), top: cap(w * 0.09, 6, 18), foot: label ? cap(w * 0.2, 14, 34) : cap(w * 0.09, 6, 18) };
    case "swatch": return { x: 0, top: 0, foot: label ? cap(w * 0.34, 20, 58) : cap(w * 0.12, 8, 18) };
    case "proof": return { x: cap(w * 0.08, 6, 16), top: cap(w * 0.1, 7, 20), foot: label ? cap(w * 0.2, 14, 34) : cap(w * 0.1, 7, 20) };
    case "slide": return { x: cap(w * 0.11, 7, 22), top: cap(w * 0.15, 9, 30), foot: label ? cap(w * 0.2, 13, 36) : cap(w * 0.15, 9, 30) };
    default: return { x: 0, top: 0, foot: label ? cap(w * 0.2, 14, 32) : 0 }; // specimen
  }
}

const tints = (ink: string | null) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt((ink ?? "#9ba1a6").slice(i, i + 2), 16));
  const mix = (t: number, to: number) => `rgb(${[r, g, b].map((v) => Math.round(v + (to - v) * t)).join(",")})`;
  return [mix(0.55, 255), mix(0.25, 255), mix(0, 0), mix(0.35, 0), mix(0.65, 0)];
};

export function Card(props: CardProps) {
  const skin = useContext(SkinContext);
  if (skin === "stamp") return <Stamp {...props} />;
  const { src, ink, label, value, soon = false, lit, fast, under, windowed = false, code } = props;
  let { w, h } = props;
  const f = frame(skin, w, Boolean(label));
  if (windowed) { w = Math.round(w) + f.x * 2; h = Math.round(h) + f.top + f.foot; }
  const type = Math.max(6.5, Math.min(13, f.foot * 0.36));
  const picture = (
    <span className="absolute overflow-hidden" style={{ left: f.x, right: f.x, top: f.top, bottom: f.foot, background: soon ? undefined : ink ?? "var(--muted)", ...(under ? { backgroundImage: `url("${under}")`, backgroundSize: "cover", backgroundPosition: "center" } : null), ...(skin === "slide" ? { borderRadius: 2 } : null) }}>
      {soon ? <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.55 }} /> : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={fast ? quick(src, fast) : quick(src, 256)} alt="" loading={fast && fast > 384 ? "eager" : "lazy"} decoding="async" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </span>
  );
  const name = label ? <span className="truncate">{label}</span> : null;
  const litStyle = { ["--bite" as string]: "0px", ...(lit ? { ["--cx" as string]: lit.x, ["--cy" as string]: lit.y } : null) };
  const shell = `card-${skin} relative block ${lit ? "lit" : ""}`;

  if (skin === "stencil") return (
    <span className={shell} style={{ ...litStyle, width: w, height: h }}>
      {picture}
      {/* The cut edge: stencil paper is thick, and the knife leaves a lighter lip round the window. */}
      <span aria-hidden className="absolute" style={{ left: f.x, right: f.x, top: f.top, bottom: f.foot, boxShadow: "inset 0 0 0 1px rgba(255,220,180,0.28), inset 0 2px 4px rgba(0,0,0,0.45)" }} />
      {label ? <span className="absolute flex items-center justify-between gap-1 font-mono uppercase text-[#f3e6d2]" style={{ left: f.x, right: f.x, bottom: 0, height: f.foot, fontSize: type, letterSpacing: "0.1em" }}>{name}{value ? <span className="shrink-0 opacity-70">{value}</span> : <span aria-hidden className="card-stencil-dots shrink-0" style={{ width: f.foot * 1.4, height: f.foot * 0.42 }} />}</span> : null}
    </span>
  );
  if (skin === "swatch") {
    const chips = tints(ink);
    return (
      <span className={shell} style={{ ...litStyle, width: w, height: h }}>
        {picture}
        <span className="absolute inset-x-0 flex" style={{ bottom: label ? f.foot * 0.56 : 0, height: label ? f.foot * 0.44 : f.foot }}>{chips.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
        {label ? <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 px-[6%] font-semibold text-[#111]" style={{ height: f.foot * 0.56, fontSize: type * 1.05 }}>{name}<span className="shrink-0 font-mono font-normal text-[#111]/55" style={{ fontSize: type * 0.82 }}>{value ?? code}</span></span> : null}
      </span>
    );
  }
  if (skin === "proof") return (
    <span className={shell} style={{ ...litStyle, width: w, height: h }}>
      {/* A flat of the style's ink, printed a little out of register behind the picture. */}
      <span aria-hidden className="absolute" style={{ left: f.x + Math.max(2, w * 0.018), right: f.x - Math.max(2, w * 0.018), top: f.top + Math.max(2, w * 0.018), bottom: f.foot - Math.max(2, w * 0.018), background: ink ?? "var(--sakura)", opacity: 0.85 }} />
      {picture}
      <span aria-hidden className="card-proof-cross absolute" style={{ left: f.x * 0.22, top: f.top * 0.2, width: f.x * 0.56, height: f.x * 0.56 }} />
      <span aria-hidden className="card-proof-cross absolute" style={{ right: f.x * 0.22, top: f.top * 0.2, width: f.x * 0.56, height: f.x * 0.56 }} />
      <span aria-hidden className="absolute flex" style={{ right: f.x, top: f.top * 0.3, height: f.top * 0.4, width: f.top * 1.6 }}>{["var(--sakura)", "var(--yuzu)", "var(--ramune)", "#111"].map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
      {label ? <span className="absolute flex items-center justify-between gap-1 font-display font-bold uppercase tracking-[-0.01em] text-[#151515]" style={{ left: f.x, right: f.x, bottom: 0, height: f.foot, fontSize: type * 1.15 }}>{name}<span className="shrink-0 font-mono font-normal" style={{ fontSize: type * 0.78 }}>{value ?? code}</span></span> : null}
    </span>
  );
  if (skin === "slide") return (
    <span className={shell} style={{ ...litStyle, width: w, height: h }}>
      {picture}
      <span aria-hidden className="absolute" style={{ left: f.x, right: f.x, top: f.top, bottom: f.foot, borderRadius: 2, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.18)" }} />
      <span aria-hidden className="absolute font-mono uppercase text-[#2b2b2b]/55" style={{ left: f.x, top: f.top * 0.28, fontSize: Math.max(5.5, f.top * 0.36), letterSpacing: "0.16em" }}>katagami</span>
      <span aria-hidden className="absolute rounded-full bg-[#d8372c]" style={{ right: f.x, top: f.top * 0.3, width: f.top * 0.36, height: f.top * 0.36 }} />
      {label ? <span className="absolute flex items-center justify-between gap-1 font-mono uppercase text-[#232323]" style={{ left: f.x, right: f.x, bottom: 0, height: f.foot, fontSize: type, letterSpacing: "0.08em" }}>{name}<span className="shrink-0 opacity-60">{value ?? code}</span></span> : null}
    </span>
  );
  // specimen
  return (
    <span className={shell} style={{ ...litStyle, width: w, height: h }}>
      {picture}
      {label ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col justify-center bg-[#fbfaf6] px-[5%] text-[#1a1a1a]" style={{ height: f.foot }}>
          <span className="truncate font-display font-bold leading-none tracking-[-0.01em]" style={{ fontSize: type * 1.12 }}>{label}</span>
          <span className="truncate font-mono uppercase leading-none text-[#1a1a1a]/55" style={{ fontSize: type * 0.74, marginTop: f.foot * 0.12, letterSpacing: "0.1em" }}>{value ?? `Acc. ${code ?? "0000"}`}</span>
        </span>
      ) : null}
    </span>
  );
}
