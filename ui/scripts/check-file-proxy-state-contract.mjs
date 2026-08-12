import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPubliclyServableFile,
  classifyFileVisibility,
  fetchServableFileBytes,
} from "../src/lib/file-visibility.ts";

const OWNER = async () => true;
const ANON = async () => false;

const CONTRIB = "katagami-contrib";
const LEGACY = "ws-019d9c05-1483-78e0-b9e7-370c0bdce031";

// ── Live content, all four generations, read from tenant `default` 2026-08-12 ──
// Every path convention the pipeline has used is represented, because each one
// of these was missed by an earlier version of this rule.
const LIVE_PUBLIC = [
  {
    what: "/rebuild embodiment — 37 of 40 sampled published languages",
    Path: "/rebuild/civic-press/embodiment.html",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/languages embodiment (DesignLanguages.embodiment_file_id)",
    Id: "fl-019ef224-4a00-7290-80d2-5cf4f1cfee67",
    Path: "/languages/civic-press/v10/embodiment.html",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/languages thumbnail (DesignLanguages.thumbnail_file_id)",
    Id: "fl-019ef224-6a71-7d23-925f-71232ab82f44",
    Path: "/languages/civic-press/v10/thumb.jpg",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/languages preview shots (shadcn_preview_shots_file_id)",
    Id: "fl-019ef1b8-3d76",
    Path: "/languages/civic-press/shadcn-v2/preview-shots.json",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/art-styles hero embedded INSIDE generated landing HTML",
    Id: "fl-019ef1c9-a74d-7e83-9bca-0423664cd0b1",
    Path: "/art-styles/risograph-ember/hero-wide.png",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/art-styles hero, second embedded reference",
    Id: "fl-019ef131-c607-7940-91a0-c4e8ec2a34dd",
    Path: "/art-styles/risograph-ember/hero.png",
    WorkspaceId: CONTRIB,
  },
  {
    what: "/palettes published tokens",
    Path: "/palettes/ember-signal/tokens.css",
    WorkspaceId: CONTRIB,
  },
];
for (const file of LIVE_PUBLIC) {
  assert.equal(
    classifyFileVisibility({ fields: { Status: "Ready", ...file } }),
    "public",
    `${file.what} (${file.Path}) is live public content and must stay served`,
  );
}

// The older content workspace, in the older projection. Both halves matter:
// an unlisted workspace 404s the whole generation, and reading only PascalCase
// makes these entities look pathless, which also fails closed.
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

// os-app-docs is denied by the workspace allowlist. There is no separate deny
// rule for it — this assertion is where that intent is recorded.
assert.equal(
  classifyFileVisibility({
    fields: {
      Status: "Ready",
      Path: "/languages/looks-legit/embodiment.html",
      WorkspaceId: "os-app-docs",
    },
  }),
  "denied",
  "os-app-docs is not servable however public the path looks",
);

// A workspace nobody has admitted — e.g. a newly installed OS app — is closed
// by default. This is the whole reason the workspace axis is an allowlist.
assert.equal(
  classifyFileVisibility({
    fields: {
      Status: "Ready",
      Path: "/languages/some/thing.html",
      WorkspaceId: "ws-brand-new-app-0000",
    },
  }),
  "denied",
  "an unlisted workspace must be closed by default",
);

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
for (const p of [
  "/contrib/pyrite/embodiment.html",
  "/contrib/pyrite/DESIGN.md",
  "/contrib/pyrite/test.html",
  "/iterate/iter-pushpin-1.jsonl",
  "/feedback/ab-verdicts.jsonl",
]) {
  const meta = { fields: { Status: "Ready", Path: p, WorkspaceId: CONTRIB } };
  assert.equal(classifyFileVisibility(meta), "owner", `${p} must be owner-only`);
  assert.equal(isPubliclyServableFile(meta), false, `${p} must never be public`);
}

// Unclassifiable input fails closed rather than being served.
for (const meta of [
  null,
  {},
  { fields: { Status: "Ready", Path: "/languages/x.html" } }, // no workspace
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
      Path: "/contrib/pyrite/embodiment.html",
      WorkspaceId: CONTRIB,
    },
  };

  const anon = stubFetch(meta);
  assert.equal(
    await fetchServableFileBytes(anon.impl, "http://api", {}, "fl-c", ANON),
    null,
    "curation-queue content must be refused to an anonymous caller",
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
  assert.ok(out, "the owner's curation queue must keep working");
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

// ── The rule lists themselves ──
// Pinned so that deleting a deny rule fails loudly instead of quietly widening
// access, and so that admitting a workspace is a deliberate, reviewed edit.
const lib = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/lib/file-visibility.ts",
  ),
  "utf8",
);
for (const literal of [
  '"katagami-contrib"',
  '"ws-019d9c05-1483-78e0-b9e7-370c0bdce031"',
  '"/agents/"',
  '"/system/"',
  '"/contrib/"',
  '"/iterate/"',
  '"/feedback/"',
]) {
  assert.ok(
    lib.includes(literal),
    `${literal} must remain in the rule lists; removing it changes who can read what`,
  );
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
assert.match(route, /Cache-Control": "private, no-store"/);
assert.match(
  route,
  /const isOwnerOnly = served\.visibility === "owner"/,
  "the route must branch on owner-only visibility",
);
for (const re of [
  /const browserCache = isOwnerOnly\s*\?\s*"private, no-store"/,
  /const cdnCache = isOwnerOnly\s*\?\s*"private, no-store"/,
]) {
  assert.match(route, re, "owner-only responses must not be shared-cached");
}

console.log("file proxy scope contract: pass");
