"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PaletteCard, type PaletteItem } from "@/components/palette-card";
import { ArtStyleCard, type ArtStyleItem } from "@/components/art-style-card";

function SearchBar({
  value,
  onChange,
  placeholder,
  count,
  total,
  noun,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  count: number;
  total: number;
  noun: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-[var(--radius-lg)] border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-[0_1px_2px_rgba(30,35,45,0.04)] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
        />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {count === total ? `${total} ${noun}` : `${count} / ${total} ${noun}`}
      </span>
    </div>
  );
}

export function PaletteCatalog({ items }: { items: PaletteItem[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) =>
      `${p.name} ${p.tags.join(" ")} ${Object.values(p.roles).join(" ")}`.toLowerCase().includes(query),
    );
  }, [q, items]);

  return (
    <>
      <SearchBar value={q} onChange={setQ} placeholder="Search palettes by name, tag, or hex…" count={filtered.length} total={items.length} noun="palettes" />
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="group min-w-0">
              <PaletteCard palette={p} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState noun="palettes" />
      )}
    </>
  );
}

export function ArtStyleCatalog({ items }: { items: ArtStyleItem[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((a) =>
      `${a.name} ${a.medium} ${a.tags.join(" ")} ${a.promptTemplate}`.toLowerCase().includes(query),
    );
  }, [q, items]);

  return (
    <>
      <SearchBar value={q} onChange={setQ} placeholder="Search art styles by name, medium, or prompt…" count={filtered.length} total={items.length} noun="art styles" />
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="group min-w-0">
              <ArtStyleCard art={a} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState noun="art styles" />
      )}
    </>
  );
}

function EmptyState({ noun }: { noun: string }) {
  return (
    <div className="paper-card mx-auto max-w-md rounded-[var(--radius-lg)] p-8 text-center text-sm text-muted-foreground">
      No {noun} found.
      <div className="mt-1 font-mono text-[11px]">try a different search</div>
    </div>
  );
}
