# Narrative structure pages

## Routes

- `/structure` lists the 32 approved narrative structures. The owner check is the first statement in the page component.
- `/structure/[id]` shows one structure, its aliases, movements, exemplar works, sources, rights handling, and any encyclopedia links. It uses the same owner check.
- The owner navigation now links to `/structure` as **Structures**.

Both routes read the `NarrativeStructures` OData set first. During local verification that set was unavailable, so the pages displayed the checked-in copy of `narrative-structures.json` and labeled it **approved fixture**.

## Movement forms

Cards show the complete movement data so a reader can compare structures without opening every record.

- **Fixed sequence:** a numbered list of every required part, in order.
- **Variable rule:** the rule in prose, followed by its complete numbered example. The count is labeled **example units** so it is not mistaken for a required count.

The detail page repeats the same distinction with a larger ordered display. Boundary parsing rejects an unknown movement kind, malformed JSON, missing fields, invalid URLs, and positions that are not consecutive from one.

## Agent handoff

**Copy outline for your agent** writes a complete instruction to the clipboard. The copied text contains the structure name, working instruction, fixed sequence or variable rule, numbered movements, exemplar works, and a final instruction to outline every movement before drafting. A textarea copy fallback covers browsers that expose but refuse the Clipboard API. **Read the copied text** opens the exact payload on the page for inspection.

Automated checks cover the fixed and variable payloads and make sure neither degrades into object serialization.

## Verification

- `node ui/scripts/run-tests.mjs`: passed. It ran 36 test files and 14 contract checks.
- `npm run build`: passed, including the complete prebuild suite, compilation, and TypeScript checking. Next generated `/structure` and `/structure/[id]`.
- Targeted ESLint for the changed TypeScript and TSX files: passed.
- Local preview at `1440 × 1200`: `/structure` returned 200 and rendered all 32 cards from the fixture. The full-page capture is `/tmp/verify-katagami/2026-09-10-arn118-structure/index-desktop.png`.
- All 32 `/structure/[id]` fixture URLs returned 200 in a live HTTP pass. The Ki-shō-ten-ketsu detail response contained `起承転結`, the handoff, source links, and the fixture label. The source HTML also retained `序破急` and `पञ्चसन्धि` on their records.
- The seven approved encyclopedia references produce their expected `/encyclopedia?cell=…` links.

The environment refused browser control of the local origin after the desktop capture. The standalone browser then failed at launch under the macOS sandbox. I could not honestly claim the requested phone-width pass or clipboard click. The responsive rules compile and the pages use the existing Katagami breakpoints. That does not replace the blocked `390 × 844` browser check.

## Fixture limits

The fixture supplies every content field used by the pages: aliases, instructions, movement forms, exemplars, sources, rights handling, and encyclopedia cell IDs. It cannot prove that the production entity is installed, that production OData field projections match, or that stored statuses have moved beyond Draft. The page source label makes the fallback visible instead of presenting fixture data as a Temper read.

Temper lifecycle calls were also unavailable because the configured MCP requires approval while this run's approval policy forbids it. Local git index writes were denied by the sandbox because this worktree's index lives under the primary checkout. The pull-request commit was therefore created from these exact files through GitHub's Git Data API.
