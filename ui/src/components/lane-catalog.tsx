"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PaletteCard, type PaletteItem } from "@/components/palette-card";
import { ArtStyleCard, type ArtStyleItem } from "@/components/art-style-card";
import { KX_FIELD } from "@/lib/katagami-ui";

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
    <div className="relative mb-7 flex flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden bg-card/65 px-5 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)] backdrop-blur-[4px] sm:overflow-visible">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 -top-2 h-[14px] w-16 rounded-[1px] opacity-75"
        style={{
          background: "var(--salad)",
          mixBlendMode: "var(--ink-blend)" as never,
          transform: "rotate(-6deg)",
        }}
      />
      <span className="stamp text-[var(--sumire)]">find</span>
      <div className="relative min-w-[150px] max-w-[320px] flex-1">
        <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${KX_FIELD} h-8 pl-6`}
        />
      </div>
      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
        <div data-reveal-children className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/palettes/${p.id}`} prefetch={false} className="group block min-w-0">
              <PaletteCard palette={p} />
            </Link>
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
        <div data-reveal-children className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link key={a.id} href={`/art-styles/${a.id}`} prefetch={false} className="group block min-w-0">
              <ArtStyleCard art={a} />
            </Link>
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
    <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
      No {noun} found.
      <div className="mt-1 font-mono text-[11px]">try a different search</div>
    </div>
  );
}
