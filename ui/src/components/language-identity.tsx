import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  listArtStyles,
  getPaletteSystem,
  getFileUrl,
  parseJson,
  paletteCore,
  paletteDisplayName,
  artStyleDisplayName,
  type PaletteCore,
} from "@/lib/odata";

const isHex = (c?: string): c is string =>
  typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c);

const NEUTRAL_ORDER = ["bg", "surface", "text", "muted", "border"];

interface AppliedColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
  [key: string]: string | undefined;
}

/** Build a palette view from a language's OWN tokens.colors — the applied
 *  palette, used when no first-class PaletteSystem is linked yet. signature is
 *  the identity inks; neutrals the ground. */
function appliedPalette(tokensRaw?: string): PaletteCore {
  const colors = parseJson<{ colors?: AppliedColors }>(tokensRaw)?.colors ?? {};
  const signature = [colors.primary, colors.accent, colors.secondary]
    .filter(isHex)
    .map((hex) => ({ hex }));
  const neutrals: Record<string, string> = {};
  for (const [k, v] of Object.entries({
    bg: colors.background,
    surface: colors.surface,
    text: colors.text,
    muted: colors.muted,
    border: colors.border,
  }))
    if (isHex(v)) neutrals[k] = v;
  return { signature, neutrals, semantic: {}, mood: {} };
}

/**
 * The identity row — what a language is BUILT WITH: its art style and its
 * palette, surfaced right under the hero. The palette is the first-class
 * PaletteSystem linked by `default_palette_id`; until that link is stamped it
 * falls back to the language's own applied tokens.colors (same colours, so the
 * row is correct today and gains a "view palette" link once wired).
 */
export async function LanguageIdentity({
  fields,
}: {
  fields: Record<string, string | undefined>;
}) {
  const imagery =
    parseJson<{ pairs_with?: string }>(fields.imagery_direction) ?? {};
  const artSlug = fields.default_art_style_id
    ? undefined
    : imagery.pairs_with?.trim();

  const arts = await listArtStyles("Status eq 'Published'").catch(() => []);
  const art = fields.default_art_style_id
    ? arts.find((a) => a.entity_id === fields.default_art_style_id)
    : artSlug
      ? arts.find((a) => a.fields.slug === artSlug)
      : undefined;

  // The linked palette is a real PaletteSystem entity. Resolve it when present;
  // otherwise derive the applied palette from the language's own tokens.
  const linked = fields.default_palette_id
    ? await getPaletteSystem(fields.default_palette_id).catch(() => null)
    : null;
  const palette = linked
    ? {
        core: paletteCore(linked.fields),
        name: paletteDisplayName(linked.fields),
        href: `/palettes/${linked.entity_id}`,
      }
    : {
        core: appliedPalette(fields.tokens),
        name: "Applied palette",
        href: undefined as string | undefined,
      };

  const hasArt = Boolean(art);
  const hasPalette = palette.core.signature.length > 0;
  if (!hasArt && !hasPalette) return null;

  const artThumb = art?.fields.thumbnail_file_id
    ? getFileUrl(art.fields.thumbnail_file_id)
    : "";

  return (
    <section aria-label="Built with" data-reveal className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="ink-stamp shrink-0"
          style={{ ["--ink" as string]: "var(--ramune)" }}
        >
          built with
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {hasArt ? <ArtStyleCard art={art!} thumb={artThumb} /> : null}
        {hasPalette ? <PaletteStrip palette={palette} /> : null}
      </div>
    </section>
  );
}

function ArtStyleCard({
  art,
  thumb,
}: {
  art: Awaited<ReturnType<typeof listArtStyles>>[number];
  thumb: string;
}) {
  return (
    <Link
      href={`/art-styles/${art.entity_id}`}
      className="sticker-card group flex items-stretch overflow-hidden"
      style={{ ["--card-ink" as string]: "var(--matcha)" }}
    >
      <span
        className="w-28 shrink-0 bg-cover bg-center sm:w-36"
        style={
          thumb
            ? { backgroundImage: `url(${thumb})` }
            : { background: "var(--foreground)", opacity: 0.06 }
        }
        aria-hidden
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Art style
        </span>
        <span className="truncate font-display text-[18px] font-bold leading-tight tracking-[-0.015em]">
          {artStyleDisplayName(art.fields)}
        </span>
        {art.fields.medium ? (
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {art.fields.medium}
          </span>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/80 group-hover:text-foreground">
          View art style
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </span>
    </Link>
  );
}

function PaletteStrip({
  palette,
}: {
  palette: {
    core: PaletteCore;
    name: string;
    href?: string;
  };
}) {
  const { signature, neutrals, mood } = palette.core;
  const sig = signature.length ? signature : [{ hex: "#888888" }];
  const tint = sig[0].hex || "var(--teal)";
  const hasNeutrals = NEUTRAL_ORDER.some((k) => neutrals[k]);

  const body = (
    <>
      {/* SIGNATURE — the identity inks, a full-bleed band */}
      <div className="flex h-20 w-full sm:h-24">
        {sig.slice(0, 5).map((s, i) => (
          <span
            key={`${s.hex}-${i}`}
            className="h-full flex-1"
            style={{ background: s.hex }}
          />
        ))}
      </div>
      {/* NEUTRALS — the thin ground line */}
      {hasNeutrals ? (
        <div className="flex h-2.5 w-full">
          {NEUTRAL_ORDER.filter((k) => neutrals[k]).map((k) => (
            <span
              key={k}
              className="h-full flex-1"
              style={{ background: neutrals[k] }}
            />
          ))}
        </div>
      ) : null}
      <div className="flex flex-1 items-end justify-between gap-2 px-4 py-3.5">
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Palette
          </span>
          <span className="block truncate font-display text-[18px] font-bold leading-tight tracking-[-0.015em]">
            {palette.name}
          </span>
          {mood.temperature || mood.key_hue ? (
            <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/85">
              {[mood.temperature, mood.key_hue].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
        {palette.href ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/80 group-hover:text-foreground">
            View
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (palette.href) {
    return (
      <Link
        href={palette.href}
        className="sticker-card group flex flex-col overflow-hidden"
        style={{ ["--card-ink" as string]: tint }}
      >
        {body}
      </Link>
    );
  }
  return (
    <article
      className="sticker-card group flex flex-col overflow-hidden"
      style={{ ["--card-ink" as string]: tint }}
    >
      {body}
    </article>
  );
}
