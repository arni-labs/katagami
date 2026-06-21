#!/usr/bin/env node
// Katagami contract gates — objective, zero-dependency scorecard.
//
//   node gates.mjs            # scores every runs/<slug>/ and writes results.json
//
// Each gate is a static check derived from the documented Katagami design
// contract (see system-prompt.md). Every model is judged by the same rules.
// Heuristic gates are labelled; the exact rule each applies is in GATES below
// and echoed into results.json so the scorecard is self-documenting.

import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RUNS = join(ROOT, "runs");
const ALLOWED_RADII = new Set(["0", "0px", "16px", "24px", "9999px", "50%", "inherit", "initial", "unset"]);

// ---------- tiny parsers ----------------------------------------------------

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

const styleOf = (html) =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");

const inlineStylesOf = (html) =>
  [...html.matchAll(/style\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(";\n");

// :root custom properties, resolved transitively (one var may point at another)
function rootVars(css) {
  const vars = {};
  for (const block of [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1])) {
    for (const decl of block.split(";")) {
      const m = decl.match(/\s*(--[\w-]+)\s*:\s*(.+)\s*$/);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  const resolve = (v, depth = 0) => {
    if (depth > 10) return v;
    return v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fb) =>
      vars[name] != null ? resolve(vars[name], depth + 1) : (fb ? fb.trim() : "")
    );
  };
  for (const k of Object.keys(vars)) vars[k] = resolve(vars[k]);
  return { vars, resolve: (v) => resolve(v) };
}

// crude rule splitter: selector { decls }. Good enough for static gates; nested
// @media blocks are flattened to their inner rules.
function rules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    sel: m[1].trim(),
    body: m[2].trim(),
  }));
}

// ---------- color helpers ---------------------------------------------------

function parseColor(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  let m;
  if ((m = s.match(/#([0-9a-f]{3,8})\b/))) {
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length === 4) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  if ((m = s.match(/rgba?\(([^)]+)\)/))) {
    const p = m[1].split(/[,/]+/).map((x) => x.trim());
    return { r: +p[0], g: +p[1], b: +p[2], a: p[3] != null ? +p[3] : 1 };
  }
  if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (s === "black") return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}

const lum = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

// ---------- gate implementations -------------------------------------------
// each returns { pass: bool|null, detail: string }   (null = not applicable)

function gLight(html, css, { resolve }) {
  if (/color-scheme\s*:\s*dark/.test(css)) return { pass: false, detail: "color-scheme: dark declared" };
  const hasLight = /color-scheme\s*:\s*light/.test(css);
  // page-ground background = background on html or body
  let bg = null;
  for (const r of rules(css)) {
    if (/^(html|body)\b/.test(r.sel)) {
      const m = r.body.match(/background(?:-color)?\s*:\s*([^;]+)/);
      if (m) { const c = parseColor(resolve(m[1])); if (c) bg = c; }
    }
  }
  if (!bg) return { pass: hasLight, detail: hasLight ? "color-scheme:light, no explicit page bg (defaults light)" : "no light declaration, no page bg found" };
  const L = lum(bg);
  const ok = hasLight && L > 0.6;
  return { pass: ok, detail: `page bg luminance ${L.toFixed(2)} (${L > 0.6 ? "light" : "DARK"}), color-scheme:light ${hasLight ? "yes" : "MISSING"}` };
}

function gBorders(html, css, { resolve }) {
  const decls = (css + ";" + inlineStylesOf(html));
  const offenders = [];
  const re = /border(?:-(?:top|right|bottom|left))?\s*:\s*([^;}]+)/gi;
  let m;
  while ((m = re.exec(decls))) {
    const val = resolve(m[1]).trim();
    if (/^(0|0px|none)\b/.test(val)) continue;
    const wMatch = val.match(/(\d*\.?\d+)px/);
    const width = wMatch ? parseFloat(wMatch[1]) : 1; // "thin"/"medium" ~ visible
    const color = parseColor(val);
    const alpha = color ? color.a : 1;
    if (width >= 2) offenders.push(`${width}px border (heavy): ${val.slice(0, 40)}`);
    else if (width >= 1 && alpha >= 0.25) offenders.push(`${width}px @${alpha} border: ${val.slice(0, 40)}`);
  }
  // explicit border-width
  for (const bw of [...decls.matchAll(/border-width\s*:\s*([^;}]+)/gi)]) {
    const w = parseFloat(resolve(bw[1]));
    if (w >= 2) offenders.push(`border-width ${w}px (heavy)`);
  }
  return offenders.length
    ? { pass: false, detail: `${offenders.length} visible border(s): ${offenders.slice(0, 3).join(" | ")}` }
    : { pass: true, detail: "no visible borders (≥2px, or ≥1px at ≥25% opacity)" };
}

function gRadius(html, css, { resolve }) {
  const decls = css + ";" + inlineStylesOf(html);
  const bad = new Set();
  for (const m of decls.matchAll(/border[a-z-]*radius\s*:\s*([^;}]+)/gi)) {
    for (let tok of resolve(m[1]).split(/[\s/]+/)) {
      // (m[1] capture stops at ; or })
      tok = tok.trim();
      if (!tok || tok === "!important") continue;
      if (!ALLOWED_RADII.has(tok)) bad.add(tok);
    }
  }
  return bad.size
    ? { pass: false, detail: `radii outside {0,16,24,9999,50%}: ${[...bad].join(", ")}` }
    : { pass: true, detail: "all radii in {0,16,24,9999,50%}" };
}

function gBody(html, css, { resolve }) {
  for (const r of rules(css)) {
    if (/(^|,)\s*body\b/.test(r.sel)) {
      const m = r.body.match(/font-size\s*:\s*([^;]+)/);
      if (m) {
        const px = parseFloat(resolve(m[1]));
        if (!isNaN(px)) return { pass: px >= 17, detail: `body font-size ${px}px` };
      }
    }
  }
  return { pass: false, detail: "no explicit body font-size found" };
}

function gRows(html, css, { resolve }) {
  // Scopes to the font-size applied to data cells themselves — the rightmost
  // simple selector is a `td`/`tr` or a row/cell class. Header `th` labels and
  // nested sub-label spans (e.g. `td .tag`) are labels, not data rows, and are
  // excluded — matching the contract's intent (readable row data ≥14.5px).
  if (!/<table[\s>]/i.test(html)) return { pass: null, detail: "no table present" };
  const isCell = (tok) => {
    if (/^t[dr]([:.\[]|$)/.test(tok)) return true; // td / tr tag (maybe with pseudo/attr)
    const m = tok.match(/^[.#]([\w-]+)/);
    if (!m) return false;
    // split kebab/camel into words; match "row"/"cell" as whole words (not "eyebrow")
    const words = m[1].replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[-_\s]+/);
    return ["row", "rows", "cell", "cells"].some((w) => words.includes(w));
  };
  let min = Infinity, where = "";
  for (const r of rules(css)) {
    const hit = r.sel.split(",").some((s) => {
      const toks = s.trim().split(/[\s>]+/).filter(Boolean);
      return isCell(toks[toks.length - 1] || "");
    });
    if (!hit) continue;
    const m = r.body.match(/font-size\s*:\s*([^;}]+)/);
    if (m) { const px = parseFloat(resolve(m[1])); if (!isNaN(px) && px < min) { min = px; where = r.sel.slice(0, 30); } }
  }
  if (min === Infinity) return { pass: true, detail: "data cells inherit body size (≥17px)" };
  return { pass: min >= 14.5, detail: `smallest data-cell text ${min}px (${where})` };
}

function gTracking(html, css) {
  const vals = [...css.matchAll(/letter-spacing\s*:\s*(-?\d*\.?\d+)em/gi)].map((m) => parseFloat(m[1]));
  const hit = vals.find((v) => v <= -0.005 && v >= -0.06);
  return hit != null
    ? { pass: true, detail: `display tracking present (${hit}em)` }
    : { pass: false, detail: "no negative display letter-spacing (~-0.02em) found" };
}

function gMotion(html, css) {
  const ok = /@media[^{]*prefers-reduced-motion/i.test(css);
  return { pass: ok, detail: ok ? "prefers-reduced-motion handled" : "no prefers-reduced-motion block" };
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
function gEmoji(html) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ");
  const m = text.match(EMOJI);
  return m ? { pass: false, detail: `emoji in UI: ${m[0]}` } : { pass: true, detail: "no emoji in UI" };
}

function gChromeGrad(html, css) {
  const offenders = [];
  for (const r of rules(css)) {
    if (/(\.btn|button|\binput\b|\bselect\b|\btextarea\b)/.test(r.sel) && /gradient\(/.test(r.body))
      offenders.push(r.sel.slice(0, 30));
  }
  return offenders.length
    ? { pass: false, detail: `gradient on control(s): ${offenders.slice(0, 3).join(", ")}` }
    : { pass: true, detail: "no gradients on buttons/inputs" };
}

function gHero(html, css) {
  const ok = /class\s*=\s*"[^"]*hero/i.test(html) || /\.hero\b/.test(css);
  return { pass: ok, detail: ok ? "hero section present" : "no hero section detected" };
}

function gAccents(html, css, { vars }) {
  const families = []; // clusters of chromatic hues
  const seen = [];
  for (const [name, val] of Object.entries(vars)) {
    const c = parseColor(val);
    if (!c || c.a < 0.5) continue;
    const { h, s, l } = toHsl(c);
    if (s < 0.18 || l > 0.92 || l < 0.1) continue; // neutral paper/ink/grey
    seen.push({ name, h: Math.round(h), s: +s.toFixed(2) });
    if (!families.some((f) => hueDist(f, h) < 24)) families.push(h);
  }
  return {
    pass: families.length <= 3,
    detail: `${families.length} accent hue-famil${families.length === 1 ? "y" : "ies"} (${families.map((h) => Math.round(h) + "°").join(", ") || "none"})`,
  };
}

// ---------- gate registry ---------------------------------------------------

const GATES = [
  { id: "light",     name: "Light mode default",   scope: "both",      heuristic: false, fn: gLight },
  { id: "borders",   name: "Borderless",           scope: "both",      heuristic: false, fn: gBorders },
  { id: "radius",    name: "Radius ∈ {0,16,24,9999}", scope: "both",   heuristic: false, fn: gRadius },
  { id: "accents",   name: "≤3 accent colors",      scope: "both",     heuristic: true,  fn: gAccents },
  { id: "body",      name: "Body text ≥17px",       scope: "both",     heuristic: false, fn: gBody },
  { id: "rows",      name: "Table rows ≥14.5px",    scope: "dashboard", heuristic: false, fn: gRows },
  { id: "tracking",  name: "Display tracking ~-0.02em", scope: "both", heuristic: true,  fn: gTracking },
  { id: "motion",    name: "Reduced-motion respected", scope: "both",  heuristic: false, fn: gMotion },
  { id: "emoji",     name: "No emoji in UI",        scope: "both",      heuristic: false, fn: gEmoji },
  { id: "chromegrad", name: "No gradients on controls", scope: "both",  heuristic: false, fn: gChromeGrad },
  { id: "hero",      name: "Single hero on landing", scope: "landing",  heuristic: false, fn: gHero },
];

// ---------- run -------------------------------------------------------------

function scoreModel(slug) {
  const dir = join(RUNS, slug);
  const files = {
    landing: read(join(dir, "landing.html")),
    dashboard: read(join(dir, "dashboard.html")),
    design: read(join(dir, "DESIGN.md")),
  };
  let meta = {};
  try { meta = JSON.parse(read(join(dir, "meta.json")) || "{}"); } catch {}
  if (!files.landing && !files.dashboard)
    return { slug, present: false, meta, gates: {}, score: { passed: 0, applicable: 0, pct: null } };

  const ctx = {};
  for (const which of ["landing", "dashboard"]) {
    if (files[which]) {
      const css = styleOf(files[which]);
      ctx[which] = { html: files[which], css, env: rootVars(css) };
    }
  }

  const gateResults = {};
  let passed = 0, applicable = 0;
  for (const g of GATES) {
    const targets = g.scope === "both" ? ["landing", "dashboard"] : [g.scope];
    const perFile = {};
    let anyApplicable = false, allPass = true;
    for (const t of targets) {
      if (!ctx[t]) continue;
      const r = g.fn(ctx[t].html, ctx[t].css, ctx[t].env);
      perFile[t] = r;
      if (r.pass === null) continue;
      anyApplicable = true;
      if (!r.pass) allPass = false;
    }
    const pass = anyApplicable ? allPass : null;
    gateResults[g.id] = { pass, perFile };
    if (pass !== null) { applicable++; if (pass) passed++; }
  }
  const pct = applicable ? Math.round((passed / applicable) * 100) : null;
  return { slug, present: true, meta, gates: gateResults, score: { passed, applicable, pct } };
}

// stable, non-alphabetical blind order (so screenshots are reproducible)
function blindOrder(slugs) {
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  return [...slugs].sort((a, b) => hash(a + "lumen") - hash(b + "lumen"));
}

const slugs = existsSync(RUNS)
  ? readdirSync(RUNS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

const models = {};
for (const s of slugs) models[s] = scoreModel(s);

const out = {
  generatedAt: new Date().toISOString(),
  brief: "Lumen — stargazing & astronomy app",
  gates: GATES.map(({ id, name, scope, heuristic }) => ({ id, name, scope, heuristic })),
  blindOrder: blindOrder(slugs),
  models,
};
writeFileSync(join(ROOT, "results.json"), JSON.stringify(out, null, 2));

// console summary
console.log(`\nKatagami contract scorecard — brief: ${out.brief}\n`);
for (const g of GATES) {
  const row = slugs.map((s) => {
    const r = models[s].gates[g.id];
    if (!models[s].present) return `${s}: —`;
    const p = r?.pass;
    return `${s}: ${p === null ? "n/a" : p ? "PASS" : "FAIL"}`;
  });
  console.log(`  ${g.name.padEnd(30)} ${row.join("   ")}`);
}
console.log("");
for (const s of slugs) {
  const m = models[s];
  console.log(`  ${s.padEnd(12)} ${m.present ? `${m.score.passed}/${m.score.applicable} gates  (${m.score.pct}%)` : "no output yet"}`);
}
console.log(`\nwrote results.json (${slugs.length} model dir(s))\n`);
