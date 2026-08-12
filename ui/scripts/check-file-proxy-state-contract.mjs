import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPubliclyServableFile,
  fetchServableFileBytes,
} from "../src/lib/file-visibility.ts";

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

// Private trees are refused even inside the PUBLIC workspace. Not hypothetical:
// the owner A/B tooling writes /feedback/ab-verdicts.jsonl into
// katagami-contrib, so a workspace-only rule would publish it.
for (const p of [
  "/feedback/ab-verdicts.jsonl",
  "/agents/curator/skills/review-quality/SKILL.md",
  "/system/knowledge/design-principles.md",
]) {
  assert.equal(
    isPubliclyServableFile({
      fields: { Status: "Ready", Path: p, WorkspaceId: PUBLIC_WS },
    }),
    false,
    `${p} must be refused even inside ${PUBLIC_WS}`,
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
  );
  assert.equal(out, null, "the agent skill must be refused end to end");
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
  );
  assert.equal(out, null, "an upstream 403 must collapse to a plain refusal");
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

console.log("file proxy scope contract: pass");
