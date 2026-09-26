// Kintsugi: a glazed ceramic piece breaks where it is struck, the pieces are gathered and joined
// with urushi, every seam is painted with red lacquer, dusted with gold and polished.
// The fracture is the drawing: the gold goes exactly where the piece cracked, nowhere else.
import {
  rng, hash, clamp, lerp, smooth, easeOut, easeInOut, valueNoise, fbm, progress, canvas, paper, chaikin, lengths, along,
} from '../../runtime/core.js';

export const meta = {
  id: 'kintsugi',
  name: 'Kintsugi',
  version: '0.1.0',
  creator: { name: 'Rita Agafonova', handle: 'arni.art' },
  licence: 'Apache-2.0',
  medium: 'ceramic',
  tradition: [{ cell: 'kintsugi', name: 'Kintsugi (golden joinery)' }],
  parents: [],
  duration: 18,
  summary:
    'Any picture becomes a glazed ceramic piece. It breaks where it is struck, the pieces are gathered and joined with urushi, and every seam is lacquered, dusted with gold and polished, so the break becomes the drawing.',
};

export const params = {
  metal: { type: 'choice', default: 'gold', options: ['gold', 'silver', 'platinum'], label: 'Metal' },
  glaze: { type: 'choice', default: 'painted', options: ['painted', 'celadon', 'tenmoku', 'shino'], label: 'Glaze' },
  form: { type: 'choice', default: 'auto', options: ['auto', 'figure', 'tile'], label: 'Form' },
  cracks: { type: 'number', default: 4, min: 2, max: 7, step: 1, label: 'Main cracks' },
  branching: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Branching' },
  seam: { type: 'number', default: 6, min: 4, max: 12, step: 0.5, label: 'Seam width (px)' },
  crackle: { type: 'number', default: 0.3, min: 0, max: 1, step: 0.05, label: 'Glaze crackle' },
  surface: { type: 'choice', default: 'slate', options: ['slate', 'linen', 'washi'], label: 'Surface' },
  impactX: { type: 'number', default: -1, min: -1, max: 1, step: 0.01, label: 'Impact across (-1: from the seed)' },
  impactY: { type: 'number', default: -1, min: -1, max: 1, step: 0.01, label: 'Impact down (-1: from the seed)' },
};

export const stages = [
  { id: 'whole', label: 'The whole piece', share: 0.1 },
  { id: 'break', label: 'It breaks', share: 0.14 },
  { id: 'gather', label: 'Gather the pieces and join them with urushi', share: 0.2 },
  { id: 'lacquer', label: 'Paint every seam with red urushi', share: 0.2 },
  { id: 'gold', label: 'Dust gold onto the tacky lacquer', share: 0.22 },
  { id: 'polish', label: 'Polish the gold', share: 0.14 },
];

export const rules = [
  {
    id: 'gold-follows-fracture',
    text: 'The gold follows the fracture: every crack carries a gilded seam along its whole length, and no gold lies where the piece did not break.',
    source: 'kintsugi · composition: the gold seam following wherever the piece actually cracked; mark: urushi dusted with powdered gold along the mended crack',
  },
  {
    id: 'rejoined',
    text: 'Every fragment is rejoined at its original place: in the finished piece none is missing, offset or turned.',
    source: 'kintsugi · structure: broken fragments rejoined',
  },
  {
    id: 'repair-visible',
    text: 'The repair is the most visible feature, not disguised: seams at least 3 px wide that stand clearly apart from the glaze beside them (colour difference ΔE of 20 or more).',
    source: 'kintsugi · structure: the repair is the most visible feature rather than disguised',
  },
  {
    id: 'noble-metal',
    text: 'The seams are gold, silver or platinum: a bright metal, never a paint colour.',
    source: 'kintsugi · colour: bright metallic gold, silver or platinum lines; mark: powdered gold, silver or platinum',
  },
  {
    id: 'real-break',
    text: 'One impact sets the composition: cracks radiate from it and each runs until it leaves the piece or meets another crack, in an irregular network that splits the body into fragments (a clean break in two, or a branching one).',
    source: 'kintsugi · composition; rhythm: the irregular, veined network of the fracture lines',
  },
];

// ---------------------------------------------------------------- constants

const STEP = 3; // px per step of a growing crack
const SPLIT = 0.46; // share of the break stage when the pieces come apart
const GATHER_END = 0.86; // share of the gather stage when the last piece is home
const GAP = 50; // px of brush travel between two seams
const LIGHT = unit3(-0.46, -0.58, 0.67); // key light from the upper left
const HALFV = unit3(LIGHT[0], LIGHT[1], LIGHT[2] + 1);
const L2 = unit2(LIGHT[0], LIGHT[1]);
const SWEEP = unit2(1, 0.55);

const METALS = {
  gold: [[0, [34, 18, 4]], [0.28, [98, 58, 14]], [0.55, [184, 132, 42]], [0.8, [228, 182, 80]], [1.05, [247, 212, 120]], [1.35, [255, 240, 188]], [1.8, [255, 254, 240]]],
  silver: [[0, [28, 30, 34]], [0.3, [84, 88, 96]], [0.62, [156, 161, 168]], [0.9, [208, 212, 218]], [1.15, [234, 237, 241]], [1.45, [250, 251, 253]], [1.8, [255, 255, 255]]],
  platinum: [[0, [38, 37, 36]], [0.3, [96, 94, 91]], [0.62, [160, 158, 153]], [0.9, [202, 200, 194]], [1.15, [226, 224, 219]], [1.45, [244, 243, 239]], [1.8, [252, 252, 250]]],
};
const PAINT = [[0, [206, 176, 52]], [1.8, [206, 176, 52]]]; // flat yellow paint: what the rule forbids
const LACQUER = [98, 28, 16]; // bengara (red iron oxide) urushi
const GLUE = 'rgba(36,22,15,0.92)'; // mugi urushi squeezed from the join

const SURFACES = {
  slate: { base: [38, 36, 35], shadow: [6, 5, 4], shadowA: 0.9 },
  linen: { base: [205, 196, 181], shadow: [58, 44, 34], shadowA: 0.62 },
  washi: { base: [236, 228, 213], shadow: [70, 54, 40], shadowA: 0.55 },
};
const CLAY = { painted: [238, 228, 210], celadon: [226, 224, 214], tenmoku: [196, 164, 128], shino: [214, 184, 150] };

const EXP = new Float32Array(1025);
for (let i = 0; i <= 1024; i++) EXP[i] = Math.exp(-i / 128);

// ---------------------------------------------------------------- plan

export async function plan({ subject, params: p, seed, W, H }) {
  const N = W * H;
  const r = rng(hash('kintsugi', seed));
  const src = subject.pixels.data;
  const sa = new Float32Array(N);
  for (let i = 0; i < N; i++) sa[i] = src[i * 4 + 3] / 255;

  // 1. The body: the subject's own silhouette as a figure, or a tile it is painted on.
  let form = p.form;
  if (form !== 'figure' && form !== 'tile') form = largestShare(sa, W, H) >= 0.7 ? 'figure' : 'tile';
  const body = form === 'tile' ? tileBody(subject, W, H) : figureBody(sa, W, H);
  const { alpha, mask } = body;
  const box = maskBox(alpha, W, H);

  // 2. Its form: a rounded rim from the distance to the edge, and a gentle dome over the whole.
  const din = edt(mask, W, H);
  let maxD = 1;
  for (let i = 0; i < N; i++) if (din[i] > maxD) maxD = din[i];
  const dRim = boxBlur(boxBlur(din, W, H, 1), W, H, 1);
  const dDome = boxBlur(boxBlur(boxBlur(din, W, H, 6), W, H, 6), W, H, 6);
  const R1 = form === 'tile' ? 12 : clamp(maxD * 0.2, 8, 26);
  const domeH = form === 'tile' ? Math.min(14, maxD * 0.05) : maxD * 0.5;
  const ht = new Float32Array(N);
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * W + x;
      if (!(alpha[i] > 0)) continue;
      const q = Math.min(1, dRim[i] / R1);
      ht[i] = R1 * Math.sqrt(1 - (1 - q) * (1 - q)) + domeH * Math.sqrt(Math.min(1, dDome[i] / maxD));
    }
  }

  // 3. The glaze: the subject's colours, softened where they meet and gently unified.
  const pr = new Float32Array(N), pg = new Float32Array(N), pb = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = sa[i];
    pr[i] = src[i * 4] * a;
    pg[i] = src[i * 4 + 1] * a;
    pb[i] = src[i * 4 + 2] * a;
  }
  const br = boxBlur(pr, W, H, 1), bgc = boxBlur(pg, W, H, 1), bbc = boxBlur(pb, W, H, 1), ba = boxBlur(sa, W, H, 1);
  const noise = valueNoise(hash('glaze', seed));
  const fine = valueNoise(hash('fine', seed));
  const crackleLine = p.crackle > 0 ? crackle(W, H, box, alpha, hash('crackle', seed)) : null;
  const clay = CLAY[p.glaze] || CLAY.painted;
  const tileBase = p.glaze === 'painted' ? [239, 234, 223] : null;

  const cer = new Uint8ClampedArray(N * 4);
  const nxA = new Float32Array(N), nyA = new Float32Array(N), nzA = new Float32Array(N);
  const col = [0, 0, 0];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * W + x;
      const a = alpha[i];
      if (!(a > 0)) continue;
      // subject colour over its ground (white for a figure, the tile glaze for a tile)
      const cov = ba[i];
      let sr, sg, sb;
      if (form === 'tile') {
        const base = tileBase || [255, 255, 255];
        sr = br[i] + base[0] * (1 - cov); sg = bgc[i] + base[1] * (1 - cov); sb = bbc[i] + base[2] * (1 - cov);
      } else if (cov > 1e-3) {
        sr = br[i] / cov; sg = bgc[i] / cov; sb = bbc[i] / cov;
      } else {
        sr = sg = sb = 200;
      }
      glazeColour(p.glaze, sr, sg, sb, col);
      // the glaze runs thin at the rim and breaks toward its edge colour
      const edge = 1 - smooth(dRim[i] / (R1 * 0.9));
      rimBreak(p.glaze, col, edge, clay);
      // variation in thickness, iron specks, crackle
      const v = (fbm(noise, x / 150, y / 150, 3) - 0.5) * 0.12 + (fine(x / 7, y / 7) - 0.5) * 0.035;
      let k = 1 + v;
      if (crackleLine) k *= 1 - p.crackle * (p.glaze === 'painted' ? 0.28 : 0.42) * crackleLine[i];
      col[0] *= k; col[1] *= k; col[2] *= k;
      // normal of the fired surface
      let nx = (ht[i - 1] - ht[i + 1]) * 0.5, ny = (ht[i - W] - ht[i + W]) * 0.5;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      nx *= inv; ny *= inv;
      const nz = inv;
      nxA[i] = nx; nyA[i] = ny; nzA[i] = nz;
      shadeGlaze(col, nx, ny, nz, p.glaze === 'tenmoku' ? 1.1 : 1);
      cer[i * 4] = col[0]; cer[i * 4 + 1] = col[1]; cer[i * 4 + 2] = col[2]; cer[i * 4 + 3] = a * 255;
    }
  }
  specks(cer, alpha, box, W, rng(hash('specks', seed)), p.glaze);
  const ceramic = canvas(W, H);
  ceramic.getContext('2d').putImageData(new ImageData(cer, W, H), 0, 0);
  const gl = glintMap(nxA, nyA, nzA, alpha, box, W, H);

  // 4. The break: an impact, cracks racing out from it to the edge, branches, a partial ring.
  const impact = chooseImpact(p, din, maxD, box, W, H, r);
  const cracks = fracture({ mask, W, H, impact, r: r.fork('fracture'), p, maxD });
  const crackMask = rasterise(cracks, W, H);
  const crackDist = edt(invert(crackMask), W, H);

  // 5. Fragments: the regions of the body the cracks separate.
  const { lab, frags } = fragments(alpha, mask, crackMask, W, H);
  const surf = SURFACES[p.surface] || SURFACES.slate;
  const area = frags.reduce((s, f) => s + f.area, 0);
  const moving = frags.filter((f) => f.cracked).sort((a, b) => b.area - a.area);
  const rf = r.fork('pieces');
  for (const f of moving) {
    const vx = f.cx - impact.x, vy = f.cy - impact.y, d = Math.hypot(vx, vy);
    const k = 0.1;
    let dx = vx * k, dy = vy * k;
    const m = Math.hypot(dx, dy);
    if (m < 9) {
      const a = d > 1e-3 ? Math.atan2(vy, vx) : rf() * Math.PI * 2;
      dx = Math.cos(a) * 9; dy = Math.sin(a) * 9;
    }
    const small = f.area < area * 0.03;
    f.dx = dx + rf.gauss() * 2.5;
    f.dy = dy + rf.gauss() * 2.5;
    f.rot = rf.gauss() * (small ? 0.12 : 0.045);
  }
  // gathering: the largest piece first, then whichever fits against what is already joined
  const placed = new Set(), order = [];
  while (order.length < moving.length) {
    let pick = moving.find((f) => !placed.has(f.id) && (order.length === 0 || [...f.nb].some((k) => placed.has(k))));
    if (!pick) pick = moving.find((f) => !placed.has(f.id));
    placed.add(pick.id);
    order.push(pick);
  }
  const nm = order.length;
  const dur = nm > 1 ? Math.min(0.42, 2.6 / nm) : 1, stp = nm > 1 ? (1 - dur) / (nm - 1) : 0;
  order.forEach((f, i) => {
    f.w0 = GATHER_END * i * stp;
    f.w1 = GATHER_END * (i * stp + dur);
  });
  for (const f of frags) sprite(f, lab, cer, crackDist, clay, W);
  for (const f of frags) f.shadow = shadowSprite((x, y) => (lab[y * W + x] === f.id ? alpha[y * W + x] : 0), f, W, H, surf);
  const shadow = shadowSprite((x, y) => alpha[y * W + x], box, W, H, surf);

  // 6. The seams: every crack, in the order a brush would paint them, with its width.
  const seam = seams(cracks, alpha, W, H, p, seed);
  const U = seam.U;

  // chips knocked off at the impact
  const rc = r.fork('chips');
  const ci = (Math.round(impact.y) * W + Math.round(impact.x)) * 4;
  const chipCol = [cer[ci], cer[ci + 1], cer[ci + 2]];
  const chips = [];
  for (let k = 0, n = 5 + rc.int(0, 4); k < n; k++) {
    const sides = 3 + rc.int(0, 2), size = 2.2 + rc() * 4.2, pts = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2 + rc() * 0.8;
      pts.push([Math.cos(a) * size * (0.6 + rc() * 0.6), Math.sin(a) * size * (0.6 + rc() * 0.6)]);
    }
    chips.push({ a: rc() * Math.PI * 2, dist: 30 + rc() * 130, pts, spin: rc.gauss() * 4, delay: rc() * 0.06 });
  }

  // sparkles in the gold: fixed places along the seams
  const rs = r.fork('sparkles');
  const sparkles = [];
  for (let k = 0; k < 70 && seam.order.length; k++) {
    const c = seam.order[Math.floor(rs() * seam.order.length)];
    const s = rs() * c.len;
    const pt = along(c.seam, c.cum, s);
    if (alpha[(pt.y | 0) * W + (pt.x | 0)] < 0.9) continue;
    sparkles.push({ x: pt.x, y: pt.y, ord: (c.u0 + s) / U, proj: projOf(seam, pt.x, pt.y), size: 2.5 + rs() * 3, phase: rs() });
  }

  const bg = surface(p.surface, W, H, seed);

  return {
    W, H, seed, params: p, stages, form, impact, cracks, frags, moving, lab, alpha, box, maxD,
    ceramic, cerData: cer, shadow, bg, gl, seam, chips, chipCol, sparkles, crackDist,
    ramp: rampLUT(METALS[p.metal] || PAINT), surf,
    frontMax: Math.max(1, ...cracks.map((c) => c.born + c.len)),
    scratch: { seam: canvas(seam.bw, seam.bh), glint: canvas(gl.w, gl.h) },
  };
}

// ---------------------------------------------------------------- body

function largestShare(sa, W, H) {
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = sa[i] >= 0.5 ? 1 : 0;
  const { sizes } = label4(m, W, H);
  const total = sizes.reduce((s, x) => s + x, 0);
  return total ? Math.max(...sizes) / total : 1;
}

// The silhouette, opened a little so hair-thin strokes (whiskers, hatching) do not become
// ceramic too thin to fire.
function figureBody(sa, W, H) {
  const N = W * H;
  const m0 = new Uint8Array(N);
  let a0 = 0;
  for (let i = 0; i < N; i++) if ((m0[i] = sa[i] >= 0.5 ? 1 : 0)) a0++;
  const din = edt(m0, W, H);
  const notE = new Uint8Array(N);
  for (let i = 0; i < N; i++) notE[i] = din[i] > 2.6 ? 0 : 1;
  const dE = edt(notE, W, H);
  let open = new Uint8Array(N), a1 = 0;
  for (let i = 0; i < N; i++) if ((open[i] = m0[i] && (!notE[i] || dE[i] <= 2.6) ? 1 : 0)) a1++;
  if (a1 < a0 * 0.5) open = m0;
  const { lab, sizes } = label4(open, W, H);
  for (let i = 0; i < N; i++) if (open[i] && sizes[lab[i]] < 300) open[i] = 0;
  const alpha = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (open[i] || (sa[i] > 0 && sa[i] < 0.5 && (open[i - 1] || open[i + 1] || open[i - W] || open[i + W]))) alpha[i] = sa[i];
    }
  }
  return { alpha, mask: open };
}

// A glazed tile with rounded corners, the subject painted on it.
function tileBody(subject, W, H) {
  const b = subject.box, pad = W * 0.055, m = 30;
  const x0 = Math.max(m, b.x - pad), x1 = Math.min(W - m, b.x + b.w + pad);
  const y0 = Math.max(m, b.y - pad), y1 = Math.min(H - m, b.y + b.h + pad);
  const rad = Math.min(46, (y1 - y0) * 0.18, (x1 - x0) * 0.18);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 - rad, hy = (y1 - y0) / 2 - rad;
  const alpha = new Float32Array(W * H), mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const qx = Math.abs(x + 0.5 - cx) - hx, qy = Math.abs(y + 0.5 - cy) - hy;
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
      const a = clamp(0.5 - sd);
      alpha[y * W + x] = a;
      mask[y * W + x] = a >= 0.5 ? 1 : 0;
    }
  }
  return { alpha, mask };
}

function maskBox(alpha, W, H) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0: Math.max(1, x0), y0: Math.max(1, y0), x1: Math.min(W - 2, x1), y1: Math.min(H - 2, y1) };
}

// ---------------------------------------------------------------- glaze

function glazeColour(kind, r, g, b, out) {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const tone = 1 - y / 255;
  if (kind === 'celadon') return mixTo(out, [204, 219, 200], [80, 124, 106], Math.pow(tone, 0.85));
  if (kind === 'tenmoku') return mixTo(out, [176, 104, 46], [30, 21, 18], smooth(tone * 1.5 - 0.05));
  if (kind === 'shino') return mixTo(out, [241, 233, 219], [96, 68, 50], smooth(tone * 1.4 - 0.15));
  // painted: the subject's own colours as glazes, a little less saturated, no pure black or white
  const s = 0.9;
  out[0] = 16 + (y + (r - y) * s) * 0.86 + 3;
  out[1] = 16 + (y + (g - y) * s) * 0.86;
  out[2] = 16 + (y + (b - y) * s) * 0.86 - 4;
  return out;
}

function rimBreak(kind, c, e, clay) {
  if (e <= 0) return;
  const target = kind === 'tenmoku' ? [150, 80, 38] : kind === 'shino' ? [220, 146, 96] : kind === 'celadon' ? [214, 220, 208] : [c[0] * 1.06 + 14, c[1] * 1.06 + 14, c[2] * 1.06 + 12];
  const k = e * (kind === 'tenmoku' ? 0.75 : kind === 'shino' ? 0.55 : kind === 'celadon' ? 0.45 : 0.3);
  c[0] = lerp(c[0], target[0], k);
  c[1] = lerp(c[1], target[1], k);
  c[2] = lerp(c[2], target[2], k);
}

// Fired glaze under a key light: soft diffuse, a sharp highlight, a window reflection on the
// shoulders facing the light, and the room reflected at grazing angles.
function shadeGlaze(c, nx, ny, nz, gloss) {
  const ndl = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  const ndh = Math.max(0, nx * HALFV[0] + ny * HALFV[1] + nz * HALFV[2]);
  const shade = 0.34 + 0.78 * ndl;
  const spec = (Math.pow(ndh, 120) * 0.95 + Math.pow(ndh, 16) * 0.1) * gloss;
  const rx = 2 * nz * nx, ry = 2 * nz * ny;
  const win = soft(rx, -0.78, -0.32, 0.07) * soft(ry, -0.86, -0.42, 0.07) * 0.55 * gloss;
  const fres = Math.pow(1 - nz, 4) * 0.55;
  const t = Math.hypot(nx, ny) > 1e-4 ? clamp(0.5 - 0.9 * (nx * L2[0] + ny * L2[1]) / Math.hypot(nx, ny)) : 0.5;
  const env = lerp(235, 40, t);
  for (let k = 0; k < 3; k++) c[k] = c[k] * shade * (1 - fres) + env * fres + 255 * (spec + win);
}

function soft(v, lo, hi, e) {
  return smooth((v - lo) / e) * smooth((hi - v) / e);
}

function mixTo(out, a, b, t) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}

// Crazing in the glaze: an irregular polygon network (cellular noise edges), two scales.
function crackle(W, H, box, alpha, seed) {
  const out = new Float32Array(W * H);
  const warp = valueNoise(hash(seed, 'warp'));
  const layers = [34, 13].map((S, li) => {
    const r = rng(hash(seed, S));
    const gw = Math.ceil(W / S) + 2, gh = Math.ceil(H / S) + 2;
    const px = new Float32Array(gw * gh), py = new Float32Array(gw * gh);
    for (let j = 0; j < gw * gh; j++) {
      px[j] = ((j % gw) - 1 + 0.15 + r() * 0.7) * S;
      py[j] = (Math.floor(j / gw) - 1 + 0.15 + r() * 0.7) * S;
    }
    return { S, gw, px, py, w: li ? 0.45 : 1 };
  });
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * W + x;
      if (!(alpha[i] > 0)) continue;
      const wx = x + (warp(x / 23, y / 23) - 0.5) * 9, wy = y + (warp(x / 23 + 40, y / 23 + 17) - 0.5) * 9;
      let v = 0;
      for (const L of layers) {
        const cx = Math.floor(wx / L.S) + 1, cy = Math.floor(wy / L.S) + 1;
        let f1 = 1e9, f2 = 1e9;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const j = (cy + dy) * L.gw + cx + dx;
            if (j < 0 || j >= L.px.length) continue;
            const d = Math.hypot(L.px[j] - wx, L.py[j] - wy);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
          }
        }
        v = Math.max(v, (1 - smooth((f2 - f1) / 1.4)) * L.w);
      }
      out[i] = v;
    }
  }
  return out;
}

function specks(cer, alpha, box, W, r, kind) {
  if (kind === 'tenmoku') return;
  const n = Math.round(((box.x1 - box.x0) * (box.y1 - box.y0)) / 5000);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(lerp(box.x0, box.x1, r())), y = Math.floor(lerp(box.y0, box.y1, r()));
    const big = r() < 0.3;
    for (const [dx, dy, s] of big ? [[0, 0, 0.5], [1, 0, 0.75], [0, 1, 0.75], [1, 1, 0.85]] : [[0, 0, 0.62]]) {
      const i = (y + dy) * W + x + dx;
      if (alpha[i] < 1) continue;
      cer[i * 4] *= s; cer[i * 4 + 1] *= s * 0.97; cer[i * 4 + 2] *= s * 0.94;
    }
  }
}

// Half-resolution reflection directions, so a moving light can glide over the glaze.
function glintMap(nx, ny, nz, alpha, box, W, H) {
  const x0 = box.x0 >> 1, y0 = box.y0 >> 1, x1 = box.x1 >> 1, y1 = box.y1 >> 1;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const o = [], rx = [], ry = [], g = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * 2 * W + x * 2;
      const a = (alpha[i] + alpha[i + 1] + alpha[i + W] + alpha[i + W + 1]) / 4;
      if (a <= 0.02) continue;
      o.push((y - y0) * w + (x - x0));
      rx.push(2 * nz[i] * nx[i]);
      ry.push(2 * nz[i] * ny[i]);
      g.push(a);
    }
  }
  const img = new ImageData(w, h);
  for (let k = 0; k < img.data.length; k += 4) { img.data[k] = 255; img.data[k + 1] = 250; img.data[k + 2] = 238; }
  return { x: x0 * 2, y: y0 * 2, w, h, o: Int32Array.from(o), rx: Float32Array.from(rx), ry: Float32Array.from(ry), g: Float32Array.from(g), img };
}

// ---------------------------------------------------------------- fracture

function chooseImpact(p, din, maxD, box, W, H, r) {
  if (p.impactX >= 0 && p.impactY >= 0) {
    const tx = p.impactX * W, ty = p.impactY * H;
    let best = null, bd = Infinity;
    const need = Math.min(12, maxD * 0.3);
    for (let y = box.y0; y <= box.y1; y += 2) {
      for (let x = box.x0; x <= box.x1; x += 2) {
        if (din[y * W + x] < need) continue;
        const d = Math.hypot(x - tx, y - ty);
        if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; }
      }
    }
    if (best) return best;
  }
  const cand = [];
  for (let y = box.y0; y <= box.y1; y += 3) {
    for (let x = box.x0; x <= box.x1; x += 3) if (din[y * W + x] >= maxD * 0.55) cand.push(y * W + x);
  }
  const i = cand[Math.floor(r() * cand.length)] ?? Math.floor(((box.y0 + box.y1) / 2) * W + (box.x0 + box.x1) / 2);
  return { x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 };
}

// Cracks grow in small steps with a persistent, slowly turning heading, jagged at the smallest
// scale and with an occasional kink, until they leave the body or run into another crack.
function fracture({ mask, W, H, impact, r, p, maxD }) {
  const cracks = [];
  const OC = 3, ow = Math.ceil(W / OC), oh = Math.ceil(H / OC);
  const occ = new Int32Array(ow * oh).fill(-1);
  const inside = (x, y) => {
    const xi = x | 0, yi = y | 0;
    return xi >= 0 && yi >= 0 && xi < W && yi < H && mask[yi * W + xi] === 1;
  };
  const commit = (c) => {
    c.id = cracks.length;
    cracks.push(c);
    for (const [x, y] of c.pts) {
      const cx = (x / OC) | 0, cy = (y / OC) | 0;
      if (cx >= 0 && cy >= 0 && cx < ow && cy < oh) occ[cy * ow + cx] = c.id;
    }
    return c;
  };
  const near = (x, y, skip) => {
    const cx = (x / OC) | 0, cy = (y / OC) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const X = cx + dx, Y = cy + dy;
        if (X < 0 || Y < 0 || X >= ow || Y >= oh) continue;
        const o = occ[Y * ow + X];
        if (o >= 0 && !skip(o, x, y)) return o;
      }
    }
    return -1;
  };
  const grow = (c, x, y, th, skip) => {
    let om = 0, jag = 0, outside = 0;
    c.endOn = -1;
    for (let step = 1; step < 1500; step++) {
      om = om * 0.88 + r.gauss() * 0.0042;
      if (r() < 0.012) th += r.gauss() * 0.3;
      if (c.kind === 'main') th += angDiff(Math.atan2(y - impact.y, x - impact.x), th) * 0.02;
      th += om;
      const nx = x + Math.cos(th) * STEP, ny = y + Math.sin(th) * STEP;
      jag = jag * 0.35 + r.gauss() * 0.6;
      const px = nx - Math.sin(th) * jag, py = ny + Math.cos(th) * jag;
      const ins = inside(nx, ny);
      if (outside > 0 && ins) break; // it has left the piece; it does not come back in
      x = nx;
      y = ny;
      if (!ins) {
        c.pts.push([px, py]);
        if (++outside >= 3) break;
        continue;
      }
      const o = near(px, py, (k, qx, qy) => skip(k, qx, qy, step));
      if (o >= 0) {
        c.pts.push(nearestOn(cracks[o].pts, px, py).p);
        c.endOn = o;
        return c;
      }
      c.pts.push([px, py]);
    }
    return c;
  };

  // main cracks radiate from the impact
  const n = Math.round(clamp(p.cracks, 2, 7));
  const a0 = r() * Math.PI * 2;
  const mains = [];
  for (let i = 0; i < n; i++) {
    const th = a0 + (i + (r() - 0.5) * 0.55) * ((Math.PI * 2) / n);
    const c = { kind: 'main', pts: [[impact.x, impact.y]], startOn: -1, parent: -1, at: 0, th };
    grow(c, impact.x, impact.y, th, (k, x, y) => cracks[k].kind === 'main' && Math.hypot(x - impact.x, y - impact.y) < 20);
    if (c.pts.length > 3) mains.push(commit(c));
  }

  // a partial ring close to the impact, between neighbouring cracks
  const rr = clamp(maxD * 0.22, 18, 55);
  let rings = 0;
  const sorted = mains.slice().sort((a, b) => wrap(a.th - a0) - wrap(b.th - a0));
  if (sorted.length > 1) {
    for (let i = 0; i < sorted.length; i++) {
      if (rings >= 2 || r() > 0.25 + 0.5 * p.branching) continue;
      const A = sorted[i], B = sorted[(i + 1) % sorted.length];
      const ia = atRadius(A.pts, impact, rr * (0.85 + 0.3 * r())), ib = atRadius(B.pts, impact, rr * (0.85 + 0.3 * r()));
      if (ia < 0 || ib < 0) continue;
      const pa = A.pts[ia], pb = B.pts[ib];
      const fa = Math.atan2(pa[1] - impact.y, pa[0] - impact.x);
      const dphi = wrap(Math.atan2(pb[1] - impact.y, pb[0] - impact.x) - fa);
      if (dphi > 1.6 || dphi < 0.3) continue;
      const ra = Math.hypot(pa[0] - impact.x, pa[1] - impact.y), rb = Math.hypot(pb[0] - impact.x, pb[1] - impact.y);
      const m = Math.max(3, Math.round((dphi * (ra + rb)) / 2 / STEP));
      const wob = r.gauss() * 0.1;
      const pts = [pa];
      let ok = true, jag = 0;
      for (let s = 1; s < m; s++) {
        const f = s / m, phi = fa + dphi * f;
        jag = jag * 0.4 + r.gauss() * 0.7;
        const rad = lerp(ra, rb, f) * (1 + wob * Math.sin(Math.PI * f)) + jag;
        const x = impact.x + Math.cos(phi) * rad, y = impact.y + Math.sin(phi) * rad;
        if (!inside(x, y) || near(x, y, (k) => k === A.id || k === B.id) >= 0) { ok = false; break; }
        pts.push([x, y]);
      }
      if (!ok) continue;
      pts.push(pb);
      commit({ kind: 'ring', pts, startOn: A.id, endOn: B.id, parent: A.id, at: ia });
      rings++;
    }
  }

  // branches split off at an acute angle and run to the edge or into another crack
  const branch = (c, prob, level) => {
    const count = (r() < prob ? 1 : 0) + (r() < prob * 0.5 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      if (c.pts.length < 16) return;
      const i = Math.floor(c.pts.length * (0.18 + 0.62 * r()));
      const [x, y] = c.pts[i];
      if (!inside(x, y)) continue;
      const a = c.pts[Math.max(0, i - 2)], b = c.pts[Math.min(c.pts.length - 1, i + 2)];
      const th = Math.atan2(b[1] - a[1], b[0] - a[0]) + (r() < 0.5 ? -1 : 1) * (0.32 + 0.5 * r());
      const bc = { kind: 'branch', pts: [[x, y]], startOn: c.id, parent: c.id, at: i, level };
      grow(bc, x, y, th, (o, _x, _y, step) => o === c.id && step < 7);
      if (polyLen(bc.pts) < 14) continue;
      commit(bc);
      if (level < 1 && polyLen(bc.pts) > 70) branch(bc, p.branching * 0.35, level + 1);
    }
  };
  for (const c of mains) branch(c, p.branching * 0.95, 0);

  // the fracture front reaches every point at a time set by its distance along the network
  for (const c of cracks) {
    c.cum = lengths(c.pts, false);
    c.len = c.cum[c.cum.length - 1];
    c.born = c.parent < 0 ? 0 : cracks[c.parent].born + cracks[c.parent].cum[c.at];
    const last = c.pts[c.pts.length - 1];
    c.exits = !inside(last[0], last[1]);
  }
  return cracks;
}

function atRadius(pts, c, rad) {
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - c.x, pts[i][1] - c.y) >= rad) return i;
  return -1;
}

function nearestOn(pts, x, y) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  return { p: [pts[bi][0], pts[bi][1]], i: bi };
}

function rasterise(cracks, W, H) {
  const m = new Uint8Array(W * H);
  for (const c of cracks) {
    for (let i = 1; i < c.pts.length; i++) {
      const [ax, ay] = c.pts[i - 1], [bx, by] = c.pts[i];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1;
      for (let s = 0; s <= n; s++) {
        const xi = Math.floor(ax + ((bx - ax) * s) / n - 0.5), yi = Math.floor(ay + ((by - ay) * s) / n - 0.5);
        for (let dy = 0; dy <= 1; dy++) {
          for (let dx = 0; dx <= 1; dx++) {
            const X = xi + dx, Y = yi + dy;
            if (X >= 0 && Y >= 0 && X < W && Y < H) m[Y * W + X] = 1;
          }
        }
      }
    }
  }
  return m;
}

// ---------------------------------------------------------------- fragments

function fragments(alpha, mask, crackMask, W, H) {
  const N = W * H;
  const pass = new Uint8Array(N);
  for (let i = 0; i < N; i++) pass[i] = mask[i] && !crackMask[i] ? 1 : 0;
  const { lab: raw, sizes } = label4(pass, W, H);
  const remap = sizes.map(() => -1);
  let count = 0;
  sizes.forEach((s, k) => { if (s >= 250) remap[k] = count++; });
  const lab = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  for (let i = 0; i < N; i++) {
    if (raw[i] >= 0 && remap[raw[i]] >= 0) { lab[i] = remap[raw[i]]; queue[tail++] = i; }
  }
  // crack pixels, slivers and the soft rim go to the nearest real fragment
  while (head < tail) {
    const i = queue[head++], x = i % W;
    const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < N - W ? i + W : -1];
    for (const j of nb) {
      if (j >= 0 && lab[j] === -1 && alpha[j] > 0) { lab[j] = lab[i]; queue[tail++] = j; }
    }
  }
  const frags = [];
  for (let k = 0; k < count; k++) frags.push({ id: k, area: 0, x0: W, y0: H, x1: 0, y1: 0, sx: 0, sy: 0, cracked: false, nb: new Set() });
  for (let i = 0; i < N; i++) {
    const k = lab[i];
    if (k < 0) continue;
    const f = frags[k], x = i % W, y = (i / W) | 0;
    if (alpha[i] >= 0.5) { f.area++; f.sx += x; f.sy += y; }
    if (x < f.x0) f.x0 = x;
    if (x > f.x1) f.x1 = x;
    if (y < f.y0) f.y0 = y;
    if (y > f.y1) f.y1 = y;
    if (crackMask[i]) {
      f.cracked = true;
      for (const j of [i - 2, i + 2, i - 2 * W, i + 2 * W]) {
        if (j >= 0 && j < N && lab[j] >= 0 && lab[j] !== k) f.nb.add(lab[j]);
      }
    }
  }
  for (const f of frags) {
    f.cx = f.sx / Math.max(1, f.area);
    f.cy = f.sy / Math.max(1, f.area);
    f.dx = f.dy = f.rot = 0;
    f.w0 = 0;
    f.w1 = 1;
  }
  return { lab, frags };
}

// A fragment as its own sprite: the ceramic inside it, with the broken edge showing clay.
function sprite(f, lab, cer, crackDist, clay, W) {
  const x0 = f.x0 - 1, y0 = f.y0 - 1, w = f.x1 - f.x0 + 3, h = f.y1 - f.y0 + 3;
  const img = new ImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W + x0 + x;
      let own = 0, any = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const l = lab[i + dy * W + dx];
          if (l >= 0) { any++; if (l === f.id) own++; }
        }
      }
      if (!own) continue;
      const o = (y * w + x) * 4;
      const e = crackDist[i] < 1.8 ? 0.6 * (1 - crackDist[i] / 1.8) : 0;
      d[o] = lerp(cer[i * 4], clay[0], e);
      d[o + 1] = lerp(cer[i * 4 + 1], clay[1], e);
      d[o + 2] = lerp(cer[i * 4 + 2], clay[2], e);
      d[o + 3] = cer[i * 4 + 3] * (own / any);
    }
  }
  const c = canvas(w, h);
  c.getContext('2d').putImageData(img, 0, 0);
  f.sprite = c;
  f.ox = x0;
  f.oy = y0;
}

// A soft cast shadow plus a tight contact shadow, at half resolution.
function shadowSprite(alphaAt, b, W, H, surf) {
  const PAD = 44;
  const fx0 = Math.max(0, (b.x0 ?? b.x0) - PAD) & ~1, fy0 = Math.max(0, b.y0 - PAD) & ~1;
  const fx1 = Math.min(W - 2, b.x1 + PAD), fy1 = Math.min(H - 2, b.y1 + PAD);
  const w = ((fx1 - fx0) >> 1) + 1, h = ((fy1 - fy0) >> 1) + 1;
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = fx0 + x * 2, Y = fy0 + y * 2;
      a[y * w + x] = (alphaAt(X, Y) + alphaAt(X + 1, Y) + alphaAt(X, Y + 1) + alphaAt(X + 1, Y + 1)) / 4;
    }
  }
  const softA = boxBlur(boxBlur(boxBlur(a, w, h, 5), w, h, 5), w, h, 5);
  const tight = boxBlur(a, w, h, 1);
  const img = new ImageData(w, h);
  const [sr, sg, sb] = surf.shadow;
  const at = (f, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : f[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = clamp(0.5 * at(softA, x - 6, y - 8) + 0.55 * at(tight, x - 1, y - 1)) * surf.shadowA;
      const o = (y * w + x) * 4;
      img.data[o] = sr; img.data[o + 1] = sg; img.data[o + 2] = sb; img.data[o + 3] = v * 255;
    }
  }
  const c = canvas(w, h);
  c.getContext('2d').putImageData(img, 0, 0);
  return { c, x: fx0, y: fy0, w: w * 2, h: h * 2 };
}

// ---------------------------------------------------------------- seams

// Every pixel near a crack: how far it is from the seam's centre line, which way, how wide the
// seam is there, and when the brush reaches it.
function seams(cracks, alpha, W, H, p, seed) {
  const N = W * H;
  const base = p.seam / 2;
  const wn = valueNoise(hash('width', seed));
  // the brush paints each crack in turn: a main crack, then what grows from it
  const kids = cracks.map(() => []);
  for (const c of cracks) if (c.parent >= 0) kids[c.parent].push(c);
  const order = [];
  const visit = (c) => {
    order.push(c);
    kids[c.id].sort((a, b) => a.at - b.at).forEach(visit);
  };
  cracks.filter((c) => c.kind === 'main').forEach(visit);
  let u = 0;
  for (const c of order) {
    c.seam = chaikin(c.pts, 1, false);
    c.scum = lengths(c.seam, false);
    c.cum = c.cum || lengths(c.pts, false);
    c.u0 = u;
    c.slen = c.scum[c.scum.length - 1];
    u += c.slen + GAP;
  }
  const U = Math.max(1, u - GAP);
  const hwAt = (c, s) => base * (0.8 + 0.4 * wn(s / 40, c.id * 7.3 + 3));
  const band = base * 1.25 + 5;
  const sd = new Float32Array(N).fill(1e9);
  const sk = new Int32Array(N).fill(-1), ss = new Float32Array(N), sux = new Float32Array(N), suy = new Float32Array(N);
  for (const c of order) {
    const P = c.seam;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i];
      const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9, sl = Math.sqrt(l2);
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - band)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + band));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - band)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + band));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = clamp(((px - ax) * ex + (py - ay) * ey) / l2);
          const qx = ax + ex * t, qy = ay + ey * t;
          const dx = px - qx, dy = py - qy, d = Math.hypot(dx, dy);
          const j = y * W + x;
          if (d < sd[j]) {
            sd[j] = d;
            sk[j] = c.id;
            ss[j] = c.scum[i - 1] + t * sl;
            if (d > 1e-4) { sux[j] = dx / d; suy[j] = dy / d; } else { sux[j] = -ey / sl; suy[j] = ex / sl; }
          }
        }
      }
    }
  }
  const idx = [];
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (let j = 0; j < N; j++) {
    if (sk[j] < 0 || !(alpha[j] > 0)) continue;
    const c = cracks[sk[j]];
    if (sd[j] > hwAt(c, ss[j]) + 5) continue;
    idx.push(j);
    const x = j % W, y = (j / W) | 0;
    if (x < bx0) bx0 = x;
    if (x > bx1) bx1 = x;
    if (y < by0) by0 = y;
    if (y > by1) by1 = y;
  }
  const n = idx.length;
  const bw = Math.max(1, bx1 - bx0 + 1), bh = Math.max(1, by1 - by0 + 1);
  const S = {
    n, U, order, bx: bx0, by: by0, bw, bh,
    idx: Int32Array.from(idx), o: new Int32Array(n), d: new Float32Array(n), hw: new Float32Array(n),
    ux: new Float32Array(n), uy: new Float32Array(n), ord: new Float32Array(n), k: new Int32Array(n),
    grain: new Float32Array(n), grain2: new Float32Array(n), mx: new Float32Array(n), my: new Float32Array(n),
    proj: new Float32Array(n), body: new Float32Array(n), at: new Int32Array(N).fill(-1),
    img: new ImageData(bw, bh),
  };
  const rg = rng(hash('grain', seed));
  const mn = valueNoise(hash('micro', seed));
  const pmax = bw * SWEEP[0] + bh * SWEEP[1];
  S.pmax = pmax;
  for (let m = 0; m < n; m++) {
    const j = idx[m], x = j % W, y = (j / W) | 0, c = cracks[sk[j]];
    S.o[m] = (y - by0) * bw + (x - bx0);
    S.d[m] = sd[j];
    S.hw[m] = hwAt(c, ss[j]);
    S.ux[m] = sux[j];
    S.uy[m] = suy[j];
    S.k[m] = c.id;
    S.ord[m] = (c.u0 + ss[j]) / U;
    S.grain[m] = rg();
    S.grain2[m] = rg();
    S.mx[m] = mn(x / 1.7, y / 1.7) - 0.5;
    S.my[m] = mn(x / 1.7 + 71, y / 1.7 + 29) - 0.5;
    S.proj[m] = ((x - bx0) * SWEEP[0] + (y - by0) * SWEEP[1]) / pmax;
    S.body[m] = alpha[j];
    S.at[j] = m;
  }
  return S;
}

function projOf(S, x, y) {
  return ((x - S.bx) * SWEEP[0] + (y - S.by) * SWEEP[1]) / S.pmax;
}

function goldAlpha(S, m, gf) {
  const cov = clamp(((gf - S.ord[m]) * S.U) / 50);
  const present = clamp((cov * 1.25 - S.grain[m]) * 6);
  return present * clamp(S.hw[m] + 0.5 - S.d[m]) * S.body[m];
}

function finalState(pl) {
  const U = pl.seam.U;
  return { lf: 1 + 8 / U, gf: 1 + 60 / U, spos: 1.4, glow: false, point: null, pointW: 0 };
}

// Lacquer, gold and the seam's own small shadow, shaded per pixel, into the seam image.
function paintSeams(pl, st) {
  const S = pl.seam, d = S.img.data, U = S.U, ramp = pl.ramp;
  const lsharp = U / 3;
  const pt = st.point;
  for (let m = 0; m < S.n; m++) {
    const D = S.d[m], hw = S.hw[m], ux = S.ux[m], uy = S.uy[m], body = S.body[m];
    let R = 0, G = 0, B = 0, A = 0;
    const lr = clamp((st.lf - S.ord[m]) * lsharp + 0.5);
    if (lr > 0) {
      // the seam stands proud of the glaze and casts a thin shadow away from the light
      const hl = hw + 0.8;
      if (D > hw - 0.5) {
        const side = clamp(-(ux * L2[0] + uy * L2[1]));
        const a = 0.34 * side * clamp(1 - (D - hl) / 3.2) * clamp(D - hw + 0.5) * lr * body;
        R = 0; G = 0; B = 0; A = a;
      }
      // red urushi: a wet, glossy bead
      const aL = clamp(hl + 0.5 - D) * lr * body;
      if (aL > 0) {
        const t = Math.min(1, D / hl), s = Math.min(0.92, t * t * t);
        const nx = ux * s, ny = uy * s, nz = Math.sqrt(1 - s * s);
        const ndl = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const ndh = Math.max(0, nx * HALFV[0] + ny * HALFV[1] + nz * HALFV[2]);
        const I = 0.42 + 0.62 * ndl, sp = Math.pow(ndh, 44) * 0.75;
        const cr = LACQUER[0] * I + 255 * sp, cg = LACQUER[1] * I + 235 * sp, cb = LACQUER[2] * I + 220 * sp;
        R = cr * aL + R * (1 - aL); G = cg * aL + G * (1 - aL); B = cb * aL + B * (1 - aL); A = aL + A * (1 - aL);
      }
    }
    // gold dusted onto the lacquer, burnished as the polish passes
    const aG = st.gf > 0 ? goldAlpha(S, m, st.gf) : 0;
    if (aG > 0) {
      const pol = clamp((st.spos - S.proj[m]) / 0.08 + 0.5);
      const rough = lerp(0.6, 0.14, pol);
      const t = Math.min(1, D / hw), s = Math.min(0.9, t * t * t);
      let nx = ux * s + S.mx[m] * rough, ny = uy * s + S.my[m] * rough;
      const l = nx * nx + ny * ny;
      if (l > 0.9) { const k = Math.sqrt(0.9 / l); nx *= k; ny *= k; }
      const nz = Math.sqrt(1 - nx * nx - ny * ny);
      const ndl = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const ndh = Math.max(0, nx * HALFV[0] + ny * HALFV[1] + nz * HALFV[2]);
      const Ipol = 0.1 + 0.72 * ndl + 1.4 * Math.pow(ndh, 64) + 0.12 * Math.pow(ndh, 8);
      const Ipow = 0.6 + 0.26 * ndl + (S.grain2[m] - 0.5) * 0.45 + 0.08 * ndh * ndh;
      let I = lerp(Ipow, Ipol, pol);
      if (st.glow) {
        const q = (S.proj[m] - st.spos) / 0.05;
        I += 0.75 * Math.exp(-q * q) * (0.5 + ndl);
      }
      if (pt && st.pointW > 0) {
        const x = S.idx[m] % pl.W + 0.5, y = ((S.idx[m] / pl.W) | 0) + 0.5;
        let lx = pt.x - x, ly = pt.y - y, lz = 240;
        const dist2 = lx * lx + ly * ly;
        const li = 1 / Math.sqrt(dist2 + lz * lz);
        lx *= li; ly *= li; lz *= li;
        let hx = lx, hy = ly, hz = lz + 1;
        const hi = 1 / Math.sqrt(hx * hx + hy * hy + hz * hz);
        hx *= hi; hy *= hi; hz *= hi;
        const pdl = Math.max(0, nx * lx + ny * ly + nz * lz), pdh = Math.max(0, nx * hx + ny * hy + nz * hz);
        const att = st.pointW / (1 + dist2 / 90000);
        I += att * (0.3 * pdl + 1.5 * Math.pow(pdh, 40) * pol);
      }
      const ci = Math.max(0, Math.min(511, (I / 1.8) * 511 | 0)) * 3;
      let cr = ramp[ci], cg = ramp[ci + 1], cb = ramp[ci + 2];
      if (pol < 1) {
        const g = (cr + cg + cb) / 3, k = 0.14 * (1 - pol);
        cr = lerp(cr, g, k); cg = lerp(cg, g, k); cb = lerp(cb, g, k);
      }
      R = cr * aG + R * (1 - aG); G = cg * aG + G * (1 - aG); B = cb * aG + B * (1 - aG); A = aG + A * (1 - aG);
    }
    const o = S.o[m] * 4;
    if (A > 0.002) {
      d[o] = R / A; d[o + 1] = G / A; d[o + 2] = B / A; d[o + 3] = A * 255;
    } else d[o + 3] = 0;
  }
}

function rampLUT(stops) {
  const lut = new Uint8ClampedArray(512 * 3);
  for (let i = 0; i < 512; i++) {
    const I = (i / 511) * 1.8;
    let k = 0;
    while (k < stops.length - 2 && stops[k + 1][0] < I) k++;
    const [a, ca] = stops[k], [b, cb] = stops[Math.min(k + 1, stops.length - 1)];
    const t = b > a ? clamp((I - a) / (b - a)) : 0;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = lerp(ca[c], cb[c], t);
  }
  return lut;
}

// ---------------------------------------------------------------- surface

function surface(kind, W, H, seed) {
  const s = SURFACES[kind] || SURFACES.slate;
  let c;
  if (kind === 'washi') c = paper(W, H, '#ece4d5', hash(seed, 'washi'), { tooth: 0.07, fibres: 520 });
  else {
    c = canvas(W, H);
    const g = c.getContext('2d');
    const img = g.createImageData(W, H), d = img.data;
    const n = valueNoise(hash('surface', seed));
    const [r0, g0, b0] = s.base;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let v;
        if (kind === 'linen') {
          const t1 = n(x / 0.9, y / 9), t2 = n(x / 9 + 100, y / 0.9 + 50);
          v = (t1 + t2 - 1) * 0.09 + (fbm(n, x / 180, y / 180, 3) - 0.5) * 0.08;
        } else {
          v = (fbm(n, x / 210, y / 210, 3) - 0.5) * 0.2 + (n(x / 1.4 + 300, y / 1.4 + 300) - 0.5) * 0.08;
        }
        const i = (y * W + x) * 4, k = 1 + v;
        d[i] = r0 * k; d[i + 1] = g0 * k; d[i + 2] = b0 * k; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  // the light falls from the upper left; the far corners are darker
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(W * 0.3, H * 0.26, 0, W * 0.3, H * 0.26, W * 1.05);
  const dark = kind === 'slate';
  grad.addColorStop(0, dark ? 'rgba(255,248,236,0.07)' : 'rgba(255,252,244,0.10)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0)');
  grad.addColorStop(1, dark ? 'rgba(0,0,0,0.42)' : 'rgba(40,28,16,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

// ---------------------------------------------------------------- check

export function check(pl) {
  const { cracks, seam: S, W, alpha, frags, moving, params: p } = pl;
  const fin = finalState(pl);

  // gold follows the fracture: sample every crack; every gold pixel lies on a crack
  let samples = 0, bare = 0, total = 0;
  const gilded = new Set();
  for (const c of cracks) {
    total += c.len;
    for (let i = 1; i < c.pts.length; i++) {
      const [ax, ay] = c.pts[i - 1], [bx, by] = c.pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.5));
      for (let s = 0; s < n; s++) {
        const x = ax + ((bx - ax) * s) / n, y = ay + ((by - ay) * s) / n;
        const j = Math.floor(y) * W + Math.floor(x);
        if (!(alpha[j] >= 0.99)) continue;
        samples++;
        const m = S.at[j];
        if (m < 0 || goldAlpha(S, m, fin.gf) < 0.5) bare++;
      }
    }
  }
  let stray = 0;
  for (let m = 0; m < S.n; m++) {
    if (goldAlpha(S, m, fin.gf) <= 0.05) continue;
    gilded.add(S.k[m]);
    if (pl.crackDist[S.idx[m]] > S.hw[m] + 2) stray++;
  }
  const ungilded = cracks.length - gilded.size;

  // rejoined: evaluate the same pose draw() uses, at t = 1 and at the widest point of the break
  let maxOff = 0, maxRot = 0, maxApart = 0;
  for (const f of frags) {
    const e = pose(f, 1, 1), a = pose(f, 1, 0);
    maxOff = Math.max(maxOff, Math.hypot(e.dx, e.dy));
    maxRot = Math.max(maxRot, Math.abs(e.rot));
    maxApart = Math.max(maxApart, Math.hypot(a.dx, a.dy));
  }
  let orphans = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 0.5 && pl.lab[i] < 0) orphans++;

  // the repair is visible: width and colour difference against the glaze beside the seam
  const img = paintedFinal(pl);
  const buckets = new Map();
  let minW = Infinity;
  for (let m = 0; m < S.n; m++) {
    if (S.body[m] < 0.99) continue;
    const key = S.k[m] * 100000 + Math.floor((S.ord[m] * S.U) / 14);
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { g: [0, 0, 0, 0], c: [0, 0, 0, 0] }));
    const o = S.o[m] * 4, j = S.idx[m] * 4;
    if (S.d[m] < S.hw[m] * 0.6) {
      minW = Math.min(minW, S.hw[m] * 2);
      b.g[0] += img[o]; b.g[1] += img[o + 1]; b.g[2] += img[o + 2]; b.g[3]++;
    } else if (S.d[m] > S.hw[m] + 2.5) {
      b.c[0] += pl.cerData[j]; b.c[1] += pl.cerData[j + 1]; b.c[2] += pl.cerData[j + 2]; b.c[3]++;
    }
  }
  const des = [];
  for (const b of buckets.values()) {
    if (b.g[3] < 4 || b.c[3] < 4) continue;
    des.push(deltaE(b.g.slice(0, 3).map((v) => v / b.g[3]), b.c.slice(0, 3).map((v) => v / b.c[3])));
  }
  des.sort((a, b) => a - b);
  const medDE = des.length ? des[Math.floor(des.length / 2)] : 0;

  // noble metal: the parameter and the colour actually drawn
  const known = Object.prototype.hasOwnProperty.call(METALS, p.metal);
  const mid = [pl.ramp[256 * 3], pl.ramp[256 * 3 + 1], pl.ramp[256 * 3 + 2]];
  const hsv = toHsv(mid);
  const metalOk = known && (p.metal === 'gold' ? hsv.h >= 30 && hsv.h <= 55 && hsv.s >= 0.35 : hsv.s <= 0.12);
  let lo = 255, hiL = 0;
  for (let i = 0; i < 512; i += 64) {
    const L = 0.2126 * pl.ramp[i * 3] + 0.7152 * pl.ramp[i * 3 + 1] + 0.0722 * pl.ramp[i * 3 + 2];
    lo = Math.min(lo, L);
    hiL = Math.max(hiL, L);
  }
  const lustre = hiL - lo; // a metal runs from deep shadow to near white; a paint does not

  // a real break: one impact, every crack ends at the edge or on another crack, branching, irregular
  const loose = cracks.filter((c) => !(c.exits || c.endOn >= 0));
  const junctions = cracks.filter((c) => c.startOn >= 0).length + cracks.filter((c) => c.endOn >= 0).length;
  const sinu = cracks.filter((c) => c.len > 30).map((c) => {
    const a = c.pts[0], b = c.pts[c.pts.length - 1];
    return c.len / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
  });
  const minSinu = sinu.length ? Math.min(...sinu) : 1;
  const mains = cracks.filter((c) => c.kind === 'main').length;

  const fmt = (x) => Math.round(x).toLocaleString('en');
  return [
    {
      id: 'gold-follows-fracture',
      pass: samples > 0 && bare === 0 && stray === 0 && ungilded === 0,
      detail: `${cracks.length} crack paths, ${fmt(total)} px of fracture: ${samples - bare} of ${samples} samples gilded` +
        `${ungilded ? `, ${ungilded} paths without gold` : ''}; ${stray} gold pixels off the fracture`,
    },
    {
      id: 'rejoined',
      pass: frags.length > 1 && maxOff < 0.01 && maxRot < 1e-4 && orphans === 0 && maxApart >= 5,
      detail: `${moving.length} of ${frags.length} fragments broke away by up to ${maxApart.toFixed(0)} px; at t = 1 max offset ${maxOff.toFixed(3)} px, turn ${maxRot.toFixed(4)} rad` +
        `${orphans ? `, ${orphans} px of body in no fragment` : ''}`,
    },
    {
      id: 'repair-visible',
      pass: minW >= 3 && medDE >= 20,
      detail: `seams ${minW.toFixed(1)}-${(p.seam * 1.2).toFixed(1)} px wide; median ΔE ${medDE.toFixed(0)} against the glaze beside them (${des.length} stretches)`,
    },
    {
      id: 'noble-metal',
      pass: metalOk && lustre > 150,
      detail: `${known ? p.metal : `'${p.metal}' is not gold, silver or platinum`}: body colour ${hexOf(mid)} (hue ${hsv.h.toFixed(0)}°, saturation ${hsv.s.toFixed(2)}), lustre range ${lustre.toFixed(0)} of 255`,
    },
    {
      id: 'real-break',
      // a clean break in two has no junction; anything more has to branch
      pass: mains >= 2 && loose.length === 0 && moving.length >= 2 && (moving.length === 2 || junctions >= 1) && minSinu >= 1.005,
      detail: `impact at (${pl.impact.x.toFixed(0)}, ${pl.impact.y.toFixed(0)}): ${mains} main cracks, ${cracks.length - mains} branches and ring cracks; ` +
        `${loose.length} ending in open glaze; ${moving.length} fragments; ${junctions} junctions; paths ${minSinu.toFixed(3)}x their chord or more`,
    },
  ];
}

function paintedFinal(pl) {
  paintSeams(pl, finalState(pl));
  return pl.seam.img.data;
}

function deltaE(a, b) {
  const A = lab(a), B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

function lab([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = f(r), G = f(g), B = f(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
}

function toHsv([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: ((h * 60) + 360) % 360, s: mx ? d / mx : 0, v: mx / 255 };
}

function hexOf(c) {
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- drawing

// Where a fragment is at a moment of the break (b) and the gathering (g).
function pose(f, b, g) {
  if (!f.cracked) return { dx: 0, dy: 0, rot: 0, lift: 0 };
  const x = clamp((b - SPLIT) / (0.9 - SPLIT));
  const out = b < SPLIT ? 0 : easeOut(x);
  const back = clamp((g - f.w0) / Math.max(1e-6, f.w1 - f.w0));
  const m = easeInOut(back);
  const k = out * (1 - m);
  const hop = b >= SPLIT && x < 1 ? Math.sin(Math.PI * x) * 0.5 : 0;
  return { dx: f.dx * k, dy: f.dy * k, rot: f.rot * k, lift: hop + Math.sin(Math.PI * m) };
}

export function draw(ctx, pl, t) {
  const st = pl.stages;
  render(ctx, pl, {
    w: progress(st, 'whole', t), b: progress(st, 'break', t), g: progress(st, 'gather', t),
    l: progress(st, 'lacquer', t), au: progress(st, 'gold', t), po: progress(st, 'polish', t),
  });
}

function render(ctx, pl, s) {
  const { W, H } = pl;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(pl.bg, 0, 0, W, H);

  const apart = s.b >= SPLIT && s.g < GATHER_END;
  let ox = 0, oy = 0;
  if (s.b > 0 && s.b < 0.16) {
    const k = s.b / 0.16, a = 4 * (1 - k) * (1 - k);
    ox = a * Math.sin(k * 55);
    oy = a * Math.cos(k * 43) * 0.6;
  }
  if (!apart) {
    const sh = pl.shadow;
    ctx.drawImage(sh.c, sh.x + ox, sh.y + oy, sh.w, sh.h);
    ctx.drawImage(pl.ceramic, ox, oy);
  } else pieces(ctx, pl, s);

  // light gliding over the glaze
  if (s.w > 0 && s.w < 1) {
    const e = easeInOut(s.w);
    glint(ctx, pl, lerp(-1.25, 1.05, e), lerp(-0.75, 0.5, e), 0.3, Math.sin(Math.PI * s.w) * 0.8);
  }
  if (s.po > 0 && s.po < 1) {
    const e = lerp(-0.2, 1.4, s.po);
    glint(ctx, pl, lerp(-1.1, 1.1, e), lerp(-0.6, 0.6, e), 0.28, Math.sin(Math.PI * s.po) * 0.5);
  }
  if (s.live) glint(ctx, pl, s.live.gx, s.live.gy, 0.26, s.live.gs);

  // the fracture racing out from the impact, before the pieces part
  if (s.b > 0 && s.b < SPLIT + 0.06) {
    const front = clamp((s.b - 0.03) / (SPLIT - 0.08)) * pl.frontMax;
    const a = 1 - smooth((s.b - SPLIT) / 0.06);
    crackLines(ctx, pl, front, a, ox, oy);
  }
  if (s.b > 0 && s.b < 0.12) flash(ctx, pl, s.b / 0.12);
  if (s.b >= SPLIT && s.g < 0.3) chips(ctx, pl, s);

  // joined with urushi: the hairline of glue along every join
  if (!apart && s.g >= GATHER_END) glue(ctx, pl, smooth((s.g - GATHER_END) / (1 - GATHER_END)));

  // lacquer, gold, polish
  if (s.l > 0) {
    const U = pl.seam.U;
    const st = {
      lf: clamp((s.l - 0.02) / 0.94) * (1 + 8 / U),
      gf: s.au > 0 ? clamp((s.au - 0.02) / 0.9) * (1 + 60 / U) : 0,
      spos: s.po > 0 ? lerp(-0.2, 1.4, s.po) : -1,
      glow: s.po > 0 && s.po < 1,
      point: s.live ? s.live.point : null,
      pointW: s.live ? s.live.pw : 0,
    };
    paintSeams(pl, st);
    const S = pl.seam, sc = pl.scratch.seam;
    sc.getContext('2d').putImageData(S.img, 0, 0);
    ctx.drawImage(sc, S.bx, S.by);
    if (s.l < 1) tool(ctx, pl, st.lf, 'brush');
    else if (s.au > 0 && s.au < 1) {
      tool(ctx, pl, st.gf - 25 / U, 'tube', s.au);
      sparkleFront(ctx, pl, st.gf);
    }
    if (st.glow) sparkleSweep(ctx, pl, st.spos);
    if (s.live) sparkleLive(ctx, pl, s.live);
  }
  ctx.restore();
}

function pieces(ctx, pl, s) {
  const list = pl.frags.map((f) => ({ f, q: pose(f, s.b, s.g) })).sort((a, b) => a.q.lift - b.q.lift);
  for (const { f, q } of list) {
    const sh = f.shadow;
    ctx.save();
    ctx.globalAlpha = 1 - 0.3 * clamp(q.lift);
    xform(ctx, f, q, 6 * q.lift, 9 * q.lift);
    ctx.drawImage(sh.c, sh.x, sh.y, sh.w, sh.h);
    ctx.restore();
  }
  for (const { f, q } of list) {
    ctx.save();
    xform(ctx, f, q, 0, 0);
    if (q.lift > 0) {
      const k = 1 + 0.015 * clamp(q.lift);
      ctx.translate(f.cx, f.cy);
      ctx.scale(k, k);
      ctx.translate(-f.cx, -f.cy);
    }
    ctx.drawImage(f.sprite, f.ox, f.oy);
    ctx.restore();
  }
}

function xform(ctx, f, q, sx, sy) {
  ctx.translate(f.cx + q.dx + sx, f.cy + q.dy + sy);
  ctx.rotate(q.rot);
  ctx.translate(-f.cx, -f.cy);
}

function glint(ctx, pl, lx, ly, spread, strength) {
  if (strength <= 0.002) return;
  const G = pl.gl, d = G.img.data, inv = 128 / (spread * spread);
  for (let k = 0; k < G.o.length; k++) {
    const dx = G.rx[k] - lx, dy = G.ry[k] - ly;
    const q = (dx * dx + dy * dy) * inv;
    d[G.o[k] * 4 + 3] = q < 1024 ? EXP[q | 0] * G.g[k] * strength * 255 : 0;
  }
  const c = pl.scratch.glint;
  c.getContext('2d').putImageData(G.img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(c, G.x, G.y, G.w * 2, G.h * 2);
  ctx.restore();
}

function crackLines(ctx, pl, front, a, ox, oy) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    ctx.beginPath();
    for (const c of pl.cracks) {
      const vis = front - c.born;
      if (vis <= 0) continue;
      partial(ctx, c.pts, c.cum, Math.min(vis, c.len), pass ? 0 : -0.9);
    }
    if (pass) {
      ctx.strokeStyle = `rgba(18,12,9,${0.92 * a})`;
      ctx.lineWidth = 1.35;
    } else {
      ctx.strokeStyle = `rgba(255,250,238,${0.4 * a})`;
      ctx.lineWidth = 1;
    }
    ctx.stroke();
  }
  // the running tip of each crack glints for an instant
  for (const c of pl.cracks) {
    const vis = front - c.born;
    if (vis <= 0 || vis >= c.len) continue;
    const pt = along(c.pts, c.cum, vis);
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 9);
    g.addColorStop(0, `rgba(255,252,240,${0.55 * a})`);
    g.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(pt.x - 9, pt.y - 9, 18, 18);
  }
  ctx.restore();
}

function glue(ctx, pl, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = GLUE;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const c of pl.cracks) partial(ctx, c.pts, c.cum, c.len, 0);
  ctx.stroke();
  ctx.restore();
}

function partial(ctx, pts, cum, len, off) {
  ctx.moveTo(pts[0][0] + off, pts[0][1] + off);
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] > len) {
      const p = along(pts, cum, len);
      ctx.lineTo(p.x + off, p.y + off);
      return;
    }
    ctx.lineTo(pts[i][0] + off, pts[i][1] + off);
  }
}

function flash(ctx, pl, k) {
  const { x, y } = pl.impact;
  const rad = 14 + 60 * easeOut(k), a = (1 - k) * 0.75;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(255,253,246,${a})`);
  g.addColorStop(0.35, `rgba(255,248,230,${a * 0.35})`);
  g.addColorStop(1, 'rgba(255,248,230,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
}

function chips(ctx, pl, s) {
  const { x: ix, y: iy } = pl.impact;
  const fade = 1 - smooth(s.g / 0.25);
  if (fade <= 0) return;
  const [r, g, b] = pl.chipCol;
  ctx.save();
  ctx.globalAlpha = fade;
  for (const c of pl.chips) {
    const x = clamp((s.b - SPLIT - c.delay) / 0.4);
    if (x <= 0) continue;
    const e = easeOut(x), hop = Math.sin(Math.PI * Math.min(1, x * 1.25)) * 14;
    const px = ix + Math.cos(c.a) * c.dist * e, py = iy + Math.sin(c.a) * c.dist * e;
    ctx.save();
    ctx.translate(px + 2 + hop * 0.4, py + 3 + hop * 0.6);
    ctx.rotate(c.spin * e);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    poly(ctx, c.pts);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(px, py - hop);
    ctx.rotate(c.spin * e);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    poly(ctx, c.pts);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,236,220,0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// Where the brush is along the painting order f (0..1): on a seam, or travelling between two.
function brushAt(pl, f) {
  const S = pl.seam, u = f * S.U;
  const ord = S.order;
  for (let i = 0; i < ord.length; i++) {
    const c = ord[i];
    if (u < c.u0) {
      const prev = ord[i - 1];
      if (!prev) return { ...along(c.seam, c.scum, 0), lift: 1 };
      const a = along(prev.seam, prev.scum, prev.slen), b = along(c.seam, c.scum, 0);
      const k = clamp((u - prev.u0 - prev.slen) / GAP);
      return { x: lerp(a.x, b.x, easeInOut(k)), y: lerp(a.y, b.y, easeInOut(k)), lift: Math.sin(Math.PI * k) };
    }
    if (u <= c.u0 + c.slen) return { ...along(c.seam, c.scum, u - c.u0), lift: 0 };
  }
  const c = ord[ord.length - 1];
  return { ...along(c.seam, c.scum, c.slen), lift: 1 };
}

function tool(ctx, pl, f, kind, k = 0) {
  if (!pl.seam.order.length) return;
  const p = brushAt(pl, clamp(f));
  const lift = p.lift;
  ctx.save();
  if (kind === 'brush') {
    ctx.translate(p.x, p.y - 9 * lift);
    ctx.rotate(0.5);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8 + 8 * lift;
    ctx.shadowOffsetX = 12 + 10 * lift;
    ctx.shadowOffsetY = 14 + 12 * lift;
    // lacquered handle, bound ferrule, a fine tip loaded with red urushi
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(-3.4, -230, 6.8, 190);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,240,220,0.22)';
    ctx.fillRect(-2.2, -226, 1.4, 182);
    ctx.fillStyle = '#b08a4a';
    ctx.fillRect(-3.8, -42, 7.6, 9);
    ctx.fillStyle = '#2b120d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4.6, -12, 3.6, -33);
    ctx.lineTo(-3.6, -33);
    ctx.quadraticCurveTo(-4.6, -12, 0, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,40,24,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2.6, -6, 2.2, -12);
    ctx.lineTo(-2.2, -12);
    ctx.quadraticCurveTo(-2.6, -6, 0, 0);
    ctx.fill();
  } else {
    // a fine bamboo powder tube, tapped so gold falls onto the tacky lacquer
    const mx = p.x + 14, my = p.y - 38 - 6 * lift;
    const [r, g, b] = [pl.ramp[360 * 3], pl.ramp[360 * 3 + 1], pl.ramp[360 * 3 + 2]];
    for (let i = 0; i < 16; i++) {
      const ph = (k * 46 + i / 16) % 1;
      const jx = Math.sin(i * 12.9898) * 7, jy = Math.cos(i * 78.233) * 3;
      const x = lerp(mx - 2, p.x + jx, ph), y = lerp(my + 4, p.y + jy, ph * ph);
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.sin(Math.PI * ph) * 0.95})`;
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
    ctx.translate(mx, my);
    ctx.rotate(0.62);
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 16;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#b89a62';
    ctx.fillRect(-5.5, -170, 11, 170);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,245,220,0.3)';
    ctx.fillRect(-3.5, -166, 2.2, 162);
    ctx.fillStyle = 'rgba(70,50,24,0.55)';
    for (const n of [-120, -60]) ctx.fillRect(-5.5, n, 11, 3);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(-5.5, -2, 11, 3);
  }
  ctx.restore();
}

function star(ctx, x, y, size, a) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
  g.addColorStop(0, `rgba(255,252,236,${a})`);
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - size * 1.8, y - size * 1.8, size * 3.6, size * 3.6);
  ctx.strokeStyle = `rgba(255,253,244,${a * 0.9})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - size * 3, y); ctx.lineTo(x + size * 3, y);
  ctx.moveTo(x, y - size * 3); ctx.lineTo(x, y + size * 3);
  ctx.stroke();
}

function sparkleFront(ctx, pl, gf) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of pl.sparkles) {
    const x = ((gf - s.ord) * pl.seam.U) / 90;
    if (x > 0 && x < 1) star(ctx, s.x, s.y, s.size, Math.sin(Math.PI * x) * 0.8);
  }
  ctx.restore();
}

function sparkleSweep(ctx, pl, spos) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of pl.sparkles) {
    const q = Math.abs(s.proj - spos) / 0.035;
    if (q < 1) star(ctx, s.x, s.y, s.size * 1.2, (1 - q) * 0.9);
  }
  ctx.restore();
}

function sparkleLive(ctx, pl, lv) {
  if (!lv.point) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of pl.sparkles) {
    const d = Math.hypot(s.x - lv.point.x, s.y - lv.point.y);
    if (d > 170) continue;
    const tw = Math.max(0, Math.sin((lv.time * 1.3 + s.phase) * Math.PI * 2));
    star(ctx, s.x, s.y, s.size, Math.pow(tw, 8) * (1 - d / 170) * lv.pw * 0.9);
  }
  ctx.restore();
}

// Once mended: the gold catches the light where the pointer is, or a slow light moves round.
export function live(ctx, pl, { time, pointer }) {
  const ramp = smooth(time / 1.2);
  let lv;
  if (pointer) {
    const gx = ((pointer.x - (pl.box.x0 + pl.box.x1) / 2) / pl.W) * 1.7, gy = ((pointer.y - (pl.box.y0 + pl.box.y1) / 2) / pl.H) * 1.7;
    lv = { point: pointer, pw: ramp, gx, gy, gs: 0.4 * ramp, time };
  } else {
    const a = time * 0.21;
    const point = { x: pl.W * (0.5 + 0.42 * Math.sin(a)), y: pl.H * (0.42 - 0.3 * Math.cos(a * 0.8)) };
    lv = { point, pw: 0.7 * ramp, gx: -0.6 + 0.5 * Math.sin(a), gy: -0.5 + 0.3 * Math.cos(a * 0.8), gs: 0.2 * ramp, time };
  }
  render(ctx, pl, { w: 1, b: 1, g: 1, l: 1, au: 1, po: 1, live: lv });
}

// A click breaks the piece again where it was struck, and the making starts over.
export function press(pl, pointer) {
  const seed = hash(pl.seed, Math.round(pointer.x), Math.round(pointer.y)) % 1000000;
  return { seed, params: { impactX: +(pointer.x / pl.W).toFixed(4), impactY: +(pointer.y / pl.H).toFixed(4) }, replay: true };
}

// ---------------------------------------------------------------- local helpers (could move to core)

// Exact Euclidean distance from every pixel where inside[i] is set to the nearest pixel where
// it is not (Felzenszwalb and Huttenlocher), 0 outside.
function edt(inside, w, h) {
  const INF = 1e20, n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1), v = new Int32Array(n);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = inside[i] ? INF : 0;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    dt1(f, d, v, z, h);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) f[x] = g[o + x];
    dt1(f, d, v, z, w);
    for (let x = 0; x < w; x++) out[o + x] = Math.sqrt(d[x]);
  }
  return out;
}

function dt1(f, d, v, z, n) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

// Box blur with running sums: O(n) whatever the radius.
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[o + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = acc * inv;
      acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * inv;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

// Four-connected components at full resolution with a flat stack.
function label4(pass, w, h) {
  const n = w * h, lab = new Int32Array(n).fill(-1), stack = new Int32Array(n), sizes = [];
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (!pass[s] || lab[s] !== -1) continue;
    let top = 0, size = 0;
    stack[top++] = s;
    lab[s] = count;
    while (top) {
      const i = stack[--top];
      size++;
      const x = i % w;
      if (x > 0 && pass[i - 1] && lab[i - 1] === -1) { lab[i - 1] = count; stack[top++] = i - 1; }
      if (x < w - 1 && pass[i + 1] && lab[i + 1] === -1) { lab[i + 1] = count; stack[top++] = i + 1; }
      if (i >= w && pass[i - w] && lab[i - w] === -1) { lab[i - w] = count; stack[top++] = i - w; }
      if (i < n - w && pass[i + w] && lab[i + w] === -1) { lab[i + w] = count; stack[top++] = i + w; }
    }
    sizes.push(size);
    count++;
  }
  return { lab, sizes, count };
}

function invert(m) {
  const o = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) o[i] = m[i] ? 0 : 1;
  return o;
}

function polyLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function wrap(a) {
  const t = a % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

function unit3(x, y, z) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

function unit2(x, y) {
  const l = Math.hypot(x, y);
  return [x / l, y / l];
}
