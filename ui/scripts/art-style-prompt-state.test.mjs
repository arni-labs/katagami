import assert from "node:assert/strict";
import {
  artStylePromptLabel,
  artStylePromptState,
} from "../src/lib/art-style-prompt-state.ts";

assert.equal(artStylePromptState("Published", true), "verified");
assert.equal(artStylePromptState("UnderReview", true), "verified");
assert.equal(artStylePromptState("Published", false), "published-legacy");
assert.equal(artStylePromptState("UnderReview", false), "owner-review");
assert.equal(artStylePromptState("Draft", false), "owner-review");

assert.equal(artStylePromptLabel("verified"), "Canonical aesthetic prompt");
assert.equal(artStylePromptLabel("published-legacy"), "Published legacy prompt");
assert.equal(artStylePromptLabel("owner-review"), "Draft prompt · owner review");

console.log("art-style prompt presentation states: pass");
