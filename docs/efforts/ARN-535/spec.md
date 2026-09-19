# Spec: finalizer gates that check what they claim to check

Finalizer: `katagami-curation/wasm/finalize_spawned_session/src/lib.rs`. Every rule below is a deterministic check that fails finalization with a repairable, typed error. None of it needs a model.

## 1. Palette contrast (`verify_palette_contrast`)

Runs for every `synthesize_palette` job after the signature and role-map checks. Colours must be opaque hex (`#RGB`, `#RRGGBB`, or `#RRGGBBFF`); ratios are WCAG 2.x relative-luminance contrast.

| Rule | Floor | Error |
|---|---|---|
| `neutrals` has `bg`, `surface`, `text`; `signature[0].hex` is the accent | — | `palette_role_missing` |
| `text` on `surface` | 4.5:1 | `palette_contrast_insufficient` |
| `bg` carries content: `text` on `bg` **or** `surface` colour on `bg` | 4.5:1 | `palette_contrast_insufficient` |
| accent on `surface` ≥ 3:1 **or** `text` on accent ≥ 4.5:1 | 3:1 / 4.5:1 | `palette_contrast_insufficient` |

The error message names the pair and the measured ratio. `synthesize-palette/SKILL.md` states the same rule.

The second and third rules differ from what the skill used to promise (text on bg 4.5, accent on surface 3.0, no alternatives). Measured against the 38 published palettes, the promised rule rejects 6: dark boards under light paper (Felt Board, Wheatpaste) and highlighter accents (Acid Press, Verger Paper, Y2K Aqua, Bubblegum). All 38 pass the rule above. Rita chose this rule on 2026-09-18.

## 2. Artifacts are parsed

- **shadcn export**: valid JSON, `type == "registry:theme"`, `cssVars` has at least one non-empty scope object, `componentManifest` is a non-empty array at the top level or under `meta` (both shapes exist: the skill example and `ui/src/lib/shadcn-export.ts`). Error `shadcn_export_invalid`.
- **DESIGN.md**: opens with a `---` front-matter block that closes, with `version:` and `components:` as top-level keys of that block. Error `design_md_invalid`.
- **shadcn component spec**: the four required section titles are markdown headings outside code fences; `button`, `card`, `input`, `tabs` appear as whole tokens. Error `shadcn_component_spec_invalid`.

## 3. Banned patterns

A `banned_patterns` entry that is not a string or does not compile fails the voice-bands gate and names the entry.

## 4. Repair prompt

`repair_task_prompt` builds the repair task. It says the error lists every failed gate and each gate stops at its first problem.

## Measured blast radius (the 61 published languages, 38 published palettes)

Stored artifacts are served byte-for-byte by the site (`/language/<id>/shadcn.json`) or with only an added `art_style` front-matter block (`/DESIGN.md`), so they can be measured without store access.

| Gate | Old gate passes | New gate passes | Newly failing |
|---|---|---|---|
| palette contrast | n/a (did not exist) | 38 of 38 | 0 |
| shadcn export | 0 of 61 | 0 of 61 | 0 |
| DESIGN.md front matter | 31 of 61 | 28 of 61 | 3 |

No stored shadcn export contains `componentManifest` anywhere, so the old substring gate rejected all 61 too. The 23 marked `shadcn_export_verified` were therefore verified by some path that never read the body — worth a separate issue.

The 3 newly failing DESIGN.md files carry `version:`/`components` in the body but not in the front matter, which is the defect this gate closes. They fail only if re-finalized.

## Not covered

- Contributor submissions through the MCP skip the finalizer palette path; a curator reviews them. The same contrast rule for that route is a follow-up.
- Semantic checks move to Jev (ARN-536).
