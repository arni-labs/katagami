"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useRef, useState } from "react";
import { KX_FIELD, KX_LABEL } from "@/lib/katagami-ui";

// One item model for all three lanes. The picker is generic; only the media
// (swatch row vs thumbnail) differs by kind.
export interface PickItem {
  id: string;
  name: string;
  subtitle?: string; // mood / medium / tagline
  swatches?: string[]; // palette: signature + neutral hexes
  thumb?: string; // art / language: image url
  tags?: string[];
  facets?: Record<string, string>; // e.g. { temperature: "warm", medium: "print" }
}

const RESULT_CAP = 60; // render at most this many; the rest are summarized (thousands-safe)
// A facet is only a useful filter when it has a small, shared set of values. A
// key whose values are nearly unique (e.g. a palette's free-text key-hue) is not
// a facet — it's noise. Surface a facet only when 2..MAX_FACET_VALUES distinct
// values exist; everything else stays reachable through the text search.
const MAX_FACET_VALUES = 8;
const MEDIA = "shrink-0 overflow-hidden rounded-[2px] shadow-[0_1px_3px_rgba(30,35,45,0.14)]";

type Facet = readonly [string, readonly (readonly [string, number])[]]; // [key, [[value, count], …]]

function haystack(it: PickItem): string {
  return [
    it.name,
    it.subtitle ?? "",
    (it.tags ?? []).join(" "),
    Object.values(it.facets ?? {}).join(" "), // free-text facets (hue, …) stay searchable even when not shown as chips
    (it.swatches ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function useFiltered(items: PickItem[], q: string, active: Record<string, Set<string>>) {
  return useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      if (query && !haystack(it).includes(query)) return false;
      for (const [key, vals] of Object.entries(active)) {
        if (vals.size === 0) continue;
        const v = it.facets?.[key];
        if (!v || !vals.has(v)) return false;
      }
      return true;
    });
  }, [items, q, active]);
}

// Only surface low-cardinality facets, each value carrying its count, sorted by
// frequency. High-cardinality / free-text keys are dropped automatically.
function useFacets(items: PickItem[]): Facet[] {
  return useMemo(() => {
    const counts: Record<string, Map<string, number>> = {};
    for (const it of items) {
      for (const [k, v] of Object.entries(it.facets ?? {})) {
        if (!v) continue;
        (counts[k] ??= new Map()).set(v, (counts[k].get(v) ?? 0) + 1);
      }
    }
    return Object.entries(counts)
      .filter(([, m]) => m.size > 1 && m.size <= MAX_FACET_VALUES)
      .map(
        ([k, m]) =>
          [k, [...m.entries()].sort((a, b) => b[1] - a[1])] as Facet,
      );
  }, [items]);
}

// "Search by name, temperature…" — tells the user what's searchable.
function searchPlaceholder(facets: Facet[]) {
  const keys = facets.map(([k]) => k);
  return `Search by name${keys.length ? ", " + keys.join(", ") : ""}…`;
}

function toggle(
  setActive: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>,
  key: string,
  val: string,
) {
  setActive((prev) => {
    const next: Record<string, Set<string>> = {};
    for (const [k, s] of Object.entries(prev)) next[k] = new Set(s);
    const set = (next[key] ??= new Set());
    if (set.has(val)) set.delete(val);
    else set.add(val);
    return next;
  });
}

function FacetChips({
  facets,
  active,
  onToggle,
}: {
  facets: Facet[];
  active: Record<string, Set<string>>;
  onToggle: (key: string, val: string) => void;
}) {
  if (facets.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {facets.map(([key, vals]) => (
        <div key={key} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">{key}</span>
          {vals.map(([v, n]) => {
            const on = active[key]?.has(v) ?? false;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(key, v)}
                data-on={on}
                className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2.5 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground data-[on=true]:bg-foreground data-[on=true]:text-background"
              >
                {v}
                <span className="tabular-nums opacity-50">{n}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ItemMedia({ item }: { item: PickItem }) {
  if (item.swatches && item.swatches.length) {
    return (
      <span className={`flex h-8 w-12 ${MEDIA}`}>
        {item.swatches.slice(0, 6).map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </span>
    );
  }
  return (
    <span className={`h-8 w-12 bg-muted ${MEDIA}`}>
      {item.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumb} alt="" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

function ItemRow({
  item,
  selected,
  highlighted,
  onPick,
}: {
  item: PickItem;
  selected: boolean;
  highlighted: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      data-active={selected || highlighted}
      className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] data-[active=true]:border-foreground data-[active=true]:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
    >
      <ItemMedia item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-foreground sm:text-[13px]">{item.name}</span>
        {item.subtitle ? (
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {item.subtitle}
          </span>
        ) : null}
      </span>
      {selected ? <span aria-hidden className="shrink-0 text-[12px] font-bold text-foreground">✓</span> : null}
    </button>
  );
}

function CountHint({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
      {shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
      nothing matches
    </div>
  );
}

// A single in-place picker: an anchored dropdown (Radix Popover → portaled,
// collision-aware flip/shift, viewport-clamped) on every screen. It never takes
// over the page, steals global keys, or scrolls away — the work behind it stays
// put and visible. Keyboard nav is scoped to the search field, not the window.
export function EntityPicker({
  label,
  items,
  value,
  onSelect,
}: {
  label: string;
  items: PickItem[];
  value?: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Record<string, Set<string>>>({});
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = items.find((i) => i.id === value);
  const facets = useFacets(items);
  const filtered = useFiltered(items, q, active);
  const visible = filtered.slice(0, RESULT_CAP);
  const noun = label.toLowerCase();

  function reset() {
    setQ("");
    setActive({});
    setCursor(0);
  }
  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    reset();
  }

  return (
    <div>
      <div className={`mb-1.5 ${KX_LABEL}`}>{label}</div>
      <Popover.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className="group flex w-full items-center gap-2.5 bg-card/70 px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(30,35,45,0.05),0_2px_8px_rgba(30,35,45,0.05)] backdrop-blur-[3px] transition-all hover:-translate-y-[1px] hover:bg-card"
          >
            {current ? <ItemMedia item={current} /> : null}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {current?.name ?? "Choose…"}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
              browse
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
            onOpenAutoFocus={(e) => {
              e.preventDefault(); // focus the search box, not the first row — and never scroll the page
              inputRef.current?.focus({ preventScroll: true });
            }}
            className="z-50 flex max-h-[min(26rem,var(--radix-popover-content-available-height))] w-[min(92vw,22rem)] flex-col overflow-hidden bg-card shadow-[0_18px_50px_rgba(30,35,45,0.24)]"
          >
            <div className="shrink-0 bg-card px-4 pb-2.5 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="stamp text-[var(--sumire)]">{label}</span>
                <Popover.Close className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
                  done
                </Popover.Close>
              </div>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, visible.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter") {
                    const p = visible[cursor];
                    if (p) pick(p.id);
                  }
                }}
                placeholder={searchPlaceholder(facets)}
                className={`${KX_FIELD} h-10 text-[15px] sm:h-9 sm:text-[13px]`}
              />
              {facets.length > 0 ? (
                <div className="mt-2.5">
                  <FacetChips
                    facets={facets}
                    active={active}
                    onToggle={(k, v) => {
                      toggle(setActive, k, v);
                      setCursor(0);
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="sticker-perforation mx-4" />

            <div className="flex-1 overflow-y-auto overscroll-contain py-1" role="listbox">
              {visible.map((it, i) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  selected={it.id === value}
                  highlighted={i === cursor}
                  onPick={() => pick(it.id)}
                />
              ))}
              {filtered.length === 0 ? <EmptyResults /> : null}
            </div>

            <div className="shrink-0">
              <div className="sticker-perforation mx-4" />
              <CountHint shown={visible.length} total={filtered.length} noun={noun} />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
