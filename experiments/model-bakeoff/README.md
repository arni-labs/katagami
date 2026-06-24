# Katagami model bake-off — GLM 5.2 vs Opus 4.8 vs Grok

Which model is best at the job Katagami exists for: take a **concept** and
**synthesize, source, and create a design language** — then embody it the Katagami
way (a `DESIGN.md` spec → an embodiment specimen → a landing page → a dashboard).

This is **not** a contract-compliance checklist. It judges design intelligence:
how well each model researches real precedent, forms an original point of view, and
executes it across four artifacts.

## The setup

- **Concept:** stargazing (a domain whose obvious move — a black/red night-mode UI —
  makes "did you have a real, sourced point of view?" easy to see).
- **Each model**, in its own agent with **web/tools on**, produces from that concept:
  `DESIGN.md` (with a **Sources & lineage** section) + `embodiment.html` +
  `landing.html` + `dashboard.html`.
- **Score:** a five-dimension rubric, judged by a **blind cross-model panel** — each
  model blind-scores the entries (A/B/C), and no model's score counts toward its own
  entry. See [`rubric.md`](rubric.md).
- **Final call:** you, plus a "which would you ship" poll on `compare.html`.

## The rubric (the score)

1. **Sourcing & grounding** — real, specific, relevant precedent (not invented).
2. **Synthesis & POV** — one coherent motif with a thesis; original, not pastiche.
3. **Coherence** — the motif holds across all four artifacts.
4. **Craft** — embodiment-grade, believable, beautiful.
5. **Distinctiveness** — library-unique vs generic-AI.

## What's here

| file | what it is |
|------|------------|
| `system-prompt.md` | The contestant brief: research, then produce the four-artifact set in the Katagami house style. |
| `brief.md` | The concept — stargazing — and the deliverables. |
| `harness/baseline.css` | The one frozen reset every entry starts from. |
| `run-packet.md` | How to produce each model's entry (web/tools on). |
| `rubric.md` | The five dimensions + 1–5 anchors. |
| `judge-packet.md` | The blind judging prompt + JSON output schema. |
| `runs/<model>/` | Each model's four artifacts + `meta.json`. |
| `judges/<judge>.json` | Each judge's blind scores. |
| `aggregate.mjs` | Maps A/B/C → models, drops self-scores → `results.json`. |
| `compare.html` | Blind A/B/C showcase of all four artifacts + rubric scorecard + reveal + poll. |

## Reproduce

```bash
# 1. produce each entry (see run-packet.md), files into runs/<slug>/
# 2. run the blind cross-model panel (see judge-packet.md), files into judges/<slug>.json
node aggregate.mjs
python3 -m http.server 8742    # open http://localhost:8742/compare.html
```

## The headline tension

Stargazing UIs reach for black + glowing dots, or red night-mode (to protect dark
adaptation — Stellarium, SkySafari). The interesting question is whether a model
*knows* that history and convention and forms a real position on it, or just
defaults to the cliché. That's what the rubric — especially Sourcing and Synthesis —
is built to expose.
