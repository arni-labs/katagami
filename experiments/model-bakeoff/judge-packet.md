# Judge packet — run each model as a blind judge

The comparison is scored by a **cross-model panel**: each model (Claude/Opus 4.8,
GLM 5.2, Grok) judges the entries **blind**. Entries are presented only as **A, B,
C** — no model names, in the fixed blind order used everywhere (`aggregate.mjs`
prints it). Self-favoritism is removed at aggregation: an entry's score never counts
the judge whose model made it, so judges can score all three uniformly.

## What to give each judge

In one prompt, paste:

1. The **rubric** (`rubric.md`) — the five dimensions and the 1–5 anchors.
2. For **each** entry A, B, C, in blind order:
   - its `DESIGN.md` (full text), and
   - its three pages — ideally **screenshots** of the rendered `embodiment.html`,
     `landing.html`, `dashboard.html` (best for craft/coherence); the HTML source
     if you can't attach images.
3. The instruction block below.

> Run the **same** judge prompt for every judge. Give every judge the entries in the
> **same A/B/C order**. Save each judge's reply to `judges/<judge-slug>.json`
> (`opus-4-8`, `glm-5-2`, `grok`).

## Instruction block (paste verbatim)

> You are a blind judge in a design-language bake-off. Three entries (A, B, C) each
> contain a `DESIGN.md` and three rendered pages (embodiment, landing, dashboard)
> for the same concept. Score **each** entry on the five rubric dimensions, **1–5**
> integers, using the anchors in the rubric. For **Sourcing**, verify the cited
> references are real and specific — treat vague or fabricated citations as a 1.
> Be a discerning critic: do not cluster scores; reserve 5 for genuinely excellent
> work and 1–2 for weak work. For each dimension give a **one-sentence** reason
> grounded in something specific you saw.
>
> Output **only** valid JSON, no prose, in exactly this shape:
>
> ```json
> {
>   "judge": "<your-model-id>",
>   "scores": {
>     "A": {
>       "sourcing":        {"score": 0, "reason": ""},
>       "synthesis":       {"score": 0, "reason": ""},
>       "coherence":       {"score": 0, "reason": ""},
>       "craft":           {"score": 0, "reason": ""},
>       "distinctiveness": {"score": 0, "reason": ""}
>     },
>     "B": { "...": "same five keys" },
>     "C": { "...": "same five keys" }
>   }
> }
> ```

## Then

```
node aggregate.mjs      # maps A/B/C -> models, drops self-scores, writes results.json
# open compare.html over http to see the scorecard + blind showcase
```
