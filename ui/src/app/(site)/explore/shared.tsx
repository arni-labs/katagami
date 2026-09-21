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

/** The site's theme is a class on the root (next-themes), not the OS preference. */
export const isDark = () => document.documentElement.classList.contains("dark");

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
export type Word = { text: string; role: "what" | "who" | "feel" | null };
export type Moved = { trait: string; from: number; to: number };
export type Kinds = { language: boolean; art_style: boolean };

/** Ask in two steps, as /ask does: the trait match at once, then the judged fit. Alongside, the sentence is read
 *  word by word (what it is, who it is for, how it should feel) so it can be set back with the telling words marked.
 *  An answer can then be refined: a change such as "warmer, quieter" moves the reading instead of starting again. */
export function useAsk() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [words, setWords] = useState<Word[] | null>(null);
  const [moved, setMoved] = useState<Moved[]>([]);
  const [changes, setChanges] = useState("");
  const turn = useRef(0);
  const kindOf = (kinds?: Kinds): Record<string, string> => (kinds && kinds.language !== kinds.art_style ? { kind: kinds.language ? "language" : "art_style" } : {});

  const run = useCallback(async (mine: number, q: string, body: Record<string, unknown> | null, kinds?: Kinds) => {
    try {
      let reading = body;
      if (!reading) {
        const first = await fetch(`/api/ask?${new URLSearchParams({ q, k: "12", stage: "match", ...kindOf(kinds) })}`);
        const matched = await first.json().catch(() => null);
        if (mine !== turn.current) return;
        if (!first.ok || !matched) throw new Error(matched?.error ?? "Asking failed. Try again in a moment.");
        setAnswer(matched as Answer);
        if (matched.results.length === 0) { setState("idle"); return; }
        reading = { want: matched.want };
      }
      const second = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, k: 12, ...kindOf(kinds), ...reading }) });
      const judged = await second.json().catch(() => null);
      if (mine !== turn.current) return;
      if (!second.ok || !judged) throw new Error(judged?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(judged as Answer);
      if (Array.isArray(judged.moved)) setMoved(judged.moved as Moved[]);
      if (typeof judged.changes === "string") setChanges(judged.changes);
      setState("idle");
    } catch (err) {
      if (mine !== turn.current) return;
      setState("error");
      setError(err instanceof Error ? err.message : "Asking failed.");
    }
  }, []);

  const ask = useCallback(async (text: string, kinds?: Kinds) => {
    const q = text.trim();
    if (q.length < 2) return; // any word will do
    const mine = ++turn.current;
    setState("asking"); setError(""); setMoved([]); setChanges("");
    setWords(q.split(/\s+/).map((w) => ({ text: w, role: null }))); // plain at once; marked when the reading comes back
    void fetch(`/api/ask?${new URLSearchParams({ q, stage: "words" })}`).then((r) => (r.ok ? r.json() : null)).then((got) => { if (mine === turn.current && Array.isArray(got?.words)) setWords(got.words as Word[]); }).catch(() => undefined);
    await run(mine, q, null, kinds);
  }, [run]);

  /** Move the current reading by a change in words, keeping every earlier change in mind. */
  const refine = useCallback(async (change: string, kinds?: Kinds) => {
    const say = change.trim();
    if (!answer?.want || say.length < 2) return;
    const mine = ++turn.current;
    setState("asking"); setError("");
    await run(mine, answer.query, { want: answer.want, refine: say, ...(changes ? { changes } : {}) }, kinds);
  }, [answer, changes, run]);

  const clear = useCallback(() => { turn.current++; setAnswer(null); setWords(null); setMoved([]); setChanges(""); setQuery(""); setState("idle"); setError(""); }, []);
  const fits = useMemo(() => {
    if (!answer) return null;
    const out = new Map<string, Fit>();
    answer.results.forEach((c, i) => out.set(c.id, { fit: c.fit, strange: false, rank: i }));
    answer.strange.forEach((c, i) => out.set(c.id, { fit: c.fit, strange: true, rank: answer.results.length + i }));
    return out;
  }, [answer]);
  return { query, setQuery, state, error, answer, fits, words, moved, changes, ask, refine, clear };
}

const MARK: Record<string, string> = { what: "var(--yuzu)", who: "var(--sakura)", feel: "var(--ramune)" };
const CHANGES = ["warmer", "quieter", "bolder", "more playful", "darker", "more editorial"];

/** The ask, docked under the thumb, and the sentence is its own display: what is typed is set in the display face
 *  and, when the typing pauses, the telling words take a highlighter (what it is, who it is for, how it should
 *  feel). It is a plain textarea with its text made invisible over a twin that draws the same words with the marks,
 *  so the caret, selection and keyboard are the browser's own. Once there is an answer it can be refined in words
 *  from the same place. An ask and a colour are two ways to light the library, and the newer one wins. */
export function AskDock({ ask, hue, onHue, onGo, byId, lit, kinds, quiet = false }: { ask: ReturnType<typeof useAsk>; hue: string; onHue: (h: string) => void; onGo: (id: string) => void; byId: Map<string, AtlasStyle>; lit: number | null; kinds?: Kinds; /** The view shows the answer itself: no chips here. */ quiet?: boolean }) {
  const found = quiet ? [] : ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank) : [];
  const dock = useRef<HTMLDivElement | null>(null);
  const [read, setRead] = useState<Word[]>([]);
  const [say, setSay] = useState("");
  const busy = ask.state === "asking";

  // The words are read when the typing has paused, not on every key; an answer's own reading is used as it is.
  useEffect(() => {
    const q = ask.query.trim();
    if (q.length < 3) return;
    const wait = window.setTimeout(() => {
      void fetch(`/api/ask?${new URLSearchParams({ q, stage: "words" })}`).then((r) => (r.ok ? r.json() : null)).then((got) => { if (Array.isArray(got?.words)) setRead(got.words as Word[]); }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(wait);
  }, [ask.query]);
  // A word keeps its mark only while it is still the same word in the same place.
  const known = ask.words && ask.words.map((w) => w.text).join(" ") === ask.query.trim().split(/\s+/).join(" ") ? ask.words : read;
  const pieces = ask.query.split(/(\s+)/).filter((s) => s.length > 0);
  let n = -1;
  const marked = pieces.map((piece) => { if (/^\s+$/.test(piece)) return { piece, role: null as Word["role"], gap: true }; n++; return { piece, role: known[n]?.text === piece ? known[n].role : null, gap: false }; });
  // A gap between two words with the same job is marked too, so a phrase is one stroke.
  marked.forEach((m, i) => { if (m.gap && marked[i - 1]?.role && marked[i - 1]?.role === marked[i + 1]?.role) m.role = marked[i - 1].role; });

  // Neighbours with the same job are drawn as one mark, so the stroke runs unbroken under a phrase.
  const runs: { piece: string; role: Word["role"] }[] = [];
  for (const m of marked) { const last = runs[runs.length - 1]; if (last && last.role === m.role) last.piece += m.piece; else runs.push({ piece: m.piece, role: m.role }); }

  // How tall the dock stands, for whatever a view lays out above it.
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    const watch = new ResizeObserver(() => document.documentElement.style.setProperty("--dock-h", `${Math.round(el.getBoundingClientRect().height) + 12}px`));
    watch.observe(el);
    return () => { watch.disconnect(); document.documentElement.style.removeProperty("--dock-h"); };
  }, []);

  const type = "font-display text-[19px] font-bold leading-[1.3] tracking-[-0.02em] md:text-[24px]";
  return (
    // Absolute, not fixed: the site's page wrapper is transformed, so "fixed" would mean the page, not the screen.
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[36] flex justify-center px-3">
      <div ref={dock} className="pointer-events-auto flex w-full max-w-[44rem] flex-col gap-2 bg-background/90 p-2.5 shadow-[0_10px_36px_-12px_rgba(30,35,45,0.4)] backdrop-blur-xl backdrop-saturate-150 md:p-3">
        {found.length > 0 ? (
          <ul aria-label="Answers" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {found.map(([id]) => <li key={id} className="shrink-0"><button type="button" onClick={() => onGo(id)} className="cursor-pointer bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2 py-1.5 text-[12.5px] hover:bg-[color-mix(in_srgb,var(--foreground)_11%,transparent)]">{byId.get(id)?.name}</button></li>)}
          </ul>
        ) : null}
        {ask.answer?.want ? (
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            {/* First in the row, so it is always in reach however many traits have moved. */}
            <form onSubmit={(e) => { e.preventDefault(); if (say.trim()) { void ask.refine(say, kinds); setSay(""); } }}>
              <label htmlFor="refine" className="sr-only">Refine the answer</label>
              <input id="refine" value={say} onChange={(e) => setSay(e.target.value)} maxLength={120} autoComplete="off" placeholder="refine in your words" className="w-[10.5rem] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-2.5 py-1 text-[16px] outline-none placeholder:text-foreground/45 md:text-[12.5px]" />
            </form>
            {ask.moved.slice(0, 5).map((mv) => <span key={mv.trait} className="bg-foreground px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-background">{mv.to > mv.from ? "+" : "−"} {mv.trait}</span>)}
            {CHANGES.map((c) => <button key={c} type="button" disabled={busy} onClick={() => void ask.refine(c, kinds)} className="cursor-pointer bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-2.5 py-1 text-[12.5px] hover:bg-[color-mix(in_srgb,var(--foreground)_13%,transparent)] disabled:opacity-40">{c}</button>)}
          </div>
        ) : null}
        {ask.state === "error" ? <p role="alert" className="px-1 text-[12.5px] text-[var(--beni)]">{ask.error}</p> : null}
        <form onSubmit={(e) => { e.preventDefault(); onHue(""); void ask.ask(ask.query, kinds); }} className="flex items-end gap-2">
          <label htmlFor="explore-ask" className="sr-only">What are you making?</label>
          <div className="relative min-w-0 flex-1">
            <div aria-hidden className={`pointer-events-none whitespace-pre-wrap break-words px-1 py-1 ${type}`} style={{ minHeight: "1.3em", opacity: busy ? 0.6 : 1 }}>
              {ask.query ? runs.map((m, i) => (m.role ? <mark key={i} className="query-mark" style={{ ["--mark" as string]: MARK[m.role] }}>{m.piece}</mark> : <span key={i}>{m.piece}</span>)) : <span className="font-normal text-foreground/35">Ask anything: a word, a mood, a project</span>}
              {/* A trailing newline needs something after it to take up a line, as the textarea gives it one. */}
              {ask.query.endsWith("\n") ? " " : null}
            </div>
            <textarea id="explore-ask" value={ask.query} rows={1} maxLength={400} autoComplete="off" spellCheck={false} enterKeyHint="search"
              onChange={(e) => ask.setQuery(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onHue(""); void ask.ask(ask.query, kinds); } }}
              className={`absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent px-1 py-1 text-transparent caret-[var(--foreground)] outline-none selection:bg-[color-mix(in_srgb,var(--ramune)_35%,transparent)] ${type}`} />
          </div>
          <button type="submit" disabled={busy} className="shrink-0 cursor-pointer bg-foreground px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-background disabled:opacity-50">{busy ? "Reading" : "Ask"}</button>
        </form>
        <div className="flex items-center gap-2 px-1">
          <div role="group" aria-label="Colour" className="flex gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none]">
            {HUES.map(([name, ink]) => (
              <button key={name} type="button" aria-pressed={hue === name} aria-label={name} title={name} onClick={() => { if (ask.answer || busy) ask.clear(); onHue(hue === name ? "" : name); }} className="h-5 w-5 shrink-0 cursor-pointer rounded-full" style={{ background: ink, boxShadow: hue === name ? "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)" : undefined }} />
            ))}
          </div>
          <p aria-live="polite" className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{lit === null ? "" : `${lit} lit`}</p>
          {lit !== null ? <button type="button" onClick={() => { ask.clear(); onHue(""); setRead([]); }} className="shrink-0 cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">Clear</button> : null}
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
