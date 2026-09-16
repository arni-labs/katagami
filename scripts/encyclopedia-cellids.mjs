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

const headers = { "X-Tenant-Id": "default", Authorization: `Bearer ${key}` };

// `limit` is not an OData word, so the server ignored it and paged at its own
// default. `$top` is the one it reads.
let url = `${origin}/tdata/EncyclopediaCells?$top=200`;
const ids = new Set();
let seen = 0;
while (url) {
  const response = await fetch(url, { headers });
  if (!response.ok) { console.error(`read failed: HTTP ${response.status}`); process.exit(2); }
  const page = await response.json();
  // A row carries its id at entity_id and inside fields, and not every row has
  // every spelling. Reading only one of them drops rows from the set and reports
  // them as missing.
  for (const row of page.value) {
    seen += 1;
    const id = row.entity_id ?? row.fields?.id ?? row.fields?.Id;
    if (id) ids.add(id);
  }
  url = page["@odata.nextLink"] ? `${origin}/tdata/${page["@odata.nextLink"]}` : null;
}
// The server's skiptoken cursor repeats the row on a page boundary: scanning the
// collection returns `socialist-realism` as the last row of one page and the
// first of the next, reproducibly, while a filtered query returns exactly one.
// So a row count above the distinct count is expected and the Set is the answer.
// It is reported, not treated as an error, because the day it grows is the day
// something else is wrong. (Temper OData paging, filed separately.)
if (seen !== ids.size) {
  console.log(`note: ${seen} rows returned for ${ids.size} distinct ids — the page cursor repeats boundary rows`);
}

const { sources, errors } = loadSources();
if (errors.length > 0) { console.error(errors.join("\n")); process.exit(1); }

const findings = danglingCellIds(sources, ids);
const rows = sources.reduce((n, s) => n + s.terms.filter((t) => t.cellId).length, 0);
console.log(`${rows} rows name a cell, against ${ids.size} that exist`);
if (findings.length === 0) { console.log("every one of them exists"); process.exit(0); }

// Before accusing the data, ask the collection directly. The scan is a paged
// snapshot and can be wrong; a keyed read cannot be. A finding that survives
// this is real, and one that does not was the scan's fault, which is a defect
// in this checker and says so rather than failing the ledger.
const confirmed = [];
const refuted = [];
for (const finding of findings) {
  // The id is the quoted one in "names cell 'x'". Matching the end of the string
  // instead picks up the word "exist" and probes a cell by that name, which of
  // course 404s and turns every finding into a false confirmation.
  const id = String(finding).match(/names cell '([^']+)'/)?.[1];
  if (!id) { confirmed.push(finding); continue; }
  const probe = await fetch(`${origin}/tdata/EncyclopediaCells('${id}')`, { headers });
  (probe.ok ? refuted : confirmed).push(finding);
}
// The paged scan is an optimisation, not the authority. Its cursor repeats rows
// at page boundaries and skips others — `mono-ha` and `young-vienna` answer a
// keyed read with 200 while never appearing in a full scan. So anything the scan
// calls missing is checked against the collection itself, and only what fails
// that read is a finding. Before this, the scan's omissions were reported as
// dangling ledger pointers, which is an accusation against the data for a defect
// in the reader.
if (refuted.length > 0) {
  console.log(`${refuted.length} were missed by the paged scan and confirmed present by a keyed read`);
}
if (confirmed.length === 0) { console.log("every one of them exists"); process.exit(0); }
console.error(`\n${confirmed.length} name a cell that does not exist:`);
for (const f of confirmed) console.error(`  ${f}`);
process.exit(1);
