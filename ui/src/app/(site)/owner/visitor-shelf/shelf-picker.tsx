"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVisitorVisibility } from "@/app/actions";
import { KX_BTN_PAPER, KX_FIELD, KX_LABEL } from "@/lib/katagami-ui";

export type VisitorEntitySet = "DesignLanguages" | "PaletteSystems" | "ArtStyles";

export type ShelfRow = {
  id: string;
  name: string;
  slug: string;
  /** Shelf position (visitor_order — lower comes first). Drives the Up/Down
   *  reorder. Independent of the featured lead's display_order. */
  visitorOrder: number;
};

export type ShelfGroup = {
  entitySet: VisitorEntitySet;
  /** Section heading, e.g. "Design languages". */
  label: string;
  /** Currently on the visitor shelf (shown_to_visitors). */
  onShelf: ShelfRow[];
  /** Published but off the shelf — the add-from pool. */
  catalog: ShelfRow[];
};

export function VisitorShelfPicker({ groups }: { groups: ShelfGroup[] }) {
  return (
    <div className="space-y-14">
      {groups.map((group) => (
        <ShelfSection key={group.entitySet} group={group} />
      ))}
    </div>
  );
}

function ShelfSection({ group }: { group: ShelfGroup }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visibleCatalog = useMemo(
    () =>
      group.catalog.filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.slug.toLowerCase().includes(q)
        );
      }),
    [group.catalog, q],
  );

  /** Run one shelf mutation with shared pending/error handling. */
  function run(id: string, mutate: () => Promise<void>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await mutate();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      } finally {
        setPendingId(null);
      }
    });
  }

  /** Add to the shelf at the end: give it the next visitor_order so it lands
   *  after everything already there. */
  function add(row: ShelfRow) {
    const nextOrder =
      group.onShelf.reduce(
        (max, item) => Math.max(max, item.visitorOrder),
        0,
      ) + 1;
    run(row.id, () =>
      setVisitorVisibility(group.entitySet, row.id, true, nextOrder),
    );
  }

  /** Remove from the shelf. Omit the order — position is moot once off the
   *  shelf, and omitting it leaves visitor_order untouched. */
  function remove(row: ShelfRow) {
    run(row.id, () => setVisitorVisibility(group.entitySet, row.id, false));
  }

  /** Move one item up (-1) or down (1) by swapping its visitor_order with the
   *  neighbor it steps past. Two SetVisitorVisibility writes, both shown=true —
   *  featured / SetFeatured / display_order is never touched. */
  function move(row: ShelfRow, direction: -1 | 1) {
    const ordered = [...group.onShelf].sort(
      (a, b) => a.visitorOrder - b.visitorOrder,
    );
    const index = ordered.findIndex((item) => item.id === row.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    run(row.id, async () => {
      await setVisitorVisibility(
        group.entitySet,
        row.id,
        true,
        swap.visitorOrder,
      );
      await setVisitorVisibility(
        group.entitySet,
        swap.id,
        true,
        row.visitorOrder,
      );
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">
        {group.label}
      </h2>

      {error ? (
        <p className="text-[15px] text-[var(--sakura)]">{error}</p>
      ) : null}

      <section className="space-y-4">
        <p className={KX_LABEL}>
          On visitor home · {group.onShelf.length}
        </p>
        {group.onShelf.length === 0 ? (
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            Nothing is on the shelf. Visitors currently see an empty shelf and a
            sign-in prompt.
          </p>
        ) : (
          <ul className="space-y-2">
            {group.onShelf.map((row, index) => (
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
                    disabled={isPending || index === group.onShelf.length - 1}
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
            Nothing off the shelf matches that filter.
          </p>
        ) : null}
      </section>
    </div>
  );
}
