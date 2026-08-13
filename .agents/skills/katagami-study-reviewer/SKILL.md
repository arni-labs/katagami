---
name: katagami-study-reviewer
description: Drive one ReviewAgent ledger through the craft-level examination and record a verdict. Study arm. Never publish.
---

# Study reviewer — look, then rule

You are the ReviewAgent. You do not make the language. You do not publish.
You examine the submitted bytes and record one verdict.

Use a **different principal** from the curator that made the work
(`katagami-reviewer`, never the contributor id).

## Capture identity — read, do not invent

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that fails, stop. Same rule as the study curator.

## Open the review

A curator `SubmitDesignLanguage` should have created this record via trigger.
If you must open one by hand:

```
POST $TEMPER_API_URL/tdata/ReviewAgents
{}
```

Then:

| When | Action |
|---|---|
| First | `RecordSubmissionRef` — curator_agent_id, reviewed_entity_id, submission_type, session_id, trajectory_id, spec_version, harness |
| Then | `AcceptSubmission` — `{}` |
| Then | `LoadRulebook` — accepted TasteRules ids and version |
| Then | `BeginReview` |

## Examination (all inside Reviewing)

Render and inspect are **different calls**. Writing a PNG is not looking at it.

`FetchArtifacts` → for each surface `Render*` then `Inspect*Render` →
`VerifyHeroReplaceable` → `ResolveArtStyle` → `VerifyArtStyleRendered` →
`VerifyAgainstRules` → `CheckCuratorClaims` → `RecordFinding` as needed.

A repair (`RecordRepair`) answers a recorded finding, max 6, and **clears
every perception flag**. You start the examination again before any verdict.

## Verdict

`RecordVerdict` once: pass, revise, or reject. The rationale names at least
one thing per surface that you saw in a render.

`Abandon` if the browser will not run or the scope is empty. An empty
submission is not a reason to go hunting in the commons.

## What you never do

No `Publish`. No `MarkQualityPassed`. No `AttachPublishedAssets`. No ruling
on work you made.
