// The gap watch the skill asks for, as a command rather than an argument had again.
//
// Reads the live collection and reports every violation of the invariants this
// collection actually has. It reports; it never writes. Run it any time.
//
//   node scripts/encyclopedia-integrity.mjs            # against production
//   node scripts/encyclopedia-integrity.mjs --json     # machine-readable
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

// `rows` are the raw entity rows: {entity_id, status, fields:{document, document_hash}, booleans:{document_validated}}.
// `recordIds` is the set of ids that exist across the record sets; omit it to skip that check.
export function checkCollection(rows, recordIds = null) {
  const violations = [];
  const add = (rule, cell, detail, record = null) => violations.push({ rule, cell, record, detail });

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
    const shape = ["name", "maps", "broader", "relations", "sources", "manifestations", "studies"]
      .filter((field) => doc[field] === undefined);
    if (shape.length > 0) { add("unparseable", id, `missing ${shape.join(", ")}`); continue; }
    parsed.set(id, doc);
  }

  const childrenById = new Map();
  for (const [id, doc] of parsed) {
    for (const link of doc.broader) {
      if (!childrenById.has(link.cellId)) childrenById.set(link.cellId, []);
      childrenById.get(link.cellId).push(id);
    }
  }

  for (const [id, doc] of parsed) {
    const sources = new Set(doc.sources.map((source) => source.id));
    for (const field of ["maps", "broader", "relations", "manifestations"]) {
      for (const entry of doc[field]) {
        for (const sourceId of entry.sourceIds ?? []) {
          if (!sources.has(sourceId)) add("unresolved-source", id, `${field} cites '${sourceId}', which is not in this cell's sources`);
        }
      }
    }
    for (const link of [...doc.broader, ...doc.relations]) {
      if (!parsed.has(link.cellId)) add("dangling-cell-link", id, `links to '${link.cellId}', which is not a live attested Draft`);
    }
    const seen = new Set();
    for (const entry of doc.manifestations) {
      if (seen.has(entry.entityId)) add("duplicate-manifestation", id, "listed twice in this cell", entry.entityId);
      seen.add(entry.entityId);
      if (recordIds && !recordIds.has(entry.entityId)) add("dangling-manifestation", id, `${entry.entitySet} record does not exist`, entry.entityId);
    }
    // Depth: does the credit that placed this record name a cell below this one?
    const below = descendantsOf(id, childrenById);
    if (below.size > 0) {
      for (const entry of doc.manifestations) {
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
          if (link.cellId === id) { add("broader-cycle", id, `reaches itself through ${current}`); frontier = []; next.length = 0; break; }
          if (!seen.has(link.cellId)) { seen.add(link.cellId); next.push(link.cellId); }
        }
      }
      frontier = next;
    }
  }

  return { violations, context: breadthTell(parsed, childrenById) };
}

// The tell, never a finding. Counting a cell's children looked like it could be
// an invariant and it is not: breadth is about what a cell claims, and children
// only correlate with it. The numbers are printed so they stay visible and nobody
// rediscovers the rule and ships it. Written by the leaf-cells run of 2026-09-09,
// which reached this independently, and folded in here so the collection has one
// gap watch rather than two.
export function breadthTell(parsed, childrenById) {
  const homes = new Map();
  const onAParent = [];
  for (const [id, doc] of parsed) {
    const kids = (childrenById.get(id) ?? []).length;
    for (const entry of doc.manifestations) {
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
  return {
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
  const readAll = async (set) => {
    const rows = [];
    let path = `/tdata/${set}?$top=500`;
    const seen = new Set();
    while (path) {
      const url = new URL(path, origin).href;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`${set}: HTTP ${response.status}`);
      const page = await response.json();
      rows.push(...(page.value ?? []));
      const next = page["@odata.nextLink"];
      if (!next || seen.has(next)) break;
      seen.add(next);
      path = new URL(next, url).href.slice(origin.length);
    }
    return rows;
  };
  const cells = await readAll("EncyclopediaCells");
  const recordIds = new Set();
  for (const set of ["DesignLanguages", "ArtStyles", "PaletteSystems", "WritingStyles"]) {
    for (const row of await readAll(set)) recordIds.add(row.entity_id);
  }
  const { violations, context } = checkCollection(cells, recordIds);
  if (process.argv.includes("--json")) { console.log(JSON.stringify({ violations, context }, null, 2)); return; }
  const byRule = new Map();
  for (const violation of violations) byRule.set(violation.rule, (byRule.get(violation.rule) ?? 0) + 1);
  console.log(`${context.cells} live attested cells, ${context.manifestations} manifestations, ${recordIds.size} records`);
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
  process.exitCode = violations.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
