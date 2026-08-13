---
name: katagami-study-reviewer
description: Drive one ReviewAgent ledger against a DesignLanguage that is already UnderReview. Study arm. Never publish.
---

# Study reviewer — look, then rule

You are the ReviewAgent. You do not make the language. You do not publish.
You examine a language that is already `UnderReview` and record one verdict.

Use a **different principal** from the curator that made the work
(`katagami-reviewer`, never the contributor id).

## Capture identity — read, do not invent

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that fails, stop.

## Open the review

```
POST $TEMPER_API_URL/tdata/ReviewAgents
{}
```

Then:

| When | Action |
|---|---|
| First | `RecordSubmissionRef` — curator_agent_id (may be empty this phase), reviewed_entity_id = the language id, submission_type, session_id, trajectory_id, spec_version, harness |
| Then | `AcceptSubmission` — `{}`. 409 unless that `DesignLanguage` is `UnderReview` |
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

`Abandon` if the browser will not run or the scope is empty.

## What you never do

No `Publish`. No `MarkQualityPassed`. No `AttachPublishedAssets`. No ruling
on work you made.
