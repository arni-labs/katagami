"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useInfiniteList } from "@/lib/use-infinite-list";
import {
  loadArtStylePage,
  loadLanguagePage,
  loadPalettePage,
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

function InfiniteShell({
  search,
  setSearch,
  placeholder,
  loading,
  exhausted,
  empty,
  sentinelRef,
  children,
}: {
  search: string;
  setSearch: (v: string) => void;
  placeholder: string;
  loading: boolean;
  exhausted: boolean;
  empty: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${KX_FIELD} h-9 pl-7`}
        />
      </div>

      {empty && !loading ? (
        <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
          Nothing found.
          <div className="mt-1 font-mono text-[11px]">try a different search</div>
        </div>
      ) : (
        children
      )}

      {!exhausted ? <div ref={sentinelRef} aria-hidden className="h-8" /> : null}
      {loading ? (
        <div className="py-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          loading…
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

export function InfiniteLanguages({
  featured = [],
  initialItems,
  initialCursor,
  canDelete = false,
}: {
  featured?: DesignLanguage[];
  initialItems: DesignLanguage[];
  initialCursor: string | null;
  canDelete?: boolean;
}) {
  const { items, search, setSearch, loading, cursor, sentinelRef } =
    useInfiniteList<DesignLanguage>(initialItems, initialCursor, loadLanguagePage);
  const browsing = search.trim() === "" && featured.length > 0;
  const pinnedIds = new Set(featured.map((f) => f.entity_id));
  const gridItems = browsing
    ? items.filter((l) => !pinnedIds.has(l.entity_id))
    : items;
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search languages by name or tag…"
      loading={loading}
      exhausted={cursor === null}
      empty={(browsing ? featured.length : 0) + gridItems.length === 0}
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
  const browsing = search.trim() === "" && featured.length > 0;
  const pinnedIds = new Set(featured.map((f) => f.id));
  const gridItems = browsing ? items.filter((p) => !pinnedIds.has(p.id)) : items;
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search palettes by name or tag…"
      loading={loading}
      exhausted={cursor === null}
      empty={(browsing ? featured.length : 0) + gridItems.length === 0}
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
  return (
    <InfiniteShell
      search={search}
      setSearch={setSearch}
      placeholder="Search art styles by name or tag…"
      loading={loading}
      exhausted={cursor === null}
      empty={items.length === 0}
      sentinelRef={sentinelRef}
    >
      <div className={LANE_GRID}>
        {items.map((a) => (
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
