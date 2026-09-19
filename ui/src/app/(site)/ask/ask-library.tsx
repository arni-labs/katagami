"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";

type Card = {
  kind: "language" | "art_style";
  id: string;
  name: string;
  url: string;
  thumbnail_url: string | null;
  traits: string[];
  fit: number | null;
  medium?: string;
};
type Concept = { id: string; name: string; description: string; made: number; relevance: number };
type Concepts = { considered: number; made: Concept[]; unmade: Concept[] };
type Answer = {
  query: string;
  tier: "full" | "sample";
  considered: number;
  wants: string[];
  avoids: string[];
  results: Card[];
  strange: Card[];
  note: string;
  provisional?: boolean;
  want?: Record<string, number>;
};

const EXAMPLES = [
  "A booking app for a small island ferry route",
  "A compliance dashboard for a bank's audit team",
  "A zine-like site for an underground music label",
];
const FIT_WORD = (fit: number | null, judging: boolean) => (fit === null ? (judging ? "Judging fit…" : "Matched by traits") : fit >= 0.8 ? "Strong fit" : fit >= 0.5 ? "Could work" : "A stretch");
const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

function hrefOf(card: Card) {
  return `/${card.kind === "language" ? "language" : "art-styles"}/${card.id}`;
}

function ResultCard({ card, judging }: { card: Card; judging: boolean }) {
  return (
    <Link href={hrefOf(card)} className="sticker-card group/card flex h-full flex-col overflow-hidden">
      <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16 / 10" }}>
        {card.thumbnail_url ? (
          <GalleryImage
            src={card.thumbnail_url}
            alt={`${card.name} preview`}
            sizes={CARD_SIZES}
            className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03] motion-reduce:transition-none"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-[18px] font-bold leading-tight tracking-[-0.02em]">{card.name}</h3>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {card.kind === "language" ? "Language" : card.medium || "Art style"}
          </span>
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">{FIT_WORD(card.fit, judging)}</p>
        {card.traits.length > 0 ? (
          <p className="text-[14.5px] leading-snug text-muted-foreground">{card.traits.join(" · ")}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function AskLibrary() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [concepts, setConcepts] = useState<Concepts | null>(null);
  const [owner, setOwner] = useState(false);
  // The encyclopedia is the owner's for now: everyone sees the directions, only the owner can open one.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setOwner(Boolean(me?.owner)))
      .catch(() => undefined);
  }, []);
  const latest = useRef(0);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 8) {
      setState("error");
      setError("Give it a full sentence — what it is and who it is for.");
      return;
    }
    const turn = ++latest.current;
    setState("asking");
    setError("");
    setConcepts(null);
    // The encyclopedia is asked alongside the library, not after it; its answer
    // lands when it lands and never holds the styles up.
    void fetch(`/api/ask?${new URLSearchParams({ q, stage: "concepts" })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (turn === latest.current && body) setConcepts(body as Concepts); })
      .catch(() => undefined);
    try {
      // Two steps, so something is on screen after the first model call: the
      // match by style DNA, then the same list re-judged for fit.
      const params = new URLSearchParams({ q, k: "8", stage: "match" });
      const first = await fetch(`/api/ask?${params}`);
      const matched = await first.json().catch(() => null);
      if (turn !== latest.current) return;
      if (!first.ok || !matched) throw new Error(matched?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(matched as Answer);
      if (matched.results.length === 0) {
        setState("idle");
        return;
      }
      const second = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, k: 8, want: matched.want }),
      });
      const body = await second.json().catch(() => null);
      if (turn !== latest.current) return;
      if (!second.ok || !body) throw new Error(body?.error ?? "Asking failed. Try again in a moment.");
      setAnswer(body as Answer);
      setState("idle");
    } catch (err) {
      if (turn !== latest.current) return;
      setState("error");
      setError(err instanceof Error ? err.message : "Asking failed.");
    }
  }

  return (
    <div className="mt-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(query);
        }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <label htmlFor="ask-q" className="sr-only">
          What are you making?
        </label>
        <input
          id="ask-q"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you making, and for whom?"
          maxLength={400}
          className="sticker-card min-w-0 flex-1 px-5 py-4 text-[17px] outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]"
        />
        <button
          type="submit"
          disabled={state === "asking"}
          className="cursor-pointer bg-foreground px-8 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50"
        >
          {state === "asking" ? "Reading…" : "Ask"}
        </button>
      </form>

      {!answer && state !== "asking" ? (
        <div className="mt-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Try one</p>
          <ul className="mt-4 flex flex-col items-start gap-3">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    void ask(ex);
                  }}
                  className="ink-underline cursor-pointer text-left text-[17px]"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state === "error" ? (
        <p role="alert" className="mt-8 text-[17px] text-[var(--beni)]">
          {error}
        </p>
      ) : null}

      <div aria-live="polite" aria-busy={state === "asking"} className={state === "asking" && !answer?.provisional ? "opacity-50 transition-opacity motion-reduce:transition-none" : ""}>
        {answer ? (
          <>
            <section className="mt-14">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Read as · {answer.considered} styles considered
              </p>
              <p className="mt-3 max-w-3xl text-[17px] leading-relaxed">
                {answer.wants.length > 0 ? <>Wants <strong>{answer.wants.join(", ")}</strong>. </> : null}
                {answer.avoids.length > 0 ? <>Steers away from {answer.avoids.join(", ")}.</> : null}
              </p>
            </section>

            <section className="mt-12">
              <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">The fit</h2>
              {answer.results.length === 0 ? (
                <p className="mt-4 text-[17px] text-muted-foreground">Nothing in view fits that yet.</p>
              ) : (
                <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {answer.results.map((card) => (
                    <li key={card.id}>
                      <ResultCard card={card} judging={state === "asking"} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {answer.strange.length > 0 ? (
              <section className="mt-16">
                <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">Strange, and it still fits</h2>
                <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                  The styles least like the rest of the library that were still judged a fit. You would not have searched for these.
                </p>
                <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {answer.strange.map((card) => (
                    <li key={card.id}>
                      <ResultCard card={card} judging={state === "asking"} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {concepts && concepts.made.length + concepts.unmade.length > 0 ? (
              <section className="mt-16">
                <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">From the encyclopedia</h2>
                <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                  Named directions a designer might reach for here, out of {concepts.considered} in the encyclopedia — including ones nobody has made a language for yet.
                </p>
                <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-2">
                  {([["Nothing made yet", concepts.unmade], ["With work in the library", concepts.made]] as const).map(([title, list]) =>
                    list.length > 0 ? (
                      <div key={title}>
                        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
                        <ul className="mt-4 flex flex-col gap-5">
                          {list.map((c) => (
                            <li key={c.id}>
                              {owner ? (
                                <Link href={`/encyclopedia?cell=${encodeURIComponent(c.id)}`} className="ink-underline font-display text-[18px] font-bold tracking-[-0.02em]">{c.name}</Link>
                              ) : (
                                <span className="font-display text-[18px] font-bold tracking-[-0.02em]">{c.name}</span>
                              )}
                              <p className="mt-1 max-w-xl text-[14.5px] leading-snug text-muted-foreground">{c.description}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              </section>
            ) : null}

            <p className="mt-12 text-[14.5px] text-muted-foreground">
              {answer.note}{" "}
              {answer.tier === "sample" ? (
                <Link href="/signin" className="ink-underline text-foreground">
                  Sign in
                </Link>
              ) : null}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
