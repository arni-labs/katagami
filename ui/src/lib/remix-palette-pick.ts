/**
 * Language-detail remix seed.
 *
 * 602e59f leftover 1: max-contrast vs landing --primary:#122A47 picks
 * Risograph #FFD400 on live Bluet (Ember stays sr-only). [teal, ember]
 * still "passes" under contrast because Ember is farther from navy than
 * teal — that fixture is not the live bind.
 *
 * The hold is Ember Signal / #C8442A, not the highest-contrast catalog
 * color. No RGB distance. default_palette_id still wins when present.
 */

const EMBER_ACCENT = "#c8442a";

export type RemixPaletteSeed = {
  id: string;
  name?: string;
  roles?: { accent?: string };
};

function accentOf(p: RemixPaletteSeed): string {
  return (p.roles?.accent ?? "").trim().toLowerCase();
}

function isEmber(p: RemixPaletteSeed): boolean {
  return accentOf(p) === EMBER_ACCENT || /ember/i.test(p.name ?? "");
}

/** First `--primary:#hex` in composition HTML (landing :root). */
export function cssPrimaryHex(html?: string): string | undefined {
  if (!html) return undefined;
  const m = html.match(/--primary\s*:\s*(#[0-9a-fA-F]{3,8})/);
  return m?.[1];
}

/** Language-page seed: default_palette_id, else Ember Signal when present. */
export function seedLanguageRemixPaletteId(
  preferredId: string | undefined,
  palettes: RemixPaletteSeed[],
): string | undefined {
  if (preferredId) {
    const hit = palettes.find((p) => p.id === preferredId);
    if (hit) return hit.id;
  }
  return palettes.find(isEmber)?.id;
}

export function pickRemixPaletteId(
  palettes: RemixPaletteSeed[],
  preferredId?: string,
  _againstHex?: string,
): string {
  const seeded = seedLanguageRemixPaletteId(preferredId, palettes);
  if (seeded) return seeded;
  if (palettes.length === 0) return "";
  if (palettes.length === 1) return palettes[0].id;
  return palettes[1].id;
}
