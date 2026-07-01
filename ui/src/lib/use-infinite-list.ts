"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageResult } from "@/lib/odata";

export type Facets = { hue?: string; family?: string };

type LoadPage<T> = (input: {
  cursor?: string | null;
  search?: string;
  hue?: string;
  family?: string;
}) => Promise<PageResult<T>>;

/**
 * Keyset-paginated, infinite-scroll list with server-side search + facets
 * (hue/family). Holds only the pages actually loaded (never the whole catalog):
 * a sentinel loads the next page as it nears the viewport; typing or toggling a
 * facet resets to the query's first server page. Every clause AND-composes with
 * the keyset cursor server-side.
 */
export function useInfiniteList<T>(
  initialItems: T[],
  initialCursor: string | null,
  loadPage: LoadPage<T>,
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [search, setSearch] = useState("");
  const [facets, setFacets] = useState<Facets>({});
  const [loading, setLoading] = useState(false);
  const seq = useRef(0); // guards against out-of-order responses
  const skipFirst = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const paramsFor = useCallback(
    () => ({
      search: search.trim() || undefined,
      hue: facets.hue,
      family: facets.family,
    }),
    [search, facets],
  );

  // Toggle a facet (click same value again to clear it).
  const setFacet = useCallback((key: keyof Facets, value?: string) => {
    setFacets((prev) => {
      const next = { ...prev };
      if (!value || prev[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  // Any query change (search debounced, facets effectively immediate) → reset to
  // the first page for the new query.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the SSR first page already covers the empty query
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const page = await loadPage(paramsFor());
      if (mine !== seq.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, facets, loadPage, paramsFor]);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    const mine = seq.current;
    setLoading(true);
    try {
      const page = await loadPage({ cursor, ...paramsFor() });
      if (mine !== seq.current) return; // a newer query superseded this
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [loading, cursor, loadPage, paramsFor]);

  // Infinite scroll: fetch the next page when the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || cursor === null) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, cursor]);

  return { items, search, setSearch, facets, setFacet, loading, cursor, sentinelRef };
}
