import type { EncyclopediaCell, MapName, ManifestationSet } from "@/lib/encyclopedia";
import type { GraphIndex } from "../../lib/encyclopedia-graph.ts";
import { cellFace } from "./material.ts";
import { hubKey, type Visible } from "./expansion.ts";

// The layout of what is open. Each map has a category node; the top-level
// cells the reader has opened ring it; the narrower cells a cell has opened
// ring that cell, on the side away from whatever it hangs from; and so on
// down. Every ring is as wide as what sits on it, so nothing overlaps and a
// branch takes no paper until it is opened. The paper is therefore the size
// of what is on it, not the size of the library — a far view over twenty open
// cells reads at twenty cells' size, however many more could be opened.
//
// It is a pure function of the cells and the expansion state, deterministic,
// and linear in what is open, so it runs in the browser on every change in a
// few milliseconds. Nothing is settled by force: positions follow from the
// hierarchy, and a cell is always beside the cell it sits under.

export const PLATE_W = 320;
export const PLATE_H = 380;
/** A cell with no material yet is a name and a scope, and it takes only the
 *  room a name needs. */
export const NAME_W = 232;
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
/** Centre-to-centre room for one opened record. The nodes are squares, so two
 *  of them only overlap when their centres are within SAT_W on BOTH axes,
 *  which cannot happen once they are SAT_W × √2 apart however the ring turns. */
export const NODE_PITCH = SAT_W * Math.SQRT2 + RING_GAP;
/** Clear paper between a card's edge and the ring of records around it. The
 *  records used to hug the card; Rita asked for them to stand off it. */
const RING_PAD = 52;

/** Each layer of the map draws at this fraction of the one above it. A cell's
 *  layer is its depth in the hierarchy, so a narrower cell is always smaller
 *  than the cell it sits under, the way a road map draws a town smaller than
 *  the county. Zooming in reads the small ones. */
export const LEVEL_SHRINK = 0.6;
/** The deepest layer that still shrinks. Below this a card would be too small
 *  to reach at the camera's ceiling, so deeper cells draw at this layer's size. */
export const MAX_LEVEL = 3;
/** The category node: the entry to one map, drawn with the faces of its most
 *  prominent cells. */
export const HUB_W = 300;
export const HUB_H = 336;
/** Clear paper between a card's edge and the ring of cells it has opened, and
 *  between neighbours on that ring. */
const CHILD_GAP = 44;
/** Clear paper between one map's cluster and the next. */
const MAP_GAP = 360;

/** How much of full size a cell on this layer draws at. */
export function levelScale(level: number): number {
  return LEVEL_SHRINK ** Math.min(MAX_LEVEL, level);
}

/** Which layer a cell belongs to: its depth in the containment hierarchy. */
export function levelOf(index: GraphIndex, id: string): number {
  return Math.min(MAX_LEVEL, index.depthOf(id));
}

export function plateBox(cell: EncyclopediaCell, level = 0): { w: number; h: number } {
  const scale = levelScale(level);
  const base = cellFace(cell).kind === "name" ? { w: NAME_W, h: NAME_H } : { w: PLATE_W, h: PLATE_H };
  return { w: Math.round(base.w * scale), h: Math.round(base.h * scale) };
}

/** How far past a card's edge its ring of records reaches. */
function recordReach(cell: EncyclopediaCell, scale: number): number {
  return cell.manifestations.length ? (SAT_W + RING_PAD) * scale : 0;
}

export interface PlateNode {
  kind: "plate";
  id: string;
  cell: EncyclopediaCell;
  x: number; // centre
  y: number;
  /** The plate's own box on the paper. */
  w: number;
  h: number;
  /** Which layer of the map the cell belongs to: 0 is the top. */
  level: number;
  /** What fraction of full size the card draws at, from its layer. */
  scale: number;
  /** The direction the cell hangs away from what it sits under, in radians.
   *  Its records and its own narrower cells open on this side. */
  outward: number;
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
  /** The scale of the cell this node belongs to. */
  scale: number;
}

export interface HubNode {
  map: MapName;
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Every cell on this map, and how many sit at the top of it. */
  count: number;
  roots: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GraphLayout {
  plates: PlateNode[];
  satellites: SatelliteNode[];
  hubs: HubNode[];
  byId: Map<string, PlateNode>;
  /** Everything on the paper. */
  bounds: Rect;
}

/** A box with a centre, which is what the ring walk needs. */
interface Centred {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A point at distance `t` along the box pushed outward by `pad`: straight
 *  runs beside each edge, quarter turns at the corners. A ring drawn as an
 *  ellipse through the same clearances only clears the box on the axes — at
 *  forty-five degrees it cuts back inside and puts a node over the card. */
function boxRingPoint(box: Centred, pad: number, t: number): { x: number; y: number } {
  const hw = box.w / 2;
  const hh = box.h / 2;
  const corner = (Math.PI * pad) / 2;
  const legs = [box.w, corner, box.h, corner, box.w, corner, box.h, corner];
  const perimeter = 2 * box.w + 2 * box.h + 2 * Math.PI * pad;
  let d = ((t % perimeter) + perimeter) % perimeter;
  let leg = 0;
  while (d > legs[leg]) { d -= legs[leg]; leg++; }
  const turn = (from: number, cx: number, cy: number) => ({
    x: box.x + cx + Math.cos(from + d / pad) * pad,
    y: box.y + cy + Math.sin(from + d / pad) * pad,
  });
  switch (leg) {
    case 0: return { x: box.x - hw + d, y: box.y - hh - pad };          // top edge, left to right
    case 1: return turn(-Math.PI / 2, hw, -hh);                          // top-right corner
    case 2: return { x: box.x + hw + pad, y: box.y - hh + d };           // right edge, down
    case 3: return turn(0, hw, hh);                                      // bottom-right corner
    case 4: return { x: box.x + hw - d, y: box.y + hh + pad };           // bottom edge, right to left
    case 5: return turn(Math.PI / 2, -hw, hh);                           // bottom-left corner
    case 6: return { x: box.x - hw - pad, y: box.y + hh - d };           // left edge, up
    default: return turn(Math.PI, -hw, -hh);                             // top-left corner
  }
}

function ringPerimeter(box: Centred, pad: number): number {
  return 2 * box.w + 2 * box.h + 2 * Math.PI * pad;
}

/** Where along that path the given direction from the box's centre comes
 *  out, so a ring can be centred on the side it should open toward. */
function boxRingOffset(box: Centred, pad: number, away: number): number {
  const perimeter = ringPerimeter(box, pad);
  const wanted = Math.atan2(Math.sin(away), Math.cos(away));
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < 240; i++) {
    const t = (perimeter * i) / 240;
    const p = boxRingPoint(box, pad, t);
    const angle = Math.atan2(p.y - box.y, p.x - box.x);
    const gap = Math.abs(Math.atan2(Math.sin(angle - wanted), Math.cos(angle - wanted)));
    if (gap < bestGap) { bestGap = gap; best = t; }
  }
  return best;
}

interface Ring {
  /** How far outside the box's edge the ring's centre line runs. */
  pad: number;
  /** Indices into the list of things being placed. */
  members: number[];
}

/** Rings around a box that hold things of the given radii, innermost first.
 *  A ring's centre line runs far enough out that the widest thing on it
 *  clears the ring inside, and it holds as many things as its length allows.
 *  `inner` is how far past the box's edge the first ring may begin. */
function ringsFor(box: Centred, inner: number, radii: number[]): { rings: Ring[]; reach: number } {
  const rings: Ring[] = [];
  let from = inner + CHILD_GAP;
  let i = 0;
  while (i < radii.length) {
    const members: number[] = [];
    let widest = 0;
    let used = 0;
    while (i < radii.length) {
      const r = radii[i];
      const tryWidest = Math.max(widest, r);
      const perimeter = ringPerimeter(box, from + tryWidest);
      const tryUsed = used + 2 * r + CHILD_GAP;
      if (members.length && tryUsed > perimeter) break;
      members.push(i);
      widest = tryWidest;
      used = tryUsed;
      i++;
    }
    const pad = from + widest;
    rings.push({ pad, members });
    from = pad + widest + CHILD_GAP;
  }
  return { rings, reach: rings.length ? from - CHILD_GAP : inner };
}

/** Lay out what is open. See the top of the file. */
export function layoutVisible(index: GraphIndex, visible: Visible, maps: MapName[]): GraphLayout {
  const plates: PlateNode[] = [];
  const byId = new Map<string, PlateNode>();
  const satellites: SatelliteNode[] = [];
  const hubs: HubNode[] = [];

  // ── how much room each open branch takes ────────────────────────────────
  // A cell's radius is its card, its records, and every ring of cells it has
  // opened, measured from its centre. Bottom-up, memoised, so a branch is
  // measured once however many rings ask about it.
  const radius = new Map<string, number>();
  const ringsOf = new Map<string, { rings: Ring[]; reach: number }>();
  const measuring = new Set<string>();
  const radiusOf = (id: string): number => {
    const known = radius.get(id);
    if (known !== undefined) return known;
    const cell = index.byId.get(id)!;
    const level = levelOf(index, id);
    const scale = levelScale(level);
    const box = plateBox(cell, level);
    const inner = recordReach(cell, scale);
    const own = Math.hypot(box.w, box.h) / 2 + inner;
    // A containment cycle among open cells would measure itself forever;
    // the second visit takes the card alone.
    if (measuring.has(id)) return own;
    measuring.add(id);
    const kids = visible.shown.get(id) ?? [];
    if (!kids.length) { radius.set(id, own); return own; }
    const rings = ringsFor({ x: 0, y: 0, ...box }, inner, kids.map((k) => radiusOf(k.id)));
    ringsOf.set(id, rings);
    const r = Math.hypot(box.w, box.h) / 2 + rings.reach;
    radius.set(id, r);
    return r;
  };

  // ── placing ─────────────────────────────────────────────────────────────
  const placed = new Set<string>();
  /** Put the things on a ring: bunched on the side the ring opens toward
   *  when they take less than most of it, spread evenly round when they
   *  would fill it anyway. */
  const walkRing = (box: Centred, ring: Ring, radii: number[], toward: number, spread: boolean, put: (i: number, x: number, y: number) => void) => {
    const perimeter = ringPerimeter(box, ring.pad);
    const used = ring.members.reduce((sum, i) => sum + 2 * radii[i] + CHILD_GAP, 0);
    const even = spread || used > perimeter * 0.8;
    const slot = even ? perimeter / ring.members.length : 0;
    let t = even ? boxRingOffset(box, ring.pad, toward) - slot * (ring.members.length - 1) / 2 : boxRingOffset(box, ring.pad, toward) - used / 2;
    for (const i of ring.members) {
      const step = even ? slot : 2 * radii[i] + CHILD_GAP;
      const at = t + step / 2;
      const p = boxRingPoint(box, ring.pad, at);
      put(i, Math.round(p.x), Math.round(p.y));
      t += step;
    }
  };

  const place = (id: string, x: number, y: number, outward: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    const cell = index.byId.get(id)!;
    const level = levelOf(index, id);
    const scale = levelScale(level);
    const box = plateBox(cell, level);
    const node: PlateNode = { kind: "plate", id, cell, x, y, w: box.w, h: box.h, level, scale, outward };
    plates.push(node);
    byId.set(id, node);
    const kids = visible.shown.get(id) ?? [];
    const rings = ringsOf.get(id);
    if (!kids.length || !rings) return;
    const radii = kids.map((k) => radiusOf(k.id));
    for (const ring of rings.rings) {
      walkRing(node, ring, radii, outward, false, (i, kx, ky) => place(kids[i].id, kx, ky, Math.atan2(ky - y, kx - x)));
    }
  };

  // ── the maps, side by side ──────────────────────────────────────────────
  let cursor = 0;
  for (const map of maps) {
    const key = hubKey(map);
    const roots = visible.shown.get(key) ?? [];
    const radii = roots.map((r) => radiusOf(r.id));
    const hubBox = { x: 0, y: 0, w: HUB_W, h: HUB_H };
    const rings = ringsFor(hubBox, 0, radii);
    const reach = Math.hypot(HUB_W, HUB_H) / 2 + rings.reach;
    const hub: HubNode = {
      map, key,
      x: Math.round(cursor + reach), y: 0, w: HUB_W, h: HUB_H,
      count: index.graph.cells.filter((c) => index.primaryMap(c) === map).length,
      roots: index.rootsOn(map).length,
    };
    hubs.push(hub);
    cursor += reach * 2 + MAP_GAP;
    for (const ring of rings.rings) {
      walkRing(hub, ring, radii, -Math.PI / 2, true, (i, x, y) => place(roots[i].id, x, y, Math.atan2(y - hub.y, x - hub.x)));
    }
  }

  // ── each open cell's records, on the side away from what it hangs from ──
  for (const n of plates) {
    const list = n.cell.manifestations;
    if (!list.length) continue;
    const shown = Math.min(MAX_SATELLITES, list.length);
    const extra = list.length - shown;
    const ring = shown + (extra > 0 ? 1 : 0);
    // The records walk the card's own box at a fixed clearance, the way an
    // opened ring does: an ellipse through the same clearance clears the
    // card on its axes and cuts inside it at the corners.
    const pad = (SAT_W / 2 + RING_PAD) * n.scale;
    const perimeter = ringPerimeter(n, pad);
    const start = boxRingOffset(n, pad, n.outward);
    const arc = perimeter * (ring <= 3 ? 0.5 : 0.9);
    for (let j = 0; j < ring; j++) {
      const t = ring === 1 ? start : start - arc / 2 + (arc * j) / (ring - 1);
      const point = boxRingPoint(n, pad, t);
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      const isMore = extra > 0 && j === ring - 1;
      // The overflow node stands for the records past the ring, so it takes
      // the set of the first of them rather than repeating the last one drawn.
      const m = isMore ? list[shown] : list[j];
      satellites.push({ kind: "satellite", id: isMore ? `${n.id}~more` : `${n.id}~${j}`, cellId: n.id, set: m.entitySet, role: isMore ? "more" : "record", index: isMore ? -1 : j, more: isMore ? extra : 0, x, y, scale: n.scale });
    }
  }

  // ── the paper ───────────────────────────────────────────────────────────
  let left = Infinity; let top = Infinity; let right = -Infinity; let bottom = -Infinity;
  const take = (r: Rect) => { left = Math.min(left, r.x); top = Math.min(top, r.y); right = Math.max(right, r.x + r.w); bottom = Math.max(bottom, r.y + r.h); };
  for (const h of hubs) take({ x: h.x - h.w / 2, y: h.y - h.h / 2, w: h.w, h: h.h });
  for (const p of plates) take({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h });
  for (const s of satellites) take({ x: s.x - (SAT_W * s.scale) / 2, y: s.y - (SAT_H * s.scale) / 2, w: SAT_W * s.scale, h: SAT_H * s.scale });
  const bounds: Rect = Number.isFinite(left) ? { x: left - 200, y: top - 200, w: right - left + 400, h: bottom - top + 400 } : { x: 0, y: 0, w: 1, h: 1 };
  return { plates, satellites, hubs, byId, bounds };
}

/** Every record a cell names, opened out around it as its own node.
 *
 *  The ring the map draws by default holds eight; a cell that names sixty has
 *  the rest behind one node, and clicking that node lands here. The records go
 *  onto rings that trace the plate's own box at growing distances, each ring
 *  as full as its perimeter allows and walked at even spacing, so every record
 *  is a node on its own dotted line, every one is reachable, and none of them
 *  covers the card they belong to. The first slot is given to the node that
 *  folds them away again, on the side the "+N" node sat. */
export function expandCell(plate: PlateNode, away: number): SatelliteNode[] {
  const list = plate.cell.manifestations;
  if (!list.length) return [];
  const slot = NODE_PITCH * plate.scale;
  const out: SatelliteNode[] = [];
  let placed = 0;
  const total = list.length + 1;
  for (let ring = 0; placed < total && ring < 40; ring++) {
    const pad = (SAT_W / 2 + RING_PAD + ring * NODE_PITCH) * plate.scale;
    const perimeter = ringPerimeter(plate, pad);
    const capacity = Math.max(1, Math.floor(perimeter / slot));
    const here = Math.min(capacity, total - placed);
    const start = boxRingOffset(plate, pad, away);
    for (let j = 0; j < here; j++) {
      const t = start + (perimeter * j) / here + (ring % 2 ? perimeter / (2 * here) : 0);
      const point = boxRingPoint(plate, pad, t);
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      const at = placed + j;
      if (at === 0) {
        out.push({ kind: "satellite", id: `${plate.id}~fold`, cellId: plate.id, set: list[0].entitySet, role: "fold", index: -1, more: list.length, x, y, scale: plate.scale });
      } else {
        const m = list[at - 1];
        out.push({ kind: "satellite", id: `${plate.id}~${at - 1}`, cellId: plate.id, set: m.entitySet, role: "record", index: at - 1, more: 0, x, y, scale: plate.scale });
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

/** A dashed connector between two boxes: a soft S-curve, and the point where
 *  its word sits. */
export function plateConnector(a: Centred, b: Centred): { d: string; label: { x: number; y: number } } {
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
