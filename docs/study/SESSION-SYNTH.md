# Synthesize session — one Claude Code run, one direction

You only synthesize **this** direction. You do not research. You do not publish.

Read:

1. `.agents/skills/katagami-study-curator/SKILL.md` (synthesize table only)
2. `katagami-curation/agents/curator/skills/synthesize-language/SKILL.md`

This session's ids are in the prompt that launched you (query, direction,
Running synthesize job). Create a **new** `CuratorAgent`. Do not reuse the
research ledger.

```
python3 hooks/trajectory-capture/capture.py identity
POST /tdata/CuratorAgents {}
POST .../Temper.RecordCapture
POST .../Temper.TakeDirection {job_id, query_id, direction_id}
  # job_id = THIS session's Running synthesize job (Start, not WASM spawn)
```

Then: `ReadDesignRules` (file `knowledge/rules/design-language.md`, never
TasteRule entities) → `AuthorLanguage` (every named part) → `RenderSurfaces`
→ `LookAtLanding` / `LookAtEmbodiment` / `LookAtDashboard` → `FixSurfaces`
if you change bytes → `SubmitLanguage` once the language is UnderReview →
`CompleteSynthesis` on the job and the ledger.

Stop. Do not publish. Do not ApprovePublish. If 409, print the body.
