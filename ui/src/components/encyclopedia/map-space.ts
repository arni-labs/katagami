import type { GraphLayout, PlateNode } from "./graph-layout";
import { plateBox } from "./graph-layout";
import type { GraphIndex } from "@/lib/encyclopedia-graph";
import { cellMaterial } from "./material";
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SpatialItem extends Bounds {
  id: string;
  scale: number;
}
type Branch<T> = { bounds: Bounds; maxScale: number } & (
  | { kind: "leaf"; items: T[] }
  | { kind: "split"; left: Branch<T>; right: Branch<T> }
);
const intersects = (a: Bounds, b: Bounds) =>
  a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
function build<T extends SpatialItem>(items: T[], depth = 0): Branch<T> | null {
  if (!items.length) return null;
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity,
    maxScale = 0;
  for (const n of items) {
    x = Math.min(x, n.x);
    y = Math.min(y, n.y);
    right = Math.max(right, n.x + n.w);
    bottom = Math.max(bottom, n.y + n.h);
    maxScale = Math.max(maxScale, n.scale);
  }
  const bounds = { x, y, w: right - x, h: bottom - y };
  if (items.length <= 12) return { kind: "leaf", items, bounds, maxScale };
  const axis = depth % 2 === 0 ? "x" : "y";
  items.sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(items.length / 2);
  const left = build(items.slice(0, mid), depth + 1),
    rightBranch = build(items.slice(mid), depth + 1);
  if (!left || !rightBranch) return { kind: "leaf", items, bounds, maxScale };
  return { kind: "split", left, right: rightBranch, bounds, maxScale };
}
/** Static hierarchy of bounds: a camera move visits only intersecting branches. */
export class ViewportIndex<T extends SpatialItem> {
  private readonly root: Branch<T> | null;
  constructor(items: readonly T[]) {
    this.root = build([...items]);
  }
  query(bounds: Bounds, minScale = 0): T[] {
    const out: T[] = [];
    const walk = (branch: Branch<T> | null) => {
      if (
        !branch ||
        branch.maxScale < minScale ||
        !intersects(branch.bounds, bounds)
      )
        return;
      if (branch.kind === "leaf") {
        for (const n of branch.items)
          if (n.scale >= minScale && intersects(n, bounds)) out.push(n);
      } else {
        walk(branch.left);
        walk(branch.right);
      }
    };
    walk(this.root);
    return out;
  }
}
export const FOCUS_WIDTH = 520;
export function focusBox(cell: PlateNode["cell"]) {
  const m = cellMaterial(cell);
  return {
    w: FOCUS_WIDTH,
    h: m.image ? 590 : m.text ? 450 : m.palette ? 340 : 280,
  };
}
/** The same map and identities, with a local arrangement around the focused cell.
 * Depth changes positions and size; cards remain facing the reader. */
export function focusLayout(
  base: GraphLayout,
  index: GraphIndex,
  id: string | null,
  angle: number,
): GraphLayout {
  const focus = id ? base.byId.get(id) : undefined;
  if (!focus) return base;
  const neighbors = index
    .neighbours(focus.id)
    .filter((n) => n.cell.id !== focus.id);
  const groups = [
    neighbors.filter((n) => n.via === "broader"),
    neighbors.filter((n) => n.via === "narrower"),
    neighbors.filter((n) => n.via !== "broader" && n.via !== "narrower"),
  ];
  const replacements = new Map<string, PlateNode>();
  const rad = (angle * Math.PI) / 180;
  const originX = focus.x,
    originY = focus.y;
  function place(
    original: PlateNode,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
  ) {
    const rx = x * Math.cos(rad) + z * Math.sin(rad);
    const rz = z * Math.cos(rad) - x * Math.sin(rad);
    const perspective = 2400 / (2400 - rz);
    const scale = perspective;
    replacements.set(original.id, {
      ...original,
      x: originX + rx * perspective,
      y: originY + (y - z * 0.1) * perspective,
      w: w * scale,
      h: h * scale,
      scale,
      level: 0,
    });
  }
  const f = focusBox(focus.cell);
  place(focus, 0, 0, angle ? 140 : 0, f.w, f.h);
  groups.forEach((group, kind) =>
    group.slice(0, kind === 2 ? 6 : 4).forEach((n, i) => {
      const p = base.byId.get(n.cell.id);
      if (!p) return;
      const box = plateBox(p.cell);
      let x: number, y: number;
      if (kind === 0) {
        x = (i - (Math.min(group.length, 4) - 1) / 2) * 330;
        y = -f.h / 2 - 220;
      } else if (kind === 1) {
        x = (i - (Math.min(group.length, 4) - 1) / 2) * 340;
        y = f.h / 2 + 240;
      } else {
        x = (i % 2 === 0 ? -1 : 1) * 640;
        y = (Math.floor(i / 2) - 1) * 440;
      }
      place(
        p,
        x,
        y,
        angle ? (kind === 0 ? -180 : kind === 1 ? -50 : -100) : 0,
        box.w,
        box.h,
      );
    }),
  );
  const plates = base.plates.map((p) => replacements.get(p.id) ?? p);
  const satellites = base.satellites.map((s) => {
    const original = base.byId.get(s.cellId),
      p = replacements.get(s.cellId);
    if (!original || !p) return s;
    const factor = Math.max(p.w / original.w, p.h / original.h);
    return {
      ...s,
      x: p.x + (s.x - original.x) * factor,
      y: p.y + (s.y - original.y) * factor,
      scale: p.scale,
    };
  });
  return {
    ...base,
    plates,
    satellites,
    byId: new Map(plates.map((p) => [p.id, p])),
  };
}
