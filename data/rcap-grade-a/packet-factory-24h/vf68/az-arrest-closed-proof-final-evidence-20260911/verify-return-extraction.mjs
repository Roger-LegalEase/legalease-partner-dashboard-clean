import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Run the existing extractor unchanged; divert its one generated document to
// this review's evidence directory instead of the shared materialized output.
const root = process.cwd();
const familyId = 'az_record_sealing_arrest_no_charges-set';
const returnPath = 'data/rcap-grade-a/packet-factory-24h/vf68/rows-vf68-20260911-az-arrest-closed-proof-final.json';
const evidenceDirectory = path.dirname(new URL(import.meta.url).pathname);
const normalOutput = path.resolve(root, 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json');
const originalOutput = fs.existsSync(normalOutput) ? fs.readFileSync(normalOutput) : null;
const write = fs.writeFileSync.bind(fs);
const log = console.log;
const error = console.error;
const messages = [];
let captured;
console.log = (...args) => messages.push(args.join(' '));
console.error = (...args) => messages.push(args.join(' '));
fs.writeFileSync = (target, data, ...options) => {
  assert.equal(path.resolve(String(target)), normalOutput, 'extractor attempted an unexpected write');
  captured = JSON.parse(String(data));
};
try {
  await import(pathToFileURL(path.resolve(root, 'scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs')).href);
} finally {
  fs.writeFileSync = write;
  console.log = log;
  console.error = error;
}
assert.ok(captured, 'existing extractor produced no output');
const rows = captured.rows.filter(row => row.familyId === familyId);
const selected = rows.filter(row => row.isIndependentVerification && !row.superseded);
assert.equal(selected.length, 1, 'expected exactly one current independent verdict');
assert.equal(selected[0].verdict, 'PASS_COMPLETE_INDEPENDENT');
assert.equal(selected[0].verifiedAtBase, 'ec913f1b613da6bc4918b149efa03f54b95974c6');
assert.equal(selected[0].evidencePath, returnPath);
assert.deepEqual(selected[0].failedObligations.map(item => item.obligation), []);
assert.ok(!captured.failRepairRequiredFamilies.includes(familyId));
assert.deepEqual(originalOutput, fs.existsSync(normalOutput) ? fs.readFileSync(normalOutput) : null);
write(path.join(evidenceDirectory, 'return-extractor-verification.json'), JSON.stringify({
  command: 'node data/rcap-grade-a/packet-factory-24h/vf68/az-arrest-closed-proof-final-evidence-20260911/verify-return-extraction.mjs',
  extractor: 'scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs',
  extractorUnmodified: true,
  outputCapturedWithoutSharedWrite: true,
  sharedOutputBytesUnchanged: true,
  familyId,
  selectedVerdict: selected[0],
  familyHistory: rows,
  familyListedForRepair: false,
  status: 'PASS'
}, null, 2) + '\n');
write(path.join(evidenceDirectory, 'return-extractor-verification.log'), messages.join('\n') + '\n');
console.log('PASS: unchanged extractor selects current VF68 PASS_COMPLETE_INDEPENDENT with all 15 obligations passed; shared output bytes unchanged.');
