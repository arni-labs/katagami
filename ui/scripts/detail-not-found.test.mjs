// Leftover after #257: /language/gust and /art-styles/gust (and miss slugs)
// rendered HTTP 200 chrome (~97k/~100k, generic title `katagami ✦ language`)
// because generateMetadata returned a title instead of notFound(). Palette
// miss already 404s. This renders the same resolver the page functions use.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  publicDetailHidden,
  resolvePublicDetail,
} from "../src/lib/public-detail.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const KOMAWARI = {
  entity_id: "en-019ef79a-f581-7802-9d0d-3abe0e65f5b0",
  status: "Published",
  fields: { slug: "komawari", name: "Komawari" },
};
const CATHODE = {
  entity_id: "en-019ef2a8-70d4-7003-bb07-e1c9bddb5200",
  status: "Published",
  fields: { slug: "cathode-ray", name: "Cathode Ray" },
};
const GUST_LANG = {
  entity_id: "en-gust-lang",
  status: "Published",
  fields: { slug: "gust", name: "Gust" },
};
const GUST_ART = {
  entity_id: "en-gust-art",
  status: "Published",
  fields: { slug: "gust", name: "Gust" },
};
const DRAFT = {
  entity_id: "en-draft-1",
  status: "Draft",
  fields: { slug: "drafty", name: "Drafty" },
};

assert.equal(publicDetailHidden(null), true, "miss → hidden");
assert.equal(
  publicDetailHidden(GUST_LANG, { onShelf: false, fullAccess: false }),
  true,
  "off-shelf published, anon → hidden",
);
assert.equal(
  publicDetailHidden(KOMAWARI, { onShelf: true, fullAccess: false }),
  false,
  "featured published, anon → visible",
);
assert.equal(
  publicDetailHidden(GUST_LANG, { onShelf: false, fullAccess: true }),
  false,
  "off-shelf published, signed-in → visible",
);
assert.equal(
  publicDetailHidden(DRAFT, { curatorAccess: false }),
  true,
  "unpublished, visitor → hidden",
);
assert.equal(
  publicDetailHidden(DRAFT, { curatorAccess: true }),
  false,
  "unpublished, curator → visible",
);

console.log("ok: publicDetailHidden — miss / off-shelf / unpublished hide; featured holds");

const catalog = new Map([
  ["komawari", KOMAWARI],
  [KOMAWARI.entity_id, KOMAWARI],
  ["cathode-ray", CATHODE],
  [CATHODE.entity_id, CATHODE],
  ["gust", GUST_LANG],
  [GUST_LANG.entity_id, GUST_LANG],
  ["gust-art", GUST_ART],
  [GUST_ART.entity_id, GUST_ART],
  ["drafty", DRAFT],
  [DRAFT.entity_id, DRAFT],
]);
const shelf = new Set([KOMAWARI.entity_id, CATHODE.entity_id]);

async function renderDetail(idOrSlug, { fullAccess = false, curator = false } = {}) {
  return resolvePublicDetail(idOrSlug, {
    getByIdOrSlug: async (id) => catalog.get(id) ?? null,
    maySee: async (entityId) => shelf.has(entityId),
    hasFullAccess: async () => fullAccess,
    hasCurator: async () => curator,
  });
}

// Featured HOLDS (slug and UUID).
assert.equal((await renderDetail("komawari"))?.entity_id, KOMAWARI.entity_id);
assert.equal((await renderDetail(KOMAWARI.entity_id))?.entity_id, KOMAWARI.entity_id);
assert.equal((await renderDetail("cathode-ray"))?.entity_id, CATHODE.entity_id);
assert.equal((await renderDetail(CATHODE.entity_id))?.entity_id, CATHODE.entity_id);

// FAIL unless 404: gust language slug + UUID, gust art slug + UUID, miss slugs.
assert.equal(await renderDetail("gust"), null, "gust language slug → 404");
assert.equal(await renderDetail(GUST_LANG.entity_id), null, "gust language UUID → 404");
assert.equal(await renderDetail("gust-art"), null, "gust art slug → 404");
assert.equal(await renderDetail(GUST_ART.entity_id), null, "gust art UUID → 404");
assert.equal(await renderDetail("no-such-language-zzz"), null, "miss language slug → 404");
assert.equal(await renderDetail("no-such-art-zzz"), null, "miss art slug → 404");

// Signed-in still sees off-shelf; curator still sees drafts.
assert.equal((await renderDetail("gust", { fullAccess: true }))?.fields.slug, "gust");
assert.equal(await renderDetail("drafty"), null, "draft, visitor → 404");
assert.equal((await renderDetail("drafty", { curator: true }))?.entity_id, DRAFT.entity_id);

console.log("ok: resolvePublicDetail — featured slugs 200; gust / miss 404");

const languagePage = read("src/app/(site)/language/[id]/page.tsx");
const artPage = read("src/app/(site)/art-styles/[id]/page.tsx");

assert.match(
  languagePage,
  /resolvePublicDetail\(id/,
  "language page renders through resolvePublicDetail",
);
assert.match(
  languagePage,
  /if \(!lang\) notFound\(\)/,
  "language generateMetadata/page notFound() on a hidden row",
);
assert.doesNotMatch(
  languagePage,
  /return \{\s*title: pageTitle\(\)\s*\}/,
  "language metadata must not return generic title (200 chrome)",
);
assert.match(
  artPage,
  /export async function generateMetadata/,
  "art-style has generateMetadata so notFound() sets HTTP 404 before loading.tsx",
);
assert.match(
  artPage,
  /resolvePublicDetail\(id/,
  "art-style page renders through resolvePublicDetail",
);
assert.match(
  artPage,
  /if \(!art\) notFound\(\)/,
  "art-style generateMetadata/page notFound() on a hidden row",
);

console.log("ok: language + art-style page functions notFound() instead of 200 chrome");
