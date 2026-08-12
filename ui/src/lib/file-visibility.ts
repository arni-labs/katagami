const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

/**
 * The workspace public artifacts live in, and the primary control.
 *
 * Workspace is the right axis because it is the durable fact: contributed,
 * curated artifacts are written to `katagami-contrib` and stay there, while
 * agent and operational content lives elsewhere. Path conventions inside that
 * workspace have already moved once — synthesis-time writes go to
 * `/katagami/...` while the published assets the site actually serves are under
 * `/languages/...` and `/art-styles/...` — so a rule keyed on path prefixes
 * would need revising every time the pipeline renames a directory, and would
 * fail closed on the live site whenever somebody forgot.
 */
const PUBLIC_WORKSPACE_IDS = new Set(["katagami-contrib"]);

/**
 * Workspaces that hold operational content and are never public.
 *
 * Checked before the allowlist, so adding a workspace above can never
 * accidentally re-expose one of these. `os-app-docs` is where OS apps install
 * agent documentation and skills.
 */
const PRIVATE_WORKSPACE_IDS = new Set(["os-app-docs"]);

/**
 * Trees that are never public, wherever they live.
 *
 * Not belt-and-braces: `/feedback/` is **inside** `katagami-contrib` — the
 * owner A/B review tooling appends verdicts to `/feedback/ab-verdicts.jsonl` in
 * that workspace (see `app/(site)/ab/actions.ts`). Under a workspace-only rule
 * that log would be world-readable. `/agents/` and `/system/` are the agent
 * instruction and operator-knowledge trees, denied here too so that a copy
 * appearing in a public workspace is still refused.
 */
const PRIVATE_PATH_PREFIXES = ["/agents/", "/system/", "/feedback/"] as const;

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
 * installed agent skill is `os-agent-skill-file-<soul>-<skill>` — so that made
 * Katagami's entire agent instruction set world-readable without needing a leak
 * first. Obscurity was never the control, and state was never a permission.
 *
 * State is now necessary but not sufficient. A file is served only if it also
 * lives in a public workspace and outside every private tree. Deny rules run
 * before the allowlist, and anything that cannot be placed — no workspace, no
 * path — is refused rather than served, so a surface added tomorrow is closed
 * by default instead of open until somebody notices.
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

  // No workspace means we cannot place the file, so we cannot call it public.
  const workspaceId = readString(fields, projection, [
    "WorkspaceId",
    "workspace_id",
  ]);
  if (!workspaceId || PRIVATE_WORKSPACE_IDS.has(workspaceId)) return false;

  // Likewise no path: the private-tree rules below could not be applied, and an
  // unapplied deny rule must never read as an allow.
  const path = readString(fields, projection, ["Path", "path"]);
  if (!path || !path.startsWith("/")) return false;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  return PUBLIC_WORKSPACE_IDS.has(workspaceId);
}

export type ServableFile = {
  bytes: ArrayBuffer;
  upstreamContentType: string;
};

/**
 * Resolve a file's bytes for the public proxy, or refuse.
 *
 * Lives beside the predicate, and out of the route handler, so the decision can
 * be executed in a test rather than only read: the property that matters — that
 * a refused file's bytes are never fetched at all — is about the order of two
 * network calls, and asserting that against source text proves the code says
 * the right thing, not that it does it. `fetchImpl` is injected for exactly
 * that reason.
 *
 * `null` is the only refusal, and it is deliberately undifferentiated. The
 * caller turns it into a 404 whether the file is missing, off-surface, or
 * upstream answered 401/403 — anything finer confirms which ids exist.
 */
export async function fetchServableFileBytes(
  fetchImpl: typeof fetch,
  apiBase: string,
  headers: Record<string, string>,
  id: string,
): Promise<ServableFile | null> {
  // PawFS retains archived bytes for governed recovery, and every agent skill
  // in the tenant is `Ready`, so the projection has to be resolved and judged
  // before a single byte is requested.
  const metadataRes = await fetchImpl(`${apiBase}/tdata/Files('${id}')`, {
    headers,
    cache: "no-store",
  });
  let metadata: unknown;
  if (metadataRes.ok) {
    try {
      metadata = await metadataRes.json();
    } catch {
      metadata = null;
    }
  }
  if (!metadataRes.ok || !isPubliclyServableFile(metadata)) return null;

  const res = await fetchImpl(`${apiBase}/tdata/Files('${id}')/$value`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;

  return {
    bytes: await res.arrayBuffer(),
    upstreamContentType: res.headers.get("content-type") || "",
  };
}
