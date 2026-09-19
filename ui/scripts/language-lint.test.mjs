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
  // a fragment, a selector and a character reference are not colours
  const notColours = `<a href="#facade">x</a><a href="/p#abc">y</a><style>#add{color:#c8442a}</style>&#123456;`;
  assert.equal(measuredChecks(design, notColours)[0].verdict, "pass");
  // a page coloured with rgb() cannot pass on its one token hex
  assert.equal(measuredChecks(design, `<style>p{color:rgb(1,2,3);background:#fff}</style>`)[0].verdict, "unclear");
  // nor on a variable whose value it never resolves
  assert.equal(measuredChecks(design, `<style>:root{--rogue:red}p{color:var(--rogue);background:#fff}</style>`)[0].verdict, "unclear");
  // alpha digits are dropped, so an off-token 8-digit hex is still caught
  assert.equal(measuredChecks(design, `<style>p{color:#12345678}</style>`)[0].verdict, "fail");
  // var() radii decide nothing; a repeated declaration does not echo the page back
  const vars = measuredChecks(design, "<style>" + "a{border-radius:var(--r)}".repeat(5000) + "</style>")[2];
  assert.equal(vars.verdict, "unclear");
  assert.ok(vars.detail.length < 240);
  assert.deepEqual(measuredChecks({}, good), [], "no tokens, nothing to measure");
});

test("the page Jev reads has no scripts, comments or base64, and is capped", () => {
  const s = pageState(`<p>a</p><script>var x="#000000"</script><!-- note --><img src="data:image/png;base64,AAAA">` + "x".repeat(PAGE_MAX_CHARS));
  assert.ok(!/script|note|AAAA/.test(s));
  assert.equal(s.length, PAGE_MAX_CHARS);
});

test("unclosed comments and scripts cost linear time, not quadratic", () => {
  const started = Date.now();
  pageState("<!-- ".repeat(40_000));
  pageState("<script ".repeat(25_000));
  assert.ok(Date.now() - started < 250, `took ${Date.now() - started}ms`);
  assert.equal(pageState("<p>kept</p><!-- never closed <p>gone</p>"), "<p>kept</p>");
});
