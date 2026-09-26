#!/usr/bin/env node
// Every code style on every subject keeps all its rules and renders the same pixels from a fresh
// plan; and a deliberately broken setting breaks the rule it should. Needs Chrome (see
// code-styles-render.mjs), so it runs as its own CI step rather than inside `npm test`, which
// also runs in the Vercel build.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = (p) => fileURLToPath(new URL(p, import.meta.url));
const styles = JSON.parse(readFileSync(dir('../code-styles/styles/index.json'), 'utf8'));
const subjects = JSON.parse(readFileSync(dir('../code-styles/subjects/index.json'), 'utf8')).map((s) => s.id);

const cases = [];
for (const style of styles) {
  for (const subject of subjects) cases.push({ style, subject, expect: 'hold' });
  cases.push({ style, text: 'Katagami', expect: 'hold' });
}
// settings that must still hold
cases.push({ style: 'risograph', subject: 'cat', seed: 1234, expect: 'hold' });
cases.push({ style: 'kintsugi', subject: 'bowl', params: { cracks: 2, branching: 0 }, expect: 'hold' });
// settings that must break exactly the rule they violate
cases.push({ style: 'kirie', subject: 'cat', params: { sheet: '#e2462f', backing: '#e2462f' }, expect: 'two-papers' });
cases.push({ style: 'risograph', subject: 'cat', params: { misregistration: 0 }, expect: 'misregistration' });
cases.push({ style: 'kintsugi', subject: 'cat', params: { metal: 'brass' }, expect: 'noble-metal' });

let failed = 0;
for (const c of cases.filter((k) => styles.includes(k.style))) {
  const args = [dir('./code-styles-render.mjs'), '--style', c.style, '--t', '1', '--out', '/tmp/code-styles-check', '--seed', String(c.seed ?? 1)];
  if (c.text) args.push('--text', c.text);
  else args.push('--subject', c.subject);
  if (c.params) args.push('--params', JSON.stringify(c.params));
  if (c.expect !== 'hold') args.push('--determinism', '0');
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const label = `${c.style} × ${c.text ? `"${c.text}"` : c.subject}${c.seed ? ` seed ${c.seed}` : ''}${c.params ? ` ${JSON.stringify(c.params)}` : ''}`;
  let result;
  try {
    result = JSON.parse(run.stdout);
  } catch {
    console.log(`FAIL ${label}: no result\n${run.stderr}`);
    failed++;
    continue;
  }
  const broken = result.checks.filter((k) => !k.pass).map((k) => k.id);
  let ok, why;
  if (c.expect === 'hold') {
    ok = broken.length === 0 && result.deterministic === true;
    why = broken.length ? `broken: ${broken.join(', ')}` : result.deterministic ? 'all rules hold, deterministic' : 'not deterministic';
  } else {
    ok = broken.length === 1 && broken[0] === c.expect;
    why = `expected only ${c.expect} to break, broken: ${broken.join(', ') || 'none'}`;
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${why}`);
  if (!ok) failed++;
}
if (failed) {
  console.log(`\n${failed} case${failed === 1 ? '' : 's'} failed`);
  process.exit(1);
}
console.log('\ncode styles keep their rules');
