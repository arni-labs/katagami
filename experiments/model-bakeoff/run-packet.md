# Run packet — produce each model's entry

Every model gets the **identical** input and the **same affordances** (web/tools on,
one working session). Run each in its own agentic environment (its coding agent /
CLI with web access), capture the four files, then judge.

Model slugs: `opus-4-8`, `glm-5-2`, `grok`.

---

## Producing an entry (do this for each contestant)

Paste these three blocks as one prompt, with **web/tools enabled**:

1. **SYSTEM** — full contents of [`system-prompt.md`](system-prompt.md).
2. **BASELINE RESET** — "Each HTML file must begin its inline `<style>` with this
   exact reset, then build on top": full contents of
   [`harness/baseline.css`](harness/baseline.css).
3. **BRIEF** — full contents of [`brief.md`](brief.md).

Let the model **research first** (it's graded on real sourcing), then save its four
files, unedited, into `runs/<slug>/`:

```
runs/<slug>/DESIGN.md        # includes the required "Sources & lineage" section
runs/<slug>/embodiment.html
runs/<slug>/landing.html
runs/<slug>/dashboard.html
runs/<slug>/meta.json        # { "model": "...", "tools": "web on", "date": "...", "notes": "..." }
```

One session per model. Don't hand-edit the output. Record the model's real config in
`meta.json`.

## Judging (after all entries exist)

The score is the blind cross-model panel — see [`judge-packet.md`](judge-packet.md)
and [`rubric.md`](rubric.md). Save each judge's JSON to `judges/<judge-slug>.json`,
then:

```
node aggregate.mjs      # writes results.json (maps A/B/C -> models, drops self-scores)
# open compare.html over http (so iframes load): python3 -m http.server 8742
```

## Fairness, stated plainly

- Identical system prompt + baseline + brief, and the **same affordance** (web/tools
  on) for every model. One working session each, no human edits to the output.
- Sourcing is graded on **real, specific** precedent; fabricated citations score 1.
- Scoring is a **blind** cross-model panel on the rubric; no model's score counts
  toward its own entry (`aggregate.mjs` self-excludes).
- Opus 4.8's entry was produced by Claude (Opus 4.8) with a real research pass and
  is disclosed as an interactive-agent run, not a single raw API call. Because
  web/tools are on, each model's tool harness differs — that is an accepted part of
  testing "which model, in its own agent, does this best," not an apples-to-apples
  single-prompt test.
