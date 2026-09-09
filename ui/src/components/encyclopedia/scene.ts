export interface Camera {
  x: number;
  y: number;
  k: number;
}
export interface Size {
  w: number;
  h: number;
}
export interface Grid {
  count: number;
  columns: number;
  rows: number;
  pitchX: number;
  pitchY: number;
}
export interface Tile {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  first: number;
  last: number;
  indices: number[];
}
export const CARD_W = 312;
export const CARD_H = 356;

export function makeGrid(count: number): Grid {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  return {
    count,
    columns,
    rows: Math.ceil(count / columns),
    pitchX: 372,
    pitchY: 416,
  };
}
export function zoomAt(
  c: Camera,
  factor: number,
  x: number,
  y: number,
): Camera {
  const k = Math.max(0.000001, Math.min(2.8, c.k * factor));
  const ratio = k / c.k;
  return { k, x: x - (x - c.x) * ratio, y: y - (y - c.y) * ratio };
}
export function cameraFor(g: Grid, size: Size, whole = false): Camera {
  const w = Math.max(CARD_W, g.columns * g.pitchX - 60);
  const h = Math.max(CARD_H, g.rows * g.pitchY - 60);
  const fit = Math.min(
    0.95,
    Math.max(1, size.w - 48) / w,
    Math.max(1, size.h - 48) / h,
  );
  const k = whole ? fit : Math.max(Math.min(0.6, (size.w - 48) / CARD_W), fit);
  const fits = k <= fit;
  return {
    k,
    x: fits ? (size.w - w * k) / 2 : 24,
    y: fits ? (size.h - h * k) / 2 : 24,
  };
}

/** Grid arithmetic skips invisible entries without scanning the catalog. Coarse
 * tiles replace small nodes and retain exact counts, including the partial row. */
export function visibleTiles(
  g: Grid,
  c: Camera,
  size: Size,
  aggregate = true,
): Tile[] {
  if (!g.count || size.w <= 0 || size.h <= 0) return [];
  const block = aggregate
    ? 2 ** Math.max(0, Math.ceil(Math.log2(150 / (g.pitchX * c.k))))
    : 1;
  const startCol = Math.max(
    0,
    Math.floor(-c.x / c.k / (g.pitchX * block)) * block,
  );
  const startRow = Math.max(
    0,
    Math.floor(-c.y / c.k / (g.pitchY * block)) * block,
  );
  const endCol = Math.min(
    g.columns,
    Math.ceil((size.w - c.x) / c.k / (g.pitchX * block)) * block,
  );
  const endRow = Math.min(
    g.rows,
    Math.ceil((size.h - c.y) / c.k / (g.pitchY * block)) * block,
  );
  const out: Tile[] = [];
  for (let row = startRow; row < endRow; row += block) {
    for (let col = startCol; col < endCol; col += block) {
      const right = Math.min(g.columns, col + block),
        bottom = Math.min(g.rows, row + block);
      const fullBottom = Math.min(bottom, Math.floor(g.count / g.columns));
      const complete = Math.max(0, fullBottom - row) * (right - col);
      const partial =
        bottom > Math.floor(g.count / g.columns) &&
        row <= Math.floor(g.count / g.columns)
          ? Math.max(0, Math.min(right, g.count % g.columns) - col)
          : 0;
      const count = complete + partial;
      if (!count) continue;
      const first = row * g.columns + col;
      const last =
        partial > 0
          ? Math.floor(g.count / g.columns) * g.columns +
            Math.min(right, g.count % g.columns) -
            1
          : (fullBottom - 1) * g.columns + right - 1;
      out.push({
        key: row + ":" + col,
        x: col * g.pitchX,
        y: row * g.pitchY,
        w: (right - col) * g.pitchX - 60,
        h: (bottom - row) * g.pitchY - 60,
        count,
        first,
        last,
        indices: count === 1 ? [first] : [],
      });
    }
  }
  return out;
}
