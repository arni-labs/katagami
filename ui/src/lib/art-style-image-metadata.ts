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

/** Older built-in records contain a provenance note instead of a model ID. */
export function artStyleModelLabel(details: ArtStyleImageMetadata | undefined): string {
  if (!details) return "";
  const modelId = /^not exposed by (?:the )?built-in tool$/i.test(details.modelId)
    ? ""
    : details.modelId;
  return [details.provider, modelId].filter(Boolean).join(" · ");
}
