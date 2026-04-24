# ADR-0003: Inline Action Triggers Hard Cut

**Status**: Accepted
**Date**: 2026-04-24

## Context

Katagami curation had been partially migrated to inline `[[action.triggers]]`, but the repository still carried legacy `reactions.toml` locations as historical baggage. That created two architectural problems:

1. readers could not tell whether `curation_job.ioa.toml` was the real workflow contract or only a partial mirror of older reaction files
2. the migration risked drift between visible entity state transitions and hidden cross-entity wiring

Katagami runs through the OpenPaw server, so the migration is only complete when the current Katagami worktree is proven live through that runtime path.

## Decision

Katagami adopts the Temper ADR-0046 model without fallback:

- `katagami-curation/specs/curation_job.ioa.toml` and `katagami-curation/specs/curation_query.ioa.toml` are the authoritative workflow wiring
- legacy `reactions.toml` files remain deleted
- trigger params that copy source fields use `[action.triggers.params_from]`
- merge readiness requires a live OpenPaw proof that the current Katagami worktree is the one loaded by the server

## Consequences

**Positive:**
- Curation workflow advancement is understandable from the entity specs alone.
- There is no double-source or double-fire ambiguity for job/query transitions.
- Live verification now proves the real runtime path instead of only local static checks.

**Negative:**
- Katagami's trigger verification depends on coordinated OpenPaw proof runs, not only local crate tests.

**Risk:**
- If OpenPaw points at the wrong local Katagami checkout during proof, verification could accidentally certify the wrong code. The proof record must state exactly which worktree was loaded.

## References

- Temper ADR-0046: Unified Action Triggers
- `katagami-curation/specs/curation_job.ioa.toml`
- `katagami-curation/specs/curation_query.ioa.toml`
- `katagami-curation/tests/test_reaction_resolver_types.py`
- `.proofs/005_quality_review_fail_fast_boundary.md`
