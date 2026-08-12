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

**Caught by:** a machine. The kernel's own reason, from the committed evidence
at `run/judge-jcs-ledger-8fdc9a3135/layer1.json`, is the load-bearing part:
`verdict: indeterminate`, `spec_resolution: unresolved`, and the evidence gap
"neither the request nor the trajectory named the spec version this run executed
under". The refusal to assemble a judge input — "No trajectory document, so
neither layer-2 input can be assembled" — came from `judge_harness.py:248`, a
study harness that **lives in a session scratchpad and is committed nowhere**.
Quoted here with that caveat rather than as reproducible output: a log premised
on being unreconstructable afterwards should not lean on a tool nobody else can
run. The kernel verdict above is reproducible from the committed artifact; the
harness line is not, until that harness is committed.

**Cost/saved:** a run that looks complete by every ledger measure can be worth
nothing to the study. Fixed on the skill side by stating that a study run must
be captured, not merely minted, and that the capture hooks must be installed
before the session starts.

---

## 2026-08-12 — The "control" run was a pass the caller manufactured

**Corrects two earlier entries in this log.** They were filed separately as
"Layer 1 passed a real driven run" and "Spec pinning is real, not permissive".
They are one run, and together they said the opposite of what the evidence
supports. Both are replaced by this.

**Checked:** whether an agent following the ledger instructions produces a
record the conformance replay accepts — the positive control the log needed.

**Found:** the state machine did its job, and the verdict did not.

What genuinely held: entity `en-019ff76a-c3a6-7563-9868-32089fb44b9c` drove
`BriefReceived → Drafting → SelfReviewed → Submitted`, ten actor rows, one
terminal entity. The submit guard refused the premature
`SubmitDesignLanguages` while the recorded DesignLanguage was still `Draft`,
naming the guard that refused it, and accepted it only once the artifact truly
reached `UnderReview`. That part is a real positive result about the guards.

What does not hold is the `pass`. Two calls were made about **the same session**
`jcs-ledger-8fdc9a3135`:

- the judge harness, supplying no version, got `verdict: indeterminate`,
  `spec_resolution: unresolved`, and could assemble neither layer-2 input;
- a second call in which **I supplied `spec_version` in the request body** got
  `verdict: pass`, `spec_resolution: pinned`, zero violations.

The earlier entries filed the first as a failure and the second as the control,
without noticing they were one run. The `pass` also reported
`ots_decisions_checked: 0` — it walked kernel rows and judged no agent decision
at all — and that zero was quoted in the write-up without being read.

The kernel permits this by design. `resolve_governing_spec`
(`temper-server/src/api/trajectory_analysis.rs:347-370`) refuses a
request-supplied version **only when the trajectory pins a different one**:

```rust
(Some(pinned), Some(requested)) if !declare_same_spec(...) => Err(409),
(Some(pinned), _) => pinned,
(None, Some(requested)) => requested,     // accepted unchallenged
(None, None) => Unresolved,
```

A run with no trajectory has no provenance to contradict the caller, so the
caller's claim becomes the governing version and the report says `pinned`.

**This is also the correction to the pinning entry.** That entry probed with a
*bogus* version, got a correct 409, and concluded the tolerance was
"normalization, not permissiveness… it retires a standing doubt". The 409 comes
from `classify_pin` — a different branch, reached only once a version is already
governing. The permissive branch, `(None, Some(requested))`, was never probed.
The conclusion was drawn from the one case that could not have failed.

**Caught by:** a person — an adversarial reviewer reading this log against the
artifacts it cites (`run/judge-jcs-ledger-8fdc9a3135/layer1.json`,
`http.jsonl`) rather than against its prose. No machine flagged it, because
every individual call answered correctly. The error was in what the two answers
were said to mean.

**Cost/saved:** the study nearly took as its positive control a verdict that
checked zero agent decisions, on a run this same log calls unjudgeable, made to
pass by a value the caller supplied. A log whose stated purpose is that a false
verdict is evidence *against* the method had its clearest counterexample filed
in the positive column.

**Open gap, not yet fixed:** `(None, Some(requested))` lets a caller name the
spec its own unattested run is judged against. Worth deciding whether a
trajectory-less check should be allowed to report `pinned` at all, or whether
the absence of provenance should force `unresolved` regardless of what the
request claims.

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

## 2026-08-12 — Spec pinning is real, not permissive [WITHDRAWN]

**Withdrawn. Superseded by "The 'control' run was a pass the caller
manufactured", which corrects it.** Kept rather than deleted, because a log that
quietly removes its wrong conclusions is not evidence of anything.

The claim was that a request-supplied `spec_version` is genuinely verified,
based on a bogus version being refused with a correct 409. That probe only
exercised `classify_pin`, which runs after a version is already governing. It
never touched `(None, Some(requested))` — the branch where a run with no
trajectory lets the caller name its own governing spec, which is the one that
matters. The conclusion "it retires a standing doubt" was drawn from the single
case that could not have failed.

What the original entry said, for the record:

> **Found:** the tolerance is normalization, not permissiveness. A bogus version
> is refused with 409 and a correct explanation: the run named a spec version that
> is not the registered one, Temper stores one version per entity type, so the
> governing spec is not available to check against and a report against the
> current one would judge the run by rules it never ran under.
>
> **Caught by:** a machine, when deliberately fed a bad value. Nothing was wrong;
> this entry records a check that held.
>
> **Cost/saved:** cheap to test, and it retires a standing doubt. A pinning
> mechanism that accepted anything would make every verdict in this log
> meaningless, so it is worth having probed once rather than assumed.

The last sentence is the one to keep, pointed the other way: a probe that
retires a standing doubt has to hit the branch the doubt is about.

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

A second measurement error from the same session belongs here too. This
investigation reported four contract suites failing on master. It is three.
`test_actor_policy_evaluation` passes — it is the only place the Cedar policies
are evaluated rather than grepped, and by design it fails loudly instead of
skipping when `cedarpy` is missing (`tests/requirements-dev.txt:5-8`,
`test_actor_policy_evaluation.py:32,72`). The comparison that produced the wrong
count ran master in a scratch worktree that was missing the binding too, so both
sides failed identically for a reason that had nothing to do with the code.
Re-run with `cedarpy` installed: 89 tests, **3 failed, 86 passed**, at both
`b0f6fc4d` and this branch. Same shape as the `head` mistake — a harness detail
read as a property of the code — which is why environment parity is not
sufficient evidence that a failure is real.

---

## 2026-08-12 — A red test ran for 18 days and the loop routed around it

**Checked:** why contract suites fail on master. They had been dismissed,
including in this investigation's own handover, as "pre-existing failures on
master".

**Found:** they are not ambient breakage. They are the surviving alarm from a
single destructive commit. `12bc27db` ("chore: reconcile Genesis curation
state", 2026-07-25) is **+138 / −663** across four files, of which
`katagami-curation/agents/curator/skills/synthesize-language/SKILL.md` is
**+100 / −581**. A Genesis reconcile — `rsync -a --delete` under "Genesis
wins" — replaced newer repo work with Genesis's older, smaller copy in one step,
and the sync script reports nothing when a reconcile deletes.

**Eight failures across six files, not three.** The full suite at `origin/master`
with `cedarpy` installed: **8 failed, 450 passed, 4 skipped**. The failures are
`artifact_ready`, `design_md`, `shadcn_export`, `taste_distillation`,
`synthesis_uses_generated_entity_ids`, `thumbnail`, plus
`curator_skills_use_preloaded_json_helper` (a different file) and
`wasm_source_parity` (a stale binary). Earlier drafts of this entry said three,
because they counted only the suites that happened to be in front of them.

The skill's size across the timeline tells it plainly:

| commit | date | bytes | has `DRIVE-TO-REVIEW PHASE` |
|---|---|---|---|
| `6381f29a` in-session self-heal (C1–C5) | 2026-06-22 | 35,449 | yes |
| `12c7e11d` | 2026-07-23 | 31,932 | yes |
| **`12bc27db` Genesis reconcile** | **2026-07-25** | **6,786** | **no** |
| five commits `aa345450` … `38e02174` | 2026-08-12 | 12,037 → 15,657 | no |

Verified by swapping each pre-loss revision into master's tree and running the
full suite:

| skill in tree | bytes | failures |
|---|---|---|
| master | 15,657 | 8 |
| `12c7e11d` | 31,932 | 8 — fixes two, breaks two |
| **`6381f29a`** | **35,449** | **4** |

**`6381f29a` fixes six of the eight.** Six independent contracts — written at
different times, for different concerns — all point at one deletion. That is far
stronger evidence than the three this entry first claimed.

The four that remain are not about the deletion: a stale WASM binary, a test
reading a different file (`immersive-landing/SKILL.md`), and two contracts added
**after** the loss — `synthesis_json_dumps_every_spec_field_in_every_submit_block`
and `synthesis_skill_documents_every_param_the_spec_accepts`, both introduced
2026-08-12 in `0bf7fe5a`, eighteen days later.

So "a straight revert is not the fix" — as an earlier draft put it — is true of
`12c7e11d` and misleading about `6381f29a`. The recovery is a **union**:
`6381f29a`'s content plus master's newer publish contract, which would take the
suite from 8 failures to 2. The red tests are the checklist.

**Caught by:** a machine, correctly, immediately, and continuously for 18 days.
The check was never wrong and never went quiet.

**And it was the second correct signal, not the first.** The reconcile's only
safeguard is a `git add -A` followed by "Review with:
`git diff --cached --stat`". On 2026-07-25 that stat line named the file and the
damage — 681 changed lines against a file of 31,932 bytes, 581 of them
deletions. The warning was produced, at the moment of the loss, and discarded.
Then a second, independent signal fired for the next 18 days and was discarded
too. Two sources, both right, both ignored — which is a stronger claim about the
loop than a single missed alarm would be, and a weaker one about the tooling.

**What failed was the loop.** Humans and agents together read a persistent red
signal as ambient conditions and worked around it. The five commits on
2026-08-12 were partial recovery by people who did not know what had been lost,
each restoring some of the missing text without the causal story. This
investigation did the same thing: it ran the suites, saw identical failures at
`origin/master`, labelled them "pre-existing", and moved on — one bisect short of
the answer.

**Cost/saved:** 18 days of a curator skill running at a fifth of its documented
size, five partial-recovery attempts, and a class of destructive sync that still
reports success while deleting. Found only because someone declined to accept
"pre-existing on master" as an explanation.

**Why this entry matters most.** It cuts against the easy version of the thesis.
The comfortable story is that formal checks catch what humans miss; here the
formal check did its job perfectly and the joint system still lost three weeks,
because a signal that stays red becomes background. **The machine check was not
the weak link — the human-machine loop's handling of a persistent red signal
was.** A verification apparatus is worth what the loop around it does with a
failure that does not go away on its own, and "pre-existing" is the phrase that
turns a finding into furniture.

**Reference:** commit `12bc27db`; ARN-312 carries the full bisect table and
method. No skill content is restored here — recovery is a per-contract decision
for Rita, and PR #199 is open against the same file.
