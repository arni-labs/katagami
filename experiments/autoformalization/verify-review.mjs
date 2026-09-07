import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Verify a staged review bundle, never the repository or an unrelated deploy.
const directory = process.argv[2];
assert.ok(directory, 'Pass the staged review directory.');
const expected = ['galley-a.png', 'galley-b.png', 'aya-a.png', 'aya-b.png', 'galley-c.png', 'galley-d.png', 'aya-c.png', 'aya-d.png'];
assert.deepEqual(readdirSync(join(directory, 'images')).sort(), expected.toSorted());
const pages = {
  'index.html': ['galley-a.png', 'galley-c.png', 'galley-d.png', 'aya-a.png', 'aya-c.png', 'aya-d.png'],
  'round-01.html': ['galley-a.png', 'galley-b.png', 'aya-a.png', 'aya-b.png'],
};
for (const [page, pageImages] of Object.entries(pages)) {
const html = readFileSync(join(directory, page), 'utf8');
const sources = [...html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)];
assert.equal(sources.length, pageImages.length, `${page}: unexpected image count`);
assert.deepEqual(new Set(sources.map(match => match[1])), new Set(pageImages.map(name => `images/${name}`)));
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
}
const current = readFileSync(join(directory, 'index.html'), 'utf8');
assert.match(current, /Calibration · 02/);
assert.match(current, /href="round-01.html"/);
assert.match(current, /footer a \{ display:inline-block; padding:12px 0; white-space:nowrap; \}/, 'Archive link needs an unbroken mobile tap target.');
assert.match(current, /neither/);
assert.match(current, /unsure/);
const deployment = JSON.parse(readFileSync(join(directory, 'vercel.json'), 'utf8'));
assert.ok(deployment.headers.some(rule => rule.headers.some(header => header.key === 'X-Robots-Tag')));
const exclusions = readFileSync(join(directory, '.vercelignore'), 'utf8');
assert.ok(exclusions.includes('.env*'), 'Environment files must be excluded.');
assert.ok(exclusions.includes('!round-01.html'), 'Previous round must remain deployable.');
console.log('PASS: current and archived rounds, eight PNGs, full-size links, alt text, zoom, no form or scripts, noindex, credential exclusions.');
