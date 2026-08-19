// Language-detail chrome contract. Source-greps in the style of the other
// check-* scripts — leftover captions keep coming back unless the unmarked
// default is encoded as a test.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const badge = read("src/components/provenance-badge.tsx");
const languagePage = read("src/app/(site)/language/[id]/page.tsx");

const forbidden = [
  [
    "provenance badge does not render an Agent-generated caption",
    badge,
    /["']Agent-generated["']/,
  ],
  [
    "language detail does not pass a detail variant that used to print the caption",
    languagePage,
    /variant=["']detail["']/,
  ],
];

const required = [
  [
    "language detail still mounts ProvenanceBadge for human tiers",
    languagePage,
    /<ProvenanceBadge\b/,
  ],
];

const violations = [];
for (const [label, source, pattern] of forbidden) {
  if (pattern.test(source)) violations.push(`still present: ${label}`);
}
for (const [label, source, pattern] of required) {
  if (!pattern.test(source)) violations.push(`missing: ${label}`);
}

if (violations.length > 0) {
  console.error("language-detail chrome contract failed:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("language-detail chrome contract ok");
