# Katagami model bake-off — GLM 5.2 vs Opus 4.8 vs Grok

A clean, controlled comparison of three models at the one job Katagami exists for:
turning a brief into a **design language** (a `DESIGN.md` spec + a landing page + a
dashboard) that honors the Katagami design contract.

**The point:** hold *everything* constant except the model. Same prompt, same
contract, same brief, same baseline, one shot each. Then judge two ways — an
objective contract scorecard you can re-run, and a blind taste vote. The result is
a side-by-side you can screenshot straight into a thread.

## What's here

| file | what it is |
|------|------------|
| `system-prompt.md` | The Katagami contract, as the system prompt. **Identical for all models — the law.** |
| `brief.md` | The brief: **Lumen**, a fictional stargazing app (landing + dashboard). Identical for all. |
| `harness/baseline.css` | The one frozen styling block every model starts from. |
| `run-packet.md` | Copy-paste packet for running a challenger (GLM 5.2, Grok). |
| `runs/<model>/` | Each model's three files (`DESIGN.md`, `landing.html`, `dashboard.html`) + `meta.json`. |
| `gates.mjs` | Zero-dependency scorecard. `node gates.mjs` → writes `results.json`. |
| `compare.html` | The shareable artifact: blind A/B/C triptych + the scorecard + reveal + a taste vote. |

## Reproduce it

```bash
# 1. produce each challenger's output (see run-packet.md), drop into runs/<slug>/
# 2. score every model in runs/
node gates.mjs
# 3. view + screenshot (serve over http so the iframes load)
python3 -m http.server 8080   # then open http://localhost:8080/compare.html
```

## The gates (objective, all models judged identically)

Each is a static check from the documented contract. Heuristic ones are marked `~`.

1. **Light mode default** — `color-scheme:light` + light page background.
2. **Borderless** — no border ≥2px, and no ≥1px border at ≥25% opacity.
3. **Radius ∈ {0,16,24,9999}** — no other border-radius values.
4. **≤3 accent colors** `~` — ≤3 chromatic hue-families in `:root`.
5. **Body text ≥17px**.
6. **Table rows ≥14.5px** (dashboard).
7. **Display tracking ~-0.02em** `~`.
8. **Reduced-motion respected** — a `prefers-reduced-motion` block.
9. **No emoji in UI**.
10. **No gradients on controls** — buttons/inputs.
11. **Single hero on landing**.

## Fairness, stated plainly (so it survives scrutiny)

- One identical system prompt + baseline + brief. One shot. First response only.
  No retries, no human edits to any model's output.
- The **documented contract is the law** and is scored identically for everyone —
  even though the existing Katagami pipeline output diverges from it (the known
  contract/impl mismatch). Every model is told the same rules and judged by them.
- **Opus 4.8's entry was authored by Claude (Opus 4.8) in a single pass from this
  same packet, with no post-hoc gate-fixing.** Disclosed, not hidden. It is an
  interactive-agent generation, not a single raw API call — note that when you
  publish.
- Gates are objective and re-runnable; the taste vote is subjective and yours.

## The headline tension

Lumen is a **stargazing** app — every instinct says dark mode. The contract says
**light mode**. Who held the line, and who shipped a beautiful light astronomy
product anyway? That's the gate worth watching, and the best part of the thread.
