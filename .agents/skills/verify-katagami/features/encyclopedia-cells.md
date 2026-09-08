# Encyclopedia cells

## Surface

`EncyclopediaCells` in Katagami commons stores private cell documents separately from the existing gallery taxonomy. Typed manifestations reference existing style or language records; direct studies need not become manifestations. A cell can start with only an approved name and scope.

Source: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, `specs/model.csdl.xml`, `policies/encyclopedia_cell.cedar`, and `wasm/validate_encyclopedia_cell/`.

No encyclopedia browser or public row projection ships with this storage change. Published raw rows remain private because they include review evidence.

## Local setup

Use a disposable authenticated Temper instance and a fresh file database. Do not point this test at production. The harness rejects non-localhost targets and creates synthetic records.

The runtime must support the current IOA trigger format and WASI modules. Build the validator with `cargo build --locked --release --target wasm32-wasip1` in its module directory. Its packaged filename is `wasm/validate_encyclopedia_cell/validate_encyclopedia_cell.wasm`; check it matches the build output.

Start the fixture with the actual cell spec, commons CSDL, and app policies. Initial installation also needs the following narrow grants in the disposable fixture's policy directory. Creating these local setup grants requires operator approval; they must never be added to the deployed app policy.

```cedar
permit(principal == Agent::"operator", action == Action::"submit_specs", resource == SpecRegistry::"default");
permit(principal == Agent::"operator", action == Action::"manage_wasm", resource == WasmModule::"validate_encyclopedia_cell");
permit(principal == Agent::"operator", action == Action::"manage_policies", resource == PolicySet::"default");
```

Configure `TEMPER_API_KEY=test-local-key`, `TURSO_URL=file:<fresh-database-path>`, tenant `default`, and a free port. The verified fixture uses port 3869; check it is free or belongs to this effort before restarting anything. Pass its isolated specs directory to `temper serve --specs-dir`.

From the Katagami worktree:

```bash
ENCYCLOPEDIA_TEST_URL=http://localhost:3869 node scripts/verify-encyclopedia.mjs --install --policies
```

The harness resubmits only the cell specification and commons metadata after startup, uploads the packaged module, and then replaces setup grants with the exact checked-in commons app policies. This ordering matters: app policies do not grant tenant installation access. Do not weaken them or self-approve a denial to rerun setup; start another authorized disposable fixture.

Once installed, rerun without setup flags:

```bash
ENCYCLOPEDIA_TEST_URL=http://localhost:3869 node scripts/verify-encyclopedia.mjs
```

## What proves it

Read back each state and the expected fields, allowing for asynchronous projection updates:

- Draft creation, Define, and retry preserve identity and content.
- Anonymous reads and external validation callbacks are refused.
- Both background and inline WASM validation complete with the exact document hash.
- Publication requires validated document and review; review hashes match the document.
- Generic PATCH, PUT, and DELETE cannot replace the document or gate fields.
- Revision clears validation; a malformed document returns to Draft with an error.
- Draft and UnderReview records can be archived; Archived cannot be redefined.

Run `npm test` in `ui/`, plus Rust tests, formatting, and clippy in the validator directory. The shared fixture tests check the document contract; they do not prove source rights, historical claims, or aesthetic quality. English-only writing collection scope belongs to the approved proposal and content review, not a universal ban on text languages in the format.

For deployment, follow `genesis-publish.md`, verify the installed app pin and OData metadata, and read back only the approved production records. Never create local test fixtures in production. Record names, scopes, Draft status, and empty enrichment fields; a successful dispatch alone is insufficient.
