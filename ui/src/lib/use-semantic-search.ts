"use client";

import { useEffect, useRef, useState } from "react";

type SemanticLoader<T> = (input: { query: string }) => Promise<T[]>;

/**
 * Debounced "search by meaning" (ARN-244). Mirrors `useInfiniteList`'s
 * out-of-order guard, but the result is one ranked set (no keyset cursor): the
 * kernel already ordered by relevance and bounded by `k`. Disabled or empty
 * query → empty results, so the caller falls back to the browse/keyword view.
 */
export function useSemanticSearch<T>(
  loader: SemanticLoader<T>,
  query: string,
  enabled: boolean,
): { results: T[]; loading: boolean; failed: boolean } {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  // ARN-354 launch fix: a rejected action (search infrastructure down) must
  // render differently from a genuine zero-hit answer — the old catch->[]
  // made a production outage read as "Nothing found".
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || !q) {
      // A newer intent (mode off / cleared query) supersedes any inflight run.
      seq.current += 1;
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = await loader({ query: q });
        if (mine !== seq.current) return;
        setResults(items);
        setFailed(false);
      } catch {
        if (mine === seq.current) {
          setResults([]);
          setFailed(true);
        }
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [loader, query, enabled]);

  return { results, loading, failed };
}
