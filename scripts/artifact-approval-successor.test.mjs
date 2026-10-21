import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { artifactSuccessorInputs, historicalArtifactRecord, MS_SUCCESSOR_VERIFICATION } from './lib/artifact-approval-successor.mjs';
const readBytes = rel => fs.readFileSync(rel);
const ms = 'ms-misd-addl-set', il = 'il-prostitution-j-vacate-set';
const rasterPath = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
function mutatedJson(target, mutate) {
  return rel => {
    const bytes = readBytes(rel);
    if (rel !== target) return bytes;
    const document = JSON.parse(bytes);
    mutate(document);
    return Buffer.from(JSON.stringify(document));
  };
}
test('IL exact owner pair has fifteen independent obligations and central raster proof', () => {
  const proof = artifactSuccessorInputs(il, readBytes);
  assert.equal(Object.keys(proof.detail.proofObligations).length, 15);
  assert.equal(proof.approval.status, 'APPROVED_EXACT_SHIPPING_ARTIFACTS');
  for (const route of proof.approval.routeIds) assert.equal(historicalArtifactRecord(route).record.revocation.revoked, true);
});
test('MS owner approval cannot substitute a local raster for the central receipt', () => {
  const read = mutatedJson(rasterPath, d => {
    const row = d.rows.find(r => r.familyId === ms);
    row.rasterReceipt = {...row.rasterReceipt, workflowRunId:null};
  });
  assert.throws(() => artifactSuccessorInputs(ms, read), /central published raster incomplete/);
});
for (const [name, mutate, refusal] of [
  ['renamed obligation with same count', d => { d.rows[0].proofObligations.MADE_UP = d.rows[0].proofObligations.SERVICE; delete d.rows[0].proofObligations.SERVICE; }, /all fifteen obligations required/],
  ['missing obligation', d => { delete d.rows[0].proofObligations.SERVICE; }, /all fifteen obligations required/],
  ['stale evidence input hash', d => { d.rows[0].evidence[0].sha256 = '0'.repeat(64); }, /technical input changed/],
  ['failed obligation', d => { d.rows[0].proofObligations.PROTECTED_FIELDS.result = 'FAIL'; }, /all fifteen obligations required/],
  ['nonindependent reviewer', d => { d.rows[0].isIndependentVerification = false; }, /independent verification incomplete/],
  ['rejected canonical digest', d => { d.rows[0].canonicalSha256 = '3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399'; }, /canonical independent proof/],
  ['rejected boundary digest', d => { d.rows[0].boundarySha256 = 'e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36'; }, /boundary independent proof/],
  ['wrong family', d => { d.rows[0].familyId = 'ms-nonconv-set'; }, /requires one current verifier/],
  ['superseded proof', d => { d.rows[0].superseded = true; }, /requires one current verifier/]
]) test(`MS successor rejects ${name}`, () => assert.throws(() => artifactSuccessorInputs(ms, mutatedJson(MS_SUCCESSOR_VERIFICATION, mutate)), refusal));
for (const [name, mutate, refusal] of [
  ['local receipt with hosted-looking identifiers', r => { r.rasterReceipt.executionKind = 'local_canonical_raster'; }, /central published raster incomplete/],
  ['missing workflow', r => { r.rasterReceipt.workflowRunId = null; }, /central published raster incomplete|IL current raster does not cover approved pair/],
  ['missing job', r => { r.rasterReceipt.jobId = null; }, /central published raster incomplete|IL current raster does not cover approved pair/],
  ['partial family', r => { r.rasterReceipt.coversTheWholeFamily = false; }, /central published raster incomplete|IL current raster does not cover approved pair/],
  ['raster failure', r => { r.currentRasterState = 'RASTER_FAIL'; }, /central published raster incomplete|IL current raster does not cover approved pair/],
  ['failed hosted job', r => { r.rasterReceipt.jobConclusion = 'failure'; }, /central published raster incomplete|IL current raster does not cover approved pair/],
  ['wrong raster digest', r => { r.rasterReceipt.boundToCanonicalSha256 = '0'.repeat(64); }, /canonical independent\/central raster proof|IL current raster does not cover approved pair/]
]) test(`IL current successor rejects ${name}`, () => assert.throws(() => artifactSuccessorInputs(il, mutatedJson(rasterPath, d => mutate(d.rows.find(r => r.familyId === il)))) , refusal));
