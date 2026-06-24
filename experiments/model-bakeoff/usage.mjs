#!/usr/bin/env node
// usage.mjs — collect "thinking" token usage + cost for bake-off contestant runs.
//
// Cost metric = thinking tokens only (input + cached + output, where output already
// includes reasoning). Image/video generation is EXCLUDED: image gen runs through a
// separate tool/MCP (nano-banana, fal, built-in image_gen) and its pixels are billed
// as image tokens that do NOT appear in these text-token ledgers, so they're already out.
//
// Join strategy (session_id is null in run.json, so we match by output-folder name):
//   codex      -> the ~/.codex rollout whose JSONL mentions the folder; last token_count.
//   claude-code-> the ~/.claude project JSONL with the MOST folder mentions (excludes this
//                 control session via $CLAUDE_CODE_SESSION_ID); sum per-message usage.
//   grok-build -> the ~/.grok session dir mentioning the folder -> its ULID -> sum the
//                 unified.jsonl rows whose `sid` equals that ULID.
//
// Usage:  node usage.mjs [<model_timestamp_folder> ...]
//         (defaults to the round-6 folders under ~/Development/katagami)

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const KATAGAMI = path.join(HOME, "Development/katagami");

// ── PRICING ($ per 1M tokens) ──────────────────────────────────────────────
// Verified 2026-06-22 against provider pricing pages.
// `cachedInput` = cache-read rate; `cacheWrite` = cache-creation rate (Claude only).
const PRICING = {
  // openai.com/api/pricing — GPT-5.5. (>272K-ctx requests bill 2x in / 1.5x out; not modeled.)
  "gpt-5.5":    { input: 5.0, cachedInput: 0.5, cacheWrite: 5.0,  output: 30.0 },
  // platform.claude.com/docs pricing — Opus 4.8 STANDARD tier (fast mode would be $10/$50).
  "opus-4.8":   { input: 5.0, cachedInput: 0.5, cacheWrite: 6.25, output: 25.0 },
  // x.ai — grok-build-0.1, the GrokBuild CLI's agentic-coding model (256K ctx).
  "grok-build": { input: 1.0, cachedInput: 0.2, cacheWrite: 1.0,  output: 2.0 },
  // x.ai — Grok Composer 2.5 (fast variant), the GrokBuild CLI's "Composer" model.
  "grok-composer-2.5-fast": { input: 3.0, cachedInput: 0.3, cacheWrite: 3.0, output: 15.0 },
  // Z.ai — GLM 5.2 (via OpenRouter, run through GrokBuild's custom endpoint).
  "glm-5.2": { input: 1.4, cachedInput: 0.26, cacheWrite: 1.4, output: 4.4 },
  // Sakana — Fugu Ultra (PAYG). Verified against the raw logs: Fugu reports standard
  // prompt/completion tokens (no separate orchestration field) and bills per token processed,
  // so the captured totals ARE the full billable — not a lower bound.
  "fugu-ultra": { input: 5.0, cachedInput: 0.5, cacheWrite: 5.0, output: 30.0 },
};

// Bill each contestant as its REAL model regardless of self-ID:
// the GPT harness is GPT-5.5; the GrokBuild CLI's model is grok-build (not "grok-4.3").
const MODEL_TO_PRICE = {
  "gpt-5": "gpt-5.5", "gpt-5.5": "gpt-5.5",
  "opus-4.8": "opus-4.8",
  "grok-4.3": "grok-build", "grok-build": "grok-build",
  "grok-composer-2.5-fast": "grok-composer-2.5-fast", "composer": "grok-composer-2.5-fast",
  "z-ai/glm-5.2": "glm-5.2", "glm-5.2": "glm-5.2", "glm52": "glm-5.2",
  "fugu-ultra": "fugu-ultra", "fugu": "fugu-ultra",
};

const HARNESS_BY_MODEL_PREFIX = { gpt: "codex", opus: "claude-code", grok: "grok-build", glm: "grok-build" };

// ── helpers ────────────────────────────────────────────────────────────────
const sh = (cmd) => { try { return execSync(cmd, { encoding: "utf8", maxBuffer: 1 << 30 }); } catch { return ""; } };
const grepFiles = (literal, globOrDir) =>
  sh(`grep -rl -F -- ${JSON.stringify(literal)} ${globOrDir} 2>/dev/null`).split("\n").filter(Boolean);
const readJsonl = (file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const fmt = (n) => n.toLocaleString("en-US");

// ── per-harness extractors → normalized {uncachedInput, cachedInput, cacheWrite, output, reasoning, source} ──
function fromCodex(folderName) {
  const files = grepFiles(folderName, path.join(HOME, ".codex/sessions"));
  if (!files.length) return null;
  // last token_count line of the matching rollout carries the cumulative total
  let best = null, bestTokens = -1;
  for (const f of files) {
    const rows = readJsonl(f).filter((d) => d?.payload?.type === "token_count");
    const last = rows[rows.length - 1]?.payload?.info?.total_token_usage;
    if (last && last.total_tokens > bestTokens) { bestTokens = last.total_tokens; best = { f, last }; }
  }
  if (!best) return null;
  const t = best.last;
  return {
    uncachedInput: (t.input_tokens || 0) - (t.cached_input_tokens || 0),
    cachedInput: t.cached_input_tokens || 0,
    cacheWrite: 0,
    output: t.output_tokens || 0,           // includes reasoning
    reasoning: t.reasoning_output_tokens || 0,
    source: path.basename(best.f),
  };
}

function fromClaude(folderName) {
  const files = grepFiles(folderName, path.join(HOME, ".claude/projects/*/*.jsonl"));
  const here = process.env.CLAUDE_CODE_SESSION_ID || "";
  const candidates = files
    .filter((f) => !here || !path.basename(f).startsWith(here)) // exclude this control session
    .map((f) => ({ f, hits: Number(sh(`grep -c -F -- ${JSON.stringify(folderName)} ${JSON.stringify(f)}`).trim() || 0) }))
    .sort((a, b) => b.hits - a.hits);
  if (!candidates.length) return null;
  const f = candidates[0].f; // the session that created the files mentions them the most
  let uncachedInput = 0, cachedInput = 0, cacheWrite = 0, cacheWrite1h = 0, output = 0;
  // Claude Code writes the SAME message's usage to the JSONL more than once; dedup by
  // (message.id, requestId) — exactly what ccusage does — or the cost ~2x over-counts.
  const seen = new Set();
  for (const d of readJsonl(f)) {
    const m = d?.message; const u = m?.usage; if (!u) continue;
    if (m.id) { const key = m.id + "|" + (d.requestId || ""); if (seen.has(key)) continue; seen.add(key); }
    uncachedInput += u.input_tokens || 0;
    cachedInput += u.cache_read_input_tokens || 0;
    output += u.output_tokens || 0;          // includes thinking
    const cc = u.cache_creation;
    if (cc) { cacheWrite += cc.ephemeral_5m_input_tokens || 0; cacheWrite1h += cc.ephemeral_1h_input_tokens || 0; }
    else cacheWrite += u.cache_creation_input_tokens || 0; // no TTL breakdown -> treat as 5m
  }
  return { uncachedInput, cachedInput, cacheWrite, cacheWrite1h, output, reasoning: 0, source: path.basename(f) };
}

function findModelDeep(o) {
  let m = null;
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) {
      if (k === "new_model" && typeof v === "string") m = v;
      else if (k === "model" && typeof v === "string" && !m) m = v;
      walk(v);
    }
  };
  walk(o);
  return m;
}

function fromGrok(folderName) {
  const files = grepFiles(folderName, path.join(HOME, ".grok/sessions"));
  if (!files.length) return null;
  // many sessions merely LISTED the folder; the one that WROTE it mentions it the most.
  const byDir = {};
  for (const f of files) {
    const dir = path.dirname(f);
    const n = Number(sh(`grep -rho -F -- ${JSON.stringify(folderName)} ${JSON.stringify(dir)} 2>/dev/null | wc -l`).trim() || 0);
    byDir[dir] = Math.max(byDir[dir] || 0, n);
  }
  const sid = path.basename(Object.entries(byDir).sort((a, b) => b[1] - a[1])[0][0]);
  let prompt = 0, cached = 0, completion = 0, reasoning = 0, realModel = null;
  for (const d of readJsonl(path.join(HOME, ".grok/logs/unified.jsonl"))) {
    if (d.sid !== sid) continue;
    const m = findModelDeep(d); if (m) realModel = m;
    const c = d.ctx || d; // token fields live on the row or its ctx
    if (c.completion_tokens == null && c.prompt_tokens == null) continue;
    prompt += c.prompt_tokens || 0;
    cached += c.cached_prompt_tokens || 0;
    completion += c.completion_tokens || 0;
    reasoning += c.reasoning_tokens || 0;
  }
  return {
    uncachedInput: Math.max(0, prompt - cached),
    cachedInput: cached,
    cacheWrite: 0,
    output: completion + reasoning, // count reasoning as billable output
    reasoning,
    realModel, // the GrokBuild CLI runs many models; trust the log, not run.json
    source: `grok ${realModel || "?"} sid ${sid}`,
  };
}

const EXTRACTORS = { codex: fromCodex, "claude-code": fromClaude, "grok-build": fromGrok };

function cost(norm, priceKey) {
  const p = PRICING[priceKey];
  if (!p) return null;
  const M = 1e6;
  return (
    (norm.uncachedInput * p.input + norm.cachedInput * p.cachedInput +
      norm.cacheWrite * p.cacheWrite + (norm.cacheWrite1h || 0) * (p.input * 2) +
      norm.output * p.output) / M
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
const DEFAULT_FOLDERS = [
  path.join(KATAGAMI, "opus-4.8_2026-06-22_1927"),  // Opus 4.8
  path.join(KATAGAMI, "gpt-5_2026-06-22_1930"),     // GPT-5.5
  path.join(KATAGAMI, "grok-4.3_2026-06-22_1943"),  // grok-build
  path.join(KATAGAMI, "grok-4.3_2026-06-22_2013"),  // grok-composer-2.5-fast (Composer)
  path.join(KATAGAMI, "grok-4.3_2026-06-22_2016"),  // z-ai/glm-5.2 (GLM)
  // Fugu wrote to a different worktree; its reported tokens are the full billable (verified, not a lower bound).
  path.join(HOME, "Development/katagami-worktrees/grok-kodomo-no-hi-language-20260622/grok-4.3_2026-06-22_2023"), // fugu-ultra
];

const folders = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FOLDERS);

const rows = [];
for (const folder of folders) {
  const name = path.basename(folder);
  let run = {};
  try { run = JSON.parse(fs.readFileSync(path.join(folder, "run.json"), "utf8") || "{}"); } catch {}
  const model = run.model || name.split("_")[0];
  const harness = run.harness || HARNESS_BY_MODEL_PREFIX[model.slice(0, 3)] || "?";

  const extract = EXTRACTORS[harness];
  const norm = extract ? extract(name) : null;
  if (!norm) { rows.push({ name, model, billedModel: MODEL_TO_PRICE[model] || model, harness, error: "no matching session log found" }); continue; }

  // run.json self-report is often wrong (GrokBuild runs many models); prefer the model the logs show.
  const realModel = norm.realModel || model;
  const priceKey = MODEL_TO_PRICE[realModel] || MODEL_TO_PRICE[model] || realModel;
  const p = PRICING[priceKey] || {};
  const M = 1e6;
  // THINKING = fresh input the model actually read + tokens it generated (output incl. reasoning).
  // cache-reads are the SAME context re-sent every agentic turn — a billing line, NOT thinking — so excluded here.
  const thinkingTokens = norm.uncachedInput + norm.output;
  const contextReread = norm.cachedInput;
  const costThinkingUSD = (norm.uncachedInput * (p.input || 0) + norm.output * (p.output || 0)) / M;
  const costBilledUSD = cost(norm, priceKey); // everything actually paid, incl. cache read + write
  const rec = { name, model, billedModel: priceKey, harness, ...norm, thinkingTokens, contextReread, costThinkingUSD, costBilledUSD, pricingVerified: true };
  rows.push(rec);
  try { fs.writeFileSync(path.join(folder, "usage.json"), JSON.stringify(rec, null, 2)); } catch {}
}

// console report
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log("\nMODEL BAKE-OFF — thinking per design (cache re-reads & image/video gen excluded from THINKING)\n");
console.log(pad("model", 11), pad("harness", 12), padL("fresh in", 10), padL("output", 9), padL("THINKING", 11), padL("ctx reread", 12), padL("$ think", 9), padL("$ billed", 10));
console.log("-".repeat(96));
for (const r of rows) {
  if (r.error) { console.log(pad(r.billedModel, 11), pad(r.harness, 12), "   (" + r.error + ")"); continue; }
  console.log(
    pad(r.billedModel, 11), pad(r.harness, 12),
    padL(fmt(r.uncachedInput), 10), padL(fmt(r.output), 9), padL(fmt(r.thinkingTokens), 11),
    padL(fmt(r.contextReread), 12),
    padL("$" + r.costThinkingUSD.toFixed(2), 9), padL("$" + r.costBilledUSD.toFixed(2), 10),
  );
}
console.log("\n  THINKING = fresh input read + output generated (incl. reasoning) — the model's real work.");
console.log("  ctx reread = same context re-sent each agentic turn (cheap cached tokens); in $ billed, not THINKING.");
console.log("  $ think = thinking-only cost; $ billed = total incl. caching. prices verified 2026-06-22.\n");

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "usage-latest.json"), JSON.stringify(rows, null, 2));
