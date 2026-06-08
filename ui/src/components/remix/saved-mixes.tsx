"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote } from "@/components/scrapbook";
import { rateRemix } from "@/app/remix-actions";

export interface SavedMix {
  id: string;
  ui: string;
  palette: string;
  art: string;
  composition: string;
  rating: number;
}

const COMP_NAME: Record<string, string> = {
  "compositions.landing": "Landing Page",
  "compositions.dashboard": "Dashboard",
};

export function SavedMixes({
  saved,
  names,
}: {
  saved: SavedMix[];
  names: { ui: Record<string, string>; palette: Record<string, string>; art: Record<string, string> };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (saved.length === 0) return null;

  function rate(id: string, n: number) {
    startTransition(async () => {
      await rateRemix(id, n);
      router.refresh();
    });
  }
  const nm = (map: Record<string, string>, id: string) => map[id] ?? id.slice(0, 8);

  return (
    <StickyNote tint="yuzu" className="p-4">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Saved mixes · rate to build the compatibility signal
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {saved.map((m) => (
          <div key={m.id} className="bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))] px-3.5 py-3">
            <div className="text-[13px] text-foreground">
              {nm(names.ui, m.ui)} · {nm(names.palette, m.palette)} · {nm(names.art, m.art)}
            </div>
            <div className="mb-2 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {COMP_NAME[m.composition] ?? m.composition}
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => rate(m.id, n)}
                  disabled={pending}
                  aria-label={`Rate ${n} of 5`}
                  className="h-3.5 w-3.5 rounded-[1px] border transition-colors disabled:cursor-default"
                  style={{
                    background: n <= m.rating ? "var(--foreground)" : "transparent",
                    borderColor:
                      n <= m.rating
                        ? "var(--foreground)"
                        : "color-mix(in srgb, var(--foreground) 22%, transparent)",
                  }}
                />
              ))}
              <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {m.rating > 0 ? `${m.rating}/5` : "rate"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </StickyNote>
  );
}
