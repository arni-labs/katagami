# Synthesize Art Style

Create one complete `ArtStyle`: a medium, one canonical aesthetic prompt,
slot-specific subject recipes, optional example images, multi-model proof shots,
a thumbnail, source/rights evidence, and structured review evidence.

## When to use

Job type: `synthesize_art_style`.

This is a terminal lane. The finalizer reads the real fields and file bytes,
verifies every report, internally attests the result, and alone may submit,
mark quality, publish assets, or publish. Never call `SubmitForReview`,
`AttachArtStyleReview`, `MarkQualityPassed`, `AttachPublishedAssets`, or `Publish`.

## Non-negotiable contract

An ArtStyle is one prompt, not an adapter system.

- Every image model receives the exact same aesthetic prompt.
- The prompt is paste-ready prose: no `{subject}`, `{palette}`, or other holes.
- Describe observable treatment: medium/material, marks/edges, tonal treatment,
  color roles, composition, signature details, and exclusions.
- Present those seven concerns in that canonical order. The wording remains free
  prose, but the stable order lets the finalizer bind the independent review's
  semantic labels to the actual prompt without a style-specific keyword list.
- Put exclusions in the prompt itself. Do not create a negative-prompt field.
- Do not create engine hints or model-specific aesthetic variants.
- Do not write `in the style of ...`.
- Do not put the invented catalog name in the operative prompt.
- Do not require a reference image. References are optional gallery examples.
- A supplied content image may be edited, but it is not a style reference.

## Before starting

1. Read `/system/knowledge/design-principles.md`,
   `/system/knowledge/quality-standards.md`, and all accepted `TasteRules`.
2. List existing `ArtStyles`; the new treatment must be distinct.
3. Research every named influence and record its eligibility:
   - collective tradition or movement;
   - public-domain artist, with death year and jurisdiction/date basis;
   - licensed/opt-in artist or source, with permission or license URL;
   - original synthesis.
4. A named living person without an explicit license is a hard stop. Attribution
   does not make imitation permissible.

## 1. Draft the one prompt

Use this shape as a pattern, not as fixed wording:

```python
name = "Archive Ember"  # catalog label only
slug = "archive-ember"
medium = "print"
prompt_template = (
    "Render the supplied subject as a two-ink relief print on fibrous matte paper. "
    "Use blunt carved contours and visibly broken edges. Build volume with sparse "
    "directional hatching and broad unprinted highlights. Reserve deep indigo for "
    "structural masses and vermilion for small focal accents. Keep a centered, "
    "compressed composition with generous bare paper. Add slight ink spread and "
    "irregular hand pressure. Avoid photorealistic skin, glossy surfaces, gradients, "
    "and smooth vector geometry."
)
```

The prompt must remain useful for arbitrary portraits, objects, landscapes,
architecture, animals, and abstract compositions. Do not tailor it to the
current source image or the example above.

## 2. Independent LLM review, one repair maximum

Give another LLM only the candidate prompt, catalog name, and this universal
review schema. It must quote the exact prompt fragment supporting each dimension.
It may identify intentional scoped contrast, but `contradictions` must be empty
before publication. If it fails, revise once and re-review; do not loop.
The seven quotes must be substantive clauses, appear in the same canonical order
as the keys below, and collectively cover the prompt rather than cherry-picking
isolated words.

```python
prompt_review = {
    "schema_version": "1",
    "verdict": "pass",
    "prompt": prompt_template,
    "reviewer": {"provider": "<provider>", "model": "<different LLM>"},
    "reference_independent": True,
    "subject_independent": True,
    "model_agnostic": True,
    "style_name_independent": True,
    "contradictions": [],
    "intentional_tensions": [],
    "revision_count": 0,  # 0 or 1
    "observable_dimensions": {
        "medium_material": "<exact quote from prompt>",
        "marks_edges": "<exact quote from prompt>",
        "tonal_shading": "<exact quote from prompt>",
        "color_roles": "<exact quote from prompt>",
        "composition": "<exact quote from prompt>",
        "signature_details": "<exact quote from prompt>",
        "exclusions": "<exact quote from prompt>",
    },
}
```

This LLM review is the semantic contradiction and dimension-assignment check.
The finalizer performs universal mechanical checks: independent reviewer
identity, exact prompt identity, canonical dimension order, distinct
non-overlapping clauses, and substantial prompt coverage. There is no
style-specific keyword list and no SMT encoding.

## 3. Source and living-artist safety

The source review is first-class data, not prose buried in notes:

```python
credits = [
    {
        "name": "European relief print tradition",
        "kind": "tradition",
        "note": "carved contour, unprinted highlights, and pressure variation",
    }
]
source_basis = {
    "schema_version": "1",
    "verdict": "pass",
    "reviewer": {"provider": "<provider>", "model": "<review model>"},
    "all_named_people_checked": True,
    "sources": [
        {
            "name": "European relief print tradition",
            "kind": "tradition",
            "evidence_url": "https://<authoritative-source>",
        }
    ],
}
```

Allowed `source_basis.sources[].kind` values are `tradition`, `movement`,
`public_domain_artist`, `licensed_artist`, `licensed_source`, and
`original_synthesis`.

- `public_domain_artist` requires `death_year`, `public_domain_basis`, and
  `evidence_url`.
- `licensed_artist` / `licensed_source` requires `license_url` or `permission`.
- Every credit must have a matching source-basis entry.
- Every artist credit must be public-domain or licensed.
- Do not name an artist in the operative prompt, even when public-domain; encode
  the observable technique.

## 4. Cross-model behavioral proof

Text review cannot prove image behavior. Test the exact prompt on at least two
distinct edit-capable image models. For each model:

- use at least three unrelated subjects;
- use source images from at least three media across the matrix (for example:
  photograph, watercolor/painting, line drawing, collage, or digital/3D);
- use the source only for content/composition;
- provide no style reference;
- do not add model-specific aesthetic wording;
- preserve the exact prompt string in every case;
- record a reproducible seed or request id.
- use only publication-cleared edit inputs. Private or user-supplied test images
  are valid for ephemeral evaluation but can never become catalog proofs.

Every image-edit case must carry the same `input_source` object in both the
portability report and proof manifest:

- `kind`: one of `synthetic`, `public_domain`, `licensed`, or
  `katagami_owned`;
- `asset_id`: a stable source identifier or content fingerprint;
- `rights_evidence`: the generation record, public-domain basis, license, or
  ownership record.

The two image models must use the same cleared input asset for each matrix row.

Blind-review each output on a 0/1/2 scale for the seven observable dimensions.
Every dimension must score at least 1, every case average at least 1.5, and each
model average at least 1.5. A strong model cannot hide a weak model.

```python
portability_report = {
    "schema_version": "1",
    "verdict": "pass",
    "prompt": prompt_template,
    "blind_evaluation": True,
    "evaluator": {"provider": "<provider>", "model": "<vision model, not an image producer>"},
    "models": [
        {
            "provider": "<image provider>",
            "model": "<image model>",
            "cases": [
                {
                    "file_id": "<proof File id>",
                    "subject": "<content, not a style description>",
                    "source_medium": "photograph",
                    "mode": "image_edit",
                    "seed": "<seed or request id>",
                    "prompt": prompt_template,
                    "style_reference_used": False,
                    "input_source": {
                        "kind": "synthetic",
                        "asset_id": "<stable source id or fingerprint>",
                        "rights_evidence": "<generation/rights record>",
                    },
                    "scores": {
                        "medium_material": 2,
                        "marks_edges": 2,
                        "tonal_shading": 1,
                        "color_roles": 2,
                        "composition": 1,
                        "signature_details": 2,
                        "exclusions": 1,
                    },
                },
                # at least two more unrelated cases
            ],
        },
        # at least one more distinct model with its own >=3 cases
    ],
}
```

If any model misses a threshold, the style is not portable. Improve the one
prompt and rerun the failed model; never add a per-model prompt.

## 5. Write files and submit once

Write every proof image to PawFS. `proof_shots_manifest.items` must mirror the
proof file ids and record model/provider, subject, source medium, mode, seed, and
`style_reference_used: false`. For image edits, it must also repeat the exact
publication-cleared `input_source` object from the portability case. A thumbnail
may reuse/crop one proof. Optional example references use
`reference_image_file_ids` and `reference_manifest`; pass `[]` and
`{"items":[]}` when none exist.

```python
slot_recipes = {
    "hero": "wide establishing scene with room for interface copy",
    "feature": "single concept object with a clear silhouette",
    "avatar": "portrait bust, shoulders up",
    "empty-state": "one small object implying absence",
    "background": "low-information ambient field",
}
guidance = {
    "do": ["keep the treatment legible across unrelated subjects"],
    "dont": ["add model-specific wording", "depend on a style reference"],
}
model_provenance = {
    "style": {"provider": "<provider>", "model": "<prompt author model>"},
    "source": {"provider": "<provider>", "model": "<research model>"},
    "images": [
        {"provider": "<provider 1>", "model": "<model 1>"},
        {"provider": "<provider 2>", "model": "<model 2>"},
    ],
}

art = temper.create("ArtStyles", {})
eid = art["entity_id"]
created_ids = [eid]
temper.action('ArtStyles', eid, 'SetName', {'name': name, 'slug': slug})
temper.action("ArtStyles", eid, "SubmitArtStyle", {
    "name": name,
    "slug": slug,
    "medium": medium,
    "prompt_template": prompt_template,
    "slot_recipes": json.dumps(slot_recipes, ensure_ascii=False),
    "guidance": json.dumps(guidance, ensure_ascii=False),
    "reference_image_file_ids": json.dumps(reference_ids),
    "reference_manifest": json.dumps({"items": reference_manifest}, ensure_ascii=False),
    "proof_shots_file_ids": json.dumps(proof_ids),
    "proof_shots_manifest": json.dumps({"items": proof_manifest}, ensure_ascii=False),
    "thumbnail_file_id": thumbnail_file_id,
    "parent_ids": "[]",
    "lineage_type": "original",
    "generation_number": "0",
    "model_provenance": json.dumps(model_provenance, ensure_ascii=False),
    "credits": json.dumps(credits, ensure_ascii=False),
    "source_basis": json.dumps(source_basis, ensure_ascii=False),
    "prompt_review": json.dumps(prompt_review, ensure_ascii=False),
    "portability_report": json.dumps(portability_report, ensure_ascii=False),
    "tags": json.dumps(tags, ensure_ascii=False),
    "direction_id": direction_id,
    "curator_notes": "One-prompt portability contract v1",
})
```

Complete only after reads confirm every field and File is visible:

```python
temper.action("CurationJobs", job_id, "CompleteArtStyleSynthesis", {
    "art_style_ids": json.dumps(created_ids),
    "output": json.dumps({"art_style_ids": created_ids}, ensure_ascii=False),
})
temper.done("synthesize_art_style complete")
```

## Tooling rules

- `json` is preloaded; use `json.dumps` for every array/object parameter without importing it.
- Each session creates one style.
- Batch/catalog revalidation jobs process at most 10 styles.
- Procedural placeholders do not count as proof.
- Never promote a private or user-supplied validation input into proof shots,
  thumbnails, references, or published assets. Use a synthetic, public-domain,
  licensed, or Katagami-owned source with explicit evidence.
- Missing model access is a visible failed/blocked review, never a silent pass.
