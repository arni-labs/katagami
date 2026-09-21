// Ask the image optimizer for every card picture once, at the one width the explore cards draw from,
// so the first visitor after a deploy does not pay for the resize.
//
// A card picture is a multi-megabyte original on the file proxy. The optimizer shrinks it to a few
// kilobytes, but a cold resize costs 400-900ms against ~60ms for a warm one, and a deploy starts the
// cache empty again. A phone opening /explore/mosaic asks for about seventy of these at once, so a cold
// cache is the difference between a view that fills in a couple of seconds and one that takes fifteen.
// Run it after every deploy that changes the site:
//
//   TEMPER_API_URL=… TEMPER_API_KEY=… node ui/scripts/warm-card-images.mjs
//
// Env: TEMPER_API_URL (or NEXT_PUBLIC_TEMPER_API_URL), TEMPER_API_KEY, TEMPER_TENANT (default "default").
//      SITE (default https://katagami.ai) is the deployment to warm.
//      WIDTH (default 256) must match NEAR in explore/mosaic/mosaic.tsx.

const API = (process.env.TEMPER_API_URL || process.env.NEXT_PUBLIC_TEMPER_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.TEMPER_API_KEY;
if (!API || !KEY) { console.error("missing env TEMPER_API_URL / TEMPER_API_KEY"); process.exit(2); }
const SITE = (process.env.SITE || "https://katagami.ai").replace(/\/+$/, "");
const WIDTH = Number(process.env.WIDTH || 256);
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

/** The pictures the explore cards draw, in the same order and shape as catalog.ts's atlasPictures. */
function picturesOf(kind, f) {
  const out = [];
  const add = (url) => { const path = String(url || "").replace(/^https?:\/\/(www\.)?katagami\.ai/, "").split("?")[0]; if (path && !out.includes(path)) out.push(path); };
  if (kind === "art_style") {
    try {
      const ids = JSON.parse(f.reference_image_file_ids || "[]");
      if (Array.isArray(ids)) for (const id of ids.slice(0, 6)) if (typeof id === "string" && /^fl-[0-9a-f-]+$/.test(id)) add(`/api/file/${id}`);
    } catch {
      // no references to show
    }
  }
  for (const key of ["landing_thumbnail_asset_url", "thumbnail_asset_url"]) if (kind === "language" || out.length === 0) add(f[key]);
  return out;
}

const rows = (await Promise.all([["DesignLanguages", "language"], ["ArtStyles", "art_style"]].map(async ([set, kind]) =>
  (await collectAll(`${set}?$filter=Status%20eq%20'Published'&$top=500`)).map((r) => ({ kind, f: r.fields ?? {} })))))
  .flat();

// Only the first picture of each style is on a card; the rest are in the opened entry, which draws them large.
const queue = rows.flatMap(({ kind, f }) => picturesOf(kind, f).slice(0, 1))
  .map((src) => `${SITE}/_next/image?url=${encodeURIComponent(src)}&w=${WIDTH}&q=75`);
const total = queue.length;
let done = 0, warm = 0, failed = 0;

await Promise.all(Array.from({ length: 8 }, async () => {
  for (let url = queue.pop(); url; url = queue.pop()) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      await res.arrayBuffer();
      if (!res.ok) { failed++; console.error(`  ${res.status} ${url}`); }
      else if ((res.headers.get("x-vercel-cache") || "").includes("HIT")) warm++;
    } catch (err) { failed++; console.error(`  ${err.message} ${url}`); }
    if (++done % 100 === 0) console.log(`  ${done}/${total}`);
  }
}));

console.log(`${total} pictures at w=${WIDTH}: ${warm} already warm, ${failed} failed`);
// A picture the file proxy cannot serve is a broken reference in the data, not a reason to fail the deploy;
// a wholesale failure is.
process.exit(failed > total * 0.15 ? 1 : 0);
