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
    image_slots: [{ key: "hero", subject_hint: "a ceramic teapot", aspect: "16:9" }],
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

console.log("remix brief: self-contained brief (tokens, filled slots, absolute links, composition) passes");
