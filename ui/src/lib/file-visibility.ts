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
 * Access is decided by PATH, and only by path. Workspace is deliberately not
 * consulted, because on this system it does not mean anything stable: it tracks
 * WHO WROTE the file, not what the file is. The agent-facing write tool is
 * `temper.write(path, content)` with no workspace argument at all
 * (`katagami-curation/agents/curator/AGENT.md`), so agent-written artifacts land
 * in whatever per-session workspace happens to exist — or in none. Resolving
 * every file reference on 107 under-review entities found 283 refs spread across
 * ELEVEN workspaces, seven of which appear nowhere in public traffic, plus 70
 * refs with no workspace at all. A workspace allowlist cannot be written against
 * a set that grows with every agent run.
 *
 * Worse, workspace does not even separate public from private here: 23 live
 * under-review assets sit INSIDE `os-app-docs` under `/katagami/**` — the same
 * workspace that holds the agent skills this fix exists to protect. Denying that
 * workspace wholesale would refuse real content; allowing it would expose every
 * skill. Only the path tells those two apart.
 *
 * So: `/agents/**` and `/system/**` are refused everywhere, `/iterate/**` and
 * `/feedback/**` are owner-only, and everything else is public in any workspace,
 * including files that have none. New path conventions — `/rebuild`,
 * `/artstyles`, whatever comes next — keep working without a code change, which
 * is what every earlier revision of this rule got wrong.
 *
 * RESIDUAL RISK, stated plainly: this protects agent content by knowing where it
 * lives. Verified for this codebase — installed skills sit under
 * `/agents/<soul>/…` and the operator knowledge base under `/system/knowledge/…`
 * — but ADR-0012 says only that MOST prompt assets are packaged under
 * `os-app-docs`, and an OS app that installed docs under some third prefix would
 * be public until a deny rule named it. That failure is visible (private content
 * appears on a public page) rather than silent, and the deny list is pinned by
 * `scripts/check-file-proxy-state-contract.mjs` so removing a rule fails loudly.
 * If app-doc install paths ever become configurable, this rule needs revisiting.
 */

const PUBLIC_FILE_STATES = new Set(["Ready", "Locked"]);

/**
 * Trees never served to anyone, in any workspace.
 *
 * The agent instruction tree and the operator knowledge base — every file this
 * fix exists to protect. Path-based on purpose: the same content appears in
 * `os-app-docs`, in per-soul bootstrap snapshots, and in agent sandboxes, and
 * only the path is common to all of them.
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
 * Deny rules run before any allow. Workspace is not consulted at all.
 *
 * A file with no readable PATH is `denied`. Every rule here is a path rule, so a
 * pathless file cannot be vetted, and an unapplied deny must never read as an
 * allow. That refusal has a measured cost and it is taken deliberately: 15 refs
 * on under-review DesignLanguages carry a `name` but neither a path nor a
 * workspace, and they serve today. Refusing them breaks the embodiment and
 * DESIGN.md of eight languages — lineplate-atelier,
 * memphis-postmodern-graphics-ui, nocturne-ink-screen-atlas,
 * vellum-wash-feature-editorial, expressive-line-digital-atmosphere,
 * mixed-media-inked-visual-essay, storyboard-product-humanism,
 * tokenized-spatial-minimalism.
 *
 * The breakage is confined to the owner's curation queue: `/under-review` is
 * owner-gated, and none of the 1,273 ids the public site fetches is pathless.
 * The repair is data, not more proxy logic — backfill the paths (ARN-313). The
 * alternative, serving a pathless file because some entity references its id,
 * would add a second classification mechanism, in a hot path, to compensate for
 * missing metadata; that is a band-aid over a data bug and a rule reviewers
 * would have to reason about twice.
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

  // No workspace check, deliberately — see the note at the top of this file.
  // Workspace tracks who wrote the file, not what it is: 11 distinct workspaces
  // hold under-review assets, 70 refs have no workspace at all, and 23 live
  // assets sit inside `os-app-docs` beside the skills. The path deny above has
  // already refused everything this fix protects, in every one of those places.
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
