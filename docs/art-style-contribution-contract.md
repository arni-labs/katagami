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

## Six-image display gallery

`reference_manifest` is `{ "schema_version": "3", "items": [...] }`. Each item has exactly `file_id`, `subject`, `model`, and `generation_record`; the record kind is `art_style_gallery`. The ordered `reference_image_file_ids` list must match all six items, and its first File must equal `thumbnail_file_id`. All six Files must be Locked with distinct IDs and bytes verified by the finalizer.

The standing mix is four requested **GPT Image 2.5**, one **Grok Image**, and one **Nano Banana**, with varied subjects and compositions. The model fields accepted for these slots are:

| Provider | Requested model | Actual exposed IDs, or allowed unknown |
| --- | --- | --- |
| OpenAI | GPT Image 2.5 | `gpt-image-2.5`, `openai/gpt-image-2.5/sunburst/text-to-image`, `openai/gpt-image-2.5/flare/text-to-image`; null only on the built-in route |
| xAI | Grok Image | `grok-imagine-image`, `grok-imagine-image-v2`, `xai/grok-imagine-image/v2.0/text-to-image`; null only on the built-in route |
| Google | Nano Banana | `fal-ai/nano-banana-pro`, `gemini-3-pro-image-preview` |

These are contract identities, not a promise that every harness exposes every model. An unknown built-in version establishes its provider and receipt, not a verified GPT Image 2.5 version. Report an unavailable required model honestly. Gallery outputs are display examples; they are never inputs to another model's portability test.

## Compact prompt-only portability proof

Use one or two fresh subject descriptions rendered independently by two distinct image-model identities: two or four outputs total. The same canonical prompt and same selected subject/composition pairs must appear on both models. Choose categories from `human_portrait`, `nonhuman_living`, `still_life_object`, and `landscape_environment`. Two subjects use distinct categories. Do not expand this automatically into an eight-image matrix or reuse recurring catalog test subjects.

`proof_shots_manifest` is `{ "schema_version": "4", "items": [...] }`. Each item contains exactly:

- `file_id`, `category`, `subject`, `composition` (nonempty strings).
- `mode`: `text_to_image`; `style_reference_used`: false.
- `model`: `{ "provider": "actual provider", "model": "actual ID or null" }`.
- `generation_record`: the record above, with kind `art_style_proof`.

`proof_shots_file_ids` matches all manifest outputs. Every output must be Locked; the finalizer streams and hashes its actual bytes. There are no source Files. Provider/model identity comparisons normalize case and surrounding whitespace. An unknown version cannot establish a second model from the same provider, even if the other invocation exposes an ID.

`portability_report` contains `schema_version: "2"`, `verdict: "pass"`, the exact canonical `prompt`, `blind_evaluation: true`, an actual `evaluator` provider/model, and exactly two `models`. Each model contains `provider`, nullable `model`, and one or two `cases` matching the manifest. A case contains exactly `file_id`, `category`, `subject`, `composition`, `mode`, `prompt` (canonical only), `style_reference_used: false`, `subject_followed: true`, `style_applied: true`, `generation_record`, and `scores`.

Score eight dimensions from 0 to 2: `medium_material`, `marks_edges`, `depiction_grammar`, `tonal_shading`, `color_roles`, `composition`, `signature_details`, and `exclusions`. Every dimension must score at least 1; medium/material and depiction grammar must score 2. Each case and each model must average at least 1.5. The blind evaluator must actually inspect the outputs and differ from the tested image models. Do not write passing review claims without performing the review.

## Other required evidence and finalization

The style definition includes name, slug, medium, the portable prompt, subject slot recipes, usage guidance, lineage/direction where applicable, actual model provenance, credits and tags. Keep traditions broad and honestly attributed; do not target a living artist by name or disguised description.

`source_basis` and independent `prompt_review` remain schema version 1. The source/rights report names actual checked sources and evidence URLs. The prompt review binds the exact prompt, real independent reviewer identity, reference/subject/source-medium/model/style-name independence, contradictions, revision count and substantive `observable_dimensions` for the eight dimensions. `source_medium_independent` describes the prompt's independence; it does not require source images. Existing finalizer checks for these reports remain authoritative.

After submission, read the recorded verification job, its concrete failures, the resulting style state and public asset fields. Only the engine/finalizer may call the quality/publication callbacks. Verify the actual published page and images before reporting completion. Missing provenance, unavailable models or denied operations remain explicit limitations; do not weaken validation or replace evidence to make a job pass.
