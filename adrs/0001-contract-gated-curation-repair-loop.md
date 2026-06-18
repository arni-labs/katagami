# ADR-0001: Contract-Gated Curation Repair Loop

## Status

Accepted

## Context

Katagami curation jobs produce multiple durable artifacts: DesignLanguage
entities, thumbnails, embodiments, DESIGN.md projections, shadcn/ui exports,
component recipes, preview shots, review metadata, and taxonomy updates. The
old typed completion path mixed two concerns:

- agent behavior: ask the agent to remember which artifacts and actions to
  produce;
- system guarantees: ensure the artifacts actually exist and are valid before
  the pipeline advances.

That allowed brittle states where a typed completion action could create
follow-up jobs or advance a parent query before `finalize_spawned_session`
validated the artifacts. When an agent missed a thumbnail, emitted invalid
image bytes, forgot `design_language_ids`, or produced incomplete shadcn
artifacts, the system could fail, duplicate work, or continue from the wrong
state.

## Decision

Typed completion actions are completion attempts, not success claims. They may
move a CurationJob from `Running` to `Finalizing` and invoke the finalizer, but
they must not directly create follow-up jobs or advance parent queries.

`finalize_spawned_session` is the authoritative contract gate for typed jobs:

1. Validate the machine-readable contract for the current job type.
2. If the contract passes, emit the validated internal completion action
   (`PublishResearchCompletion`, `PublishSynthesisCompletion`,
   `PublishOrganizationCompletion`, or `FinalizeCompletion`).
3. If repairable defects remain, emit `RepairRequired` with exact defects,
   existing artifact IDs, and retry metadata.
4. `RepairRequired` re-enters the same CurationJob through `Ready` and
   `build_session_message` so the next agent turn repairs the same partial
   artifacts instead of creating duplicates.
5. If repair attempts are exhausted, fail the job and propagate failure through
   the existing finalizer failure path.

The parent query only advances after validated internal actions. Publish only
happens after deterministic validation of the publish contract.

## Consequences

- Agent prompts still guide behavior, but prompts are no longer the guarantee.
- Missing thumbnails, invalid image bytes, missing `design_language_ids`, and
  missing shadcn artifacts become explicit defects in the next same-job turn.
- Existing partial DesignLanguage IDs are passed back to the agent, making
  duplicate creation a violation of the repair contract.
- Follow-up creation that needs dedupe remains inside the finalizer; single
  target state transitions remain visible as validator-gated internal actions.
- The pipeline becomes patient and self-healing: incomplete work loops until
  valid or explicitly exhausted.
