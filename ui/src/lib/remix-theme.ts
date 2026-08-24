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
    while (tagEnd < html.length && /[a-z0-9:-]/.test(html[tagEnd])) tagEnd += 1;
    const tag = html.slice(tagStart, tagEnd);
    if (tag === "script") {
      const gt = findHtmlTagClose(html, tagEnd);
      if (gt === -1) break;
      const close = html.indexOf("</script>", gt + 1);
      i = close === -1 ? html.length : close + 9;
      continue;
    }
    if (tag === "style") {
      const gt = findHtmlTagClose(html, tagEnd);
      if (gt === -1) break;
      const close = html.indexOf("</style>", gt + 1);
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

function cssContainsCustomProperty(css: string, ident: string): boolean {
  let i = 0;
  while (i < css.length) {
    const skipped = skipCssConstruct(css, i);
    if (skipped !== null) {
      i = skipped;
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

/**
 * Pull `--name: value` pairs out of every `:root { … }` block.
 *
 * Must survive `}` inside `url("…<svg></svg>…")`. A `:root { [^}]+ }` regex
 * cuts the block at that brace and never sees tokens after it.
 */
export function extractRootDecls(html: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  const open = /:root\s*\{/gi;
  let match: RegExpExecArray | null;
  while ((match = open.exec(html))) {
    const start = match.index + match[0].length;
    const end = scanCssBlockEnd(html, start);
    if (end === -1) break;
    decls.push(...parseCssDeclarations(html.slice(start, end)));
    open.lastIndex = end + 1;
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
 * token inside `url()` is not consume.
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
