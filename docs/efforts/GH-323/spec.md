# Art-style gallery defaults

## Accepted outcome

Every new or revised art style provides the owner's requested gallery image set using GPT Image 2.5, Grok Image and Nano Banana. The contribution skill, MCP input, finalizer and visible gallery agree on the contract. The required allocation is six total: four GPT Image 2.5, one Grok Image and one Nano Banana.

## Gallery behavior

A multi-image example set supplies the hero and remaining gallery images. Portability proofs stay independent validation evidence and do not replace that example set. Records with no multi-image example set retain their existing proof fallback. Repeated URLs appear once. Unverified private proof remains hidden. Existing published records remain accessible.

## Submission and finalization contract

The MCP requires `gallery_images` with exactly six items. Each binds a Locked File ID, subject, exact provider/model ID, and generation record. The record contains schema version 1, kind `art_style_gallery`, style slug, actual full prompt, canonical prompt SHA-256, and output File ID, byte SHA-256, full-prompt SHA-256 and actual provider request ID. The full prompt is exactly the canonical prompt plus `\n\nSubject and scene:\n` plus the subject. All hashes use lowercase SHA-256.

Four items use OpenAI `openai/gpt-image-2.5/sunburst/text-to-image` or `openai/gpt-image-2.5/flare/text-to-image`; one uses xAI `xai/grok-imagine-image/v2.0/text-to-image`; one uses Google `fal-ai/nano-banana-pro`. There is no silent substitution. The first item is the thumbnail. File IDs and byte hashes are unique.

The existing `reference_manifest` stores `{schema_version: "2", items: gallery_images}` and `reference_image_file_ids` stores the same ordered File IDs. The finalizer validates these bindings and hashes every actual Locked output before any attestation or publication. The existing proof manifest and two-model provenance remain unchanged. Existing published records are not automatically revalidated or unpublished.

This adds a predicate at the existing verification boundary, not a new state transition or workflow: `attest/publish => gallery_valid && existing_proof_valid`. Negative tests enumerate failed conjuncts (count, allocation, duplicate IDs/bytes, thumbnail/order, prompt/slug/hash/request bindings), and a boundary test prevents moving attestation ahead of validation. The existing File verifier enforces Locked status and actual byte identity.

## Verification

Reproduce gallery selection with multiple examples plus proof; prove all unique examples remain visible. Verify the actual detail-page renderer and image decoding. Finalizer tests must reject missing images, duplicate files, false/missing provenance and the wrong model allocation. Verify installed skill and Genesis app revisions after delivery.

## Current external limit

Fal returned HTTP403 account_locked for the GPT portrait and Grok image. Two successful outputs are retained with request IDs and Locked Katagami Files. No blocked request is automatically retried or routed through another account.
