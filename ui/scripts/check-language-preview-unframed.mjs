// Language-detail preview contract (ARN-376): the embodiment iframe is a
// screenshot card, not a Polaroid sticker. Caption, Open full overlay, and
// 3px pills must not return (curator order: previews carry no chrome).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const tabs = read("src/components/embodiment-tabs.tsx");
const viewer = read("src/components/embodiment-viewer.tsx");
const page = read("src/app/(site)/language/[id]/page.tsx");

const required = [
  [
    "language tabs do not wrap the preview in sticker-card",
    tabs,
    (src) => !src.includes("sticker-card"),
  ],
  [
    "language tabs do not print a Polaroid caption",
    tabs,
    (src) => !src.includes("slug || \"preview\"") && !src.includes("cur.label.toLowerCase()"),
  ],
  [
    "language page does not pass a preview caption slug",
    page,
    (src) => !/<EmbodimentTabs\b[^>]*\bslug=/.test(src),
  ],
  [
    "no overlay chrome on the preview",
    viewer,
    // No anchors/buttons at all inside the viewer (it renders only the sandboxed
    // iframe + measurement scaffolding), so overlay chrome cannot return under
    // any wording or icon.
    (src) =>
      !/open full/i.test(src) &&
      !src.includes("ExternalLink") &&
      !/<a\s/.test(src) &&
      !/<button\s/.test(src),
  ],
];

const failed = [];
for (const [name, src, ok] of required) {
  if (!ok(src)) failed.push(name);
}

if (failed.length) {
  console.error("language preview unframed contract failed:");
  for (const name of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`language preview unframed contract: ${required.length} checks ok`);
