/** Parse recipe metadata at the native entity boundary; legacy omissions are empty. */
export function parseArtStyleProcessList(raw: unknown): string[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    return [];
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export function artStyleRecipe({
  name,
  medium,
  promptTemplate,
  materials,
  techniques,
}: {
  name: string;
  medium: string;
  promptTemplate: string;
  materials: readonly string[];
  techniques: readonly string[];
}): string {
  const sections = [
    `${name} — Katagami art-style recipe (${medium})`,
    `PROMPT TEMPLATE\n${promptTemplate}`,
  ];
  if (materials.length || techniques.length) {
    sections.push("Materials and techniques describe the intended appearance.");
  }
  if (materials.length) sections.push(`MATERIALS\n${materials.join(", ")}`);
  if (techniques.length) sections.push(`TECHNIQUES\n${techniques.join(", ")}`);
  sections.push("Apply the prompt to the subject in your image or generation request.");
  return sections.join("\n\n");
}
