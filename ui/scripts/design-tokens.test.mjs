import test from "node:test";
import assert from "node:assert/strict";
import { cssVars, tailwindSpacing, tokenValue, tokensToCss, tokensToTailwind, typeMetrics } from "../src/lib/design-tokens.mjs";

// Quire's real shapes, abridged: this is what languages actually file.
const TOKENS = {
  colors: { bg: "#FBF7EE", text: "#2E2A24", accent: "#C4623A" },
  radii: { none: "0", md: "16px" },
  typography: {
    base_size: "17px",
    body_font: "Averia Serif Libre",
    heading_font: "Sour Gummy",
    mono_font: "IBM Plex Mono",
    letter_spacing: "-0.02em",
    line_height: 1.55,
    google_fonts_url: "https://fonts.googleapis.com/css2?family=Averia+Serif+Libre",
  },
  spacing: { base: "8px", scale: [4, 8, 12, 16, 24] },
  shadows: { sm: "0 3px 0 rgba(70,58,42,0.10)" },
  motion: {
    duration: "240ms",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    philosophy: "snappy lifts and tiny collage rotations, never opacity-only fades; settled state visible with no JS",
  },
};

test("a paragraph is not a token: prose keys and long values never become custom properties", () => {
  assert.equal(tokenValue("philosophy", "snappy lifts and tiny collage rotations"), "");
  assert.equal(tokenValue("notes", "anything"), "");
  assert.equal(tokenValue("duration", "240ms"), "240ms");
  // A value too long to be a CSS value is prose under another name.
  assert.equal(tokenValue("easing", "x".repeat(65)), "");
  assert.equal(tokenValue("easing", "cubic-bezier(0.22, 1, 0.36, 1)"), "cubic-bezier(0.22, 1, 0.36, 1)");
  const css = tokensToCss(TOKENS).css;
  assert.ok(!css.includes("philosophy"), "motion.philosophy must not reach the stylesheet");
  assert.ok(css.includes("--motion-duration: 240ms;"));
});

test("the spacing scale is a list, and a list is emitted as steps rather than dropped", () => {
  assert.deepEqual(cssVars("space", { base: "8px", scale: [4, 8] }), [
    "  --space-base: 8px;",
    "  --space-1: 4;",
    "  --space-2: 8;",
  ]);
  // A named list keeps its name; only `scale` is the group's own spine.
  assert.deepEqual(cssVars("shadow", { steps: ["a"] }), ["  --shadow-steps-1: a;"]);
  assert.deepEqual(tailwindSpacing({ base: "8px", scale: [4, "8px"] }), { base: "8px", 1: "4px", 2: "8px" });
});

test("the type metrics survive, separately from the faces", () => {
  assert.deepEqual(typeMetrics(TOKENS.typography), {
    base_size: "17px",
    letter_spacing: "-0.02em",
    line_height: 1.55,
  });
  const { css, fontsUrl } = tokensToCss(TOKENS);
  assert.ok(css.startsWith('@import url("https://fonts.googleapis.com'), "the webfonts load or the type is wrong everywhere");
  assert.equal(fontsUrl, TOKENS.typography.google_fonts_url);
  for (const expected of ["--font-body: Averia Serif Libre;", "--font-mono: IBM Plex Mono;", "--type-base_size: 17px;", "--type-letter_spacing: -0.02em;"]) {
    assert.ok(css.includes(expected), `missing ${expected}`);
  }
});

test("every group the language stores reaches both exports", () => {
  const css = tokensToCss(TOKENS).css;
  for (const prefix of ["--color-", "--radius-", "--space-", "--shadow-", "--motion-", "--type-"]) {
    assert.ok(css.includes(prefix), `${prefix} missing — this is the drop that made "here are the tokens" mean colours and two fonts`);
  }
  const extend = tokensToTailwind(TOKENS).theme.extend;
  assert.deepEqual(Object.keys(extend).sort(), ["borderRadius", "boxShadow", "colors", "fontFamily", "spacing"]);
  assert.deepEqual(extend.fontFamily, { heading: ["Sour Gummy"], body: ["Averia Serif Libre"], mono: ["IBM Plex Mono"] });
});

test("a group the entry does not have simply does not appear, and nothing throws", () => {
  const { css, fontsUrl } = tokensToCss({ colors: { bg: "#fff" } });
  assert.equal(fontsUrl, null);
  assert.ok(css.startsWith(":root {"));
  assert.ok(!css.includes("--space-") && !css.includes("--font-body"));
  assert.deepEqual(Object.keys(tokensToTailwind({}).theme.extend).sort(), ["borderRadius", "colors", "fontFamily"]);
  for (const junk of [null, undefined, "", 7, [], { colors: "not-an-object" }]) {
    assert.ok(typeof tokensToCss(junk).css === "string");
  }
});

test("a palette's ramps come out as --ramp-<name>-<step>, so a palette export is not empty", () => {
  const css = tokensToCss({ colors: { bg: "#fff" }, ramps: { accent: { "50": "#fff1e8", "500": "#a7564b" }, moss: { "500": "#69733d" } } }).css;
  for (const v of ["--ramp-accent-50: #fff1e8;", "--ramp-accent-500: #a7564b;", "--ramp-moss-500: #69733d;"]) assert.ok(css.includes(v), `missing ${v}`);
});
