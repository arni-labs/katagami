import test from "node:test";
import assert from "node:assert/strict";
import { judgedChecks, judgedQuestions, measuredChecks, pageState, verdictOf, PAGE_MAX_CHARS } from "../src/lib/language-lint.mjs";

const design = {
  rules: { composition: "Visible 12-column grid.", empty: " ", odd: 7 },
  guidance: { do: ["Set metadata in mono."], dont: ["Add borders.", 3] },
  tokens: {
    colors: { primary: "#C8442A", background: "#FFF", note: "warm" },
    typography: { heading_font: "IBM Plex Sans Condensed", body_font: "IBM Plex Sans" },
    radii: { none: "0px", md: "16px", full: "9999px" },
  },
};

test("one judged line per rule, do and don't; a don't is asked as a breach", () => {
  const checks = judgedChecks(design);
  assert.deepEqual(checks.map((c) => [c.kind, c.expect]), [["rule", "follows"], ["do", "follows"], ["dont", "breaks"]]);
  const q = judgedQuestions(checks);
  assert.match(q.c0.instructions, /follows this rule/);
  assert.match(q.c2.instructions, /says not to do: Add borders\./);
  assert.deepEqual(judgedChecks({ rules: "x", guidance: [] }), []);
  assert.deepEqual(judgedChecks(null), []);
});

test("a breach question near 1 is a fail; the middle is unclear, never forced", () => {
  assert.deepEqual(verdictOf(0.9, "follows"), { follows: 0.9, verdict: "pass" });
  assert.deepEqual(verdictOf(0.9, "breaks"), { follows: 0.1, verdict: "fail" });
  assert.equal(verdictOf(0.5, "follows").verdict, "unclear");
  assert.equal(verdictOf(0.5, "breaks").verdict, "unclear");
});

test("colours, typefaces and radii are measured against the tokens", () => {
  const good = `<style>body{font-family:"IBM Plex Sans";color:#c8442a;background:#fff;border-radius:16px 0px}h1{font-family:"IBM Plex Sans Condensed"}</style>`;
  assert.deepEqual(measuredChecks(design, good).map((c) => c.verdict), ["pass", "pass", "pass"]);
  const bad = `<style>body{font-family:Inter;color:#123456;border-radius:8px}</style>`;
  const res = measuredChecks(design, bad);
  assert.deepEqual(res.map((c) => c.verdict), ["fail", "fail", "fail"]);
  assert.match(res[0].detail, /#123456/);
  assert.match(res[2].detail, /8px/);
  assert.deepEqual(measuredChecks(design, "<p>plain</p>").map((c) => c.verdict), ["unclear", "fail", "unclear"]);
  assert.deepEqual(measuredChecks({}, good), [], "no tokens, nothing to measure");
});

test("the page Jev reads has no scripts, comments or base64, and is capped", () => {
  const s = pageState(`<p>a</p><script>var x="#000000"</script><!-- note --><img src="data:image/png;base64,AAAA">` + "x".repeat(PAGE_MAX_CHARS));
  assert.ok(!/script|note|AAAA/.test(s));
  assert.equal(s.length, PAGE_MAX_CHARS);
});
