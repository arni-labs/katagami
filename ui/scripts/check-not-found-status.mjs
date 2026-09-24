// A page that calls notFound() must not sit under a Suspense boundary.
//
// The status code goes out with the first byte. A loading.tsx at the page's
// segment or any segment above it wraps the page in Suspense, so Next flushes
// the layout shell as HTTP 200 before the page runs, and a later notFound()
// can only swap the body. That is how /language/<id> and /art-styles/<id>
// answered 200 for missing and off-shelf entries while /palettes/<id>, which
// had no loading.tsx, answered 404 (QA, 2026-09-23). A layout or template on
// the path that wraps {children} in <Suspense> does the same thing.
//
// This checks the structure, not the status: a real status test needs the
// built app and a Temper backend. The preview curl in the PR is the live check.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const appDir = resolve("src/app");
const EXT = [".tsx", ".ts", ".jsx", ".js"];

function pages(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...pages(path));
    else if (EXT.some((ext) => name === `page${ext}`)) found.push(path);
  }
  return found;
}

function conventionFile(dir, base) {
  for (const ext of EXT) {
    const path = join(dir, `${base}${ext}`);
    if (existsSync(path)) return path;
  }
  return null;
}

const callsNotFound = (source) => /\bnotFound\(\)/.test(source);
// {children} while any <Suspense> is open, counting nesting, so an inner
// boundary before {children} cannot hide the outer one, and siblings do not count.
const wrapsChildrenInSuspense = (source) => {
  let depth = 0;
  for (const m of source.matchAll(/<Suspense\b[^>]*?(\/?)>|<\/Suspense>|\{\s*children\s*\}/g)) {
    if (m[0].startsWith("</")) depth = Math.max(0, depth - 1);
    else if (m[0].startsWith("<Suspense")) depth += m[1] ? 0 : 1;
    else if (depth > 0) return true;
  }
  return false;
};

const violations = [];
let checked = 0;
for (const page of pages(appDir)) {
  if (!callsNotFound(readFileSync(page, "utf8"))) continue;
  checked++;
  for (let dir = dirname(page); ; dir = dirname(dir)) {
    const loading = conventionFile(dir, "loading");
    if (loading) {
      violations.push(`${relative(appDir, page)} calls notFound() under ${relative(appDir, loading)}`);
    }
    for (const base of ["layout", "template"]) {
      const file = conventionFile(dir, base);
      if (file && wrapsChildrenInSuspense(readFileSync(file, "utf8"))) {
        violations.push(`${relative(appDir, page)} calls notFound() inside <Suspense> in ${relative(appDir, file)}`);
      }
    }
    if (dir === appDir) break;
  }
}

// The detail pages this was written for must still be in scope, or the check
// passes by no longer looking at them.
for (const page of [
  "(site)/language/[id]/page.tsx",
  "(site)/art-styles/[id]/page.tsx",
  "(site)/palettes/[id]/page.tsx",
]) {
  const path = join(appDir, page);
  if (!existsSync(path) || !callsNotFound(readFileSync(path, "utf8"))) {
    violations.push(`${page} no longer calls notFound(); update this check to follow its 404`);
  }
}

if (violations.length) {
  console.error("FAIL: notFound() would answer HTTP 200 behind a streamed shell:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`ok: ${checked} pages call notFound() and none sits under loading.tsx or a Suspense-wrapped layout`);
