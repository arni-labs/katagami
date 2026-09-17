# Smaller art-style proof sets

An art-style submission tests exactly two distinct image models. Each model uses
the same one or two sources with the same canonical aesthetic prompt. There are
therefore two or four unique outputs, each independently scored and bound to real
locked source/output hashes. A two-case set uses distinct semantic roles and source
media. Role vocabulary remains person, animal/living subject, object/still life,
and landscape/environment; this is a selection vocabulary rather than a mandatory
four-image checklist. Scenes can naturally contain more than one kind of subject.

Choose subjects and compositions for the specific style. Do not import a recurring
house fixture quartet into new contributions. Existing historical evidence remains
stored; this change governs new verification without rewriting published records.

All existing prompt, rights, independent evaluator, per-case score, source identity,
manifest equality and immutable-file verification checks remain enforced.

Verify valid one- and two-case submissions plus malformed counts, asymmetric sets,
duplicate models/files/sources, changed prompts/hashes, and below-threshold images.
Exercise the real local submission/finalization path before production deployment.

The authenticated contribution path must work under the deployed contributor
policy. New ArtStyle records bind creator identity to the verified human at
creation. Imports wait for Locked before returning their immutable hashes.
SubmitArtStyle authors the Draft and triggers an engine-owned CurationJob;
contributors cannot create jobs, read the internal queue, attest reviews, or
publish. The job records its own ID on the source ArtStyle through a curator-only
action. The MCP reports VerificationQueued only after that ID appears. Rejection
and publication still belong to the existing finalizer's evidence checks.

The CLI and discovery documents advertise the deployed contribution service.
Agents can import local images, submit one complete JSON payload, and inspect
submission status without constructing Temper calls or supplying operator keys.
