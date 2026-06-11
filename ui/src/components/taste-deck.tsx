"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  emptyProfile,
  explainPick,
  featuresFor,
  scoreCandidate,
  withDislike,
  withLike,
  type TasteFeatures,
  type TasteProfile,
} from "@/lib/taste";

export interface DeckEntry {
  id: string;
  name: string;
  href: string;
  /** Edition family — "Art Deco Gilt · Night" and "· Coastal" share one. */
  family: string;
  summary?: string;
  tags: string[];
  hue: string;
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

/** How many recently dealt sheets the redundancy penalty looks back at. */
const RECENT_WINDOW = 4;

/**
 * Taste deck — relevance feedback made tactile. Likes and dislikes move a
 * Rocchio profile through the catalog's visual feature space (see
 * lib/taste.ts); an MMR redundancy penalty guarantees the next deal is
 * never a near-clone of what's already on the table, so every reaction
 * visibly changes what you're shown.
 */
export function TasteDeck({ entries }: { entries: DeckEntry[] }) {
  // Semantic embeddings arrive async from /api/taste/vectors (stored
  // pipeline vectors when present, computed server-side otherwise). The
  // deck works immediately on token features and upgrades when they land.
  const [sems, setSems] = useState<Map<string, number[]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/taste/vectors");
        if (!res.ok) return;
        const data = (await res.json()) as {
          vectors?: Record<string, number[]>;
        };
        if (cancelled || !data.vectors) return;
        setSems(new Map(Object.entries(data.vectors)));
      } catch {
        // semantic layer is an upgrade, not a dependency
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Feature extraction is deterministic — recomputed only when the
  // semantic layer lands.
  const features = useMemo(() => {
    const map = new Map<string, TasteFeatures>();
    for (const e of entries) {
      const f = featuresFor({
        id: e.id,
        family: e.family,
        tags: e.tags,
        colors: e.colors,
        headingFont: e.headingFont,
      });
      const sem = sems?.get(e.id);
      if (sem) f.sem = sem;
      map.set(e.id, f);
    }
    return map;
  }, [entries, sems]);

  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [recent, setRecent] = useState<TasteFeatures[]>([]);
  const [profile, setProfile] = useState<TasteProfile>(emptyProfile);
  const [dealCount, setDealCount] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);

  const entry = entries[current];

  const deal = useCallback(
    (
      nextProfile: TasteProfile,
      opts: { wild?: boolean } = {},
    ) => {
      const currentFeatures = features.get(entries[current]?.id ?? "");
      const nextRecent = currentFeatures
        ? [...recent, currentFeatures].slice(-RECENT_WINDOW)
        : recent;

      let nextSeen = new Set(seen);
      let pool = entries.map((_, i) => i).filter((i) => !nextSeen.has(i));
      if (pool.length === 0) {
        nextSeen = new Set([current]);
        pool = entries.map((_, i) => i).filter((i) => i !== current);
      }

      let pickIdx: number;
      if (opts.wild) {
        pickIdx = pool[Math.floor(Math.random() * pool.length)];
      } else {
        let best = pool[0];
        let bestScore = -Infinity;
        for (const i of pool) {
          const f = features.get(entries[i].id);
          if (!f) continue;
          const s = scoreCandidate(f, nextProfile, nextRecent, Math.random());
          if (s > bestScore) {
            bestScore = s;
            best = i;
          }
        }
        pickIdx = best;
      }

      nextSeen.add(pickIdx);
      const pickedFeatures = features.get(entries[pickIdx].id);
      setSeen(nextSeen);
      setRecent(nextRecent);
      setProfile(nextProfile);
      setCurrent(pickIdx);
      setDealCount((c) => c + 1);
      setReasons(
        opts.wild || !pickedFeatures
          ? []
          : explainPick(pickedFeatures, nextProfile),
      );
    },
    [entries, features, current, recent, seen],
  );

  const like = useCallback(() => {
    const f = features.get(entry?.id ?? "");
    if (!f) return;
    deal(withLike(profile, f));
  }, [entry, features, profile, deal]);

  const skip = useCallback(() => {
    const f = features.get(entry?.id ?? "");
    if (!f) return;
    deal(withDislike(profile, f));
  }, [entry, features, profile, deal]);

  const wild = useCallback(() => {
    deal(profile, { wild: true });
  }, [profile, deal]);

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
  const liked = profile.liked.length;
  const statusLine =
    reasons.length > 0
      ? `why this: ${reasons.join(" · ")}`
      : liked > 0
        ? "tuned to your taste — keep going"
        : dealCount > 0
          ? `${dealCount} seen`
          : "react to start";

  return (
    <section aria-label="Taste finder" data-reveal className="relative">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <span className="stamp shrink-0" style={{ color: "var(--sakura)" }}>
          taste finder
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          Find your style
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          react to a few and we&apos;ll home in
        </span>
      </div>

      <div
        key={entry.id}
        className="deck-deal relative flex flex-col gap-0 bg-card/90 sm:flex-row"
        style={{
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span
          aria-hidden
          className="washi-tape -top-2 left-8"
          style={{ ["--strip-ink" as string]: "var(--yuzu)", transform: "rotate(-4deg)" }}
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
                boxShadow: "var(--shadow-card)",
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
            <button
              type="button"
              onClick={wild}
              title="Show a completely random design"
              className="inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/75 transition-all hover:-translate-y-[1px] hover:text-foreground"
              style={{
                background:
                  "color-mix(in srgb, var(--yuzu) 18%, var(--paper-stamp-mix))",
              }}
            >
              ↻ surprise me
            </button>
            <Link
              href={entry.href}
              prefetch={false}
              className="inline-flex items-center gap-1.5 bg-foreground px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-background transition-all hover:-translate-y-[1px]"
              style={{
                boxShadow: "var(--shadow-card)",
              }}
            >
              open design →
            </Link>
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {statusLine}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
