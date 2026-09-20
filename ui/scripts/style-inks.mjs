// The colour each style reads as from across the room: the dominant hue of its
// thumbnail (grey when it has none), written to src/data/style-inks.json. The explore views
// draw a style as a dot of this ink before its picture is close enough to load.
// Keys are the first 12 hex of sha256(entity id), as in atlas-families.json, so
// the file names no style the public shelf does not show. Re-run when the
// library grows; a style without an entry is drawn in neutral ink.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default").
//      SITE (default https://katagami.ai) serves /api/file thumbnails.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const API = (process.env.TEMPER_API_URL || process.env.NEXT_PUBLIC_TEMPER_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.TEMPER_API_KEY;
if (!API || !KEY) { console.error("missing env TEMPER_API_URL / TEMPER_API_KEY"); process.exit(2); }
const SITE = (process.env.SITE || "https://katagami.ai").replace(/\/+$/, "");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || "default", Authorization: `Bearer ${KEY}` };

async function collectAll(path) {
  const out = [];
  let url = `${API}/tdata/${path}`;
  const seen = new Set();
  while (url && !seen.has(url)) {
    seen.add(url);
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    const j = await res.json();
    out.push(...(j.value ?? []));
    url = j["@odata.nextLink"] ? new URL(j["@odata.nextLink"], url).toString() : null;
  }
  return out;
}

async function inkOf(url) {
  const res = await fetch(url.startsWith("/") ? SITE + url.split("?")[0] : url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const { data } = await sharp(Buffer.from(await res.arrayBuffer())).resize(32, 32, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Twelve hue bins, each weighted by how saturated its pixels are: the ink is the
  // mean of the heaviest bin, so a pink-and-blue riso print reads pink or blue,
  // never the mud between them.
  const bins = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
  let ar = 0, ag = 0, ab = 0, total = 0;
  for (let i = 0; i < data.length; i += 3) {
    const [R, G, B] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
    ar += R; ag += G; ab += B;
    if (d < 24 || max < 50) continue; // paper, ink and grey say nothing about hue
    const hue = (max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
    const k = (d / max) ** 2;
    const bin = bins[Math.floor(hue / 30) % 12];
    bin[0] += R * k; bin[1] += G * k; bin[2] += B * k; bin[3] += k;
    total += k;
  }
  const n = data.length / 3;
  const top = bins.reduce((best, bin) => (bin[3] > best[3] ? bin : best));
  const [R, G, B] = total > n * 0.01 ? [top[0] / top[3], top[1] / top[3], top[2] / top[3]] : [ar / n, ag / n, ab / n];
  return "#" + [R, G, B].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

const rows = (await Promise.all(["DesignLanguages", "ArtStyles"].map((s) => collectAll(`${s}?$filter=Status%20eq%20'Published'&$top=500`)))).flat();
const inks = {};
let failed = 0;
const queue = rows.filter((r) => (r.fields?.landing_thumbnail_asset_url || r.fields?.thumbnail_asset_url));
await Promise.all(Array.from({ length: 10 }, async () => {
  for (let row = queue.pop(); row; row = queue.pop()) {
    const url = row.fields.landing_thumbnail_asset_url || row.fields.thumbnail_asset_url;
    try { inks[createHash("sha256").update(row.entity_id).digest("hex").slice(0, 12)] = await inkOf(url); }
    catch (err) { failed++; console.error(`  no ink for ${row.fields?.name}: ${err.message}`); }
  }
}));
// A bad run (the image host down, a changed URL shape) must not replace good inks with none.
if (failed > rows.length * 0.1 || Object.keys(inks).length === 0) { console.error(`${failed} of ${rows.length} thumbnails failed; style-inks.json left as it was`); process.exit(1); }
const sorted = Object.fromEntries(Object.entries(inks).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../src/data/style-inks.json", import.meta.url), JSON.stringify({ inks: sorted }, null, 0) + "\n");
console.log(`${Object.keys(sorted).length} inks of ${rows.length} styles; ${failed} failed`);
