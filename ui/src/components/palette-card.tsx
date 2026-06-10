import { readableTextColor } from "@/lib/shadcn-export";
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
const SEMANTIC_ORDER = ["success", "warning", "error", "info"];

function hashInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function PaletteCard({ palette }: { palette: PaletteItem }) {
  const { signature, neutrals, semantic, mood } = palette.core;
  const sig = signature.length ? signature : [{ hex: "#888888", name: "—" }];
  const primary = sig[0];
  const tint = primary.hex || "var(--teal)";
  const tapeRot = ((hashInt(palette.id) % 11) - 5) * 0.55 - 3;
  const semanticEntries = SEMANTIC_ORDER.map((k) => [k, semantic[k]] as const).filter(
    ([, v]) => Boolean(v),
  );

  return (
    <article
      className="sticker-card relative flex h-full min-h-[420px] w-full flex-col overflow-hidden"
      style={
        {
          background: `color-mix(in srgb, ${tint} 7%, var(--paper-tint-base))`,
          "--card-ink": tint,
        } as React.CSSProperties
      }
    >
      {/* ink strip */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[15px] w-20 rounded-[1px] opacity-75"
        style={{
          background: tint,
          mixBlendMode: "var(--ink-blend)" as never,
          transform: `rotate(${tapeRot}deg) skewX(-8deg)`,
        }}
      />

      {/* polaroid: signature (star) → neutrals (ground) → semantic (accessory) */}
      <div className="px-4 pb-1 pt-7">
        <div
          className="relative mx-auto w-[96%] rotate-[-0.7deg] transition-transform duration-300 ease-out group-hover:rotate-0"
          style={{ transformOrigin: "center top" }}
        >
          <div
            className="relative bg-card p-1.5 pb-2.5"
            style={{
              boxShadow: `0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, ${tint} 20%, transparent)`,
            }}
          >
            {/* SIGNATURE — large, leads the card */}
            <div className="flex overflow-hidden rounded-[1px]" style={{ height: 96 }}>
              {sig.slice(0, 4).map((s, i) => {
                const txt = readableTextColor(s.hex, "#fff");
                return (
                  <div
                    key={`${s.hex}-${i}`}
                    className="relative flex flex-1 flex-col justify-between p-1.5"
                    style={{ background: s.hex }}
                  >
                    {i === 0 && (
                      <span
                        className="font-mono text-[7px] uppercase tracking-[0.18em] opacity-80"
                        style={{ color: txt }}
                      >
                        signature
                      </span>
                    )}
                    <span
                      className="truncate font-mono text-[8px] lowercase tracking-[0.04em]"
                      style={{ color: txt }}
                    >
                      {(s.name ? `${s.name} ` : "") + s.hex.toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* NEUTRALS — the ground */}
            <div className="mt-1.5 flex overflow-hidden rounded-[1px]" style={{ height: 26 }}>
              {NEUTRAL_ORDER.map((k) => {
                const c = neutrals[k] ?? "#ddd";
                return (
                  <div key={k} className="relative flex flex-1 items-end" style={{ background: c }}>
                    <span
                      className="w-full truncate px-1 pb-0.5 font-mono text-[6.5px] uppercase tracking-[0.06em]"
                      style={{ color: readableTextColor(c, "#fff") }}
                    >
                      {k}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* SEMANTIC — small functional accessory */}
            {semanticEntries.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  semantic
                </span>
                <div className="flex flex-1 gap-1">
                  {semanticEntries.map(([k, v]) => (
                    <span
                      key={k}
                      title={k}
                      className="h-2 flex-1 rounded-[1px]"
                      style={{ background: v as string }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tint }} />
          Palette{mood.key_hue ? ` · ${mood.key_hue}` : ""}
          {mood.temperature ? ` · ${mood.temperature}` : ""}
        </div>
        <h3 className="font-display text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {palette.name}
        </h3>
        {mood.summary && (
          <p className="mt-2 line-clamp-2 text-[13px] italic leading-relaxed text-muted-foreground">
            {mood.summary}
          </p>
        )}
        {palette.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {palette.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/85"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tint }} />
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-5">
          <div className="sticker-perforation mb-3" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {sig.slice(0, 3).map((s, i) => (
              <span key={`${s.hex}-${i}`} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-[1px]"
                  style={{ background: s.hex }}
                />
                <span className="font-mono text-[10px] lowercase text-muted-foreground/80">
                  {s.hex.toLowerCase()}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
