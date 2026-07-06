import Link from "next/link";
import { rejectSubmission } from "./review-actions";

// Owner-only curator strip (ARN-154): one compact row per queued item with
// reject-with-feedback. Accepting stays with the existing publish path —
// quality review and public assets belong to the pipeline, not a button.

export type QueueItem = {
  kind: "language" | "palette" | "art_style";
  id: string;
  name: string;
  creatorEmail: string;
  href: string;
};

const KIND_LABEL = { language: "language", palette: "palette", art_style: "art style" } as const;

export default function ReviewQueuePanel({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16 space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-[24px] font-bold leading-none tracking-[-0.02em]">
          Curator actions
        </h2>
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          reject returns the item to Draft with your notes; the contributor
          reads them via submission_status
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <article
            key={`${item.kind}-${item.id}`}
            className="flex flex-col gap-3 bg-background/70 px-4 py-3.5 lg:flex-row lg:items-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="min-w-0 lg:w-72 lg:shrink-0">
              <p className="truncate text-[14px] font-medium text-foreground">
                {item.name || "(unnamed)"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {KIND_LABEL[item.kind]}
                {item.creatorEmail ? ` · by ${item.creatorEmail}` : ""}
              </p>
            </div>
            <form
              action={rejectSubmission}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
            >
              <input type="hidden" name="kind" value={item.kind} />
              <input type="hidden" name="id" value={item.id} />
              <input
                type="text"
                name="notes"
                placeholder="Feedback for the contributor…"
                className="min-w-0 flex-1 bg-secondary/60 px-3.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground/70"
                maxLength={2000}
              />
              <button
                type="submit"
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-destructive transition-colors hover:text-foreground"
              >
                reject → draft
              </button>
              <Link
                href={item.href}
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                preview →
              </Link>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
