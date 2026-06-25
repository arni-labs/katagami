import Link from "next/link";
import type { BakeoffModelEntry, BakeoffRoundSummary } from "@/lib/bakeoff";

// The rounds index for the model bake-off. Each round is one Direction (a
// reimagine brief) with its submitted Katagami languages; click through to play
// the guess-the-model game over that round's entries. Katagami house style:
// sharp sticker-cards, the trio ink strip, the source language as the visual.
// `models` powers "browse by model" — everything one model made, across rounds.
export function BakeoffIndex({
  rounds,
  models,
}: {
  rounds: BakeoffRoundSummary[];
  models: BakeoffModelEntry[];
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--sakura)]">
        Katagami · the lab
      </p>
      <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">
        Model bake-offs
      </h1>

      {models.length > 0 && (
        <section className="mt-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Browse by model
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {models.map((m) => (
              <Link
                key={m.slug}
                href={`/model-bake-off/model/${m.slug}`}
                className="group inline-flex items-baseline gap-2 bg-card px-3.5 py-2 shadow-[0_1px_0_#1e232d1f] transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="font-display text-[15px] font-bold tracking-[-0.01em]">
                  {m.name}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground group-hover:text-background/70">
                  {m.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rounds.length === 0 ? (
        <div
          className="sticker-card mt-10 p-8"
          style={{ ["--card-ink" as string]: "var(--ramune)" }}
        >
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            No rounds with submissions yet. Start one from a design language link;
            each model&rsquo;s entry appears here as it submits.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-7 sm:grid-cols-2">
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/lab/${r.id}`}
              className="sticker-card group relative flex flex-col overflow-hidden"
            >
              {/* the source language being reimagined, as the visual */}
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "16 / 10" }}
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 z-10 flex h-[5px]"
                >
                  <span className="h-full flex-1" style={{ background: "var(--sakura)" }} />
                  <span className="h-full flex-1" style={{ background: "var(--yuzu)" }} />
                  <span className="h-full flex-1" style={{ background: "var(--ramune)" }} />
                </div>
                {r.sourceThumb ? (
                  <div
                    className="absolute inset-0 bg-cover bg-top"
                    style={{ backgroundImage: `url(${r.sourceThumb})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}
                {r.sourceName && (
                  <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 bg-background/92 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-foreground shadow-[0_1px_0_#1e232d1f]">
                    <span className="text-muted-foreground">based on</span>
                    {r.sourceName}
                  </span>
                )}
              </div>

              {/* footer meta */}
              <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {r.modelCount} {r.modelCount === 1 ? "model" : "models"}
                  {r.status === "Closed" ? " · judged" : ""}
                </span>
                <h3 className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground group-hover:text-[var(--ramune)]">
                  {r.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
