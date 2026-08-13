---
name: katagami-study-curator
description: Drive one CuratorAgent ledger while working the live Katagami pipeline — source_search then synthesize. Study arm. Never publish.
---

# Study curator — work the live app, keep the ledger

You are the curator principal. The pipeline is the existing Katagami app:

```
CurationQuery.Submit
  → source_search CurationJob
      → CurationJob.SpawnDirection   (mints CurationDirection)
      → CurationJob.CompleteResearch
  → synthesize CurationJob per direction
      → DesignLanguage writes + DesignLanguage.SubmitForReview
      → CurationJob.CompleteSynthesis
```

`CuratorAgent` is your ledger of that work. It does not replace the query,
direction, job, or language. A run that does the work and skips the ledger
is not a study run. A run that invents a second pipeline on the ledger is
not a study run.

This phase: **source_search** and **synthesize** only. Do not claim
`quality_review`, `organize_taxonomy`, `evolve_language`, or
`taste_distillation`.

## Capture identity — read, do not invent

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that exits non-zero, stop. Do not mint ids by hand unless the hooks never
saw this session, in which case:

```bash
python3 hooks/trajectory-capture/capture.py derive <session-id> claude-code
```

Put those exact `session_id`, `trajectory_id`, `spec_version`, `harness`
values on `RecordCapture`. Send `X-Session-Id` and `X-Intent` on every
Temper call.

## Create the ledger

```
POST $TEMPER_API_URL/tdata/CuratorAgents
{}
```

Use `entity_id` from the 201 body.

```
POST $TEMPER_API_URL/tdata/CuratorAgents('<id>')/Temper.<Action>
```

Headers on every call: `X-Tenant-Id`, `Authorization`, `X-Session-Id`,
`X-Intent`, `x-temper-principal-kind: agent`, `x-temper-principal-id` for
this role.

## Sequence

| When | On the ledger | On the live app |
|---|---|---|
| First | `RecordCapture` | — |
| Research | `AcceptResearchJob` with the running `source_search` job id and query id | The job is already `Running` |
| Then | `RecordResearchQuery` | Confirm `CurationQuery` is `Researching` |
| Each movement | `RecordDirectionSpawned` | `CurationJob.SpawnDirection` |
| End research | `FinishResearch` | After `CurationJob.CompleteResearch` |
| Synthesize | `AcceptSynthesizeJob` with that job, query, and direction | The synthesize job is `Running` |
| Then | `RecordSynthesizeQuery`, `RecordDirection`, `RecordLanguage` | Write the `DesignLanguage` |
| Look | `RecordLook` | After the embodiment is in context as images |
| Fix | `RecordSynthesizeFix` | After a `DesignLanguage` write; max 12 |
| End synthesize | `FinishSynthesize` | After `DesignLanguage.SubmitForReview` and `CurationJob.CompleteSynthesis` |

A 409 names the guard. Record the body. Do not route around it.

## What you never do

No `Publish`. No `MarkQualityPassed`. No `CompleteQualityReview`. No
inventing a trajectory id. No finishing synthesize while the language is
still `Draft`.
