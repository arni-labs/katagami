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

const PUBLIC_WS = "katagami-contrib";

// ── Real published assets, read live from tenant `default` on 2026-08-12 ──
// Published DesignLanguage en-019ef593-0eda-71c1-b412-f7f6fccf2570, plus a
// published ArtStyle proof shot. These are the exact shapes the site's callers
// hand to getFileUrl(), so each MUST stay servable.
const LIVE_PUBLIC_FILES = [
  {
    what: "DesignLanguages.embodiment_file_id",
    Id: "fl-019ef224-4a00",
    WorkspaceId: PUBLIC_WS,
    Path: "/languages/civic-press/v10/embodiment.html",
  },
  {
    what: "DesignLanguages.thumbnail_file_id",
    Id: "fl-019ef224-6a71",
    WorkspaceId: PUBLIC_WS,
    Path: "/languages/civic-press/v10/thumb.jpg",
  },
  {
    what: "DesignLanguages.shadcn_preview_shots_file_id",
    Id: "fl-019ef1b8-3d76",
    WorkspaceId: PUBLIC_WS,
    Path: "/languages/civic-press/shadcn-v2/preview-shots.json",
  },
  {
    what: "DesignLanguages.design_md_asset_id",
    WorkspaceId: PUBLIC_WS,
    Path: "/languages/civic-press/v10/DESIGN.md",
  },
  {
    what: "ArtStyles.proof_shots_file_ids",
    WorkspaceId: PUBLIC_WS,
    Path: "/art-styles/some-style/proof-01.png",
  },
];
for (const file of LIVE_PUBLIC_FILES) {
  assert.equal(
    isPubliclyServableFile({ fields: { Status: "Ready", ...file } }),
    true,
    `${file.what} (${file.Path}) is live public content and must stay served`,
  );
}
assert.equal(
  isPubliclyServableFile({
    fields: {
      status: "Locked",
      path: "/languages/civic-press/v10/embodiment.html",
      workspace_id: PUBLIC_WS,
    },
  }),
  true,
  "Locked is readable, and the snake_case projection must be understood",
);

// ── ARN-309: the disclosure this fix closes ──
// Verified world-readable before the fix:
//   curl https://katagami.ai/api/file/os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language
//   -> 200, 12,037 bytes of the internal curator skill.
// Ids of this shape are deterministic (`os-agent-skill-file-<soul>-<skill>`),
// so obscurity was never the control.
const REAL_SKILL_FILE = {
  Id: "os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language",
  Status: "Ready",
  Path: "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
  WorkspaceId: "os-app-docs",
};
assert.equal(
  isPubliclyServableFile({ fields: REAL_SKILL_FILE }),
  false,
  "agent skills must never be served to an unauthenticated caller",
);

// The agent/operator trees are refused for EVERYONE, even inside the public
// workspace.
for (const p of [
  "/agents/curator/skills/review-quality/SKILL.md",
  "/system/knowledge/design-principles.md",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: { Status: "Ready", Path: p, WorkspaceId: PUBLIC_WS },
    }),
    "denied",
    `${p} must be denied outright even inside ${PUBLIC_WS}`,
  );
}

// katagami-contrib is NOT uniformly public. Live listing 2026-08-12 found six
// top-level trees; these three are not catalogue content and are owner-only.
// /contrib holds submissions awaiting curation, rendered only by /under-review
// (owner desk); /iterate holds trajectory .jsonl; /feedback is where
// ab/actions.ts creates the verdict log on first submission.
for (const p of [
  "/contrib/pyrite/embodiment.html",
  "/contrib/pyrite/DESIGN.md",
  "/contrib/pyrite/test.html",
  "/iterate/iter-pushpin-1.jsonl",
  "/feedback/ab-verdicts.jsonl",
]) {
  const meta = {
    fields: { Status: "Ready", Path: p, WorkspaceId: PUBLIC_WS },
  };
  assert.equal(
    classifyFileVisibility(meta),
    "owner",
    `${p} must be owner-only`,
  );
  assert.equal(
    isPubliclyServableFile(meta),
    false,
    `${p} must never be public`,
  );
}

// The catalogue trees stay public.
for (const p of [
  "/languages/civic-press/v10/embodiment.html",
  "/art-styles/some-style/proof-01.png",
  "/palettes/ember-signal/thumb.png",
]) {
  assert.equal(
    classifyFileVisibility({
      fields: { Status: "Ready", Path: p, WorkspaceId: PUBLIC_WS },
    }),
    "public",
    `${p} is catalogue content`,
  );
}

// A non-public workspace is refused whatever the path looks like.
for (const ws of ["os-app-docs", "ws-019de271-1cd1-7301-b5f7-fd19eca19419"]) {
  assert.equal(
    isPubliclyServableFile({
      fields: {
        Status: "Ready",
        Path: "/languages/civic-press/v10/embodiment.html",
        WorkspaceId: ws,
      },
    }),
    false,
    `${ws} is not a public workspace`,
  );
}

// Unclassifiable input fails closed rather than being served.
for (const meta of [
  null,
  {},
  { fields: { Status: "Ready", Path: "/languages/x.html" } }, // no workspace
  { fields: { Status: "Ready", WorkspaceId: PUBLIC_WS } }, // no path
  {
    fields: {
      Status: "Ready",
      Path: "languages/x.html",
      WorkspaceId: PUBLIC_WS,
    },
  }, // relative
]) {
  assert.equal(
    isPubliclyServableFile(meta),
    false,
    `unclassifiable metadata must fail closed: ${JSON.stringify(meta)}`,
  );
}

// State is still necessary; it is simply no longer sufficient.
for (const state of ["Created", "Archived", "Deleted", "", null]) {
  assert.equal(
    isPubliclyServableFile({
      fields: {
        Status: state,
        Path: "/languages/civic-press/v10/embodiment.html",
        WorkspaceId: PUBLIC_WS,
      },
    }),
    false,
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
      Path: "/languages/civic-press/v10/embodiment.html",
      WorkspaceId: PUBLIC_WS,
    },
  };
  const { impl, calls } = stubFetch(meta);
  const out = await fetchServableFileBytes(
    impl,
    "http://api",
    {},
    "fl-019ef224-4a00",
    ANON,
  );
  assert.ok(out, "a live published embodiment must still be served");
  assert.equal(new TextDecoder().decode(out.bytes), "BYTES");
  assert.equal(out.upstreamContentType, "text/html");
  assert.ok(
    calls.some((u) => u.endsWith("/$value")),
    "bytes are fetched when allowed",
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
      WorkspaceId: PUBLIC_WS,
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

{
  // An owner-only tree: refused for anonymous with no byte fetch, served to the
  // owner and marked so the route can suppress shared caching.
  const meta = {
    fields: {
      Status: "Ready",
      Path: "/contrib/pyrite/embodiment.html",
      WorkspaceId: PUBLIC_WS,
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
      WorkspaceId: PUBLIC_WS,
    },
  };
  const { impl } = stubFetch(meta);
  const out = await fetchServableFileBytes(impl, "http://api", {}, "fl-p", async () => {
    asked += 1;
    return false;
  });
  assert.ok(out, "published assets serve without a session");
  assert.equal(out.visibility, "public");
  assert.equal(asked, 0, "public files must not read the session cookie");
}

// ── Route wiring ──
const here = path.dirname(fileURLToPath(import.meta.url));
const route = fs.readFileSync(
  path.join(here, "../src/app/api/file/[id]/route.ts"),
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
// Owner-only bytes must never carry a shared cache directive: the CDN does not
// know who asked, and would hand a cached curation asset to the next caller.
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
