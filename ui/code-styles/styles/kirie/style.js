// Kirie: a picture cut from one sheet of paper with a knife, then mounted on a backing sheet.
// The film is the making: the design is drawn on the black sheet over a cutting mat, cut out
// smallest piece first, the sheet is lifted, and it lands on its backing.
import {
  grid, components, walk, blur, isolines, chaikin, lengths, along, area, bounds, tracePath,
  paper, canvas, hex, rgb, luminance, rng, hash, progress, clamp, smooth, easeOut, easeInOut,
} from '../../runtime/core.js';

export const meta = {
  id: 'kirie',
  name: 'Kirie',
  version: '0.1.0',
  creator: { name: 'Rita Agafonova', handle: 'arni.art' },
  licence: 'Apache-2.0',
  medium: 'print',
  tradition: [{ cell: 'kirie', name: 'Kirie (Japanese paper cutting)' }],
  parents: [],
  duration: 16,
  summary:
    'Any picture cut from one black sheet with a knife: darks stay as paper, lights are cut away, middle tones become cut stripes. Every piece stays joined to the sheet.',
};

export const params = {
  sheet: { type: 'colour', default: '#17161c', label: 'Sheet', options: ['#17161c', '#1f2d5c', '#b8322a', '#1d4a3a'] },
  backing: {
    type: 'colour', default: '#f4ecdc', label: 'Backing',
    options: ['#f4ecdc', '#e2462f', '#f3c13a', '#2d5fb8', '#ffffff'],
  },
  detail: { type: 'choice', default: 'fine', options: ['fine', 'bold'], label: 'Knife' },
  pattern: { type: 'choice', default: 'lines', options: ['lines', 'dots'], label: 'Middle tones' },
  ground: { type: 'choice', default: 'moon', options: ['moon', 'horizon', 'none'], label: 'Behind the subject' },
  light: { type: 'number', default: 0.5, min: 0.2, max: 0.8, step: 0.05, label: 'Light' },
};

export const stages = [
  { id: 'draw', label: 'Draw the design on the sheet', share: 0.1 },
  { id: 'cut', label: 'Cut, smallest pieces first', share: 0.66 },
  { id: 'lift', label: 'Lift the sheet off the mat', share: 0.12 },
  { id: 'mount', label: 'Mount it on the backing', share: 0.12 },
];

export const rules = [
  {
    id: 'one-sheet',
    text: 'Every remaining shape stays joined to the rest of the sheet by paper bridges.',
    source: 'kirie · structure',
  },
  {
    id: 'cuttable',
    text: 'Every strip of paper is at least two knife widths wide, so it can be cut by hand.',
    source: 'kirie · mark: knife-cut lines through paper',
  },
  {
    id: 'two-papers',
    text: 'One flat paper colour against a contrasting backing sheet, and no drawn line.',
    source: 'kirie · colour, mark',
  },
  {
    id: 'fine-first',
    text: 'The smallest pieces are cut first and the largest last, so the sheet stays strong while it is cut.',
    source: 'paper-cutting practice',
  },
];

const SHEET_INSET = 44; // px of backing visible around the sheet
const FRAME = 46; // px of solid paper frame inside the sheet edge
const FALL = 0.035; // share of the cut stage a piece takes to come away

export async function plan({ subject, params: p, seed, W, H }) {
  const cell = p.detail === 'bold' ? 5 : 3;
  const g = grid(subject, cell);
  const { gw, gh } = g;
  const n = gw * gh;
  const r = rng(hash('kirie', seed));

  // 0 outside the sheet, 1 paper, 2 hole
  const OUT = 0, PAPER = 1, HOLE = 2;
  const kind = new Uint8Array(n);
  const inset = Math.round(SHEET_INSET / cell), frame = Math.round((SHEET_INSET + FRAME) / cell);
  const period = p.pattern === 'dots' ? 6 : 5;
  const lo = 0.5 - p.light * 0.5 + 0.08, hi = lo + 0.42;
  const angleOf = (j) => {
    const [cr, cg, cb] = [g.col[j * 3], g.col[j * 3 + 1], g.col[j * 3 + 2]];
    const mx = Math.max(cr, cg, cb), mn = Math.min(cr, cg, cb);
    if (mx - mn < 18) return 0.25 * Math.PI;
    let h = mx === cr ? (cg - cb) / (mx - mn) : mx === cg ? 2 + (cb - cr) / (mx - mn) : 4 + (cr - cg) / (mx - mn);
    h = ((h % 6) + 6) % 6;
    return [0.25, -0.25, 0, 0.5, 0.25, -0.25][Math.floor(h)] * Math.PI;
  };

  // What stands behind the subject gives the bridges somewhere to land: a ring of paper for a
  // moon, or a horizon line and a ground that reach the frame on both sides.
  const box = subject.box;
  const cx = gw / 2, cy = (box.y + box.h * 0.46) / cell;
  const ringR = (Math.min(W, H) / 2 - SHEET_INSET - FRAME * 0.6) / cell;
  const horizon = (box.y + box.h * 0.97) / cell;
  function behind(x, y) {
    if (p.ground === 'moon') {
      const d = Math.hypot(x - cx, y - cy);
      return Math.abs(d - ringR) < 2.2 || Math.abs(d - ringR * 0.93) < 1.4;
    }
    if (p.ground === 'horizon') {
      if (y > horizon) return ((x + y * 0.5) % 7) < 3 || y > horizon + 10;
      return Math.abs(y - horizon) < 1.5;
    }
    return false;
  }

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const j = y * gw + x;
      if (x < inset || y < inset || x >= gw - inset || y >= gh - inset) { kind[j] = OUT; continue; }
      if (x < frame || y < frame || x >= gw - frame || y >= gh - frame) { kind[j] = PAPER; continue; }
      if (g.alpha[j] < 0.5) { kind[j] = behind(x, y) ? PAPER : HOLE; continue; }
      const dark = 1 - g.lum[j];
      if (dark >= hi) kind[j] = PAPER;
      else if (dark <= lo) kind[j] = HOLE;
      else {
        const f = (dark - lo) / (hi - lo);
        if (p.pattern === 'dots') {
          const cx = (x % period) - period / 2 + 0.5, cy = (y % period) - period / 2 + 0.5;
          const rad = Math.sqrt(1 - f) * period * 0.5;
          kind[j] = Math.hypot(cx, cy) < rad ? HOLE : PAPER;
        } else {
          const a = angleOf(j);
          const u = x * Math.cos(a) + y * Math.sin(a);
          const phase = ((u % period) + period) % period;
          const width = clamp(Math.round(f * period), 2, period - 2);
          kind[j] = phase < width ? PAPER : HOLE;
        }
      }
    }
  }

  // Outlines: where the subject's edge or its colour changes, keep a line of paper.
  for (let y = frame; y < gh - frame; y++) {
    for (let x = frame; x < gw - frame; x++) {
      const j = y * gw + x;
      for (const k of [j + 1, j + gw]) {
        const ea = (g.alpha[j] >= 0.5) !== (g.alpha[k] >= 0.5);
        const dc = Math.hypot(g.col[j * 3] - g.col[k * 3], g.col[j * 3 + 1] - g.col[k * 3 + 1], g.col[j * 3 + 2] - g.col[k * 3 + 2]);
        if (ea || dc > 70) {
          kind[j] = PAPER;
          kind[k] = PAPER;
        }
      }
    }
  }

  const isPaper = () => {
    const m = new Uint8Array(n);
    for (let j = 0; j < n; j++) m[j] = kind[j] === PAPER ? 1 : 0;
    return m;
  };
  const isHole = () => {
    const m = new Uint8Array(n);
    for (let j = 0; j < n; j++) m[j] = kind[j] === HOLE ? 1 : 0;
    return m;
  };

  // Holes too small for a knife are left as paper; paper specks too small to keep are cut away.
  {
    const holes = components(isHole(), gw, gh);
    for (let j = 0; j < n; j++) if (holes.labels[j] >= 0 && holes.sizes[holes.labels[j]] < 5) kind[j] = PAPER;
    const bits = components(isPaper(), gw, gh);
    for (let j = 0; j < n; j++) if (bits.labels[j] >= 0 && bits.sizes[bits.labels[j]] < 10) kind[j] = HOLE;
  }

  // Thin paper: any paper cell not inside a 2x2 block of paper is widened.
  const widen = () => {
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const j = y * gw + x;
        if (kind[j] !== PAPER) continue;
        const P = (k) => kind[k] === PAPER;
        const ok = (P(j + 1) && P(j + gw) && P(j + gw + 1)) || (P(j - 1) && P(j + gw) && P(j + gw - 1)) ||
          (P(j + 1) && P(j - gw) && P(j - gw + 1)) || (P(j - 1) && P(j - gw) && P(j - gw - 1));
        if (!ok) {
          if (kind[j + 1] === HOLE) kind[j + 1] = PAPER;
          if (kind[j + gw] === HOLE) kind[j + gw] = PAPER;
          if (kind[j + gw + 1] === HOLE) kind[j + gw + 1] = PAPER;
        }
      }
    }
  };
  widen();

  // Bridges: the island nearest the sheet is joined first with a straight strip, then the next,
  // so a head joins its own body rather than reaching for the frame.
  const frameCell = frame * gw + frame - 1;
  for (let round = 0; round < 400; round++) {
    const comps = components(isPaper(), gw, gh);
    if (comps.count <= 1) break;
    const main = comps.labels[frameCell];
    const src = new Uint8Array(n), pass = new Uint8Array(n);
    for (let j = 0; j < n; j++) {
      src[j] = comps.labels[j] === main ? 1 : 0;
      pass[j] = kind[j] !== OUT ? 1 : 0;
    }
    const { dist, from } = walk(src, pass, gw, gh);
    const best = new Map();
    for (let j = 0; j < n; j++) {
      const l = comps.labels[j];
      if (l < 0 || l === main || dist[j] < 0) continue;
      const b = best.get(l);
      if (b === undefined || dist[j] < dist[b]) best.set(l, j);
    }
    if (!best.size) break;
    let nearest = Infinity;
    for (const [, j] of best) nearest = Math.min(nearest, dist[j]);
    for (const [, start] of best) {
      if (dist[start] > nearest * 1.25 + 3) continue;
      let target = start;
      while (from[target] !== -1) target = from[target];
      stripe(start % gw, (start / gw) | 0, target % gw, (target / gw) | 0);
    }
    widen();
  }
  function stripe(x0, y0, x1, y1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const k = (y + dy) * gw + x + dx;
        if (kind[k] === HOLE) kind[k] = PAPER;
      }
    }
  }

  // No diagonal-only touches: they are neither a join nor a clean cut.
  for (let y = 0; y < gh - 1; y++) {
    for (let x = 0; x < gw - 1; x++) {
      const a = y * gw + x, b = a + 1, c = a + gw, d = c + 1;
      const pa = kind[a] === PAPER, pb = kind[b] === PAPER, pc = kind[c] === PAPER, pd = kind[d] === PAPER;
      if (pa && pd && !pb && !pc) { kind[b] = PAPER; }
      else if (pb && pc && !pa && !pd) { kind[a] = PAPER; }
    }
  }

  // The pieces that come out: one closed loop per hole, smoothed, in canvas pixels.
  const field = blur(Float32Array.from(isHole()), gw, gh, 1);
  let pieces = isolines(field, gw, gh, 0.5).map((loop) => {
    const pts = chaikin(loop.map(([x, y]) => [(x + 0.5) * cell, (y + 0.5) * cell]), 1, true);
    const a = Math.abs(area(pts));
    return { pts, area: a, cum: lengths(pts), box: bounds(pts) };
  });
  pieces = pieces.filter((pc) => pc.area > cell * cell * 3);

  // Order: smallest first in size bands; inside a band the knife moves to the nearest piece.
  const band = (pc) => Math.floor(Math.log2(pc.area) * 1.2);
  const bands = new Map();
  for (const pc of pieces) {
    const b = band(pc);
    if (!bands.has(b)) bands.set(b, []);
    bands.get(b).push(pc);
  }
  const order = [];
  let at = { x: W * 0.5, y: H * 0.2 };
  for (const b of [...bands.keys()].sort((x, y) => x - y)) {
    const left = bands.get(b);
    while (left.length) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < left.length; i++) {
        const d = Math.hypot(left[i].box.cx - at.x, left[i].box.cy - at.y);
        if (d < bd) { bd = d; bi = i; }
      }
      const pc = left.splice(bi, 1)[0];
      order.push(pc);
      at = { x: pc.box.cx, y: pc.box.cy };
    }
  }
  // time for each piece, in units of the cut stage: a knife lift plus the length of the cut
  let total = 0;
  for (const pc of order) {
    pc.len = pc.cum[pc.cum.length - 1];
    pc.cost = 0.35 + Math.sqrt(pc.len) * 0.18;
    total += pc.cost;
  }
  let acc = 0;
  for (const pc of order) {
    pc.s = (acc / total) * (1 - FALL);
    acc += pc.cost;
    pc.e = (acc / total) * (1 - FALL);
    pc.fall = { dx: r.range(-18, 18), dy: r.range(26, 60), rot: r.range(-0.5, 0.5) };
    pc.start = along(pc.pts, pc.cum, 0);
  }

  const sheetTex = paper(W, H, p.sheet, hash(seed, 'sheet'), { tooth: 0.12, fibres: 120 });
  const backTex = paper(W, H, p.backing, hash(seed, 'backing'), { tooth: 0.05 });
  const mat = cuttingMat(W, H);

  return {
    W, H, cell, gw, gh, kind, pieces: order, sheetTex, backTex, mat, params: p,
    sheet: { x: SHEET_INSET, y: SHEET_INSET, w: W - 2 * SHEET_INSET, h: H - 2 * SHEET_INSET },
  };
}

function cuttingMat(W, H) {
  const c = canvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#2f6b55';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i <= W; i += 27) {
    const major = (i / 27) % 5 === 0;
    g.strokeStyle = major ? 'rgba(236,245,230,0.42)' : 'rgba(236,245,230,0.18)';
    g.lineWidth = major ? 1.4 : 0.8;
    g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, H); g.stroke();
    g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(W, i + 0.5); g.stroke();
  }
  g.strokeStyle = 'rgba(236,245,230,0.3)';
  g.lineWidth = 1;
  for (let i = -W; i < W; i += 108) {
    g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke();
  }
  return c;
}

export function check(pl) {
  const { kind, gw, gh } = pl;
  const n = gw * gh;
  const paperMask = new Uint8Array(n);
  for (let j = 0; j < n; j++) paperMask[j] = kind[j] === 1 ? 1 : 0;
  const comps = components(paperMask, gw, gh);

  let thin = 0;
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const j = y * gw + x;
      if (!paperMask[j]) continue;
      const P = (k) => paperMask[k];
      const ok = (P(j + 1) && P(j + gw) && P(j + gw + 1)) || (P(j - 1) && P(j + gw) && P(j + gw - 1)) ||
        (P(j + 1) && P(j - gw) && P(j - gw + 1)) || (P(j - 1) && P(j - gw) && P(j - gw - 1));
      if (!ok) thin++;
    }
  }

  const contrast = contrastRatio(hex(pl.params.sheet), hex(pl.params.backing));

  let backwards = 0;
  const band = (pc) => Math.floor(Math.log2(pc.area) * 1.2);
  for (let i = 1; i < pl.pieces.length; i++) if (band(pl.pieces[i]) < band(pl.pieces[i - 1])) backwards++;

  return [
    { id: 'one-sheet', pass: comps.count === 1, detail: `${comps.count} piece${comps.count === 1 ? '' : 's'} of paper, ${pl.pieces.length} cut out` },
    { id: 'cuttable', pass: thin === 0, detail: thin ? `${thin} cells of paper thinner than two knife widths` : `no strip under ${pl.cell * 2}px` },
    { id: 'two-papers', pass: contrast >= 3, detail: `contrast ${contrast.toFixed(1)} : 1 between sheet and backing` },
    { id: 'fine-first', pass: backwards === 0, detail: backwards ? `${backwards} larger pieces cut early` : 'pieces cut from small to large' },
  ];
}

function contrastRatio(a, b) {
  const L = (c) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const la = L(a), lb = L(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------- drawing

function cutIndex(pieces, c) {
  let lo = 0, hi = pieces.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pieces[mid].e <= c) lo = mid + 1;
    else hi = mid;
  }
  return lo; // pieces[0..lo) are fully cut
}

export function draw(ctx, pl, t) {
  const d = progress(stages, 'draw', t);
  const c = progress(stages, 'cut', t);
  const lift = progress(stages, 'lift', t);
  const mount = progress(stages, 'mount', t);
  drawScene(ctx, pl, { d, c, lift, mount, light: null });
}

function drawScene(ctx, pl, { d, c, lift, mount, light }) {
  const { W, H, pieces, sheet } = pl;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // what the sheet lies on: the mat, then the backing
  const toBacking = smooth(lift * 1.4);
  if (toBacking < 1) ctx.drawImage(pl.mat, 0, 0);
  if (toBacking > 0) {
    ctx.globalAlpha = toBacking;
    ctx.drawImage(pl.backTex, 0, 0);
    ctx.globalAlpha = 1;
  }

  const k = cutIndex(pieces, c);
  const holes = new Path2D();
  holes.rect(sheet.x, sheet.y, sheet.w, sheet.h);
  for (let i = 0; i < k; i++) {
    if (c < pieces[i].e + FALL * 0.3) continue; // still being pushed out
    const pts = pieces[i].pts;
    holes.moveTo(pts[0][0], pts[0][1]);
    for (let q = 1; q < pts.length; q++) holes.lineTo(pts[q][0], pts[q][1]);
    holes.closePath();
  }

  // the sheet: lifted it casts a longer, softer shadow; mounted it sits close
  const up = Math.sin(Math.PI * clamp(lift)) * (1 - mount);
  const settle = easeOut(mount);
  const scale = 1 + 0.018 * up;
  let sx = 0, sy = 0;
  if (light) { sx = light.x; sy = light.y; }
  const shadowOff = 2 + 22 * up + 3 * settle;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);
  ctx.shadowColor = `rgba(20,14,10,${0.18 + 0.2 * up + 0.12 * settle})`;
  ctx.shadowBlur = 3 + 26 * up + 4 * settle;
  ctx.shadowOffsetX = (sx || 0.35) * shadowOff;
  ctx.shadowOffsetY = (sy || 0.6) * shadowOff;
  ctx.fillStyle = ctx.createPattern(pl.sheetTex, 'no-repeat');
  ctx.fill(holes, 'evenodd');
  ctx.restore();

  // the design drawn on the sheet in white pencil, still visible where it is not yet cut
  const pencil = (1 - smooth(lift * 2)) * 0.55;
  if (pencil > 0.01) {
    ctx.save();
    ctx.strokeStyle = `rgba(245,240,230,${pencil})`;
    ctx.lineWidth = 1.1;
    const shown = d * pieces.length;
    ctx.beginPath();
    for (let i = k; i < pieces.length && i < shown; i++) {
      const pc = pieces[i];
      const part = Math.min(1, shown - i);
      if (part >= 1) tracePath(ctx, pc.pts, true);
      else partial(ctx, pc, part);
    }
    ctx.stroke();
    ctx.restore();
  }

  // pieces being pushed out and lifted away
  for (let i = Math.max(0, k - 80); i < k; i++) {
    const pc = pieces[i];
    const f = (c - pc.e) / FALL;
    if (f < 0 || f > 1) continue;
    const e = easeInOut(f);
    ctx.save();
    ctx.globalAlpha = 1 - smooth(f * 1.2 - 0.2);
    ctx.translate(pc.box.cx + pc.fall.dx * e, pc.box.cy + pc.fall.dy * e);
    ctx.rotate(pc.fall.rot * e);
    ctx.scale(1 + 0.08 * e, 1 + 0.08 * e);
    ctx.translate(-pc.box.cx, -pc.box.cy);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10 * e;
    ctx.shadowOffsetY = 8 * e;
    ctx.fillStyle = ctx.createPattern(pl.sheetTex, 'no-repeat');
    ctx.beginPath();
    tracePath(ctx, pc.pts, true);
    ctx.fill();
    ctx.restore();
  }

  // the cut in progress and the knife
  if (c > 0 && c < 1 && k < pieces.length) {
    const pc = pieces[k];
    const f = clamp((c - pc.s) / (pc.e - pc.s));
    const travel = 0.28; // share of a piece's time spent moving the knife to it
    ctx.save();
    ctx.strokeStyle = 'rgba(255,252,244,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (f > travel) partial(ctx, pc, (f - travel) / (1 - travel));
    ctx.stroke();
    ctx.restore();
    let tip;
    if (f <= travel) {
      const prev = k > 0 ? along(pieces[k - 1].pts, pieces[k - 1].cum, 0) : { x: pl.W * 0.7, y: pl.H * 0.95, a: -1 };
      const m = easeInOut(f / travel);
      tip = { x: prev.x + (pc.start.x - prev.x) * m, y: prev.y + (pc.start.y - prev.y) * m, a: pc.start.a, lifted: Math.sin(Math.PI * m) };
    } else {
      tip = along(pc.pts, pc.cum, ((f - travel) / (1 - travel)) * pc.len);
      tip.lifted = 0;
    }
    knife(ctx, tip);
  }

  ctx.restore();
}

function partial(ctx, pc, f) {
  const target = f * pc.len;
  const pts = pc.pts;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let q = 1; q < pts.length + 1; q++) {
    if (pc.cum[q] > target) {
      const p = along(pts, pc.cum, target);
      ctx.lineTo(p.x, p.y);
      return;
    }
    const pt = pts[q % pts.length];
    ctx.lineTo(pt[0], pt[1]);
  }
}

// A craft knife held at a steady angle; the blade tip is on the cut.
function knife(ctx, tip) {
  ctx.save();
  ctx.translate(tip.x, tip.y - 10 * (tip.lifted || 0));
  ctx.rotate(-0.95);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8 + 10 * (tip.lifted || 0);
  ctx.shadowOffsetX = 6 + 10 * (tip.lifted || 0);
  ctx.shadowOffsetY = 8 + 12 * (tip.lifted || 0);
  // blade
  ctx.fillStyle = '#d9dde2';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, -26);
  ctx.lineTo(-3, -26);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(90,96,104,0.9)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // collet and handle
  ctx.fillStyle = '#b9bec4';
  ctx.fillRect(-4.5, -40, 13, 14);
  ctx.fillStyle = '#e8b53a';
  ctx.fillRect(-4, -170, 12, 131);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-2, -168, 3, 127);
  ctx.restore();
}

// Once mounted: the light moves, so the shadow under the paper moves with it.
export function live(ctx, pl, { time, pointer }) {
  let light;
  if (pointer) light = { x: clamp((pl.W / 2 - pointer.x) / (pl.W / 2), -1, 1), y: clamp((pl.H / 2 - pointer.y) / (pl.H / 2), -1, 1) };
  else light = { x: 0.35 + 0.25 * Math.sin(time * 0.4), y: 0.6 + 0.15 * Math.cos(time * 0.33) };
  drawScene(ctx, pl, { d: 1, c: 1, lift: 1, mount: 1, light });
}

// A click mounts the same cut on the next backing colour.
export function press(pl) {
  const opts = params.backing.options;
  const i = opts.indexOf(pl.params.backing);
  return { params: { backing: opts[(i + 1) % opts.length] }, replay: false };
}
