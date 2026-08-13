# Where to review (do not wait — the trial keeps running)

Shareable status (what ran, what did not): [JCS.md](JCS.md) · [on GitHub](https://github.com/arni-labs/katagami/blob/grok/jcs-study-setup/docs/study/JCS.md)

## Contract

| What | Link |
|---|---|
| Machines + BEHAVIOR + skills in one page | [http://127.0.0.1:8765/docs/study/review.html](http://127.0.0.1:8765/docs/study/review.html) |
| Curator machine | `katagami-curation/specs/curator_agent.ioa.toml` |
| Review machine | `katagami-curation/specs/review_agent.ioa.toml` |
| Human machine | `katagami-curation/specs/human_curator.ioa.toml` |
| Curator BEHAVIOR | `.agents/behaviors/curator-agent/BEHAVIOR.md` |
| Review BEHAVIOR | `.agents/behaviors/review-agent/BEHAVIOR.md` |
| Human BEHAVIOR | `.agents/behaviors/human-curator/BEHAVIOR.md` |
| Inventory | `docs/study/behavior-inventory.md` |
| Decisions | `docs/study/DECISIONS.md` |
| Temper findings | `docs/study/verification-log.md` |
| Judge prompt | `docs/study/JUDGE.md` |
| PR | https://github.com/arni-labs/katagami/pull/213 |

## What Claude is given in a trial

- **Research session (one CC run):** `docs/study/SESSION-RESEARCH.md` + production `research-direction`. New ledger. Stop at CompleteResearch.
- **Synthesize session (one CC run per direction):** `docs/study/SESSION-SYNTH.md` + production `synthesize-language`. New ledger. Stop at UnderReview.
- **Review:** `.agents/skills/katagami-study-reviewer/SKILL.md` (no production equivalent).
- **Human:** you. No skill unless Claude is pretending to be you.
- **Judge:** `docs/study/JUDGE.md` — each session, both arms (BEHAVIOR.md and the machine).

## Publish

Human `ApprovePublish`, then human or a declared non-contributor agent may `Publish`.
Cedar: `katagami-curation/specs/policies/human_curator.cedar` — no Agent may
`ApprovePublish`; `Publish` only after `has_publish_approval`.

## Live server (do not use :3470 / :3468)

`--app` and `--specs-dir` verify. They do **not** register OData entity sets.
The live recipe is:

1. Isolated `temper serve` (fresh file DB, no `--app`).
2. `POST /api/specs/load-dir` for commons, then curation.
3. Create `CurationQuery` → `Configure` → `Submit` (that trigger mints the
   `source_search` job).

Study server: **http://127.0.0.1:3472** tenant `default`.
Evidence of load-dir: `docs/study/evidence/load-dir-*.txt`.

`load-dir` **replaces** the tenant entity-set map unless you pass `"merge": true`.
A second load-dir without merge wiped commons (no DesignLanguages). Restore with
merge. Live ids: `docs/study/evidence/live-ids-3472.txt`.

`CurationQuery.Submit` triggers WASM `build_session_message` (needs the module
uploaded *and* `llm_model` in the vault). The study job used
`CurationJob.Configure` + `Start` instead — Start is "execute without session
spawning." That is how Claude drives the job.

## Judge

Prompt: `docs/study/JUDGE.md`.
Fold: `python3 scripts/trajectory/judge_both_arms.py --prose prose.json --machine machine.json`.
