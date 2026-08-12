import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPubliclyServableFile,
  classifyFileVisibility,
  fetchServableFileBytes,
  fileResponseHeaders,
  REFUSAL_STATUS,
} from "../src/lib/file-visibility.ts";

const OWNER = async () => true;
const ANON = async () => false;

const CONTRIB = "katagami-contrib";
const LEGACY = "ws-019d9c05-1483-78e0-b9e7-370c0bdce031";

// ── Live content, all four generations, read from tenant `default` 2026-08-12 ──
// Every path convention the pipeline has used is represented, because each one
// of these was missed by an earlier version of this rule.
const LIVE_PUBLIC = [
  // Every (workspace, prefix) pair the live site actually fetches, from
  // resolving all 1,273 proxy ids the public pages request. Counts are from
  // that resolution. No public-prefix allowlist exists any more, which is the
  // point: this long tail works because paths do not grant access.
  { what: "628 files", Path: "/rebuild/civic-press/embodiment.html", WorkspaceId: CONTRIB },
  { what: "192 files — UNHYPHENATED, the dominant art-style prefix", Path: "/artstyles/risograph-ember/hero.png", WorkspaceId: CONTRIB },
  {
    what: "180 files — contributor reference images rendered on the PUBLIC art-styles page",
    Id: "fl-019f24b9-7e28-78a3-b322-7d0ea1bdf97f",
    Path: "/contrib/plainclothes/ref-kitchen.png",
    WorkspaceId: CONTRIB,
  },
  { what: "179 files", Path: "/review/some-language/shot.png", WorkspaceId: CONTRIB },
  { what: "20 files", Path: "/batch/run-1/out.png", WorkspaceId: CONTRIB },
  { what: "15 files", Path: "/landing-thumbs/civic-press.png", WorkspaceId: CONTRIB },
  { what: "10 files", Path: "/rubric/scores.json", WorkspaceId: CONTRIB },
  { what: "9 files", Path: "/languages/civic-press/v10/embodiment.html", WorkspaceId: CONTRIB },
  { what: "hyphenated art-styles still exists alongside /artstyles", Path: "/art-styles/risograph-ember/hero-wide.png", WorkspaceId: CONTRIB },
  { what: "one-off prefixes that no allowlist would have predicted", Path: "/quadro/a.png", WorkspaceId: CONTRIB },
  { what: "one-off", Path: "/mossbank/b.png", WorkspaceId: CONTRIB },
  { what: "one-off", Path: "/cameo/c.png", WorkspaceId: CONTRIB },
  { what: "one-off", Path: "/impression/d.png", WorkspaceId: CONTRIB },
  { what: "palette tokens", Path: "/palettes/ember-signal/tokens.css", WorkspaceId: CONTRIB },
];
for (const file of LIVE_PUBLIC) {
  assert.equal(
    classifyFileVisibility({ fields: { Status: "Ready", ...file } }),
    "public",
    `${file.what} (${file.Path}) is live public content and must stay served`,
  );
}

// The older content generation, in the older projection. Reading only
// PascalCase would make these entities look pathless, and a pathless file fails
// closed — so the whole generation would 404.
assert.equal(
  classifyFileVisibility({
    fields: {
      Id: "fl-019dfae9-93ec-7642-a790-0f87a3d7e3c1",
      status: "Ready",
      path: "/katagami/thumbnails/cultured-review-literary-journal-system/desktop.jpg",
      workspace_id: LEGACY,
      name: "desktop.jpg",
      mime_type: "image/jpeg",
    },
  }),
  "public",
  "the legacy workspace, in lower-snake projection, must be served",
);
assert.equal(
  classifyFileVisibility({
    fields: {
      state: "Locked",
      path: "/katagami/embodiments/cultured-review-literary-journal-system.html",
      workspace_id: LEGACY,
    },
  }),
  "public",
  "legacy embodiments must be served, and Locked is readable",
);

// ── ARN-309: the disclosure this fix closes ──
// Verified world-readable before the fix:
//   curl https://katagami.ai/api/file/os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language
//   -> 200, 12,037 bytes of the internal curator skill.
const REAL_SKILL_FILE = {
  Id: "os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language",
  Status: "Ready",
  Path: "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
  WorkspaceId: "os-app-docs",
};
assert.equal(
  classifyFileVisibility({ fields: REAL_SKILL_FILE }),
  "denied",
  "agent skills must never be served to anyone",
);

// os-app-docs holds BOTH the agent skills this fix protects AND 23 live
// under-review assets under /katagami/**. Only the path separates them, which is
// exactly why workspace is not consulted at all.
assert.equal(
  classifyFileVisibility({
    fields: {
      Status: "Ready",
      Path: "/katagami/embodiments/some-language.html",
      WorkspaceId: "os-app-docs",
    },
  }),
  "public",
  "under-review assets inside os-app-docs must serve — 23 of them are live",
);
assert.equal(
  classifyFileVisibility({
    fields: {
      Status: "Ready",
      Path: "/agents/curator/skills/review-quality/SKILL.md",
      WorkspaceId: "os-app-docs",
    },
  }),
  "denied",
  "agent skills in that same workspace must still be refused",
);

// Per-session agent sandboxes: seven such workspaces hold under-review assets
// and none appear in public traffic, so no allowlist could ever have held them.
for (const ws of [
  "ws-019e89c5-0000-0000-0000-000000000000",
  "ws-019e8a00-0000-0000-0000-000000000000",
  "ws-katagami-curation",
  "katagami",
  "ws-brand-new-sandbox-never-seen",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: {
        Status: "Ready",
        Path: "/katagami/thumbnails/x/desktop.jpg",
        WorkspaceId: ws,
      },
    }),
    "public",
    `${ws} holds real content; workspace must not gate it`,
  );
}

// The agent/operator trees are denied even inside a servable workspace.
for (const p of [
  "/agents/curator/skills/review-quality/SKILL.md",
  "/system/knowledge/design-principles.md",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: { Status: "Ready", Path: p, WorkspaceId: CONTRIB },
    }),
    "denied",
    `${p} must be denied outright even inside ${CONTRIB}`,
  );
}

// The curation-queue trees are owner-only, not public.
for (const p of ["/iterate/iter-pushpin-1.jsonl", "/feedback/ab-verdicts.jsonl"]) {
  const meta = { fields: { Status: "Ready", Path: p, WorkspaceId: CONTRIB } };
  assert.equal(classifyFileVisibility(meta), "owner", `${p} must be owner-only`);
  assert.equal(isPubliclyServableFile(meta), false, `${p} must never be public`);
}

// Unclassifiable input fails closed rather than being served.
for (const meta of [
  null,
  {},
  { fields: { Status: "Ready", WorkspaceId: CONTRIB } }, // no path
  {
    fields: {
      Status: "Ready",
      Path: "languages/x.html",
      WorkspaceId: CONTRIB,
    },
  }, // relative
]) {
  assert.equal(
    classifyFileVisibility(meta),
    "denied",
    `unclassifiable metadata must fail closed: ${JSON.stringify(meta)}`,
  );
}

// 34 of the 1,273 ids carry NO workspace field at all — not a projection
// artifact: absent from the single-entity read too, in every casing. They are
// served publicly today (verified live, 200 + ~2MB), so refusing what we cannot
// place would take real public imagery dark. They are classified on path alone.
// This is the exact field set those entities return.
const WORKSPACELESS_LIVE = {
  Id: "fl-019efaa4-6dd5-79b2-ba06-9ab54b73eaa3",
  Status: "Ready",
  path: "/artstyles/opaline-soft-diffusion/opaline-melon.png",
  content_hash: "sha256:whatever",
  created_by: "",
  has_content: true,
  mime_type: "image/png",
  size_bytes: 2092392,
  version_count: 1,
  version_number: 1,
};
assert.equal(
  classifyFileVisibility({ fields: WORKSPACELESS_LIVE }),
  "public",
  "workspace-less live content must still be served — it is public today",
);
for (const p of [
  "/katagami/thumbnails/cultured-review-literary-journal-system/desktop.jpg",
  "/artstyles/opaline-soft-diffusion/opaline-face.png",
  "/artstyles/opaline-soft-diffusion/opaline-teapot.png",
]) {
  assert.equal(
    classifyFileVisibility({ fields: { Status: "Ready", path: p } }),
    "public",
    `${p} is workspace-less live content and must be served`,
  );
}

// The safety property that makes the fallback acceptable: the deny trees are
// absolute, so a workspace-less file in a protected tree is STILL refused.
for (const p of [
  "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
  "/system/knowledge/design-principles.md",
]) {
  assert.equal(
    classifyFileVisibility({ fields: { Status: "Ready", path: p } }),
    "denied",
    `${p} must stay denied even with no workspace to judge it by`,
  );
}
assert.equal(
  classifyFileVisibility({
    fields: { Status: "Ready", path: "/iterate/run.jsonl" },
  }),
  "owner",
  "owner-only trees keep their rule without a workspace",
);

// 15 refs on live under-review DesignLanguages carry a `name` but NEITHER a
// path nor a workspace, and they serve today. Every rule here is a path rule,
// so they cannot be vetted and are refused — an unapplied deny must never read
// as an allow. Measured cost, taken deliberately: the embodiment and DESIGN.md
// of eight languages break in the owner's queue until the paths are backfilled
// (ARN-313). Confined to the owner: /under-review is owner-gated and none of
// the 1,273 ids the public site fetches is pathless.
for (const meta of [
  // Agent REPL state: 115 of these sit in os-app-docs, 12/12 sampled publicly
  // served at 85-180 KB, carrying serialized interpreter state from curator
  // sandbox sessions. Refusing pathless files removes that exposure — this
  // branch is part of the fix, not only a cost.
  {
    fields: {
      Status: "Ready",
      name: "repl_state.b64",
      mime_type: "text/plain",
      size_bytes: 131072,
    },
  },
  // The real under-review shape: Ready, has a name, no path, no workspace.
  {
    fields: {
      Id: "fl-019ddbdc-f486-0000-0000-000000000000",
      Status: "Ready",
      name: "lineplate-atelier.html",
      mime_type: "text/html",
      size_bytes: 13216,
    },
  },
  { fields: { Status: "Ready", path: "" } },
  { fields: { Status: "Ready" } },
]) {
  assert.equal(
    classifyFileVisibility(meta),
    "denied",
    "a file with no usable path cannot be classified and must be refused",
  );
}

// State is still necessary; it is simply no longer sufficient.
for (const state of ["Created", "Archived", "Deleted", "", null]) {
  assert.equal(
    classifyFileVisibility({
      fields: {
        Status: state,
        Path: "/languages/civic-press/v10/embodiment.html",
        WorkspaceId: CONTRIB,
      },
    }),
    "denied",
    `${String(state)} must fail closed`,
  );
}

// ── The orchestration, executed rather than read ──
// The property that matters is an ordering one: a refused file's bytes are
// never requested. Only running it can show that.
function stubFetch(metadata, { metadataStatus = 200, valueStatus = 200 } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/$value")) {
      return {
        ok: valueStatus >= 200 && valueStatus < 300,
        status: valueStatus,
        headers: { get: () => "text/html" },
        arrayBuffer: async () => new TextEncoder().encode("BYTES").buffer,
      };
    }
    return {
      ok: metadataStatus >= 200 && metadataStatus < 300,
      status: metadataStatus,
      json: async () => metadata,
    };
  };
  return { impl, calls };
}

{
  const { impl, calls } = stubFetch({ fields: REAL_SKILL_FILE });
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    REAL_SKILL_FILE.Id,
    OWNER,
  );
  assert.equal(
    out,
    null,
    "the agent skill must be refused end to end, even for the owner",
  );
  assert.equal(calls.length, 1, "exactly one upstream call for a refusal");
  assert.ok(
    !calls.some((u) => u.endsWith("/$value")),
    "a refused file's BYTES must never be fetched",
  );
}

{
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/rebuild/civic-press/embodiment.html",
      WorkspaceId: CONTRIB,
    },
  };
  const { impl, calls } = stubFetch(meta);
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "fl-rebuild",
    ANON,
  );
  assert.ok(out, "a published embodiment must be served to anyone");
  assert.equal(out.visibility, "public");
  assert.equal(new TextDecoder().decode(out.bytes), "BYTES");
  assert.ok(
    calls.some((u) => u.endsWith("/$value")),
    "bytes are fetched when allowed",
  );
}

{
  // An owner-only tree: refused for anonymous with no byte fetch, served to the
  // owner and marked so the route can suppress shared caching.
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/iterate/iter-pushpin-1.jsonl",
      WorkspaceId: CONTRIB,
    },
  };

  const anon = stubFetch(meta);
  assert.equal(
    await fetchServableFileBytes(anon.impl, "http://api", {}, "fl-c", ANON),
    null,
    "trajectory logs must be refused to an anonymous caller",
  );
  assert.ok(
    !anon.calls.some((u) => u.endsWith("/$value")),
    "an owner-only file's bytes must not be fetched for an anonymous caller",
  );

  const owner = stubFetch(meta);
  const out = await fetchServableFileBytes(
    owner.impl,
    "http://api",
    {},
    "fl-c",
    OWNER,
  );
  assert.ok(out, "the owner can still open one by id");
  assert.equal(out.visibility, "owner", "owner-only bytes must be labelled");
}

{
  // The session is only consulted when the answer depends on it.
  let asked = 0;
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/languages/civic-press/v10/embodiment.html",
      WorkspaceId: CONTRIB,
    },
  };
  const { impl } = stubFetch(meta);
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "fl-p",
    async () => {
      asked += 1;
      return false;
    },
  );
  assert.ok(out, "published assets serve without a session");
  assert.equal(out.visibility, "public");
  assert.equal(asked, 0, "public files must not read the session cookie");
}

{
  // The id comes off the URL and must be escaped before it is interpolated into
  // the OData key. Unescaped, `os-app-guide-paw-agent')?x=` closed the key and
  // returned entity JSON including the full event history to an anonymous
  // caller.
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/languages/x.html",
      WorkspaceId: CONTRIB,
    },
  };
  const { impl, calls } = stubFetch(meta);
  await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "os-app-guide-paw-agent')?x=",
    ANON,
  );
  for (const url of calls) {
    assert.ok(
      !/'\)\?/.test(url) && !url.includes("')?x="),
      `the OData key must be escaped, got ${url}`,
    );
  }

  // Load-bearing: the COLLECTION projection omits workspace_id for the legacy
  // generation. Reading the single-entity shape is what keeps those assets
  // classifiable, so the metadata read must never become a filtered listing.
  assert.ok(
    calls[0].includes("/tdata/Files('") && !calls[0].includes("$filter"),
    `metadata must be a single-entity read, got ${calls[0]}`,
  );
}

{
  // Unknown id: upstream 404 on metadata, so no byte fetch and no result.
  const { impl, calls } = stubFetch(null, { metadataStatus: 404 });
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "fl-does-not-exist",
    ANON,
  );
  assert.equal(out, null, "an unknown id is refused");
  assert.ok(!calls.some((u) => u.endsWith("/$value")));
}

{
  // Upstream forbids the bytes after we allowed the metadata: still a plain
  // refusal, so a caller cannot distinguish it from "no such file".
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/languages/civic-press/v10/embodiment.html",
      WorkspaceId: CONTRIB,
    },
  };
  const { impl } = stubFetch(meta, { valueStatus: 403 });
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "fl-019ef224-4a00",
    ANON,
  );
  assert.equal(out, null, "an upstream 403 must collapse to a plain refusal");
}

// ── Protected trees ──
// ARN-309 review P0-1: the kernel installs every OS app's operations manual
// under a THIRD prefix in the SAME workspace as the skills —
// `APP_DOCS_ROOT_PATH = "/apps"` writes `/apps/{app}/APP.md` to `os-app-docs`
// with the deterministic id `os-app-guide-{app_slug}`. 17 of 19 os-apps
// answered 200 unauthenticated before this rule denied the tree.
// P0-2: `/projects/**` is the third skill-install scope
// (`skill_installer` writes `/projects/{scope}/skills/{slug}/SKILL.md`, and
// `context_preparer` loads it into the agent prompt). The kernel's own
// protected-tree predicate names /system, /agents and /projects.
for (const p of [
  // Enumerating os-app-docs (679 files) turned up two scratch trees and a
  // ROOT-level app manual outside /apps — the same document at a new location,
  // which is the bug /apps itself was.
  "/APP.md",
  "/app.md",
  "/katagami/embodiments/APP.md",
  "/probe/rt-1782861556/thing.png",
  "/tmp/scratch.json",
  "/apps/katagami-curation/APP.md",
  "/apps/paw-patrol/APP.md",
  "/apps/katagami-commons/adrs/0001-whatever.md",
  "/projects/proj-123/skills/review-quality/SKILL.md",
  "/agents/curator/skills/review-quality/SKILL.md",
  "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
  "/system/knowledge/design-principles.md",
]) {
  for (const ws of ["os-app-docs", CONTRIB, undefined]) {
    assert.equal(
      classifyFileVisibility({
        fields: { Status: "Ready", Path: p, ...(ws ? { WorkspaceId: ws } : {}) },
      }),
      "denied",
      `${p} must be denied in ${ws ?? "no workspace"}`,
    );
  }
}

// ── Path canonicalization ──
// The deny used to compare the raw stored string, so every one of these named a
// protected file and classified public.
for (const p of [
  "//agents/curator/skills/x/SKILL.md",
  "/./agents/curator/skills/x/SKILL.md",
  "/rebuild/../agents/curator/skills/x/SKILL.md",
  "/Agents/curator/skills/x/SKILL.md",
  "/AGENTS/curator/skills/x/SKILL.md",
  "/%61gents/curator/skills/x/SKILL.md",
  "/agents%2Fcurator/skills/x/SKILL.md",
  "/ agents/curator/skills/x/SKILL.md",
  "/apps/../apps/paw-patrol/APP.md",
  "/%61pps/paw-patrol/APP.md",
  "/Projects/p/skills/x/SKILL.md",
  "/languages/a/../../agents/curator/SKILL.md",
  "\\agents\\curator\\SKILL.md",
  "relative/agents/x.md",
  "/languages/bad%ZZescape.html",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: { Status: "Ready", Path: p, WorkspaceId: CONTRIB },
    }),
    "denied",
    `${p} must not reach a protected tree past the deny`,
  );
}
// Real paths are canonical and keep their case — /contrib/pyrite/DESIGN.md is
// live content, so canonicalization must not lowercase or otherwise rewrite it.
for (const p of [
  "/contrib/pyrite/DESIGN.md",
  "/languages/civic-press/v10/DESIGN.md",
  "/artstyles/opaline-soft-diffusion/opaline-melon.png",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: { Status: "Ready", Path: p, WorkspaceId: CONTRIB },
    }),
    "public",
    `${p} is canonical live content and must serve`,
  );
}

// ── Response shape, executed ──
// These three properties were previously asserted by grepping the route source,
// and all three mutations survived that: deleting `Vary: Cookie`, adding a
// shared CDN directive on the owner branch, and turning the 404 into a 403.
assert.equal(REFUSAL_STATUS, 404, "refusals must not confirm an id exists");
{
  const owner = fileResponseHeaders({
    visibility: "owner",
    contentType: "text/html",
    isImage: false,
    byteLength: 10,
  });
  assert.equal(owner["Cache-Control"], "private, no-store");
  assert.equal(owner["CDN-Cache-Control"], "private, no-store");
  assert.equal(owner["Vercel-CDN-Cache-Control"], "private, no-store");
  assert.equal(owner["Vary"], "Cookie", "owner responses must vary on cookie");
  for (const [k, v] of Object.entries(owner)) {
    assert.ok(
      !/public/.test(v),
      `owner-only response must carry no shared cache directive (${k}: ${v})`,
    );
  }

  const pub = fileResponseHeaders({
    visibility: "public",
    contentType: "image/png",
    isImage: true,
    byteLength: 10,
  });
  assert.match(pub["Cache-Control"], /^public,/);
  assert.match(pub["CDN-Cache-Control"], /^public,/);
  assert.equal(pub["Vary"], undefined, "public responses need no cookie vary");
  assert.equal(pub["Content-Disposition"], "inline");
  assert.equal(pub["Content-Length"], "10");
}

// ── Route wiring ──
const route = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/app/api/file/[id]/route.ts",
  ),
  "utf8",
);
assert.match(
  route,
  /fetchServableFileBytes\(/,
  "the route must go through the gated reader",
);
assert.doesNotMatch(
  route,
  /\$\{API_BASE\}\/tdata\/Files\('\$\{id\}'\)\/\$value/,
  "the route must not fetch bytes directly, bypassing the gate",
);
assert.doesNotMatch(
  route,
  /status:\s*res\.status/,
  "upstream status must not be forwarded; it confirms the id exists",
);

console.log("file proxy scope contract: pass");
