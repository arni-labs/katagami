import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const projection = read("src/lib/shadcn-export.ts");
const preview = read("src/components/shadcn-preview.tsx");
const route = read("src/app/(site)/language/[id]/shadcn.json/route.ts");
const componentRoute = read("src/app/(site)/language/[id]/shadcn-components.md/route.ts");
const shotsRoute = read("src/app/(site)/language/[id]/shadcn-shots.json/route.ts");
const specPanel = read("src/components/spec-panel.tsx");

const required = [
  ["projection builds registry theme", projection, /type:\s*"registry:theme"/],
  ["projection includes light vars", projection, /cssVars:[\s\S]*light/],
  ["projection includes dark fallbacks", projection, /buildDarkVars/],
  ["projection preserves native names", projection, /nativeTokenNames/],
  ["projection builds component spec", projection, /shadcnComponentSpecMarkdown/],
  ["projection builds preview shots", projection, /shadcnPreviewShotsJson/],
  ["preview renders Button", preview, /<Button[\s>]/],
  ["preview renders Card", preview, /<Card[\s>]/],
  ["preview renders Input", preview, /<Input[\s>]/],
  ["preview renders Select", preview, /<Select[\s>]/],
  ["preview renders Tabs", preview, /<Tabs[\s>]/],
  ["preview exposes registry artifact", preview, /registry theme/],
  ["preview exposes component recipes", preview, /component recipes/],
  ["preview exposes preview shots", preview, /preview shots/],
  ["route serves shadcn json", route, /shadcnThemeToJson/],
  ["route serves shadcn component recipes", componentRoute, /shadcnComponentSpecMarkdown/],
  ["route serves shadcn preview shots", shotsRoute, /shadcnPreviewShotsJson/],
  ["DESIGN.md includes shadcn usage", specPanel, /shadcnUsageMarkdown/],
];

const failures = required
  .filter(([, source, pattern]) => !pattern.test(source))
  .map(([label]) => label);

if (failures.length > 0) {
  console.error("shadcn export contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("shadcn export contract ok");
