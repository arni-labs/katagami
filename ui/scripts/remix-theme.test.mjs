// Remix must recolor compositions that declare --bg/--hero-image but paint
// with --paper/--ink/--plate-* (ARN-380, the Bluet class). This loads the
// real injectTheme and asserts the override binds those names.
//
// Fixture only — not live fl-019f9b09-9f91-73e2-8817-2446e25e8dfe.
// --blue and --pink both classify as accent, so they share one hex after
// bind. That is not "two marks remixed." Do not call a live file bound
// unless those two stay distinct.
//
// Run: node ui/scripts/remix-theme.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../src/lib/remix-theme.ts");
const themeSrc = fs.readFileSync(src, "utf8");
const { code } = transform(themeSrc, {
  transforms: ["typescript", "imports"],
  production: true,
  filePath: src,
});
const mod = { exports: {} };
new Function("module", "exports", code)(mod, mod.exports);
const {
  injectTheme,
  classifyColorToken,
  compositionBindDecls,
  bindLiteralHero,
  extractRootDecls,
  consumesCustomProperty,
} = mod.exports;

const roles = {
  bg: "#111111",
  surface: "#222222",
  text: "#EEEEEE",
  muted: "#AAAAAA",
  border: "#333333",
  accent: "#FF3D9E",
};
const hero = "https://katagami.ai/api/file/fl-remix-hero";

// Grain with a literal `}` sits BEFORE --blue. #241's `:root { [^}]+ }`
// cuts the block at the svg close and never binds --blue. A greedier
// `[\s\S]+` to the last `}` would also pick up --forged from .later.
const GRAIN_URL = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><style>rect{opacity:.35}</style></svg>")`;
const grainCutsAtSvg = `:root{
  --grain:${GRAIN_URL};
  --blue:#2A5BD7;
  --pink:#FF3D9E;
}
.later{--forged:#00ff00}`;

const cutBy241 = [...grainCutsAtSvg.matchAll(/:root\s*\{([^}]+)\}/gi)];
const names241 = [...(cutBy241[0]?.[1] ?? "").matchAll(/--([a-zA-Z0-9_-]+)/g)].map(
  (m) => m[1],
);
assert.deepEqual(
  names241,
  ["grain"],
  "today's [^}]+ regex must miss --blue so this fixture cannot pass by accident",
);

const greedy = [...grainCutsAtSvg.matchAll(/:root\s*\{([\s\S]+)\}/gi)];
const namesGreedy = [...(greedy[0]?.[1] ?? "").matchAll(/--([a-zA-Z0-9_-]+)/g)].map(
  (m) => m[1],
);
assert.deepEqual(
  namesGreedy,
  ["grain", "blue", "pink", "forged"],
  "a greedier [\\s\\S]+ pull includes .later — not a real parse",
);

assert.ok(
  !themeSrc.includes(String.raw`:root\s*\{([^}]+)\}`),
  "extractRootDecls must not go back to :root { [^}]+ }",
);

const parsed = extractRootDecls(grainCutsAtSvg);
assert.deepEqual(
  parsed.map(([name]) => name),
  ["grain", "blue", "pink"],
);
assert.match(parsed[0][1], /rect\{opacity:\.35\}/);

const grainFirstBind = compositionBindDecls(grainCutsAtSvg, roles, hero).join(";");
assert.match(grainFirstBind, /--blue:#FF3D9E/);
assert.match(grainFirstBind, /--pink:#FF3D9E/);
assert.doesNotMatch(grainFirstBind, /--forged:/);
assert.doesNotMatch(grainFirstBind, /--grain:/);

const bluetShaped = `<!doctype html><html><head><style>
:root{
  --grain:${GRAIN_URL};
  --paper:#FFFFFF; --bg:#FFFFFF; --surface:#FFFFFF;
  --ink:#14173A; --text:#14173A; --muted:#4A4E75;
  --primary:#2A5BD7; --accent:#FF3D9E; --secondary:#5B2D9C;
  --blue:var(--primary,#2A5BD7); --pink:var(--accent,#FF3D9E);
  --violet:var(--secondary,#5B2D9C);
  --hero-image:url(https://katagami.ai/api/file/fl-old);
  --plate-hero:url(https://katagami.ai/api/file/fl-old);
  --plate-seed:url(https://katagami.ai/api/file/fl-seed);
}
body{background:var(--paper);color:var(--ink)}
.mark{color:var(--blue)}
.hero{background-image:var(--plate-seed)}
</style></head><body></body></html>`;

assert.doesNotMatch(bluetShaped, /fl-019f9b09-9f91-73e2-8817-2446e25e8dfe/);

assert.equal(classifyColorToken("paper"), "bg");
assert.equal(classifyColorToken("ink"), "text");
assert.equal(classifyColorToken("primary"), "accent");
assert.equal(classifyColorToken("blue"), "accent");
assert.equal(classifyColorToken("pink-ink"), "accent");
assert.equal(classifyColorToken("plate-1"), "surface");

const decls = compositionBindDecls(bluetShaped, roles, hero).join(";");
assert.match(decls, /--paper:#111111/);
assert.match(decls, /--ink:#EEEEEE/);
assert.match(decls, /--primary:#FF3D9E/);
assert.match(decls, /--blue:#FF3D9E/);
assert.match(decls, /--pink:#FF3D9E/);
assert.match(decls, /--violet:#FF3D9E/);
assert.match(decls, /--plate-seed:url\('https:\/\/katagami.ai\/api\/file\/fl-remix-hero'\)/);
assert.doesNotMatch(decls, /--grain:/);

const html = injectTheme(bluetShaped, roles, hero);
assert.match(html, /id="remix-theme"/);
assert.match(html, /--bg:#111111/);
assert.match(html, /--accent:#FF3D9E/);
assert.match(html, /--hero-image:url\('https:\/\/katagami.ai\/api\/file\/fl-remix-hero'\)/);
assert.match(html, /--paper:#111111/);
assert.match(html, /--ink:#EEEEEE/);
assert.match(html, /--plate-seed:url\('https:\/\/katagami.ai\/api\/file\/fl-remix-hero'\)/);

const alreadyConsumes = `<style>.hero{background-image:var(--hero-image)}</style>
<div style="background-image:url(https://katagami.ai/api/file/fl-keep)"></div>`;
assert.equal(bindLiteralHero(alreadyConsumes, hero), alreadyConsumes);

const literalOnly = `<style>.hero{background-image:url(https://katagami.ai/api/file/fl-old)}</style>`;
assert.match(
  bindLiteralHero(literalOnly, hero),
  /background-image:url\('https:\/\/katagami.ai\/api\/file\/fl-remix-hero'\)/,
);

assert.equal(consumesCustomProperty("color:var(--bg)", "bg"), true);
assert.equal(consumesCustomProperty("color:var(--bg,#fff)", "bg"), true);
assert.equal(consumesCustomProperty("color:var(--bg )", "bg"), true);
assert.equal(consumesCustomProperty("color:var( --bg )", "bg"), true);
assert.equal(consumesCustomProperty("color:var(--bg-alt)", "bg"), false);
assert.equal(consumesCustomProperty("color:var(--background)", "bg"), false);
assert.equal(consumesCustomProperty(":root{--bg:#fff}", "bg"), false);
assert.equal(consumesCustomProperty("background-image:var(--hero-image)", "hero-image"), true);
assert.equal(
  consumesCustomProperty("background-image:var(--hero-image-alt)", "hero-image"),
  false,
);

const commentOrStringReplay = `<style>/* var(--bg) */ .x{content:"var(--bg)"} body{background:var(--paper)}</style>`;
assert.match(
  commentOrStringReplay,
  /\/\* var\(--bg\) \*\//,
  "replay must keep the comment; do not hide the hole by deleting it",
);
assert.match(commentOrStringReplay, /content:"var\(--bg\)"/);
assert.match(
  commentOrStringReplay,
  /var\(--bg\)/,
  "today's raw scan would still see var(--bg) in the comment/string",
);
assert.equal(consumesCustomProperty(commentOrStringReplay, "bg"), false);
assert.equal(consumesCustomProperty(commentOrStringReplay, "paper"), true);
assert.equal(
  consumesCustomProperty("/* var(--bg) */ background:var(--paper)", "bg"),
  false,
);
assert.equal(
  consumesCustomProperty('content:"var(--bg)";background:var(--paper)', "bg"),
  false,
);
assert.equal(
  consumesCustomProperty("content:'var(--bg)';background:var(--paper)", "bg"),
  false,
);
assert.equal(
  consumesCustomProperty("/* var(--bg) */ background:var(--bg)", "bg"),
  true,
);
assert.equal(
  consumesCustomProperty(`<div style="background:var(--bg)"></div>`, "bg"),
  true,
);
assert.equal(
  consumesCustomProperty(
    `<div style="content:'var(--bg)';background:var(--paper)"></div>`,
    "bg",
  ),
  false,
);

const urlDataUriReplay =
  "<style>body{background:url(data:image/svg+xml,<svg>var(--bg)</svg>);color:var(--paper)}</style>";
const urlVarReplay =
  "<style>body{background-image:url(var(--bg));color:var(--paper)}</style>";
assert.equal(
  urlDataUriReplay,
  "<style>body{background:url(data:image/svg+xml,<svg>var(--bg)</svg>);color:var(--paper)}</style>",
);
assert.match(
  urlDataUriReplay,
  /url\(data:image\/svg\+xml,<svg>var\(--bg\)<\/svg>\)/,
  "replay must keep var(--bg) inside the svg; do not hide by deleting it",
);
assert.equal(consumesCustomProperty(urlDataUriReplay, "bg"), false);
assert.equal(consumesCustomProperty(urlDataUriReplay, "paper"), true);
assert.equal(consumesCustomProperty(urlVarReplay, "bg"), true);
assert.equal(consumesCustomProperty("url(var(--hero-image))", "hero-image"), true);
assert.equal(consumesCustomProperty("url(/*x*/var(--bg))", "bg"), true);
assert.equal(consumesCustomProperty("url( /*x*/ var(--bg) )", "bg"), true);

const commentedRoot = `/* :root { --blue:#2A5BD7; --forged:#00ff00 } */
<!-- :root { --blue:#2A5BD7 } -->
.x{content:":root { --blue:#2A5BD7; --forged:#00ff00 }"}`;
assert.match(
  commentedRoot,
  /\/\* :root \{ --blue:#2A5BD7; --forged:#00ff00 \}/,
  "replay must keep the commented :root; do not hide by deleting it",
);
assert.match(commentedRoot, /<!-- :root \{ --blue:#2A5BD7 \}/);
assert.match(commentedRoot, /content:":root \{ --blue:#2A5BD7; --forged:#00ff00 \}"/);
assert.ok(
  [...commentedRoot.matchAll(/:root\s*\{/gi)].length >= 3,
  "today's :root regex would still see the buried rules",
);
assert.deepEqual(extractRootDecls(commentedRoot), []);
const commentedBind = compositionBindDecls(commentedRoot, roles, hero).join(";");
assert.doesNotMatch(commentedBind, /--blue:/);
assert.doesNotMatch(commentedBind, /--forged:/);

const mixedRoot = `/* :root { --forged:#00ff00 } */
:root { --blue:#2A5BD7 }
`;
assert.deepEqual(
  extractRootDecls(mixedRoot).map(([name]) => name),
  ["blue"],
);

const rustGate = fs.readFileSync(
  path.join(here, "../../katagami-curation/wasm/finalize_spawned_session/src/lib.rs"),
  "utf8",
);
assert.ok(
  !rustGate.includes(String.raw`html_lower.contains(&format!("var(--{name}"))`),
  "consume-gate must not substring-match var(--{name}",
);

console.log("remix-theme.test.mjs: ok");
