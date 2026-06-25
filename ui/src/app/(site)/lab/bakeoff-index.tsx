import Link from "next/link";
import type { BakeoffRoundSummary } from "@/lib/bakeoff";

// The rounds index for the model bake-off. Each round is one Direction (a
// reimagine brief) with its submitted Katagami languages; click through to play
// the guess-the-model game over that round's entries.
export function BakeoffIndex({ rounds }: { rounds: BakeoffRoundSummary[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--sakura)]">
        Katagami · the lab
      </p>
      <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">
        Model bake-offs
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        Each round hands one design language to every model and asks it to
        reimagine — its own art style, palette and language. Play blind: guess
        which model made each. Unlisted — share the link directly.
      </p>

      {rounds.length === 0 ? (
        <div
          className="mt-10 rounded-[16px] bg-card p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            No rounds with submissions yet. Start one from a design language link;
            each model&rsquo;s entry appears here as it submits.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/lab/${r.id}`}
              className="group flex flex-col gap-3 rounded-[16px] bg-card p-6 transition-transform hover:-translate-y-[2px]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex flex-wrap items-center gap-3">
                {r.roundLabel && (
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ramune)]">
                    {r.roundLabel}
                  </span>
                )}
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {r.modelCount} {r.modelCount === 1 ? "model" : "models"}
                  {r.status === "Closed" ? " · judged" : ""}
                </span>
              </div>
              <span className="font-display text-2xl font-bold tracking-[-0.02em] group-hover:text-[var(--ramune)]">
                {r.title}
              </span>
              {r.sourceName && (
                <span className="text-[14px] text-muted-foreground">
                  Reimagining{" "}
                  <span className="font-medium text-foreground">
                    {r.sourceName}
                  </span>
                </span>
              )}
              {r.brief && (
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {r.brief.length > 220 ? `${r.brief.slice(0, 220)}…` : r.brief}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
