import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
function check(spec, policy, caller) {
  assert.match(caller, /\.AttachVisualDescription/);
  for (const field of ["visual_description", "visual_description_version"])
    assert.match(spec, new RegExp('name = "' + field + '"\\s+type = "string"'));
  const action = spec.split('name = "AttachVisualDescription"')[1]?.split('[[action]]')[0];
  assert.ok(action, "caller action must exist in the app contract");
  assert.match(action, /kind = "internal"/);
  assert.match(action, /params = \["visual_description", "visual_description_version"\]/);
  assert.match(action, /from = \["Draft", "UnderReview", "Published"\]/);
  assert.match(policy, /Action::"AttachVisualDescription"/);
}
const spec=read("../../katagami-commons/specs/art_style.ioa.toml");
const policy=read("../../katagami-commons/specs/policies/art_style.cedar");
const caller=read("./describe-style-images.mjs");
test("image description caller has its matching governed app contract",()=>check(spec,policy,caller));
test("missing action regression is caught",()=>assert.throws(()=>check(spec.replace('name = "AttachVisualDescription"','name = "RemovedVisualDescription"'),policy,caller)));
