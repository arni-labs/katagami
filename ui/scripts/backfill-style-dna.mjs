// Backfill style DNA (lib/style-dna.mjs) onto every Published DesignLanguage and
// ArtStyle via the AttachStyleDna action. One Jev call per row, one row at a
// time — the whole library is a few minutes and a few cents, so there is no
// concurrency to manage. Idempotent: rows already answered with the current
// question set are skipped unless --all. DRY-RUN by default; pass --apply.
// --any-status drops the Published filter, for a local stack whose seed stops
// at Draft.
//
// Questions a row answers by measurement (lib/style-dna.mjs) are never sent to
// Jev, so a language's call is three questions shorter than an art style's.
// --dump writes every document and reading to a file instead of the database,
// which is how a run is read before anyone decides to apply it.
//
// Art styles want scripts/describe-style-images.mjs run first: without it their
// documents say nothing about what they look like, which is the whole reason
// for v2.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
//      TYPESAFE_API_KEY.
import { writeFileSync } from "node:fs";
import { askJev, JEV_MODEL } from "../src/lib/jev.mjs";
import { askedQuestions, buildStyleDoc, computedDna, dnaFromAnswers, dnaVersion, storedDna, traitsField } from "../src/lib/style-dna.mjs";

const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
requiredEnv("TYPESAFE_API_KEY");
const TENANT = process.env.TEMPER_TENANT || "default";
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const ANY_STATUS = process.argv.includes("--any-status");
const DUMP = process.argv.find((a) => a.startsWith("--dump="))?.slice("--dump=".length) ?? "";
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice("--limit=".length) ?? 0);
// Namespace fallback, mirroring backfill-facets.mjs.
const NAMESPACES = ["Temper", "KatagamiCommons", "Katagami.Curation", "Katagami"];
const H = { "X-Tenant-Id": TENANT, Authorization: `Bearer ${KEY}` };
const SETS = [
  ["language", "DesignLanguages"],
  ["art_style", "ArtStyles"],
];

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`missing env ${name}`);
    process.exit(2);
  }
  return v;
}

async function collectAll(path) {
  const out = [];
  let url = `${API}/tdata/${path}`;
  while (url) {
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`);
    const j = await res.json();
    out.push(...(j.value ?? []));
    url = j["@odata.nextLink"] ? new URL(j["@odata.nextLink"], url).toString() : null;
  }
  return out;
}

async function attach(set, id, body) {
  let lastErr = "";
  for (const ns of NAMESPACES) {
    const res = await fetch(`${API}/tdata/${set}('${id}')/${ns}.AttachStyleDna`, {
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

async function main() {
  let asked = 0;
  let skipped = 0;
  let failed = 0;
  let tokens = 0;
  let measured = 0;
  const dumped = [];
  for (const [kind, set] of SETS) {
    const filter = ANY_STATUS ? "" : `$filter=${encodeURIComponent("Status eq 'Published'")}&`;
    const all = await collectAll(`${set}?${filter}$top=500`);
    const rows = LIMIT > 0 ? all.slice(0, LIMIT) : all;
    console.log(`${set}: ${rows.length} ${ANY_STATUS ? "rows" : "published"}${LIMIT > 0 ? ` (of ${all.length}, --limit)` : ""}`);
    for (const row of rows) {
      const fields = row.fields ?? {};
      if (!ALL && storedDna(fields, JEV_MODEL)) {
        skipped++;
        continue;
      }
      try {
        const computed = computedDna(kind, fields);
        const doc = buildStyleDoc(kind, fields);
        const { answers, model, inputTokens } = await askJev(doc, askedQuestions(computed));
        const dna = dnaFromAnswers(answers, computed);
        if (!dna) throw new Error("Jev left a question unanswered");
        if (model !== JEV_MODEL) throw new Error(`asked ${JEV_MODEL}, answered by ${model} — pin JEV_MODEL to the model in use`);
        tokens += inputTokens;
        measured += Object.keys(computed).length;
        if (DUMP) dumped.push({ kind, entity_id: row.entity_id, name: fields.name, doc, computed, dna, was: fields.style_dna, was_version: fields.style_dna_version });
        if (APPLY) {
          await attach(set, row.entity_id, {
            style_dna: JSON.stringify(dna),
            style_dna_version: dnaVersion(model),
            style_traits: traitsField(dna),
          });
        }
        asked++;
        if (asked % 25 === 0) console.log(`  … ${asked} asked`);
      } catch (err) {
        failed++;
        console.error(`  FAILED ${set} ${row.entity_id} ${fields.name}: ${err.message ?? err}`);
      }
    }
  }
  if (DUMP) {
    writeFileSync(DUMP, JSON.stringify(dumped, null, 1));
    console.log(`wrote ${dumped.length} readings to ${DUMP}`);
  }
  console.log(
    `${APPLY ? "applied" : "dry-run"}: asked ${asked}, skipped ${skipped} (current), failed ${failed}; ` +
      `${measured} answers measured rather than asked; ` +
      `${tokens} input tokens ≈ $${((tokens / 1e6) * 0.042).toFixed(4)}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
