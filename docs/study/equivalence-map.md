# Equivalence map

Every inventory item, where it lives in each of the two encodings, and which
judgement layer can decide it.

This exists so the study's two conditions can be shown to describe **the same
behaviors**. If an item appears in one encoding and not the other, the comparison
is measuring coverage rather than approach, and the result means nothing.

- **Inventory:** `docs/study/behavior-inventory.md`
- **Condition A (prose):** `.agents/behaviors/<actor>/BEHAVIOR.md`, in Braintrust's
  Agent Behavior format. Each statement is tagged with its inventory number in an
  HTML comment, so the mapping is checkable line by line.
- **Condition B (formal):** the IOA actor specs and the Cedar policies.

## Layers

| Layer | Who decides | What it can settle |
|---|---|---|
| **1** | The deterministic conformance check — the kernel's `POST /api/conformance/check`, or the offline replay | Anything the recorded run structurally shows: which actions ran, in which order, on which entity, whether a guard held. |
| **2** | The LLM judge, scoped to the actor's own contract | Taste, quality, and whether the reasoning follows from the evidence. |
| **—** | Nobody, automatically | Convention items. A person notices, or nobody does. |

A **policy** item is layer 1 in a specific sense: the platform's authorization
decision is recorded, so a replay can see that a call was refused. It cannot see
a call that was never attempted.

---

## CuratorAgent

| # | Behavior | Condition B (spec / policy) | Condition A (BEHAVIOR.md) | Layer |
|---|---|---|---|---|
| C1 | Records its brief first | `curator_agent.ioa.toml` action `ReceiveBrief` | "Take the brief before starting" | 1 |
| C2 | Cannot draft without a brief | `BeginDrafting` guard `is_true has_brief`; invariant `DraftingRequiresBrief` | same section, Decision | 1 |
| C3 | Making happens while Drafting | `Record*` actions `from = ["Drafting"]` | "Do the making in the open" | 1 |
| C4 | Self-review precedes submission | `SelfReview`; `Submit*` `from = ["SelfReviewed"]` + guard; invariant `SubmittedRequiresSelfReview` | "Review your own work before handing it over" | 1 |
| C5 | Submits at most once | invariant `SubmittedIsFinal` | "Submit once, and only what is ready" | 1 |
| C6 | Only submits a lane it produced | guard `is_true has_<lane>_ids` | same section, Evidence + Decision | 1 |
| C7 | Only submits review-ready artifacts | guard `cross_entity_state` on the artifact type | same section, Evidence | 1 |
| C8 | Names what it submitted | `Submit*` params `submitted_entity_type` | same section, Evidence | 1 |
| C9 | At most ten jobs in flight | `ClaimJob` guard `max_count 10` | "Respect the concurrency budget" | 1 |
| C10 | Releases every job before submitting | `Submit*` guard `max_count jobs_in_flight 1` | same section, Execution + Recovery | 1 |
| C11 | Cannot publish | no `Publish` action in the alphabet | "Never publish" | 1 |
| C12 | Unlisted actions refused | `curator_agent.cedar` enumerated permit | same section, Execution | 1 (policy) |
| C13 | Output event not callable | `CuratorSubmittedEvent` is `kind = "output"`, omitted from permit | same section, Execution | 1 (policy) |
| C14 | Anonymous refused | `curator_agent.cedar` forbid on `anonymous` | same section, Execution | 1 (policy) |
| C15 | Abandons explicitly, finally | action `Abandon`; invariant `AbandonedIsFinal` | "End honestly when you cannot finish" | 1 |
| C16 | Stalls time out | `[[state_timeout]]` ×3 | same section, Recovery | 1 |
| C17 | Records capture identity | `ReceiveBrief` params | "Take the brief before starting", Evidence | 1 |
| C18 | Submitted implies a submission | invariant `SubmittedRequiresSubmission` | "Submit once, and only what is ready" | 1 |
| C19 | Revisions counted, not gated | `RecordDraft` effect `increment` | "Do the making in the open" | 1 |
| C20 | One ownable idea, never generic | `knowledge/rules/design-language.md` 1–2 | "Make work that meets the standard", Intent | 2 |
| C21 | Ships as one coherent set | same, rule 3 | same section, Intent | 2 |
| C22 | Copy is a real product scene | same, rule 4 | same section, Execution | 2 |
| C23 | Naming rules | same, rules 5–9 | same section, Execution | 2 |
| C24 | Look rules | same, rules 10–20 | same section, Execution | 2 |
| C25 | Responsive 390px–2560px | same, rules 21–24 | same section, Execution | 2 |
| C26 | Landing and hero rules | same, rules 25–33 | same section, Execution | 2 |
| C27 | Motion carries meaning | same, rule 34 | same section, Execution | 2 |
| C28 | Self-review has real content | `SelfReview` hint; contributor skill | "Review your own work…", Evidence | — |

Condition B encodes C20–C27 as a rulebook the actor is expected to follow, not as
guards. This is the honest position: they are layer 2 in both conditions. The
difference the study is looking for is whether prose or a state machine does
better on C1–C19, where one of them can actually refuse.

---

## ReviewAgent

| # | Behavior | Condition B (spec / policy) | Condition A (BEHAVIOR.md) | Layer |
|---|---|---|---|---|
| R1 | Records what it reviews first | `review_agent.ioa.toml` action `ReceiveSubmission` | "Take the submission before reviewing it" | 1 |
| R2 | Cannot review what it did not receive | `BeginReview` guard; invariant `ReviewingRequiresSubmission` | same section, Decision | 1 |
| R3 | Findings only while reviewing | `RecordFinding` `from = ["Reviewing"]` | "Look before ruling" | 1 |
| R4 | One verdict, and it ends the review | `RecordVerdict`; invariant `VerdictRecordedIsFinal` | "Rule once…", Decision | 1 |
| R5 | Ruled implies a verdict | invariant `VerdictRecordedRequiresVerdict` | same section, Execution | 1 |
| R6 | Verdict carries rationale and identity | `RecordVerdict` params | same section, Execution | 1 |
| R7 | Contributors never rule | `review_agent.cedar` forbid on contributor | "Never rule on your own work" | 1 (policy) |
| R8 | Named reviewer or pipeline only | `review_agent.cedar` allowlist | same section, Execution | 1 (policy) |
| R9 | Unlisted actions refused; event not callable | `review_agent.cedar` enumerated permit | "Stay inside the role" | 1 (policy) |
| R10 | Anonymous refused | `review_agent.cedar` forbid on `anonymous` | "Never rule on your own work", Execution | 1 (policy) |
| R11 | Abandons explicitly; leaves it unpublishable | action `Abandon`; invariant `AbandonedIsFinal` | "End honestly when you cannot rule" | 1 |
| R12 | Stalls time out | `[[state_timeout]]` ×2 | same section, Recovery | 1 |
| R13 | Records capture identity | `ReceiveSubmission` params | "Take the submission…", Evidence | 1 |
| R14 | Names the run and artifacts in scope | `ReceiveSubmission` params | same section, Evidence | 1 |
| R15 | Findings are specific and actionable | `RecordFinding` hint | "Look before ruling", Execution | 2 |
| R16 | Verdict vocabulary; rationale supports it | `RecordVerdict` hint; `verdict` is a free string | "Rule once…", Execution + Recovery | 2 |

R15 and R16 are the two items this actor most needs and least enforces. A machine
can see that findings exist; only a judge can see that they are true. If prose
does better anywhere, it should be here.

---

## HumanCurator

| # | Behavior | Condition B (spec / policy) | Condition A (BEHAVIOR.md) | Layer |
|---|---|---|---|---|
| H1 | Assignment recorded before pickup | `human_curator.ioa.toml` `AssignSubmission`; `BeginReview` guard; invariant `ReviewingRequiresAssignment` | "Take the assignment before deciding anything" | 1 |
| H2 | Decisions taken while holding it | `Publish`, `ReturnWithCritique` `from = ["Reviewing"]` | "Publish or return — once, and finally" | 1 |
| H3 | Published and returned are final | invariants `PublishedIsFinal`, `ReturnedIsFinal` | same section, Execution | 1 |
| H4 | Machine review ruled, and is linked | `Publish` guards incl. `cross_entity_state … required = true`; invariant `PublishedRequiresReviewVerdict` | "Publish only after the machine review has ruled…", Evidence | 1 |
| H5 | The review reviewed **this** submission | state var `reviewed_submission_ids`; `Publish` hint; `APP.md` | same section, second Evidence | — |
| H6 | Only the named holder decides | `human_curator.cedar` assignee binding | "Only the named holder decides" | 1 (policy) |
| H7 | No agent publishes or returns, by type | `human_curator.cedar` `forbid(principal is Agent, …)` | same section, Execution | 1 (policy) |
| H8 | Undeclared agents get nothing | `human_curator.cedar` forbid unless declared or named | same section, Execution | 1 (policy) |
| H9 | Contributors never touch the record | `human_curator.cedar` contributor forbid | same section, Execution | 1 (policy) |
| H10 | Anonymous refused | `human_curator.cedar` forbid on `anonymous` | same section, Execution | 1 (policy) |
| H11 | Unlisted actions refused; events not callable | `human_curator.cedar` enumerated permit | same section, Execution | 1 (policy) |
| H12 | Return carries a verbatim critique | `ReturnWithCritique` params + guard | "Publish or return…", Execution | 1 |
| H13 | 48h escalation, counted | `[[state_timeout]]` ×2; effect `increment escalation_count` | "When nobody answers" | 1 |
| H14 | Who may escalate | `human_curator.cedar` `ReviewOverdue` allowlist | same section, Execution | 1 (policy) |
| H15 | Who may reassign — never the outgoing holder | `human_curator.cedar` `Reassign` allowlist | same section, Execution | 1 (policy) |
| H16 | Reassignment is a re-route | `Reassign` `to = "SubmissionAssigned"` | same section, Recovery | 1 |
| H17 | Holder reference is a principal id | state var `assignee_ref`; `AssignSubmission` hint | "Take the assignment…", Execution | — |
| H18 | Records capture identity | `AssignSubmission` params | same section, Evidence | 1 |
| H19 | The publish judgement itself | no guard; the design rulebook | "Publish or return…", Decision | 2 |
| H20 | Critique is specific and about the work | `ReturnWithCritique` hint | same section, Execution | 2 |
| H21 | Assignment publish ≠ artifact publish | commons policies; `APP.md` | "Publishing the assignment is not publishing the artifact" | — |
| H22 | Undeclared agents get nothing on artifacts, identity or consent | all seven bounded `katagami-commons/policies/*.cedar` | same section, Execution + Failure modes | 1 (policy) |

---

## Totals

| | Layer 1 | Layer 2 | Convention | Total |
|---|---|---|---|---|
| CuratorAgent | 19 | 8 | 1 | 28 |
| ReviewAgent | 14 | 2 | 0 | 16 |
| HumanCurator | 17 | 2 | 3 | 22 |
| **All** | **50** | **12** | **4** | **66** |

The layer-1 count here (49) is larger than the "machine" count in the inventory
(34) because policy items are layer-1 checkable too: an authorization decision is
recorded, so a replay can see it. The inventory's labels describe *how* a
behavior is enforced; this table describes *who can check it afterwards*. Both
are needed and they are not the same question. The three convention items that
are also layer 2 in spirit (C28, R15, R16 are judgeable; H5, H17, H21, H22 are
not automatically checkable at all) are counted here by what a judge can actually
do with them.

These totals are recomputed from the rows above by
`katagami-curation/tests/test_behavior_inventory_contract.py`.

## What the map is for

Condition A and condition B encode the same 66 behaviors. Where they differ is
what happens when one is violated:

- On a **layer 1** item, condition B refuses the action. Condition A describes the
  rule and relies on the agent following it, then on a judge noticing that it did
  not. The study measures whether the judge notices.
- On a **layer 2** item, neither condition can refuse. Both rely on a judge. The
  study measures whether the judge does better with prose or with a spec slice as
  its reference.
- On a **convention** item, neither refuses and neither is expected to. These are
  where a behavior spec has the clearest advantage: prose can ask for "a specific,
  actionable finding" and a state machine cannot.

A fair comparison reports the three groups separately. An aggregate score over all
66 would mostly measure how many of them happen to be layer 1.
