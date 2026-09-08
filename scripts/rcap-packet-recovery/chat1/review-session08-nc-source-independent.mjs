import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { preserveIdentityRefresh } from '../../rcap-packet-completeness/identity-refresh.mjs';

const base = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const directory = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const receiptPath = `${directory}/source-receipt.json`;
const registryPath = 'data/record-clearing/legal-design-track-registry.json';
const hostPath = 'scripts/build-census-v1-nc_146_dismissal_petition-set.mjs';
const oldCommit = '0489cca02685b98789f32da98d5fb90ff36a986e';
const currentCommit = '75647c8901618ee8aca94e6dc971cd769331e991';
const packetCommit = '55deb25610019f9c32d7271f7300baf844819a11';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const show = (commit, file) => execFileSync('git', ['show', `${commit}:${file}`], { maxBuffer: 24_000_000 });
const read = file => JSON.parse(fs.readFileSync(file));
const serial = value => `${JSON.stringify(value, null, 2)}\n`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const oldReceipt = JSON.parse(show(packetCommit, receiptPath));
const receipt = read(receiptPath);
const pin = value => value.committedRecords.filter(item => item.pathInRepository === registryPath);
const oldBytes = show(oldCommit, registryPath);
const newBytes = fs.readFileSync(registryPath);
const before = JSON.parse(oldBytes), after = JSON.parse(newBytes);
const tests = [];
function test(name, run) {
  try { run(); tests.push({ name, passed: true }); }
  catch (error) { tests.push({ name, passed: false, error: error.message }); }
}
test('Historical and current registry identities are independently measured against immutable commits', () => {
  assert.equal(sha(oldBytes), '9fe5d0ccf1b172877acdf6a5158e79dc040ce6f77ee47b2ee0403056acb0957f');
  assert.equal(sha(newBytes), 'baa26b2e882933329aea3caedb0a8b6e31c2eae26489b35557556173f3d119dc');
  assert.ok(newBytes.equals(show(currentCommit, registryPath)));
});
test('Only the one source pin changes; route, family and every other receipt obligation remain exact', () => {
  assert.equal(pin(oldReceipt).length, 1);
  assert.equal(pin(receipt).length, 1);
  const normalized = structuredClone(receipt);
  Object.assign(pin(normalized)[0], pin(oldReceipt)[0]);
  delete pin(normalized)[0].identityRefresh;
  if (Object.hasOwn(pin(oldReceipt)[0], 'identityRefresh')) pin(normalized)[0].identityRefresh = pin(oldReceipt)[0].identityRefresh;
  assert.deepEqual(normalized, oldReceipt);
  assert.equal(pin(receipt)[0].sha256, sha(newBytes));
  assert.equal(pin(receipt)[0].byteLength, newBytes.length);
  assert.equal(pin(receipt)[0].identityRefresh.was.sha256, sha(oldBytes));
});
test('The entire bound NC track and global metadata, not a cherry-picked eligibility subset, are unchanged', () => {
  const { tracks: oldTracks, ...oldMetadata } = before;
  const { tracks: newTracks, ...newMetadata } = after;
  assert.deepEqual(oldMetadata, newMetadata);
  const oldMatches = oldTracks.filter(track => track.trackId === 'nc_146_dismissal_petition');
  const newMatches = newTracks.filter(track => track.trackId === 'nc_146_dismissal_petition');
  assert.equal(oldMatches.length, 1); assert.equal(newMatches.length, 1);
  assert.deepEqual(oldMatches[0], newMatches[0]);
  const objectSha = sha(`${JSON.stringify(canonical(newMatches[0]))}\n`);
  assert.equal(objectSha, pin(oldReceipt)[0].exactObject.canonicalObjectSha256);
  assert.equal(objectSha, pin(receipt)[0].identityRefresh.identicalTrackSha256.nc_146_dismissal_petition);
});
const authorHook = read(`${base}/nc-source-writer-hook.json`);
test('Measured author hook execution passed and is bound to the actual installed host and receipt', () => {
  assert.equal(authorHook.failed, 0); assert.equal(authorHook.passed, 13);
  assert.equal(authorHook.host.afterSha256, sha(fs.readFileSync(hostPath)));
  assert.equal(authorHook.receipt.sha256, sha(fs.readFileSync(receiptPath)));
  assert.equal(authorHook.actualWriterBodiesExecuted, true);
});
const scratch = fs.mkdtempSync(path.join(base, 'nc-independent-writer-'));
try {
  const root = path.resolve(scratch), destination = path.join(root, 'source-receipt.json');
  const host = fs.readFileSync(hostPath, 'utf8');
  const body = host.match(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(body, 'The installed writer must be extracted, not simulated');
  const writer = vm.runInNewContext(`${body}\nwriteJson;`, { fs, path, ROOT: root, preserveIdentityRefresh });
  const plain = structuredClone(receipt); delete pin(plain)[0].identityRefresh;
  test('Independent execution of the actual installed writer preserves the real source-bound annotation', () => {
    fs.writeFileSync(destination, serial(receipt)); writer('source-receipt.json', plain);
    assert.equal(fs.readFileSync(destination, 'utf8'), serial(receipt));
  });
  for (const [name, mutate] of [
    ['changed digest', value => { pin(value)[0].sha256 = '0'.repeat(64); }],
    ['changed length', value => { pin(value)[0].byteLength++; }],
    ['changed path', value => { pin(value)[0].pathInRepository += '.different'; }]
  ]) test(`Independent actual-writer refusal: ${name}`, () => {
    const next = structuredClone(plain); mutate(next);
    fs.writeFileSync(destination, serial(receipt)); writer('source-receipt.json', next);
    assert.equal(fs.readFileSync(destination, 'utf8'), serial(next));
  });
  test('Independent actual-writer refusal: injected approval cannot be preserved as source identity', () => {
    const forged = structuredClone(receipt); pin(forged)[0].identityRefresh.approvedBy = 'untrusted';
    fs.writeFileSync(destination, serial(forged)); writer('source-receipt.json', plain);
    assert.equal(fs.readFileSync(destination, 'utf8'), serial(plain));
  });
} finally {
  assert.equal(fs.lstatSync(scratch).isSymbolicLink(), false);
  fs.rmSync(scratch, { recursive: true, force: true });
}
test('All ten approved PDFs and four official source originals retain the original review identities', () => {
  const review = read('data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/nc-independent-review.json').rows.find(row => row.familyId === receipt.familyId);
  assert.equal(review.wholePdfHashesMeasured.length, 10);
  assert.equal(receipt.documents.length, 4);
  for (const file of review.wholePdfHashesMeasured) assert.equal(sha(fs.readFileSync(`${directory}/${file.file}`)), file.sha256);
  for (const file of receipt.documents) assert.equal(sha(fs.readFileSync(file.pathInRepository)), file.sha256);
});
const failed = tests.filter(item => !item.passed).length;
const result = {
  schemaVersion: 'rcap-nc-source-independent-delta-review/v1', reviewer: 'Captain, independent of source-refresh and hook author',
  recordedAt: new Date().toISOString(), familyId: receipt.familyId,
  status: failed ? 'FAIL_REPAIR_REQUIRED' : 'PASS_BOUNDED_SOURCE_AND_WRITER_DELTA',
  tests, passed: tests.length - failed, failed,
  boundInputs: [receiptPath, hostPath, `${base}/nc-source-registry-equivalence.json`, `${base}/nc-source-writer-hook.json`]
    .map(file => ({ path: file, sha256: sha(fs.readFileSync(file)) })),
  unchangedPdfCount: 10, unchangedOriginalCount: 4, rendererExecutions: 0,
  runtimeAdmissionProven: false, productionDeploymentProven: false, terminalStateClaimed: false
};
fs.writeFileSync(`${base}/independent-nc-source-refresh.json`, serial(result));
console.log(JSON.stringify(result));
if (failed) process.exitCode = 1;
