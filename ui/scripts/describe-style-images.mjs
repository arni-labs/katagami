// What an art style actually looks like, written down once.
//
// An art style is a picture; its row is words about a picture. The style DNA
// index reads the words, so half the library has been indexed on a recipe and a
// tag list — the whole document for "Sumi" was four lines, none of which had
// seen an image. Jev takes text only and always will, so the picture has to
// become text somewhere, and this is the somewhere: a vision model reads a
// style's own reference images and writes a paragraph of plain visual fact,
// which lands on the row and is read from there by every later reindex.
//
// It also measures the pixels while it has them — how light the pictures read
// and how warm their colour is — and those go into the document beside the
// paragraph as stated facts. They are deliberately not turned into answers: the
// tone of a picture is not the ground its work sits on, and a page of dense
// cross-hatching measures dark while being drawn on white paper.
//
// Slow and one-off: a few minutes of image downloads and one vision call each.
// DRY-RUN by default; pass --apply. Idempotent — a style already described by
// this prompt and model is skipped unless --all.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
//      OPENAI_API_KEY. SITE (default https://katagami.ai) serves /api/file.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

// Bump when the prompt or the model changes: a description written to another
// prompt is another instrument's reading, exactly as with the DNA question set.
const DESCRIPTION_SET = "seen-v1";
const MODEL = process.env.VISION_MODEL || "gpt-4.1-mini";
// Big enough to read a brushstroke, small enough that the picture costs a few
// hundred tokens rather than two thousand: the model bills by 32px patch.
const SIDE = 512;
// Three is what nearly every style has, and a fourth reference says little a
// third did not.
const MOST_IMAGES = 3;

const API = requiredEnv("TEMPER_API_URL", "NEXT_PUBLIC_TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
const OPENAI = requiredEnv("OPENAI_API_KEY");
const SITE = (process.env.SITE || "https://katagami.ai").replace(/\/+$/, "");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || "default", Authorization: `Bearer ${KEY}` };
const NAMESPACES = ["Temper", "KatagamiCommons", "Katagami.Curation", "Katagami"];
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? "";
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice("--limit=".length) ?? 0);

const ASK = `You are looking at the reference images of one named art style in a design library, and writing the one paragraph that will stand in for those images forever.

Describe what is actually in front of you, in concrete visual terms, across all the images together. Cover: the ground it sits on and whether that ground is dark, light, or paper; the palette and whether colour is rationed or everywhere; how the marks are made and whether they look hand-made, printed, photographic, drawn or machined; texture, grain and print artefacts; contrast and whether tone is stark or soft; flatness or depth; line, shape and composition; what is depicted; any lettering; and anything that dates it to a period, a place or an obsolete process.

Write 90 to 130 words as plain declarative sentences. Describe, never judge: no "beautiful", "striking", "evocative", no guess at what it would suit. Do not name the style, do not repeat its name back, and do not describe the images one at a time — describe the style they share.`;

function requiredEnv(...names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  console.error(`missing env ${names[0]}`);
  process.exit(2);
}

const parse = (v, fallback) => {
  if (v && typeof v === "object") return v;
  if (typeof v !== "string" || !v.trim()) return fallback;
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
};

async function collectAll(path) {
  const out = [];
  let url = `${API}/tdata/${path}`;
  while (url) {
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const j = await res.json();
    out.push(...(j.value ?? []));
    url = j["@odata.nextLink"] ? new URL(j["@odata.nextLink"], url).toString() : null;
  }
  return out;
}

async function attach(id, body) {
  let lastErr = "";
  for (const ns of NAMESPACES) {
    const res = await fetch(`${API}/tdata/ArtStyles('${id}')/${ns}.AttachVisualDescription`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return;
    lastErr = `${ns} -> ${res.status}: ${(await res.text()).slice(0, 160)}`;
    if (res.status !== 404) break; // 404 = wrong namespace; anything else is a real error
  }
  throw new Error(lastErr);
}

/** One image, small enough to be cheap, as raw pixels and as a data URI. */
async function loadImage(url) {
  const res = await fetch(url.startsWith("/") ? SITE + url.split("?")[0] : url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const img = sharp(Buffer.from(await res.arrayBuffer())).resize(SIDE, SIDE, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" });
  const [jpeg, raw] = await Promise.all([img.clone().jpeg({ quality: 82 }).toBuffer(), img.clone().raw().toBuffer({ resolveWithObject: true })]);
  return { dataUri: `data:image/jpeg;base64,${jpeg.toString("base64")}`, pixels: raw.data };
}

const linear = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/**
 * How light these pictures read and how warm their colour is, off the pixels.
 * The tone is the median one, not the commonest: a page of dense cross-hatching
 * has more ink pixels than paper pixels, so the mode calls white paper black.
 * Tones are binned by how light they look rather than by relative luminance,
 * which is so bent at the dark end that one bin in sixteen holds everything
 * from black to mid-grey. What comes back is a true relative luminance, the
 * same quantity a design language's ground token is measured by.
 */
function measure(images) {
  const bins = Array.from({ length: 16 }, () => [0, 0, 0, 0]);
  let coolWeight = 0;
  let weight = 0;
  for (const data of images) {
    for (let i = 0; i + 2 < data.length; i += 3) {
      const [R, G, B] = [data[i], data[i + 1], data[i + 2]];
      const bin = bins[Math.min(15, Math.floor(luminance([R, G, B]) ** (1 / 2.2) * 16))];
      bin[0] += R; bin[1] += G; bin[2] += B; bin[3]++;
      const max = Math.max(R, G, B);
      const d = max - Math.min(R, G, B);
      if (d < 20 || max < 40) continue; // paper, ink and grey say nothing about temperature
      const hue = (max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
      const chroma = (d / max) * (max / 255);
      weight += chroma;
      if (hue >= 170 && hue <= 310) coolWeight += chroma;
    }
  }
  const half = bins.reduce((s, b) => s + b[3], 0) / 2;
  let seen = 0;
  const middle = bins.findIndex((b) => (seen += b[3]) >= half);
  const mean = bins[middle].slice(0, 3).map((c) => Math.round(c / bins[middle][3]));
  return {
    tone: Math.round(luminance(mean) * 1000) / 1000,
    tone_hex: "#" + mean.map((v) => v.toString(16).padStart(2, "0")).join(""),
    cool_share: weight > 0 ? Math.round((coolWeight / weight) * 1000) / 1000 : 0,
  };
}

async function describe(dataUris) {
  const body = {
    model: MODEL,
    messages: [{ role: "user", content: [{ type: "text", text: ASK }, ...dataUris.map((url) => ({ type: "image_url", image_url: { url } }))] }],
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)));
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null);
    if (!res) continue;
    if (res.ok) {
      const j = await res.json();
      const said = j.choices?.[0]?.message?.content?.trim();
      if (!said) throw new Error("the vision model returned nothing");
      return { said, tokens: j.usage ?? {} };
    }
    const err = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (![429, 500, 502, 503, 504].includes(res.status)) throw new Error(err);
    if (attempt === 3) throw new Error(err);
  }
  throw new Error("unreachable");
}

async function main() {
  const all = await collectAll(`ArtStyles?$filter=${encodeURIComponent("Status eq 'Published'")}&$top=500`);
  const rows = LIMIT > 0 ? all.slice(0, LIMIT) : all;
  console.log(`ArtStyles: ${rows.length} published${LIMIT > 0 ? ` (of ${all.length}, --limit)` : ""}`);

  const written = [];
  let done = 0;
  let skipped = 0;
  let failed = 0;
  let onThumbnail = 0;
  let inTokens = 0;
  let outTokens = 0;
  const started = Date.now();

  for (const row of rows) {
    const f = row.fields ?? {};
    // A plain version string, compared as one: running it through the JSON
    // reader would never match and the whole pass would describe itself again.
    if (!ALL && f.visual_description_version === `${DESCRIPTION_SET}/${MODEL}`) {
      skipped++;
      continue;
    }
    try {
      const ids = (parse(f.reference_image_file_ids, []) ?? []).filter((x) => typeof x === "string");
      const loaded = [];
      for (const id of ids.slice(0, MOST_IMAGES)) {
        const img = await loadImage(`${SITE}/api/file/${id}`).catch(() => null);
        if (img) loaded.push(img);
      }
      // Five styles' references 404 and seven have none at all. Their thumbnail
      // still serves, and one real picture beats a description of no picture.
      if (loaded.length === 0) {
        const thumb = typeof f.thumbnail_asset_url === "string" ? f.thumbnail_asset_url : "";
        if (!thumb) throw new Error("no reference image and no thumbnail");
        loaded.push(await loadImage(thumb));
        onThumbnail++;
      }
      const { said, tokens } = await describe(loaded.map((i) => i.dataUri));
      inTokens += tokens.prompt_tokens ?? 0;
      outTokens += tokens.completion_tokens ?? 0;
      const seen = { looks_like: said, images: loaded.length, ...measure(loaded.map((i) => i.pixels)) };
      written.push({ entity_id: row.entity_id, name: f.name, ...seen });
      if (APPLY) {
        await attach(row.entity_id, {
          visual_description: JSON.stringify(seen),
          visual_description_version: `${DESCRIPTION_SET}/${MODEL}`,
        });
      }
      done++;
      // Written every time, not at the end: this is a pass measured in tens of
      // minutes, and a dry run that dies at style 140 should not throw away 139
      // descriptions that were already paid for.
      if (OUT) writeFileSync(OUT, JSON.stringify(written, null, 1));
      if (done % 10 === 0) console.log(`  … ${done} described, ${Math.round((Date.now() - started) / 1000)}s`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${row.entity_id} ${f.name}: ${err.message ?? err}`);
    }
  }

  if (OUT) console.log(`wrote ${written.length} descriptions to ${OUT}`);
  const seconds = (Date.now() - started) / 1000;
  // gpt-4.1-mini, $0.40 in and $1.60 out per million tokens.
  const cost = (inTokens / 1e6) * 0.4 + (outTokens / 1e6) * 1.6;
  console.log(
    `${APPLY ? "applied" : "dry-run"}: described ${done}, skipped ${skipped} (current), failed ${failed}, ` +
      `${onThumbnail} fell back to a thumbnail; ${Math.round(seconds)}s (${(seconds / Math.max(done, 1)).toFixed(1)}s each); ` +
      `${inTokens} in + ${outTokens} out ≈ $${cost.toFixed(4)}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
