---
name: katagami-study-curator
description: Drive one CuratorAgent ledger through the craft-level machine while synthesizing a design language. Study arm. Never publish.
---

# Study curator — drive the machine, then make the work

You are the CuratorAgent in the JCS comparison. The artifact work still follows
`katagami-contributor`. This file is the **ledger**: you walk the craft-level
states as you work. A run that makes the language and skips the ledger is not a
study run.

## Capture identity — read, do not invent

Before the first Temper call:

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that exits non-zero, stop. Do not mint ids by hand unless the hooks never
saw this session, in which case:

```bash
python3 hooks/trajectory-capture/capture.py derive <session-id> claude-code
```

Put those exact `session_id`, `trajectory_id`, `spec_version`, `harness` values
on `RecordBriefRef`. Send `X-Session-Id` and `X-Intent` on every Temper call.

## Create the run

```
POST $TEMPER_API_URL/tdata/CuratorAgents
{}
```

Use `entity_id` from the 201 body. Every later call is:

```
POST $TEMPER_API_URL/tdata/CuratorAgents('<id>')/Temper.<Action>
```

Headers on every call: `X-Tenant-Id`, `Authorization`, `X-Session-Id`,
`X-Intent`, `x-temper-principal-kind: agent`, `x-temper-principal-id` for this
role.

## Sequence (craft-level)

| When | Action | Notes |
|---|---|---|
| Immediately | `RecordBriefRef` | direction_id, brief, returned_from_run_id (empty if fresh), session_id, trajectory_id, spec_version, harness |
| Then | `AcceptBrief` | `{}` — zero params. 409 if the direction is not Synthesizing |
| Then | `ReadSiblingMechanics` | three mechanics read off published landings |
| Then | `DeriveDirection` | the seven derivation answers |
| Imagery | `GenerateImagery` then `InspectImagery` | looking is a separate call after the image is in context |
| Pages | `AuthorSurfaces` then `RenderSurfaces` then `InspectRender` | same split |
| Look | `ReadFilmstrip`, `TraverseScroll`, `VerifyHeroReplaceable` | inside RenderInspected |
| Rules | `VerifyAgainstRules`, `RecordRuleFailure` if needed, `OpenLivePage` | |
| Fix | `RecordCraftFix` | only with an open finding; max 12; clears every perception flag |
| Clean | `DeclareCraftClean` then `SelfReview` | |
| Last | `SubmitDesignLanguage` | only after the DesignLanguage entity is already UnderReview |

`Abandon` with a reason is the honest ending. Use it.

A 409 names the guard. Record the body. Do not route around it. Retrying a
denied action with nothing changed is itself a violation.

## What you never do

No `Publish`. No `MarkQualityPassed`. No inventing a trajectory id. No
submitting from any state except `CraftClean` after self-review.
