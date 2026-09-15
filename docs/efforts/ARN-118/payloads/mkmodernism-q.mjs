// Builds batch ART-4: one revision of the `modernism` cell that adds the
// question about the archived id, and re-checks that the seven questions the
// cell already holds are still true after ART-3 placed its children.
//
// A pass that gives a cell children revisits that cell's questions. This runs
// after ART-3 rather than inside it because the archived-id finding came from
// the owner's review of the report, not from the placement work.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ADDED = "An archived cell holds the id early-modernist-european-painting, and the encyclopedia skill's worked example still uses that id as Impressionism's parent. It was not reused here, because archive is final and an id may never be repointed at a different cell. This cell was minted at a fresh id.";

const rows = JSON.parse(readFileSync('./cells-raw.json', 'utf8'));
const live = new Map();
const archived = new Set();
for (const r of rows) {
  const f = r.fields || {};
  if (r.status === 'Archived') { archived.add(f.id); continue; }
  if (typeof f.document !== 'string' || !f.document.trim()) continue;
  live.set(f.id, f);
}

// The question states a fact about production, so check it against production
// rather than against the report that produced it.
if (!archived.has('early-modernist-european-painting')) {
  throw new Error('early-modernist-european-painting is not an archived row in this read; the question would be false');
}

const held = live.get('modernism');
if (!held) throw new Error('no live `modernism` cell in this read');
const doc = JSON.parse(held.document);

// Every child ART-3 placed still points here, and the questions below still
// describe cells this pass left alone. Both are checked rather than assumed,
// because three cells in this effort ended up telling the owner something the
// same pass had just made false.
const children = [...live].filter(([, f]) => (JSON.parse(f.document).broader || []).some((b) => b.cellId === 'modernism')).map(([id]) => id);
if (children.length !== 9) throw new Error(`expected 9 children of modernism, found ${children.length}: ${children.join(', ')}`);
const stillRoots = ['abstract-art', 'constructivism', 'impressionism', 'post-impressionism', 'symbolism', 'fluxus', 'arte-povera', 'gutai', 'cobra', 'nouveau-realisme', 'school-of-paris', 'minimalism', 'pop-art', 'conceptual-art', 'land-art', 'process-art'];
for (const id of stillRoots) {
  const f = live.get(id);
  if (!f) throw new Error(`the questions name ${id}, which is not a live cell`);
  if ((JSON.parse(f.document).broader || []).some((b) => b.cellId === 'modernism')) {
    throw new Error(`the questions say ${id} is not a child, and it is; rewrite the question before writing this batch`);
  }
}

if (doc.questions.includes(ADDED)) throw new Error('the cell already carries this question; nothing to write');
doc.questions = [...doc.questions, ADDED];

const payload = {
  batch: 'ART-4',
  approval: 'The owner asked on 2026-09-09, reviewing the ART-3 report, for the archived `early-modernist-european-painting` row and the reason it was not reused to be named on the cell, so the next reader who finds it does not spend an hour on the same question.',
  allowedOperation: 'Define private Draft EncyclopediaCell documents for batch ART-4 (Modernism questions), contract version 3: one added `questions` entry on an existing cell; no change of status, no links and no studies.',
  cells: [{
    number: 1,
    name: doc.name,
    id: 'modernism',
    new: false,
    version: 3,
    baseHash: createHash('sha256').update(held.document).digest('hex'),
    description: doc.description,
    provenance: doc.provenance,
    maps: doc.maps,
    sources: doc.sources,
    broader: doc.broader,
    relations: doc.relations || [],
    questions: doc.questions,
    manifestations: doc.manifestations || [],
    studies: doc.studies || [],
  }],
};
writeFileSync('./batch-art-4.json', JSON.stringify(payload, null, 1) + '\n');
console.log(`batch-art-4.json: 1 revision, questions ${doc.questions.length - 1} -> ${doc.questions.length}, ${children.length} children confirmed, ${stillRoots.length} named non-children confirmed`);
