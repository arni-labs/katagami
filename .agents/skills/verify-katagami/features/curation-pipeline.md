# Curation pipeline

## Sub-features
`CurationQuery` (the end-to-end tracker), `CurationDirection` fan-out, `CurationJob` (Queued, Ready, Running, Finalizing, Completed), `CurationJobTemplate` routing, and the two WASM modules `build_session_message` and `finalize_spawned_session`. Job types: source_search, synthesize, synthesize_palette, synthesize_art_style, quality_review, organize_taxonomy, evolve_language, regenerate_embodiment, taste_distillation.

## How to get to it (user POV)
An operator submits one research direction and gets N complete, published design languages out. Everything between is automatic.

## Driving it
Submitting a query is the entry point:

```bash
H='Authorization: Bearer test-local-key'; T='X-Tenant-Id: default'
curl -s -X POST -H "$H" -H "$T" -H 'Content-Type: application/json' \
  "http://localhost:3499/tdata/CurationQuerys('$QID')/KatagamiCuration.Submit" -d '{...}'
curl -s -H "$H" -H "$T" "http://localhost:3499/tdata/CurationJobs" | python3 -m json.tool
```
Read the entities back and watch the states move. Without an agent runtime the jobs stop at Ready, which is still a real check: the query fanned out into directions and the right job type was created from the template.

## What proves it
`CurationQuery.Submit` created a `source_search` job through the inline entity trigger, the job's `job_type` matches the template that routed it, and the state machine moved rather than the dispatch merely returning 200. For a full run, a language reaches Published with all five spec sections, an embodiment, and a clean `DESIGN.md`; `SubmitForReview` has guards, so a language that skipped a step cannot get there.

## Gotchas
This is the part of the map that needs live credentials. A real end-to-end run needs the temperpaw agent runtime, Modal sandboxes, and an LLM provider; `run-local.sh` provisions none of them, so treat anything past job creation as verified-unreachable locally and verify it on the deployed stack. A new WASM module must be declared in `katagami-curation/app.toml` under `[[wasm_modules]]` or the installer never uploads it and every trigger fails with "WASM module not found". Prompt text belongs in templates and knowledge files read from TemperFS at runtime; the documented exception is `build_session_message` inlining `knowledge/rules/design-language.md` (`lib.rs:989-1036`) because TasteRule entities must not be loaded. `synthesize-language/SKILL.md:22` obeys that inlined rulebook. `katagami-curation/tests/test_no_hardcoded_prompts_in_wasm.py` still forbids other compiled-in prompt bodies. Batch jobs run at most 10 concurrent. Both declared WASM modules dispatch (SessionSpawned / Fail / SubmitForReview / Publish / repair-job Configure+Submit); that is the pipeline, not a verification failure.
