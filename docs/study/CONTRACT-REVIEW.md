# Behavior contract — morning review

This is the only document that needs your judgment. Everything else from
last night is setup. Decisions I took are in `DECISIONS.md`.

PR: https://github.com/arni-labs/katagami/pull/213

## What you are reviewing

1. **Machines**
   - `katagami-curation/specs/curator_agent.ioa.toml` — craft loop, 10 states
   - `katagami-curation/specs/review_agent.ioa.toml` — examination inside Reviewing
   - `katagami-curation/specs/human_curator.ioa.toml` — publish seat, escalation ≤ 3
2. **Prose**
   - `.agents/behaviors/curator-agent/BEHAVIOR.md`
   - `.agents/behaviors/review-agent/BEHAVIOR.md`
   - `.agents/behaviors/human-curator/BEHAVIOR.md` (rewritten to the same style)
3. **Instructions the study agent is given**
   - `.agents/skills/katagami-study-curator/SKILL.md`
   - `.agents/skills/katagami-study-reviewer/SKILL.md`
4. **Inventory + join** — `behavior-inventory.md`, `equivalence-map.md`
5. **Invariants and liveness** — listed below

## Bounds I set (D1)

| Loop | Bound | Why |
|---|---|---|
| Human escalation / reassign | **3** | After 3, the assignment stops circulating |
| Curator `revision_rounds` | **12** | 3 look-fix cycles is too few for 3 surfaces × 4 breakpoints |
| Reviewer `repair_rounds` | **6** | Same reason, smaller loop |

Overrule any of these by changing the number.

## Prose-arm exemptions (D2)

Scored on the machine only: **C7, C9, C17, R13**.
C19 is **not** exempt — it now gates at 12.

## Invariants (proposed, already in the specs)

**Keep / already declared on the craft machines**

Curator: `FixInvalidatesPerception`, `ConcurrencyCapHolds`, `RevisionLoopBounded`,
`SubmittedHoldsNoWork`, `SubmittedRequiresSelfReview`, `CraftCleanHasNoOpenFindings`,
`SubmittedIsFinal`, `AbandonedIsFinal`.

Review: `InspectionRequiresRender`, `PerceptionRequiresCurrentBytes`,
`JudgementRequiresInspection`, `RepairLoopBounded`, seven `VerdictRequires*`,
`ReviewingRequiresSubmissionAndRulebook`, `VerdictRecordedIsFinal`, `AbandonedIsFinal`.

Human: `ReviewingRequiresAssignment`, `PublishedRequiresReviewVerdict`,
`PublishedIsFinal`, `ReturnedIsFinal`, **`EscalationLoopBounded`** (added tonight).

**Liveness (one ReachesState each — the checker merges them)**

- Curator: `RunEventuallyTerminal` → Submitted | Abandoned
- Review: `EveryReviewEventuallyRules` → VerdictRecorded | Abandoned
- Human: `AssignmentEventuallyResolved` → Published | ReturnedWithCritique | Escalated

## What I already proved locally (you do not need to re-run)

- `temper verify` (12 Aug binary, not the March CLI): CuratorAgent, ReviewAgent,
  HumanCurator **L0–L3 all pass**.
- Composite Curator×Review: 107,053 states, **INCOMPLETE** at the shipped budget.
  Known. Not a contract issue.
- 84 contract tests pass (inventory join, actor shape, wasm no-drive).
- Live Temper on `:3468` loaded both spec dirs. Creating a `CuratorAgent` and
  calling `SubmitDesignLanguage` from `BriefReceived` returned **HTTP 409**
  `Action 'SubmitDesignLanguage' not valid from state 'BriefReceived'`. That
  refusal is in `/tmp/jcs-smoke-refusal.json`.

## What is still not done (named residuals)

- Temper kernel composite-scoping (cross-entity guards are still free booleans).
- Kernel does not write a denied call onto the **entity** event log. The study
  judges the **Claude Code / harness transcript**, where the 409 is visible.
- No scored study run yet. No deploy. No Genesis sync. Linear not updated.
- Cedar policy evaluation tests need `cedarpy` in a venv; one leftover
  `RecordDraft` name was updated. Re-run in `/tmp/jcs-venv` if you want that suite.
- Production still auto-publishes until #210 is deployed. Local study Temper
  is a fresh DB with the no-drive WASM from this branch.

## How to say yes / no

- **Yes** — the machines, the three docs, the two skills, the bounds, and the
  invariant/liveness list are the contract. The comparison can be run.
- **Change X** — write on this file or on the PR. I will not start scored
  runs until you do.
