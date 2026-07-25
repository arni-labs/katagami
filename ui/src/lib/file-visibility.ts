const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

type FileProjection = {
  Status?: unknown;
  State?: unknown;
  status?: unknown;
  state?: unknown;
  fields?: FileProjection;
};

/**
 * Public file bytes are available only while PawFS considers the file an
 * active, immutable/readable artifact. Archive is a terminal revocation state:
 * retaining bytes for governed recovery must never imply public readability.
 */
export function isPubliclyReadableFile(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const projection = value as FileProjection;
  const fields =
    projection.fields && typeof projection.fields === "object"
      ? projection.fields
      : projection;
  const state =
    fields.Status ??
    fields.status ??
    fields.State ??
    fields.state ??
    projection.Status ??
    projection.status ??
    projection.State ??
    projection.state;
  return typeof state === "string" && PUBLIC_FILE_STATES.has(state);
}
