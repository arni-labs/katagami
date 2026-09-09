// Root count and depth histogram for the art map, for production as read and
// for production plus the two unapplied payloads.
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('./cells-raw.json', 'utf8'));
const docs = new Map();
for (const r of rows) {
  const f = r.fields || {};
  if (typeof f.document !== 'string' || !f.document.trim()) continue;
  docs.set(f.id, JSON.parse(f.document));
}

function report(label, docs) {
  const art = new Set([...docs].filter(([, d]) => (d.maps || []).some((m) => m.map === 'art')).map(([k]) => k));
  const parents = new Map();
  for (const id of art) parents.set(id, (docs.get(id).broader || []).map((b) => b.cellId).filter((p) => art.has(p)));
  const depth = new Map();
  const of = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 1;
    seen.add(id);
    const ps = parents.get(id) || [];
    const d = ps.length === 0 ? 1 : 1 + Math.min(...ps.map((p) => of(p, new Set(seen))));
    depth.set(id, d);
    return d;
  };
  const hist = {};
  for (const id of art) { const d = of(id); hist[d] = (hist[d] || 0) + 1; }
  const roots = [...art].filter((id) => (parents.get(id) || []).length === 0);
  console.log(`${label}: ${art.size} art cells, ${roots.length} roots`);
  console.log('  depth histogram', JSON.stringify(hist));
  return { art, parents, roots };
}

const before = report('production as read', docs);

const after = new Map([...docs].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
for (const f of ['batch-art-1.json', 'batch-art-2.json']) {
  const b = JSON.parse(readFileSync(`./${f}`, 'utf8'));
  for (const c of b.cells) {
    after.set(c.id, { version: 3, name: c.name, description: c.description, provenance: c.provenance, maps: c.maps, broader: c.broader, relations: c.relations, questions: c.questions, sources: c.sources, manifestations: c.manifestations, studies: c.studies });
  }
}
const post = report('with both payloads applied', after);

console.log('\nroots that would remain, by why they are still roots:');
console.log(post.roots.sort().join('\n'));
