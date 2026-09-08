#!/usr/bin/env node
// Exercises the real source-byte gate without pretending this is a PDF build.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const source = fs.readFileSync(path.join(ROOT, 'scripts/build-census-v1-fl-early-juvenile-set.mjs'), 'utf8');
const functionSource = source.match(/function sourceBytes\([\s\S]*?\n\}/)?.[0];
assert.ok(functionSource, 'Cannot locate actual source-byte gate');
const requiredSha = source.match(/const EXPECTED_SOURCE_SHA256 = "([a-f0-9]{64})";/)?.[1];
const requiredLength = Number(source.match(/const EXPECTED_SOURCE_LENGTH = (\d+);/)?.[1]);
assert.ok(requiredSha && requiredLength, 'Cannot locate actual source-byte pins');
const input = process.env.PF20_FL_EARLY_JUVENILE_SOURCE;
assert.ok(input, 'Set PF20_FL_EARLY_JUVENILE_SOURCE to the held official FDLE PDF');
const original = fs.readFileSync(input);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = sha256(original);
function gate(file) {
  return vm.runInNewContext(`${functionSource}\nsourceBytes()`, {
    assert, fs, sha256,
    process: { env: { PF20_FL_EARLY_JUVENILE_SOURCE: file } },
    DEFAULT_SOURCE: '', SOURCE_ID: 'FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION',
    EXPECTED_SOURCE_SHA256: requiredSha, EXPECTED_SOURCE_LENGTH: requiredLength,
  });
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'chat3-fl-source-'));
let positives = 0, negatives = 0;
try {
  const result = gate(input);
  assert.equal(sha256(result.bytes), requiredSha); positives++;
  assert.throws(() => gate(path.join(temp, 'absent.pdf')), /BLOCKED_SOURCE.*absent/); negatives++;
  const short = path.join(temp, 'truncated.pdf');
  fs.writeFileSync(short, original.subarray(0, -1));
  assert.throws(() => gate(short), /BLOCKED_SOURCE.*length/); negatives++;
  const corrupt = path.join(temp, 'corrupt.pdf');
  const changed = Buffer.from(original); changed[100] ^= 1;
  fs.writeFileSync(corrupt, changed);
  assert.throws(() => gate(corrupt), /BLOCKED_SOURCE.*SHA-256/); negatives++;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
  assert.equal(sha256(fs.readFileSync(input)), before, 'Source input was mutated');
}
console.log(JSON.stringify({ suite: 'fl-source-input', positives, negatives,
  sourceSha256: before, byteLength: original.length, originalUnchanged: true,
  fullDeterministicRebuild: false, independentApproval: false }, null, 2));
