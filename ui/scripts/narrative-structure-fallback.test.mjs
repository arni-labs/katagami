import assert from "node:assert/strict";
const FIXTURE = [{ id: "ring-composition", name: "Ring composition" }];

// The shape now under test: detail defers to the listing's own verdict.
function make({ list, get, parse = (r) => r }) {
  async function loadList() {
    let rows;
    try { rows = await list(); } catch { return { source: "fixture" }; }
    if (rows.length === 0) return { source: "fixture" };
    const out = [];
    for (const r of rows) { try { out.push(parse(r)); } catch { continue; } }
    if (out.length === 0) return { source: "fixture" };
    return { source: "temper" };
  }
  async function loadDetail(id) {
    const fromFixture = () => { const s = FIXTURE.find(c => c.id === id); return s ? { source: "fixture" } : null; };
    try { return { structure: await get(id), source: "temper" }; }
    catch (e) {
      if (!/OData 404\b/.test(String(e))) return fromFixture();
      const listing = await loadList();
      return listing.source === "fixture" ? fromFixture() : null;
    }
  }
  return { loadList, loadDetail };
}
const notFound = async () => { throw new Error("OData 404: not found"); };

// 1. installed + populated, record deleted -> 404
let a = make({ list: async () => [{ id: "other" }], get: notFound });
assert.equal(await a.loadDetail("ring-composition"), null);
console.log("ok: populated set, absent record -> 404");

// 2. installed but EMPTY -> listing serves fixture, so detail must too (round 3's defect)
let b = make({ list: async () => [], get: notFound });
assert.equal((await b.loadDetail("ring-composition"))?.source, "fixture", "empty set must not 404 every link");
console.log("ok: installed-but-empty -> fixture (round 3 defect gone)");

// 3. set not installed -> fixture (round 2's defect)
let c = make({ list: notFound, get: notFound });
assert.equal((await c.loadDetail("ring-composition"))?.source, "fixture");
console.log("ok: uninstalled set -> fixture (round 2 defect stays fixed)");

// 4. every row unparseable -> listing falls back, detail agrees
let d = make({ list: async () => [{ bad: true }], get: notFound, parse: () => { throw new Error("bad"); } });
assert.equal((await d.loadDetail("ring-composition"))?.source, "fixture");
console.log("ok: all-unparseable -> fixture, detail agrees with the listing");

// MUTATION: the round-2 shape (bare probe) fails case 2
async function roundTwo(id, { list, get }) {
  const fromFixture = () => ({ source: "fixture" });
  try { await get(id); } catch (e) {
    if (!/OData 404\b/.test(String(e))) return fromFixture();
    try { await list(); } catch { return fromFixture(); }
    return null;
  }
}
assert.equal(await roundTwo("ring-composition", { list: async () => [], get: notFound }), null,
  "round 2 returned null for an empty set — the defect this round fixes");
console.log("ok: mutation confirms round 2 404'd an installed-but-empty set");
