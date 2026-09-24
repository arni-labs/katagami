# Art-style contribution data contract

The [Stack contributor skill](https://github.com/arni-labs/stack/blob/main/skills/katagami-contributor/SKILL.md) owns the single contribution procedure. This document describes Katagami payloads; it is not another skill or contribution endpoint. Discover the installed `ArtStyle`, `File` and verification-job contracts through native `temper_platform.execute`. Use the authenticated contributor actions. `SubmitArtStyle` records the complete draft and its declared engine trigger starts verification. The finalizer alone attests quality and publishes. A queued job is not publication.

This version requires gallery manifest **3**, proof manifest **4**, generation records **2**, and portability report **2**. Existing published styles and historical evidence remain readable; a replacement submission must satisfy this contract. Old image-edit evidence cannot be relabelled prompt-only.

## Image invocation record

Every gallery and proof item includes a `model` object with exactly `provider` and `model`. `model` is the actual exposed image model ID, or JSON null for an unexposed built-in version. It is never the chat model or merely the requested model.

Every `generation_record` contains exactly these fields:

```json
{
  "schema_version": "2",
  "kind": "art_style_gallery",
  "style_slug": "the-actual-slug",
  "mode": "text_to_image",
  "input_image_file_ids": [],
  "prompt": "CANONICAL PROMPT\n\nSubject and scene:\nSUBJECT DESCRIPTION",
  "canonical_prompt_sha256": "SHA256_OF_CANONICAL_PROMPT_UTF8",
  "execution": {
    "route": "builtin",
    "harness": "codex",
    "tool": "ACTUAL_INVOKED_TOOL",
    "receipt": "ACTUAL_INVOCATION_OR_ARTIFACT_RECEIPT",
    "requested_model": "GPT Image 2.5",
    "provider_request_id": null
  },
  "output": {
    "file_id": "ACTUAL_LOCKED_FILE_ID",
    "sha256": "SHA256_OF_ACTUAL_OUTPUT_BYTES",
    "prompt_sha256": "SHA256_OF_FULL_PROMPT_UTF8"
  }
}
```

The uppercase values above describe required data; they are not valid evidence. Hashes are lowercase 64-character SHA-256 digests. Keep the canonical prompt byte-for-byte identical; append only `\n\nSubject and scene:\n` and the subject description. Include desired composition in that description. No input image, source-image record, prior model output, style-reference image, hidden edit mode or model-specific aesthetic rewrite is allowed.

`execution` has exactly the six keys shown. All text fields are nonempty. A `builtin` route accepts Codex/OpenAI or Grok/xAI, with a real tool receipt and nullable model/request ID. Claude invoking an authenticated, actually image-capable Codex CLI records the executed `codex` harness and real CLI receipt. A `provider` route requires the exact model ID and real provider request ID as well as the receipt. Fal is one possible provider tool, not a required provenance format. Never invent missing metadata.

## Required gallery

Publication requires a genuine prompt-only comparison on at least two distinct image models. The proof minimum is **one subject rendered by two models**. Publication also requires five gallery images: four OpenAI outputs using Codex’s built-in image tool when available and one xAI output using Grok’s image tool when available. The matched proof pair may also be gallery images, so five unique images can satisfy both requirements. Future gallery replacements use supported revisions and retain the five-image allocation.

For this session, use Codex built-in image generation and the authenticated Grok CLI's built-in Imagine generation. Do not generate Nano Banana or other provider examples merely to fill old slots. Model identity still records actual exposed facts; neither CLI's chat-model version is the image-model version.

`reference_image_file_ids` contains five distinct Locked Files. `reference_manifest` is `{ "schema_version": "3", "items": [...] }` with four OpenAI images and one xAI image. Each item has exactly `file_id`, `subject`, `model`, and `generation_record`; its kind is `art_style_gallery`. All items match the ordered reference IDs, with distinct bytes verified by the finalizer. Put the strongest image first and use that File as the thumbnail. Preserve actual exposed model IDs; supported built-in records retain null when the tool does not expose its version. Never infer an image version from the request or chat model. Nano Banana is not a gallery slot.

## Compact prompt-only portability proof

Use at least one fresh subject description rendered independently by at least two distinct image-model identities. One matched pair is sufficient; additional models and subjects are optional. The same canonical prompt and same selected subject/composition pairs must appear on every tested model. Choose categories from `human_portrait`, `nonhuman_living`, `still_life_object`, and `landscape_environment`. Vary categories when useful; do not require extra subjects merely to fill categories. Do not expand this automatically into an eight-image matrix or reuse recurring catalog test subjects.

`proof_shots_manifest` is `{ "schema_version": "4", "items": [...] }`. Each item contains exactly:

- `file_id`, `category`, `subject`, `composition` (nonempty strings).
- `mode`: `text_to_image`; `style_reference_used`: false.
- `model`: `{ "provider": "actual provider", "model": "actual ID or null" }`.
- `generation_record`: the record above, with kind `art_style_proof`.

`proof_shots_file_ids` matches all manifest outputs. Every output must be Locked; the finalizer streams and hashes its actual bytes. There are no source Files. Provider/model identity comparisons normalize case and surrounding whitespace. An unknown version cannot establish a second model from the same provider, even if the other invocation exposes an ID.

`portability_report` contains `schema_version: "2"`, `verdict: "pass"`, the exact canonical `prompt`, `blind_evaluation: true`, an actual `evaluator` provider/model, and at least two `models`. Each model contains `provider`, nullable `model`, and the same nonempty set of `cases` matching the manifest. A case contains exactly `file_id`, `category`, `subject`, `composition`, `mode`, `prompt` (canonical only), `style_reference_used: false`, `subject_followed: true`, `style_applied: true`, `generation_record`, and `scores`.

Score eight dimensions from 0 to 2: `medium_material`, `marks_edges`, `depiction_grammar`, `tonal_shading`, `color_roles`, `composition`, `signature_details`, and `exclusions`. Every dimension must score at least 1; medium/material and depiction grammar must score 2. Each case and each model must average at least 1.5. The blind evaluator must actually inspect the outputs and differ from the tested image models. Do not write passing review claims without performing the review.

## Other required evidence and finalization

A design language may be published only with a Published paired ArtStyle. Its
`imagery_direction.pairs_with` slug and `default_art_style_id` must agree. Use an
existing Published style, or complete the new style's honest contribution and
finalization in the same flow before submitting the language. Unpublished, missing
or ambiguous pairs must not be treated as reviewed imagery recipes.

The style definition includes name, slug, medium, materials, techniques, the portable prompt, subject slot recipes, usage guidance, lineage/direction where applicable, actual model provenance, credits and tags. Keep traditions broad and honestly attributed; do not target a living artist by name or disguised description.

`materials` and `techniques` are first-class entity properties encoded as JSON arrays of nonempty strings. Materials name the recipe's media, tools and supports (for example, alcohol markers and smooth paper); techniques name its methods (layering, stippling). Extract them from the recipe or retained source evidence. Never infer a brand from a generic appearance or claim an AI-generated image was physically made with those supplies. Use `[]` where the recipe does not specify either category, including legacy entries awaiting description. Include both fields in new `SubmitArtStyle` payloads. Existing entities can use `SetMaterialsAndTechniques` without regenerating images or changing their recipe, publication state or quality evidence. A change to the actual aesthetic recipe still requires the supported revision and review flow.

`source_basis` and independent `prompt_review` remain schema version 1. The source/rights report names actual checked sources and evidence URLs. The prompt review binds the exact prompt, real independent reviewer identity, reference/subject/source-medium/model/style-name independence, contradictions, revision count and substantive `observable_dimensions` for the eight dimensions. `source_medium_independent` describes the prompt's independence; it does not require source images. Existing finalizer checks for these reports remain authoritative.

Record `revision_count` as the actual nonnegative integer number of prompt revisions. Iteration count is history, not a quality threshold: the final prompt still needs a passing independent review with no unresolved contradictions and passing portability evidence.

After submission, read the recorded verification job, its concrete failures, the resulting style state and public asset fields. Only the engine/finalizer may call the quality/publication callbacks. Verify the actual published page and images before reporting completion. Missing provenance, unavailable models or denied operations remain explicit limitations; do not weaken validation or replace evidence to make a job pass.

### Retry infrastructure failures without resubmitting

After repairing an infrastructure failure, invoke `ArtStyle.RetryVerification` on the Draft artifact. It accepts no content parameters and requires its engine-recorded `verification_job_id` to identify a Failed job. The engine reuses that job through internal `RetryArtStyleVerification`; it does not spawn an authoring session or create another submission. Atomic comparisons require the existing job to match the source artifact ID, `synthesize_art_style` job type, and `typed-v1` completion contract before changing its status. The failed event and submitted fields remain in place. Duplicate dispatches cannot re-enter finalization while the job is Finalizing. All existing finalizer checks and publication authority remain required. A successful artifact action is a queued request, not proof that verification or publication succeeded; read the linked job afterward.
### Historical attribution without a copying-rights claim

A deceased artist may remain honestly credited for historical context without claiming that their work is public domain or licensed. Use one `source_basis.sources` entry per credited person with `kind: "historical_attribution"`, the exact credited `name`, `living: false`, an integer `death_year` from 1 through 9999, a primary `evidence_url`, and substantive `historical_context`. Retain supplementary biography and rights URLs as `citations` or in the report's limitations; duplicate normalized names involving historical attribution are rejected, including mixed-kind duplicates.

The independent source reviewer must explicitly return `attribution_only: true`, `no_individual_style_target: true`, and `no_copied_work: true` for that entry. The containing schema-v1 source report must bind `prompt` to the exact canonical prompt and satisfy the existing independent-reviewer, named-person, no-living-target and tradition-level checks. Preserve the artist's `kind: "artist"` credit. Do not convert a person into a movement or original synthesis to obtain eligibility.

This basis records attribution to historical context. It grants no reproduction license and establishes no public-domain status. It cannot support targeting the individual's particular style, reproducing their work, a living artist, an unchecked person, or a review of a different prompt. Artist names remain excluded from the generation prompt. Actual independent review and evidence are required; contributors must not manufacture the booleans. Only the finalizer can attach validated review attestations and publish, after all other prompt, gallery, byte-integrity and portability checks pass.
