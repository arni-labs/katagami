/**
 * Binding Art Style contract for DESIGN.md.
 *
 * A language is UI tokens + palette + art style. Copying DESIGN.md must be
 * enough for an agent to generate real images in the paired style — not a
 * CSS-only theme. The export injects this contract even when a stored
 * DESIGN.md omitted it.
 */

export const ART_STYLE_HEADING = "## Art Style";
export const MUST_GENERATE_REAL_IMAGES = "MUST generate real images";

export interface ImageryDirection {
  pairs_with?: string | null;
  technique?: string;
  subjects?: string | string[];
  negative?: string;
  direction?: string;
  summary?: string;
}

export interface ArtStyleFields {
  entity_id: string;
  status?: string;
  fields: Record<string, string | undefined>;
}

export interface LanguageFields {
  name?: string;
  slug?: string;
  default_art_style_id?: string;
  imagery_direction?: string;
}

export interface ArtStyleBinding {
  name: string;
  slug?: string;
  url?: string;
  medium?: string;
  prompt?: string;
  negative?: string;
  technique?: string;
  subjects?: string;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function parseImageryDirection(raw?: string): ImageryDirection {
  const rec = asRecord(raw);
  if (!rec) return {};
  const subjects = rec.subjects;
  return {
    pairs_with: asString(rec.pairs_with) ?? null,
    technique: asString(rec.technique),
    subjects: Array.isArray(subjects)
      ? subjects.map(String).filter(Boolean)
      : asString(subjects),
    negative: asString(rec.negative),
    direction: asString(rec.direction),
    summary: asString(rec.summary),
  };
}

function fieldName(fields: Record<string, string | undefined>): string | undefined {
  return asString(fields.name) ?? asString(fields.Name);
}

function fieldSlug(fields: Record<string, string | undefined>): string | undefined {
  return asString(fields.slug) ?? asString(fields.Slug);
}

function preferPublished(matches: ArtStyleFields[]): ArtStyleFields | null {
  if (matches.length === 0) return null;
  return (
    matches.find((art) => art.status === "Published") ??
    matches.find((art) => art.status !== "Deleted") ??
    matches[0]
  );
}

function artMatchesKey(art: ArtStyleFields, key: string): boolean {
  const slug = fieldSlug(art.fields);
  const name = fieldName(art.fields);
  const target = norm(key);
  return Boolean(
    (slug && norm(slug) === target) ||
      (name && norm(name) === target) ||
      (slug && norm(slug.replace(/_/g, "-")) === target.replace(/_/g, "-")),
  );
}

export function resolvePairedArtStyle(
  language: LanguageFields,
  arts: ArtStyleFields[],
): ArtStyleFields | null {
  const alive = arts.filter((art) => art.status !== "Deleted");
  const id = asString(language.default_art_style_id);
  if (id) {
    const hit = preferPublished(alive.filter((art) => art.entity_id === id));
    if (hit) return hit;
  }

  const imagery = parseImageryDirection(language.imagery_direction);
  const pair = asString(imagery.pairs_with);
  if (pair) {
    const hit = preferPublished(alive.filter((art) => artMatchesKey(art, pair)));
    if (hit) return hit;
  }

  const langSlug = asString(language.slug);
  const langName = asString(language.name);
  const byLanguage = alive.filter((art) => {
    return (
      (langSlug && artMatchesKey(art, langSlug)) ||
      (langName && artMatchesKey(art, langName))
    );
  });
  return preferPublished(byLanguage);
}

export function bindingFromArtStyle(
  art: ArtStyleFields,
  siteBase: string,
): ArtStyleBinding {
  const fields = art.fields;
  return {
    name: fieldName(fields) ?? "Untitled art style",
    slug: fieldSlug(fields),
    url: `${siteBase.replace(/\/+$/, "")}/art-styles/${art.entity_id}`,
    medium: asString(fields.medium) ?? asString(fields.Medium),
    prompt:
      asString(fields.prompt_template) ?? asString(fields.PromptTemplate),
    negative:
      asString(fields.negative_prompt) ?? asString(fields.NegativePrompt),
  };
}

export function bindingFromImagery(
  language: LanguageFields,
): ArtStyleBinding | null {
  const imagery = parseImageryDirection(language.imagery_direction);
  const technique =
    imagery.technique ?? imagery.direction ?? imagery.summary;
  if (!technique && !imagery.negative && !imagery.subjects) return null;
  const subjects = Array.isArray(imagery.subjects)
    ? imagery.subjects.join("; ")
    : imagery.subjects;
  return {
    name: `${asString(language.name) ?? "This language"} imagery`,
    slug: asString(imagery.pairs_with) ?? undefined,
    technique,
    subjects,
    negative: imagery.negative,
  };
}

export function bindingForLanguage(
  language: LanguageFields,
  arts: ArtStyleFields[],
  siteBase: string,
): ArtStyleBinding | null {
  const art = resolvePairedArtStyle(language, arts);
  if (art) return bindingFromArtStyle(art, siteBase);
  return bindingFromImagery(language);
}

function yamlScalar(value: string): string {
  if (/[:#\n'"{}[\]]/.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}

export function renderArtStyleYaml(binding: ArtStyleBinding): string {
  const lines = ["art_style:"];
  lines.push(`  name: ${yamlScalar(binding.name)}`);
  if (binding.slug) lines.push(`  slug: ${yamlScalar(binding.slug)}`);
  if (binding.url) lines.push(`  url: ${yamlScalar(binding.url)}`);
  return `${lines.join("\n")}\n`;
}

export function renderArtStyleSection(binding: ArtStyleBinding): string {
  const title = binding.url
    ? `**[${binding.name}](${binding.url})**`
    : `**${binding.name}**`;
  const slugBit = binding.slug ? ` (\`${binding.slug}\`)` : "";
  const lines = [
    ART_STYLE_HEADING,
    "",
    binding.url
      ? `This design language is paired with ${title}${slugBit}. Fetch that page for the full recipe (prompt, proofs, slot recipes).`
      : `This design language has no first-class ArtStyle entity linked. Generate imagery from the technique below — do not invent a different medium.`,
    "",
    `**${MUST_GENERATE_REAL_IMAGES}** in this art style. Do not substitute CSS blobs, gradients, stock photography, Unsplash, placeholders, or emoji. Consume rasters through \`var(--hero-image)\` and \`var(--plate-N)\`.`,
    "",
  ];
  if (binding.url) lines.push(`- **URL:** ${binding.url}`);
  if (binding.medium) lines.push(`- **Medium:** ${binding.medium}`);
  if (binding.technique) lines.push(`- **Technique:** ${binding.technique}`);
  if (binding.subjects) lines.push(`- **Subjects:** ${binding.subjects}`);
  if (binding.prompt) {
    lines.push(`- **Canonical prompt:** \`${binding.prompt.replace(/`/g, "'")}\``);
  }
  if (binding.negative) {
    lines.push(`- **Negative:** \`${binding.negative.replace(/`/g, "'")}\``);
  }
  lines.push("");
  return lines.join("\n");
}

function upsertFrontMatter(markdown: string, yamlBlock: string): string {
  if (!markdown.startsWith("---\n")) {
    return `---\n${yamlBlock}---\n\n${markdown}`;
  }
  const close = markdown.indexOf("\n---", 4);
  if (close === -1) return markdown;
  let front = markdown.slice(4, close);
  front = front.replace(/(?:^|\n)art_style:\n(?:  .+\n)*/g, "\n");
  if (!front.endsWith("\n")) front += "\n";
  front += yamlBlock;
  return `---\n${front}${markdown.slice(close)}`;
}

function upsertHeadingSection(
  markdown: string,
  heading: string,
  section: string,
): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n)${escaped}\\n[\\s\\S]*?(?=\\n## |$)`);
  const block = `\n${section.trim()}\n`;
  if (re.test(markdown)) return markdown.replace(re, block);
  const shadcn = markdown.search(/\n## shadcn\/ui Usage\n/);
  if (shadcn >= 0) {
    return `${markdown.slice(0, shadcn)}\n${section.trim()}\n${markdown.slice(shadcn)}`;
  }
  return `${markdown.replace(/\s*$/, "")}\n\n${section.trim()}\n`;
}

export function withArtStyleContract(
  markdown: string,
  binding: ArtStyleBinding | null,
): string {
  if (!binding) return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  let next = upsertFrontMatter(markdown.replace(/\s+$/, ""), renderArtStyleYaml(binding));
  next = upsertHeadingSection(next, ART_STYLE_HEADING, renderArtStyleSection(binding));
  return next.endsWith("\n") ? next : `${next}\n`;
}

export function hasBindingArtStyleContract(markdown: string): boolean {
  return (
    markdown.includes(ART_STYLE_HEADING) &&
    markdown.includes(MUST_GENERATE_REAL_IMAGES) &&
    /art_style:\s*\n\s+name:/.test(markdown)
  );
}
