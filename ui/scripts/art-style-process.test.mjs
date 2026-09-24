import assert from "node:assert/strict";
import test from "node:test";
import { artStyleRecipe, parseArtStyleProcessList } from "../src/lib/art-style-process.ts";

test("process lists accept native JSON arrays, trim values and remove empty duplicates", () => {
  assert.deepEqual(parseArtStyleProcessList('[" ink ", "paper", "ink", "  "]'), ["ink", "paper"]);
  assert.deepEqual(parseArtStyleProcessList([" drypoint ", "drypoint"]), ["drypoint"]);
});

test("missing and malformed process metadata cannot become visible claims", () => {
  for (const raw of [undefined, null, "", "ink", '"ink"', "{}", "null", "[", 42, {},
    '["ink", 42]', ["ink", null], [["paper"]]]) {
    assert.deepEqual(parseArtStyleProcessList(raw), [], `unexpected list for ${JSON.stringify(raw)}`);
  }
});

const recipe = { name: "Example", medium: "print", promptTemplate: "Render the subject in flat ink." };

test("copy recipe includes process metadata as intended appearance and preserves the prompt", () => {
  assert.equal(artStyleRecipe({ ...recipe, materials: ["ink", "paper"], techniques: ["screenprinting"] }),
    "Example — Katagami art-style recipe (print)\n\n" +
    "PROMPT TEMPLATE\nRender the subject in flat ink.\n\n" +
    "Materials and techniques describe the intended appearance.\n\n" +
    "MATERIALS\nink, paper\n\nTECHNIQUES\nscreenprinting\n\n" +
    "Apply the prompt to the subject in your image or generation request.");
});

test("legacy recipe output remains unchanged when process fields are absent", () => {
  assert.equal(artStyleRecipe({ ...recipe, materials: [], techniques: [] }),
    "Example — Katagami art-style recipe (print)\n\n" +
    "PROMPT TEMPLATE\nRender the subject in flat ink.\n\n" +
    "Apply the prompt to the subject in your image or generation request.");
});

test("a single populated process field does not emit an empty heading", () => {
  const materialsOnly = artStyleRecipe({ ...recipe, materials: ["ink"], techniques: [] });
  assert.match(materialsOnly, /MATERIALS\nink/);
  assert.doesNotMatch(materialsOnly, /TECHNIQUES/);
  const techniquesOnly = artStyleRecipe({ ...recipe, materials: [], techniques: ["stencilling"] });
  assert.match(techniquesOnly, /TECHNIQUES\nstencilling/);
  assert.doesNotMatch(techniquesOnly, /MATERIALS/);
});
