import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import test from 'node:test';
import { deploymentExcludedDirectories, deploymentPathExcluded } from './rcap-deployment-source-ignore.mjs';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const policy = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);

function gitIgnored(source, paths) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-ignore-oracle-'));
  try {
    execFileSync('git', ['init', '--quiet', fixture]);
    fs.writeFileSync(path.join(fixture, '.gitignore'), source);
    try {
      return new Set(execFileSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '--no-index', '-z', '--stdin'],
        { cwd: fixture, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, input: paths.join('\0') + '\0' }).split('\0').filter(Boolean));
    } catch (error) {
      if (error.status === 1) return new Set();
      throw error;
    }
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
}

test('bounded pruning agrees with Git ignore semantics for every tracked file and nested-name probes', () => {
  const directories = deploymentExcludedDirectories(policy);
  const paths = [...files, 'artifacts/generated.pdf', 'data/new-authority/artifacts/proof.pdf',
    'nested/docs/rcap/keep.json', 'docs/rcap/excluded.json', 'artifacts-sibling/keep.json'];
  const ignored = gitIgnored(policy, paths);
  assert.deepEqual(paths.filter(file => deploymentPathExcluded(file, directories)).sort(), [...ignored].sort());
  assert.equal(ignored.has('artifacts/generated.pdf'), true);
  assert.equal(ignored.has('data/new-authority/artifacts/proof.pdf'), false);
});

for (const entry of ['artifacts/', '!data/', 'data/**', '../data/', '/data/../', '/data/file.json']) {
  test(`refuses unsupported or ambiguous exclusion ${entry}`, () => {
    assert.throws(() => deploymentExcludedDirectories(entry), /deployment exclusion/);
  });
}

test('the original hosted pruning loses authority; corrected generic pruning preserves the exact eleven reads', () => {
  const source = fs.readFileSync(path.join(root, 'src/lib/rcap/fulfillment/paid-consumer-successor.ts'), 'utf8');
  const targets = [...new Set([...source.matchAll(/['"](data\/[^'"\n]+\.(?:json|pdf))['"]/g)].map(match => match[1]))];
  assert.equal(targets.length, 11);
  const original = policy.replace('/artifacts/', 'artifacts/');
  const oldIgnored = gitIgnored(original, targets);
  assert.equal(oldIgnored.size, 3);
  assert.ok([...oldIgnored].every(file => file.endsWith('.pdf')));
  const currentIgnored = gitIgnored(policy, targets);
  assert.equal(currentIgnored.size, 0);
  for (const [label, ignored] of [['original', oldIgnored], ['corrected', currentIgnored]]) {
    const pruned = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-authority-pruning-'));
    try {
      for (const file of targets.filter(file => !ignored.has(file))) {
        fs.mkdirSync(path.dirname(path.join(pruned, file)), { recursive: true });
        fs.copyFileSync(path.join(root, file), path.join(pruned, file));
      }
      const result = loadMsPaidConsumerSuccessor(pruned);
      if (label === 'original') assert.equal(result, null);
      else assert.equal(result?.decisionId, 'MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3');
    } finally { fs.rmSync(pruned, { recursive: true, force: true }); }
  }
});
