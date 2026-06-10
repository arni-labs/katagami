export interface ArtStyleItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  medium: string;
  promptTemplate: string;
  /** Reference images — refs[0] is the wide hero (the establishing shot). */
  refs: string[];
  /** Proof shots: the same subjects rendered in-style (portrait/object/scene). */
  proofs: string[];
  thumb: string;
  tags: string[];
}

const accentColors = [
  "var(--sakura)", "var(--yuzu)", "var(--salad)",
  "var(--teal)", "var(--ramune)", "var(--sumire)",
];

const STRIP_MAX = 4;

function hashInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ArtStyleCard({ art }: { art: ArtStyleItem }) {
  const tint = accentColors[hashInt(art.id) % accentColors.length];
  const tapeRot = ((hashInt(art.slug || art.id) % 11) - 5) * 0.55 - 3;

  // A wide hero (the establishing shot) leads; the proof shots read as a tidy
  // contact strip of fixed-size squares (never a stretched orphan). Falls back
  // to extra references if no separate proof shots were attached.
  const hero = art.refs[0] || art.thumb || "";
  const strip = (art.proofs.length ? art.proofs : art.refs.slice(1)).filter(
    (s) => s && s !== hero,
  );
  const imageCount = new Set([hero, ...strip].filter(Boolean)).size;
  const stripShots = strip.slice(0, STRIP_MAX);
  const overflow = strip.length - stripShots.length;

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
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[15px] w-20 rounded-[1px] opacity-75"
        style={{
          background: tint,
          mixBlendMode: "var(--ink-blend)" as never,
          transform: `rotate(${tapeRot}deg)`,
        }}
      />

      {/* polaroid: wide hero + a tidy contact strip of the remaining shots */}
      <div className="px-4 pb-1 pt-7">
        <div
          className="relative mx-auto w-[96%] rotate-[-0.7deg] transition-transform duration-300 ease-out group-hover:rotate-0"
          style={{ transformOrigin: "center top" }}
        >
          <div
            className="relative bg-card p-1.5 pb-3"
            style={{
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="relative w-full overflow-hidden rounded-[1px] bg-muted" style={{ aspectRatio: "16 / 9" }}>
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero} alt={`${art.name} — hero reference`} className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `color-mix(in srgb, ${tint} 14%, var(--card))` }} />
              )}
              <span className="absolute left-1.5 top-1.5 rounded-[1px] bg-card/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                hero
              </span>
            </div>
            {stripShots.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {stripShots.map((src, i) => (
                  <div key={i} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[1px] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${art.name} proof ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
                {overflow > 0 && (
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[1px] font-mono text-[10px]"
                    style={{
                      background: `color-mix(in srgb, ${tint} 14%, var(--paper-stamp-mix))`,
                      color: `color-mix(in oklch, ${tint} 72%, var(--foreground))`,
                    }}
                  >
                    +{overflow}
                  </span>
                )}
                <span className="ml-auto pr-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  proofs
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tint }} />
          {art.medium || "mixed"} · {imageCount} image{imageCount === 1 ? "" : "s"}
        </div>
        <h3 className="font-display text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {art.name}
        </h3>
        {art.promptTemplate && (
          <p className="mt-3 line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
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
