# Temper Case Study: DesignLanguage Invariant Failure

This note documents a concrete case where Temper found a real defect in the
`DesignLanguage` lifecycle spec before the curation pipeline could continue
under an invalid state model.

## What Failed

During the `DesignLanguage` thumbnail and review rollout, Temper blocked runtime
actions with a verification error:

```text
VerificationRequired
Verification failed for entity type 'DesignLanguage'. Fix the spec and re-push.
failed_levels: Level 1: Model Check
summary: L1 Model Check FAILED: 1240 states explored, 1 counterexample(s)
details: counterexample property BoolRequiredInvariants
description: Counterexample found with 16 step trace
```

The same failure was reproduced locally by verifying the old
`DesignLanguage` spec from commit `2c72129`:

```text
L0 Symbolic PASSED: 28 guards satisfiable, 8 invariants inductive, 0 unreachable
L1 Model Check FAILED: 1240 states explored, 1 counterexample(s)
L2 Simulation PASSED: 5 seeds, 301 transitions, 0 dropped msgs
L3 Property Tests PASSED: 100 cases, 30 max steps
```

The important point is that Level 1 exhaustive model checking found a reachable
state that violated a boolean-required invariant.

## The Spec Contradiction

The old spec allowed `AttachDesignMd` while a language was already
`Published`:

```toml
[[action]]
name = "AttachDesignMd"
kind = "input"
from = ["Draft", "UnderReview", "Published"]
effect = [
  { type = "set_bool", var = "has_design_md", value = "true" },
  { type = "set_bool", var = "has_valid_design_md", value = "false" },
  { type = "set_bool", var = "design_md_verified", value = "false" },
  { type = "set_bool", var = "quality_review_passed", value = "false" }
]
```

That action intentionally invalidates the existing DESIGN.md verification,
because a newly attached artifact must be checked before it is trusted.

The same spec also declared that every `Published` language must keep these
booleans true:

```toml
[[invariant]]
name = "PublishedRequiresValidDesignMd"
when = ["Published"]
assert = "has_valid_design_md"

[[invariant]]
name = "PublishedRequiresVerifiedDesignMd"
when = ["Published"]
assert = "design_md_verified"

[[invariant]]
name = "PublishedRequiresQualityReview"
when = ["Published"]
assert = "quality_review_passed"
```

Those two ideas conflict. If `AttachDesignMd` is allowed from `Published`, then
there is a reachable `Published` state where `has_valid_design_md` and
`design_md_verified` are false.

## The Counterexample Path

Temper's counterexample trace showed the path, not a prose explanation. The
essential sequence was:

```text
Draft
SetSpec
AttachEmbodiment
VerifyEmbodiment
AttachDesignMd
VerifyDesignMd
AttachThumbnail
SubmitForReview
MarkQualityPassed
Publish
AttachDesignMd
Published with has_valid_design_md=false and design_md_verified=false
```

The reproduced JSON trace had 16 entries. After publishing successfully, the
trace applied `AttachDesignMd` in the `Published` state. That action kept the
status as `Published`, but reset DESIGN.md validity:

```text
status = Published
has_design_md = true
has_valid_design_md = false
design_md_verified = false
quality_review_passed = false
```

Later trace steps could set `quality_review_passed` true again, but the final
counterexample still had:

```text
has_valid_design_md = false
design_md_verified = false
```

That violates `PublishedRequiresValidDesignMd` and
`PublishedRequiresVerifiedDesignMd`.

## What Temper Explained

Temper did explain the class of failure:

```text
property: BoolRequiredInvariants
counterexample: 16 step trace
```

It did not produce a natural-language diagnosis like:

```text
AttachDesignMd is allowed from Published and clears design_md_verified.
```

The human step was to read the trace and map the false booleans back to the
named invariants in the spec. That was enough to identify the bad transition.

## The Fix

Commit `c037250` fixed the lifecycle contradiction by removing `Published` from
`AttachDesignMd.from`:

```diff
- from = ["Draft", "UnderReview", "Published"]
+ from = ["Draft", "UnderReview"]
```

The hint was also updated to make the intended workflow explicit:

```text
Published languages must Revise first because this invalidates publish-required
verification booleans until the finalizer verifies the referenced file.
```

After that fix, live production verification passed:

```text
L1 Model Check PASSED: 1186 states explored, all properties hold
```

## Why This Showcases Temper

This was not a UI thumbnail rendering bug. Temper caught a lifecycle contract
bug in the `DesignLanguage` automaton.

The useful part was that Temper did not merely check the happy path. It explored
reachable sequences of actions and found that the spec allowed a published
entity to become internally invalid without leaving the `Published` state.

The runtime then blocked actions with `VerificationRequired` instead of letting
curation jobs continue against a known-invalid model. In practical terms,
Temper turned a subtle state-machine contradiction into a concrete failing
counterexample before it could become silent data corruption.
