"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { GalleryImage } from "@/components/gallery-image";
import { Marker } from "@/components/page-hero";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AtlasMap, type AtlasApi } from "../atlas/atlas-map";

type Family = { id: string; label: string; lead: string; count: number; x: number; y: number };
type Card = { kind: "language" | "art_style"; id: string; name: string; thumbnail_url: string | null; traits: string[]; fit: number | null; medium?: string };
type Answer = { query: string; considered: number; wants: string[]; avoids: string[]; results: Card[]; strange: Card[]; provisional?: boolean; want?: Record<string, number> };
type Concept = { id: string; name: string; description: string; made: number };
type Concepts = { made: Concept[]; unmade: Concept[] };
type Screen = "phone" | "desk" | "wide";
type Snap = "peek" | "half" | "full";

const EXAMPLES = ["A booking app for a small island ferry route", "A compliance dashboard for a bank's audit team", "A zine-like site for an underground music label"];
const HUES: [string, string][] = [["red", "#e5484d"], ["orange", "#f76b15"], ["yellow", "#f5c000"], ["green", "#30a46c"], ["teal", "#12a594"], ["blue", "#3b82f6"], ["violet", "#8b5cf6"], ["pink", "#e93d82"], ["neutral", "#9ba1a6"]];
// The questions most people can answer about what they want at a glance; the rest sit behind "more".
const FIRST_QUESTIONS = ["dark_ground", "paper_ground", "quiet", "playful", "dense_data", "editorial", "illustrated", "photographic", "print_process", "hand_made", "japanese", "luxury"];
const LABEL = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
const FIT_WORD = (fit: number | null, judging: boolean) => (fit === null ? (judging ? "Judging fit…" : "Matched by traits") : fit >= 0.8 ? "Strong fit" : fit >= 0.5 ? "Could work" : "A stretch");
const HALF = 0.54;
const SNAP_HEIGHT: Record<Snap, string> = { peek: "7.25rem", half: `${HALF * 100}%`, full: "92%" };
const hrefOf = (c: { kind: string; id: string }) => `/${c.kind === "language" ? "language" : "art-styles"}/${c.id}`;

function useScreen(): Screen {
  const [screen, setScreen] = useState<Screen>("desk");
  useEffect(() => {
    const read = () => setScreen(window.innerWidth < 768 ? "phone" : window.innerWidth >= 1800 ? "wide" : "desk");
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return screen;
}

export function Explore({ styles, families, holes, sample }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; sample: boolean }) {
  const screen = useScreen();
  const api = useRef<AtlasApi | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [concepts, setConcepts] = useState<Concepts | null>(null);
  const [hue, setHue] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [moreQuestions, setMoreQuestions] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>("half");
  const [editing, setEditing] = useState(false);
  const turn = useRef(0);

  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const holeIds = useMemo(() => new Set(holes.map((h) => h.id)), [holes]);

  // What is lit: an answer's fits and surprises (and the directions it names that
  // sit on the map); otherwise whatever the colour and the questions leave.
  const picked = useMemo(() => {
    if (!hue && traits.length === 0) return null;
    return styles.filter((s) => (!hue || s.hue === hue) && traits.every((t) => s.traits.includes(t)));
  }, [styles, hue, traits]);
  const lit = useMemo(() => {
    if (answer) {
      const ids = [...answer.results, ...answer.strange].map((c) => c.id).filter((id) => byId.has(id));
      const directions = (concepts ? [...concepts.unmade, ...concepts.made] : []).map((c) => c.id).filter((id) => holeIds.has(id));
      return new Set([...ids, ...directions]);
    }
    return picked ? new Set(picked.map((s) => s.id)) : null;
  }, [answer, concepts, picked, byId, holeIds]);
  const accent = useMemo(() => (answer ? new Set(answer.strange.map((c) => c.id)) : null), [answer]);

  // The map frames what was just lit: an answer once it has settled, a pick at once.
  const framed = useRef("");
  useEffect(() => {
    const ids = answer ? [...answer.results, ...answer.strange].map((c) => c.id) : picked ? picked.slice(0, 60).map((s) => s.id) : [];
    const key = ids.join(",");
    if (key === framed.current) return;
    framed.current = key;
    if (ids.length > 0) api.current?.frame(ids);
    else api.current?.fitAll();
  }, [answer, picked]);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 8) { setState("error"); setError("Give it a full sentence — what it is and who it is for."); return; }
    const mine = ++turn.current;
    setState("asking"); setError(""); setConcepts(null); setHue(""); setTraits([]); setEditing(false); api.current?.clearFocus();
    if (screen === "phone") setSnap("half");
    void fetch(`/api/ask?${new URLSearchParams({ q, stage: "concepts" })}`).then((r) => (r.ok ? r.json() : null)).then((body) => { if (mine === turn.current && body) setConcepts(body as Concepts); }).catch(() => undefined);
    try {
      const first = await fetch(`/api/ask?${new URLSearchParams({ q, k: "8", stage: "match" })}`);
      const matched = await first.json().catch(() => null);
      if (mine !== turn.current) return;
      if (!first.ok || !matched) throw new Error(matched?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(matched as Answer);
      if (matched.results.length === 0) { setState("idle"); return; }
      const second = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, k: 8, want: matched.want }) });
      const body = await second.json().catch(() => null);
      if (mine !== turn.current) return;
      if (!second.ok || !body) throw new Error(body?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(body as Answer);
      setState("idle");
    } catch (err) {
      if (mine !== turn.current) return;
      setConcepts(null);
      setAnswer((shown) => (shown?.query === q ? shown : null));
      setState("error");
      setError(err instanceof Error ? err.message : "Asking failed.");
    }
  }

  const clear = useCallback(() => {
    turn.current++;
    setAnswer(null); setConcepts(null); setHue(""); setTraits([]); setQuery(""); setState("idle"); setError(""); setEditing(false);
    api.current?.clearFocus();
  }, []);
  const toggleTrait = (id: string) => { setAnswer(null); setConcepts(null); setTraits((now) => (now.includes(id) ? now.filter((t) => t !== id) : [...now, id])); };
  const pickHue = (h: string) => { setAnswer(null); setConcepts(null); setHue((now) => (now === h ? "" : h)); };

  // ---- pieces shared by the three layouts ---------------------------------
  const askForm = (
    <form onSubmit={(e) => { e.preventDefault(); void ask(query); }} className="flex flex-col gap-3">
      <label htmlFor="explore-q" className="sr-only">What are you making?</label>
      <textarea
        id="explore-q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(query); } }}
        onFocus={() => { if (screen === "phone" && snap === "peek") setSnap("half"); }}
        placeholder="A sentence about it, and who it is for"
        rows={screen === "phone" ? 1 : 2}
        maxLength={400}
        className="sticker-card w-full resize-none px-4 py-3 text-[17px] leading-snug outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={state === "asking"} className="cursor-pointer bg-foreground px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50">
          {state === "asking" ? "Reading…" : "Light it up"}
        </button>
        {lit ? <button type="button" onClick={clear} className="ink-underline cursor-pointer text-[14.5px] text-muted-foreground hover:text-foreground">Clear</button> : null}
      </div>
    </form>
  );

  const colours = (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Or start from a colour</h2>
      <div role="group" aria-label="Colour" className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {HUES.map(([name, ink]) => (
          <button key={name} type="button" aria-pressed={hue === name} aria-label={name} title={name} onClick={() => pickHue(name)} className="h-9 w-9 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110 motion-reduce:transition-none" style={{ background: ink, boxShadow: hue === name ? "0 0 0 3px var(--background), 0 0 0 5px var(--foreground)" : undefined, transform: hue === name ? "scale(1.1)" : undefined }} />
        ))}
      </div>
    </div>
  );

  const questions = (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Or answer a few questions</h2>
      <div role="group" aria-label="What should it be like?" className={`mt-3 flex gap-1.5 ${screen === "phone" && !moreQuestions ? "overflow-x-auto pb-1 [scrollbar-width:none]" : "flex-wrap"}`}>
        {(moreQuestions ? STYLE_DNA_QUESTIONS.map((q) => q.id) : FIRST_QUESTIONS).map((id) => (
          <button key={id} type="button" aria-pressed={traits.includes(id)} onClick={() => toggleTrait(id)} className={`shrink-0 cursor-pointer px-2.5 py-1.5 text-[14.5px] transition-colors ${traits.includes(id) ? "bg-[var(--yuzu)] text-black" : "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-foreground/80 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"}`}>
            {LABEL.get(id)}?
          </button>
        ))}
        <button type="button" onClick={() => setMoreQuestions((v) => !v)} className="ink-underline shrink-0 cursor-pointer px-1 text-[14.5px] text-muted-foreground">{moreQuestions ? "fewer" : "more"}</button>
      </div>
      {picked ? <p aria-live="polite" className="mt-3 text-[14.5px] text-muted-foreground">{picked.length === 0 ? "Nothing in view is all of that. Drop one." : `${picked.length} lit on the map.`}</p> : null}
    </div>
  );

  const resultRow = (card: Card, strange: boolean) => (
    <li key={card.id}>
      <button
        type="button"
        onClick={() => api.current?.focusOn(card.id)}
        onMouseEnter={() => undefined}
        aria-pressed={focusId === card.id}
        className={`group flex w-full cursor-pointer items-stretch gap-3 p-2 text-left transition-colors ${focusId === card.id ? "bg-[color-mix(in_srgb,var(--yuzu)_35%,transparent)]" : "hover:bg-muted"}`}
      >
        <span className="relative block h-[60px] w-[92px] shrink-0 overflow-hidden bg-muted [&_img]:object-cover [&_img]:object-top">
          {card.thumbnail_url ? <GalleryImage src={card.thumbnail_url} alt="" sizes="92px" className="object-cover" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[16px] font-bold tracking-[-0.02em]">{card.name}</span>
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: strange ? "var(--sakura)" : "var(--ramune)" }}>{strange ? "Strange, still fits" : FIT_WORD(card.fit, state === "asking")}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{card.traits.slice(0, 3).join(" · ")}</span>
        </span>
      </button>
    </li>
  );

  const results = answer ? (
    <div aria-live="polite" aria-busy={state === "asking"}>
      <p className="text-[14.5px] leading-snug text-muted-foreground">
        {answer.wants.length > 0 ? <>Read as wanting <strong className="text-foreground">{answer.wants.slice(0, 4).join(", ")}</strong>. </> : null}
        {answer.considered} styles considered.
      </p>
      {answer.results.length === 0 ? <p className="mt-4 text-[17px]">Nothing in view fits that yet.</p> : <ul className="mt-3 flex flex-col gap-1">{answer.results.map((c) => resultRow(c, false))}</ul>}
      {answer.strange.length > 0 ? <ul className="mt-2 flex flex-col gap-1">{answer.strange.map((c) => resultRow(c, true))}</ul> : null}
      {concepts && concepts.unmade.length + concepts.made.length > 0 ? (
        <div className="mt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">From the encyclopedia</h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {[...concepts.unmade.slice(0, 5), ...concepts.made.slice(0, 4)].map((c) => (
              <li key={c.id}>
                {holeIds.has(c.id) ? (
                  <button type="button" onClick={() => api.current?.focusOn(c.id)} title={c.description} className="cursor-pointer bg-[color-mix(in_srgb,var(--sakura)_14%,transparent)] px-2.5 py-1.5 text-[14.5px] hover:bg-[color-mix(in_srgb,var(--sakura)_24%,transparent)]">{c.name} <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--sakura)]">soon</span></button>
                ) : (
                  <span title={c.description} className="inline-block bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2.5 py-1.5 text-[14.5px] text-foreground/80">{c.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null;

  const familyIndex = (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Or wander by family</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {families.slice(0, screen === "wide" ? 35 : 14).map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => api.current?.frame(styles.filter((s) => s.family === f.id).map((s) => s.id))} className="cursor-pointer bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2.5 py-1.5 text-[14.5px] text-foreground/80 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-foreground">
              {f.label} <span className="font-mono text-[10px] text-muted-foreground">{f.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const examples = !answer && state !== "asking" ? (
    <ul className="flex flex-col items-start gap-2">
      {EXAMPLES.map((ex) => (
        <li key={ex}><button type="button" onClick={() => { setQuery(ex); void ask(ex); }} className="ink-underline cursor-pointer text-left text-[15px] text-muted-foreground hover:text-foreground">{ex}</button></li>
      ))}
    </ul>
  ) : null;

  const errorLine = state === "error" ? <p role="alert" className="text-[15px] text-[var(--beni)]">{error}</p> : null;
  const footnote = (
    <p className="text-[14.5px] text-muted-foreground">
      {sample ? <>You are looking at the visitor shelf. <Link href="/signin" className="ink-underline text-foreground">Sign in</Link> for the whole library. </> : null}
      <Link href="/" className="ink-underline text-foreground">Browse it as a list</Link>
    </p>
  );
  const heading = (
    <h1 className="font-display text-[34px] font-bold leading-[1.02] tracking-[-0.03em] xl:text-[40px]">What are you <Marker color="yuzu">making</Marker>?</h1>
  );

  const focused = focusId ? byId.get(focusId) ?? null : null;

  // ---- phone: the map above, everything else in a sheet under the thumb -----
  if (screen === "phone") {
    const deck = answer ? [...answer.results.map((c) => ({ c, strange: false })), ...answer.strange.map((c) => ({ c, strange: true }))] : [];
    return (
      <div className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden">
        <AtlasMap styles={styles} families={families} holes={holes} unplaced={0} sample={sample} host={{ ownChrome: false, ownSheet: false, lit, accent, apiRef: api, onFocus: setFocusId, fill: true, insets: { top: 12, right: 12, left: 12, bottom: snap === "peek" ? 124 : Math.round((typeof window === "undefined" ? 700 : window.innerHeight - 129) * HALF) + 8 } }} />
        <PhoneSheet snap={snap} setSnap={setSnap}>
          {snap === "peek" ? (
            <button type="button" onClick={() => setSnap("half")} className="w-full cursor-pointer text-left">
              <span className="block font-display text-[22px] font-bold tracking-[-0.02em]">What are you <Marker color="yuzu">making</Marker>?</span>
              <span className="mt-1 block text-[14.5px] text-muted-foreground">{lit ? `${lit.size} lit on the map — pull up` : "Pull up to ask, or pick a colour"}</span>
            </button>
          ) : (
            <div className="flex flex-col gap-6">
              {answer && !editing ? (
                <>
                  {/* Once there is an answer the deck is the sheet: the question folds to a line. */}
                  <div className="flex items-baseline justify-between gap-3 pr-8">
                    <button type="button" onClick={() => setEditing(true)} className="min-w-0 cursor-pointer truncate text-left text-[15px] text-muted-foreground">“{answer.query}”</button>
                    <button type="button" onClick={clear} className="ink-underline shrink-0 cursor-pointer text-[14.5px]">New</button>
                  </div>
                  {errorLine}
                  {deck.length > 0 ? <PhoneDeck deck={deck} judging={state === "asking"} onShow={(id) => api.current?.focusOn(id)} /> : <p className="text-[17px]">Nothing in view fits that yet.</p>}
                  {concepts ? <ConceptLine concepts={concepts} holeIds={holeIds} onPick={(id) => { api.current?.focusOn(id); setSnap("peek"); }} /> : null}
                </>
              ) : (
                <>
                  {heading}
                  {askForm}
                  {errorLine}
                  {examples}
                </>
              )}
              {colours}
              {questions}
              {focused && !answer ? <p className="text-[14.5px] text-muted-foreground">On the map: <Link href={focused.href} className="ink-underline text-foreground">{focused.name}</Link></p> : null}
              {footnote}
            </div>
          )}
        </PhoneSheet>
      </div>
    );
  }

  // ---- desktop and wide ------------------------------------------------------
  const panel = (
    <div className="flex flex-col gap-7">
      {heading}
      {askForm}
      {errorLine}
      {examples}
      {screen === "desk" ? results : null}
      {colours}
      {questions}
      {screen === "desk" && !answer ? familyIndex : null}
      {footnote}
    </div>
  );

  if (screen === "wide") {
    return (
      <div className="grid h-[calc(100dvh-65px)] w-full grid-cols-[30rem_minmax(0,1fr)_34rem]">
        <aside aria-label="Ask" className="overflow-y-auto px-10 py-10">{panel}</aside>
        <div className="relative min-w-0">
          <AtlasMap styles={styles} families={families} holes={holes} unplaced={0} sample={sample} host={{ ownChrome: false, lit, accent, apiRef: api, onFocus: setFocusId, fill: true, insets: { top: 32, right: focusId ? 372 : 32, bottom: 32, left: 32 } }} />
        </div>
        <aside aria-label="Results" className="overflow-y-auto px-8 py-10">
          {answer ? (
            <>
              <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">The fit</h2>
              <div className="mt-4">{results}</div>
            </>
          ) : (
            <div className="flex flex-col gap-8">
              <p className="max-w-md text-[17px] leading-relaxed text-muted-foreground">Every design language and art style in the library, placed by how alike they are. Ask on the left and the ones that fit light up here, with a few you would not have searched for.</p>
              {familyIndex}
            </div>
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-65px)] w-full overflow-hidden">
      <AtlasMap styles={styles} families={families} holes={holes} unplaced={0} sample={sample} host={{ ownChrome: false, lit, accent, apiRef: api, onFocus: setFocusId, fill: true, insets: { top: 32, right: focusId ? 388 : 40, bottom: 32, left: 456 } }} />
      <aside aria-label="Ask" className="absolute bottom-6 left-6 top-6 z-10 w-[26rem] overflow-y-auto bg-background/95 px-7 py-8 shadow-[var(--shadow-card-hover)]" style={{ overscrollBehavior: "contain" }}>
        {panel}
      </aside>
    </div>
  );
}

function ConceptLine({ concepts, holeIds, onPick }: { concepts: Concepts; holeIds: Set<string>; onPick: (id: string) => void }) {
  const list = [...concepts.unmade.slice(0, 4), ...concepts.made.slice(0, 3)];
  if (list.length === 0) return null;
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">From the encyclopedia</h2>
      <ul className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {list.map((c) => (
          <li key={c.id} className="shrink-0">
            {holeIds.has(c.id) ? <button type="button" onClick={() => onPick(c.id)} className="cursor-pointer bg-[color-mix(in_srgb,var(--sakura)_14%,transparent)] px-2.5 py-1.5 text-[14.5px]">{c.name} <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--sakura)]">soon</span></button> : <span className="inline-block bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2.5 py-1.5 text-[14.5px] text-foreground/80">{c.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A swipeable deck: the card under the thumb is the one the map shows. */
function PhoneDeck({ deck, judging, onShow }: { deck: { c: Card; strange: boolean }[]; judging: boolean; onShow: (id: string) => void }) {
  const root = useRef<HTMLUListElement | null>(null);
  const shown = useRef("");
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const seen = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = top?.target.getAttribute("data-id");
      if (id && id !== shown.current) { shown.current = id; onShow(id); }
    }, { root: el, threshold: 0.7 });
    el.querySelectorAll("li").forEach((li) => seen.observe(li));
    return () => seen.disconnect();
  }, [deck, onShow]);
  return (
    <ul ref={root} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
      {deck.map(({ c, strange }) => (
        <li key={c.id} data-id={c.id} className="sticker-card w-[78%] shrink-0 snap-center overflow-hidden">
          <span className="relative block w-full overflow-hidden bg-muted [&_img]:object-cover [&_img]:object-top" style={{ aspectRatio: "2 / 1" }}>
            {c.thumbnail_url ? <GalleryImage src={c.thumbnail_url} alt="" sizes="80vw" className="object-cover" /> : null}
          </span>
          <span className="block px-4 pb-4 pt-3">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate font-display text-[19px] font-bold tracking-[-0.02em]">{c.name}</span>
              <Link href={hrefOf(c)} aria-label={`Open ${c.name}`} className="shrink-0 p-1 text-foreground"><ArrowUpRight size={20} /></Link>
            </span>
            <span className="mt-1 block font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: strange ? "var(--sakura)" : "var(--ramune)" }}>{strange ? "Strange, still fits" : FIT_WORD(c.fit, judging)}</span>
            <span className="mt-1.5 block text-[14.5px] leading-snug text-muted-foreground">{c.traits.slice(0, 4).join(" · ")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The phone's sheet: three heights, moved by dragging its handle or tapping it. */
function PhoneSheet({ snap, setSnap, children }: { snap: Snap; setSnap: (s: Snap) => void; children: React.ReactNode }) {
  const drag = useRef<{ y: number; moved: number } | null>(null);
  const order: Snap[] = ["peek", "half", "full"];
  const step = (by: number) => setSnap(order[Math.min(2, Math.max(0, order.indexOf(snap) + by))]);
  return (
    <section aria-label="Ask and results" className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-background shadow-[0_-10px_36px_-16px_rgba(30,35,45,0.4)] transition-[height] duration-300 ease-out motion-reduce:transition-none" style={{ height: SNAP_HEIGHT[snap] }}>
      <button
        type="button"
        aria-label={snap === "full" ? "Lower the sheet" : "Raise the sheet"}
        onClick={() => { if (!drag.current || Math.abs(drag.current.moved) < 6) step(snap === "full" ? -1 : 1); }}
        onPointerDown={(e) => { drag.current = { y: e.clientY, moved: 0 }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current) drag.current.moved = e.clientY - drag.current.y; }}
        onPointerUp={() => { const d = drag.current; if (d && Math.abs(d.moved) > 28) step(d.moved < 0 ? 1 : -1); window.setTimeout(() => { drag.current = null; }, 0); }}
        className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center"
      >
        <span aria-hidden className="h-1.5 w-12 bg-[color-mix(in_srgb,var(--foreground)_22%,transparent)]" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6" style={{ overscrollBehavior: "contain" }}>{children}</div>
      {snap !== "peek" ? <button type="button" onClick={() => setSnap("peek")} aria-label="See the map" className="absolute right-3 top-2 cursor-pointer p-2 text-muted-foreground"><X size={18} /></button> : null}
    </section>
  );
}
