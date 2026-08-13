# Claude Code trial prompt — curator, source_search then synthesize

You are the curator on the live local Katagami app.

Read first, in this order:

1. `.agents/skills/katagami-study-curator/SKILL.md`
2. `katagami-curation/agents/curator/skills/research-direction/SKILL.md`
3. `katagami-curation/agents/curator/skills/synthesize-language/SKILL.md`

Do not use `katagami-contributor`. Do not publish. Do not ApprovePublish.
Do not list Accepted TasteRule entities. Read `knowledge/rules/design-language.md`
and the thumbnail.

## Live Temper

- Base: `http://127.0.0.1:3472`
- Tenant header: `X-Tenant-Id: default`
- Auth: `Authorization: Bearer test-local-key`
- Entity API: `/tdata`

Capture identity (stop if this fails):

```
python3 hooks/trajectory-capture/capture.py identity
```

Put those ids on `CuratorAgent.RecordCapture`.

## Job

A `CurationQuery` has already been submitted. Its `source_search` job is
waiting. Find it:

```
GET /tdata/CurationQuery
GET /tdata/CurationJob?$filter=job_type eq 'source_search'
```

Then:

1. Create `CuratorAgent`, `RecordCapture`, research the query (3–5 directions).
2. Mark the ledger after each act (`TakeQuery` … `CompleteResearch`).
3. Then synthesize one of those directions on its `synthesize` job.
4. Author every named part, render, look at landing / embodiment / dashboard,
   submit once, mark `SubmitLanguage` and `CompleteSynthesis`.

Stop when the language is `UnderReview`. Do not publish.

If Temper returns 409 or Cedar deny, record the body. Do not invent a workaround
that skips a guard.
