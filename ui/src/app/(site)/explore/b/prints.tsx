"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fitWord, useAsk, type Fit, type Kinds } from "../shared";
import { quick, retryThenHide } from "../stamp";

// The library as an ordinary page: pictures at their own proportions in justified rows, a name under each, and one
// line at the top to ask it something. It scrolls with the browser, so the browser's own lazy loading does the work
// the canvas has to do by hand.

export type Print = {
  id: string;
  kind: "language" | "art_style";
  name: string;
  href: string;
  src: string | null;
  /** A second picture to draw if the first is gone from the store. */
  spare: string | null;
  /** Width over height of the picture: measured ahead (scripts/picture-shapes.mjs), or its kind's usual shape
   *  until the picture arrives and corrects it. */
  shape: number;
};

type Show = "all" | "language" | "art_style";
const SHOW: [Show, string][] = [["all", "All"], ["language", "Design languages"], ["art_style", "Art styles"]];
/** Rendered with the page; the rest are added a batch at a time as the reader nears the end. */
const FIRST = 36;
const BATCH = 48;
/** What is typed after an answer is a change to it ("warmer", "less corporate") unless it reads as a new brief. */
const BRIEF = /\b(app|site|website|dashboard|page|brand|poster|for an?|for the)\b/i;

/** Give a plate the shape of the picture that actually arrived when it differs from the one it was laid out for:
 *  a picture nobody has measured yet, or the spare drawn in place of a missing one. Written straight to the plate's
 *  style, as the canvas does, so a page of hundreds keeps no state per picture. */
function settle(img: HTMLImageElement) {
  const plate = img.closest("li");
  if (!plate || !img.naturalWidth || !img.naturalHeight) return;
  const shape = img.naturalWidth / img.naturalHeight, was = Number(plate.style.getPropertyValue("--r"));
  if (!(Math.abs(shape - was) / was < 0.02)) plate.style.setProperty("--r", shape.toFixed(3));
}

/** A picture that arrived, or failed, before the page came alive has already fired the event that would have
 *  handled it, so it is looked at once when it is attached. A lazy picture not yet asked for has no current source
 *  and is left alone. A stable function, so React calls it on attach and detach only, not on every render. */
function caughtUp(img: HTMLImageElement | null) {
  if (!img?.complete || !img.currentSrc) return;
  if (img.naturalWidth) settle(img);
  else retryThenHide({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>);
}

function Plate({ print, fit, judging, width, eager }: { print: Print; fit: Fit | null; judging: boolean; width: 384 | 750; eager: boolean }) {
  return (
    // Every plate in a row grows in proportion to its shape, so a row's pictures come out exactly one height and
    // fill the width together. The shape is known before the picture arrives, so nothing moves when it does.
    <li className="min-w-0 [flex:var(--r)_1_calc(var(--r)*var(--row-h))]" style={{ ["--r" as string]: print.shape }}>
      <Link href={print.href} prefetch={false} className="group block outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ramune)]">
        {/* Until the picture lands its place is a plain light grey: the style's ink, tried first, turned a slow
            screen into a sheet of pastel blocks. */}
        <span className="relative block w-full overflow-hidden bg-muted [aspect-ratio:var(--r)]">
          {print.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quick(print.src, width)}
              alt=""
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              draggable={false}
              data-spare={print.spare ? quick(print.spare, width) : undefined}
              onError={retryThenHide}
              onLoad={(e) => settle(e.currentTarget)}
              ref={caughtUp}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </span>
        <span className="mt-2 block truncate text-[13px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground md:text-[13.5px]">{print.name}</span>
        {fit ? (
          <span className="mt-0.5 block font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: fit.strange ? "var(--sakura)" : fit.fit !== null && fit.fit >= 0.8 ? "var(--ramune)" : "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
            {fitWord(fit, judging)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** One run of plates. The last row is not stretched: a filler takes up what is left of it. */
function Plates({ items, fits, judging, width, eager = 0, label }: { items: Print[]; fits?: Map<string, Fit> | null; judging: boolean; width: 384 | 750; eager?: number; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-x-3 gap-y-6 [--row-h:104px] sm:gap-x-5 sm:[--row-h:150px] md:gap-x-7 md:gap-y-10 md:[--row-h:172px] xl:[--row-h:166px]">
      {items.map((p, i) => <Plate key={p.id} print={p} fit={fits?.get(p.id) ?? null} judging={judging} width={width} eager={i < eager} />)}
      <li aria-hidden className="grow-[1000]" />
    </ul>
  );
}

export function Prints({ prints, whole, phone }: { prints: Print[]; /** The whole library's size, when a visitor is shown only part of it. */ whole: number | null; phone: boolean }) {
  const ask = useAsk();
  const [show, setShow] = useState<Show>("all");
  const [count, setCount] = useState(FIRST);
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState("");
  const field = useRef<HTMLInputElement | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  const kinds: Kinds = { language: show !== "art_style", art_style: show !== "language" };
  // Phone plates come out about 165 to 240 CSS px wide on a 2x or 3x screen, desk plates about 270 to 300 at 1280 on
  // a 1x or 2x one. 384 and 750 are the nearest of the widths the CDN keeps warm; 384 on a phone is about a third of
  // the bytes of 750 (14KB a picture on average) and still more than two pixels per CSS pixel.
  const width = phone ? 384 : 750;
  const judging = ask.state === "asking";

  const shown = useMemo(() => prints.filter((p) => show === "all" || p.kind === show), [prints, show]);
  const fitted = useMemo(() => {
    if (!ask.fits) return [];
    const here = new Map(shown.map((p) => [p.id, p]));
    return [...ask.fits.entries()].filter(([id]) => here.has(id)).sort((a, b) => a[1].rank - b[1].rank).map(([id]) => here.get(id)!);
  }, [ask.fits, shown]);
  const rest = useMemo(() => (fitted.length > 0 ? shown.filter((p) => !ask.fits?.has(p.id)) : shown), [shown, fitted, ask.fits]);
  const more = rest.length > count;

  // A batch more whenever the end of the page comes within a couple of screens. The observer is made afresh after
  // each batch: if the end is still in reach (a tall screen), the new one reports it at once and another follows.
  useEffect(() => {
    const el = end.current;
    if (!el || !more) return;
    const watch = new IntersectionObserver((seen) => { if (seen.some((s) => s.isIntersecting)) setCount((n) => n + BATCH); }, { rootMargin: "1600px 0px" });
    watch.observe(el);
    return () => watch.disconnect();
  }, [more, count]);

  const send = (text: string) => {
    const q = text.trim();
    if (q.length < 2) return;
    setSent(q);
    ask.setQuery("");
    field.current?.blur(); // a phone's keyboard would otherwise cover the answer
    if (ask.answer && q.split(/\s+/).length <= 6 && !BRIEF.test(q)) void ask.refine(q, kinds);
    else void ask.ask(q, kinds);
  };
  const clear = () => { ask.clear(); setSent(""); };

  const hints = ask.answer ? ["warmer", "quieter"] : ["a calm booking app for an island ferry", "a zine about night markets"];
  const eager = phone ? 8 : 12;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-7 sm:pt-12 md:px-8">
      <header className="max-w-3xl">
        <h1 className="font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-muted-foreground">
          The library · {whole !== null ? `${prints.length} of ${whole} styles` : `${prints.length} styles`}
        </h1>
        <form onSubmit={(e) => { e.preventDefault(); send(ask.query); }} className="relative mt-4">
          <label htmlFor="index-ask" className="sr-only">What are you making?</label>
          <div className="flex items-stretch bg-[color-mix(in_srgb,var(--foreground)_4.5%,transparent)] transition-colors focus-within:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]">
            <input
              ref={field}
              id="index-ask"
              type="text"
              value={ask.query}
              onChange={(e) => ask.setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
              placeholder={ask.answer ? (phone ? "Refine: warmer, quieter…" : "Refine it: warmer, quieter… or ask anew") : "What are you making?"}
              maxLength={400}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-display text-[20px] font-bold tracking-[-0.02em] outline-none placeholder:font-medium placeholder:text-foreground/40 sm:px-5 sm:py-4 sm:text-[26px]"
            />
            <button type="submit" disabled={judging} className="shrink-0 cursor-pointer px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground disabled:cursor-default disabled:opacity-50 sm:px-6">
              Ask
            </button>
          </div>
          {/* A couple of things worth typing, only while the line is empty and being typed into. Pressing one must
              not take the focus away first, or the list would vanish under the finger before the press lands. */}
          {focused && !ask.query ? (
            <ul aria-label="Suggestions" className="absolute inset-x-0 top-full z-20 bg-background py-1.5 shadow-[var(--shadow-card)]">
              {hints.map((h) => (
                <li key={h}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => send(h)} className="block w-full cursor-pointer px-4 py-2.5 text-left text-[16px] text-foreground/70 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] hover:text-foreground sm:px-5">
                    {h}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
        <div role="group" aria-label="Show" className="isolate mt-5 flex flex-wrap gap-x-6 gap-y-2 pl-0.5 text-[15px]">
          {SHOW.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={show === k} data-active={show === k} onClick={() => setShow(k)} className={`ink-underline cursor-pointer ${show === k ? "text-foreground" : "text-foreground/55 hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div aria-live="polite" className="mt-9 sm:mt-12">
        {ask.state === "error" ? (
          <p className="mb-8 text-[15px] text-[var(--beni)]">
            {ask.error}{" "}
            {sent ? <button type="button" onClick={() => send(sent)} className="cursor-pointer font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground underline underline-offset-4">Try again</button> : null}
          </p>
        ) : null}
        {judging && !ask.answer ? <p className="mb-8 text-[15px] text-muted-foreground">Reading the library for “{sent}”…</p> : null}
        {ask.answer ? (
          <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 sm:mb-8">
            <p className="text-[17px] text-foreground/80">
              {fitted.length === 0 ? "Nothing here fits" : `${fitted.length} ${fitted.length === 1 ? "fit" : "fits"}`} for “{ask.answer.query}”{judging ? "…" : ""}
            </p>
            {ask.chain.map((step, i) => (
              <button key={`${i}-${step.say}`} type="button" onClick={() => void ask.unrefine(i, kinds)} title={`Take back “${step.say}”`} className="group flex cursor-pointer items-baseline gap-1.5 bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2.5 py-1 text-[14px] hover:bg-[color-mix(in_srgb,var(--foreground)_11%,transparent)]">
                {step.say}
                <span aria-hidden className="text-foreground/40 group-hover:text-foreground">×</span>
                <span className="sr-only">(take this change back)</span>
              </button>
            ))}
            <button type="button" onClick={clear} className="cursor-pointer font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        ) : null}
      </div>

      <div className={judging ? "opacity-45 motion-safe:transition-opacity" : "motion-safe:transition-opacity"}>
        {fitted.length > 0 ? (
          <>
            <Plates items={fitted} fits={ask.fits} judging={judging} width={width} eager={eager} label="Fits" />
            <h2 className="mb-6 mt-14 font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-muted-foreground sm:mb-8 sm:mt-20">The rest of the library</h2>
          </>
        ) : null}
        <Plates items={rest.slice(0, count)} judging={judging} width={width} eager={fitted.length > 0 ? 0 : eager} label={fitted.length > 0 ? "The rest of the library" : "The library"} />
      </div>
      {more ? <div ref={end} aria-hidden className="h-px" /> : null}

      {!more && whole !== null && whole > prints.length ? (
        <p className="mt-16 text-[17px] text-foreground/75">
          {prints.length} of {whole} styles are shown here.{" "}
          <Link href="/signin" className="font-semibold text-foreground underline decoration-[var(--yuzu)] decoration-[3px] underline-offset-4">Sign in to see the full library</Link>
        </p>
      ) : null}
    </div>
  );
}
