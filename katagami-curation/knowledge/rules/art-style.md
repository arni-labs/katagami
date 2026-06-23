# Art style rules

> The rules every Katagami art style must uphold. The curation pipeline applies
> them when sourcing, synthesizing, reviewing, and publishing ArtStyle entities.
> One line each; newest direction wins; when in doubt, follow the rule.
> Sibling rulebooks for other entities live alongside this file in
> `knowledge/rules/`.

## Concept
1. An art style is a treatment, not a subject. It changes how a supplied subject is rendered; it does not replace the subject with the medium, tool, device, or source artifact.
2. Give each style one ownable visual behavior: mark pressure, line logic, color handling, surface texture, composition habit, or transfer effect. Never ship a bare medium label as the whole idea.
3. Keep the recipe portable. A downstream agent must be able to put any `{subject}` through the style and get the same recognizable treatment.
4. Distinctness comes from the style's behavior and lineage, not from novelty words or one-off props.

## Naming
5. Prefer a short evocative name that points at the behavior, world, or lineage. Avoid names that merely restate the medium: "Crayon", "Pencil", "Ink", "Watercolor", "Sketch", "Manga".
6. Do not use "Style", "Art", "Illustration", "Aesthetic", "Look", or an engine/provider name in the public name.
7. A material word is allowed only when it carries a specific signature behavior beyond the generic medium.

## Prompt template
8. The prompt template must contain the literal holes `{subject}` and `{palette}`.
9. The `{subject}` slot is the only source of depicted objects. Every other phrase in the prompt should act as treatment, handling, texture, lighting, composition, or constraint.
10. Medium words describe mark-making, not props. "wax-crayon pressure, uneven scumble, paper tooth" is valid; "a crayon", "box of crayons", "pencil on paper", "camera", "CRT monitor", "printed page", or "paintbrush" is invalid unless the supplied `{subject}` explicitly asks for that object.
11. After drafting any prompt, scan every noun outside `{subject}`. If it can plausibly be drawn as a separate object, rewrite it as an adjective or process descriptor, or move it into a slot recipe only when that slot's subject requires it.
12. Keep engine-specific syntax in `engine_hints`; the main prompt stays engine-agnostic and human-readable.
13. Negative prompts should reject accidental medium artifacts when relevant: art supplies, tools, device frames, paper sheets, screenshots, labels, UI chrome, studio tabletop, and product photos.

## Slot recipes
14. Slot recipes choose useful subjects for transfer tests: a face, an everyday object unrelated to the medium, a scene, a pattern, an icon-like motif, or an ambient background.
15. Do not use the medium/tool as a proof subject. A crayon style must not prove itself with a crayon; a pencil style must not prove itself with a pencil; a screen style must not prove itself with a monitor.
16. If a user-provided subject is itself a tool or medium, render that subject honestly, but do not let the style recipe introduce additional tools around it.

## Reference and proof images
17. Reference and proof images show the style on real subjects, full-frame. They must not be photos/renders of art supplies, source devices, printed artifacts, frames, or packaging unless the subject explicitly calls for them.
18. Provide breadth: at least one scene or hero, one portrait/person or character, one object unrelated to the medium, and one pattern/texture proof where useful.
19. No baked-in legible text, watermarks, labels, signatures, UI panels, or captions in generated proof images.
20. Record the generating image model and prompt provenance in manifests or guidance.

## Credits and sources
21. Best-effort source real human artists, movements, studios, or traditions that actually work in the intended visual territory.
22. Credit every recognizable influence with first-class credits when the schema supports it: `[{ "name", "kind": "artist|movement|studio|tradition", "note": "..." }]`.
23. If first-class credits are not deployed yet, store the exact credit JSON in guidance/proof metadata for backfill and link supporting DesignSource records.
24. Do not pass a recognizable artist lineage off as original. Attribution is a correctness check as well as courtesy.
