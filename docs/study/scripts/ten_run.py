#!/usr/bin/env python3
"""Orchestrate the 10-language study run on isolated :3472.

Do not SpawnDirection / ConfigureAndQueue (those Fail the direction).
Mint Discovered directions with POST, then BeginSynthesis + job Start.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root (scripts/ is under docs/study/)
EVIDENCE = ROOT / "docs" / "study" / "evidence" / "ten-run"
STATE_PATH = EVIDENCE / "state.json"
PROMPT_DIR = EVIDENCE / "prompts"
LOG_DIR = EVIDENCE / "logs"

URL = os.environ.get("TEMPER_API_URL", "http://127.0.0.1:3472")
TENANT = os.environ.get("TEMPER_TENANT_ID", "default")
KEY = os.environ.get("TEMPER_API_KEY", "test-local-key")
CLAUDE = os.environ.get("CLAUDE_BIN", "/Users/seshendranalla/.local/bin/claude")
SETTINGS = ROOT / ".claude" / "settings.json"

QUERIES = [
    "Japanese woodblock prints meet Swiss typographic rigor — a design language for a reading tool",
    "North Sea harbour weather, tarred rope, and a type system for a coastal operations desk",
    "Night-shift laboratory glass, mercury thermometers, and a language for instrument manuals",
]

# Named movements from completed research-0 / research-1 evidence.
# CurationDirection has no content-only setter; names live here and in BeginSynthesis.
CATALOG = [
    {
        "name": "Kento Rule",
        "brief": "Swiss modular grid rebuilt as kento registration. Hairline rules, 62-char measure, 1.5x baseline, sumi black, unbleached paper, one vermilion register mark. Reading tool.",
        "query_text": QUERIES[0],
    },
    {
        "name": "Sumi Keyline",
        "brief": "Keyblock/colour-block as interface depth: black outline carries structure and type; flat indigo and safflower fields sit behind and never outline themselves. Reading tool.",
        "query_text": QUERIES[0],
    },
    {
        "name": "Notan Column",
        "brief": "Figure-ground parity for a reading surface. Empty margin designed as a shape with weight equal to the text block. Near-black text, paper white, one ash accent.",
        "query_text": QUERIES[0],
    },
    {
        "name": "Edgefall",
        "brief": "Cropping and truncation as layout mechanic. Content clipped by the frame; diagonals cut the orthogonal grid. Paper white, sumi, one cyan bleed. Reading tool.",
        "query_text": QUERIES[0],
    },
    {
        "name": "Harbour Watch",
        "brief": "Chart-cartography operations desk. Buff land / green drying / magenta lights; isobath contour spacing as hierarchy; scale tiers from harbour to open water.",
        "query_text": QUERIES[1],
    },
    {
        "name": "Beaufort Table",
        "brief": "Station-model data density. Additive glyph encoding, radial packing, fill-fraction as quantity, tabular figures at 13px. Coastal operations desk.",
        "query_text": QUERIES[1],
    },
    {
        "name": "Code Flag",
        "brief": "ICS status board. Five-colour palette black/blue/red/yellow/white, adjacency-contrast, shape as second channel. Coastal operations desk.",
        "query_text": QUERIES[1],
    },
    {
        "name": "Marline",
        "brief": "Tarred-rope material register. Stockholm-tar golden-brown to near-black neutrals, natural fibre texture, craft weight against the technical chart grid.",
        "query_text": QUERIES[1],
    },
]


# Keyblock already UnderReview from the earlier synth.
KEYBLOCK = {
    "name": "Keyblock",
    "language_id": "en-019ffd07-2349-7e22-94f5-174852213c0b",
    "curator_agent_id": "en-019ffd07-7549-7d12-a618-3b985e5155fa",
    "direction_id": "en-019ffd04-a739-70c2-a247-413a1357ecfa",
    "status": "under_review",
}


def api(method: str, path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        URL + path,
        data=data,
        method=method,
        headers={
            "X-Tenant-Id": TENANT,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:800]}
        return e.code, parsed


def eid(obj: dict) -> str:
    return obj.get("entity_id") or obj.get("Id") or (obj.get("fields") or {}).get("Id") or ""


def status_of(obj: dict) -> str:
    return obj.get("status") or obj.get("Status") or (obj.get("fields") or {}).get("Status") or ""


def action(entity_set: str, entity_id: str, name: str, body=None):
    for prefix in ("Temper.", ""):
        code, parsed = api(
            "POST", f"/tdata/{entity_set}('{entity_id}')/{prefix}{name}", body or {}
        )
        if code in (200, 204):
            return code, parsed
        last = (code, parsed)
    return last


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {
        "target_languages": 10,
        "researches": [],
        "directions": [],
        "languages": [dict(KEYBLOCK)],
        "reviews": [],
        "notes": [],
    }


def save_state(st: dict) -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(st, indent=2) + "\n")


def setup_research(index: int) -> dict:
    text = QUERIES[index % len(QUERIES)]
    if index >= len(QUERIES):
        text = f"{text} — variation {index + 1}"
    code, q = api("POST", "/tdata/CurationQueries", {})
    qid = eid(q)
    action("CurationQueries", qid, "Configure", {"query_text": text, "output_type": "design_language"})
    action("CurationQueries", qid, "Submit", {})
    code, job = api("POST", "/tdata/CurationJobs", {})
    jid = eid(job)
    action(
        "CurationJobs",
        jid,
        "Configure",
        {
            "job_type": "source_search",
            "query_id": qid,
            "input": text,
            "completion_contract": "typed-v1",
        },
    )
    action("CurationJobs", jid, "Start", {})
    _, q2 = api("GET", f"/tdata/CurationQueries('{qid}')")
    _, j2 = api("GET", f"/tdata/CurationJobs('{jid}')")
    rec = {
        "index": index,
        "query_id": qid,
        "query_status": status_of(q2),
        "job_id": jid,
        "job_status": status_of(j2),
        "query_text": text,
        "phase": "ready_for_claude",
    }
    return rec


def mint_direction(name: str, query_id: str) -> str:
    code, d = api("POST", "/tdata/CurationDirections", {})
    did = eid(d)
    # BeginSynthesis only after we have a Running synth job; just record Discovered.
    return did


def setup_synth(direction_id: str, query_id: str, brief: str) -> dict:
    # BeginSynthesis from Discovered (never ConfigureAndQueue).
    code, _ = action(
        "CurationDirections",
        direction_id,
        "BeginSynthesis",
        {
            "task": brief,
            "scope": "design_language",
            "target_direction": brief,
            "output_type": "design_language",
            "synthesis_job_type": "synthesize",
            "source_ids": "[]",
            "topic_allowlist": "[]",
            "synth_input": brief,
        },
    )
    code, job = api("POST", "/tdata/CurationJobs", {})
    jid = eid(job)
    action(
        "CurationJobs",
        jid,
        "Configure",
        {
            "job_type": "synthesize",
            "direction_id": direction_id,
            "query_id": query_id,
            "input": brief,
            "completion_contract": "typed-v1",
        },
    )
    action("CurationJobs", jid, "Start", {})
    _, d2 = api("GET", f"/tdata/CurationDirections('{direction_id}')")
    _, j2 = api("GET", f"/tdata/CurationJobs('{jid}')")
    return {
        "direction_id": direction_id,
        "direction_status": status_of(d2),
        "job_id": jid,
        "job_status": status_of(j2),
        "begin_synthesis_http": code,
        "brief": brief,
    }


def write_research_prompt(rec: dict) -> Path:
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    p = PROMPT_DIR / f"research-{rec['index']}.md"
    p.write_text(
        f"""# STUDY TRIAL — CuratorAgent research on Temper :3472

This is NOT a git review and NOT a code-review task.
Stay in this worktree. You only research. Do not synthesize. Do not publish. Do not ApprovePublish.

Live Temper: `{URL}` — `X-Tenant-Id: {TENANT}`, `Authorization: Bearer {KEY}`.
Actions: `Temper.<Name>`.

Read:
- `.agents/skills/katagami-study-curator/SKILL.md` (research table only)
- `katagami-curation/agents/curator/skills/research-direction/SKILL.md`
- `docs/study/SESSION-RESEARCH.md`

```
python3 hooks/trajectory-capture/capture.py identity
```

Stop if that fails.

Query `{rec['query_id']}` should be Researching (or Submitted — Submit if needed).
Job `{rec['job_id']}` is the Running source_search job (Start, not WASM).

POST `/tdata/CuratorAgents` with `job_id` and `query_id` already set.
RecordCapture. TakeQuery.

Then: SearchTheWeb (real searches) → create/Submit/Index DesignSources + IndexSources
→ mint **4** directions.

**Do not call SpawnDirection. Do not call ConfigureAndQueue.**
Those queue a Paw job that Fails the direction on this study server.

For each of 4 movements:
1. POST `/tdata/CurationDirections` `{{}}` → Discovered
2. Optionally set content via whatever field actions exist; put the movement name in a note
3. Ledger `DeriveDirections` with movement_name

Then job `Temper.CompleteResearch` with those 4 direction ids and `output_type=design_language`.
Then ledger `CompleteResearch`.

A finished search is **3–5 directions**. Stop. Write
`docs/study/evidence/ten-run/research-{rec['index']}.md` with query, job, ledger,
source ids, direction ids and names. If 409, print the body and fix. Do not synthesize.
"""
    )
    return p


def write_synth_prompt(item: dict) -> Path:
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    p = PROMPT_DIR / f"synth-{item['direction_id'][-8:]}.md"
    p.write_text(
        f"""# STUDY TRIAL — CuratorAgent synthesize on Temper :3472

This is NOT a git review and NOT a code-review task.
Stay in this worktree. You only synthesize **this** direction. Do not research. Do not publish. Do not ApprovePublish.

Live Temper: `{URL}` — `X-Tenant-Id: {TENANT}`, `Authorization: Bearer {KEY}`.
Actions: `Temper.<Name>`.

Read:
- `.agents/skills/katagami-study-curator/SKILL.md` (synthesize table only)
- `katagami-curation/agents/curator/skills/synthesize-language/SKILL.md`
- `docs/study/SESSION-SYNTH.md`

```
python3 hooks/trajectory-capture/capture.py identity
```

Stop if that fails.

Direction `{item['direction_id']}` must be Synthesizing (BeginSynthesis already done).
Job `{item['job_id']}` is the Running synthesize job (Start, not ConfigureAndQueue).
Query `{item.get('query_id', '')}`.
Brief: {item.get('brief', '')}

POST `/tdata/CuratorAgents` with `job_id`, `query_id`, `direction_id` already set.
RecordCapture. TakeDirection with the same ids (`held_job_id` = this Running job).

Read `knowledge/rules/design-language.md` (never list TasteRule entities).
Author every named part (concept, tokens, Katagami spec, DESIGN.md, landing,
embodiment, dashboard, shadcn, thumbnail). Render in a real browser at
**wide, desktop, tablet, and 390px mobile** (not 375). Look at each surface
as images. FixSurfaces if you change bytes, then render and look again.

**ArtStyle is required for review to RecordVerdict.** Create an ArtStyle,
set medium + prompt_template + proof shots + a Ready/Locked thumbnail File,
`SubmitForReview` it (UnderReview, do not Publish), then
`DesignLanguage.SetDefaultArtStyle` with that art_style_id *before*
SubmitForReview on the language. A language with an empty default_art_style_id
makes ReviewAgent Abandon.

SubmitForReview on the DesignLanguage when files exist, then ledger SubmitLanguage.
Then CompleteSynthesis on the job if the guard allows; if 409 print the body.

Stop. Write `docs/study/evidence/ten-run/synth-{item['direction_id'][-8:]}.md`
with language id, status, ledger id. Language must be UnderReview.
"""
    )
    return p


def write_review_prompt(item: dict) -> Path:
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    p = PROMPT_DIR / f"review-{item['language_id'][-8:]}.md"
    p.write_text(
        f"""# STUDY TRIAL — drive a Temper ReviewAgent entity on :3472

This is NOT a git code review. Do not invoke any review skill. Do not inspect the repo diff.
You are the ReviewAgent. You did not make this language. Do not publish. Do not ApprovePublish.

Use principal **katagami-reviewer**.

Live Temper: `{URL}` — `X-Tenant-Id: {TENANT}`, `Authorization: Bearer {KEY}`.
Actions: `Temper.<Name>`.

Read `.agents/skills/katagami-study-reviewer/SKILL.md`.

```
python3 hooks/trajectory-capture/capture.py identity
```

Stop if that fails.

Language `{item['language_id']}` is UnderReview.
CuratorAgent `{item.get('curator_agent_id') or ''}` made it.

If a ReviewAgent already exists for this language in SubmissionReceived/Reviewing, GET it and continue. Do not mint a second ledger.

Otherwise POST `/tdata/ReviewAgents` `{{}}`.
RecordSubmissionRef with reviewed_entity_id = the language id, submission_type=design_language,
curator_agent_id if known, plus capture identity.
AcceptSubmission `{{}}`. 409 unless the language is UnderReview.
LoadRulebook — read `knowledge/rules/design-language.md`. Do not list TasteRule entities.
BeginReview.

Then examine: FetchArtifacts → Open* each artifact → Render* then Inspect*Render
for landing, embodiment, dashboard → VerifyHeroReplaceable → ResolveArtStyle →
VerifyArtStyleRendered → VerifyAgainstRules → CheckCuratorClaims → RecordFinding as needed.

RecordVerdict once: pass, revise, or reject. Rationale names at least one thing
per surface you saw in a render. Never Publish.

Write `docs/study/evidence/ten-run/review-{item['language_id'][-8:]}.md`
with review id, verdict, trajectory id.
"""
    )
    return p


def seed_identity(session_id: str, extra_env: dict) -> dict:
    """Write capture identity before Claude starts.

    `-p` sessions have skipped SessionStart hooks. Pre-seeding the identity
    file is what lets `capture.py identity` succeed inside the session.
    """
    env = os.environ.copy()
    env.update(
        {
            "TEMPER_API_URL": URL,
            "TEMPER_API_KEY": KEY,
            "TEMPER_TENANT_ID": TENANT,
            "KATAGAMI_TRAJECTORY_SCRIPT": str(
                ROOT / "scripts" / "trajectory" / "claude_session_to_ots.py"
            ),
            "KATAGAMI_TRAJECTORY_PYTHON": str(ROOT / ".venv-trajectory" / "bin" / "python"),
            "KATAGAMI_AGENT_ID": extra_env.get("KATAGAMI_AGENT_ID", "katagami-curator"),
            "KATAGAMI_ACTOR_SPEC": extra_env.get("KATAGAMI_ACTOR_SPEC", "CuratorAgent"),
            "TEMPER_PRINCIPAL_ID": extra_env.get(
                "TEMPER_PRINCIPAL_ID", extra_env.get("KATAGAMI_AGENT_ID", "katagami-curator")
            ),
        }
    )
    env.update(extra_env)
    payload = json.dumps(
        {"session_id": session_id, "hook_event_name": "startup", "cwd": str(ROOT)}
    )
    subprocess.run(
        [sys.executable, str(ROOT / "hooks" / "trajectory-capture" / "capture.py"), "process"],
        input=payload,
        text=True,
        env=env,
        cwd=str(ROOT),
        check=False,
        capture_output=True,
        timeout=120,
    )
    ident_path = Path.home() / ".katagami" / "trajectory-queue" / "identity" / f"{session_id}.json"
    if not ident_path.is_file():
        raise RuntimeError(f"identity not written for {session_id}")
    return json.loads(ident_path.read_text())


def launch_claude(kind: str, prompt_path: Path, extra_env: dict) -> tuple[int, str, dict, str]:
    import uuid

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    session_id = str(uuid.uuid4())
    identity = seed_identity(session_id, extra_env)
    log = LOG_DIR / f"{kind}-{session_id[:8]}.log"
    env = os.environ.copy()
    env.update(
        {
            "TEMPER_API_URL": URL,
            "TEMPER_API_KEY": KEY,
            "TEMPER_TENANT_ID": TENANT,
            "KATAGAMI_TRAJECTORY_SCRIPT": str(
                ROOT / "scripts" / "trajectory" / "claude_session_to_ots.py"
            ),
            "KATAGAMI_TRAJECTORY_PYTHON": str(ROOT / ".venv-trajectory" / "bin" / "python"),
            "CLAUDE_CODE_SESSION_ID": session_id,
            "KATAGAMI_SESSION_ID": session_id,
            "PYTHONUNBUFFERED": "1",
        }
    )
    env.update(extra_env)
    prompt = prompt_path.read_text()
    if f"capture.py identity {session_id}" not in prompt:
        prompt = (
            f"Working directory MUST stay `{ROOT}`.\n"
            f"Capture identity is pre-seeded. Run:\n"
            f"`python3 hooks/trajectory-capture/capture.py identity {session_id}`\n"
            f"Session id: `{session_id}` trajectory `{identity.get('trajectory_id')}`.\n\n"
            + prompt
        )
    cmd = [
        CLAUDE,
        "--session-id",
        session_id,
        "--settings",
        str(SETTINGS),
        "--permission-mode",
        "auto",
        "--dangerously-skip-permissions",
        "--disable-slash-commands",
        "--output-format",
        "stream-json",
        "--verbose",
        "-p",
        prompt,
    ]
    proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        env=env,
        stdout=open(log, "w", buffering=1),
        stderr=subprocess.STDOUT,
    )
    (LOG_DIR / f"{kind}-{proc.pid}.pid").write_text(
        json.dumps({"pid": proc.pid, "session_id": session_id, "log": str(log)}) + "\n"
    )
    print(f"launched {kind} pid={proc.pid} session={session_id} log={log}")
    return proc.pid, session_id, identity, str(log)


def remint_catalog() -> list[dict]:
    """Mint 8 named Discovered directions on a fresh server.

    One query per research brief. Names are stored in state; BeginSynthesis
    writes target_direction so the entity is no longer anonymous.
    """
    by_text: dict[str, str] = {}
    out = []
    for item in CATALOG:
        text = item["query_text"]
        if text not in by_text:
            rec = setup_research(QUERIES.index(text) if text in QUERIES else 0)
            by_text[text] = rec["query_id"]
        qid = by_text[text]
        did = mint_direction(item["name"], qid)
        out.append(
            {
                "direction_id": did,
                "name": item["name"],
                "brief": item["brief"],
                "query_id": qid,
                "status": "Discovered",
            }
        )
    return out


def cmd_bootstrap():
    st = load_state()
    if not any(r.get("index") == 0 for r in st["researches"]):
        rec = setup_research(0)
        rec["prompt"] = str(write_research_prompt(rec))
        st["researches"].append(rec)
        st["notes"].append(f"research-0 ready {rec['query_id']} {rec['job_id']}")
        save_state(st)
        print(json.dumps(rec, indent=2))
    else:
        print("research-0 already in state")
        print(json.dumps(st["researches"][0], indent=2))


def cmd_launch_research(index: int):
    st = load_state()
    recs = [r for r in st["researches"] if r.get("index") == index]
    if not recs:
        rec = setup_research(index)
        rec["prompt"] = str(write_research_prompt(rec))
        st["researches"].append(rec)
    else:
        rec = recs[0]
        rec["prompt"] = str(write_research_prompt(rec))
    pid, session_id, identity, logp = launch_claude(
        f"research-{index}",
        Path(rec["prompt"]),
        {
            "KATAGAMI_AGENT_ID": "katagami-curator",
            "KATAGAMI_ACTOR_SPEC": "CuratorAgent",
            "TEMPER_PRINCIPAL_ID": "katagami-curator",
        },
    )
    rec["pid"] = pid
    rec["session_id"] = session_id
    rec["trajectory_id"] = identity.get("trajectory_id")
    rec["log"] = logp
    rec["phase"] = "claude_running"
    save_state(st)


def cmd_launch_review_keyblock():
    st = load_state()
    item = dict(KEYBLOCK)
    prompt = write_review_prompt(item)
    pid, session_id, identity, logp = launch_claude(
        "review-keyblock",
        prompt,
        {
            "KATAGAMI_AGENT_ID": "katagami-reviewer",
            "KATAGAMI_ACTOR_SPEC": "ReviewAgent",
            "TEMPER_PRINCIPAL_ID": "katagami-reviewer",
        },
    )
    st["reviews"].append(
        {
            **item,
            "pid": pid,
            "session_id": session_id,
            "trajectory_id": identity.get("trajectory_id"),
            "log": logp,
            "phase": "claude_running",
        }
    )
    save_state(st)


def cmd_status():
    st = load_state()
    print(
        json.dumps(
            {
                "researches": len(st["researches"]),
                "directions": len(st["directions"]),
                "languages": len(st["languages"]),
                "reviews": len(st["reviews"]),
                "state": st,
            },
            indent=2,
        )
    )


def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) < 2:
        print("usage: ten_run.py bootstrap|remint|status|launch-research N|launch-review-keyblock")
        sys.exit(2)
    cmd = sys.argv[1]
    if cmd == "bootstrap":
        cmd_bootstrap()
    elif cmd == "remint":
        st = load_state()
        dirs = remint_catalog()
        st["directions"] = dirs
        st["notes"].append(f"reminted {len(dirs)} named directions")
        save_state(st)
        print(json.dumps(dirs, indent=2))
    elif cmd == "status":
        cmd_status()
    elif cmd == "launch-research":
        cmd_launch_research(int(sys.argv[2]))
    elif cmd == "launch-review-keyblock":
        cmd_launch_review_keyblock()
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
