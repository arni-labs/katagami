// Shared contract vectors for the taste-document builders. The Rust finalizer
// port (katagami-curation/wasm/finalize_spawned_session/src/taste_doc.rs) MUST
// satisfy the SAME fixtures + expected documents so a vector computed at publish
// (Rust) is comparable to one computed by the backfill (this TS, via the embed
// service). Same discipline as facets.mjs / facets.test.mjs / facets.rs.
//
// Run: node ui/scripts/taste-doc.test.mjs  (Node >= 22 strips the TS types)
import {
  buildEmbeddingDocument,
  buildPaletteEmbeddingDocument,
  buildArtStyleEmbeddingDocument,
  buildWritingStyleEmbeddingDocument,
} from "../src/lib/embeddings.ts";

let fails = 0;
const eq = (got, want, msg) => {
  if (got !== want) {
    fails += 1;
    console.error(`FAIL ${msg}:\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
  }
};

// --- design language ---
eq(
  buildEmbeddingDocument({
    name: "Cadence",
    tags: ["Editorial", "Grid", "specimen"],
    philosophySummary: "  A Bold System.  ",
    headingFont: "GT Sectra",
    bodyFont: "Inter",
    colors: {
      primary: "#ff0000",
      secondary: "#00ff00",
      accent: "#0000ff",
      background: "#ffffff",
      text: "#111111",
    },
  }),
  "design language: Cadence\n" +
    "movements and qualities: Editorial, Grid\n" +
    "A Bold System.\n" +
    "typography: headings in GT Sectra, body in Inter\n" +
    "palette: primary #ff0000, secondary #00ff00, accent #0000ff, background #ffffff, text #111111",
  "language full",
);
eq(buildEmbeddingDocument({ name: "Solo" }), "design language: Solo", "language minimal");
eq(
  buildEmbeddingDocument({
    name: "Warm",
    tags: ["warm"],
    headingFont: "Times",
    colors: { accent: "#0000ff", text: "#000000" },
  }),
  "design language: Warm\n" +
    "movements and qualities: warm\n" +
    "typography: headings in Times\n" +
    "palette: accent #0000ff, text #000000",
  "language partial",
);

// --- palette system ---
eq(
  buildPaletteEmbeddingDocument({
    name: "Ember",
    tags: ["warm", "specimen"],
    mood: { temperature: "warm", key_hue: "red", summary: "  Cozy heat  " },
    signature: [{ name: "Coral", hex: "#ff5a3c" }, { hex: "#ffb703" }, "#123456"],
    neutrals: { background: "#ffffff", ink: "#0a0a0a" },
  }),
  "palette system: Ember\n" +
    "qualities: warm\n" +
    "Cozy heat\n" +
    "mood: warm, red\n" +
    "signature colors: Coral #ff5a3c, #ffb703, #123456\n" +
    "neutrals: background #ffffff, ink #0a0a0a",
  "palette full",
);
eq(
  buildPaletteEmbeddingDocument({
    name: "Cool",
    mood: { temperature: "cool" },
    signature: [{ name: "Sky", hex: "#0ea5e9" }],
    neutrals: {},
  }),
  "palette system: Cool\nmood: cool\nsignature colors: Sky #0ea5e9",
  "palette no mood summary",
);
eq(
  buildPaletteEmbeddingDocument({
    name: "Bare",
    tags: [],
    mood: {},
    signature: [],
    neutrals: { muted: "#eeeeee" },
  }),
  "palette system: Bare\nneutrals: muted #eeeeee",
  "palette no signature",
);

// --- art style ---
eq(
  buildArtStyleEmbeddingDocument({
    name: "Risograph Ember",
    tags: ["riso", "print", "specimen"],
    medium: "risograph",
    promptTemplate: "  two-color riso print, coarse grain  ",
  }),
  "art style: Risograph Ember\n" +
    "qualities: riso, print\n" +
    "medium: risograph\n" +
    "recipe: two-color riso print, coarse grain",
  "art style full",
);
eq(buildArtStyleEmbeddingDocument({ name: "Ink" }), "art style: Ink", "art style minimal");
eq(
  buildArtStyleEmbeddingDocument({ name: "Wash", tags: ["ink"], medium: "watercolor" }),
  "art style: Wash\nqualities: ink\nmedium: watercolor",
  "art style no prompt",
);

// --- writing style ---
eq(
  buildWritingStyleEmbeddingDocument({
    name: "Marlowe",
    tags: ["noir", "terse", "specimen"],
    persona: "  A hard-boiled detective voice.  ",
    refusals: ["  never use emoji  ", "no exclamation points", "  "],
    moves: ["opens cold", "  argues in short bursts  "],
    register: { email: "  clipped and dry  ", chat: "wry", memo: 42 },
    vocabulary: { use: ["gumshoe", "  dame  "], ban: ["synergy", "  "] },
  }),
  "writing style: Marlowe\n" +
    "qualities: noir, terse\n" +
    "persona: A hard-boiled detective voice.\n" +
    "refusals: never use emoji; no exclamation points\n" +
    "moves: opens cold; argues in short bursts\n" +
    "register: email: clipped and dry; chat: wry\n" +
    "prefers: gumshoe, dame\n" +
    "avoids: synergy",
  "writing style full",
);
eq(
  buildWritingStyleEmbeddingDocument({ name: "Quill" }),
  "writing style: Quill",
  "writing style minimal",
);
eq(
  buildWritingStyleEmbeddingDocument({
    name: "Terse",
    tags: ["short"],
    refusals: ["no filler"],
    vocabulary: { ban: ["very"] },
  }),
  "writing style: Terse\nqualities: short\nrefusals: no filler\navoids: very",
  "writing style no persona",
);

if (fails) {
  console.error(`\n${fails} taste-doc contract vector(s) FAILED`);
  process.exit(1);
}
console.log("taste-doc: all 12 contract vectors pass");
