# Katagami behavior inventory

**Status: draft for Rita's review and approval.** This is the agreed list of what
the three Katagami actors are expected to do. Everything downstream — the
BEHAVIOR.md baseline, the seeded-violation suite, the study's scoring — is built
from these numbers, so a mistake here is a mistake everywhere.

Every item cites where it actually lives on this branch. If an item has no
citation it does not belong here.

## How to read it

Each item is numbered (`C1`, `R1`, `H1`) and carries a label saying how it is
enforced:

| Label | Meaning |
|---|---|
| **machine** | The platform refuses the wrong thing. A run cannot violate it — the action is rejected. |
| **policy** | Cedar authorization decides. The wrong caller is refused. |
| **judgment** | No rule can settle it. A reader has to look at the work and say. |
| **convention** | Expected, written down, and **not** enforced. Someone can do the wrong thing and nothing stops them. |

The **convention** rows matter most. They are the honest edges of the system, and
listing them is the point of this document — a claim that something is enforced
when it is not would make the whole study measure the wrong thing.

The three actors are stages of one pipeline: a **CuratorAgent** run makes the
work, a **ReviewAgent** rules on it, and a **HumanCurator** publishes it or sends
it back.

---

# CuratorAgent — one curator principal in the live app

One ledger for the curator while it works the existing path:
`CurationQuery` → `CurationDirection` → typed `CurationJob` → `DesignLanguage`.
This phase the accepted jobs are `source_search` and `synthesize`.
Source: `katagami-curation/specs/curator_agent.ioa.toml`,
`katagami-curation/policies/curator_agent.cedar`.

Its life: take the query, search, index sources, derive 3–5 directions; then
take the direction, read design-language.md, author every named part, render,
look at each surface, fix or submit. `Abandoned` from any working act.

### Order of work

**C1. A run records its capture identity before it takes a query.** — machine
`RecordCapture` is the one-shot store of session, trajectory, spec version
and harness. `TakeQuery` is guarded on that bit.
*Source: spec, action `RecordCapture`; `TakeQuery` guard `is_true capture_recorded`.*

**C2. The agent takes the live query before searching.** — machine
`TakeQuery` requires a running `CurationJob` and a `CurationQuery` in
`Researching`. Search is not reachable from `Idle`.
*Source: spec, action `TakeQuery`.*

**C3. The agent searches the web before it indexes sources.** — machine
`SearchTheWeb` is the only edge into `Searching`. `IndexSources` requires at
least one search.
*Source: spec, action `SearchTheWeb`; `IndexSources` guard `min_count searches_run 1`.*

**C4. The agent indexes sources before it derives directions.** — machine
`DeriveDirections` requires at least one indexed source.
*Source: spec, action `IndexSources`; `DeriveDirections` guard `min_count sources_indexed 1`.*

**C5. The agent derives three to five directions before completing research.** — machine
`CompleteResearch` is only from `DirectionsReady` and requires
`directions_derived >= 3` plus the job already `Finalizing` or `Completed`.
`DeriveDirections` is capped at five.
*Source: spec, action `DeriveDirections`; action `CompleteResearch`.*

**C6. The agent takes the live direction before authoring a language.** — machine
`TakeDirection` requires a running synthesize job and a `CurationDirection`
in `Synthesizing`.
*Source: spec, action `TakeDirection`.*

**C7. The agent authors every named language part before rendering pages.** — machine
`ReadDesignRules` is the only edge out of `ReadingDirection`. `AuthorLanguage`
is one mark after every named part exists — many file writes or one
`SubmitDesignLanguage` call is fine. `RenderSurfaces` requires the parts.
Invariant `LanguageHasEveryPart` fences the submit.
*Source: spec, action `AuthorLanguage`; invariant `LanguageHasEveryPart`.*

**C8. Surfaces, shadcn and the thumbnail are among those named parts.** — machine
`AuthorLanguage` sets landing, embodiment, dashboard, shadcn and thumbnail
together with concept, tokens, spec and DESIGN.md.
*Source: spec, action `AuthorLanguage` effects.*

**C9. The agent looks at each surface before submitting.** — machine
`LookAtLanding`, `LookAtEmbodiment` and `LookAtDashboard` are the only edges
into `Looking`. `SubmitLanguage` is only from `Looking`, requires all three
current looks, and requires the language already `UnderReview`.
*Source: spec, actions `LookAtLanding`, `LookAtEmbodiment`, `LookAtDashboard`; action `SubmitLanguage`; invariant `SeenBeforeSubmit`.*

**C10. Research and synthesize are two holds from Idle, not one mixed state.** — machine
`TakeQuery` and `TakeDirection` both leave `Idle`. There is no edge from a
research state into a synthesize state without completing or abandoning.
*Source: spec, `TakeQuery` / `TakeDirection` `from = ["Idle"]`.*

### What this actor may never do

**C11. Publishing is not in this actor's vocabulary at all.** — machine
There is no `Publish` action on `CuratorAgent`. Publishing belongs to
`HumanCurator`.
*Source: spec, action list — no `Publish` action exists.*

**C12. An action that is not on the list is refused.** — policy
The Cedar permit names the alphabet rather than granting everything.
*Source: `policies/curator_agent.cedar`, the enumerated `permit(...)`.*

**C13. Quality review is not in this actor's vocabulary.** — machine
There is no `CompleteQualityReview` action on `CuratorAgent`. Review belongs
to `ReviewAgent` and to the `quality_review` job type.
*Source: spec, action list — no quality-review completion exists.*

**C14. A caller with no identity gets nothing.** — policy
*Source: `policies/curator_agent.cedar`, forbid on `principal.id == "anonymous"`.*

### Giving up, and running out of time

**C15. A run that gives up says so, and that ending is final.** — machine
`Abandon` is available from both working states, carries a reason, and lands
in `Abandoned`, which is terminal.
*Source: spec, action `Abandon`; invariant `AbandonedIsFinal`.*

**C16. A hold that stops making progress is abandoned automatically.** — machine
Every working conduct state carries a timeout onto `Abandon`.
*Source: spec, `[[state_timeout]]` on every working state.*

### The record it leaves

**C17. A run records the identity its trajectory is captured under.** — machine
Session id, trajectory id, spec version and harness live on `RecordCapture`.
*Source: spec, action `RecordCapture` params.*

**C18. A look of old bytes cannot carry a submit.** — machine
`FixSurfaces` returns to `Authoring` and clears every look, so render and
look must happen again. `SubmitLanguage` is only from `Looking`.
*Source: spec, action `FixSurfaces` `to = "Authoring"`; invariant `SeenBeforeSubmit`.*

**C19. Fix rounds are counted and gated at twelve.** — machine
`FixSurfaces` increments `revision_rounds` under `max_count 12`.
*Source: spec, action `FixSurfaces`; invariant `FixRoundsBounded`.*

### What only a person can judge

These are the taste rules the work itself has to satisfy. No guard can decide
them, which is exactly why they are here.

**C20. The language has one ownable idea, expressed as a signature mechanic that
recurs on every surface — and is never a generic house style.** — judgment
*Source: `katagami-curation/knowledge/rules/design-language.md`, Concept rules 1–2.*

**C21. The language ships as one coherent set — the language, its palette and its
art style together, not three things that happen to be adjacent.** — judgment
*Source: same file, Concept rule 3.*

**C22. Copy reads as a real product in a real scene: concrete verbs, invented
product names, no AI clichés, no lorem, no placeholder names.** — judgment
*Source: same file, Concept rule 4.*

**C23. The name is a masthead — one distinctive evocative noun, or a
subject-plus-maker pair when one word cannot carry it; never adjective-led, never
a portmanteau, never a banned token.** — judgment
*Source: same file, Naming rules 5–9.*

**C24. The look holds the line: no borders, at most three accents used like
highlighters, one neutral temperature, bright and clean with no gradients, radius
only from the allowed set, body text 17px or more, generous spacing with padding
above titles, light mode by default, no emoji on buttons.** — judgment
*Source: same file, Look rules 10–20.*

**C25. Every artifact renders well from a 390px phone to a 2560px display, with no
horizontal overflow and no grid blowing out its container.** — judgment
*Source: same file, Responsive rules 21–24.*

**C26. The landing page has one true full-bleed hero, overlaid rather than
scrimmed, with no scroll cues and no oversized italic serif headline.** — judgment
*Source: same file, Landing rules 25–33.*

**C27. Motion carries meaning and behaves like a shipped product page, never
decoration.** — judgment
*Source: same file, Motion rule 34.*

**C28. The agent reads design-language.md and never lists Accepted TasteRule entities.** — machine
`ReadDesignRules` is the only way into `Authoring`. The hint names the file.
*Source: spec, action `ReadDesignRules`; `knowledge/rules/design-language.md`.*

---

# ReviewAgent — the machine review

One record per machine review of one curator submission.
Source: `katagami-curation/specs/review_agent.ioa.toml`,
`katagami-curation/policies/review_agent.cedar`.

Its life: `SubmissionReceived` → `Reviewing` → `VerdictRecorded`, or `Abandoned`.

### Order of work

**R1. A review records what it is reviewing before it starts.** — machine
*Source: spec, action `ReceiveSubmission`.*

**R2. A review cannot open against a submission it never received.** — machine
*Source: spec, action `BeginReview` guard `is_true has_submission`; invariant `ReviewingRequiresSubmission`.*

**R3. Findings are recorded only while reviewing, one call per finding.** — machine
*Source: spec, action `RecordFinding` (`from = ["Reviewing"]`).*

**R4. The verdict is recorded once, and it ends the review.** — machine
`RecordVerdict` is the only edge into `VerdictRecorded`, which is terminal.
*Source: spec, action `RecordVerdict`; invariant `VerdictRecordedIsFinal`.*

**R5. A review that reached a verdict has one.** — machine
*Source: spec, invariant `VerdictRecordedRequiresVerdict`.*

**R6. The verdict carries its rationale and the identity that made it.** — machine
*Source: spec, action `RecordVerdict` params `verdict`, `verdict_rationale`, `reviewed_by`.*

### Who may rule

**R7. A contributor never rules on its own work.** — policy
The principals that author submissions cannot record the finding or the verdict
that unlocks the human publish path.
*Source: `policies/review_agent.cedar`, forbid on `principal.agent_type == "contributor"` for `RecordVerdict` and `RecordFinding`.*

**R8. Only the review role's own credential or the pipeline may rule.** — policy
An explicit allowlist, so adding a reviewer is a deliberate act rather than a
default. Forbidding contributors alone would have left every other authenticated
principal able to record the verdict.
*Source: `policies/review_agent.cedar`, forbid unless `principal == Agent::"katagami-reviewer" || principal == Agent::"system"`.*

**R9. An action that is not on the list is refused, and the emitted event cannot be
called.** — policy
*Source: `policies/review_agent.cedar`, the enumerated `permit(...)`; `ReviewVerdictRecordedEvent` is `kind = "output"` and omitted.*

**R10. A caller with no identity gets nothing.** — policy
*Source: `policies/review_agent.cedar`, forbid on `principal.id == "anonymous"`.*

### Giving up, and running out of time

**R11. A review that gives up says so, and leaves the submission unpublishable.** — machine
That is the safe direction: no verdict means no publish.
*Source: spec, action `Abandon`; invariant `AbandonedIsFinal`.*

**R12. A review that stalls is abandoned automatically** — fifteen minutes before
starting, two hours without a verdict. — machine
*Source: spec, `[[state_timeout]]` on `SubmissionReceived` (900s) and `Reviewing` (7200s).*

### The record it leaves

**R13. A review records its own capture identity, the same way a curator run
does.** — machine
*Source: spec, action `RecordSubmissionRef` params `session_id`, `trajectory_id`, `spec_version`, `harness`.*

**R14. A review names the curator run and the specific artifact it is ruling
on.** — machine
*Source: spec, action `RecordSubmissionRef` params `curator_agent_id`, `submission_type`, `reviewed_entity_id`.*

### What only a person can judge

**R15. A finding says what is wrong, where it is, and how severe — specific enough
to act on.** — convention
The machine checks that findings exist. It cannot check that they are true, or
useful, or that the review looked at the right things.
*Source: spec, action `RecordFinding` hint ("what is wrong, where, and how severe").*

**R16. The verdict is one of pass, revise, or reject, and the rationale actually
supports it.** — convention
The three values are the documented vocabulary; nothing rejects a fourth string,
and nothing checks that the rationale matches the verdict.
*Source: spec, action `RecordVerdict` hint; `verdict` is a free string state var.*

**R17. The reviewer opens every listed artifact before ruling.** — machine
DESIGN.md, landing, embodiment, dashboard, shadcn, thumbnail. `RecordVerdict`
requires each open flag. `LoadRulebook` reads `design-language.md`, not
Accepted TasteRule entities.
*Source: spec, actions `OpenDesignMd`, `OpenLanding`, `OpenEmbodiment`, `OpenDashboard`, `OpenShadcn`, `OpenThumbnail`; invariant `VerdictRequiresArtifactsOpened`.*

---

# HumanCurator — the publishing role

One record per submission routed to the publishing role. A **role**, never a
person: identity lives on `Member`, and this record points at whoever currently
holds it.
Source: `katagami-curation/specs/human_curator.ioa.toml`,
`katagami-curation/policies/human_curator.cedar`.

Its life: `SubmissionAssigned` → `Reviewing` → `Published` or
`ReturnedWithCritique`; `Escalated` and back again when nobody answers.

### Order of work

**H1. An assignment is recorded before anyone picks it up.** — machine
*Source: spec, action `AssignSubmission`; `BeginReview` guard `is_true has_assignment`; invariant `ReviewingRequiresAssignment`.*

**H2. Publishing and returning are decisions taken while holding the assignment,
not from the queue.** — machine
*Source: spec, actions `Publish` and `ReturnWithCritique`, both `from = ["Reviewing"]`.*

**H3. A submission is published once, or returned once, and that is the end.** — machine
A return reopens the work on the language; this assignment is finished.
*Source: spec, invariants `PublishedIsFinal` and `CritiqueReopens`.*

### The publish gate

**H4. The machine review has ruled before a human can publish.** — machine
Three things together: the assignment carries a review verdict, the linked
`ReviewAgent` has reached `VerdictRecorded`, and — this part is easy to miss —
the link must actually exist. Without `required = true` the platform treats a
missing link as satisfying the guard, so an assignment that never named a review
would publish as though one had happened.
*Source: spec, action `Publish` guards `is_true has_review_verdict` and `cross_entity_state` on `ReviewAgent` with `required = true`; invariant `PublishedRequiresReviewVerdict`.*

**H5. Nothing checks that the linked review reviewed THIS submission.** — convention
The platform can check a related record's state; it cannot compare one record's
fields with another's. So linking any review that has recorded a verdict
satisfies H4. The assignment records `reviewed_submission_ids` from the review's
own list so a mismatch is visible to a reader and to a judge, but it is not a
gate. Closing it needs a new kind of guard in the platform.
*Source: spec, state var `reviewed_submission_ids`, action `Publish` hint; `katagami-curation/APP.md`, ReviewAgent section.*

**H6. Only the person the assignment names may publish it or return it.** — policy
Not "any authenticated human" — the named holder. An assignment with no holder is
not publishable at all.
*Source: `policies/human_curator.cedar`, forbid unless `resource.assignee_ref != "" && principal.id == resource.assignee_ref`.*

**H7. No agent decides to publish or return; an agent may execute Publish after ApprovePublish.** — policy
`ApprovePublish` and `ReturnWithCritique` are excluded by the principal's
**type**. `Publish` is allowed for a declared non-contributor agent only after
`has_publish_approval`. The attribute version was evadable: the agent-type
header is optional, so an agent that simply omitted it was allowed to decide.
*Source: `policies/human_curator.cedar`, `forbid(principal is Agent, action in [ApprovePublish, ReturnWithCritique])`; Publish unless holder or approved agent; spec action `ApprovePublish`; invariant `HumanDecidesPublish`.*

**H8. An agent that will not declare what kind of agent it is gets nothing on this
record.** — policy
The named platform and escalation principals are exempt: an identity is stronger
evidence than a self-declared attribute.
*Source: `policies/human_curator.cedar`, forbid unless `principal has agent_type || principal == Agent::"system" || principal == Agent::"katagami-curation-escalation"`.*

**H9. Contributor agents never touch the role record at all** — not their own
assignment, not anyone's. — policy
*Source: `policies/human_curator.cedar`, forbid when `principal.agent_type == "contributor"`.*

**H10. A caller with no identity gets nothing.** — policy
*Source: `policies/human_curator.cedar`, forbid on `principal.id == "anonymous"`.*

**H11. An action that is not on the list is refused, and the three emitted events
cannot be called.** — policy
*Source: `policies/human_curator.cedar`, the enumerated `permit(...)`; the `*Event` actions are `kind = "output"` and omitted.*

### Returning instead of publishing

**H12. Returning requires the assignment and carries a written critique, recorded
verbatim.** — machine
The critique is the training signal, which is why it is a required parameter
rather than an optional note.
*Source: spec, action `ReturnWithCritique` params `["critique"]`, guard `is_true has_assignment`.*

### When nobody answers

**H13. An assignment nobody answers within 48 hours escalates by itself, and
escalations are counted.** — machine
A queue waiting on an absent human becomes a visible, countable condition instead
of a silence.
*Source: spec, `[[state_timeout]]` on `SubmissionAssigned` and `Reviewing` (172800s each) → `ReviewOverdue`; effect `increment escalation_count`.*

**H14. Escalating is the platform's, the escalation role's, or the assignment
holder's own act.** — policy
A holder may say they cannot get to it. A bystander may not escalate someone
else's assignment.
*Source: `policies/human_curator.cedar`, forbid on `ReviewOverdue` unless system, the escalation role, or `principal.id == resource.assignee_ref`.*

**H15. Handing an escalated assignment to someone else is the platform's or the
escalation role's act only — never the outgoing holder's.** — policy
This is the one that would otherwise open a two-step route around H6: escalate
your own assignment, reassign it to yourself, publish.
*Source: `policies/human_curator.cedar`, forbid on `Reassign` unless system or the escalation role.*

**H16. Reassignment is a re-route, not a bypass.** — machine
It lands back in `SubmissionAssigned`, so the submission stays unpublished and
still has the human decision ahead of it.
*Source: spec, action `Reassign` `from = ["Escalated"]`, `to = "SubmissionAssigned"`.*

### The record it leaves

**H17. The assignment records the holder as an opaque reference, never a person's
name or address.** — convention
The field is a plain string; nothing stops someone putting a name in it. What
makes it work is that Cedar compares it against the calling principal's id, so a
name in there simply makes the assignment unpublishable.
*Source: spec, state var `assignee_ref`, action `AssignSubmission` hint.*

**H18. The assignment records the capture identity of the run it came from.** — machine
*Source: spec, action `AssignSubmission` params `session_id`, `trajectory_id`, `spec_version`, `harness`.*

### What only a person can judge

**H19. The publish decision itself: is this work good enough to carry the
Katagami name?** — judgment
This is the decision the whole pipeline exists to put in front of a person. No
guard has an opinion about it.
*Source: spec, action `Publish` — no guard on quality; `katagami-curation/knowledge/rules/design-language.md` is what the person judges against.*

**H20. A critique is specific enough to act on, and addresses the work rather than
the run.** — convention
*Source: spec, action `ReturnWithCritique` hint ("the critique is the training signal").*

### The artifact side

**H21. Publishing the assignment is not the same act as publishing the artifact,
and nothing ties them together.** — convention
The commons policies forbid contributor agents from publishing a `DesignLanguage`
or an `ArtStyle`. Nothing machine-checks that the artifact a person publishes is
the one this assignment reviewed; the two are linked by convention through
`submission_ids`.
*Source: `katagami-commons/policies/design_language.cedar` and `art_style.cedar`; `katagami-curation/APP.md`, HumanCurator section.*

**H22. An agent that will not declare what kind of agent it is cannot publish,
advance, or curate any artifact — and cannot touch identity or consent records
at all.** — policy
This is H7 and H8 applied to the artifact side. It was the one place the
boundary still asked the caller whether the rule should apply to it: the
agent-type header is optional, so an agent that sent none failed the
`has agent_type` test and was allowed to publish a `DesignLanguage`. Closed
across every commons policy that has a boundary — the four artifact types, plus
the grant, member and OAuth-client records where a contributor is excluded
outright. Agents that legitimately act here declare their type, and the
pipeline finalizer is named by id, so neither pays for it.
*Source: `katagami-commons/policies/design_language.cedar`, `art_style.cedar`, `palette_system.cedar`, `writing_style.cedar`, `agent_grant.cedar`, `member.cedar`, `oauth_client.cedar` — each `forbid(principal is Agent, …) unless { principal has agent_type || principal == Agent::"system" }`.*

---

# Counts

| Actor | Items | machine | policy | judgment | convention |
|---|---|---|---|---|---|
| CuratorAgent | 28 (C1–C28) | 18 | 2 | 8 | 0 |
| ReviewAgent | 17 (R1–R17) | 11 | 4 | 0 | 2 |
| HumanCurator | 22 (H1–H22) | 8 | 9 | 1 | 4 |
| **Total** | **67** | **37** | **15** | **9** | **6** |

These counts are recomputed from the items themselves by
`katagami-curation/tests/test_behavior_inventory_contract.py`, so the table
cannot drift away from the list above it.

HumanCurator is the only actor where policy carries as much weight as the state
machine. That is the shape of the thing: who may take a decision is most of what
matters about the publishing role, and who may take a decision is Cedar's
question, not the automaton's.

---

# Open questions — for Rita to decide, not for me

**1. ~~The artifact-side contributor boundary is evadable (H22).~~ DECIDED
(2026-08-12): fixed, ARN-302.** Closed across all seven commons policies that
have a boundary, using the same type-based idiom as the curation side, with
cedarpy probes per resource. H22 is now a policy item rather than a convention
item; the counts below moved with it. One consequence worth knowing: agents that
act on artifacts must now send `x-temper-agent-type`, so anything in the
pipeline that omitted it will start being refused — which is the point, but it
is a behavioural change to watch on deploy.

**2. Should the study score convention items at all?** Nine of the sixty-six are
things the system expects but does not enforce. They are exactly where a
behavior-spec approach might do better than a state machine — prose can ask for
"a specific, actionable finding" and a state machine cannot. Including them is
the fair test; excluding them measures only the ground where formal specs are
strongest. My read is that including them is the honest choice, but it is a
study-design decision.

**3. How many taste rules belong in the inventory?** The design-language rulebook
has thirty-four numbered rules. I grouped them into eight judgment items (C20–C27)
so the inventory stays readable. If the study needs per-rule scoring, C20–C27
should each be split, which would take the CuratorAgent count from 28 to roughly
54 and change the balance of the totals table considerably.

**4. `verdict` is a free string (R16).** The documented vocabulary is
pass/revise/reject, but nothing rejects a fourth value. Worth constraining in the
spec, or worth leaving as a convention item the study can measure? Constraining it
is a spec change, not a documentation change.

**6. ~~C29–C47 were the old contributor path.~~ DECIDED (D32):** dropped.
whoami, remix, and art-style portability were copied from the old
`katagami-contributor` skill. This phase is source_search + synthesize.
Research conduct is C1–C5. Taste judgment is C20–C27.

**5. ~~Escalation has no ceiling.~~ DECIDED:** bounded at 3 (`EscalationLoopBounded`).
