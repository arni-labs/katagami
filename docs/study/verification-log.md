# Verification log

A running record of what formal verification and conformance checking actually
caught, and whether the formalism earned its keep.

This log is evidence for the joint-cognitive-system thesis. The claim under test
is that a machine-checked contract catches things prose review does not, and the
only honest way to support or refute that is to write down what happened at the
time. It cannot be reconstructed afterwards: once a bug is fixed, nobody can
tell from the code whether a human noticed it, a guard refused it, or it sat
there for a month.

Record both directions. A check that caught a real defect is evidence for the
method; a check that produced a false verdict, or a boundary the spec claimed
and the policy did not enforce, is evidence against it, and those entries are
the ones that make the log worth reading. Failures of the method are not
embarrassments to be tidied up later.

One entry per finding. Say what was being checked, what was found, whether a
machine or a person caught it, and what it cost or saved.

---

## 2026-08-12 — The ownership boundary is convention, not enforcement

**Checked:** whether the contributor lane's stated boundary — contributors
author, the finalizer verifies and publishes — is enforced by policy or only
stated in the skill.

**Found:** only stated. `katagami-contributor` calling `SubmitForReview` on a
DesignLanguage gets **409 `ActionFailed`** (a state-machine guard refusing the
transition on its merits), not **403 `AuthorizationDenied`**. Cedar never
objects to the caller. The skill says "Do not call `SubmitForReview`,
`AttachArtStyleReview`, `MarkQualityPassed`, or `Publish`", and nothing stops a
contributor that does. The run it produces then passes conformance with zero
violations, because layer 1 replays governed transitions against the actor spec
and a `SubmitForReview` on a different entity is not one of `CuratorAgent`'s
transitions. A boundary-violating run and a clean one are indistinguishable in
the report.

**Caught by:** a person, by driving the spec rather than reading it. Nothing in
the cascade flags it, because it is not a contradiction inside any one spec —
the specs are individually consistent, and the boundary lives in the gap
between them.

**Cost/saved:** found before the study ran. Had it not been, the study would
have reported that agents respect the ownership boundary, when what it actually
measured was that agents happened not to test it.

**Open question this raises:** an actor spec constrains what an actor does to
its own entity. The claim being made here is about what it may do to *other*
entities. Layer 1 as built cannot express that, so either the policy has to
carry it or the conformance model has to grow a notion of cross-entity
authority.

---

## 2026-08-12 — Ledger and trajectory are joined only by a session id

**Checked:** whether driving the `CuratorAgent` ledger end to end is sufficient
to produce a judgeable run.

**Found:** it is not. The ledger entity and the trajectory document are joined
only by the session id, and nothing at ledger-write time checks that a
trajectory exists or ever will. A run drove all ten ledger actions to the
terminal `Submitted` state and still produced `verdict: indeterminate`,
`spec_resolution: unresolved`, with neither layer-2 input assemblable — because
no transcript had been converted under that session id. The `spec_version` the
skill has the agent write onto `ReceiveBrief` does not help: the judge reads the
version off the trajectory, not off the ledger.

**Caught by:** a machine, and it reported the reason precisely — "neither the
request nor the trajectory named the spec version this run executed under" and
"No trajectory document, so neither layer-2 input can be assembled." The harness
declined to emit a judge input rather than emitting an empty one, which is what
made the gap visible instead of producing a confidently empty verdict.

**Cost/saved:** a run that looks complete by every ledger measure can be worth
nothing to the study. Fixed on the skill side by stating that a study run must
be captured, not merely minted, and that the capture hooks must be installed
before the session starts.

---

## 2026-08-12 — Layer 1 passed a real driven run

**Checked:** whether an agent following the ledger instructions produces a
record that the conformance replay accepts. The positive case.

**Found:** it does. Entity `en-019ff76a-c3a6-7563-9868-32089fb44b9c`,
`BriefReceived → Drafting → SelfReviewed → Submitted`, ten actor rows, zero
violations, `evidence_complete: true`, one terminal entity. The submit guard
also did its job on the way: the first `SubmitDesignLanguages` was refused
because the recorded DesignLanguage was still `Draft`, and the 409 named the
guard that refused it (`cross_entity_state on 'design_language_ids' requires
DesignLanguage status in [UnderReview,Published]`). It passed only after the
artifact genuinely reached `UnderReview`.

**Caught by:** a machine, in both directions — it refused the premature submit
and accepted the legitimate one.

**Cost/saved:** this is the control. Without a known-good run, a later failure
cannot be attributed to the run rather than the checker. Worth recording as
carefully as the failures.

---

## 2026-08-12 — Conformance produced 81 false violations on a clean run

**Checked:** conformance replay against a real 72-step Claude Code session.

**Found:** the checker was wrong, not the run. It classifies an OTS decision by
`choice.action`, reading a bare token as a governed action name. The converter
was writing the raw Claude Code tool name there, so `Bash`, `Read`, `Write`,
`Edit`, `Agent`, `ToolSearch` and every `mcp__*` tool claimed to be a
`CuratorAgent` action. A run whose governed transitions walked clean — three
actor rows, `evidence_complete: true`, no evidence gaps — still returned `fail`
with **81 `unknown_action` violations**, one per tool call. No Claude Code run
could pass layer 1, however conformant it actually was. After the fix, the same
run against the same transcript returned `pass`, zero violations, with those 81
decisions counted as harness tool use.

**Caught by:** a person, noticing that a run known to be good was failing. The
machine was confidently and uniformly wrong, which is the failure mode worth
watching for: it did not report uncertainty, it reported 81 specific violations.

**Cost/saved:** had this shipped, every study run would have failed layer 1 and
the obvious reading would have been that agents do not follow their specs. A
formalism that is wrong in a systematic direction manufactures exactly the
result it was built to test for.

**Reference:** commit `f13cf0ec`, "fix(trajectory): write harness tool calls as
envelopes, not governed actions (ARN-296)".

---

## 2026-08-12 — Spec pinning is real, not permissive

**Checked:** whether `spec_version` on a conformance request is genuinely
verified, or accepted as decoration. Prompted by a cosmetic mismatch —
`spec_version.py` prints `sha256:<hex>` while the reports show bare hex, and
both forms were accepted and both reported `spec_resolution: pinned`.

**Found:** the tolerance is normalization, not permissiveness. A bogus version
is refused with 409 and a correct explanation: the run named a spec version that
is not the registered one, Temper stores one version per entity type, so the
governing spec is not available to check against and a report against the
current one would judge the run by rules it never ran under.

**Caught by:** a machine, when deliberately fed a bad value. Nothing was wrong;
this entry records a check that held.

**Cost/saved:** cheap to test, and it retires a standing doubt. A pinning
mechanism that accepted anything would make every verdict in this log
meaningless, so it is worth having probed once rather than assumed.

---

## 2026-08-12 — A reported defect that was a measurement error

**Checked:** the claim, from an earlier session of this same investigation, that
`capture.py identity` exits 0 when it cannot find an identity — which would let
a wrapper capture the error text as a session id.

**Found:** false. It exits 1 with the message on stderr and an empty stdout. The
original test ran the command through `... 2>&1 | head -20` and then read `$?`,
which is the exit status of `head`, not of the command.

**Caught by:** a person, by reading the source before changing it. The mistake
was made twice in one session — the same pipe-swallows-exit-status error
recurred while testing the fix — and was caught the second time only because
the first had just been found.

**Cost/saved:** no spurious change was made to code that was already correct. It
is recorded because the study's credibility rests on the accuracy of reports
like these, and an agent's own measurement is a source that needs checking like
any other. The real defect in that area was different and is fixed separately:
the fallback guidance told agents to pass `--trajectory-id`, which the converter
derives on its own, and overriding it is how the two ids come to disagree.
