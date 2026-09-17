import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from './index.js';

const finalizer = await readFile(new URL('../../../../katagami-curation/wasm/finalize_spawned_session/src/lib.rs', import.meta.url), 'utf8');
const namespaces = [...new Set([...finalizer.matchAll(/"(katagami-(?:design-languages|palettes|art-styles))"/g)].map(match => match[1]))];
test('finalizer declares all three published asset namespaces', () => {
  assert.equal(namespaces.length, 3);
});

for (const namespace of [...namespaces, 'katagami/art-styles', 'katagami/palettes', 'katagami/design-languages']) {
  test(`serves immutable assets under ${namespace}`, async () => {
    const key = `${namespace}/ArtStyle/test/thumbnail.png`;
    let readKey;
    const response = await worker.fetch(new Request(`https://assets.katagami.ai/${key}`, { method: 'HEAD' }), {
      PUBLISHED_ASSETS: { head: async value => {
        readKey = value;
        return { httpEtag: '"test"', writeHttpMetadata: headers => headers.set('Content-Type', 'image/png') };
      } },
    }, {});
    assert.equal(response.status, 200);
    assert.equal(readKey, key);
    assert.equal(response.headers.get('Content-Type'), 'image/png');
  });
}

test('does not expose unrelated storage prefixes', async () => {
  const response = await worker.fetch(new Request('https://assets.katagami.ai/private/test.png', { method: 'HEAD' }), {
    PUBLISHED_ASSETS: { head: async () => assert.fail('must not read unrelated storage') },
  }, {});
  assert.equal(response.status, 404);
});
