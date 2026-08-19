import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const remix = fs.readFileSync(`${here}/../src/lib/remix-options.ts`, "utf8");
const picker = fs.readFileSync(
  `${here}/../src/components/remix/entity-picker.tsx`,
  "utf8",
);

assert.doesNotMatch(picker, /RESULT_CAP/);
assert.doesNotMatch(remix, /has_source_basis_review/);
assert.doesNotMatch(remix, /portability_report/);
assert.match(remix, /prompt_template/);
