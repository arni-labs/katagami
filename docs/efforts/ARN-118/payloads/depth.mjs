// Root count and depth histogram for the art map, for production as read and
// for production plus the unapplied payloads. Archived cells are excluded: the
// status lives on the row as `status`, not inside `fields`.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const rows = JSON.parse(readFileSync('./cells-raw.json', 'utf8'));
const docs = new Map();
let archived = 0;
let attested = 0;
for (const r of rows) {
  const f = r.fields || {};
  if (r.status === 'Archived') { archived += 1; continue; }
  if (typeof f.document !== 'string' || !f.document.trim()) continue;
  if (f.document_validated === true && createHash('sha256').update(f.document).digest('hex') === f.document_hash) attested += 1;
  docs.set(f.id, JSON.parse(f.document));
}
console.log(`rows ${rows.length}, archived ${archived}, live with a document ${docs.size}, attested ${attested}`);

function report(label, d) {
  const art = new Set([...d].filter(([, x]) => (x.maps || []).some((m) => m.map === 'art')).map(([k]) => k));
  const parents = new Map();
  for (const id of art) parents.set(id, (d.get(id).broader || []).map((b) => b.cellId).filter((p) => art.has(p)));
  const depth = new Map();
  const of = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 1;
    seen.add(id);
    const ps = parents.get(id) || [];
    const v = ps.length === 0 ? 1 : 1 + Math.min(...ps.map((p) => of(p, new Set(seen))));
    depth.set(id, v);
    return v;
  };
  const hist = {};
  for (const id of art) { const v = of(id); hist[v] = (hist[v] || 0) + 1; }
  const roots = [...art].filter((id) => (parents.get(id) || []).length === 0);
  console.log(`${label}: ${art.size} art cells, ${roots.length} roots, depths ${JSON.stringify(hist)}`);
  return { art, parents, roots };
}

report('production as read', docs);

const after = new Map([...docs].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
for (const f of ['batch-art-1.json', 'batch-art-2.json']) {
  let b;
  try { b = JSON.parse(readFileSync(`./${f}`, 'utf8')); } catch { continue; }
  for (const c of b.cells) {
    after.set(c.id, { version: 3, name: c.name, description: c.description, provenance: c.provenance, maps: c.maps, broader: c.broader, relations: c.relations, questions: c.questions, sources: c.sources, manifestations: c.manifestations, studies: c.studies });
  }
}
const post = report('with the payloads applied', after);
if (process.argv[2] === '--roots') console.log('\n' + post.roots.sort().join('\n'));
