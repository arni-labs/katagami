# Metrics contract — bake-off cost / tokens / time

> Where per-model **cost, token usage, and time** are stored, and how the bake-off page reads
> them. Same methodology as the prior local-HTML bake-off (the validated `consolidate.mjs`
> accounting), now Temper-native. The orchestrator populates these; the page only reads them.

## Where the page reads it

Per round (one `Direction`), filter the three entity types by `direction_id` and read each
entity's `model_provenance`. One query, everything inline — no side file, no log access.

```
GET /tdata/DesignLanguages?$filter=direction_id eq '<DID>'
    (also /tdata/ArtStyles and /tdata/PaletteSystems — same filter)

per entity:
  fields.model_provenance.style.model   -> which model ("opus", "grok-build", "qwen36-or", ...)
  fields.model_provenance.metrics       -> the numbers (shape below)
```

Read the run's totals from the **DesignLanguage**. One harness run produced its art_style +
palette + language together, so the DesignLanguage carries the whole run's cost/tokens/time —
**do not sum the three entities.** (ArtStyle/PaletteSystem carry the same `model` for grouping;
treat the DesignLanguage's `metrics` as the run total.)

## `metrics` shape

```json
"metrics": {
  "thinking_tokens": 0,        // HEADLINE — fresh_input + output (the model's real work; excludes cache re-reads)
  "total_tokens":    0,        // fresh_input + cache_read + cache_write + output (the big number)
  "fresh_input":     0,        // non-cached input tokens
  "cache_read":      0,        // cache re-read tokens
  "cache_write":     0,        // cache-creation tokens
  "output":          0,        // output tokens (completion + reasoning)
  "cost_usd":        0.0,      // realistic API list price, cache-aware (formula below)
  "billing":  "subscription",  // "subscription" | "openrouter" — context tag only; cost_usd is ALWAYS list price
  "wall_seconds":    0,        // harness elapsed (start -> exit)
  "source": "claude-jsonl"     // claude-jsonl | grok-accumulator | codex-jsonl — provenance of the numbers
}
```

## TOKENS — what they actually spent

Raw per-model CLI logs, deduped. Per harness type:

- **opus (claude)** -> `~/.claude/projects/<cwd>/*.jsonl`, deduped by `(message.id, requestId)`.
  `fresh_input=input_tokens`, `cache_read=cache_read_input_tokens`,
  `cache_write=cache_creation_input_tokens`, `output=output_tokens`.
- **gpt (codex)** -> codex session JSONL `total_token_usage`.
- **grok-build + every proxy model** (composer, glm, qwen*, deepseek, minimax, kimi, fugu, fugu-ultra)
  -> durable accumulator `_grok-tokens-all.jsonl` (deduped by `ts,sid,loop_index`), attributed to
  the model via the session's `summary.json.current_model_id`. `fresh_input = prompt_tokens −
  cached_prompt_tokens`, `cache_read = cached_prompt_tokens`, `output = completion_tokens +
  reasoning_tokens`. **lapdog** (Datadog proxy spans) is the cross-check on these numbers.

Derived: `thinking_tokens = fresh_input + output`;
`total_tokens = fresh_input + cache_read + cache_write + output`.

## COST — realistic API list price, cache-aware

```
cost_usd = (fresh_input × in_rate
          + cache_write × cw_rate
          + cache_read  × cached_rate
          + output      × out_rate) / 1e6
```

at each model's **public API list rate** (USD per Mtok), from the `consolidate.mjs` RATE map —
e.g. opus 4.8 (reduced tier) `{ in 5, cw 6.25, cached 0.5, out 25 }`; gpt and grok-build at their
published list rates; the OpenRouter/proxy models at **live-fetched OpenRouter list rates**.

`cost_usd` answers **"what would this realistically cost on an API"** for EVERY model — including
the ones that ran $0-marginal under a subscription/OpenRouter plan. `billing` only records how it
actually ran; it never changes `cost_usd`. (The exact rate table is the single source of truth in
`experiments/model-bakeoff/consolidate.mjs`; the page reads the already-computed `cost_usd`.)

## TIME

`wall_seconds` = harness start -> exit (from the `EXIT N in <wall>s` line).

**Display caveat:** show it as *time to produce the set*, **not** a clean solo speed benchmark.
All harnesses ran concurrently, so each number carries shared-machine contention — don't present
it as a speed race or rank models purely by it.

## Who populates it

The **orchestrator**, after the round closes:
1. Read each model's CLI logs (above) and compute the fields.
2. `SetModelProvenance` on each entity with `.metrics` merged into the existing provenance.

So by the time the page renders, every entity already carries its own numbers. The page never
touches the logs or any side file — it reads `model_provenance.metrics` and displays:
**headline = `thinking_tokens` + `cost_usd`; `total_tokens` secondary; `wall_seconds` with the caveat above.**
