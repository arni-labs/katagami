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
// Colours this does not resolve, so their presence caps the verdict at unclear:
// colour functions, and a colour property whose (resolved) value carries no hex
// at all, such as a named colour, an unresolved var(), or a gradient keyword.
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color|color-mix)\(/i;
const COLOUR_PROPERTY = /(?:^|[;{\s])(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z]+)?-color|outline-color|caret-color|accent-color)\s*:\s*([^;}<]{1,160})/gi;
const COLOUR_KEYWORDS = /^(?:transparent|currentcolor|inherit|initial|unset|revert|none)$/i;
function hasUnmeasuredColour(source) {
  if (COLOUR_FUNCTION.test(source)) return true;
  for (const m of source.matchAll(COLOUR_PROPERTY)) {
    const value = m[1].trim();
    if (!value.includes("#") && !COLOUR_KEYWORDS.test(value)) return true;
  }
  return false;
}
const clip = (list) => list.slice(0, 8).join(", ").slice(0, 200);

// Real pages set their colours and radii once, in :root, and use var(--x)
// everywhere else. A checker that only reads literals sees nothing of that
// page: QA built a page with an indigo accent and an 8px radius behind
// variables and only the colour was caught. So the declarations are read and
// every var(--x) is replaced by its value before anything is measured. Bounded
// passes: a variable defined from another variable resolves; a cycle stops.
const DECLARATION = /(--[\w-]+)\s*:\s*([^;}]{1,240})/g;
const VAR_USE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;
export function resolveCustomProperties(source) {
  const declared = new Map();
  for (const m of source.matchAll(DECLARATION)) if (!declared.has(m[1])) declared.set(m[1], m[2].trim());
  let out = source;
  for (let pass = 0; pass < 6 && VAR_USE.test(out); pass++) {
    VAR_USE.lastIndex = 0;
    out = out.replace(VAR_USE, (whole, name, fallback) => (declared.has(name) ? declared.get(name) : fallback !== undefined ? fallback : whole));
  }
  VAR_USE.lastIndex = 0;
  return out;
}

// Families that name a class, not a face; a page may list them after the face.
const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "unset", "revert"]);
const familiesOf = (value) => value.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "").trim()).filter(Boolean);

/** What the code can measure: colours, font families and radii, against the tokens. */
export function measuredChecks(design, page) {
  const tokens = isRecord(design?.tokens) ? design.tokens : {};
  const source = resolveCustomProperties(String(page ?? "").slice(0, PAGE_READ_CHARS));
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
    const unmeasured = hasUnmeasuredColour(source);
    out.push({
      check: "colours come from the language's tokens",
      verdict: off.length > 0 ? "fail" : used.length === 0 || unmeasured ? "unclear" : "pass",
      detail:
        off.length > 0
          ? `not in the tokens: ${clip(off)}`
          : used.length === 0
            ? "no hex colours found in the page"
            : unmeasured
              ? `${used.length} hex colours, all in the tokens; a colour written as rgb()/hsl() or by name was not measured`
              : `${used.length} colours, all in the tokens`,
    });
  }

  const typography = isRecord(tokens.typography) ? tokens.typography : {};
  const stacks = ["heading_font", "body_font", "mono_font"].map((k) => typography[k]).filter((v) => typeof v === "string" && v.trim());
  if (stacks.length > 0) {
    // The faces the language names, e.g. "Outfit" out of '"Outfit", system-ui, sans-serif'.
    const faces = new Set(stacks.flatMap(familiesOf).filter((f) => !GENERIC_FAMILIES.has(f.toLowerCase())).map((f) => f.toLowerCase()));
    const used = [...new Set([...source.matchAll(/font-family\s*:\s*([^;}"'<]{1,200}|"[^"]*"[^;}<]{0,200})/gi)].flatMap((m) => familiesOf(m[1])).map((f) => f.toLowerCase()))];
    // A face the language does not have is the breach QA showed slipping
    // through: Inter on a page that named Fraunces. It fails; the language's
    // own faces being absent is a weaker signal and stays a fail only when
    // none of them appears at all.
    const foreign = used.filter((f) => !GENERIC_FAMILIES.has(f) && !faces.has(f));
    const present = [...faces].filter((f) => used.includes(f) || source.toLowerCase().includes(f));
    out.push({
      check: "typefaces are the language's",
      verdict: foreign.length > 0 ? "fail" : present.length === faces.size ? "pass" : present.length === 0 ? "fail" : "unclear",
      detail:
        foreign.length > 0
          ? `not the language's typefaces: ${clip(foreign)}`
          : present.length === faces.size
            ? clip([...faces])
            : `not found: ${clip([...faces].filter((f) => !present.includes(f)))}`,
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
    // Variables were resolved above, so a radius set through var(--r) is a
    // literal here; what remains unmeasured is a radius from a computed value.
    out.push({
      check: "corner radii come from the language's tokens",
      verdict: off.length > 0 ? "fail" : literal.length === 0 ? "unclear" : "pass",
      detail: off.length > 0 ? `not in the tokens: ${clip(off)}` : literal.length === 0 ? "no literal border-radius lengths found" : `radii used: ${clip(literal)}`,
    });
  }
  return out;
}
