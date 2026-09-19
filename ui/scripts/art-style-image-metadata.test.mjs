import assert from 'node:assert/strict';
import { artStyleImageMetadata } from '../src/lib/art-style-image-metadata.ts';

const details = artStyleImageMetadata(JSON.stringify({items: [
  {file_id: 'fl-seedream', subject: 'Radio repair', model: {provider: 'ByteDance', model: 'bytedance/seedream/v5/pro/edit'}},
  {file_id: 'fl-nano', model: {provider: 'Google', model: 'fal-ai/nano-banana-pro/edit'}},
  {file_id: 'fl-original', provider: 'OpenAI', model: 'not exposed by built-in tool'},
  {file_id: 'fl-unknown', model: {provider: 'OpenAI'}},
]}));
assert.equal(details.get('fl-seedream').modelId, 'bytedance/seedream/v5/pro/edit');
assert.equal(details.get('fl-nano').modelId, 'fal-ai/nano-banana-pro/edit');
assert.equal(details.get('fl-original').modelId, 'not exposed by built-in tool');
assert.equal(details.get('fl-unknown').modelId, '');
assert.equal(details.get('fl-seedream').subject, 'Radio repair');
assert.equal(artStyleImageMetadata('{').size, 0);
assert.equal(artStyleImageMetadata('{"items":{}}').size, 0);
assert.equal(artStyleImageMetadata('{"items":[null,{"file_id":"fl-x","model":42}]}').get('fl-x').modelId, '');
assert.equal(artStyleImageMetadata('{"references":[{"file":"fl-legacy","model":"exact-model"}]}').get('fl-legacy').modelId, 'exact-model');
console.log('art-style per-file model provenance: pass');
