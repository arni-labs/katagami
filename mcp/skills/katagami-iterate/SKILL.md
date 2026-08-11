---
name: katagami-iterate
description: "Refine an EXISTING Katagami design language together with a human — iteratively, freeform, until they're happy — then submit the result as a descendant. Every step (their critique + your revision + their reaction) is captured as trainable trajectory data, and the start↔final pair becomes an A/B preference. Sibling to katagami-contributor (which synthesizes NEW languages from a brief); this skill REACTS to an existing one. Any harness (Claude Code, Codex, Grok) loads this same file."
---

# Katagami Iterate — human-in-the-loop refinement (any harness)

> This repository is the home of record for the skill. Harness copies (for
> example `~/.claude/skills/katagami-iterate/SKILL.md`) are installs of this
> file and must be re-synced from here after any change.

You refine an **existing** Katagami language *with* a human, one small steered change at a time, until they say they're happy — then submit the result as a **descendant**. This is the loop that produces Katagami's taste-training data: the start↔final **A/B pair**, the full step **trajectory**, and **every critique tied to its change**.

You are NOT synthesizing from a brief here (that's `katagami-contributor`). You are reacting to a real language the human is unhappy with. **Taste comes from the rulebook embedded in `katagami-contributor`'s SKILL — read it and obey it.** This file is the *loop + capture procedure*.

## The one lesson that defines this skill
A one-shot auto-revision **failed** — the human rated every revised descendant *worse than the original*. So:
- **Small, reversible, steered changes.** One critique → the smallest revision that answers it. Never a rewrite.
- **Preserve what works.** Evolve the language; do not replace it. If you're unsure whether something is liked, ask or leave it.
- **The human drives.** You react to their words exactly; you don't impose your own taste over theirs.

## Trajectory capture

This session is training data twice over: as the step log below, and as the
captured agent trajectory the Judged Conformance System replays. Before the
first call, mint two ids and keep them for the whole run:

- `session_id` — the same id §1 asks you to mint (`iter-<lang_id-short>-<n>`).
  One session, one id, start to finish.
- `trajectory_id` — one per captured trajectory. Derive it from the session id,
  so a re-capture lands on the same document rather than a duplicate.

Then:

1. **Send `X-Session-Id` and `X-Intent` on EVERY Temper call.** Every one, not
   just the interesting ones. `X-Session-Id` is what stitches scattered calls
   back into a single trajectory; `X-Intent` is a short plain sentence saying
   what the call was trying to do. A call without them is a hole in the record,
   and the hole stays invisible until someone tries to judge the run.
2. **Run as the role's own agent credential.** Never a human's token, never a
   shared one. A trajectory that cannot be traced to the agent that produced it
   teaches nothing and cannot be governed.
3. **Let the session be captured.** With the Claude Code hooks installed
   (`hooks/trajectory-capture/README.md`) the transcript is converted and posted
   at the next session start. Outside that harness, run
   `scripts/trajectory/claude_session_to_ots.py` yourself and confirm HTTP 201.
4. **Stamp the spec version.** Pass `--spec-version` (or set
   `KATAGAMI_ACTOR_SPEC_VERSION`) to the version of the actor spec this run
   executed under. A verdict is only meaningful against the contract in force
   at the time.

This is in addition to the per-step JSONL in §6, not a replacement for it. The
step log records the human's critique and your answer; the trajectory records
how you got there.

## 0. Identity
Every HTTP call: `$TEMPER_API_URL/tdata`, headers `X-Tenant-Id: default`, `Authorization: Bearer $TEMPER_API_KEY`, `x-temper-principal-kind: agent`, `x-temper-principal-id: <your-contributor-id>`, `x-temper-agent-type: contributor`, plus the `X-Session-Id` and `X-Intent` above. File workspace: `katagami-contrib`. Note which harness you are (`claude-code` / `codex` / `grok`) — it's stamped on every step.

## 1. Open the session
1. The human names the language to refine (or points you at one they're applying to a real page). `GET /tdata/DesignLanguages('<lang_id>')` → its `name`, `tokens`, `imagery_direction`, and the composition file ids (`landing_file_id`, `embodiment_file_id`, `dashboard_file_id`, `design_md_file_id`). Fetch each file's HTML/markdown via `https://katagami.ai/api/file/<file_id>`.
2. **Mint a session id** (e.g. `iter-<lang_id-short>-<n>`; do NOT use wall-clock if your runtime forbids it — a short counter is fine). Decide the **mode**: `A` = you're iterating the language's OWN demo pages; `B` = the human is iterating their REAL page and you distill changes back into the DESIGN.md (see §5).
3. Log the session header (one record) with the step logger (see §6):
   `{"type":"iterate_session","session_id":..,"lang_id":..,"lang_name":..,"mode":"A|B","context":"<what we're refining / applying it to>","agent":..,"started_at":..}`
4. Treat the original's `DESIGN.md` as the **working artifact**. Every language-level change from here on goes INTO it (and the `tokens`) in the moment.

## 2. The loop (repeat until they're happy)
For each round:
1. **Show** the human the current state — render the relevant artifact (landing/embodiment/dashboard) and let them see it. Use full-page rendering; never a hero crop.
2. **They critique** — freeform. It may be a brain-dump touching many things, or a one-line fix. Capture their *exact words*.
3. **You revise** — make the **smallest** change that answers each point. Edit the affected composition(s) AND fold any language-level decision into `DESIGN.md` + `tokens` right then. Page-specific-only edits (Mode B: their hero copy, their routes) stay out of the language. Honor the rulebook.
4. **Re-render and show** the result.
5. **Record the step** — append one record per round (one human message = one step):
   `{"type":"iterate_step","session_id":..,"lang_id":..,"step":N,"surface":"landing|embodiment|dashboard|design_md","critique":"<their verbatim words>","revision":"<what you changed, terse>","before_file_id":"<pre-edit file id>","after_file_id":"<post-edit file id>","reaction":"<their reaction to THIS change, if they gave one>","agent":..,"ts":..,"rulebook_version":..}`
   Upload the before/after composition snapshots as files (so the pair is renderable) — `POST /tdata/Files {workspace_id:"katagami-contrib", path:"/iterate/<session>/step<N>-<surface>-{before,after}.html", mime_type:"text/html"}` → `PUT .../$value`.
6. Keep going. When they say **"happy / ship it / good"** → §4. If they walk away, log `{"type":"iterate_close","outcome":"abandoned",...}` and stop.

**Keep it tight:** don't ask permission for every tiny thing, but don't run ahead either — one round = their critique, your smallest answer, back to them.

## 3. The DESIGN.md is the living artifact
There is no end-of-session "extraction." Because each language-level decision already went into `DESIGN.md` + `tokens` as it happened, by the time they're happy the DESIGN.md **already is** the descendant. The keep-vs-stays call (is this a language rule, or just their page?) is made live, with the human, each round.

## 4. Submit the descendant + finalize
1. **Mode A** — the demo compositions you iterated ARE the artifacts. **Mode B** — the human's real page is NOT shippable as the demo, so REGENERATE the descendant's full artifact set (landing + embodiment + dashboard + thumbnails + art-style/palette pairing + shadcn) from the evolved DESIGN.md, using the `katagami-contributor` build+submit procedure. Either way, give the descendant a fresh name (rulebook §Naming) or keep the parent's with a clear lineage.
2. Submit via the `katagami-contributor` submit flow, with lineage: `parent_ids = ["<original lang_id>"]`, `lineage_type = "revision"` (fall back to `"evolution"` if rejected), `generation_number = parent+1`, `model_provenance` (your model). Land it **UnderReview** — never self-publish; a curator publishes.
   - NOTE (deployment reality): if the `KatagamiCommons.Submit*` composites are absent, author via the granular `Temper.Set*/Attach*/Verify*` actions + `Temper.SubmitForReview`, and set lineage with `Temper.SetLineage`. (Discover with `GET .../DesignLanguages?$select=...` + the entity's `@odata.actions`.)
3. **Finalize the data** — append two closing records:
   - the **A/B pair**: `{"type":"pairwise","session_id":..,"name":<lang>,"dimension":"overall","winner":"B","chosen_id":"<descendant_id>","rejected_id":"<original_id>","note":"final state the human approved after N iterations","rulebook_version":..,"ts":..}`
   - the **close**: `{"type":"iterate_close","session_id":..,"descendant_id":..,"step_count":N,"outcome":"happy","ended_at":..}`

## 5. Mode B (your real page → distill) specifics
- You're editing the human's real project. Capture only the **design-relevant** deltas + their critiques in the step-log — NEVER their whole proprietary codebase.
- Each round, when a fix is a general language rule (font, spacing, token, a rule), write it into the working `DESIGN.md`; when it's page-specific, leave it in their page only.
- On "happy": their page stays in their repo; you regenerate the descendant's full artifact set from the DESIGN.md (§4.1). Those demos are freshly generated → give them a quick read before submit (same two-pass self-critique as the contributor skill) so the descendant doesn't ship wonky.

## 6. The capture format (why this shape)
A step = `{before, critique, after, reaction}` — the **universal atom**. The per-session JSONL is an OTS-shaped trajectory: the session = a trajectory, each step = a turn (critique = user message, revision = the decision, reaction = the evaluator). A downstream exporter turns it into SFT chat-JSONL / DPO pairs / GEPA triplets / GRPO rollouts. **You capture once; you never author in a provider's format.**

The step log is written locally, one JSONL file per session, and folded into the
platform store by the OTS ingest. Local capture is deliberate: it sidesteps two
known traps on the file path — `last_file_id` is a workspace-wide
last-write-wins pointer set only on a successful op, NOT "the file at the path I
asked for", so a blind read after a failed or interleaved create collapses two
paths into one; and the Directories actor can stop under heavy load (ARN-127).
When writing through the backend FS anyway, the correct recipe is
`POST Workspaces('<ws>')/Temper.CreateFile {path,mime_type}` (which IS
get-or-create-by-path), treated as success ONLY if HTTP 2xx **and**
`fields.last_file_path === <path>`; retry on the actor-stop 500; or resolve the
id per path via `Temper.ResolvePath` / `GET /tdata/Files?$filter=Path eq '<path>' and WorkspaceId eq '<ws>'`
(capital `Path`). Hosting before/after composition *snapshots* uses the working
`POST /tdata/Files` path.

## 7. Hand back
Tell the human: the descendant id + `UnderReview` status, the lineage, how many steps the session captured, and where the trajectory lives. The A/B pair + trajectory are now training data; a curator publishes the descendant.
