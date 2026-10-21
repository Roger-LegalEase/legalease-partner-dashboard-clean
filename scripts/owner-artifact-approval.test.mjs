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
  ['renamed obligation with same count', 'data/rcap-grade-a/packet-factory-24h/vf01/rows.json', d => { const row = d.rows.find(r=>r.itemId==='il-prostitution-j-vacate-set' && r.verifiedAtBase==='d974bcdd8'); row.proofObligations.UNRELATED = row.proofObligations.ROUTE_IDENTITY; delete row.proofObligations.ROUTE_IDENTITY; }],
  ['failed independent obligation', 'data/rcap-grade-a/packet-factory-24h/vf01/rows.json', d => { const row = d.rows.find(r=>r.itemId==='il-prostitution-j-vacate-set' && r.verifiedAtBase==='d974bcdd8'); row.proofObligations.ROUTE_IDENTITY.result='FAIL'; }],
  ['wrong raster artifact', 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json', d => { d.rows.find(r=>r.familyId==='il-prostitution-j-vacate-set').rasterReceipt.boundToCanonicalSha256='0'.repeat(64); }],
  ['non-independent verifier', 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json', d => { d.rows.find(r=>r.familyId==='il-prostitution-j-vacate-set' && r.superseded===false).isIndependentVerification=false; }]
]) test(`${name} cannot enter the new approval technical binding`,()=>{
  const document=JSON.parse(read(target)); change(document);
  assert.throws(()=>loadIlArtifactApproval(path=>path===target?Buffer.from(JSON.stringify(document)):read(path)), /IL /);
});

const {loadMsArtifactApproval, MS_ARTIFACT_APPROVAL_PATH} = await import('./lib/owner-artifact-approval.mjs');
test('new MS approval binds only the repaired pair and preserves rejection', () => {
  const approval = loadMsArtifactApproval(read);
  assert.equal(approval.status, 'APPROVED_EXACT_SHIPPING_ARTIFACTS');
  assert.equal(approval.approvedArtifacts.length, 2);
  assert.equal(approval.preservesFulfillmentRevocations, true);
  assert.equal(approval.runtimeOrProductionAuthorization, false);
});
for (const fixture of ['canonical','boundary']) test(`MS ${fixture} future or rejected bytes cannot inherit approval`, () => {
  const current=`data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/${fixture}.pdf`;
  const rejected=`data/rcap-grade-a/artifact-rereview-20260914/ms-misd-addl-set/reviewed-pdfs/${fixture}.pdf`;
  for (const replacement of [read(rejected), Buffer.concat([read(current),Buffer.from('changed')])]) {
    assert.throws(()=>loadMsArtifactApproval(p=>p===current?replacement:read(p)),/exact owner-approved repaired artifact/);
  }
});
test('MS approval does not authorize future dates, unrelated routes or deployment', () => {
  for (const mutate of [d=>d.routeIds.push('MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal'),d=>d.scope.deploymentAuthorized=true,d=>d.decidedOn='2026-09-15']) {
    const decision=JSON.parse(read(MS_ARTIFACT_APPROVAL_PATH));mutate(decision);
    assert.throws(()=>loadMsArtifactApproval(p=>p===MS_ARTIFACT_APPROVAL_PATH?Buffer.from(JSON.stringify(decision)):read(p)),/decision bytes changed/);
  }
});
test('MS rejected history and owner-reviewed evidence cannot be substituted',()=>{
  const approval=loadMsArtifactApproval(read);
  for(const target of [approval.preservedRejection.path,approval.ownerReviewedEvidence.path,approval.ownerReviewedEvidence.independentReview.path]){
    assert.throws(()=>loadMsArtifactApproval(p=>p===target?Buffer.concat([read(p),Buffer.from('changed')]):read(p)),/changed/);
  }
});
