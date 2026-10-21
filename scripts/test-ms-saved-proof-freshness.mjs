#!/usr/bin/env node
// Exercise the real CLI's final stored-proof gate, without rebuilding packets.
// Candidate validation is a boundary double; full generation/authority proof
// remains the responsibility of verify-ms-paid-packet-proof.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileFunction } from 'node:vm';
import { MS_PAID_PACKET_PROOF, MS_PROOF_EXECUTION_INPUTS, MS_PROOF_OBSERVED_INPUTS } from './lib/ms-paid-packet-proof.mjs';

const testPath = 'scripts/test-ms-saved-proof-freshness.mjs';
assert(![...MS_PROOF_EXECUTION_INPUTS, ...MS_PROOF_OBSERVED_INPUTS].includes(testPath), 'test unexpectedly became a proof input');
const verifier = fs.readFileSync('scripts/verify-ms-paid-packet-proof.mjs', 'utf8');
const start = 'const bytes=Buffer.from(JSON.stringify(proof,null,2)';
const end = 'console.log(JSON.stringify({routeId:proof.routeId';
assert.equal(verifier.split(start).length, 2, 'locate the actual candidate-validation/output boundary exactly once');
assert.equal(verifier.split(end).length, 2, 'locate the final report exactly once');
assert(verifier.indexOf(end) > verifier.indexOf(start));
const finish = compileFunction(verifier.slice(verifier.indexOf(start), verifier.indexOf(end)),
  ['proof', 'loadMsPaidPacketProof', 'fs', 'assert', 'process', 'outputFlag', 'out', 'MS_PAID_PACKET_PROOF', 'stableStringify', 'approval', 'Buffer']);
const savedBytes = fs.readFileSync(MS_PAID_PACKET_PROOF);
// A captured proof is the fixture for this comparison, not a claim that the
// current checkout's sources reproduce it. No source pins are refreshed here.
const candidate = JSON.parse(savedBytes);
const stale = '0'.repeat(64);
const sourcePath = 'src/lib/expungement-ai/packet-information.ts';
assert.notEqual(candidate.inputs[sourcePath], stale);
assert.notEqual(candidate.results[0].artifactSha256, stale);

function boundary(saved, { preview = false, write = false } = {}) {
  const disk = new Map([[MS_PAID_PACKET_PROOF, Buffer.from(JSON.stringify(saved))]]);
  const before = Buffer.from(disk.get(MS_PAID_PACKET_PROOF));
  const calls = { validatedCandidates: 0, savedReads: 0, writes: 0 };
  const output = preview ? '/synthetic-ms-proof-preview.json' : MS_PAID_PACKET_PROOF;
  const fileSystem = {
    readFileSync(file) {
      assert.equal(file, MS_PAID_PACKET_PROOF);
      calls.savedReads++;
      return disk.get(file);
    },
    writeFileSync(file, bytes, options) {
      assert.deepEqual(options, { flag: 'wx' });
      assert(!disk.has(file), 'refusing to overwrite an existing proof');
      disk.set(file, Buffer.from(bytes));
      calls.writes++;
    },
  };
  const validateCandidate = ({ readBytes }) => {
    assert.deepEqual(JSON.parse(readBytes(MS_PAID_PACKET_PROOF)), candidate);
    calls.validatedCandidates++;
  };
  let error;
  try {
    finish(structuredClone(candidate), validateCandidate, fileSystem, assert,
      { argv: write ? ['--write'] : [] }, preview ? 1 : -1, output,
      MS_PAID_PACKET_PROOF, JSON.stringify, candidate.ownerDecision, Buffer);
  } catch (caught) { error = caught; }
  assert.deepEqual(disk.get(MS_PAID_PACKET_PROOF), before, 'the saved proof must never be changed');
  assert.equal(calls.validatedCandidates, 1, 'candidate validation must execute even when the saved proof is stale');
  return { error, calls, disk, output };
}

let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
function rejects(saved) {
  const result = boundary(saved);
  assert.equal(result.error?.code, 'ERR_ASSERTION');
  assert.match(result.error.message, /stale MS packet proof/);
  assert.equal(result.calls.savedReads, 1);
  assert.equal(result.calls.writes, 0);
}
check('valid saved proof passes the actual stored-proof gate', () => {
  const result = boundary(candidate);
  assert.ifError(result.error);
  assert.deepEqual(result.calls, { validatedCandidates: 1, savedReads: 1, writes: 0 });
});
for (const [name, mutate] of [
  ['stale source evidence', proof => { proof.inputs[sourcePath] = stale; }],
  ['stale artifact evidence', proof => { proof.results[0].artifactSha256 = stale; }],
  ['stale verification binding', proof => { proof.results[0].verificationBoundInputsSha256 = stale; }],
  ['changed owner authority', proof => { proof.ownerDecision.productionAuthorized = true; }],
]) check(name + ' fails after candidate validation', () => {
  const saved = structuredClone(candidate); mutate(saved);
  assert.notDeepEqual(saved, candidate, 'the stale-evidence mutation must change the fixture');
  rejects(saved);
});
check('candidate preview neither validates nor updates stale saved proof', () => {
  const saved = structuredClone(candidate); saved.inputs[sourcePath] = stale;
  const result = boundary(saved, { preview: true });
  assert.ifError(result.error);
  assert.deepEqual(result.calls, { validatedCandidates: 1, savedReads: 0, writes: 1 });
  assert.deepEqual(JSON.parse(result.disk.get(result.output)), candidate);
  rejects(JSON.parse(result.disk.get(MS_PAID_PACKET_PROOF)));
});
check('write mode cannot overwrite existing saved proof', () => {
  const result = boundary(candidate, { write: true });
  assert.match(result.error?.message ?? '', /refusing to overwrite/);
  assert.equal(result.calls.writes, 0);
});
check('generating commit and JSON key order do not invalidate identical evidence', () => {
  const saved = Object.fromEntries(Object.entries(candidate).reverse());
  saved.sourceSha = '0'.repeat(40);
  assert.ifError(boundary(saved).error);
});
assert.deepEqual(fs.readFileSync(MS_PAID_PACKET_PROOF), savedBytes, 'real saved proof remains byte-identical');
console.log(`${checks}/${checks} saved-proof boundary checks passed; no packet generation or current-source/authority acceptance.`);
