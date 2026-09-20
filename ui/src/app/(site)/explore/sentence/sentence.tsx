"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasStyle } from "@/lib/catalog";
import { FitPicture } from "../../atlas/fit-picture";
import { NEUTRAL_INK, fitWord, isDark, useAsk, useScreen, type Family } from "../shared";

// The ask as one big sentence with four blanks, each under a swipe of highlighter.
// The answer is dealt as a fanned hand of cards; the card in front is the one
// spoken for. Behind it all the whole library lies as a faint field of its inks,
// and the corner map shows where on it the hand came from.

const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
const SLOTS = [
  { key: "what", lead: "I am making a", ink: "var(--yuzu)", hint: "booking app", tries: ["booking app", "compliance dashboard", "zine", "portfolio", "reading app", "launch page"] },
  { key: "who", lead: "for", ink: "var(--sakura)", hint: "island ferry riders", tries: ["island ferry riders", "a bank's audit team", "an underground music label", "a small studio", "night-shift nurses"] },
  { key: "feel", lead: "that feels", ink: "var(--ramune)", hint: "calm", tries: ["calm", "loud", "precise", "playful", "premium", "hand-made"] },
  { key: "and", lead: "and", ink: "var(--yuzu)", hint: "bright", tries: ["bright", "dark", "editorial", "friendly", "technical", "nostalgic"] },
] as const;
type Key = (typeof SLOTS)[number]["key"];

export function Sentence({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const ask = useAsk();
  const [words, setWords] = useState<Record<Key, string>>({ what: "", who: "", feel: "", and: "" });
  const [front, setFront] = useState<string | null>(null);
  const field = useRef<HTMLCanvasElement | null>(null);
  const map = useRef<HTMLCanvasElement | null>(null);
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const hand = useMemo(() => (ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank).slice(0, phone ? 7 : 8) : []), [ask.fits, byId, phone]);
  const shown = front && hand.some(([id]) => id === front) ? front : hand[0]?.[0] ?? null;

  const said = (k: Key) => words[k].trim() || SLOTS.find((s) => s.key === k)!.hint;
  const go = () => void ask.ask(`${said("what")} for ${said("who")} that feels ${said("feel")} and ${said("and")}`);

  // The library behind the sentence, and the corner map of the same thing.
  useEffect(() => {
    const draw = (c: HTMLCanvasElement | null, big: boolean) => {
      if (!c) return;
      const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr; c.height = h * dpr;
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = isDark() ? "screen" : "multiply";
      for (const s of styles) {
        const fit = ask.fits?.get(s.id), on = !ask.fits || Boolean(fit);
        g.globalAlpha = big ? (on ? 0.2 : 0.07) : on ? 0.95 : 0.22;
        g.fillStyle = !big && ask.fits && !fit ? NEUTRAL_INK : s.ink ?? NEUTRAL_INK;
        g.beginPath(); g.arc((big ? 0.04 : 0.08) * w + s.x * w * (big ? 0.92 : 0.84), (big ? 0.06 : 0.08) * h + s.y * h * (big ? 0.88 : 0.84), big ? (fit ? 16 : 9) : fit ? 3.4 : 1.5, 0, 6.283); g.fill();
      }
    };
    const frame = requestAnimationFrame(() => { draw(field.current, true); draw(map.current, false); });
    return () => cancelAnimationFrame(frame);
  }, [styles, ask.fits, screen]);

  const top = shown ? byId.get(shown) ?? null : null, topFit = shown ? ask.fits?.get(shown) ?? null : null;
  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative min-h-[calc(100dvh-65px)] w-full overflow-hidden pb-28">
      <canvas ref={field} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative mx-auto max-w-[1180px] px-5 pt-8 md:px-10 md:pt-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Explore · <span className="text-foreground">{styles.length}</span> styles</p>
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="mt-3">
          <h1 className="font-display text-[29px] font-bold leading-[1.22] tracking-[-0.035em] md:text-[60px] md:leading-[1.12]">
            {SLOTS.map((slot, i) => (
              <span key={slot.key}>
                {slot.lead}{" "}
                <label className="sentence-slot relative inline-block align-baseline" style={{ ["--swipe" as string]: slot.ink }}>
                  {/* The hidden twin sizes the box to the words, so the highlighter is as long as what it marks. */}
                  <span aria-hidden className="invisible whitespace-pre px-[0.12em]">{words[slot.key] || slot.hint}</span>
                  <input aria-label={`${slot.lead} …`} value={words[slot.key]} onChange={(e) => setWords((w) => ({ ...w, [slot.key]: e.target.value.slice(0, 40) }))} placeholder={slot.hint} autoComplete="off" spellCheck={false} enterKeyHint="go"
                    className="absolute inset-0 w-full bg-transparent px-[0.12em] text-black outline-none placeholder:text-black/45" style={{ font: "inherit", letterSpacing: "inherit" }} />
                </label>
                {i === SLOTS.length - 1 ? "." : " "}
              </span>
            ))}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="submit" disabled={ask.state === "asking"} className="cursor-pointer bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background disabled:opacity-50">{ask.state === "asking" ? "Reading…" : "Find my styles"}</button>
            <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
              Try
              {SLOTS.flatMap((slot) => slot.tries.slice(1, 3).map((t) => <button key={slot.key + t} type="button" onClick={() => setWords((w) => ({ ...w, [slot.key]: t }))} className="ink-underline cursor-pointer text-foreground/80 hover:text-foreground">{t}</button>))}
            </p>
          </div>
          {ask.state === "error" ? <p role="alert" className="mt-3 text-[13px] text-[var(--beni)]">{ask.error}</p> : null}
        </form>

        {hand.length > 0 ? (
          <section aria-label="Your hand" className="mt-8 md:mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="text-foreground">{hand.length}</span> dealt · {ask.answer?.considered} considered</p>
            <ul className={phone ? "-mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 [scrollbar-width:none]" : "relative mt-4 h-[300px]"}>
              {hand.map(([id, f], i) => {
                const s = byId.get(id)!, mid = (hand.length - 1) / 2, isTop = id === shown;
                const fan = phone ? undefined : { left: `calc(${(i / Math.max(1, hand.length - 1)) * 72}% )`, transform: `rotate(${(i - mid) * 2.1}deg) translateY(${Math.abs(i - mid) ** 1.6 * 3.5 - (isTop ? 30 : 0)}px)`, zIndex: isTop ? 40 : 10 + i };
                return (
                  <li key={id} className={phone ? "w-[62%] shrink-0 snap-center" : "hand-card absolute top-4 w-[28%] max-w-[300px]"} style={fan}>
                    <button type="button" onClick={() => setFront(id)} aria-pressed={isTop} aria-label={s.name} className="block w-full cursor-pointer bg-background p-2 text-left shadow-[0_14px_36px_-16px_rgba(30,35,45,0.55)]" style={{ outline: isTop ? `2px solid var(${f.strange ? "--sakura" : "--ramune"})` : undefined }}>
                      <span className="flex h-[150px] items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"><FitPicture src={s.thumbnail_url} height={150} maxWidth={phone ? 220 : 270} sizes="300px" /></span>
                      <span className="mt-2 block truncate font-display text-[15px] font-bold tracking-[-0.02em]">{s.name}</span>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: f.strange ? "var(--sakura)" : "var(--ramune)" }}>{fitWord(f, ask.state === "asking")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {top ? (
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3 md:mt-6">
                <div className="min-w-0">
                  <h2 className="font-display text-[30px] font-bold leading-none tracking-[-0.03em] md:text-[40px]">{top.name}</h2>
                  <p className="mt-2 text-[13.5px] text-muted-foreground">{top.kind === "language" ? "Design language" : "Art style"}{top.family && familyOf.get(top.family) ? ` · ${familyOf.get(top.family)!.label}` : ""} · {top.traits.slice(0, 4).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p>
                  {topFit ? <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: topFit.strange ? "var(--sakura)" : "var(--ramune)" }}>{fitWord(topFit, ask.state === "asking")}</p> : null}
                </div>
                <Link href={top.href} className="bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background">Open</Link>
              </div>
            ) : null}
          </section>
        ) : <p className="mt-10 max-w-md text-[14px] leading-relaxed text-muted-foreground">Fill the blanks, or leave them as they are. Every dot behind this sentence is a style in the library; the ones that fit are dealt to you as a hand.</p>}
      </div>

      <div className="absolute bottom-24 right-4 w-[128px] md:bottom-8 md:right-8 md:w-[190px]">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">On the atlas</p>
        <canvas ref={map} aria-hidden className="h-[96px] w-full bg-background/80 md:h-[140px]" />
        <Link href="/atlas" className="ink-underline mt-1 inline-block text-[12.5px]">Open atlas</Link>
      </div>
    </div>
  );
}
