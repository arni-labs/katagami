# ADR-0016: First-class provenance tier for design languages

## Status

Accepted

## Context

The commons holds two kinds of design language and cannot tell them apart. Most
are **agent-generated** — synthesized end to end by the curation pipeline or a
bake-off run. A growing few are **human-driven**: a person steers an existing
(usually agent-generated) language through iterative, taste-led refinement into a
new descendant. The first such language, **Chiclet**, is ready to submit — a human
directed 13 rounds of refinement on **Pushpin** (an agent-generated corkboard
language) via the iteration loop (ARN-124), and the steered rounds are captured as
a trajectory.

Nothing in the schema records **who did the creative work.** Lineage already exists
(`parent_ids`, `lineage_type`, `generation_number` as params on `SetLineage`) but
answers a different question — **what** a language descends from, not **who** made
it. A human who elevates an agent language into something they own is invisible
today.

This matters beyond bookkeeping. The Design × AI Atlas research converged on
exactly this need: ship a **machine-readable lineage card per language** (C2PA /
Content Credentials style), scale credit to **provenance in honest tiers, never
blurred**, and always say **"human-curated, AI-synthesized," never bare
"AI-generated."** The taste-training pipeline also wants to filter gold data by who
authored a language. A first-class provenance distinction is the prerequisite for
all three.

## Decision

Add provenance as a first-class fact on `DesignLanguage`, orthogonal to lineage.

- **`provenance_tier`** — a `[[state]]` of `type = "string"`, `initial =
  "agent_generated"`, value set **`agent_generated` | `human_curated` |
  `human_authored`**. It is modeled as a documented string (not an enum) because
  the IOA specs have no `enum` type; this follows the existing `review_status` /
  `embodiment_format` pattern.
- **`has_provenance`** — a presence `bool` for the lineage card, mirroring
  `has_model_provenance` / `has_credits`.
- **`SetProvenanceTier`** — an `input` action from `Draft` / `UnderReview` /
  `Published`, params `["provenance_tier", "provenance"]`, effect `set_bool
  has_provenance = true`. `provenance` is the machine-readable lineage card:
  `{tier, parent_ids, models[], human_curator, process (iteration-loop session +
  steered rounds), created_at}`. Editable post-publish, like `SetModelProvenance` /
  `SetCredits` — provenance is attribution metadata, not a governed source artifact.

**Orthogonal to lineage.** `parent_ids` say what a language descends from;
`provenance_tier` says who made it. A `human_curated` language normally has an
`agent_generated` parent — that is the whole point.

**Default `agent_generated`.** The curation pipeline's own output *is*
agent-generated, so every existing language defaults to the correct tier with no
migration and no change to the synthesize/submit flow. Human work is tagged
explicitly via `SetProvenanceTier`.

**Curator-verified through the existing review gate.** Submissions land
`UnderReview` and are never self-published; the curator confirms the tier before
`Publish`. An under-review tier is a *claim*; publishing blesses it. A
`human_curated` claim is backed by the captured iteration-loop trajectory (the
steered rounds are the evidence). No new hard gate is introduced.

**Surfaced as a badge.** An on-brand chip on the gallery card and the language
detail page (beside `Credits` / `ModelProvenance`) shows "Human-curated" /
"Human-authored"; agent-generated is the unmarked default.

## Consequences

- The commons can now distinguish human-curated from agent-generated languages
  first-class — a queryable field plus a visible badge. This is the foundation for
  the honest-provenance / anti-slop position and for filtering taste-training data
  by authorship.
- **Chiclet** submits as `provenance_tier = human_curated` (parent Pushpin, curator
  the human contributor, process the `iter-pushpin-1` session, 13 steered rounds).
- `provenance_tier` is **not** a `SubmitForReview` / `Publish` guard and is **not**
  added to the finalizer's `verify_review_ready_state` lists, so existing agent
  submissions are unaffected and the change is non-breaking. It is a plain string
  state, so L1 verification is unchanged; the *correctness* of the value is a
  curation-review property, not a model-checked invariant.
- The `provenance` lineage card is the seed of the C2PA-style machine-readable
  record the Atlas research called for; a later step can export it as a
  `LINEAGE.md` artifact beside `DESIGN.md`.

## Rejected alternatives

Reuse `model_provenance`. Rejected: it records *which AI models* produced a
language, not whether a *human* drove the creative work — a `human_curated`
language still used models. Different axis; conflating them loses the distinction
we need.

The Atlas draft enum `cataloged-tradition / agent-synthesized /
contributor-deposited`. Rejected: it mixes source/lineage with authorship. An
authorship tier (`agent_generated` / `human_curated` / `human_authored`) kept
separate from lineage is cleaner and composes with the existing `SetLineage`.

A separate `Provenance` / `LineageCard` entity. Rejected as premature: a field plus
a JSON card on the language (as with `credits` / `model_provenance`) is enough for
v1. Promote to an entity only if provenance needs its own lifecycle.

A hard curator-verified gate before `Publish` now. Deferred: publishing already
implies curator blessing. If self-claiming becomes a problem, add a
`provenance_verified` bool flipped by `MarkQualityPassed` and a `Publish` guard —
recorded as deferred, following the ADR-0015 pattern of enforcing invariants in the
spec rather than in glue.
