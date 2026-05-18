import type { CSSProperties } from "react";

type JsonRecord = Record<string, unknown>;

export const SHADCN_COMPONENTS = [
  "button",
  "card",
  "input",
  "textarea",
  "select",
  "dialog",
  "sheet",
  "tabs",
  "badge",
  "separator",
  "checkbox",
  "switch",
  "slider",
  "tooltip",
  "dropdown-menu",
  "table",
] as const;

export type ShadcnComponentName = (typeof SHADCN_COMPONENTS)[number];

export interface ShadcnExportSource {
  languageId?: string;
  name?: string;
  slug?: string;
  tokens?: string | JsonRecord | null;
  philosophy?: string | JsonRecord | null;
  rules?: string | JsonRecord | null;
  layout?: string | JsonRecord | null;
  guidance?: string | JsonRecord | null;
}

export interface ShadcnRegistryTheme {
  $schema: string;
  name: string;
  type: "registry:theme";
  title: string;
  cssVars: {
    theme: JsonRecord;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  meta: {
    source: "katagami";
    languageId: string;
    slug: string;
    componentManifest: ShadcnComponentName[];
    installCommand: string;
    nativeTokenNames: Record<string, string[]>;
  };
}

const SHADCN_SCHEMA =
  "https://ui.shadcn.com/schema/registry-item.json";

const CSS_VAR_ORDER = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "radius",
] as const;

function parseMaybeJson(value: string | JsonRecord | null | undefined): JsonRecord {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(
  record: JsonRecord,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function firstNonemptyList(...lists: string[][]): string[] {
  return lists.find((items) => items.length > 0) ?? [];
}

function markdownList(values: string[], fallback: string): string {
  return values.length > 0
    ? values.map((value) => `- ${value}`).join("\n")
    : `- ${fallback}`;
}

function markdownInline(values: string[], fallback: string): string {
  return values.length > 0 ? values.join("; ") : fallback;
}

function jsonBlock(value: JsonRecord): string {
  return Object.keys(value).length > 0
    ? JSON.stringify(value, null, 2)
    : "Defined by the Katagami source fields.";
}

function hexToRgb(hex: string): [number, number, number] | null {
  const trimmed = hex.trim();
  const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const raw = match[1];
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function readableTextColor(color: string, fallback = "#ffffff"): string {
  const rgb = hexToRgb(color);
  if (!rgb) return fallback;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.54 ? "#111111" : "#ffffff";
}

function radiusFromTokens(tokens: JsonRecord): string {
  const radii = asRecord(tokens.radii ?? tokens.radius);
  return stringValue(
    radii,
    ["default", "md", "lg", "base"],
    "0.625rem",
  );
}

function buildNativeTokenNames(tokens: JsonRecord): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(tokens)
      .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
      .map(([key, value]) => [key, Object.keys(value as JsonRecord).sort()]),
  );
}

function buildLightVars(tokens: JsonRecord): Record<string, string> {
  const colors = asRecord(tokens.colors);
  const background = stringValue(colors, ["background", "bg"], "#ffffff");
  const foreground = stringValue(
    colors,
    ["foreground", "text", "ink"],
    "#111111",
  );
  const surface = stringValue(colors, ["surface", "card"], background);
  const primary = stringValue(colors, ["primary"], foreground);
  const secondary = stringValue(colors, ["secondary"], "#f4f4f5");
  const muted = stringValue(colors, ["muted"], "#f4f4f5");
  const accent = stringValue(colors, ["accent", "info"], primary);
  const destructive = stringValue(colors, ["destructive", "error"], "#dc2626");
  const border = stringValue(colors, ["border"], "#e4e4e7");
  const success = stringValue(colors, ["success"], "#16a34a");
  const warning = stringValue(colors, ["warning"], "#d97706");
  const info = stringValue(colors, ["info"], accent);

  return {
    background,
    foreground,
    card: surface,
    "card-foreground": foreground,
    popover: surface,
    "popover-foreground": foreground,
    primary,
    "primary-foreground": readableTextColor(primary),
    secondary,
    "secondary-foreground": readableTextColor(secondary, foreground),
    muted,
    "muted-foreground": stringValue(
      colors,
      ["muted_foreground", "muted-foreground", "text_secondary"],
      foreground,
    ),
    accent,
    "accent-foreground": readableTextColor(accent, foreground),
    destructive,
    border,
    input: stringValue(colors, ["input"], border),
    ring: stringValue(colors, ["ring"], accent),
    "chart-1": primary,
    "chart-2": secondary,
    "chart-3": accent,
    "chart-4": success,
    "chart-5": warning,
    sidebar: stringValue(colors, ["sidebar"], surface),
    "sidebar-foreground": foreground,
    "sidebar-primary": primary,
    "sidebar-primary-foreground": readableTextColor(primary),
    "sidebar-accent": info,
    "sidebar-accent-foreground": readableTextColor(info, foreground),
    "sidebar-border": border,
    "sidebar-ring": stringValue(colors, ["sidebar_ring", "sidebar-ring"], accent),
    radius: radiusFromTokens(tokens),
  };
}

function buildDarkVars(
  tokens: JsonRecord,
  light: Record<string, string>,
): Record<string, string> {
  const darkOverrides = {
    ...asRecord(tokens.dark_colors),
    ...asRecord(tokens.colors_dark),
  };
  const nestedDarkColors = asRecord(asRecord(tokens.dark).colors);
  const hasExplicitDark =
    "background" in darkOverrides ||
    "text" in darkOverrides ||
    "foreground" in darkOverrides;
  const darkColors = hasExplicitDark
    ? { ...asRecord(tokens.colors), ...darkOverrides }
    : nestedDarkColors;

  if (Object.keys(darkColors).length > 0) {
    return {
      ...buildLightVars({ ...tokens, colors: darkColors }),
      radius: light.radius,
    };
  }

  const primary = light.primary;
  const accent = light.accent;
  const destructive = light.destructive;

  return {
    background: "#0f1115",
    foreground: "#f8fafc",
    card: "#181b22",
    "card-foreground": "#f8fafc",
    popover: "#181b22",
    "popover-foreground": "#f8fafc",
    primary,
    "primary-foreground": readableTextColor(primary, "#0f1115"),
    secondary: "#252a33",
    "secondary-foreground": "#f8fafc",
    muted: "#252a33",
    "muted-foreground": "#a1a1aa",
    accent,
    "accent-foreground": readableTextColor(accent, "#0f1115"),
    destructive,
    border: "#303642",
    input: "#303642",
    ring: accent,
    "chart-1": light["chart-1"],
    "chart-2": light["chart-2"],
    "chart-3": light["chart-3"],
    "chart-4": light["chart-4"],
    "chart-5": light["chart-5"],
    sidebar: "#181b22",
    "sidebar-foreground": "#f8fafc",
    "sidebar-primary": primary,
    "sidebar-primary-foreground": readableTextColor(primary, "#0f1115"),
    "sidebar-accent": accent,
    "sidebar-accent-foreground": readableTextColor(accent, "#0f1115"),
    "sidebar-border": "#303642",
    "sidebar-ring": accent,
    radius: light.radius,
  };
}

export function shadcnInstallCommand(): string {
  return `npx shadcn@latest add ${SHADCN_COMPONENTS.join(" ")}`;
}

export function buildShadcnRegistryTheme(
  source: ShadcnExportSource,
): ShadcnRegistryTheme {
  const tokens = parseMaybeJson(source.tokens);
  const name = source.name?.trim() || "Katagami Design Language";
  const slug =
    source.slug?.trim() ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "katagami-design-language";
  const light = buildLightVars(tokens);
  const dark = buildDarkVars(tokens, light);

  return {
    $schema: SHADCN_SCHEMA,
    name: slug,
    type: "registry:theme",
    title: `${name} shadcn Theme`,
    cssVars: {
      theme: {},
      light,
      dark,
    },
    meta: {
      source: "katagami",
      languageId: source.languageId ?? "",
      slug,
      componentManifest: [...SHADCN_COMPONENTS],
      installCommand: shadcnInstallCommand(),
      nativeTokenNames: buildNativeTokenNames(tokens),
    },
  };
}

export function shadcnThemeToJson(theme: ShadcnRegistryTheme): string {
  return `${JSON.stringify(theme, null, 2)}\n`;
}

export function shadcnCssBlock(theme: ShadcnRegistryTheme): string {
  const lines = [":root {"];
  for (const key of CSS_VAR_ORDER) {
    const value = theme.cssVars.light[key];
    if (value) lines.push(`  --${key}: ${value};`);
  }
  lines.push("}", "", ".dark {");
  for (const key of CSS_VAR_ORDER) {
    const value = theme.cssVars.dark[key];
    if (value) lines.push(`  --${key}: ${value};`);
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

export function shadcnUsageMarkdown(theme: ShadcnRegistryTheme): string {
  return [
    "## shadcn/ui Usage",
    "",
    "Use shadcn/ui primitives as the component baseline, then apply this Katagami-generated theme through CSS variables.",
    "",
    `Install recommended primitives with \`${theme.meta.installCommand}\`.`,
    "",
    "Recommended primitives:",
    ...theme.meta.componentManifest.map((component) => `- ${component}`),
    "",
    "Apply the generated `registry:theme` JSON or paste the CSS variable block into the app theme layer.",
    "",
  ].join("\n");
}

export function shadcnComponentSpecMarkdown(
  source: ShadcnExportSource,
): string {
  const name = source.name?.trim() || "Katagami Design Language";
  const slug = source.slug?.trim() || source.languageId || "katagami-language";
  const philosophy = parseMaybeJson(source.philosophy);
  const rules = parseMaybeJson(source.rules);
  const layout = parseMaybeJson(source.layout);
  const guidance = parseMaybeJson(source.guidance);
  const tokens = parseMaybeJson(source.tokens);
  const colors = asRecord(tokens.colors);
  const typography = asRecord(tokens.typography);
  const visualCharacter = stringArray(philosophy.visual_character);
  const signaturePatterns = stringArray(rules.signature_patterns);
  const doRules = stringArray(guidance.do);
  const dontRules = stringArray(guidance.dont);
  const identityNotes = firstNonemptyList(visualCharacter, signaturePatterns);
  const summary =
    typeof philosophy.summary === "string" && philosophy.summary.trim()
      ? philosophy.summary.trim()
      : `shadcn/ui component recipes for the Katagami language ${name}.`;

  return [
    `# ${name} shadcn/ui Components`,
    "",
    "Artifact: `component-recipes-v1`",
    `Language ID: \`${source.languageId ?? ""}\``,
    `Slug: \`${slug}\``,
    "",
    "## Intent",
    "",
    summary,
    "",
    "## Required primitives",
    "",
    markdownList([...SHADCN_COMPONENTS], "Use the core shadcn/ui primitives."),
    "",
    `Install with \`${shadcnInstallCommand()}\`.`,
    "",
    "## Token cues",
    "",
    "Colors:",
    "",
    jsonBlock(colors),
    "",
    "Typography:",
    "",
    jsonBlock(typography),
    "",
    "## Visual character to preserve",
    "",
    markdownList(
      identityNotes,
      "Make the source language's structural identity visible in every component state.",
    ),
    "",
    "## Signature component recipes",
    "",
    "### Button",
    "Use `Button` for primary, secondary, outline, and ghost actions. Primary actions must expose the language's strongest contrast pair, while secondary and ghost actions should preserve the surface treatment instead of falling back to default neutral SaaS styling.",
    "",
    "### Card",
    "Use `Card`, `CardHeader`, `CardContent`, `CardFooter`, and `CardAction` as the main composition frame. Cards should demonstrate the language's surface, border, hierarchy, and density rules rather than appearing as generic rounded rectangles.",
    "",
    "### Input and Textarea",
    "Use `Input` and `Textarea` with visible focus rings, field labels, validation states, and the language's rhythm. Forms should show real product content, not placeholder-only controls.",
    "",
    "### Select, Tabs, and Table",
    "Use `Select`, `Tabs`, and `Table` to prove navigation, filtering, and dense data states. The table should show row rhythm, separators, hover/focus states, and an empty or status state when the language calls for it.",
    "",
    "### Dialog and Sheet",
    "Use `Dialog` for centered decisions and `Sheet` for contextual editing. Both should inherit the language's spacing, border, overlay, and motion rules.",
    "",
    "## Preview shots",
    "",
    "- `application-shell`: dashboard or workspace shell with navigation, cards, forms, and state badges.",
    "- `detail-editor`: focused editing flow using input, textarea, select, switch/checkbox, dialog or sheet, and action buttons.",
    "- `data-operations`: table-heavy operational view with tabs, dropdown menu affordances, badges, and destructive/empty states.",
    "",
    "## Implementation contract",
    "",
    "- Start from local `ui/src/components/ui` shadcn-style primitives; do not create a second component system.",
    `- Apply \`/katagami/shadcn/${slug}/registry-theme.json\` variables, then use these recipes for composition and state design.`,
    "- Preserve Katagami token names as source metadata; shadcn semantic names are only the export surface.",
    `- Do: ${markdownInline(doRules, "follow the Katagami source guidance")}`,
    `- Do not: ${markdownInline(dontRules, "do not collapse the language into generic defaults")}`,
    "",
    "## Layout notes",
    "",
    jsonBlock(layout),
    "",
  ].join("\n");
}

export interface ShadcnPreviewShots {
  artifact: "katagami:shadcn-preview-shots";
  version: "preview-shots-v1";
  language: {
    id: string;
    name: string;
    slug: string;
  };
  installCommand: string;
  primitives: ShadcnComponentName[];
  identityNotes: string[];
  shots: Array<{
    id: string;
    title: string;
    viewport: string;
    primitives: ShadcnComponentName[];
    composition: string;
    mustShow: string[];
    avoid: string[];
  }>;
  componentRecipes: Array<{
    primitive: ShadcnComponentName;
    intent: string;
  }>;
  qualityRules: {
    do: string[];
    dont: string[];
  };
}

export function buildShadcnPreviewShots(
  source: ShadcnExportSource,
): ShadcnPreviewShots {
  const name = source.name?.trim() || "Katagami Design Language";
  const slug = source.slug?.trim() || source.languageId || "katagami-language";
  const philosophy = parseMaybeJson(source.philosophy);
  const rules = parseMaybeJson(source.rules);
  const guidance = parseMaybeJson(source.guidance);
  const identityNotes = firstNonemptyList(
    stringArray(philosophy.visual_character),
    stringArray(rules.signature_patterns),
  );

  return {
    artifact: "katagami:shadcn-preview-shots",
    version: "preview-shots-v1",
    language: {
      id: source.languageId ?? "",
      name,
      slug,
    },
    installCommand: shadcnInstallCommand(),
    primitives: [...SHADCN_COMPONENTS],
    identityNotes,
    shots: [
      {
        id: "application-shell",
        title: "Application shell",
        viewport: "desktop",
        primitives: ["button", "card", "input", "select", "tabs", "badge", "separator", "table"],
        composition:
          "A real product workspace with navigation, summary cards, filtering controls, and one dense content region.",
        mustShow: ["primary and secondary actions", "card hierarchy", "filterable state", "table or list density"],
        avoid: ["component inventory walls", "placeholder-only content", "generic rounded SaaS chrome"],
      },
      {
        id: "detail-editor",
        title: "Detail editor",
        viewport: "tablet",
        primitives: ["button", "card", "input", "textarea", "select", "dialog", "sheet"],
        composition:
          "A focused editing flow with form fields, validation, confirmation, and a contextual side panel.",
        mustShow: ["focus ring", "error or destructive state", "dialog or sheet treatment", "written guidance content"],
        avoid: ["unstyled browser controls", "floating cards inside cards", "missing labels"],
      },
      {
        id: "data-operations",
        title: "Data operations",
        viewport: "mobile",
        primitives: ["button", "tabs", "badge", "dropdown-menu", "table", "tooltip", "separator"],
        composition:
          "A compact operational view proving row rhythm, stacked actions, menu states, badges, and empty/destructive states.",
        mustShow: ["responsive reflow", "dense row styling", "menu affordance", "status badge system"],
        avoid: ["desktop-only tables", "text overflow", "default shadcn spacing without Katagami character"],
      },
    ],
    componentRecipes: [
      { primitive: "button", intent: "Prove action hierarchy, focus, disabled, and destructive states." },
      { primitive: "card", intent: "Carry the language surface, border, elevation, and density rules." },
      { primitive: "input", intent: "Show labels, focus rings, validation, and spacing rhythm." },
      { primitive: "tabs", intent: "Show navigational structure and active/inactive contrast." },
      { primitive: "table", intent: "Show dense operational data, separators, row states, and responsive behavior." },
    ],
    qualityRules: {
      do: stringArray(guidance.do),
      dont: stringArray(guidance.dont),
    },
  };
}

export function shadcnPreviewShotsJson(source: ShadcnExportSource): string {
  return `${JSON.stringify(buildShadcnPreviewShots(source), null, 2)}\n`;
}

export function shadcnVarsToStyle(
  vars: Record<string, string>,
): CSSProperties {
  return Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [`--${key}`, value]),
  ) as CSSProperties;
}
