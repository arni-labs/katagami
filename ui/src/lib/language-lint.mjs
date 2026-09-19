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
const FOLLOWS_AT = 0.65;
const BREAKS_AT = 0.35;

const isRecord = (v) => v && typeof v === "object" && !Array.isArray(v);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);

/** The page as Jev reads it: scripts, comments and data URIs carry no design. */
export function pageState(page) {
  return String(page ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "data:…")
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
  return checks.slice(0, 40);
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
  return `#${x.length === 3 ? [...x].map((c) => c + c).join("") : x.slice(0, 6)}`;
};

/** What the code can measure: colours, font families and radii, against the tokens. */
export function measuredChecks(design, page) {
  const tokens = isRecord(design?.tokens) ? design.tokens : {};
  const source = String(page ?? "");
  const out = [];

  const allowed = new Set(
    Object.values(isRecord(tokens.colors) ? tokens.colors : {})
      .filter((v) => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v.trim()))
      .map((v) => hex6(v.trim())),
  );
  if (allowed.size > 0) {
    const used = [...new Set((source.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? []).map(hex6))];
    const off = used.filter((c) => !allowed.has(c));
    out.push({
      check: "colours come from the language's tokens",
      verdict: used.length === 0 ? "unclear" : off.length === 0 ? "pass" : "fail",
      detail: used.length === 0 ? "no hex colours found in the page" : off.length === 0 ? `${used.length} colours, all in the tokens` : `not in the tokens: ${off.slice(0, 8).join(", ")}`,
    });
  }

  const typography = isRecord(tokens.typography) ? tokens.typography : {};
  const fonts = ["heading_font", "body_font", "mono_font"].map((k) => typography[k]).filter((v) => typeof v === "string" && v.trim());
  if (fonts.length > 0) {
    const missing = fonts.filter((f) => !source.toLowerCase().includes(f.toLowerCase()));
    out.push({
      check: "the language's typefaces are used",
      verdict: missing.length === 0 ? "pass" : missing.length === fonts.length ? "fail" : "unclear",
      detail: missing.length === 0 ? fonts.join(", ") : `not found: ${missing.join(", ")}`,
    });
  }

  const radii = new Set(
    Object.values(isRecord(tokens.radii) ? tokens.radii : {})
      .filter((v) => typeof v === "string")
      .map((v) => v.trim().replace(/^0px$/, "0")),
  );
  if (radii.size > 0) {
    const used = [...new Set([...source.matchAll(/border-radius\s*:\s*([^;}"']+)/gi)].flatMap((m) => m[1].trim().split(/\s+/)).map((v) => v.replace(/^0px$/, "0")))];
    const off = used.filter((v) => /^\d/.test(v) && !radii.has(v));
    out.push({
      check: "corner radii come from the language's tokens",
      verdict: used.length === 0 ? "unclear" : off.length === 0 ? "pass" : "fail",
      detail: used.length === 0 ? "no border-radius declarations found" : off.length === 0 ? `radii used: ${used.join(", ")}` : `not in the tokens: ${off.slice(0, 8).join(", ")}`,
    });
  }
  return out;
}
