"use client";

import { useState } from "react";
import Link from "next/link";
import { submitFeedback, type FeedbackAnswers } from "./actions";

// ARN-330: one question per view, tap-only options. Q1–Q5 are required —
// Next stays disabled until the step is answered, and submit() re-walks the
// steps in case Back navigation un-answered one. Only the final free-form
// question is optional. Option KEYS are the stored contract (see actions.ts);
// labels are free to evolve. Q3 (found_language) is the north-star metric.

interface Option {
  key: string;
  label: string;
}

interface Step {
  id: "persona" | "usefulness" | "found" | "wantNext" | "return" | "comments";
  eyebrow: string;
  question: string;
  note?: string;
  multi?: boolean;
  maxPicks?: number;
  options?: Option[];
  otherKey?: string;
  freeText?: boolean;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    id: "persona",
    eyebrow: "about you",
    question: "Which best describes you and what brought you here?",
    options: [
      { key: "developer_specs", label: "Developer — I want specs I can hand to my coding agent" },
      { key: "designer_research", label: "Designer — researching styles, movements, and vocabulary" },
      { key: "founder_looks", label: "Founder / PM — I need my product to look good without a design team" },
      { key: "curious", label: "Curious — here to see what agent-curated design looks like" },
    ],
  },
  {
    id: "usefulness",
    eyebrow: "usefulness",
    question: "What would make a design language more useful to you?",
    note: "pick up to 3",
    multi: true,
    maxPicks: 3,
    otherKey: "other",
    options: [
      { key: "more_variety", label: "More variety of movements and styles" },
      { key: "more_export_formats", label: "More export formats — Tailwind config, CSS variables" },
      { key: "better_search", label: "Better search and filtering by mood or industry" },
      { key: "other", label: "Other" },
    ],
  },
  {
    id: "found",
    eyebrow: "the library",
    question: "Did you find a design language you’d actually use?",
    options: [
      { key: "found_exact", label: "Yes — found exactly my taste" },
      { key: "found_close", label: "Found something close, not quite right" },
      { key: "none_fit_quality_good", label: "Nothing fit, but the quality was good" },
      { key: "none_fit_quality_poor", label: "Nothing fit, and quality wasn’t there" },
      { key: "did_not_browse", label: "Didn’t browse long enough to tell" },
    ],
  },
  {
    id: "wantNext",
    eyebrow: "what’s next",
    question: "Which of these would you want next?",
    multi: true,
    options: [
      { key: "writing_styles", label: "Writing styles" },
      { key: "submit_own", label: "Submitting my own design language" },
    ],
  },
  {
    id: "return",
    eyebrow: "coming back",
    question: "Would you come back to Katagami for your next project?",
    options: [
      { key: "definitely", label: "Definitely — bookmarked" },
      { key: "probably", label: "Probably, if the library grows" },
      { key: "maybe", label: "Maybe — depends on quality improving" },
      { key: "unlikely", label: "Unlikely" },
    ],
  },
  {
    id: "comments",
    eyebrow: "last thing",
    question: "Anything else?",
    note: "optional",
    freeText: true,
    optional: true,
  },
];

const CHIP_BASE =
  "cursor-pointer rounded-[16px] px-5 py-3.5 text-left text-[17px] leading-snug transition-colors motion-reduce:transition-none";
const CHIP_OFF = "bg-muted hover:bg-muted/70 text-foreground";
const CHIP_ON = "bg-foreground text-background";

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

  const advance = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const pickSingle = (stepId: string, key: string) => {
    setSingles((prev) => ({ ...prev, [stepId]: key }));
    // Single-select answers advance on tap — one decision per screen.
    if (!last) advance();
  };

  const stepAnswered = (s: Step) =>
    Boolean(
      s.optional ||
        (s.multi ? (multis[s.id] ?? []).length > 0 : s.id in singles),
    );

  const submit = async () => {
    // Back navigation lets an earlier multi-select be un-answered after the
    // user already advanced past it — re-walk the steps before sending.
    const missing = STEPS.findIndex((s) => !stepAnswered(s));
    if (missing !== -1) {
      setStep(missing);
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
      wantNext: multis.wantNext,
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
      <div className="mx-auto max-w-xl pt-10 text-center">
        <p className="font-display text-3xl font-semibold tracking-[-0.02em]">
          Thank you.
        </p>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Every answer feeds the library — the styles people vote for are what
          the agents research next.
        </p>
        <Link
          href="/"
          className="ink-underline mt-8 inline-block font-mono text-[12px] font-bold uppercase tracking-[0.18em]"
        >
          Back to the gallery
        </Link>
      </div>
    );
  }

  const answered = stepAnswered(current);

  return (
    <div className="mx-auto max-w-xl">
      {/* progress */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className="h-2 w-2 rounded-full"
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

      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--sakura)]">
        {current.eyebrow}
        {current.note ? (
          <span className="ml-2 text-muted-foreground">· {current.note}</span>
        ) : null}
      </p>
      <h2 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-[-0.02em] sm:text-3xl">
        {current.question}
      </h2>

      <div className="mt-8 flex flex-col gap-3">
        {current.options?.map((o) => {
          const on = current.multi
            ? (multis[current.id] ?? []).includes(o.key)
            : singles[current.id] === o.key;
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
              className={`${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`}
            >
              {o.label}
            </button>
          );
        })}

        {current.otherKey &&
        (multis[current.id] ?? []).includes(current.otherKey) ? (
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Tell us what — one line is plenty"
            maxLength={2000}
            className="rounded-[16px] bg-muted px-5 py-3.5 text-[17px] outline-none placeholder:text-muted-foreground focus:bg-muted/70"
          />
        ) : null}

        {current.freeText ? (
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Impressions, gripes, wishes — anything"
            rows={4}
            maxLength={2000}
            className="rounded-[16px] bg-muted px-5 py-4 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground focus:bg-muted/70"
          />
        ) : null}
      </div>

      {state === "error" ? (
        <p className="mt-6 text-[15px] text-[var(--beni)]">{errorMsg}</p>
      ) : null}

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
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
            className="cursor-pointer rounded-full bg-foreground px-8 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background transition-transform hover:-translate-y-[1px] motion-reduce:transition-none disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Send feedback"}
          </button>
        ) : (
          <button
            type="button"
            onClick={advance}
            disabled={!answered}
            className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] transition-colors hover:text-[var(--sakura)] disabled:cursor-default disabled:text-muted-foreground/50 disabled:hover:text-muted-foreground/50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
