// Backfill style DNA (lib/style-dna.mjs) onto every Published DesignLanguage and
// ArtStyle via the AttachStyleDna action. One Jev call per row, one row at a
// time — the whole library is a few minutes and a few cents, so there is no
// concurrency to manage. Idempotent: rows already answered with the current
// question set are skipped unless --all. DRY-RUN by default; pass --apply.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
//      TYPESAFE_API_KEY.
import { askJev } from "../src/lib/jev.mjs";
import { buildStyleDoc, dnaFromAnswers, dnaVersion, storedDna, styleQuestions } from "../src/lib/style-dna.mjs";

const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
requiredEnv("TYPESAFE_API_KEY");
const TENANT = process.env.TEMPER_TENANT || "default";
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
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
  for (const [kind, set] of SETS) {
    const rows = await collectAll(`${set}?$filter=${encodeURIComponent("Status eq 'Published'")}&$top=500`);
    console.log(`${set}: ${rows.length} published`);
    for (const row of rows) {
      const fields = row.fields ?? {};
      if (!ALL && storedDna(fields)) {
        skipped++;
        continue;
      }
      try {
        const { answers, model, inputTokens } = await askJev(buildStyleDoc(kind, fields), styleQuestions());
        const dna = dnaFromAnswers(answers);
        if (!dna) throw new Error("Jev left a question unanswered");
        tokens += inputTokens;
        if (APPLY) {
          await attach(set, row.entity_id, { style_dna: JSON.stringify(dna), style_dna_version: dnaVersion(model) });
        }
        asked++;
        if (asked % 25 === 0) console.log(`  … ${asked} asked`);
      } catch (err) {
        failed++;
        console.error(`  FAILED ${set} ${row.entity_id} ${fields.name}: ${err.message ?? err}`);
      }
    }
  }
  console.log(
    `${APPLY ? "applied" : "dry-run"}: asked ${asked}, skipped ${skipped} (current), failed ${failed}; ` +
      `${tokens} input tokens ≈ $${((tokens / 1e6) * 0.042).toFixed(4)}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
