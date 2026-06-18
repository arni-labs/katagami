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
3. If a defect is deterministic and recoverable from durable state, repair it
   inside the finalizer first, then reload and revalidate the same artifact IDs.
   Example: a thumbnail `File` in `Created` with inline base64 image content is
   decoded and streamed back through `Files('<id>')/$value` so the same File can
   reach `Ready` without creating a duplicate.
4. If a synthesis attempt produced a partial `DesignLanguage`, the finalizer
   must repair that same entity before reporting durable defects whenever the
   missing pieces are derivable from the partial state. It dispatches existing
   `DesignLanguages` actions (`SetSpec`, `AttachEmbodiment`,
   `AttachThumbnail`) with deterministic projections, reloads the same
   `DesignLanguage` ID, then runs the normal validator. This may create or
   update deterministic `File` artifacts at stable paths, but it must not
   create a replacement `DesignLanguage`.
5. If repairable defects remain, emit `RepairRequired` with exact defects,
   existing artifact IDs, and retry metadata.
6. `RepairRequired` re-enters the same CurationJob through `Ready` and
   `build_session_message` so the next agent turn repairs the same partial
   artifacts instead of creating duplicates.
7. If repair attempts are exhausted, fail the job and propagate failure through
   the existing finalizer failure path.

The parent query only advances after validated internal actions. Publish only
happens after deterministic validation of the publish contract.

## Consequences

- Agent prompts still guide behavior, but prompts are no longer the guarantee.
- Missing thumbnails, invalid image bytes, missing `design_language_ids`, and
  missing shadcn artifacts become explicit defects when the finalizer cannot
  repair them deterministically from durable state first.
- Existing partial DesignLanguage IDs are passed back to the agent, making
  duplicate creation a violation of the repair contract.
- Partial synthesis outputs with usable identity fields no longer dead-end
  solely because first-class spec sections, embodiment files, or thumbnail
  files were omitted by the agent.
- Follow-up creation that needs dedupe remains inside the finalizer; single
  target state transitions remain visible as validator-gated internal actions.
- The pipeline becomes patient and self-healing: incomplete work loops until
  valid or explicitly exhausted.
