import assert from "node:assert/strict";
import { buildRemixBrief, resolveSlotPrompt } from "../src/lib/remix-brief.ts";

const aesthetic =
  "Render the supplied subject as a two-ink relief print. Use broken carved edges. Avoid glossy gradients.";
const roles = { structural: "#14213d", focal: "#e63946" };

const resolved = resolveSlotPrompt(aesthetic, "a ceramic teapot", roles);
assert.match(resolved, /^Subject\/content: a ceramic teapot\./);
assert.match(resolved, /Palette roles: structural #14213d, focal #e63946\./);
assert.equal(resolved.endsWith(aesthetic), true);
assert.equal(resolved.split(aesthetic).length - 1, 1);
assert.doesNotMatch(resolved, /\{subject\}|\{palette\}/);

const brief = buildRemixBrief({
  language: { name: "Test UI" },
  palette: { name: "Test palette", roles },
  artStyle: {
    name: "Invented Catalog Name",
    medium: "print",
    promptTemplate: aesthetic,
    referenceUrls: ["https://example.test/optional.jpg"],
  },
  composition: {
    key: "landing",
    name: "Landing",
    image_slots: [{ key: "hero", subject_hint: "a ceramic teapot", aspect: "16:9" }],
  },
});

assert.match(brief, /Canonical aesthetic prompt/);
assert.match(brief, /do not attach as style references/);
assert.doesNotMatch(brief, /Negative prompt|Engine hints|attach the\s+reference images as style references/i);
assert.equal(brief.split(aesthetic).length - 1, 2); // resolved slot + canonical recipe

console.log("remix brief: one canonical prompt contract passes");
