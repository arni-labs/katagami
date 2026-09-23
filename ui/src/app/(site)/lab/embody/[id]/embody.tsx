"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/genui/screen";
import { Chosen } from "@/components/genui/chosen";
import type { ScreenPlan } from "@/lib/genui/catalogue";
import type { ScreenTheme } from "@/lib/genui/theme";
import type { Planned } from "@/lib/genui/plan";

const EXAMPLES = ["A booking form for a vet clinic", "A settings page", "A dashboard for a small island ferry operator", "A landing page for a sourdough bakery"];

const INPUT = "sticker-card min-w-0 flex-1 px-5 py-4 text-[17px] outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]";
const BUTTON = "cursor-pointer bg-foreground px-8 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50";

export function Embody({ theme, languages, initialBrief }: { theme: ScreenTheme; languages: { id: string; name: string }[]; initialBrief: string }) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief);
  const [shown, setShown] = useState<{ brief: string; plan: ScreenPlan; model: string | null; ms: number; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const latest = useRef(0);

  async function build(text: string) {
    const b = text.trim();
    if (b.length < 4) return;
    const turn = ++latest.current;
    setBusy(true);
    setFailed("");
    const started = performance.now();
    try {
      const res = await fetch(`/api/lab/plan?${new URLSearchParams({ brief: b })}`);
      const body = (await res.json().catch(() => null)) as Planned | { error: string } | null;
      if (turn !== latest.current) return;
      if (!res.ok || !body || !("plan" in body)) throw new Error((body && "error" in body && body.error) || "Planning failed.");
      setShown({ brief: b, plan: body.plan, model: body.model, ms: Math.round(performance.now() - started), error: body.error });
    } catch (err) {
      if (turn !== latest.current) return;
      setFailed(err instanceof Error ? err.message : "Planning failed.");
    } finally {
      if (turn === latest.current) setBusy(false);
    }
  }

  // A brief in the URL (from the language switcher) builds on arrival.
  const first = useRef(initialBrief);
  useEffect(() => {
    if (first.current) void build(first.current);
     
  }, []);

  return (
    <div className="mt-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void build(brief);
        }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <label htmlFor="embody-brief" className="sr-only">What do you want on the screen?</label>
        <input id="embody-brief" type="text" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What screen do you want? e.g. a booking form for a vet clinic" maxLength={300} className={INPUT} />
        <button type="submit" disabled={busy} className={BUTTON}>{busy ? "Choosing…" : "Build it"}</button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setBrief(ex); void build(ex); }} className="ink-underline cursor-pointer text-left text-[15.5px]">
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="embody-lang" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Same screen, another language</label>
        <select
          id="embody-lang"
          value={theme.id}
          onChange={(e) => router.push(`/lab/embody/${e.target.value}${shown ? `?brief=${encodeURIComponent(shown.brief)}` : ""}`)}
          className="sticker-card cursor-pointer px-3 py-2 text-[15.5px]"
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {failed ? <p role="alert" className="mt-6 text-[17px] text-[var(--beni)]">{failed}</p> : null}

      {shown ? (
        <section className="mt-10" aria-live="polite" aria-busy={busy}>
          <Chosen plan={shown.plan} ms={shown.ms} model={shown.model} error={shown.error} />
          <div className={`sticker-card mt-4 overflow-hidden ${busy ? "opacity-60 transition-opacity motion-reduce:transition-none" : ""}`} data-screen>
            <Screen plan={shown.plan} theme={theme} brief={shown.brief} />
          </div>
          {theme.borrowed.length > 0 ? (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              No token of its own for {theme.borrowed.join(", ")}: borrowed a neighbour&apos;s value from the same language.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-12 text-[17px] text-muted-foreground">Nothing built yet. Type a screen, or try one above.</p>
      )}
    </div>
  );
}
