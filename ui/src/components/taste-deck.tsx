"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

export interface DeckEntry {
  id: string;
  name: string;
  href: string;
  summary?: string;
  tags: string[];
  hue: string;
  /** primary, secondary, accent, background, text — whatever exists */
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  headingFont?: string;
  thumb?: string;
}

/**
 * Taste deck — for the browser who has no idea what they're looking for.
 * The press deals one sheet at a time; "more like this" and "not for me"
 * tune a session-local weight over tags + hue, and the next deal homes in.
 * No accounts, no tracking — the weights die with the page.
 */
export function TasteDeck({ entries }: { entries: DeckEntry[] }) {
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [weights, setWeights] = useState<Map<string, number>>(() => new Map());
  const [dealCount, setDealCount] = useState(0);

  const entry = entries[current];

  const keysFor = useCallback((e: DeckEntry) => {
    const keys = e.tags.filter((t) => t !== "specimen").map((t) => `tag:${t}`);
    keys.push(`hue:${e.hue}`);
    return keys;
  }, []);

  const deal = useCallback(
    (nextWeights: Map<string, number>, nextSeen: Set<number>) => {
      let pool = entries
        .map((e, i) => ({ e, i }))
        .filter(({ i }) => !nextSeen.has(i));
      if (pool.length === 0) {
        nextSeen = new Set();
        pool = entries.map((e, i) => ({ e, i })).filter(({ i }) => i !== current);
      }
      const scored = pool
        .map(({ e, i }) => {
          let score = Math.random() * 1.2; // exploration jitter
          for (const key of keysFor(e)) score += nextWeights.get(key) ?? 0;
          return { i, score };
        })
        .sort((a, b) => b.score - a.score);
      // weighted pick among the top few keeps it surprising
      const top = scored.slice(0, 4);
      const pick = top[Math.floor(Math.random() * top.length)] ?? scored[0];
      nextSeen.add(pick.i);
      setSeen(new Set(nextSeen));
      setWeights(new Map(nextWeights));
      setCurrent(pick.i);
      setDealCount((c) => c + 1);
    },
    [entries, current, keysFor],
  );

  const like = useCallback(() => {
    if (!entry) return;
    const next = new Map(weights);
    for (const key of keysFor(entry)) next.set(key, (next.get(key) ?? 0) + 2);
    deal(next, new Set(seen));
  }, [entry, weights, seen, deal, keysFor]);

  const skip = useCallback(() => {
    if (!entry) return;
    const next = new Map(weights);
    for (const key of keysFor(entry)) next.set(key, (next.get(key) ?? 0) - 0.6);
    deal(next, new Set(seen));
  }, [entry, weights, seen, deal, keysFor]);

  // The two strongest positive signals, surfaced so the magic is legible.
  const homingIn = useMemo(() => {
    return Array.from(weights.entries())
      .filter(([k, v]) => v > 1 && k.startsWith("tag:"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k.slice(4));
  }, [weights]);

  if (!entry) return null;

  const c = entry.colors;
  const paper = c.background ?? "var(--paper-tape-mix)";
  const ink = c.text ?? "var(--sumi)";
  const primary = c.primary ?? "var(--ramune)";
  const secondary = c.secondary ?? primary;
  const accent = c.accent ?? secondary;
  const swatch = [c.primary, c.secondary, c.accent, c.background].filter(
    (x): x is string => Boolean(x),
  );

  return (
    <section aria-label="Taste finder" className="relative">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <span className="relative shrink-0">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-1.5 h-[11px] w-[calc(100%+16px)] opacity-70"
            style={{
              background: "var(--sakura)",
              mixBlendMode: "var(--ink-blend)" as never,
              transform: "rotate(-2deg) skewX(-8deg)",
            }}
          />
          <span className="stamp relative" style={{ color: "var(--sakura)" }}>
            taste finder
          </span>
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          Deal yourself in
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          react to a few sheets — the deck homes in
        </span>
      </div>

      <div
        key={entry.id}
        className="deck-deal relative flex flex-col gap-0 bg-card/90 sm:flex-row"
        style={{
          boxShadow: `0 1px 2px rgba(33,33,60,0.04), 6px 7px 0 color-mix(in srgb, ${primary} 22%, transparent)`,
        }}
      >
        <span
          aria-hidden
          className="washi-tape -top-2 left-8"
          style={{ ["--strip-ink" as string]: "var(--yuzu)", transform: "rotate(-4deg) skewX(-8deg)" }}
        />

        {/* the sheet — thumbnail if it exists, else a proof printed from
            the language's own inks */}
        <div className="relative w-full shrink-0 overflow-hidden sm:w-[360px]">
          <div className="relative h-full min-h-[200px] w-full" style={{ background: paper }}>
            {entry.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.thumb}
                alt={`${entry.name} preview`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div
                  aria-hidden
                  className="absolute -left-2 -right-2 top-0 h-[52%]"
                  style={{ background: primary, transform: "rotate(-1deg)", transformOrigin: "left bottom" }}
                />
                <div
                  aria-hidden
                  className="absolute right-[12%] top-[16%] aspect-square w-[46%] rounded-full opacity-80"
                  style={{ background: secondary, mixBlendMode: "multiply" }}
                />
                <div
                  aria-hidden
                  className="absolute bottom-0 left-0 right-0 h-[40%] opacity-60"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, ${accent} 1.7px, transparent 0)`,
                    backgroundSize: "9px 9px",
                    maskImage: "linear-gradient(180deg, transparent, black 70%)",
                    WebkitMaskImage: "linear-gradient(180deg, transparent, black 70%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute bottom-3 left-4 font-display text-[40px] font-black leading-none"
                  style={{ color: ink, fontFamily: entry.headingFont || undefined }}
                >
                  Aa
                </span>
              </>
            )}
          </div>
        </div>

        {/* the reading */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h3 className="min-w-0 flex-1 truncate font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">
              {entry.name}
            </h3>
            <span aria-hidden className="flex shrink-0 gap-[3px]">
              {swatch.slice(0, 4).map((color, i) => (
                <span key={i} className="h-3.5 w-3.5" style={{ background: color }} />
              ))}
            </span>
          </div>
          {entry.summary ? (
            <p className="line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
              {entry.summary}
            </p>
          ) : null}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags
                .filter((t) => t !== "specimen")
                .slice(0, 5)
                .map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/75"
                    style={{
                      background:
                        "color-mix(in srgb, var(--ramune) 10%, var(--paper-stamp-mix))",
                    }}
                  >
                    {t}
                  </span>
                ))}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={like}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground transition-all hover:-translate-y-[1px] hover:rotate-[-1deg]"
              style={{
                background:
                  "color-mix(in srgb, var(--sakura) 20%, var(--paper-stamp-mix))",
                boxShadow:
                  "3px 3px 0 color-mix(in srgb, var(--sakura) 28%, transparent)",
              }}
            >
              ♥ more like this
            </button>
            <button
              type="button"
              onClick={skip}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/75 transition-all hover:-translate-y-[1px] hover:text-foreground"
              style={{
                background:
                  "color-mix(in srgb, var(--sumi) 8%, var(--paper-stamp-mix))",
              }}
            >
              ↯ not for me
            </button>
            <Link
              href={entry.href}
              prefetch={false}
              className="inline-flex items-center gap-1.5 bg-foreground px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-background transition-all hover:-translate-y-[1px]"
              style={{
                boxShadow:
                  "3px 3px 0 color-mix(in srgb, var(--ramune) 32%, transparent)",
              }}
            >
              open this sheet →
            </Link>
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {homingIn.length > 0
                ? `homing in: ${homingIn.join(" · ")}`
                : dealCount > 0
                  ? `${dealCount} dealt`
                  : "fresh deck"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
