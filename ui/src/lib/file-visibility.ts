const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

/**
 * The workspace artifacts live in, and the primary control.
 *
 * Workspace is the right axis because it is the durable fact: contributed
 * artifacts are written to `katagami-contrib` and stay there, while agent and
 * operational content lives elsewhere. Path conventions inside that workspace
 * have already moved once — synthesis-time writes go to `/katagami/...` while
 * the published assets the site serves are under `/languages/...` and
 * `/art-styles/...` — so a rule keyed only on path prefixes would need revising
 * on every directory rename, and would fail closed on the live site whenever
 * somebody forgot.
 */
const PUBLIC_WORKSPACE_IDS = new Set(["katagami-contrib"]);

/**
 * Workspaces that hold operational content and are never served.
 *
 * Checked before anything else, so adding a workspace above can never
 * accidentally re-expose one of these. `os-app-docs` is where OS apps install
 * agent documentation and skills.
 */
const PRIVATE_WORKSPACE_IDS = new Set(["os-app-docs"]);

/**
 * Trees never served to anyone through this proxy, wherever they live.
 *
 * The agent instruction tree and the operator knowledge base. Denied by path as
 * well as by workspace so that a copy appearing in a public workspace is still
 * refused.
 */
const NEVER_SERVED_PATH_PREFIXES = ["/agents/", "/system/"] as const;

/**
 * Trees inside the public workspace that only the owner may read.
 *
 * `katagami-contrib` is not uniformly public. A live listing of it (143 files,
 * 2026-08-12) found six top-level trees, and three of them are not catalogue
 * content:
 *
 * - `/contrib/` — full artifact sets (embodiment, landing, dashboard,
 *   DESIGN.md, components.md) for submissions awaiting curation. The only page
 *   that renders these is `/under-review`, which is explicitly the owner's desk:
 *   it calls `notFound()` for everyone else. Cards for unpublished entities
 *   route their thumbnail through this proxy — see `thumbnailProxyFileId` in
 *   `components/language-card.tsx` — so the owner genuinely needs these bytes
 *   and the public genuinely must not have them.
 * - `/iterate/` — `.jsonl` iteration logs, i.e. trajectory data. No UI reads
 *   them.
 * - `/feedback/` — the A/B verdict log. `app/(site)/ab/actions.ts` creates
 *   `/feedback/ab-verdicts.jsonl` in this workspace on the first verdict; the
 *   listing above predates that, so the tree is absent today and the rule is
 *   deliberately prospective.
 *
 * Owner-only rather than denied outright, because denying would break the
 * owner's own curation queue while closing nothing that owner-gating does not
 * already close.
 */
const OWNER_ONLY_PATH_PREFIXES = ["/contrib/", "/iterate/", "/feedback/"] as const;

export type FileVisibility = "public" | "owner" | "denied";

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
 * Who, if anyone, may read this file through the public proxy.
 *
 * Gating used to be state-only: any file in `Ready` or `Locked` was served to
 * anyone who named its id. File ids are deterministic and guessable — an
 * installed agent skill is `os-agent-skill-file-<soul>-<skill>` — so that made
 * Katagami's entire agent instruction set world-readable without needing a leak
 * first. Obscurity was never the control, and state was never a permission.
 *
 * State is now necessary but not sufficient. Deny rules run before any allow,
 * and anything that cannot be placed — no workspace, no path — is `denied`
 * rather than served, so a surface added tomorrow is closed by default instead
 * of open until somebody notices.
 *
 * A `denied` or unauthenticated-`owner` result must leave the route as a 404,
 * never a 403: a distinguishable "exists but forbidden" would confirm which ids
 * are real.
 */
export function classifyFileVisibility(value: unknown): FileVisibility {
  if (!value || typeof value !== "object") return "denied";
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
  if (!state || !PUBLIC_FILE_STATES.has(state)) return "denied";

  // No workspace means we cannot place the file, so we cannot serve it.
  const workspaceId = readString(fields, projection, [
    "WorkspaceId",
    "workspace_id",
  ]);
  if (!workspaceId || PRIVATE_WORKSPACE_IDS.has(workspaceId)) return "denied";

  // Likewise no path: the tree rules below could not be applied, and an
  // unapplied deny rule must never read as an allow.
  const path = readString(fields, projection, ["Path", "path"]);
  if (!path || !path.startsWith("/")) return "denied";
  if (NEVER_SERVED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "denied";
  }
  if (!PUBLIC_WORKSPACE_IDS.has(workspaceId)) return "denied";

  return OWNER_ONLY_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
    ? "owner"
    : "public";
}

/** Convenience for the common question. */
export function isPubliclyServableFile(value: unknown): boolean {
  return classifyFileVisibility(value) === "public";
}

export type ServableFile = {
  bytes: ArrayBuffer;
  upstreamContentType: string;
  /**
   * `owner` means these bytes are NOT public and must never be given a shared
   * cache header — the CDN would hand them to the next anonymous caller.
   */
  visibility: Exclude<FileVisibility, "denied">;
};

/**
 * Resolve a file's bytes for the proxy, or refuse.
 *
 * Lives beside the predicate, and out of the route handler, so the decision can
 * be executed in a test rather than only read: the property that matters — that
 * a refused file's bytes are never fetched at all — is about the order of two
 * network calls, and asserting that against source text proves the code says
 * the right thing, not that it does it. `fetchImpl` is injected for that
 * reason, and `isOwner` is a thunk so the session is only consulted for the few
 * files whose answer depends on it.
 *
 * `null` is the only refusal, and it is deliberately undifferentiated. The
 * caller turns it into a 404 whether the file is missing, off-surface, owner-
 * only for an anonymous caller, or upstream answered 401/403 — anything finer
 * confirms which ids exist.
 */
export async function fetchServableFileBytes(
  fetchImpl: typeof fetch,
  apiBase: string,
  headers: Record<string, string>,
  id: string,
  isOwner: () => Promise<boolean>,
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
  if (!metadataRes.ok) return null;

  const visibility = classifyFileVisibility(metadata);
  if (visibility === "denied") return null;
  if (visibility === "owner" && !(await isOwner())) return null;

  const res = await fetchImpl(`${apiBase}/tdata/Files('${id}')/$value`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;

  return {
    bytes: await res.arrayBuffer(),
    upstreamContentType: res.headers.get("content-type") || "",
    visibility,
  };
}
