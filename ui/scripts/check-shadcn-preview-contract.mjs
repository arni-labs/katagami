import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const projection = read("src/lib/shadcn-export.ts");
const preview = read("src/components/shadcn-preview.tsx");
const route = read("src/app/(site)/language/[id]/shadcn.json/route.ts");
const designRoute = read("src/app/(site)/language/[id]/DESIGN.md/route.ts");
const componentRoute = read("src/app/(site)/language/[id]/shadcn-components.md/route.ts");
const shotsRoute = read("src/app/(site)/language/[id]/shadcn-shots.json/route.ts");
const shadcnDesignRoute = read("src/app/(site)/language/[id]/SHADCN-DESIGN.md/route.ts");
const designWithShadcnRoute = read("src/app/(site)/language/[id]/DESIGN.with-shadcn.md/route.ts");
const specPanel = read("src/components/spec-panel.tsx");
const specActions = read("src/components/spec-actions.tsx");
const page = read("src/app/(site)/language/[id]/page.tsx");

const required = [
  ["projection builds registry theme", projection, /type:\s*"registry:theme"/],
  ["projection includes light vars", projection, /cssVars:[\s\S]*light/],
  ["projection includes dark fallbacks", projection, /buildDarkVars/],
  ["projection preserves native names", projection, /nativeTokenNames/],
  ["projection builds component spec", projection, /shadcnComponentSpecMarkdown/],
  ["projection builds preview shots", projection, /shadcnPreviewShotsJson/],
  ["projection builds DESIGN.md with shadcn", projection, /shadcnDesignMdMarkdown/],
  ["projection exposes TSX starter", projection, /shadcnExampleTsx/],
  ["projection validates renderable preview shots", projection, /isRenderableShadcnPreviewShots/],
  ["projection builds renderable scenes", projection, /renderable-v1/],
  ["projection builds visual profile", projection, /visualProfile/],
  ["preview renders Button", preview, /<Button[\s>]/],
  ["preview renders Card", preview, /<Card[\s>]/],
  ["preview renders Input", preview, /<Input[\s>]/],
  ["preview renders Select", preview, /<Select[\s>]/],
  ["preview renders Tabs", preview, /<Tabs[\s>]/],
  ["preview renders Checkbox", preview, /<Checkbox[\s>]/],
  ["preview renders Switch", preview, /<Switch[\s>]/],
  ["preview renders Slider", preview, /<Slider[\s>]/],
  ["preview renders DropdownMenu", preview, /<DropdownMenu[\s>]/],
  ["preview renders Table", preview, /<Table[\s>]/],
  ["preview parses stored shots", preview, /parsePreviewShots/],
  ["preview rejects non-renderable stored shots", preview, /isRenderableShadcnPreviewShots/],
  ["preview renders shot deck", preview, /ShotPreviewDeck/],
  ["preview exposes artifact source", preview, /data-shadcn-preview-source/],
  ["preview distinguishes agent-authored kit", preview, /data-shadcn-agent-kit/],
  ["preview demotes fallback to compatibility panel", preview, /CompatibilityCheckPanel/],
  ["preview consumes visual profile", preview, /visualProfileFromArtifact/],
  ["preview applies ShadSync styling", preview, /shadsync-preview/],
  ["preview copy buttons are testable", preview, /data-testid=\{copyTestId\(label\)\}/],
  ["preview exposes theme JSON artifact", preview, /theme JSON/],
  ["preview exposes component recipes", preview, /component recipes/],
  ["preview exposes preview shots", preview, /preview shots/],
  ["preview exposes TSX starter", preview, /tsx starter/],
  ["preview exposes DESIGN.md with shadcn", preview, /DESIGN\.md with shadcn/],
  ["preview keeps raw artifacts advanced", preview, /advanced implementation files/],
  ["route serves stored shadcn json", route, /readTemperFileBytes/],
  ["DESIGN.md route appends current shadcn usage", designRoute, /withCurrentShadcnUsage/],
  ["DESIGN.md route mentions DESIGN.md with shadcn", designRoute, /DESIGN\.with-shadcn\.md/],
  ["route serves stored shadcn component recipes", componentRoute, /readTemperFileBytes/],
  ["route rejects non-agent component recipes", componentRoute, /isAgentAuthoredShadcnComponentSpec/],
  ["route serves stored shadcn preview shots", shotsRoute, /readTemperFileBytes/],
  ["route rejects non-renderable stored shots", shotsRoute, /invalid-stored/],
  ["route rejects non-agent stored shots", shotsRoute, /isAgentAuthoredShadcnPreviewShots/],
  ["route serves DESIGN.md with shadcn", shadcnDesignRoute, /shadcnDesignMdMarkdown/],
  ["route validates DESIGN.md with shadcn inputs", shadcnDesignRoute, /isAgentAuthoredShadcnComponentSpec/],
  ["ergonomic route aliases DESIGN.md with shadcn", designWithShadcnRoute, /SHADCN-DESIGN\.md\/route/],
  ["page reads stored shadcn files", page, /readTemperFileText/],
  ["page passes stored preview shots", page, /storedPreviewShots=\{storedShadcnPreviewShots\}/],
  ["page passes DESIGN.md with shadcn", page, /shadcnDesignMd=\{shadcnDesignMd\}/],
  ["DESIGN.md includes shadcn usage", specPanel, /shadcnUsageMarkdown/],
  ["copy controls include shadcn MD", specActions, /shadcn-md/],
  ["copy controls include DESIGN.md with shadcn", specActions, /with shadcn/],
  ["copy controls explain shadcn projects", specActions, /For shadcn\/ui projects/],
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
