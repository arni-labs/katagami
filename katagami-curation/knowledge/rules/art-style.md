# Art style rules

> The rules every Katagami art style must uphold: the one portable aesthetic prompt,
> the behavioral proof that it transfers, and the source evidence that lets it
> publish. The curation pipeline applies them when synthesizing and reviewing an
> art style. One line each; newest direction wins; when in doubt, follow the rule.
> Sibling rulebooks for other entities (e.g. `design-language.md`) live alongside
> this file in `knowledge/rules/`.

## The prompt
1. An art style is a *treatment*, not a subject or a catalog nickname. Store one paste-ready aesthetic prompt that directly specifies observable medium/material, marks/edges, tonal treatment, color roles, composition, signature details, and inline exclusions. It contains no placeholders, `in the style of …`, invented ArtStyle name, negative-prompt appendix, engine hints, or model-specific aesthetic variants. A consumer may add subject and palette facts before this prompt, but the aesthetic prompt itself remains byte-for-byte the same across models.

## Behavioral proof
2. Reference images are optional examples, never the backbone. Behavioral proof uses the exact same prompt and exact same four governed, style-neutral sources on both edit models: one human portrait, one other living subject, one still life/product/object, and one landscape/environment, rotated across documentary photograph, black-ink line drawing, neutral synthetic 3D render, and flat vector illustration. Choose concrete subjects and compositions for the style; never impose a recurring house set. Use no style-reference image or user-supplied source. Every edit must preserve recognizable subject/content while fully replacing the source medium; medium/material scores 2/2, every other observable dimension is ≥1/2, and every case/model average is ≥1.5/2, so a lightly tinted source and a strong model hiding a weak model both fail.

## Sources and rights
3. Credit and qualify every source. `credits` names all attributable movements, studios, traditions, or people; `source_basis` is authored by a reviewer independent from the prompt author and records authoritative evidence and whether each source is a collective tradition/movement, public-domain artist, licensed/opt-in artist/source, or original synthesis. The review must explicitly reject both a named living artist and an unnamed but recognizably practitioner-specific target. A living person without explicit permission is a hard publication failure; attribution alone is not permission. Even an eligible artist's name stays out of the operative prompt — encode the observable tradition instead. Run a separate LLM contradiction/reference-dependence review, allow at most one revision, then let the WASM finalizer mechanically cross-check the structured evidence and exact prompt before publishing.
