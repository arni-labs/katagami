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
  /** How the picture is framed; it fills the recipe's `{composition}`. */
  subject_hint: string;
  /** What the picture is of, with `{product}` standing for the product. */
  subject: string;
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
  /** What the screen is for, in the caller's words ("a ferry booking app").
   *  Untrusted text: it is flattened to one short line before use. */
  product?: string | null;
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
  product?: string;
}): string {
  const q = new URLSearchParams({ ui: a.ui, palette: a.palette, art: a.art });
  if (a.composition) q.set("composition", a.composition);
  if (a.product) q.set("product", a.product);
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

const PRODUCT_MAX = 200;

/** A value about to be set into a sentence, without the full stop or comma it
 *  ends with, so "fresh." set before ", in the style" never reads "fresh.,". */
function clause(value: string): string {
  return value.trim().replace(/[\s.,;:!?]+$/, "");
}

/** Close up the joins a missing value leaves (", ,", ",.", a leading comma). */
function tidy(text: string): string {
  return text
    .replace(/,(\s*,)+/g, ",")
    .replace(/,\s*(?=[.;:!?]|$)/g, "")
    .replace(/^\s*,\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// A recipe that opens the noun phrase itself ("a close head-and-shoulders
// {subject}", "a single {subject}") takes the subject without its own article,
// or it reads "a single one object". Reading back from `{subject}` to the
// clause start: a determiner first means the phrase is open, so the subject's
// "a", "an" or "one" goes; a preposition or linking word first ("a pictogram
// of {subject}", "set in {subject}") means it takes a whole phrase, article
// and all. A bare verb ("Draw {subject}") has neither and keeps it.
const DETERMINER = new Set(["a", "an", "the", "one", "each", "every", "this", "that", "its", "their"]);
const TAKES_PHRASE = new Set([
  "of", "with", "for", "about", "like", "and", "or", "as", "in", "on", "at", "to", "from", "into", "onto",
  "under", "over", "across", "through", "near", "beside", "around", "behind", "between", "inside", "by",
  "within", "without", "among", "amid", "against", "toward", "towards", "upon", "via", "beneath", "above",
  "below", "along", "past", "after", "before", "beyond", "than",
  // clause openers and linking verbs: what follows is a new phrase
  "where", "when", "while", "which", "who", "whose", "because", "but", "if", "until", "once", "is", "are", "was", "were",
  "suggesting", "showing", "depicting", "featuring",
]);

/** The subject set where the recipe put it, without a doubled article. */
function phraseAfter(before: string, phrase: string): string {
  const words = (before.split(/[,.;:()]/).pop() ?? "").toLowerCase().match(/[a-z'-]+/g) ?? [];
  for (const word of words.reverse()) {
    if (TAKES_PHRASE.has(word)) return phrase;
    if (DETERMINER.has(word)) return phrase.replace(/^(a|an|one)\s+/i, "");
  }
  return phrase;
}

/** The product as one plain line: a caller's untrusted text loses line breaks,
 *  control characters and braces (so it can never read as a placeholder) and
 *  is capped. */
export function cleanProduct(raw?: string | null): string {
  const flat = (raw ?? "").replace(/[\u0000-\u001f\u007f\u2028\u2029{}]/g, " ").replace(/\s+/g, " ");
  return clause(Array.from(clause(flat)).slice(0, PRODUCT_MAX).join(""));
}

/** Text shown as-is inside a markdown line: no code span, emphasis, link or
 *  HTML can start in it. */
function markdownText(text: string): string {
  return text.replace(/[\\`*_[\]<>]/g, "\\$&");
}

/** Fill the recipe's slots. `{subject}` and `{palette}` take the slot's content
 *  and the signature colours; `{composition}` takes the slot's framing. A slot
 *  recipe goes where `{subject}` is and may carry `{subject}` itself; one that
 *  does not follows the subject. A recipe without a subject or palette slot
 *  gets that fact stated before it instead, and the recipe text itself is
 *  never paraphrased. */
export function resolveSlotPrompt(
  aestheticPrompt: string,
  subject: string,
  signature: RemixSwatch[] = [],
  framing = "",
  slotRecipe = "",
): string {
  const palette = paletteToPromptString(signature);
  const content = !slotRecipe.trim()
    ? subject
    : slotRecipe.includes("{subject}")
      ? slotRecipe
      : `${clause(subject)}, ${slotRecipe}`;
  const template = aestheticPrompt.trim();
  const hasSubject = template.includes("{subject}");
  const text = hasSubject
    ? template.replace(/\{subject\}/g, (_, at: number) => phraseAfter(template.slice(0, at), clause(content)))
    : template;
  const hasPalette = text.includes("{palette}") || (!hasSubject && content.includes("{palette}"));
  const values: Record<string, string> = { subject, palette, composition: framing };
  const fill = (s: string) =>
    s.replace(/\{(subject|palette|composition)\}/g, (_, k: string, at: number) =>
      k === "subject" ? phraseAfter(s.slice(0, at), clause(subject)) : clause(values[k]),
    );
  return tidy(
    [
      hasSubject ? "" : `Subject/content: ${fill(clause(content))}.`,
      palette && !hasPalette ? `Palette: ${palette}.` : "",
      fill(text),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** The slot's own recipe: exact key, then family (feature-1 -> feature,
 *  testimonial-avatar-1 -> avatar). */
function slotRecipe(slot: RemixSlot, slotRecipes?: Record<string, string>): string {
  if (!slotRecipes) return "";
  const family = slot.key.replace(/-?\d+$/, "").replace(/^testimonial-/, "");
  return slotRecipes[slot.key] || slotRecipes[family] || "";
}

/** What the slot shows, about the product when there is one. */
function slotSubject(slot: RemixSlot, product: string): string {
  return slot.subject.replaceAll("{product}", () => product || "the product");
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
  const product = cleanProduct(input.product);

  const slotLines = composition.image_slots.map((slot) => {
    const subject = slotSubject(slot, product);
    const framing = `${slot.subject_hint}, ${slot.aspect}`;
    const recipe = slotRecipe(slot, artStyle.slotRecipes);
    const prompt = resolveSlotPrompt(artStyle.promptTemplate, subject, signature, framing, recipe);
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
    ...(product ? [`product: ${JSON.stringify(product)}`] : []),
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

  // The recipe is shown with the palette in it (one palette per brief) so no
  // `{palette}` is left anywhere; the per-slot placeholders stay named.
  const recipe = tidy(artStyle.promptTemplate.trim().replaceAll("{palette}", () => paletteToPromptString(signature)));
  const designMdUrl = language.designMdUrl ? absoluteUrl(language.designMdUrl, origin) : "";
  const referenceUrls = (artStyle.referenceUrls ?? []).map((u) => absoluteUrl(u, origin));
  const refs = referenceUrls.length
    ? referenceUrls.map((u) => `- ${u}`).join("\n")
    : "_(none attached)_";

  const body = `
# Remix brief: ${composition.name}${product ? ` for ${markdownText(product)}` : ""}

**${language.name}** (UI) · **${palette.name}** (palette) · **${artStyle.name}** (art style, ${artStyle.medium})

## How to build this screen
1. Apply the UI design language.${designMdUrl ? ` DESIGN.md: ${designMdUrl}` : ""}
2. Theme it with the palette tokens above (signature colours are the accents;
   map neutral and semantic roles to your color variables).
3. For each slot below, **generate or edit** an image with its resolved prompt:
   the recipe's slots are already filled with the slot's content and the palette.
4. Do not use optional example images as style references. Keep the canonical
   aesthetic prompt unchanged across models and slots.

## Art style recipe
- **Canonical aesthetic prompt:** \`${recipe}\`
- The palette is this brief's, already filled in. \`{subject}\` and \`{composition}\`
  are per slot and are filled in each slot's prompt above.

## Optional example images (view only; do not attach as style references)
${refs}

> Generated by Katagami. Katagami specifies the remix; your agent generates the art.
`;

  return `${frontMatter}\n${body}`;
}
