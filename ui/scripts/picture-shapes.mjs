// The shape (width over height) of the picture each style is shown by, written to src/data/picture-shapes.json.
// A browser learns a picture's shape only once it has arrived, so a page that lays pictures out at their own
// proportions has to guess until then and shuffle when the guess is wrong. With the shapes known up front the
// index at /explore/b is laid out once, on the server, and nothing moves as the pictures land.
//
// Keys are the first 12 hex of sha256(picture path), so a picture that is replaced simply has no entry (the page
// then measures it in the browser) rather than a stale one, and the file names no style. Re-run when the library
// grows. Shapes are read from the optimizer's 256px copy, which keeps the original's proportions and is warm.
//
// Env: TEMPER_API_URL (or NEXT_PUBLIC_TEMPER_API_URL), TEMPER_API_KEY, TEMPER_TENANT (default "default").
//      SITE (default https://katagami.ai) serves the optimizer.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const API = (process.env.TEMPER_API_URL || process.env.NEXT_PUBLIC_TEMPER_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.TEMPER_API_KEY;
if (!API || !KEY) { console.error("missing env TEMPER_API_URL / TEMPER_API_KEY"); process.exit(2); }
const SITE = (process.env.SITE || "https://katagami.ai").replace(/\/+$/, "");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || process.env.NEXT_PUBLIC_TEMPER_TENANT || "default", Authorization: `Bearer ${KEY}` };
const ACCEPT = { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" };

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

/** The picture a style is shown by, as catalog.ts's atlasPicture picks it, in the form the page looks it up by
 *  (galleryImageSrc: no katagami.ai host, no query). */
function pictureOf(kind, f) {
  if (kind === "art_style") {
    try {
      const ids = JSON.parse(f.reference_image_file_ids || "[]");
      if (Array.isArray(ids) && typeof ids[0] === "string" && /^fl-[0-9a-f-]+$/.test(ids[0])) return `/api/file/${ids[0]}`;
    } catch {
      // fall through to the thumbnail
    }
  }
  const url = String(f.landing_thumbnail_asset_url || f.thumbnail_asset_url || "").trim();
  if (!url) return null;
  if (url.startsWith("/")) return url.split("?")[0];
  try {
    const u = new URL(url);
    if (/^(www\.)?katagami\.ai$|(^|\.)vercel\.app$/.test(u.hostname) && u.pathname.startsWith("/api/file/")) return u.pathname;
  } catch {
    // not a URL: kept as it is, as galleryImageSrc keeps it
  }
  return url;
}

const rows = (await Promise.all([["DesignLanguages", "language"], ["ArtStyles", "art_style"]].map(async ([set, kind]) =>
  (await collectAll(`${set}?$filter=Status%20eq%20'Published'&$top=500`)).map((r) => ({ kind, f: r.fields ?? {} })))))
  .flat();
const queue = [...new Set(rows.map(({ kind, f }) => pictureOf(kind, f)).filter(Boolean))];
const total = queue.length;
const shapes = {};
let failed = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let src = queue.pop(); src; src = queue.pop()) {
    try {
      const res = await fetch(`${SITE}/_next/image?url=${encodeURIComponent(src)}&w=256&q=75`, { headers: ACCEPT, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`${res.status}`);
      const { width, height } = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      if (!width || !height) throw new Error("no size");
      shapes[createHash("sha256").update(src).digest("hex").slice(0, 12)] = Math.round((width / height) * 1000) / 1000;
    } catch (err) { failed++; console.error(`  no shape for ${src}: ${err.message}`); }
  }
}));
// A bad run (the optimizer down, a changed URL shape) must not replace good shapes with none.
if (failed > total * 0.1 || Object.keys(shapes).length === 0) { console.error(`${failed} of ${total} pictures failed; picture-shapes.json left as it was`); process.exit(1); }
const sorted = Object.fromEntries(Object.entries(shapes).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../src/data/picture-shapes.json", import.meta.url), JSON.stringify({ shapes: sorted }, null, 0) + "\n");
console.log(`${Object.keys(sorted).length} shapes of ${total} pictures; ${failed} failed`);
