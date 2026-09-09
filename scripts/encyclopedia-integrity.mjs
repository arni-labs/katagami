// The gap watch the skill asks for, as a command rather than an argument had again.
//
// Reads the live collection and reports every violation of the invariants this
// collection actually has. It reports; it never writes. Run it any time.
//
//   node scripts/encyclopedia-integrity.mjs                          # against production
//   node scripts/encyclopedia-integrity.mjs --allow-count-mismatch   # what works today
//   node scripts/encyclopedia-integrity.mjs --json                   # machine-readable
//
// The plain invocation exits 2 against production today, and that is the guard
// working rather than a bug here: DesignLanguages pages 1278 rows while the
// server counts 1279 as read on 2026-09-09, a disagreement filed against Temper
// and confirmed independently that day. It is live production state and may be
// fixed under you, so re-check the numbers before trusting this note. Until
// that is fixed, a clean run needs --allow-count-mismatch, which reports over
// what was read and prints the mismatch at the top and in the summary line.
//
// The checking is a pure function over rows so the invariants are covered by
// fixtures in ui/scripts/encyclopedia-integrity.test.mjs rather than only by a
// production run that passes on the day it is written.
//
// One invariant is deliberately narrower than it was first proposed. "A record
// attached to a cell that has children is at the wrong depth" is wrong: run over
// the collection on 2026-09-09 it flagged 103 records, and every one of them
// credited the parent direction itself rather than any child. A record crediting
// "Chiaroscuro still-life painting" belongs on Chiaroscuro even though Tenebrism
// hangs beneath it. Having children does not make a cell the wrong home; it makes
// it the wrong home for a record whose own credit names one of those children.
// That narrower test is what `misplaced-record` implements, and the broad count
// is reported as context rather than as a violation.
import { createHash } from "node:crypto";

export const RULES = {
  "unattested": "a Draft cell whose document_validated is false, or whose stored document does not hash to document_hash",
  "unparseable": "a cell whose document is not valid JSON, or is not an object with the fields the contract requires",
  "dangling-cell-link": "a broader or relations entry naming a cell that is not a live attested Draft",
  "dangling-manifestation": "a manifestation naming a record that does not exist",
  "unresolved-source": "a sourceId on a map, link or manifestation that is not in that cell's own sources",
  "broader-cycle": "a cell that reaches itself through broader",
  "misplaced-record": "a record whose own credit names a cell that sits below the cell it is attached to",
  "duplicate-manifestation": "the same record listed twice inside one cell",
};

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

const describe = (value) => (value === undefined ? "missing" : value === null ? "null" : Array.isArray(value) ? "an array" : typeof value);

// The credit a manifestation explanation quotes, which is what the placement rests on.
export function creditOf(explanation) {
  const quoted = /"([^"]+)"/.exec(explanation ?? "");
  return quoted ? quoted[1] : (explanation ?? "");
}

// Every cell reachable downward from `id`, so the depth test can ask whether a
// credit names something below where the record sits rather than merely a child.
export function descendantsOf(id, childrenById, seen = new Set()) {
  for (const child of childrenById.get(id) ?? []) {
    if (seen.has(child)) continue;
    seen.add(child);
    descendantsOf(child, childrenById, seen);
  }
  return seen;
}

// Whether a paged read accounted for every row the server says exists. A watch
// that goes green without seeing the data is worse than no watch.
export function reconcileRead(set, rowCount, counted) {
  if (counted === null || counted === undefined || !Number.isFinite(counted)) {
    return { set, detail: `read ${rowCount} rows and the server returned no @odata.count to check them against` };
  }
  if (rowCount < counted) return { set, detail: `read ${rowCount} rows but the server counts ${counted}; ${counted - rowCount} row(s) were never seen` };
  if (rowCount > counted) return { set, detail: `read ${rowCount} rows but the server counts ${counted}; the server disagrees with itself` };
  return null;
}

// `rows` are the raw entity rows: {entity_id, status, fields:{document, document_hash}, booleans:{document_validated}}.
// `records` maps a record id to its status; omit it to skip the existence check.
export function checkCollection(rows, records = null) {
  const violations = [];
  const add = (rule, cell, detail, record = null) => violations.push({ rule, cell, record, detail });
  const recordIds = records === null ? null : (records instanceof Map ? new Set(records.keys()) : records);
  const statusOf = (id) => (records instanceof Map ? records.get(id) : null);

  const parsed = new Map();
  for (const row of rows) {
    const id = row.entity_id;
    const status = row.status;
    const document = row.fields?.document ?? "";
    if (status !== "Draft") continue;
    const attested = Boolean(row.booleans?.document_validated)
      && typeof document === "string" && document !== ""
      && sha256(document) === row.fields?.document_hash;
    if (!attested) { add("unattested", id, `document_validated=${Boolean(row.booleans?.document_validated)}, hash ${sha256(String(document)) === row.fields?.document_hash ? "matches" : "does not match"}`); continue; }
    let doc;
    try { doc = JSON.parse(document); } catch (error) { add("unparseable", id, `not JSON: ${error.message}`); continue; }
    // A field of the wrong type is a finding on this cell, not a crash that
    // takes the rest of the sweep with it. Testing only for undefined let a
    // null `sources` or an object `manifestations` throw out of the checker.
    const wrong = [];
    if (typeof doc.name !== "string") wrong.push(`name is ${describe(doc.name)}`);
    for (const field of ["maps", "broader", "relations", "sources", "manifestations", "studies"]) {
      if (!Array.isArray(doc[field])) wrong.push(`${field} is ${describe(doc[field])}`);
    }
    if (wrong.length > 0) { add("unparseable", id, wrong.join(", ")); continue; }
    parsed.set(id, doc);
  }

  const childrenById = new Map();
  for (const [id, doc] of parsed) {
    for (const link of doc.broader) {
      if (!link || typeof link !== "object") continue;
      if (!childrenById.has(link.cellId)) childrenById.set(link.cellId, []);
      childrenById.get(link.cellId).push(id);
    }
  }

  for (const [id, doc] of parsed) {
    const sources = new Set();
    for (const source of doc.sources) {
      if (!source || typeof source !== "object") { add("unparseable", id, `sources holds ${describe(source)} where a source belongs`); continue; }
      if (typeof source.id !== "string") { add("unparseable", id, `a source has an id of ${describe(source.id)}`); continue; }
      sources.add(source.id);
    }
    for (const field of ["maps", "broader", "relations", "manifestations"]) {
      for (const entry of doc[field]) {
        if (!entry || typeof entry !== "object") { add("unparseable", id, `${field} holds ${describe(entry)} where an entry belongs`); continue; }
        const cited = entry.sourceIds;
        if (cited !== undefined && !Array.isArray(cited)) { add("unparseable", id, `${field} entry has sourceIds of ${describe(cited)}`); continue; }
        for (const sourceId of cited ?? []) {
          if (!sources.has(sourceId)) add("unresolved-source", id, `${field} cites '${sourceId}', which is not in this cell's sources`);
        }
      }
    }
    for (const link of [...doc.broader, ...doc.relations]) {
      if (!link || typeof link !== "object") continue;
      if (!parsed.has(link.cellId)) add("dangling-cell-link", id, `links to '${link.cellId}', which is not a live attested Draft`);
    }
    const seen = new Set();
    for (const entry of doc.manifestations) {
      if (!entry || typeof entry !== "object") continue;
      if (seen.has(entry.entityId)) add("duplicate-manifestation", id, "listed twice in this cell", entry.entityId);
      seen.add(entry.entityId);
      if (recordIds && !recordIds.has(entry.entityId)) add("dangling-manifestation", id, `${entry.entitySet} record does not exist`, entry.entityId);
    }
    // Depth: does the credit that placed this record name a cell below this one?
    const below = descendantsOf(id, childrenById);
    if (below.size > 0) {
      for (const entry of doc.manifestations) {
        if (!entry || typeof entry !== "object") continue;
        const credit = creditOf(entry.explanation).toLowerCase();
        for (const descendant of below) {
          const name = parsed.get(descendant)?.name?.toLowerCase();
          if (name && credit.includes(name)) {
            add("misplaced-record", id, `its credit names '${parsed.get(descendant).name}', which sits below this cell`, entry.entityId);
            break;
          }
        }
      }
    }
  }

  // A cycle is a cell that reaches itself going up.
  for (const id of parsed.keys()) {
    const seen = new Set();
    let frontier = [id];
    while (frontier.length > 0) {
      const next = [];
      for (const current of frontier) {
        for (const link of parsed.get(current)?.broader ?? []) {
          if (!link || typeof link !== "object") continue;
          if (link.cellId === id) { add("broader-cycle", id, `reaches itself through ${current}`); frontier = []; next.length = 0; break; }
          if (!seen.has(link.cellId)) { seen.add(link.cellId); next.push(link.cellId); }
        }
      }
      frontier = next;
    }
  }

  return { violations, context: breadthTell(parsed, childrenById, records) };
}

// The tell, never a finding. Counting a cell's children looked like it could be
// an invariant and it is not: breadth is about what a cell claims, and children
// only correlate with it. The numbers are printed so they stay visible and nobody
// rediscovers the rule and ships it. Written by the leaf-cells run of 2026-09-09,
// which reached this independently, and folded in here so the collection has one
// gap watch rather than two.
export function breadthTell(parsed, childrenById, records = null) {
  const homes = new Map();
  const onAParent = [];
  for (const [id, doc] of parsed) {
    const kids = (childrenById.get(id) ?? []).length;
    for (const entry of doc.manifestations) {
      if (!entry || typeof entry !== "object") continue;
      if (!homes.has(entry.entityId)) homes.set(entry.entityId, []);
      homes.get(entry.entityId).push({ cell: id, kids });
      if (kids > 0) onAParent.push({ cell: id, record: entry.entityId, kids });
    }
  }
  // The case that actually went wrong: one record on several cells of differing
  // breadth. Worth a look, and plenty of these are fine too.
  const atTwoDepths = [...homes.entries()]
    .filter(([, held]) => held.length > 1 && held.some((home) => home.kids > 0))
    .map(([record, held]) => ({ record, cells: held.map((home) => `${home.cell}:${home.kids}`) }));
  const byCell = new Map();
  for (const row of onAParent) byCell.set(row.cell, (byCell.get(row.cell) ?? 0) + 1);
  // Cell links must point at a live attested Draft; a manifestation need only
  // name a row in any status. That asymmetry is deliberate, and the collection
  // uses it: archived records are attached with "(Archived)" written into the
  // explanation. Counted so a reader sees them rather than discovering them.
  let archived = 0;
  if (records instanceof Map) {
    for (const [, doc] of parsed) {
      for (const entry of doc.manifestations) {
        if (entry && typeof entry === "object" && records.get(entry.entityId) === "Archived") archived += 1;
      }
    }
  }
  // What the misplacement rule did not check. Detection is literal substring
  // matching on a descendant's name, so a paraphrased misplacement passes, and
  // the rule is only structurally active where a cell has something below it.
  let active = 0;
  let literal = 0;
  let total = 0;
  for (const [id, doc] of parsed) {
    const hasBelow = (childrenById.get(id) ?? []).length > 0;
    if (hasBelow) active += 1;
    const own = (doc.name ?? "").toLowerCase();
    for (const entry of doc.manifestations) {
      if (!entry || typeof entry !== "object") continue;
      total += 1;
      if (own && creditOf(entry.explanation).toLowerCase().includes(own)) literal += 1;
    }
  }
  return {
    archivedManifestations: archived,
    depthRuleActiveOn: active,
    creditsNamingTheirOwnCell: literal,
    creditsTotal: total,
    cells: parsed.size,
    manifestations: [...parsed.values()].reduce((total, doc) => total + doc.manifestations.length, 0),
    recordsOnSeveralCells: [...homes.values()].filter((held) => held.length > 1).length,
    onAParent: onAParent.length,
    onAParentByCell: [...byCell].sort((a, b) => b[1] - a[1]),
    atTwoDepths: atTwoDepths.length,
  };
}

async function main() {
  const origin = process.env.TEMPER_API_URL ?? "https://openpaw-production.up.railway.app";
  const key = process.env.TEMPER_API_KEY;
  if (!key) { console.error("TEMPER_API_KEY is required"); process.exitCode = 1; return; }
  const headers = { "X-Tenant-Id": "default", Authorization: `Bearer ${key}` };
  // A watch that goes green without seeing the data is worse than no watch, so
  // the row count is checked against the collection's own $count and a short
  // read fails the run rather than reporting a clean result. Found by the
  // verifier on 2026-09-09: with paging stopped early the sweep reported zero
  // while a broken cell sat unread on page two.
  const shortReads = [];
  const readAll = async (set) => {
    const rows = [];
    let path = `/tdata/${set}?$count=true&$top=500`;
    const seen = new Set();
    let counted = null;
    while (path) {
      const url = new URL(path, origin).href;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`${set}: HTTP ${response.status}`);
      const page = await response.json();
      rows.push(...(page.value ?? []));
      if (counted === null && Number.isFinite(page["@odata.count"])) counted = page["@odata.count"];
      const next = page["@odata.nextLink"];
      if (!next || seen.has(next)) break;
      seen.add(next);
      path = new URL(next, url).href.slice(origin.length);
    }
    const mismatch = reconcileRead(set, rows.length, counted);
    if (mismatch) shortReads.push(mismatch);
    return rows;
  };
  const cells = await readAll("EncyclopediaCells");
  const records = new Map();
  for (const set of ["DesignLanguages", "ArtStyles", "PaletteSystems", "WritingStyles"]) {
    for (const row of await readAll(set)) records.set(row.entity_id, row.status);
  }
  // A watch that goes green without seeing the data is worse than no watch, so a
  // read that does not account for every row fails the run rather than reporting
  // a clean result. Found by the verifier on 2026-09-09: with paging stopped
  // early the sweep reported zero while a broken cell sat unread on page two.
  // `--allow-count-mismatch` runs anyway, for the known server-side disagreement
  // on DesignLanguages (1278 paged, 1279 counted), and the mismatch still prints.
  if (shortReads.length > 0) {
    const allow = process.argv.includes("--allow-count-mismatch");
    const where = allow ? console.warn : console.error;
    where(`The read did not account for every row${allow ? ", and --allow-count-mismatch was passed, so the findings below are over what was read" : ", so this run reports nothing about the collection"}:`);
    for (const line of shortReads) where(`  ${line.set}: ${line.detail}`);
    if (!allow) { process.exitCode = 2; return; }
  }
  const { violations, context } = checkCollection(cells, records);
  if (process.argv.includes("--json")) { console.log(JSON.stringify({ violations, context }, null, 2)); return; }
  const byRule = new Map();
  for (const violation of violations) byRule.set(violation.rule, (byRule.get(violation.rule) ?? 0) + 1);
  console.log(`${context.cells} live attested cells, ${context.manifestations} manifestations, ${records.size} records; ${shortReads.length === 0 ? "every page reconciled against @odata.count" : `THE READ DID NOT RECONCILE (see above), so these counts are over what was read`}`);
  console.log(`${violations.length} violation(s)${violations.length === 0 ? "" : `: ${[...byRule].map(([rule, count]) => `${rule} ${count}`).join(", ")}`}`);
  for (const violation of violations) {
    console.log(`  ${violation.rule}  ${violation.cell}${violation.record ? `  ${violation.record}` : ""}  ${violation.detail}`);
  }
  console.log(`\nThe breadth tell. THESE ARE NOT DEFECTS and this is not a to-do list.`);
  console.log(`Counting a cell's children looked like an invariant and is not: breadth is what a`);
  console.log(`cell claims, and children only correlate with it. A record naming watercolour`);
  console.log(`generally belongs on watercolour-painting even though one narrower cell hangs`);
  console.log(`beneath it. Read these case by case and expect most to be right.`);
  console.log(`  records on a cell that has children: ${context.onAParent}`);
  for (const [cell, count] of context.onAParentByCell) console.log(`      ${count.toString().padStart(3)}  ${cell}`);
  console.log(`  records on several cells of differing breadth: ${context.atTwoDepths}`);
  console.log(`  records on more than one cell at all: ${context.recordsOnSeveralCells}`);
  console.log(`  manifestations of Archived records: ${context.archivedManifestations} (a cell link must point at a live Draft; a manifestation may name a row in any status, and these say "(Archived)" in their explanation)`);
  console.log(`\nWhat the misplacement rule did NOT check. It matches a descendant's name literally`);
  console.log(`inside the credit, so a paraphrased misplacement passes, and it is only active where`);
  console.log(`a cell has something below it. The zero above is honest and narrower than it reads.`);
  console.log(`  cells the rule is structurally active on: ${context.depthRuleActiveOn} of ${context.cells}`);
  console.log(`  credits that literally contain even their own cell's name: ${context.creditsNamingTheirOwnCell} of ${context.creditsTotal}`);
  process.exitCode = violations.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
