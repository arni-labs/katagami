import Link from "next/link";
import { COMPARISONS } from "./comparisons";

// Unlisted on purpose — not added to header-nav, mobile-nav, or the search index.
// Reachable only by URL.

export default function LabIndex() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--sakura)]">
        Katagami · the lab
      </p>
      <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">
        Model bake-offs
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Blind, side-by-side comparisons of how different models tackle the Katagami
        loop. Unlisted — share the link directly.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <Link
            key={c.slug}
            href={`/lab/${c.slug}`}
            className="group flex flex-col gap-3 rounded-[4px] bg-card p-6 transition-transform hover:-translate-y-[2px]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {Object.keys(c.models).length} models · {c.judged ? "judged" : "unjudged"}
            </span>
            <span className="font-display text-2xl font-bold tracking-[-0.02em] group-hover:text-[var(--ramune)]">
              {c.title}
            </span>
            <span className="text-sm leading-relaxed text-muted-foreground">
              {c.blurb}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
