// What a visitor is offered, asserted in one place.
//
// The front door is the sheet, and the public menu is three links. The pages
// the sheet replaced are still in the tree — a reader finds each one where its
// route used to be — and they stay out of reach by redirecting to "/". Two
// things can quietly undo that: a link added back to NAV_LINKS, and a retired
// route losing its redirect and becoming reachable again. Both are one line,
// neither shows up in a test of anything else, so they are checked here.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

const nav = read("src/lib/nav.ts");
const config = read("next.config.ts");
const home = read("src/app/(site)/page.tsx");
const searchIndex = read("src/lib/command-palette-index.ts");
const layout = read("src/app/(site)/layout.tsx");
const css = read("src/app/globals.css");

const failures = [];
const want = (label, ok) => { if (!ok) failures.push(label); };

// The public menu, spelled out. A new entry has to be added here too, which is
// the point: it is the moment to ask whether the public should see it.
const PUBLIC = [
  ["/", "Gallery"],
  ["/model-bake-off", "Bake-off"],
  ["/connect", "MCP"],
];
// Everything the sheet replaced. Reachable by URL only as a redirect to "/".
const RETIRED = ["/gallery", "/ask", "/atlas", "/palettes", "/art-styles", "/studio"];

const publicBlock = nav.slice(nav.indexOf("export const NAV_LINKS"), nav.indexOf("OWNER_NAV_LINKS"));
const listed = [...publicBlock.matchAll(/\{ href: "([^"]+)", label: "([^"]+)" \}/g)].map((m) => [m[1], m[2]]);
want(
  `the public menu is exactly ${PUBLIC.map(([h]) => h).join(", ")} — found ${listed.map(([h]) => h).join(", ") || "nothing"}`,
  JSON.stringify(listed) === JSON.stringify(PUBLIC),
);

const redirectBlock = config.slice(config.indexOf("async redirects()"), config.indexOf("async rewrites()"));
for (const route of RETIRED) {
  want(`${route} redirects to "/" (next.config.ts)`, redirectBlock.includes(`"${route}"`));
  want(`${route} is not offered in the public menu`, !publicBlock.includes(`"${route}"`));
}
want('the retired routes land on "/"', /destination: "\/"/.test(redirectBlock));

// One sheet, two addresses. "/" must render the shared loader rather than keep
// a second copy that drifts from the one we iterate on at /explore/mosaic.
want('"/" renders the shared MosaicSheet', /MosaicSheet/.test(home));
want('"/" is dynamic, because the sheet reads the signed-in tier', /export const dynamic = "force-dynamic"/.test(home));

// Search is the third reader of the menu; it used to keep its own list of pages
// and so could still offer a door the menu had closed.
want("the search index builds its page entries from NAV_LINKS", /for \(const page of NAV_LINKS\)/.test(searchIndex));

// The sheet fills the viewport below the header by subtracting --site-header.
// If the header's own height changes and this does not, the front door is short
// by the difference — which is how a strip of footer appeared under it on a phone.
const nav_row = /className="mx-auto flex (h-\d+) [^"]*?(sm:h-\d+)/.exec(layout);
want("the header nav row still declares its height in Tailwind steps", Boolean(nav_row));
if (nav_row) {
  const px = (cls) => Number(cls.replace(/^.*h-/, "")) * 4 + 1; // + the 1px perforation below the nav
  const base = /--site-header: (\d+)px/.exec(css);
  const wide = /min-width: 40rem\)\s*\{\s*:root\s*\{\s*--site-header: (\d+)px/.exec(css);
  want("--site-header is defined for phones", Boolean(base));
  want("--site-header is defined from the sm breakpoint up", Boolean(wide));
  if (base) want(`--site-header (${base[1]}px) matches the header's ${nav_row[1]}`, Number(base[1]) === px(nav_row[1]));
  if (wide) want(`--site-header at sm (${wide[1]}px) matches the header's ${nav_row[2]}`, Number(wide[1]) === px(nav_row[2]));
}

if (failures.length > 0) {
  console.error(["The public surface changed:", "", ...failures.map((f) => `- ${f}`)].join("\n"));
  process.exit(1);
}
console.log(`ok: three public links, ${RETIRED.length} retired routes redirected, the sheet at "/"`);
