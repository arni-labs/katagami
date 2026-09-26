// Risograph: a picture printed one spot colour at a time. Each ink gets its own master, burned
// by a thermal head into a thin stencil film and wrapped on that ink's drum; the sheet is fed
// through once per drum and the inks overprint. The film is the making: the masters are burned,
// the sheet goes through each drum, and the copy is pulled onto the stack and numbered.
//
// Every seed is one copy of the edition. The masters are the same for every copy; only the
// registration of each pass and the way the ink lays down change, as on a real run.
import {
  grid, canvas, hex, rgb, rng, hash, valueNoise, fbm, stageAt, clamp, lerp, smooth, easeOut,
  easeIn, easeInOut, chaikin, lengths, along,
} from '../../runtime/core.js';

// Riso ink colours, as published for the drums.
const INKS = [
  ['Fluorescent Pink', '#FF48B0'], ['Blue', '#0078BF'], ['Yellow', '#FFE800'], ['Teal', '#00838A'],
  ['Bright Red', '#F15060'], ['Medium Blue', '#3255A4'], ['Green', '#00A95C'], ['Orange', '#FF6C2F'],
  ['Black', '#000000'], ['Purple', '#765BA7'], ['Federal Blue', '#3D5588'], ['Sunflower', '#FFB511'],
  ['Mint', '#82D8D5'], ['Burgundy', '#914E72'],
];
const NAMES = INKS.map(([n]) => n);

export const meta = {
  id: 'risograph',
  name: 'Risograph',
  version: '0.1.0',
  creator: { name: 'Rita Agafonova', handle: 'arni.art' },
  licence: 'Apache-2.0',
  medium: 'print',
  tradition: [{ cell: 'risograph', name: 'Risograph (stencil duplicator printing)' }],
  parents: [],
  duration: 18,
  summary:
    'Any picture separated into two to four spot inks, each burned into its own master and printed through its own drum. The inks overprint, each pass lands a little off, and every seed is the next copy of the edition.',
};

export const params = {
  ink1: { type: 'choice', default: 'Fluorescent Pink', options: NAMES, label: 'Drum 1' },
  ink2: { type: 'choice', default: 'Blue', options: NAMES, label: 'Drum 2' },
  ink3: { type: 'choice', default: 'Yellow', options: ['none', ...NAMES], label: 'Drum 3' },
  ink4: { type: 'choice', default: 'none', options: ['none', ...NAMES], label: 'Drum 4' },
  paper: {
    type: 'colour', default: '#f4efe3', label: 'Paper',
    options: ['#f4efe3', '#fbfaf5', '#efe2c3', '#dfe4e2'],
  },
  screen: { type: 'choice', default: 'grain', options: ['grain', 'halftone'], label: 'Screen' },
  ground: { type: 'choice', default: 'sun', options: ['sun', 'block', 'none'], label: 'Behind the subject' },
  misregistration: { type: 'number', default: 3, min: 0, max: 14, step: 0.5, label: 'Misregistration (px)' },
  density: { type: 'number', default: 0.9, min: 0.4, max: 1, step: 0.02, label: 'Ink density' },
  edition: { type: 'number', default: 50, min: 1, max: 500, step: 1, label: 'Edition size' },
};

function stagesFor(inks) {
  const n = inks.length;
  const burn = 0.05 + 0.05 * n, pull = 0.15;
  const each = (1 - burn - pull) / n;
  return [
    { id: 'burn', label: 'Burn the masters', share: burn },
    ...inks.map((ink, i) => ({ id: `pass-${i + 1}`, label: `Pass ${i + 1}: ${ink.name}`, share: each, pass: i })),
    { id: 'pull', label: 'Pull the copy and number it', share: pull },
  ];
}

export const stages = stagesFor(chooseInks(defaultParams()));

export const rules = [
  {
    id: 'one-spot-colour',
    text: 'Each pass lays exactly one Riso ink, flat: the only tints are the screen and how the ink lays down.',
    source: 'risograph · composition: one spot colour per pass; colour: flat spot colours (unsupported in the source check)',
  },
  {
    id: 'overprint',
    text: 'Inks overprint and never cover: where passes overlap the colours multiply.',
    source: 'risograph · composition: built by overprinting (unsupported in the source check)',
  },
  {
    id: 'misregistration',
    text: 'Passes land slightly out of register: more than nothing, less than 2 mm.',
    source: 'risograph · colour: slight misregistration between passes (unsupported in the source check)',
  },
  {
    id: 'drums',
    text: 'One burned master per drum, one drum per pass, and at most four drums.',
    source: 'risograph · mark: a burned master wrapped on a drum forces ink through its perforations',
  },
  {
    id: 'edition',
    text: 'The copy is one of a numbered run of duplicates from the same masters.',
    source: 'risograph · structure: printed as a run of duplicates from the master; rhythm: the drum turning for each copy',
  },
];

// ---------------------------------------------------------------- layout

const SHEET = { x: 60, y: 34, w: 960, h: 1010 };
const IMG = { x: 108, y: 78, w: 864, h: 864 }; // the printable area; Riso never prints to the edge
const IX = IMG.x - SHEET.x, IY = IMG.y - SHEET.y;
const MM = SHEET.w / 210; // the sheet reads as 210 mm wide
const MISREG_LIMIT = 2 * MM;
const DRUM_R = 54;
const PAD = 70; // room for the sheet's shadow
const CELL = 2;

function defaultParams() {
  const o = {};
  for (const [k, v] of Object.entries(params)) o[k] = v.default;
  return o;
}

function resolveInk(v) {
  if (!v || v === 'none') return null;
  const hit = INKS.find(([n, h]) => n.toLowerCase() === String(v).toLowerCase() || h.toLowerCase() === String(v).toLowerCase());
  if (hit) return { name: hit[0], hex: hit[1], rgb: hex(hit[1]), catalogue: true };
  if (/^#?[0-9a-f]{6}$/i.test(String(v))) {
    const h = String(v).startsWith('#') ? String(v) : '#' + v;
    return { name: h, hex: h, rgb: hex(h), catalogue: false };
  }
  return null;
}

// Passes run from the lightest ink to the darkest, as print shops usually order them.
function chooseInks(p) {
  const inks = [p.ink1, p.ink2, p.ink3, p.ink4].map(resolveInk).filter(Boolean);
  const lum = (k) => 0.2126 * k.rgb[0] + 0.7152 * k.rgb[1] + 0.0722 * k.rgb[2];
  return inks.map((k, i) => ({ ...k, slot: i })).sort((a, b) => lum(b) - lum(a) || a.slot - b.slot);
}

function copyNumber(seed, edition) {
  // any seed is a copy inside the run: seed 1 is copy 1, seed edition + 1 wraps to copy 1 again
  const s = Number(seed);
  const n = Number.isInteger(s) && s >= 1 ? s : (hash('copy', seed) % 9999) + 1;
  return ((n - 1) % edition) + 1;
}

// ---------------------------------------------------------------- colour

const toLin = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const LIN = Float32Array.from({ length: 256 }, (_, i) => toLin(i));

function oklab(r, g, b, out, o = 0) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

// Separation: for a subject colour, the coverage of each ink whose overprint on the paper comes
// closest. Coverages mix as a stochastic screen does (Neugebauer, in linear light), distance is
// OKLab with tone weighted up so darks and lines hold, and there is a small price on ink, on
// three inks stacked, and on pairs whose overprint is a grey, so colour stays clean.
function separator(inks, density) {
  const n = inks.length;
  const A = inks.map((k) => k.rgb.map((v) => 1 - toLin(255 - density * (255 - v))));
  const lab = new Float32Array(3), tgt = new Float32Array(3);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      oklab((1 - A[i][0]) * (1 - A[j][0]), (1 - A[i][1]) * (1 - A[j][1]), (1 - A[i][2]) * (1 - A[j][2]), lab);
      const C = Math.hypot(lab[1], lab[2]);
      pairs.push([i, j, clamp(1 - C / 0.09) * clamp((lab[0] - 0.3) / 0.25)]);
    }
  }
  const penalty = (c) => {
    let e = 0;
    for (let i = 0; i < n; i++) e += 0.0015 * c[i];
    for (const [i, j, m] of pairs) {
      e += 0.012 * m * c[i] * c[j];
      e += 0.004 * 16 * c[i] * (1 - c[i]) * c[j] * (1 - c[j]); // two half-tone grains mixed read as speckle
    }
    if (n >= 3) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) e += 0.03 * c[i] * c[j] * c[k];
    }
    return e;
  };
  const predict = (c) => {
    let r = 1, g = 1, b = 1;
    for (let i = 0; i < n; i++) {
      r *= 1 - c[i] * A[i][0];
      g *= 1 - c[i] * A[i][1];
      b *= 1 - c[i] * A[i][2];
    }
    oklab(r, g, b, lab);
  };
  let wL = 1, tC = 0;
  const dist = (L, a, b) => {
    const dL = L - tgt[0], da = a - tgt[1], db = b - tgt[2];
    const lost = Math.max(0, tC - Math.hypot(a, b));
    return wL * dL * dL + da * da + db * db + 1.5 * lost * lost;
  };
  const cost = (c) => {
    predict(c);
    return dist(lab[0], lab[1], lab[2]) + penalty(c);
  };
  // every combination on a coarse lattice, precomputed
  const levels = n <= 2 ? 21 : n === 3 ? 11 : 7;
  const count = Math.pow(levels, n);
  const cand = new Float32Array(count * n), cLab = new Float32Array(count * 3), cPen = new Float32Array(count);
  const c = new Float32Array(n);
  for (let q = 0; q < count; q++) {
    let rest = q;
    for (let i = 0; i < n; i++) {
      c[i] = (rest % levels) / (levels - 1);
      rest = Math.floor(rest / levels);
      cand[q * n + i] = c[i];
    }
    predict(c);
    cLab[q * 3] = lab[0];
    cLab[q * 3 + 1] = lab[1];
    cLab[q * 3 + 2] = lab[2];
    cPen[q] = penalty(c);
  }
  return (R, G, B, out) => {
    oklab(LIN[R], LIN[G], LIN[B], tgt);
    wL = 0.8 + 2 * clamp((0.5 - tgt[0]) / 0.25); // darks must hold their tone; lights keep their hue
    tC = Math.hypot(tgt[1], tgt[2]);
    let best = 0, be = Infinity;
    for (let q = 0; q < count; q++) {
      const e = dist(cLab[q * 3], cLab[q * 3 + 1], cLab[q * 3 + 2]) + cPen[q];
      if (e < be) { be = e; best = q; }
    }
    for (let i = 0; i < n; i++) c[i] = cand[best * n + i];
    for (const step of [0.05, 0.02, 0.008]) {
      for (let it = 0; it < 4; it++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          const keep = c[i];
          for (const d of [step, -step]) {
            c[i] = clamp(keep + d);
            const e = cost(c);
            if (e < be - 1e-9) { be = e; moved = true; break; }
            c[i] = keep;
          }
        }
        if (!moved) break;
      }
    }
    for (let i = 0; i < n; i++) out[i] = c[i] < 0.1 ? 0 : c[i] > 0.96 ? 1 : c[i];
  };
}

// ---------------------------------------------------------------- fields

// Bilinear resample: destination pixel (x, y) reads the source at (x * kx + ox, y * ky + oy).
function resample(src, sw, sh, dw, dh, kx, ky, ox = 0, oy = 0) {
  const out = new Float32Array(dw * dh);
  const xi = new Int32Array(dw), xf = new Float32Array(dw);
  for (let x = 0; x < dw; x++) {
    const s = clamp(x * kx + ox, 0, sw - 1.0001);
    xi[x] = Math.floor(s);
    xf[x] = s - xi[x];
  }
  for (let y = 0; y < dh; y++) {
    const s = clamp(y * ky + oy, 0, sh - 1.0001);
    const y0 = Math.floor(s), fy = s - y0;
    const r0 = y0 * sw, r1 = Math.min(y0 + 1, sh - 1) * sw;
    const o = y * dw;
    for (let x = 0; x < dw; x++) {
      const i = xi[x], f = xf[x];
      const a = src[r0 + i] + (src[r0 + i + 1] - src[r0 + i]) * f;
      const b = src[r1 + i] + (src[r1 + i + 1] - src[r1 + i]) * f;
      out[o + x] = a + (b - a) * fy;
    }
  }
  return out;
}

function boxWrap(a, N) {
  const t = new Float32Array(N * N), o = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) t[y * N + x] = (a[y * N + ((x + N - 1) % N)] + a[y * N + x] + a[y * N + ((x + 1) % N)]) / 3;
  }
  for (let y = 0; y < N; y++) {
    const u = ((y + N - 1) % N) * N, d = ((y + 1) % N) * N;
    for (let x = 0; x < N; x++) o[y * N + x] = (t[u + x] + t[y * N + x] + t[d + x]) / 3;
  }
  return o;
}

// Rank-equalise a field so its values are uniform on [0, 1] (a screen threshold map).
function equalise(v) {
  const B = 4096;
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  const hist = new Float64Array(B + 1);
  const k = B / Math.max(1e-9, hi - lo);
  for (const x of v) hist[Math.min(B, ((x - lo) * k) | 0)]++;
  let acc = 0;
  for (let i = 0; i <= B; i++) { const h = hist[i]; hist[i] = (acc + h * 0.5) / v.length; acc += h; }
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = hist[Math.min(B, ((v[i] - lo) * k) | 0)];
  return out;
}

// Riso "grain": a stochastic screen with slightly clumped dots, fixed in the master.
function grainMap(seed) {
  const N = 512, r = rng(seed);
  const a = new Float32Array(N * N);
  for (let i = 0; i < a.length; i++) a[i] = r();
  const b = boxWrap(a, N), c = boxWrap(b, N);
  const m = new Float32Array(N * N);
  for (let i = 0; i < m.length; i++) m[i] = 0.55 * b[i] + 0.45 * c[i] + 0.12 * (a[i] - 0.5);
  return equalise(m);
}

// ---------------------------------------------------------------- plan

export async function plan({ subject, params: p, seed, W, H }) {
  const inks = chooseInks(p);
  const n = inks.length;
  const edition = Math.max(1, Math.round(p.edition));
  const copy = copyNumber(seed, edition);
  const density = clamp(p.density, 0.2, 1);
  const master = rng(hash('risograph-master')); // the same for every copy of the run
  const run = rng(hash('risograph-copy', copy)); // this copy: registration and ink behaviour

  // 1. separate the subject into one coverage field per ink
  const g = grid(subject, CELL);
  const { gw, gh } = g;
  const cells = gw * gh;
  const solve = separator(inks, density * 0.95);
  const cov = inks.map(() => new Float32Array(cells));
  const cache = new Int32Array(1 << 18).fill(-1);
  const solved = [];
  const tmp = new Float32Array(n);
  for (let j = 0; j < cells; j++) {
    const R = g.col[j * 3] | 0, G = g.col[j * 3 + 1] | 0, B = g.col[j * 3 + 2] | 0;
    if (R > 250 && G > 250 && B > 250) continue;
    const key = ((R >> 2) << 12) | ((G >> 2) << 6) | (B >> 2);
    let at = cache[key];
    if (at < 0) {
      solve((R & ~3) | 2, (G & ~3) | 2, (B & ~3) | 2, tmp);
      at = solved.length / n;
      for (let i = 0; i < n; i++) solved.push(tmp[i]);
      cache[key] = at;
    }
    for (let i = 0; i < n; i++) cov[i][j] = solved[at * n + i];
  }

  // 2. what stands behind the subject: one ink, knocked out where the subject is
  let groundInk = -1;
  if (p.ground !== 'none') {
    const use = inks.map((_, i) => cov[i].reduce((s, v) => s + v, 0));
    groundInk = 0;
    for (let i = 1; i < n; i++) if (use[i] < use[groundInk] * 0.85) groundInk = i;
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if (g.alpha[y * gw + x] > 0.1) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = gw - 1; y1 = gh - 1; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - (y1 - y0) * 0.04;
    const rad = Math.min(gw, gh) * 0.43 * Math.min(1, 0.6 + 0.5 * Math.max(x1 - x0, y1 - y0) / gw);
    const tone = p.ground === 'block' ? 0.62 : 1;
    const edge = 1.2;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const j = y * gw + x;
      let v;
      if (p.ground === 'sun') v = clamp((rad - Math.hypot(x - cx, y - cy)) / edge + 0.5);
      else v = 1;
      v *= tone * (1 - clamp(g.alpha[j] * 1.15));
      cov[groundInk][j] = Math.max(cov[groundInk][j], v);
    }
  }

  // 3. the paper: one sheet, its own tooth
  const SW = SHEET.w, SH = SHEET.h;
  const tooth = paperTooth(SW, SH, hash('tooth', copy));
  const paperC = paperSheet(SW, SH, p.paper, tooth, hash('paper', copy));

  // 4. registration of each pass on this copy
  const passes = inks.map((ink, i) => {
    const m = p.misregistration * (0.35 + 0.65 * run());
    const a = run() * Math.PI * 2;
    return { ink, dx: Math.cos(a) * m, dy: Math.sin(a) * m, rot: (run() - 0.5) * p.misregistration * 0.0005 };
  });

  // 5. burn each master and print each layer
  const IW = IMG.w, IH = IMG.h, NPX = IW * IH;
  const kg = (subject.w / IW) / CELL;
  const thr = p.screen === 'grain' ? grainMap(hash('grain', 'master')) : null;
  const angles = [15, 75, 0, 45];
  const layers = [], stencils = [], alphas = [];
  const w = 0.14;
  for (let i = 0; i < n; i++) {
    const ink = inks[i];
    const C = resample(cov[i], gw, gh, IW, IH, kg, kg, 0.5 * kg - 0.5, 0.5 * kg - 0.5);
    const lay = laydown(C, IW, IH, density, hash('lay', copy, i), run);
    const ox = master.int(0, 511), oy = master.int(0, 511), flip = i % 2 === 1;
    const ang = ((i === n - 1 ? 45 : angles[i % 3]) * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang), period = 6.4;
    const L = new Uint8ClampedArray(NPX * 4), S = new Uint8ClampedArray(NPX * 4);
    const alpha = new Float32Array(NPX);
    const [ir, ig, ib] = ink.rgb;
    const tx = IX + passes[i].dx, ty = IY + passes[i].dy;
    for (let y = 0; y < IH; y++) {
      const ry = Math.min(SH - 1, Math.max(0, Math.round(y + ty))) * SW;
      for (let x = 0; x < IW; x++) {
        const q = y * IW + x;
        const c = C[q];
        if (c < 0.004) continue;
        let s;
        if (thr) {
          const T = flip ? thr[((x + ox) & 511) * 512 + ((y + oy) & 511)] : thr[((y + oy) & 511) * 512 + ((x + ox) & 511)];
          s = c > 0.996 ? 1 : clamp((c - (w / 2 + T * (1 - w))) / w + 0.5);
        } else {
          const u = (x * ca + y * sa) / period, v = (-x * sa + y * ca) / period;
          const spot = 0.5 + 0.25 * (Math.cos(2 * Math.PI * u) + Math.cos(2 * Math.PI * v));
          s = c > 0.996 ? 1 : clamp((spot - (1 - c)) / 0.2 + 0.5);
        }
        if (s <= 0) continue;
        const P = tooth[ry + Math.min(SW - 1, Math.max(0, Math.round(x + tx)))];
        const knock = (0.45 + 0.5 * (1 - density)) * smooth((P - 0.74) / 0.22);
        const a = s * lay[q] * (1 - knock);
        alpha[q] = a;
        L[q * 4] = ir; L[q * 4 + 1] = ig; L[q * 4 + 2] = ib; L[q * 4 + 3] = a * 255;
        S[q * 4] = 43; S[q * 4 + 1] = 39; S[q * 4 + 2] = 36; S[q * 4 + 3] = s * 225;
      }
    }
    layers.push(toCanvas(L, IW, IH));
    stencils.push(toCanvas(S, IW, IH));
    alphas.push(alpha);
  }

  // 6. print: the sheet after each pass, inks multiplied onto the paper
  const prints = [paperC];
  for (let i = 0; i < n; i++) {
    const c = canvas(SW, SH);
    const x = c.getContext('2d');
    x.drawImage(prints[i], 0, 0);
    x.globalCompositeOperation = 'multiply';
    placeLayer(x, passes[i]);
    x.drawImage(layers[i], 0, 0);
    prints.push(c);
  }

  // 7. the number, in pencil
  const label = `${copy}/${edition}`;
  const pencil = pencilStrokes(label, IX + 2, IY + IH + 38, 27, rng(hash('hand', copy)));

  return {
    W, H, n, inks, passes, copy, edition, label, groundInk, params: p, density,
    stages: stagesFor(inks), layers, stencils, alphas, prints, pencil,
    table: table(W, H), shadow: sheetShadow(), film: masterFilm(SW, SH),
    stack: stack(copy, p.paper, rng(hash('stack', copy))),
    graphite: graphite(),
  };
}

function toCanvas(data, w, h) {
  const c = canvas(w, h);
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}

// Where a pass lands on the sheet: the image origin, this pass's offset and a small turn.
function placeLayer(x, pass) {
  x.translate(IX + IMG.w / 2 + pass.dx, IY + IMG.h / 2 + pass.dy);
  x.rotate(pass.rot);
  x.translate(-IMG.w / 2, -IMG.h / 2);
}

// How the drum lays ink on this copy: overall density, slow mottling, streaks along the feed
// direction, a drum that is a little heavier on one side, and starvation where a big solid has
// drawn the ink off the drum faster than it can come back.
function laydown(C, IW, IH, density, seed, run) {
  const nm = valueNoise(hash(seed, 'mottle')), ns = valueNoise(hash(seed, 'streak'));
  const S = 8, mw = Math.ceil(IW / S) + 1, mh = Math.ceil(IH / S) + 1;
  const mott = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    mott[y * mw + x] = 1 - 0.13 * fbm(nm, (x * S) / 150, (y * S) / 150, 3) - 0.05 * nm((x * S) / 30 + 40, (y * S) / 30);
  }
  const SY = 24, sh = Math.ceil(IH / SY) + 1;
  const streak = new Float32Array(IW * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < IW; x++) {
    const v = ns(x / 3.2, (y * SY) / 260) * 0.6 + ns(x / 11 + 70, (y * SY) / 400) * 0.4;
    streak[y * IW + x] = 1 - 0.16 * smooth((v - 0.58) / 0.3) + 0.03 * (v - 0.5);
  }
  // starvation, column by column in the feed direction
  const T = 6, tw = Math.ceil(IW / T), th = Math.ceil(IH / T);
  const starve = new Float32Array(tw * th);
  for (let x = 0; x < tw; x++) {
    let supply = 1;
    for (let y = 0; y < th; y++) {
      const use = C[Math.min(IH - 1, y * T) * IW + Math.min(IW - 1, x * T)];
      supply += -0.012 * use * supply + 0.02 * (1 - supply);
      starve[y * tw + x] = supply;
    }
  }
  const side = (run() - 0.5) * 0.1;
  const M = resample(mott, mw, mh, IW, IH, 1 / S, 1 / S);
  const Sx = resample(streak, IW, sh, IW, IH, 1, 1 / SY);
  const V = resample(starve, tw, th, IW, IH, 1 / T, 1 / T);
  const out = new Float32Array(IW * IH);
  for (let y = 0; y < IH; y++) {
    for (let x = 0; x < IW; x++) {
      const q = y * IW + x;
      const sv = V[q];
      out[q] = clamp(density * M[q] * Sx[q] * (0.55 + 0.45 * sv * sv) * (1 + side * (x / IW - 0.5)), 0, 1);
    }
  }
  return out;
}

// The paper's tooth: fine valleys the ink does not reach, uniform on [0, 1].
function paperTooth(w, h, seed) {
  const r = rng(seed);
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = r();
  const t = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    t[i] = a[i - 1] + a[i] + a[i + 1];
  }
  const o = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    o[i] = t[i - w] + t[i] * 1.4 + t[i + w] + a[i] * 2;
  }
  return equalise(o);
}

function paperSheet(w, h, colour, tooth, seed) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const base = hex(colour);
  const img = g.createImageData(w, h);
  const d = img.data;
  const n = valueNoise(hash(seed, 'cloud'));
  const S = 10, cw = Math.ceil(w / S) + 1, ch = Math.ceil(h / S) + 1;
  const cloud = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) cloud[y * cw + x] = fbm(n, (x * S) / 80, (y * S) / 80, 3) - 0.5;
  const CL = resample(cloud, cw, ch, w, h, 1 / S, 1 / S);
  for (let i = 0; i < w * h; i++) {
    const k = 1 - 0.05 * (tooth[i] - 0.5) + 0.025 * CL[i];
    d[i * 4] = base[0] * k;
    d[i * 4 + 1] = base[1] * k;
    d[i * 4 + 2] = base[2] * k;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const r = rng(hash(seed, 'fibres'));
  g.lineWidth = 0.6;
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 4 + r() * 16;
    g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.1 + r() * 0.12})` : `rgba(90,80,60,${0.04 + r() * 0.05})`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 3, y + Math.sin(a) * l * 0.5 + r() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // the cut edge catches a little light
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  return c;
}

// The master film: a thin plastic skin on Japanese tissue, pale and fibrous.
function masterFilm(w, h) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#e7e2d6';
  g.fillRect(0, 0, w, h);
  const r = rng(hash('film'));
  g.lineWidth = 0.7;
  for (let i = 0; i < 900; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 10 + r() * 40;
    g.strokeStyle = r() < 0.6 ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(140,128,108,${0.05 + r() * 0.08})`;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + r() * 10 - 5, y + r() * 10 - 5, x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.fillStyle = 'rgba(120,110,95,0.18)';
  g.fillRect(0, 0, w, 14);
  return c;
}

function table(W, H) {
  const w = W / 2, h = H / 2;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const s = canvas(w, h);
  const sg = s.getContext('2d');
  const img = sg.createImageData(w, h);
  const r = rng(hash('table'));
  const n = valueNoise(hash('table-grain'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const v = 38 + (r() - 0.5) * 7 + (fbm(n, x / 70, y / 70, 2) - 0.5) * 10;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v + 3; img.data[i + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  g.drawImage(s, 0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  return c;
}

function sheetShadow() {
  const c = canvas(SHEET.w + PAD * 2, SHEET.h + PAD * 2);
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 26;
  g.shadowOffsetX = 5000;
  g.fillStyle = '#000';
  g.fillRect(PAD - 5000, PAD, SHEET.w, SHEET.h);
  return c;
}

// The copies already pulled, squared up roughly under this one.
function stack(copy, paperColour, r) {
  const c = canvas(SHEET.w + PAD * 2, SHEET.h + PAD * 2);
  const g = c.getContext('2d');
  const base = hex(paperColour);
  const count = Math.min(7, Math.max(0, copy - 1));
  g.translate(PAD, PAD);
  g.shadowColor = 'rgba(0,0,0,0.5)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 4;
  for (let i = count; i >= 1; i--) {
    g.save();
    g.translate(SHEET.w / 2 + r.range(-3, 5) * Math.sqrt(i), SHEET.h / 2 + r.range(-1, 4) * Math.sqrt(i));
    g.rotate(r.range(-0.004, 0.004) * i);
    const k = 0.9 - 0.02 * i;
    g.fillStyle = rgb([base[0] * k, base[1] * k, base[2] * k]);
    g.fillRect(-SHEET.w / 2, -SHEET.h / 2, SHEET.w, SHEET.h);
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 1;
    g.strokeRect(-SHEET.w / 2 + 0.5, -SHEET.h / 2 + 0.5, SHEET.w - 1, SHEET.h - 1);
    g.restore();
    g.shadowColor = 'rgba(0,0,0,0.25)';
    g.shadowBlur = 3;
    g.shadowOffsetY = 1;
  }
  return c;
}

function graphite() {
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  const img = g.createImageData(64, 64);
  const r = rng(hash('graphite'));
  for (let i = 0; i < 64 * 64; i++) {
    const v = 58 + r() * 30;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v + 4;
    img.data[i * 4 + 3] = 120 + r() * 120;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- the edition number in pencil

const GLYPHS = {
  0: [[[0.32, 0.02], [0.1, 0.14], [0.03, 0.5], [0.12, 0.88], [0.32, 1.0], [0.52, 0.86], [0.6, 0.5], [0.52, 0.12], [0.3, 0.0], [0.2, 0.06]]],
  1: [[[0.1, 0.24], [0.34, 0.02], [0.34, 1.0]]],
  2: [[[0.06, 0.24], [0.16, 0.06], [0.34, 0.0], [0.52, 0.08], [0.56, 0.26], [0.46, 0.46], [0.04, 1.0], [0.62, 0.97]]],
  3: [[[0.06, 0.1], [0.26, 0.0], [0.48, 0.05], [0.54, 0.22], [0.42, 0.4], [0.22, 0.46], [0.46, 0.53], [0.58, 0.72], [0.5, 0.92], [0.28, 1.0], [0.04, 0.9]]],
  4: [[[0.46, 1.0], [0.46, 0.0], [0.02, 0.68], [0.64, 0.68]]],
  5: [[[0.56, 0.02], [0.14, 0.02], [0.08, 0.44], [0.3, 0.37], [0.52, 0.46], [0.6, 0.7], [0.5, 0.92], [0.28, 1.0], [0.04, 0.9]]],
  6: [[[0.52, 0.04], [0.32, 0.0], [0.14, 0.14], [0.05, 0.5], [0.08, 0.84], [0.28, 1.0], [0.48, 0.95], [0.58, 0.74], [0.48, 0.55], [0.28, 0.5], [0.1, 0.62]]],
  7: [[[0.04, 0.03], [0.6, 0.02], [0.24, 1.0]]],
  8: [[[0.32, 0.47], [0.12, 0.34], [0.12, 0.13], [0.32, 0.0], [0.5, 0.13], [0.48, 0.33], [0.32, 0.47], [0.08, 0.64], [0.07, 0.87], [0.32, 1.0], [0.56, 0.87], [0.54, 0.64], [0.32, 0.47]]],
  9: [[[0.54, 0.28], [0.42, 0.46], [0.24, 0.5], [0.08, 0.36], [0.1, 0.12], [0.3, 0.0], [0.5, 0.08], [0.56, 0.32], [0.5, 0.7], [0.36, 1.0]]],
  '/': [[[0.46, -0.06], [0.08, 1.06]]],
};

function pencilStrokes(text, x, y, size, r) {
  const strokes = [];
  let pen = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (!glyph) { pen += size * 0.4; continue; }
    const wobble = r.range(-0.03, 0.03);
    for (const line of glyph) {
      let pts = line.map(([gx, gy]) => [
        pen + (gx + (1 - gy) * 0.14 + r.range(-0.018, 0.018)) * size,
        y + (gy + wobble + r.range(-0.018, 0.018)) * size,
      ]);
      if (pts.length > 2) pts = chaikin(pts, 2, false);
      strokes.push({ pts, cum: lengths(pts, false) });
    }
    pen += (ch === '1' ? 0.52 : ch === '/' ? 0.62 : 0.74) * size;
  }
  let total = 0;
  for (const s of strokes) { s.len = s.cum[s.cum.length - 1]; s.at = total; total += s.len + size * 0.35; }
  return { strokes, total };
}

// ---------------------------------------------------------------- checks

export function check(pl) {
  const out = [];

  // one flat spot colour per pass, from the Riso drums
  {
    let off = 0, seen = 0;
    const bad = pl.inks.filter((k) => !k.catalogue).map((k) => k.name);
    pl.layers.forEach((layer, i) => {
      const d = layer.getContext('2d').getImageData(0, 0, IMG.w, IMG.h).data;
      const [r, g, b] = pl.inks[i].rgb;
      for (let q = 0; q < d.length; q += 4 * 13) {
        if (d[q + 3] < 96) continue;
        seen++;
        if (Math.abs(d[q] - r) > 3 || Math.abs(d[q + 1] - g) > 3 || Math.abs(d[q + 2] - b) > 3) off++;
      }
    });
    out.push({
      id: 'one-spot-colour',
      pass: off === 0 && bad.length === 0 && seen > 0,
      detail: bad.length
        ? `${bad.join(', ')} is not a Riso drum colour`
        : off ? `${off} of ${seen} inked samples are not their pass's ink` : `${pl.n} passes, each one flat ink (${pl.inks.map((k) => k.name).join(', ')})`,
    });
  }

  // overprint: the finished sheet equals paper times every ink laid on it
  {
    const SW = SHEET.w, SH = SHEET.h;
    const fin = pl.prints[pl.n].getContext('2d').getImageData(0, 0, SW, SH).data;
    const pap = pl.prints[0].getContext('2d').getImageData(0, 0, SW, SH).data;
    const r = rng(hash('overprint-check'));
    let tested = 0, wrong = 0, overlaps = 0;
    for (let k = 0; k < 20000 && tested < 600; k++) {
      const sx = Math.floor(IX + 4 + r() * (IMG.w - 8)), sy = Math.floor(IY + 4 + r() * (IMG.h - 8));
      const exp = [pap[(sy * SW + sx) * 4], pap[(sy * SW + sx) * 4 + 1], pap[(sy * SW + sx) * 4 + 2]];
      let flat = true, inked = 0;
      for (let i = 0; i < pl.n && flat; i++) {
        const ps = pl.passes[i];
        // inverse of placeLayer, then the bilinear sample drawImage takes
        const ux = sx + 0.5 - (IX + IMG.w / 2 + ps.dx), uy = sy + 0.5 - (IY + IMG.h / 2 + ps.dy);
        const c = Math.cos(-ps.rot), s = Math.sin(-ps.rot);
        const fx = ux * c - uy * s + IMG.w / 2 - 0.5, fy = ux * s + uy * c + IMG.h / 2 - 0.5;
        const lx = Math.floor(fx), ly = Math.floor(fy);
        if (lx < 1 || ly < 1 || lx >= IMG.w - 2 || ly >= IMG.h - 2) continue;
        const A = pl.alphas[i], q0 = ly * IMG.w + lx;
        const a00 = A[q0], a10 = A[q0 + 1], a01 = A[q0 + IMG.w], a11 = A[q0 + IMG.w + 1];
        if (Math.max(a00, a10, a01, a11) - Math.min(a00, a10, a01, a11) > 0.12) { flat = false; break; }
        const ax = fx - lx, ay = fy - ly;
        const a = (a00 * (1 - ax) + a10 * ax) * (1 - ay) + (a01 * (1 - ax) + a11 * ax) * ay;
        if (a > 0.3) inked++;
        for (let ch = 0; ch < 3; ch++) exp[ch] *= 1 - a + (a * pl.inks[i].rgb[ch]) / 255;
      }
      if (!flat || inked === 0) continue;
      tested++;
      if (inked > 1) overlaps++;
      const q = (sy * SW + sx) * 4;
      if (Math.abs(fin[q] - exp[0]) > 6 || Math.abs(fin[q + 1] - exp[1]) > 6 || Math.abs(fin[q + 2] - exp[2]) > 6) wrong++;
    }
    out.push({
      id: 'overprint',
      pass: tested > 20 && wrong <= tested * 0.02,
      detail: `${tested - wrong} of ${tested} inked points (${overlaps} where inks overlap) equal paper × inks`,
    });
  }

  // misregistration between passes, measured at the corners of the image
  {
    let worst = 0;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [(a * IMG.w) / 2, (b * IMG.h) / 2]);
    const at = (ps, [x, y]) => [x * Math.cos(ps.rot) - y * Math.sin(ps.rot) + ps.dx, x * Math.sin(ps.rot) + y * Math.cos(ps.rot) + ps.dy];
    for (let i = 0; i < pl.n; i++) for (let j = i + 1; j < pl.n; j++) {
      for (const k of corners) {
        const a = at(pl.passes[i], k), b = at(pl.passes[j], k);
        worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1]));
      }
    }
    const mm = worst / MM;
    out.push({
      id: 'misregistration',
      pass: worst > 0.25 && worst <= MISREG_LIMIT,
      detail: worst <= 0.25 ? 'the passes are in perfect register: no drum does that'
        : `passes land up to ${mm.toFixed(2)} mm apart (limit ${(MISREG_LIMIT / MM).toFixed(0)} mm)`,
    });
  }

  // drums: one master per drum, one drum per pass, at most four
  {
    const ok = pl.n >= 1 && pl.n <= 4 && pl.stencils.length === pl.n && pl.layers.length === pl.n;
    out.push({
      id: 'drums',
      pass: ok,
      detail: `${pl.n} drum${pl.n === 1 ? '' : 's'}, ${pl.stencils.length} master${pl.stencils.length === 1 ? '' : 's'}, ${pl.layers.length} pass${pl.layers.length === 1 ? '' : 'es'} (at most 4)`,
    });
  }

  // edition
  out.push({
    id: 'edition',
    pass: pl.copy >= 1 && pl.copy <= pl.edition,
    detail: pl.copy <= pl.edition ? `copy ${pl.label} of the run` : `copy ${pl.copy} is past an edition of ${pl.edition}`,
  });
  return out;
}

// ---------------------------------------------------------------- drawing

export function draw(ctx, pl, t) {
  const s = stageAt(pl.stages, t);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(pl.table, 0, 0);
  if (s.id === 'burn') drawBurn(ctx, pl, s.local);
  else if (s.id === 'pull') drawPull(ctx, pl, s.local);
  else drawPass(ctx, pl, s.pass, s.local);
  ctx.restore();
}

// Burn the masters: each master film passes under the thermal head, which perforates the
// separation line by line; then it wraps onto its drum and the next comes in.
function drawBurn(ctx, pl, u) {
  const n = pl.n;
  for (let i = 0; i < n; i++) {
    const v = u * n - i;
    if (v < -0.2 || v > 1.05) continue;
    const enter = easeOut(clamp((v + 0.2) / 0.3));
    const leave = easeIn(clamp((v - 0.8) / 0.2));
    const yo = (1 - enter) * (H_ - SHEET.y + 40) - leave * (SHEET.y + SHEET.h + 60);
    const head = IY - 8 + (IMG.h + 16) * clamp((v - 0.1) / 0.66);
    ctx.save();
    ctx.translate(SHEET.x, SHEET.y + yo);
    // wrapping onto the drum: the film curls away at its leading edge
    ctx.drawImage(pl.shadow, -PAD, -PAD + 4);
    ctx.drawImage(pl.film, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SHEET.w, head);
    ctx.clip();
    ctx.drawImage(pl.stencils[i], IX, IY);
    ctx.restore();
    // heat just behind the head
    if (v > 0.1 && v < 0.78) {
      const hg = ctx.createLinearGradient(0, head - 36, 0, head);
      hg.addColorStop(0, 'rgba(255,120,40,0)');
      hg.addColorStop(1, 'rgba(255,120,40,0.22)');
      ctx.fillStyle = hg;
      ctx.fillRect(IX - 10, head - 36, IMG.w + 20, 36);
    }
    tag(ctx, pl.inks[i], `MASTER ${i + 1}/${n}`, 22, 22);
    thermalHead(ctx, head, v > 0.1 && v < 0.78);
    ctx.restore();
  }
}
const H_ = 1080;

function tag(ctx, ink, text, x, y) {
  ctx.save();
  ctx.fillStyle = ink.hex;
  ctx.fillRect(x, y - 11, 14, 14);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(x + 0.5, y - 10.5, 13, 13);
  ctx.fillStyle = 'rgba(60,54,48,0.85)';
  ctx.font = '600 13px "IBM Plex Mono", ui-monospace, Menlo, monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${text}  ·  ${ink.name.toUpperCase()}`, x + 22, y + 1);
  ctx.restore();
}

function thermalHead(ctx, y, hot) {
  ctx.save();
  const x0 = -34, x1 = SHEET.w + 34;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  const g = ctx.createLinearGradient(0, y - 30, 0, y);
  g.addColorStop(0, '#4a4b50');
  g.addColorStop(0.45, '#6d6f75');
  g.addColorStop(1, '#2c2d31');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - 30, x1 - x0, 30);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x0, y - 22, x1 - x0, 2);
  if (hot) {
    ctx.shadowColor = 'rgba(255,90,30,0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff8a4a';
    ctx.fillRect(x0 + 20, y - 2, x1 - x0 - 40, 2);
  }
  ctx.restore();
}

function passGeometry(u) {
  const intro = 0.14;
  const y0 = SHEET.y + 4, y1 = H_ + DRUM_R + 40;
  const yd = u < intro ? y0 : lerp(y0, y1, (u - intro) / (1 - intro));
  const xoff = (1180) * (1 - easeOut(clamp(u / intro)));
  return { yd, xoff, intro };
}

// One pass: the sheet is fed, the drum with this ink rolls over it at a steady speed and the ink
// is left behind it.
function drawPass(ctx, pl, k, u) {
  const { yd, xoff, intro } = passGeometry(u);
  let sy = 0;
  if (k === 0) sy = -(SHEET.y + SHEET.h + 40) * (1 - easeOut(clamp(u / intro)));
  else sy = -22 * Math.sin(Math.PI * clamp(u / intro));
  ctx.drawImage(pl.shadow, SHEET.x - PAD, SHEET.y - PAD + 4 + sy);
  ctx.drawImage(pl.prints[k], SHEET.x, SHEET.y + sy);
  if (yd > IMG.y) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(SHEET.x, SHEET.y + sy, SHEET.w, yd - SHEET.y - sy);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.translate(SHEET.x, SHEET.y + sy);
    placeLayer(ctx, pl.passes[k]);
    ctx.drawImage(pl.layers[k], 0, 0);
    ctx.restore();
    // fresh ink looks a shade wetter just behind the drum
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let s = 0; s < 6; s++) {
      const top = yd - DRUM_R - (s + 1) * 16, bot = yd - DRUM_R - s * 16 + 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(SHEET.x, Math.max(top, SHEET.y), SHEET.w, Math.max(0, bot - Math.max(top, SHEET.y)));
      ctx.clip();
      ctx.globalAlpha = 0.22 * (1 - s / 6);
      ctx.translate(SHEET.x, SHEET.y + sy);
      placeLayer(ctx, pl.passes[k]);
      ctx.drawImage(pl.layers[k], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  drum(ctx, pl, k, yd, xoff);
}

// The drum seen from above: the master wrapped round it carries the image in wet ink; its top
// face shows the part of the master that meets the paper half a turn later.
function drum(ctx, pl, k, yd, xoff) {
  const ink = pl.inks[k];
  const R = DRUM_R;
  const x0 = SHEET.x - 30 + xoff, x1 = SHEET.x + SHEET.w + 30 + xoff;
  ctx.save();
  // shadow on the sheet ahead of the drum
  const sg = ctx.createLinearGradient(0, yd + R * 0.4, 0, yd + R + 46);
  sg.addColorStop(0, 'rgba(0,0,0,0.42)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x0 + 8, yd + R * 0.4, x1 - x0, R * 0.6 + 46);
  // axle
  const ag = ctx.createLinearGradient(0, yd - 8, 0, yd + 8);
  ag.addColorStop(0, '#6f7176');
  ag.addColorStop(0.5, '#b9bbbf');
  ag.addColorStop(1, '#3a3b3f');
  ctx.fillStyle = ag;
  ctx.fillRect(x0 - 400, yd - 8, x1 - x0 + 800, 16);
  // body: the master film, tinted by the ink soaking through
  const film = rgb(mixc([231, 226, 214], ink.rgb, 0.62));
  const S = 30;
  const m = yd - (IMG.y + pl.passes[k].dy); // master row at the contact line
  for (let s = 0; s < S; s++) {
    const pa = -Math.PI / 2 + (Math.PI * s) / S, pb = -Math.PI / 2 + (Math.PI * (s + 1)) / S;
    const ya = yd + R * Math.sin(pa), yb = yd + R * Math.sin(pb);
    const row = m + R * (Math.PI - (pa + pb) / 2);
    ctx.fillStyle = film;
    ctx.fillRect(x0, ya, x1 - x0, yb - ya + 0.6);
    if (row >= 0 && row < IMG.h) {
      const hRow = Math.max(1, R * (pb - pa));
      ctx.drawImage(pl.layers[k], 0, Math.min(IMG.h - 1, row), IMG.w, Math.min(hRow, IMG.h - row), IMG.x + xoff + pl.passes[k].dx, ya, IMG.w, yb - ya + 0.6);
    }
    // the mesh under the master shows as fine ribs that travel as the drum turns
    ctx.fillStyle = `rgba(0,0,0,${0.05 + 0.05 * Math.sin((row * 2 * Math.PI) / 7)})`;
    ctx.fillRect(x0, ya, x1 - x0, yb - ya + 0.6);
    // the clamp bar that holds the master's leading edge
    if (row > -46 && row < -22) {
      ctx.fillStyle = '#8d9096';
      ctx.fillRect(x0, ya, x1 - x0, yb - ya + 0.6);
    }
  }
  // cylinder shading and a highlight
  const cg = ctx.createLinearGradient(0, yd - R, 0, yd + R);
  cg.addColorStop(0, 'rgba(0,0,0,0.55)');
  cg.addColorStop(0.18, 'rgba(0,0,0,0.08)');
  cg.addColorStop(0.3, 'rgba(255,255,255,0.28)');
  cg.addColorStop(0.42, 'rgba(255,255,255,0.02)');
  cg.addColorStop(0.75, 'rgba(0,0,0,0.12)');
  cg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = cg;
  ctx.fillRect(x0, yd - R, x1 - x0, 2 * R);
  // end flanges, and the coloured handle every Riso drum carries
  for (const [ex, dir] of [[x0, -1], [x1, 1]]) {
    const fg = ctx.createLinearGradient(0, yd - R - 6, 0, yd + R + 6);
    fg.addColorStop(0, '#2b2c30');
    fg.addColorStop(0.3, '#8a8c92');
    fg.addColorStop(0.55, '#55575c');
    fg.addColorStop(1, '#1f2023');
    ctx.fillStyle = fg;
    ctx.fillRect(dir < 0 ? ex - 16 : ex, yd - R - 6, 16, 2 * R + 12);
  }
  ctx.fillStyle = ink.hex;
  roundRect(ctx, x1 + 16, yd - 20, 44, 40, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x1 + 20, yd - 16, 36, 6);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Pull the copy: it lands on the stack of copies already pulled and is numbered in pencil.
function drawPull(ctx, pl, u) {
  const lift = Math.sin(Math.PI * clamp(u / 0.34));
  const stackIn = smooth(u / 0.25);
  const write = clamp((u - 0.36) / 0.54);
  const away = clamp((u - 0.9) / 0.1);
  drawSheet(ctx, pl, { lift, stackIn, write, pencilAway: away });
}

function drawSheet(ctx, pl, { lift = 0, stackIn = 1, write = 1, pencilAway = 1 }) {
  if (stackIn > 0) {
    ctx.globalAlpha = stackIn;
    ctx.drawImage(pl.stack, SHEET.x - PAD, SHEET.y - PAD);
    ctx.globalAlpha = 1;
  }
  const sc = 1 + 0.014 * lift;
  ctx.save();
  ctx.translate(SHEET.x + SHEET.w / 2, SHEET.y + SHEET.h / 2);
  ctx.scale(sc, sc);
  ctx.translate(-SHEET.w / 2, -SHEET.h / 2);
  const off = 4 + 18 * lift;
  ctx.globalAlpha = 0.85 - 0.3 * lift;
  ctx.drawImage(pl.shadow, -PAD + off * 0.4, -PAD + off, SHEET.w + 2 * PAD + 16 * lift, SHEET.h + 2 * PAD + 16 * lift);
  ctx.globalAlpha = 1;
  ctx.drawImage(pl.prints[pl.n], 0, 0);
  const tip = pencilMarks(ctx, pl, write);
  ctx.restore();
  if (write > 0 && pencilAway < 1 && tip) {
    const tx = SHEET.x + SHEET.w / 2 + (tip.x - SHEET.w / 2) * sc, ty = SHEET.y + SHEET.h / 2 + (tip.y - SHEET.h / 2) * sc;
    pencilTool(ctx, tx + 70 * easeIn(pencilAway), ty - 50 * easeIn(pencilAway), easeIn(pencilAway));
  }
}

function pencilMarks(ctx, pl, f) {
  const { strokes, total } = pl.pencil;
  const upto = f * total;
  let tip = null;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.createPattern(pl.graphite, 'repeat');
  ctx.lineWidth = 2.1;
  ctx.globalAlpha = 0.9;
  for (const s of strokes) {
    if (upto <= s.at) { if (!tip) tip = { x: s.pts[0][0], y: s.pts[0][1] }; break; }
    const d = Math.min(s.len, upto - s.at);
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0], s.pts[0][1]);
    let q = 1;
    for (; q < s.pts.length && s.cum[q] <= d; q++) ctx.lineTo(s.pts[q][0], s.pts[q][1]);
    const p = along(s.pts, s.cum, d);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    tip = { x: p.x, y: p.y };
  }
  ctx.restore();
  return tip;
}

function pencilTool(ctx, x, y, fade) {
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  ctx.translate(x, y);
  ctx.rotate(0.55); // held in the right hand
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = -6;
  ctx.shadowOffsetY = 16;
  // wood cone and graphite point
  ctx.fillStyle = '#e2c79c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(9, -30);
  ctx.lineTo(-9, -30);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#3d3d42';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(3.2, -10);
  ctx.lineTo(-3.2, -10);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = '#2f5a4c';
  ctx.fillRect(-9, -230, 18, 200);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-5, -228, 3, 196);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(4, -228, 4, 196);
  ctx.restore();
}

// ---------------------------------------------------------------- alive

// Once pulled: a loupe follows the pointer and shows the grain, the overprint and the
// misregistration up close. Without a pointer the finished copy just lies there.
export function live(ctx, pl, { time, pointer }) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(pl.table, 0, 0);
  drawSheet(ctx, pl, {});
  if (pointer) loupe(ctx, pl, pointer, time);
  ctx.restore();
}

function loupe(ctx, pl, pt, time) {
  const R = 124, Z = 3.2;
  const x = clamp(pt.x, 0, pl.W), y = clamp(pt.y, 0, pl.H);
  ctx.save();
  // the lens's own shadow on the paper
  ctx.beginPath();
  ctx.arc(x + 14, y + 20, R + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.filter = 'blur(10px)';
  ctx.fill();
  ctx.filter = 'none';
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(Z, Z);
  ctx.translate(-x, -y);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pl.table, 0, 0);
  ctx.drawImage(pl.prints[pl.n], SHEET.x, SHEET.y);
  ctx.save();
  ctx.translate(SHEET.x, SHEET.y);
  pencilMarks(ctx, pl, 1);
  ctx.restore();
  ctx.restore();
  // rim and glare
  ctx.save();
  ctx.lineWidth = 12;
  const rg = ctx.createLinearGradient(x - R, y - R, x + R, y + R);
  rg.addColorStop(0, '#d7d9dc');
  rg.addColorStop(0.5, '#6b6e73');
  rg.addColorStop(1, '#2a2b2f');
  ctx.strokeStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y, R + 5, 0, Math.PI * 2);
  ctx.stroke();
  const gl = ctx.createRadialGradient(x - R * 0.4, y - R * 0.45, 4, x - R * 0.3, y - R * 0.3, R * 1.1);
  gl.addColorStop(0, 'rgba(255,255,255,0.28)');
  gl.addColorStop(0.35, 'rgba(255,255,255,0.05)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A click pulls the next copy of the edition: same masters, a new pass through the drums.
export function press(pl) {
  return { seed: pl.copy < pl.edition ? pl.copy + 1 : 1 };
}
