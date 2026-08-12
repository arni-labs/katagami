const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

/**
 * Path prefixes the public site is allowed to serve bytes from.
 *
 * This is an allowlist, and it is the whole control. Everything the curation
 * pipeline publishes for the site is written under `/katagami/` — embodiments,
 * landings, dashboards, thumbnails, palettes, `DESIGN.md` projections and
 * shadcn exports (see the `temper.write('/katagami/...')` calls in the curator
 * skills). A file that does not sit under one of these prefixes is not part of
 * a public surface, and is refused.
 */
const PUBLIC_PATH_PREFIXES = ["/katagami/"] as const;

/**
 * Surfaces that are never public, checked before the allowlist so that a future
 * widening of `PUBLIC_PATH_PREFIXES` cannot accidentally expose them.
 *
 * `/agents/` is the agent instruction tree — skills, souls, bootstrap
 * snapshots. `/system/` is the operator knowledge base the agents read.
 * `/feedback/` holds reviewer verdict logs written by the owner tooling.
 */
const PRIVATE_PATH_PREFIXES = ["/agents/", "/system/", "/feedback/"] as const;

/**
 * Workspaces that hold operational content only. `os-app-docs` is where OS apps
 * install agent documentation and skills.
 */
const PRIVATE_WORKSPACE_IDS = new Set(["os-app-docs"]);

type FileProjection = {
  Status?: unknown;
  State?: unknown;
  status?: unknown;
  state?: unknown;
  Path?: unknown;
  path?: unknown;
  WorkspaceId?: unknown;
  workspace_id?: unknown;
  fields?: FileProjection;
};

function readString(
  fields: FileProjection,
  projection: FileProjection,
  keys: readonly (keyof FileProjection)[],
): string | undefined {
  for (const key of keys) {
    const value = fields[key] ?? projection[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Whether this file may be served to an unauthenticated caller.
 *
 * Gating used to be state-only: any file in `Ready` or `Locked` was served to
 * anyone who named its id. File ids are deterministic and guessable — an
 * installed agent skill is
 * `os-agent-skill-file-<soul>-<skill>` — so that made Katagami's entire agent
 * instruction set world-readable without needing a leak first. Obscurity was
 * never the control, and state was never a permission.
 *
 * So state is now necessary but not sufficient: a file is served only if it
 * also sits on a known public surface. The order matters — deny rules are
 * evaluated before the allowlist, and anything unrecognised is refused rather
 * than served, so a new private tree added tomorrow is closed by default
 * instead of open until somebody notices.
 *
 * Callers must return 404 for a refusal, never 403: a distinguishable "exists
 * but forbidden" would confirm which ids are real.
 */
export function isPubliclyServableFile(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const projection = value as FileProjection;
  const fields =
    projection.fields && typeof projection.fields === "object"
      ? projection.fields
      : projection;

  const state = readString(fields, projection, [
    "Status",
    "status",
    "State",
    "state",
  ]);
  if (!state || !PUBLIC_FILE_STATES.has(state)) return false;

  const workspaceId = readString(fields, projection, [
    "WorkspaceId",
    "workspace_id",
  ]);
  if (workspaceId && PRIVATE_WORKSPACE_IDS.has(workspaceId)) return false;

  // No path means we cannot place the file on a surface, so we cannot say it is
  // public. Fail closed.
  const path = readString(fields, projection, ["Path", "path"]);
  if (!path || !path.startsWith("/")) return false;

  if (PRIVATE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}
