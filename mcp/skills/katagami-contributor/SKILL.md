---
name: katagami-contributor
description: Contribute governed design languages, palettes, and art styles to Katagami through its MCP. Use for new contributions and remixes; ArtStyles require one portable prompt plus contributor-owned, cross-model proof evidence.
---

# Katagami contributor

Use the authenticated Katagami MCP as the contribution boundary. Its current
tool schemas are the source of truth for payload mechanics. Do not bypass the
MCP with raw Temper actions.

## Ownership boundary

- The contributor authors the work and owns any source and proof images.
- Katagami stores, hashes, and verifies imported images. Katagami does not
  generate or edit images for outside contributors.
- TemperPaw contributors may create images with PawMedia before importing
  them. Other contributors use their own tools.
- Contributors never call finalizer-owned verification, quality, review,
  published-asset, or publish actions.
- A successful ArtStyle submission returns `VerificationQueued`. The curator
  finalizer alone may advance or publish it.

## Before contributing

1. Call `whoami`.
2. Search the published commons for overlap.
3. For a remix, call `remix` first and keep the returned Draft id.
4. Read the selected submit tool's current input schema. Never carry old
   fields forward when the schema no longer accepts them.

## ArtStyle contract

An ArtStyle is a transferable visual technique, independent of subject.

### One canonical prompt

Write one paste-ready paragraph made only of observable aesthetic facts and
inline exclusions. It must work without a style reference image.

The paragraph must state, in style-appropriate language:

1. medium and material construction;
2. marks, contours, and edges;
3. depiction grammar: how people, animals, objects, plants, and environments
   are constructed, simplified, and proportioned;
4. tonal and shading logic;
5. color roles;
6. composition and crop behavior;
7. signature process details;
8. exclusions.

Do not include:

- `{subject}`, `{palette}`, or any other placeholder;
- the ArtStyle's catalog name or “in the style of [name]”;
- negative-prompt or model-specific variants;
- a dependency on a reference image;
- a living artist, studio, or other impersonation target;
- instructions that preserve source material, lighting, texture, facial
  landmarks, or base-model realism when the technique is meant to replace it.

Adapters may translate only API mechanics—for example, where an API places
inline exclusions or whether an edit endpoint exposes strength. Every model
receives the same aesthetic facts.

### Rights and source review

Submit an independent schema-v1 source-basis review that:

- checks every named person or hidden attribution target;
- rejects living or unlicensed artist imitation;
- records authoritative sources for public-domain traditions and techniques;
- attests that the recipe is expressed at tradition level;
- is authored by a reviewer different from the prompt author.

Credits name the traditions and sources actually used. An evocative catalog
name is metadata, not an instruction and not evidence.

### Portability evidence

Use four contributor-owned source images:

- `human_portrait`
- `nonhuman_living`
- `still_life_object`
- `landscape_environment`

Across that quartet, use exactly these four distinct source media:

- `documentary photograph`
- `black-ink line drawing`
- `neutral synthetic 3d render`
- `flat vector illustration`

Send the identical four source files and exact canonical prompt to two
distinct image models. This produces eight edit outputs. Source fixtures may
be existing contributor-owned files; they do not need to be newly generated.
A single source across two models checks cross-model consistency but does not
establish transfer across subject roles or source media.

Do not use style-reference images in the portability matrix. They are an
optional supplement outside this gate, never its backbone.

For every source and output:

1. Call `import_art_style_proof_image`.
2. Preserve the returned locked `file_id` and SHA-256.
3. Bind the exact source id/hash, output id/hash, canonical prompt hash, model,
   and provider request id when available in the generation record.

Build exactly eight proof items: two models for each of the four categories.
Both model rows must point to the same source id and source hash for that
category. Choose the strongest proof output as the thumbnail; no subject role
is globally privileged.

### Independent prompt and visual review

The prompt review quotes substantive, non-overlapping evidence for the eight
dimensions above and attests `source_medium_independent=true`.

The blind portability review scores each anonymous output on:

- `medium_material`
- `marks_edges`
- `depiction_grammar`
- `tonal_shading`
- `color_roles`
- `composition`
- `signature_details`
- `exclusions`

Each output must preserve the intended content, fully replace the source
medium, score `medium_material=2`, score `depiction_grammar=2`, and average at
least `1.5` across all eight dimensions. One model cannot hide behind the
other model's average.

Use the deterministic formula for the verdict after semantic review. If the
review prose, booleans, scores, and verdict contradict one another, preserve
the rejected review and resolve the contradiction explicitly; never silently
flip a score or label.

### Submit

Call `submit_art_style` once with the complete Draft, imported proof records,
independent source review, independent prompt review, and blind portability
report. Do not call `SubmitForReview`, `AttachArtStyleReview`,
`MarkQualityPassed`, or `Publish`.

Return:

- ArtStyle id and URL;
- `VerificationQueued` status;
- verification job id;
- exact canonical prompt hash;
- the two image models and four source roles used.

## Palettes and design languages

Use `submit_palette_system` and `submit_design_language` according to their
current MCP schemas. Preserve lineage for remixes. These tools may have a
different state transition from ArtStyles; report the status returned by the
tool rather than predicting it.
