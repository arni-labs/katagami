"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2, Save } from "lucide-react";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { PageHero, Marker } from "@/components/page-hero";
import { Perforation, Stamp } from "@/components/scrapbook";
import {
  AB_ITEMS,
  REVISION_RUN,
  RULEBOOK_VERSION,
  type AbItem,
  type AbSurfaceKind,
} from "./ab-data";
import {
  recordAbFeedback,
  type AbRecord,
  type AbWinner,
} from "./actions";

const SURFACES: { key: AbSurfaceKind; label: string }[] = [
  { key: "landing", label: "Landing" },
  { key: "embodiment", label: "Embodiment" },
  { key: "dashboard", label: "Dashboard" },
];

const WINNER_OPTIONS: { key: AbWinner; label: string }[] = [
  { key: "A", label: "A better" },
  { key: "B", label: "B better" },
  { key: "tie", label: "Tie" },
];

const STORAGE_KEY = "katagami:ab-review:v1";

// One surface verdict (or the overall verdict, dimension === "overall").
interface Pick {
  winner: AbWinner;
  note: string;
}

// Per-language local state: a verdict per surface + one overall verdict.
type LangPicks = {
  surfaces: Partial<Record<AbSurfaceKind, Pick>>;
  overall?: Pick;
};
type AllPicks = Record<string, LangPicks>; // keyed by language name

function loadPicks(): AllPicks {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AllPicks) : {};
  } catch {
    return {};
  }
}

// The trio ink strip (sakura / yuzu / ramune) — the lab's signature top edge.
function TrioStrip({ height = 4 }: { height?: number }) {
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 top-0 z-10 flex"
      style={{ height }}
    >
      <span className="h-full flex-1" style={{ background: "var(--sakura)" }} />
      <span className="h-full flex-1" style={{ background: "var(--yuzu)" }} />
      <span className="h-full flex-1" style={{ background: "var(--ramune)" }} />
    </span>
  );
}

// Shared segmented control — same look as the lab's Segmented.
function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs";
  return (
    <div className="inline-flex bg-card p-1 shadow-[0_1px_0_#1e232d1f]">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`font-mono transition-colors ${pad} ${
            value === o.key
              ? "bg-foreground font-bold text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// A · before / B · after pane: a mono eyebrow over the full-page composition.
function Pane({
  label,
  side,
  fileId,
}: {
  label: string;
  side: "A" | "B";
  fileId: string;
}) {
  const ink = side === "A" ? "var(--sakura)" : "var(--ramune)";
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center bg-foreground font-display text-[13px] font-bold text-background"
          style={{ background: ink }}
        >
          {side}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="sticker-card relative overflow-hidden">
        <TrioStrip height={3} />
        {fileId ? (
          <EmbodimentViewer fileId={fileId} />
        ) : (
          /* old-generation originals had no landing/dashboard composition */
          <div className="grid min-h-[320px] place-items-center p-8 text-center">
            <p className="max-w-[26ch] font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              the original had no composition for this surface
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// One verdict control: A / B / tie segmented + a note input.
function VerdictControl({
  label,
  pick,
  onChange,
}: {
  label: string;
  pick: Pick | undefined;
  onChange: (next: Pick) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Segmented
          size="sm"
          options={WINNER_OPTIONS}
          value={pick?.winner ?? ("" as AbWinner)}
          onChange={(winner) =>
            onChange({ winner, note: pick?.note ?? "" })
          }
        />
      </div>
      <input
        type="text"
        value={pick?.note ?? ""}
        onChange={(e) =>
          onChange({ winner: pick?.winner ?? ("" as AbWinner), note: e.target.value })
        }
        placeholder="Optional note — what tipped it"
        className="h-9 w-full max-w-xl bg-background/70 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:bg-background"
        style={{ boxShadow: "var(--shadow-card)" }}
      />
    </div>
  );
}

function LanguageBlock({
  item,
  picks,
  onSurfacePick,
  onOverallPick,
}: {
  item: AbItem;
  picks: LangPicks;
  onSurfacePick: (surface: AbSurfaceKind, pick: Pick) => void;
  onOverallPick: (pick: Pick) => void;
}) {
  const [surface, setSurface] = useState<AbSurfaceKind>("landing");
  const current =
    item.surfaces.find((s) => s.surface === surface) ?? item.surfaces[0];

  return (
    <section
      className="sticker-card relative overflow-hidden p-5 pt-7 sm:p-7 sm:pt-9"
      style={{ ["--card-ink" as string]: "var(--ramune)" }}
    >
      <TrioStrip height={4} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--sakura)]">
            design language
          </span>
          <h2 className="mt-1.5 font-display text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            {item.name}
          </h2>
        </div>
        <Segmented
          options={SURFACES}
          value={surface}
          onChange={(k) => setSurface(k)}
        />
      </div>

      {item.note ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Stamp color="yuzu" rotate={-2}>
            imagery note
          </Stamp>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {item.note}
          </p>
        </div>
      ) : null}

      {/* Only the selected surface's two frames mount — keyed by surface so
          switching tabs re-fetches the new pair. */}
      <div key={surface} className="mt-6 grid gap-6 lg:grid-cols-2">
        <Pane
          side="A"
          label="A · before · original"
          fileId={current.before_file_id}
        />
        <Pane
          side="B"
          label="B · after · revised"
          fileId={current.after_file_id}
        />
      </div>

      <Perforation className="mt-7" />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <VerdictControl
          label={`This surface — ${surface}`}
          pick={picks.surfaces[surface]}
          onChange={(next) => onSurfacePick(surface, next)}
        />
        <VerdictControl
          label="Overall — this language"
          pick={picks.overall}
          onChange={onOverallPick}
        />
      </div>
    </section>
  );
}

// Build the durable records from local picks. One per surface verdict + one
// overall verdict, only where a winner has been chosen.
function buildRecords(items: AbItem[], all: AllPicks): AbRecord[] {
  const ts = new Date().toISOString();
  const records: AbRecord[] = [];

  for (const item of items) {
    const lang = all[item.name];
    if (!lang) continue;

    const resolve = (winner: AbWinner) => {
      if (winner === "A") {
        return { chosen_id: item.original_id, rejected_id: item.descendant_id };
      }
      if (winner === "B") {
        return { chosen_id: item.descendant_id, rejected_id: item.original_id };
      }
      return { chosen_id: "tie", rejected_id: "tie" };
    };

    for (const surface of item.surfaces) {
      const pick = lang.surfaces[surface.surface];
      if (!pick?.winner) continue;
      records.push({
        type: "pairwise",
        ts,
        name: item.name,
        surface: surface.surface,
        winner: pick.winner,
        ...resolve(pick.winner),
        dimension: surface.surface,
        note: pick.note ?? "",
        rulebook_version: RULEBOOK_VERSION,
        revision_run: REVISION_RUN,
      });
    }

    if (lang.overall?.winner) {
      records.push({
        type: "pairwise",
        ts,
        name: item.name,
        surface: "overall",
        winner: lang.overall.winner,
        ...resolve(lang.overall.winner),
        dimension: "overall",
        note: lang.overall.note ?? "",
        rulebook_version: RULEBOOK_VERSION,
        revision_run: REVISION_RUN,
      });
    }
  }

  return records;
}

function downloadJsonl(records: AbRecord[]) {
  const body = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const blob = new Blob([body], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ab-verdicts-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jsonl`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const STICKER =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] shadow-[0_2px_0_#1e232d29] transition-all hover:-translate-y-[2px] hover:shadow-[0_4px_0_#1e232d29] disabled:pointer-events-none disabled:opacity-50";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; count: number }
  | { kind: "error"; message: string };

export function AbReview({ items = AB_ITEMS }: { items?: AbItem[] }) {
  const [picks, setPicks] = useState<AllPicks>({});
  const [hydrated, setHydrated] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // Hydrate from localStorage after mount (avoids SSR/client mismatch). Read in
  // a microtask so the setState lands in an async callback, not synchronously in
  // the effect body — same pattern the embodiment viewer uses for its fetch.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setPicks(loadPicks());
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist every change so nothing is lost on reload.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      /* private mode — picks just won't persist */
    }
  }, [picks, hydrated]);

  const setSurfacePick = useCallback(
    (name: string, surface: AbSurfaceKind, pick: Pick) => {
      setSave({ kind: "idle" });
      setPicks((prev) => {
        const lang = prev[name] ?? { surfaces: {} };
        return {
          ...prev,
          [name]: {
            ...lang,
            surfaces: { ...lang.surfaces, [surface]: pick },
          },
        };
      });
    },
    [],
  );

  const setOverallPick = useCallback((name: string, pick: Pick) => {
    setSave({ kind: "idle" });
    setPicks((prev) => {
      const lang = prev[name] ?? { surfaces: {} };
      return { ...prev, [name]: { ...lang, overall: pick } };
    });
  }, []);

  const records = useMemo(() => buildRecords(items, picks), [items, picks]);
  const count = records.length;

  const onSave = async () => {
    if (count === 0) return;
    setSave({ kind: "saving" });
    const res = await recordAbFeedback(records);
    if (res.ok) {
      setSave({ kind: "saved", count: res.count ?? count });
    } else {
      setSave({ kind: "error", message: res.error ?? "Save failed." });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <PageHero
        eyebrow={
          <>
            <span>owner</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">review</span>
          </>
        }
        eyebrowAccent="ramune"
        title={
          <>
            Before / <Marker color="yuzu">After</Marker>
          </>
        }
        description={
          <>
            Targeted fixes from critique, regenerated as descendants. For each
            language and surface, see the original (A) beside the revised (B),
            then call it: A, B, or a tie. Picks save to this browser as you go.
          </>
        }
        rightSlot={
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-display text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[56px]">
              {count}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              verdicts recorded
            </span>
          </div>
        }
      />

      <div className="mt-10 space-y-12">
        {items.map((item) => (
          <LanguageBlock
            key={item.name}
            item={item}
            picks={picks[item.name] ?? { surfaces: {} }}
            onSurfacePick={(surface, pick) =>
              setSurfacePick(item.name, surface, pick)
            }
            onOverallPick={(pick) => setOverallPick(item.name, pick)}
          />
        ))}
      </div>

      {/* Save bar — sticks to the bottom so the verdict is always one click away. */}
      <div className="sticky bottom-4 z-30 mt-12">
        <div
          className="relative flex flex-col gap-3 overflow-hidden bg-card/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ boxShadow: "var(--shadow-card-hover)" }}
        >
          <TrioStrip height={3} />
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {count} {count === 1 ? "verdict" : "verdicts"} ready
            </span>
            {save.kind === "saved" ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
                <Check className="h-3.5 w-3.5" />
                saved {save.count} to the commons
              </span>
            ) : null}
            {save.kind === "error" ? (
              <span className="max-w-md font-mono text-[11px] text-destructive">
                {save.message} — your picks are still in this browser and the
                export below.
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => downloadJsonl(records)}
              disabled={count === 0}
              className={`${STICKER} bg-card text-foreground`}
            >
              <Download className="h-3.5 w-3.5" />
              Export JSONL
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={count === 0 || save.kind === "saving"}
              className={`${STICKER} bg-foreground text-background`}
            >
              {save.kind === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
