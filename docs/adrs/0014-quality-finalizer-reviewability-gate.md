# ADR-0014: Quality Finalizer Reviewability Gate

## Status

Accepted

## Context

Quality review finalization validates a `DesignLanguage`, marks quality as
passed, and publishes the language. `DesignLanguage.MarkQualityPassed` is valid
from `UnderReview` or `Published`, not from `Draft`. A quality review can
successfully repair all required artifacts while leaving the language in
`Draft`, which made finalization call `MarkQualityPassed` from an invalid state.

The desired entity history is visible from state transitions alone:
`Draft -> SubmitForReview -> UnderReview -> MarkQualityPassed -> Publish`.

## Decision

Split quality finalization into two explicit lifecycle guards:

1. `ensure_language_under_review` submits Draft languages before quality is
   marked.
2. `MarkQualityPassed` records the completed review.
3. `ensure_language_published` publishes only from `UnderReview`, or no-ops
   when the language is already `Published`.

The finalizer remains a Katagami WASM integration reacting to CurationJob
finalization. No Rust daemon, polling loop, or external orchestration is added.

## Consequences

- Draft languages that pass quality review follow the legal state-machine path.
- Published languages that only need verification keep the existing no-op path.
- If a language is still not `UnderReview`/`Published` after the reviewability
  guard, finalization fails with a concrete state error before attempting
  `Publish`.

## Verification

- Python source contract asserts the reviewability guard occurs before
  `MarkQualityPassed`, and publish verification occurs after.
- Rust/unit and release WASM checks should be run before advancing the
  TemperPaw Docker `KATAGAMI_REF` pin.
