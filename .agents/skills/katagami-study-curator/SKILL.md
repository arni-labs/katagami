---
name: katagami-study-curator
description: The skill Claude Code is given for a curator trial. Follow production research-direction and synthesize-language, then mark CuratorAgent. Never publish.
---

# Study curator — this is what a curator trial gets

You are the curator. This file is the only study skill in your context.
Do the work the production skills `research-direction` and
`synthesize-language` already ask for, on the live objects. After each
act, mark it on `CuratorAgent` so the trajectory is the behavior, not
only the side effects.

Do not use `katagami-contributor`. That is the old MCP craft loop.

This phase: **source_search** then **synthesize**. Do not do quality
review. Do not publish. Do not approve a publish.

## Capture identity

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that fails, stop. Put the printed ids on `RecordCapture`.

## Create the ledger

```
POST $TEMPER_API_URL/tdata/CuratorAgents
{}
```

Then `RecordCapture`.

## Research — same acts as research-direction

On the live app: read the query, `temper.web_search`, create
`DesignSources`, `CurationJob.SpawnDirection`, `CompleteResearch`.

A finished search yields **3–5 directions**. Fewer is incomplete.

On the ledger, in that order:

| After you… | Mark |
|---|---|
| Have the running search job and query | `TakeQuery` |
| Have searched | `SearchTheWeb` |
| Have indexed a source | `IndexSources` |
| Have spawned a direction | `DeriveDirections` |
| Have completed the search job | `CompleteResearch` |

You cannot index before you search. You cannot derive before you index.
You cannot complete research with fewer than three directions.

## Synthesize — same acts as synthesize-language

On the live app: read `knowledge/rules/design-language.md` (never list
TasteRule entities), author every named part, render, look, submit.

On the ledger, in that order:

| After you… | Mark |
|---|---|
| Have the running synthesize job and direction | `TakeDirection` |
| Have read design-language.md | `ReadDesignRules` |
| Have authored every named part (one submit call is fine) | `AuthorLanguage` |
| Have rendered them | `RenderSurfaces` |
| Have looked at the landing shots | `LookAtLanding` |
| Have looked at the embodiment shots | `LookAtEmbodiment` |
| Have looked at the dashboard shots | `LookAtDashboard` |
| Have changed bytes after a look | `FixSurfaces` (then render and look again; max 12) |
| The language is UnderReview | `SubmitLanguage` |
| The synthesize job has completed | `CompleteSynthesis` |

Looking is a different act from rendering, and each surface is its own
look. `SubmitLanguage` is refused unless every current look has happened
and the language is already `UnderReview`.

## What you never do

No `Publish`. No `ApprovePublish`. No `CompleteQualityReview`. No
inventing trajectory ids. No listing Accepted TasteRule entities. No
skipping search, sources, a named authoring part, a look, or the
language review gate.
