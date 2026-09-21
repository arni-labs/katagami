"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Screen, ThemeFonts } from "@/components/genui/screen";
import { Scaled } from "@/components/genui/scaled";
import { Chosen } from "@/components/genui/chosen";
import type { ScreenPlan } from "@/lib/genui/catalogue";
import type { ScreenTheme } from "@/lib/genui/theme";
import type { Planned } from "@/lib/genui/plan";

type Match = { id: string; name: string; match: number; traits: string[] };
type Shown = {
  query: string;
  plan: ScreenPlan;
  planModel: string | null;
  planError?: string;
  matches: Match[];
  themes: (ScreenTheme & { url: string })[];
  ms: { total: number; ask: number; plan: number; themes: number };
  considered: number;
  tier: string;
};

const EXAMPLES = ["A booking app for a small island ferry route", "A compliance dashboard for a bank's audit team", "A sign-up page for a children's coding club"];
const INPUT = "sticker-card min-w-0 flex-1 px-5 py-4 text-[17px] outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]";
const BUTTON = "cursor-pointer bg-foreground px-8 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50";

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? "The library did not answer.");
  return body;
}

export function SideBySide() {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState<"" | "asking" | "rendering">("");
  const [failed, setFailed] = useState("");
  const latest = useRef(0);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 8) {
      setFailed("Give it a full sentence — what it is and who it is for.");
      return;
    }
    const turn = ++latest.current;
    setBusy("asking");
    setFailed("");
    const t0 = performance.now();
    try {
      // Two model calls, made together: which languages, and what screen.
      let askMs = 0, planMs = 0;
      const [matched, planned] = await Promise.all([
        json<{ results: Match[]; considered: number; tier: string }>(`/api/ask?${new URLSearchParams({ q, stage: "match", kind: "language", k: "4" })}`).then((r) => { askMs = Math.round(performance.now() - t0); return r; }),
        json<Planned>(`/api/lab/plan?${new URLSearchParams({ brief: q })}`).then((r) => { planMs = Math.round(performance.now() - t0); return r; }),
      ]);
      if (turn !== latest.current) return;
      setBusy("rendering");
      const t1 = performance.now();
      const ids = matched.results.slice(0, 4).map((m) => m.id);
      const { themes } = ids.length ? await json<{ themes: (ScreenTheme & { url: string })[] }>(`/api/lab/theme?ids=${ids.map(encodeURIComponent).join(",")}`) : { themes: [] };
      if (turn !== latest.current) return;
      setShown({
        query: q,
        plan: planned.plan,
        planModel: planned.model,
        planError: planned.error,
        matches: matched.results,
        themes: ids.map((id) => themes.find((t) => t.id === id)).filter((t): t is ScreenTheme & { url: string } => Boolean(t)),
        ms: { total: Math.round(performance.now() - t0), ask: askMs, plan: planMs, themes: Math.round(performance.now() - t1) },
        considered: matched.considered,
        tier: matched.tier,
      });
    } catch (err) {
      if (turn !== latest.current) return;
      setFailed(err instanceof Error ? err.message : "Asking failed.");
    } finally {
      if (turn === latest.current) setBusy("");
    }
  }

  return (
    <div className="mt-10">
      {shown ? <ThemeFonts themes={shown.themes} /> : null}
      <form onSubmit={(e) => { e.preventDefault(); void ask(query); }} className="flex flex-col gap-4 sm:flex-row">
        <label htmlFor="sbs-q" className="sr-only">What are you making?</label>
        <input id="sbs-q" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What are you making, and for whom?" maxLength={300} className={INPUT} />
        <button type="submit" disabled={busy !== ""} className={BUTTON}>{busy === "asking" ? "Asking…" : busy === "rendering" ? "Rendering…" : "Show me"}</button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setQuery(ex); void ask(ex); }} className="ink-underline cursor-pointer text-left text-[15.5px]">{ex}</button>
        ))}
      </div>

      {failed ? <p role="alert" className="mt-6 text-[17px] text-[var(--beni)]">{failed}</p> : null}

      {shown ? (
        <section className={`mt-10 ${busy ? "opacity-60 transition-opacity motion-reduce:transition-none" : ""}`} aria-live="polite" aria-busy={busy !== ""}>
          <Chosen plan={shown.plan} ms={null} model={shown.planModel} error={shown.planError} />
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            2 model calls together · ask {shown.ms.ask} ms · plan {shown.ms.plan} ms · tokens {shown.ms.themes} ms · {shown.ms.total} ms on screen · {shown.considered} languages considered ({shown.tier})
          </p>
          {shown.themes.length === 0 ? (
            <p className="mt-6 text-[17px] text-muted-foreground">Nothing in view fits that yet.</p>
          ) : (
            <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {shown.themes.map((theme, i) => (
                <li key={theme.id} className="sticker-card flex flex-col overflow-hidden" style={{ ["--card-ink" as string]: theme.colors.accent }}>
                  <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
                    <Link href={`/language/${theme.id}`} className="ink-underline font-display text-[18px] font-bold tracking-[-0.02em]">{theme.name}</Link>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      #{i + 1} · match {Math.round((shown.matches[i]?.match ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {(["bg", "surface", "text", "accent", "accent2"] as const).map((k) => (
                      <span key={k} title={`${k}: ${theme.colors[k]}`} className="h-4 w-8" style={{ background: theme.colors[k], boxShadow: "inset 0 0 0 1px rgba(30,35,45,.12)" }} />
                    ))}
                  </div>
                  <Scaled width={1024}>
                    <Screen plan={shown.plan} theme={theme} brief={shown.query} />
                  </Scaled>
                  <div className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {shown.matches[i]?.traits.join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
