import type { EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";

// Layout for variation A: roots sit in one cluster per map; an expanded node's
// children open on a ring around it, facing away from its parent; a short
// relaxation pushes overlapping cards apart. Deterministic, and it starts from
// the previous positions so expanding one node does not reshuffle the rest.
// Clusters are placed from the data: maps with cells sit in a row, maps with
// none are small empty regions below, so an empty map is a visible gap and
// not a quarter of the plane.

export interface Placed {
  cell: EncyclopediaCell;
  x: number;
  y: number;
  /** The visible parent this node hangs off, if any. */
  parent: string | null;
  depth: number;
}

export interface Cluster {
  map: MapName;
  x: number;
  y: number;
  w: number;
  h: number;
  roots: number;
  empty: boolean;
}

export interface FieldLayout {
  nodes: Placed[];
  clusters: Cluster[];
}

export const NODE_W = 210;
export const NODE_H = 72;
const GAP_X = 244;
const GAP_Y = 112;
const CLUSTER_GAP = 560;
const EMPTY_W = 300;
const EMPTY_H = 110;

function clusterPlan(index: GraphIndex): { positions: Map<string, { x: number; y: number }>; clusters: Cluster[] } {
  const positions = new Map<string, { x: number; y: number }>();
  const clusters: Cluster[] = [];
  const filled = MAP_NAMES_ORDER.filter((map) => index.roots.some((cell) => index.primaryMap(cell) === map));
  const empty = MAP_NAMES_ORDER.filter((map) => !filled.includes(map));

  // Clusters stack vertically as wide, shallow rows — a landscape viewport
  // frames a wide stack at a far larger scale than a side-by-side row, so the
  // top layer opens legible. Alternate rows are staggered half a step.
  const measured = filled.map((map) => {
    const roots = index.roots.filter((cell) => index.primaryMap(cell) === map);
    const cols = Math.min(6, Math.max(1, Math.ceil(roots.length / 2)));
    const rows = Math.ceil(roots.length / cols);
    const w = (cols - 1) * GAP_X + (rows > 1 ? GAP_X / 2 : 0) + NODE_W;
    const h = (rows - 1) * GAP_Y + NODE_H;
    return { map, roots, cols, rows, w, h };
  });
  const totalH = measured.reduce((sum, m) => sum + m.h, 0) + CLUSTER_GAP * Math.max(0, measured.length - 1);
  let cursor = -totalH / 2;
  let maxW = 0;
  for (const m of measured) {
    const originX = -m.w / 2 + NODE_W / 2;
    const originY = cursor + NODE_H / 2;
    m.roots.forEach((cell, i) => {
      const col = i % m.cols;
      const row = Math.floor(i / m.cols);
      const stagger = row % 2 ? GAP_X / 2 : 0;
      positions.set(cell.id, { x: originX + col * GAP_X + stagger, y: originY + row * GAP_Y });
    });
    clusters.push({ map: m.map, x: -m.w / 2, y: cursor, w: m.w, h: m.h, roots: m.roots.length, empty: false });
    maxW = Math.max(maxW, m.w);
    cursor += m.h + CLUSTER_GAP;
  }
  // Empty maps: small regions in a row under the filled ones, so an empty map
  // is a visible gap and not a quarter of the plane.
  const emptyTotal = empty.length * EMPTY_W + Math.max(0, empty.length - 1) * 80;
  let ex = -emptyTotal / 2;
  for (const map of empty) {
    clusters.push({ map, x: ex, y: cursor - CLUSTER_GAP + 200, w: EMPTY_W, h: EMPTY_H, roots: 0, empty: true });
    ex += EMPTY_W + 80;
  }
  return { positions, clusters };
}

export function layoutField(
  index: GraphIndex,
  expanded: Set<string>,
  previous: Map<string, { x: number; y: number }>,
): FieldLayout {
  const placed = new Map<string, Placed>();
  const { positions, clusters } = clusterPlan(index);
  for (const root of index.roots) {
    const p = positions.get(root.id)!;
    placed.set(root.id, { cell: root, x: p.x, y: p.y, parent: null, depth: 0 });
  }

  // Breadth-first through expanded nodes so a child hangs off the shallowest
  // visible parent that is expanded.
  const queue = [...index.roots.map((r) => r.id)];
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift()!;
    if (!expanded.has(id)) continue;
    const parent = placed.get(id)!;
    const kids = index.childrenOf(id).filter((kid) => !placed.has(kid.id));
    if (!kids.length) continue;
    // Roots open downward, away from the row; deeper nodes face away from
    // their own parent.
    const grand = parent.parent ? placed.get(parent.parent)! : { x: parent.x, y: parent.y - 1 };
    const base = Math.atan2(parent.y - grand.y, parent.x - grand.x);
    const radius = Math.max(200, 44 * kids.length + 100);
    // Roots fan into the gap below their row (a half circle at most); deeper
    // nodes may wrap further round.
    const arc = kids.length === 1 ? 0 : Math.min(parent.parent ? Math.PI * 1.1 : Math.PI * 0.95, (kids.length - 1) * 0.72);
    kids.forEach((kid, i) => {
      const angle = kids.length === 1 ? base : base - arc / 2 + (arc * i) / (kids.length - 1);
      const prev = previous.get(kid.id);
      const x = prev?.x ?? parent.x + Math.cos(angle) * radius;
      const y = prev?.y ?? parent.y + Math.sin(angle) * radius;
      placed.set(kid.id, { cell: kid, x, y, parent: id, depth: parent.depth + 1 });
      if (!seen.has(kid.id)) { seen.add(kid.id); queue.push(kid.id); }
    });
  }

  // Relax: push overlapping cards apart. Roots hold still.
  const nodes = [...placed.values()];
  const padX = NODE_W + 28;
  const padY = NODE_H + 30;
  for (let iteration = 0; iteration < 80; iteration++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = padX - Math.abs(dx);
        const overlapY = padY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const aFree = a.parent !== null;
        const bFree = b.parent !== null;
        if (!aFree && !bFree) continue;
        moved = true;
        // Resolve along the axis of least penetration.
        const push = overlapX < overlapY ? { x: (overlapX / 2 + 1) * (dx >= 0 ? 1 : -1), y: 0 } : { x: 0, y: (overlapY / 2 + 1) * (dy >= 0 ? 1 : -1) };
        if (aFree && bFree) { a.x -= push.x; a.y -= push.y; b.x += push.x; b.y += push.y; }
        else if (bFree) { b.x += push.x * 2; b.y += push.y * 2; }
        else { a.x -= push.x * 2; a.y -= push.y * 2; }
      }
    }
    if (!moved) break;
  }
  return { nodes, clusters };
}
