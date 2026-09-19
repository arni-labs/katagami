// Check a page against a design language. Two kinds of check, kept apart:
//
//  - Measured in code, because code can: which colours, font families and
//    corner radii the page uses, against the language's tokens. No model is
//    asked a question a regex answers.
//  - Judged by Jev, because they need a look: each of the language's rules and
//    its do / don't guidance, asked as one noul per line over the page source.
//    A noul is "how true is this of the page", not a probability of being
//    right, so the middle band is reported as unclear rather than forced.
//
// Plain .mjs: shared by the Next server and node --test.

export const PAGE_MAX_CHARS = 24_000;
// What is looked at at all, measured checks included: a page's design is in its head and first screens.
const PAGE_READ_CHARS = 120_000;
export const MAX_JUDGED = 40;
const FOLLOWS_AT = 0.65;
const BREAKS_AT = 0.35;

const isRecord = (v) => v && typeof v === "object" && !Array.isArray(v);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);

// Remove every open...close span by index, in one pass. A lazy regex rescans to
// the end of the page for each unclosed opener, which is quadratic: forty
// thousand "<!--" cost 1.6 seconds of blocked CPU on a route anyone can call.
function strip(text, open, close) {
  const lower = text.toLowerCase();
  let out = "";
  let at = 0;
  for (;;) {
    const start = lower.indexOf(open, at);
    if (start < 0) return out + text.slice(at);
    out += text.slice(at, start);
    const end = lower.indexOf(close, start + open.length);
    if (end < 0) return out; // unclosed: the rest is inside it
    at = end + close.length;
  }
}

/** The page as Jev reads it: scripts, comments and data URIs carry no design. */
export function pageState(page) {
  const source = String(page ?? "").slice(0, PAGE_READ_CHARS);
  return strip(strip(source, "<script", "</script>"), "<!--", "-->")
    .replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{0,200000}/gi, "data:…")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, PAGE_MAX_CHARS);
}

/** One judged line per rule and per do / don't. `expect` is what a noul near 1 means. */
export function judgedChecks(design) {
  const checks = [];
  if (isRecord(design?.rules)) {
    for (const [name, rule] of Object.entries(design.rules)) {
      if (typeof rule === "string" && rule.trim()) checks.push({ kind: "rule", name, text: rule.trim(), expect: "follows" });
    }
  }
  const guidance = isRecord(design?.guidance) ? design.guidance : {};
  for (const text of strings(guidance.do)) checks.push({ kind: "do", name: "", text: text.trim(), expect: "follows" });
  for (const text of strings(guidance.dont)) checks.push({ kind: "dont", name: "", text: text.trim(), expect: "breaks" });
  return checks;
}

export function judgedQuestions(checks) {
  return Object.fromEntries(
    checks.map((c, i) => [
      `c${i}`,
      {
        type: "noul",
        instructions:
          c.expect === "follows"
            ? `This page follows this rule of its design language: ${c.text}`
            : `This page does what its design language says not to do: ${c.text}`,
      },
    ]),
  );
}

/** A noul and what it was asked -> pass | unclear | fail, plus how far it follows (0..1). */
export function verdictOf(noul, expect) {
  const follows = expect === "follows" ? noul : 1 - noul;
  return { follows: Math.round(follows * 100) / 100, verdict: follows >= FOLLOWS_AT ? "pass" : follows <= BREAKS_AT ? "fail" : "unclear" };
}

const hex6 = (h) => {
  const x = h.replace("#", "").toLowerCase();
  return `#${x.length <= 4 ? [...x.slice(0, 3)].map((c) => c + c).join("") : x.slice(0, 6)}`;
};

// A colour, not a fragment: "#fff" after a CSS-ish boundary, never href="#facade",
// a selector "#add{", or a character reference "&#123456;". Alpha digits are dropped.
const HEX_COLOUR = /(?<![\w&"'#=/])#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])(?!\s*\{)/gi;
// Colours this does not resolve: colour functions, and any colour property set from a variable.
const OTHER_COLOUR = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|(?:color|background|fill|stroke|border|outline|shadow)[a-z-]{0,20}\s*:[^;}<]{0,120}var\(/i;
const clip = (list) => list.slice(0, 8).join(", ").slice(0, 200);

/** What the code can measure: colours, font families and radii, against the tokens. */
export function measuredChecks(design, page) {
  const tokens = isRecord(design?.tokens) ? design.tokens : {};
  const source = String(page ?? "").slice(0, PAGE_READ_CHARS);
  const out = [];

  const allowed = new Set(
    Object.values(isRecord(tokens.colors) ? tokens.colors : {})
      .filter((v) => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v.trim()))
      .map((v) => hex6(v.trim())),
  );
  if (allowed.size > 0) {
    const used = [...new Set([...source.matchAll(HEX_COLOUR)].map((m) => hex6(m[1])))];
    const off = used.filter((c) => !allowed.has(c));
    // Colours written as rgb(), hsl() and the like are not measured here, so
    // their presence caps the verdict at unclear: a pass must mean every colour.
    const unmeasured = OTHER_COLOUR.test(source);
    out.push({
      check: "colours come from the language's tokens",
      verdict: off.length > 0 ? "fail" : used.length === 0 || unmeasured ? "unclear" : "pass",
      detail:
        off.length > 0
          ? `not in the tokens: ${clip(off)}`
          : used.length === 0
            ? "no hex colours found in the page"
            : unmeasured
              ? `${used.length} hex colours, all in the tokens; colours set by rgb()/hsl() or a variable were not measured`
              : `${used.length} colours, all in the tokens`,
    });
  }

  const typography = isRecord(tokens.typography) ? tokens.typography : {};
  const fonts = ["heading_font", "body_font", "mono_font"].map((k) => typography[k]).filter((v) => typeof v === "string" && v.trim());
  if (fonts.length > 0) {
    const lower = source.toLowerCase();
    const missing = fonts.filter((f) => !lower.includes(f.toLowerCase()));
    out.push({
      check: "the language's typefaces are used",
      verdict: missing.length === 0 ? "pass" : missing.length === fonts.length ? "fail" : "unclear",
      detail: missing.length === 0 ? clip(fonts) : `not found: ${clip(missing)}`,
    });
  }

  const radii = new Set(
    Object.values(isRecord(tokens.radii) ? tokens.radii : {})
      .filter((v) => typeof v === "string")
      .map((v) => v.trim().replace(/^0px$/, "0")),
  );
  if (radii.size > 0) {
    const used = [...new Set([...source.matchAll(/border-radius\s*:\s*([^;}"'<]{1,80})/gi)].flatMap((m) => m[1].trim().split(/\s+/)).map((v) => v.replace(/^0px$/, "0")))];
    const literal = used.filter((v) => /^\d/.test(v));
    const off = literal.filter((v) => !radii.has(v));
    // A radius given as var(--r) says nothing until the variable is resolved,
    // which this does not do: only literal lengths can pass or fail.
    out.push({
      check: "corner radii come from the language's tokens",
      verdict: off.length > 0 ? "fail" : literal.length === 0 ? "unclear" : "pass",
      detail: off.length > 0 ? `not in the tokens: ${clip(off)}` : literal.length === 0 ? "no literal border-radius lengths found" : `radii used: ${clip(literal)}`,
    });
  }
  return out;
}
