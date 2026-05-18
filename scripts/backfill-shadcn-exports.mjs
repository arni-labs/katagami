#!/usr/bin/env node
import { readFileSync } from "node:fs";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const WORKSPACE_ID = process.env.KATAGAMI_ARTIFACT_WORKSPACE_ID || "os-app-docs";

const COMPONENTS = [
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
];

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const fixtureArg = process.argv.find((arg) => arg.startsWith("--fixture="));
const fixturePath = fixtureArg?.slice("--fixture=".length);

const headers = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function value(record, keys, fallback) {
  for (const key of keys) {
    const next = record?.[key];
    if (typeof next === "string" && next.trim()) return next.trim();
  }
  return fallback;
}

function readable(color, fallback = "#ffffff") {
  const raw = color.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return fallback;
  const n = Number.parseInt(full, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.54 ? "#111111" : "#ffffff";
}

function lightVars(tokens) {
  const colors = tokens.colors || {};
  const background = value(colors, ["background", "bg"], "#ffffff");
  const foreground = value(colors, ["foreground", "text", "ink"], "#111111");
  const surface = value(colors, ["surface", "card"], background);
  const primary = value(colors, ["primary"], foreground);
  const secondary = value(colors, ["secondary"], "#f4f4f5");
  const muted = value(colors, ["muted"], "#f4f4f5");
  const accent = value(colors, ["accent", "info"], primary);
  const destructive = value(colors, ["destructive", "error"], "#dc2626");
  const border = value(colors, ["border"], "#e4e4e7");
  const success = value(colors, ["success"], "#16a34a");
  const warning = value(colors, ["warning"], "#d97706");
  const radii = tokens.radii || tokens.radius || {};
  const radius = value(radii, ["default", "md", "lg", "base"], "0.625rem");

  return {
    background,
    foreground,
    card: surface,
    "card-foreground": foreground,
    popover: surface,
    "popover-foreground": foreground,
    primary,
    "primary-foreground": readable(primary),
    secondary,
    "secondary-foreground": readable(secondary, foreground),
    muted,
    "muted-foreground": value(colors, ["muted_foreground", "muted-foreground", "text_secondary"], foreground),
    accent,
    "accent-foreground": readable(accent, foreground),
    destructive,
    border,
    input: value(colors, ["input"], border),
    ring: value(colors, ["ring"], accent),
    "chart-1": primary,
    "chart-2": secondary,
    "chart-3": accent,
    "chart-4": success,
    "chart-5": warning,
    sidebar: value(colors, ["sidebar"], surface),
    "sidebar-foreground": foreground,
    "sidebar-primary": primary,
    "sidebar-primary-foreground": readable(primary),
    "sidebar-accent": value(colors, ["info"], accent),
    "sidebar-accent-foreground": readable(value(colors, ["info"], accent), foreground),
    "sidebar-border": border,
    "sidebar-ring": value(colors, ["sidebar_ring", "sidebar-ring"], accent),
    radius,
  };
}

function darkVars(tokens, light) {
  const darkColors = tokens.dark_colors || tokens.colors_dark || tokens.dark?.colors;
  if (darkColors && Object.keys(darkColors).length) {
    return { ...lightVars({ ...tokens, colors: darkColors }), radius: light.radius };
  }
  return {
    background: "#0f1115",
    foreground: "#f8fafc",
    card: "#181b22",
    "card-foreground": "#f8fafc",
    popover: "#181b22",
    "popover-foreground": "#f8fafc",
    primary: light.primary,
    "primary-foreground": readable(light.primary, "#0f1115"),
    secondary: "#252a33",
    "secondary-foreground": "#f8fafc",
    muted: "#252a33",
    "muted-foreground": "#a1a1aa",
    accent: light.accent,
    "accent-foreground": readable(light.accent, "#0f1115"),
    destructive: light.destructive,
    border: "#303642",
    input: "#303642",
    ring: light.accent,
    "chart-1": light["chart-1"],
    "chart-2": light["chart-2"],
    "chart-3": light["chart-3"],
    "chart-4": light["chart-4"],
    "chart-5": light["chart-5"],
    sidebar: "#181b22",
    "sidebar-foreground": "#f8fafc",
    "sidebar-primary": light.primary,
    "sidebar-primary-foreground": readable(light.primary, "#0f1115"),
    "sidebar-accent": light.accent,
    "sidebar-accent-foreground": readable(light.accent, "#0f1115"),
    "sidebar-border": "#303642",
    "sidebar-ring": light.accent,
    radius: light.radius,
  };
}

function nativeTokenNames(tokens) {
  return Object.fromEntries(
    Object.entries(tokens)
      .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
      .map(([k, v]) => [k, Object.keys(v).sort()]),
  );
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];
}

function firstList(...lists) {
  return lists.find((items) => items.length > 0) || [];
}

function markdownList(values, fallback) {
  return values.length ? values.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function markdownInline(values, fallback) {
  return values.length ? values.join("; ") : fallback;
}

function themeFor(language) {
  const fields = language.fields || language;
  const tokens = parseJson(fields.tokens, {});
  const name = fields.name || fields.Name || language.entity_id || "Katagami Design Language";
  const slug =
    fields.slug ||
    fields.Slug ||
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const light = lightVars(tokens);
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: slug,
    type: "registry:theme",
    title: `${name} shadcn Theme`,
    cssVars: { theme: {}, light, dark: darkVars(tokens, light) },
    meta: {
      source: "katagami",
      languageId: language.entity_id || fields.Id || "",
      slug,
      componentManifest: COMPONENTS,
      installCommand: `npx shadcn@latest add ${COMPONENTS.join(" ")}`,
      nativeTokenNames: nativeTokenNames(tokens),
    },
  };
}

function componentSpecFor(language, theme) {
  const fields = language.fields || language;
  const philosophy = parseJson(fields.philosophy, {});
  const rules = parseJson(fields.rules, {});
  const layout = parseJson(fields.layout_principles, {});
  const guidance = parseJson(fields.guidance, {});
  const tokens = parseJson(fields.tokens, {});
  const identity = firstList(
    stringArray(philosophy.visual_character),
    stringArray(rules.signature_patterns),
  );
  const summary =
    typeof philosophy.summary === "string" && philosophy.summary.trim()
      ? philosophy.summary.trim()
      : `shadcn/ui component recipes for the Katagami language ${fields.name || theme.title}.`;

  return [
    `# ${fields.name || theme.name} shadcn/ui Components`,
    "",
    "Artifact: `component-recipes-v1`",
    `Language ID: \`${theme.meta.languageId}\``,
    `Slug: \`${theme.name}\``,
    "",
    "## Intent",
    "",
    summary,
    "",
    "## Required primitives",
    "",
    markdownList(COMPONENTS, "Use the core shadcn/ui primitives."),
    "",
    `Install with \`${theme.meta.installCommand}\`.`,
    "",
    "## Token cues",
    "",
    "Colors:",
    "",
    JSON.stringify(tokens.colors || {}, null, 2),
    "",
    "Typography:",
    "",
    JSON.stringify(tokens.typography || {}, null, 2),
    "",
    "## Visual character to preserve",
    "",
    markdownList(identity, "Make the source language's structural identity visible in every component state."),
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
    `- Apply \`/katagami/shadcn/${theme.name}/registry-theme.json\` variables, then use these recipes for composition and state design.`,
    "- Preserve Katagami token names as source metadata; shadcn semantic names are only the export surface.",
    `- Do: ${markdownInline(stringArray(guidance.do), "follow the Katagami source guidance")}`,
    `- Do not: ${markdownInline(stringArray(guidance.dont), "do not collapse the language into generic defaults")}`,
    "",
    "## Layout notes",
    "",
    JSON.stringify(layout, null, 2),
    "",
  ].join("\n");
}

function previewShotsFor(language, theme) {
  const fields = language.fields || language;
  const philosophy = parseJson(fields.philosophy, {});
  const rules = parseJson(fields.rules, {});
  const guidance = parseJson(fields.guidance, {});
  return `${JSON.stringify(
    {
      artifact: "katagami:shadcn-preview-shots",
      version: "preview-shots-v1",
      language: {
        id: theme.meta.languageId,
        name: fields.name || theme.name,
        slug: theme.name,
      },
      installCommand: theme.meta.installCommand,
      primitives: COMPONENTS,
      identityNotes: firstList(
        stringArray(philosophy.visual_character),
        stringArray(rules.signature_patterns),
      ),
      shots: [
        {
          id: "application-shell",
          title: "Application shell",
          viewport: "desktop",
          primitives: ["button", "card", "input", "select", "tabs", "badge", "separator", "table"],
          composition: "A real product workspace with navigation, summary cards, filtering controls, and one dense content region.",
          mustShow: ["primary and secondary actions", "card hierarchy", "filterable state", "table or list density"],
          avoid: ["component inventory walls", "placeholder-only content", "generic rounded SaaS chrome"],
        },
        {
          id: "detail-editor",
          title: "Detail editor",
          viewport: "tablet",
          primitives: ["button", "card", "input", "textarea", "select", "checkbox", "switch", "dialog", "sheet"],
          composition: "A focused editing flow with form fields, validation, confirmation, and a contextual side panel.",
          mustShow: ["focus ring", "error or destructive state", "dialog or sheet treatment", "written guidance content"],
          avoid: ["unstyled browser controls", "floating cards inside cards", "missing labels"],
        },
        {
          id: "data-operations",
          title: "Data operations",
          viewport: "mobile",
          primitives: ["button", "tabs", "badge", "dropdown-menu", "table", "tooltip", "separator"],
          composition: "A compact operational view proving row rhythm, stacked actions, menu states, badges, and empty/destructive states.",
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
    },
    null,
    2,
  )}\n`;
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${API_BASE}/tdata/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!res.ok) throw new Error(`${path} failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function dispatch(entitySet, id, action, params) {
  for (const namespace of ["KatagamiCommons", "Katagami.Curation", "Katagami", "Temper"]) {
    const res = await fetch(`${API_BASE}/tdata/${entitySet}('${id}')/${namespace}.${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    if (res.ok) return;
    if (res.status !== 404) throw new Error(`${namespace}.${action} failed ${res.status}: ${await res.text()}`);
  }
  throw new Error(`No namespace accepted ${action}`);
}

async function writeArtifact(slug, filename, mimeType, body) {
  const dir = `/katagami/shadcn/${slug}`;
  await fetchJson(`Workspaces('${WORKSPACE_ID}')/Temper.MkDir?await_integration=true`, {
    method: "POST",
    body: JSON.stringify({ path: dir }),
  });
  const created = await fetchJson(`Workspaces('${WORKSPACE_ID}')/Temper.CreateFile?await_integration=true`, {
    method: "POST",
    body: JSON.stringify({ path: `${dir}/${filename}`, mime_type: mimeType }),
  });
  const fileId = created.fields?.last_file_id || created.last_file_id;
  if (!fileId) throw new Error(`CreateFile for ${dir}/${filename} returned no file id`);
  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": mimeType },
    body,
  });
  if (!res.ok) throw new Error(`upload ${fileId} failed ${res.status}: ${await res.text()}`);
  return fileId;
}

async function listPublished() {
  if (fixturePath) {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8"));
    return Array.isArray(raw) ? raw : raw.value || [];
  }
  const rows = await fetchJson("DesignLanguages?$filter=Status eq 'Published'&$top=500");
  return rows.value || [];
}

const languages = await listPublished();
const results = [];

for (const language of languages) {
  const id = language.entity_id || language.Id || language.fields?.Id;
  const theme = themeFor(language);
  const body = `${JSON.stringify(theme, null, 2)}\n`;
  const componentSpec = componentSpecFor(language, theme);
  const previewShots = previewShotsFor(language, theme);
  results.push({
    id,
    slug: theme.name,
    registryBytes: body.length,
    componentSpecBytes: componentSpec.length,
    previewShotsBytes: previewShots.length,
    apply,
  });

  if (!apply) continue;
  const status = language.status || language.Status || language.fields?.Status;
  if (status === "Published") {
    await dispatch("DesignLanguages", id, "Revise", {
      curator_notes: "Backfilling deterministic shadcn/ui registry theme projection",
    });
  }
  const fileId = await writeArtifact(theme.name, "registry-theme.json", "application/json", body);
  await dispatch("DesignLanguages", id, "AttachShadcnExport", {
    shadcn_export_file_id: fileId,
    shadcn_export_format_version: "registry-theme-v1",
    shadcn_export_manifest: JSON.stringify({
      components: COMPONENTS,
      installCommand: theme.meta.installCommand,
      artifact: "registry:theme",
    }),
  });
  await dispatch("DesignLanguages", id, "VerifyShadcnExport", {});
  const componentFileId = await writeArtifact(
    theme.name,
    "components.md",
    "text/markdown",
    componentSpec,
  );
  await dispatch("DesignLanguages", id, "AttachShadcnComponentSpec", {
    shadcn_component_spec_file_id: componentFileId,
    shadcn_component_spec_format_version: "component-recipes-v1",
    shadcn_component_spec_manifest: JSON.stringify({
      artifact: "katagami:shadcn-component-recipes",
      version: "component-recipes-v1",
      components: COMPONENTS,
      shots: ["application-shell", "detail-editor", "data-operations"],
    }),
  });
  await dispatch("DesignLanguages", id, "VerifyShadcnComponentSpec", {});
  const shotsFileId = await writeArtifact(
    theme.name,
    "preview-shots.json",
    "application/json",
    previewShots,
  );
  await dispatch("DesignLanguages", id, "AttachShadcnPreviewShots", {
    shadcn_preview_shots_file_id: shotsFileId,
    shadcn_preview_shots_format_version: "preview-shots-v1",
    shadcn_preview_shots_manifest: JSON.stringify({
      artifact: "katagami:shadcn-preview-shots",
      version: "preview-shots-v1",
      shotIds: ["application-shell", "detail-editor", "data-operations"],
    }),
  });
  await dispatch("DesignLanguages", id, "VerifyShadcnPreviewShots", {});
  if (status === "Published") {
    await dispatch("DesignLanguages", id, "Publish", {});
  }
}

console.log(JSON.stringify({ count: results.length, apply, results }, null, 2));
