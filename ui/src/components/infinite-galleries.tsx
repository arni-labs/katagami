"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useInfiniteList } from "@/lib/use-infinite-list";
import { useSemanticSearch } from "@/lib/use-semantic-search";
import {
  loadArtStylePage,
  loadLanguagePage,
  loadPalettePage,
  searchArtStylesByMeaning,
  searchLanguagesByMeaning,
  searchPalettesByMeaning,
} from "@/app/(site)/gallery-actions";
import { LanguageCard } from "@/components/language-card";
import { PaletteCard, type PaletteItem } from "@/components/palette-card";
import { ArtStyleCard, type ArtStyleItem } from "@/components/art-style-card";
import { KX_FIELD } from "@/lib/katagami-ui";
import type { DesignLanguage } from "@/lib/odata";

// Matches the lane catalog: paint-cull each card, same grid as the shelved view.
const CARD_CV: CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "auto 220px",
};
const LANE_GRID =
  "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";

export type SearchMode = "keyword" | "meaning";

/** keyword ↔ meaning switch. keyword matches names/tags (substring); meaning
 *  ranks by the taste vectors (ARN-244). No borders — active state is a filled
 *  chip, matching the hue/family controls in this file. */
function SearchModeToggle({
  mode,
  setMode,
}: {
  mode: SearchMode;
  setMode: (m: SearchMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Search mode"
    >
      {(["keyword", "meaning"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          data-on={mode === m}
          aria-pressed={mode === m}
          title={
            m === "meaning"
              ? "Rank by meaning — describe the vibe, not the name"
              : "Match names and tags"
          }
          className="rounded-none px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground data-[on=true]:bg-foreground data-[on=true]:text-background"
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function InfiniteShell({
  search,
  setSearch,
  placeholder,
  meaningPlaceholder,
  mode,
  setMode,
  toolbar,
  loading,
  exhausted,
  empty,
  sentinelRef,
  children,
}: {
  search: string;
  setSearch: (v: string) => void;
  placeholder: string;
  /** Placeholder shown in meaning mode; falls back to `placeholder`. */
  meaningPlaceholder?: string;
  mode: SearchMode;
  setMode: (m: SearchMode) => void;
  toolbar?: ReactNode;
  loading: boolean;
  exhausted: boolean;
  empty: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const meaning = mode === "meaning";
  const field = meaning ? (meaningPlaceholder ?? placeholder) : placeholder;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm sm:w-72">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={field}
              aria-label={field}
              className={`${KX_FIELD} h-9 pl-7`}
            />
          </div>
          <SearchModeToggle mode={mode} setMode={setMode} />
        </div>
        {toolbar}
      </div>

      {meaning && search.trim() !== "" && !empty ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          ranked by meaning
        </p>
      ) : null}

      {empty && !loading ? (
        <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
          Nothing found.
          <div className="mt-1 font-mono text-[11px]">
            {meaning
              ? "try describing the vibe differently"
              : "try a different search"}
          </div>
        </div>
      ) : (
        children
      )}

      {!exhausted ? <div ref={sentinelRef} aria-hidden className="h-8" /> : null}
      {loading ? (
        <div className="py-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {meaning ? "ranking…" : "loading…"}
        </div>
      ) : null}
    </div>
  );
}

// Owner-pinned picks lead the lane (and are de-duped from the scrolling grid).
// They're hidden while searching — a search shows just its matches.
function CuratorsPicks({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--yuzu)]">
        Curator&rsquo;s picks
      </p>
      {children}
    </section>
  );
}

const LANGUAGE_GRID = "grid gap-7 sm:grid-cols-2 lg:grid-cols-3";

// The 9 hue_bucket facets, each with a representative ink. Toggling one filters
// server-side (hue_bucket eq …), AND-composed with search + the keyset cursor.
const HUE_SWATCHES: [string, string][] = [
  ["red", "#e5484d"],
  ["orange", "#f76b15"],
  ["yellow", "#f5c000"],
  ["green", "#30a46c"],
  ["teal", "#12a594"],
  ["blue", "#3b82f6"],
  ["violet", "#8b5cf6"],
  ["pink", "#e93d82"],
  ["neutral", "#9ba1a6"],
];

function HueBar({
  active,
  onPick,
}: {
  active?: string;
  onPick: (h?: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        color
      </span>
      {HUE_SWATCHES.map(([bucket, color]) => (
        <button
          key={bucket}
          type="button"
          onClick={() => onPick(bucket)}
          data-on={active === bucket}
          aria-pressed={active === bucket}
          title={bucket}
          className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] data-[on=true]:bg-foreground data-[on=true]:text-background"
        >
          <span
            aria-hidden
            className="h-3.5 w-3.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]"
            style={{ background: color }}
          />
          <span className="font-mono text-[10px] lowercase tracking-[0.02em]">
            {bucket}
          </span>
        </button>
      ))}
      {active ? (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          clear
        </button>
      ) : null}
    </div>
  );
}

// Filter by taxonomy family (family_id eq …). Only the families actually present
// in the catalog are listed (with counts), server-side filtered.
function FamilySelect({
  families,
  active,
  onPick,
}: {
  families: { id: string; name: string; count: number }[];
  active?: string;
  onPick: (id?: string) => void;
}) {
  if (families.length === 0) return null;
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        family
      </span>
      <select
        value={active ?? ""}
        onChange={(e) => onPick(e.target.value || undefined)}
        aria-label="Filter by family"
        className={`${KX_FIELD} h-8 max-w-[11rem] cursor-pointer pr-5 text-[12px]`}
      >
        <option value="">all families</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.count})
          </option>
        ))}
      </select>
    </label>
  );
}

export function InfiniteLanguages({
  featured = [],
  families = [],
  initialItems,
  initialCursor,
  canDelete = false,
}: {
  featured?: DesignLanguage[];
  families?: { id: string; name: string; count: number }[];
  initialItems: DesignLanguage[];
  initialCursor: string | null;
  canDelete?: boolean;
}) {
  const {
    items,
    search,
    setSearch,
    facets,
    setFacet,
    loading,
    cursor,
    sentinelRef,
  } = useInfiniteList<DesignLanguage>(
    initialItems,
    initialCursor,
    loadLanguagePage,
  );
  const [mode, setMode] = useState<SearchMode>("keyword");
  const sem = useSemanticSearch<DesignLanguage>(
    searchLanguagesByMeaning,
    search,
    mode === "meaning",
  );
  const querying = search.trim() !== "";
  const meaningActive = mode === "meaning" && querying;
  // Curator's picks lead only the unfiltered keyword browse view. Facets and
  // meaning-ranking don't compose in v1, so meaning mode hides the facet bar.
  const keywordFiltering = querying || !!facets.hue || !!facets.family;
  const browsing = !meaningActive && !keywordFiltering && featured.length > 0;
  const pinnedIds = new Set(featured.map((f) => f.entity_id));
  const keywordGrid = browsing
    ? items.filter((l) => !pinnedIds.has(l.entity_id))
    : items;
  const gridItems = meaningActive ? sem.results : keywordGrid;
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search languages…"
      meaningPlaceholder="Describe a vibe — “warm editorial serif”"
      mode={mode}
      setMode={setMode}
      toolbar={
        mode === "meaning" ? null : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <HueBar active={facets.hue} onPick={(h) => setFacet("hue", h)} />
            <FamilySelect
              families={families}
              active={facets.family}
              onPick={(id) => setFacet("family", id)}
            />
          </div>
        )
      }
      loading={meaningActive ? sem.loading : loading}
      exhausted={meaningActive ? true : cursor === null}
      empty={
        meaningActive
          ? sem.results.length === 0
          : (browsing ? featured.length : 0) + keywordGrid.length === 0
      }
      sentinelRef={sentinelRef}
    >
      {browsing ? (
        <CuratorsPicks>
          <div className={LANGUAGE_GRID}>
            {featured.map((l, i) => (
              <div key={l.entity_id} style={CARD_CV}>
                <LanguageCard lang={l} index={i} canDelete={canDelete} />
              </div>
            ))}
          </div>
        </CuratorsPicks>
      ) : null}
      <div className={LANGUAGE_GRID}>
        {gridItems.map((l, i) => (
          <div key={l.entity_id} style={CARD_CV}>
            <LanguageCard lang={l} index={i} canDelete={canDelete} />
          </div>
        ))}
      </div>
    </InfiniteShell>
  );
}

function PaletteGrid({
  items,
  canArchive,
}: {
  items: PaletteItem[];
  canArchive: boolean;
}) {
  return (
    <div className={LANE_GRID}>
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/palettes/${p.id}`}
          prefetch={false}
          className="group block min-w-0"
          style={CARD_CV}
        >
          <PaletteCard palette={p} owner={canArchive} />
        </Link>
      ))}
    </div>
  );
}

export function InfinitePalettes({
  featured = [],
  initialItems,
  initialCursor,
  canArchive = false,
}: {
  featured?: PaletteItem[];
  initialItems: PaletteItem[];
  initialCursor: string | null;
  canArchive?: boolean;
}) {
  const { items, search, setSearch, loading, cursor, sentinelRef } =
    useInfiniteList<PaletteItem>(initialItems, initialCursor, loadPalettePage);
  const [mode, setMode] = useState<SearchMode>("keyword");
  const sem = useSemanticSearch<PaletteItem>(
    searchPalettesByMeaning,
    search,
    mode === "meaning",
  );
  const querying = search.trim() !== "";
  const meaningActive = mode === "meaning" && querying;
  const browsing = !meaningActive && !querying && featured.length > 0;
  const pinnedIds = new Set(featured.map((f) => f.id));
  const keywordGrid = browsing
    ? items.filter((p) => !pinnedIds.has(p.id))
    : items;
  const gridItems = meaningActive ? sem.results : keywordGrid;
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search palettes by name or tag…"
      meaningPlaceholder="Describe a mood — “warm earthy retro”"
      mode={mode}
      setMode={setMode}
      loading={meaningActive ? sem.loading : loading}
      exhausted={meaningActive ? true : cursor === null}
      empty={
        meaningActive
          ? sem.results.length === 0
          : (browsing ? featured.length : 0) + keywordGrid.length === 0
      }
      sentinelRef={sentinelRef}
    >
      {browsing ? (
        <CuratorsPicks>
          <PaletteGrid items={featured} canArchive={canArchive} />
        </CuratorsPicks>
      ) : null}
      <PaletteGrid items={gridItems} canArchive={canArchive} />
    </InfiniteShell>
  );
}

export function InfiniteArtStyles({
  initialItems,
  initialCursor,
  canArchive = false,
}: {
  initialItems: ArtStyleItem[];
  initialCursor: string | null;
  canArchive?: boolean;
}) {
  const { items, search, setSearch, loading, cursor, sentinelRef } =
    useInfiniteList<ArtStyleItem>(initialItems, initialCursor, loadArtStylePage);
  const [mode, setMode] = useState<SearchMode>("keyword");
  const sem = useSemanticSearch<ArtStyleItem>(
    searchArtStylesByMeaning,
    search,
    mode === "meaning",
  );
  const meaningActive = mode === "meaning" && search.trim() !== "";
  const gridItems = meaningActive ? sem.results : items;
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search art styles by name or tag…"
      meaningPlaceholder="Describe a look — “hand-drawn watercolor”"
      mode={mode}
      setMode={setMode}
      loading={meaningActive ? sem.loading : loading}
      exhausted={meaningActive ? true : cursor === null}
      empty={meaningActive ? sem.results.length === 0 : items.length === 0}
      sentinelRef={sentinelRef}
    >
      <div className={LANE_GRID}>
        {gridItems.map((a) => (
          <Link
            key={a.id}
            href={`/art-styles/${a.id}`}
            prefetch={false}
            className="group block min-w-0"
            style={CARD_CV}
          >
            <ArtStyleCard art={a} owner={canArchive} />
          </Link>
        ))}
      </div>
    </InfiniteShell>
  );
}
