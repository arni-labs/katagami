# Verification log

A running record of what the formalism actually caught, and whether it earned
its keep.

## What belongs here

Findings about the concept being proven: we built a state machine, we declared
invariants, the machine refused something, an invariant turned out to be wrong,
or we found a flaw in our own logic and changed the machine. A limit of the
formalism counts. So does the verifier being unsound.

**Operational mistakes do not belong here.** A mistyped command, a misread stat
graph, a test run against the wrong subset — those are us being sloppy, not
evidence about formal verification. Keep them out; they dilute the record and
they are not what anyone will come to this file to learn.

Record both directions. A check that caught a real defect is evidence for the
method; a false verdict, or a boundary the spec claims and nothing enforces, is
evidence against it — and those are the entries worth reading. Withdrawing a
conclusion in public belongs here too, because a log that quietly deletes its
wrong answers is not evidence of anything.

One entry per finding: what was being checked, what was found, whether a machine
or a person caught it, what it cost or saved.

## What this log is not evidence of, yet

The entry this study most wants — *Temper flagged an invariant violation on a
real run, so we changed the state machine* — **does not exist here.** Nothing is
wired: no invariant has yet been checked against a governed run doing real work.

What the entries below actually are:

- **two structural gaps**, found by driving the specs by hand — a boundary the
  specs claim that layer 1 cannot express, and a join between ledger and
  trajectory that nothing checks;
- **two cases of the instrument being wrong** — a conformance report that can be
  made to pass by a caller-supplied value, and a checker that produced 81 false
  violations on a clean run;
- **one withdrawn conclusion**, kept in place.

That is worth having, and it is not the same claim. A reader should leave this
file knowing the machinery has been probed and found to have holes — not that it
has been proven to catch things in flight. Every entry so far is a person
driving the machine on purpose; none is the machine catching a real run.

---

## 2026-08-12 — The "control" run was a pass the caller manufactured

**The verification instrument reports `pinned` on a run with no provenance.**
That is the finding: a conformance check can be made to pass by a value the
caller supplies about its own unattested run. It was found because this log
claimed the opposite in two separate entries, both of which were wrong.

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

**Open gap, filed as ARN-325:** `(None, Some(requested))` lets a caller name the
spec its own unattested run is judged against. The fix proposed there is not a
409 — a request-supplied version is legitimately useful for a pre-ingest dry
run, where no trajectory exists yet — but that a trajectory-less check must
report `unresolved` and never `pinned`. The check can still run; what it must
not do is call the result attested.

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
