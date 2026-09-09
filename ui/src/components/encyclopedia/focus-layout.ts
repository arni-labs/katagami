import type { EncyclopediaCell } from "@/lib/encyclopedia";
import type { GraphIndex } from "@/lib/encyclopedia-graph";

// Focus-and-context layout: the focused cell sits at the origin as a large
// specimen card; its broader cells sit above, its narrower cells below, and
// its typed relations to either side. Everything is placed from measured card
// sizes, so nothing overlaps whatever the content turns out to be.

export type Role = "focus" | "broader" | "narrower" | "relation";

export interface Size {
  w: number;
  h: number;
}

export interface PlacedCard {
  cell: EncyclopediaCell;
  role: Role;
  /** The word set along the dashed line to the focus. */
  word: string;
  explanation: string;
  x: number;
  y: number;
  w: number;
  h: number;
  side: "top" | "bottom" | "left" | "right" | null;
}

export interface FocusLayout {
  cards: PlacedCard[];
  focus: PlacedCard | null;
  bounds: { x: number; y: number; w: number; h: number };
}

export const FOCUS_W = 440;
export const NEIGHBOUR_W = 208;
const GAP = 36;
const REACH_Y = 96;
const REACH_X = 130;

const ESTIMATE: Record<Role, Size> = {
  focus: { w: FOCUS_W, h: 520 },
  broader: { w: NEIGHBOUR_W, h: 120 },
  narrower: { w: NEIGHBOUR_W, h: 160 },
  relation: { w: NEIGHBOUR_W, h: 240 },
};

export function layoutFocus(index: GraphIndex, focusId: string | null, sizes: Map<string, Size>): FocusLayout {
  const focusCell = focusId ? index.byId.get(focusId) : undefined;
  if (!focusCell) return { cards: [], focus: null, bounds: { x: 0, y: 0, w: 1, h: 1 } };
  const size = (id: string, role: Role): Size => sizes.get(id) ?? ESTIMATE[role];

  const f = size(focusCell.id, "focus");
  const focus: PlacedCard = { cell: focusCell, role: "focus", word: "", explanation: "", x: -f.w / 2, y: -f.h / 2, w: f.w, h: f.h, side: null };
  const cards: PlacedCard[] = [focus];
  const taken = new Set<string>([focusCell.id]);

  // Broader cells above, in a row.
  const parents = focusCell.broader.map((link) => ({ cell: index.byId.get(link.cellId), explanation: link.explanation })).filter((p): p is { cell: EncyclopediaCell; explanation: string } => Boolean(p.cell));
  placeRow(parents.map((p) => ({ cell: p.cell, role: "broader" as Role, word: "broader", explanation: p.explanation })), "top");

  // Narrower cells below, in a row.
  const kids = index.childrenOf(focusCell.id).filter((kid) => !taken.has(kid.id)).map((kid) => ({ cell: kid, role: "narrower" as Role, word: "narrower cell", explanation: kid.broader.find((b) => b.cellId === focusCell.id)?.explanation ?? "" }));
  placeRow(kids, "bottom");

  // Relations alternate right, left, right…, each side a centred column.
  const relations: Array<{ cell: EncyclopediaCell; role: Role; word: string; explanation: string }> = [];
  for (const n of index.neighbours(focusCell.id)) {
    if (n.via === "broader" || n.via === "narrower" || taken.has(n.cell.id)) continue;
    relations.push({ cell: n.cell, role: "relation", word: n.via, explanation: n.explanation });
    taken.add(n.cell.id);
  }
  const right = relations.filter((_, i) => i % 2 === 0);
  const left = relations.filter((_, i) => i % 2 === 1);
  placeColumn(right, "right");
  placeColumn(left, "left");

  function placeRow(items: Array<{ cell: EncyclopediaCell; role: Role; word: string; explanation: string }>, side: "top" | "bottom") {
    if (!items.length) return;
    const measured = items.map((item) => size(item.cell.id, item.role));
    const total = measured.reduce((sum, s) => sum + s.w, 0) + GAP * (items.length - 1);
    let x = -total / 2;
    items.forEach((item, i) => {
      const s = measured[i];
      const y = side === "top" ? focus.y - REACH_Y - s.h : focus.y + focus.h + REACH_Y;
      cards.push({ ...item, x, y, w: s.w, h: s.h, side });
      taken.add(item.cell.id);
      x += s.w + GAP;
    });
  }

  function placeColumn(items: Array<{ cell: EncyclopediaCell; role: Role; word: string; explanation: string }>, side: "left" | "right") {
    if (!items.length) return;
    const measured = items.map((item) => size(item.cell.id, item.role));
    const total = measured.reduce((sum, s) => sum + s.h, 0) + GAP * (items.length - 1);
    let y = -total / 2;
    items.forEach((item, i) => {
      const s = measured[i];
      const x = side === "right" ? focus.x + focus.w + REACH_X : focus.x - REACH_X - s.w;
      cards.push({ ...item, x, y, w: s.w, h: s.h, side });
      y += s.h + GAP;
    });
  }

  const minX = Math.min(...cards.map((c) => c.x));
  const minY = Math.min(...cards.map((c) => c.y));
  const maxX = Math.max(...cards.map((c) => c.x + c.w));
  const maxY = Math.max(...cards.map((c) => c.y + c.h));
  return { cards, focus, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

/** The dashed connector from a neighbour to the focus, with the point where
 *  its word sits. Vertical links elbow at the midpoint; side links bow. */
export function connector(card: PlacedCard, focus: PlacedCard): { d: string; label: { x: number; y: number } } {
  const fx = focus.x + focus.w / 2;
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  if (card.side === "top" || card.side === "bottom") {
    const y1 = card.side === "top" ? card.y + card.h : card.y;
    const y2 = card.side === "top" ? focus.y : focus.y + focus.h;
    const my = (y1 + y2) / 2;
    const d = `M ${cx} ${y1} C ${cx} ${my} ${fx} ${my} ${fx} ${y2}`;
    return { d, label: { x: Math.max(cx, fx) + 14, y: my } };
  }
  const x1 = card.side === "left" ? card.x + card.w : card.x;
  const x2 = card.side === "left" ? focus.x : focus.x + focus.w;
  // Meet the focus card at the neighbour's height when that is inside the
  // card; otherwise at the card's nearest third.
  const ty = Math.min(Math.max(cy, focus.y + 40), focus.y + focus.h - 40);
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${cy} C ${mx} ${cy} ${mx} ${ty} ${x2} ${ty}`;
  return { d, label: { x: mx, y: Math.min(cy, ty) - 14 } };
}
