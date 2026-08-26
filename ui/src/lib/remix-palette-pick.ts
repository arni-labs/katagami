/**
 * Seed the language-detail remix picker. palettes[0] is the leftover:
 * Ember-not-first stayed in sr-only and the iframe bound teal.
 * With no default_palette_id, never seed the first catalog row when a
 * later row exists. default_palette_id still wins when it is in the catalog.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function rgb(hex: string): [number, number, number] | null {
  const raw = hex.trim();
  if (!HEX.test(raw)) return null;
  let body = raw.slice(1);
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  if (body.length === 8) body = body.slice(0, 6);
  const n = parseInt(body, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function dist2(a: string, b: string): number {
  const pa = rgb(a);
  const pb = rgb(b);
  if (!pa || !pb) return -1;
  const dr = pa[0] - pb[0];
  const dg = pa[1] - pb[1];
  const db = pa[2] - pb[2];
  return dr * dr + dg * dg + db * db;
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

  // Later rows only — palettes[0] is the leftover teal bind.
  const rest = palettes.slice(1);
  const against = againstHex?.toLowerCase();
  const pool = against
    ? rest.filter((p) => (p.roles?.accent ?? "").toLowerCase() !== against)
    : rest;
  const rows = pool.length > 0 ? pool : rest;

  if (againstHex) {
    let best = rows[0];
    let bestD = -1;
    for (const p of rows) {
      const d = dist2(p.roles?.accent ?? "", againstHex);
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    return best.id;
  }
  return rows[0].id;
}
