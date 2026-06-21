# Run packet — paste this into GLM 5.2 and Grok (and any future challenger)

This is the **identical input** every model receives. Do not edit it between models.
Paste the three blocks below in order as a single prompt, set temperature to the
provider default (record whatever it is), take **one** response, and save the three
files it produces into `runs/<model-slug>/` (`DESIGN.md`, `landing.html`,
`dashboard.html`). No retries, no cherry-picking, no follow-up edits.

Model slugs in this repo: `opus-4-8`, `glm-5-2`, `grok`.

---

## Block 1 — SYSTEM

Paste the full contents of [`system-prompt.md`](system-prompt.md) as the system
message (or at the top of the prompt if the tool has no system slot).

## Block 2 — BASELINE RESET

Tell the model: "Both HTML files must begin their inline `<style>` with this exact
reset, then build on top of it." Then paste the full contents of
[`harness/baseline.css`](harness/baseline.css).

## Block 3 — USER BRIEF

Paste the full contents of [`brief.md`](brief.md).

---

## Capturing the output

Save exactly what the model returns, unedited:

```
runs/glm-5-2/DESIGN.md
runs/glm-5-2/landing.html
runs/glm-5-2/dashboard.html
runs/glm-5-2/meta.json     # { "model": "...", "temperature": ..., "date": "...", "notes": "..." }
```

Then run the scorecard and open the comparison:

```
node gates.mjs            # writes results.json
# open compare.html via the local preview server (http, so iframes load)
```

## Fairness rules (state these when you publish)

- One identical system prompt + baseline + brief for all models.
- One-shot. First response only. No retries, no human edits to the output.
- Same temperature policy (provider default), recorded in each `meta.json`.
- The **documented contract is the law** — scored identically for every model,
  even though the existing Katagami pipeline output diverges from it (the known
  contract/impl mismatch). All models are told the same rules and judged by them.
- Opus 4.8's entry was authored by Claude (Opus 4.8) in a single pass from this
  same packet, with no post-hoc gate-fixing. Disclosed, not hidden.
