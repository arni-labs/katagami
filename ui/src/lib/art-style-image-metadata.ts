export type ArtStyleImageMetadata = {
  subject: string;
  provider: string;
  modelId: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/** Both legacy reference manifests and proof manifests bind provenance by file. */
export function artStyleImageMetadata(raw: string | undefined): Map<string, ArtStyleImageMetadata> {
  const result = new Map<string, ArtStyleImageMetadata>();
  if (!raw) return result;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return result;
  }
  const manifest = record(parsed);
  const items = manifest.items ?? manifest.references;
  if (!Array.isArray(items)) return result;
  for (const value of items) {
    const item = record(value);
    const fileId = text(item.file_id) || text(item.file);
    if (!fileId.startsWith("fl-")) continue;
    const model = record(item.model);
    result.set(fileId, {
      subject: text(item.subject),
      provider: text(model.provider) || text(item.provider),
      modelId: text(model.model) || text(item.model),
    });
  }
  return result;
}

/** Display names are separate from the exact IDs retained in provenance. */
export function artStyleModelLabel(details: ArtStyleImageMetadata | undefined): string {
  if (!details) return "";
  const id = details.modelId;
  if (/nano-banana-pro/i.test(id)) return "Nano Banana Pro";
  if (/nano-banana/i.test(id)) return "Nano Banana";
  const seedream = id.match(/seedream[/-]v?(\d+(?:\.\d+)?)([/-]pro)?/i);
  if (seedream) return `Seedream ${seedream[1]}${seedream[2] ? " Pro" : ""}`;
  if (/gpt-image-2\.5/i.test(id)) return "GPT Image 2.5";
  if (/grok-imagine/i.test(id)) return "Grok Imagine";
  if (!id || /^not exposed by (?:the )?built-in tool$/i.test(id)) return details.provider;
  return id.split("/").filter((part) =>
    !/^(fal-ai|bytedance|openai|google|xai|edit|text-to-image|image-to-image)$/i.test(part)
  ).join(" ").replaceAll("-", " ");
}
