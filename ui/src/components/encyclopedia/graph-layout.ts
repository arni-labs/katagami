import type { EncyclopediaCell, MapName, ManifestationSet } from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";
import { cellFace } from "./material";

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
export const NAME_H = 132;
export const SAT_W = 56;
export const SAT_H = 56;
export const MAX_SATELLITES = 8;
const GRID_X = 360;
const GRID_Y = 330;
const REGION_GAP = 240;
/** Satellites hug the plate: the ring sits just outside its edge, so a cell's
 *  footprint stays close to the plate itself. */
const RING_PAD = 18;

export function plateBox(cell: EncyclopediaCell): { w: number; h: number } {
  return cellFace(cell).kind === "name" ? { w: NAME_W, h: NAME_H } : { w: PLATE_W, h: PLATE_H };
}

export interface PlateNode {
  kind: "plate";
  id: string;
  cell: EncyclopediaCell;
  x: number; // centre
  y: number;
  /** The plate's own box on the paper — a named cell is smaller than a
   *  pictured one, and connectors and the camera both read it from here. */
  w: number;
  h: number;
}

export interface SatelliteNode {
  kind: "satellite";
  id: string;
  cellId: string;
  set: ManifestationSet;
  /** Index into cell.manifestations, or -1 for the "+N more" node. */
  index: number;
  more: number;
  x: number;
  y: number;
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
  bounds: { x: number; y: number; w: number; h: number };
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

export function layoutGraph(index: GraphIndex): GraphLayout {
  const cells = index.graph.cells;
  const plates = new Map<string, PlateNode>();

  // ── regions by primary map ────────────────────────────────────────────
  // A map with no cells gets no ground on the paper: an empty placeholder
  // would stretch the field sideways and drive the fit zoom down for every
  // real cell. The filter chips already say which maps are still empty.
  const regions: Region[] = [];
  const filled = MAP_NAMES_ORDER.filter((map) => cells.some((c) => index.primaryMap(c) === map));
  // Size each region first, then pack the regions into rows about as wide as
  // they are tall, so the whole field is closer to a screen than to a ribbon.
  const shapes = filled.map((map) => {
    const members = cells.filter((c) => index.primaryMap(c) === map);
    const cols = Math.max(2, Math.ceil(Math.sqrt(members.length * 1.4)));
    const rows = Math.max(1, Math.ceil(members.length / cols));
    return { map, members, cols, rows, w: cols * GRID_X, h: rows * GRID_Y };
  });
  const targetRowWidth = bestRowWidth(shapes.map((s) => ({ w: s.w, h: s.h })));
  let rowX = 0;
  let rowY = 0;
  let rowH = 0;
  for (const shape of shapes) {
    if (rowX > 0 && rowX + shape.w > targetRowWidth) { rowX = 0; rowY += rowH + REGION_GAP; rowH = 0; }
    const originX = rowX;
    const originY = rowY;
    // Roots first, ordered by how much hangs under them, then the rest.
    const roots = index.roots.filter((c) => index.primaryMap(c) === shape.map).sort((a, b) => index.descendants(b.id).length - index.descendants(a.id).length || a.name.localeCompare(b.name));
    const placed = new Set<string>();
    let i = 0;
    const put = (cell: EncyclopediaCell) => {
      if (placed.has(cell.id)) return;
      const col = i % shape.cols;
      const row = Math.floor(i / shape.cols);
      const box = plateBox(cell);
      plates.set(cell.id, { kind: "plate", id: cell.id, cell, x: originX + col * GRID_X + (row % 2 ? GRID_X / 2 : 0), y: originY + row * GRID_Y, w: box.w, h: box.h });
      placed.add(cell.id);
      i++;
    };
    // Depth-first so children land next to their parent in the grid.
    const visit = (cell: EncyclopediaCell) => { put(cell); for (const kid of index.childrenOf(cell.id)) if (index.primaryMap(kid) === shape.map) visit(kid); };
    roots.forEach(visit);
    shape.members.forEach(put);
    regions.push({ map: shape.map, x: originX - GRID_X / 2, y: originY - GRID_Y / 2, w: shape.w, h: shape.h, count: shape.members.length });
    rowX += shape.w + REGION_GAP;
    rowH = Math.max(rowH, shape.h);
  }

  // ── force pass ────────────────────────────────────────────────────────
  const nodes = [...plates.values()];
  // A cell with manifestations needs room for its ring; one without needs
  // only its plate and a margin.
  const ringX = (n: PlateNode) => n.w / 2 + SAT_W / 2 + RING_PAD;
  const ringY = (n: PlateNode) => n.h / 2 + SAT_H / 2 + RING_PAD;
  const footW = (n: PlateNode) => (n.cell.manifestations.length ? 2 * ringX(n) + SAT_W : n.w + 56);
  const footH = (n: PlateNode) => (n.cell.manifestations.length ? 2 * ringY(n) + SAT_H : n.h + 56);
  const centres = new Map(regions.map((r) => [r.map, { x: r.x + r.w / 2, y: r.y + r.h / 2 }]));
  const edges: Array<[PlateNode, PlateNode]> = [];
  for (const cell of cells) {
    for (const link of cell.broader) { const other = plates.get(link.cellId); if (other) edges.push([plates.get(cell.id)!, other]); }
    for (const rel of cell.relations) { const other = plates.get(rel.cellId); if (other) edges.push([plates.get(cell.id)!, other]); }
  }
  const REST = 560;
  for (let iter = 0; iter < 260; iter++) {
    const t = 1 - iter / 260;
    const step = 0.12 * t + 0.02;
    const fx = new Map<string, number>();
    const fy = new Map<string, number>();
    for (const n of nodes) { fx.set(n.id, 0); fy.set(n.id, 0); }
    // Repulsion between plates (short range).
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const A = nodes[a]; const B = nodes[b];
        let dx = B.x - A.x; let dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = (footW(A) + footW(B)) / 2 + 80;
        if (d > reach) continue;
        dx /= d; dy /= d;
        const f = (reach - d) * 0.9;
        fx.set(A.id, fx.get(A.id)! - dx * f); fy.set(A.id, fy.get(A.id)! - dy * f);
        fx.set(B.id, fx.get(B.id)! + dx * f); fy.set(B.id, fy.get(B.id)! + dy * f);
      }
    }
    // Springs along edges.
    for (const [A, B] of edges) {
      let dx = B.x - A.x; let dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const f = (d - REST) * 0.35;
      fx.set(A.id, fx.get(A.id)! + dx * f); fy.set(A.id, fy.get(A.id)! + dy * f);
      fx.set(B.id, fx.get(B.id)! - dx * f); fy.set(B.id, fy.get(B.id)! - dy * f);
    }
    // Gravity to the map's centre keeps regions apart and roughly square.
    for (const n of nodes) {
      const c = centres.get(index.primaryMap(n.cell))!;
      fx.set(n.id, fx.get(n.id)! + (c.x - n.x) * 0.05);
      fy.set(n.id, fy.get(n.id)! + (c.y - n.y) * 0.05);
    }
    for (const n of nodes) { n.x += fx.get(n.id)! * step; n.y += fy.get(n.id)! * step; }
  }

  // ── separate footprints (plate + its ring of satellites) ─────────────
  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const A = nodes[a]; const B = nodes[b];
        const dx = B.x - A.x; const dy = B.y - A.y;
        const ox = (footW(A) + footW(B)) / 2 + 24 - Math.abs(dx);
        const oy = (footH(A) + footH(B)) / 2 + 24 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) { const s = (ox / 2 + 1) * (dx >= 0 ? 1 : -1); A.x -= s; B.x += s; }
        else { const s = (oy / 2 + 1) * (dy >= 0 ? 1 : -1); A.y -= s; B.y += s; }
      }
    }
    if (!moved) break;
  }

  // Snap positions to whole pixels so the SVG and the cards agree.
  for (const n of nodes) { n.x = Math.round(n.x); n.y = Math.round(n.y); }

  // ── satellites on a ring, facing away from the nearest other plate ───
  const satellites: SatelliteNode[] = [];
  for (const n of nodes) {
    const list = n.cell.manifestations;
    if (!list.length) continue;
    const shown = Math.min(MAX_SATELLITES, list.length);
    const extra = list.length - shown;
    const count = shown + (extra > 0 ? 1 : 0);
    // Open the ring on the side away from the closest neighbour.
    let nearest: PlateNode | null = null; let best = Infinity;
    for (const o of nodes) { if (o === n) continue; const d = Math.hypot(o.x - n.x, o.y - n.y); if (d < best) { best = d; nearest = o; } }
    const away = nearest ? Math.atan2(n.y - nearest.y, n.x - nearest.x) : -Math.PI / 2;
    const arc = count <= 3 ? Math.PI * 0.8 : Math.PI * 1.6;
    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? away : away - arc / 2 + (arc * i) / (count - 1);
      // Stretch the ring to the plate's proportions.
      const x = Math.round(n.x + Math.cos(angle) * ringX(n));
      const y = Math.round(n.y + Math.sin(angle) * ringY(n));
      const isMore = extra > 0 && i === count - 1;
      const m = isMore ? list[shown - 1] : list[i];
      satellites.push({ kind: "satellite", id: isMore ? `${n.id}~more` : `${n.id}~${i}`, cellId: n.id, set: m.entitySet, index: isMore ? -1 : i, more: isMore ? extra : 0, x, y });
    }
  }
  // Push satellites out of plates and off each other.
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (const s of satellites) {
      for (const p of nodes) {
        const ox = (p.w / 2 + SAT_W / 2 + 16) - Math.abs(s.x - p.x);
        const oy = (p.h / 2 + SAT_H / 2 + 16) - Math.abs(s.y - p.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) s.x += (ox + 1) * (s.x >= p.x ? 1 : -1); else s.y += (oy + 1) * (s.y >= p.y ? 1 : -1);
      }
    }
    for (let a = 0; a < satellites.length; a++) {
      for (let b = a + 1; b < satellites.length; b++) {
        const A = satellites[a]; const B = satellites[b];
        const dx = B.x - A.x; const dy = B.y - A.y;
        const ox = SAT_W + 10 - Math.abs(dx); const oy = SAT_H + 10 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) { const s = (ox / 2 + 1) * (dx >= 0 ? 1 : -1); A.x -= s; B.x += s; }
        else { const s = (oy / 2 + 1) * (dy >= 0 ? 1 : -1); A.y -= s; B.y += s; }
      }
    }
    if (!moved) break;
  }
  for (const s of satellites) { s.x = Math.round(s.x); s.y = Math.round(s.y); }

  // Regions follow their members.
  for (const r of regions) {
    const members = nodes.filter((n) => index.primaryMap(n.cell) === r.map);
    if (!members.length) continue;
    const left = Math.min(...members.map((m) => m.x - footW(m) / 2)); const right = Math.max(...members.map((m) => m.x + footW(m) / 2));
    const topY = Math.min(...members.map((m) => m.y - footH(m) / 2)); const bottomY = Math.max(...members.map((m) => m.y + footH(m) / 2));
    r.x = left - 40; r.y = topY - 120; r.w = right - left + 80; r.h = bottomY - topY + 160;
  }
  const all = [...nodes.map(plateRect), ...satellites.map((s) => ({ x: s.x - SAT_W / 2, y: s.y - SAT_H / 2, w: SAT_W, h: SAT_H })), ...regions];
  if (!all.length) return { plates: nodes, satellites, regions, byId: plates, bounds: { x: 0, y: 0, w: 1, h: 1 } };
  const minX = Math.min(...all.map((r) => r.x)); const minY = Math.min(...all.map((r) => r.y));
  const maxX = Math.max(...all.map((r) => r.x + r.w)); const maxY = Math.max(...all.map((r) => r.y + r.h));
  return { plates: nodes, satellites, regions, byId: plates, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
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
