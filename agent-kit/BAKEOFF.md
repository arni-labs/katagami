# Bake-off runbook — for the orchestrator

A bake-off **round** = one **Direction** (a reimagine brief) handed to N harnesses (Claude Code / Codex / Grok / …). Each harness, following the **one skill** (`agent-kit/SKILL.md`), authors a complete take — its own **art style + palette + design language** — and submits the set. Every submission lands **`UnderReview`** and links to the round via **`direction_id`**. A human curator reviews the round and publishes the keepers. You (the orchestrator) drive the harnesses; you do not synthesize anything yourself.

## What each harness needs
- The **katagami repo** checked out (to read `agent-kit/SKILL.md` + the rulebook `katagami-curation/knowledge/rules/design-language.md`).
- **Env:** `TEMPER_API_URL` (the backend) and `TEMPER_API_KEY` (the contributor key) — source them from `.env.katagami-curator.local`; never print the key.
- Its own **image generation** + **headless browser** (build is bring-your-own).
- A **distinct principal id** per harness (e.g. `opus-contributor`, `grok-contributor`, `codex-contributor`) so submissions are attributable even before reading `model_provenance`.

## Per round

### 1. Create the Direction (the round)
```bash
set -a; source .env.katagami-curator.local; set +a; BASE="$TEMPER_API_URL"
H=(-H "X-Tenant-Id: default" -H "Authorization: Bearer $TEMPER_API_KEY" -H "Content-Type: application/json")
DID=$(curl -s -X POST "$BASE/tdata/Directions" "${H[@]}" -d '{}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["entity_id"])')
curl -s -X POST "$BASE/tdata/Directions('$DID')/KatagamiCommons.SetDirection" "${H[@]}" -d '{
  "title":"Round 1 — <theme>",
  "brief":"<the reimagine brief: the angle/concept to reimagine the source toward + constraints + what good looks like>",
  "source_language_id":"<SOURCE_LANGUAGE_ID>",
  "is_bakeoff":"true", "round_label":"r1",
  "model_pool":"[\"opus\",\"grok\",\"codex\"]" }'
echo "DIRECTION_ID=$DID   SOURCE=<SOURCE_LANGUAGE_ID>"
```

### 2. Invoke each harness
Run each harness CLI with the **harness prompt** below, filling `{SOURCE_ID}`, `{DIRECTION_ID}` (= `$DID`), and `{MODEL_ID}` (e.g. `opus`/`grok`/`codex`). The harnesses run independently (no shared state); each produces one full set.

### 3. Collect the round
```bash
# the round's languages (each links its art style via imagery_direction.pairs_with + its palette)
curl -s "$BASE/tdata/DesignLanguages?\$filter=$(python3 -c "import urllib.parse;print(urllib.parse.quote(\"direction_id eq '$DID'\"))")" "${H[@]}" \
  | python3 -c 'import json,sys;[print(x["fields"].get("name"), x.get("Id") or x.get("entity_id"), "|", x["fields"].get("model_provenance")) for x in json.load(sys.stdin)["value"]]'
# same filter on /tdata/ArtStyles and /tdata/PaletteSystems for the round's styles + palettes
```
`model_provenance` says which model produced each. All sit `UnderReview` for the human curator to review and `Publish` the keepers. The round is the set with `direction_id == $DID` — a real link, the display grouping.

---

## The harness prompt (give this verbatim to every harness)

> You are a **Katagami contributor** in a model bake-off round. Read and follow the skill **`agent-kit/SKILL.md`** in the katagami repo — it is the complete process — and the rulebook it references (`katagami-curation/knowledge/rules/design-language.md`). Do exactly what they say; the taste is the rulebook's, the procedure is the skill's.
>
> **Your round inputs:**
> - SOURCE design language id: `{SOURCE_ID}`
> - DIRECTION id: `{DIRECTION_ID}` — set this as `direction_id` on **every** entity you submit.
>
> **Auth** (every HTTP call to `$TEMPER_API_URL/tdata`): headers `X-Tenant-Id: default`, `Authorization: Bearer $TEMPER_API_KEY` (source the key from the env; never print it), `x-temper-principal-kind: agent`, `x-temper-principal-id: {MODEL_ID}-contributor`, `x-temper-agent-type: contributor`. File workspace: `katagami-contrib`.
>
> **Record your model** in `model_provenance` on each entity: `{"style":{"model":"{MODEL_ID}"},"source":{"model":"{MODEL_ID}"},"images":{"model":"<your image model>","provider":"<>","tool":"<>"}}`.
>
> **Produce the FULL SET** — your own art style + palette + design language — reimagining the source per the direction: an independent, bold reconception (landing ≠ embodiment, a substantial component embodiment, a real scrollable landing). Bring your own render + image generation. **Self-critique** by rendering the landing + embodiment + art-style references, reading the screenshots, and fixing until they satisfy the rulebook. Submit each entity with its `Submit*` composite, then `SubmitForReview` — all carrying `direction_id={DIRECTION_ID}`. **STOP at `UnderReview`. Do NOT publish.** If `SubmitForReview` returns a guard error, it names what's missing — fix that artifact and retry.
>
> **Return ONLY:** the three entity ids (art_style, palette, design_language), each one's status, and a one-line self-assessment of how your take diverges from the source.
