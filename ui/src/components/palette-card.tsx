import { readableTextColor } from "@/lib/shadcn-export";
import { CatalogCardOwnerControls } from "@/components/catalog-card-owner-controls";
import { ArchivedStamp } from "@/components/archived-stamp";
import type { PaletteCore } from "@/lib/odata";

export interface PaletteItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  /** Flat role map — kept for catalog search by hex. */
  roles: Record<string, string>;
  /** Structured view: signature is the star; neutrals the ground; semantic the accessory. */
  core: PaletteCore;
  ramps: Record<string, Record<string, string>>;
  tags: string[];
}

const NEUTRAL_ORDER = ["bg", "surface", "text", "muted", "border"];

/**
 * Compact palette card — the colours ARE the design, so they fill the
 * card. A tall signature band (the star) sits over a thin neutrals strip;
 * a quiet footer carries the name + mood. No frame, no chrome.
 */
export function PaletteCard({
  palette,
  owner = false,
}: {
  palette: PaletteItem;
  owner?: boolean;
}) {
  const { signature, neutrals, mood } = palette.core;
  const sig = signature.length ? signature : [{ hex: "#888888", name: "—" }];
  const tint = sig[0].hex || "var(--teal)";
  const archived = palette.status === "Archived";

  return (
    <article
      className={`sticker-card group/card relative flex h-full w-full flex-col overflow-hidden${archived ? " opacity-60 saturate-[0.85]" : ""}`}
      style={{ ["--card-ink" as string]: tint }}
    >
      {archived ? <ArchivedStamp /> : null}
      {owner ? (
        <CatalogCardOwnerControls
          entitySet="PaletteSystems"
          id={palette.id}
          name={palette.name}
          noun="palette"
          status={palette.status}
        />
      ) : null}
      {/* SIGNATURE — the star, full-bleed colour band */}
      <div className="flex h-32 w-full sm:h-36">
        {sig.slice(0, 5).map((s, i) => {
          const txt = readableTextColor(s.hex, "#fff");
          return (
            <div
              key={`${s.hex}-${i}`}
              className="relative flex flex-1 items-end transition-[flex] duration-300 ease-out group-hover/card:[flex:1]"
              style={{ background: s.hex }}
            >
              <span
                className="w-full truncate px-1.5 pb-1.5 font-mono text-[8px] lowercase tracking-[0.04em] opacity-0 transition-opacity duration-200 group-hover/card:opacity-90"
                style={{ color: txt }}
              >
                {s.hex.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* NEUTRALS — the thin ground line under the signature */}
      <div className="flex h-2.5 w-full">
        {NEUTRAL_ORDER.map((k) => (
          <span
            key={k}
            className="h-full flex-1"
            style={{ background: neutrals[k] ?? "#ddd" }}
          />
        ))}
      </div>

      {/* FOOTER — quiet meta */}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
        <h3 className="font-display text-[16px] font-bold leading-tight tracking-[-0.02em] text-foreground">
          {palette.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tint }} />
            palette
          </span>
          {mood.temperature ? <span>· {mood.temperature}</span> : null}
          {mood.key_hue ? <span>· {mood.key_hue}</span> : null}
        </div>
      </div>
    </article>
  );
}
