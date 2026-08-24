// Shared remix theming: inject a palette's roles (+ an art hero image) into a
// language's tokenized composition HTML by overriding the --ds-* / --* CSS
// custom properties the embodiments read. Used by the studio and every
// detail-page remix so recolor behaves identically everywhere.
//
// Remix writes --bg / --surface / --text / --accent / --hero-image. Many
// published landings declare those names and then paint with --paper / --ink /
// --plate-* instead (the Bluet class, ARN-380). The bind step aliases the
// composition's own :root tokens onto the remix roles so the picker is not a
// no-op, without rewriting each Temper file.

export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const L =
    (0.299 * ((n >> 16) & 255) +
      0.587 * ((n >> 8) & 255) +
      0.114 * (n & 255)) /
    255;
  return L > 0.62 ? "#16181d" : "#ffffff";
}

export type Roles = Record<string, string>;

const REMIX_OWNED = new Set([
  "bg",
  "surface",
  "text",
  "muted",
  "border",
  "accent",
  "on-accent",
  "success",
  "warning",
  "error",
  "info",
  "hero-image",
]);

type PaletteRole = "bg" | "surface" | "text" | "muted" | "border" | "accent";

function roleValues(roles: Roles): Record<PaletteRole, string> {
  const accent = roles.accent || "#3a6df0";
  return {
    bg: roles.bg || "#ffffff",
    surface: roles.surface || "#f5f5f4",
    text: roles.text || "#16181d",
    muted: roles.muted || "#6b7280",
    border: roles.border || "#e5e7eb",
    accent,
  };
}

function skipToken(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.startsWith("font") ||
    n === "r" ||
    n.startsWith("r-") ||
    n.includes("radius") ||
    n.includes("space") ||
    n.includes("leading") ||
    n.includes("tracking") ||
    n.includes("shadow") ||
    n.includes("grain") ||
    n.includes("noise") ||
    n.includes("size") ||
    n.includes("width") ||
    n.includes("height") ||
    n.includes("gap")
  );
}

function isUrlValue(value: string): boolean {
  return /^\s*url\(/i.test(value);
}

function isDecorativeUrl(value: string): boolean {
  return /data:image\/svg/i.test(value);
}

/** Map a composition token name onto a remix palette role. */
export function classifyColorToken(name: string): PaletteRole | null {
  const n = name.toLowerCase();
  if (/(accent|primary|brand|mark|highlight|sakura|yuzu|ramune|sumire|beni|blue|pink|violet|green|^secondary$)/.test(n)) {
    return "accent";
  }
  if (/(^|-)(paper|bg|background|canvas|page|ground)(-|$)/.test(n)) return "bg";
  if (/(^|-)(surface|card|fill|wash|panel|tape|stamp)(-|$)/.test(n)) return "surface";
  if (n.startsWith("plate-") || /^plate\d*$/.test(n)) return "surface";
  if (/(muted|dim)/.test(n)) return "muted";
  if (/(border|rule|hairline)/.test(n)) return "border";
  if (/(^ink$|ink-|(^|-)(text|fg|foreground|copy)(-|$))/.test(n)) return "text";
  return null;
}

function isCssIdentContinue(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_-]/.test(ch);
}

function skipCssString(src: string, i: number): number {
  const quote = src[i];
  i += 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      i += 2;
      continue;
    }
    if (src[i] === quote) return i + 1;
    i += 1;
  }
  return i;
}

function skipCssComment(src: string, i: number): number {
  const end = src.indexOf("*/", i + 2);
  return end === -1 ? src.length : end + 2;
}

function startsCssUrl(src: string, i: number): boolean {
  if (src.slice(i, i + 4).toLowerCase() !== "url(") return false;
  return i === 0 || !isCssIdentContinue(src[i - 1]);
}

function skipCssUrl(src: string, i: number): number {
  const open = src.indexOf("(", i);
  if (open === -1) return Math.min(i + 4, src.length);
  i = open + 1;
  while (i < src.length && /\s/.test(src[i])) i += 1;
  if (src[i] === '"' || src[i] === "'") {
    i = skipCssString(src, i);
    const close = src.indexOf(")", i);
    return close === -1 ? src.length : close + 1;
  }
  let depth = 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      i += 2;
      continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      i = skipCssString(src, i);
      continue;
    }
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return i;
}

/** Whitespace, block comments, and `<!-- -->`. Not strings — those stay tokens. */
function skipCssTrivia(src: string, i: number): number {
  while (i < src.length) {
    if (/\s/.test(src[i])) {
      i += 1;
      continue;
    }
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src[i] === "/" && src[i + 1] === "*") {
      i = skipCssComment(src, i);
      continue;
    }
    break;
  }
  return i;
}

function skipCssCommentOrString(src: string, i: number): number | null {
  if (src.startsWith("<!--", i)) {
    const end = src.indexOf("-->", i + 4);
    return end === -1 ? src.length : end + 3;
  }
  if (src[i] === "/" && src[i + 1] === "*") return skipCssComment(src, i);
  if (src[i] === '"' || src[i] === "'") return skipCssString(src, i);
  return null;
}

function skipCssConstruct(src: string, i: number): number | null {
  const ignored = skipCssCommentOrString(src, i);
  if (ignored !== null) return ignored;
  if (startsCssUrl(src, i)) return skipCssUrl(src, i);
  return null;
}

function findHtmlTagClose(html: string, i: number): number {
  while (i < html.length) {
    if (html[i] === '"' || html[i] === "'") {
      i = skipCssString(html, i);
      continue;
    }
    if (html[i] === ">") return i;
    i += 1;
  }
  return -1;
}

function startsHtmlMarkup(src: string, i: number): boolean {
  if (src[i] !== "<") return false;
  let j = i + 1;
  if (src[j] === "/") j += 1;
  if (src.startsWith("!--", j)) return true;
  if (src.slice(j, j + 8).toLowerCase() === "!doctype") return true;
  if (j >= src.length || !/[A-Za-z]/.test(src[j])) return false;
  while (j < src.length && /[A-Za-z0-9:-]/.test(src[j])) j += 1;
  return j >= src.length || /[\s>/]/.test(src[j]);
}

/** `</style>` that is not inside a comment, string, or url(). */
function scanStyleEnd(src: string, start: number): number {
  let i = start;
  while (i < src.length) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src.slice(i, i + 8).toLowerCase() === "</style>") return i;
    i += 1;
  }
  return -1;
}

/** Raw-text / inert markup. Inner `<style>` is not a live stylesheet. */
const NON_STYLESHEET_TEXT_TAGS = new Set([
  "script",
  "textarea",
  "title",
  "xmp",
  "iframe",
  "noembed",
  "noscript",
  "plaintext",
  "template",
]);

function skipToCloseTag(html: string, start: number, tag: string): number {
  const close = `</${tag}>`;
  let i = start;
  while (i < html.length) {
    if (html.slice(i, i + close.length).toLowerCase() === close) {
      return i + close.length;
    }
    i += 1;
  }
  return html.length;
}

const CSS_VALUE_ATTRS = new Set([
  "style",
  "fill",
  "stroke",
  "color",
  "stop-color",
  "flood-color",
  "lighting-color",
  "background",
  "background-color",
  "background-image",
]);

/** `<style>` bodies and CSS-valued attributes. A comment or string is not a surface. */
function extractCssConsumptionSurfaces(html: string): string[] {
  const surfaces: string[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      i += 1;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      i = skipCssCommentOrString(html, i) ?? i + 1;
      continue;
    }
    const tagStart = i + 1;
    if (html[tagStart] === "/") {
      const gt = findHtmlTagClose(html, tagStart);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }
    let tagEnd = tagStart;
    while (tagEnd < html.length && /[A-Za-z0-9:-]/.test(html[tagEnd])) tagEnd += 1;
    const tag = html.slice(tagStart, tagEnd).toLowerCase();
    if (NON_STYLESHEET_TEXT_TAGS.has(tag)) {
      const gt = findHtmlTagClose(html, tagEnd);
      if (gt === -1) break;
      i = skipToCloseTag(html, gt + 1, tag);
      continue;
    }
    if (tag === "style") {
      const gt = findHtmlTagClose(html, tagEnd);
      if (gt === -1) break;
      const close = scanStyleEnd(html, gt + 1);
      const end = close === -1 ? html.length : close;
      surfaces.push(html.slice(gt + 1, end));
      i = close === -1 ? html.length : close + 8;
      continue;
    }
    i = tagEnd;
    while (i < html.length && html[i] !== ">") {
      if (html[i] === "/" && html[i + 1] === ">") break;
      if (/\s/.test(html[i])) {
        i += 1;
        continue;
      }
      const nameStart = i;
      while (i < html.length && /[^\s=>/]/.test(html[i])) i += 1;
      const attrName = html.slice(nameStart, i);
      while (i < html.length && /\s/.test(html[i])) i += 1;
      if (html[i] !== "=") continue;
      i += 1;
      while (i < html.length && /\s/.test(html[i])) i += 1;
      let value = "";
      if (html[i] === '"' || html[i] === "'") {
        const q = html[i];
        const start = i + 1;
        const end = html.indexOf(q, start);
        if (end === -1) {
          value = html.slice(start);
          i = html.length;
        } else {
          value = html.slice(start, end);
          i = end + 1;
        }
      } else {
        const start = i;
        while (i < html.length && !/[\s>]/.test(html[i])) i += 1;
        value = html.slice(start, i);
      }
      if (CSS_VALUE_ATTRS.has(attrName)) surfaces.push(value);
    }
    if (html[i] === ">") i += 1;
  }
  return surfaces;
}

/**
 * Style-block text, or the whole input when it is stylesheet text.
 * HTML body text that merely looks like CSS is not a sheet.
 */
function extractStylesheetTexts(html: string): string[] {
  const sheets: string[] = [];
  let sawHtml = false;
  let i = 0;
  while (i < html.length) {
    const skipped = skipCssConstruct(html, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (!startsHtmlMarkup(html, i)) {
      i += 1;
      continue;
    }
    sawHtml = true;
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    const isClose = html[i + 1] === "/";
    const tagStart = isClose ? i + 2 : i + 1;
    let tagEnd = tagStart;
    while (tagEnd < html.length && /[A-Za-z0-9:-]/.test(html[tagEnd])) tagEnd += 1;
    const tag = html.slice(tagStart, tagEnd).toLowerCase();
    const gt = findHtmlTagClose(html, tagEnd);
    if (gt === -1) break;
    const afterOpen = gt + 1;
    if (isClose) {
      i = afterOpen;
      continue;
    }
    if (NON_STYLESHEET_TEXT_TAGS.has(tag)) {
      i = skipToCloseTag(html, afterOpen, tag);
      continue;
    }
    if (tag === "style") {
      const close = scanStyleEnd(html, afterOpen);
      const end = close === -1 ? html.length : close;
      sheets.push(html.slice(afterOpen, end));
      i = close === -1 ? html.length : close + 8;
      continue;
    }
    i = afterOpen;
  }
  if (sheets.length > 0) return sheets;
  if (sawHtml) return [];
  return [html];
}

function urlArgumentStart(src: string, i: number): number {
  const open = src.indexOf("(", i);
  if (open === -1) return Math.min(i + 4, src.length);
  return skipCssTrivia(src, open + 1);
}

function cssContainsCustomProperty(css: string, ident: string): boolean {
  let i = 0;
  while (i < css.length) {
    const ignored = skipCssCommentOrString(css, i);
    if (ignored !== null) {
      i = ignored;
      continue;
    }
    if (startsCssUrl(css, i)) {
      const arg = urlArgumentStart(css, i);
      if (css.startsWith("var(", arg)) {
        i = arg;
        continue;
      }
      i = skipCssUrl(css, i);
      continue;
    }
    if (css.startsWith("var(", i)) {
      let j = i + 4;
      while (j < css.length && /\s/.test(css[j])) j += 1;
      if (css.startsWith("--", j)) {
        j += 2;
        if (css.startsWith(ident, j) && !isCssIdentContinue(css[j + ident.length])) {
          return true;
        }
      }
      i += 4;
      continue;
    }
    i += 1;
  }
  return false;
}

/** Matching `}` for a `:root {` opener, ignoring braces inside strings/url()/comments. */
function scanCssBlockEnd(src: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < src.length) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

function parseCssDeclarations(body: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  let i = 0;
  while (i < body.length) {
    const skipped = skipCssConstruct(body, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (body.startsWith("--", i)) {
      let nameEnd = i + 2;
      while (nameEnd < body.length && isCssIdentContinue(body[nameEnd])) {
        nameEnd += 1;
      }
      const name = body.slice(i + 2, nameEnd);
      let j = nameEnd;
      while (j < body.length && /\s/.test(body[j])) j += 1;
      if (body[j] !== ":") {
        i = nameEnd || i + 1;
        continue;
      }
      j += 1;
      const valueStart = j;
      while (j < body.length) {
        const inner = skipCssConstruct(body, j);
        if (inner !== null) {
          j = inner;
          continue;
        }
        if (body[j] === ";" || body[j] === "}") break;
        j += 1;
      }
      if (name) decls.push([name, body.slice(valueStart, j).trim()]);
      i = body[j] === ";" ? j + 1 : j;
      continue;
    }
    i += 1;
  }
  return decls;
}

function selectorRegionStart(src: string, pos: number): number {
  let start = 0;
  let i = 0;
  while (i < pos) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "{" || src[i] === "}") start = i + 1;
    i += 1;
  }
  return start;
}

/** Functional wrappers around a `:root` token, innermost last. */
function wrappingFns(src: string, pos: number): string[] {
  const stack: string[] = [];
  let i = selectorRegionStart(src, pos);
  while (i < pos) {
    if (/\s/.test(src[i])) {
      i += 1;
      continue;
    }
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === ")") {
      stack.pop();
      i += 1;
      continue;
    }
    if (src[i] === "(") {
      stack.push("");
      i += 1;
      continue;
    }
    let nameStart = i;
    if (src[i] === ":") {
      if (src[i + 1] === ":") {
        i += 2;
        continue;
      }
      nameStart = i + 1;
      i += 1;
    }
    if (i < src.length && /[A-Za-z_-]/.test(src[i])) {
      while (i < src.length && isCssIdentContinue(src[i])) i += 1;
      const name = src.slice(nameStart, i).toLowerCase();
      const after = skipCssTrivia(src, i);
      if (src[after] === "(") {
        stack.push(name);
        i = after + 1;
        continue;
      }
      continue;
    }
    i += 1;
  }
  return stack;
}

const ANY_OF_PSEUDO = new Set(["is", "where", "matches", "any", "-webkit-any"]);

/** True when this `:root` token still selects :root after wrappers. */
function rootTokenMatchesRoot(fns: string[]): boolean {
  let match = true;
  for (const fn of fns) {
    if (!fn || ANY_OF_PSEUDO.has(fn)) continue;
    if (fn === "not") {
      match = !match;
      continue;
    }
    return false;
  }
  return match;
}

function skipParenGroup(src: string, i: number): number {
  let depth = 1;
  i += 1;
  while (i < src.length && depth > 0) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")") depth -= 1;
    i += 1;
  }
  return i;
}

function skipBracketGroup(src: string, i: number): number {
  i += 1;
  while (i < src.length) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "]") return i + 1;
    i += 1;
  }
  return i;
}

function startsSimpleSelector(src: string, i: number): boolean {
  const ch = src[i];
  return (
    ch === "." ||
    ch === "#" ||
    ch === "[" ||
    ch === "*" ||
    ch === ":" ||
    ch === "|" ||
    /[A-Za-z_-]/.test(ch)
  );
}

function skipSimpleSelector(src: string, i: number): number {
  if (src[i] === "[") return skipBracketGroup(src, i);
  if (src[i] === "*") {
    i += 1;
    if (src[i] === "|") i += 1;
    return i;
  }
  if (src[i] === "." || src[i] === "#") {
    i += 1;
    while (i < src.length && isCssIdentContinue(src[i])) i += 1;
    return i;
  }
  if (src[i] === ":") {
    i += 1;
    if (src[i] === ":") i += 1;
    while (i < src.length && isCssIdentContinue(src[i])) i += 1;
    const after = skipCssTrivia(src, i);
    if (src[after] === "(") return skipParenGroup(src, after);
    return i;
  }
  if (src[i] === "|") i += 1;
  while (i < src.length && isCssIdentContinue(src[i])) i += 1;
  return i;
}

function combinatorLength(src: string, i: number): number {
  if (src[i] === ">" || src[i] === "+" || src[i] === "~") return 1;
  if (src[i] === "|" && src[i + 1] === "|") return 2;
  return 0;
}

function skipLeadingComments(src: string, i: number): number {
  while (i < src.length) {
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src[i] === "/" && src[i + 1] === "*") {
      i = skipCssComment(src, i);
      continue;
    }
    break;
  }
  return i;
}

/** Start of this comma-separated alternative at the paren depth of `:root`. */
function selectorAlternativeStart(src: string, rootPos: number): number {
  const wrapDepth = wrappingFns(src, rootPos).length;
  const region = selectorRegionStart(src, rootPos);
  let i = region;
  let depth = 0;
  let alt = region;
  while (i < rootPos) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "(") {
      depth += 1;
      if (depth === wrapDepth) alt = i + 1;
      i += 1;
      continue;
    }
    if (src[i] === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (src[i] === "," && depth === wrapDepth) alt = i + 1;
    i += 1;
  }
  return alt;
}

function rangeHasCombinator(src: string, start: number, end: number): boolean {
  let i = skipCssTrivia(src, start);
  let seenCompound = false;
  let depth = 0;
  while (i < end) {
    i = skipLeadingComments(src, i);
    if (i >= end) break;
    if (/\s/.test(src[i])) {
      const after = skipCssTrivia(src, i);
      if (
        depth === 0 &&
        seenCompound &&
        after < end &&
        startsSimpleSelector(src, after)
      ) {
        return true;
      }
      i = after;
      continue;
    }
    const skipped = skipCssCommentOrString(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (src[i] === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0) {
      const comb = combinatorLength(src, i);
      if (comb) {
        if (seenCompound) return true;
        i += comb;
        continue;
      }
      if (startsSimpleSelector(src, i)) {
        i = skipSimpleSelector(src, i);
        seenCompound = true;
        continue;
      }
    }
    i += 1;
  }
  return false;
}

/** End of the comma-separated argument / alternative that holds this `:root`. */
function innermostAlternativeEnd(src: string, rootPos: number): number {
  const wrapDepth = wrappingFns(src, rootPos).length;
  let j = rootPos;
  let d = wrapDepth;
  while (j < src.length) {
    const skipped = skipCssConstruct(src, j);
    if (skipped !== null) {
      j = skipped;
      continue;
    }
    if (src[j] === "(") {
      d += 1;
      j += 1;
      continue;
    }
    if (src[j] === ")") {
      if (wrapDepth > 0 && d === wrapDepth) return j;
      d -= 1;
      j += 1;
      continue;
    }
    if (d === wrapDepth && (src[j] === "," || src[j] === "{")) return j;
    if (d === 0 && (src[j] === "}" || src[j] === ";")) return j;
    j += 1;
  }
  return src.length;
}

/**
 * Combinator in the argument that holds `:root` — before or after.
 * `:is(:root > .x)` and `:where(:root .foo)` put decls on `.x` / `.foo`.
 */
function innermostAlternativeHasCombinator(src: string, rootPos: number): boolean {
  return rangeHasCombinator(
    src,
    selectorAlternativeStart(src, rootPos),
    innermostAlternativeEnd(src, rootPos),
  );
}

function topLevelAlternativeRange(
  src: string,
  rootPos: number,
): [number, number] {
  const region = selectorRegionStart(src, rootPos);
  let i = region;
  let depth = 0;
  let altStart = region;
  while (i < rootPos) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (src[i] === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (src[i] === "," && depth === 0) altStart = i + 1;
    i += 1;
  }
  let j = rootPos + 5;
  let d = wrappingFns(src, rootPos).length;
  while (j < src.length) {
    if (/\s/.test(src[j])) {
      j += 1;
      continue;
    }
    const skipped = skipCssConstruct(src, j);
    if (skipped !== null) {
      j = skipped;
      continue;
    }
    if (src[j] === "(") {
      d += 1;
      j += 1;
      continue;
    }
    if (src[j] === ")") {
      d -= 1;
      if (d < 0) break;
      j += 1;
      continue;
    }
    if (d === 0 && (src[j] === "{" || src[j] === "," || src[j] === "}" || src[j] === ";")) {
      return [altStart, j];
    }
    j += 1;
  }
  return [altStart, src.length];
}

/**
 * Top-level alternative containing this `:root`. A combinator here means
 * `:root` is an ancestor (`:root > .x`) or a never-matching descendant
 * subject (`:is(.x) :is(:root)`). Only a single compound that matches
 * `:root` is the subject.
 */
function topLevelAlternativeHasCombinator(src: string, rootPos: number): boolean {
  const [start, end] = topLevelAlternativeRange(src, rootPos);
  return rangeHasCombinator(src, start, end);
}

const PSEUDO_ELEMENTS = new Set([
  "before",
  "after",
  "first-line",
  "first-letter",
  "selection",
  "cue",
  "cue-region",
  "marker",
  "placeholder",
  "backdrop",
  "file-selector-button",
  "part",
  "slotted",
  "grammar-error",
  "spelling-error",
  "target-text",
  "highlight",
  "view-transition",
  "view-transition-group",
  "view-transition-image-pair",
  "view-transition-old",
  "view-transition-new",
  "details-content",
  "picker",
  "picker-icon",
  "checkmark",
  "column",
  "scroll-marker",
  "scroll-marker-group",
]);

/**
 * A pseudo-element on the subject sits on the PE, not on `:root`.
 * `::` is always a PE. Single-colon PE names (`:before`, `:selection`,
 * `:cue`) are too. `:is(:before)` / `:where(::before)` still select a PE.
 * `:hover` is a class. `:is(:root)` as the subject still matches :root.
 */
function rangeHasPseudoElement(src: string, start: number, end: number): boolean {
  let i = start;
  let depth = 0;
  while (i < end) {
    const skipped = skipCssConstruct(src, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (src[i] === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (src[i] === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0 && src[i] === ":") {
      if (src[i + 1] === ":") return true;
      let k = i + 1;
      if (k < end && /[A-Za-z_-]/.test(src[k])) {
        while (k < end && isCssIdentContinue(src[k])) k += 1;
        const name = src.slice(i + 1, k).toLowerCase();
        if (PSEUDO_ELEMENTS.has(name)) return true;
        const after = skipCssTrivia(src, k);
        if (ANY_OF_PSEUDO.has(name) && src[after] === "(") {
          const close = skipParenGroup(src, after);
          if (rangeHasPseudoElement(src, after + 1, close - 1)) return true;
          i = close;
          continue;
        }
        i = k;
        continue;
      }
    }
    i += 1;
  }
  return false;
}

function subjectHasPseudoElement(src: string, rootPos: number): boolean {
  if (
    rangeHasPseudoElement(
      src,
      selectorAlternativeStart(src, rootPos),
      innermostAlternativeEnd(src, rootPos),
    )
  ) {
    return true;
  }
  const [start, end] = topLevelAlternativeRange(src, rootPos);
  return rangeHasPseudoElement(src, start, end);
}

/**
 * `{` that opens a rule that matches `:root`.
 * `:root, :host {`, `:is(:root) {`, and `:where(:root, :host) {` bind.
 * `:not(:root) {`, a combinator before `:root`, `:root` as an ancestor,
 * a combinator inside `:is(:root > .x)`, and a pseudo-element on the
 * subject (`:root::before`, `:root:selection`, `:root:is(:before)`)
 * do not.
 */
function rootRuleOpenBrace(src: string, i: number): number {
  if (src.slice(i, i + 5).toLowerCase() !== ":root") return -1;
  if (i > 0 && src[i - 1] === ":") return -1;
  if (isCssIdentContinue(src[i + 5])) return -1;
  const fns = wrappingFns(src, i);
  if (!rootTokenMatchesRoot(fns)) return -1;
  if (innermostAlternativeHasCombinator(src, i)) return -1;
  if (topLevelAlternativeHasCombinator(src, i)) return -1;
  if (subjectHasPseudoElement(src, i)) return -1;
  let j = i + 5;
  let depth = fns.length;
  while (j < src.length) {
    if (/\s/.test(src[j])) {
      j += 1;
      continue;
    }
    const skipped = skipCssConstruct(src, j);
    if (skipped !== null) {
      j = skipped;
      continue;
    }
    const ch = src[j];
    if (ch === "(") {
      depth += 1;
      j += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth < 0) return -1;
      j += 1;
      continue;
    }
    if (depth === 0 && ch === "{") return j;
    if (depth === 0 && (ch === "}" || ch === ";")) return -1;
    j += 1;
  }
  return -1;
}

/**
 * Pull `--name: value` pairs out of every real `:root` rule in stylesheet
 * text. HTML body text that looks like `:root { … }` is not a rule. A
 * selector list (`:root, :host {`) or functional wrapper (`:is(:root) {`)
 * is. `:not(:root)`, a combinator before `:root` (`.x :root`),
 * `:root` as an ancestor (`:root > .x`), and a combinator inside a
 * wrapper (`:is(:root > .x)`), and a pseudo-element on the subject
 * (`:root::before`, `:root:before`) are not.
 * A `:root` buried in a comment, string, or raw-text `<style>` (textarea)
 * is not. Must survive `}` inside `url("…<svg></svg>…")`.
 */
function extractRootDeclsFromCss(css: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  let i = 0;
  while (i < css.length) {
    const skipped = skipCssConstruct(css, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    const brace = rootRuleOpenBrace(css, i);
    if (brace !== -1) {
      const end = scanCssBlockEnd(css, brace + 1);
      if (end === -1) break;
      decls.push(...parseCssDeclarations(css.slice(brace + 1, end)));
      i = end + 1;
      continue;
    }
    i += 1;
  }
  return decls;
}

export function extractRootDecls(html: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  for (const sheet of extractStylesheetTexts(html)) {
    decls.push(...extractRootDeclsFromCss(sheet));
  }
  return decls;
}

/**
 * Extra `:root` declarations that bind the composition's own token names to
 * the remix roles. Well-known aliases always apply; remaining :root color and
 * image vars are classified from their names.
 */
export function compositionBindDecls(
  html: string,
  roles: Roles,
  hero?: string,
): string[] {
  const map = roleValues(roles);
  const extra: string[] = [
    `--paper:${map.bg}`,
    `--ink:${map.text}`,
    `--primary:${map.accent}`,
    `--ds-bg:${map.bg}`,
    `--ds-background:${map.bg}`,
    `--ds-surface:${map.surface}`,
    `--ds-text:${map.text}`,
    `--ds-foreground:${map.text}`,
    `--ds-accent:${map.accent}`,
  ];
  if (hero) extra.push(`--plate-hero:url('${hero}')`);

  const seen = new Set<string>([
    ...REMIX_OWNED,
    "paper",
    "ink",
    "primary",
    "ds-bg",
    "ds-background",
    "ds-surface",
    "ds-text",
    "ds-foreground",
    "ds-accent",
    "plate-hero",
  ]);

  for (const [name, value] of extractRootDecls(html)) {
    if (seen.has(name) || skipToken(name)) continue;
    seen.add(name);
    if (isUrlValue(value)) {
      if (hero && !isDecorativeUrl(value)) {
        extra.push(`--${name}:url('${hero}')`);
      }
      continue;
    }
    const role = classifyColorToken(name);
    if (role) extra.push(`--${name}:${map[role]}`);
  }
  return extra;
}

/**
 * True only when CSS actually consumes the custom property: `var(--bg)`,
 * `var(--bg,`, `var(--bg )`. A prefix of `--bg-alt` must not green `--bg`.
 * A comment (`/* var(--bg) *\/`), string (`content:"var(--bg)"`), or
 * token buried in a data-URI / svg / string inside `url()` is not consume.
 * `url(var(--bg))` and `url(/* x *\/var(--bg))` are consume.
 */
export function consumesCustomProperty(html: string, name: string): boolean {
  const src = html.toLowerCase();
  const ident = name.toLowerCase();
  const surfaces = extractCssConsumptionSurfaces(src);
  const sheets = surfaces.length > 0 ? surfaces : [src];
  return sheets.some((sheet) => cssContainsCustomProperty(sheet, ident));
}

function consumesHeroVar(html: string): boolean {
  return consumesCustomProperty(html, "hero-image");
}

/** First painted `background-image:url(...)` that is not a data-URI grain. */
export function bindLiteralHero(html: string, hero?: string): string {
  if (!hero || !html || consumesHeroVar(html)) return html;
  return html.replace(
    /background-image\s*:\s*url\(\s*(?!['"]?data:)[^)]+\)/i,
    `background-image:url('${hero}')`,
  );
}

/** A <style> block overriding the composition's color vars + hero image. */
export function themeOverrideStyle(
  roles: Roles,
  hero?: string,
  extra: string[] = [],
): string {
  const map = roleValues(roles);
  const decl = [
    ["--bg", map.bg],
    ["--surface", map.surface],
    ["--text", map.text],
    ["--muted", map.muted],
    ["--border", map.border],
    ["--accent", map.accent],
    ["--on-accent", readableOn(map.accent)],
    ["--success", roles.success || "#16a34a"],
    ["--warning", roles.warning || "#d97706"],
    ["--error", roles.error || "#dc2626"],
    ["--info", roles.info || "#2563eb"],
  ].map(([k, v]) => `${k}:${v}`);
  if (hero) decl.push(`--hero-image:url('${hero}')`);
  decl.push(...extra);
  return `<style id="remix-theme">:root{${decl.join(";")}}</style>`;
}

/** Inject the theme override just before </head> (or prepend if no head). */
export function injectTheme(html: string, roles: Roles, hero?: string): string {
  if (!html) return "";
  const bound = bindLiteralHero(html, hero);
  const ov = themeOverrideStyle(
    roles,
    hero,
    compositionBindDecls(bound, roles, hero),
  );
  return bound.includes("</head>")
    ? bound.replace("</head>", `${ov}</head>`)
    : ov + bound;
}
