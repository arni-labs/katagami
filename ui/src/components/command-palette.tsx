"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface PaletteIndexItem {
  id: string;
  kind: "language" | "palette" | "art-style" | "page";
  name: string;
  href: string;
  tags?: string[];
  /** Up to 4 hex/css colors shown as ink chips next to the row. */
  swatch?: string[];
}

const KIND_LABEL: Record<PaletteIndexItem["kind"], string> = {
  language: "design language",
  palette: "palette",
  "art-style": "art style",
  page: "page",
};

const KIND_INK: Record<PaletteIndexItem["kind"], string> = {
  language: "var(--sakura)",
  palette: "var(--ramune)",
  "art-style": "var(--yuzu)",
  page: "var(--graphite)",
};

const KIND_ORDER: PaletteIndexItem["kind"][] = [
  "language",
  "palette",
  "art-style",
  "page",
];

function score(item: PaletteIndexItem, q: string): number {
  const name = item.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((w) => name.includes(w))) return 50;
  if (item.tags?.some((t) => t.toLowerCase().includes(q))) return 40;
  if (KIND_LABEL[item.kind].includes(q)) return 10;
  return 0;
}

/** ⌘K palette searching every lane of the library at once — built for the
 *  day the catalog holds thousands of entries, useful at any size. */
export function CommandPalette({ items }: { items: PaletteIndexItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const openPalette = useCallback(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    setQuery("");
    setCursor(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    restoreFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closePalette();
      }
    };
    const onOpenEvent = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("katagami:palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("katagami:palette", onOpenEvent);
    };
  }, [open, openPalette, closePalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query: a browsable slice of each lane, languages first.
      const byKind = new Map<string, PaletteIndexItem[]>();
      for (const item of items) {
        const bucket = byKind.get(item.kind) ?? [];
        if (bucket.length < (item.kind === "language" ? 7 : 4)) bucket.push(item);
        byKind.set(item.kind, bucket);
      }
      return KIND_ORDER.flatMap((k) => byKind.get(k) ?? []);
    }
    return items
      .map((item) => ({ item, s: score(item, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
      .slice(0, 24)
      .map((r) => r.item);
  }, [items, query]);

  const go = useCallback(
    (item: PaletteIndexItem) => {
      closePalette();
      router.push(item.href);
    },
    [router, closePalette],
  );

  const surprise = useCallback(() => {
    const pool = items.filter((i) => i.kind === "language");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    go(pick);
  }, [items, go]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[cursor];
      if (item) go(item);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${cursor}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let lastKind: string | null = null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search the library"
    >
      <button
        aria-label="Close search"
        className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--sumi)_38%,transparent)]"
        onClick={closePalette}
        tabIndex={-1}
      />
      <div
        className="relative w-full max-w-xl bg-card"
        style={{
          boxShadow:
            "0 2px 4px rgba(33,33,60,0.08), 8px 9px 0 color-mix(in srgb, var(--ramune) 30%, transparent)",
        }}
      >
        <div className="flex items-center gap-3 px-4 pt-4">
          <span className="ink-stamp" style={{ ["--ink" as string]: "var(--sumi)" }}>
            search
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="languages, palettes, art styles…"
            aria-label="Search the library"
            className="w-full bg-transparent py-2 font-mono text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <kbd className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="sticker-perforation mx-4 mt-3" />

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto px-2 py-2">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center font-mono text-[12px] text-muted-foreground">
              no matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((item, i) => {
              const showHeader = item.kind !== lastKind;
              lastKind = item.kind;
              return (
                <div key={`${item.kind}-${item.id}`}>
                  {showHeader && (
                    <div className="flex items-center gap-2 px-3 pb-1 pt-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <span
                        aria-hidden
                        className="inline-block h-[6px] w-[6px]"
                        style={{ background: KIND_INK[item.kind] }}
                      />
                      {KIND_LABEL[item.kind]}s
                    </div>
                  )}
                  <button
                    data-index={i}
                    onClick={() => go(item)}
                    onMouseEnter={() => setCursor(i)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                    style={
                      i === cursor
                        ? {
                            background:
                              "color-mix(in srgb, var(--yuzu) 26%, transparent)",
                          }
                        : undefined
                    }
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">
                      {item.name}
                    </span>
                    {item.swatch && item.swatch.length > 0 && (
                      <span aria-hidden className="flex shrink-0 gap-[3px]">
                        {item.swatch.slice(0, 4).map((c, j) => (
                          <span
                            key={j}
                            className="h-3 w-3"
                            style={{ background: c }}
                          />
                        ))}
                      </span>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <span className="hidden max-w-[180px] truncate font-mono text-[10px] text-muted-foreground sm:block">
                        {item.tags.slice(0, 3).join(" · ")}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="sticker-perforation mx-4" />
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={surprise}
            className="ink-stamp transition-transform hover:-translate-y-[1px] hover:rotate-[-2deg]"
            style={{ ["--ink" as string]: "var(--sakura)" }}
          >
            ✦ surprise me
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            ↑↓ move · ↵ open
          </span>
        </div>
      </div>
    </div>
  );
}

/** Header button that opens the palette. */
export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("katagami:palette"))}
      aria-label="Search the library (⌘K)"
      title="Search the library (⌘K)"
      className={`group inline-flex h-7 items-center gap-2 px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/75 transition-all hover:-translate-y-[1px] hover:text-foreground ${className}`}
      style={{
        background: "color-mix(in srgb, var(--ramune) 12%, var(--paper-stamp-mix))",
      }}
    >
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        className="h-3 w-3"
        aria-hidden
      >
        <circle cx="6" cy="6" r="4.2" />
        <path d="M9.4 9.4 L12.6 12.6" />
      </svg>
      search
      <kbd className="hidden font-mono text-[9px] tracking-[0.08em] opacity-70 lg:inline">
        ⌘K
      </kbd>
    </button>
  );
}
