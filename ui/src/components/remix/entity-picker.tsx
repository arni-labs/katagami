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

function useFiltered(
  items: PickItem[],
  q: string,
  active: Record<string, Set<string>>,
) {
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
  active,
  onPick,
}: {
  item: PickItem;
  active: boolean;
  onPick: () => void;
}) {
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
        <span className="block truncate text-[13px] font-medium text-foreground">{item.name}</span>
        {item.subtitle ? (
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {item.subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Trigger({
  label,
  current,
  onOpen,
}: {
  label: string;
  current?: PickItem;
  onOpen: () => void;
}) {
  return (
    <div>
      <div className={`mb-1.5 ${KX_LABEL}`}>{label}</div>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-2.5 bg-card/70 px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(30,35,45,0.05),0_2px_8px_rgba(30,35,45,0.05)] backdrop-blur-[3px] transition-all hover:-translate-y-[1px] hover:bg-card"
      >
        {current ? <ItemMedia item={current} /> : null}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {current?.name ?? "Choose…"}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">change</span>
      </button>
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
  const [cursor, setCursor] = useState(0);
  const current = items.find((i) => i.id === value);
  const filtered = useFiltered(items, q, {});
  const visible = filtered.slice(0, RESULT_CAP);

  function close() {
    setOpen(false);
    setQ("");
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
          <div
            role="dialog"
            aria-label={label}
            className="relative z-10 w-full max-w-lg overflow-hidden bg-card shadow-[0_24px_70px_rgba(30,35,45,0.3)]"
          >
            <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3">
              <span className="stamp text-[var(--sumire)]">{label}</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                placeholder="type to filter…"
                className={`${KX_FIELD} min-w-0 flex-1`}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">esc</span>
            </div>
            <div className="sticker-perforation" />
            <div className="max-h-[52vh] overflow-y-auto py-1" role="listbox">
              {visible.map((it, i) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  active={i === cursor}
                  onPick={() => {
                    onSelect(it.id);
                    close();
                  }}
                />
              ))}
              {filtered.length === 0 ? <EmptyResults /> : null}
              {filtered.length > visible.length ? (
                <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  showing {visible.length} of {filtered.length}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── Variant B: filter drawer (slide-in panel with facet chips) ────────────────

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
  const filtered = useFiltered(items, q, active);
  const visible = filtered.slice(0, RESULT_CAP);
  const panelRef = useRef<HTMLDivElement>(null);

  const facets = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const it of items) {
      for (const [k, v] of Object.entries(it.facets ?? {})) {
        if (!v) continue;
        (map[k] ??= new Set()).add(v);
      }
    }
    return Object.entries(map).map(([k, vs]) => [k, [...vs].sort()] as const);
  }, [items]);

  function toggleFacet(key: string, val: string) {
    setActive((prev) => {
      const next: Record<string, Set<string>> = {};
      for (const [k, s] of Object.entries(prev)) next[k] = new Set(s);
      const set = (next[key] ??= new Set());
      if (set.has(val)) set.delete(val);
      else set.add(val);
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Trigger label={label} current={current} onOpen={() => setOpen(true)} />
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-card shadow-[-24px_0_70px_rgba(30,35,45,0.25)]"
          >
            <header className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
              <span className="stamp text-[var(--sumire)]">{label}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              >
                close
              </button>
            </header>
            <div className="px-4 pb-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="search…"
                className={KX_FIELD}
              />
            </div>
            {facets.length > 0 ? (
              <>
                <div className="sticker-perforation mx-4" />
                <div className="space-y-2 px-4 py-3">
                  {facets.map(([key, vals]) => (
                    <div key={key} className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">{key}</span>
                      {vals.map((v) => {
                        const on = active[key]?.has(v) ?? false;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleFacet(key, v)}
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
              </>
            ) : null}
            <div className="sticker-perforation mx-4" />
            <div className="flex-1 overflow-y-auto py-1" role="listbox">
              {visible.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  active={it.id === value}
                  onPick={() => {
                    onSelect(it.id);
                    setOpen(false);
                  }}
                />
              ))}
              {filtered.length === 0 ? <EmptyResults /> : null}
            </div>
            <div className="sticker-perforation mx-4" />
            <footer className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              {filtered.length === items.length
                ? `${items.length} ${label.toLowerCase()}`
                : `${filtered.length} of ${items.length}`}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
