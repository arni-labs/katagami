# Encyclopedia cells

## Surface

`EncyclopediaCells` in Katagami commons stores private cell documents separately from the existing gallery taxonomy. Typed manifestations reference existing style or language records; direct studies need not become manifestations. A cell can start with only an approved name and scope.

The deployed lifecycle is Draft, ValidatingDocument, and Archived. Review and publication are not part of it: no approval authorizes publishing cells, and a Published state would assert a curator review that nothing here performs. Reintroducing that surface is a specification change, a policy change, and its own review round; a contract test fails until then.

Source: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, `specs/model.csdl.xml`, `policies/encyclopedia_cell.cedar`, and `wasm/validate_encyclopedia_cell/`.

No encyclopedia browser or public row projection ships with this storage change. Raw rows stay private because they hold unreviewed working material.

Authorization is a closed allow-list: the policy enumerates the actions this deployment uses and Cedar denies everything else, so an action added to the specification without a policy decision fails closed.

## Local setup

Use a disposable authenticated Temper instance and a fresh file database. Do not point this test at production. The harness rejects non-localhost targets and creates synthetic records.

The runtime must support the current IOA trigger format and WASI modules. Build the validator with `cargo build --locked --release --target wasm32-wasip1` in its module directory. Its packaged filename is `wasm/validate_encyclopedia_cell/validate_encyclopedia_cell.wasm`; check it matches the build output.

Start the fixture with the actual cell spec, commons CSDL, and app policies. Initial installation also needs the following narrow grants in the disposable fixture's policy directory. Creating these local setup grants requires operator approval; they must never be added to the deployed app policy.

```cedar
permit(principal == Agent::"operator", action == Action::"submit_specs", resource == SpecRegistry::"default");
permit(principal == Agent::"operator", action == Action::"manage_wasm", resource == WasmModule::"validate_encyclopedia_cell");
permit(principal == Agent::"operator", action == Action::"manage_policies", resource == PolicySet::"default");
permit(principal == Agent::"operator", action in [Action::"create", Action::"Define"], resource is AgentType);
permit(principal == Agent::"operator", action in [Action::"create", Action::"Issue"], resource is AgentCredential);
```

The last two exist so the harness can mint one contributor credential and prove the commons policy denies a non-curator. The runtime strips inbound `x-temper-principal-*` headers, so a header-only identity resolves to the operator key instead and proves nothing.

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
- An authenticated contributor credential can neither read nor author a cell.
- The removed publication actions are absent, and calling them changes nothing.
- Generic PATCH, PUT, and DELETE cannot replace the document or its validation gate.
- Rewriting a document through Define clears validation; a malformed document returns to Draft with an error, and correcting it clears that error. `error` describes the last validation run, not the current document: Define cannot clear it, because no specification effect can write a string field.
- Inline validation resolves documents larger than 128 KiB from the runtime's blob storage.
- An interrupted validation can be abandoned or archived, and a late callback from the abandoned run cannot revive the gate; Archived cannot be redefined.
- Undeclared parameters cannot forge a declared boolean or counter; they can replace a document and its hash, and the record is then left unvalidated.
- A callback from an abandoned run can set the gate for a document it never read, and the hash pairing rejects that cell.

The runtime persists a submitted string parameter whose name matches a field even when the action declares no parameters. That is a Temper defect the app cannot fix: Cedar never sees action parameters. What closes it here is the specification: every action an external principal may invoke clears `document_validated`, so an injected document always lands with the gate false.

A cell is validated when the gate is true **and** the stored document hashes to `document_hash`. The gate alone is not enough: an abandoned validation run keeps executing, its callback becomes valid again the moment the cell re-enters ValidatingDocument, and it then reports the hash of the document it read rather than the one now stored. The pair holds in that case because the hash names different bytes. Check the pair on every read; the creation readback does. The stored hash is not a defence — `document_hash` is injectable the same way — and the harness checks the clearing property for every such action, not only the ones already known to fail. The harness asserts today's behaviour explicitly, so it fails when the runtime is corrected and the assertions can be tightened.

Recovery from an interrupted validation is deliberate, not automatic. The runtime has no durable timer: `schedule` effects and state timeouts live in memory, and the trigger's `timeout_secs` bounds one WASM invocation rather than the entity's state. A validator that hangs while the server runs still fails through that timeout and returns the cell to Draft; a server that dies mid-invocation leaves the cell in ValidatingDocument until a curator calls AbandonValidation or Archive. The creation readback surfaces exactly that, because it waits for a validated Draft and reports the cell if it never arrives.

Run `npm test` in `ui/`, plus Rust tests, formatting, and clippy in the validator directory. The shared fixture tests check the document contract; they do not prove source rights, historical claims, or aesthetic quality. English-only writing collection scope belongs to the approved proposal and content review, not a universal ban on text languages in the format.

For deployment, follow `genesis-publish.md`, verify the installed app pin and OData metadata, and read back only the approved production records. Never create local test fixtures in production. Record names, scopes, Draft status, and empty enrichment fields, and compare each stored document against the approved bytes rather than trusting its recorded hash; a successful dispatch alone is insufficient.
