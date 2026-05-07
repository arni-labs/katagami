import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/app/(site)/page.tsx");
const source = readFileSync(sourcePath, "utf8");

const violations = [
  {
    label: "homepage imports the client-only deferred card renderer",
    pattern: /DeferredLanguageCards/,
  },
  {
    label: "homepage caps server-rendered cards to INITIAL_CARDS",
    pattern: /languages\.slice\(\s*0\s*,\s*INITIAL_CARDS\s*\)/,
  },
  {
    label: "homepage places the remainder behind a deferred slice",
    pattern: /languages\.slice\(\s*INITIAL_CARDS\s*\)/,
  },
].filter(({ pattern }) => pattern.test(source));

if (!/languages\.map\(\(lang\)\s*=>/.test(source)) {
  violations.push({
    label: "homepage does not directly map all languages to LanguageCard",
  });
}

if (violations.length > 0) {
  console.error(
    [
      "Gallery regression: every fetched language must be present as a real",
      "server-rendered card/link in the initial HTML. Do not hide catalog",
      "items behind client-only deferred rendering.",
      "",
      ...violations.map(({ label }) => `- ${label}`),
    ].join("\n"),
  );
  process.exit(1);
}
