// A `merge` row asserts that the source page is added to the cell it names. The
// loader never sees that assertion: it writes only the cells a payload lists, and
// a merge is recorded by hand in a ledger with no payload entry at all. So the one
// decision that promises a write was the one decision nothing checked, and eleven
// rows on this branch claimed a citation the cell did not carry.
//
// Some pages cannot be cited at all, and those rows are excused by the host list
// in encyclopedia-unfetchable-hosts.mjs, never by anything the row itself says.
// The first version of this check read an excuse out of the row's own note, which
// a verifier broke in one move: point a row at a page that answers, paste the
// sentence in, and it waved the row through.
//
// The reference is still fetched, with the loader's own request, and the verdict
// is printed beside every row. That is what keeps the host list honest: an entry
// whose pages have started answering shows up in the output as answering, and
// should then be removed. The fetch reports; the list decides.
//
//   node scripts/verify-merge-citations.mjs            # report, exit 1 on a gap
//   node scripts/verify-merge-citations.mjs --report   # report, always exit 0
import { readFileSync, readdirSync } from "node:fs";
import { fetchVerdict, FETCHED } from "./encyclopedia-source-fetch.mjs";
import { unfetchableHost } from "./encyclopedia-unfetchable-hosts.mjs";

export function readMergeRows(directory) {
  const rows = [];
  for (const file of readdirSync(directory)) {
    if (!file.endsWith(".json")) continue;
    const ledger = JSON.parse(readFileSync(new URL(file, directory), "utf8"));
    for (const row of ledger.terms ?? []) if (row.decision === "merge") rows.push({ file, ...row });
  }
  return rows;
}

// A citation matches whether the ledger recorded the http or the https form.
const same = (a, b) => a === b || a.replace(/^http:/, "https:") === b.replace(/^http:/, "https:");

/**
 * @param rows        merge rows to judge
 * @param cellSources async id -> array of source URLs, or null when unreadable
 * @param verdict     async url -> "fetched", or why the fetch failed
 */
export async function auditMergeRows(rows, cellSources, verdict = fetchVerdict) {
  const carried = [];
  const excused = [];
  const gaps = [];
  for (const row of rows) {
    if (!row.cellId) { gaps.push(`${row.file}: '${row.term}' is a merge with no cellId, so it names no target`); continue; }
    const sources = await cellSources(row.cellId);
    if (sources === null) { gaps.push(`${row.file}: '${row.term}' names '${row.cellId}', which holds no readable document`); continue; }
    if (sources.some((url) => same(url, row.ref))) { carried.push(`${row.file}: '${row.term}' -> ${row.cellId}`); continue; }
    // The cell does not carry it. The only thing that excuses that is the host
    // being one a script cannot cite, which is a reviewed list rather than
    // anything this row says about itself. The page is fetched either way, so the
    // output always shows whether the list still describes reality.
    const why = await verdict(row.ref);
    if (unfetchableHost(row.ref)) {
      excused.push(`${row.file}: '${row.term}' -> ${row.cellId} (${row.ref} is on an unfetchable host; this attempt: ${why})`);
      continue;
    }
    gaps.push(`${row.file}: '${row.term}' claims a merge into '${row.cellId}', that cell does not carry ${row.ref} (this attempt: ${why})`);
  }
  return { carried, excused, gaps };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const origin = process.env.TEMPER_API_URL;
  const key = process.env.TEMPER_API_KEY;
  if (!origin || !key) {
    console.error("set TEMPER_API_URL and TEMPER_API_KEY; this check reads the deployment because a ledger cannot verify itself");
    process.exit(2);
  }
  const headers = { "X-Tenant-Id": "default", Authorization: `Bearer ${key}` };
  const documents = new Map();
  const cellSources = async (id) => {
    if (!documents.has(id)) {
      let sources = null;
      try {
        const response = await fetch(`${origin}/tdata/EncyclopediaCells('${id}')`, { headers });
        if (response.status === 200) {
          const stored = (await response.json()).fields.document;
          if (typeof stored === "string" && stored !== "") sources = (JSON.parse(stored).sources ?? []).map((s) => s.url);
        }
      } catch { /* reported as unreadable */ }
      documents.set(id, sources);
    }
    return documents.get(id);
  };

  const rows = readMergeRows(new URL("../.agents/skills/encyclopedia/sources/", import.meta.url));
  const { carried, excused, gaps } = await auditMergeRows(rows, cellSources);
  console.log(`${rows.length} merge rows: ${carried.length} carried by their cell, ${excused.length} excused by an unfetchable host, ${gaps.length} unmet`);
  for (const line of excused) console.log(`  excused  ${line}`);
  for (const line of gaps) console.log(`  UNMET    ${line}`);
  if (gaps.length && !process.argv.includes("--report")) process.exit(1);
}
