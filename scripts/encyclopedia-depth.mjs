// Where a made record sits in the graph, reported rather than enforced.
//
// D37 says a made record manifests a leaf. On 2026-09-09 one record ended up on
// a leaf and on an unrelated broad cell at once, each explanation true on its
// own, and the argument was settled by a structural observation: count the
// cell's children, because a cell with children is a parent. That observation
// looked like it could be an invariant, so it was written down as one and run
// against the collection.
//
// It failed, and the failure is the useful part. Against 738 live cells the
// strict reading returns over 150 findings, nearly all of them deliberate:
// `watercolour-painting` has one narrower child and is still the right home for
// dozens of records about watercolour generally, and `diaries`, `travel-writing`
// and `style-manuals` hold Pepys, Twain and Strunk on purpose, each with the
// reason written into the cell because the leaf those records need does not
// exist yet. A cell having a child does not make it broad in the sense D37
// means; breadth is about what the cell claims, and children only correlate
// with it.
//
// So this is a gap watch, in the sense the encyclopedia skill uses: it produces
// the next proposal, never a quiet fix and never a build failure. Read the
// findings, decide case by case, and expect most of them to be fine.

/**
 * @param {Array<{id: string, document: object}>} cells parsed cell documents
 * @returns {{onAParent: string[], atTwoDepths: string[]}} lines to read, not to enforce
 */
export function depthFindings(cells) {
  const children = new Map();
  for (const { id } of cells) children.set(id, 0);
  for (const { document } of cells) {
    for (const link of document.broader ?? []) {
      children.set(link.cellId, (children.get(link.cellId) ?? 0) + 1);
    }
  }

  const onAParent = new Set();
  const homes = new Map();
  for (const { id, document } of cells) {
    const kids = children.get(id) ?? 0;
    for (const m of document.manifestations ?? []) {
      const key = `${m.entitySet}:${m.entityId}`;
      if (!homes.has(key)) homes.set(key, []);
      homes.get(key).push({ cell: id, kids });
      if (kids > 0) {
        onAParent.add(
          `${id} carries ${key} and has ${kids} child${kids === 1 ? "" : "ren"}; check whether the record wants a narrower cell`,
        );
      }
    }
  }

  // The case that actually went wrong: one record on several cells, some of
  // which are parents. Worth a look even though plenty of these are fine too.
  const atTwoDepths = new Set();
  for (const [key, held] of homes) {
    if (held.length < 2) continue;
    if (!held.some((c) => c.kids > 0)) continue; // every home is childless: two claims at one depth
    atTwoDepths.add(
      `${key} is on ${held.length} cells of differing breadth (${held.map((c) => `${c.cell}:${c.kids}`).join(", ")})`,
    );
  }

  return { onAParent: [...onAParent].sort(), atTwoDepths: [...atTwoDepths].sort() };
}
