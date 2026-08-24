// Remix must recolor compositions that declare --bg/--hero-image but paint
// with --paper/--ink/--plate-* (ARN-380, the Bluet class). This loads the
// real injectTheme and asserts the override binds those names.
//
// Run: node ui/scripts/remix-theme.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../src/lib/remix-theme.ts");
const { code } = transform(fs.readFileSync(src, "utf8"), {
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

const bluetShaped = `<!doctype html><html><head><style>
:root{
  --paper:#FFFFFF; --bg:#FFFFFF; --surface:#FFFFFF;
  --ink:#14173A; --text:#14173A; --muted:#4A4E75;
  --primary:#2A5BD7; --accent:#FF3D9E; --secondary:#5B2D9C;
  --blue:var(--primary,#2A5BD7); --pink:var(--accent,#FF3D9E);
  --violet:var(--secondary,#5B2D9C);
  --hero-image:url(https://katagami.ai/api/file/fl-old);
  --plate-hero:url(https://katagami.ai/api/file/fl-old);
  --plate-seed:url(https://katagami.ai/api/file/fl-seed);
  --grain:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E");
}
body{background:var(--paper);color:var(--ink)}
.mark{color:var(--blue)}
.hero{background-image:var(--plate-seed)}
</style></head><body></body></html>`;

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

console.log("remix-theme.test.mjs: ok");
