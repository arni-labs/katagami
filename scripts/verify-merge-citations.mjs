// A `merge` row asserts that the source page is added to the cell it names. The
// loader never sees that assertion: it writes only the cells a payload lists, and
// a merge is recorded by hand in a ledger with no payload entry at all. So the one
// decision that promises a write was the one decision nothing checked, and eleven
// rows on this branch claimed a citation the cell did not carry.
//
// The coverage command validates row shape offline and cannot reach a deployment,
// so this check is separate and needs credentials. Run it after a pass that
// records merges, and in the integrity sweep:
//
//   node scripts/verify-merge-citations.mjs            # report, exit 1 on a gap
//   node scripts/verify-merge-citations.mjs --report   # report, always exit 0
//
// A row whose note says the source cannot be fetched is reported as excused
// rather than failing: some pages, Artsy's gene pages among them, answer 403 to
// scripts and cannot be cited until a human opens one and marks it verified.
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../.agents/skills/encyclopedia/sources/", import.meta.url);
const origin = process.env.TEMPER_API_URL;
const key = process.env.TEMPER_API_KEY;
if (!origin || !key) {
  console.error("set TEMPER_API_URL and TEMPER_API_KEY; this check reads the deployment because a ledger cannot verify itself");
  process.exit(2);
}
const headers = { "X-Tenant-Id": "default", Authorization: `Bearer ${key}` };
const reportOnly = process.argv.includes("--report");

const rows = [];
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const ledger = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  for (const row of ledger.terms ?? []) {
    if (row.decision === "merge") rows.push({ file, ...row });
  }
}

const documents = new Map();
async function cellSources(id) {
  if (!documents.has(id)) {
    let sources = null;
    try {
      const response = await fetch(`${origin}/tdata/EncyclopediaCells('${id}')`, { headers });
      if (response.status === 200) {
        const stored = (await response.json()).fields.document;
        if (typeof stored === "string" && stored !== "") sources = (JSON.parse(stored).sources ?? []).map((s) => s.url);
      }
    } catch { /* reported as unreachable below */ }
    documents.set(id, sources);
  }
  return documents.get(id);
}

// A citation matches whether the ledger recorded the http or the https form.
const same = (a, b) => a === b || a.replace(/^http:/, "https:") === b.replace(/^http:/, "https:");

const gaps = [];
const excused = [];
let carried = 0;
for (const row of rows) {
  if (!row.cellId) { gaps.push(`${row.file}: '${row.term}' is a merge with no cellId, so it names no target`); continue; }
  const sources = await cellSources(row.cellId);
  if (sources === null) { gaps.push(`${row.file}: '${row.term}' names '${row.cellId}', which holds no readable document`); continue; }
  if (sources.some((url) => same(url, row.ref))) { carried += 1; continue; }
  if (/answers 403 to scripts|cannot be fetched|refuses scripts/.test(row.note ?? "")) {
    excused.push(`${row.file}: '${row.term}' -> ${row.cellId} (the row says why the page cannot be cited)`);
    continue;
  }
  gaps.push(`${row.file}: '${row.term}' claims a merge into '${row.cellId}', and that cell does not carry ${row.ref}`);
}

console.log(`${rows.length} merge rows: ${carried} carried by their cell, ${excused.length} excused, ${gaps.length} unmet`);
for (const line of excused) console.log(`  excused  ${line}`);
for (const line of gaps) console.log(`  UNMET    ${line}`);
if (gaps.length && !reportOnly) process.exit(1);
