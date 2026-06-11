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
      className="sticker-card group/card relative flex h-full w-full flex-col overflow-hidden"
      style={
        {
          background: `color-mix(in srgb, ${tint} 5%, var(--paper-tint-base))`,
          "--card-ink": tint,
        } as React.CSSProperties
      }
    >
      {/* hero reference — edge to edge; proofs ride as a small strip in the corner */}
      <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16 / 10" }}>
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt={`${art.name} — hero reference`}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `color-mix(in srgb, ${tint} 14%, var(--card))` }} />
        )}
        {stripShots.length > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            {stripShots.slice(0, 3).map((src, i) => (
              <div key={i} className="relative h-8 w-8 shrink-0 overflow-hidden bg-muted shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${art.name} proof ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
            {overflow > 0 && (
              <span className="grid h-8 w-8 shrink-0 place-items-center bg-card/90 font-mono text-[9px] text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                +{overflow}
              </span>
            )}
          </div>
        )}
      </div>

      {/* footer — compact meta */}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 truncate font-display text-[16px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {art.name}
          </h3>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
            {imageCount} img
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tint }} />
            {art.medium || "mixed"}
          </span>
          {art.tags.slice(0, 2).map((t) => (
            <span key={t}>· {t}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
