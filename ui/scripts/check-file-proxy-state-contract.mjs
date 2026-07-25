import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPubliclyReadableFile } from "../src/lib/file-visibility.ts";

assert.equal(isPubliclyReadableFile({ Status: "Ready" }), true);
assert.equal(isPubliclyReadableFile({ fields: { status: "Locked" } }), true);
for (const state of ["Created", "Archived", "Deleted", "", null]) {
  assert.equal(
    isPubliclyReadableFile({ fields: { Status: state } }),
    false,
    `${String(state)} must fail closed`,
  );
}
assert.equal(isPubliclyReadableFile(null), false);
assert.equal(isPubliclyReadableFile({}), false);

const here = path.dirname(fileURLToPath(import.meta.url));
const route = fs.readFileSync(
  path.join(here, "../src/app/api/file/[id]/route.ts"),
  "utf8",
);
const metadataFetch = route.indexOf("/tdata/Files('${id}')`");
const stateGate = route.indexOf("!isPubliclyReadableFile", metadataFetch);
const valueFetch = route.indexOf("/tdata/Files('${id}')/$value");
assert.ok(metadataFetch >= 0, "file proxy must read the File projection");
assert.ok(stateGate > metadataFetch, "file state must be evaluated after metadata");
assert.ok(valueFetch > stateGate, "bytes must not be fetched before the state gate");
assert.match(route, /Cache-Control": "private, no-store"/);

console.log("file proxy state contract: pass");
