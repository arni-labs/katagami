"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { submitFeedback, type FeedbackAnswers } from "./actions";

interface Option {
  key: string;
  title: string;
}

interface Step {
  id: "persona" | "usefulness" | "found" | "wantNext" | "return" | "comments";
  question: string;
  note?: string;
  multi?: boolean;
  maxPicks?: number;
  options?: Option[];
  otherKey?: string;
  freeText?: boolean;
  optional?: boolean;
}

const INKS = ["sakura", "yuzu", "ramune", "matcha", "teal"] as const;
const ADVANCE_MS = 340;

const STEPS: Step[] = [
  {
    id: "persona",
    question: "What brings you here?",
    options: [
      { key: "developer_specs", title: "Developer: specs for my coding agent" },
      { key: "designer_research", title: "Designer: researching styles and movements" },
      { key: "founder_looks", title: "Founder / PM: the product needs to look good" },
      { key: "curious", title: "Curious: just looking" },
    ],
  },
  {
    id: "usefulness",
    question: "What would make a language more useful?",
    note: "up to 3",
    multi: true,
    maxPicks: 3,
    otherKey: "other",
    options: [
      { key: "more_variety", title: "More variety" },
      { key: "more_export_formats", title: "More exports" },
      { key: "better_search", title: "Better search" },
      { key: "other", title: "Something else" },
    ],
  },
  {
    id: "found",
    question: "Did you find one you'd actually use?",
    options: [
      { key: "found_exact", title: "Exactly my taste" },
      { key: "found_close", title: "Close" },
      { key: "none_fit_quality_good", title: "Nothing fit. Quality was good." },
      { key: "none_fit_quality_poor", title: "Nothing fit. Quality wasn't there." },
      { key: "did_not_browse", title: "Too soon to say" },
    ],
  },
  {
    id: "wantNext",
    question: "What do you want next?",
    options: [
      { key: "writing_styles", title: "Writing styles" },
      { key: "submit_own", title: "Submit my own design language" },
    ],
  },
  {
    id: "return",
    question: "Would you come back?",
    options: [
      { key: "definitely", title: "Yes" },
      { key: "probably", title: "If it grows" },
      { key: "maybe", title: "If it gets better" },
      { key: "unlikely", title: "Probably not" },
    ],
  },
  {
    id: "comments",
    question: "Anything else?",
    note: "optional",
    freeText: true,
    optional: true,
  },
];

export function FeedbackQuestionnaire({ source }: { source: string }) {
  const [step, setStep] = useState(0);
  const [singles, setSingles] = useState<Record<string, string>>({});
  const [multis, setMultis] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState("");
  const [comments, setComments] = useState("");
  const [state, setState] = useState<"editing" | "sending" | "done" | "error">(
    "editing",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const toggleMulti = (stepId: string, key: string, max?: number) => {
    setMultis((prev) => {
      const cur = prev[stepId] ?? [];
      if (cur.includes(key)) return { ...prev, [stepId]: cur.filter((k) => k !== key) };
      if (max && cur.length >= max) return prev;
      return { ...prev, [stepId]: [...cur, key] };
    });
  };

  const go = (n: number) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    setStep(n);
    setErrorMsg("");
    setState("editing");
  };

  const pickSingle = (stepId: string, key: string) => {
    setSingles((prev) => ({ ...prev, [stepId]: key }));
    if (last) return;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    advanceTimer.current = window.setTimeout(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      reduced ? 0 : ADVANCE_MS,
    );
  };

  const stepAnswered = (s: Step) =>
    Boolean(
      s.optional ||
        (s.multi ? (multis[s.id] ?? []).length > 0 : s.id in singles),
    );

  const submit = async () => {
    const missing = STEPS.findIndex((s) => !stepAnswered(s));
    if (missing !== -1) {
      go(missing);
      setErrorMsg("This one still needs an answer.");
      setState("error");
      return;
    }
    setState("sending");
    const answers: FeedbackAnswers = {
      persona: singles.persona,
      usefulness: multis.usefulness,
      usefulnessOther: otherText,
      foundLanguage: singles.found,
      wantNext: singles.wantNext ? [singles.wantNext] : [],
      returnIntent: singles.return,
      comments,
      source,
    };
    const res = await submitFeedback(answers);
    if (res.ok) {
      setState("done");
    } else {
      setErrorMsg(res.error ?? "Something went wrong.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="sticker-card mx-auto max-w-xl px-6 py-14 text-center sm:px-10">
        <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em]">
          Thank you.
        </p>
        <Link
          href="/"
          className="ink-underline mt-10 inline-block font-mono text-[12px] font-bold uppercase tracking-[0.18em]"
        >
          Back to the gallery
        </Link>
      </div>
    );
  }

  const answered = stepAnswered(current);
  const needsNext = Boolean(current.multi || current.freeText);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className="h-2 w-2"
              style={{
                background:
                  i < step
                    ? "var(--foreground)"
                    : i === step
                      ? "var(--sakura)"
                      : "var(--muted)",
              }}
            />
          ))}
        </div>
      </div>

      <div
        key={current.id}
        className="riso-reveal relative mt-10"
        style={{ ["--reveal-i" as string]: 0 }}
      >
        <h2 className="font-display text-[28px] font-semibold leading-snug tracking-[-0.02em] sm:text-[34px]">
          {current.question}
          {current.note ? (
            <span className="ml-3 align-middle font-mono text-[11px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
              {current.note}
            </span>
          ) : null}
        </h2>

        <div className="mt-8 flex flex-col gap-3">
          {current.options?.map((o, i) => {
            const on = current.multi
              ? (multis[current.id] ?? []).includes(o.key)
              : singles[current.id] === o.key;
            const ink = INKS[i % INKS.length];
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  current.multi
                    ? toggleMulti(current.id, o.key, current.maxPicks)
                    : pickSingle(current.id, o.key)
                }
                className="feedback-pick sticker-card group w-full px-5 py-5 text-left"
                style={
                  {
                    ["--card-ink" as string]: `var(--${ink})`,
                    ["--reveal-i" as string]: i + 1,
                  } as CSSProperties
                }
              >
                <span className="relative z-[1] flex items-baseline gap-4">
                  <span className="feedback-pick-n font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">
                    {o.title}
                  </span>
                </span>
              </button>
            );
          })}

          {current.otherKey &&
          (multis[current.id] ?? []).includes(current.otherKey) ? (
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="One line"
              maxLength={2000}
              className="sticker-card w-full px-5 py-4 text-[17px] outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          ) : null}

          {current.freeText ? (
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Anything."
              rows={5}
              maxLength={2000}
              className="sticker-card w-full resize-none px-5 py-5 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />
          ) : null}
        </div>
      </div>

      {state === "error" ? (
        <p className="mt-6 text-[15px] text-[var(--beni)]">{errorMsg}</p>
      ) : null}

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(Math.max(0, step - 1))}
          disabled={step === 0}
          className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
        >
          Back
        </button>
        {last ? (
          <button
            type="button"
            onClick={submit}
            disabled={state === "sending"}
            className="cursor-pointer bg-foreground px-8 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Send it"}
          </button>
        ) : needsNext ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            disabled={!answered}
            className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] transition-colors hover:text-[var(--sakura)] disabled:cursor-default disabled:text-muted-foreground/50 disabled:hover:text-muted-foreground/50"
          >
            Next
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
