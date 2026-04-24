# Quality Review Fail-Fast Boundary Verification

Date: 2026-04-24
Repo: `/Users/seshendranalla/Development/katagami`
Branch: `master`

## Scope

- Make `quality_review` fail fast on invalid specs instead of repairing them inline.
- Keep the repair loop for `regenerate_embodiment`.
- Verify the running OpenPaw server loads this exact Katagami checkout through the `os-apps/katagami-curation` symlink.

## Commands

1. `git -C /Users/seshendranalla/Development/katagami remote show origin`
   Result: confirmed `HEAD branch: master`
2. `cargo test --manifest-path /Users/seshendranalla/Development/katagami/katagami-curation/wasm/build_session_message/Cargo.toml --lib -- --nocapture`
   Result: passed (`3` tests)
3. `bash /Users/seshendranalla/Development/katagami/katagami-curation/wasm/build.sh`
   Result: built `build_session_message.wasm`, `finalize_spawned_session.wasm`, and `launch_research.wasm`
4. `readlink /Users/seshendranalla/Development/openpaw-worktrees/full-trace-and-session-perf/os-apps/katagami-curation`
   Result: `/Users/seshendranalla/Development/katagami/katagami-curation`
5. Live OpenPaw server prompt-boundary verification on `http://127.0.0.1:4476`
   - created CurationJob `en-019dbeb6-39ed-77e0-b352-2b04697920ac`
   - submitted `quality_review`
   - observed spawned Session `ss-019dbeb6-3da1-7b22-a114-3f4e334fe424`
   Result: Session `fields.user_message` contained:
   - `## Review Boundary`
   - `Do NOT repair the spec inside this quality_review job.`
   - upstream redirect to `regenerate_embodiment` and `synthesize`
6. Cleanup
   - dispatched `Katagami.Curation.Fail` on the verification job with `error_message="live verification cleanup after prompt-boundary check"`
   Result: verification job moved to `Failed` cleanly

## Notes

- The live prompt proof matters because OpenPaw executes Katagami through the symlinked app path; this confirms the running server was using the patched Katagami `master` checkout rather than the earlier worktree branch.
- The mock-provider session completed by echoing the prompt text, which was sufficient for prompt-boundary verification but not intended as a semantic LLM-quality test.
