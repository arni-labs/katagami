# The rubric — how a design language is judged

This bake-off does **not** score contract-compliance checklists. It scores the
thing Katagami actually exists to do: take a concept and **synthesize, source, and
create a design language**, then embody it. Five dimensions, each **1–5**, judged
**blind** (entries are labelled A/B/C; judges never know which model made which).

Each entry is the full Katagami output set for one concept (stargazing):
`DESIGN.md` → `embodiment.html` → `landing.html` → `dashboard.html`.

---

## 1. Sourcing & grounding

*Did it stand on real, specific, relevant precedent — or make it up?*

- **5** — Draws on real, **specific, verifiable** references (named artifacts,
  people, movements, conventions), each clearly informing a design decision. Shows
  it knows the domain's actual history and current conventions, and has a reason
  for departing from them.
- **3** — Some real references, but generic ("minimalism", "celestial themes") or
  decorative name-drops that don't visibly shape the design.
- **1** — Ungrounded, or references are vague/wrong/**hallucinated** (cited
  precedents that don't exist, or misattributed). Hallucinated sources cap this
  dimension at 1.

> Concrete for stargazing: does it know the celestial-atlas tradition (Bayer,
> Flamsteed, Bode), the magnitude system, the red-light night-vision convention —
> and use that knowledge, rather than defaulting to "space = black + glowing dots"?

## 2. Synthesis & point of view

*Is it one coherent idea with a thesis — or a pastiche of trends?*

- **5** — A single, named **structural motif** with a real argument behind it;
  combines its sources into something **original**, not a copy. Takes a defensible
  position (and ideally resists the obvious cliché).
- **3** — A competent look, but the "idea" is a mood board; multiple unrelated
  motifs, or a safe trend-follow.
- **1** — No point of view; generic "clean modern UI" that could be any product.

## 3. Coherence

*Does the motif actually hold across all four artifacts — or evaporate at render?*

- **5** — The motif the `DESIGN.md` names is visibly, consistently expressed in the
  embodiment, landing, **and** dashboard. Tokens, type, and patterns match the spec.
- **3** — The spec is good but the embodiments only partly deliver it; one surface
  drifts.
- **1** — The `DESIGN.md` promises one thing; the pages are generic or contradict it.

## 4. Craft

*Is it embodiment-grade — believable, beautiful, well-built?*

- **5** — Real product surfaces with genuine hierarchy, believable content,
  considered type and spacing; would pass as shippable. Not a component gallery.
- **3** — Solid but uneven: some unstyled defaults, misalignment, flat hierarchy,
  or filler content.
- **1** — Rough, generic, or template-like; obvious AI defaults.

## 5. Distinctiveness

*Would you know it from generic AI design? Is it library-unique?*

- **5** — Unmistakably its own language; distinctive type and form you wouldn't get
  from a default prompt. Belongs in a curated library.
- **3** — Pleasant but familiar; you've seen this exact look from other AI output.
- **1** — Indistinguishable from the default aesthetic (Inter, soft shadows, etc.).

---

## Scoring mechanics (cross-model panel, self-excluded)

- Every judge scores **all three** entries blind (A/B/C), 1–5 per dimension, with a
  one-sentence reason each.
- At aggregation, an entry's score on each dimension is the **mean of the judges
  whose model did not make that entry** — i.e. no model's score counts toward its
  own entry. (Judges score blind and uniformly; self-exclusion happens in
  `aggregate.mjs`, so no judge needs to know which entry to skip.)
- The headline number is the **mean across the five dimensions** (equal weight; a
  weighted variant is trivial to add).
- The rubric scores are the comparison. The "which would you ship" poll on
  `compare.html` is the separate, human taste call.
