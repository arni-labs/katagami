import { readableTextColor } from "@/lib/shadcn-export";

export interface PaletteItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  roles: Record<string, string>;
  ramps: Record<string, Record<string, string>>;
  tags: string[];
}

const ROLE_ORDER = [
  "bg", "surface", "text", "muted", "border",
  "accent", "success", "warning", "error", "info",
];

function hashInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function PaletteCard({ palette }: { palette: PaletteItem }) {
  const roles = palette.roles ?? {};
  const strip = [roles.accent, roles.success, roles.info, roles.warning, roles.error]
    .filter(Boolean) as string[];
  const tint = roles.accent ?? "var(--teal)";
  const accentRamp = palette.ramps?.accent ? Object.values(palette.ramps.accent) : [];
  const tapeRot = ((hashInt(palette.id) % 11) - 5) * 0.55 - 3;

  return (
    <article
      className="sticker-card relative flex h-full min-h-[420px] w-full flex-col overflow-hidden"
      style={{ background: `color-mix(in srgb, ${tint} 7%, var(--paper-tint-base))` }}
    >
      {/* role color strip */}
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 flex h-[6px] overflow-hidden">
        {(strip.length ? strip : [tint]).slice(0, 5).map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </div>

      {/* washi tape */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[15px] w-20 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tint} 74%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, ${tint} 36%, var(--paper-tape-mix)) 7px 14px)`,
          transform: `rotate(${tapeRot}deg)`,
        }}
      />

      {/* polaroid: swatch grid + ramp */}
      <div className="px-4 pb-1 pt-7">
        <div
          className="relative mx-auto w-[96%] rotate-[-0.7deg] transition-transform duration-300 ease-out group-hover:rotate-0"
          style={{ transformOrigin: "center top" }}
        >
          <div className="relative border border-border bg-card p-1.5 pb-3 shadow-[0_2px_10px_rgba(30,35,45,0.09)]">
            <div className="grid grid-cols-5 overflow-hidden rounded-[1px]" style={{ aspectRatio: "3 / 2" }}>
              {ROLE_ORDER.map((key) => {
                const c = roles[key] ?? "#ddd";
                return (
                  <div key={key} className="relative flex items-end" style={{ background: c }}>
                    <span
                      className="w-full truncate px-1 pb-0.5 font-mono text-[7px] uppercase tracking-[0.08em]"
                      style={{ color: readableTextColor(c, "#fff") }}
                    >
                      {key}
                    </span>
                  </div>
                );
              })}
            </div>
            {accentRamp.length > 0 && (
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-[1px]">
                {accentRamp.map((c, i) => (
                  <span key={i} className="h-full flex-1" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Palette · {Object.keys(roles).length} roles
        </div>
        <h3 className="font-display text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {palette.name}
        </h3>
        {palette.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {palette.tags.slice(0, 4).map((t, i) => (
              <span key={t} className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/85">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: strip[i % Math.max(strip.length, 1)] ?? tint }} />
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-5">
          <div className="sticker-perforation mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {ROLE_ORDER.slice(0, 6).map((k) => (
              <span key={k} className="font-mono text-[10px] text-muted-foreground/80">
                {(roles[k] ?? "").toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
