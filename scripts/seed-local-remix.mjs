// Seed a LOCAL Temper server with sample DesignLanguages + PaletteSystems +
// ArtStyles, walking each entity through its verified lifecycle to Published so
// the Remix Studio has all three lanes populated. Dependency-free (Node fetch).
//
// Usage:
//   node scripts/seed-local-remix.mjs
// Env (with defaults matching ui/.env.local):
//   TEMPER_URL=http://localhost:3467  TENANT=default  KEY=test-local-key
//
// File artifacts (embodiment/thumbnail/tokens/reference images) use placeholder
// ids — paw-fs writes aren't exposed over plain HTTP, and the publish guards
// check boolean flags (set by Attach+Verify actions), not file existence. The
// studio renders palette-tinted placeholder tiles when an image id doesn't
// resolve, so the demo stays coherent. Token/role/recipe JSON is real, so the
// live recolor + brief are fully functional.

const BASE = process.env.TEMPER_URL || "http://localhost:3467";
const TENANT = process.env.TENANT || "default";
const KEY = process.env.KEY || "test-local-key";

const headers = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
};

async function create(set) {
  const res = await fetch(`${BASE}/tdata/${set}`, { method: "POST", headers, body: "{}" });
  if (!res.ok) throw new Error(`create ${set} -> ${res.status}: ${await res.text()}`);
  const j = await res.json().catch(() => ({}));
  const id =
    j.entity_id || j.Id || j.fields?.Id ||
    (typeof j["@odata.id"] === "string" ? j["@odata.id"].match(/\('([^']+)'\)/)?.[1] : null);
  if (!id) throw new Error(`create ${set}: could not resolve id from ${JSON.stringify(j).slice(0, 200)}`);
  return id;
}

async function act(set, id, action, params = {}) {
  const res = await fetch(`${BASE}/tdata/${set}('${id}')/Temper.${action}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${set}('${id}').${action} -> ${res.status}: ${await res.text()}`);
  return res;
}

const J = (o) => JSON.stringify(o);

// ── Design Languages ────────────────────────────────────────────────────────
async function seedDesignLanguage(d) {
  const id = await create("DesignLanguages");
  await act("DesignLanguages", id, "SetSpec", {
    name: d.name, slug: d.slug,
    philosophy: J(d.philosophy), tokens: J(d.tokens), rules: J(d.rules),
    layout_principles: J(d.layout), guidance: J(d.guidance), tags: J(d.tags),
  });
  // Three embodiments per language, all hand-authored for the local demo (the
  // synthesize-language agent produces these for real runs, gated by the
  // finalizer): the element-showcase embodiment + bespoke Landing + Dashboard.
  await act("DesignLanguages", id, "AttachCompositions", {
    landing_file_id: `/embodiments/${d.slug}-landing.html`,
    dashboard_file_id: `/embodiments/${d.slug}-dashboard.html`,
  });
  // Gate the compositions the same way the finalizer does (the seed walks
  // entities directly, so it stands in for the finalizer's VerifyCompositions).
  await act("DesignLanguages", id, "VerifyCompositions", {});
  await act("DesignLanguages", id, "AttachEmbodiment", {
    embodiment_file_id: `/embodiments/${d.slug}-embodiment.html`, element_count: "15",
    composition_count: "5", embodiment_format: "html",
  });
  await act("DesignLanguages", id, "VerifyEmbodiment", {});
  await act("DesignLanguages", id, "AttachVerifiedThumbnail", { thumbnail_file_id: `seed-thumb-${d.slug}` });
  await act("DesignLanguages", id, "AttachDesignMd", {
    design_md_file_id: `seed-designmd-${d.slug}`, design_md_lint_result: J({ errors: 0, warnings: 0 }),
    design_md_format_version: "alpha",
  });
  await act("DesignLanguages", id, "VerifyDesignMd", {});
  await act("DesignLanguages", id, "AttachShadcnExport", {
    shadcn_export_file_id: `seed-shadcn-${d.slug}`, shadcn_export_format_version: "registry-theme-v1",
    shadcn_export_manifest: J({ seed: true }),
  });
  await act("DesignLanguages", id, "VerifyShadcnExport", {});
  await act("DesignLanguages", id, "AttachShadcnComponentSpec", {
    shadcn_component_spec_file_id: `seed-shadcn-comp-${d.slug}`,
    shadcn_component_spec_format_version: "component-recipes-v1", shadcn_component_spec_manifest: J({ seed: true }),
  });
  await act("DesignLanguages", id, "VerifyShadcnComponentSpec", {});
  await act("DesignLanguages", id, "AttachShadcnPreviewShots", {
    shadcn_preview_shots_file_id: `seed-shadcn-shots-${d.slug}`,
    shadcn_preview_shots_format_version: "preview-shots-v1", shadcn_preview_shots_manifest: J({ seed: true }),
  });
  await act("DesignLanguages", id, "VerifyShadcnPreviewShots", {});
  await act("DesignLanguages", id, "SubmitForReview", {});
  await act("DesignLanguages", id, "AttachPublishedAssets", {
    thumbnail_asset_id: `seed-thumb-${d.slug}`, thumbnail_asset_url: `/thumbs/${d.slug}.png`,
    embodiment_asset_id: `seed-embodiment-${d.slug}`, embodiment_asset_url: `/embodiments/${d.slug}-embodiment.html`,
    design_md_asset_id: `seed-designmd-${d.slug}`, design_md_asset_url: "",
  });
  await act("DesignLanguages", id, "MarkQualityPassed", {});
  await act("DesignLanguages", id, "Publish", {});
  console.log(`  ✓ DesignLanguage ${d.name} (${id})`);
  return id;
}

// ── Palette Systems ─────────────────────────────────────────────────────────
async function seedPalette(p) {
  const id = await create("PaletteSystems");
  await act("PaletteSystems", id, "SetName", { name: p.name, slug: p.slug });
  await act("PaletteSystems", id, "SetCore", {
    signature: J(p.signature), neutrals: J(p.neutrals), semantic: J(p.semantic), mood: J(p.mood),
  });
  await act("PaletteSystems", id, "SetRamps", { ramps: J(p.ramps) });
  await act("PaletteSystems", id, "SetProofScenes", { proof_scenes: J(p.proofScenes) });
  await act("PaletteSystems", id, "SetUsageGuidance", { usage_guidance: J(p.guidance) });
  await act("PaletteSystems", id, "AttachTokensExport", {
    tokens_export_file_id: `seed-tokens-${p.slug}`, tokens_export_format_version: "tokens-v1",
    tokens_export_manifest: J({ signature_count: p.signature.length, css_var_prefix: "--ds-" }),
  });
  await act("PaletteSystems", id, "AttachThumbnail", { thumbnail_file_id: `seed-pal-thumb-${p.slug}` });
  await act("PaletteSystems", id, "VerifyTokensExport", {});
  await act("PaletteSystems", id, "VerifyThumbnail", {});
  await act("PaletteSystems", id, "SubmitForReview", {});
  await act("PaletteSystems", id, "AttachPublishedAssets", {
    thumbnail_asset_id: `seed-pal-thumb-${p.slug}`, thumbnail_asset_url: "",
    tokens_export_asset_id: `seed-tokens-${p.slug}`, tokens_export_asset_url: "",
  });
  await act("PaletteSystems", id, "MarkQualityPassed", {});
  await act("PaletteSystems", id, "Publish", {});
  console.log(`  ✓ PaletteSystem ${p.name} (${id})`);
  return id;
}

// ── Art Styles ──────────────────────────────────────────────────────────────
async function seedArtStyle(a) {
  const id = await create("ArtStyles");
  await act("ArtStyles", id, "SetName", { name: a.name, slug: a.slug });
  await act("ArtStyles", id, "SetMedium", { medium: a.medium });
  await act("ArtStyles", id, "SetPromptTemplate", {
    prompt_template: a.promptTemplate, negative_prompt: a.negativePrompt, engine_hints: J(a.engineHints),
  });
  await act("ArtStyles", id, "SetSlotRecipes", { slot_recipes: J(a.slotRecipes) });
  await act("ArtStyles", id, "SetGuidance", { guidance: J(a.guidance) });
  const refIds = [1, 2].map((n) => `/art/${a.slug}-${n}.png`);
  const proofIds = [1, 2].map((n) => `/art/${a.slug}-${n}.png`);
  await act("ArtStyles", id, "AttachReferenceImages", {
    reference_image_file_ids: J(refIds),
    reference_manifest: J({ items: refIds.map((fid) => ({ file_id: fid, role: "reference", aspect: "1:1" })) }),
  });
  await act("ArtStyles", id, "AttachProofShots", {
    proof_shots_file_ids: J(proofIds),
    proof_shots_manifest: J({ items: proofIds.map((fid) => ({ file_id: fid })) }),
  });
  await act("ArtStyles", id, "AttachThumbnail", { thumbnail_file_id: `/art/${a.slug}-1.png` });
  await act("ArtStyles", id, "VerifyReferenceImages", {});
  await act("ArtStyles", id, "VerifyProofShots", {});
  await act("ArtStyles", id, "VerifyThumbnail", {});
  await act("ArtStyles", id, "SubmitForReview", {});
  await act("ArtStyles", id, "AttachPublishedAssets", {
    thumbnail_asset_id: `/art/${a.slug}-1.png`, thumbnail_asset_url: "", reference_assets: "{}",
  });
  await act("ArtStyles", id, "MarkQualityPassed", {});
  await act("ArtStyles", id, "Publish", {});
  console.log(`  ✓ ArtStyle ${a.name} (${id})`);
  return id;
}

// ── Sample data ───────────────────────────────────────────────────────────────
const LANGUAGES = [
  {
    name: "Swiss Grid System", slug: "swiss-grid",
    philosophy: { summary: "Objective, grid-driven clarity with generous whitespace.", values: ["clarity", "neutrality", "rigor"], anti_values: ["decoration", "clutter"], visual_character: ["strict 12-col grid", "Helvetica-like sans", "flat surfaces, hairline rules"] },
    tokens: { colors: { primary: "#111111", secondary: "#555555", accent: "#d72638", background: "#ffffff", surface: "#f5f5f5", text: "#111111", muted: "#888888", border: "#e0e0e0", error: "#d72638", success: "#1b998b", warning: "#e9c46a", info: "#2a6f97" }, typography: { heading_font: "Helvetica Neue, Arial, sans-serif", body_font: "Helvetica Neue, Arial, sans-serif", mono_font: "ui-monospace, monospace", base_size: "16px", line_height: 1.5 }, radii: { none: "0", sm: "2px", md: "3px", lg: "4px", full: "9999px" }, spacing: { base: "8px", scale: [4, 8, 12, 16, 24, 32, 48, 64] }, shadows: { sm: "0 1px 2px rgba(0,0,0,0.06)", md: "0 2px 6px rgba(0,0,0,0.08)", lg: "0 8px 24px rgba(0,0,0,0.1)" } },
    rules: { composition: "Align everything to a 12-column grid with consistent gutters.", hierarchy: "Size and weight only; never color for hierarchy.", density: "Airy, generous margins.", signature_patterns: ["hairline 1px rules", "left-aligned flush headings", "tabular figures"] },
    layout: { grid: "12-column, 72px max gutter", breakpoints: "640/1024/1440", whitespace: "generous, asymmetric" },
    guidance: { do: ["use the grid", "limit to one accent", "prefer type scale"], dont: ["center body text", "use shadows for decoration", "mix typefaces"] },
    tags: ["swiss", "grid", "minimal", "editorial"],
  },
  {
    name: "Warm Editorial", slug: "warm-editorial",
    philosophy: { summary: "Literary warmth: serif voice, paper tones, comfortable reading.", values: ["warmth", "readability", "craft"], anti_values: ["coldness", "sterility"], visual_character: ["high-contrast serif headings", "cream paper background", "rule-and-ornament dividers"] },
    tokens: { colors: { primary: "#2b2117", secondary: "#6b5d4f", accent: "#9c4f2b", background: "#faf6ef", surface: "#f3ece0", text: "#2b2117", muted: "#8a7c6b", border: "#e3d8c6", error: "#a4402b", success: "#5b6f52", warning: "#b8893f", info: "#4f6470" }, typography: { heading_font: "Georgia, 'Times New Roman', serif", body_font: "Georgia, serif", mono_font: "ui-monospace, monospace", base_size: "17px", line_height: 1.65 }, radii: { none: "0", sm: "3px", md: "6px", lg: "10px", full: "9999px" }, spacing: { base: "8px", scale: [4, 8, 12, 16, 24, 36, 56, 80] }, shadows: { sm: "0 1px 2px rgba(60,40,20,0.08)", md: "0 3px 10px rgba(60,40,20,0.1)", lg: "0 10px 28px rgba(60,40,20,0.12)" } },
    rules: { composition: "Single measured column for prose, ~66ch.", hierarchy: "Serif display sizes with drop accents.", density: "Comfortable, reading-first.", signature_patterns: ["small-caps eyebrows", "rule-and-ornament dividers", "drop caps"] },
    layout: { grid: "single + sidebar", breakpoints: "640/1024/1280", whitespace: "comfortable" },
    guidance: { do: ["keep measure ~66ch", "use the serif for headings", "warm neutrals"], dont: ["pure white bg", "tight leading", "neon accents"] },
    tags: ["editorial", "serif", "warm", "literary"],
  },
];

const PALETTES = [
  { name: "Muted Hobonichi Ink", slug: "muted-hobonichi-ink",
    signature: [{ hex: "#7c6f57", name: "Ochre ink" }],
    neutrals: { bg: "#f4f1ea", surface: "#fbfaf6", text: "#2b2a26", muted: "#8a857a", border: "#d9d4c7" },
    semantic: { success: "#5b6f52", warning: "#b8893f", error: "#a4503f", info: "#4f6470" },
    mood: { temperature: "warm", key_hue: "ochre", summary: "Muted, inky, paper-warm — an accent that whispers." },
    ramps: { neutral: { 50: "#fbfaf6", 300: "#d2ccbd", 500: "#8a857a", 700: "#4d4a43", 900: "#2b2a26" }, accent: { 50: "#efe9dd", 300: "#c3b291", 500: "#7c6f57", 700: "#5a503e", 900: "#332d22" } }, proofScenes: [{ key: "tinted-ui" }, { key: "chart" }, { key: "gradient" }], guidance: { do: ["text on surface AA+"], dont: ["muted body text on bg"] } },
  { name: "Riso Duotone", slug: "riso-duotone",
    signature: [{ hex: "#ff4d5e", name: "Riso coral" }, { hex: "#27305a", name: "Ink navy" }],
    neutrals: { bg: "#fdf4e3", surface: "#fffaf0", text: "#27305a", muted: "#7b80a3", border: "#d8d2e0" },
    semantic: { success: "#2f9e6f", warning: "#ffb020", error: "#d23b4b", info: "#27305a" },
    mood: { temperature: "warm-cool", key_hue: "coral", summary: "Two-ink Riso pop on warm paper." },
    ramps: { neutral: { 50: "#fffaf0", 300: "#d8d2e0", 500: "#7b80a3", 700: "#3d4470", 900: "#27305a" }, accent: { 50: "#ffe1e4", 300: "#ff9aa4", 500: "#ff4d5e", 700: "#c2384a", 900: "#7d2531" } }, proofScenes: [{ key: "tinted-ui" }, { key: "chart" }, { key: "gradient" }], guidance: { do: ["2 spot inks"], dont: ["soft gradients"] } },
  { name: "Nocturne", slug: "nocturne",
    signature: [{ hex: "#7aa2ff", name: "Luminous blue" }],
    neutrals: { bg: "#14161c", surface: "#1d2029", text: "#e7e9f0", muted: "#8a8fa3", border: "#2c303c" },
    semantic: { success: "#6bd0a0", warning: "#e0b35c", error: "#e0696b", info: "#7aa2ff" },
    mood: { temperature: "cool", key_hue: "blue", summary: "Dark surfaces, one luminous accent." },
    ramps: { neutral: { 50: "#e7e9f0", 300: "#8a8fa3", 500: "#4a4f60", 700: "#2c303c", 900: "#14161c" }, accent: { 50: "#dbe6ff", 300: "#a9c2ff", 500: "#7aa2ff", 700: "#4f72c2", 900: "#2a3f73" } }, proofScenes: [{ key: "tinted-ui" }, { key: "chart" }, { key: "gradient" }], guidance: { do: ["dark surfaces, luminous accent"], dont: ["pure black"] } },
];

const ART_STYLES = [
  { name: "Risograph Spot Print", slug: "risograph-spot-print", medium: "print", promptTemplate: "{subject}, two-color Risograph print, {palette}, coarse halftone grain, slight misregistration, matte recycled paper, flat spot inks", negativePrompt: "photorealistic, gradients, glossy, 3d render", engineHints: { midjourney: "--style raw", "nano-banana": "emphasize grain + misregistration" }, slotRecipes: { hero: "wide establishing scene", feature: "single concept object", avatar: "portrait bust", "empty-state": "single small object", illustration: "single motif", background: "loose ambient texture" }, guidance: { do: ["limit to 2-3 spot inks", "let grain show"], dont: ["smooth gradients", "photoreal detail"] } },
  { name: "Soft Watercolor", slug: "soft-watercolor", medium: "painting", promptTemplate: "{subject}, soft watercolor wash, {palette}, wet-on-wet bleeding edges, granulating pigment, deckled paper, gentle and airy", negativePrompt: "hard edges, vector, neon, 3d", engineHints: { midjourney: "--stylize 250" }, slotRecipes: { hero: "atmospheric wide scene", feature: "single delicate object", avatar: "soft portrait", "empty-state": "small floating object", illustration: "loose motif", background: "pale wash" }, guidance: { do: ["let edges bleed", "keep it light"], dont: ["hard outlines", "saturated flats"] } },
  { name: "35mm Film", slug: "35mm-film", medium: "photography", promptTemplate: "{subject}, 35mm film photograph, {palette}, natural grain, soft halation, shallow depth of field, analog color", negativePrompt: "illustration, cartoon, hdr, oversharpened", engineHints: { replicate: "add film grain LoRA" }, slotRecipes: { hero: "cinematic wide establishing shot", feature: "product still life", avatar: "candid portrait", "empty-state": "minimal still life", illustration: "evocative scene", background: "soft bokeh field" }, guidance: { do: ["natural light", "shallow DOF"], dont: ["flat lighting", "digital sharpness"] } },
];

(async () => {
  console.log(`=== Seeding ${BASE} (tenant=${TENANT}) ===`);
  // sanity: entity sets present
  const probe = await fetch(`${BASE}/tdata/PaletteSystems`, { headers });
  if (!probe.ok) throw new Error(`PaletteSystems not reachable (${probe.status}). Is the server up + specs loaded?`);

  console.log("Design Languages:");
  for (const d of LANGUAGES) await seedDesignLanguage(d);
  console.log("Palette Systems:");
  for (const p of PALETTES) await seedPalette(p);
  console.log("Art Styles:");
  for (const a of ART_STYLES) await seedArtStyle(a);

  // report published counts
  for (const set of ["DesignLanguages", "PaletteSystems", "ArtStyles"]) {
    const r = await fetch(`${BASE}/tdata/${set}?$filter=Status eq 'Published'`, { headers });
    const j = await r.json().catch(() => ({}));
    console.log(`  ${set}: ${j.value?.length ?? "?"} Published`);
  }
  console.log("=== Seed complete ===");
})().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
