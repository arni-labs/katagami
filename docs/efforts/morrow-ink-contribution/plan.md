# Plan

1. Reproduce the current denial with exact Morrow Ink principal/resource/action and the recorded narrow permit, using the actual Cedar evaluator.
2. Add regression cases covering prepublication attribution, missing/unknown/published states, creator scoping, verified contributor ownership, finalizer-only operations and generic writes.
3. Separate attribution from curator-only operations in both ArtStyle policy copies. Preserve the state-machine contract and review invalidation.
4. Run the new cases and existing authorization/contract suites. Demonstrate that restoring the old rule fails the regression.
5. Push a reviewable repair and report exact verification and live deployment limits. No direct live policy change, fake finalizer result or publication claim.
