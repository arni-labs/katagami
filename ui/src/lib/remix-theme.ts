// Shared remix theming: inject a palette's roles (+ an art hero image) into a
// language's tokenized composition HTML by overriding the --ds-* / --* CSS
// custom properties the embodiments read. Used by the studio and every
// detail-page remix so recolor behaves identically everywhere.

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

/** A <style> block overriding the composition's color vars + hero image. */
export function themeOverrideStyle(roles: Roles, hero?: string): string {
  const a = roles.accent || "#3a6df0";
  const decl = [
    ["--bg", roles.bg || "#ffffff"],
    ["--surface", roles.surface || "#f5f5f4"],
    ["--text", roles.text || "#16181d"],
    ["--muted", roles.muted || "#6b7280"],
    ["--border", roles.border || "#e5e7eb"],
    ["--accent", a],
    ["--on-accent", readableOn(a)],
    ["--success", roles.success || "#16a34a"],
    ["--warning", roles.warning || "#d97706"],
    ["--error", roles.error || "#dc2626"],
    ["--info", roles.info || "#2563eb"],
  ].map(([k, v]) => `${k}:${v}`);
  if (hero) decl.push(`--hero-image:url('${hero}')`);
  return `<style id="remix-theme">:root{${decl.join(";")}}</style>`;
}

/** Inject the theme override just before </head> (or prepend if no head). */
export function injectTheme(html: string, roles: Roles, hero?: string): string {
  const ov = themeOverrideStyle(roles, hero);
  if (!html) return "";
  return html.includes("</head>")
    ? html.replace("</head>", `${ov}</head>`)
    : ov + html;
}
