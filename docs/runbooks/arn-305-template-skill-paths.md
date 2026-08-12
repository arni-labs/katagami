# Deploy runbook — job templates must resolve app-shipped skills (ARN-305)

**Read this before and after deploying the ARN-305 fix.** The code change is
not sufficient on its own: `CurationJobTemplate` rows already exist in the
deployed tenant, and they carry whatever `instruction_path` they were last
configured with. The seed file only decides what a *fresh* install gets.

## The premise, measured

The fix assumes the app-shipped copy exists and is the more frequently refreshed
one. That was an assertion in a code comment for a long time; it is now a
measurement.

Probed **2026-08-12** against `openpaw-production`, tenant `default`, workspace
`os-app-docs`:

Each row below is the file that `ResolvePath` returns for that path **inside
`os-app-docs`** — the same resolver `load_doc_file` uses, so these are the files
sessions actually load. That qualifier matters: `Path` is not unique, several
`File` entities sit at each of these paths, and picking a different one gives
different numbers. See "Reading these paths correctly" below.

| Path | Resolved id | Bytes | Versions | Hash |
|---|---|---|---|---|
| `/agents/curator/skills/review-quality/SKILL.md` | `fl-019e17fd-8b33-…` | 29,657 | 17 | `03601d2a5620` |
| `/agents/sl-bootstrap-agent-soul-curator/…/review-quality/SKILL.md` | `os-agent-skill-file-…-review-quality` | **33,178** | **36** | `b803f8d76cd0` |
| `/agents/curator/skills/synthesize-language/SKILL.md` | `fl-019e17fd-a65d-…` | 20,070 | 9 | `f3b59011e7c7` |
| `/agents/sl-bootstrap-agent-soul-curator/…/synthesize-language/SKILL.md` | `os-agent-skill-file-…-synthesize-language` | **12,037** | **58** | `6dc155d15cdf` |

**The two copies are not in sync, and the snapshot is not the one that lags.**
An earlier version of this table reported both copies at identical bytes with
identical hashes and the app path ahead on version count (17 vs 10, 9 vs 2). That
table was reading `fl-019e17fd-55a1-…`, a *different* entity that also sits at the
soul path; `ResolvePath` does not return it. Measured against the entity that
actually resolves, the soul copies differ in content and carry **more** revisions
than the app copies — 36 against 17, and 58 against 9.

So the premise this fix rests on — "the app-shipped copy is the more frequently
refreshed one" — is **not** supported by the deployed data. The
`os-agent-skill-file-*` entities look like the app-installer-managed copies, keyed
by agent and skill, and their version counts are the highest on the tenant. Which
copy *should* win is a design question this runbook cannot settle by measurement
alone, and it is worth settling before ARN-305 is closed: preferring the app path
is currently preferring the less-revised file. What is settled is that the two
differ, so the choice is not academic.

Re-check with the `ResolvePath` loop in step 1 below, plus a `Files('<id>')` read
for `version_count` and the content hash — always by resolved id, never by a path
query.

## What was wrong

Every seeded template pointed at a per-soul bootstrap snapshot:

```
/agents/sl-bootstrap-agent-soul-curator/skills/<skill>/SKILL.md
```

The bootstrap copy is written once, when a soul is created, and app installs
never refresh it. The app-shipped copy under `/agents/curator/` is refreshed on
every install and is the one that should win.

`instruction_path_candidates` was written to prefer the app copy, but it only
added the fallback pair when the configured path *already* began
`/agents/curator/`. Given a snapshot path it produced exactly one candidate —
the snapshot. So the preference never applied to a single real template, and
every session read a skill frozen at the moment its soul was bootstrapped,
however far the app had moved on.

## What the fix changes

- `instruction_path_candidates` now derives the preference from the **skill**,
  not the spelling of the path: any `/agents/<dir>/<tail>` yields
  `/agents/curator/<tail>` first, then `/agents/<soul>/<tail>`. A snapshot path
  resolves forward instead of pinning.
- `seed-data/job_templates.toml` points at `/agents/curator/...` for all nine
  templates.
- Tests walk the real seeded paths and fail if any resolves only to a snapshot.

Because the resolver now fixes snapshot paths at read time, a deployed row that
still carries one will work. Patching the rows is still worth doing: a row that
says something different from what the system does is a trap for whoever reads
it next.

## Before deploying

Record what the deployed tenant currently has, so the after-check has something
to compare against.

```bash
curl -sS "$TEMPER_API_URL/tdata/CurationJobTemplates" \
  -H "X-Tenant-Id: $TEMPER_TENANT_ID" \
  -H "Authorization: Bearer $TEMPER_API_KEY" \
  -H "x-temper-principal-kind: agent" \
  -H "x-temper-principal-id: system" \
  -H "x-temper-agent-type: system" \
| jq -r '.value[] | [.fields.Id, .fields.job_type, .fields.skill_id, .fields.instruction_path, .status] | @tsv'
```

The `jq` above reads the **entity envelope**, not a flat row — see the recorded
response contract below. An earlier version of this command read `.Id`,
`.JobType`, `.InstructionPath` and `.Status` at the top level; none of those keys
exist there, so it printed a row of nulls per template, and the `select(.Status
== "Active")` in step 1 matched nothing at all and printed an empty list. An
empty list on this step reads exactly like "no rows need patching" — a silent
false all-clear on the check that gates this whole runbook.

Note which rows carry `/agents/sl-bootstrap-agent-soul-` and which are `Active`.

Run against `openpaw-production`, tenant `default`, on **2026-08-12**, all nine
templates are `Active` and **all nine still carry a
`/agents/sl-bootstrap-agent-soul-curator/...` snapshot path** — step 2 below has
not been performed on this tenant. The resolver fixes these at read time, so
sessions read the app copy regardless; the rows are still wrong and still say
something different from what the system does.
**Entities may have been reconfigured after the original seed**, so do not
assume the list matches `seed-data/job_templates.toml` — the file is the seed,
the rows are the truth.

## After deploying

**1. Confirm the app-shipped skills are actually present.** If they are not,
the fix makes things worse rather than better: the first candidate will miss
and every read falls back to the snapshot anyway.

**Derive the list from the rows, never from a list typed here.** Step 0 said the
rows are the truth; a hardcoded skill list in this runbook would silently skip a
row that points at an unseeded or misspelled skill — which is exactly the row
worth catching.

```bash
AUTH=(-H "X-Tenant-Id: $TEMPER_TENANT_ID"
      -H "Authorization: Bearer $TEMPER_API_KEY"
      -H "x-temper-principal-kind: agent"
      -H "x-temper-principal-id: system"
      -H "x-temper-agent-type: system")

# Every path the DEPLOYED templates actually name, deduped.
curl -sS "$TEMPER_API_URL/tdata/CurationJobTemplates" "${AUTH[@]}" \
| jq -r '.value[] | select(.status == "Active") | .fields.instruction_path' \
| sort -u > /tmp/arn305-configured-paths.txt

# The app-shipped path each of them should resolve to.
sed -E 's|^/agents/[^/]+/|/agents/curator/|' /tmp/arn305-configured-paths.txt \
| sort -u > /tmp/arn305-app-paths.txt

while read -r path; do
  printf '%s: ' "$path"
  curl -sS -X POST \
    "$TEMPER_API_URL/tdata/Workspaces('os-app-docs')/Temper.ResolvePath?await_integration=true" \
    -H 'Content-Type: application/json' "${AUTH[@]}" \
    -d "{\"path\":\"$path\"}" \
  | jq -r --arg p "$path" '
      if ((.fields.last_file_path // .last_file_path) == $p)
      then ((.fields.last_file_id // .last_file_id) // "MISSING")
      else "STALE-RESPONSE" end'
done < /tmp/arn305-app-paths.txt
```

The `last_file_path` guard is not decoration. These fields hold the workspace's
*last* resolve, so a response that has not caught up names a different path and a
perfectly plausible id belonging to some other file. `await_integration=true`
is what makes the response current; the guard is what proves it did.

Every line must print a file id. A `MISSING` means the app does not ship that
skill under `/agents/curator/`, so that template keeps reading its snapshot no
matter what this fix does — **investigate before going further**. A `MISSING`
whose skill name looks wrong is a misspelled row, not a missing skill.

**2. Patch any row that still carries a snapshot path.** One call per row, using
the id from the before-check:

```bash
curl -sS -X POST \
  "$TEMPER_API_URL/tdata/CurationJobTemplates('<template-id>')/Temper.Configure" \
  -H 'Content-Type: application/json' \
  -H "X-Tenant-Id: $TEMPER_TENANT_ID" \
  -H "Authorization: Bearer $TEMPER_API_KEY" \
  -H "x-temper-principal-kind: agent" \
  -H "x-temper-principal-id: system" \
  -H "x-temper-agent-type: system" \
  -d '{"instruction_path":"/agents/curator/skills/<skill>/SKILL.md"}'
```

Check the action name against the deployed `CurationJobTemplate` spec before
running this — use the governed action the spec defines, never a direct write.

**3. Re-run the before-check.** No row should contain
`/agents/sl-bootstrap-agent-soul-`.

**4. Run one real job of each type and confirm it read the app copy.** The
session message names the path it resolved, so this is visible without guessing:

```
resource:datadog  service:katagami  "instruction"
```

Look for `/agents/curator/skills/...` in the rendered prompt, and for zero
`failed to load required instruction doc` errors over the window.

## If you install a skill at runtime, read this

`paw-skills`' agent-scoped install writes to
`/agents/<agent-id>/skills/<slug>/SKILL.md` — a **soul** path. Since the app copy
now wins whenever it exists, an install to the soul path succeeds and then has no
effect on any job. That is the documented behaviour, not a bug: it is what keeps
a one-time bootstrap snapshot from pinning every session to a stale skill.

It is also exactly how a shadowing bug hides, so it is not allowed to be silent.
Whenever a copy wins and a **different** file exists at a lower-priority path,
the job logs at warn level:

```
build_session_message: instruction doc SHADOWED. A file with DIFFERENT content
exists at a lower-priority path and is NOT being used. used_path='…'
used_hash='…' shadowed_path='…' workspace='os-app-docs'.
```

Watch for it after any runtime skill install:

```
resource:datadog  service:katagami  "instruction doc SHADOWED"
```

If you see it and you meant your install to take effect, either install to the
app path or reconfigure that template's `instruction_path`. **A silent no-op is
the one outcome this cannot produce.**

**The comparison is `content_hash`, not file id.** That distinction is the whole
difference between a signal and noise. Two paths are two `File` entities, so
their ids *always* differ: comparing ids fires this warning on every job for
every template forever, and a line that is always there is one people learn to
scroll past. `content_hash` is a state field on the `File` entity
(`paw-fs/specs/file.ioa.toml`, beside `size_bytes` and `version_count`), so
reading it is a row read with no body fetch.

Comparing hashes is necessary but not sufficient — the hashes have to come from
the right two files. Reading them off a path query reintroduced the always-on
warning even though it compared content, because it compared content belonging to
files from different workspaces. See "Reading these paths correctly" above.

## The `Files` response contract (recorded 2026-08-12)

Probed against `openpaw-production`, tenant `default`. This is the shape the
shadow check parses; record any change to it here before changing the parser.

**Single entity:**

```
GET /tdata/Files('fl-019e17fd-8b33-72a1-8ded-2ed9692d52ba')
```

Top-level keys returned:

```
@odata.actions, @odata.children, @odata.context, @odata.id, booleans, counters,
entity_id, entity_type, events, events_since_snapshot, item_count,
last_snapshot_sequence_nr, lists, processed_idempotency_keys, sequence_nr,
status, total_event_count, fields
```

There is **no top-level `ContentHash`** and no top-level `content_hash`. The hash
lives at `fields.content_hash`, and for that file it was
`sha256:03601d2a5620b3cce1c16d80540e7434c314f63e910f29b017eb9a6db8bdc4d1`
(`/agents/curator/skills/review-quality/SKILL.md`, workspace `os-app-docs`).
`fields` also carries `version_count`, `version_number`, `last_version_id` and
`previous_version_id`. Because the top-level spelling is not a shape this server
produces, the parser no longer accepts it; a fallback nobody can trigger reads as
a verified alternative and hides the shape that matters.

**Collection query — the one the shadow check actually issues:**

```
GET /tdata/Files?$filter=Path eq '<path>'
```

Same envelope, one per row under `value`, with the hash again at
`fields.content_hash`. Note this is the entity envelope, not a flat row — the
same envelope `lookup_active_template` already parses for
`CurationJobTemplates`, where `fields` holds `job_type`, `skill_id` and
`instruction_path` in snake_case while `Id` and `Status` stay PascalCase.
Adding `$select` would project properties instead and return a flattened row
(`{"Path": …, "WorkspaceId": …, "Id": …}`) with no `fields` object, which reads
as "no hash" for every path and switches shadow detection off without erroring.

## Reading these paths correctly

**`Path` is not a key. Never identify one of these files with a path query.**

A `GET /tdata/Files?$filter=Path eq '<path>'` is not scoped to a workspace and
`Path` is not unique, so it returns several entities. Measured 2026-08-12:

| Path | Rows | Id | Workspace | Hash | Bytes | Versions |
|---|---|---|---|---|---|---|
| `/agents/curator/skills/review-quality/SKILL.md` | 2 | `fl-019e17fd-8b33-…` | `os-app-docs` | `03601d2a…` | 29,657 | 17 |
| | | `fl-019deb06-d949-…` | `ws-019de271-…` | `eb365ca4…` | 20,664 | 10 |
| `/agents/sl-bootstrap-agent-soul-curator/…/review-quality/SKILL.md` | 3 | `os-agent-skill-file-…-review-quality` | `os-app-docs` | `b803f8d7…` | 33,178 | 36 |
| | | `fl-019e17fd-55a1-…` | `os-app-docs` | `03601d2a…` | 29,657 | 10 |
| | | `fl-019e4dbe-dce3-…` | `ws-019de271-…` | `001fd44a…` | 22,484 | 1 |

Two things follow, and both have already caused a wrong conclusion in this
runbook. **Scoping to `os-app-docs` is not sufficient** — the soul path has two
entities inside that workspace, and only `ResolvePath` says which one a session
gets (it is `os-agent-skill-file-…`, not the `fl-…` one an earlier version of the
premise table reported). And **a path query spans workspaces**, so a reader who
takes the first row can end up describing a file from `ws-019de271-…` that no
curation session has ever opened.

Always resolve first, then read by id:

```bash
# id for a path, inside the doc workspace
curl -sS -X POST \
  "$TEMPER_API_URL/tdata/Workspaces('os-app-docs')/Temper.ResolvePath?await_integration=true" \
  -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"path\":\"$path\"}" \
| jq -r '(.fields.last_file_id // .last_file_id)'

# then the hash of THAT file
curl -sS "$TEMPER_API_URL/tdata/Files('$file_id')" "${AUTH[@]}" \
| jq -r '.fields.content_hash'
```

`await_integration=true` is not optional. Without it the response carries the
workspace's *previous* resolve — `last_file_path` will name some other path — and
a script that ignores that mismatch will happily report the wrong file's hash.

## How the shadow check identifies files

The check resolves every path through `ResolvePath` scoped to `os-app-docs` and
compares `content_hash` of the resulting ids, so the files it compares are by
construction the files a session would load. The winning copy costs nothing extra:
`load_doc_file` has already resolved it and passes its `file_id` straight in. Only
the lower-priority candidates add a `ResolvePath` each.

It previously filtered `Files` on `Path` alone and took the first row. Because
that query is unscoped and unordered, the winner's hash came back from
`ws-019de271-…` (`eb365ca4…`) while the candidate's came from `os-app-docs`
(`03601d2a…`); they never matched, so **the warning fired on every job**, and the
`used_hash=` it printed named a file the session never read. That is the
always-on signal comparing hashes instead of ids was meant to end, reintroduced
by comparing the wrong files. If anyone is tempted to trade the `ResolvePath`
calls back for a single path query, that is the failure it returns to, silently.

**On this tenant the warning is currently TRUE and will fire.** The soul copies
really do differ from the app copies (33,178 vs 29,657 bytes for review-quality,
12,037 vs 20,070 for synthesize-language), so every job running one of those
templates logs a `SHADOWED` line until the copies are reconciled or the templates
are pointed elsewhere. That is a real finding about the tenant, not noise — but
expect the line, and read the premise section above before deciding which copy
ought to win.

**Cost.** Per lower-priority candidate: one `ResolvePath` plus one
`Files('<id>')` row read — so one of each in the ordinary case, on top of the
`ResolvePath` the load already did. The winning copy adds only its row read; its
id comes from the load, so it costs no second resolve. `.proofs/perf-036` removed
a runtime `ResolvePath` from this step because it measured 581–1126ms, so this is
a real addition to a step that was deliberately trimmed.

The trade, stated plainly: roughly one extra second against a job that then runs
an LLM session for minutes, in exchange for making it impossible to install a
skill and have it silently ignored. Identifying files by path instead would save
the resolve and is the specific thing that broke this check before — a cheaper
lookup that answers a different question is not an optimisation. If the latency
ever matters more than the signal, `warn_on_shadowed_instruction_copies` is one
function and one call site — but delete it knowing that a shadowed install goes
back to being invisible.

**A failed read is not a clean result.** If the winner's hash cannot be read the
check is skipped, and if a candidate's cannot be read that candidate is left
unjudged; both are logged at debug rather than passed over, so "nobody checked"
is distinguishable from "nothing to report".

## What "done" looks like

- The premise is settled: the soul copies currently differ from the app copies
  and carry more revisions, so "which copy should win" needs an answer before
  this closes. Preferring the app path today prefers the less-revised file.
- Every `Active` template row carries `/agents/curator/...`.
- Every app-shipped skill resolves to a file id.
- One job of each type has run and read the app copy.
- ARN-305 can then be closed.

## If it goes wrong

The change is safe to leave in place while investigating: the resolver tries the
app copy first and falls back to the snapshot, so the worst case is the
behaviour that existed before the fix. Reverting the seed file alone changes
nothing for an existing tenant — the rows are what matter.
