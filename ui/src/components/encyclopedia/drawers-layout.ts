import type { EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";

// Layout for variation B: the whole hierarchy laid out once as nested sheets.
// A cell is a sheet with a title strip; its narrower cells are smaller sheets
// packed inside it. Entering a cell is a camera move, not a data change, so
// every level exists at once and the zoom level decides how much of each
// sheet is legible. A cell with several broader cells is drawn once, under its
// first parent; the other parents hold a ghost that jumps to the real sheet.

export interface Tile {
  id: string;
  cell: EncyclopediaCell;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  parent: string | null;
  /** Height of the title strip; children live below it. */
  headerH: number;
  ghost: boolean;
  /** For a ghost: the id of the real tile it points at. */
  target?: string;
}

export interface Board {
  map: MapName;
  x: number;
  y: number;
  w: number;
  h: number;
  headerH: number;
  count: number;
}

export interface DrawersLayout {
  tiles: Tile[];
  boards: Board[];
  byId: Map<string, Tile>;
  bounds: { x: number; y: number; w: number; h: number };
}

const LEAF_W = 250;
const LEAF_H = 160;
const GAP = 22;
const HEADER = 64;
const PAD = 22;
const BOARD_HEADER = 84;
const BOARD_PAD = 34;
const BOARD_GAP = 120;

interface Measured {
  w: number;
  h: number;
  cols: number;
  children: Array<{ cell: EncyclopediaCell; ghost: boolean; size: Measured | null }>;
}

function measure(index: GraphIndex, cell: EncyclopediaCell, owner: Map<string, string>, stack: Set<string>): Measured {
  const kids = index.childrenOf(cell.id);
  const children = kids.map((kid) => {
    const ghost = owner.get(kid.id) !== cell.id || stack.has(kid.id);
    return { cell: kid, ghost, size: ghost ? null : measure(index, kid, owner, new Set([...stack, cell.id])) };
  });
  if (!children.length) return { w: LEAF_W, h: LEAF_H, cols: 0, children };
  const cols = children.length <= 2 ? children.length : Math.ceil(Math.sqrt(children.length));
  const cellW = Math.max(LEAF_W, ...children.map((c) => c.size?.w ?? LEAF_W));
  const cellH = Math.max(LEAF_H * 0.6, ...children.map((c) => c.size?.h ?? LEAF_H * 0.6));
  const rows = Math.ceil(children.length / cols);
  const w = Math.max(LEAF_W, cols * cellW + (cols - 1) * GAP + PAD * 2);
  const h = HEADER + rows * cellH + (rows - 1) * GAP + PAD * 2;
  return { w, h, cols, children };
}

export function layoutDrawers(index: GraphIndex): DrawersLayout {
  // Each cell is owned by its first broader parent that is in the library.
  const owner = new Map<string, string>();
  for (const cell of index.graph.cells) {
    const parent = index.parentsOf(cell.id)[0];
    if (parent) owner.set(cell.id, parent.id);
  }

  const tiles: Tile[] = [];
  const boards: Board[] = [];

  function place(cell: EncyclopediaCell, m: Measured, x: number, y: number, depth: number, parent: string | null) {
    tiles.push({ id: cell.id, cell, x, y, w: m.w, h: m.h, depth, parent, headerH: m.children.length ? HEADER : m.h, ghost: false });
    if (!m.children.length) return;
    const cellW = Math.max(LEAF_W, ...m.children.map((c) => c.size?.w ?? LEAF_W));
    const cellH = Math.max(LEAF_H * 0.6, ...m.children.map((c) => c.size?.h ?? LEAF_H * 0.6));
    m.children.forEach((child, i) => {
      const col = i % m.cols;
      const row = Math.floor(i / m.cols);
      const cx = x + PAD + col * (cellW + GAP);
      const cy = y + HEADER + PAD + row * (cellH + GAP);
      if (child.ghost || !child.size) {
        tiles.push({ id: `${cell.id}→${child.cell.id}`, cell: child.cell, x: cx, y: cy, w: cellW, h: Math.min(cellH, 96), depth: depth + 1, parent: cell.id, headerH: Math.min(cellH, 96), ghost: true, target: child.cell.id });
      } else {
        // Centre a smaller sheet inside its slot.
        place(child.cell, child.size, cx + (cellW - child.size.w) / 2, cy, depth + 1, cell.id);
      }
    });
  }

  let boardX = 0;
  for (const map of MAP_NAMES_ORDER) {
    const roots = index.roots.filter((cell) => index.primaryMap(cell) === map);
    const measured = roots.map((root) => measure(index, root, owner, new Set()));
    const count = index.graph.cells.filter((cell) => cell.maps.some((mm) => mm.map === map)).length;
    // Roots stack in a column, widest first, so each board is a tall drawer.
    const order = roots.map((_, i) => i).sort((a, b) => measured[b].w * measured[b].h - measured[a].w * measured[a].h);
    const boardW = Math.max(LEAF_W + BOARD_PAD * 2, ...measured.map((m) => m.w + BOARD_PAD * 2));
    let cursorY = BOARD_HEADER + BOARD_PAD;
    for (const i of order) {
      const m = measured[i];
      place(roots[i], m, boardX + (boardW - m.w) / 2, cursorY, 0, null);
      cursorY += m.h + GAP * 1.6;
    }
    const boardH = Math.max(BOARD_HEADER + BOARD_PAD * 2 + LEAF_H, cursorY - GAP * 1.6 + BOARD_PAD);
    boards.push({ map, x: boardX, y: 0, w: boardW, h: boardH, headerH: BOARD_HEADER, count });
    boardX += boardW + BOARD_GAP;
  }

  const byId = new Map(tiles.filter((t) => !t.ghost).map((t) => [t.id, t]));
  const maxH = Math.max(...boards.map((b) => b.h));
  return { tiles, boards, byId, bounds: { x: 0, y: 0, w: boardX - BOARD_GAP, h: maxH } };
}
