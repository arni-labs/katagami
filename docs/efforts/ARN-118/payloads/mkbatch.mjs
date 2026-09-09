// Builds the two Define payloads from plan.json and a snapshot of production
// taken by fetch-cells.mjs immediately before this runs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const plan = JSON.parse(readFileSync('./plan.json', 'utf8'));
const rows = JSON.parse(readFileSync('./cells-raw.json', 'utf8'));

// A cell's lifecycle status lives on the row as `status`, beside `fields` and
// not inside it (D58). Archived rows carry a document like any other, so a
// builder that reads only `fields` counts them as live: it would revise an
// archived cell, or write a link into one and pass the attestation check on the
// way, which is exactly how the Safavid link nearly landed. Archive is final,
// so archived rows are not a place a link may point.
const live = new Map();
const archivedIds = new Set();
let archived = 0;
for (const r of rows) {
  const f = r.fields || {};
  if (r.status === 'Archived') { archived += 1; if (f.id) archivedIds.add(f.id); continue; }
  if (typeof f.document !== 'string' || !f.document.trim()) continue;
  live.set(f.id, {
    hash: createHash('sha256').update(f.document).digest('hex'),
    validated: f.document_validated === true,
    storedHash: f.document_hash,
    parsed: JSON.parse(f.document),
  });
}
console.error(`snapshot holds ${live.size} live cells, ${archived} archived and excluded`);

const problems = [];
const built = [];

for (const c of plan.newCells) {
  // Another run created this parent while this one was reading. Its cell stands;
  // we only need the links that land on it.
  if (live.has(c.id)) { console.error(`parent already created by another run: ${c.id}`); continue; }
  built.push({
    number: 0, name: c.name, id: c.id, new: true, version: 3,
    description: c.description, provenance: { basis: 'cited' },
    maps: c.maps, sources: c.sources, broader: [], relations: [],
    questions: c.questions || [], manifestations: [], studies: [],
  });
}
const newIds = new Set(built.filter((c) => c.new).map((c) => c.id));

const byChild = new Map();
for (const e of plan.edges) {
  if (!byChild.has(e.child)) byChild.set(e.child, []);
  byChild.get(e.child).push(e);
}

for (const [childId, edges] of byChild) {
  const row = live.get(childId);
  // Say which of the two it is. "not found" is what sent two agents into an
  // argument about whether a row existed, when they disagreed about whether
  // archived counts as existing (D58).
  if (!row) { problems.push(`child ${childId} ${archivedIds.has(childId) ? 'is archived, and archive is final' : 'is not in the snapshot'}`); continue; }
  const doc = JSON.parse(JSON.stringify(row.parsed));
  // Only add a source when a link this run is actually writing cites it, so a
  // link another run already wrote does not cause a pointless rewrite.
  const pending = edges.filter((e) => !doc.broader.some((b) => b.cellId === e.parent));
  const needed = new Set(pending.flatMap((e) => e.sourceIds));
  for (const s of plan.addSources[childId] || []) {
    if (needed.has(s.id) && !doc.sources.some((x) => x.id === s.id)) doc.sources.push(s);
  }
  const have = new Set(doc.sources.map((s) => s.id));
  for (const e of edges) {
    // Another run may have written this link already. Skip it before checking
    // anything else, so a link we are not writing cannot fail the build.
    if (doc.broader.some((b) => b.cellId === e.parent)) { console.error(`already linked: ${childId} -> ${e.parent}`); continue; }
    for (const sid of e.sourceIds) {
      if (!have.has(sid)) problems.push(`${childId}: link to ${e.parent} cites '${sid}', absent from its sources (${[...have].join(' ')})`);
    }
    const parent = live.get(e.parent);
    if (!parent && !newIds.has(e.parent)) { problems.push(`${childId}: parent ${e.parent} ${archivedIds.has(e.parent) ? 'is archived, so no link may point at it' : 'is not in the snapshot'}`); continue; }
    if (parent && !newIds.has(e.parent) && !(parent.validated && parent.hash === parent.storedHash)) {
      problems.push(`${childId}: parent ${e.parent} is not attested`);
    }
    doc.broader.push({ cellId: e.parent, explanation: e.explanation, sourceIds: e.sourceIds });
  }
  // The insertion move, D38. `nesting` has stopped writing and said in each of
  // these four cases that its link goes to the grandparent and loses, so the
  // grandparent link is removed in the same payload that adds the middle one.
  for (const grandparent of (plan.drops || {})[childId] || []) {
    const was = doc.broader.length;
    doc.broader = doc.broader.filter((b) => b.cellId !== grandparent);
    if (doc.broader.length === was) console.error(`drop skipped: ${childId} does not link to ${grandparent}`);
    else console.error(`dropped ${childId} -> ${grandparent}, the grandparent of a link this batch adds`);
  }
  if (!doc.broader.length && (plan.drops || {})[childId]) problems.push(`${childId}: every parent was dropped`);
  if (JSON.stringify(doc) === JSON.stringify(row.parsed)) { console.error(`no change: ${childId}`); continue; }
  built.push({
    number: 0, name: doc.name, id: childId, new: false, version: 3, baseHash: row.hash,
    description: doc.description, provenance: doc.provenance,
    maps: doc.maps, sources: doc.sources, broader: doc.broader, relations: doc.relations,
    questions: doc.questions, manifestations: doc.manifestations, studies: doc.studies,
  });
}

if (problems.length) { console.error('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }

const b1Ids = new Set([...newIds]);
let grew = true;
while (grew) {
  grew = false;
  for (const c of built) {
    if (b1Ids.has(c.id)) continue;
    if ((c.broader || []).some((b) => b1Ids.has(b.cellId))) { b1Ids.add(c.id); grew = true; }
  }
}
const b1 = built.filter((c) => b1Ids.has(c.id));
const b2 = built.filter((c) => !b1Ids.has(c.id));

const approval = 'Overnight run authorised by the owner on 2026-09-09 (OVERNIGHT.md, decision D40): nest the visual map on parents read from each cell own Wikipedia and Wikidata sources. Draft only; every mint numbered in the morning report.';
const emit = (path, batch, cells) => {
  writeFileSync(path, JSON.stringify({
    batch, approval,
    allowedOperation: `Define private Draft EncyclopediaCell documents for batch ${batch} (visual-map nesting), contract version 3: broader links, the sources those links cite, and the new parent cells the links land on; no change of status and no studies.`,
    cells: cells.map((c, i) => ({ ...c, number: i + 1 })),
  }, null, 1));
  console.error(`${path}: ${cells.length} cells`);
};
emit('./batch-art-1.json', 'ART-1', b1);
emit('./batch-art-2.json', 'ART-2', b2);
// Count what was emitted, not what was planned. `plan.newCells.length` is the
// intention; a parent another run had already created is skipped above, so the
// plan figure overstated the mints every time that happened — it said 3 new
// when 2 were written. Plan and effect are different numbers and only the
// second one is a result.
const newBuilt = built.filter((c) => c.new).length;
console.error(`total ${built.length} written (${newBuilt} new, ${built.length - newBuilt} revised)`);
if (newBuilt !== plan.newCells.length) {
  console.error(`  ${plan.newCells.length - newBuilt} planned parent(s) already existed and were not re-created`);
}
