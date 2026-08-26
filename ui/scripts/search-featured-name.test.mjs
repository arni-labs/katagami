// ARN-367 leftover after #257: GET /api/search?q=bluet was 200 count 0 on
// katagami.ai while Bluet was a live featured home card. Semantic-only
// Temper.Nearest never consulted the visitor-shelf names, so a featured
// language without a name-discriminative taste vector was invisible to its
// own name. This contract replays that live fixture against the real merge
// — it must fail if search goes back to accepting 0 hits for "bluet".
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  lexicalHits,
  lexicalScore,
  mergeSearchHits,
} from "../src/lib/search-lexical.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

// Live ids from katagami.ai 2026-08-26 (post #257 / 5ec2d00).
const BLUET = {
  id: "en-019f9a3e-1cbf-78d1-95e0-d4973005f6c8",
  kind: "language",
  name: "Bluet",
  slug: "bluet",
  tags: ["cyanotype"],
};
const KOMWARI = {
  id: "en-019ef79a-f581-7802-9d0d-3abe0e65f5b0",
  kind: "language",
  name: "Komawari",
  slug: "komawari",
  tags: [],
};
const KOMWARI_PLATES = {
  id: "en-019ef79a-d47f-7ed3-b47e-a16e19f136e8",
  kind: "palette",
  name: "Komawari Plates",
  slug: "komawari-plates",
  tags: [],
};
const GUST = {
  id: "en-gust-off-shelf",
  kind: "language",
  name: "Gust",
  slug: "gust",
  tags: [],
};

// Anonymous visitor shelf = featured/visitor-home only. Gust is Published
// but off-shelf and must not come back.
const visitorShelf = [BLUET, KOMWARI, KOMWARI_PLATES];

assert.equal(lexicalScore("bluet", BLUET), 1, "exact name/slug scores 1");
assert.equal(lexicalScore("Bluet", BLUET), 1, "case-insensitive");
assert.equal(lexicalScore("bluet", { ...BLUET, name: "Other", slug: "bluet" }), 1);
assert.ok(lexicalScore("bluet", GUST) === 0, "Gust is not a bluet match");
assert.ok(lexicalScore("gust", GUST) === 1, "Gust matches its own name when present");

console.log("ok: lexicalScore exact name/slug");

// Today's live semantic result for q=bluet: count 0. Merging that empty
// ranking with the visitor shelf MUST still surface Bluet. Passing on 0
// hits is the bug this file exists to catch.
const liveSemanticBluet = [];
const bluetHits = mergeSearchHits(
  lexicalHits("bluet", visitorShelf, 8),
  liveSemanticBluet,
  8,
);
assert.notEqual(
  bluetHits.length,
  0,
  "q=bluet must not stay the live 200/0 — Bluet is on the visitor shelf",
);
assert.ok(
  bluetHits.some((h) => h.id === BLUET.id && h.kind === "language" && h.name === "Bluet"),
  "q=bluet must include Bluet the language (the live home card)",
);
assert.ok(
  !bluetHits.some((h) => h.id === GUST.id || /gust/i.test(h.name)),
  "q=bluet must not leak Gust",
);

console.log("ok: q=bluet includes Bluet the language against today's live 200/0 fixture");

function hit(partial) {
  return { tags: [], slug: "", ...partial };
}

// Live prod after #257 (and the locked replay): q=komawari is 200/5 —
// Komawari + Komawari Plates first, then Kōka, Yūnagi, Tachikiri. The
// default k=8 meaning window also held 3 off-shelf rows that the
// membership filter stripped. Preview 913114c over-fetched, so three more
// featured meaning hits (Screentone Press, Shizuku, Plakat) filled those
// slots and the count became 8.
const KOKA = hit({
  id: "en-019ef830-83df-76a0-8fdd-58080a22da67",
  kind: "palette",
  name: "Kōka",
  score: 0.2405,
});
const YUNAGI = hit({
  id: "en-019ef73d-2fbf-7e33-88d5-bef9ccf7bf0a",
  kind: "language",
  name: "Yūnagi",
  score: 0.2311,
});
const TACHIKIRI = hit({
  id: "en-019ef820-29bb-7941-9720-bb01d0378e82",
  kind: "language",
  name: "Tachikiri",
  score: 0.2186,
});
const prodKomawariWindow = [
  hit({
    id: KOMWARI_PLATES.id,
    kind: "palette",
    name: "Komawari Plates",
    slug: "komawari-plates",
    score: 0.3519,
  }),
  hit({
    id: KOMWARI.id,
    kind: "language",
    name: "Komawari",
    slug: "komawari",
    score: 0.3455,
  }),
  KOKA,
  YUNAGI,
  TACHIKIRI,
  hit({ id: "en-off-1", kind: "language", name: "Off-1", score: 0.2 }),
  hit({ id: "en-off-2", kind: "language", name: "Off-2", score: 0.19 }),
  hit({ id: "en-off-3", kind: "language", name: "Off-3", score: 0.18 }),
];
const overfetchExtras = [
  hit({ id: "en-screentone", kind: "language", name: "Screentone Press", score: 0.21 }),
  hit({ id: "en-shizuku", kind: "language", name: "Shizuku", score: 0.2 }),
  hit({ id: "en-plakat", kind: "language", name: "Plakat", score: 0.19 }),
];
const featuredIds = new Set([
  KOMWARI.id,
  KOMWARI_PLATES.id,
  KOKA.id,
  YUNAGI.id,
  TACHIKIRI.id,
  "en-screentone",
  "en-shizuku",
  "en-plakat",
]);

const komawariMerged = mergeSearchHits(
  lexicalHits("komawari", visitorShelf, 8),
  [...prodKomawariWindow, ...overfetchExtras],
  8,
);
const komawariVisible = komawariMerged.filter((h) => featuredIds.has(h.id));
assert.equal(
  komawariVisible.length,
  5,
  "q=komawari count must be 5 (prod before this PR), not 8 from over-fetch",
);
assert.ok(
  komawariVisible.some((h) => h.id === KOMWARI.id && h.kind === "language"),
  "q=komawari still includes Komawari",
);
assert.ok(
  komawariVisible.some((h) => h.id === KOMWARI_PLATES.id && h.kind === "palette"),
  "q=komawari still includes Komawari Plates",
);
assert.ok(
  !komawariMerged.some((h) =>
    ["en-screentone", "en-shizuku", "en-plakat"].includes(h.id),
  ),
  "over-fetched meaning hits must not fill the default k=8 window",
);
assert.ok(
  !komawariVisible.some((h) => h.id === GUST.id),
  "q=komawari does not include Gust",
);

console.log("ok: q=komawari count is 5 and still includes Komawari + Komawari Plates");

const gustHits = mergeSearchHits(
  lexicalHits("gust", visitorShelf, 8),
  [{ id: GUST.id, kind: "language", name: "Gust", slug: "gust", score: 0.4, tags: [] }],
  8,
);
// Lexical shelf has no Gust. Semantic can still nominate it (kernel filter
// non-honored); the API route membership-filters that off. This helper must
// not invent a Gust lexical hit from the featured shelf.
assert.deepEqual(
  lexicalHits("gust", visitorShelf, 8),
  [],
  "featured-only lexical docs do not contain Gust",
);
assert.equal(
  gustHits.length,
  1,
  "merge still forwards a semantic Gust so the route can strip it — it does not drop membership filtering",
);

console.log("ok: featured-only lexical index excludes Gust");

// Source lock: /api/search must actually union the shelf names, not only
// document the intent. A semantic-only revert would pass every grep that
// only looks for featuredOnly.
const searchLib = read("src/lib/search.ts");
const searchRoute = read("src/app/api/search/route.ts");
assert.match(searchLib, /from "@\/lib\/search-lexical\.mjs"/);
assert.match(searchLib, /lexicalHits/);
assert.match(searchLib, /mergeSearchHits/);
assert.match(searchLib, /listFeaturedDesignLanguages/);
assert.match(searchLib, /listFeaturedPaletteSystems/);
assert.match(searchRoute, /hits = hits\.slice\(0, k\)/);
assert.match(
  searchLib,
  /Math\.min\(Math\.max\(Math\.floor\(k\) \|\| 8, 4\), 25\)/,
  "per-lane k stays the pre-#259 window (4..25 of requested k)",
);
assert.doesNotMatch(
  searchLib,
  /want \* 4/,
  "must not over-fetch k*4 — that is the q=komawari 5→8 regression",
);
assert.doesNotMatch(
  searchLib,
  /featuredOnly \? KERNEL_K_MAX/,
  "anonymous keep must not widen to KERNEL_K_MAX",
);

console.log("ok: /api/search wires lexical shelf names + clips after the membership filter");

console.log("\nfeatured-name search contract holds.");
