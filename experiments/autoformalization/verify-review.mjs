import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Verify a staged review bundle, never the repository or an unrelated deploy.
const directory = process.argv[2];
assert.ok(directory, 'Pass the staged review directory.');
const html = readFileSync(join(directory, 'index.html'), 'utf8');
const expected = ['galley-a.png', 'galley-b.png', 'aya-a.png', 'aya-b.png'];
const sources = [...html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)];
assert.equal(sources.length, 4, 'Review must contain exactly four images.');
assert.deepEqual(new Set(sources.map(match => match[1])), new Set(expected.map(name => `images/${name}`)));
assert.deepEqual(readdirSync(join(directory, 'images')).sort(), expected.toSorted());
for (const [tag, source] of sources) {
  assert.match(tag, /alt="[^"]+"/, `Missing alternative text: ${source}`);
  assert.ok(html.includes(`href="${source}"`), `Missing full-size link: ${source}`);
  const bytes = readFileSync(join(directory, source));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Not PNG: ${source}`);
  assert.equal(bytes.readUInt32BE(16), 1536, `Unexpected image width: ${source}`);
  assert.equal(bytes.readUInt32BE(20), 1024, `Unexpected image height: ${source}`);
}
assert.match(html, /name="viewport"/);
assert.match(html, /noindex, nofollow, noarchive/);
assert.match(html, /This page does not submit or save your answers/);
assert.doesNotMatch(html, /<form\b|<script\b|maximum-scale|user-scalable/i);
const deployment = JSON.parse(readFileSync(join(directory, 'vercel.json'), 'utf8'));
assert.ok(deployment.headers.some(rule => rule.headers.some(header => header.key === 'X-Robots-Tag')));
const exclusions = readFileSync(join(directory, '.vercelignore'), 'utf8');
assert.ok(exclusions.includes('.env*'), 'Environment files must be excluded.');
console.log('PASS: four full-resolution images, four enlargement links, alt text, zoom-enabled viewport, no form or scripts, noindex, and credential exclusions.');
