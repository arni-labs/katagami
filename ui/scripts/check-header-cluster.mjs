// Header chrome must stay one set (ARN-374). Catalog .stamp may tilt;
// the header row (search / theme / sign-in / menu) must share chrome-stamp:
// same height, ink wash, radius 0, no leftover pills, no mixed tilt.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const css = read("src/app/globals.css");
const layout = read("src/app/(site)/layout.tsx");
const token = read("src/lib/chrome-stamp.ts");
const searchFile = read("src/components/command-palette.tsx");
const search = searchFile.slice(
  searchFile.indexOf("export function CommandPaletteTrigger"),
);
const theme = read("src/components/theme-toggle.tsx");
const user = read("src/components/user-menu.tsx");
const menu = read("src/components/mobile-menu.tsx");

const headerFiles = [
  ["search trigger", search, searchFile],
  ["theme toggle", theme, theme],
  ["user menu", user, user],
  ["mobile menu", menu, menu],
];

const required = [
  [
    "chrome-stamp token is exported",
    token,
    /export const CHROME_STAMP = "chrome-stamp"/,
  ],
  [
    "catalog stamps still tilt (ARN-373)",
    css,
    /\.stamp \{[\s\S]*?transform: rotate\(-1\.5deg\);/,
  ],
  [
    "chrome-stamp stays upright",
    css,
    /\.chrome-stamp \{[\s\S]*?transform: none;/,
  ],
  [
    "chrome-stamp is radius 0",
    css,
    /\.chrome-stamp \{[\s\S]*?border-radius: 0;/,
  ],
  [
    "chrome-stamp is 28px tall",
    css,
    /\.chrome-stamp \{[\s\S]*?height: 28px;/,
  ],
  [
    "header-cluster exists",
    css,
    /\.header-cluster \{/,
  ],
  [
    "desktop cluster uses header-cluster",
    layout,
    /className="header-cluster ml-auto hidden lg:flex"/,
  ],
  [
    "mobile cluster uses header-cluster",
    layout,
    /className="header-cluster ml-auto lg:hidden"/,
  ],
  [
    "search trigger is not a custom wash",
    search,
    /^(?![\s\S]*paper-stamp-mix)[\s\S]*$/,
  ],
  [
    "search trigger uses ramune ink",
    search,
    /text-\[var\(--ramune\)\]/,
  ],
  [
    "sign-in uses ramune ink",
    user,
    /text-\[var\(--ramune\)\]/,
  ],
  [
    "menu uses ramune ink",
    menu,
    /text-\[var\(--ramune\)\]/,
  ],
  [
    "search trigger file still exports CommandPaletteTrigger",
    searchFile,
    /export function CommandPaletteTrigger/,
  ],
];

for (const [name, source, full] of headerFiles) {
  required.push([
    `${name} imports CHROME_STAMP`,
    full,
    /from "@\/lib\/chrome-stamp"/,
  ]);
  required.push([
    `${name} applies CHROME_STAMP`,
    source,
    /CHROME_STAMP/,
  ]);
  required.push([
    `${name} does not use catalog .stamp`,
    source,
    /^(?![\s\S]*className="stamp)[\s\S]*$/,
  ]);
  required.push([
    `${name} has no leftover 3px pills`,
    source,
    /^(?![\s\S]*rounded-\[3px\])[\s\S]*$/,
  ]);
  required.push([
    `${name} has no per-control hover tilt`,
    source,
    /^(?![\s\S]*hover:rotate)[\s\S]*$/,
  ]);
}

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
  console.error(`\n${failed} header-cluster contract check(s) failed.`);
  process.exit(1);
}
console.log("\nheader-cluster contract holds.");
