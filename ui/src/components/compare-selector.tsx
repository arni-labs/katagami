"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface LangRef {
  id: string;
  name: string;
}

const fieldBase =
  "rounded-none border-0 border-b border-dashed border-foreground/30 bg-transparent px-1 font-mono text-sm text-foreground shadow-none focus-visible:border-solid focus-visible:border-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none";

export function CompareSelector({
  languages,
  initialA,
  initialB,
}: {
  languages: LangRef[];
  initialA?: string;
  initialB?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <div className="relative z-50 flex flex-wrap items-center gap-x-4 gap-y-3 bg-card/65 px-5 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)] backdrop-blur-[4px]">
      {/* washi tapes pinning the card */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 -top-2 h-[14px] w-16 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sakura) 75%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--sakura) 35%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(-6deg)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-2 h-[12px] w-12 rounded-[1px] opacity-75 shadow-[0_1px_2px_rgba(30,35,45,0.05)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--teal) 70%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--teal) 30%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(4deg)",
        }}
      />

      <span className="stamp text-[var(--sumire)]">compare</span>

      <LangSearch
        languages={languages}
        value={initialA}
        sideLabel="A"
        dotColor="sakura"
        placeholder="search side A…"
        onSelect={(id) => update("a", id)}
      />

      <span className="font-display text-base font-bold italic text-foreground/80 sm:text-lg">
        vs.
      </span>

      <LangSearch
        languages={languages}
        value={initialB}
        sideLabel="B"
        dotColor="teal"
        placeholder="search side B…"
        onSelect={(id) => update("b", id)}
      />
    </div>
  );
}

// ── Typeahead search for a single side ─────────────────────────────

function LangSearch({
  languages,
  value,
  sideLabel,
  dotColor,
  placeholder,
  onSelect,
}: {
  languages: LangRef[];
  value?: string;
  sideLabel: string;
  dotColor: string;
  placeholder: string;
  onSelect: (id: string) => void;
}) {
  const selected = useMemo(
    () => languages.find((l) => l.id === value),
    [languages, value],
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages.slice(0, 30);
    return languages
      .filter((l) => l.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [languages, query]);

  function commit(id: string) {
    onSelect(id);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onSelect("");
    setQuery("");
  }

  // Show selection name in the input when not actively typing
  const displayValue = query || (selected ? selected.name : "");

  return (
    <div className="relative flex min-w-[180px] max-w-[320px] flex-1 items-center gap-2">
      <span
        aria-hidden
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground/15 font-mono text-[9px] font-bold uppercase text-foreground/70"
        style={{ background: `color-mix(in oklch, var(--${dotColor}) 45%, var(--paper-tape-mix))` }}
      >
        {sideLabel}
      </span>

      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = filtered[active];
              if (pick) commit(pick.id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`${fieldBase} h-8 w-full pl-6 pr-6 placeholder:text-muted-foreground/70`}
        />
        {selected && !query && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Clear side ${sideLabel}`}
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Typeahead dropdown */}
        {open && filtered.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto border border-border bg-card shadow-[0_4px_16px_rgba(30,35,45,0.1)]"
          >
            {filtered.map((l, i) => {
              const isActive = i === active;
              const isSelected = l.id === value;
              return (
                <li
                  key={l.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(l.id);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`relative cursor-pointer px-2.5 py-1.5 font-mono text-[12px] transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `color-mix(in oklch, var(--${dotColor}) 55%, var(--paper-tape-mix))`,
                      }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: `var(--${dotColor})` }}
                    />
                    {l.name}
                    {isSelected && (
                      <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        current
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {open && filtered.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-dashed border-border bg-card/80 px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
            no matches for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
