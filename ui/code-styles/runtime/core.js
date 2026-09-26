// Shared runtime for Katagami code styles.
//
// A code style is an ES module that re-enacts how its medium is made, on any subject:
//
//   export const meta    = { id, name, version, creator, licence, tradition, medium, parents, summary }
//   export const params  = { key: { type, default, ... } }        typed controls, wired to the code
//   export const stages  = [{ id, label, share }]                  the making, in order; shares sum to 1
//   export const rules   = [{ id, text, source }]                  tradition rules, checked by check()
//   export async function plan({ subject, params, seed, W, H })   every mark, computed once
//   export function check(plan) -> [{ id, pass, detail }]
//   export function draw(ctx, plan, t)                             pure: t in [0, 1], t = 1 is the still
//   export function live(ctx, plan, { time, pointer })             optional: what moves once it is made
//   export function press(plan, pointer) -> { seed?, params? }     optional: a click starts a new making
//
// Everything random comes from rng(seed). Nothing reads the clock inside plan() or draw().

export const W = 1080;
export const H = 1080;

// ---------------------------------------------------------------- numbers

export function hash(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x9e3779b9;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (xs) => xs[Math.floor(next() * xs.length)];
  next.gauss = () => {
    const u = Math.max(1e-9, next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  next.fork = (label) => rng(hash(a, label));
  return next;
}

export const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeInOut = (x) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// Smooth value noise on a lattice; noise(x, y) is in [0, 1].
export function valueNoise(seed, period = 256) {
  const r = rng(seed);
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % period) + period) % period, y0 = ((iy % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0], b = g[y0 * period + x1];
    const c = g[y1 * period + x0], d = g[y1 * period + x1];
    return a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy;
  };
}

export function fbm(noise, x, y, octaves = 4, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f, y * f);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------- stages

export function stageAt(stages, t) {
  let start = 0;
  for (let i = 0; i < stages.length; i++) {
    const end = i === stages.length - 1 ? 1 : start + stages[i].share;
    if (t < end || i === stages.length - 1) {
      return { ...stages[i], index: i, start, end, local: clamp((t - start) / Math.max(1e-9, end - start)) };
    }
    start = end;
  }
}

// progress (0..1) of a named stage at time t: 0 before it starts, 1 after it ends
export function progress(stages, id, t) {
  let start = 0;
  for (let i = 0; i < stages.length; i++) {
    const end = i === stages.length - 1 ? 1 : start + stages[i].share;
    if (stages[i].id === id) return clamp((t - start) / Math.max(1e-9, end - start));
    start = end;
  }
  throw new Error(`no stage ${id}`);
}

// ---------------------------------------------------------------- canvas and colour

export function canvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function hex(c) {
  const s = c.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgb = ([r, g, b], a = 1) =>
  a === 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;

export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const luminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// A sheet of paper: flat colour with a faint fibre and tooth, same for a given seed.
export function paper(w, h, colour, seed, { tooth = 0.05, fibres = 260 } = {}) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const base = hex(colour);
  g.fillStyle = rgb(base);
  g.fillRect(0, 0, w, h);
  const r = rng(hash('paper', seed));
  const n = valueNoise(hash('tooth', seed));
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (fbm(n, x / 90, y / 90, 3) - 0.5) * 0.6 + (n(x / 2.2 + 50, y / 2.2 + 50) - 0.5) * 0.4;
      const k = 1 + v * tooth;
      const i = (y * w + x) * 4;
      d[i] = clamp(d[i] * k, 0, 255);
      d[i + 1] = clamp(d[i + 1] * k, 0, 255);
      d[i + 2] = clamp(d[i + 2] * k, 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
  const dark = luminance(...base) < 0.35;
  g.lineWidth = 0.6;
  for (let i = 0; i < fibres; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 6 + r() * 22;
    g.strokeStyle = dark ? `rgba(255,255,255,${0.03 + r() * 0.04})` : `rgba(0,0,0,${0.025 + r() * 0.035})`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 4, y + Math.sin(a) * l * 0.5 + r() * 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

// ---------------------------------------------------------------- subjects

// A subject is anything with a picture in it: an SVG, a line of text, or an image URL.
// loadSubject draws it once at W x H, centred with a margin, and returns the pixels.
// Styles read it through grid(), so none of them depends on how the subject was made.
export async function loadSubject(input, { margin = 0.12, w = W, h = H } = {}) {
  let svg = input.svg;
  if (input.text != null) svg = textSvg(input.text, input);
  const img = new Image();
  if (svg) img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  else img.src = input.url;
  await img.decode();
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min((w * (1 - 2 * margin)) / iw, (h * (1 - 2 * margin)) / ih);
  const bw = iw * s, bh = ih * s;
  const box = { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  const c = canvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, box.x, box.y, bw, bh);
  const pixels = g.getImageData(0, 0, w, h);
  return { w, h, box, canvas: c, pixels, name: input.name || input.text || 'subject' };
}

function textSvg(text, { font = 'Georgia, "Times New Roman", serif', weight = 700, colour = '#1b1b1f' } = {}) {
  const lines = String(text).split('\n').slice(0, 3);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const size = 200;
  const width = Math.max(400, Math.round(longest * size * 0.62));
  const height = Math.round(lines.length * size * 1.15 + 40);
  const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);
  const rows = lines
    .map((l, i) => `<text x="50%" y="${Math.round(20 + size * (i + 0.9) * 1.15)}" text-anchor="middle">${esc(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><g font-family='${font}' font-weight="${weight}" font-size="${size}" fill="${colour}">${rows}</g></svg>`;
}

// Sample the subject on a grid of cell x cell pixels. Colours are composited over white.
export function grid(subject, cell) {
  const gw = Math.ceil(subject.w / cell), gh = Math.ceil(subject.h / cell);
  const n = gw * gh;
  const alpha = new Float32Array(n), lum = new Float32Array(n), col = new Float32Array(n * 3);
  const d = subject.pixels.data, W0 = subject.w, H0 = subject.h;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let a = 0, r = 0, g = 0, b = 0, k = 0;
      const x0 = gx * cell, y0 = gy * cell;
      for (let y = y0; y < Math.min(y0 + cell, H0); y++) {
        for (let x = x0; x < Math.min(x0 + cell, W0); x++) {
          const i = (y * W0 + x) * 4, al = d[i + 3] / 255;
          a += al;
          r += d[i] * al + 255 * (1 - al);
          g += d[i + 1] * al + 255 * (1 - al);
          b += d[i + 2] * al + 255 * (1 - al);
          k++;
        }
      }
      const j = gy * gw + gx;
      alpha[j] = a / k;
      col[j * 3] = r / k;
      col[j * 3 + 1] = g / k;
      col[j * 3 + 2] = b / k;
      lum[j] = luminance(r / k, g / k, b / k);
    }
  }
  return { gw, gh, cell, alpha, lum, col };
}

// ---------------------------------------------------------------- masks on a grid

// Connected components of cells where mask[i] is truthy. Four-connected by default,
// because a diagonal touch is not a join in paper, glass or clay.
export function components(mask, gw, gh, eight = false) {
  const labels = new Int32Array(gw * gh).fill(-1);
  const sizes = [];
  const stack = new Int32Array(gw * gh);
  let count = 0;
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || labels[s] !== -1) continue;
    let top = 0, size = 0;
    stack[top++] = s;
    labels[s] = count;
    while (top) {
      const i = stack[--top];
      size++;
      const x = i % gw, y = (i / gw) | 0;
      const visit = (j) => {
        if (mask[j] && labels[j] === -1) {
          labels[j] = count;
          stack[top++] = j;
        }
      };
      if (x > 0) visit(i - 1);
      if (x < gw - 1) visit(i + 1);
      if (y > 0) visit(i - gw);
      if (y < gh - 1) visit(i + gw);
      if (eight) {
        if (x > 0 && y > 0) visit(i - gw - 1);
        if (x < gw - 1 && y > 0) visit(i - gw + 1);
        if (x > 0 && y < gh - 1) visit(i + gw - 1);
        if (x < gw - 1 && y < gh - 1) visit(i + gw + 1);
      }
    }
    sizes.push(size);
    count++;
  }
  return { labels, sizes, count };
}

// Distance (in cells) from every cell to the nearest cell where src is truthy,
// walking only through cells where pass is truthy. Returns dist and the step taken back.
export function walk(src, pass, gw, gh) {
  const dist = new Int32Array(gw * gh).fill(-1);
  const from = new Int32Array(gw * gh).fill(-1);
  const queue = new Int32Array(gw * gh);
  let head = 0, tail = 0;
  for (let i = 0; i < src.length; i++) if (src[i]) { dist[i] = 0; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++];
    const x = i % gw, y = (i / gw) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, y > 0 ? i - gw : -1, y < gh - 1 ? i + gw : -1];
    for (const j of nb) {
      if (j < 0 || dist[j] !== -1 || !pass[j]) continue;
      dist[j] = dist[i] + 1;
      from[j] = i;
      queue[tail++] = j;
    }
  }
  return { dist, from };
}

// ---------------------------------------------------------------- polylines

export function chaikin(poly, iterations = 2, closed = true) {
  let p = poly;
  for (let it = 0; it < iterations; it++) {
    const out = [];
    const n = p.length;
    const last = closed ? n : n - 1;
    if (!closed) out.push(p[0]);
    for (let i = 0; i < last; i++) {
      const a = p[i], b = p[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(p[n - 1]);
    p = out;
  }
  return p;
}

export function lengths(poly, closed = true) {
  const cum = new Float32Array(poly.length + (closed ? 1 : 0));
  for (let i = 1; i < cum.length; i++) {
    const a = poly[i - 1], b = poly[i % poly.length];
    cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return cum;
}

// Point and heading at distance d along a polyline with cumulative lengths cum.
export function along(poly, cum, d) {
  const n = cum.length;
  if (d <= 0) return { x: poly[0][0], y: poly[0][1], a: heading(poly, 0), i: 0 };
  let lo = 0, hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = poly[lo % poly.length], b = poly[hi % poly.length];
  const f = clamp((d - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]));
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), a: Math.atan2(b[1] - a[1], b[0] - a[0]), i: lo };
}

function heading(poly, i) {
  const a = poly[i], b = poly[(i + 1) % poly.length];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

export function bounds(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function tracePath(g, poly, closed = true) {
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  if (closed) g.closePath();
}

// Pixel hash of a canvas region, for the determinism check.
export async function digest(c) {
  const g = c.getContext('2d');
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Box blur of a grid field, radius r cells, clamped at the edges.
export function blur(field, gw, gh, r = 1) {
  const tmp = new Float32Array(gw * gh), out = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let s = 0, k = 0;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= gw) continue;
        s += field[y * gw + xx];
        k++;
      }
      tmp[y * gw + x] = s / k;
    }
  }
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let s = 0, k = 0;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= gh) continue;
        s += tmp[yy * gw + x];
        k++;
      }
      out[y * gw + x] = s / k;
    }
  }
  return out;
}

// Closed contour loops where a field sampled at cell centres crosses level (marching squares).
// Loops are in grid units measured from cell centres; the region above level is on one
// consistent side of every loop. The field is treated as below level outside the grid.
export function isolines(field, gw, gh, level = 0.5) {
  const v = (x, y) => (x < 0 || y < 0 || x >= gw || y >= gh ? -1 : field[y * gw + x]);
  const W1 = gw + 1;
  // edge ids: horizontal edge from (x,y) to (x+1,y) and vertical edge from (x,y) to (x,y+1)
  const hEdge = (x, y) => ((y + 1) * (W1 + 1) + (x + 1)) * 2;
  const vEdge = (x, y) => ((y + 1) * (W1 + 1) + (x + 1)) * 2 + 1;
  const point = new Map();
  const cross = (id, ax, ay, bx, by) => {
    if (!point.has(id)) {
      const va = v(ax, ay), vb = v(bx, by);
      const t = (level - va) / (vb - va);
      point.set(id, [ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    return id;
  };
  const next = new Map();
  for (let y = -1; y < gh; y++) {
    for (let x = -1; x < gw; x++) {
      const a = v(x, y) > level, b = v(x + 1, y) > level, c = v(x + 1, y + 1) > level, d = v(x, y + 1) > level;
      const idx = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => cross(hEdge(x, y), x, y, x + 1, y);
      const R = () => cross(vEdge(x + 1, y), x + 1, y, x + 1, y + 1);
      const B = () => cross(hEdge(x, y + 1), x, y + 1, x + 1, y + 1);
      const L = () => cross(vEdge(x, y), x, y, x, y + 1);
      // oriented so the region above level lies to the right of travel (y down)
      const segs = {
        1: [[B, L]], 2: [[R, B]], 3: [[R, L]], 4: [[T, R]], 6: [[T, B]], 7: [[T, L]],
        8: [[L, T]], 9: [[B, T]], 11: [[R, T]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]],
      };
      let list = segs[idx];
      if (idx === 5 || idx === 10) {
        const centre = (v(x, y) + v(x + 1, y) + v(x + 1, y + 1) + v(x, y + 1)) / 4 > level;
        if (idx === 5) list = centre ? [[T, L], [B, R]] : [[T, R], [B, L]];
        else list = centre ? [[L, B], [R, T]] : [[L, T], [R, B]];
      }
      for (const [f, g] of list) next.set(f(), g());
    }
  }
  const loops = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let e = start, guard = 0;
    while (!seen.has(e) && guard++ < 1e7) {
      seen.add(e);
      loop.push(point.get(e));
      e = next.get(e);
      if (e === undefined) break;
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}
