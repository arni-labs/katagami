// The gap watch the skill asks for, as a command rather than an argument had again.
//
// Reads the live collection and reports every violation of the invariants this
// collection actually has. It reports; it never writes. Run it any time.
//
//   node scripts/encyclopedia-integrity.mjs                                        # against production
//   node scripts/encyclopedia-integrity.mjs --allow-count-mismatch=DesignLanguages  # what works today
//   node scripts/encyclopedia-integrity.mjs --json                                  # machine-readable
//   node scripts/encyclopedia-integrity.mjs --unplaced                              # name every unplaced record
//
// Exit codes: 0 clean, 1 violations found, 2 the read did not account for every
// row, 3 the run was degraded by an allowed mismatch. A degraded run gets its
// own code so nothing gating on exit status reads it as success. --json takes
// the same codes and carries the same qualification inside the object, because
// the machine-readable path was once the one place the guard did not apply.
//
// The allowance names the sets it covers. It was a single boolean once, tested
// against the combined list, so it waved through a short read of any set
// including the cells under test, which is the exact failure the count check
// exists to catch. Naming the set means a short read of EncyclopediaCells still
// stops the world while the DesignLanguages disagreement is waved through.
//
// The plain invocation exits 2 against production today, and that is the guard
// working rather than a bug here: DesignLanguages pages 1278 rows while the
// server counts 1279 as read on 2026-09-09, a disagreement filed against Temper
// and confirmed independently that day. It is live production state and may be
// fixed under you, so re-check the numbers before trusting this note. Until
// that is fixed, a clean run needs --allow-count-mismatch, which reports over
// what was read and prints the mismatch at the top and in the summary line.
//
// It answers both directions. Everything the violation rules do walks cells and
// asks what they point at; the placement section walks records and asks which of
// them nothing points at. That second half is what the skill's placement rule
// needs and what nobody could run: the rule was written and its first case
// documented by hand, but the count was something someone had to remember to
// work out. Read it per set. The lanes are at different stages, and on
// 2026-09-09 the writing lane had one unplaced record while design languages had
// 784, so the combined 1,287 is true of neither.
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
import { MANIFESTATION_ENTITY_SETS } from "../ui/src/lib/encyclopedia-schema.ts";

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
  // A manifestation names an entity SET and an id. Checking the id alone lets a
  // record that exists in a different set read as present, so both are keyed.
  const key = (entitySet, entityId) => `${entitySet}:${entityId}`;
  const known = records === null ? null
    : records instanceof Map ? new Set([...records.keys()])
    : new Set([...records]);
  const statusOf = (entitySet, entityId) => (records instanceof Map ? records.get(key(entitySet, entityId)) ?? records.get(entityId) : null);
  // A bare id is still accepted so a caller with only ids keeps working, but a
  // keyed entry is required to match when the caller supplies keys.
  const exists = (entitySet, entityId) => known === null || known.has(key(entitySet, entityId))
    || (![...known].some((entry) => entry.includes(":")) && known.has(entityId));

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
    // Valid JSON that is not an object at all: `null`, a number, an array. This
    // has to come before any field is touched, or the sweep dies on `doc.name`.
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) { add("unparseable", id, `the document is ${describe(doc)}, not an object`); continue; }
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
      if (!exists(entry.entitySet, entry.entityId)) add("dangling-manifestation", id, `no ${entry.entitySet} record with this id exists`, entry.entityId);
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

  return { violations, parsed, context: breadthTell(parsed, childrenById, records) };
}

// The tell, never a finding. Counting a cell's children looked like it could be
// an invariant and it is not: breadth is about what a cell claims, and children
// only correlate with it. The numbers are printed so they stay visible and nobody
// rediscovers the rule and ships it. Written by the leaf-cells run of 2026-09-09,
// which reached this independently, and folded in here so the collection has one
// gap watch rather than two.
export function breadthTell(parsed, childrenById, records = null) {
  const statusOfRecord = (entitySet, entityId) => (records instanceof Map
    ? records.get(`${entitySet}:${entityId}`) ?? records.get(entityId)
    : null);
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
  // Counted both ways over ONE snapshot, set-qualified and by bare id, because
  // the count-neutrality of the keying is the actual claim and the collection
  // moves underneath a comparison made across two runs. If they disagree, the
  // keying changed what is counted and the run says so instead of picking one.
  let archived = 0;
  let archivedByBareId = 0;
  if (records instanceof Map) {
    const bare = new Map();
    for (const [entryKey, status] of records) bare.set(entryKey.includes(":") ? entryKey.slice(entryKey.indexOf(":") + 1) : entryKey, status);
    for (const [, doc] of parsed) {
      for (const entry of doc.manifestations) {
        if (!entry || typeof entry !== "object") continue;
        if (statusOfRecord(entry.entitySet, entry.entityId) === "Archived") archived += 1;
        if (bare.get(entry.entityId) === "Archived") archivedByBareId += 1;
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
    archivedManifestationsByBareId: archivedByBareId,
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

// `--allow-count-mismatch=A,B` names the sets whose mismatch may be waved
// through. The bare flag names nothing and is refused, because the whole point
// is that it cannot cover the set under test by accident.
// ---- the placement pass: which records no cell holds
//
// The other direction. Everything above walks cells and asks what they point at;
// this walks records and asks which of them nothing points at. That is the half
// the skill's placement rule needs and the half nobody could run: the rule was
// written, its first case was documented by hand, and the count was something
// someone had to remember to work out.
//
// Two definitions decide the number, and both are stated because a count without
// its measure is what two runs disagree over:
//
//   PLACED  - at least one live cell names the record in `manifestations`. A cell
//             that is archived or unattested holds nothing, because a reader
//             never reaches it.
//   IN SCOPE - the record is not Archived. An archived record does not need a
//             home, so counting it unplaced would make the number grow every time
//             something is correctly retired.
//
// Archived-but-placed is reported separately rather than folded in. It is legal:
// a cell link must point at a live Draft, a manifestation may name a row in any
// status, and the collection attaches archived records with "(Archived)" in the
// explanation. Folding it into either count would hide a deliberate practice.
export function placement(parsed, records, names = new Map()) {
  const held = new Map();
  for (const [cellId, doc] of parsed) {
    for (const entry of doc.manifestations ?? []) {
      if (!entry || typeof entry !== "object") continue;
      const id = `${entry.entitySet}:${entry.entityId}`;
      if (!held.has(id)) held.set(id, []);
      held.get(id).push(cellId);
    }
  }
  const rows = [];
  for (const [id, record] of records) {
    const [set, entityId] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
    rows.push({ set, entityId, name: names.get(id) ?? null, status: record, cells: held.get(id) ?? [] });
  }
  rows.sort((a, b) => (a.set + (a.name ?? a.entityId)).localeCompare(b.set + (b.name ?? b.entityId)));
  const inScope = rows.filter((row) => row.status !== "Archived");
  return {
    rows,
    unplaced: inScope.filter((row) => row.cells.length === 0),
    placed: inScope.filter((row) => row.cells.length > 0),
    archivedButPlaced: rows.filter((row) => row.status === "Archived" && row.cells.length > 0),
    // A record named by a cell that does not exist among the records read. The
    // cell side already fails on this; counted here so the two halves of one run
    // cannot report different totals without saying so.
    danglingIds: [...held.keys()].filter((id) => !records.has(id)),
  };
}

// The same numbers the human report leads with. One function, so the two paths
// cannot disagree about what was measured.
export function placementSummary(place) {
  const sets = [...new Set(place.rows.map((row) => row.set))].sort();
  return {
    bySet: Object.fromEntries(sets.map((set) => [set, {
      placed: place.placed.filter((row) => row.set === set).length,
      unplaced: place.unplaced.filter((row) => row.set === set).length,
    }])),
    placed: place.placed.length,
    unplaced: place.unplaced.length,
    archivedButPlaced: place.archivedButPlaced.length,
    danglingIds: place.danglingIds,
  };
}

export function allowedSets(argv) {
  const sets = new Set();
  for (const argument of argv) {
    if (argument === "--allow-count-mismatch") {
      throw new Error("--allow-count-mismatch needs the sets it covers, for example --allow-count-mismatch=DesignLanguages");
    }
    if (argument.startsWith("--allow-count-mismatch=")) {
      for (const name of argument.slice("--allow-count-mismatch=".length).split(",")) {
        if (name.trim()) sets.add(name.trim());
      }
    }
  }
  return sets;
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
    // Count distinct entities, not row objects: a page that repeats a row would
    // otherwise reconcile while a row elsewhere was never read.
    const distinct = new Set(rows.map((row) => row.entity_id)).size;
    if (distinct !== rows.length) shortReads.push({ set, detail: `returned ${rows.length} rows for ${distinct} distinct entities, so ${rows.length - distinct} row(s) were repeated` });
    const mismatch = reconcileRead(set, distinct, counted);
    if (mismatch) shortReads.push(mismatch);
    return rows;
  };
  const cells = await readAll("EncyclopediaCells");
  const records = new Map();
  const recordNames = new Map();
  for (const set of MANIFESTATION_ENTITY_SETS) {
    for (const row of await readAll(set)) {
      records.set(`${set}:${row.entity_id}`, row.status);
      recordNames.set(`${set}:${row.entity_id}`, row.fields?.name ?? null);
    }
  }
  // A watch that goes green without seeing the data is worse than no watch, so a
  // read that does not account for every row fails the run rather than reporting
  // a clean result. Found by the verifier on 2026-09-09: with paging stopped
  // early the sweep reported zero while a broken cell sat unread on page two.
  const { violations, parsed, context } = checkCollection(cells, records);
  const allowed = allowedSets(process.argv);
  const waved = shortReads.filter((line) => allowed.has(line.set));
  const fatal = shortReads.filter((line) => !allowed.has(line.set));
  const asJson = process.argv.includes("--json");
  // Computed before the --json branch, not after it. The comment below records
  // that --json once returned before the exit-code logic ran and drifted from the
  // human path; adding a section after that return would repeat it exactly.
  const place = placement(parsed, records, recordNames);

  // One place decides the code, so the machine-readable path cannot drift from
  // the human one. It did: --json returned before any of this ran, so a caller
  // gating on exit status saw success through violations and through a waved
  // mismatch alike, and the degraded warning was printed as prose in front of
  // the object, which made the stream unparseable as JSON.
  const status = fatal.length > 0 ? 2 : waved.length > 0 ? 3 : violations.length > 0 ? 1 : 0;
  const read = {
    reconciled: shortReads.length === 0,
    allowedSets: [...allowed],
    mismatches: shortReads.map((line) => ({ set: line.set, detail: line.detail, waved: allowed.has(line.set) })),
  };

  if (asJson) {
    // Nothing but the object goes to stdout, so the stream always parses. The
    // qualification travels inside it rather than as a line above it.
    console.log(JSON.stringify(fatal.length > 0
      ? { exitCode: status, read, violations: null, context: null,
          note: "the read did not account for every row, so nothing is reported about the collection" }
      : { exitCode: status, read, violations, context, placement: placementSummary(place) }, null, 2));
    process.exitCode = status;
    return;
  }

  if (fatal.length > 0) {
    console.log("The read did not account for every row, so this run reports nothing about the collection:");
    for (const line of fatal) console.log(`  ${line.set}: ${line.detail}`);
    if (allowed.size > 0) console.log(`  (--allow-count-mismatch covers ${[...allowed].join(", ")}, which does not cover the above)`);
    process.exitCode = status;
    return;
  }
  if (waved.length > 0) {
    console.log(`DEGRADED RUN. A mismatch was allowed for ${[...allowed].join(", ")}, so every number below is over what was read rather than over the collection:`);
    for (const line of waved) console.log(`  ${line.set}: ${line.detail}`);
  }
  const byRule = new Map();
  for (const violation of violations) byRule.set(violation.rule, (byRule.get(violation.rule) ?? 0) + 1);
  console.log(`${context.cells} live attested cells, ${context.manifestations} manifestations, ${records.size} records; ${waved.length === 0 ? "every page reconciled against @odata.count" : "THE READ DID NOT RECONCILE (see above), so these counts are over what was read"}`);
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
  if (context.archivedManifestations !== context.archivedManifestationsByBareId) {
    console.log(`    counted by bare id over the same snapshot: ${context.archivedManifestationsByBareId}. The two disagree, so keying on the entity set changed what is counted; do not report either number alone.`);
  }
  console.log(`\nWhat the misplacement rule did NOT check. It matches a descendant's name literally`);
  console.log(`inside the credit, so a paraphrased misplacement passes, and it is only active where`);
  console.log(`a cell has something below it. The zero above is honest and narrower than it reads.`);
  console.log(`  cells the rule is structurally active on: ${context.depthRuleActiveOn} of ${context.cells}`);
  console.log(`  credits that literally contain even their own cell's name: ${context.creditsNamingTheirOwnCell} of ${context.creditsTotal}`);

  const setsSeen = [...new Set(place.rows.map((row) => row.set))].sort();
  const summary = placementSummary(place);
  console.log(`\nPLACEMENT. Which records no cell holds, which is the other direction from`);
  console.log(`everything above. Placed means at least one LIVE cell names the record in its`);
  console.log(`manifestations, because a reader never reaches an archived or unattested cell.`);
  console.log(`In scope means the record is not Archived: a retired record does not need a`);
  console.log(`home, and counting it unplaced would grow this number every time something is`);
  console.log(`correctly retired.`);
  console.log(``);
  console.log(`  PER SET, and read it per set. The lanes are at completely different stages of`);
  console.log(`  the placement work, so one combined number describes none of them:`);
  console.log(`  on 2026-09-09 the writing lane had one unplaced record and design languages`);
  console.log(`  had 784, and "1287 unplaced" is true of neither.`);
  console.log(`    ${"set".padEnd(18)} ${"placed".padStart(7)} ${"unplaced".padStart(9)} ${"in scope".padStart(9)}`);
  for (const set of setsSeen) {
    const { placed: placedIn, unplaced: unplacedIn } = summary.bySet[set];
    console.log(`    ${set.padEnd(18)} ${String(placedIn).padStart(7)} ${String(unplacedIn).padStart(9)} ${String(placedIn + unplacedIn).padStart(9)}`);
  }
  console.log(`    ${"all".padEnd(18)} ${String(summary.placed).padStart(7)} ${String(summary.unplaced).padStart(9)} ${String(summary.placed + summary.unplaced).padStart(9)}`);

  // A report nobody runs twice is a report that does not exist. Listing 1,287
  // records is 65KB of wall, so the default names a few per set and says how
  // many it withheld; --unplaced prints all of them.
  const listAll = process.argv.includes("--unplaced");
  const SHOWN = 8;
  for (const set of setsSeen) {
    const rows = place.unplaced.filter((row) => row.set === set);
    if (rows.length === 0) continue;
    console.log(`\n  unplaced ${set} (${rows.length}):`);
    for (const row of listAll ? rows : rows.slice(0, SHOWN)) {
      console.log(`      ${row.name ?? row.entityId}  [${row.status}]`);
    }
    if (!listAll && rows.length > SHOWN) console.log(`      ... and ${rows.length - SHOWN} more; pass --unplaced to list every one`);
  }
  console.log(`\n  archived records a cell still names: ${place.archivedButPlaced.length} (legal: a cell link`);
  console.log(`    must point at a live Draft, a manifestation may name a row in any status, and`);
  console.log(`    these say "(Archived)" in their explanation)`);
  if (place.danglingIds.length) {
    console.log(`  named by a cell but absent from every record set: ${place.danglingIds.length} ${place.danglingIds.join(", ")}`);
    console.log(`    (the dangling-manifestation rule above counts these too; if the two disagree, say so rather than picking one)`);
  }
  process.exitCode = status;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
