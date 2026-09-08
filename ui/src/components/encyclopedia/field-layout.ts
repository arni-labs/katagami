import type { EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";

// Layout for variation A: roots sit in four map clusters; an expanded node's
// children open on a ring around it, facing away from its parent; a short
// relaxation pushes overlapping cards apart. Deterministic, and it starts from
// the previous positions so expanding one node does not reshuffle the rest.

export interface Placed {
  cell: EncyclopediaCell;
  x: number;
  y: number;
  /** The visible parent this node hangs off, if any. */
  parent: string | null;
  depth: number;
}

export const NODE_W = 210;
export const NODE_H = 72;

/** Cluster anchors — a loose diamond so the four maps read as four regions. */
export const CLUSTER_ANCHOR: Record<MapName, { x: number; y: number }> = {
  art: { x: -900, y: -420 },
  writing: { x: 900, y: -420 },
  palettes: { x: -900, y: 480 },
  design: { x: 900, y: 480 },
};

function rootPositions(index: GraphIndex): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  for (const map of MAP_NAMES_ORDER) {
    const roots = index.roots.filter((cell) => index.primaryMap(cell) === map);
    const anchor = CLUSTER_ANCHOR[map];
    const cols = Math.max(1, Math.ceil(Math.sqrt(roots.length)));
    const gapX = 330;
    const gapY = 250;
    const rows = Math.ceil(roots.length / cols);
    roots.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // Stagger alternate rows so the cluster reads as a scatter, not a table.
      const stagger = row % 2 ? gapX / 2 : 0;
      out.set(cell.id, {
        x: anchor.x + (col - (cols - 1) / 2) * gapX + stagger,
        y: anchor.y + (row - (rows - 1) / 2) * gapY,
      });
    });
  }
  return out;
}

export function layoutField(
  index: GraphIndex,
  expanded: Set<string>,
  previous: Map<string, { x: number; y: number }>,
): Placed[] {
  const placed = new Map<string, Placed>();
  const roots = rootPositions(index);
  for (const root of index.roots) {
    const p = roots.get(root.id)!;
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
    // Face away from the grandparent, or away from the field centre for roots.
    const grand = parent.parent ? placed.get(parent.parent)! : { x: 0, y: 0 };
    const base = Math.atan2(parent.y - grand.y, parent.x - grand.x);
    const radius = Math.max(230, 52 * kids.length + 90);
    const arc = kids.length === 1 ? 0 : Math.min(Math.PI * 1.15, (kids.length - 1) * 0.62);
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
  const padX = NODE_W + 36;
  const padY = NODE_H + 44;
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
        moved = true;
        // Resolve along the axis of least penetration.
        const push = overlapX < overlapY ? { x: (overlapX / 2 + 1) * (dx >= 0 ? 1 : -1), y: 0 } : { x: 0, y: (overlapY / 2 + 1) * (dy >= 0 ? 1 : -1) };
        const aFree = a.parent !== null;
        const bFree = b.parent !== null;
        if (aFree && bFree) { a.x -= push.x; a.y -= push.y; b.x += push.x; b.y += push.y; }
        else if (bFree) { b.x += push.x * 2; b.y += push.y * 2; }
        else if (aFree) { a.x -= push.x * 2; a.y -= push.y * 2; }
      }
    }
    if (!moved) break;
  }
  return nodes;
}
