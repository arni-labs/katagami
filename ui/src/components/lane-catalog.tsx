"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PaletteCard, type PaletteItem } from "@/components/palette-card";
import { ArtStyleCard, type ArtStyleItem } from "@/components/art-style-card";
import { KX_FIELD } from "@/lib/katagami-ui";
import {
  COLOR_MOOD_SHELVES,
  colorMoodShelfKey,
  groupIntoShelves,
  type ShelfBucket,
  type ShelfDef,
} from "@/lib/color-shelves";

const GRID =
  "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";

/** A lane shelves itself once it outgrows a flat wall; below this it's a
 *  single grid. Lower than the language gallery's threshold because the
 *  palette/art catalogs are smaller. */
const LANE_SHELF_THRESHOLD = 8;

/** Archived items collect in a trailing shelf (owners only ever see these). */
const ARCHIVED_SHELF: ShelfDef = {
  key: "archived",
  label: "archived",
  blurb: "hidden from the public catalog",
  ink: "var(--beni)",
};

/** Palette shelves reuse the language color-mood cabinet, plus archived. */
const PALETTE_SHELVES: ShelfDef[] = [...COLOR_MOOD_SHELVES, ARCHIVED_SHELF];

const MEDIUM_INKS = [
  "var(--sakura)", "var(--yuzu)", "var(--ramune)", "var(--sumire)",
];

// Festival & Poster Graphics always sinks to the bottom of a lane (matches the
// home gallery).
const BOTTOM_CATEGORY = "en-019efb96-d5ca-7330-9a3c-d5dc2b9f9ee3";

function paletteShelfKey(p: PaletteItem): string {
  if (p.status === "Archived") return "archived";
  return colorMoodShelfKey({
    primary: p.core.signature?.[0]?.hex,
    background: p.core.neutrals?.bg,
    featured: p.featured,
  });
}

/** Art styles have no token palette, so they shelve by medium (largest medium
 *  first), with archived collected last. */
function mediumShelves(items: ArtStyleItem[]): ShelfBucket<ArtStyleItem>[] {
  const buckets = new Map<string, ArtStyleItem[]>();
  const archived: ArtStyleItem[] = [];
  for (const a of items) {
    if (a.status === "Archived") {
      archived.push(a);
      continue;
    }
    const key = (a.medium || "mixed").trim().toLowerCase() || "mixed";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(a);
    else buckets.set(key, [a]);
  }
  const shelves: ShelfBucket<ArtStyleItem>[] = [...buckets.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([key, arr], i) => ({
      key,
      label: key,
      blurb: "",
      ink: MEDIUM_INKS[i % MEDIUM_INKS.length],
      items: arr,
    }));
  if (archived.length) shelves.push({ ...ARCHIVED_SHELF, items: archived });
  return shelves;
}

/** Shelve art styles by their taxonomy category (matching the home gallery):
 *  largest category first, Festival sunk to the bottom, untagged + archived
 *  last. Returns null when nothing is tagged, so the caller falls back to medium. */
function taxonomyShelves(
  items: ArtStyleItem[],
  names: Record<string, string>,
): ShelfBucket<ArtStyleItem>[] | null {
  const buckets = new Map<string, ArtStyleItem[]>();
  const archived: ArtStyleItem[] = [];
  let tagged = 0;
  for (const a of items) {
    if (a.status === "Archived") {
      archived.push(a);
      continue;
    }
    const id = (a.taxonomyIds ?? []).find((t) => names[t]);
    if (id) tagged += 1;
    const key = id ?? "__untagged__";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(a);
    else buckets.set(key, [a]);
  }
  if (tagged === 0) return null;
  const rank = (k: string) => (k === "__untagged__" ? 2 : k === BOTTOM_CATEGORY ? 1 : 0);
  const shelves: ShelfBucket<ArtStyleItem>[] = [...buckets.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1].length - a[1].length)
    .map(([key, arr], i) => ({
      key,
      label: key === "__untagged__" ? "mixed & more" : (names[key] ?? key).toLowerCase(),
      blurb: "",
      ink: MEDIUM_INKS[i % MEDIUM_INKS.length],
      items: arr,
    }));
  if (archived.length) shelves.push({ ...ARCHIVED_SHELF, items: archived });
  return shelves;
}

function activeCount(items: { status: string }[]): number {
  return items.reduce((n, i) => n + (i.status === "Archived" ? 0 : 1), 0);
}

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
          background: "var(--yuzu)",
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

function LaneGrid<T extends { id: string }>({
  items,
  hrefBase,
  renderCard,
}: {
  items: T[];
  hrefBase: string;
  renderCard: (item: T) => ReactNode;
}) {
  return (
    <div data-reveal-children className={GRID}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`${hrefBase}/${item.id}`}
          prefetch={false}
          className="group block min-w-0"
        >
          {renderCard(item)}
        </Link>
      ))}
    </div>
  );
}

/** Labeled color-mood / medium shelves — a stamp label + count over a grid,
 *  matching the home gallery's cabinet. */
function ShelfSections<T extends { id: string }>({
  shelves,
  hrefBase,
  renderCard,
}: {
  shelves: ShelfBucket<T>[];
  hrefBase: string;
  renderCard: (item: T) => ReactNode;
}) {
  return (
    <div className="space-y-7">
      {shelves.map((shelf) => (
        <section key={shelf.key} data-shelf-section={shelf.key} className="min-w-0">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="ink-stamp shrink-0"
              style={{ ["--ink" as string]: shelf.ink }}
            >
              {shelf.label}
            </span>
            <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {shelf.blurb ? `${shelf.blurb} · ` : ""}
              {shelf.items.length}
            </span>
            <span className="sticker-perforation hidden min-w-0 flex-1 sm:block" />
          </div>
          <LaneGrid items={shelf.items} hrefBase={hrefBase} renderCard={renderCard} />
        </section>
      ))}
    </div>
  );
}

export function PaletteCatalog({
  items,
  canArchive = false,
}: {
  items: PaletteItem[];
  canArchive?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) =>
      `${p.name} ${p.tags.join(" ")} ${Object.values(p.roles).join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [q, items]);
  const shelves = useMemo(() => {
    if (q.trim() || activeCount(items) <= LANE_SHELF_THRESHOLD) return null;
    return groupIntoShelves(items, paletteShelfKey, PALETTE_SHELVES);
  }, [q, items]);

  const renderCard = (p: PaletteItem) => (
    <PaletteCard palette={p} owner={canArchive} />
  );

  return (
    <>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search palettes by name, tag, or hex…"
        count={filtered.length}
        total={items.length}
        noun="palettes"
      />
      {filtered.length === 0 ? (
        <EmptyState noun="palettes" />
      ) : shelves ? (
        <ShelfSections shelves={shelves} hrefBase="/palettes" renderCard={renderCard} />
      ) : (
        <LaneGrid items={filtered} hrefBase="/palettes" renderCard={renderCard} />
      )}
    </>
  );
}

export function ArtStyleCatalog({
  items,
  canArchive = false,
  categoryNames,
}: {
  items: ArtStyleItem[];
  canArchive?: boolean;
  /** taxonomy id → category name; when present the lane shelves by category
   *  (like the home gallery), falling back to medium for untagged items. */
  categoryNames?: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((a) =>
      `${a.name} ${a.medium} ${a.tags.join(" ")} ${a.promptTemplate}`
        .toLowerCase()
        .includes(query),
    );
  }, [q, items]);
  const shelves = useMemo(() => {
    if (q.trim() || activeCount(items) <= LANE_SHELF_THRESHOLD) return null;
    return (
      (categoryNames && taxonomyShelves(items, categoryNames)) ?? mediumShelves(items)
    );
  }, [q, items, categoryNames]);

  const renderCard = (a: ArtStyleItem) => (
    <ArtStyleCard art={a} owner={canArchive} />
  );

  return (
    <>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search art styles by name, medium, or prompt…"
        count={filtered.length}
        total={items.length}
        noun="art styles"
      />
      {filtered.length === 0 ? (
        <EmptyState noun="art styles" />
      ) : shelves ? (
        <ShelfSections shelves={shelves} hrefBase="/art-styles" renderCard={renderCard} />
      ) : (
        <LaneGrid items={filtered} hrefBase="/art-styles" renderCard={renderCard} />
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
