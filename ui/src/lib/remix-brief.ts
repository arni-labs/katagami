// Composite "remix brief": the portable artifact a remix produces.
// Fuses a UI design language + a palette + an art-style recipe + a composition
// into one document that is BOTH the human "Copy" payload and the agent-fetchable
// artifact (served by /studio/BRIEF.md). The downstream agent fills the art and
// builds the screen; Katagami never generates, it specifies.
//
// The brief is self-contained: an agent that saved it to disk must be able to
// theme from `palette_tokens`, send every slot prompt as-is (no `{palette}` or
// `{subject}` left to fill), and fetch every link without knowing the site.

export interface RemixSlot {
  key: string;
  subject_hint: string;
  aspect: string;
}

export interface RemixComposition {
  key: string;
  name: string;
  description?: string;
  image_slots: RemixSlot[];
}

export interface RemixSwatch {
  hex: string;
  name?: string;
}

/** A PaletteSystem's colour fields as the commons stores them: signature
 *  swatches, neutral and semantic roles, and named ramps. There is no `tokens`
 *  field on a palette; the brief derives its tokens from these. */
export interface RemixPalette {
  name: string;
  signature?: RemixSwatch[];
  neutrals?: Record<string, string>;
  semantic?: Record<string, string>;
  ramps?: Record<string, Record<string, string>>;
}

export interface RemixBriefInput {
  language: {
    name: string;
    slug?: string;
    tokens?: Record<string, unknown> | null;
    designMdUrl?: string;
  };
  palette: RemixPalette;
  artStyle: {
    name: string;
    medium: string;
    promptTemplate: string;
    slotRecipes?: Record<string, string>;
    referenceUrls?: string[];
  };
  composition: RemixComposition;
  /** Site origin (no trailing slash). Every relative link in the brief is made
   *  absolute against it so a saved brief still resolves. */
  origin?: string;
}

/** The query path of the agent door for one remix, shared by compose_kit and
 *  the studio so the two can never disagree on the parameters. */
export function remixBriefPath(a: {
  ui: string;
  palette: string;
  art: string;
  composition?: string;
}): string {
  const q = new URLSearchParams({ ui: a.ui, palette: a.palette, art: a.art });
  if (a.composition) q.set("composition", a.composition);
  return `/studio/BRIEF.md?${q.toString()}`;
}

/** A relative site link made absolute; an already absolute URL is untouched. */
export function absoluteUrl(url: string, origin?: string): string {
  if (!origin || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `${origin.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** The palette's signature colours as a short, prompt-friendly list:
 *  "faded coral #a7564b, softened teal #527f7d". */
export function paletteToPromptString(signature: RemixSwatch[] = []): string {
  return signature
    .filter((s) => typeof s.hex === "string" && s.hex)
    .map((s) => (s.name ? `${s.name} ${s.hex}` : s.hex))
    .join(", ");
}

/** Fill the recipe's slots. `{subject}` and `{palette}` take the slot's content
 *  and the signature colours; `{composition}` takes the slot's framing. A recipe
 *  without a subject or palette slot gets that fact stated before it instead,
 *  and the recipe text itself is never paraphrased. */
export function resolveSlotPrompt(
  aestheticPrompt: string,
  subject: string,
  signature: RemixSwatch[] = [],
  framing = "",
): string {
  const palette = paletteToPromptString(signature);
  const hasSubject = aestheticPrompt.includes("{subject}");
  const hasPalette = aestheticPrompt.includes("{palette}");
  const filled = aestheticPrompt
    .trim()
    .replaceAll("{subject}", subject)
    .replaceAll("{palette}", palette)
    .replaceAll("{composition}", framing);
  return [
    hasSubject ? "" : `Subject/content: ${subject}.`,
    palette && !hasPalette ? `Palette: ${palette}.` : "",
    filled,
  ]
    .filter(Boolean)
    .join(" ");
}

function slotSubject(slot: RemixSlot, slotRecipes?: Record<string, string>): string {
  if (slotRecipes) {
    // exact key, then family (feature-1 -> feature, testimonial-avatar-1 -> avatar)
    if (slotRecipes[slot.key]) return `${slotRecipes[slot.key]}`;
    const family = slot.key.replace(/-?\d+$/, "").replace(/^testimonial-/, "");
    if (slotRecipes[family]) return slotRecipes[family];
  }
  return slot.subject_hint;
}

function yamlMap(entries: Record<string, string> | undefined, indent: string): string[] {
  return Object.entries(entries ?? {})
    .filter(([, v]) => typeof v === "string" && v)
    .map(([k, v]) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(v)}`);
}

/** `palette_tokens` as YAML lines: signature swatches, then neutral and
 *  semantic roles, then ramps, each under its own key so an agent can map them
 *  onto its colour variables. */
export function paletteTokenLines(palette: RemixPalette): string[] {
  const lines: string[] = [];
  const signature = (palette.signature ?? []).filter((s) => s.hex);
  if (signature.length) {
    lines.push("  signature:");
    for (const s of signature) {
      lines.push(
        s.name
          ? `    - { name: ${JSON.stringify(s.name)}, hex: ${JSON.stringify(s.hex)} }`
          : `    - { hex: ${JSON.stringify(s.hex)} }`,
      );
    }
  }
  for (const key of ["neutrals", "semantic"] as const) {
    const rows = yamlMap(palette[key], "    ");
    if (rows.length) lines.push(`  ${key}:`, ...rows);
  }
  const ramps = Object.entries(palette.ramps ?? {}).map(
    ([name, steps]) => [name, yamlMap(steps, "      ")] as const,
  ).filter(([, rows]) => rows.length);
  if (ramps.length) {
    lines.push("  ramps:");
    for (const [name, rows] of ramps) lines.push(`    ${JSON.stringify(name)}:`, ...rows);
  }
  return lines;
}

export function buildRemixBrief(input: RemixBriefInput): string {
  const { language, palette, artStyle, composition, origin } = input;
  const signature = palette.signature ?? [];

  const slotLines = composition.image_slots.map((slot) => {
    const subject = slotSubject(slot, artStyle.slotRecipes);
    const framing = `${slot.subject_hint}, ${slot.aspect}`;
    const prompt = resolveSlotPrompt(artStyle.promptTemplate, subject, signature, framing);
    return [
      `  - key: ${slot.key}`,
      `    subject: ${JSON.stringify(subject)}`,
      `    aspect: ${JSON.stringify(slot.aspect)}`,
      `    prompt: ${JSON.stringify(prompt)}`,
    ].join("\n");
  });

  const tokenLines = paletteTokenLines(palette);
  const frontMatter = [
    "---",
    "katagami_brief: v1",
    `ui: { name: ${JSON.stringify(language.name)}, slug: ${JSON.stringify(language.slug ?? "")} }`,
    `palette: { name: ${JSON.stringify(palette.name)} }`,
    `art_style: { name: ${JSON.stringify(artStyle.name)}, medium: ${JSON.stringify(artStyle.medium)} }`,
    `composition: ${JSON.stringify(composition.key)}`,
    tokenLines.length ? "palette_tokens:" : "palette_tokens: {}",
    ...tokenLines,
    "slots:",
    ...slotLines,
    "---",
  ].join("\n");

  const designMdUrl = language.designMdUrl ? absoluteUrl(language.designMdUrl, origin) : "";
  const referenceUrls = (artStyle.referenceUrls ?? []).map((u) => absoluteUrl(u, origin));
  const refs = referenceUrls.length
    ? referenceUrls.map((u) => `- ${u}`).join("\n")
    : "_(none attached)_";

  const body = `
# Remix brief: ${composition.name}

**${language.name}** (UI) · **${palette.name}** (palette) · **${artStyle.name}** (art style, ${artStyle.medium})

## How to build this screen
1. Apply the UI design language${designMdUrl ? `, see DESIGN.md: ${designMdUrl}` : ""}.
2. Theme it with the palette tokens above (signature colours are the accents;
   map neutral and semantic roles to your color variables).
3. For each slot below, **generate or edit** an image with its resolved prompt:
   the recipe's slots are already filled with the slot's content and the palette.
4. Do not use optional example images as style references. Keep the canonical
   aesthetic prompt unchanged across models and slots.

## Art style recipe
- **Canonical aesthetic prompt:** \`${artStyle.promptTemplate}\`

## Optional example images (view only; do not attach as style references)
${refs}

> Generated by Katagami. Katagami specifies the remix; your agent generates the art.
`;

  return `${frontMatter}\n${body}`;
}
