"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RemixPreview } from "@/components/remix/remix-preview";
import { rateRemix } from "@/app/remix-actions";
import { KX_LABEL } from "@/lib/katagami-ui";
import type { LanguageOpt, PaletteOpt, ArtOpt } from "@/components/remix/inline-remix";

export interface SavedMix {
  id: string;
  ui: string;
  palette: string;
  art: string;
  composition: string;
  rating: number;
}

export interface LoadSelection {
  langId: string;
  palId: string;
  artId: string;
  compositionKey: string;
}

const COMP_NAME: Record<string, string> = {
  "compositions.landing": "Landing",
  "compositions.dashboard": "Dashboard",
};

export function SavedMixes({
  saved,
  languages,
  palettes,
  art,
  onLoad,
}: {
  saved: SavedMix[];
  languages: LanguageOpt[];
  palettes: PaletteOpt[];
  art: ArtOpt[];
  onLoad: (sel: LoadSelection) => void;
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

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="stamp text-[var(--yuzu)]">saved</span>
        <span className={KX_LABEL}>your mixes · click one to reopen it above · rate to teach taste</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((m) => {
          const lang = languages.find((l) => l.id === m.ui);
          const pal = palettes.find((p) => p.id === m.palette);
          const a = art.find((x) => x.id === m.art);
          const url =
            m.composition === "compositions.dashboard" ? lang?.dashboardUrl ?? "" : lang?.landingUrl ?? "";
          return (
            <div key={m.id} className="sticker-card p-2.5">
              <button
                type="button"
                onClick={() => onLoad({ langId: m.ui, palId: m.palette, artId: m.art, compositionKey: m.composition })}
                title="Reopen this mix in the studio"
                className="group block w-full cursor-pointer overflow-hidden rounded-[1px] shadow-[inset_0_0_0_1px_rgba(30,35,45,0.06)]"
              >
                {lang && pal ? (
                  <div className="pointer-events-none">
                    <RemixPreview compositionUrl={url} roles={pal.roles} hero={a?.hero ?? ""} />
                  </div>
                ) : (
                  <div className="grid aspect-[16/10] place-items-center bg-muted font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    unavailable
                  </div>
                )}
              </button>
              <div className="mt-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-foreground">
                    {lang?.name ?? "—"} · {pal?.name ?? "—"}
                  </div>
                  <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {a?.name ?? "—"} · {COMP_NAME[m.composition] ?? m.composition}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
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
                <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {m.rating > 0 ? `${m.rating}/5` : "rate"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
