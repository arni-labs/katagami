/**
 * Seed the language-detail remix picker. "Try a remix" must show a swap,
 * not palettes[0] when a later catalog row contrasts the landing --primary.
 * default_palette_id still wins when it is in the catalog.
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
  if (againstHex && palettes.length > 1) {
    let best = palettes[0];
    let bestD = -1;
    for (const p of palettes) {
      const d = dist2(p.roles?.accent ?? "", againstHex);
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    return best.id;
  }
  return palettes[0].id;
}
