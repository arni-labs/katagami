import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// This runner invokes Z3 on a symbolic plan. It reads no image, page, or DOM.
const model = fileURLToPath(new URL('./annotation-transfer.smt2', import.meta.url));
const run = spawnSync('z3', ['-smt2', model], { encoding: 'utf8', timeout: 10000 });
assert.ifError(run.error);
assert.equal(run.status, 0, run.stderr || run.stdout);
assert.doesNotMatch(run.stdout, /\(error/);
const statuses = run.stdout.split('\n').filter(line => /^(sat|unsat|unknown)$/.test(line));
assert.deepEqual(statuses, ['sat', 'sat', 'unsat', 'unsat', 'sat']);
assert.match(run.stdout, /source_on_press_cyan/);
assert.match(run.stdout, /requested_on_press_vermilion/);
console.log(run.stdout.trim());
console.log('PASS: two compatible presentation selectors, one profile conflict, preservation with unique keys, counterexample without unique keys.');
