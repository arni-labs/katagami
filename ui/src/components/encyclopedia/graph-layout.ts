import type { EncyclopediaCell, MapName, ManifestationSet } from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "../../lib/encyclopedia-graph.ts";
import { cellFace } from "./material.ts";

// One layout for the whole encyclopedia. Every attested cell is a plate on the
// paper; its manifestations are small satellites on a ring around it, joined by
// dotted lines; broader and typed relations join plates. Cells start in grid
// regions by map, then a deterministic force pass (edge springs, plate
// repulsion, a pull to the map's centre) settles them, and a final sweep pushes
// overlapping footprints apart. No randomness anywhere: the same data always
// gives the same map.

export const PLATE_W = 320;
export const PLATE_H = 380;
/** A cell with no material yet is a name and a scope, and it takes only the
 *  room a name needs. Material earns the space: the pictures carry the far
 *  view, the named cells sit quietly between them, and the field packs tight
 *  enough to be read whole. */
export const NAME_W = 232;
/** Tall enough for everything the card sets at the reading layer — the
 *  eyebrow, two lines of name, two lines of scope, the caption — because the
 *  card is now rendered at exactly this height and nothing may spill out of
 *  it. Reserving 132 while the card set 265 to 312 is how a named cell came to
 *  sit on top of its neighbour. */
export const NAME_H = 180;
export const SAT_W = 56;
export const SAT_H = 56;
/** How many manifestation records ring a cell before the rest are folded
 *  behind one node. The fold is a starting position, not a ceiling: the node
 *  opens the remaining records onto the map as their own connected nodes. */
export const MAX_SATELLITES = 8;
/** Room between rings, and between neighbours on a ring, once a cell's records
 *  are opened out. */
const RING_GAP = 12;
/** Centre-to-centre room for one opened record, along a ring and between
 *  rings alike.
 *
 *  The nodes are squares, so what matters is that their boxes cannot meet, not
 *  that their centres are far apart. Two squares only overlap when their
 *  centres are within SAT_W of each other on BOTH axes, which cannot happen
 *  once they are at least SAT_W × √2 apart however the ring is travelling.
 *  Spacing them by SAT_W alone is enough along a straight edge and is not
 *  enough around a corner: a diagonal step of 65px puts two 56px boxes 46px
 *  apart on each axis, and they overlap by ten. */
export const NODE_PITCH = SAT_W * Math.SQRT2 + RING_GAP;
const GRID_X = 360;
const GRID_Y = 330;
const REGION_GAP = 240;
/** Satellites hug the plate: the ring sits just outside its edge, so a cell's
 *  footprint stays close to the plate itself. */
const RING_PAD = 18;

/** Each layer of the map draws at this fraction of the one above it, and a
 *  layer is revealed when the camera has come in by the same factor. The map
 *  is then the same object at every scale: you see the top of the field from
 *  far out and the detail arrives as you come in, the way a road map works.
 *  Five hundred cells at one size is a mesh; five hundred over four layers is
 *  a field that reads at any zoom. */
export const LEVEL_SHRINK = 0.5;

/** Guards on the two settling loops, and the tests that normally end them
 *  first. Both loops used to run a fixed number of passes whatever the field
 *  was doing, which made the layout's cost a multiple of the library's size
 *  with nothing to show for most of it: at five thousand cells the two spent
 *  thirty seconds, and the request that triggered them waited for all of it. */
const FORCE_ITERS = 260;
/** Average movement per card, in paper pixels, below which a relaxation pass
 *  has stopped changing anything a reader could see. */
const FORCE_QUIET_PX = 0.1;
const SEPARATE_ITERS = 900;
/** Share of the remaining overlap a sweep must clear to count as progress.
 *  Measured over the live library: the sweep clears three quarters of the
 *  overlap in fifty passes, and everything after pass three hundred moved the
 *  count from 252 overlapping pairs to 202 while the deepest overlap did not
 *  improve at all. */
const SEPARATE_QUIET_SHARE = 0.002;
/** How many passes in a row must fail that test before a sweep gives up. The
 *  measure is noisy pass to pass, so one quiet pass is not an answer. */
const PATIENCE = 8;
const SATELLITE_ITERS = 80;
/** How many cells the first layer holds, and how much bigger each layer after
 *  it is. Geometric, so the layer count grows with the logarithm of the
 *  library: five hundred cells is four layers, five thousand is six. */
const FIRST_LAYER = 26;
const LAYER_GROWTH = 3;

/** How much of full size a cell on this layer draws at. */
export function levelScale(level: number): number {
  return LEVEL_SHRINK ** level;
}

/** Which layer each cell belongs to.
 *
 *  Two things decide it. A cell is never shown before the cell it sits under,
 *  so the containment hierarchy always reads top-down. Beyond that a layer
 *  holds the cells that have earned the room — the ones with the most
 *  narrower cells, the most made work and the most connections — so the field
 *  is legible even where the hierarchy is still flat and everything is a root.
 *  As cells are given parents, depth takes over from prominence on its own. */
export function displayLevels(index: GraphIndex): Map<string, number> {
  const prominence = (cell: EncyclopediaCell) =>
    index.childrenOf(cell.id).length * 1000 + cell.manifestations.length * 10 + cell.relations.length;
  const ordered = [...index.graph.cells].sort(
    (a, b) =>
      index.depthOf(a.id) - index.depthOf(b.id) ||
      prominence(b) - prominence(a) ||
      a.name.localeCompare(b.name),
  );
  const level = new Map<string, number>();
  let layer = 0;
  let budget = FIRST_LAYER;
  let used = 0;
  for (const cell of ordered) {
    if (used >= budget) { layer++; used = 0; budget *= LAYER_GROWTH; }
    // Never before the cell above it. Parents sort earlier, so their layer is
    // already decided by the time a child is reached.
    let at = layer;
    for (const parent of index.parentsOf(cell.id)) at = Math.max(at, level.get(parent.id) ?? 0);
    level.set(cell.id, at);
    used++;
  }
  return level;
}

/** The room a cell actually claims on the paper: its card plus the ring of
 *  records around it. The packer and the separation pass must agree on this or
 *  the field settles a great deal bigger than it was packed, which is what
 *  drives the far view's zoom down. */
export function footprintBox(cell: EncyclopediaCell, level = 0): { w: number; h: number } {
  const box = plateBox(cell, level);
  const scale = levelScale(level);
  if (!cell.manifestations.length) return { w: box.w + 56 * scale, h: box.h + 56 * scale };
  return {
    w: box.w + (SAT_W + 2 * RING_PAD) * scale + SAT_W * scale,
    h: box.h + (SAT_H + 2 * RING_PAD) * scale + SAT_H * scale,
  };
}

export function plateBox(cell: EncyclopediaCell, level = 0): { w: number; h: number } {
  const scale = levelScale(level);
  const base = cellFace(cell).kind === "name" ? { w: NAME_W, h: NAME_H } : { w: PLATE_W, h: PLATE_H };
  return { w: Math.round(base.w * scale), h: Math.round(base.h * scale) };
}

export interface PlateNode {
  kind: "plate";
  id: string;
  cell: EncyclopediaCell;
  x: number; // centre
  y: number;
  /** The plate's own box on the paper — a named cell is smaller than a
   *  pictured one, a deeper level smaller again, and connectors and the camera
   *  both read it from here. */
  w: number;
  h: number;
  /** Which layer of the map the cell belongs to: 0 is the far view. */
  level: number;
  /** What fraction of full size the card draws at, from its layer. */
  scale: number;
}

export interface SatelliteNode {
  kind: "satellite";
  id: string;
  cellId: string;
  set: ManifestationSet;
  /** What the node is. A `record` is one manifestation, joined to its cell by
   *  a dotted line and opening that record's page. `more` opens the records
   *  the ring could not hold onto the map as record nodes of their own;
   *  `fold` puts them away again. */
  role: "record" | "more" | "fold";
  /** Index into cell.manifestations for a record node, -1 for the other two. */
  index: number;
  /** How many records `more` stands for. */
  more: number;
  x: number;
  y: number;
  /** The scale of the cell this node belongs to, so a deep cell's records are
   *  as small as the cell is. */
  scale: number;
}

export interface Region {
  map: MapName;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
}

export interface GraphLayout {
  plates: PlateNode[];
  satellites: SatelliteNode[];
  regions: Region[];
  byId: Map<string, PlateNode>;
  /** Everything on the paper, at every level. */
  bounds: { x: number; y: number; w: number; h: number };
  /** Just the top layer — what "fit" frames, because that is the layer the far
   *  view shows. */
  topBounds: { x: number; y: number; w: number; h: number };
  /** Where the top layer's cells actually are. The regions leave wide gaps
   *  between them, so the middle of the bounding box can be empty paper; the
   *  camera opens on this instead. */
  topCentre: { x: number; y: number };
}

/** The settled map with the cells left out.
 *
 *  The layout is a pure function of the cells and takes seconds over a library
 *  this size, so it is computed once on the server and handed to the page
 *  rather than run again in the browser while the user waits. Only the
 *  geometry travels: each plate keeps its id and its box, and the cell itself
 *  is put back from the graph the page already has, so the payload does not
 *  carry every cell twice. */
export interface LayoutSeed {
  plates: Array<{ id: string; x: number; y: number; w: number; h: number; level: number; scale: number }>;
  satellites: SatelliteNode[];
  regions: Region[];
  bounds: { x: number; y: number; w: number; h: number };
  topBounds: { x: number; y: number; w: number; h: number };
  topCentre: { x: number; y: number };
}

export function seedFromLayout(layout: GraphLayout): LayoutSeed {
  return {
    plates: layout.plates.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, level: p.level, scale: p.scale })),
    satellites: layout.satellites,
    regions: layout.regions,
    bounds: layout.bounds,
    topBounds: layout.topBounds,
    topCentre: layout.topCentre,
  };
}

/** Put the cells back on the geometry. Linear in the number of cells, so the
 *  browser does this in a millisecond where laying the field out again took
 *  seconds. A plate whose cell is no longer in the graph is dropped rather
 *  than drawn without one. */
export function layoutFromSeed(seed: LayoutSeed, index: GraphIndex): GraphLayout {
  const plates: PlateNode[] = [];
  const byId = new Map<string, PlateNode>();
  for (const p of seed.plates) {
    const cell = index.byId.get(p.id);
    if (!cell) continue;
    const node: PlateNode = { kind: "plate", id: p.id, cell, x: p.x, y: p.y, w: p.w, h: p.h, level: p.level, scale: p.scale };
    plates.push(node);
    byId.set(p.id, node);
  }
  return {
    plates,
    satellites: seed.satellites.filter((s) => byId.has(s.cellId)),
    regions: seed.regions,
    byId,
    bounds: seed.bounds,
    topBounds: seed.topBounds,
    topCentre: seed.topCentre,
  };
}

/** A screen is wider than it is tall, so the whole field should be too:
 *  packing the map regions into a square wastes the sides and drives the fit
 *  zoom down. Try every row width the regions can actually make and keep the
 *  one whose bounding box comes closest to a landscape screen. */
const FIELD_ASPECT = 1.7;

function bestRowWidth(boxes: Array<{ w: number; h: number }>): number {
  const widest = Math.max(...boxes.map((b) => b.w));
  const candidates = new Set<number>([widest]);
  let run = 0;
  for (const box of boxes) { run += (run ? REGION_GAP : 0) + box.w; candidates.add(Math.max(run, widest)); }
  let best = widest;
  let bestPenalty = Infinity;
  for (const target of candidates) {
    let x = 0; let y = 0; let rowH = 0; let width = 0;
    for (const box of boxes) {
      if (x > 0 && x + box.w > target) { x = 0; y += rowH + REGION_GAP; rowH = 0; }
      x += box.w + REGION_GAP;
      rowH = Math.max(rowH, box.h);
      width = Math.max(width, x - REGION_GAP);
    }
    const height = y + rowH;
    const penalty = Math.abs(Math.log(width / Math.max(1, height) / FIELD_ASPECT));
    if (penalty < bestPenalty) { bestPenalty = penalty; best = target; }
  }
  return best;
}

function plateRect(p: PlateNode) {
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
}

/** A uniform grid over the paper, over points held in typed arrays. Every
 *  pass below only cares about pairs closer together than a known reach; with
 *  the points bucketed at that reach, each one compares against its
 *  neighbours instead of against everything, and the layout stays linear in
 *  the number of points. A thousand cells settle in milliseconds where the
 *  pairwise sweep needed hundreds of millions of comparisons and froze the
 *  tab. Rebuilt in place each iteration so the passes allocate nothing. */
class PointGrid {
  private readonly buckets = new Map<number, number[]>();
  private xs: Float64Array = new Float64Array(0);
  private ys: Float64Array = new Float64Array(0);
  private readonly size: number;
  private readonly count: number;

  constructor(size: number, count: number) {
    this.size = size;
    this.count = count;
  }

  /** Bucket index for a point. A coordinate far outside the paper clamps into
   *  an edge bucket: that only ever puts more candidates in front of the exact
   *  check, never fewer. */
  private key(x: number, y: number): number {
    const cx = Math.min(20000, Math.max(-20000, Math.floor(x / this.size)));
    const cy = Math.min(20000, Math.max(-20000, Math.floor(y / this.size)));
    return (cx + 20000) * 40001 + (cy + 20000);
  }

  rebuild(xs: Float64Array, ys: Float64Array): void {
    this.xs = xs; this.ys = ys;
    for (const bucket of this.buckets.values()) bucket.length = 0;
    for (let i = 0; i < this.count; i++) {
      const key = this.key(xs[i], ys[i]);
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(i);
      else this.buckets.set(key, [i]);
    }
  }

  /** Writes the indices in the nine buckets around a point into `out` — a
   *  superset of everything within `size` of it — and returns how many. */
  near(x: number, y: number, out: Int32Array): number {
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.buckets.get(this.key(x + dx * this.size, y + dy * this.size));
        if (!bucket) continue;
        for (const i of bucket) { if (n < out.length) out[n++] = i; }
      }
    }
    return n;
  }

  /** The point nearest to index `self` among its neighbouring buckets, or -1
   *  when nothing is close enough to matter. */
  nearest(self: number, out: Int32Array): number {
    const found = this.near(this.xs[self], this.ys[self], out);
    let best = -1;
    let bestD = Infinity;
    for (let q = 0; q < found; q++) {
      const i = out[q];
      if (i === self) continue;
      const d = Math.hypot(this.xs[i] - this.xs[self], this.ys[i] - this.ys[self]);
      if (d < bestD || (d === bestD && i < best)) { bestD = d; best = i; }
    }
    return best;
  }
}

/** Min/max over a list without spreading it into an argument list: at a
 *  thousand cells the satellite array is long enough for `Math.min(...list)`
 *  to be a stack risk. */
function extent<T>(items: readonly T[], value: (item: T) => number): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    const v = value(item);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

export function layoutGraph(index: GraphIndex): GraphLayout {
  const cells = index.graph.cells;
  const plates = new Map<string, PlateNode>();

  // ── regions by primary map ────────────────────────────────────────────
  // A map with no cells gets no ground on the paper: an empty placeholder
  // would stretch the field sideways and drive the fit zoom down for every
  // real cell. The filter chips already say which maps are still empty.
  const levels = displayLevels(index);
  const regions: Region[] = [];
  const filled = MAP_NAMES_ORDER.filter((map) => cells.some((c) => index.primaryMap(c) === map));
  // Size each region first, then pack the regions into rows about as wide as
  // they are tall, so the whole field is closer to a screen than to a ribbon.
  const shapes = filled.map((map) => {
    const members = cells.filter((c) => index.primaryMap(c) === map);
    // Size a region by the room its cells actually take, not by how many there
    // are: a deep cell draws small and should claim a small share of the
    // paper, which is what keeps the whole field from growing with the count.
    let area = 0;
    for (const cell of members) {
      const level = levels.get(cell.id) ?? 0;
      const foot = footprintBox(cell, level);
      const gap = 30 * levelScale(level);
      area += (foot.w + gap) * (foot.h + gap);
    }
    const side = Math.sqrt(area * 1.5);
    return { map, members, w: Math.max(GRID_X * 2, side), h: Math.max(GRID_Y, side) };
  });
  const targetRowWidth = bestRowWidth(shapes.map((s) => ({ w: s.w, h: s.h })));
  let rowX = 0;
  let rowY = 0;
  let rowH = 0;
  for (const shape of shapes) {
    if (rowX > 0 && rowX + shape.w > targetRowWidth) { rowX = 0; rowY += rowH + REGION_GAP; rowH = 0; }
    // The region winds out from this point, so the origin is its middle.
    const originX = rowX + shape.w / 2;
    const originY = rowY + shape.h / 2;
    // Roots first, ordered by how much hangs under them, then the rest.
    const roots = index.roots.filter((c) => index.primaryMap(c) === shape.map).sort((a, b) => index.descendants(b.id).length - index.descendants(a.id).length || a.name.localeCompare(b.name));
    const placed = new Set<string>();
    // Wind outward from the middle of the region, top layer first. The far
    // view is then the middle of each region rather than its whole sprawl:
    // the cells the map shows first sit together and read large, and the
    // layers that arrive as you come in are already where you would go
    // looking for them. Packing by each cell's own size, not into a lattice
    // of one fixed slot per cell, is what stops the field growing with the
    // count — a cell on a lower layer draws small and claims little paper.
    let radius = 0;
    let angle = 0;
    let ringH = 0;
    let reach = 0;
    const put = (cell: EncyclopediaCell) => {
      if (placed.has(cell.id)) return;
      const level = levels.get(cell.id) ?? 0;
      const box = plateBox(cell, level);
      const foot = footprintBox(cell, level);
      const gap = 30 * levelScale(level);
      const slotW = foot.w + gap;
      const slotH = foot.h + gap;
      if (radius === 0) radius = slotW / 2;
      // A full turn at this radius, then step out by the tallest slot on it.
      // Step by the angle whose CHORD is one slot wide, not whose arc is: on a
      // small ring the chord is a good deal shorter than the arc, and cards
      // packed by arc length end up overlapping their neighbours.
      const step = 2 * Math.asin(Math.min(1, slotW / (2 * radius)));
      if (angle > 0 && angle + step > Math.PI * 2) { radius += ringH; angle = 0; ringH = 0; }
      plates.set(cell.id, {
        kind: "plate", id: cell.id, cell,
        x: originX + Math.cos(angle) * radius,
        y: originY + Math.sin(angle) * radius,
        w: box.w, h: box.h, level, scale: levelScale(level),
      });
      angle += 2 * Math.asin(Math.min(1, slotW / (2 * radius)));
      ringH = Math.max(ringH, slotH);
      reach = Math.max(reach, radius + Math.max(slotW, slotH) / 2);
      placed.add(cell.id);
    };
    // Depth-first so children land next to their parent in the grid. `broader`
    // is data, not a proven tree: a cell may name a descendant as its parent,
    // and C → B → A → B would otherwise recurse until the stack gave out and
    // the page came up blank. Placement is the visit mark, so each cell is
    // walked once whatever shape the links make.
    const visit = (cell: EncyclopediaCell) => {
      if (placed.has(cell.id)) return;
      put(cell);
      for (const kid of index.childrenOf(cell.id)) if (index.primaryMap(kid) === shape.map) visit(kid);
    };
    // Top layer first, then the rest, so the far view's cells are placed
    // together rather than scattered through the ones that arrive later.
    const byLayer = [...shape.members].sort((a, b) => (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0));
    roots.filter((c) => (levels.get(c.id) ?? 0) === 0).forEach(visit);
    byLayer.forEach(put);
    const packedW = Math.max(GRID_X, reach * 2);
    const packedH = Math.max(GRID_Y, reach * 2);
    regions.push({ map: shape.map, x: originX - packedW / 2, y: originY - packedH / 2, w: packedW, h: packedH, count: shape.members.length });
    rowX += packedW + REGION_GAP;
    rowH = Math.max(rowH, packedH);
  }

  // ── force pass ────────────────────────────────────────────────────────
  const nodes = [...plates.values()];
  // A cell with manifestations needs room for its ring; one without needs
  // only its plate and a margin.
  const satW = (n: PlateNode) => SAT_W * n.scale;
  const satH = (n: PlateNode) => SAT_H * n.scale;
  const ringX = (n: PlateNode) => n.w / 2 + satW(n) / 2 + RING_PAD * n.scale;
  const ringY = (n: PlateNode) => n.h / 2 + satH(n) / 2 + RING_PAD * n.scale;
  const footW = (n: PlateNode) => (n.cell.manifestations.length ? 2 * ringX(n) + satW(n) : n.w + 56 * n.scale);
  const footH = (n: PlateNode) => (n.cell.manifestations.length ? 2 * ringY(n) + satH(n) : n.h + 56 * n.scale);
  const centres = new Map(regions.map((r) => [r.map, { x: r.x + r.w / 2, y: r.y + r.h / 2 }]));
  const edges: Array<[PlateNode, PlateNode]> = [];
  for (const cell of cells) {
    for (const link of cell.broader) { const other = plates.get(link.cellId); if (other) edges.push([plates.get(cell.id)!, other]); }
    for (const rel of cell.relations) { const other = plates.get(rel.cellId); if (other) edges.push([plates.get(cell.id)!, other]); }
  }
  // A narrower cell settles as close to the cell above it as the smaller of
  // the two is wide. Deep cells therefore cluster tightly under their parent
  // instead of spreading across the region, which is what lets a level be
  // hidden without leaving a hole in the field.
  const restFor = (a: PlateNode, b: PlateNode) => 560 * Math.min(a.scale, b.scale);
  // Both plate passes below only act on pairs closer than the larger of
  // (footW(A) + footW(B)) / 2 + 80 and the same in y — never more than one
  // widest footprint plus 80. Bucket the paper at exactly that reach and the
  // nine buckets around a plate hold every plate it can push against. The
  // positions and forces live in typed arrays for the duration: at a thousand
  // cells the per-iteration maps cost more than the arithmetic did.
  const count = nodes.length;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  const fw = new Float64Array(count);
  const fh = new Float64Array(count);
  const gx = new Float64Array(count);
  const gy = new Float64Array(count);
  const sc = new Float64Array(count);
  // A card's mass is its area, so a small cell on a lower layer gets out of a
  // big one's way rather than shoving it across the region. Without this the
  // top layer is scattered by the hundreds of small cells around it and the
  // far view is a spread of tiny plates again.
  const mass = new Float64Array(count);
  // The top layer is where it was packed and it stays there. That packing is
  // compact and deterministic by construction, and it is what the far view
  // frames; letting the force pass push it around is what spread twenty-six
  // cards across the whole field and drove the fit zoom into single figures.
  const pinned = new Uint8Array(count);
  const rank = new Map<PlateNode, number>();
  let widestFoot = 0;
  nodes.forEach((n, i) => {
    rank.set(n, i);
    px[i] = n.x; py[i] = n.y;
    fw[i] = footW(n); fh[i] = footH(n); sc[i] = n.scale;
    pinned[i] = n.level === 0 ? 1 : 0;
    mass[i] = n.level === 0 ? 1e6 : n.scale * n.scale;
    const c = centres.get(index.primaryMap(n.cell))!;
    gx[i] = c.x; gy[i] = c.y;
    widestFoot = Math.max(widestFoot, fw[i], fh[i]);
  });
  const plateReach = Math.max(120, widestFoot + 80);
  const grid = new PointGrid(plateReach, count);
  const near = new Int32Array(count);
  const edgeA = new Int32Array(edges.length);
  const edgeB = new Int32Array(edges.length);
  const rest = new Float64Array(edges.length);
  edges.forEach(([a, b], i) => { edgeA[i] = rank.get(a)!; edgeB[i] = rank.get(b)!; rest[i] = restFor(a, b); });

  const fx = new Float64Array(count);
  const fy = new Float64Array(count);
  // The relaxation stops when it has stopped moving the field, not after a
  // fixed number of passes. Over five thousand cells the fixed count spent ten
  // seconds, most of it on passes that moved the average card a fraction of a
  // pixel. `FORCE_ITERS` is the guard, not the expected exit.
  let settleFrom = 0;
  for (let iter = 0; iter < FORCE_ITERS; iter++) {
    const t = 1 - iter / FORCE_ITERS;
    const step = 0.12 * t + 0.02;
    fx.fill(0); fy.fill(0);
    // Repulsion between plates (short range).
    grid.rebuild(px, py);
    for (let a = 0; a < count; a++) {
      const found = grid.near(px[a], py[a], near);
      for (let q = 0; q < found; q++) {
        const b = near[q];
        // Each unordered pair is handled once, by the earlier of the two.
        if (b <= a) continue;
        let dx = px[b] - px[a]; let dy = py[b] - py[a];
        const d = Math.hypot(dx, dy) || 1;
        const reach = (fw[a] + fw[b]) / 2 + 80 * Math.min(sc[a], sc[b]);
        if (d > reach) continue;
        dx /= d; dy /= d;
        // The lighter card yields: a small cell on a lower layer moves out of
        // a big one's way instead of shoving it across the region.
        const f = (reach - d) * 0.9;
        const total = mass[a] + mass[b];
        const yieldA = (2 * mass[b]) / total;
        const yieldB = (2 * mass[a]) / total;
        fx[a] -= dx * f * yieldA; fy[a] -= dy * f * yieldA;
        fx[b] += dx * f * yieldB; fy[b] += dy * f * yieldB;
      }
    }
    // Springs along edges.
    for (let e = 0; e < edgeA.length; e++) {
      const a = edgeA[e]; const b = edgeB[e];
      let dx = px[b] - px[a]; let dy = py[b] - py[a];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const f = (d - rest[e]) * 0.35;
      fx[a] += dx * f; fy[a] += dy * f;
      fx[b] -= dx * f; fy[b] -= dy * f;
    }
    // Gravity to the map's centre keeps regions apart and roughly square.
    for (let i = 0; i < count; i++) {
      fx[i] += (gx[i] - px[i]) * 0.05;
      fy[i] += (gy[i] - py[i]) * 0.05;
    }
    let travelled = 0;
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const dx = fx[i] * step;
      const dy = fy[i] * step;
      px[i] += dx;
      py[i] += dy;
      travelled += Math.abs(dx) + Math.abs(dy);
    }
    // A pass that moves the average card less than a tenth of a pixel is not
    // changing the field any reader could see. Two of them in a row and the
    // relaxation is done.
    if (travelled / count < FORCE_QUIET_PX) {
      if (++settleFrom >= 2) break;
    } else settleFrom = 0;
  }

  // ── separate footprints (plate + its ring of satellites) ─────────────
  // The sweep pushes overlapping footprints apart. It cannot be run "until
  // nothing overlaps": a field this dense never reaches that, because pushing
  // one pair apart pushes each of them into another. Measured over the real
  // library, it clears three quarters of the overlap in the first fifty passes
  // and then grinds — pass one hundred to pass nine hundred took eighty-nine
  // per cent of the time, halved the number of overlapping pairs and did not
  // improve the deepest overlap by a single pixel.
  //
  // So the sweep stops when it stops helping, measured on the overlap it is
  // there to remove. `moved` cannot express that: every push is at least a
  // pixel, so something is always "moving" while anything overlaps at all.
  let previousDepth = Infinity;
  let grinding = 0;
  for (let iter = 0; iter < SEPARATE_ITERS; iter++) {
    let depth = 0;
    let moved = false;
    grid.rebuild(px, py);
    for (let a = 0; a < count; a++) {
      const found = grid.near(px[a], py[a], near);
      for (let q = 0; q < found; q++) {
        const b = near[q];
        if (b <= a) continue;
        const dx = px[b] - px[a]; const dy = py[b] - py[a];
        const room = 24 * Math.min(sc[a], sc[b]);
        const ox = (fw[a] + fw[b]) / 2 + room - Math.abs(dx);
        const oy = (fh[a] + fh[b]) / 2 + room - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        depth += Math.min(ox, oy);
        // Share the push by mass: the lighter card yields.
        const total = mass[a] + mass[b];
        // Two pinned cards would otherwise never come apart and the sweep
        // would spend every iteration on them, so they share the push.
        const bothPinned = pinned[a] && pinned[b];
        const shareA = bothPinned ? 0.5 : pinned[a] ? 0 : mass[b] / total;
        const shareB = bothPinned ? 0.5 : pinned[b] ? 0 : mass[a] / total;
        if (ox < oy) { const sh = ox + 1; const dir = dx >= 0 ? 1 : -1; px[a] -= sh * shareA * dir; px[b] += sh * shareB * dir; }
        else { const sh = oy + 1; const dir = dy >= 0 ? 1 : -1; py[a] -= sh * shareA * dir; py[b] += sh * shareB * dir; }
      }
    }
    if (!moved) break;
    // Improvement, as a share of the overlap there was. Below the threshold
    // the sweep is polishing something the eye cannot see; a few such passes
    // in a row and it is finished.
    const gain = previousDepth === Infinity ? 1 : (previousDepth - depth) / Math.max(1, previousDepth);
    previousDepth = depth;
    if (gain < SEPARATE_QUIET_SHARE) {
      if (++grinding >= PATIENCE) break;
    } else grinding = 0;
  }
  for (let i = 0; i < count; i++) { nodes[i].x = px[i]; nodes[i].y = py[i]; }

  // Snap positions to whole pixels so the SVG and the cards agree.
  for (const n of nodes) { n.x = Math.round(n.x); n.y = Math.round(n.y); }

  // ── satellites on a ring, facing away from the nearest other plate ───
  // The plates are settled and snapped, so one grid over them serves both the
  // ring direction below and the satellite separation after it.
  grid.rebuild(px, py);
  const satellites: SatelliteNode[] = [];
  for (let i = 0; i < count; i++) {
    const n = nodes[i];
    const list = n.cell.manifestations;
    if (!list.length) continue;
    const shown = Math.min(MAX_SATELLITES, list.length);
    const extra = list.length - shown;
    const ring = shown + (extra > 0 ? 1 : 0);
    // Open the ring on the side away from the closest neighbour. Only plates
    // near enough to crowd the ring matter, so the search stays local; a plate
    // alone in its part of the paper has nothing to lean away from and opens
    // its ring upward.
    const nearestAt = grid.nearest(i, near);
    const away = nearestAt >= 0 ? Math.atan2(n.y - nodes[nearestAt].y, n.x - nodes[nearestAt].x) : -Math.PI / 2;
    const arc = ring <= 3 ? Math.PI * 0.8 : Math.PI * 1.6;
    for (let j = 0; j < ring; j++) {
      const angle = ring === 1 ? away : away - arc / 2 + (arc * j) / (ring - 1);
      // Stretch the ring to the plate's proportions.
      const x = Math.round(n.x + Math.cos(angle) * ringX(n));
      const y = Math.round(n.y + Math.sin(angle) * ringY(n));
      const isMore = extra > 0 && j === ring - 1;
      // The overflow node stands for the records past the ring, so it takes
      // the set of the first of them rather than repeating the last one drawn.
      const m = isMore ? list[shown] : list[j];
      satellites.push({ kind: "satellite", id: isMore ? `${n.id}~more` : `${n.id}~${j}`, cellId: n.id, set: m.entitySet, role: isMore ? "more" : "record", index: isMore ? -1 : j, more: isMore ? extra : 0, x, y, scale: n.scale });
    }
  }

  // Push satellites out of plates and off each other. A satellite only ever
  // touches a plate whose half-box plus its own reaches it, and only ever
  // touches another satellite within one satellite plus the gap, so both are
  // bucketed at those reaches — nine thousand satellites would otherwise be
  // eighty passes over eighty million pairs.
  const satCount = satellites.length;
  const sx = new Float64Array(satCount);
  const sy = new Float64Array(satCount);
  const ss = new Float64Array(satCount);
  satellites.forEach((s, i) => { sx[i] = s.x; sy[i] = s.y; ss[i] = s.scale; });
  let halfBox = 0;
  for (const p of nodes) halfBox = Math.max(halfBox, p.w / 2, p.h / 2);
  const plateGrid = new PointGrid(Math.max(60, halfBox + SAT_W / 2 + 16), count);
  plateGrid.rebuild(px, py);
  const satGrid = new PointGrid(Math.max(SAT_W, SAT_H) + 10, satCount);
  const nearSats = new Int32Array(Math.max(satCount, count));
  // The rings settle on the same terms as the plates did: stop when the sweep
  // stops clearing overlap, rather than always running the guard out.
  let satDepthBefore = Infinity;
  let satGrinding = 0;
  for (let iter = 0; iter < SATELLITE_ITERS; iter++) {
    let depth = 0;
    let moved = false;
    for (let a = 0; a < satCount; a++) {
      const found = plateGrid.near(sx[a], sy[a], nearSats);
      for (let q = 0; q < found; q++) {
        const p = nodes[nearSats[q]];
        const near = Math.min(ss[a], p.scale);
        const ox = (p.w / 2 + (SAT_W / 2) * ss[a] + 16 * near) - Math.abs(sx[a] - p.x);
        const oy = (p.h / 2 + (SAT_H / 2) * ss[a] + 16 * near) - Math.abs(sy[a] - p.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        depth += Math.min(ox, oy);
        if (ox < oy) sx[a] += (ox + 1) * (sx[a] >= p.x ? 1 : -1); else sy[a] += (oy + 1) * (sy[a] >= p.y ? 1 : -1);
      }
    }
    satGrid.rebuild(sx, sy);
    for (let a = 0; a < satCount; a++) {
      const found = satGrid.near(sx[a], sy[a], nearSats);
      for (let q = 0; q < found; q++) {
        const b = nearSats[q];
        if (b <= a) continue;
        const dx = sx[b] - sx[a]; const dy = sy[b] - sy[a];
        const room = (ss[a] + ss[b]) / 2;
        const ox = (SAT_W + 10) * room - Math.abs(dx); const oy = (SAT_H + 10) * room - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        depth += Math.min(ox, oy);
        if (ox < oy) { const sh = (ox / 2 + 1) * (dx >= 0 ? 1 : -1); sx[a] -= sh; sx[b] += sh; }
        else { const sh = (oy / 2 + 1) * (dy >= 0 ? 1 : -1); sy[a] -= sh; sy[b] += sh; }
      }
    }
    if (!moved) break;
    const gain = satDepthBefore === Infinity ? 1 : (satDepthBefore - depth) / Math.max(1, satDepthBefore);
    satDepthBefore = depth;
    if (gain < SEPARATE_QUIET_SHARE) {
      if (++satGrinding >= PATIENCE) break;
    } else satGrinding = 0;
  }
  satellites.forEach((s, i) => { s.x = sx[i]; s.y = sy[i]; });
  for (const s of satellites) { s.x = Math.round(s.x); s.y = Math.round(s.y); }

  // Regions follow their members.
  const byMap = new Map<MapName, PlateNode[]>();
  for (const n of nodes) {
    const map = index.primaryMap(n.cell);
    const list = byMap.get(map);
    if (list) list.push(n); else byMap.set(map, [n]);
  }
  for (const r of regions) {
    const members = byMap.get(r.map) ?? [];
    if (!members.length) continue;
    const x = extent(members, (m) => m.x - footW(m) / 2);
    const right = extent(members, (m) => m.x + footW(m) / 2).max;
    const y = extent(members, (m) => m.y - footH(m) / 2);
    const bottom = extent(members, (m) => m.y + footH(m) / 2).max;
    r.x = x.min - 40; r.y = y.min - 120; r.w = right - x.min + 80; r.h = bottom - y.min + 160;
  }
  const all = [...nodes.map(plateRect), ...satellites.map((s) => ({ x: s.x - (SAT_W * s.scale) / 2, y: s.y - (SAT_H * s.scale) / 2, w: SAT_W * s.scale, h: SAT_H * s.scale })), ...regions];
  const empty = { x: 0, y: 0, w: 1, h: 1 };
  if (!all.length) return { plates: nodes, satellites, regions, byId: plates, bounds: empty, topBounds: empty, topCentre: { x: 0, y: 0 } };
  const left = extent(all, (r) => r.x).min; const top = extent(all, (r) => r.y).min;
  const right = extent(all, (r) => r.x + r.w).max; const bottom = extent(all, (r) => r.y + r.h).max;
  const bounds = { x: left, y: top, w: right - left, h: bottom - top };
  // The top level plus the map regions it sits in: what the far view holds.
  const topPlates = nodes.filter((n) => n.level === 0).map(plateRect);
  const top0 = topPlates;
  const topBounds = top0.length
    ? (() => {
        const l = extent(top0, (r) => r.x).min; const t = extent(top0, (r) => r.y).min;
        const rr = extent(top0, (r) => r.x + r.w).max; const bb = extent(top0, (r) => r.y + r.h).max;
        return { x: l, y: t, w: rr - l, h: bb - t };
      })()
    : bounds;
  const topNodes = nodes.filter((n) => n.level === 0);
  const topCentre = topNodes.length
    ? { x: topNodes.reduce((a, n) => a + n.x, 0) / topNodes.length, y: topNodes.reduce((a, n) => a + n.y, 0) / topNodes.length }
    : { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
  return { plates: nodes, satellites, regions, byId: plates, bounds, topBounds, topCentre };
}

/** A point at distance `t` along the plate's own box pushed outward by `pad`:
 *  straight runs beside each edge, quarter turns at the corners. Walking this
 *  path is what keeps an opened record clear of the card it belongs to. A ring
 *  drawn as an ellipse through the same clearances only clears the plate on
 *  the axes — at forty-five degrees it cuts back inside the box and puts a
 *  thumbnail over the cell's own picture. */
function boxRingPoint(plate: PlateNode, pad: number, t: number): { x: number; y: number } {
  const hw = plate.w / 2;
  const hh = plate.h / 2;
  const corner = (Math.PI * pad) / 2;
  const legs = [plate.w, corner, plate.h, corner, plate.w, corner, plate.h, corner];
  const perimeter = 2 * plate.w + 2 * plate.h + 2 * Math.PI * pad;
  let d = ((t % perimeter) + perimeter) % perimeter;
  let leg = 0;
  while (d > legs[leg]) { d -= legs[leg]; leg++; }
  const turn = (from: number, cx: number, cy: number) => ({
    x: plate.x + cx + Math.cos(from + d / pad) * pad,
    y: plate.y + cy + Math.sin(from + d / pad) * pad,
  });
  switch (leg) {
    case 0: return { x: plate.x - hw + d, y: plate.y - hh - pad };          // top edge, left to right
    case 1: return turn(-Math.PI / 2, hw, -hh);                              // top-right corner
    case 2: return { x: plate.x + hw + pad, y: plate.y - hh + d };           // right edge, down
    case 3: return turn(0, hw, hh);                                          // bottom-right corner
    case 4: return { x: plate.x + hw - d, y: plate.y + hh + pad };           // bottom edge, right to left
    case 5: return turn(Math.PI / 2, -hw, hh);                               // bottom-left corner
    case 6: return { x: plate.x - hw - pad, y: plate.y + hh - d };           // left edge, up
    default: return turn(Math.PI, -hw, -hh);                                 // top-left corner
  }
}

/** Where along that path the given direction from the plate's centre comes
 *  out, so an opened ring can start on the side the folded node sat on. */
function boxRingOffset(plate: PlateNode, pad: number, away: number): number {
  const perimeter = 2 * plate.w + 2 * plate.h + 2 * Math.PI * pad;
  const wanted = Math.atan2(Math.sin(away), Math.cos(away));
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < 240; i++) {
    const t = (perimeter * i) / 240;
    const p = boxRingPoint(plate, pad, t);
    const angle = Math.atan2(p.y - plate.y, p.x - plate.x);
    const gap = Math.abs(Math.atan2(Math.sin(angle - wanted), Math.cos(angle - wanted)));
    if (gap < bestGap) { bestGap = gap; best = t; }
  }
  return best;
}

/** Every record a cell names, opened out around it as its own node.
 *
 *  The ring the map draws by default holds eight; a cell that names sixty has
 *  the rest behind one node, and clicking that node lands here. The records go
 *  onto rings that trace the plate's own box at growing distances, each ring
 *  as full as its perimeter allows and walked at even spacing, so every record
 *  is a node on its own dotted line, every one is reachable, and none of them
 *  covers the card they belong to. The first slot is given to the node that
 *  folds them away again, on the side the "+N" node sat.
 *
 *  Nothing else on the map moves. The field keeps the shape it settled into;
 *  this is an overlay around one plate, drawn above its neighbours, and the
 *  page steps the rest of the paper back while it is open. */
export function expandCell(plate: PlateNode, away: number): SatelliteNode[] {
  const seen=new Set<string>();
  const indices=plate.cell.manifestations.flatMap((m,i)=>{
    const key=m.entitySet+":"+m.entityId;if(seen.has(key))return [];seen.add(key);return [i];
  });
  const list=indices.map(i=>plate.cell.manifestations[i]);
  if (!list.length) return [];
  const slot = NODE_PITCH * plate.scale;
  const out: SatelliteNode[] = [];
  // Slot 0 is the fold control, then one slot per record.
  let placed = 0;
  const total = list.length + 1;
  for (let ring = 0; placed < total && ring < 40; ring++) {
    // Clearance from the plate's edge to a node's centre: half the node, plus
    // the gap, plus one ring's worth for each ring further out. Every node is
    // therefore at least RING_PAD clear of the card on every side.
    // Rings are one pitch apart for the same reason their neighbours are: the
    // offset curves run parallel, so a pitch of separation between them is a
    // pitch between every node on one and every node on the next.
    const pad = (SAT_W / 2 + RING_PAD + ring * NODE_PITCH) * plate.scale;
    const perimeter = 2 * plate.w + 2 * plate.h + 2 * Math.PI * pad;
    const capacity = Math.max(1, Math.floor(perimeter / slot));
    const here = Math.min(capacity, total - placed);
    const start = boxRingOffset(plate, pad, away);
    for (let j = 0; j < here; j++) {
      // Even spacing by distance travelled, not by angle: stepping the angle
      // evenly would bunch nodes at the corners and thin them along the sides.
      // Alternate rings start half a slot round so an outer node sits between
      // the two inside it rather than directly behind one.
      const t = start + (perimeter * j) / here + (ring % 2 ? perimeter / (2 * here) : 0);
      const point = boxRingPoint(plate, pad, t);
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      const at = placed + j;
      if (at === 0) {
        out.push({ kind: "satellite", id: `${plate.id}~fold`, cellId: plate.id, set: list[0].entitySet, role: "fold", index: -1, more: list.length, x, y, scale: plate.scale });
      } else {
        const m = list[at - 1];
        out.push({ kind: "satellite", id: `${plate.id}~${at - 1}`, cellId: plate.id, set: m.entitySet, role: "record", index: indices[at - 1], more: 0, x, y, scale: plate.scale });
      }
    }
    placed += here;
  }
  return out;
}

/** How far an opened cell reaches, so the camera can frame the whole of it. */
export function expandedRadius(plate: PlateNode, nodes: SatelliteNode[]): number {
  let r = 0;
  for (const n of nodes) r = Math.max(r, Math.hypot(n.x - plate.x, n.y - plate.y));
  return r + SAT_W;
}

/** A dashed connector between two plates: a soft S-curve, and the point where
 *  its word sits. */
export function plateConnector(a: PlateNode, b: PlateNode): { d: string; label: { x: number; y: number } } {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  let x1: number, y1: number, x2: number, y2: number;
  if (horizontal) {
    x1 = a.x + (dx > 0 ? a.w / 2 : -a.w / 2); y1 = a.y;
    x2 = b.x + (dx > 0 ? -b.w / 2 : b.w / 2); y2 = b.y;
    const mx = (x1 + x2) / 2;
    return { d: `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`, label: { x: mx, y: (y1 + y2) / 2 - 12 } };
  }
  x1 = a.x; y1 = a.y + (dy > 0 ? a.h / 2 : -a.h / 2);
  x2 = b.x; y2 = b.y + (dy > 0 ? -b.h / 2 : b.h / 2);
  const my = (y1 + y2) / 2;
  return { d: `M ${x1} ${y1} C ${x1} ${my} ${x2} ${my} ${x2} ${y2}`, label: { x: (x1 + x2) / 2 + 14, y: my } };
}
