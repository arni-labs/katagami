"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLanguageFeatured } from "@/app/actions";
import { KX_BTN_PAPER, KX_FIELD, KX_LABEL } from "@/lib/katagami-ui";

export type ShelfRow = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  displayOrder: number;
};

export function VisitorShelfPicker({
  featured,
  catalog,
}: {
  featured: ShelfRow[];
  catalog: ShelfRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visibleCatalog = useMemo(
    () =>
      catalog.filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.slug.toLowerCase().includes(q)
        );
      }),
    [catalog, q],
  );

  function toggle(row: ShelfRow, nextFeatured: boolean, displayOrder: number) {
    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      try {
        await setLanguageFeatured(row.id, nextFeatured, displayOrder);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function add(row: ShelfRow) {
    const nextOrder =
      featured.reduce((max, item) => Math.max(max, item.displayOrder), 0) + 1;
    toggle(row, true, nextOrder);
  }

  function remove(row: ShelfRow) {
    toggle(row, false, 0);
  }

  function move(row: ShelfRow, direction: -1 | 1) {
    const ordered = [...featured].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    const index = ordered.findIndex((item) => item.id === row.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      try {
        await setLanguageFeatured(row.id, true, swap.displayOrder);
        await setLanguageFeatured(swap.id, true, row.displayOrder);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reorder.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-[15px] text-[var(--sakura)]">{error}</p>
      ) : null}

      <section className="space-y-4">
        <p className={KX_LABEL}>
          On visitor home · {featured.length}
        </p>
        {featured.length === 0 ? (
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            Nothing is pinned. Visitors currently see an empty shelf and a
            sign-in prompt.
          </p>
        ) : (
          <ul className="space-y-2">
            {featured.map((row, index) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 bg-card/70 px-3 py-3"
              >
                <span className="min-w-0 flex-1 text-[17px] font-medium tracking-[-0.02em]">
                  {row.name}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={KX_BTN_PAPER}
                    disabled={isPending || index === 0}
                    onClick={() => move(row, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className={KX_BTN_PAPER}
                    disabled={isPending || index === featured.length - 1}
                    onClick={() => move(row, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className={KX_BTN_PAPER}
                    disabled={isPending && pendingId === row.id}
                    onClick={() => remove(row)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <p className={KX_LABEL}>Add from the published catalog</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name"
          className={`${KX_FIELD} h-11 text-[17px]`}
        />
        <ul className="space-y-2">
          {visibleCatalog.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 bg-card/50 px-3 py-3"
            >
              <span className="min-w-0 flex-1 text-[17px] tracking-[-0.02em]">
                {row.name}
              </span>
              <button
                type="button"
                className={KX_BTN_PAPER}
                disabled={isPending && pendingId === row.id}
                onClick={() => add(row)}
              >
                Add to visitor home
              </button>
            </li>
          ))}
        </ul>
        {visibleCatalog.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">
            No unpublished-to-visitors languages match that filter.
          </p>
        ) : null}
      </section>
    </div>
  );
}
