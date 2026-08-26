/**
 * Language-detail remix seed.
 *
 * Live Bluet has no default_palette_id. The hold is Ember Signal
 * (en-019ef0b7-1852-7612-83a3-242e131fb573, #C8442A), not max-contrast
 * against landing --primary:#122A47. Contrast over palettes.slice(1) on
 * the 424-row catalog picks Risograph #FFD400 and leaves Ember sr-only.
 *
 * [other, ember] still passes under contrast — that fixture is not the
 * live bind. Prefer Ember by id, then name, then accent. default_palette_id
 * still wins when it is in the catalog.
 */

export const EMBER_SIGNAL_ID = "en-019ef0b7-1852-7612-83a3-242e131fb573";
export const EMBER_SIGNAL_ACCENT = "#c8442a";

export type RemixPaletteSeed = {
  id: string;
  name?: string;
  roles?: { accent?: string };
};

function accentOf(p: RemixPaletteSeed): string {
  return (p.roles?.accent ?? "").trim().toLowerCase();
}

export function isEmberSignal(p: RemixPaletteSeed): boolean {
  if (p.id === EMBER_SIGNAL_ID) return true;
  if (accentOf(p) === EMBER_SIGNAL_ACCENT) return true;
  return /ember/i.test(p.name ?? "");
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
  return palettes.find(isEmberSignal)?.id;
}

export function pickRemixPaletteId(
  palettes: RemixPaletteSeed[],
  preferredId?: string,
  _againstHex?: string,
): string {
  if (preferredId) {
    const hit = palettes.find((p) => p.id === preferredId);
    if (hit) return hit.id;
  }
  const ember = palettes.find(isEmberSignal);
  if (ember) return ember.id;
  if (palettes.length === 0) return "";
  if (palettes.length === 1) return palettes[0].id;
  return palettes[1].id;
}
