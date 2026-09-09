// A uniform grid over the settled field, so what the map draws costs what is
// on screen rather than what the library holds.
//
// Without this the map filtered every plate on every camera move: at five
// thousand cells that is five thousand box tests a frame before a single card
// is drawn, and every card that passed the size test was mounted whether or
// not it was anywhere near the viewport. The grid is built once from the
// geometry and answers "what is in this rectangle" in time proportional to the
// answer.

/** Anything the grid can hold: a box on the paper, addressed by its centre. */
export interface Boxed {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle in world coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How many cells across the grid aims to be. The field is packed into a
 *  landscape box, so a fixed count gives buckets that stay a sensible size as
 *  the library grows: more cells means more buckets, not fuller ones. */
const TARGET_BUCKETS = 64;

export class SpatialIndex<T extends Boxed> {
  private readonly cellSize: number;
  private readonly minX: number;
  private readonly minY: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly buckets: T[][];
  /** The widest and tallest item, so a query can be grown to catch an item
   *  whose centre is outside the rectangle but whose box overlaps it. */
  private readonly halfW: number;
  private readonly halfH: number;

  constructor(items: readonly T[], bounds: Rect) {
    this.minX = bounds.x;
    this.minY = bounds.y;
    const span = Math.max(bounds.w, bounds.h, 1);
    this.cellSize = Math.max(1, span / TARGET_BUCKETS);
    this.cols = Math.max(1, Math.ceil(bounds.w / this.cellSize) + 1);
    this.rows = Math.max(1, Math.ceil(bounds.h / this.cellSize) + 1);
    this.buckets = Array.from({ length: this.cols * this.rows }, () => [] as T[]);
    let halfW = 0;
    let halfH = 0;
    for (const item of items) {
      halfW = Math.max(halfW, item.w / 2);
      halfH = Math.max(halfH, item.h / 2);
      this.buckets[this.bucketFor(item.x, item.y)].push(item);
    }
    this.halfW = halfW;
    this.halfH = halfH;
  }

  private bucketFor(x: number, y: number): number {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.minX) / this.cellSize)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor((y - this.minY) / this.cellSize)));
    return row * this.cols + col;
  }

  /** Every item whose box overlaps `rect`, in no particular order.
   *
   *  The search rectangle is grown by the largest half-box in the index so an
   *  item is never missed because its centre sits outside the viewport while
   *  its card reaches into it; each candidate is then tested properly. */
  query(rect: Rect, into: T[] = []): T[] {
    into.length = 0;
    const x0 = rect.x - this.halfW;
    const y0 = rect.y - this.halfH;
    const x1 = rect.x + rect.w + this.halfW;
    const y1 = rect.y + rect.h + this.halfH;
    const c0 = Math.min(this.cols - 1, Math.max(0, Math.floor((x0 - this.minX) / this.cellSize)));
    const c1 = Math.min(this.cols - 1, Math.max(0, Math.floor((x1 - this.minX) / this.cellSize)));
    const r0 = Math.min(this.rows - 1, Math.max(0, Math.floor((y0 - this.minY) / this.cellSize)));
    const r1 = Math.min(this.rows - 1, Math.max(0, Math.floor((y1 - this.minY) / this.cellSize)));
    for (let row = r0; row <= r1; row++) {
      const base = row * this.cols;
      for (let col = c0; col <= c1; col++) {
        for (const item of this.buckets[base + col]) {
          if (
            item.x + item.w / 2 >= rect.x &&
            item.x - item.w / 2 <= rect.x + rect.w &&
            item.y + item.h / 2 >= rect.y &&
            item.y - item.h / 2 <= rect.y + rect.h
          ) {
            into.push(item);
          }
        }
      }
    }
    return into;
  }
}

/** The part of the paper the camera is looking at, grown by `margin` screen
 *  pixels on each side so a card is mounted a little before it is scrolled
 *  into view and is not thrown away the moment it leaves. */
export function cameraRect(camera: { x: number; y: number; k: number }, viewport: { w: number; h: number }, margin = 0): Rect {
  const m = margin / camera.k;
  return {
    x: -camera.x / camera.k - m,
    y: -camera.y / camera.k - m,
    w: viewport.w / camera.k + m * 2,
    h: viewport.h / camera.k + m * 2,
  };
}
