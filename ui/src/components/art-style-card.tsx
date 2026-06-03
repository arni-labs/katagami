export interface ArtStyleItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  medium: string;
  promptTemplate: string;
  refs: string[];
  thumb: string;
  tags: string[];
}

const accentColors = [
  "var(--sakura)", "var(--yuzu)", "var(--salad)",
  "var(--teal)", "var(--ramune)", "var(--sumire)",
];

function hashInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ArtStyleCard({ art }: { art: ArtStyleItem }) {
  const tint = accentColors[hashInt(art.id) % accentColors.length];
  const tapeRot = ((hashInt(art.slug || art.id) % 11) - 5) * 0.55 - 3;
  const hero = art.refs[0] || art.thumb || "";
  const strip = art.refs.slice(0, 5);

  return (
    <article
      className="sticker-card relative flex h-full min-h-[420px] w-full flex-col overflow-hidden"
      style={{ background: `color-mix(in srgb, ${tint} 7%, var(--paper-tint-base))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[15px] w-20 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tint} 74%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, ${tint} 36%, var(--paper-tape-mix)) 7px 14px)`,
          transform: `rotate(${tapeRot}deg)`,
        }}
      />

      {/* polaroid with the hero reference image */}
      <div className="px-4 pb-1 pt-7">
        <div
          className="relative mx-auto w-[96%] rotate-[-0.7deg] transition-transform duration-300 ease-out group-hover:rotate-0"
          style={{ transformOrigin: "center top" }}
        >
          <div className="relative border border-border bg-card p-1.5 pb-3 shadow-[0_2px_10px_rgba(30,35,45,0.09)]">
            <div className="relative w-full overflow-hidden rounded-[1px] bg-muted" style={{ aspectRatio: "3 / 2" }}>
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero} alt={`${art.name} reference`} className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `color-mix(in srgb, ${tint} 14%, var(--card))` }} />
              )}
            </div>
            {/* reference strip (the other refs) */}
            {strip.length > 1 && (
              <div className="mt-1.5 flex gap-1.5">
                {strip.slice(1, 5).map((src, i) => (
                  <div key={i} className="relative h-9 flex-1 overflow-hidden rounded-[1px] border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Art style · {art.medium || "mixed"}
        </div>
        <h3 className="font-display text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {art.name}
        </h3>
        {art.promptTemplate && (
          <p className="mt-3 line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {art.promptTemplate}
          </p>
        )}
        {art.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {art.tags.slice(0, 4).map((t, i) => (
              <span key={t} className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/85">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accentColors[(hashInt(art.id) + i) % accentColors.length] }} />
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-5">
          <div className="sticker-perforation mb-3" />
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
            Engine-agnostic recipe
            <span aria-hidden className="inline-block h-[7px] w-10 rounded-[2px]" style={{ background: tint }} />
          </span>
        </div>
      </div>
    </article>
  );
}
