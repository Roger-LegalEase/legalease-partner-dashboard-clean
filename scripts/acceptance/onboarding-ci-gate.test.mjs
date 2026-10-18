import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, inventory, matrixGroups, parity, structure } from './onboarding-ci-gate.mjs';

const workflow = (groupList, ...steps) => `jobs:
  groups:
    strategy:
      matrix:
        group: [${groupList}]
    steps:
${steps.join('\n')}
`;
const step = (name, body, group) => `      - name: ${name}
${group ? `        if: matrix.group == '${group}'\n` : ''}        run: |
${body.map((l) => `          ${l}`).join('\n')}
`;
const oneLine = (name, cmd, group) => `      - name: ${name}
${group ? `        if: matrix.group == '${group}'\n` : ''}        run: ${cmd}
`;

test('inventory reads one-line and block runs with their matrix group', () => {
  const rows = inventory(workflow('a, b', oneLine('Lint', 'npm run lint', 'a'), step('Boundaries', ['node scripts/x.mjs', 'node scripts/y.mjs --flag'], 'b'), oneLine('Fetch', 'git fetch --depth=1 origin abc')));
  assert.deepEqual(rows, [
    { step: 'Lint', group: 'a', cmd: 'npm run lint' },
    { step: 'Boundaries', group: 'b', cmd: 'node scripts/x.mjs' },
    { step: 'Boundaries', group: 'b', cmd: 'node scripts/y.mjs --flag' },
    { step: 'Fetch', group: 'all', cmd: 'git fetch --depth=1 origin abc' },
  ]);
  assert.deepEqual(matrixGroups(workflow('a, b')), ['a', 'b']);
});

test('parity fails on a dropped command and on a test command that runs twice, allows additions', () => {
  const base = inventory(workflow('a', step('S', ['node scripts/x.mjs', 'node scripts/y.mjs'], 'a')));
  assert.equal(parity(base, inventory(workflow('a, b', step('S', ['node scripts/x.mjs'], 'a')))).ok, false);
  assert.deepEqual(parity(base, inventory(workflow('a, b', step('S', ['node scripts/x.mjs'], 'a')))).missing, ['node scripts/y.mjs']);
  assert.equal(parity(base, inventory(workflow('a, b', step('S', ['node scripts/x.mjs', 'node scripts/y.mjs'], 'a'), step('T', ['node scripts/x.mjs'], 'b')))).ok, false);
  const superset = parity(base, inventory(workflow('a, b', step('S', ['node scripts/x.mjs'], 'a'), step('T', ['node scripts/y.mjs', 'node scripts/new.mjs'], 'b'))));
  assert.equal(superset.ok, true);
  assert.deepEqual(superset.added, ['node scripts/new.mjs']);
});

test('structure rejects a step gated on a group the matrix does not run', () => {
  const problems = structure(workflow('a, b', step('S', ['node scripts/x.mjs'], 'c')));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /gated on group 'c'/);
  assert.deepEqual(structure(workflow('a, b', step('S', ['node scripts/x.mjs'], 'a'))), []);
});

test('gate fails on failure, cancellation, skip, a missing job and no needs at all', () => {
  assert.deepEqual(gate({ groups: { result: 'success' } }, ['groups']), []);
  for (const result of ['failure', 'cancelled', 'skipped']) assert.deepEqual(gate({ groups: { result } }, ['groups']), [`groups: ${result}`]);
  assert.deepEqual(gate({ other: { result: 'success' } }, ['groups']), ['groups: no result']);
  assert.deepEqual(gate(null, ['groups']), ['groups: no result']);
  assert.deepEqual(gate({ groups: { result: 'success' } }, []), ['no jobs named']);
});
