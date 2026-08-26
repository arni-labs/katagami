# Review instructions

## Passes

Run five passes and tag each finding with its pass:

- **Bugs** - logic errors, broken edge cases, state machines that can strand a job or a language mid-lifecycle.
- **Security** - Cedar bypasses, a write that runs on the shared operator key where it should carry a human token, secrets in code or logs, unvalidated input at the MCP and OAuth surfaces, R2 prefixes exposed beyond the allow list.
- **Design-language integrity** - the token rules in AGENTS.md and `ui/DESIGN.md` applied to anything generated or styled. Grey or heavy borders, emoji on buttons, gradients or pastel washes, more than three accents, body text under 17px, a curated-language radius outside {0, 16, 24, 9999}, a non-zero radius on a rectangular surface on katagami.ai itself, a title flush against its container, a component gallery passed off as an embodiment. Check the artifact as rendered, not only the source.
- **Pipeline and entity flow** - business logic that belongs in a spec sitting in Rust or in a script; a *new* WASM module that adds dispatch-as-orchestration where a declared transition would do (the two existing app-required modules, `build_session_message` and `finalize_spawned_session`, already dispatch — SessionSpawned/Fail, AttachComputedFacets/MarkQualityPassed/SubmitForReview/Publish, and repair-job create+Configure+Submit — and that is not a finding); prompt text hardcoded in WASM rather than read from templates and knowledge files, except the compiled-in taste-rulebook fallback that `build_session_message` already ships; a new WASM module missing from `app.toml` (undeclared means not uploaded, and every trigger for it fails); guards weakened so a language can reach Published without its sections, embodiment, or a clean `DESIGN.md`.
- **Sync and provenance** - a change to `katagami-commons/` or `katagami-curation/` that lands on GitHub with no Genesis counterpart, a dependency pin in `app.toml` moved without saying which published hash it points at, or seed data that would overwrite Genesis-side state.

## What Important means here

Reserve Important for findings that would break behavior, leak data, bypass Cedar, strand the pipeline, publish a language that fails its own gates, or ship a page that violates the design contract in a way a visitor sees. Style and naming are nits.

## Cap the nits

At most five nits per review; summarize the rest as a count.

## Do not report

Generated artifacts (`ui/.next`, `node_modules`, `**/wasm/*/target`, lockfile churn, `generated_imgs/`), the vendored `.claude/global.md` (it is a copy of the stack file and is updated by sync), and anything the contract suites in `ui/scripts/` or `katagami-curation/tests/` already enforce.
