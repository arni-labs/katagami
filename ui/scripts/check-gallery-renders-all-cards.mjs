import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readProjectFile(path) {
  return readFileSync(resolve(path), "utf8");
}

const pageSource = readProjectFile("src/app/(site)/page.tsx");
const gallerySource = readProjectFile("src/components/language-gallery.tsx");
const odataSource = readProjectFile("src/lib/odata.ts");
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

if (violations.length > 0) {
  console.error(
    [
      "Gallery regression: every fetched language must be requested from all",
      "OData pages and present as a real server-rendered card/link in the",
      "initial HTML. Do not hide catalog items behind client-only deferred",
      "rendering or a first-page-only data fetch.",
      "",
      ...violations.map(({ label }) => `- ${label}`),
    ].join("\n"),
  );
  process.exit(1);
}
