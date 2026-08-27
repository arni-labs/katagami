// ARN-385 leftover: raw artifact URLs and /api/search used to rank/serve the
// full Published catalog to anonymous visitors while the HTML detail page
// was already gated to the featured shelf. Source-greps lock the close.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const gate = read("src/lib/entity-visibility.ts");
const searchRoute = read("src/app/api/search/route.ts");
const searchLib = read("src/lib/search.ts");

const ARTIFACT_ROUTES = [
  "src/app/(site)/language/[id]/DESIGN.md/route.ts",
  "src/app/(site)/language/[id]/KATAGAMI.MD/route.ts",
  "src/app/(site)/language/[id]/SHADCN-DESIGN.md/route.ts",
  "src/app/(site)/language/[id]/shadcn.json/route.ts",
  "src/app/(site)/language/[id]/shadcn-shots.json/route.ts",
  "src/app/(site)/language/[id]/shadcn-components.md/route.ts",
];

const required = [
  [
    "artifactGate takes an entity id+kind, not status alone",
    gate,
    /artifactGate\(\s*status: string \| undefined,\s*entity: \{ id: string; kind: ArtifactKind \}/,
  ],
  [
    "Published artifacts check visitor-shelf membership before allowing",
    gate,
    /isOnVisitorShelf\(entity\.kind, entity\.id\)/,
  ],
  [
    "off-shelf Published artifacts never use a shared cache",
    gate,
    /hasFullGalleryAccess\(\)[\s\S]*OWNER_CACHE/,
  ],
  [
    "anon off-shelf Published artifacts 404",
    gate,
    /if \(await hasFullGalleryAccess\(\)\) \{\s*return \{ allowed: true, cacheControl: OWNER_CACHE \};\s*\}\s*return denied\(\);/,
  ],
  [
    "/api/search ranks featured-only for anonymous callers",
    searchRoute,
    /featuredOnly/,
  ],
  [
    // ARN-385 F7: anon hits are membership-filtered against a per-kind visitor
    // id set computed ONCE via featuredIds() (which THROWS on a backend fault),
    // so an outage surfaces as 503 instead of a silent count:0.
    "/api/search membership-filters language/art-style/palette hits for anon",
    searchRoute,
    /featuredIds/,
  ],
  [
    "/api/search surfaces a visitor-set lookup failure as unavailable, not empty",
    searchRoute,
    /status: 503[\s\S]*shelfByKind|shelfByKind[\s\S]*status: 503/,
  ],
  [
    "/api/search does not public-cache signed-in full-catalog results",
    searchRoute,
    /Cache-Control": full \? "private, no-store"/,
  ],
  [
    // ARN-385 split: the anon ranking filter is the visitor allowlist
    // (shown_to_visitors), not the signed-in-only `featured` highlight.
    "search kernel filter pins languages/art-styles to the visitor shelf when asked",
    searchLib,
    /Status eq 'Published' and shown_to_visitors eq true/,
  ],
];

for (const rel of ARTIFACT_ROUTES) {
  const src = read(rel);
  required.push([
    `${rel} passes language id into artifactGate`,
    src,
    /artifactGate\(lang\.status, \{ id, kind: "language" \}\)/,
  ]);
  required.push([
    `${rel} does not call artifactGate with status alone`,
    src,
    /^(?![\s\S]*artifactGate\(lang\.status\s*\))[\s\S]*$/,
  ]);
}

const katagami = read("src/app/(site)/language/[id]/KATAGAMI.MD/route.ts");
required.push([
  "KATAGAMI.MD honors the gate cache-control (no hardcoded public cache)",
  katagami,
  /"cache-control": gate\.cacheControl/,
]);
required.push([
  "KATAGAMI.MD does not hardcode a public cache-control",
  katagami,
  /^(?![\s\S]*s-maxage=300)[\s\S]*$/,
]);

const brief = read("src/app/(site)/studio/BRIEF.md/route.ts");
const odata = read("src/lib/odata.ts");
required.push([
  "BRIEF.md resolves the language by id or slug (a slug must not 500)",
  brief,
  /getDesignLanguageByIdOrSlug\(uiId\)/,
]);
required.push([
  "BRIEF.md resolves the palette by id or slug (featured pal slugs must 200)",
  brief,
  /getPaletteSystemByIdOrSlug\(palId\)/,
]);
required.push([
  "BRIEF.md resolves the art style by id or slug (featured art slugs must 200)",
  brief,
  /getArtStyleByIdOrSlug\(artId\)/,
]);
required.push([
  "BRIEF.md 404s when any lane misses rather than falling through to the 500 catch",
  brief,
  /if \(!lang \|\| !pal \|\| !art\) \{\s*return new Response\("not found\\n", \{ status: 404 \}\);/,
]);
required.push([
  "BRIEF.md featured-gates the resolved language entity_id, not the raw query slug",
  brief,
  /anonMaySee\("language", lang\.entity_id\)/,
]);
required.push([
  "BRIEF.md featured-gates the resolved art-style entity_id, not the raw query slug",
  brief,
  /anonMaySee\("art_style", art\.entity_id\)/,
]);
required.push([
  "odata treats a by-key OData 404 as a miss, not a throw-through",
  odata,
  /export \{ normalizeDesignLanguageRow, isODataNotFound \}/,
]);
required.push([
  "anonMaySee is slug-aware so a featured pal/art slug is not gated as a miss",
  read("src/lib/catalog.ts"),
  /rowMatchesIdOrSlug\(r, idOrSlug\)/,
]);
required.push([
  "id-or-slug language lookup is exported",
  odata,
  /export async function getDesignLanguageByIdOrSlug/,
]);
required.push([
  "id-or-slug palette lookup is exported (featured pal slugs, not ids only)",
  odata,
  /export async function getPaletteSystemByIdOrSlug/,
]);
required.push([
  "id-or-slug art-style lookup is exported (featured art slugs, not ids only)",
  odata,
  /export async function getArtStyleByIdOrSlug/,
]);
required.push([
  "non-en keys take the slug path first (komawari-plates / cathode-ray)",
  odata,
  /function looksLikeEntityId/,
]);
const odataMiss = read("src/lib/odata-not-found.mjs");
required.push([
  "OData-miss predicate matches the Temper by-key 404 message",
  odataMiss,
  /\\bOData 404\\b/,
]);
const paletteDetail = read("src/app/(site)/palettes/[id]/page.tsx");
required.push([
  "palette detail resolves id or slug (komawari-plates must not 404)",
  paletteDetail,
  /getPaletteSystemByIdOrSlug\(id\)/,
]);
required.push([
  "palette detail does not by-key-only getPaletteSystem(id)",
  paletteDetail,
  /^(?![\s\S]*getPaletteSystem\(id\))[\s\S]*$/,
]);
required.push([
  "palette detail featured-gates the resolved entity_id",
  paletteDetail,
  /anonMaySee\("palette", pal\.entity_id\)/,
]);
const languageDetail = read("src/app/(site)/language/[id]/page.tsx");
required.push([
  "language detail resolves id or slug (komawari must not be the 97k shell)",
  languageDetail,
  /getDesignLanguageByIdOrSlug\(id\)/,
]);
required.push([
  "language detail does not by-key-only getDesignLanguage(id)",
  languageDetail,
  /^(?![\s\S]*getDesignLanguage\(id\))[\s\S]*$/,
]);
required.push([
  "language detail featured-gates the resolved entity_id",
  languageDetail,
  /anonMaySee\("language", lang\.entity_id\)/,
]);
required.push([
  "language metadata featured-gates the resolved entity_id",
  languageDetail,
  /anonMaySee\("language", lang\.entity_id\)/,
]);
const artStyleDetail = read("src/app/(site)/art-styles/[id]/page.tsx");
required.push([
  "art-style detail resolves id or slug (cathode-ray must not be the 100k shell)",
  artStyleDetail,
  /getArtStyleByIdOrSlug\(id\)/,
]);
required.push([
  "art-style detail does not by-key-only getArtStyle(id)",
  artStyleDetail,
  /^(?![\s\S]*getArtStyle\(id\))[\s\S]*$/,
]);
required.push([
  "art-style detail featured-gates the resolved entity_id",
  artStyleDetail,
  /anonMaySee\("art_style", art\.entity_id\)/,
]);

let failed = 0;
for (const [name, source, pattern] of required) {
  if (pattern.test(source)) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`MISSING: ${name}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} featured-artifact-gate check(s) failed.`);
  process.exit(1);
}
console.log("\nfeatured artifact gate contract holds.");
