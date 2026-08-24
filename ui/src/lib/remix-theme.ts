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

/** Pull `--name: value` pairs out of every `:root { … }` block. */
export function extractRootDecls(html: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  const blocks = html.matchAll(/:root\s*\{([^}]+)\}/gi);
  for (const block of blocks) {
    const body = block[1] ?? "";
    for (const pair of body.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g)) {
      decls.push([pair[1], pair[2].trim()]);
    }
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

function consumesHeroVar(html: string): boolean {
  return /var\(\s*--hero-image\b/i.test(html);
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
