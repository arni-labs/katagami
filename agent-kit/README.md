# Katagami Contributor kit

**`SKILL.md` is the one skill** — the exact process the Katagami agent used to refine/reimagine languages, written so any harness can do it: given a SOURCE language + a DIRECTION, author a complete take (its own art style + palette + language) and submit the set for review (it lands `UnderReview`; a human curator publishes).

There is **one file**, loaded the same way everywhere — not a different artifact per harness:

| Harness | How it loads `SKILL.md` |
|---|---|
| **Claude Code** | Installed at `~/.claude/skills/katagami-contributor/SKILL.md` (this file's content). Invoked as the `katagami-contributor` skill. |
| **Codex** | Its `AGENTS.md` points at `agent-kit/SKILL.md` — "act as the katagami-contributor; follow `agent-kit/SKILL.md`." |
| **Grok / any other** | Use the contents of `agent-kit/SKILL.md` as the system prompt. |

The loading mechanism differs per harness; **the skill content is identical**. Keep this file the single source of truth; the Claude Code copy is installed from it.

## On the backend (already deployed, ARN-101)

The skill leans on Temper composites that collapse the ~15-call publish ladder to ~3 per entity, deployed to the commons app via Genesis:
- `SubmitArtStyle` / `SubmitPaletteSystem` / `SubmitDesignLanguage` — author a complete entity in one call, leave it in `Draft`; the agent then calls `SubmitForReview` (lands `UnderReview`). Contributors never self-publish.
- `Direction` entity + a `direction_id` link on each submission — a **bake-off round** is a `Direction`; "these N belong to round X" = `direction_id eq X` (a real link, not a tag).

Taste lives in the rulebook `katagami-curation/knowledge/rules/design-language.md` (the rules we curate), referenced by the skill.
