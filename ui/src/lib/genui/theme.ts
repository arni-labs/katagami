// A language's tokens, read into the handful of values a generated screen
// renders with. Every colour, radius, font and shadow is taken from the tokens
// as stored; nothing is invented. Where a role has no token of its own it
// borrows another token of the same language (a missing surface is the
// background; a missing second accent is the accent), and `borrowed` says so.
// Plain TypeScript with no server imports: the browser and the server both
// build themes.

import { readableTextColor } from "@/lib/shadcn-export";

export type ScreenTheme = {
  id: string;
  name: string;
  colors: {
    bg: string;
    surface: string;
    surface2: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    onAccent: string;
    accent2: string;
    success: string;
    warning: string;
    error: string;
  };
  radii: { sm: string; md: string; lg: string; full: string };
  type: {
    body: string;
    heading: string;
    mono: string;
    fontsUrl: string;
    baseSize: string;
    headingWeight: string;
    headingTransform: string;
    letterSpacing: string;
    lineHeight: string;
  };
  shadows: { sm: string; md: string };
  spaceBase: string;
  motion: { duration: string; easing: string };
  /** Roles that had no token of their own and borrowed another's value. */
  borrowed: string[];
};

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function parseTokens(raw: unknown): Rec {
  if (typeof raw === "string") {
    try {
      return rec(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return rec(raw);
}

/** The first key present, trying both spellings the library uses (accent_2 / accent-2). */
function pick(from: Rec, keys: string[]): string {
  for (const k of keys) {
    for (const variant of [k, k.replace(/_/g, "-"), k.replace(/-/g, "_")]) {
      const v = str(from[variant]);
      if (v) return v;
    }
  }
  return "";
}

export function themeFromTokens(id: string, name: string, raw: unknown): ScreenTheme {
  const t = parseTokens(raw);
  const c = rec(t.colors);
  const r = rec(t.radii ?? t.radius);
  const ty = rec(t.typography);
  const sh = rec(t.shadows);
  const sp = rec(t.spacing);
  const mo = rec(t.motion);
  const borrowed: string[] = [];
  const role = (name: string, own: string[], borrow: () => string) => {
    const v = pick(c, own);
    if (v) return v;
    borrowed.push(name);
    return borrow();
  };

  const bg = role("bg", ["background", "bg", "ground", "paper"], () => pick(c, ["surface"]) || "#ffffff");
  const text = role("text", ["text", "foreground", "ink"], () => readableTextColor(bg, "#111111"));
  const surface = role("surface", ["surface", "card", "panel", "surface_solid"], () => bg);
  const surface2 = role("surface2", ["surface_2", "surface_raised", "surface_alt", "recess"], () => surface);
  const accent = role("accent", ["accent", "primary"], () => text);
  const onAccent = role("onAccent", ["on_accent", "on-accent", "accent_ink"], () => readableTextColor(accent));
  const accent2 = role("accent2", ["accent_2", "secondary", "accent_soft", "accent_3"], () => accent);
  const muted = role("muted", ["muted", "graphite", "slate"], () => text);
  const border = role("border", ["border", "rule", "hairline"], () => muted);
  const success = role("success", ["success"], () => accent);
  const warning = role("warning", ["warning"], () => accent2);
  const error = role("error", ["error", "destructive"], () => accent);

  // Radii come only from the tokens. A missing step takes its neighbour's value.
  const rNone = pick(r, ["none", "flat"]);
  const rSm = pick(r, ["sm", "control", "tag"]);
  const rMd = pick(r, ["md", "default", "base", "card", "soft"]);
  const rLg = pick(r, ["lg", "xl", "container", "shell"]);
  const rFull = pick(r, ["full", "pill"]);
  const md = rMd || rLg || rSm || rNone || "0px";
  const radii = { sm: rSm || rNone || md, md, lg: rLg || md, full: rFull || rLg || md };
  if (!rMd) borrowed.push("radius.md");

  const body = pick(ty, ["body_font"]);
  const heading = pick(ty, ["heading_font"]) || body;
  const mono = pick(ty, ["mono_font"]) || body;
  if (!pick(ty, ["heading_font"])) borrowed.push("heading_font");
  const shSm = pick(sh, ["sm", "raise_sm", "depth"]);
  const shMd = pick(sh, ["md", "raise", "lift", "depth_paper"]);
  const scale = Array.isArray(sp.scale) ? sp.scale.map(Number).filter(Number.isFinite) : [];
  const spaceBase = pick(sp, ["base", "base_unit"]) || (scale.length ? `${scale[1] ?? scale[0]}px` : "8px");

  return {
    id,
    name,
    colors: { bg, surface, surface2, text, muted, border, accent, onAccent, accent2, success, warning, error },
    radii,
    type: {
      body: body || "system-ui",
      heading,
      mono,
      fontsUrl: pick(ty, ["google_fonts_url"]),
      baseSize: pick(ty, ["base_size"]) || "17px",
      headingWeight: pick(ty, ["heading_weight"]) || "700",
      headingTransform: pick(ty, ["heading_transform"]) || "none",
      letterSpacing: pick(ty, ["letter_spacing"]) || "0",
      lineHeight: pick(ty, ["line_height", "body_line_height"]) || "1.5",
    },
    shadows: { sm: shSm || "none", md: shMd || shSm || "none" },
    spaceBase,
    motion: { duration: pick(mo, ["duration"]) || "0ms", easing: pick(mo, ["easing"]) || "ease" },
    borrowed,
  };
}

/** The theme as CSS custom properties on one element; the renderer reads only these. */
export function themeVars(theme: ScreenTheme): Record<string, string> {
  const { colors: c, radii, type, shadows, motion } = theme;
  const q = (f: string) => (f.includes(",") || f === "system-ui" ? f : `"${f}"`);
  return {
    "--g-bg": c.bg,
    "--g-surface": c.surface,
    "--g-surface2": c.surface2,
    "--g-text": c.text,
    "--g-muted": c.muted,
    "--g-border": c.border,
    "--g-accent": c.accent,
    "--g-on-accent": c.onAccent,
    "--g-accent2": c.accent2,
    "--g-success": c.success,
    "--g-warning": c.warning,
    "--g-error": c.error,
    "--g-r-sm": radii.sm,
    "--g-r-md": radii.md,
    "--g-r-lg": radii.lg,
    "--g-r-full": radii.full,
    "--g-font-body": `${q(type.body)}, system-ui, sans-serif`,
    "--g-font-heading": `${q(type.heading)}, ${q(type.body)}, system-ui, sans-serif`,
    "--g-font-mono": `${q(type.mono)}, ui-monospace, monospace`,
    "--g-size": type.baseSize,
    "--g-heading-weight": type.headingWeight,
    "--g-heading-transform": type.headingTransform,
    "--g-tracking": type.letterSpacing,
    "--g-leading": type.lineHeight,
    "--g-shadow-sm": shadows.sm,
    "--g-shadow-md": shadows.md,
    "--g-space": theme.spaceBase,
    "--g-duration": motion.duration,
    "--g-easing": motion.easing,
  };
}
