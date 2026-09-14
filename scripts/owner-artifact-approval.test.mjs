import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadIlArtifactApproval, IL_ARTIFACT_APPROVAL_PATH} from './lib/owner-artifact-approval.mjs';
const read = path => fs.readFileSync(path);
test('new IL owner decision binds the exact current pair without runtime or Production approval', () => {
  const result = loadIlArtifactApproval(read);
  assert.equal(result.approvedArtifacts.length, 2);
  assert.equal(result.artifactApprovalOnly, true);
  assert.equal(result.preservesFulfillmentRevocations, true);
  assert.equal(result.runtimeOrProductionAuthorization, false);
});
for (const fixture of ['canonical', 'boundary']) test(`changed ${fixture} bytes cannot inherit owner approval`, () => {
  assert.throws(() => loadIlArtifactApproval(path => path.endsWith(`/${fixture}.pdf`) ? Buffer.concat([read(path), Buffer.from('changed')]) : read(path)), /exact owner-approved/);
});
test('future decision, route, or broader approval cannot silently replace this decision', () => {
  for (const mutate of [d => d.routeIds.push('IL:automatic-prostitution-relief'), d => d.scope.productionAuthorized=true, d => d.decidedOn='2026-09-15',d=>d.approvedArtifacts.reverse()]) {
    const d = JSON.parse(read(IL_ARTIFACT_APPROVAL_PATH)); mutate(d);
    assert.throws(() => loadIlArtifactApproval(path => path === IL_ARTIFACT_APPROVAL_PATH ? Buffer.from(JSON.stringify(d)) : read(path)), /decision bytes changed/);
  }
});
for (const [name, target, change] of [
  ['missing independent obligation', 'data/rcap-grade-a/packet-factory-24h/vf01/rows.json', d => { const row = d.rows.find(r=>r.itemId==='il-prostitution-j-vacate-set' && r.verifiedAtBase==='d974bcdd8'); delete row.proofObligations.ROUTE_IDENTITY; }],
  ['failed independent obligation', 'data/rcap-grade-a/packet-factory-24h/vf01/rows.json', d => { const row = d.rows.find(r=>r.itemId==='il-prostitution-j-vacate-set' && r.verifiedAtBase==='d974bcdd8'); row.proofObligations.ROUTE_IDENTITY.result='FAIL'; }],
  ['wrong raster artifact', 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json', d => { d.rows.find(r=>r.familyId==='il-prostitution-j-vacate-set').rasterReceipt.boundToCanonicalSha256='0'.repeat(64); }],
  ['non-independent verifier', 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json', d => { d.rows.find(r=>r.familyId==='il-prostitution-j-vacate-set' && r.superseded===false).isIndependentVerification=false; }]
]) test(`${name} cannot enter the new approval technical binding`,()=>{
  const document=JSON.parse(read(target)); change(document);
  assert.throws(()=>loadIlArtifactApproval(path=>path===target?Buffer.from(JSON.stringify(document)):read(path)), /IL /);
});
