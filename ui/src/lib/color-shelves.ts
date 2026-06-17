/**
 * Color-mood shelves — the self-organizing "cabinet" the home gallery and the
 * palette lane both use. An item's shelf is computed from its OWN colors (a
 * dark ground → night stock, a vivid primary → loud inks, etc.), so the
 * catalog organizes itself by what the designs actually look like rather than
 * by tag bookkeeping. Shared so languages and palettes speak the same
 * vocabulary.
 */
export interface ShelfDef {
  key: string;
  label: string;
  blurb: string;
  ink: string;
}

/** Shelf definitions, in display order. */
export const COLOR_MOOD_SHELVES: ShelfDef[] = [
  { key: "picks", label: "curator's picks", blurb: "pinned to the corkboard", ink: "var(--sakura)" },
  { key: "night", label: "night stock", blurb: "printed on dark paper", ink: "var(--ramune)" },
  { key: "loud", label: "loud inks", blurb: "full coverage, no apologies", ink: "var(--sakura)" },
  { key: "quiet", label: "quiet paper", blurb: "restraint and whitespace", ink: "var(--ramune)" },
  { key: "warm", label: "warm press", blurb: "earth, amber, ember", ink: "var(--yuzu)" },
  { key: "cold", label: "cold press", blurb: "sea, slate, shade", ink: "var(--ramune)" },
  { key: "misc", label: "miscellany", blurb: "everything else", ink: "var(--graphite)" },
];

/** Parse a hex color to HSL parts (h 0–360, s/l 0–1), or null if unparseable. */
export function hexParts(hex?: string): { h: number; s: number; l: number } | null {
  if (!hex || !/^#[0-9a-f]{3,8}$/i.test(hex)) return null;
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** The color-mood cascade — first match wins, in shelf display order. */
export function colorMoodShelfKey(opts: {
  primary?: string;
  background?: string;
  featured?: boolean;
}): string {
  if (opts.featured) return "picks";
  const bg = hexParts(opts.background);
  const prim = hexParts(opts.primary);
  if (bg && bg.l < 0.38) return "night";
  if (!prim) return "misc";
  if (prim.s < 0.24) return "quiet";
  if (prim.s > 0.6 && prim.l > 0.28 && prim.l < 0.82) return "loud";
  const warm = prim.h < 90 || prim.h >= 330;
  return warm ? "warm" : "cold";
}

export interface ShelfBucket<T> extends ShelfDef {
  items: T[];
}

/** Bucket items into the given shelf defs, in def order, dropping empties. */
export function groupIntoShelves<T>(
  items: T[],
  keyFn: (item: T) => string,
  defs: ShelfDef[],
): ShelfBucket<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return defs
    .filter((def) => (buckets.get(def.key)?.length ?? 0) > 0)
    .map((def) => ({ ...def, items: buckets.get(def.key)! }));
}
