# Trajectory capture hooks (Claude Code)

Captures every Claude Code session as an OTS trajectory and posts it to Temper,
so a run can be replayed against its actor spec later (ARN-293).

The flow:

```
SessionEnd  --> capture.py enqueue   writes ~/.katagami/trajectory-queue/pending/<session>.json
SessionStart --> capture.py process  transcript --[harbor]--> ATIF --> OTS --> POST /api/ots/trajectories
```

Enqueue at the end, process at the next start. Converting a long conversation
means parsing the whole transcript and making a network call; doing that while
the user is closing a session would stall them for no reason. Enqueuing is a
single file write.

## Install

1. **Install the pinned converter dependencies** (once, in whatever Python
   environment your hooks run under):

   ```bash
   pip install -r /path/to/katagami/scripts/trajectory/requirements.txt
   ```

2. **Add the hooks to `~/.claude/settings.json`.** Merge
   [`settings.snippet.json`](./settings.snippet.json) into your existing file —
   `hooks` and `env` are separate top-level keys, so paste the entries rather
   than replacing the whole document. Replace every
   `/absolute/path/to/your/katagami/checkout` with your real path; Claude Code
   does not expand `~` inside hook commands.

3. **Set the identity and destination**, either in the snippet's `env` block or
   in your shell profile:

   | Variable | Meaning |
   |---|---|
   | `KATAGAMI_AGENT_ID` | The role's own agent credential. Required — capture refuses to guess one. |
   | `TEMPER_API_URL` | Temper base URL. |
   | `TEMPER_API_KEY` | Bearer token for the ingest. |
   | `TEMPER_TENANT_ID` | Tenant, default `default`. |
   | `KATAGAMI_TRAJECTORY_SCRIPT` | Path to `scripts/trajectory/claude_session_to_ots.py`. |
   | `KATAGAMI_ACTOR_SPEC_VERSION` | Optional. The actor spec version the run executed under; stamped onto OTS metadata. |
   | `KATAGAMI_TRAJECTORY_QUEUE` | Optional queue root, default `~/.katagami/trajectory-queue`. |
   | `KATAGAMI_TRAJECTORY_BATCH` | Optional. Entries converted per session start, default 5. |

4. **Verify it end to end** before trusting it. Run the converter by hand
   against a transcript and read the output:

   ```bash
   python3 scripts/trajectory/claude_session_to_ots.py \
     --transcript ~/.claude/projects/<slug>/<session-id>.jsonl \
     --agent-id katagami-contributor \
     --out - | head -60
   ```

   Then add `--post` and confirm the ingest returns HTTP 201.

## What the hooks receive

Both `SessionEnd` and `SessionStart` hooks get a JSON payload on stdin
containing `session_id`, `transcript_path`, `cwd`, and `hook_event_name`.
`capture.py enqueue` stores the first two; `capture.py process` reads the queue
rather than the payload, so it converts sessions that ended while the machine
was offline as well as the one that just finished.

## When something goes wrong

Failures are visible on purpose:

- A queue entry that cannot be converted moves to
  `~/.katagami/trajectory-queue/failed/<session>.json`, with the reason in
  `<session>.error.txt` beside it.
- The reason also goes to stderr, which Claude Code surfaces.
- `process` exits non-zero when any entry failed. That warns without blocking
  the session (only exit code 2 blocks).

Common causes:

| Message | Cause |
|---|---|
| `harbor N is installed but this pipeline is pinned to M` | The environment drifted off the pin. Reinstall from `requirements.txt`. |
| `KATAGAMI_AGENT_ID is not set` | No agent identity configured. Capture will not attribute a run to a guess. |
| `OTS ingest unreachable` | `TEMPER_API_URL` wrong, or the host is down. Entries stay in `failed/` and can be replayed by moving them back to `pending/`. |

To retry a failed entry, move it back:

```bash
mv ~/.katagami/trajectory-queue/failed/<session>.json \
   ~/.katagami/trajectory-queue/pending/
```

## Privacy

The transcript is converted in a temporary directory that is deleted when
conversion finishes, and only the resulting OTS document is posted. Nothing is
copied into the repository, and the capture pipeline reads only the transcript
path the hook hands it.
