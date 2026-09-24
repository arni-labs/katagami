/** Executes the committed finalizer WASM against local host-ABI fixtures.
 * No network, Cedar evaluation, real model generation, or live publication.
 * Reuses the local server driver's fixture construction to prevent drift.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = fileURLToPath(new URL('.', import.meta.url));
const wasmPath = fileURLToPath(new URL('../../wasm/finalize_spawned_session/finalize_spawned_session.wasm', import.meta.url));
const wasmBytes = readFileSync(wasmPath);
const module = new WebAssembly.Module(wasmBytes);
const fixture = JSON.parse(execFileSync('python3', ['-c', `
import base64, importlib.util, json, sys
spec = importlib.util.spec_from_file_location('driver', sys.argv[1])
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
files = {}
class Captured(Exception): pass
def make_file(name, payload, mime, lock=False):
    fid = 'file-' + str(len(files))
    files[fid] = {'base64': base64.b64encode(payload).decode(), 'mime': mime, 'locked': lock}
    return fid
def capture(set_name, entity_id, action, params):
    assert action == 'SubmitArtStyle'
    print(json.dumps({'fields': params, 'files': files}))
    raise Captured()
driver.make_file = make_file
driver.create_entity = lambda *args, **kwargs: 'fixture-style'
driver.must_act = capture
try: driver.run_art_style_case('abi-fixture', True)
except Captured: pass
`, `${here}e2e_lane_verification.py`], { maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' }));

function execute(mutate = () => {}) {
  const fields = structuredClone(fixture.fields);
  for (const key of ['source_basis', 'prompt_review', 'portability_report', 'reference_manifest', 'proof_shots_manifest'])
    fields[key] = JSON.parse(fields[key]);
  // Skip object-store publication, independently of verifier execution. We
  // assert requested actions only; no runtime policy/state machine is faked.
  fields.has_published_assets = true;
  const files = new Map(Object.entries(fixture.files).map(([id, file]) => [id, {
    bytes: Buffer.from(file.base64, 'base64'), mime: file.mime, locked: file.locked,
  }]));
  mutate(fields, files);
  const job = { entity_id: 'fixture-job', status: 'Finalizing', fields: {
    job_type: 'synthesize_art_style', completion_contract: 'typed-v1', art_style_ids: ['fixture-style'],
  } };
  const context = { tenant: 'local-fixture', entity_id: 'fixture-job', entity_type: 'CurationJob',
    entity_state: job, integration_config: { temper_api_url: 'http://fixture.invalid' } };
  let instance, result;
  const actions = [], reads = [], streams = new Map();
  let nextHandle = 1;
  const bytes = () => new Uint8Array(instance.exports.memory.buffer);
  const read = (ptr, len) => Buffer.from(bytes().subarray(ptr, ptr + len)).toString('utf8');
  const write = (ptr, capacity, value) => {
    const data = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (data.length <= capacity) bytes().set(data, ptr);
    return data.length;
  };
  const env = {
    host_get_context: (ptr, cap) => write(ptr, cap, JSON.stringify(context)),
    host_log: () => {},
    host_set_result: (ptr, len) => { result = JSON.parse(read(ptr, len)); },
    host_http_call: (mp, ml, up, ul, _hp, _hl, bp, bl, out, cap) => {
      const method = read(mp, ml), url = read(up, ul);
      assert.ok(url.startsWith('http://fixture.invalid/tdata/'), url);
      const path = new URL(url).pathname;
      let body;
      if (method === 'POST') {
        actions.push({ path, params: JSON.parse(read(bp, bl)) });
        body = {};
      } else if (path.includes('/CurationJobs(')) body = job;
      else if (path.includes('/ArtStyles(')) body = { entity_id: 'fixture-style', status: 'Draft', fields };
      else {
        const id = path.match(/Files\('([^']+)'\)/)?.[1];
        assert.ok(files.has(id), `unexpected local request ${method} ${url}`);
        const file = files.get(id);
        body = { entity_id: id, status: file.locked ? 'Locked' : 'Ready',
          fields: { mime_type: file.mime, size_bytes: file.bytes.length } };
      }
      return write(out, cap, `200\n${JSON.stringify(body)}`);
    },
    host_http_stream_begin_outbound: (mp, ml, up, ul, _hp, _hl, requestOut, responseOut) => {
      assert.equal(read(mp, ml), 'GET');
      const url = read(up, ul);
      assert.ok(url.startsWith('http://fixture.invalid/tdata/Files('), url);
      const id = url.match(/Files\('([^']+)'\)\/\$value/)?.[1];
      assert.ok(files.has(id), url);
      reads.push(id);
      const request = nextHandle++, response = nextHandle++;
      streams.set(response, { bytes: files.get(id).bytes, offset: 0 });
      const view = new DataView(instance.exports.memory.buffer);
      view.setInt32(requestOut, request, true); view.setInt32(responseOut, response, true);
      return 0;
    },
    host_http_stream_response_head: (_handle, out, cap) => write(out, cap, JSON.stringify({ status: 200, headers: [] })),
    host_http_stream_read: (handle, out, cap) => {
      const stream = streams.get(handle);
      assert.ok(stream);
      const chunk = stream.bytes.subarray(stream.offset, stream.offset + Math.min(cap, 8192));
      stream.offset += chunk.length;
      return write(out, cap, chunk);
    },
    host_http_stream_close: handle => { streams.delete(handle); return 0; },
  };
  instance = new WebAssembly.Instance(module, { env });
  assert.equal(instance.exports.run(0, 0), 0);
  return { result, actions, reads };
}

test('compiled WASM validates prompt-only fixture and requests completion after actual byte reads', () => {
  const { result, actions, reads } = execute();
  assert.equal(result.action, 'FinalizeCompletion', JSON.stringify(result));
  assert.ok(actions.some(action => action.path.endsWith('/Temper.AttachArtStyleReview')));
  assert.ok(actions.some(action => action.path.endsWith('/Temper.Publish')));
  assert.equal(new Set(reads).size, 9);
});

test('compiled WASM accepts honest built-in gallery provenance', () => {
  const { result } = execute(fields => {
    for (let index = 0; index < 5; index++) {
      const item = fields.reference_manifest.items[index];
      item.model.model = null;
      Object.assign(item.generation_record.execution, {
        route: 'builtin', harness: index < 4 ? 'codex' : 'grok', provider_request_id: null,
      });
    }
  });
  assert.equal(result.action, 'FinalizeCompletion', JSON.stringify(result));
});

for (const [name, mutate, code] of [
  ['input-image gallery', fields => { fields.reference_manifest.items[0].generation_record.input_image_file_ids = ['source']; }, 'art_style_gallery_invalid'],
  ['legacy edit proof report', fields => { fields.portability_report.schema_version = '1'; }, 'art_style_portability_report_invalid'],
  ['changed locked gallery bytes', (fields, files) => { files.get(fields.reference_image_file_ids[0]).bytes[100] ^= 1; }, 'art_style_proof_file_hash_mismatch'],
  ['changed locked proof bytes', (fields, files) => { files.get(fields.proof_shots_file_ids[0]).bytes[100] ^= 1; }, 'art_style_proof_file_hash_mismatch'],
]) test(`compiled WASM rejects ${name} before any review or publication action`, () => {
  const { result, actions } = execute(mutate);
  assert.equal(result.action, 'Fail', JSON.stringify(result));
  assert.equal(JSON.parse(result.params.error_message).code, code);
  assert.deepEqual(actions, []);
});

console.log(`WASM SHA-256 ${createHash('sha256').update(wasmBytes).digest('hex')}; local ABI fixtures only, no live publication`);

function minimalComparison(fields) {
  for (const model of fields.portability_report.models) model.cases = model.cases.slice(0, 1);
  fields.proof_shots_file_ids = fields.portability_report.models.map(model => model.cases[0].file_id);
  fields.proof_shots_manifest.items = fields.proof_shots_manifest.items.filter(item => fields.proof_shots_file_ids.includes(item.file_id));
}

test('two compared model outputs suffice alongside the five-image gallery', () => {
  const { result, actions, reads } = execute(minimalComparison);
  assert.equal(result.action, 'FinalizeCompletion', JSON.stringify(result));
  assert.ok(actions.some(action => action.path.endsWith('/Temper.Publish')));
  assert.equal(new Set(reads).size, 7);
});

test('missing gallery cannot publish even with passing two-model proof', () => {
  const { result, actions } = execute(fields => {
    minimalComparison(fields);
    fields.reference_image_file_ids = [];
    delete fields.reference_manifest;
    fields.thumbnail_file_id = fields.proof_shots_file_ids[0];
  });
  assert.equal(result.action, 'Fail');
  assert.equal(JSON.parse(result.params.error_message).code, 'art_style_gallery_invalid');
  assert.deepEqual(actions, []);
});

test('one model cannot publish even with a real thumbnail', () => {
  const { result, actions } = execute(fields => {
    minimalComparison(fields);
    fields.portability_report.models.pop();
    fields.proof_shots_file_ids.pop();
    fields.proof_shots_manifest.items.pop();
  });
  assert.equal(result.action, 'Fail');
  assert.equal(JSON.parse(result.params.error_message).code, 'art_style_portability_models_missing');
  assert.deepEqual(actions, []);
});

test('thumbnail must belong to the validated comparison or gallery', () => {
  const { result, actions } = execute(fields => {
    fields.thumbnail_file_id = "unrelated-file";
  });
  assert.equal(result.action, 'Fail');
  assert.equal(JSON.parse(result.params.error_message).code, 'art_style_thumbnail_unbound');
  assert.deepEqual(actions, []);
});

function historicalAttribution(fields) {
  fields.credits = JSON.stringify([{ name: 'Historical Artist', kind: 'artist' }]);
  fields.source_basis.prompt = fields.prompt_template;
  fields.source_basis.sources = [{
    name: 'Historical Artist', kind: 'historical_attribution', living: false, death_year: 1986,
    evidence_url: 'https://example.test/biography',
    historical_context: 'Documented participation in the broad print tradition.',
    attribution_only: true, no_individual_style_target: true, no_copied_work: true,
  }];
}

test('compiled WASM accepts reviewed historical attribution without a copying license', () => {
  const { result, actions } = execute(historicalAttribution);
  assert.equal(result.action, 'FinalizeCompletion', JSON.stringify(result));
  assert.ok(actions.some(action => action.path.endsWith('/Temper.AttachArtStyleReview')));
  assert.ok(actions.some(action => action.path.endsWith('/Temper.Publish')));
});

for (const [name, mutate, code] of [
  ['unchecked copied work', fields => { delete fields.source_basis.sources[0].no_copied_work; }, 'art_style_historical_attribution_invalid'],
  ['individual style target', fields => { fields.source_basis.sources[0].no_individual_style_target = false; }, 'art_style_historical_attribution_invalid'],
  ['living historical credit', fields => { fields.source_basis.sources[0].living = true; }, 'art_style_living_source_unlicensed'],
  ['stale historical prompt review', fields => { fields.source_basis.prompt += ' changed'; }, 'art_style_historical_review_prompt_mismatch'],
  ['duplicate attribution alias', fields => { fields.source_basis.sources.push({ ...fields.source_basis.sources[0], name: ' HISTORICAL   ARTIST ', kind: 'tradition' }); }, 'art_style_historical_attribution_duplicate'],
]) test(`compiled WASM rejects ${name} before attestations or publication`, () => {
  const { result, actions } = execute(fields => { historicalAttribution(fields); mutate(fields); });
  assert.equal(result.action, 'Fail', JSON.stringify(result));
  assert.equal(JSON.parse(result.params.error_message).code, code);
  assert.deepEqual(actions, []);
});
