#!/usr/bin/env python3
"""Durable supervisor for the 10-language JCS study run.

Keeps at most 2 hooked Claude -p sessions live. Never ApprovePublish.
Mint Discovered directions (no SpawnDirection / ConfigureAndQueue).
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import ten_run as t

MAX_LIVE = 2
WATCHDOG_SECS = 180
POLL_SECS = 45
TARGET = 10
LOG = t.EVIDENCE / "supervisor-loop.log"


def log(msg: str) -> None:
    line = f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {msg}"
    print(line, flush=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as fh:
        fh.write(line + "\n")


def pid_alive(pid) -> bool:
    if not pid:
        return False
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError):
        return False


def log_size(path) -> int:
    p = Path(path) if path else None
    if not p or not p.exists():
        return 0
    return p.stat().st_size


def session_log(kind_or_sid: str) -> Path | None:
    matches = sorted(t.LOG_DIR.glob(f"*{kind_or_sid}*.log"))
    return matches[-1] if matches else None


def live_count(st: dict) -> int:
    n = 0
    for bucket in ("researches", "languages", "reviews"):
        for rec in st.get(bucket, []):
            if rec.get("phase") == "claude_running" and pid_alive(rec.get("pid")):
                n += 1
    return n


def watchdog(st: dict) -> dict:
    now = time.time()
    for rec in st.get("researches", []) + st.get("reviews", []) + st.get("languages", []):
        if rec.get("phase") != "claude_running":
            continue
        pid = rec.get("pid")
        if not pid_alive(pid):
            rec["phase"] = "claude_exited"
            rec["exited_at"] = now
            log(f"pid {pid} exited kind={rec.get('index', rec.get('name', rec.get('language_id')))}")
            continue
        sl = rec.get("log")
        if not sl and rec.get("session_id"):
            found = session_log(rec["session_id"])
            sl = str(found) if found else None
            rec["log"] = sl
        size = log_size(sl)
        # First sighting after a supervisor restart must not SIGTERM a live pid.
        if "log_grow_at" not in rec:
            rec["log_size"] = size
            rec["log_grow_at"] = now
            continue
        last = rec.get("log_size", 0)
        last_t = rec["log_grow_at"]
        if size > last:
            rec["log_size"] = size
            rec["log_grow_at"] = now
        elif now - last_t > WATCHDOG_SECS and size < 200:
            log(f"watchdog kill pid={pid} log={sl} size={size}")
            try:
                os.kill(int(pid), 15)
            except OSError:
                pass
            rec["phase"] = "watchdog_killed"
            rec["relaunch"] = rec.get("relaunch", 0) + 1
    return st


def count_under_review() -> list[dict]:
    code, body = t.api("GET", "/tdata/DesignLanguages?$top=50")
    vals = body.get("value", []) if isinstance(body, dict) else []
    out = []
    for v in vals:
        f = v.get("fields") or v
        st = f.get("Status") or v.get("status") or ""
        if st == "UnderReview":
            out.append(
                {
                    "language_id": v.get("entity_id") or f.get("Id"),
                    "status": st,
                    "name": f.get("Name") or "",
                }
            )
    return out


def count_reviews_done(st: dict) -> int:
    n = 0
    for rec in st.get("reviews", []):
        if rec.get("phase") in ("verdict", "done") or rec.get("verdict"):
            n += 1
        ev = t.EVIDENCE / f"review-{(rec.get('language_id') or '')[-8:]}.md"
        if ev.exists() and rec.get("phase") != "claude_running":
            n += 1
    return n


def discovered_dirs(st: dict | None = None) -> list[dict]:
    named = {}
    if st:
        for d in st.get("directions", []):
            if d.get("direction_id") and d.get("name"):
                named[d["direction_id"]] = d
    code, body = t.api(
        "GET",
        "/tdata/CurationDirections?%24filter=Status%20eq%20%27Discovered%27&%24top=50",
    )
    vals = body.get("value", []) if isinstance(body, dict) else []
    out = []
    for v in vals:
        f = v.get("fields") or v
        did = v.get("entity_id") or f.get("Id")
        name = (
            f.get("TargetDirection")
            or f.get("target_direction")
            or (named.get(did) or {}).get("name")
            or ""
        )
        if not name:
            continue
        out.append(
            {
                "direction_id": did,
                "status": f.get("Status") or v.get("status") or "",
                "name": name,
                "brief": (named.get(did) or {}).get("brief") or name,
                "query_id": f.get("QueryId")
                or f.get("query_id")
                or (named.get(did) or {}).get("query_id")
                or "",
            }
        )
    # Fresh-server catalog rows the list call has not returned yet.
    seen = {d["direction_id"] for d in out}
    for d in named.values():
        if d["direction_id"] not in seen and d.get("status", "Discovered") == "Discovered":
            out.append(
                {
                    "direction_id": d["direction_id"],
                    "status": "Discovered",
                    "name": d["name"],
                    "brief": d.get("brief") or d["name"],
                    "query_id": d.get("query_id") or "",
                }
            )
    return out


def maybe_launch(st: dict) -> dict:
    if live_count(st) >= MAX_LIVE:
        return st

    # 1. Review Keyblock / any UnderReview language without a live or done review
    langs = count_under_review()
    reviewed_ids = {
        r.get("language_id")
        for r in st.get("reviews", [])
        if r.get("phase") in ("claude_running", "verdict", "done") and (
            r.get("phase") != "claude_running" or pid_alive(r.get("pid"))
        )
    }
    for lang in langs:
        if live_count(st) >= MAX_LIVE:
            return st
        if lang["language_id"] in reviewed_ids:
            continue
        item = dict(lang)
        for known in st.get("languages", []):
            if known.get("language_id") == lang["language_id"]:
                item.update(known)
        prompt = t.write_review_prompt(item)
        pid, sid, ident, logp = t.launch_claude(
            f"review-{lang['language_id'][-8:]}",
            prompt,
            {
                "KATAGAMI_AGENT_ID": "katagami-reviewer",
                "KATAGAMI_ACTOR_SPEC": "ReviewAgent",
                "TEMPER_PRINCIPAL_ID": "katagami-reviewer",
            },
        )
        rec = {
            **item,
            "pid": pid,
            "session_id": sid,
            "trajectory_id": ident.get("trajectory_id"),
            "phase": "claude_running",
            "log": logp,
            "log_grow_at": time.time(),
            "log_size": 0,
        }
        st.setdefault("reviews", []).append(rec)
        log(f"launched review {lang['language_id']} pid={pid}")

    if live_count(st) >= MAX_LIVE:
        return st

    # 2. Research until we have enough directions for remaining languages
    dirs = discovered_dirs(st)
    need_langs = TARGET - len({x.get("language_id") for x in st.get("languages", [])})
    running_research = [
        r
        for r in st.get("researches", [])
        if r.get("phase") == "claude_running" and pid_alive(r.get("pid"))
    ]
    finished_research = [
        r
        for r in st.get("researches", [])
        if (t.EVIDENCE / f"research-{r.get('index')}.md").exists()
    ]
    if need_langs > 0 and len(dirs) < need_langs and not running_research and len(finished_research) < 3:
        rec = None
        next_i = None
        for r in st.get("researches", []):
            ev = t.EVIDENCE / f"research-{r.get('index')}.md"
            if not ev.exists() and not (
                r.get("phase") == "claude_running" and pid_alive(r.get("pid"))
            ):
                rec = r
                next_i = r.get("index")
                break
        if rec is None:
            used = {r.get("index") for r in st.get("researches", [])}
            next_i = 0
            while next_i in used:
                next_i += 1
            rec = t.setup_research(next_i)
            st.setdefault("researches", []).append(rec)
        rec["prompt"] = str(t.write_research_prompt(rec))
        pid, sid, ident, logp = t.launch_claude(
            f"research-{next_i}",
            Path(rec["prompt"]),
            {
                "KATAGAMI_AGENT_ID": "katagami-curator",
                "KATAGAMI_ACTOR_SPEC": "CuratorAgent",
                "TEMPER_PRINCIPAL_ID": "katagami-curator",
            },
        )
        rec["pid"] = pid
        rec["session_id"] = sid
        rec["trajectory_id"] = ident.get("trajectory_id")
        rec["phase"] = "claude_running"
        rec["log"] = logp
        rec["log_grow_at"] = time.time()
        rec["log_size"] = 0
        log(f"launched research-{next_i} pid={pid} query={rec.get('query_id')}")

    if live_count(st) >= MAX_LIVE:
        return st

    # 3. Synthesize unused Discovered directions
    existing_lang_dirs = {x.get("direction_id") for x in st.get("languages", [])}
    synthesizing = [
        x
        for x in st.get("languages", [])
        if x.get("phase") == "claude_running" and pid_alive(x.get("pid"))
    ]
    if need_langs > 0 and not synthesizing:
        dirs = discovered_dirs(st)
        for d in dirs:
            if live_count(st) >= MAX_LIVE:
                break
            if d["direction_id"] in existing_lang_dirs:
                continue
            brief = d.get("brief") or d.get("name") or "design language from study research"
            qid = d.get("query_id") or ""
            item = t.setup_synth(d["direction_id"], qid, brief)
            item["query_id"] = qid
            prompt = t.write_synth_prompt(item)
            pid, sid, ident, logp = t.launch_claude(
                f"synth-{d['direction_id'][-8:]}",
                prompt,
                {
                    "KATAGAMI_AGENT_ID": "katagami-curator",
                    "KATAGAMI_ACTOR_SPEC": "CuratorAgent",
                    "TEMPER_PRINCIPAL_ID": "katagami-curator",
                },
            )
            rec = {
                **item,
                "pid": pid,
                "session_id": sid,
                "trajectory_id": ident.get("trajectory_id"),
                "phase": "claude_running",
                "log": logp,
                "log_grow_at": time.time(),
                "log_size": 0,
            }
            st.setdefault("languages", []).append(rec)
            existing_lang_dirs.add(d["direction_id"])
            log(f"launched synth {d['direction_id']} pid={pid}")

    return st


def snapshot(st: dict) -> None:
    langs = count_under_review()
    dirs = discovered_dirs(st)
    log(
        f"snapshot live={live_count(st)} researches={len(st.get('researches', []))} "
        f"discovered={len(dirs)} languages_state={len(st.get('languages', []))} "
        f"under_review={len(langs)} reviews={len(st.get('reviews', []))} "
        f"verdicts={count_reviews_done(st)}"
    )


def main() -> None:
    t.EVIDENCE.mkdir(parents=True, exist_ok=True)
    t.PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    t.LOG_DIR.mkdir(parents=True, exist_ok=True)
    log(f"supervisor start cwd={t.ROOT} temper={t.URL}")
    while True:
        st = t.load_state()
        st = watchdog(st)
        try:
            st = maybe_launch(st)
            snapshot(st)
        except Exception as exc:  # surface, do not die
            log(f"tick error: {exc!r}")
        t.save_state(st)
        if count_reviews_done(st) >= TARGET and len(count_under_review()) >= TARGET:
            log("target reached: 10 UnderReview + 10 verdicts")
            break
        time.sleep(POLL_SECS)


if __name__ == "__main__":
    main()
