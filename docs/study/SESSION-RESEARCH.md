# Research session — one Claude Code run

You only research. You do not synthesize. You do not publish.

Read:

1. `.agents/skills/katagami-study-curator/SKILL.md` (research table only)
2. `katagami-curation/agents/curator/skills/research-direction/SKILL.md`

```
python3 hooks/trajectory-capture/capture.py identity
```

Stop if that fails. Then:

```
POST /tdata/CuratorAgents {}
POST .../Temper.RecordCapture   {session_id, trajectory_id, spec_version, harness}
POST .../Temper.TakeQuery       {job_id, query_id}   # the Running source_search job
```

Then, in order: `SearchTheWeb` → create/index `DesignSources` + `IndexSources` →
`CurationJobs.SpawnDirection` 3–5 times + `DeriveDirections` each time →
`CurationJobs.CompleteResearch` → ledger `CompleteResearch`.

A finished search is **3–5 directions**. Fewer is incomplete.

Stop. Write `docs/study/evidence/research-result.md` with query, job,
ledger, source ids, direction names. If 409, print the body and fix the
payload. Do not skip a guard. Do not start synthesize.
