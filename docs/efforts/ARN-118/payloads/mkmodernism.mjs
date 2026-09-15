// Builds batch ART-3 (Modernism) from a fresh read of production.
//
// Rebuild before every apply. Each of the nine children is a revision, so the
// payload states a `baseHash` taken from the document exactly as production
// returned it, and the loader refuses any cell another run has moved since.
// The plan below is the input; this script only reads the current documents,
// appends one `broader` entry and the source that entry cites, and leaves
// every other field as production holds it.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SOURCES = {
  'tate-modernism': { title: 'Modernism — Tate art term', url: 'https://www.tate.org.uk/art/art-terms/m/modernism' },
  'wp-modernism': { title: 'Modernism — Wikipedia', url: 'https://en.wikipedia.org/wiki/Modernism' },
  'wd-q878985': { title: 'modernism (Q878985) — Wikidata', url: 'https://www.wikidata.org/wiki/Q878985' },
  'tate-fauvism': { title: 'Fauvism — Tate art term', url: 'https://www.tate.org.uk/art/art-terms/f/fauvism' },
  'tate-futurism': { title: 'Futurism — Tate art term', url: 'https://www.tate.org.uk/art/art-terms/f/futurism' },
  'wd-q42934': { title: 'cubism (Q42934) — Wikidata', url: 'https://www.wikidata.org/wiki/Q42934' },
};

// One entry per child: the explanation the link carries, the sources that
// explanation cites, and any of those sources the cell does not already hold.
const PLAN = [
  {
    number: 2, id: 'expressionism',
    explanation: 'Its own article opens by calling Expressionism a modernist movement in poetry and painting, beginning in northern Europe around 1900.',
    sourceIds: ['wp-expressionism'], add: [],
  },
  {
    number: 3, id: 'fauvism',
    explanation: "Tate's page for Fauvism calls it one of the first avant-garde modernist movements of the twentieth century.",
    sourceIds: ['tate-fauvism'], add: ['tate-fauvism'],
  },
  {
    number: 4, id: 'futurism',
    explanation: 'Tate counts Futurism among modernist movements, and says it was exceptionally vehement in denouncing the past.',
    sourceIds: ['tate-futurism'], add: ['tate-futurism'],
  },
  {
    number: 5, id: 'cubism',
    explanation: "Neither Tate's page for Cubism nor the Wikipedia article calls Cubism modernist. Wikidata files cubism as part of modernism.",
    sourceIds: ['wd-q42934'], add: ['wd-q42934'],
  },
  {
    number: 6, id: 'american-modernism',
    explanation: 'Wikidata files American modernism as a subclass of modernism.',
    sourceIds: ['wd-q4745501'], add: [],
  },
  {
    number: 7, id: 'international-typographic-style',
    explanation: 'Its own article calls the style a modernist graphic movement, and places it within the modernist movement.',
    sourceIds: ['wp-its'], add: [],
  },
  {
    number: 8, id: 'surrealism',
    explanation: "Surrealism's own Tate page does not call Surrealism modernist. The Modernism article says that in the painting of the 1920s and 1930s Surrealism was among the movements that defined modernism, and that the public came to regard Surrealism as the most extreme form of modernism.",
    sourceIds: ['wp-modernism'], add: ['wp-modernism'],
  },
  {
    number: 9, id: 'dada',
    explanation: "Dada's own article does not call Dada modernist. The Modernism article names Dada among the movements that defined modernism in the painting of the 1920s and 1930s.",
    sourceIds: ['wp-modernism'], add: ['wp-modernism'],
  },
  {
    number: 10, id: 'bauhaus',
    explanation: "Bauhaus's own article goes no further than calling the Bauhaus style one of the most influential currents in modernist architecture. The Modernism article names it among the movements that defined modernism in the painting of the 1920s and 1930s.",
    sourceIds: ['wp-modernism', 'wp-bauhaus'], add: ['wp-modernism'],
  },
];

const rows = JSON.parse(readFileSync('./cells-raw.json', 'utf8'));
const live = new Map();
for (const r of rows) {
  const f = r.fields || {};
  // Status lives on the row, beside `fields` and not inside it. Reading it from
  // the wrong key counted 17 archived cells as live on an earlier run.
  if (r.status === 'Archived') continue;
  if (typeof f.document !== 'string' || !f.document.trim()) continue;
  live.set(f.id, { row: r, fields: f });
}

if (live.has('modernism')) throw new Error('a live cell already holds the id `modernism`; re-read before deciding what to write');

const modernism = {
  number: 1,
  name: 'Modernism',
  id: 'modernism',
  new: true,
  version: 3,
  description: "Art that rejects the past as a model for the present. Tate names the principles: a rejection of history and of conservative values such as realistic depiction, innovation and experiment with form, tending to abstraction, and an emphasis on materials, techniques and processes. Modernist work draws attention to how it was made and what it was made from, and it gave up absolute originality for collage, reprise, rewriting, recapitulation and parody. Tate applies the term to a succession of movements that critics and historians have identified, from Courbet's realism to the abstraction of the 1960s, when Clement Greenberg's theory of modernist painting narrowed it and postmodernism formed against it.",
  provenance: { basis: 'cited' },
  maps: [
    { map: 'art', explanation: 'Tate defines modernism as a broad movement in Western art, architecture and design, and Wikipedia names the visual arts among its fields.', sourceIds: ['tate-modernism', 'wp-modernism'] },
    { map: 'writing', explanation: "Wikipedia's first sentence names literature among the fields the movement covers.", sourceIds: ['wp-modernism'] },
    { map: 'design', explanation: 'Tate defines modernism as a broad movement in Western art, architecture and design.', sourceIds: ['tate-modernism'] },
  ],
  sources: ['tate-modernism', 'wp-modernism', 'wd-q878985'].map((id) => ({ id, ...SOURCES[id] })),
  broader: [],
  relations: [],
  questions: [
    "Abstract art is a root and no source checked puts it here. Its own Wikipedia article, Tate's abstract art page and Wikidata all stop short of placing abstract art under modernism, and Wikidata files it under modern art instead. Tate's modernism page says only that the succession culminates in abstract art, which could mean that abstract art is inside modernism or that modernism ends where abstract art begins. Place it here once a source says abstract art is inside modernism.",
    'Constructivism is a root because the only sentence in the sources checked says socialist realism began to oust modernism in the Soviet Union, which had previously endorsed Russian Futurism and Constructivism. That implies Constructivism is part of modernism without saying so.',
    'This pass checked Impressionism, Post-Impressionism, Symbolism, Fluxus, Arte Povera, Gutai, CoBrA, Nouveau Réalisme and the School of Paris against their own pages, Tate, Wikidata and Getty AAT, and none of those sources places them under modernism. They stay roots.',
    'Their own articles call Minimalism, Pop art, Conceptual art and Land art reactions against modernism, so none of them is a child here, even though the Modernism article lists Minimalism and Pop art among late twentieth-century modernist movements.',
    'This cell is on the writing and design maps because its sources name literature, architecture and design, but the art pass placed every child so far. A writing pass and a design pass would each choose their own children.',
    'Modernism is used both as a direction and as a name for a period of roughly 1860 to 1970. Which sense does a reader browsing this cell expect, and does the scope need to say which one it means?',
    'Getty AAT has no concept for modernism as a parent. The records for Dada, Cubist, Surrealist, Constructivist, Expressionist, Futurist and Fauve each give a guide term in angle brackets as their only broader concept, a term that sorts by nation and period, so AAT contributes no children here.',
  ],
  manifestations: [],
  studies: [],
};

const cells = [modernism];
for (const item of PLAN) {
  const found = live.get(item.id);
  if (!found) throw new Error(`cell ${item.id} is not a live cell in this read`);
  const doc = JSON.parse(found.fields.document);
  const held = new Set(doc.sources.map((s) => s.id));
  for (const id of item.add) {
    if (held.has(id)) continue;
    if (!SOURCES[id]) throw new Error(`no citation recorded for source ${id}`);
    doc.sources.push({ id, ...SOURCES[id] });
    held.add(id);
  }
  for (const id of item.sourceIds) {
    if (!held.has(id)) throw new Error(`cell ${item.id} cites ${id}, which it does not hold and the plan does not add`);
  }
  if ((doc.broader || []).some((b) => b.cellId === 'modernism')) throw new Error(`cell ${item.id} already links to modernism; rebuild and drop it from the plan`);
  doc.broader = [...(doc.broader || []), { cellId: 'modernism', explanation: item.explanation, sourceIds: item.sourceIds }];
  cells.push({
    number: item.number,
    name: doc.name,
    id: item.id,
    new: false,
    version: 3,
    baseHash: createHash('sha256').update(found.fields.document).digest('hex'),
    description: doc.description,
    provenance: doc.provenance,
    maps: doc.maps,
    sources: doc.sources,
    broader: doc.broader,
    relations: doc.relations || [],
    questions: doc.questions || [],
    manifestations: doc.manifestations || [],
    studies: doc.studies || [],
  });
}

const payload = {
  batch: 'ART-3',
  approval: 'The owner approved minting a Modernism cell for the art lane on 2026-09-09, after an earlier pass reserved the decision for her (report-nesting-visual.md, item 1). Draft only; every mint and every link numbered in the report.',
  allowedOperation: 'Define private Draft EncyclopediaCell documents for batch ART-3 (Modernism), contract version 3: one new parent cell, nine broader links onto it, and the sources those links cite; no change of status and no studies.',
  cells,
};
writeFileSync('./batch-art-3.json', JSON.stringify(payload, null, 1) + '\n');
console.log(`batch-art-3.json: ${cells.length} cells (1 new, ${cells.length - 1} revisions)`);
