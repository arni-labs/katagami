// Language-detail preview contract (ARN-376 + Open full hold).
// Polaroid caption / 3px pills stay gone. Exactly one Open full overlay
// sits on the landing / dashboard preview and opens the URL currently
// shown. Live Bluet now has zero. Two is fail. Zero is fail.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const tabs = read("src/components/embodiment-tabs.tsx");
const viewer = read("src/components/embodiment-viewer.tsx");
const page = read("src/app/(site)/language/[id]/page.tsx");
const surfaces = [tabs, viewer, page].join("\n");

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
    "shared viewer stays chrome-free",
    viewer,
    // Compare / AB / radix-test reuse EmbodimentViewer. Overlay lives on the
    // language-detail tabs preview only, so this file must stay iframe-only.
    (src) =>
      !/open full/i.test(src) &&
      !src.includes("ExternalLink") &&
      !/<a\s/.test(src) &&
      !/<button\s/.test(src),
  ],
  [
    "preview overlay is the one Open full control",
    tabs,
    (src) => {
      const anchors = src.match(/<a\s/g) ?? [];
      return (
        anchors.length === 1 &&
        /href=\{cur\.url\}/.test(src) &&
        /target="_blank"/.test(src) &&
        /absolute right-2 top-2/.test(src) &&
        /open full/i.test(src) &&
        src.includes("rounded-none") &&
        !src.includes("rounded-[3px]") &&
        !/open full page/i.test(src)
      );
    },
  ],
  [
    "language detail does not add a second Open full / open-in-new on the preview",
    surfaces,
    (src) => {
      const anchors = src.match(/<a\s/g) ?? [];
      const pageLinks = src.match(/open full page/gi) ?? [];
      return anchors.length === 1 && pageLinks.length === 0;
    },
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
