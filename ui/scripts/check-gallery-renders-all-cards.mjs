import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readProjectFile(path) {
  return readFileSync(resolve(path), "utf8");
}

const pageSource = readProjectFile("src/app/(site)/page.tsx");
const infiniteGalleriesSource = readProjectFile(
  "src/components/infinite-galleries.tsx",
);
const languageCardSource = readProjectFile("src/components/language-card.tsx");
const ownerControlsSource = readProjectFile("src/components/language-card-owner-controls.tsx");
const odataSource = readProjectFile("src/lib/odata.ts");
const mutationsSource = readProjectFile("src/lib/odata-mutations.ts");
const actionsSource = readProjectFile("src/app/actions.ts");
const palettesPageSource = readProjectFile("src/app/(site)/palettes/page.tsx");
const paletteDetailSource = readProjectFile("src/app/(site)/palettes/[id]/page.tsx");
const artStylesPageSource = readProjectFile("src/app/(site)/art-styles/page.tsx");
const artStyleDetailSource = readProjectFile("src/app/(site)/art-styles/[id]/page.tsx");
// Shared row->item mappers the catalog pages consume; they apply the display-name
// helper on behalf of the pages (palettes/art-styles + the Under Review queue).
const laneItemsSource = readProjectFile("src/lib/lane-items.ts");
const remixOptionsSource = readProjectFile("src/lib/remix-options.ts");
const ownerPageSource = readProjectFile("src/app/(site)/owner/page.tsx");
const sendToReviewSource = readProjectFile("src/components/send-to-review-language-button.tsx");
const synthesizePaletteSkillSource = readProjectFile(
  "../katagami-curation/agents/curator/skills/synthesize-palette/SKILL.md",
);
const synthesizeArtStyleSkillSource = readProjectFile(
  "../katagami-curation/agents/curator/skills/synthesize-art-style/SKILL.md",
);
const deferredComponentPath = resolve("src/components/deferred-language-cards.tsx");

const violations = [
  {
    label: "gallery imports or renders the client-only deferred card renderer",
    pattern: /DeferredLanguageCards/,
    sources: [pageSource],
  },
  {
    label: "deferred language card component still exists",
    test: () => existsSync(deferredComponentPath),
  },
  {
    label: "gallery defines an eager-card cap",
    pattern: /\bINITIAL_CARDS\b/,
    sources: [pageSource],
  },
  {
    label: "gallery caps rendered cards to INITIAL_CARDS",
    pattern: /languages\.slice\(\s*0\s*,\s*INITIAL_CARDS\s*\)/,
    sources: [pageSource],
  },
  {
    label: "gallery places the remainder behind a deferred slice",
    pattern: /languages\.slice\(\s*INITIAL_CARDS\s*\)/,
    sources: [pageSource],
  },
].filter(({ pattern, sources, test }) =>
  test ? test() : sources.some((source) => pattern.test(source)),
);

// Scalable gallery: the home page SSR-renders the FIRST keyset page and the
// client gallery loads the rest on scroll + searches server-side — items stay
// reachable without dumping the whole catalog into the initial HTML.
if (
  !/<InfiniteLanguages[\s\S]*?initialItems=/.test(pageSource) ||
  !/pageDesignLanguages\(/.test(pageSource)
) {
  violations.push({
    label: "home gallery does not render InfiniteLanguages from a keyset first page",
  });
}

if (
  !/<LanguageCard\b/.test(infiniteGalleriesSource) ||
  !/loadLanguagePage/.test(infiniteGalleriesSource)
) {
  violations.push({
    label: "InfiniteLanguages does not map items to LanguageCard or load pages via the server action",
  });
}

if (
  !/Id lt '\$\{odataLiteral\(cursor\)\}'/.test(odataSource) ||
  !/"\$orderby",\s*"Id desc"/.test(odataSource)
) {
  violations.push({
    label: "keyset paginators do not page by a descending Id cursor (newest first)",
  });
}

if (!/collectODataPages<Record<string, unknown>>\([\s\S]*?DesignLanguages/.test(odataSource)) {
  violations.push({
    label: "listDesignLanguages does not collect every OData page",
  });
}

if (!/params\.set\("\$top",\s*String\(DESIGN_LANGUAGE_PAGE_SIZE\)\)/.test(odataSource)) {
  violations.push({
    label: "listDesignLanguages does not request the large gallery page size",
  });
}

if (!/resp\["@odata\.nextLink"\]/.test(odataSource)) {
  violations.push({
    label: "OData pagination helper does not follow @odata.nextLink",
  });
}

if (!/DESIGN_LANGUAGE_LIFECYCLE_STATUSES/.test(odataSource)) {
  violations.push({
    label: "listDesignLanguages does not define the lifecycle status fan-out",
  });
}

if (!/DESIGN_LANGUAGE_LIFECYCLE_STATUSES\.map\(\(status\)\s*=>[\s\S]*Status eq '\$\{status\}'/.test(odataSource)) {
  violations.push({
    label: "unfiltered listDesignLanguages does not query each lifecycle status",
  });
}

if (!/if\s*\(!filter\)[\s\S]*new Map<string, DesignLanguage>/.test(odataSource)) {
  violations.push({
    label: "unfiltered listDesignLanguages does not merge lifecycle results by id",
  });
}

if (/deleteEntity\("DesignLanguages"/.test(actionsSource)) {
  violations.push({
    label: "owner gallery action can still hard-delete DesignLanguages",
  });
}

if (!/dispatchAction\("DesignLanguages",\s*id,\s*"Archive",\s*\{[\s\S]*curator_notes/.test(actionsSource)) {
  violations.push({
    label: "owner gallery action does not archive DesignLanguages with curator notes",
  });
}

if (!/export async function sendLanguageToReview/.test(actionsSource)) {
  violations.push({
    label: "server action for sending a published language back to review is missing",
  });
}

if (!/dispatchAction\("DesignLanguages",\s*id,\s*"Revise",\s*\{[\s\S]*curator_notes/.test(actionsSource)) {
  violations.push({
    label: "send-to-review server action does not use DesignLanguages.Revise with curator notes",
  });
}

if (!/status=\{lang\.status\}/.test(languageCardSource)) {
  violations.push({
    label: "LanguageCard does not pass status to owner controls",
  });
}

if (!/status === "Published"[\s\S]*<SendToReviewLanguageButton/.test(ownerControlsSource)) {
  violations.push({
    label: "owner controls do not gate SendToReviewLanguageButton to Published languages",
  });
}

if (!/sendLanguageToReview/.test(sendToReviewSource)) {
  violations.push({
    label: "send-to-review button does not call the server action",
  });
}

if (!/export async function listTasteRules/.test(odataSource)) {
  violations.push({
    label: "owner taste review surface cannot list TasteRules",
  });
}

if (!/export async function createEntity/.test(mutationsSource)) {
  violations.push({
    label: "owner taste distillation action cannot create CurationJobs",
  });
}

if (!/"Katagami\.Curation"/.test(mutationsSource)) {
  violations.push({
    label: "server actions do not try the Katagami.Curation action namespace",
  });
}

if (!/export async function queueTasteDistillation/.test(actionsSource)) {
  violations.push({
    label: "owner action to queue taste distillation is missing",
  });
}

if (!/dispatchAction\("CurationJobs",[\s\S]*"ConfigureAndSubmit"[\s\S]*taste_distillation/.test(actionsSource)) {
  violations.push({
    label: "owner taste distillation action does not submit a taste_distillation CurationJob",
  });
}

if (!/dispatchAction\("TasteRules",\s*id,\s*"Accept"/.test(actionsSource)) {
  violations.push({
    label: "owner action to accept proposed TasteRules is missing",
  });
}

if (!/dispatchAction\("TasteRules",\s*id,\s*"Reject"/.test(actionsSource)) {
  violations.push({
    label: "owner action to reject proposed TasteRules is missing",
  });
}

if (!/queueTasteDistillation/.test(ownerPageSource) || !/acceptTasteRule/.test(ownerPageSource) || !/rejectTasteRule/.test(ownerPageSource)) {
  violations.push({
    label: "owner page does not expose taste distillation and TasteRule review controls",
  });
}

if (!/function TasteRuleSourceTag/.test(ownerPageSource) || !/SourceJobId/.test(ownerPageSource)) {
  violations.push({
    label: "owner TasteRule rows do not show source labels",
  });
}

if (!/accepted\.map\(\(rule\)\s*=>[\s\S]*<TasteRuleLine key=\{rule\.entity_id\} rule=\{rule\} rejectable/.test(ownerPageSource)) {
  violations.push({
    label: "accepted TasteRules cannot be rejected from the owner page",
  });
}

if (!/Rejected history/.test(ownerPageSource) || !/rejected\.map\(\(rule\)/.test(ownerPageSource)) {
  violations.push({
    label: "owner page does not display rejected TasteRule history",
  });
}

if (!/listTaxonomies[\s\S]*let rows = await collectODataPages<Taxonomy>\([\s\S]*Taxonomies\$\{q \? `\?\$\{q\}` : ""\}[\s\S]*rows = rows\.filter\(\(row\)/.test(odataSource)) {
  violations.push({
    label: "listTaxonomies does not fetch canonical taxonomy rows before local lifecycle filtering",
  });
}

if (!/temper\.action\('PaletteSystems',\s*eid,\s*'SetName'/.test(synthesizePaletteSkillSource)) {
  violations.push({
    label: "palette synthesis skill does not set PaletteSystem names before publishing",
  });
}

if (!/temper\.action\('ArtStyles',\s*eid,\s*'SetName'/.test(synthesizeArtStyleSkillSource)) {
  violations.push({
    label: "art-style synthesis skill does not set ArtStyle names before publishing",
  });
}

if (!/function normalizeLaneFields/.test(odataSource) || !/snakeCaseFieldName/.test(odataSource)) {
  violations.push({
    label: "lane OData rows are not normalized across PascalCase and snake_case fields",
  });
}

if (!/export function paletteDisplayName/.test(odataSource)) {
  violations.push({
    label: "public palette UI lacks a display-name fallback for legacy unnamed rows",
  });
}

// The page may use the helper directly, or via the shared toPaletteItem mapper
// (which applies it) — either way the display name comes from the one helper.
const palettePageUsesHelper =
  /paletteDisplayName/.test(palettesPageSource) ||
  (/toPaletteItem/.test(palettesPageSource) &&
    /paletteDisplayName/.test(laneItemsSource));
if (!palettePageUsesHelper || !/paletteDisplayName/.test(paletteDetailSource)) {
  violations.push({
    label: "palette catalog/detail pages do not use the shared display-name helper",
  });
}

if (!/export function artStyleDisplayName/.test(odataSource)) {
  violations.push({
    label: "public art-style UI lacks a display-name fallback for legacy unnamed rows",
  });
}

const artStylePageUsesHelper =
  /artStyleDisplayName/.test(artStylesPageSource) ||
  (/toArtStyleItem/.test(artStylesPageSource) &&
    /artStyleDisplayName/.test(laneItemsSource));
if (!artStylePageUsesHelper || !/artStyleDisplayName/.test(artStyleDetailSource)) {
  violations.push({
    label: "art-style catalog/detail pages do not use the shared display-name helper",
  });
}

if (!/artStyleDisplayName/.test(remixOptionsSource)) {
  violations.push({
    label: "studio remix options do not use the shared art-style display-name helper",
  });
}

if (!/paletteRampStopHex/.test(odataSource) || !/paletteRampStopHex/.test(paletteDetailSource)) {
  violations.push({
    label: "palette detail page cannot render object-shaped ramp stops",
  });
}

if (violations.length > 0) {
  console.error(
    [
      "Gallery regression: every fetched language must be requested from all",
      "OData pages and present as a real server-rendered card/link in the",
      "initial HTML. Do not hide catalog items behind client-only deferred",
      "rendering, a first-page-only data fetch, the broken unfiltered",
      "DesignLanguages read path, or destructive owner gallery deletes.",
      "",
      ...violations.map(({ label }) => `- ${label}`),
    ].join("\n"),
  );
  process.exit(1);
}
