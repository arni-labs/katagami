# Trajectory capture hooks (Claude Code)

Captures every Claude Code session as an OTS trajectory and posts it to Temper,
so a run can be replayed against its actor spec later (ARN-293).

The flow:

```
SessionStart --> capture.py process  publish this session's ids, then
                                     transcript --[harbor]--> ATIF --> OTS
                                     --> POST /api/ots/trajectories
SessionEnd   --> capture.py enqueue  writes ~/.katagami/trajectory-queue/pending/<session>.json
```

Enqueue at the end, process at the next start. Converting a long conversation
means parsing the whole transcript and making a network call; doing that while
the user is closing a session would stall them for no reason. Enqueuing is a
single file write.

## The ids have to match

The actor record a skill writes (`ReceiveBrief`, `ReceiveSubmission`,
`AssignSubmission`) carries `session_id` and `trajectory_id`. Those must be the
same ids the stored trajectory is filed under, or following the actor record's
`trajectory_id` finds nothing.

So the ids are derived, once, from the harness session id, and published:

```bash
python3 hooks/trajectory-capture/capture.py identity
{
  "session_id": "9bd6...",
  "trajectory_id": "traj-1f2e...",
  "harness": "claude-code",
  "agent_id": "katagami-contributor",
  "spec_version": "sha256:d18bca6beb87..."
}
```

`SessionStart` writes that file; the skills read it and use those exact values
on every Temper call and on the actor record. Without the hooks installed, mint
a session id yourself and derive the rest with `capture.py derive <session-id>`
(pass the harness name — `codex`, `grok` — when the run is not Claude Code).
Give that id to the converter as `--session-id` and nothing else: it derives the
trajectory id from the session id through the same single derivation, so passing
`--trajectory-id` can only make the two disagree.

Minting an id is half the job. The id names a document that does not exist until
a real transcript is converted into it, so a run that mints an id and never runs
the converter leaves an actor record pointing at nothing.

The identity is stored **per session**, at
`~/.katagami/trajectory-queue/identity/<session-id>.json`. Two Claude Code
windows open at once would otherwise overwrite one shared file, and the first
session would go on to read the second session's ids and write them onto its
own actor record — pointing its verdict at somebody else's trajectory.

So `identity` has to know which session is asking. It resolves that in order:

1. the argument — `capture.py identity <session-id>`;
2. `$CLAUDE_CODE_SESSION_ID`, which Claude Code exports into the session
   (`$KATAGAMI_SESSION_ID` does the same job for any other harness);
3. the only session recorded, when there is exactly one.

With several recorded and no way to tell them apart, it prints the candidates
and exits non-zero rather than guessing.

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

3. **Set the identity and destination.** `TEMPER_API_KEY` belongs in your shell
   profile, not in `settings.json` — the file is not a secret store.

   | Variable | Meaning |
   |---|---|
   | `TEMPER_PRINCIPAL_ID` | The identity `TEMPER_API_KEY` belongs to. This, not a command line argument, is who the run is filed under: one configured identity per role credential. |
   | `KATAGAMI_AGENT_ID` | The same thing under the older name, still honoured. Required — capture refuses to guess one. |
   | `TEMPER_API_URL` | Temper base URL. |
   | `TEMPER_API_KEY` | Bearer token for the ingest. **Required**: capture will not post unauthenticated. |
   | `TEMPER_TENANT_ID` | Tenant, default `default`. |
   | `KATAGAMI_TRAJECTORY_SCRIPT` | Path to `scripts/trajectory/claude_session_to_ots.py`. |
   | `KATAGAMI_ACTOR_SPEC` | Actor automaton the run conforms to, e.g. `CuratorAgent`. Defaults to the actor mapped from `KATAGAMI_AGENT_ID`. |
   | `KATAGAMI_ACTOR_SPEC_VERSION` | Optional override. Normally read from the kernel, else computed from the actor spec in the checkout. Accepted only if it is what capture resolved, or names a snapshot or attestation this machine already holds. |
   | `KATAGAMI_SPEC_REGISTRY_TIMEOUT` | Optional. Seconds to wait for `GET /observe/specs/{entity}` before falling back to the computed hash, default 3. This read happens inside the session hooks, so it is deliberately short. |
   | `KATAGAMI_TRAJECTORY_QUEUE` | Optional queue root, default `~/.katagami/trajectory-queue`. |
   | `KATAGAMI_SPEC_SNAPSHOT_DIR` | Optional. Where spec sources are snapshotted, default `<queue>/spec-snapshots`. |
   | `KATAGAMI_SPEC_ATTESTATION_DIR` | Optional. Where registry answers are recorded, default `<queue>/spec-attestations`. |
   | `KATAGAMI_TRAJECTORY_BATCH` | Optional. Entries converted per session start, default 5. |

4. **Verify it end to end** before trusting it. Run the converter by hand
   against a transcript and read the output:

   ```bash
   python3 scripts/trajectory/claude_session_to_ots.py \
     --transcript ~/.claude/projects/<slug>/<session-id>.jsonl \
     --agent-id katagami-contributor \
     --out - | head -60
   ```

   Then add `--post` and confirm the ingest returns HTTP 201/202.

## What the hooks receive

Both `SessionEnd` and `SessionStart` hooks get a JSON payload on stdin
containing `session_id`, `transcript_path`, `cwd`, and `hook_event_name`.
`capture.py enqueue` stores the first two; `capture.py process` publishes the
new session's identity from the payload and then reads the queue, so it
converts sessions that ended while the machine was offline as well as the one
that just finished.

## Where the documents go

Every converted trajectory is written to
`~/.katagami/trajectory-queue/archive/<trajectory-id>.json` as well as posted.

The posted copy is canonical: the judge reads trajectories from the kernel
(`GET /api/ots/trajectories/<id>/atif`), and this archive is its **offline
fallback** for when that endpoint cannot be reached. Delete it when you no
longer want the local copies; capture recreates only new ones.

Three other things live under the queue root:

- `archive/images/` — the images the transcript referenced, copied out and
  named by content hash. Harbor resolves image paths inside a temporary tree
  that conversion deletes, so without this step the trajectory would carry
  references that point at nothing. An image too large to keep is recorded by
  hash and marked unavailable instead.
- `spec-snapshots/<version>.json` — the actor spec source, keyed by the hash of
  those bytes. Specs evolve; this is what lets a judge read the contract a run
  executed under after the file has moved on, and what stops a hand-typed
  `--spec-version` naming a contract that never existed.
- `spec-attestations/<version>.json` — a note that the kernel reported this
  digest for this entity, at this time. Capture reads the registry when it
  queues a session and converts at the *next* session start, which may be
  offline; without the note the queued version would look hand-typed and the
  trajectory would be dropped.

## Which spec version gets stamped

The digest the kernel registered, read from `GET /observe/specs/{entity}`. That
is what `POST /api/conformance/check` compares a run against, so it is the one
worth recording.

A hash computed from the spec file here is right only if the deploy registered
those exact bytes, and nothing local can tell you whether it did — any path
that re-serializes the TOML changes the whole digest, its first twelve
characters included. So computing is the fallback: it is marked
`spec_version_source: "local"` on the trajectory, and it warns.

The local hash is computed and snapshotted either way. When the two disagree,
the capture says so loudly — the deploy is not holding the spec this checkout
has, which is worth knowing the moment it becomes true rather than months later
as an unexplained 409.

The registry read is authorized. `GET /observe/specs/{entity}` asks Cedar to
permit `read_specs` on `Spec`, and the request carries the configured
`TEMPER_PRINCIPAL_ID` as an agent-kind principal — so the tenant needs a policy
naming that id. `katagami-curation/policies/spec.cedar` names
`katagami-contributor`, `katagami-reviewer` and `katagami-judge`. Configured
under any other id, the read answers 403 and every capture silently stamps
`local`.

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
| `refusing to post without TEMPER_API_KEY` | No credential. An unauthenticated post could claim any agent and any tenant. |
| `no actor spec version could be resolved` | `KATAGAMI_ACTOR_SPEC` names no known actor and the agent id maps to none. A trajectory without a spec version cannot be judged, so it is not posted. |
| `OTS ingest unreachable` | `TEMPER_API_URL` wrong, or the host is down. Entries stay in `failed/` and can be replayed by moving them back to `pending/`. |
| `.../observe/specs/<Actor> answered HTTP 403` | The tenant has no Cedar policy naming this principal for the spec read, so the registered digest cannot be read and the trajectory stamps `local`. Capture continues; the provenance is what degrades. |

To retry a failed entry, move it back:

```bash
mv ~/.katagami/trajectory-queue/failed/<session>.json \
   ~/.katagami/trajectory-queue/pending/
```

## Privacy

Read this before installing the hooks anywhere that handles work you would not
publish.

**What is uploaded.** The whole conversation: your messages, the agent's
replies and reasoning, every tool call with its arguments, and every tool
result. That is the point — a trajectory with the interesting parts removed
teaches nothing — but it means proprietary source, internal URLs, and file
contents the agent read all travel with it.

**What is stripped first.** Every string passes through
`scripts/trajectory/redaction.py`, which removes the credential shapes:
bearer/basic authorization values, private key blocks, JWTs, GitHub, Anthropic,
OpenAI, Slack, Google and AWS keys, `user:password@host` in URLs, and any
`NAME=value` whose name says secret/token/password/key. Values under keys like
`api_key` or `authorization` are dropped whatever they look like. A secret with
no recognizable shape — a bare password, a private hostname — still gets
through, so this reduces the blast radius rather than removing it.

**Where copies live.** The transcript is converted in a temporary directory
that is deleted when conversion finishes. The resulting OTS document is written
to `~/.katagami/trajectory-queue/archive/` and posted to `TEMPER_API_URL`.
Nothing is copied into the repository.

**Subagent transcripts are included.** Work the main agent delegated lives in
`<projects>/<slug>/<session-id>/subagents/*.jsonl`, and those files are staged
for conversion too — otherwise a delegated publish would be missing from the
record.
