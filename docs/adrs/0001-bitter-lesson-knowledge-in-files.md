# ADR-0001: Bitter Lesson — Knowledge in Files, Not Code

**Status**: Accepted
**Date**: 2026-04-15

## Context

Katagami's `build_session_message` WASM module contains 700+ lines of hardcoded Rust prompt text across 4 functions (`build_source_search_message`, `build_synthesize_message`, `build_quality_review_message`, `build_organize_taxonomy_message`). Each function embeds full domain knowledge: entity shapes, design quality standards, embodiment requirements, typography rules, responsive design mandates, and scene-first composition philosophy.

This creates three problems:

1. **Updating knowledge requires recompiling Rust to WASM.** A one-word change to a quality standard means editing Rust string literals, running `cargo build --target wasm32-unknown-unknown --release`, copying the binary, and restarting the server.

2. **Agents cannot learn from feedback.** When a human curator says "this embodiment is too flat," that feedback has nowhere to persist. The next session starts from the same compiled prompts with no memory of the correction.

3. **Adding new design directions requires code changes.** Expanding the library to cover neo-editorial tech or Tokyo pop aesthetics should be a conversation with an agent, not a Rust feature branch.

This violates the bitter lesson: hand-engineering knowledge into code scales worse than letting agents discover and accumulate knowledge through use.

## Decision

Extract all domain knowledge from compiled WASM into two kinds of editable markdown files:

**SKILL.md files** — one per job type, stored at `skills/{skill-id}/SKILL.md`. These are loaded by the OpenPaw agent framework at session time via TemperFS auto-discovery. Each skill contains the process, entity shapes, and quality standards for one type of work.

**Workspace knowledge files** — stored at `/katagami/knowledge/` in TemperFS. These are read by agents via `temper.read()` and contain shared knowledge that spans skills: design principles, quality thresholds, and accumulated human feedback.

The WASM module becomes a thin bootloader (~80 lines) that:
1. Maps `job_type` to a skill name
2. Builds a minimal user message: "Execute this job using your `{skill}` skill"
3. Creates a Session and dispatches Configure

This follows the Palimpsest pattern proven across knowledge-bank, content-forge, and voice-bank apps: one agent with many skills, thin WASM routing, knowledge in files.

Two agents (bootstrap + curator) are consolidated into one (curator) with a skill mapping table in AGENT.md.

## Consequences

**Positive:**
- Updating design standards = editing a markdown file, no recompilation
- Agents read accumulated feedback from workspace files, improving over time
- Adding a new design direction = telling the agent to research it, not writing code
- Skill files are version-controlled and diffable
- New job types can be added by creating a SKILL.md and adding one line to the WASM match statement

**Negative:**
- Agent behavior depends on file content that could be accidentally corrupted by an agent writing bad content. Mitigated by version control and the ability to restore from git.
- Slightly more I/O at session start (reading skill + knowledge files). Negligible compared to LLM inference cost.

**Neutral:**
- The quality of agent output now depends on the quality of the skill and knowledge files rather than compiled prompts. This is the same content — just in a different format that's easier to iterate on.

## References

- Palimpsest `spawn_job_agent` pattern: `palimpsest/knowledge-bank/wasm/spawn_job_agent/src/lib.rs`
- OpenPaw skill auto-discovery: `llm_caller` loads SKILL.md from TemperFS paths
- ADR-0005: Temper-Native Rule (stateful orchestration via entity state machines + WASM)
- Sutton, R. "The Bitter Lesson" (2019) — general methods that leverage computation scale better than human-engineered knowledge
