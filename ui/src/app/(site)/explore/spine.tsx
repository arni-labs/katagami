"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasStyle } from "@/lib/catalog";
import { FitPicture } from "../atlas/fit-picture";
import { NEUTRAL_INK, fitWord, type Family, type Fit } from "./shared";
import { Stamp } from "./stamp";

// A style as a book: its spine on the shelf, and the spread it opens to. Shared by the stacks and the spines.

const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
const hash = (id: string, salt: number) => { let h = salt; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; };

/** A spine's cloth: the style's ink, deepened a little so white type holds on it, and the type colour that reads on it. */
export function cloth(ink: string | null) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt((ink ?? NEUTRAL_INK).slice(i, i + 2), 16));
  const mean = (r + g + b) / 3, rich = [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(mean + (v - mean) * 1.35))));
  const light = (rich[0] * 299 + rich[1] * 587 + rich[2] * 114) / 1000;
  return { bg: `rgb(${rich.join(",")})`, fg: light > 150 ? "#111" : "#fff" };
}
/** Every book its own thickness and height, steady from visit to visit. */
export const girth = (id: string, min: number, max: number) => Math.round(min + hash(id, 7) * (max - min));
export const stature = (id: string, min: number, max: number) => Math.round(min + hash(id, 13) * (max - min));

export function Spine({ style, w, h, fit, dim, tall = 0, onOpen }: { style: AtlasStyle; w: number; h: number; fit: Fit | null; dim: boolean; tall?: number; onOpen: (id: string) => void }) {
  const { bg, fg } = cloth(style.ink), face = hash(style.id, 3);
  return (
    <button type="button" onClick={() => onOpen(style.id)} aria-label={style.name} title={style.name}
      className="book-spine relative block shrink-0 cursor-pointer overflow-hidden" style={{ width: w, height: h + tall, background: bg, color: fg, opacity: dim ? 0.25 : 1, transform: fit ? "translateY(-6px) rotate(-2.5deg)" : undefined, transformOrigin: "50% 100%" }}>
      {/* Two bands of the cloth's own colour, lighter: a binding, not a border. */}
      <span aria-hidden className="absolute inset-x-0 top-[7%] h-[3px]" style={{ background: fg, opacity: 0.35 }} />
      <span aria-hidden className="absolute inset-x-0 bottom-[7%] h-[3px]" style={{ background: fg, opacity: 0.35 }} />
      <span className={`absolute inset-x-0 top-[12%] bottom-[12%] flex items-center justify-start overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] ${face < 0.34 ? "font-display font-bold tracking-[-0.01em]" : face < 0.67 ? "font-mono uppercase tracking-[0.08em]" : "font-display italic"}`} style={{ fontSize: Math.max(8.5, Math.min(13, w * 0.52)), lineHeight: `${w}px` }}>{style.name}</span>
      {fit ? <span aria-hidden className="absolute left-1/2 top-0 h-[18%] w-[5px] -translate-x-1/2" style={{ background: fit.strange ? "var(--sakura)" : "var(--ramune)" }} /> : null}
    </button>
  );
}

/** The spread a book opens to: the picture on the left page, what it is on the right. One column on a phone. */
export function Book({ style, family, fit, judging, byId, onGo, onClose }: { style: AtlasStyle; family: Family | null; fit: Fit | null; judging: boolean; byId: Map<string, AtlasStyle>; onGo: (id: string) => void; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const alike = style.neighbors.map((n) => byId.get(n.id)).filter((s): s is AtlasStyle => Boolean(s)).slice(0, 6);
  const { bg } = cloth(style.ink);
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center md:items-center" onClick={onClose}>
      <span aria-hidden className="absolute inset-0 bg-background/70" />
      <aside role="dialog" aria-label={style.name} onClick={(e) => e.stopPropagation()} className="book-open relative grid max-h-[86%] w-full overflow-y-auto shadow-[0_30px_80px_-24px_rgba(30,35,45,0.6)] md:w-[min(880px,92%)] md:grid-cols-2" style={{ background: bg, padding: 7, overscrollBehavior: "contain" }}>
        <div className="flex items-center justify-center bg-[#f7f3ea] p-5 md:min-h-[440px] md:p-7"><FitPicture key={style.id} src={style.thumbnail_url} height={300} maxWidth={380} sizes="420px" /></div>
        <div className="relative flex flex-col bg-[#f7f3ea] p-5 text-black md:p-8 md:shadow-[inset_14px_0_18px_-16px_rgba(0,0,0,0.35)]">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-2 top-2 cursor-pointer p-2 text-black/50 hover:text-black"><X size={16} /></button>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">{style.kind === "language" ? "Design language" : "Art style"}{family ? ` · ${family.label}` : ""}</p>
          <h2 className="mt-2 font-display text-[26px] font-bold leading-[1.05] tracking-[-0.02em]">{style.name}</h2>
          {fit ? <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: fit.strange ? "#d6336c" : "#1c64d8" }}>{fitWord(fit, judging)}</p> : null}
          {style.traits.length > 0 ? <p className="mt-3 text-[13.5px] leading-snug text-black/65">{style.traits.slice(0, 7).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p> : null}
          {alike.length > 0 ? (
            <>
              <h3 className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">Shelved beside it</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {alike.map((s) => <li key={s.id}><button type="button" onClick={() => onGo(s.id)} aria-label={s.name} title={s.name} className="block cursor-pointer drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"><Stamp src={s.thumbnail_url} ink={s.ink} w={58} h={68} sizes="96px" /></button></li>)}
              </ul>
            </>
          ) : null}
          <Link href={style.href} className="mt-6 block bg-black px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white md:mt-auto">Open</Link>
        </div>
      </aside>
    </div>
  );
}
