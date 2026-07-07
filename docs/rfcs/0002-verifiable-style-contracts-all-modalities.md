# RFC-0002: Verifiable style contracts across modalities

- Status: Draft
- Date: 2026-07-03
- Author: Claude Code (for Rita)
- Repos in scope: `katagami-commons` (specs), `katagami-curation` (specs + skills + wasm), `ui` (voice pages), later `temper` (only if a conformance-gate primitive is missing)
- Related Linear: ARN-133 (umbrella), ARN-132/137/138/139/140/141 (voice lane), ARN-134 (design firewall), ARN-135 (art styles), ARN-136 (shared substrate), ARN-121 (writing modality — proposed fold into ARN-132)
- Related: RFC-0001 (Temper-native curation reliability), Aya wikis `design-ai-verification`, `design-ai-writing-style-verification`, `design-ai-voice-md-direction`

## 1. Summary

Katagami's edge is that a style — visual, image, or textual — is a **verifiable, consent-clean contract**, not soft guidance. Agents drift: hand one a beautiful DESIGN.md or VOICE.md and it approximates from training data unless something checks it. Guidance is where everyone is; the checker is where almost no one is.

This RFC turns that thesis into a build plan across three lanes plus a shared substrate, and adds the third modality — **writing styles** — to the commons. It also fixes a gap the thesis exposes in our own house: today the pipeline deeply verifies design languages before publish, but art styles and palettes are published on a rubber stamp. A commons that sells verification must verify its own shelves first.

Two deliverables are specified in full here: the **VOICE.md contract schema** (the prose sibling of DESIGN.md) and the **WritingStyle entity** that carries it through the same Draft → UnderReview → Published lifecycle as every other modality.

## 2. What we are addressing, and the expected end state

We are addressing three things:

1. **Writing styles don't exist.** The commons has design languages, art styles, and palettes; there is no prose modality — no spec, no curation lane, no UI route (`research-direction` accepts only `design_language | palette | art_style`).
2. **Verification is uneven inside our own pipeline.** DesignLanguages pass a dedicated quality-review job plus a finalizer that reads file bodies and validates artifact structure. ArtStyles and PaletteSystems are published by `walk_lane_entity_to_published` (`katagami-curation/wasm/finalize_spawned_session/src/lib.rs:1690`), which checks a few fields are non-empty, then blindly dispatches `MarkQualityPassed` + `Publish`. The ~154 published art styles (ARN-135) went through that stamp.
3. **No modality is verifiable by its consumers.** A published style is guidance. Nothing lets an agent (or a human) check "does this output conform to this style?" — the firewall rung of the ladder is empty for all three lanes.

Expected end state:

1. Every modality — design language, art style, palette, writing style — publishes only through **real artifact verification**: file bodies read, structure validated, style-specific invariants checked. No lane rubber-stamps `MarkQualityPassed`.
2. **WritingStyle is a first-class modality**: an IOA spec in `katagami-commons`, a curation lane in `katagami-curation`, a `/voice/<id>` page, and a portable `VOICE.md` projection — produced by the same pipeline and quality gates as everything else, never hand-built.
3. A published writing style is a **compiled contract**: its mechanical bands are machine-checked at publish time against its own exemplars (a contract that its own corpus can't pass does not publish).
4. Each lane has a **conformance checker** consumers can run against their own output: deterministic mechanics hard-gate, embedding similarity reports a soft score with confidence and an explicit abstain, and taste stays human.
5. Consent, provenance, license, lineage, and naming are **one shared substrate** across modalities, not three parallel implementations.

## 3. Where verification stands today (grounded in code)

"Verification" means two different things in this effort, and they must not be conflated:

- **Publish-time verification** — is this artifact real, complete, and quality-reviewed before it enters the commons? This exists, unevenly.
- **Consumption-time verification (conformance)** — does an agent's *output* conform to a published style? This exists nowhere; it is the new thesis.

Publish-time reality per modality:

| Modality | Quality-review job | Finalizer checks | Honest description |
|---|---|---|---|
| DesignLanguage | Yes — per-direction `quality_review` (Playwright at 3 viewports, taste rules, DESIGN.md lint) | Reads file bodies; validates DESIGN.md front matter/sections, shadcn registry theme, component recipes, preview-shot schema; rejects text-as-thumbnail | Deep |
| ArtStyle | None | `prompt_template`, `thumbnail_file_id`, `reference_image_file_ids` non-empty (`lib.rs:1646-1688`); then blind `MarkQualityPassed` + `Publish` | Rubber stamp |
| PaletteSystem | None | `tokens_export_file_id`, `thumbnail_file_id` non-empty (`lib.rs:1604-1644`); then blind stamp | Rubber stamp |
| WritingStyle | — | — | Doesn't exist |

What the guards *do* guarantee: RFC-0001 moved file readiness into `cross_entity_state` guards, so a `Ready` file provably has bytes. What nothing guarantees for art styles: that the reference images are decodable images at all, that the prompt template still carries its `{subject}` and `{palette}` holes, that slot recipes parse, that proof shots match their manifest, or that credits exist (`has_credits` and `has_model_provenance` are not in the `Publish` guard — `katagami-commons/specs/art_style.ioa.toml:268-274`).

The design-language lane is the template: agent authors artifacts → finalizer independently reads and validates them → verifier-owned booleans flip only on evidence → `Publish` guards demand the booleans. The fix for the other lanes is the same shape, not a new idea.

## 4. The thesis: the four-rung ladder and the enforcement split

From the verification research (Aya: `design-ai-verification`):

1. **Guidance** — prose the model reads and mostly follows. DESIGN.md today. Everyone is here.
2. **Style-as-data** — typed, machine-readable form (DTCG tokens for design; stylometric bands for prose).
3. **Machine-checkable constraints** — a linter that fails with a non-zero exit code (Terrazzo for tokens, Vale for prose prove this layer works today).
4. **Governed enforcement** — a blocking gate an agent cannot pass without conforming, tied to human-set policy. Empty across the industry for *styles*; this is Katagami × Temper.

The enforcement split, which recurs in every lane and **is** the thesis, not a caveat to it: machine-enforce the mechanics and the consent boundary; report similarity as a soft, abstaining signal; keep a human as the taste oracle for what can't be reduced to a rule. A firewall kills mechanical slop (drift, hardcoded values, banned phrases, failed contrast); it does not certify *good*.

## 5. The VOICE.md contract (ARN-137 — specified here)

A Katagami VOICE.md is not a fifth soft-prompt template. It is the soft layer everyone ships (Hassid, Lago, Castos, EVY all ship voice.md-shaped prompts today) **plus the three things nobody ships**: deterministic mechanical bands, a soft similarity check with confidence and abstain, and consent/provenance/license binding.

Format: markdown with YAML front matter, published at `https://katagami.ai/voice/<id>/VOICE.md` — the prose sibling of `/language/<id>/DESIGN.md`. Katagami entity fields remain the source of truth; VOICE.md is the required portable projection, linted before attach exactly like DESIGN.md.

### 5.0 The two-level shape (amended 2026-07-06)

Writing styles come in two levels, and the level is structure (lineage), never
an asserted label:

**Level 0 — author voices.** One corpus, one voice. A public-domain author's
works are a contributed voice whose contributor is openly named and long dead:
same entity, same extraction, same adherence checks as a living contributor's
opt-in voice — only the consent block differs. Author voices are named for
what they are ("Samuel Pepys — diary (1660s)"), never given invented brands.
They double as the calibration set for adherence verification: held-out
passages from the same author must score high against their voice and low
against others, giving the similarity layer (ARN-140) labeled ground truth
before any living person contributes.

**Level 1 — blends and registers.** A blend is a voice with parents:
`parent_ids` names the author voices it mixes, `generation_number` >= 1,
`lineage_type` "blend". It carries its own merged corpus and its own derived
bands, and the checker's function-word/char-trigram self-consistency enforces
that the mixture coheres. Original registers with no single source (authored
in-register, opt-in personal voices) sit at the same level with empty or
chosen parents. Blends and registers may carry names — plain register names
preferred.

Display rules: composition is derived from credits and lineage and stated up
front; agent-authored subjective numbers (tone dials) are never posted —
numeric dials return only when extraction can derive them from the corpus.

### 5.0.1 The soft similarity layer — bake-off result (amended 2026-07-06)

The similarity scorer was chosen empirically, not by reputation. Calibrated on
the 17 production voices (leave-one-out corpus chunks as positives, cross-voice
chunks as negatives, 17-way replica retrieval):

| method | mean AUC | replica retrieval |
|---|---|---|
| Burrows's Delta, 500 MFW, z-cosine | **0.960** | 8/17 |
| Delta 300 MFW + char-3gram hybrid | 0.955 | 7/17 |
| StyleDistance (neural) | 0.813 | 5/17 |
| Wegmann Style-Embedding (neural) | 0.789 | 3/17 |

The neural models underperformed **as measuring instruments on this specific
catalog** of period literary registers, far from their contemporary
conversational training domains (the domain-shift caveat from the original
research, confirmed on our own data). This is a claim about verifiers, not
about LLM style *emulation*, which the same study measured as strong — see
docs/research/0001-writing-styles-verification-study.md (format beta: 15/17
one-shot replication; 10/14 replicas inside the author's own held-out range
under the validated scorer). Neural instruments are expected to recover on
contemporary and personal voices. Production therefore runs
**per-voice Delta** inside the finalizer WASM — deterministic, no weights, no
service — as a REPORT-ONLY signal with per-voice thresholds derived from the
corpus's own leave-one-out range, and abstention under 120 words. Retrieval
misses concentrate in same-register families (blends vs their own parents),
which is expected and correct. Neural embeddings remain the planned upgrade
for contemporary and personal voices, where their training domain matches;
the calibration harness re-runs in minutes when that catalog exists.

VOICE.md format is **beta** as of the same date: a full corpus excerpt ("How
it reads"), bands translated to writer-facing rhythm instructions, a derived
linguistic profile, and the verified known-good replica join the contract —
because measured one-shot replication (9/17 under format alpha) showed the
description-only file under-taught rhythm.

### 5.1 Front matter (identity + consent binding)

```yaml
---
version: "alpha"
kind: voice
name: <real, ownable name — Katagami naming rules apply>
id: <entity id>
url: https://katagami.ai/voice/<id>
lineage:
  parents: []            # or single parent (evolution) / multiple (remix)
  generation: 1
corpus:
  consent: opt_in        # basis: opt_in | public_domain | original (refined 2026-07-04);
                         # personal/brand voices REQUIRE opt_in; encyclopedia registers may
                         # use verified public-domain corpora (provenance names the works)
                         # or pipeline-original in-register prose. No valid basis, no publish.
  author: <who this voice belongs to / derives from>
  license: <license governing reuse>
  samples: <count>       # provenance: how many source texts, of what kind
  provenance: <where the corpus came from, attested>
cross_modal:
  design_language: <id or null>   # the sibling visual identity
  art_style: <id or null>
---
```

The consent block is the sharpest differentiator and the reason prose lands on firmer ground than "in the style of" visual mimicry: a voice is simultaneously a product feature and a sensitive fingerprint (the same stylometry that verifies a voice de-anonymizes). Opt-in, licensed, attributable — enforced at publish, not stated on a policy page.

### 5.2 Soft voice layer (human-legible, editable)

Required sections, mirroring what the wild already converged on, with two Katagami-specific disciplines: tone as **numbered scales with anchors**, and refusals carrying most of the weight ("80% of the file is what I'm NOT"):

- `## Overview` — who this voice is, in plain language.
- `## Tone` — numbered scales, not adjectives: `formality: 3/10`, `directness: 9/10`, each with a one-line anchor showing what that number sounds like.
- `## Vocabulary` — use-list and ban-list. The ban-list includes the anti-AI-tells layer (banned stock phrases and constructions).
- `## Moves` — rhetorical moves and signature tics: how this voice opens, argues, qualifies, closes.
- `## Register` — tone-by-channel matrix (internal chat vs. external email vs. public post).
- `## Never` — the refusals, stated flat.

### 5.3 Mechanical bands (deterministic — the checkable core)

A fenced JSON block the checker parses and enforces. Everything here is pure computation — regex, counting, distribution distance — no model judgment:

```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": { "mean": [9, 16], "stdev_min": 6.0 },
  "banned_phrases": ["delve", "leverage", "seamless", "game-changer"],
  "banned_patterns": ["\\bnot just\\b[^.]*\\bbut\\b"],
  "punctuation": { "em_dash_per_1000_words": [0, 2], "exclamations_per_1000_words": [0, 3] },
  "type_token_ratio": { "min": 0.40, "window_words": 500 },
  "function_words": { "reference_file_id": "<file id>", "metric": "jensen_shannon", "max_distance": 0.18 },
  "min_words_to_evaluate": 150
}
```

`sentence_length` is the burstiness band (mean range + a variance floor — uniform sentence length is itself an AI tell). `function_words` compares a draft's function-word distribution against the consented reference corpus — the strongest content-independent authorship signal. `min_words_to_evaluate` encodes the short-text ceiling: below it, the checker abstains rather than guesses.

Band values are **derived from the corpus by the extraction step (ARN-139), then verified for self-consistency at publish**: every exemplar in the style's own corpus must pass its own bands. A contract its own author can't satisfy is miscalibrated and does not publish. This is the writing-lane analog of proof shots, and it's the publish gate that makes a writing style *verified* rather than described.

### 5.4 Similarity (soft, never a hard gate)

```json
{
  "schema": "katagami:voice-similarity/v1",
  "embedding_model": "styledistance",
  "reference_file_id": "<file id>",
  "report": ["cosine", "confidence", "per_attribute_deltas"],
  "abstain_below_words": 150,
  "hard_gate": false
}
```

Honesty guarantees built in, from the research ceilings: style and content are entangled (attribution accuracy is necessary, not sufficient — TACL 2023); content-controlled scores are much lower than plain ones (StyleDistance ~0.87 plain STEL vs ~0.29 STEL-or-Content); short texts lack signal. So this layer reports a number with a confidence, names *which* attribute drifted (LISA-style deltas), and abstains rather than guessing — the PAN `c@1` discipline. It never blocks anything by itself.

### 5.5 Annotated examples (the ground truth)

3–15 annotated passages, and specifically the **drafted-vs-sent delta** where available ("the gap is the voice"). These double as the calibration corpus the similarity check scores against, and they are what keeps the voice living — refreshed from wins and misses, versioned through lineage like every other Katagami entity.

### 5.6 Lint contract

Like DESIGN.md, VOICE.md gets a no-network contract checker run before attach: front matter keys present, `corpus.consent == opt_in`, all required sections present, bands block parses against `katagami:voice-bands/v1`, at least 3 annotated examples, no placeholder text. Zero errors, zero warnings, warnings blocking.

## 6. The WritingStyle entity and curation lane

### 6.1 Entity (`katagami-commons/specs/writing_style.ioa.toml`)

Same lifecycle as ArtStyle: `Draft → UnderReview → Published → Archived`, with Revise/Restore. State variables mirror the pattern with lane-specific substance:

- `has_corpus` — consented reference corpus attached (file ids + manifest)
- `consent_attested` — **hard publish guard, new to this lane**; set only by an internal action after the finalizer validates the consent block (opt-in + license + author present)
- `has_voice_layer` — tone scales, vocabulary, moves, register, refusals set
- `has_mechanical_bands` — bands JSON attached
- `has_exemplars` — annotated examples attached
- `bands_self_consistent` — verifier-owned; set by the finalizer only after every exemplar passes the style's own bands
- `has_voice_md` — linted VOICE.md attached
- `has_thumbnail`, `has_published_assets`, `quality_review_passed`, `featured`, `version`, `fork_count`, `usage_count` — as in sibling specs
- credits + model provenance — as in ArtStyle (`SetCredits`, `SetModelProvenance`), but **in the publish guard** from day one

`Publish` guard: all of the above true, plus `cross_entity_state` Ready/Locked on every referenced file — corpus, exemplars, VOICE.md, thumbnail. Invariants assert the same set in `Published`, preventive not reactive (RFC-0001 discipline).

### 6.2 Curation lane (`katagami-curation`)

- `research-direction`: accept `output_type = "writing_style"`; a direction researches a voice tradition/register the same way it researches a design movement.
- New skill `synthesize-writing-style`: given a direction, author the corpus-derived spec — voice layer, bands (computed, not invented), exemplars, VOICE.md — through governed actions. Same tooling rules as sibling skills.
- Quality review: a per-direction second opinion, like design languages get. The reviewer validates spec coherence, re-runs the bands self-consistency check, reads the VOICE.md projection, and fixes concrete violations before typed completion.
- Finalizer: `verify_synthesized_writing_styles` — **deep from day one** (§7's generic shape): read VOICE.md body, validate front matter + sections + bands schema, run the deterministic bands checker over the exemplars in WASM (pure Rust computation — regex, sentence stats, JS divergence; no sandbox, no network), verify the consent block, then flip verifier-owned booleans and publish through guards.
- Seeds (ARN-141): the first voices go through this exact pipeline. No hand-built stand-ins — the standing rule, and doubly so for the lane whose pitch is verification.

### 6.3 UI

`/voice` gallery + `/voice/<id>` detail page (VOICE.md rendered, bands visible, consent/provenance shown as first-class facts, cross-modal link to the sibling design language), following the existing art-styles page patterns. The gallery card states what "verified" means for this lane, in one sentence.

## 7. Fix the rubber stamp early (art styles + palettes)

Decided scope: this lands **early, before or alongside the voice lane**, because it is a live quality hole and because it builds the exact finalizer muscle the writing lane needs.

Replace the blind `MarkQualityPassed` in `walk_lane_entity_to_published` with per-lane verification, same shape as the design-language path:

**ArtStyle** — before any stamp:
- Read each reference image + proof shot + thumbnail file's metadata and leading bytes: MIME is `image/*`, magic bytes match the declared type, size within sane bounds. (Guards already prove bytes exist; this proves they're images.)
- `prompt_template` contains both `{subject}` and `{palette}` holes.
- `slot_recipes` parses as JSON and covers the required slots.
- Proof-shot manifest entries correspond 1:1 with attached file ids.
- Credits + model provenance present — and added to the `Publish` guard for new styles (existing published styles get a backfill pass, not a mass archive).

**PaletteSystem** — before any stamp:
- Tokens export parses; hex values are real; required roles covered; thumbnail is an actual image (same byte checks).

Whether art styles and palettes also get an agent-driven quality-review job (taste-rule judgment, not just artifact integrity) is sequenced with ARN-135 — the deterministic checks above don't need that decision and shouldn't wait for it.

This is a class fix: one `verify_lane_artifacts` discipline for every current and future lane, so the next modality (writing) never gets a stamp path at all.

## 8. The design-language lane (ARN-134 — the firewall)

Publish-time verification is already deep here; ARN-134 is about the **consumption side**: agent-generated UI checked against a published language. Two complementary strategies — **prevent** off-language code where the consumer adopts our surface, **detect** it everywhere else.

Detection (works on any artifact, any stack):

- Compile a language into rung 2: a DTCG token export (typed `$value`/`$type`, aliases, OKLCH) alongside DESIGN.md.
- Ship rung 3: a rule set + checker over output CSS/markup — WCAG contrast, border-radius ∈ {0, 16, 24, 9999}, token adherence (no hardcoded values off the token set), ≤3 accents, body ≥17px, spacing floors, hero placement, no borders. Terrazzo/Stylelint prove each check type is CI-viable; nobody has pointed them at a *language*.
- Rung 4: a Temper conformance gate — a governed action that takes a candidate artifact, runs the checker, and records a pass/fail the consumer's pipeline can block on. Cedar-policied; humans set what blocks vs. warns.

Prevention (works when the consumer adopts the language's surface at build time):

- A **generated enforcement kit** per language: a typed token surface where only that language's decisions are expressible, plus a per-language ESLint/Stylelint rule package (allowed color tokens = the palette, radius from the language's set, spacing scale only, no raw hex, no off-token values), CI-ready. Polar's Orbit design system validates this approach in production for LLM-written UI: tokens as *decisions not values* (`padding="l"`, not `p-4`), a typed component API instead of an open className surface, raw HTML banned by lint, all enforced in CI — "anything you put in a doc is a probability, not a guarantee" is their conclusion too, arrived at independently ([polar.sh/blog/orbit-llm-safe-design-system](https://polar.sh/blog/orbit-llm-safe-design-system)). Off-language code becomes inexpressible, not just detectable.
- This extends the export family we already generate per language (shadcn registry theme, components.md) with a constraint layer — cheap to derive from the same tokens. Borrow Orbit's `light-dark()` mechanic: embed both modes in one token value so a forgotten dark variant can't exist.
- Honest scope: prevention is per-stack and requires buy-in. An agent emitting plain HTML, or using someone else's components, is untouched by the kit — that's why the checker and the gate stay necessary. And a typed vocabulary closes the *token* surface only; the holistic rules (hero placement, accents in actual use, composition) still belong to the checker and the human.

Honest ceiling, stated in the product: automated a11y catches roughly half of issues by volume and only ~20–30% of WCAG criteria are fully machine-testable; composition and feel stay human. The firewall makes the checkable properties non-negotiable — that's all it claims.

## 9. The art-style lane (ARN-135 — define before building)

Least formed, on purpose. What is honestly checkable for an image style today:

- **Provenance and tradition-crediting** — deterministic and already half-built (`SetCredits`, `SetModelProvenance`); make them required and attested (§7). A style must credit the tradition it descends from; that is the differentiator against the opaque, unattributed sref.
- **Consent-clean origination** — originate-don't-imitate; no living-artist signature. Enforceable as a review-time human gate plus a credits-shape rule (credits reference movements/traditions/studios, not "in the style of <living artist>").
- **Recipe integrity** — §7's deterministic checks.
- **Style-embedding similarity** (do the proof shots actually cohere as one style? does consumer output match?) — a research spike on one style before committing; image style embeddings are less settled than text authorship embeddings, and we should not promise a checker we can't calibrate.

Deliverable for ARN-135: a definition document + a prototype on one published art style, then a decision on how far the lane goes.

## 10. Shared substrate (ARN-136)

Build once, use in all lanes:

- **Verification engine pattern (Temper)** — already proven in this codebase: agent authors → finalizer independently verifies evidence → verifier-owned booleans → guarded publish → preventive invariants. §7 generalizes it; the conformance gate (rungs 4) extends the same pattern to consumer-submitted artifacts.
- **Consent / provenance / license binding** — one schema across modalities (the VOICE.md `corpus` block, the art-style credits + model provenance, the design-language provenance tier shipped in #123 converge on the same fields: source, author, license, consent basis, attested-by). Bound at synthesis, enforced at publish.
- **Cross-modal lineage** — entity-level references voice ↔ design language ↔ art style, so a brand or person is one lineaged identity across prose, pixels, and images. Surfaced on all three detail pages.
- **Naming** — the existing muscle, applied to voices (a named, referenceable voice is the product; a profile dump is not). Existing naming rules apply unchanged, including cultural-match and variety disciplines.

## 11. The conformance checker — where it runs

Two deployment points, deliberately different weights:

1. **Publish gate (in-pipeline)** — deterministic only, in the finalizer WASM. Bands checking, image byte checks, token/lint checks are pure computation; no model calls, no network, no new service. This ships with each lane.
2. **Consumer conformance endpoint** — `verify this draft against voice <id>` / `verify this CSS against language <id>`. Deterministic checks plus the soft similarity layer (which needs an embedding model — a small hosted service or external API; decision deferred to its phase). Exposed as a governed Temper action so invocation is Cedar-policied and consent-checked (you can only verify against a voice you're licensed to invoke).

The soft layer never hard-gates in either deployment. AI-text detectors are explicitly out — they are unreliable stylometry classifiers and nothing in this system depends on them.

## 12. Phasing

Mapped to the Linear tree; each phase independently shippable, dependency order Genesis → Temper → TemperPaw → Katagami where cross-repo work appears:

- **Phase 0 — verify our own shelves** (§7; new issue under ARN-133): deep finalizer verification for art styles + palettes; credits/provenance into the ArtStyle publish guard; backfill pass over published styles. No new entities.
- **Phase 1 — the writing modality** (ARN-137 + entity work from ARN-121): `writing_style.ioa.toml`, VOICE.md lint contract, `synthesize-writing-style`, deterministic bands checker in the finalizer, `/voice` UI, 3–5 seed voices through the pipeline (ARN-141 production half).
- **Phase 2 — voice intake + soft layer** (ARN-138, ARN-139, ARN-140): find-your-style corpus intake with consent binding, extraction + naming flow, embedding similarity with confidence/abstain, consumer conformance endpoint for voices.
- **Phase 3 — design firewall** (ARN-134): DTCG export, language rule-set checker, Temper conformance gate, generated per-language enforcement kit (typed token surface + lint rule package).
- **Phase 4 — art-style verification definition** (ARN-135): definition + one-style prototype, then scope the build.
- **Substrate (ARN-136)** threads through all phases — each phase contributes its piece to the shared schema rather than a parallel one.

Positioning work in ARN-141 (audiences, "reference document, not a clone" framing, engaging the voice.md creators) is deliberately not scheduled here; it follows once seed voices exist.

## 13. Decisions and open questions

Decided (Rita, 2026-07-03):

1. **Entity name: `WritingStyle`** — sibling of `ArtStyle`; the modality is "writing styles", the artifact is VOICE.md, the URL is `/voice/<id>`. (`WritingLanguage`, ARN-121's working name, was the considered alternative.)
2. **ARN-121 folded under ARN-132** as the commons-entity story, so the two framings can't drift.

Still open:

3. **Embedding model + hosting** for the soft layer (StyleDistance vs LUAR; hosted where) — decide in Phase 2, after the deterministic layer is live and calibrated.
4. **Agent-driven quality review for art styles/palettes** (taste judgment beyond artifact integrity) — decide with ARN-135.

## 14. Considerations and deferred ideas

- **Living voices**: refreshing bands and exemplars from the drafted-vs-sent gap over time is the long-term differentiator (a voice that stays current vs. a one-shot export). Deferred past Phase 2; lineage already gives it a home (a refresh is an evolution child).
- **Constrained decoding** as the true "agent-cannot-violate" primitive exists for grammars/JSON but not for style; noted as a far-future direction for the design lane (token-level firewall), not planned work.
- **Cross-modal synthesis** ("give this brand a voice to match its design language") becomes possible once the lineage hook exists; explicitly out of scope until both lanes are real.
- **De-anonymization duty of care**: the same stylometry that verifies also identifies. The consent gate is the mitigation; we do not ship a general "who wrote this" capability, only "does this match the voice its owner consented to publish".
