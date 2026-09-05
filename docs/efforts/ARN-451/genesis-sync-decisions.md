# Genesis mirror sync — decisions

**Decision** — Mirror only the ARN-451 spec change from Genesis; do not take the pull wholesale.
**Came up because** `sync-genesis-katagami.sh pull` against current `origin/master` staged 7 changes, and two of them moved the repo backwards: it deleted `katagami-curation/tests/test_commons_authz_conformance.py` (388 lines, added 2026-08-27 in #263, "close the ARN-315 commons authoring class + cedarpy conformance harness") because that test exists on GitHub and not on Genesis, and it reverted `katagami-curation/app.toml`'s commons pin from `7c158eef` to `ce8d8bf`, older than what production runs.
**Options** (a) take the pull as-is on the "Genesis wins" rule; (b) take only the genuine Genesis-side change and reconcile the rest upward.
**Chose (b) over (a)** because "Genesis wins on divergence" is about preserving work that only exists on Genesis, not about deleting work that only exists on GitHub. Taking (a) would have lost a security conformance test and regressed a dependency pin. Gained: both sides keep their real work. Gave up: the sync is no longer a single mechanical command, so the residual GitHub-to-Genesis direction is still open.
**Where** this commit; `scripts/sync-genesis-katagami.sh:163` is the `rsync --delete` that produces the deletion.

**Decision** — Bump the curation dependency pin forward to `1c382cf` rather than leave it at `7c158eef`.
**Came up because** GitHub's pin, Genesis's pin, and the installed production pin were three different commits. Production runs `katagami/katagami-commons@1c382cfd0a97bf176d7460246c49959e6eb4ff47` (verified against the install response and a live `MemberActivityDays` dispatch).
**Options** (a) leave the declaration stale; (b) correct it to the commit actually installed.
**Chose (b)**: the declaration should describe reality, and `1c382cf` is a descendant of `ce8d8bf`, so this moves forward rather than sideways.
**Where** `katagami-curation/app.toml`.

**Correction on the record** — An earlier attempt at this sync (PR #271, closed) reported "42 files of Genesis-side work". That was wrong: it ran in the primary checkout on a master that was 36 commits stale, so most of those files were already on `origin/master`. Off the correct base the real delta is the 6 files here. The primary checkout has been restored and that branch deleted.

## Still open

The GitHub-to-Genesis direction. Genesis lacks `test_commons_authz_conformance.py` and carries an older commons pin. A push would need the same selective treatment, since `push_app` also rsyncs with `--delete`.
