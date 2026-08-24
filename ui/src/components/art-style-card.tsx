import { GalleryImage } from "@/components/gallery-image";
import { CatalogCardOwnerControls } from "@/components/catalog-card-owner-controls";
import { ArchivedStamp } from "@/components/archived-stamp";
import { ART_STYLE_CARD_SIZES, artStyleCardHero } from "@/lib/gallery-image";

export interface ArtStyleItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  medium: string;
  promptTemplate: string;
  /** Reference images — gallery cards use at most refs[0] as a thumb fallback. */
  refs: string[];
  /** Proof shots live on the detail page. Gallery items leave this empty. */
  proofs: string[];
  thumb: string;
  /** Total catalog images (hero + refs + proofs) for the footer count. */
  imageCount?: number;
  /** CDN src -> /api/file proxy fallback for published asset URLs (ARN-354). */
  imageFallbacks?: Record<string, string>;
  tags: string[];
  /** Canonical taxonomy category ids (for shelving the lane by category). */
  taxonomyIds?: string[];
}

const accentColors = [
  "var(--sakura)", "var(--yuzu)", "var(--ramune)", "var(--sumire)",
];

function hashInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ArtStyleCard({
  art,
  owner = false,
}: {
  art: ArtStyleItem;
  owner?: boolean;
}) {
  const tint = accentColors[hashInt(art.id) % accentColors.length];
  const archived = art.status === "Archived";

  // One card-sized image. The contact strip used to mount 3 extra full-size
  // proofs (32px CSS, 1024–1536px files) per card — that is what made this
  // lane feel like it was still loading while you scrolled.
  const hero = artStyleCardHero(art);
  const imageCount =
    art.imageCount ??
    new Set([hero, ...art.refs, ...art.proofs].filter(Boolean)).size;

  return (
    <article
      className={`sticker-card group/card relative flex h-full w-full flex-col overflow-hidden${archived ? " opacity-60 saturate-[0.85]" : ""}`}
      style={
        {
          background: `color-mix(in srgb, ${tint} 5%, var(--paper-tint-base))`,
          "--card-ink": tint,
        } as React.CSSProperties
      }
    >
      {archived ? <ArchivedStamp /> : null}
      {owner ? (
        <CatalogCardOwnerControls
          entitySet="ArtStyles"
          id={art.id}
          name={art.name}
          noun="art style"
          status={art.status}
        />
      ) : null}
      <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16 / 10" }}>
        {hero ? (
          <GalleryImage
            src={hero}
            fallbackSrc={art.imageFallbacks?.[hero]}
            alt={`${art.name} — hero reference`}
            sizes={ART_STYLE_CARD_SIZES}
            className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `color-mix(in srgb, ${tint} 14%, var(--card))` }} />
        )}
      </div>

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
