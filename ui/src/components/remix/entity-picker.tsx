"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const MEDIA = "shrink-0 overflow-hidden rounded-[2px] shadow-[0_1px_3px_rgba(30,35,45,0.14)]";

function haystack(it: PickItem): string {
  return [
    it.name,
    it.subtitle ?? "",
    (it.tags ?? []).join(" "),
    Object.values(it.facets ?? {}).join(" "),
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

function useFacets(items: PickItem[]) {
  return useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const it of items) {
      for (const [k, v] of Object.entries(it.facets ?? {})) {
        if (!v) continue;
        (map[k] ??= new Set()).add(v);
      }
    }
    return Object.entries(map).map(([k, vs]) => [k, [...vs].sort()] as const);
  }, [items]);
}

// "Search by name, temperature, hue…" — tells the user what's searchable.
function searchPlaceholder(facets: readonly (readonly [string, string[]])[]) {
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
  facets: readonly (readonly [string, string[]])[];
  active: Record<string, Set<string>>;
  onToggle: (key: string, val: string) => void;
}) {
  if (facets.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {facets.map(([key, vals]) => (
        <div key={key} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">{key}</span>
          {vals.map((v) => {
            const on = active[key]?.has(v) ?? false;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(key, v)}
                data-on={on}
                className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2.5 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground data-[on=true]:bg-foreground data-[on=true]:text-background"
              >
                {v}
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

function ItemRow({ item, active, onPick }: { item: PickItem; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      data-active={active}
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
      {active ? <span aria-hidden className="shrink-0 text-[12px] font-bold text-foreground">✓</span> : null}
    </button>
  );
}

function Trigger({ label, current, onOpen }: { label: string; current?: PickItem; onOpen: () => void }) {
  return (
    <div>
      <div className={`mb-1.5 ${KX_LABEL}`}>{label}</div>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-2.5 bg-card/70 px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(30,35,45,0.05),0_2px_8px_rgba(30,35,45,0.05)] backdrop-blur-[3px] transition-all hover:-translate-y-[1px] hover:bg-card"
      >
        {current ? <ItemMedia item={current} /> : null}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{current?.name ?? "Choose…"}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">browse</span>
      </button>
    </div>
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

// ── Variant A: command palette (⌘K-style centered modal) ──────────────────────

export function CommandPicker({
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
  const current = items.find((i) => i.id === value);
  const facets = useFacets(items);
  const filtered = useFiltered(items, q, active);
  const visible = filtered.slice(0, RESULT_CAP);
  const noun = label.toLowerCase();

  function close() {
    setOpen(false);
    setQ("");
    setActive({});
    setCursor(0);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, visible.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        const pick = visible[cursor];
        if (pick) {
          onSelect(pick.id);
          close();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, visible, cursor, onSelect]);

  return (
    <>
      <Trigger label={label} current={current} onOpen={() => setOpen(true)} />
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <div className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={close} />
          <div role="dialog" aria-label={label} className="relative z-10 w-full max-w-lg overflow-hidden bg-card shadow-[0_24px_70px_rgba(30,35,45,0.3)]">
            <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3">
              <span className="stamp text-[var(--sumire)]">{label}</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                placeholder={searchPlaceholder(facets)}
                className={`${KX_FIELD} min-w-0 flex-1`}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">esc</span>
            </div>
            {facets.length > 0 ? (
              <div className="px-4 pb-3">
                <FacetChips facets={facets} active={active} onToggle={(k, v) => { toggle(setActive, k, v); setCursor(0); }} />
              </div>
            ) : null}
            <div className="sticker-perforation" />
            <div className="max-h-[52vh] overflow-y-auto py-1" role="listbox">
              {visible.map((it, i) => (
                <ItemRow key={it.id} item={it} active={i === cursor} onPick={() => { onSelect(it.id); close(); }} />
              ))}
              {filtered.length === 0 ? <EmptyResults /> : <CountHint shown={visible.length} total={filtered.length} noun={noun} />}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── Variant B: in-place picker — anchored dropdown on desktop, bottom-sheet on
// mobile. Never takes over the viewport or scrolls the page away, so the live
// preview below stays visible while you choose. Scroll position is preserved.

export function DrawerPicker({
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
  const current = items.find((i) => i.id === value);
  const facets = useFacets(items);
  const filtered = useFiltered(items, q, active);
  const visible = filtered.slice(0, RESULT_CAP);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const noun = label.toLowerCase();

  function close() {
    setOpen(false);
    setQ("");
    setActive({});
  }

  // Esc to close + click-away (desktop). The mobile backdrop handles its own close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    // focus search WITHOUT scrolling the page to it (the old jump-to-top cause)
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // On mobile only, lock the body while the sheet is up and restore the exact
  // scroll position on close — so opening/closing never moves the page.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 639px)").matches) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Trigger label={label} current={current} onOpen={() => (open ? close() : setOpen(true))} />
      {open ? (
        <>
          {/* light scrim on mobile only — desktop stays a non-blocking dropdown */}
          <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] sm:hidden" onClick={close} />
          <div
            role="dialog"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[16px] bg-card shadow-[0_-20px_60px_rgba(30,35,45,0.28)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:z-30 sm:max-h-[58vh] sm:w-[clamp(300px,90vw,380px)] sm:max-w-[90vw] sm:rounded-none sm:shadow-[0_18px_50px_rgba(30,35,45,0.22)]"
          >
            {/* sticky head: drag affordance (mobile) + label + close, then search */}
            <div className="shrink-0 bg-card pt-2">
              <span aria-hidden className="mx-auto mb-1.5 block h-1 w-9 rounded-full bg-foreground/15 sm:hidden" />
              <header className="flex items-center justify-between px-4 pb-2">
                <span className="stamp text-[var(--sumire)]">{label}</span>
                <button type="button" onClick={close} className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
                  done
                </button>
              </header>
              <div className="px-4 pb-2.5">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder(facets)}
                  className={`${KX_FIELD} h-10 text-[15px] sm:h-9 sm:text-[13px]`}
                />
              </div>
              {facets.length > 0 ? (
                <div className="px-4 pb-2.5">
                  <FacetChips facets={facets} active={active} onToggle={(k, v) => toggle(setActive, k, v)} />
                </div>
              ) : null}
              <div className="sticker-perforation mx-4" />
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain py-1" role="listbox">
              {visible.map((it) => (
                <ItemRow key={it.id} item={it} active={it.id === value} onPick={() => { onSelect(it.id); close(); }} />
              ))}
              {filtered.length === 0 ? <EmptyResults /> : null}
            </div>
            <div className="shrink-0 bg-card">
              <div className="sticker-perforation mx-4" />
              <footer className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {filtered.length === items.length ? `${items.length} ${noun} · tap to apply` : `${filtered.length} of ${items.length} ${noun}`}
              </footer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
