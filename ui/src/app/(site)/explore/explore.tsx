"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Marker } from "@/components/page-hero";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AtlasMap, type AtlasApi } from "../atlas/atlas-map";
import { PhoneAtlas } from "../atlas/family-feed";
import { FitPicture } from "../atlas/fit-picture";

type Family = { id: string; label: string; lead: string; count: number; x: number; y: number };
type Card = { kind: "language" | "art_style"; id: string; name: string; thumbnail_url: string | null; traits: string[]; fit: number | null; medium?: string };
type Answer = { query: string; considered: number; wants: string[]; avoids: string[]; results: Card[]; strange: Card[]; provisional?: boolean; want?: Record<string, number> };
type Concept = { id: string; name: string; description: string; made: number };
type Concepts = { made: Concept[]; unmade: Concept[] };
type Screen = "phone" | "desk" | "wide";

const HUES: [string, string][] = [["red", "#e5484d"], ["orange", "#f76b15"], ["yellow", "#f5c000"], ["green", "#30a46c"], ["teal", "#12a594"], ["blue", "#3b82f6"], ["violet", "#8b5cf6"], ["pink", "#e93d82"], ["neutral", "#9ba1a6"]];
// The questions most people can answer about what they want at a glance; the rest sit behind "more".
const FIRST_QUESTIONS = ["dark_ground", "paper_ground", "quiet", "playful", "dense_data", "editorial", "illustrated", "photographic", "print_process", "hand_made", "japanese", "luxury"];
const LABEL = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
const FIT_WORD = (fit: number | null, judging: boolean) => (fit === null ? (judging ? "Judging fit…" : "Matched by traits") : fit >= 0.8 ? "Strong fit" : fit >= 0.5 ? "Could work" : "A stretch");
const hrefOf = (c: { kind: string; id: string }) => `/${c.kind === "language" ? "language" : "art-styles"}/${c.id}`;

// Unknown until the browser says: the three layouts give the map different
// room, and a map fitted for the wrong one opens as a speck off the edge.
function useScreen(): Screen | null {
  const [screen, setScreen] = useState<Screen | null>(null);
  useEffect(() => {
    const read = () => setScreen(window.innerWidth < 768 ? "phone" : window.innerWidth >= 1800 ? "wide" : "desk");
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return screen;
}

export function Explore({ styles, families, holes, sample }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; sample: boolean }) {
  const measured = useScreen();
  const screen: Screen = measured ?? "desk";
  const api = useRef<AtlasApi | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [concepts, setConcepts] = useState<Concepts | null>(null);
  const [hue, setHue] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [moreQuestions, setMoreQuestions] = useState(false);
  // A focus belongs to the layout it was made in: a map rebuilt for another screen opens with none.
  const [focus, setFocus] = useState<{ screen: Screen; id: string | null }>({ screen: "desk", id: null });
  const focusId = focus.screen === screen ? focus.id : null;
  const setFocusId = useCallback((id: string | null) => setFocus({ screen, id }), [screen]);
  const [refine, setRefine] = useState(false);
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
    // Order does not matter: the judged fit reorders the same cards, and re-framing
    // then would throw away a pan made while it was being judged.
    const key = [...ids].sort().join(",");
    if (key === framed.current) return;
    framed.current = key;
    if (ids.length > 0) api.current?.frame(ids);
    else api.current?.fitAll();
  }, [answer, picked]);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 8) { setState("error"); setError("Give it a full sentence — what it is and who it is for."); return; }
    const mine = ++turn.current;
    setState("asking"); setError(""); setConcepts(null); setHue(""); setTraits([]); api.current?.clearFocus();
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
    setAnswer(null); setConcepts(null); setHue(""); setTraits([]); setQuery(""); setState("idle"); setError("");
    api.current?.clearFocus();
  }, []);
  // Picking by eye abandons any question still being read.
  const toggleTrait = (id: string) => { turn.current++; setState("idle"); setAnswer(null); setConcepts(null); setTraits((now) => (now.includes(id) ? now.filter((t) => t !== id) : [...now, id])); };
  const pickHue = (h: string) => { turn.current++; setState("idle"); setAnswer(null); setConcepts(null); setHue((now) => (now === h ? "" : h)); };

  // ---- pieces shared by the layouts ------------------------------------------
  const phone = screen === "phone";
  const askForm = (
    <form onSubmit={(e) => { e.preventDefault(); void ask(query); }} className="flex items-stretch gap-2">
      <label htmlFor="explore-q" className="sr-only">What are you making?</label>
      <textarea
        id="explore-q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(query); } }}
        placeholder={phone ? "What are you making, and for whom?" : "What are you making, and for whom? e.g. a booking app for a small island ferry route"}
        rows={phone && query.length < 36 ? 1 : 2}
        maxLength={400}
        className="min-w-0 flex-1 resize-none bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2 text-[16px] leading-snug outline-none placeholder:text-muted-foreground focus-visible:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] md:text-[14px]"
      />
      <button type="submit" disabled={state === "asking"} className="shrink-0 cursor-pointer bg-foreground px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-background disabled:opacity-50">
        {state === "asking" ? "Reading" : "Ask"}
      </button>
    </form>
  );

  const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
  const chip = (on: boolean) => `shrink-0 cursor-pointer px-2 py-1 text-[13px] transition-colors ${on ? "bg-[var(--yuzu)] text-black" : "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-foreground/80 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"}`;
  const picks = (hue ? 1 : 0) + traits.length;
  // Colour and questions are a second way in, so they wait behind one line until wanted.
  const refineBar = (
    <div className="flex items-center gap-4">
      <button type="button" aria-expanded={refine} onClick={() => setRefine((v) => !v)} className={`cursor-pointer ${label} hover:text-foreground`}>
        {refine ? "− " : "+ "}Colour and traits{picks > 0 ? ` · ${picks}` : ""}
      </button>
      {lit ? <button type="button" onClick={clear} className={`cursor-pointer ${label} hover:text-foreground`}>Clear</button> : null}
      {picked ? <span aria-live="polite" className="ml-auto text-[12.5px] text-muted-foreground">{picked.length === 0 ? "Nothing is all of that" : `${picked.length} lit`}</span> : null}
    </div>
  );
  const refinePanel = refine ? (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Colour" className="flex gap-2 overflow-x-auto p-1 [scrollbar-width:none]">
        {HUES.map(([name, ink]) => (
          <button key={name} type="button" aria-pressed={hue === name} aria-label={name} title={name} onClick={() => pickHue(name)} className="h-6 w-6 shrink-0 cursor-pointer rounded-full" style={{ background: ink, boxShadow: hue === name ? "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)" : undefined }} />
        ))}
      </div>
      <div role="group" aria-label="What should it be like?" className={`flex gap-1 ${phone && !moreQuestions ? "overflow-x-auto [scrollbar-width:none]" : "flex-wrap"}`}>
        {(moreQuestions ? STYLE_DNA_QUESTIONS.map((q) => q.id) : FIRST_QUESTIONS).map((id) => (
          <button key={id} type="button" aria-pressed={traits.includes(id)} onClick={() => toggleTrait(id)} className={chip(traits.includes(id))}>{LABEL.get(id)}</button>
        ))}
        <button type="button" onClick={() => setMoreQuestions((v) => !v)} className="ink-underline shrink-0 cursor-pointer px-1 text-[13px] text-muted-foreground">{moreQuestions ? "fewer" : "more"}</button>
      </div>
    </div>
  ) : null;

  const resultRow = (card: Card, strange: boolean) => {
    const inner = (
      <>
        <span className="flex w-[84px] shrink-0 justify-center"><FitPicture src={card.thumbnail_url} height={48} maxWidth={84} sizes="92px" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-tight">{card.name}</span>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: strange ? "var(--sakura)" : "var(--ramune)" }}>{strange ? "Strange, still fits" : FIT_WORD(card.fit, state === "asking")}</span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{card.traits.slice(0, 3).join(" · ")}</span>
        </span>
      </>
    );
    const row = `group flex w-full cursor-pointer items-center gap-3 px-1.5 py-1.5 text-left transition-colors ${focusId === card.id ? "bg-[color-mix(in_srgb,var(--yuzu)_35%,transparent)]" : "hover:bg-muted"}`;
    return (
      <li key={card.id}>
        {/* A phone has no map beside the list to fly over, so a row opens the style itself. */}
        {phone ? <Link href={hrefOf(card)} className={row}>{inner}</Link> : <button type="button" onClick={() => api.current?.focusOn(card.id)} aria-pressed={focusId === card.id} className={row}>{inner}</button>}
      </li>
    );
  };

  const directions = concepts ? [...concepts.unmade.slice(0, 5), ...concepts.made.slice(0, 4)] : [];
  const resultsFor = (showOnMap: (id: string) => void) => answer ? (
    <div aria-live="polite" aria-busy={state === "asking"}>
      <p className="text-[12.5px] leading-snug text-muted-foreground">
        {answer.wants.length > 0 ? <>Read as wanting <strong className="font-semibold text-foreground">{answer.wants.slice(0, 4).join(", ")}</strong>. </> : null}
        {answer.considered} considered.
      </p>
      {answer.results.length === 0 ? <p className="mt-3 text-[14px]">Nothing in view fits that yet.</p> : <ul className="mt-2 flex flex-col">{answer.results.map((c) => resultRow(c, false))}</ul>}
      {answer.strange.length > 0 ? <ul className="flex flex-col">{answer.strange.map((c) => resultRow(c, true))}</ul> : null}
      {directions.length > 0 ? (
        <div className="mt-4">
          <h2 className={label}>From the encyclopedia</h2>
          <ul className="mt-2 flex flex-wrap gap-1">
            {directions.map((c) => (
              <li key={c.id}>
                {holeIds.has(c.id) ? (
                  <button type="button" onClick={() => showOnMap(c.id)} title={c.description} className="cursor-pointer bg-[color-mix(in_srgb,var(--sakura)_14%,transparent)] px-2 py-1 text-[13px] hover:bg-[color-mix(in_srgb,var(--sakura)_24%,transparent)]">{c.name} <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--sakura)]">soon</span></button>
                ) : (
                  <span title={c.description} className="inline-block bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-1 text-[13px] text-foreground/80">{c.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null;

  const errorLine = state === "error" ? <p role="alert" className="text-[13px] text-[var(--beni)]">{error}</p> : null;

  if (!measured) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;

  // ---- phone: a list under the thumb, the map one tap away ---------------------
  if (phone) {
    return <PhoneAtlas styles={styles} families={families} holes={holes} sample={sample} lit={lit} accent={accent} apiRef={api} title="What are you making?" top={<div className="flex flex-col gap-2">{askForm}{errorLine}{refineBar}{refinePanel}</div>} body={answer ? resultsFor : null} />;
  }

  // ---- desktop and wide: one slim panel over the map ---------------------------
  const wide = screen === "wide";
  const width = wide ? 384 : 336;
  return (
    <div className="relative h-[calc(100dvh-65px)] w-full overflow-hidden">
      <AtlasMap key={screen} styles={styles} families={families} holes={holes} unplaced={0} sample={sample} host={{ ownChrome: false, lit, accent, apiRef: api, onFocus: setFocusId, fill: true, insets: { top: 32, right: focusId ? 340 : 40, bottom: 32, left: width + 48 } }} />
      <aside aria-label="Ask" className="absolute left-5 top-5 z-10 flex max-h-[calc(100%-40px)] flex-col gap-3 overflow-y-auto bg-background/95 p-4 shadow-[var(--shadow-card)]" style={{ width, overscrollBehavior: "contain" }}>
        <h1 className="font-display text-[19px] font-bold leading-tight tracking-[-0.02em]">What are you <Marker color="yuzu">making</Marker>?</h1>
        {askForm}
        {errorLine}
        {refineBar}
        {refinePanel}
        {resultsFor((id) => api.current?.focusOn(id))}
        {sample ? <p className="text-[12.5px] text-muted-foreground">Visitor shelf. <Link href="/signin" className="ink-underline text-foreground">Sign in</Link> for the whole library.</p> : null}
      </aside>
    </div>
  );
}

