# ADR-0002: Quality Review Fails Fast on Invalid Specs

**Status**: Accepted
**Date**: 2026-04-24

## Context

Katagami's `quality_review` job had started doing two different kinds of work in one session:

1. reviewing and fixing embodiment HTML against a completed design spec
2. repairing incomplete or skeletal `DesignLanguage` specs by researching and synthesizing the missing guidance inline

That boundary violation created three problems:

1. **Runtime exploded.** A review job turned into a research-heavy synthesis job with many extra LLM turns and tool calls.
2. **Responsibility blurred.** When quality review both judged and repaired the spec, it became impossible to tell whether a failure came from the embodiment or from bad upstream language data.
3. **Workflow regressions were hidden.** Incomplete `philosophy`, `tokens`, `rules`, or `guidance` fields should have been caught as an upstream synthesis/regeneration problem, but the review job masked that defect by repairing it ad hoc.

Katagami already treats skills as distinct workflow boundaries (ADR-0001). `quality_review` should consume a valid design language, not synthesize one on the fly.

## Decision

`quality_review` becomes a strict downstream consumer of design specs.

Before evaluating an embodiment, the review skill must validate the `DesignLanguage` payload. If any required section is missing, empty, or still skeletal, the review job stops immediately and fails the `CurationJob` with a concrete error message naming the invalid sections.

Spec repair is explicitly pushed upstream to the jobs that own that responsibility:

- `synthesize`
- `regenerate_embodiment`

The Katagami bootloader and the review skill are updated together so this boundary is enforced both in compiled workflow code and in the agent instructions.

## Consequences

**Positive:**
- `quality_review` stays a review/fix job instead of drifting into a synthesis job.
- Invalid design-language data becomes visible immediately and can be fixed at the correct upstream step.
- Review runtimes become more predictable because missing-spec repair no longer happens inside the session.

**Negative:**
- Some jobs now fail earlier instead of partially succeeding through ad hoc repair.
- Upstream synthesis/regeneration quality matters more, because review will no longer paper over bad inputs.

**Neutral:**
- Human curators get clearer failure messages: invalid spec vs bad embodiment are now distinct failure modes.

## References

- ADR-0001: Bitter Lesson — Knowledge in Files, Not Code
- `katagami-curation/wasm/build_session_message/src/lib.rs`
- `katagami-curation/agents/curator/skills/review-quality/SKILL.md`
