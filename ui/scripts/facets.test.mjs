// Shared contract vectors for the facet derivations. The Rust finalizer port
// MUST satisfy the same vectors so pipeline + backfill never drift.
// Run: node ui/scripts/facets.test.mjs
import { hueBucket, familyId, searchBlob } from "./facets.mjs";

let fails = 0;
const eq = (got, want, msg) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fails++;
    console.error(`FAIL ${msg}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
};

// --- hueBucket ---
eq(hueBucket({ colors: { primary: "#ff0000" } }), "red", "pure red");
eq(hueBucket({ colors: { primary: "#00ff00" } }), "green", "pure green");
eq(hueBucket({ colors: { primary: "#0000ff" } }), "blue", "pure blue");
eq(hueBucket({ colors: { primary: "#00ced1" } }), "teal", "darkturquoise→teal");
eq(hueBucket({ colors: { primary: "#8a2be2" } }), "violet", "blueviolet→violet");
eq(hueBucket({ colors: { primary: "#ff69b4" } }), "pink", "hotpink→pink");
eq(hueBucket({ colors: { primary: "#888888" } }), "neutral", "grayscale→neutral");
eq(hueBucket({ colors: { primary: "#fff" } }), "neutral", "white 3-digit→neutral");
eq(hueBucket({ colors: { primary: "#f00" } }), "red", "3-digit red");
eq(hueBucket({ colors: { accent: "#0000ff" } }), "blue", "falls back to accent");
eq(hueBucket({ colors: {} }), "neutral", "no color→neutral");
eq(hueBucket(undefined), "neutral", "no tokens→neutral");
eq(hueBucket('{"colors":{"primary":"#ff0000"}}'), "red", "accepts JSON string");
eq(hueBucket({ colors: { primary: "#ff000" } }), "neutral", "5-digit malformed→neutral (normalized, not pink)");
eq(hueBucket({ colors: { primary: "#ff0000aa" } }), "neutral", "8-digit alpha→neutral (normalized)");
eq(hueBucket({ colors: { primary: "rgb(255,0,0)" } }), "neutral", "non-hex→neutral");

// --- familyId ---
const tree = new Map([
  ["leaf-poster", { parentId: "mid-print" }],
  ["mid-print", { parentId: "root-graphic" }],
  ["root-graphic", { parentId: "" }],
  ["leaf-orphan", { parentId: "ghost-missing" }],
]);
eq(familyId(["leaf-poster"], tree), "root-graphic", "walks leaf→root");
eq(familyId(["mid-print"], tree), "root-graphic", "mid→root");
eq(familyId(["root-graphic"], tree), "root-graphic", "root→itself");
eq(familyId(["leaf-orphan"], tree), "leaf-orphan", "missing parent stops at known node");
eq(familyId(["unknown-x", "leaf-poster"], tree), "root-graphic", "skips unknown, uses first known leaf");
eq(familyId([], tree), "", "no taxonomy→empty");
eq(familyId('["leaf-poster"]', tree), "root-graphic", "accepts JSON string");

// --- searchBlob ---
eq(searchBlob("Cadence", ["Editorial", "Grid"], { summary: "A Bold System" }),
   "cadence editorial grid a bold system", "lowercased blob");
eq(searchBlob("Warm Editorial", '["warm"]', '{"summary":"Soft"}'),
   "warm editorial warm soft", "accepts JSON strings");
eq(searchBlob("X", [], null), "x", "minimal");

if (fails) {
  console.error(`\n${fails} test(s) FAILED`);
  process.exit(1);
}
console.log("facets: all vectors pass");
