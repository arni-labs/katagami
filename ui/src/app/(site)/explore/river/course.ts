import type { AtlasStyle } from "@/lib/catalog";
import type { Family } from "../shared";

// The river's geometry, shared by the river and the halftone river.

export type Slot = { x: number; y: number; a: number; s: number; k: number };
export const LIT = 1.32; // a lit tile stands a little proud of the river

/** One order for the whole library: a walk through the families by nearness, each family walked along the way to the next. */
export function flow(styles: AtlasStyle[], families: Family[]): AtlasStyle[] {
  const left = [...families];
  const tour: Family[] = [];
  let at = left.sort((a, b) => a.x + a.y - (b.x + b.y)).shift();
  while (at) {
    tour.push(at);
    const here = at;
    left.sort((a, b) => Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y));
    at = left.shift();
  }
  const out: AtlasStyle[] = [];
  tour.forEach((f, i) => {
    const prev = tour[i - 1] ?? f, next = tour[i + 1] ?? f;
    const dx = next.x - prev.x || 1, dy = next.y - prev.y;
    out.push(...styles.filter((s) => s.family === f.id).sort((a, b) => a.x * dx + a.y * dy - (b.x * dx + b.y * dy)));
  });
  // A style with no family joins the river beside whatever it sits nearest on the atlas.
  const named = new Set(tour.map((f) => f.id));
  for (const s of styles.filter((x) => !x.family || !named.has(x.family))) {
    let best = -1, bestD = Infinity;
    out.forEach((o, i) => { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bestD) { bestD = d; best = i; } });
    out.splice(best + 1, 0, s);
  }
  return out;
}

/** The serpentine's tile slots, in flow order. `s` is how far down the river a slot is, measured along the middle. */
export function course(count: number, width: number, tile: number, gap: number, wanted: number, inset = 0) {
  const pitch = tile + gap, phone = width < 750, margin = (phone ? 8 : 56) + inset, slack = phone ? 30 : 44;
  // As many lanes as leave a straight run at least a tile long: a narrow phone carries three, not four.
  let lanes = wanted;
  const room = (n: number) => width - 2 * margin - 2 * ((n * pitch) / 2 + (n * pitch) / 2 + slack);
  while (lanes > 2 && room(lanes) < pitch) lanes--;
  const half = (lanes * pitch) / 2, turn = half + slack; // the middle lane's turning radius: the inside lane still has room to turn
  const run = Math.max(pitch, room(lanes));
  const leg = run + Math.PI * turn, x0 = margin + half + turn, top = half + (phone ? 46 : 60);
  const slots: Slot[] = [];
  for (let legNo = 0; slots.length < count + lanes * 4 && legNo < 2000; legNo++) {
    const dir = legNo % 2 === 0 ? 1 : -1, y = top + legNo * turn * 2;
    for (let lane = 0; lane < lanes; lane++) {
      const off = (lane - (lanes - 1) / 2) * pitch; // + is below the middle on a rightward run
      // Slots share a stretch evenly, never closer than a tile and its gap, so a run meets its turn without a pinch.
      const along = Math.max(1, Math.floor(run / pitch)), step = run / along;
      // The first run starts at the page's edge, not where a turn would have put it.
      const lead = legNo === 0 ? Math.floor((x0 - margin - pitch / 2) / step) : 0;
      for (let k = -Math.max(0, lead); k < along; k++) { const d = (k + 0.5) * step; slots.push({ x: dir === 1 ? x0 + d : x0 + run - d, y: y + off * dir, a: 0, s: legNo * leg + d, k: 1 }); }
      // The U-turn: a half circle about a point level with the next run's start. Tiles turn with
      // the flow, so it is their inner edges that would touch first: the count is taken there.
      // Neighbours in the next lane sit at other angles, and two squares turned against each other need
      // more room than two that are square-on: in a turn a tile is drawn just small enough (`k`) to clear any of them.
      const r = turn - off, n = Math.max(1, Math.floor((Math.PI * (r - tile / 2)) / (tile + 1)));
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) / n) * Math.PI, cx = dir === 1 ? x0 + run : x0, cy = y + turn;
        slots.push({ x: cx + dir * Math.sin(t) * r, y: cy - Math.cos(t) * r, a: dir * t, s: legNo * leg + run + t * turn, k: Math.min(1, pitch / (tile * (0.5 + Math.SQRT1_2))) });
      }
    }
  }
  slots.sort((p, q) => p.s - q.s);
  const used = slots.slice(0, count);
  return { slots: used, height: used.reduce((low, p) => Math.max(low, p.y), 0) + half + 200, leg, turn, half, top };
}
