import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPubliclyServableFile } from "../src/lib/file-visibility.ts";

// A published artifact is served. These are the surfaces every caller of
// getFileUrl() reads from: embodiments, landings, dashboards, thumbnails,
// palettes, DESIGN.md projections, shadcn exports.
for (const p of [
  "/katagami/embodiments/en-abc/index.html",
  "/katagami/thumbnails/en-abc.png",
  "/katagami/palettes/pl-abc.json",
  "/katagami/design-md/en-abc/DESIGN.md",
  "/katagami/shadcn/en-abc/shadcn.json",
]) {
  assert.equal(
    isPubliclyServableFile({
      fields: { Status: "Ready", Path: p, WorkspaceId: "katagami-contrib" },
    }),
    true,
    `${p} is a public surface and must still be served`,
  );
}
assert.equal(
  isPubliclyServableFile({
    fields: {
      status: "Locked",
      path: "/katagami/embodiments/en-abc/index.html",
    },
  }),
  true,
  "Locked is readable, and the snake_case projection must be understood",
);

// ARN-309. The real id, verified world-readable before this fix:
//   curl https://katagami.ai/api/file/os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language
//   -> 200, 12,037 bytes of the internal curator skill.
// Ids of this shape are deterministic (`os-agent-skill-file-<soul>-<skill>`),
// so obscurity was never the control.
assert.equal(
  isPubliclyServableFile({
    fields: {
      Id: "os-agent-skill-file-sl-bootstrap-agent-soul-curator-synthesize-language",
      Status: "Ready",
      Path: "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
      WorkspaceId: "os-app-docs",
    },
  }),
  false,
  "agent skills must never be served to an unauthenticated caller",
);
for (const p of [
  "/agents/curator/skills/review-quality/SKILL.md",
  "/system/knowledge/design-principles.md",
  "/feedback/ab-verdicts.jsonl",
]) {
  assert.equal(
    isPubliclyServableFile({ fields: { Status: "Ready", Path: p } }),
    false,
    `${p} is not a public surface`,
  );
}

// The workspace deny holds even if a path somehow looks public.
assert.equal(
  isPubliclyServableFile({
    fields: {
      Status: "Ready",
      Path: "/katagami/embodiments/x.html",
      WorkspaceId: "os-app-docs",
    },
  }),
  false,
  "os-app-docs is never a public workspace",
);

// Unknown and unclassifiable input fails closed rather than being served.
for (const meta of [
  null,
  {},
  { fields: { Status: "Ready" } }, // no path -> cannot place on a surface
  { fields: { Status: "Ready", Path: "relative/path.html" } },
  { fields: { Status: "Ready", Path: "/somewhere-else/thing.html" } },
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
      fields: { Status: state, Path: "/katagami/embodiments/x.html" },
    }),
    false,
    `${String(state)} must fail closed`,
  );
}

const here = path.dirname(fileURLToPath(import.meta.url));
const route = fs.readFileSync(
  path.join(here, "../src/app/api/file/[id]/route.ts"),
  "utf8",
);
const metadataFetch = route.indexOf("/tdata/Files('${id}')`");
const stateGate = route.indexOf("!isPubliclyServableFile", metadataFetch);
const valueFetch = route.indexOf("/tdata/Files('${id}')/$value");
assert.ok(metadataFetch >= 0, "file proxy must read the File projection");
assert.ok(stateGate > metadataFetch, "the gate must be evaluated after metadata");
assert.ok(valueFetch > stateGate, "bytes must not be fetched before the gate");
assert.match(route, /Cache-Control": "private, no-store"/);

// Refusals must be indistinguishable from "no such file", so the route must
// never hand back a status it got from upstream.
assert.doesNotMatch(
  route,
  /status:\s*res\.status/,
  "upstream status must not be forwarded; it confirms the id exists",
);

console.log("file proxy scope contract: pass");
