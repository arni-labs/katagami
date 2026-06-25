# Bake-off runbook — for the orchestrator

A bake-off **round** = one **Direction** (a reimagine brief) handed to N harnesses (Claude Code / Codex / Grok / …). Each harness, following the **one skill** (`agent-kit/SKILL.md`), authors a complete take — its own **art style + palette + design language** — and submits the set. Every submission lands **`UnderReview`** and links to the round via **`direction_id`**. A human curator reviews the round and publishes the keepers. You (the orchestrator) drive the harnesses; you do not synthesize anything yourself.

## What each harness needs
- The **katagami repo** checked out (to read `agent-kit/SKILL.md` + the rulebook `katagami-curation/knowledge/rules/design-language.md`).
- **Env:** `TEMPER_API_URL` (the backend) and `TEMPER_API_KEY` (the contributor key) — source them from `.env.katagami-curator.local`; never print the key.
- Its own **image generation** + **headless browser** (build is bring-your-own).
- A **distinct principal id** per harness (e.g. `opus-contributor`, `grok-contributor`, `codex-contributor`) so submissions are attributable even before reading `model_provenance`.

## Per round

### 0. Preflight — ensure the pipeline is installed (idempotent, no redeploy)
The composites + `Direction` entity are installed on openpaw via Genesis at runtime; an openpaw pod restart can wipe that (ARN‑69). Run this before each round — it self-heals and is a no-op if already current. (No Railway redeploy, no CI.)
```bash
set -a; source .env.katagami-curator.local; set +a; GEN="https://genesis-production-164d.up.railway.app"
HASH=$(curl -s -H "X-Tenant-Id: default" "$GEN/tdata/Apps('app-katagami-katagami-commons')" | python3 -c 'import json,sys;print(json.load(sys.stdin)["fields"]["LatestVersionHash"])')
curl -sS -X POST "$TEMPER_API_URL/paw/apps/install-from-genesis" -H "Authorization: Bearer $TEMPER_API_KEY" -H "X-Tenant-Id: default" -H "Content-Type: application/json" \
  --data "{\"app_ref\":\"katagami/katagami-commons@$HASH\",\"registry_url\":\"$GEN\",\"registry_tenant\":\"default\",\"follow_policy\":\"pinned\"}" >/dev/null
# confirm: this must be 200
curl -s -o /dev/null -w "Directions endpoint: %{http_code}\n" -H "X-Tenant-Id: default" -H "Authorization: Bearer $TEMPER_API_KEY" "$TEMPER_API_URL/tdata/Directions"
```

### 1. Start a round from a design language link (the one input)
You give the orchestrator **a design language URL** (e.g. `https://katagami.ai/language/<id-or-slug>`) — or just the id/slug — and an optional brief. This script resolves the link to the SOURCE id, creates the `Direction` (the round), and prints `SOURCE_ID` + `DIRECTION_ID` to fan out with. If no brief is given it defaults to a bold reimagine.

```bash
set -a; source .env.katagami-curator.local; set +a; BASE="$TEMPER_API_URL"
LINK="$1"   # the design language URL, id, or slug
BRIEF="${2:-Reimagine this design language as an independent, bold reconception per the Katagami rulebook — keep its essence, reconceive its execution (different signature mechanic, layout, hero, type). Commit to ONE strong aesthetic.}"
eval "$(python3 - "$BASE" "$TEMPER_API_KEY" "$LINK" "$BRIEF" <<'PY'
import sys, re, json, urllib.request, urllib.parse
base, key, link, brief = sys.argv[1:5]
h = {"X-Tenant-Id": "default", "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
def call(path, body=None, method="GET"):
    data = json.dumps(body).encode() if body is not None else None
    return json.load(urllib.request.urlopen(urllib.request.Request(base + path, data=data, headers=h, method=method)))
x = link.rstrip("/").split("/")[-1]                       # URL -> last segment (id or slug)
if re.match(r"^en-", x):
    sid = x
else:                                                     # slug -> resolve to entity id
    v = call("/tdata/DesignLanguages?$filter=" + urllib.parse.quote(f"slug eq '{x}'") + "&$top=1")["value"]
    if not v: sys.exit(f"echo 'no language found for: {x}'; false")
    sid = v[0].get("Id") or v[0].get("entity_id")
src = call(f"/tdata/DesignLanguages('{sid}')")["fields"]
did = call("/tdata/Directions", {}, "POST")["entity_id"]
call(f"/tdata/Directions('{did}')/KatagamiCommons.SetDirection",
     {"title": f"Reimagine {src.get('name','')}", "brief": brief, "source_language_id": sid,
      "is_bakeoff": "true", "round_label": "r1", "model_pool": "[\"opus\",\"grok\",\"codex\"]"}, "POST")
print(f"SOURCE_ID={sid}")
print(f"SOURCE_NAME={json.dumps(src.get('name',''))}")
print(f"DIRECTION_ID={did}")
PY
)"
echo "round ready -> SOURCE_ID=$SOURCE_ID  DIRECTION_ID=$DIRECTION_ID  (source: $SOURCE_NAME)"
```
Now fan out the harness prompt below with these `SOURCE_ID` and `DIRECTION_ID`.

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
