"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PreviewFrame,
  Segmented,
  VIEW_LABEL,
} from "@/app/(site)/lab/lab-comparison";
import type { LabView } from "@/app/(site)/lab/comparisons";
import type { BakeoffModelSubmission } from "@/lib/bakeoff";

const VIEW_ORDER: LabView[] = [
  "landing",
  "dashboard",
  "embodiment",
  "immersive",
];

// Everything one model made, with a single view toggle over the whole grid —
// the same landing/dashboard/embodiment switch the round view (grouped by design
// language) has, so you can flip surfaces without opening each language's detail.
export function ModelSubmissions({
  submissions,
}: {
  submissions: BakeoffModelSubmission[];
}) {
  // The views on offer are the union across every submission, in canonical order.
  const present = new Set<LabView>();
  for (const s of submissions)
    (s.model.views ?? []).forEach((v) => present.add(v));
  const views = VIEW_ORDER.filter((v) => present.has(v));

  const [view, setView] = useState<LabView>(
    views.includes("landing") ? "landing" : (views[0] ?? "landing"),
  );
  const activeView = views.includes(view) ? view : (views[0] ?? "landing");

  return (
    <>
      {views.length > 1 ? (
        <div className="sticky top-0 z-20 -mx-4 mt-8 bg-background/85 px-4 py-3 backdrop-blur-sm">
          <Segmented
            options={views.map((v) => ({ key: v, label: VIEW_LABEL[v] }))}
            value={activeView}
            onChange={(v) => setView(v as LabView)}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2">
        {submissions.map((s) => (
          <SubmissionCard
            key={s.model.languageId ?? s.roundId}
            submission={s}
            view={activeView}
          />
        ))}
      </div>
    </>
  );
}

function SubmissionCard({
  submission,
  view,
}: {
  submission: BakeoffModelSubmission;
  view: LabView;
}) {
  const m = submission.model;
  // Show the selected surface when this design has it; otherwise fall back to the
  // design's own first available view rather than an empty card — most bake-off
  // submissions carry all three, so this only bites the occasional partial one.
  const available = m.views ?? [];
  const shownView = available.includes(view) ? view : available[0];
  const previewUrl = shownView ? m.previews?.[shownView] : undefined;

  const stats = (
    [
      ["cost", m.cost],
      ["total tokens", m.tokens],
      ["time", m.wall],
    ] as [string, string | undefined][]
  ).filter(([, v]) => v);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {previewUrl && shownView ? (
        <div className="flex flex-col gap-2">
          <PreviewFrame
            src={previewUrl}
            title={`${m.languageName} — ${VIEW_LABEL[shownView]}`}
            thumb={m.thumb}
            openHref={previewUrl}
          />
          {shownView !== view ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Showing {VIEW_LABEL[shownView].toLowerCase()} — no{" "}
              {VIEW_LABEL[view].toLowerCase()} for this design.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="sticker-card relative grid aspect-[1440/1024] place-items-center bg-card">
          <p className="font-mono text-[11px] text-muted-foreground">
            no preview
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="font-display text-[19px] font-bold tracking-[-0.02em]">
          {m.languageName}
        </h3>
        {m.status && m.status !== "Published" ? (
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
            {m.status === "UnderReview" ? "under review" : m.status}
          </span>
        ) : null}
      </div>

      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {submission.sourceName ? (
          <>
            reimagining{" "}
            <span className="text-foreground">{submission.sourceName}</span>
          </>
        ) : (
          submission.roundTitle
        )}
      </p>

      {stats.length > 0 ? (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-1.5 pt-0.5">
          {stats.map(([label, v]) => (
            <span key={label} className="inline-flex flex-col">
              <span className="font-display text-[17px] font-black leading-none tracking-[-0.02em] tabular-nums text-foreground">
                {v}
              </span>
              <span className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {label}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
        {m.languageId ? (
          <Link
            href={`/language/${m.languageId}`}
            className="ink-underline text-[var(--ramune)]"
          >
            View language
          </Link>
        ) : null}
        <Link
          href={`/lab/${submission.roundId}`}
          className="ink-underline text-muted-foreground transition-colors hover:text-foreground"
        >
          See the round
        </Link>
      </div>
    </div>
  );
}
