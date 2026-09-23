// Resize every card picture once and put the resizes on the asset CDN, where they are served for a year from
// Cloudflare's edge whatever the browser, the deploy or the hour. See src/lib/baked-image.mjs for why the image
// optimizer's own cache could not be relied on, and for where each resize lives.
//
// Idempotent: a resize already on the CDN is skipped (checked with a HEAD), so re-running after new styles are
// published bakes only the new ones.
//
//   cd ui && TEMPER_API_URL=… TEMPER_API_KEY=… node scripts/bake-card-images.mjs            # bake what is missing
//   … node scripts/bake-card-images.mjs --dry-run                                             # count only
//
// Uploads with `wrangler r2 bulk put` to the bucket the assets worker serves, so wrangler must be logged in to the
// Cloudflare account that owns it.
//
// Env: TEMPER_API_URL (or NEXT_PUBLIC_TEMPER_API_URL), TEMPER_API_KEY, TEMPER_TENANT (default "default").
//      SITE (default https://katagami.ai) serves /api/file originals. BUCKET (default openpaw-fs-seshendranalla).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { BAKED_BASE, bakedKey } from "../src/lib/baked-image.mjs";

const API = (process.env.TEMPER_API_URL || process.env.NEXT_PUBLIC_TEMPER_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.TEMPER_API_KEY;
if (!API || !KEY) { console.error("missing env TEMPER_API_URL / TEMPER_API_KEY"); process.exit(2); }
const SITE = (process.env.SITE || "https://katagami.ai").replace(/\/+$/, "");
const BUCKET = process.env.BUCKET || "openpaw-fs-seshendranalla";
const DRY = process.argv.includes("--dry-run");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || "default", Authorization: `Bearer ${KEY}` };
const PREFIX = new URL(BAKED_BASE).pathname.replace(/^\/+/, "");

// Every picture is drawn on a card or in the opened entry's strip at 256/384 and opened at 750; a style's first
// picture is also the far-out card (128) and the desk's first large print (1080).
const EVERY = [256, 384, 750];
const FIRST = [128, 1080];

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

/** The pictures a style is drawn with, in the order and shape of catalog.ts's atlasPictures. */
function picturesOf(kind, f) {
  const out = [];
  const add = (url) => { const path = String(url || "").replace(/^https?:\/\/(www\.)?katagami\.ai/, "").split("?")[0]; if (path && !out.includes(path)) out.push(path); };
  if (kind === "art_style") {
    try {
      const ids = JSON.parse(f.reference_image_file_ids || "[]");
      if (Array.isArray(ids)) for (const id of ids.slice(0, 6)) if (typeof id === "string" && /^fl-[0-9a-f-]+$/.test(id)) add(`/api/file/${id}`);
    } catch {
      // no references to draw
    }
  }
  for (const key of ["landing_thumbnail_asset_url", "thumbnail_asset_url"]) if (kind === "language" || out.length === 0) add(f[key]);
  return out;
}

const rows = (await Promise.all([["DesignLanguages", "language"], ["ArtStyles", "art_style"]].map(async ([set, kind]) =>
  (await collectAll(`${set}?$filter=Status%20eq%20'Published'&$top=500`)).map((r) => ({ kind, f: r.fields ?? {} })))))
  .flat();

const jobs = new Map(); // key -> { src, widths:Set }
const want = (url, widths) => {
  const src = String(url || "").replace(/^https?:\/\/(www\.)?katagami\.ai/, "").split("?")[0];
  const key = bakedKey(src);
  if (!key) return;
  const job = jobs.get(key) ?? { src, widths: new Set() };
  for (const w of widths) job.widths.add(w);
  jobs.set(key, job);
};
for (const { kind, f } of rows) {
  picturesOf(kind, f).forEach((src, i) => want(src, [...EVERY, ...(i === 0 ? FIRST : [])]));
  // The card's second picture (catalog.ts's thumbnail_url), drawn in place of a reference file that is gone, at any
  // size the first could have been.
  want(f.landing_thumbnail_asset_url || f.thumbnail_asset_url, [...EVERY, ...FIRST]);
}

// Already baked: each resize answers. Only the ones that do not are made, so a run cut short part way through a
// picture's files finishes it.
const todo = [];
const checks = [...jobs].flatMap(([key, job]) => [...job.widths].map((w) => ({ key, job, w })));
const missing = new Map(); // key -> Set of widths
await Promise.all(Array.from({ length: 24 }, async () => {
  for (let c = checks.pop(); c; c = checks.pop()) {
    const res = await fetch(`${BAKED_BASE}/${c.key}/${c.w}.webp`, { method: "HEAD" }).catch(() => null);
    if (!res || !res.ok) missing.set(c.key, (missing.get(c.key) ?? new Set()).add(c.w));
  }
}));
for (const [key, widths] of missing) todo.push([key, { ...jobs.get(key), widths }]);
const files = todo.reduce((n, [, j]) => n + j.widths.size, 0);
console.log(`${jobs.size} pictures, ${jobs.size - todo.length} already baked, ${todo.length} to bake (${files} resizes)`);
if (DRY || todo.length === 0) process.exit(0);

/** An original, asked for up to four times: a run of hundreds drops the odd connection, and a dropped one is not a
 *  missing file. A 404 is final. */
async function download(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (res.status === 404) throw Object.assign(new Error("404"), { final: true });
      if (!res.ok) throw new Error(`${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (err.final || attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
}

const stage = mkdtempSync(join(tmpdir(), "katagami-bake-"));
const list = [];
let failed = 0, bytes = 0, done = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let item = queue.pop(); item; item = queue.pop()) {
    const [key, job] = item;
    try {
      const url = job.src.startsWith("/") ? `${SITE}${job.src}` : job.src;
      const original = await download(url);
      for (const w of job.widths) {
        const out = await sharp(original).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: w <= 128 ? 70 : 78, effort: 4 }).toBuffer();
        const file = join(stage, key, `${w}.webp`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, out);
        list.push({ key: `${PREFIX}/${key}/${w}.webp`, file });
        bytes += out.length;
      }
    } catch (err) { failed++; console.error(`  ${err.message} ${job.src}`); }
    if (++done % 50 === 0) console.log(`  resized ${done}/${todo.length}`);
  }
}));
console.log(`resized ${todo.length - failed} pictures into ${list.length} files, ${Math.round(bytes / 1024 / 1024)}MB; ${failed} originals unreachable`);

// Upload in slices so one failed batch does not lose the rest. The R2 API answers a burst with 429, so each slice goes
// up a few at a time and is tried again after a pause; a slice that still fails is reported and the next run redoes it.
const SLICE = 200;
let unsent = 0;
for (let i = 0; i < list.length; i += SLICE) {
  const part = join(stage, `upload-${i}.json`);
  const slice = list.slice(i, i + SLICE);
  writeFileSync(part, JSON.stringify(slice));
  for (let attempt = 0; ; attempt++) {
    try {
      execFileSync("npx", ["-y", "wrangler@latest", "r2", "bulk", "put", BUCKET, "--remote", "--concurrency", "5", "--filename", part, "--content-type", "image/webp", "--cache-control", "public, max-age=31536000, immutable"], { stdio: ["ignore", "ignore", "inherit"] });
      break;
    } catch {
      if (attempt >= 3) { unsent += slice.length; console.error(`  slice ${i}-${i + slice.length} not uploaded`); break; }
      await new Promise((r) => setTimeout(r, 20000 * 2 ** attempt));
    }
  }
  console.log(`  uploaded ${Math.min(i + SLICE, list.length)}/${list.length}`);
}
rmSync(stage, { recursive: true, force: true });
console.log(`done; ${unsent} files not uploaded`);
process.exit(failed > todo.length * 0.15 || unsent > 0 ? 1 : 0);
