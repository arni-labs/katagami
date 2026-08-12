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
 * THIS GATE IS NOT THE ONLY DOOR, so do not read it as one. As of 2026-08-12 the
 * production Temper API answers unauthenticated requests that simply declare
 * themselves anonymous — `X-Temper-Principal-Kind: customer` plus
 * `X-Temper-Principal-Id: anonymous` returns 200 on `/tdata/Files` where the
 * same request without those headers returns 401 (ARN-315, critical). So skill
 * bytes remain reachable through the governed API regardless of what this file
 * decides. Closing that is ARN-315's job; closing the proxy path is this one's.
 * Anyone tempted to relax a rule here because "the skills are protected" should
 * check whether ARN-315 has actually shipped first.
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
 * **This list must track the platform's own protected-tree predicate**
 * (`monty_repl/src/entity_ops.rs:2001-2008`, which names `/system`, `/agents`
 * and `/projects`). That predicate is the authority on what the kernel treats as
 * protected; a list assembled by reading this repo alone has already been wrong
 * twice, so when they disagree, follow the kernel and update here.
 *
 * - `/agents/` — installed skills and per-soul bootstrap snapshots.
 * - `/system/` — the operator knowledge base agents read.
 * - `/projects/` — the third skill-install scope. `paw-skills`'
 *   `skill_installer` writes `/projects/{scope_id}/skills/{slug}/SKILL.md` and
 *   `context_preparer` loads that prefix into the agent system prompt beside the
 *   other two. Latent on this tenant, one governed action away from not being.
 * - `/apps/` — every OS app's operations manual. The kernel writes
 *   `/apps/{app}/APP.md` into `os-app-docs` with the deterministic id
 *   `os-app-guide-{app_slug}`, plus ADRs as `os-app-adr-{app}-{file}`. This one
 *   is NOT in the kernel predicate and was world-readable in production: 17 of
 *   19 os-apps answered 200 unauthenticated, ids derivable from app names.
 * - `/probe/`, `/tmp/` — scratch trees found by enumerating the workspace (15
 *   files and 1). Nobody's public content, and a scratch tree inside the docs
 *   workspace is precisely where something private lands by accident.
 *
 * Path-based on purpose: the same content appears in `os-app-docs`, in per-soul
 * snapshots, and in agent sandboxes, and only the path is common to all of them.
 */
const NEVER_SERVED_PATH_PREFIXES = [
  "/agents/",
  "/system/",
  "/projects/",
  "/apps/",
  "/probe/",
  "/tmp/",
] as const;

/**
 * Filenames never served, wherever they sit.
 *
 * `APP.md` is an OS app's operations manual. The kernel writes them to
 * `/apps/{app}/APP.md`, which the prefix list covers — but enumerating
 * `os-app-docs` also turned up a bare `/APP.md` at the workspace ROOT, outside
 * that tree and therefore public under a prefix-only rule. Denying the filename
 * closes the class instead of the one instance, which is the lesson `/apps`
 * itself taught: the same document at a new location is the recurring bug.
 */
const NEVER_SERVED_BASENAMES = ["app.md"] as const;

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
 * The path in canonical form, or `null` if it has none.
 *
 * The deny rules used to compare the raw stored string, which meant they were
 * only as good as every writer's discipline: `//agents/x`, `/./agents/x`,
 * `/rebuild/../agents/x`, `/%61gents/x`, `/agents%2Fcurator/x` and `/ agents/x`
 * all slipped past a `startsWith("/agents/")` check while naming a protected
 * file. No live bypass exists today because writers happen to normalize, but
 * `pawfs_normalize_path` resolves neither `.`/`..` nor percent-escapes, so that
 * was an invariant depended on and never enforced.
 *
 * Decodes percent-escapes, collapses repeated separators, resolves `.` and
 * `..`, and trims whitespace around each segment. Case is preserved — real
 * paths contain `DESIGN.md` — and folded only when comparing prefixes.
 */
function canonicalPath(raw: string): string | null {
  let decoded = raw;
  for (let i = 0; i < 3; i += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      // A malformed escape is not something to guess at.
      return null;
    }
    if (next === decoded) break;
    decoded = next;
  }
  if (!decoded.startsWith("/")) return null;
  // A NUL or backslash in a stored path is never legitimate here and both are
  // classic separator-confusion tricks.
  if (decoded.includes("\0") || decoded.includes("\\")) return null;

  const out: string[] = [];
  for (const rawSegment of decoded.split("/")) {
    const segment = rawSegment.trim();
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return `/${out.join("/")}`;
}

/**
 * Who, if anyone, may read this file.
 *
 * Deny rules run before any allow. Workspace is not consulted at all.
 *
 * A file with no readable PATH is `denied`. Every rule here is a path rule, so a
 * pathless file cannot be vetted, and an unapplied deny must never read as an
 * allow. That refusal cuts both ways, and conflating the two halves would
 * misrepresent both:
 *
 * The COST. 15 refs on under-review DesignLanguages carry a `name` but neither a
 * path nor a workspace, and they serve today. Refusing them breaks the
 * embodiment and DESIGN.md of eight languages — lineplate-atelier,
 * memphis-postmodern-graphics-ui, nocturne-ink-screen-atlas,
 * vellum-wash-feature-editorial, expressive-line-digital-atmosphere,
 * mixed-media-inked-visual-essay, storyboard-product-humanism,
 * tokenized-spatial-minimalism. Confined to the owner's curation queue —
 * `/under-review` is owner-gated, and none of the 1,273 ids the public site
 * fetches is pathless. Accepted deliberately; the repair is data, not more proxy
 * logic (ARN-313).
 *
 * The BENEFIT, which is larger. Enumerating `os-app-docs` found 115 pathless
 * files there, 12 of 12 sampled publicly served at 85–180 KB each, identified as
 * `repl_state.b64` — serialized interpreter state from curator sandbox sessions,
 * carrying variable names, taste-rule fragments, log text and working data.
 * Nothing on the public site renders those; they are agent working memory that
 * anyone with an id could download. Refusing pathless files removes that
 * exposure, so this branch is part of the fix and not only collateral.
 *
 * Serving a pathless file because some entity references its id was the
 * alternative and is rejected: a second classification mechanism, in a hot path,
 * compensating for missing metadata — a band-aid over a data bug, and it would
 * have re-exposed the REPL state too.
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

  const stored = readString(fields, projection, ["Path", "path"]);
  if (!stored) return "denied";
  const path = canonicalPath(stored);
  if (!path) return "denied";
  // A stored path that is not already canonical is refused outright rather than
  // classified on its cleaned-up form. Something wrote it oddly, and this is a
  // security decision — the safe answer to "why does this path need rewriting
  // before I can judge it?" is not to judge it.
  if (path !== stored) return "denied";

  const lowered = path.toLowerCase();
  if (NEVER_SERVED_PATH_PREFIXES.some((prefix) => lowered.startsWith(prefix))) {
    return "denied";
  }
  const basename = lowered.slice(lowered.lastIndexOf("/") + 1);
  if (NEVER_SERVED_BASENAMES.includes(basename as never)) return "denied";

  // No workspace check, deliberately — see the note at the top of this file.
  // Workspace tracks who wrote the file, not what it is: 11 distinct workspaces
  // hold under-review assets, 70 refs have no workspace at all, and 23 live
  // assets sit inside `os-app-docs` beside the skills. The path deny above has
  // already refused everything this fix protects, in every one of those places.
  return OWNER_ONLY_PATH_PREFIXES.some((prefix) => lowered.startsWith(prefix))
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
  // The id comes straight off the URL, so it is escaped before it is
  // interpolated. Unescaped, `os-app-guide-paw-agent')?x=` closed the OData key
  // and returned 9,742 bytes of entity JSON — including the full event history —
  // to an anonymous caller. It was not a deny bypass (both URLs derive from the
  // same string, so a denied file still denied), but it is unvalidated input in
  // a security path, it disclosed event logs, and it broke the guarantee that
  // this is a single-entity read.
  const key = encodeURIComponent(id);

  // PawFS retains archived bytes for governed recovery, and every agent skill
  // in the tenant is `Ready`, so the projection has to be resolved and judged
  // before a single byte is requested.
  const metadataRes = await fetchImpl(`${apiBase}/tdata/Files('${key}')`, {
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

  const res = await fetchImpl(`${apiBase}/tdata/Files('${key}')/$value`, {
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

/**
 * The status a refusal is served with. 404, never 403.
 *
 * A distinguishable "exists but forbidden" confirms which ids are real, and
 * these ids are guessable by construction (`os-agent-skill-file-<soul>-<skill>`,
 * `os-app-guide-<app>`). Exported so the route cannot drift from it and a test
 * can execute it rather than grep for it.
 */
export const REFUSAL_STATUS = 404;

/**
 * Response headers for a served file.
 *
 * Pulled out of the route handler because three properties this fix depends on
 * were previously asserted by pattern-matching the route's source, and a source
 * assertion proves the code says the right thing rather than that it does it.
 * Deleting `Vary: Cookie`, or adding a shared `CDN-Cache-Control` after the
 * owner branch — the exact leak the owner path was designed against — both
 * survived that. They do not survive an executed test.
 *
 * Owner-only bytes must never carry a shared cache directive: a CDN does not
 * know who asked, so a cached curation asset from the owner's own page load
 * would be handed to the next anonymous caller.
 */
export function fileResponseHeaders(opts: {
  visibility: Exclude<FileVisibility, "denied">;
  contentType: string;
  isImage: boolean;
  byteLength: number;
}): Record<string, string> {
  const ownerOnly = opts.visibility === "owner";
  const browserCache = ownerOnly
    ? "private, no-store"
    : opts.isImage
      ? "public, max-age=3600, stale-while-revalidate=86400"
      : "public, max-age=0, must-revalidate";
  // Images are content-addressed and immutable. HTML compositions are re-PUT in
  // place during curation, so a long CDN cache makes every fix invisible for a
  // day; short-cache them instead.
  const cdnCache = ownerOnly
    ? "private, no-store"
    : opts.isImage
      ? "public, s-maxage=86400, stale-while-revalidate=604800"
      : "public, s-maxage=30, must-revalidate";

  const out: Record<string, string> = {
    "Content-Type": opts.contentType,
    // Design artifacts meant to render in-browser or inside iframes — never
    // force a download, regardless of the stored mime.
    "Content-Disposition": "inline",
    "Cache-Control": browserCache,
    "CDN-Cache-Control": cdnCache,
    "Vercel-CDN-Cache-Control": cdnCache,
    "Content-Length": String(opts.byteLength),
  };
  if (ownerOnly) out["Vary"] = "Cookie";
  return out;
}
