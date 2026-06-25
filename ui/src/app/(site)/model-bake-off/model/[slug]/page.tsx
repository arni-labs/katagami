import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBakeoffModel,
  type BakeoffModelSubmission,
} from "@/lib/bakeoff";
import { PreviewFrame } from "@/app/(site)/lab/lab-comparison";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import type { LabView } from "@/app/(site)/lab/comparisons";

export const revalidate = 60;

const VIEW_ORDER: LabView[] = [
  "landing",
  "dashboard",
  "embodiment",
  "immersive",
];

function primaryPreview(
  previews?: Partial<Record<LabView, string>>,
): { url: string; view: LabView } | null {
  if (!previews) return null;
  for (const v of VIEW_ORDER) {
    const url = previews[v];
    if (url) return { url, view: v };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getBakeoffModel(slug);
  return {
    title: model
      ? `${model.name} — Model Bake Off — Katagami`
      : "Bake-off model — Katagami",
    description: model
      ? `Every design ${model.name} produced across the Katagami model bake-off.`
      : undefined,
  };
}

export default async function BakeoffModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getBakeoffModel(slug);
  if (!model) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <Link
        href="/model-bake-off"
        className="ink-underline inline-block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        All models
      </Link>
      <div className="mt-3">
        <PageHero
          eyebrow="Bake-off · by model"
          eyebrowAccent="ramune"
          title={
            <>
              Everything <Marker color="ramune">{model.name}</Marker> made
            </>
          }
          description={`Every design ${model.name} produced across the bake-off — one per round, each answering a different reimagine brief. Open any to see its full landing, dashboard, and embodiment.`}
          rightSlot={
            <HeroStat value={model.count} label="designs" accent="ramune" />
          }
        />
      </div>

      <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2">
        {model.submissions.map((s) => (
          <SubmissionCard
            key={s.model.languageId ?? s.roundId}
            submission={s}
          />
        ))}
      </div>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: BakeoffModelSubmission }) {
  const m = submission.model;
  const preview = primaryPreview(m.previews);
  const stats = (
    [
      ["cost", m.cost],
      ["total tokens", m.tokens],
      ["time", m.wall],
    ] as [string, string | undefined][]
  ).filter(([, v]) => v);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {preview ? (
        <PreviewFrame
          src={preview.url}
          title={`${m.languageName} — ${preview.view}`}
          thumb={m.thumb}
          openHref={preview.url}
        />
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
