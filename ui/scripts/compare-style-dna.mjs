// Is the new reading better than the one on the row?
//
// "It should be" is not evidence. This asks a sample of the library the current
// way, twice, and holds both against the reading already stored there. Asking
// twice is the point: Jev is not deterministic, so a trait that moves by less
// than the instrument's own run-to-run spread has not moved at all, and only
// the traits that clear that floor are worth arguing about.
//
// It writes a file and never the database. Pair it with --dump on
// backfill-style-dna.mjs when you want the documents as well as the numbers.
// --seen=<file> folds in a dry run of describe-style-images.mjs, which is the
// only way to judge the art styles before anything is written to a row.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
//      TYPESAFE_API_KEY.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { askJev } from "../src/lib/jev.mjs";
import { STYLE_DNA_QUESTIONS, askedQuestions, buildStyleDoc, computedDna, dnaFromAnswers } from "../src/lib/style-dna.mjs";

const API = requiredEnv("TEMPER_API_URL", "NEXT_PUBLIC_TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
requiredEnv("TYPESAFE_API_KEY");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || "default", Authorization: `Bearer ${KEY}` };
const SAMPLE = Number(process.argv.find((a) => a.startsWith("--sample="))?.slice("--sample=".length) ?? 50);
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? "";
const SEEN = process.argv.find((a) => a.startsWith("--seen="))?.slice("--seen=".length) ?? "";
const seenBy = new Map(
  (SEEN ? JSON.parse(readFileSync(SEEN, "utf8")) : []).map((s) => [s.entity_id, JSON.stringify({ looks_like: s.looks_like, images: s.images, tone: s.tone, tone_hex: s.tone_hex, cool_share: s.cool_share })]),
);
const IDS = STYLE_DNA_QUESTIONS.map((q) => q.id);
const LABEL = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));

function requiredEnv(...names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  console.error(`missing env ${names[0]}`);
  process.exit(2);
}

async function collectAll(path) {
  const out = [];
  let url = `${API}/tdata/${path}`;
  while (url) {
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    const j = await res.json();
    out.push(...(j.value ?? []));
    url = j["@odata.nextLink"] ? new URL(j["@odata.nextLink"], url).toString() : null;
  }
  return out;
}

const parse = (v) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};
// Hashed order, so the same sample comes back every run and nobody picks the
// styles that flatter the change.
const shuffle = (rows) => rows.slice().sort((a, b) => createHash("sha256").update(a.entity_id).digest("hex").localeCompare(createHash("sha256").update(b.entity_id).digest("hex")));

async function read(kind, fields) {
  const computed = computedDna(kind, fields);
  const { answers } = await askJev(buildStyleDoc(kind, fields), askedQuestions(computed));
  const dna = dnaFromAnswers(answers, computed);
  if (!dna) throw new Error("Jev left a question unanswered");
  return dna;
}

function stats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    mean: values.reduce((s, v) => s + v, 0) / values.length,
    p50: sorted[Math.floor(0.5 * (sorted.length - 1))],
    p90: sorted[Math.floor(0.9 * (sorted.length - 1))],
  };
}

async function main() {
  const rows = [];
  for (const [kind, set] of [["language", "DesignLanguages"], ["art_style", "ArtStyles"]]) {
    const all = shuffle(await collectAll(`${set}?$filter=${encodeURIComponent("Status eq 'Published'")}&$top=500`));
    const want = Math.max(1, Math.round((SAMPLE * all.length) / 457));
    for (const row of all.slice(0, want)) rows.push({ kind, row });
  }
  console.log(`sample: ${rows.length} styles (${rows.filter((r) => r.kind === "language").length} languages, ${rows.filter((r) => r.kind === "art_style").length} art styles)`);

  if (SEEN) console.log(`folding in ${seenBy.size} descriptions from ${SEEN}, which are not on the rows yet`);

  const compared = [];
  for (const { kind, row } of rows) {
    const fields = { ...(row.fields ?? {}) };
    if (seenBy.has(row.entity_id)) fields.visual_description = seenBy.get(row.entity_id);
    const stored = parse(fields.style_dna);
    if (!stored) continue;
    try {
      const [a, b] = [await read(kind, fields), await read(kind, fields)];
      compared.push({ kind, name: fields.name, version: fields.style_dna_version, stored, a, b });
      if (compared.length % 10 === 0) console.log(`  … ${compared.length} read`);
    } catch (err) {
      console.error(`  FAILED ${fields.name}: ${err.message ?? err}`);
    }
  }

  const noise = [];
  const moved = [];
  const perTrait = new Map(IDS.map((id) => [id, { noise: [], moved: [] }]));
  for (const c of compared) {
    for (const id of IDS) {
      const n = Math.abs(c.a[id] - c.b[id]);
      const m = Math.abs((c.a[id] + c.b[id]) / 2 - c.stored[id]);
      noise.push(n);
      moved.push(m);
      perTrait.get(id).noise.push(n);
      perTrait.get(id).moved.push(m);
    }
  }
  const n = stats(noise);
  const m = stats(moved);
  console.log(`\nasked twice, the same document moves by  mean ${n.mean.toFixed(3)}  p50 ${n.p50.toFixed(3)}  p90 ${n.p90.toFixed(3)}`);
  console.log(`against the reading on the row it moves by mean ${m.mean.toFixed(3)}  p50 ${m.p50.toFixed(3)}  p90 ${m.p90.toFixed(3)}`);

  const byTrait = IDS.map((id) => {
    const t = perTrait.get(id);
    return { id, label: LABEL.get(id), moved: stats(t.moved).mean, noise: stats(t.noise).mean };
  }).sort((x, y) => y.moved - x.moved);
  console.log(`\ntraits that moved furthest, against how far the same question wanders on its own:`);
  for (const t of byTrait.slice(0, 14)) console.log(`  ${t.label.padEnd(16)} moved ${t.moved.toFixed(3)}   wander ${t.noise.toFixed(3)}`);
  console.log(`traits that barely moved: ${byTrait.slice(-6).map((t) => t.label).join(", ")}`);

  const biggest = [];
  for (const c of compared) {
    for (const id of IDS) {
      const now = (c.a[id] + c.b[id]) / 2;
      if (Math.abs(now - c.stored[id]) >= 0.45) biggest.push({ name: c.name, kind: c.kind, label: LABEL.get(id), was: c.stored[id], now: Math.round(now * 100) / 100 });
    }
  }
  biggest.sort((x, y) => Math.abs(y.now - y.was) - Math.abs(x.now - x.was));
  console.log(`\n${biggest.length} single answers moved by 0.45 or more; the twenty largest:`);
  for (const b of biggest.slice(0, 20)) console.log(`  ${b.kind === "language" ? "L" : "A"} ${b.name.padEnd(20)} ${b.label.padEnd(16)} ${b.was} -> ${b.now}`);

  console.log(`\nlibrary shape, over the sample:`);
  for (const id of IDS) {
    const was = stats(compared.map((c) => c.stored[id]));
    const now = stats(compared.map((c) => (c.a[id] + c.b[id]) / 2));
    if (Math.abs(was.mean - now.mean) >= 0.08) console.log(`  ${LABEL.get(id).padEnd(16)} mean ${was.mean.toFixed(2)} -> ${now.mean.toFixed(2)}   p90 ${was.p90.toFixed(2)} -> ${now.p90.toFixed(2)}`);
  }

  if (OUT) {
    writeFileSync(OUT, JSON.stringify(compared, null, 1));
    console.log(`\nwrote ${compared.length} readings to ${OUT}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
