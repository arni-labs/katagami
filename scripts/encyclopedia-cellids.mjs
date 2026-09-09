// Every `cellId` in every ledger must name a cell that exists. Read-only.
//
//   node scripts/encyclopedia-cellids.mjs
//
// Exits non-zero when a row points at nothing, because a dangling pointer has no
// legitimate form. The rule itself is a pure function in encyclopedia-coverage.mjs
// so it can be unit-tested without a deployment.
import { loadSources, danglingCellIds } from "./encyclopedia-coverage.mjs";

const origin = process.env.TEMPER_API_URL ?? "https://openpaw-production.up.railway.app";
const key = process.env.TEMPER_API_KEY;
if (!key) { console.error("TEMPER_API_KEY is required"); process.exit(2); }

let url = `${origin}/tdata/EncyclopediaCells?limit=200`;
const ids = new Set();
while (url) {
  const response = await fetch(url, { headers: { "X-Tenant-Id": "default", Authorization: `Bearer ${key}` } });
  if (!response.ok) { console.error(`read failed: HTTP ${response.status}`); process.exit(2); }
  const page = await response.json();
  for (const row of page.value) ids.add(row.fields.id);
  url = page["@odata.nextLink"] ? `${origin}/tdata/${page["@odata.nextLink"]}` : null;
}

const { sources, errors } = loadSources();
if (errors.length > 0) { console.error(errors.join("\n")); process.exit(1); }

const findings = danglingCellIds(sources, ids);
const rows = sources.reduce((n, s) => n + s.terms.filter((t) => t.cellId).length, 0);
console.log(`${rows} rows name a cell, against ${ids.size} that exist`);
if (findings.length === 0) { console.log("every one of them exists"); process.exit(0); }
console.error(`\n${findings.length} name a cell that does not exist:`);
for (const f of findings) console.error(`  ${f}`);
process.exit(1);
