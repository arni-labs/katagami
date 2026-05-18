import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readProjectFile(path) {
  return readFileSync(resolve(path), "utf8");
}

const pageSource = readProjectFile("src/app/(site)/page.tsx");
const gallerySource = readProjectFile("src/components/language-gallery.tsx");
const languageCardSource = readProjectFile("src/components/language-card.tsx");
const ownerControlsSource = readProjectFile("src/components/language-card-owner-controls.tsx");
const odataSource = readProjectFile("src/lib/odata.ts");
const mutationsSource = readProjectFile("src/lib/odata-mutations.ts");
const actionsSource = readProjectFile("src/app/actions.ts");
const ownerPageSource = readProjectFile("src/app/(site)/owner/page.tsx");
const sendToReviewSource = readProjectFile("src/components/send-to-review-language-button.tsx");
const deferredComponentPath = resolve("src/components/deferred-language-cards.tsx");

const violations = [
  {
    label: "gallery imports or renders the client-only deferred card renderer",
    pattern: /DeferredLanguageCards/,
    sources: [pageSource, gallerySource],
  },
  {
    label: "deferred language card component still exists",
    test: () => existsSync(deferredComponentPath),
  },
  {
    label: "gallery defines an eager-card cap",
    pattern: /\bINITIAL_CARDS\b/,
    sources: [pageSource, gallerySource],
  },
  {
    label: "gallery caps rendered cards to INITIAL_CARDS",
    pattern: /languages\.slice\(\s*0\s*,\s*INITIAL_CARDS\s*\)/,
    sources: [pageSource, gallerySource],
  },
  {
    label: "gallery places the remainder behind a deferred slice",
    pattern: /languages\.slice\(\s*INITIAL_CARDS\s*\)/,
    sources: [pageSource, gallerySource],
  },
].filter(({ pattern, sources, test }) =>
  test ? test() : sources.some((source) => pattern.test(source)),
);

if (!/<LanguageGallery[\s\S]*?languages=\{languages\}/.test(pageSource)) {
  violations.push({
    label: "homepage does not pass the complete languages array to LanguageGallery",
  });
}

if (!/languages\.map\(\(lang(?:,\s*index)?\)\s*=>[\s\S]*?<LanguageCard/.test(gallerySource)) {
  violations.push({
    label: "LanguageGallery does not map every language to a LanguageCard",
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

if (!/listTaxonomies[\s\S]*let rows = await collectODataPages<Taxonomy>\([\s\S]*Taxonomies\$\{q \? `\?\$\{q\}` : ""\}[\s\S]*rows = rows\.filter\(\(row\)/.test(odataSource)) {
  violations.push({
    label: "listTaxonomies does not fetch canonical taxonomy rows before local lifecycle filtering",
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
