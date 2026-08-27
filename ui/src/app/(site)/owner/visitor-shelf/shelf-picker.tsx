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

  function toggle(row: ShelfRow, shown: boolean) {
    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      try {
        await setVisitorVisibility(group.entitySet, row.id, shown);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      } finally {
        setPendingId(null);
      }
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
            {group.onShelf.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 bg-card/70 px-3 py-3"
              >
                <span className="min-w-0 flex-1 text-[17px] font-medium tracking-[-0.02em]">
                  {row.name}
                </span>
                <button
                  type="button"
                  className={KX_BTN_PAPER}
                  disabled={isPending && pendingId === row.id}
                  onClick={() => toggle(row, false)}
                >
                  Remove
                </button>
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
                onClick={() => toggle(row, true)}
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
