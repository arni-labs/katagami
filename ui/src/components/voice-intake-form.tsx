"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { submitVoiceIntake, type VoiceIntakeResult } from "@/app/(site)/voice/actions";

const FIELD =
  "w-full rounded-[16px] bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))] px-4 py-3 text-[17px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-[var(--matcha)]";
const LABEL = "mb-2 mt-6 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground";

export function VoiceIntakeForm() {
  const router = useRouter();
  const [sampleCount, setSampleCount] = useState(3);
  const [state, formAction, pending] = useActionState(
    async (prev: VoiceIntakeResult, formData: FormData) => {
      const result = await submitVoiceIntake(prev, formData);
      if (result.id) router.push(`/voice/${result.id}`);
      return result;
    },
    {} as VoiceIntakeResult,
  );

  return (
    <form action={formAction} className="sticker-card p-6 sm:p-8">
      <label className={LABEL} htmlFor="intake-name">
        Working name — optional, extraction proposes the real one
      </label>
      <input id="intake-name" name="name" type="text" className={FIELD} placeholder="e.g. Rita's voice" />

      <label className={LABEL} htmlFor="intake-author">
        Who wrote these samples
      </label>
      <input id="intake-author" name="author" type="text" required className={FIELD} placeholder="the author of every sample below" />

      <label className={LABEL} htmlFor="intake-provenance">
        Where they come from
      </label>
      <input
        id="intake-provenance"
        name="provenance"
        type="text"
        required
        className={FIELD}
        placeholder="e.g. personal essays 2023-2026, unpublished drafts, sent emails I wrote"
      />

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Samples — 3 to 20, each in the voice as it actually reads
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{sampleCount}/20</span>
        </div>
        {Array.from({ length: sampleCount }, (_, i) => (
          <textarea
            key={i}
            name="samples"
            rows={6}
            className={`${FIELD} mt-3`}
            placeholder={`sample ${i + 1} — a real piece of writing, ~150+ words gives the bands something to measure`}
          />
        ))}
        <div className="mt-3 flex gap-2">
          {sampleCount < 20 ? (
            <button
              type="button"
              onClick={() => setSampleCount((n) => Math.min(20, n + 1))}
              className="rounded-[9999px] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground"
            >
              Add a sample
            </button>
          ) : null}
          {sampleCount > 3 ? (
            <button
              type="button"
              onClick={() => setSampleCount((n) => Math.max(3, n - 1))}
              className="rounded-[9999px] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Remove last
            </button>
          ) : null}
        </div>
      </div>

      <label className={LABEL} htmlFor="intake-refusals">
        What this voice never does — one per line, optional but it carries most of the taste
      </label>
      <textarea
        id="intake-refusals"
        name="refusals"
        rows={4}
        className={FIELD}
        placeholder={"never opens with a rhetorical question\nnever uses exclamation marks in technical writing"}
      />

      <label className="mt-8 flex items-start gap-3 text-[15px] leading-relaxed text-foreground">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[var(--matcha)]" />
        <span>
          I wrote these samples (or hold their rights) and consent to katagami
          extracting a style contract from them. The corpus stays attributed to
          the author named above; consent basis is recorded as{" "}
          <span className="font-mono text-[13px]">opt_in</span>.
        </span>
      </label>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[9999px] bg-foreground px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Saving the corpus…" : "Start the extraction"}
        </button>
        {state.error ? (
          <span className="text-[14px] text-foreground">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
