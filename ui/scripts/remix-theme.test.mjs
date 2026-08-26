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
  themeOverrideStyle,
  classifyColorToken,
  compositionBindDecls,
  bindLiteralHero,
  extractRootDecls,
  consumesCustomProperty,
  bindWinningRemixPrimary,
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

const htmlTextRoot = "<p>:root { --blue:#f00 }</p>";
assert.equal(
  htmlTextRoot,
  "<p>:root { --blue:#f00 }</p>",
  "replay must keep :root in the paragraph; do not hide by deleting it",
);
assert.match(htmlTextRoot, /<p>:root \{ --blue:#f00 \}<\/p>/);
assert.ok(
  /:root\s*\{/.test(htmlTextRoot),
  "today's raw HTML walk would still see :root in the paragraph",
);
assert.deepEqual(extractRootDecls(htmlTextRoot), []);
assert.doesNotMatch(
  compositionBindDecls(htmlTextRoot, roles, hero).join(";"),
  /--blue:/,
);

const selectorListRoot = ":root, :host { --blue:#f00 }";
assert.equal(
  selectorListRoot,
  ":root, :host { --blue:#f00 }",
  "replay must keep the selector list; do not hide by rewriting to :root {",
);
assert.equal(
  [...selectorListRoot.matchAll(/:root\s*\{/gi)].length,
  0,
  "an opener that wants { immediately after :root misses this rule",
);
assert.deepEqual(
  extractRootDecls(selectorListRoot).map(([name]) => name),
  ["blue"],
);
assert.match(
  compositionBindDecls(selectorListRoot, roles, hero).join(";"),
  /--blue:#FF3D9E/,
);

const htmlTextAndStyle =
  "<p>:root { --forged:#00ff00 }</p><style>:root, :host { --blue:#2A5BD7 }</style>";
assert.match(htmlTextAndStyle, /<p>:root \{ --forged:#00ff00 \}<\/p>/);
assert.match(htmlTextAndStyle, /:root, :host \{ --blue:#2A5BD7 \}/);
assert.deepEqual(
  extractRootDecls(htmlTextAndStyle).map(([name]) => name),
  ["blue"],
);

const isRoot = ":is(:root) { --blue:#f00 }";
assert.equal(
  isRoot,
  ":is(:root) { --blue:#f00 }",
  "replay must keep :is(:root); do not hide by rewriting to :root {",
);
assert.equal(
  [...isRoot.matchAll(/:root\s*\{/gi)].length,
  0,
  "an opener that dies on ) after :root misses :is(:root)",
);
assert.deepEqual(extractRootDecls(isRoot).map(([name]) => name), ["blue"]);
assert.match(compositionBindDecls(isRoot, roles, hero).join(";"), /--blue:#FF3D9E/);

const whereRoot = ":where(:root, :host) { --blue:#f00 }";
assert.equal(
  whereRoot,
  ":where(:root, :host) { --blue:#f00 }",
  "replay must keep :where(:root, :host); do not hide by rewriting to :root {",
);
assert.deepEqual(extractRootDecls(whereRoot).map(([name]) => name), ["blue"]);
assert.match(compositionBindDecls(whereRoot, roles, hero).join(";"), /--blue:#FF3D9E/);

const notRoot = ":not(:root) { --blue:#f00 }";
assert.equal(
  notRoot,
  ":not(:root) { --blue:#f00 }",
  "replay must keep :not(:root); do not hide the opposite case",
);
assert.match(notRoot, /:not\(:root\) \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(notRoot), []);
assert.doesNotMatch(compositionBindDecls(notRoot, roles, hero).join(";"), /--blue:/);

const textareaStyle = "<textarea><style>:root { --blue:#f00 }</style></textarea>";
assert.equal(
  textareaStyle,
  "<textarea><style>:root { --blue:#f00 }</style></textarea>",
  "replay must keep <style> inside textarea; do not hide by deleting it",
);
assert.match(
  textareaStyle,
  /<textarea><style>:root \{ --blue:#f00 \}<\/style><\/textarea>/,
);
assert.ok(
  /<style>:root \{ --blue:#f00 \}<\/style>/.test(textareaStyle),
  "today's style-tag harvest would still see the inner :root",
);
assert.deepEqual(extractRootDecls(textareaStyle), []);
assert.doesNotMatch(
  compositionBindDecls(textareaStyle, roles, hero).join(";"),
  /--blue:/,
);

const textareaAndLive =
  "<textarea><style>:root { --forged:#00ff00 }</style></textarea><style>:is(:root) { --blue:#2A5BD7 }</style>";
assert.match(textareaAndLive, /<textarea><style>:root \{ --forged:#00ff00 \}<\/style><\/textarea>/);
assert.match(textareaAndLive, /:is\(:root\) \{ --blue:#2A5BD7 \}/);
assert.deepEqual(
  extractRootDecls(textareaAndLive).map(([name]) => name),
  ["blue"],
);

const descendantRoot = ".x :root { --blue:#f00 }";
assert.equal(
  descendantRoot,
  ".x :root { --blue:#f00 }",
  "replay must keep the descendant combinator; do not hide by rewriting to :root {",
);
assert.match(descendantRoot, /\.x :root \{ --blue:#f00 \}/);
assert.ok(
  /:root\s*\{/.test(descendantRoot),
  "today's walk would still treat this as a :root rule",
);
assert.deepEqual(extractRootDecls(descendantRoot), []);
assert.doesNotMatch(
  compositionBindDecls(descendantRoot, roles, hero).join(";"),
  /--blue:/,
);

const isThenRoot = ":is(.x) :root { --blue:#f00 }";
assert.equal(
  isThenRoot,
  ":is(.x) :root { --blue:#f00 }",
  "replay must keep :is(.x) :root; do not hide by rewriting to :is(:root)",
);
assert.match(isThenRoot, /:is\(\.x\) :root \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(isThenRoot), []);
assert.doesNotMatch(
  compositionBindDecls(isThenRoot, roles, hero).join(";"),
  /--blue:/,
);

assert.deepEqual(extractRootDecls(".x > :root { --blue:#f00 }"), []);
assert.deepEqual(extractRootDecls(".x + :root { --blue:#f00 }"), []);
assert.deepEqual(extractRootDecls(".x ~ :root { --blue:#f00 }"), []);
assert.deepEqual(
  extractRootDecls("html:root { --blue:#f00 }").map(([name]) => name),
  ["blue"],
);
assert.deepEqual(
  extractRootDecls(":is(.x, :root) { --blue:#f00 }").map(([name]) => name),
  ["blue"],
);

const rootAsAncestor = ":root > .x { --blue:#f00 }";
assert.equal(
  rootAsAncestor,
  ":root > .x { --blue:#f00 }",
  "replay must keep :root > .x; do not hide by rewriting to :root {",
);
assert.match(rootAsAncestor, /:root > \.x \{ --blue:#f00 \}/);
assert.ok(
  /:root\s*>/.test(rootAsAncestor),
  "today's walk would still treat ancestor :root as the subject",
);
assert.deepEqual(extractRootDecls(rootAsAncestor), []);
assert.doesNotMatch(
  compositionBindDecls(rootAsAncestor, roles, hero).join(";"),
  /--blue:/,
);

const rootDescendantSubject = ":root .foo { --blue:#f00 }";
assert.equal(
  rootDescendantSubject,
  ":root .foo { --blue:#f00 }",
  "replay must keep :root .foo; do not hide by rewriting to :root {",
);
assert.match(rootDescendantSubject, /:root \.foo \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(rootDescendantSubject), []);
assert.doesNotMatch(
  compositionBindDecls(rootDescendantSubject, roles, hero).join(";"),
  /--blue:/,
);

const isThenIsRoot = ":is(.x) :is(:root) { --blue:#f00 }";
assert.equal(
  isThenIsRoot,
  ":is(.x) :is(:root) { --blue:#f00 }",
  "replay must keep :is(.x) :is(:root); do not hide by rewriting to :is(:root)",
);
assert.match(isThenIsRoot, /:is\(\.x\) :is\(:root\) \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(isThenIsRoot), []);
assert.doesNotMatch(
  compositionBindDecls(isThenIsRoot, roles, hero).join(";"),
  /--blue:/,
);

const isRootAsAncestor = ":is(:root > .x) { --blue:#f00 }";
assert.equal(
  isRootAsAncestor,
  ":is(:root > .x) { --blue:#f00 }",
  "replay must keep :is(:root > .x); do not hide by rewriting to :is(:root)",
);
assert.match(isRootAsAncestor, /:is\(:root > \.x\) \{ --blue:#f00 \}/);
assert.ok(
  /:is\(:root\s*>/.test(isRootAsAncestor),
  "today's wrapper walk would still treat this as a :root subject",
);
assert.deepEqual(extractRootDecls(isRootAsAncestor), []);
assert.doesNotMatch(
  compositionBindDecls(isRootAsAncestor, roles, hero).join(";"),
  /--blue:/,
);

const whereRootAsAncestor = ":where(:root .foo) { --blue:#f00 }";
assert.equal(
  whereRootAsAncestor,
  ":where(:root .foo) { --blue:#f00 }",
  "replay must keep :where(:root .foo); do not hide by rewriting to :where(:root)",
);
assert.match(whereRootAsAncestor, /:where\(:root \.foo\) \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(whereRootAsAncestor), []);
assert.doesNotMatch(
  compositionBindDecls(whereRootAsAncestor, roles, hero).join(";"),
  /--blue:/,
);

const rootBefore = ":root::before { --blue:#f00 }";
assert.equal(
  rootBefore,
  ":root::before { --blue:#f00 }",
  "replay must keep :root::before; do not hide by rewriting to :root {",
);
assert.match(rootBefore, /:root::before \{ --blue:#f00 \}/);
assert.ok(
  /:root::before/.test(rootBefore),
  "today's walk would still treat a pseudo-element as a :root rule",
);
assert.deepEqual(extractRootDecls(rootBefore), []);
assert.doesNotMatch(
  compositionBindDecls(rootBefore, roles, hero).join(";"),
  /--blue:/,
);

const isRootBefore = ":is(:root)::before { --blue:#f00 }";
assert.equal(
  isRootBefore,
  ":is(:root)::before { --blue:#f00 }",
  "replay must keep :is(:root)::before; do not hide by rewriting to :is(:root)",
);
assert.match(isRootBefore, /:is\(:root\)::before \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(isRootBefore), []);
assert.doesNotMatch(
  compositionBindDecls(isRootBefore, roles, hero).join(";"),
  /--blue:/,
);

assert.deepEqual(
  extractRootDecls(":root:hover { --blue:#f00 }").map(([name]) => name),
  ["blue"],
);

const css2Before = ":root:before { --blue:#f00 }";
assert.equal(
  css2Before,
  ":root:before { --blue:#f00 }",
  "replay must keep :root:before; do not hide by rewriting to :root::before or :root {",
);
assert.match(css2Before, /:root:before \{ --blue:#f00 \}/);
assert.doesNotMatch(css2Before, /::before/);
assert.ok(
  /:root:before/.test(css2Before),
  "today's ::-only gate would still treat CSS2 :before as a :root rule",
);
assert.deepEqual(extractRootDecls(css2Before), []);
assert.doesNotMatch(
  compositionBindDecls(css2Before, roles, hero).join(";"),
  /--blue:/,
);

const css2After = ":root:after { --blue:#f00 }";
assert.equal(css2After, ":root:after { --blue:#f00 }");
assert.match(css2After, /:root:after \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(css2After), []);
assert.doesNotMatch(
  compositionBindDecls(css2After, roles, hero).join(";"),
  /--blue:/,
);

const css2FirstLine = ":root:first-line { --blue:#f00 }";
assert.equal(css2FirstLine, ":root:first-line { --blue:#f00 }");
assert.match(css2FirstLine, /:root:first-line \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(css2FirstLine), []);
assert.doesNotMatch(
  compositionBindDecls(css2FirstLine, roles, hero).join(";"),
  /--blue:/,
);

const css2FirstLetter = ":root:first-letter { --blue:#f00 }";
assert.equal(css2FirstLetter, ":root:first-letter { --blue:#f00 }");
assert.match(css2FirstLetter, /:root:first-letter \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(css2FirstLetter), []);
assert.doesNotMatch(
  compositionBindDecls(css2FirstLetter, roles, hero).join(";"),
  /--blue:/,
);

const isBefore = ":root:is(:before) { --blue:#f00 }";
assert.equal(
  isBefore,
  ":root:is(:before) { --blue:#f00 }",
  "replay must keep :root:is(:before); do not hide by rewriting to :root:before",
);
assert.match(isBefore, /:root:is\(:before\) \{ --blue:#f00 \}/);
assert.ok(
  /:is\(:before\)/.test(isBefore),
  "today's gate would still miss a PE nested in :is()",
);
assert.deepEqual(extractRootDecls(isBefore), []);
assert.doesNotMatch(compositionBindDecls(isBefore, roles, hero).join(";"), /--blue:/);

const isDblBefore = ":root:is(::before) { --blue:#f00 }";
assert.equal(
  isDblBefore,
  ":root:is(::before) { --blue:#f00 }",
  "replay must keep :root:is(::before); do not hide by rewriting to :root::before",
);
assert.match(isDblBefore, /:root:is\(::before\) \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(isDblBefore), []);
assert.doesNotMatch(
  compositionBindDecls(isDblBefore, roles, hero).join(";"),
  /--blue:/,
);

const rootSelection = ":root:selection { --blue:#f00 }";
assert.equal(
  rootSelection,
  ":root:selection { --blue:#f00 }",
  "replay must keep :root:selection; do not hide by rewriting to :root::selection",
);
assert.match(rootSelection, /:root:selection \{ --blue:#f00 \}/);
assert.doesNotMatch(rootSelection, /::selection/);
assert.deepEqual(extractRootDecls(rootSelection), []);
assert.doesNotMatch(
  compositionBindDecls(rootSelection, roles, hero).join(";"),
  /--blue:/,
);

const rootCue = ":root:cue { --blue:#f00 }";
assert.equal(rootCue, ":root:cue { --blue:#f00 }");
assert.match(rootCue, /:root:cue \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(rootCue), []);
assert.doesNotMatch(compositionBindDecls(rootCue, roles, hero).join(";"), /--blue:/);

const rootDblSelection = ":root::selection { --blue:#f00 }";
assert.equal(rootDblSelection, ":root::selection { --blue:#f00 }");
assert.match(rootDblSelection, /:root::selection \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(rootDblSelection), []);
assert.doesNotMatch(
  compositionBindDecls(rootDblSelection, roles, hero).join(";"),
  /--blue:/,
);

assert.deepEqual(
  extractRootDecls(":root:is(:hover) { --blue:#f00 }").map(([name]) => name),
  ["blue"],
);

const hasBefore = ":root:has(::before) { --blue:#f00 }";
assert.equal(
  hasBefore,
  ":root:has(::before) { --blue:#f00 }",
  "replay must keep :root:has(::before); do not hide by rewriting to :root:has(.foo)",
);
assert.match(hasBefore, /:root:has\(::before\) \{ --blue:#f00 \}/);
assert.ok(
  /:has\(::before\)/.test(hasBefore),
  "today's :is/:where-only walk would still miss a PE inside :has()",
);
assert.deepEqual(extractRootDecls(hasBefore), []);
assert.doesNotMatch(compositionBindDecls(hasBefore, roles, hero).join(";"), /--blue:/);

const hasFoo = ":root:has(.foo) { --blue:#f00 }";
assert.equal(
  hasFoo,
  ":root:has(.foo) { --blue:#f00 }",
  "control: :root:has(.foo) is still a :root rule",
);
assert.match(hasFoo, /:root:has\(\.foo\) \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(hasFoo).map(([name]) => name), ["blue"]);
assert.match(compositionBindDecls(hasFoo, roles, hero).join(";"), /--blue:#FF3D9E/);

const webkitScrollbar = ":root:-webkit-scrollbar { --blue:#f00 }";
assert.equal(
  webkitScrollbar,
  ":root:-webkit-scrollbar { --blue:#f00 }",
  "replay must keep :-webkit-scrollbar; do not hide by rewriting to ::-webkit-scrollbar",
);
assert.match(webkitScrollbar, /:root:-webkit-scrollbar \{ --blue:#f00 \}/);
assert.doesNotMatch(webkitScrollbar, /::-webkit-scrollbar/);
assert.deepEqual(extractRootDecls(webkitScrollbar), []);
assert.doesNotMatch(
  compositionBindDecls(webkitScrollbar, roles, hero).join(";"),
  /--blue:/,
);

const webkitResizer = ":root:-webkit-resizer { --blue:#f00 }";
assert.equal(
  webkitResizer,
  ":root:-webkit-resizer { --blue:#f00 }",
  "replay must keep :-webkit-resizer; do not hide by adding only scrollbar",
);
assert.match(webkitResizer, /:root:-webkit-resizer \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(webkitResizer), []);
assert.doesNotMatch(
  compositionBindDecls(webkitResizer, roles, hero).join(";"),
  /--blue:/,
);

const mozSelection = ":root:-moz-selection { --blue:#f00 }";
assert.equal(
  mozSelection,
  ":root:-moz-selection { --blue:#f00 }",
  "replay must keep :-moz-selection; do not hide by rewriting to ::-moz-selection",
);
assert.match(mozSelection, /:root:-moz-selection \{ --blue:#f00 \}/);
assert.doesNotMatch(mozSelection, /::-moz-selection/);
assert.deepEqual(extractRootDecls(mozSelection), []);
assert.doesNotMatch(
  compositionBindDecls(mozSelection, roles, hero).join(";"),
  /--blue:/,
);

const mozAnyLink = ":root:-moz-any-link { --blue:#f00 }";
assert.equal(
  mozAnyLink,
  ":root:-moz-any-link { --blue:#f00 }",
  "control: vendor pseudo-class still matches :root",
);
assert.match(mozAnyLink, /:root:-moz-any-link \{ --blue:#f00 \}/);
assert.deepEqual(extractRootDecls(mozAnyLink).map(([name]) => name), ["blue"]);
assert.match(compositionBindDecls(mozAnyLink, roles, hero).join(";"), /--blue:#FF3D9E/);

const mozAnyBefore = ":root:-moz-any(:before) { --blue:#f00 }";
assert.equal(
  mozAnyBefore,
  ":root:-moz-any(:before) { --blue:#f00 }",
  "replay must keep :-moz-any(:before); do not hide by rewriting to :is(:before)",
);
assert.match(mozAnyBefore, /:root:-moz-any\(:before\) \{ --blue:#f00 \}/);
assert.ok(
  /:-moz-any\(:before\)/.test(mozAnyBefore),
  "today's recurse set has -webkit-any but not -moz-any",
);
assert.deepEqual(extractRootDecls(mozAnyBefore), []);
assert.doesNotMatch(
  compositionBindDecls(mozAnyBefore, roles, hero).join(";"),
  /--blue:/,
);

const yellowLanding = injectTheme(
  "<style>:root{--primary:#FFD400}</style>",
  { accent: "#C8442A" },
);
const yellowPrimaries = [...yellowLanding.matchAll(/--primary:(#[0-9A-Fa-f]+)/g)].map((m) => m[1]);
assert.equal(
  yellowPrimaries.at(-1),
  "#C8442A",
  "remix --primary wins over a later landing #FFD400",
);
assert.equal(bindWinningRemixPrimary("", "#C8442A"), "", "empty HTML stays empty — leftover 2");
assert.match(bindWinningRemixPrimary("<p></p>", "#C8442A"), /--primary:#C8442A/);

const emptyOverride = themeOverrideStyle({ accent: "#C8442A" });
assert.match(
  emptyOverride,
  /--primary:#C8442A/,
  "themeOverrideStyle keeps --primary when there is no landing HTML",
);
assert.match(emptyOverride, /--accent:#C8442A/);

const rustGate = fs.readFileSync(
  path.join(here, "../../katagami-curation/wasm/finalize_spawned_session/src/lib.rs"),
  "utf8",
);
assert.ok(
  !rustGate.includes(String.raw`html_lower.contains(&format!("var(--{name}"))`),
  "consume-gate must not substring-match var(--{name}",
);

console.log("remix-theme.test.mjs: ok");
