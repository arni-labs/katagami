#!/usr/bin/env node
import { readFileSync } from "node:fs";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/normalize-shadcn-theme-seed.mjs <registry-theme.json>");
  process.exit(1);
}

const source = JSON.parse(readFileSync(inputPath, "utf8"));
const cssVars = source.cssVars || {};
const light = cssVars.light || cssVars.theme || {};
const dark = cssVars.dark || {};

function pick(record, keys, fallback = "") {
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }
  return fallback;
}

const tokens = {
  colors: {
    primary: pick(light, ["primary"], "#111111"),
    secondary: pick(light, ["secondary"], "#f4f4f5"),
    accent: pick(light, ["accent"], "#2563eb"),
    background: pick(light, ["background"], "#ffffff"),
    surface: pick(light, ["card", "popover"], "#ffffff"),
    text: pick(light, ["foreground"], "#111111"),
    muted: pick(light, ["muted-foreground", "muted"], "#71717a"),
    border: pick(light, ["border"], "#e4e4e7"),
    error: pick(light, ["destructive"], "#dc2626"),
    success: pick(light, ["chart-4"], "#16a34a"),
    warning: pick(light, ["chart-5"], "#d97706"),
    info: pick(light, ["ring", "chart-3"], "#2563eb"),
  },
  dark_colors: Object.keys(dark).length
    ? {
        primary: pick(dark, ["primary"], pick(light, ["primary"], "#f8fafc")),
        secondary: pick(dark, ["secondary"], "#252a33"),
        accent: pick(dark, ["accent"], pick(light, ["accent"], "#60a5fa")),
        background: pick(dark, ["background"], "#0f1115"),
        surface: pick(dark, ["card", "popover"], "#181b22"),
        text: pick(dark, ["foreground"], "#f8fafc"),
        muted: pick(dark, ["muted-foreground", "muted"], "#a1a1aa"),
        border: pick(dark, ["border"], "#303642"),
        error: pick(dark, ["destructive"], pick(light, ["destructive"], "#dc2626")),
        success: pick(dark, ["chart-4"], pick(light, ["chart-4"], "#16a34a")),
        warning: pick(dark, ["chart-5"], pick(light, ["chart-5"], "#d97706")),
        info: pick(dark, ["ring", "chart-3"], pick(light, ["ring", "chart-3"], "#60a5fa")),
      }
    : undefined,
  typography: {
    heading_font: "system-ui",
    body_font: "system-ui",
    mono_font: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    base_size: "16px",
    scale_ratio: 1.2,
    line_height: 1.5,
    letter_spacing: "0",
    google_fonts_url: "",
  },
  spacing: {
    base: "8px",
    scale: [4, 8, 12, 16, 24, 32, 48, 64],
  },
  radii: {
    none: "0",
    sm: "calc(var(--radius) * 0.6)",
    md: pick(light, ["radius"], "0.625rem"),
    lg: "var(--radius)",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px rgb(0 0 0 / 0.05)",
    md: "0 4px 12px rgb(0 0 0 / 0.08)",
    lg: "0 12px 32px rgb(0 0 0 / 0.12)",
  },
  theme_seed: {
    artifact_type: "registry:theme",
    source_type: "shadcn-compatible-registry-theme",
    source_name: source.name || "",
    source_title: source.title || "",
    source_schema: source.$schema || "",
    original_css_vars: cssVars,
    provenance_note:
      "Seed imported from a shadcn/tweakcn-compatible theme. Katagami synthesis should preserve provenance but expand this into philosophy, rules, layout, guidance, and embodiment.",
  },
};

if (!tokens.dark_colors) delete tokens.dark_colors;

console.log(`${JSON.stringify(tokens, null, 2)}\n`);
