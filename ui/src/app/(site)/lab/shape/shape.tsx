"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";
import { Screen, ThemeFonts } from "@/components/genui/screen";
import { Scaled } from "@/components/genui/scaled";
import { fallbackPlan } from "@/lib/genui/catalogue";
import type { Intent } from "@/lib/genui/intent";
import type { ScreenTheme } from "@/lib/genui/theme";

type Card = { id: string; name: string; thumbnail_url: string | null; traits: string[]; match: number };
type Theme = ScreenTheme & { url: string; thumbnail_url: string | null };
type Read = { q: string; intent: Intent; scores: Record<Intent, number> | null; named: { id: string; name: string }[]; error?: string; timings_ms: { jev: number } };
type Shown = { q: string; read: Read; cards: Card[]; themes: Theme[]; ms: { intent: number; ask: number; total: number }; askError?: string };

const EXAMPLES = ["A booking app for a small island ferry route", "Compare Akte and Greenbar", "What colours does Herbier use?", "Show me everything handmade"];
const INPUT = "sticker-card min-w-0 flex-1 px-5 py-4 text-[17px] outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]";
const BUTTON = "cursor-pointer bg-foreground px-8 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50";
const SHAPE_WORD: Record<Intent, string> = { find: "a short list", compare: "a comparison", palette: "a palette view", wall: "a wall" };
// The screen every comparison renders: fixed, so two languages differ only in themselves.
const COMPARE_PLAN = fallbackPlan("a booking form");

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? "No answer.");
  return body;
}

export function Shape() {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const latest = useRef(0);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3) return;
    const turn = ++latest.current;
    setBusy(true);
    setFailed("");
    const t0 = performance.now();
    try {
      // The intent and the match are asked together: two model calls, one wait.
      let intentMs = 0, askMs = 0, askError: string | undefined;
      const [read, matched] = await Promise.all([
        json<Read>(`/api/lab/intent?${new URLSearchParams({ q })}`).then((r) => { intentMs = Math.round(performance.now() - t0); return r; }),
        q.length >= 8
          ? json<{ results: Card[] }>(`/api/ask?${new URLSearchParams({ q, stage: "match", kind: "language", k: "20" })}`).then((r) => { askMs = Math.round(performance.now() - t0); return r; }).catch((err: Error) => { askError = err.message; return { results: [] as Card[] }; })
          : Promise.resolve({ results: [] as Card[] }),
      ]);
      if (turn !== latest.current) return;
      // The shape decides which languages need their tokens: the two named for a
      // comparison, the top six for a palette view, none for a list or a wall.
      const ids = read.intent === "compare" ? read.named.slice(0, 2).map((n) => n.id) : read.intent === "palette" ? matched.results.slice(0, 6).map((c) => c.id) : [];
      const { themes } = ids.length ? await json<{ themes: Theme[] }>(`/api/lab/theme?ids=${ids.map(encodeURIComponent).join(",")}`) : { themes: [] as Theme[] };
      if (turn !== latest.current) return;
      setShown({ q, read, cards: matched.results, themes: ids.map((id) => themes.find((t) => t.id === id)).filter((t): t is Theme => Boolean(t)), ms: { intent: intentMs, ask: askMs, total: Math.round(performance.now() - t0) }, askError });
    } catch (err) {
      if (turn !== latest.current) return;
      setFailed(err instanceof Error ? err.message : "Asking failed.");
    } finally {
      if (turn === latest.current) setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      {shown ? <ThemeFonts themes={shown.themes} /> : null}
      <form onSubmit={(e) => { e.preventDefault(); void ask(query); }} className="flex flex-col gap-4 sm:flex-row">
        <label htmlFor="shape-q" className="sr-only">Ask anything about the library</label>
        <input id="shape-q" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe a product, compare two languages, ask about colours, or browse a quality" maxLength={400} className={INPUT} />
        <button type="submit" disabled={busy} className={BUTTON}>{busy ? "Reading…" : "Ask"}</button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setQuery(ex); void ask(ex); }} className="ink-underline cursor-pointer text-left text-[15.5px]">{ex}</button>
        ))}
      </div>

      {failed ? <p role="alert" className="mt-6 text-[17px] text-[var(--beni)]">{failed}</p> : null}

      {shown ? (
        <section className={`mt-10 ${busy ? "opacity-60 transition-opacity motion-reduce:transition-none" : ""}`} aria-live="polite" aria-busy={busy} data-shape={shown.read.intent}>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="text-foreground">Read as {SHAPE_WORD[shown.read.intent]}</span>
            {shown.read.scores ? ` · ${(Object.entries(shown.read.scores) as [Intent, number][]).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(" / ")}` : ""}
            {` · intent ${shown.ms.intent} ms`}{shown.ms.ask ? ` · match ${shown.ms.ask} ms` : ""}{` · ${shown.ms.total} ms on screen`}
            {shown.read.error ? <span className="block normal-case tracking-normal text-[var(--beni)]">Intent could not be read ({shown.read.error}); shown as a list.</span> : null}
            {shown.askError ? <span className="block normal-case tracking-normal text-[var(--beni)]">The library could not be matched: {shown.askError}</span> : null}
          </p>
          <div className="mt-6">
            {shown.read.intent === "compare" ? <Compare shown={shown} /> : shown.read.intent === "palette" ? <Palette shown={shown} /> : shown.read.intent === "wall" ? <Wall cards={shown.cards} /> : <List cards={shown.cards} />}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function List({ cards }: { cards: Card[] }) {
  const few = cards.slice(0, 4);
  if (few.length === 0) return <p className="text-[17px] text-muted-foreground">Nothing in view fits that yet.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {few.map((c) => (
        <li key={c.id}>
          <Link href={`/language/${c.id}`} className="sticker-card group/card flex h-full flex-col overflow-hidden">
            <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16 / 10" }}>
              {c.thumbnail_url ? <GalleryImage src={c.thumbnail_url} alt={`${c.name} preview`} sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" /> : null}
            </div>
            <div className="px-4 py-4">
              <h3 className="font-display text-[18px] font-bold leading-tight tracking-[-0.02em]">{c.name}</h3>
              <p className="mt-1 text-[14.5px] leading-snug text-muted-foreground">{c.traits.join(" · ")}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Wall({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return <p className="text-[17px] text-muted-foreground">Nothing in view fits that yet.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {cards.map((c) => (
        <li key={c.id}>
          <Link href={`/language/${c.id}`} title={c.name} className="sticker-card block overflow-hidden">
            <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "1 / 1" }}>
              {c.thumbnail_url ? <GalleryImage src={c.thumbnail_url} alt={c.name} sizes="(min-width: 1024px) 16vw, 33vw" className="object-cover" /> : null}
            </div>
            <p className="truncate px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">{c.name}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const SWATCHES = ["bg", "surface", "text", "muted", "accent", "accent2", "success", "warning", "error"] as const;

function Palette({ shown }: { shown: Shown }) {
  if (shown.themes.length === 0) return <p className="text-[17px] text-muted-foreground">No language in view to read colours from.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {shown.themes.map((t) => (
        <li key={t.id} className="sticker-card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Link href={`/language/${t.id}`} className="ink-underline font-display text-[20px] font-bold tracking-[-0.02em]">{t.name}</Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t.type.heading} · {t.type.body}</span>
          </div>
          <div className="mt-4 flex h-16 w-full overflow-hidden">
            {SWATCHES.map((k) => (
              <div key={k} className="flex-1" title={`${k}: ${t.colors[k]}`} style={{ background: t.colors[k] }} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-9">
            {SWATCHES.map((k) => (
              <span key={k} className="truncate">{k} <span className="normal-case">{t.colors[k]}</span></span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

const ROWS: { label: string; of: (t: Theme) => string }[] = [
  { label: "Background", of: (t) => t.colors.bg },
  { label: "Text", of: (t) => t.colors.text },
  { label: "Accent", of: (t) => t.colors.accent },
  { label: "Heading", of: (t) => `${t.type.heading} ${t.type.headingWeight} ${t.type.headingTransform}` },
  { label: "Body", of: (t) => `${t.type.body} ${t.type.baseSize}` },
  { label: "Radii", of: (t) => `${t.radii.sm} / ${t.radii.md} / ${t.radii.lg}` },
  { label: "Spacing base", of: (t) => t.spaceBase },
  { label: "Motion", of: (t) => `${t.motion.duration} ${t.motion.easing}` },
];

function Compare({ shown }: { shown: Shown }) {
  const [a, b] = shown.themes;
  if (!a || !b) return <p className="text-[17px] text-muted-foreground">Name two languages in view to compare them.</p>;
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        {[a, b].map((t) => (
          <div key={t.id} className="sticker-card overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <Link href={`/language/${t.id}`} className="ink-underline font-display text-[20px] font-bold tracking-[-0.02em]">{t.name}</Link>
            </div>
            <Scaled width={1024}>
              <Screen plan={COMPARE_PLAN} theme={t} brief="A booking form" />
            </Scaled>
          </div>
        ))}
      </div>
      <table className="mt-8 w-full text-[14.5px]">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="py-2 text-left font-medium">Token</th>
            <th className="py-2 text-left font-medium">{a.name}</th>
            <th className="py-2 text-left font-medium">{b.name}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="align-top">
              <td className="py-2 pr-4 text-muted-foreground">{r.label}</td>
              {[a, b].map((t) => (
                <td key={t.id} className="py-2 pr-4 font-mono text-[13px]">
                  {r.label === "Background" || r.label === "Text" || r.label === "Accent" ? <span className="mr-2 inline-block h-3 w-3 align-middle" style={{ background: r.of(t), boxShadow: "inset 0 0 0 1px rgba(30,35,45,.12)" }} /> : null}
                  {r.of(t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
