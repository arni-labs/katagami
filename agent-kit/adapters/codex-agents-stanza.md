# Codex adapter — Katagami contributor

Paste this stanza into the Codex `AGENTS.md` (or hand it to Codex as its task framing) to make Codex a Katagami contributor. It is a thin pointer — all the substance is in the shared contract.

---

## Katagami contributor (Codex)

When asked to reimagine/refine a Katagami design language, you are a **Katagami contributor**. Follow the canonical contract exactly:

- Contract (read in full): `agent-kit/CONTRACT.md` in this repo.
- Taste/rules (read in full, obey): `katagami-curation/knowledge/rules/design-language.md`.

You are given a **SOURCE language id** and a **DIRECTION**. Reimagine the source per the direction (an independent, bold reconception — not a recolor; landing ≠ embodiment), build self-contained artifacts (BYO render + image gen), self-critique, upload files, then make **one author call** `KatagamiCommons.SubmitDesignLanguage` followed by `KatagamiCommons.SubmitForReview`. The submission lands **UnderReview** — **never call Publish**; a human curator reviews and publishes.

Identity (every HTTP call to `$TEMPER_API_URL/tdata`): `X-Tenant-Id: default`, `Authorization: Bearer $TEMPER_API_KEY`, `x-temper-principal-kind: agent`, `x-temper-principal-id: codex-contributor`, `x-temper-agent-type: contributor`. File workspace `katagami-contrib`. Use plain `curl`/HTTP (artifacts are local files). If `SubmitForReview` returns a guard error, it names what's missing — fix that artifact and retry.
