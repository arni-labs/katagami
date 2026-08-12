/**
 * Who may read a stored file through the public `/api/file/<id>` proxy.
 *
 * The proxy holds the app's backend credential, so whatever it agrees to fetch
 * is effectively public. It used to gate on file state alone — any `Ready` or
 * `Locked` file was served to anyone who named its id — which made Katagami's
 * entire agent instruction set world-readable, since every installed skill is
 * `Ready` and its id is deterministic (`os-agent-skill-file-<soul>-<skill>`).
 * State was never a permission and obscurity was never the control.
 *
 * The shape here is an ALLOWLIST of workspaces with a DENY-LIST of trees inside
 * them, and the asymmetry is deliberate. Workspaces are few, change rarely, and
 * a new one appearing is exactly the dangerous case: install another OS app and
 * its docs land in a workspace nobody wrote a rule for. Under an allowlist that
 * workspace is closed until somebody admits it. Path conventions, by contrast,
 * churn constantly inside a workspace — `/katagami` then `/languages` then
 * `/rebuild` — and every attempt to enumerate them missed a live case, so paths
 * are used only to carve exceptions out, never to grant access.
 *
 * RESIDUAL RISK, stated plainly: a new PRIVATE tree added inside a servable
 * workspace is public until a deny rule is written for it. That is the cost of
 * this shape. The trade is that the failure is visible and immediate — content
 * that should be private shows up on a public page — where an allowlist miss on
 * a new workspace would be a silent leak nobody notices. Both lists are pinned
 * by `scripts/check-file-proxy-state-contract.mjs`, so deleting a rule fails
 * loudly rather than quietly widening access.
 */

const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

/**
 * Workspaces whose files may be served at all.
 *
 * Derived from what published and under-review catalogue entities actually
 * reference, not from a guess: `katagami-contrib` holds current content, and
 * `ws-019d9c05-…` is an older content workspace still referenced by live
 * entities (it holds `/katagami/embodiments/**` and `/katagami/thumbnails/**`).
 *
 * Anything in an unlisted workspace is refused — including `os-app-docs`, where
 * OS apps install agent skills and documentation. That is not spelled out as a
 * separate deny rule because a rule that can never fire reads as though it were
 * load-bearing; the allowlist already closes it, and the contract test asserts
 * `os-app-docs` is denied so the intent stays recorded.
 */
const SERVABLE_WORKSPACE_IDS = new Set([
  "katagami-contrib",
  "ws-019d9c05-1483-78e0-b9e7-370c0bdce031",
]);

/**
 * Trees never served to anyone, in any workspace.
 *
 * The agent instruction tree and the operator knowledge base. Denied by path as
 * well as excluded by workspace so that a copy landing in a servable workspace
 * is still refused.
 */
const NEVER_SERVED_PATH_PREFIXES = ["/agents/", "/system/"] as const;

/**
 * Trees inside a servable workspace that only the owner may read.
 *
 * - `/iterate/` — `.jsonl` iteration logs, i.e. trajectory data.
 * - `/feedback/` — the A/B verdict log. `app/(site)/ab/actions.ts` creates
 *   `/feedback/ab-verdicts.jsonl` in `katagami-contrib` on the first verdict
 *   submission, so the tree is absent today and this rule is prospective.
 *
 * Neither is fetched through this proxy by any page — nothing reads the
 * iteration logs, and the verdict log is read server-side with the app
 * credential. Owner-only rather than denied outright so the owner can still
 * open one by id while debugging, which costs nothing given the cookie gate and
 * the `no-store` handling in the route.
 *
 * `/contrib/` was in this list and has been REMOVED, because the assumption
 * behind it was wrong. It does hold artifact sets for submissions awaiting
 * curation, but it ALSO holds contributor-uploaded reference images that the
 * PUBLIC art-styles page renders: `refImageUrls` in
 * `app/(site)/art-styles/[id]/page.tsx` collects ids from `reference_manifest`,
 * the `reference_assets` keys and `reference_image_file_ids`, and 180 of the
 * 1,273 ids the live site fetches resolve under `/contrib`. Verified example:
 * `/contrib/plainclothes/ref-kitchen.png` is served unauthenticated today and
 * is referenced from the public `/art-styles` listing. Path cannot separate the
 * two kinds, so owner-gating the tree would have 404'd live public imagery.
 *
 * The consequence, stated rather than hidden: an under-review submission's
 * artifacts under `/contrib` stay publicly readable to anyone who knows the id.
 * That is the behaviour that already exists — this change does not widen it —
 * but whether drafts should be public is a product decision, and separating
 * them needs the referencing entity's status, which a path cannot express.
 */
const OWNER_ONLY_PATH_PREFIXES = ["/iterate/", "/feedback/"] as const;

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

/**
 * Read a value under either projection.
 *
 * The backend returns PascalCase (`Path`, `WorkspaceId`) for newer entities and
 * lower-snake (`path`, `workspace_id`) for older ones — same endpoint, same
 * query, differing by entity. This must stay at RUNTIME and not only in tests:
 * reading one spelling makes an old entity look pathless, and a file that
 * cannot be placed fails closed, so the whole older generation would 404.
 */
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
 * Who, if anyone, may read this file.
 *
 * Deny rules run before any allow, and anything that cannot be placed — no
 * workspace, no path, unreadable projection — is `denied` rather than served.
 *
 * A `denied` result, and an `owner` result for a caller who is not the owner,
 * must both leave the route as a 404 — never a 403. A distinguishable "exists
 * but forbidden" would confirm which ids are real, and these ids are guessable.
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

  const path = readString(fields, projection, ["Path", "path"]);
  if (!path || !path.startsWith("/")) return "denied";
  if (NEVER_SERVED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "denied";
  }

  const workspaceId = readString(fields, projection, [
    "WorkspaceId",
    "workspace_id",
  ]);
  if (!workspaceId || !SERVABLE_WORKSPACE_IDS.has(workspaceId)) return "denied";

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
