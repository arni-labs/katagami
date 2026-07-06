# 002 — Agent front door: full tree ARN-150→155 (2026-07-04)

Repo: katagami · worktree: katagami-worktrees/claude-agent-front-door · branch: claude/agent-front-door (from master d934992)
Effort: ARN-95 epic build-out. One draft PR for this repo, opened at first change. Genesis is source of truth; publish there after GitHub merge.
Decisions locked: full OAuth 2.1 day one · MCP = thin adapter service on Railway (mcp.katagami.ai), retires into ARN-163 · self-serve humans, consent-as-activation · PR #88 folded then closed.

## What we are addressing
External agents (and humans) cannot contribute to Katagami without per-session discovery of a 3-credential/14-call contract, there is no linkage between an agent and the human who owns its work, and Katagami is invisible to agent-side discovery (integrations.sh, MCP registry). Production commons has also drifted from the repo specs (Submit* composites 409).

## Expected end state
From a clean agent session with only `mcp.katagami.ai`: OAuth via Google → consent → pull/remix/submit lands UnderReview attributed to the owning human; `npx katagami` does the same from a terminal; the human sees/withdraws submissions on katagami.ai; curator reviews in one lane; katagami.ai listed on integrations.sh + official MCP registry. All verified live in production.

## Phases (tasks #1–#7)
1. **0a — Reconcile PR #88 specs into master** (ARN-150): Submit* composites, Direction entity, Cedar policy; correct the native-JSON-array list-field defect; reconcile with af35c65 (SetCredits/SetModelProvenance/Verify*-removal already on master).
2. **0b — Redeploy commons + root-cause drift** (ARN-150): Genesis publish → curation app.toml pin → re-publish curation → both TEMPERPAW_GENESIS_BOOTSTRAP_REFS pins → railway redeploy (Rita may be needed for Codex re-auth). Verify composites live. Write causal story for the regression.
3. **1 — Identity** (ARN-151): Member entity (minimal), AS endpoints on katagami.ai (authorize+consent/token/DCR/JWKS, jose+PKCE, Google upstream), grants + "Agents & access" page, dual-identity tokens (human sub + agent client), contributor principal derivation, Cedar contributor permit set replacing open-permit stubs. Headless: pre-authorized grant (must transfer to ARN-163).
4. **2a — MCP adapter** (ARN-152): TS + official SDK, Streamable HTTP, RFC 9728 PRM, new Railway service, tools search/get/remix/submit_*/status/whoami over one contribution lib.
5. **2b — CLI** (ARN-153): npx katagami login/whoami/pull/remix/submit/status over the same lib; local validation mirrors server gates.
6. **3 — Agency surface** (ARN-154): my-submissions (preview/withdraw), curator lane, draft-tolerant previews, bidirectional lineage.
7. **4 — Discovery** (ARN-155): well-known files on katagami.ai, integrations.sh mapping run, MCP registry server.json under verified namespace.

## Verification per phase
Live e2e against production before marking any phase done; Datadog for prod diagnosis; evidence (links, commands, entity ids) recorded on the Linear issues.

## Instance Log
- 2026-07-04 claude/agent-front-door (Claude Code): claimed phases 0a→4, starting 0a.
