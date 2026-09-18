# Decisions

## Enforce a highlighter-aware contrast rule, not the rule the skill promised
- **Came up because**: the promised rule (text on surface and on bg at 4.5:1, accent on surface at 3:1) rejects 6 of the 38 published palettes, all either dark boards under light paper or highlighter accents, which the design contract asks for.
- **Options**: (a) the promised rule as written; (b) text-only; (c) bg passes if text or the surface colour reads on it, accent passes if visible on surface or readable under text.
- **Chose (c)** on Rita's decision, 2026-09-18. Gained: every published palette passes and highlighter accents stay legal. Given up: an accent that is only legible as a fill is accepted even if the design uses it as thin text.
- **Where**: `lib.rs` `verify_palette_contrast`; `synthesize-palette/SKILL.md`.

## Contrast roles must be opaque
- **Came up because**: `is_hex_color` accepts `#RRGGBBAA`, and a translucent colour has no contrast ratio without knowing what is behind it.
- **Options**: ignore alpha; composite over an assumed background; reject.
- **Chose reject** (`palette_role_missing` names the role). Simplest rule that cannot give a wrong answer. Given up: translucent text tokens in `neutrals`.
- **Where**: `parse_opaque_hex`.

## Accept `componentManifest` at the top level or under `meta`
- **Came up because**: the skill says the export must include `componentManifest`; the site's own generator puts it under `meta`.
- **Options**: top level only; `meta` only; either.
- **Chose either**. Stored exports could not be measured from this session, so the check tightens structure without picking a winner between two shapes that both exist.
- **Where**: `is_shadcn_registry_theme`.

## Component spec keeps the four-component floor
- **Came up because**: the skill asks for recipes for all 16 primitives, the old gate checked four by substring.
- **Options**: require all 16; keep four as whole tokens.
- **Chose four**. The manifest gate already requires all 16 names; raising this floor without measuring stored specs risks repair churn for no new information.
- **Where**: `verify_file_body`, `shadcn_component_spec`.

## The repair prompt stays in the WASM for now
- **Came up because**: fixing its stale sentence meant touching a hard-coded prompt that `test_no_hardcoded_prompts_in_wasm.py` argues should not live there.
- **Chose** to extract it into `repair_task_prompt` and test its output. Moving it to a template row is a separate change.

## Committed WASM is built with the local toolchain
- **Came up because**: `test_wasm_source_parity` already fails on master for `build_session_message` on this machine; builds are not reproducible across toolchains and CI does not run the parity test.
- **Chose** to commit the `finalize_spawned_session.wasm` built here (rustc 1.95.0-nightly 2026-02-08) and leave `build_session_message.wasm` untouched.
