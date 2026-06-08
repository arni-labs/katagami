// Generate stylized SVG "reference art" per art style into ui/public/art/.
// Dependency-free; produces real, visible, distinct-per-medium imagery for the
// art-style catalog + studio (local stand-in for engine-generated references).
//
//   node scripts/gen-art-svgs.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "ui", "public", "art");

const W = 600, H = 400;

// deterministic pseudo-random per (slug, variant)
function rng(seed) {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function risograph(slug, v) {
  const r = rng(slug + v);
  const paper = "#f4efe0";
  const ink1 = "#27305a"; // navy
  const ink2 = "#ff4d5e"; // coral
  const sunX = 120 + r() * 360, sunY = 110 + r() * 80, sunR = 70 + r() * 40;
  const off = 5 + r() * 5;
  const hillY = 250 + r() * 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="ht" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.1" fill="#000"/>
    </pattern>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <g style="mix-blend-mode:multiply">
    <circle cx="${sunX + off}" cy="${sunY + off}" r="${sunR}" fill="${ink2}"/>
    <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="none" stroke="${ink1}" stroke-width="3"/>
    <path d="M0 ${hillY + off} Q150 ${hillY - 50 + off} 300 ${hillY + off} T600 ${hillY + off} V400 H0 Z" fill="${ink1}" opacity="0.92"/>
    <path d="M0 ${hillY + 40} Q200 ${hillY - 10} 400 ${hillY + 40} T600 ${hillY + 30} V400 H0 Z" fill="${ink2}" opacity="0.55"/>
  </g>
  <rect width="${W}" height="${H}" fill="url(#ht)" opacity="0.14"/>
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}

function watercolor(slug, v) {
  const r = rng(slug + v);
  const paper = "#faf7f0";
  const cols = ["#7fa9c9", "#9cc4a7", "#d9b36b", "#c98a8a"];
  const blobs = Array.from({ length: 5 }, () => {
    const cx = r() * W, cy = 60 + r() * (H - 120), rx = 60 + r() * 110, ry = 50 + r() * 90;
    const c = cols[Math.floor(r() * cols.length)];
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${c}" opacity="0.5"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="wc" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${Math.floor(r()*99)}" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="34"/>
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="paperGrain"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <g filter="url(#wc)" style="mix-blend-mode:multiply">${blobs}</g>
  <rect width="${W}" height="${H}" filter="url(#paperGrain)"/>
</svg>`;
}

function film(slug, v) {
  const r = rng(slug + v);
  const sky = ["#caa97e", "#b98e6e", "#8a8a9c", "#6f7d8c"];
  const top = sky[Math.floor(r() * sky.length)];
  const sunX = 150 + r() * 300, sunY = 120 + r() * 60;
  const hillY = 250 + r() * 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="#2c3038"/>
    </linearGradient>
    <radialGradient id="sun" cx="${(sunX / W * 100).toFixed(0)}%" cy="${(sunY / H * 100).toFixed(0)}%" r="40%">
      <stop offset="0" stop-color="#ffe6c0" stop-opacity="0.85"/><stop offset="1" stop-color="#ffe6c0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="48%" r="62%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/>
    </radialGradient>
    <filter id="filmgrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${sunY}" r="34" fill="#ffeccb"/>
  <rect width="${W}" height="${H}" fill="url(#sun)"/>
  <path d="M0 ${hillY} Q160 ${hillY - 36} 320 ${hillY} T600 ${hillY - 10} V400 H0 Z" fill="#23262c"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" filter="url(#filmgrain)"/>
</svg>`;
}

const STYLES = {
  "risograph-spot-print": risograph,
  "soft-watercolor": watercolor,
  "35mm-film": film,
};

await mkdir(OUT, { recursive: true });
let n = 0;
for (const [slug, fn] of Object.entries(STYLES)) {
  for (let v = 1; v <= 4; v++) {
    await writeFile(join(OUT, `${slug}-${v}.svg`), fn(slug, String(v)), "utf8");
    n++;
  }
}
console.log(`wrote ${n} SVGs to ${OUT}`);
