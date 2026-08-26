/**
 * Seed the language-detail remix picker.
 *
 * palettes[0] is leftover teal. RGB contrast-max is leftover yellow
 * (#FFD400 / Risograph Pull on live Bluet) — Ember stayed in sr-only.
 * With no default_palette_id, never seed the first catalog row when a
 * later row exists. Prefer a later Ember accent (#C8442A) when present.
 * default_palette_id still wins when it is in the catalog.
 */

const EMBER_ACCENT = "#c8442a";

function accentOf(p: { roles?: { accent?: string } }): string {
  return (p.roles?.accent ?? "").trim().toLowerCase();
}

/** First `--primary:#hex` in composition HTML (landing :root). */
export function cssPrimaryHex(html?: string): string | undefined {
  if (!html) return undefined;
  const m = html.match(/--primary\s*:\s*(#[0-9a-fA-F]{3,8})/);
  return m?.[1];
}

export function pickRemixPaletteId(
  palettes: Array<{ id: string; roles?: { accent?: string } }>,
  preferredId?: string,
  againstHex?: string,
): string {
  if (preferredId) {
    const hit = palettes.find((p) => p.id === preferredId);
    if (hit) return hit.id;
  }
  if (palettes.length === 0) return "";
  if (palettes.length === 1) return palettes[0].id;

  const rest = palettes.slice(1);
  const against = againstHex?.trim().toLowerCase();
  const pool = against
    ? rest.filter((p) => accentOf(p) !== against)
    : rest;
  const rows = pool.length > 0 ? pool : rest;

  const ember = rows.find((p) => accentOf(p) === EMBER_ACCENT);
  if (ember) return ember.id;
  return rows[0].id;
}
