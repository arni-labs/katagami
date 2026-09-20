"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasStyle } from "@/lib/catalog";
import { FitPicture } from "../atlas/fit-picture";

// What the explore views share: the ask, the colour pick, and the card a style opens into.

export type Family = { id: string; label: string; lead: string; count: number; x: number; y: number };
type Card = { id: string; name: string; fit: number | null };
type Answer = { query: string; considered: number; wants: string[]; results: Card[]; strange: Card[]; want?: Record<string, number> };
export type Fit = { fit: number | null; strange: boolean; rank: number };

export const NEUTRAL_INK = "#9ba1a6";
export const HUES: [string, string][] = [["red", "#e5484d"], ["orange", "#f76b15"], ["yellow", "#f5c000"], ["green", "#30a46c"], ["teal", "#12a594"], ["blue", "#3b82f6"], ["violet", "#8b5cf6"], ["pink", "#e93d82"], ["neutral", NEUTRAL_INK]];
const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
export const fitWord = (f: Fit, judging: boolean) => (f.strange ? "Strange, still fits" : f.fit === null ? (judging ? "Judging fit…" : "Matched by traits") : f.fit >= 0.8 ? "Strong fit" : f.fit >= 0.5 ? "Could work" : "A stretch");

/** The hue a colour belongs to, in the picker's own nine names. */
export function hueOf(ink: string | null): string {
  if (!ink) return "neutral";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (d < 28 || d / max < 0.16) return "neutral";
  const h = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return h < 18 || h >= 345 ? "red" : h < 42 ? "orange" : h < 68 ? "yellow" : h < 150 ? "green" : h < 195 ? "teal" : h < 255 ? "blue" : h < 300 ? "violet" : "pink";
}

export function useScreen(): "phone" | "desk" | null {
  const [screen, setScreen] = useState<"phone" | "desk" | null>(null);
  useEffect(() => {
    const read = () => setScreen(window.innerWidth < 768 ? "phone" : "desk");
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return screen;
}

/** Ask in two steps, as /ask does: the trait match at once, then the judged fit. */
export function useAsk() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const turn = useRef(0);
  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < 8) { setState("error"); setError("Give it a full sentence: what it is and who it is for."); return; }
    const mine = ++turn.current;
    setState("asking"); setError("");
    try {
      const first = await fetch(`/api/ask?${new URLSearchParams({ q, k: "10", stage: "match" })}`);
      const matched = await first.json().catch(() => null);
      if (mine !== turn.current) return;
      if (!first.ok || !matched) throw new Error(matched?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(matched as Answer);
      if (matched.results.length === 0) { setState("idle"); return; }
      const second = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, k: 10, want: matched.want }) });
      const body = await second.json().catch(() => null);
      if (mine !== turn.current) return;
      if (!second.ok || !body) throw new Error(body?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(body as Answer);
      setState("idle");
    } catch (err) {
      if (mine !== turn.current) return;
      setState("error");
      setError(err instanceof Error ? err.message : "Asking failed.");
    }
  }, []);
  const clear = useCallback(() => { turn.current++; setAnswer(null); setQuery(""); setState("idle"); setError(""); }, []);
  const fits = useMemo(() => {
    if (!answer) return null;
    const out = new Map<string, Fit>();
    answer.results.forEach((c, i) => out.set(c.id, { fit: c.fit, strange: false, rank: i }));
    answer.strange.forEach((c, i) => out.set(c.id, { fit: c.fit, strange: true, rank: answer.results.length + i }));
    return out;
  }, [answer]);
  return { query, setQuery, state, error, answer, fits, ask, clear };
}

/** The ask, docked under the thumb: a field, the nine hues, and the answers as chips to fly to. */
export function AskDock({ ask, hue, onHue, onGo, byId, lit }: { ask: ReturnType<typeof useAsk>; hue: string; onHue: (h: string) => void; onGo: (id: string) => void; byId: Map<string, AtlasStyle>; lit: number | null }) {
  const found = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank) : [];
  return (
    // Absolute, not fixed: the site's page wrapper is transformed, so "fixed" would mean the page, not the screen.
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-[34rem] flex-col gap-2 bg-background/95 p-2 shadow-[0_8px_30px_-12px_rgba(30,35,45,0.35)]">
        {found.length > 0 ? (
          <ul aria-label="Answers" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {found.map(([id, f]) => (
              <li key={id} className="shrink-0">
                <button type="button" onClick={() => onGo(id)} className="flex cursor-pointer items-center gap-1.5 bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2 py-1.5 text-[12.5px] hover:bg-[color-mix(in_srgb,var(--foreground)_11%,transparent)]">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: f.strange ? "var(--sakura)" : "var(--ramune)" }} />
                  {byId.get(id)?.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {ask.state === "error" ? <p role="alert" className="px-1 text-[12.5px] text-[var(--beni)]">{ask.error}</p> : null}
        <form onSubmit={(e) => { e.preventDefault(); void ask.ask(ask.query); }} className="flex items-stretch gap-2">
          <label htmlFor="explore-ask" className="sr-only">What are you making?</label>
          <input id="explore-ask" value={ask.query} onChange={(e) => ask.setQuery(e.target.value)} maxLength={400} autoComplete="off" placeholder="What are you making, and for whom?" className="min-w-0 flex-1 bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2.5 text-[16px] outline-none placeholder:text-muted-foreground md:text-[14px]" />
          <button type="submit" disabled={ask.state === "asking"} className="shrink-0 cursor-pointer bg-foreground px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-background disabled:opacity-50">{ask.state === "asking" ? "Reading" : "Ask"}</button>
        </form>
        <div className="flex items-center gap-2 px-1">
          <div role="group" aria-label="Colour" className="flex gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none]">
            {HUES.map(([name, ink]) => (
              <button key={name} type="button" aria-pressed={hue === name} aria-label={name} title={name} onClick={() => onHue(hue === name ? "" : name)} className="h-5 w-5 shrink-0 cursor-pointer rounded-full" style={{ background: ink, boxShadow: hue === name ? "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)" : undefined }} />
            ))}
          </div>
          <p aria-live="polite" className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{lit === null ? "" : `${lit} lit`}</p>
          {lit !== null ? <button type="button" onClick={() => { ask.clear(); onHue(""); }} className="shrink-0 cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">Clear</button> : null}
        </div>
      </div>
    </div>
  );
}

/** What a style opens into: a rail on a desk, a sheet on a phone. */
export function StyleCard({ style, family, fit, judging, byId, onGo, onClose }: { style: AtlasStyle; family: Family | null; fit: Fit | null; judging: boolean; byId: Map<string, AtlasStyle>; onGo: (id: string) => void; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const alike = style.neighbors.map((n) => byId.get(n.id)).filter((s): s is AtlasStyle => Boolean(s)).slice(0, 6);
  return (
    <aside aria-label={style.name} className="explore-card absolute inset-x-0 bottom-0 z-40 max-h-[70%] overflow-y-auto bg-background p-4 shadow-[0_-10px_40px_-16px_rgba(30,35,45,0.45)] md:inset-x-auto md:bottom-auto md:right-5 md:top-5 md:max-h-[calc(100%-40px)] md:w-[320px] md:shadow-[0_10px_40px_-14px_rgba(30,35,45,0.45)]" style={{ overscrollBehavior: "contain" }}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-2 top-2 z-10 cursor-pointer bg-background/80 p-2 text-muted-foreground hover:text-foreground"><X size={16} /></button>
      <div className="flex justify-center bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"><FitPicture key={style.id} src={style.thumbnail_url} height={184} maxWidth={288} sizes="320px" /></div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{style.kind === "language" ? "Design language" : "Art style"}{family ? ` · ${family.label}` : ""}</p>
      <h2 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.02em]">{style.name}</h2>
      {fit ? <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: fit.strange ? "var(--sakura)" : "var(--ramune)" }}>{fitWord(fit, judging)}</p> : null}
      {style.traits.length > 0 ? <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{style.traits.slice(0, 6).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p> : null}
      <Link href={style.href} className="mt-3 block bg-foreground px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background">Open</Link>
      {alike.length > 0 ? (
        <>
          <h3 className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Most alike</h3>
          <ul className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {alike.map((s) => (
              <li key={s.id} className="shrink-0"><button type="button" onClick={() => onGo(s.id)} title={s.name} aria-label={s.name} className="block cursor-pointer"><FitPicture src={s.thumbnail_url} height={44} maxWidth={72} sizes="96px" /></button></li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
