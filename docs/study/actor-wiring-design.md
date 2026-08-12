# Wiring the three actor specs into one joint cognitive system

**Status:** design only. No production code, no spec edits, no policy edits.
**Worktree:** `~/Development/katagami-worktrees/claude-jcs-wiring-design`, branch
`claude/jcs-wiring-design`, off `origin/master` @ `c0d2a738`.
**Kernel read at:** `temper` `origin/main` @ `a747f7d4` (the primary checkout is
bare; read through an existing worktree, read-only).

Every claim about what the verifier can and cannot do is cited to code. Where I
am inferring rather than reading, the sentence says so.

---

## How to check this document

This document is going to be used to justify building things, so it should be
cheap to attack. Assume every number here will be re-run by someone else; that
is the point.

**Provenance of the base commits.** Katagami analysis was performed against
`origin/master` @ `e6f7a02b` and the document was then rebased onto `c0d2a738`.
The only files changed between those two commits are
`katagami-curation/agents/curator/skills/synthesize-language/SKILL.md`,
`ui/src/app/api/file/[id]/route.ts` and `ui/src/lib/file-visibility.ts`
(`git diff --stat e6f7a02b c0d2a738`). **No file cited for a load-bearing claim
changed**, so every `file:line` below resolves identically at either commit. The
spec and policy directories are byte-identical between them.

**Three grades of evidence, and how to tell them apart.**

| Grade | Meaning | How it is written |
|---|---|---|
| Executed | A command was run and its output is quoted | the command is given, so you can re-run it |
| Read | A file was opened at a cited `file:line` | `path:line`, openable |
| Inferred | A conclusion drawn from read evidence, not directly observed | the sentence contains "inferred", "hypothesis", or "treat as" |

Anything without one of those three marks is a design proposal, not a finding.

**The two executed results, and how to reproduce them.**

1. *Composite verification is producing a non-result for the CurationJob
   component* (§B). Reproduce:
   ```
   temper verify --specs-dir katagami-curation/specs
   ```
   using a `temper` binary built from `origin/main` @ `a747f7d4` or later — the
   version in `~/.cargo/bin` is from 2026-03-11 and predates ADR-0150, so it will
   not exercise the composite step at all. Expect
   `[INCOMPLETE] seed=CurationDirection scope=[CurationDirection] — explored 0
   joint states`, a warning, and **exit code 0**. The reading that this is a
   plan-build failure rather than budget exhaustion is *inferred* from
   `verify.rs:224-239` being the only code path that emits
   `states_explored: 0` together with `scope == [seed]` — I did not instrument
   the binary to confirm the error variant directly.

2. *The production status histogram and the missing actor sets* (§E.2).
   Reproduce with the credential in `.env.katagami-curator.local`:
   ```
   source .env.katagami-curator.local
   curl -sS -H "Authorization: Bearer $TEMPER_API_KEY" -H "X-Tenant-Id: $TEMPER_TENANT" \
     "$TEMPER_API_URL/tdata/DesignLanguages?\$count=true&\$top=0&\$filter=Status eq 'Published'"
   ```
   Note two API quirks that cost time: `$apply=groupby(...)` is **silently
   ignored** and returns full entities (a 1.1 MB payload), and
   `/tdata/<Set>/$count` returns 400 `InvalidPath`. The working shape is
   `$count=true&$top=0`, which returns `@odata.count` with an empty `value`.
   Counts are a point-in-time read at 2026-08-12T20:48Z and will drift.

**Where this document is weakest — two places, named on purpose.**

1. **Every property in §B is a claim about what the verifier *would* prove once
   the triggers exist.** None of them has been observed, because the triggers do
   not exist yet; they are read off the verifier's source, not off a passing run.
   §B.2's reasoning from `composite/model.rs:294-321` is solid, but "the joint
   BFS never visits a state where the human published before the machine
   reviewed" is a prediction until someone composes the three specs and runs it.
   That is the cheapest claim in the document to settle and the one most worth
   settling first.

2. **This document does not cost the joint state space, and it should.** The
   composite BFS is bounded by `DEFAULT_COMPOSITE_STATE_BUDGET = 250_000`
   (`temper-verify/src/composite/verify.rs:35`), and an over-budget run reports
   `INCOMPLETE`, which **warns without failing** — `run_composite_verification`
   returns `Ok(())` and the command exits 0
   (`temper-cli/src/verify/mod.rs:275-284`). Measured per-entity counts from the
   run in §E.2's sibling command: `CuratorAgent` 17,407 joint states,
   `HumanCurator` 48, `ReviewAgent` 15. The product is *inferred* to be on the
   order of 10⁷ by multiplying those, which is an upper bound and not a measured
   reachable count — the real joint figure will be smaller, possibly much
   smaller, because the guards prune it. But if it lands over 250,000 the
   composite reports `INCOMPLETE` and **§B's properties would be claimed by a
   green run that proved less than the three separate runs did.** Nobody has
   measured this. It should be measured before §B is relied on, and until it is,
   "the three machines are verified together" is not yet an evidenced statement.

---

## 0. Corrections to the brief

Three things in the framing are wrong, and two of them change the design.

1. **`AttachArtStyleReview` is not on `DesignLanguage`.** It is on
   `katagami-commons/specs/art_style.ioa.toml:317`. `design_language.ioa.toml`
   has no such action — `grep -n "ArtStyleReview"` on it returns nothing. The
   DesignLanguage alphabet relevant here is `SubmitDesignLanguage` (`:238`),
   `SubmitForReview` (`:493`), `Publish` (`:501`), `MarkQualityPassed` (`:543`),
   `Revise` (`:510`), `Archive` (`:518`), `Restore` (`:526`), `ReturnToDraft`
   (`:573`).

2. **Design languages do not stop under review today — they auto-publish, in
   WASM, with no human anywhere.** `katagami-curation/wasm/finalize_spawned_session/src/lib.rs:851`
   (`verify_quality_reviewed_languages`) walks each language
   `SubmitForReview → publish_public_assets → MarkQualityPassed → Publish`
   (`:888`, `:890`, `:893-901`, `ensure_language_published` at `:1250`). The art
   style lane does the same through `walk_lane_entity_to_published` (`:2581`).
   Constraint 2 is therefore not "add a gate to a system that already pauses" —
   it is "break the existing terminal step of the live pipeline". That is the
   whole of section E.

3. **The three actor specs are not wired to anything, and their `output`
   actions are inert.** `CuratorSubmittedEvent`, `ReviewVerdictRecordedEvent`,
   `CuratorPublishedEvent`, `CuratorReturnedEvent`, `ReviewEscalatedEvent` are
   `kind = "output"`. The kernel filters `kind = "output"` out of the transition
   table entirely (`temper-spec/src/automaton/parser.rs:373`) and out of the
   trigger graph (`trigger_graph.rs:175` only admits `TriggerKind::Entity`
   triggers, which are declared on actions, and an output action carries none).
   Nothing emits them; nothing consumes them. The hint on
   `curator_agent.ioa.toml:375` — "The review actor's `ReceiveSubmission`
   consumes it" — describes an intention, not a mechanism.

   Their `cross_entity_state` guards *are* real at runtime
   (`temper-server/src/state/dispatch/cross_entity.rs:19`), but a guard is a
   one-way read: `HumanCurator.Publish` refuses until `ReviewAgent` reached
   `VerdictRecorded`; nothing makes a ReviewAgent exist, or tells it a
   submission arrived. Today the three machines are three ledgers a human or an
   agent writes by hand, in the right order, by convention.

---

## 1. What actually exists, verified

### The four machines

| Machine | States | Where |
|---|---|---|
| `CuratorAgent` | `BriefReceived → Drafting → SelfReviewed → Submitted`, `+ Abandoned` | `katagami-curation/specs/curator_agent.ioa.toml:45` |
| `ReviewAgent` | `SubmissionReceived → Reviewing → VerdictRecorded`, `+ Abandoned` | `review_agent.ioa.toml:23` |
| `HumanCurator` | `SubmissionAssigned → Reviewing → Published \| ReturnedWithCritique`, `+ Escalated` | `human_curator.ioa.toml:40-46` |
| `DesignLanguage` | `Draft → UnderReview → Published → Archived` | `katagami-commons/specs/design_language.ioa.toml:16` |
| `ArtStyle` | same four states | `art_style.ioa.toml:26` |

### The real driver today

`CurationJob` (`katagami-curation/specs/curation_job.ioa.toml:9`) is what
actually runs. Its typed completions fire the `finalize_spawned_session` WASM
trigger, and that WASM is what dispatches the artifact-side lifecycle over
OData. Entity-kind triggers already exist in Katagami
(`docs/adrs/0003-inline-action-triggers-hard-cut.md`), but **every one of them
stays inside `katagami-curation`**: `CurationJob ↔ CurationDirection ↔
CurationQuery`. Not one crosses into `katagami-commons`. The artifact
transitions are driven by WASM calling OData, not by declared reactions.

### The kernel's guard vocabulary — the whole of it

`temper-jit/src/table/guard.rs:18-63`:

```
Always | StateIn | ItemCountMin | CounterMin | CounterMax
| BoolTrue | BoolFalse | ListContains { var, value } | ListLengthMin
| CrossEntityStateIn { entity_type, entity_id_source, required_status,
                       forbidden_status, required }
| And
```

That is it. No field equality (ARN-299 confirmed), no disjunction, no negation,
no comparison of a field to another field even *within* one entity.
`ListContains`'s `value` is a static `String` — it cannot reference a param or
another entity's field, so "this list contains that entity's id" is not
expressible either.

### Safety invariants are not runtime gates

`[[invariant]]` blocks are consumed by `temper-verify`
(`model/stateright_impl.rs:25`, `simulation.rs:342`,
`composite/invariant_eval.rs:22`), by codegen, by the observe API, and by the
**simulation** actor handler (`temper-server/src/entity_actor/sim_handler.rs:88`).
The production `TransitionTable` (`temper-jit/src/table/types.rs:44-68`) carries
no invariants at all. So an invariant is a proof obligation on the spec, not a
check the server performs on a write. Guards are the runtime gate; invariants
are the claim the cascade must discharge. This matters in both directions
below.

### How composition actually works

- Composite verification is **directory-scoped**. `temper verify <dir>` reads
  `.ioa.toml` files from one specs directory and runs `verify_all` over exactly
  that set (`temper-cli/src/verify/mod.rs:207-216`).
- `seed_cover` picks one seed per weakly-connected component of the entity
  trigger graph (`composite/verify.rs:93-142`). With no entity triggers, every
  entity is its own singleton component and "composite verification" is
  literally the per-entity run.
- The joint model builds **exactly one instance per entity type**
  (`composite/model.rs:404-420`).
- It checks exactly two properties (`composite/model.rs:487-524`):
  `joint_local_invariants` (each entity's local invariants, evaluated against
  its slice, in every reachable joint state) and `no_dropped_reaction` (ADR-0150:
  a fired reaction whose target action is not enabled from the target's current
  state). The source comment at `composite/model.rs:501-504` states plainly:
  "Cross-entity invariants translation is a later slice."
- Inside the joint model a `cross_entity_state` guard stops being abstract and
  resolves concretely against the target's slice (`composite/model.rs:294-321`),
  which is what filters impossible interleavings out of `actions()`
  (`:422-449`).

### What each cascade level does with a cross-entity guard

- **L0 (SMT):** encodes it as a fresh free `Bool` const keyed on
  `entity_type:entity_id_source:statuses` (`temper-verify/src/smt.rs:710-721`).
  L0 is single-entity and never composes. **L0 can prove nothing cross-entity.**
- **L1 (Stateright), per entity:** two readings. `evaluate_guard` returns
  `false` for local enablement (`model/semantics.rs:44`) so `no_deadlock` /
  `no_further_transitions` stay sound; `guard_may_hold` returns `true` for
  exploration (`:70`) so the gated edge and everything behind it is still
  visited. ADR-0149's free-boolean abstraction. **Sound, and proves nothing
  about the gate itself.**
- **L1 composite:** the free boolean becomes concrete for in-scope entities.
  This is the only level where cross-entity facts are real.
- **L2 (DST) / L3 (proptest):** single-entity
  (`cascade.rs:448-508`). They exercise the same local model.

---

## A. What fires what

### A.1 The wiring, edge by edge

Each row is one `[[action.triggers]]` block of `kind = "entity"`. `params_from`
can carry the source entity's **own id** using the literal source field `"Id"`
(`temper-server/src/trigger/params.rs:58-61`) — that is what makes the
`review_agent_id` / `human_curator_id` links settable at all.

| # | Source | Fires | Target | Resolver | Why |
|---|---|---|---|---|---|
| 1 | `CurationJob.CompleteSynthesis` | → | `CuratorAgent.ReceiveBrief`… | — | *not wired.* See A.4 |
| 2 | `CuratorAgent.SubmitDesignLanguages` (`to = "Submitted"`) | → | `ReviewAgent.ReceiveSubmission` | `create` | one review record per submission; a fresh target is always enabled, so it can never drop (`composite/model.rs:221`) |
| 3 | `CuratorAgent.SubmitArtStyles` / `SubmitPaletteSystems` / `SubmitWritingStyles` | → | `ReviewAgent.ReceiveSubmission` | `create` | same, one edge per lane |
| 4 | `ReviewAgent.ReceiveSubmission` | → | `ReviewAgent.BeginReview` | `same_id` | optional; only if the review is machine-driven end to end |
| 5 | `ReviewAgent.RecordVerdict` (`to = "VerdictRecorded"`) | → | `HumanCurator.AssignSubmission` | `create` | **only for `submission_type == "DesignLanguage"`** — this is the mixed path |
| 6 | `ReviewAgent.RecordVerdict` | → | `HumanCurator.RecordReviewVerdict` | `same_id` | carries `verdict` onto the assignment; must be declared *after* #5 so the assignment exists |
| 7 | `HumanCurator.Publish` (`to = "Published"`) | → | `DesignLanguage.RecordCuratorApproval` | `field` on a new `design_language_id` | **new action**, see A.3 — this is what makes the human step provable |
| 8 | `HumanCurator.Publish` | → | `DesignLanguage.Publish` | `field` | the actual publish, after #7 |
| 9 | `HumanCurator.ReturnWithCritique` | → | `DesignLanguage.ReturnToDraft` | `field` | `ReturnToDraft` is `from = ["UnderReview"]` (`design_language.ioa.toml:573-579`) — exactly right |
| 10 | `HumanCurator.ReviewOverdue` | → | (human channel) | — | must be a `webhook`/`wasm` trigger, not an entity trigger; an escalation nobody is told about is a silent failure |

For #5, "only for DesignLanguage" is a **trigger guard**, not a state guard:

```toml
[action.triggers.guard]
type = "field_equals"
field = "submission_type"
value = "DesignLanguage"
```

`TriggerGuard::FieldEquals` exists (`temper-spec/src/automaton/types.rs:677-682`)
and is evaluated post-commit against the source entity's fields. It is the only
place in this whole design where a field comparison is available — because
trigger guards have a richer vocabulary than transition guards
(`FieldEquals | FieldIn | BoolTrue | BoolFalse | StateIn | CrossEntityStateIn |
AllOf | AnyOf | Not`, `types.rs:675-729`). Note what it costs: see C.4.

### A.2 The mixed path, drawn out

**DesignLanguage — halts for the human:**

```
CuratorAgent: BriefReceived → Drafting → SelfReviewed
              (SubmitDesignLanguages guard already requires every listed
               DesignLanguage to be UnderReview — curator_agent.ioa.toml:322)
              → Submitted
                    │ trigger #2 (create)
                    ▼
ReviewAgent:  SubmissionReceived → Reviewing → VerdictRecorded
                    │ trigger #5 (create, guarded submission_type == "DesignLanguage")
                    ▼
HumanCurator: SubmissionAssigned → Reviewing
                    │  ── HALT. Only a human principal bound to
                    │     assignee_ref can move this (human_curator.cedar:39-63).
                    │     48h state_timeout → Escalated (ioa:253-263).
                    ▼
              Publish  ──trigger #7──▶ DesignLanguage.RecordCuratorApproval
                       ──trigger #8──▶ DesignLanguage.Publish  (UnderReview → Published)
              or
              ReturnWithCritique ──#9──▶ DesignLanguage.ReturnToDraft (→ Draft)
```

**ArtStyle — does not halt:**

```
CuratorAgent: … → Submitted
                    │ trigger #3 (create)
                    ▼
ReviewAgent:  SubmissionReceived → Reviewing → VerdictRecorded
                    │  trigger #5 does NOT fire: its field_equals guard sees
                    │  submission_type == "ArtStyle". No HumanCurator record
                    │  is ever created for this lane.
                    ▼
              (nothing)

ArtStyle:     Draft → UnderReview → Published, driven exactly as today by
              finalize_spawned_session/src/lib.rs:2581 (walk_lane_entity_to_published),
              as Agent::"system", gated by art_style.cedar:7-15.
```

The difference is expressed in **one place**: the `field_equals` trigger guard
on edge #5, plus the presence/absence of a `cross_entity_state` guard on the
artifact's own `Publish`. Nothing about ArtStyle changes. `PaletteSystem` and
`WritingStyle` follow ArtStyle.

### A.3 The one new action

Edge #7 targets an action that does not exist. It has to:

```toml
# design_language.ioa.toml — DESIGN SKETCH, not to be committed from here
[[state]]
name = "human_curator_approved"
type = "bool"
initial = "false"

[[state]]
name = "human_curator_id"
type = "string"
initial = ""

[[action]]
name = "RecordCuratorApproval"
kind = "internal"
from = ["UnderReview"]
params = ["human_curator_id"]
effect = [{ type = "set_bool", var = "human_curator_approved", value = "true" }]

# added to Publish's existing guard list (design_language.ioa.toml:505):
#   { type = "is_true", var = "human_curator_approved" }

[[invariant]]
name = "PublishedRequiresCuratorApproval"
when = ["Published"]
assert = "human_curator_approved"
```

**Why a mirrored boolean rather than a `cross_entity_state` guard on
`HumanCurator`.** A `cross_entity_state` guard is a free boolean at L0
(`smt.rs:710`) and at per-entity L1 (`semantics.rs:70`). It gates at runtime and
proves nothing in the cascade. A local boolean set only by a reaction is
different: L0 can prove the invariant inductive, per-entity L1 can prove it over
the whole reachable state space, L2/L3 exercise it, and composite L1 proves the
reaction that sets it is never dropped. Same fact, four levels instead of zero.
This is the single most important move in the design.

`SetSpec`, `WritePhilosophy`, `SetTokens`, `AttachEmbodiment` and friends all
already clear `quality_review_passed` when the language is edited
(`design_language.ioa.toml:221-232`, `:265`, `:273`, `:323`). `human_curator_approved`
must be cleared by the same set, and by `Revise` and `Restore` — otherwise a
language pulled back for revision keeps a stale approval and republishes
without the human. That is a re-approval requirement, and it should be stated
as such.

### A.4 What deliberately stays unwired: the brief handoff

There is no edge into `CuratorAgent.ReceiveBrief`. `CurationJob` could fire one
(`CompleteSynthesis` already carries `design_language_ids`), but a curator run
is a *session*: it is opened by the harness that will drive it, and its
`session_id` / `trajectory_id` / `harness` (`curator_agent.ioa.toml:64-86`) are
knowable only inside that session. A trigger that creates the record before the
session exists produces a ledger with an empty capture identity — which is
exactly the failure the verification log already recorded ("Ledger and
trajectory are joined only by a session id",
`docs/study/verification-log.md`, entry 2). The agent creates its own
`CuratorAgent` record. Everything downstream of `Submitted` is wired.

---

## B. What composition proves that today's setup cannot

Ordered by how much each is worth. For each: the property in checkable form,
the level, and what has to exist for it to hold.

### B.1 No reaction in the pipeline is silently dropped — **L1 composite**, new

**Property:** in every reachable joint state, for every fired entity trigger
without `drop_ok = true`, the target action is enabled from the target's current
state. Checked as `Property::always("no_dropped_reaction", |_m, s| s.dropped.is_none())`
(`composite/model.rs:522`), with a counterexample naming source entity, source
action, trigger, target entity, target action and the target's state at the drop
(`:46-59`).

**Why it is new:** the runtime treats a reaction as fire-and-forget. A drop is a
`ReactionResult { success: false }` and a `tracing::warn!`
(`temper-server/src/trigger/dispatcher.rs:281-295`) — the source action still
succeeds and the caller is told nothing. There is no other check for this
anywhere.

**What it catches here, concretely:** edge #8 (`HumanCurator.Publish →
DesignLanguage.Publish`) drops whenever the DesignLanguage is not in
`UnderReview` — for example when a `Revise` cycle already moved it, or an
`Archive` fired, or the assignment named a language some other path already
published. Today that produces a `HumanCurator` in `Published` and a
`DesignLanguage` that is not. The composite BFS finds that joint state or proves
it unreachable.

**Requires:** the entity triggers exist (they do not today), and both endpoints
are in the same verified spec set. See C.5 — this is the hard part.

### B.2 Ordering is consistent across the whole chain — **L1 composite**, new

**Property:** the product state space contains no reachable state that
contradicts a `cross_entity_state` guard, because in the joint model those
guards are resolved concretely and gate `actions()`
(`composite/model.rs:294-321`, `:440-442`).

Consequence for this chain: `HumanCurator.Publish` carries
`cross_entity_state ReviewAgent required_status = ["VerdictRecorded"], required = true`
(`human_curator.ioa.toml:204`). Per-entity L1 explores the guard-true branch
regardless (ADR-0149). Composite L1 does not: the edge is simply absent from
`actions()` unless the `ReviewAgent` slice is in `VerdictRecorded`. So the joint
BFS never visits a state where the human published before the machine reviewed,
and every local invariant is then checked over the *correct* state space rather
than an over-approximation of it. Same for `CuratorAgent.Submit*`'s guards on
`DesignLanguage` being `UnderReview` (`curator_agent.ioa.toml:322`).

**Requires:** both entities in the same composite scope. `ReviewAgent` and
`HumanCurator` already are (same directory). `DesignLanguage` is not.

### B.3 No DesignLanguage reaches Published without a HumanCurator transition — **L0 + L1 + L1 composite**, new

**Property (per-entity, L0 and L1):**
`always(status == "Published" ⟹ human_curator_approved)`.
L0 proves it inductive (`cascade.rs:365` reports "invariants inductive"); L1
proves it over the reachable state space (`stateright_impl.rs:25`).

**Property (joint, L1 composite):** the same invariant, lifted into every
reachable joint state by `joint_local_invariants`
(`composite/model.rs:506-516`), *plus* `no_dropped_reaction` on edge #7 —
which is what proves the boolean is actually set when `HumanCurator.Publish`
fires rather than merely settable.

**Honest reading of what this proves.** It proves the *state machine* cannot
reach `Published` without the flag, and that the human's publish reliably sets
it. It does **not** prove that only a human can set the flag — that is
`RecordCuratorApproval`'s Cedar policy, section D. Three layers, each carrying
one third:

- guard: `Publish` refuses without the flag (runtime, not proof)
- invariant: no path to `Published` leaves the flag false (L0/L1/L2/L3)
- Cedar: nobody but the human's publish reaction sets the flag (policy, not proof)

Anyone claiming this is "formally verified end to end" is overstating it. What
is verified is the middle third, exhaustively.

**Requires:** `RecordCuratorApproval` and the invariant to exist; edge #7 to
exist; and — for the composite half — `DesignLanguage` and `HumanCurator` in the
same verified spec set.

### B.4 Every Published language has a ReviewAgent verdict — **L1 (already stated) → L1 composite (newly meaningful)**

`HumanCurator` already asserts
`PublishedRequiresReviewVerdict when = ["Published"] assert = "has_review_verdict"`
(`human_curator.ioa.toml:272-275`). Today that invariant is nearly free:
`has_review_verdict` is set by `RecordReviewVerdict`, which is unguarded and
callable from `SubmissionAssigned` or `Reviewing` by anyone the permit admits
(`ioa:171-177`, `human_curator.cedar:16-28`). The invariant is true of the model
and says almost nothing about the world.

Wiring edge #6 and denying direct `RecordReviewVerdict` calls in Cedar turns the
same invariant into a real statement, and composite `no_dropped_reaction` then
proves the reaction that sets it always lands. **The invariant does not change.
Its meaning does.** That is worth saying out loud in the verification log,
because it is a case where the formalism was already "green" and was not
carrying the weight a reader would assume.

### B.5 The actor machines are deadlock-free and terminate — **L1, already true**

`CuratorAgent` (`allow_indefinite_states = ["Submitted","Abandoned"]`, `:47`),
`ReviewAgent` (`:25`), `HumanCurator` (`:48`) each restrict indefinite states to
terminals, and each declares `state_timeout`s on its working states
(`curator_agent:389-405`, `review_agent:168-178`, `human_curator:253-263`). This
already holds per entity and is not new.

**It does not extend to the artifact.** `design_language.ioa.toml:23` declares
`allow_indefinite_states = ["Draft","UnderReview","Published","Archived"]` —
every state — under a comment that calls it an "ADR-0050 migration TODO … added
as a migration allowlist to unblock `TEMPER_LIVENESS_ENFORCE=true`". Liveness is
switched off for DesignLanguage. So "no artifact waits forever" is **not**
provable, and adding a human gate makes the exposure worse, not better: an
UnderReview language whose HumanCurator escalated and was never reassigned sits
there indefinitely and nothing complains. The mitigation is a real
`state_timeout` on `UnderReview`, and that is a separate decision with its own
blast radius (what should time out *to*?).

### B.6 What composition does **not** buy, that one might assume it does

- The 10-concurrent batch cap (`ClaimJob`, `max_count = 10`,
  `curator_agent.ioa.toml:211`) is **not exercised** in the composite model:
  `DEFAULT_COMPOSITE_MAX_COUNTER = 3` (`composite/mod.rs:49`), so
  `jobs_in_flight` never reaches 10 there. Per-entity L1 uses its own ceiling
  and does cover it; composite does not.
- `liveness = "required"` on a trigger buys nothing. `plan.requires_liveness()`
  is computed (`composite/mod.rs:206-211`) and reported
  (`cascade.rs:608`), but `CompositeTemperModel::properties()` emits no
  `Property::eventually` (`composite/model.rs:487-524`). The flag is
  documentation.

---

## C. What stays unprovable, and why

### C.1 "The review was of *this* submission" — needs ARN-299. Confirmed.

`HumanCurator.Publish`'s cross-entity guard checks that the linked `ReviewAgent`
reached `VerdictRecorded` (`human_curator.ioa.toml:204`). It cannot check that
that review reviewed this submission. The spec already says so at `:150-159` and
records `reviewed_submission_ids` purely so the mismatch is *visible*.

That is correct and I can confirm the mechanism: the guard vocabulary
(`guard.rs:18-63`) has no way to compare `HumanCurator.submission_ids` with
`ReviewAgent.submission_ids`. `ListContains` takes a static `String` value
(`guard.rs:34`), not a field reference, so even "the review's list contains this
language id" is not expressible. **This needs field-equality cross-entity
guards.**

**Weaker provable approximation, available today:** link the two by
*construction* instead of comparing them. If `HumanCurator` is created only by
edge #5 (a `create`-resolver trigger from `ReviewAgent.RecordVerdict`, carrying
`submission_ids` and `submission_type` through `params_from`), then within the
verified model the assignment's submission set *is* the review's, because there
is no other producer. **What it fails to catch:** anyone who calls
`AssignSubmission` directly. `human_curator.cedar:16-28` permits
`AssignSubmission` to every non-contributor, non-anonymous principal, and a
direct call can name any `review_agent_id` and any `submission_ids`. So the
approximation is "provable given that the only path is the wired one", and the
"given" is a Cedar obligation, not a proof. Closing it means forbidding direct
`AssignSubmission` to everything except the reaction principal — see D.4.

### C.2 Separation of duties — needs ARN-299 **and** more. Confirmed, with a
second blocker the brief does not mention.

"The agent that authored it is not the agent that approved it" needs to compare
a field on one entity with a field on another (`CuratorAgent`'s acting principal
vs `ReviewAgent.reviewed_by`, `review_agent.ioa.toml:101-104`). That is
field equality — ARN-299.

But field equality alone would not be enough. **The composite model instantiates
exactly one entity per type** (`composite/model.rs:404-420`: one `init_states()`
per type, one joint state). It cannot represent two `CuratorAgent` runs, so no
property quantified over instances — "for all pairs of runs", "for all languages
in this submission" — is expressible in it at any level. Instance-level
separation of duties is outside the model, not merely outside the guard
vocabulary.

**Weaker provable approximation, available today:** *principal-class*
separation, in Cedar, already partly written. `review_agent.cedar:29-33` forbids
`agent_type == "contributor"` from `RecordVerdict`/`RecordFinding`, and
`:46-53` restricts them to an allowlist of `Agent::"katagami-reviewer"` and
`Agent::"system"`.

**What it fails to catch, precisely:**
1. The same principal acting in both roles — `Agent::"system"` is on the
   reviewer allowlist and is also the finalizer that drives artifact
   transitions. If a curator run were ever driven as `Agent::"system"`, class
   separation says nothing.
2. Two runs of the *same* reviewer principal, where one authored. Class
   separation is about the class, not the instance.
3. An agent that declines to declare `agent_type`. The contributor clause is
   `principal has agent_type && principal.agent_type == "contributor"`, and
   `agent_type` comes from an optional header
   (`temper-authz/src/context.rs:81`). The allowlist forbid at `:46-53` is what
   actually closes that, and it closes it because it is written as
   `unless { principal == … }` rather than `when { … }` — worth preserving in
   any edit.
4. The link `ReviewAgent.curator_agent_id` (`review_agent.ioa.toml:31`) is a
   *recorded string*, never checked against anything. Nothing verifies it names
   a real `CuratorAgent`, let alone the right one.

So: the brief's hypothesis is confirmed for the guard-vocabulary half, and there
is a second, independent blocker.

### C.3 "Every assignment eventually reaches a terminal decision" — not provable, twice over

First, there is no liveness property in the composite model (B.6). Second, even
if `Property::eventually` were emitted, Stateright's `eventually` holds on
acyclic paths only (`temper-verify/src/model/stateright_impl.rs:246-250`), and
`HumanCurator` has a deliberate cycle: `SubmissionAssigned → Escalated
(ReviewOverdue) → SubmissionAssigned (Reassign)` (`ioa:229-244`). An assignment
that escalates and reassigns forever is a legal infinite path. The design is
right to make escalation a re-route rather than a bypass; the consequence is
that "eventually decided" is a monitoring property, not a verification one, and
should be stated that way rather than implied.

### C.4 Trigger guards are invisible to the verifier — and `drop_ok` is a hole

`TriggerEdge` (`temper-spec/src/automaton/trigger_graph.rs:181-191`) carries
`from, source_action, trigger_name, to, target_action, to_state,
liveness_required, creates_target, drop_ok`. **It does not carry the trigger's
guard.** The composite verifier never sees the `field_equals` on edge #5. It
therefore assumes edge #5 fires on *every* `RecordVerdict`, including art-style
verdicts, and will report a drop that cannot happen at runtime.

The only way to silence a false drop is `drop_ok = true` — which switches the
`no_dropped_reaction` check off for that edge entirely
(`composite/model.rs:221`). So the property is weakest exactly where the wiring
is most conditional. This is not hypothetical: every conditional entity trigger
already in `katagami-curation` carries `drop_ok = true`
(`curation_job.ioa.toml`: `synthesis_records_synthesize_job`,
`synthesis_completes_direction`, `review_passes_direction`,
`art_style_synthesis_completes_direction`).

**Design consequence:** avoid a guard on edge #5 if it can be avoided. It can:
split `ReviewAgent.RecordVerdict` into `RecordDesignLanguageVerdict` and
`RecordArtifactVerdict` — two actions, same target state, only the first
carrying the `HumanCurator` edge. Then the mixed path is expressed in the
*alphabet*, which the verifier sees, instead of in a trigger guard, which it
does not, and `drop_ok` stays `false` everywhere. That costs one extra action
and buys back the drop check. I would take that trade.

### C.5 The app boundary — the biggest structural problem

`DesignLanguage` and `ArtStyle` live in `katagami-commons/specs/`. The three
actors live in `katagami-curation/specs/`. Composite verification is
directory-scoped (`temper-cli/src/verify/mod.rs:207-216`, reading
`read_ioa_sources(specs_dir)`).

At runtime this does not matter: the spec registry is keyed by
`(tenant, entity_type)` with a flat namespace across apps
(`temper-server/src/registry/mod.rs:436-440`), so a cross-app trigger dispatches
fine. **At verification time it matters a great deal**, and it fails quietly:

1. `CompositeVerificationPlan::new` returns
   `UnknownTriggerTarget` when an in-scope edge points at an entity not in the
   supplied set (`composite/mod.rs:152-159`).
2. `verify_all` catches that error and records the seed as
   `CompositeOutcome::Incomplete` with `other_violations = ["plan build failed
   (unknown trigger target?)"]` (`composite/verify.rs:226-238`).
3. The CLI prints `Incomplete` as a **warning** and does not fail
   (`temper-cli/src/verify/mod.rs:275-281`). Only `Violated` bails (`:268-274`).

So the moment a `katagami-curation` spec declares a trigger into
`DesignLanguage`, the entire weakly-connected component containing that spec —
which, once wired, is all three actors plus `CurationJob`, `CurationDirection`
and `CurationQuery` — stops being composite-verified and starts emitting a
warning nobody will read. Every property in section B evaporates at exactly the
moment the wiring is added.

**Options, in order of how much I like them:**

- **(a) Verify the union.** Give `temper verify` both directories (or a bundle)
  for the composite step. Requires a kernel/CLI change: today the composite step
  runs over one parsed directory. Smallest honest fix. Also the only one that
  keeps the two apps separately deployable.
- **(b) Move the three actor specs into `katagami-commons`.** Cheapest, and
  wrong: the actors are curation concerns, and Rita's standing rule is that code
  goes in the repo it belongs to.
- **(c) Keep the boundary and do not wire across it.** Then edges #7, #8, #9 do
  not exist, the human gate stays a runtime-only `cross_entity_state` guard, and
  B.1 and B.3 are unavailable. This is the honest fallback if (a) is not
  affordable — but it should be recorded as a known gap, not presented as
  wiring.
- **(d) Make `Incomplete` gate.** Independently worth doing: an incomplete
  composite proof passing CI as a warning is a fail-open, and every
  cross-app trigger anywhere in the estate is currently getting that treatment.
  This is a kernel change and probably its own Linear issue.

**This is the decision to make before anything else is built.** I am not making
it: it trades kernel work against app-boundary integrity, and it is an
architecture call.

### C.6 The composite guard resolver matches by *type*, not by reference

`guard_cross_entity_ok` looks up `state.entities.get(entity_type)` and ignores
`entity_id_source` entirely (`composite/model.rs:296-317` — the field is
destructured away by `..`). With one instance per type this is the only thing it
could do, but it means the model cannot distinguish "the ReviewAgent this
assignment names" from "some ReviewAgent". Combined with C.1, the joint model
proves ordering between *types*, never between *instances*.

### C.7 Silent Cedar denial on reactions

A reaction denied by Cedar increments `authz_denied_count`, logs
`tracing::warn!`, and records `ReactionResult { success: false }`
(`dispatcher.rs:201-227`). The source action still succeeds. So if the Cedar work
in section D is wrong, the symptom is a `HumanCurator` in `Published` and a
`DesignLanguage` that never moved, with nothing in the response and one warn
line in Datadog. That is a silent failure by Rita's standing definition and
needs an explicit monitor (`reaction.authz_denied_count > 0` on the katagami
tenant), not just a log.

---

## D. Cedar changes

### D.1 The concrete gap (ARN-319)

`katagami-commons/policies/design_language.cedar` has a blanket
`permit(principal, action, resource is DesignLanguage)` at `:2`, then two
forbid lists (`:7-18`, `:34-48`). **`SubmitForReview` is in neither.** Compare
`art_style.cedar:7-15`, which does include it. That asymmetry is the whole of
ARN-319 and matches the verification log entry exactly: 409 from the state
guard, never 403 from Cedar.

`kind = "internal"` is not a defence. It affects only whether an action with no
`from` list is treated as always-enabled
(`temper-spec/src/automaton/parser.rs:377`,
`temper-server/src/conformance/spec_view.rs:61-70`). It is not an authorization
control. `SubmitForReview` being `internal` restricts nobody.

### D.2 The trap, and it is worse than "Customer is unrestricted"

Cedar principal types come from `PrincipalKind`
(`temper-authz/src/engine/mod.rs:368-373`): `Customer | Agent | Admin | System`.
`PrincipalKind` is parsed from the `x-temper-principal-kind` header, and
**Customer is the default** — both when the header is absent and when its value
is unrecognized (`temper-authz/src/context.rs:55-77`).

So the two existing forbids in `design_language.cedar` have complementary holes:

| Caller | `forbid(principal, …) when { agent_type == "contributor" }` (`:7-18`) | `forbid(principal is Agent, …) unless { has agent_type ∥ == Agent::"system" }` (`:34-48`) |
|---|---|---|
| Agent + `agent_type: contributor` | **denied** | permitted (has agent_type) |
| Agent + no `agent_type` | permitted | **denied** |
| **No kind header, no agent_type** → `Customer::"…"` | permitted | permitted (not an Agent) |

The third row is the hole, it is the *default* header shape, and neither
existing forbid closes it. A contributor that simply omits
`x-temper-principal-kind` is a `Customer` and the blanket permit at `:2` wins.

### D.3 Intended policy shape

Mirror `art_style.cedar`'s structure, which is written against **unconstrained
`principal`** and is therefore type-independent:

```cedar
// DESIGN SKETCH — katagami-commons/policies/design_language.cedar

// The finalizer lane. Written against unconstrained `principal` so it binds
// Customer, Agent, Admin and System alike — a caller cannot shed the rule by
// declining to declare a kind (Customer is the default, temper-authz
// context.rs:55-77).
forbid(
  principal,
  action in [
    Action::"SubmitForReview",         // ← the ARN-319 addition
    Action::"Publish",
    Action::"MarkQualityPassed",
    Action::"RecordCuratorApproval",   // ← the new action from A.3
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets"
  ],
  resource is DesignLanguage
) unless {
  principal == Agent::"system" ||
  principal is System ||
  principal == Agent::"service:katagami-curation"
};
```

Three notes on that `unless`, each load-bearing:

- **`principal is System` is required.** A Cedar `forbid` beats every `permit`,
  including the built-in `permit(principal is System, action, resource)` the
  engine installs at construction (`temper-authz/src/engine/mod.rs:680-683`).
  Omit it and the platform's own dispatches — state timeouts, some router paths
  that fall back to `SecurityContext::system()`
  (`temper-server/src/router.rs:586`) — get denied.
- **`Agent::"system"` and `principal is System` are different principals.**
  `Agent::"system"` is an `Agent`-kind principal whose id is the string
  `"system"`; `principal is System` is `PrincipalKind::System`. The existing
  policies name the former. Both are needed.
- **`Agent::"service:katagami-curation"` is the shape a declared-principal
  trigger actually presents.** A trigger with `principal = "katagami-curation"`
  runs as id `service:katagami-curation`, `agent_type == "katagami-curation"`,
  kind `Agent` (`temper-server/src/request_context.rs:108-131` builds
  `service:{name}`; `temper-authz/src/context.rs:214-240` promotes it to Agent
  kind and sets `agent_type`). It is **not** `Agent::"system"`. Wiring a trigger
  and forgetting this produces C.7's silent denial.

  And it is a real grant: cascades inherit the elevated context all the way down
  (`dispatcher.rs:262-279` — "elevation propagates down the chain"). Whatever can
  fire that trigger can, transitively, publish. Prefer **omitting** `principal`
  on triggers #7/#8/#9 so they inherit the caller — then the human's own
  credential is what Cedar sees, `human_curator.cedar`'s
  `principal.id == resource.assignee_ref` binding is what authorizes the
  cascade, and no service identity needs the publish grant at all. That is
  strictly better and I recommend it. If it is taken, drop the third line of the
  `unless`.

`RecordCuratorApproval` belongs in that list for a specific reason: it is the
boolean B.3's invariant rests on. If any principal can set it, the invariant
proves the machine is well-formed and nothing about the world.

### D.4 The second Cedar change: `AssignSubmission`

Per C.1, the "the review was of this submission" approximation only holds if
edge #5 is the sole producer of `HumanCurator` records.
`human_curator.cedar:16-28` currently permits `AssignSubmission` to everything
the file does not otherwise forbid. Restrict it the same way `Reassign` is
restricted (`:108-115`) — an explicit allowlist — so a hand-rolled assignment
naming an unrelated `review_agent_id` is a 403 rather than a mismatch a reader
has to notice.

### D.5 What must not change

`human_curator.cedar` is well-built and its comments explain why. In particular
do not rewrite `forbid(principal is Agent, action in [Publish,
ReturnWithCritique])` (`:39-43`) as an `agent_type` test — the file already
records that regression (ARN-302), and the `principal.id ==
resource.assignee_ref` binding at `:55-63` is what stops one human publishing
another's assignment. Leave both alone.

---

## E. Migration and blast radius

### E.1 The pipeline currently ends in Publish, and that has to stop

`verify_quality_reviewed_languages`
(`katagami-curation/wasm/finalize_spawned_session/src/lib.rs:851`) does, per
language:

```
verify_complete_language_artifacts        :874
ensure_language_under_review              :888   → SubmitForReview
publish_public_assets                     :890
MarkQualityPassed                         :893
ensure_language_published                 :901   → Publish        ◀── must be removed
attach_computed_facets                    :903   ◀── runs AFTER publish
attach_taste_vector                       :907   ◀── runs AFTER publish
```

Removing `ensure_language_published` leaves the language in `UnderReview`. Two
things then break that are easy to miss:

1. **`attach_computed_facets` and `attach_taste_vector` run after the publish
   call** (`:903`, `:907`). Both are `from = ["Draft","UnderReview","Published"]`
   on the spec (`design_language.ioa.toml:398`, `:391`), so they still succeed —
   but the *gallery facets and taste vector would be computed for a language
   that is not yet visible*, and if the human later returns it with critique and
   the contributor revises, they are stale. They should move behind
   `HumanCurator.Publish`, which means either a fourth trigger from
   `HumanCurator.Publish` into a WASM module, or accepting staleness. This is a
   real decision, not a detail.
2. **`publish_public_assets` runs *before* `MarkQualityPassed`** (`:890`), so
   public asset minting already happens pre-publish today. That is fine and
   needs no change — worth stating so nobody "fixes" it.

The art style lane (`walk_lane_entity_to_published`, `:2581`) is untouched.

### E.2 Existing entities

An earlier draft of this section reported "252 design languages" from the public
katagami.ai gallery and flagged that the production status distribution was
unread because the credentialed call was blocked. **That gap is now closed with
a real read.** The credential is in `.env.katagami-curator.local`
(`TEMPER_API_KEY`, `TEMPER_API_URL`, `TEMPER_TENANT`); the call was not blocked.

Read on **2026-08-12T20:48Z**, tenant `default`,
`https://openpaw-production.up.railway.app`, via
`GET /tdata/<Set>?$count=true&$top=0&$filter=Status eq '<S>'`:

| Entity | Draft | UnderReview | Published | Archived | Total |
|---|---|---|---|---|---|
| DesignLanguages | 359 | **241** | **252** | 377 | 1229 |
| PaletteSystems | 54 | 120 | 270 | 28 | 472 |
| ArtStyles | 81 | 148 | 154 | 82 | 466 |
| WritingStyles | 0 | 17 | **0** | 2 | 19 |

Four things this changes:

1. **252 is the `Published` count, not the total.** The gallery number was right
   about what it measured — a public gallery shows published languages — but the
   population is **1229**. Anywhere this document says "252 design languages",
   read "252 published design languages out of 1229".
2. **The in-flight set is 241, and it is the real migration question**, not a
   footnote. 241 languages are sitting in `UnderReview` right now. Under the new
   gate every one of them needs a `HumanCurator` assignment before it can move.
3. **The actor entity sets do not exist in production.** `GET /tdata/CuratorAgents`,
   `/ReviewAgents`, `/HumanCurators` and `/TrajectoryVerdicts` each return
   **404 `EntitySetNotFound`**, while `/tdata/CurationJobs` returns 200 with
   **3178** entities and the tenant lists **141** entity sets. So katagami-curation
   *is* installed under `default`, at a version predating commit `0d95e70f`
   ("feat: add JCS actor specs and TrajectoryVerdict entity"). **This answers the
   question this section was asking: it is greenfield, not migration.** It also
   means no conformance run can be executed against production until the curation
   app is republished to Genesis and its pin bumped — that is a prerequisite step,
   not a cleanup.
4. **The one artifact type that already has a human gate has never published
   anything.** WritingStyle is the existing precedent for constraint 2 — the
   finalizer declines to publish it (`lib.rs:4096-4101`, "CURATOR GATE (Rita,
   2026-07-04)") and a bespoke owner-only button is the only way through
   (`ui/src/app/(site)/voice/actions.ts:12`). Result after roughly five weeks:
   **0 published, 17 of 19 stranded in `UnderReview`.** This is the strongest
   evidence in this document that the gate and the human lane must ship together,
   and it is measured rather than argued. Applying the same shape to design
   languages without a working assignment lane would predictably strand 241 more.

One integrity note from the same read: the `ArtStyles` four declared states sum
to 465 against a total of 466. The extra record has `Status = "Deleted"` — not
one of ArtStyle's declared states (`art_style.ioa.toml:26`) — and its `Id` is the
literal string `"None"`, with `name = "Beryl"`. The `Deleted` status is a
platform-level soft-delete envelope (`temper-server/src/state/entity_ops.rs:1542`,
`is_deleted_envelope`), so the status itself is explainable. The `"None"` id is
**inferred**, not proven, to be a client that passed a Python `None` into the
entity-id path, which the platform then auto-created (§E.6). I did not trace the
writer; treat the causal story as a hypothesis and the two observed field values
as fact.

### E.3 What is in a state the new machines do not admit

**Every existing `Published` DesignLanguage.** All **252** of them (E.2, exact —
not an estimate) were published by the finalizer with no `HumanCurator`
anywhere. Once `human_curator_approved` exists it is `false` on every one, and
`PublishedRequiresCuratorApproval` is false of all of them.

**And the 241 in `UnderReview`**, which the earlier draft did not account for.
They are not in a state the invariant contradicts — the invariant only speaks
about `Published` — but they are the set that hits the new gate first, on day
one, all at once. Whatever the human lane is, it inherits a backlog of 241
before it processes a single new language.

The good news, verified: **this does not break anything at runtime.**
`[[invariant]]` blocks are not in the production `TransitionTable`
(`temper-jit/src/table/types.rs:44-68`); they are consumed only by
`temper-verify` and by the *simulation* handler
(`temper-server/src/entity_actor/sim_handler.rs:88`). No existing entity starts
failing writes. What breaks is the *truth of the claim* — the spec asserts
something false of the live data, which is precisely the situation constraint 4
exists to prevent.

**Repair (constraint 4):** backfill. For each already-`Published` language,
create a `HumanCurator` record in a terminal `Published` state with an
`assignee_ref` naming whoever is accepting retrospective responsibility (Rita,
in practice), a `curator_notes` string saying this was a retrospective
attestation of a pre-gate publication, and dispatch `RecordCuratorApproval` on
the language. That is honest — it records that the approval was retrospective
rather than pretending a human reviewed 252 languages. **The alternative —
scoping the invariant to languages published after a cutoff — is not available:
the guard vocabulary has no date comparison** (`guard.rs:18-63`), so there is no
way to say "this rule applies only to new entities". Backfill or drop the
invariant; there is no third option.

Cost: 252 `HumanCurator` creations + 252 `RecordCuratorApproval` dispatches,
scriptable, idempotent (both are set-once). At the standing 10-concurrent cap
this is minutes, not hours.

The 241 `UnderReview` languages are a separate and larger decision, because they
cannot be retrospectively attested — nobody has published them, so there is
nothing to attest *to*. They either get 241 real human decisions, or they get
returned to `Draft` in bulk, or the gate goes live only for languages entering
`UnderReview` after the cutoff — and that third option has the same problem as
above: **the guard vocabulary has no date comparison**, so "after the cutoff"
is not expressible as a guard. It would have to be a one-time bulk write that
marks the existing 241, which is a migration script, not a rule. Owner decision.

### E.4 The `Revise` cycle is the sharpest edge

`Revise` moves `Published → UnderReview` (`design_language.ioa.toml:510-516`).
`Restore` moves `Archived → UnderReview` (`:526`). Neither clears
`quality_review_passed` today, and neither would clear
`human_curator_approved`. A revised language would therefore satisfy the new
guard immediately and republish with no second human look. If re-approval is
wanted — and it should be, that is the point of the gate — both must clear the
flag, and that turns every `Revise` into a new human assignment. **That is a
material increase in human load and it is a decision for the owner, not for
this document.**

### E.5 Ordering of the deployment itself

The spec change and the WASM change are coupled and must not be split:

- Spec first, WASM second → the finalizer's `Publish` call starts failing its
  guard (`human_curator_approved` false). `ensure_language_published` treats a
  non-transition as a hard error (`lib.rs:1288-1296`), so **every quality_review
  job fails**, and `CurationJob` goes to `Failed`. Pipeline down.
- WASM first, spec second → languages sit in `UnderReview` with nobody assigned,
  because `HumanCurator` records are created by edge #5 which does not exist
  yet. Nothing is lost, nothing publishes, and the backlog is drainable by hand.

**WASM first.** And put a real `state_timeout` or a Datadog monitor on
`UnderReview` before flipping it, or the failure mode is silence — which is the
one Rita has flagged most often.

Cross-check against Genesis: `katagami-commons` and `katagami-curation` are
Genesis-primary with GitHub as mirror. A spec change here is a Genesis publish
plus a version pin bump on the running TemperPaw backend, not just a merge.

### E.6 Auto-create: an action against a missing id materialises the entity

This is not a new hazard introduced by the design, but the design's new triggers
raise the number of paths that can hit it, so it belongs in the blast radius.

`dispatch_bound_action` never checks that the instance exists — unlike PATCH,
PUT and DELETE, which all call `ensure_entity_exists_or_404`
(`temper-server/src/odata/write.rs:741`, `:913`, `:1076`). The actor is spawned
during the *authz snapshot* at `odata/bindings.rs:133`, which is **before** the
Cedar check at `:188`, and `EntityActor::pre_start` persists a bootstrap
`Created` event (`entity_actor/actor.rs:801-825`). So the phantom is durable and
is created even when the request is subsequently refused with 403 or 409.

Live evidence, from the same production read as E.2: the `ArtStyles` set contains
a record whose `Id` is the literal string `"None"` (§E.2). Whatever wrote it, an
entity now exists at that id. This is the class, observed in production rather
than argued from code.

Two consequences for this design:

1. **Use `create` resolvers, not `field` resolvers, on the new trigger edges.**
   `resolve_target_id` rejects only an *empty* field (`trigger/resolver.rs:24-28`);
   a stale-but-non-empty id resolves fine and then auto-creates a phantom at the
   dispatcher's `load_authz_resource_snapshot` call.
2. **A `cross_entity_state` guard auto-creates its own target.** Guard resolution
   goes through `resolve_entity_status` → `get_tenant_entity_state` → spawn, so a
   guard pointed at a nonexistent id of a *registered* type materialises that
   entity and compares against its freshly-minted initial status. The
   `cross-invariants.toml` path does **not** behave this way — it gates on
   `ensure_entity_loaded` (`odata/constraints.rs:336`), which consults the entity
   index and returns false for a never-touched id. Do not assume the two behave
   alike.

---

## F. Decision 3: quality review repairs **and** records

### F.1 The crux, confirmed

`CurationJob.CompleteQualityReview` (`curation_job.ioa.toml:500-507`) has **no
guard** and `params = ["design_language_ids", "organize_input"]` — **no output
channel at all**. The job's `output` field is written only by `FinalizeCompletion`
(`:878-884`) from the finalizer's own blob (`lib.rs:138-151`), and for
`quality_review` that blob is a fixed three-key literal (`lib.rs:917-921`):

```rust
Ok(json!({
    "validated": true,
    "job_type": "quality_review",
    "published_language_ids": published,   // the input list, echoed back
}))
```

Meanwhile the reviewer is an aggressive fixer by design.
`katagami-curation/agents/curator/skills/review-quality/SKILL.md:3`: *"Review and
FIX design languages before publish. **Do not write reports** …"* It repairs
token drift in place (`:99`, `:111`), `Revise`s and repairs already-published
languages (`:100`), creates missing embodiments and thumbnails (`:113`), repairs
the source fields behind an invalid DESIGN.md and relints (`:179`), fixes every
concrete taste-rule violation (`:191-196`), and regenerates the embodiment as
self-contained HTML (`:197`).

So a language that needed nothing and one where the reviewer rewrote the tokens,
regenerated the embodiment, re-authored DESIGN.md and both shadcn artifacts
produce **the same three keys with the same values**. The skill's own `## Output`
section (`:467-471`) asks for a `fixed` field; no action param can carry it. It
is dead prose.

The only existing quality record on a DesignLanguage is `review_status`, which
the skill sets to the constant `'reviewed'` (`SKILL.md:442-443`) — zero
information content. `DesignLanguage.SetReviewEvidence` does not exist (checked
the full action list, `design_language.ioa.toml:209-577`), and `UpdateQuality`
takes a `quality_score` param for which no `[[state]]` is declared.

### F.2 The design: copy the evidence pair ArtStyle already has

ArtStyle already has the right shape:
`SetReviewEvidence` (`art_style.ioa.toml:308-314`) supplies candidate evidence and
**clears** three attestation bools; `AttachArtStyleReview` (`:316-326`) is the
finalizer-only attestation that **sets** them, dispatched at `lib.rs:2507-2524`
with verified copies; and `ArtStyle.Publish` is guarded on all three (`:368-375`).

Mirror it on `DesignLanguage` — sketch, not to be committed from here:

```toml
[[state]]
name = "has_quality_review_record"
type = "bool"
initial = "false"

[[action]]
name = "AttachQualityReview"
kind = "input"
from = ["UnderReview", "Published"]
params = ["review_findings", "review_repairs", "rulebook_version"]
effect = [{ type = "set_bool", var = "has_quality_review_record", value = "true" }]
```

with `{ type = "is_true", var = "has_quality_review_record" }` added to
`Publish`'s guard list, and Cedar restricting `AttachQualityReview` to
`Agent::"system"` exactly as `art_style.cedar` does for `AttachArtStyleReview`.
`review_repairs` is **empty on a clean language and non-empty otherwise** — that
single distinction is the whole of decision 3, and it does not exist today.

Second-order benefit worth stating: this stops `quality_review_passed` being a
bit the publisher sets on itself. Today the finalizer dispatches
`MarkQualityPassed` unconditionally (`lib.rs:892-899`) one call before `Publish`,
and `MarkQualityPassed` carries `params = []` (`design_language.ioa.toml:542-548`).
Publish would now require a stored, structured record instead of a self-set flag.

### F.3 Does the pipeline reviewer become the ReviewAgent?

**No. They stay two roles, and the record is the bridge.** Four reasons:

1. **The pipeline reviewer repairs; `ReviewAgent` must not.** `ReviewAgent`'s
   alphabet is `RecordFinding` / `RecordVerdict` with a terminal
   `VerdictRecorded`. A machine that fixes a thing and then rules on its own fix
   is not a reviewer, it is a second author. Merging them destroys the
   independence that makes the verdict mean anything.
2. **Different principals.** The pipeline reviewer runs as `Agent::"system"` —
   the finalizer's headers are fixed once at `lib.rs:71-83`. `review_agent.cedar`
   forbids `RecordVerdict`/`RecordFinding` unless the principal is
   `Agent::"katagami-reviewer"` or `Agent::"system"`, and forbids them outright
   for `agent_type == "contributor"`.
3. **Different resources and lifecycles.** The pipeline reviewer acts on a
   `DesignLanguage` inside a `CurationJob`; `ReviewAgent` acts on a submission
   set with its own capture identity and its own terminal state.
4. **Different times.** Quality review runs inside the pipeline, before the
   artifact is publish-ready; `ReviewAgent` runs on a submitted set, after.

**The bridge is what makes both worth having.** With F.2's record in place,
`ReviewAgent.RecordFinding` becomes meaningful for the first time: rather than
re-deriving findings from scratch, the reviewer reads the repair history and
rules on *whether the amount and kind of repair is acceptable* — a judgment no
machine check makes today. A language that needed fourteen repairs and one that
needed none currently publish identically. That is also why decisions 2 and 3
belong in the same change: the human gate is only worth a person's time if the
person is shown something they could not previously see.

---

## G. One rulebook, and where the version stamp goes

### G.1 State of the rulebook — it is 63 rules, not 64

| Copy | Rules | Tracked? | Note |
|---|---|---|---|
| `~/.claude/skills/katagami-contributor/SKILL.md:137` | **63** | **no — untracked local file** | richest; carries rounds `·CH` (49–57) and `·B8` (58–63) |
| `katagami-curation/knowledge/rules/design-language.md` | **48** | yes | missing both later rounds |
| `mcp/skills/katagami-contributor/SKILL.md` | 0 | yes | procedure only; no rulebook, no reference to one |
| deployed `TasteRule` entities | runtime-only | — | **zero** in `katagami-curation/seed-data/` |

"64" is a counting artifact: a naive `grep -c '^[0-9]\+\.'` also matches the
numbered procedure list at line 28 of the same file. The rules themselves run
1–63. The Claude Code copy's own header calls itself the "verified canonical
file, embedded verbatim" — that is **false**; it is a superset that drifted
ahead of the tracked copy. `docs/study/behavior-inventory.md:612` says
"thirty-four", stale by two rounds.

The only version stamp that exists is `RULEBOOK_VERSION = "aa054051042e"`
(`ui/src/app/(site)/ab/ab-data.ts:11`), a frozen literal that matches **no file
on disk** — the SHA-256 prefixes today are `498eb3db9aa5` (repo rulebook),
`c0610962ec75` (Claude Code skill), `977f5ece01e4` (mcp skill).
`mcp/skills/katagami-iterate/SKILL.md:88,102` emits a `rulebook_version` field
that nothing computes.

**Reconciliation must land before the stamp**, or every run stamps the hash of a
file that is about to be replaced.

### G.2 Where the stamp goes

The actor specs should carry it, but the actor spec is **not** the primary home.
`spec_version` answers *which contract was this run structurally judged against*;
`rulebook_version` answers *which taste rules was it substantively graded
against*. Different layers consume them — layer 1 uses `spec_version`, the layer-2
judge uses the rulebook. `TrajectoryVerdict` already keeps the two layers as
separate rows precisely so a contradiction stays visible, and it has **no
rulebook field at all** (states at `trajectory_verdict.ioa.toml:32-148`, `Record`
params at `:157`). That is the actual hole: **no layer-2 verdict today can say
what it graded against.**

- **Primary — `TrajectoryVerdict` gains `rulebook_version`** as a `[[state]]` and
  a `Record` param. Without it a layer-2 verdict is uninterpretable and a
  re-grade under a new rulebook is indistinguishable from one under the old.
- **`CuratorAgent.ReceiveBrief` gains it**, alongside `spec_version` / `harness`
  (`curator_agent.ioa.toml:193`). The curator works *to* the rulebook, so the run
  declares it at open.
- **`ReviewAgent.ReceiveSubmission` gains it** (`review_agent.ioa.toml:117`). The
  reviewer grades against a rulebook and it need not be the one the curator used
  — that drift is exactly the case worth catching, and it is only catchable if
  both ends stamp.
- **`HumanCurator` does not.** The human is the rulebook's source, not something
  graded against it. Stamping there would imply the human's judgement is being
  scored, which is not the model.
- **`DesignLanguage.AttachQualityReview` carries it** (F.2) — a repair is only
  interpretable against the rules it was repairing toward.

It must be computed the way `scripts/trajectory/spec_version.py` computes spec
versions: provenance-checked (READ / COMPUTED / RETRIEVED), **refused rather than
stamped** when provenance is absent, with a snapshot retained so an old verdict's
rulebook stays retrievable. The current `RULEBOOK_VERSION` literal is the
anti-pattern — a stamp that matches nothing is worse than no stamp, because it
looks like provenance.

---

## H. Build order

Each step ends in something you can point at. Nothing later is required for an
earlier step to be worth having.

**0. Decide C.5 first.** Whether the composite verifier will see both spec
directories. Nothing in steps 3+ is provable without it, and the answer changes
whether this is a kernel effort or an app effort. If the answer is (c) — do not
cross the boundary — then stop after step 2 and write down that B.1 and B.3 are
unavailable.

**1. Close ARN-319. No wiring, no spec change.**
Add `SubmitForReview` (and the finalizer set from D.3) to
`design_language.cedar`, written against unconstrained `principal` with the
`unless` allowlist from D.3.
*Demonstrable:* the same `katagami-contributor` call that returns
409 `ActionFailed` today returns **403 `AuthorizationDenied`**, and the
finalizer's own run still publishes end to end. Both directions, live, on a
local server before prod. This is the entry in the verification log the study
actually needs, and it stands alone.
*Test the production shape:* prove it against the real loaded policy set with a
Customer-kind caller and a no-kind-header caller, not only an Agent.

**2. Add `RecordCuratorApproval`, the boolean, and the invariant — still no
triggers.**
Plus the clear-on-edit effects and the `Revise`/`Restore` clears from E.4.
*Demonstrable:* `temper verify` shows L0 reporting the new invariant inductive
and L1 proving it over the reachable space, with `DesignLanguage.Publish` now
unreachable in the model without the flag. This is B.3's per-entity half, and it
is real proof with zero wiring risk.

**2b. Decision 3: `AttachQualityReview` on `DesignLanguage` (F.2). No triggers.**
The record, the boolean, the `Publish` guard, the Cedar restriction to
`Agent::"system"`, and the finalizer writing real `review_findings` /
`review_repairs` instead of the fixed three-key literal.
*Demonstrable:* run one clean language and one deliberately broken one through
`quality_review`; the two jobs produce **different** records, with
`review_repairs` empty on the first and populated on the second. Today they are
byte-identical, so this is a before/after anyone can check.
*Sequencing:* this must land **before** step 5. The human gate is only worth a
person's time if the person is shown the repair history (F.3), and shipping the
gate first means the first humans through it see exactly what they see now.

**2c. The rulebook stamp (G.2), after the rulebook itself is reconciled (G.1).**
Reconcile the 63-rule Claude Code copy and the 48-rule tracked copy into one
tracked file first — stamping before that pins the hash of a file about to be
replaced. Then add `rulebook_version` to `TrajectoryVerdict.Record`, to
`CuratorAgent.ReceiveBrief`, and to `ReviewAgent.ReceiveSubmission`, computed
with the provenance discipline `spec_version.py` already uses.
*Demonstrable:* a layer-2 verdict names the rulebook it graded against; a run
authored under one rulebook and graded under another is visible as a mismatch
rather than silent. Also delete or recompute `RULEBOOK_VERSION` in
`ui/src/app/(site)/ab/ab-data.ts:11`, which currently matches no file on disk.

**3. Backfill the 252, and decide the 241 (E.3), before any behaviour changes.**
*Demonstrable:* zero `Published` languages with `human_curator_approved == false`,
counted by an OData query, plus a verification-log entry stating plainly that the
approvals are retrospective. The 241 `UnderReview` languages are a separate owner
decision (E.3) and blocking for step 5 — they hit the new gate on day one.

**4. Split `ReviewAgent.RecordVerdict` per C.4 and wire edges #2, #3, #5, #6
inside `katagami-curation` only.**
All four endpoints are in one directory, so composite verification works today
with no kernel change. No `drop_ok` anywhere.
*Demonstrable:* `temper verify katagami-curation/specs` prints
`[PASS] seed=CurationDirection scope=[…CuratorAgent, HumanCurator, ReviewAgent…]
— N joint states, no dropped reactions`. That line is B.1 and B.2, earned. Then
drive it live: one `CuratorAgent` run to `Submitted`, watch a `ReviewAgent`
appear, record a verdict, watch a `HumanCurator` appear with the verdict already
on it.

**5. Turn off the auto-publish in WASM (E.1, E.5 ordering).**
Remove `ensure_language_published`; decide where facets and taste vector go.
*Demonstrable:* a full pipeline run ends with the language in `UnderReview` and a
`HumanCurator` assignment waiting, art styles still publishing automatically in
the same run. That is the mixed path, live.

**6. Wire edges #7, #8, #9 across the app boundary** — only if step 0 chose (a).
*Demonstrable:* composite verification over the union prints PASS with
`DesignLanguage` in scope, and a human publishing through the Observe UI moves
the language `UnderReview → Published` with `human_curator_approved` set.

**7. Escalation and monitoring.** Edge #10 to the human channel; a Datadog
monitor on `reaction.authz_denied_count` for the katagami tenant (C.7) and on
languages sitting in `UnderReview` past a threshold (B.5).

**Before step 4, measure the joint state space.** Step 4's demonstrable is a
`[PASS] … — N joint states` line, but an over-budget run prints `[INCOMPLETE]`
instead and **still exits 0** (`temper-cli/src/verify/mod.rs:275-284`). Per-entity
counts are `CuratorAgent` 17,407, `HumanCurator` 48, `ReviewAgent` 15 against a
budget of 250,000, so the composed run may not close. Run it and read the actual
word before treating step 4 as done — `PASS` and `INCOMPLETE` are the difference
between proving B.1/B.2 and appearing to. If it comes back `INCOMPLETE`, the
lever is `CuratorAgent`'s four parallel lanes: a run submits exactly one of them
(`Submitted` is terminal and all four `Submit*` land there), so the four id
lists and four companion bools are largely redundant state.

**A prerequisite nobody has scheduled:** the three actor entity sets **do not
exist in production** (E.2 — `404 EntitySetNotFound`, while `CurationJobs`
returns 3178). The deployed `katagami-curation` predates commit `0d95e70f`. Every
"drive it live" demonstrable above requires republishing the app to Genesis and
bumping the pin first. This is greenfield, not migration, and it is step −1.

**Not in this order, tracked separately:** ARN-299 (field equality), which
unblocks C.1's real gate; making composite `Incomplete` gate rather than warn
(C.5(d)); a `Property::eventually` in the composite model (B.6); and raising
`DEFAULT_COMPOSITE_MAX_COUNTER` above 3 so the batch cap is exercised jointly
(B.6). Each is a kernel change with blast radius beyond Katagami.
