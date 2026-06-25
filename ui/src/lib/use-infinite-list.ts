"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageResult } from "@/lib/odata";

type LoadPage<T> = (input: {
  cursor?: string | null;
  search?: string;
}) => Promise<PageResult<T>>;

/**
 * Keyset-paginated, infinite-scroll list with debounced server-side search.
 * Holds only the pages actually loaded (never the whole catalog): a sentinel
 * loads the next page as it nears the viewport, and typing resets to the query's
 * first server page.
 */
export function useInfiniteList<T>(
  initialItems: T[],
  initialCursor: string | null,
  loadPage: LoadPage<T>,
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const seq = useRef(0); // guards against out-of-order search/scroll responses
  const skipFirstSearch = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced server search → reset to the query's first page.
  useEffect(() => {
    if (skipFirstSearch.current) {
      skipFirstSearch.current = false; // the SSR first page already covers ""
      return;
    }
    const q = search.trim();
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const page = await loadPage({ search: q || undefined });
      if (mine !== seq.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    const mine = seq.current;
    setLoading(true);
    try {
      const page = await loadPage({
        cursor,
        search: search.trim() || undefined,
      });
      if (mine !== seq.current) return; // a newer search superseded this
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [loading, cursor, search, loadPage]);

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

  return { items, search, setSearch, loading, cursor, sentinelRef };
}
