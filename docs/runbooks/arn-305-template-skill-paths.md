# Deploy runbook — job templates must resolve app-shipped skills (ARN-305)

**Read this before and after deploying the ARN-305 fix.** The code change is
not sufficient on its own: `CurationJobTemplate` rows already exist in the
deployed tenant, and they carry whatever `instruction_path` they were last
configured with. The seed file only decides what a *fresh* install gets.

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
| jq -r '.value[] | [.Id, .JobType, .SkillId, .InstructionPath, .Status] | @tsv'
```

Note which rows carry `/agents/sl-bootstrap-agent-soul-` and which are `Active`.
**Entities may have been reconfigured after the original seed**, so do not
assume the list matches `seed-data/job_templates.toml` — the file is the seed,
the rows are the truth.

## After deploying

**1. Confirm the app-shipped skills are actually present.** If they are not,
the fix makes things worse rather than better: the first candidate will miss
and every read falls back to the snapshot anyway.

```bash
for skill in research-direction taste-distillation synthesize-language \
             review-quality organize-taxonomy synthesize-palette \
             synthesize-art-style; do
  printf '%s: ' "$skill"
  curl -sS -X POST \
    "$TEMPER_API_URL/tdata/Workspaces('os-app-docs')/Temper.ResolvePath?await_integration=true" \
    -H 'Content-Type: application/json' \
    -H "X-Tenant-Id: $TEMPER_TENANT_ID" \
    -H "Authorization: Bearer $TEMPER_API_KEY" \
    -H "x-temper-principal-kind: agent" \
    -H "x-temper-principal-id: system" \
    -H "x-temper-agent-type: system" \
    -d "{\"path\":\"/agents/curator/skills/$skill/SKILL.md\"}" \
  | jq -r '.file_id // "MISSING"'
done
```

Every line must print a file id. A `MISSING` means the app did not ship that
skill under `/agents/curator/`, and that template will keep reading its
snapshot — investigate before going further.

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

## What "done" looks like

- Every `Active` template row carries `/agents/curator/...`.
- Every app-shipped skill resolves to a file id.
- One job of each type has run and read the app copy.
- ARN-305 can then be closed.

## If it goes wrong

The change is safe to leave in place while investigating: the resolver tries the
app copy first and falls back to the snapshot, so the worst case is the
behaviour that existed before the fix. Reverting the seed file alone changes
nothing for an existing tenant — the rows are what matter.
