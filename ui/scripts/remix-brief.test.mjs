import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  absoluteUrl,
  buildRemixBrief,
  paletteTokenLines,
  remixBriefPath,
  resolveSlotPrompt,
} from "../src/lib/remix-brief.ts";
import { COMPOSITIONS } from "../src/lib/remix-compositions.ts";

const here = fileURLToPath(new URL(".", import.meta.url));

const signature = [
  { hex: "#a7564b", name: "faded coral" },
  { hex: "#527f7d", name: "softened teal" },
];
const palette = {
  name: "Test palette",
  signature,
  neutrals: { surface: "#ffffff", text: "#000000" },
  semantic: { danger: "#c0392b" },
  ramps: { coral: { 100: "#f3d9d5", 500: "#a7564b" } },
};

// A recipe with no slots: the facts are stated before it and it stays verbatim.
const aesthetic =
  "Render the supplied subject as a two-ink relief print. Use broken carved edges. Avoid glossy gradients.";
const resolved = resolveSlotPrompt(aesthetic, "a ceramic teapot", signature);
assert.match(resolved, /^Subject\/content: a ceramic teapot\./);
assert.match(resolved, /Palette: faded coral #a7564b, softened teal #527f7d\./);
assert.equal(resolved.endsWith(aesthetic), true);
assert.equal(resolved.split(aesthetic).length - 1, 1);

// A recipe with slots (the shape live art styles use): every slot is filled and
// the facts are not repeated in front of it.
const slotted =
  "{subject}, in the style of flat geometric reconstruction, {palette}, {composition}, filling the frame.";
const filled = resolveSlotPrompt(slotted, "a ceramic teapot", signature, "portrait bust, 1:1");
assert.equal(
  filled,
  "a ceramic teapot, in the style of flat geometric reconstruction, faded coral #a7564b, softened teal #527f7d, portrait bust, 1:1, filling the frame.",
);
assert.doesNotMatch(filled, /\{subject\}|\{palette\}|\{composition\}|Subject\/content/);

// palette_tokens come from signature/neutrals/semantic/ramps (a palette has no
// `tokens` or `roles` field), each under its own key.
const tokens = paletteTokenLines(palette).join("\n");
assert.match(tokens, /^  signature:\n    - \{ name: "faded coral", hex: "#a7564b" \}/);
assert.match(tokens, /  neutrals:\n    "surface": "#ffffff"\n    "text": "#000000"/);
assert.match(tokens, /  semantic:\n    "danger": "#c0392b"/);
assert.match(tokens, /  ramps:\n    "coral":\n      "100": "#f3d9d5"\n      "500": "#a7564b"/);
assert.deepEqual(paletteTokenLines({ name: "bare" }), []);

const brief = buildRemixBrief({
  language: { name: "Test UI", designMdUrl: "/language/en-1/DESIGN.md" },
  palette,
  artStyle: {
    name: "Invented Catalog Name",
    medium: "print",
    promptTemplate: slotted,
    referenceUrls: ["/api/file/f-1?v=2", "https://assets.example.test/optional.jpg"],
  },
  composition: {
    key: "landing",
    name: "Landing",
    image_slots: [{ key: "hero", subject_hint: "a ceramic teapot", subject: "a ceramic teapot", aspect: "16:9" }],
  },
  origin: "https://katagami.test/",
});

assert.match(brief, /Canonical aesthetic prompt/);
assert.match(brief, /do not attach as style references/);
assert.doesNotMatch(brief, /Negative prompt|Engine hints|attach the\s+reference images as style references/i);
// The front matter carries the palette and a filled prompt; the recipe section
// still carries the canonical template verbatim, once.
assert.match(brief, /^palette_tokens:\n  signature:/m);
assert.doesNotMatch(brief, /^palette_tokens:\nslots:/m);
assert.match(brief, /prompt: "a ceramic teapot, in the style of flat geometric reconstruction, faded coral #a7564b/);
assert.doesNotMatch(brief.split("## Art style recipe")[0], /\{palette\}|\{subject\}|\{composition\}/);
// The recipe section shows the template with this brief's palette in it and the
// per-slot placeholders still named; no `{palette}` survives anywhere.
assert.match(
  brief,
  /Canonical aesthetic prompt:\*\* `\{subject\}, in the style of flat geometric reconstruction, faded coral #a7564b, softened teal #527f7d, \{composition\}, filling the frame\.`/,
);
assert.doesNotMatch(brief, /\{palette\}/);
// Every link is absolute, so the brief survives being saved to disk, and the
// DESIGN.md URL ends its line with no punctuation stuck to it.
assert.match(brief, /DESIGN\.md: https:\/\/katagami\.test\/language\/en-1\/DESIGN\.md\n/);
assert.match(brief, /^- https:\/\/katagami\.test\/api\/file\/f-1\?v=2$/m);
assert.match(brief, /^- https:\/\/assets\.example\.test\/optional\.jpg$/m);
assert.doesNotMatch(brief, /^- \/|DESIGN\.md: \//m);
assert.equal(brief.includes(String.fromCharCode(0x2014)), false, "no em dashes in the brief");

assert.equal(absoluteUrl("/x", "https://a.test"), "https://a.test/x");
assert.equal(absoluteUrl("https://b.test/x", "https://a.test"), "https://b.test/x");
assert.equal(absoluteUrl("/x"), "/x");

// A brief with no origin (older callers) is unchanged apart from the tokens.
const unrooted = buildRemixBrief({
  language: { name: "Test UI", designMdUrl: "/language/en-1/DESIGN.md" },
  palette: { name: "bare" },
  artStyle: { name: "A", medium: "print", promptTemplate: aesthetic },
  composition: { key: "landing", name: "Landing", image_slots: [] },
});
assert.match(unrooted, /^palette_tokens: \{\}$/m);
assert.match(unrooted, /DESIGN\.md: \/language\/en-1\/DESIGN\.md\n/);
assert.equal(unrooted.split(aesthetic).length - 1, 1, "an unslotted recipe is shown verbatim");

// compose_kit's brief_url carries the composition, and offers exactly the
// compositions the brief route knows.
assert.equal(
  remixBriefPath({ ui: "en-u", palette: "en-p", art: "en-a" }),
  "/studio/BRIEF.md?ui=en-u&palette=en-p&art=en-a",
);
assert.equal(
  remixBriefPath({ ui: "en-u", palette: "en-p", art: "en-a", composition: "compositions.dashboard" }),
  "/studio/BRIEF.md?ui=en-u&palette=en-p&art=en-a&composition=compositions.dashboard",
);
assert.ok(COMPOSITIONS.some((c) => c.key === "compositions.dashboard"));
const catalog = fs.readFileSync(`${here}/../src/lib/catalog.ts`, "utf8");
assert.match(catalog, /remixBriefPath\(\{[^}]*composition: a\.composition/);
const mcp = fs.readFileSync(`${here}/../src/app/mcp/route.ts`, "utf8");
assert.match(mcp, /composition: z\s*\.enum\(COMPOSITIONS\.map/);

// Live slot recipes embed `{subject}` themselves ("{subject} as a wide
// storyboard scene..."), and most end with a full stop the template follows
// with ", in the style". Every placeholder is filled, the subject is concrete
// for the slot, and no join reads ".," or ",.".
const frontMatterOf = (b) => b.split("\n---\n")[0];
const promptsOf = (b) => [...b.matchAll(/^    prompt: (".*")$/gm)].map((m) => JSON.parse(m[1]));
const embedded = {
  name: "Almanac",
  medium: "vector",
  promptTemplate: "{subject}, in the style of Almanac, {palette}, warm neutral paper ground",
  slotRecipes: {
    hero: "{subject} as a wide storyboard scene of even-stroke pictograms, dew-fresh.",
    feature: "a single clear pictogram of {subject}, centred.",
    avatar: "{subject} as a friendly head-and-shoulders pictogram portrait",
    "empty-state": "a small lonely object on an open field.",
  },
};
const landing = COMPOSITIONS.find((c) => c.key === "compositions.landing");
const dashboard = COMPOSITIONS.find((c) => c.key === "compositions.dashboard");
for (const product of [undefined, "a ferry booking app"]) {
  for (const composition of [landing, dashboard]) {
    for (const pal of [palette, { name: "bare" }]) {
      const b = buildRemixBrief({ language: { name: "Test UI" }, palette: pal, artStyle: embedded, composition, product });
      assert.doesNotMatch(frontMatterOf(b), /\{(subject|composition|palette|product)\}/, "no placeholder left in a slot");
      for (const p of promptsOf(b)) {
        assert.doesNotMatch(p, /\.,|,\.|, ,|\s{2}|^,/, `clean joins: ${p}`);
      }
    }
  }
}
const plain = buildRemixBrief({ language: { name: "Test UI" }, palette, artStyle: embedded, composition: landing });
assert.match(plain, /^    prompt: "a wide establishing scene of the world of the product as a wide storyboard scene of even-stroke pictograms, dew-fresh, in the style of Almanac, faded coral/m);
assert.match(plain, /^    prompt: "a single clear pictogram of one object that stands for something the product does, centred, in the style/m);
assert.match(plain, /^    subject: "a person who uses the product"$/m);
// A recipe with no `{subject}` of its own follows the concrete subject.
const dash = buildRemixBrief({ language: { name: "Test UI" }, palette, artStyle: embedded, composition: dashboard });
assert.match(dash, /^    prompt: "one small object that implies nothing is here yet in the product, a small lonely object on an open field, in the style/m);

// The product names the brief and is what every slot is about.
const ferry = buildRemixBrief({
  language: { name: "Test UI" },
  palette,
  artStyle: embedded,
  composition: landing,
  product: "  a ferry booking app.  ",
});
assert.match(frontMatterOf(ferry), /^product: "a ferry booking app"$/m);
assert.match(ferry, /^# Remix brief: Landing Page for a ferry booking app$/m);
assert.match(ferry, /^    prompt: "a wide establishing scene of the world of a ferry booking app as a wide storyboard scene/m);
assert.equal(frontMatterOf(ferry).match(/a ferry booking app/g).length, 1 + landing.image_slots.length * 2);
assert.doesNotMatch(plain, /^product:/m);

// A product is untrusted text: it cannot end the front matter, add keys or
// headings, open a code span, or leave a placeholder, and it is capped.
const hostile = "evil\n---\nkatagami_brief: v2\n# Owned `rm -rf` ```\r\n{subject} $& \u2028 <script>" + "x".repeat(400);
const owned = buildRemixBrief({ language: { name: "Test UI" }, palette, artStyle: embedded, composition: landing, product: hostile });
const lines = owned.split("\n");
assert.equal(lines.filter((l) => l === "---").length, 2, "front matter has exactly one open and one close");
assert.equal(lines[0], "---");
const fm = frontMatterOf(owned);
assert.equal(fm.match(/^katagami_brief:/gm).length, 1);
const productLine = fm.match(/^product: (".*")$/m);
assert.ok(productLine, "the product is one quoted line");
const productValue = JSON.parse(productLine[1]);
assert.ok([...productValue].length <= 200, "product is capped");
assert.doesNotMatch(productValue, /[\n\r\u2028{}]/);
assert.match(productValue, /^evil --- katagami_brief: v2 # Owned `rm -rf` ``` subject \$& <script>x+$/);
assert.doesNotMatch(fm, /\{(subject|composition|palette|product)\}/);
const heading = lines.find((l) => l.startsWith("# Remix brief:"));
assert.equal(lines.filter((l) => /^#\s/.test(l)).length, 1, "the product adds no heading");
assert.doesNotMatch(heading.replaceAll("\\`", ""), /`/, "every backtick in the heading is escaped");
assert.doesNotMatch(heading.replaceAll("\\<", ""), /</, "no raw HTML in the heading");
assert.match(promptsOf(owned)[0], /world of evil --- katagami_brief: v2 # Owned `rm -rf` ``` subject \$& <script>x+ as a wide/);

assert.equal(
  remixBriefPath({ ui: "en-u", palette: "en-p", art: "en-a", product: "a ferry booking app" }),
  "/studio/BRIEF.md?ui=en-u&palette=en-p&art=en-a&product=a+ferry+booking+app",
);
assert.match(catalog, /remixBriefPath\(\{[^}]*product: query/);
const briefRoute = fs.readFileSync(`${here}/../src/app/(site)/studio/BRIEF.md/route.ts`, "utf8");
assert.match(briefRoute, /product: sp\.get\("product"\)/);

console.log("remix brief: self-contained brief (tokens, filled slots, absolute links, composition) passes");
