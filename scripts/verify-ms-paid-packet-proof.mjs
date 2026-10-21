#!/usr/bin/env node
// Bounded re-verification of the already-approved MS participant pair. No
// packet, raster, legal approval, source inventory or hosted state is rewritten.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { PDFDocument } from 'pdf-lib';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { renderGradeAPacketPdf } = await import('../src/lib/rcap/grade-a/renderer.ts');
const { stableStringify } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { finalVerificationBoundInputsSha256 } = await import('../src/lib/rcap/fulfillment/final-verification-contract.ts');
const sha = value => createHash('sha256').update(value).digest('hex');
const inputs = {};
const read = file => { const bytes=fs.readFileSync(file); inputs[file]=sha(bytes); return bytes; };
const json = file => JSON.parse(read(file));
const approval = loadMsPaidConsumerSuccessor(); assert.ok(approval, 'exact owner approval refused');
read(approval.decisionPath);
const spec = json(approval.specificationPath);
assert.equal(spec.routeKey, approval.routeId); assert.equal(spec.trackId,'ms-nonconv'); assert.equal(spec.packetSetId,'ms-nonconv-set');
assert.equal(spec.legalSectionsBound,true);
assert.equal(spec.documents.some(d=>d.outputStrategy==='official_pdf_fill'||d.officialFormId||d.sourcePdfPath),false);
const manifestPath='data/record-clearing/legal-design-packet-set-manifests.json';
const packetSet=json(manifestPath).packetSets.find(p=>p.packetSetId===spec.packetSetId);
assert.equal(packetSet.trackId,spec.trackId);
assert.equal(packetSet.components.some(d=>d.outputStrategy==='official_pdf_fill'||d.officialFormId),false);
const memoPath='data/record-clearing/legal-design-intake/MS.memo.json';
const track=json(memoPath).tracks.find(t=>t.trackId===spec.trackId);
assert.equal(track.outputStrategy,'custom_pleading');
for(const identity of spec.sourceIdentities.filter(i=>i.location)) read(identity.location);
const artifacts=json(approval.historicalApprovalPath);
const rasterPath='data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json';
const raster=json(rasterPath);
assert.equal(raster.status,'passed'); assert.equal(raster.routeKey,approval.routeId); assert.equal(raster.packetFamily,spec.packetFamily);
const legal=artifacts.participantDeliveryReview;
assert.equal(legal.state,'approved'); assert.equal(legal.consumerPaidAuthorized,false); assert.equal(legal.productionAuthorized,false);
assert.equal(legal.packetSpecificationSha256,inputs[approval.specificationPath]);
const sourceInputs={contract:'rcap-codified-authority-bound-inputs/v1',routeId:approval.routeId,familyId:spec.packetFamily,trackId:spec.trackId,packetSetId:spec.packetSetId,implementationStrategy:'custom_pleading',officialBinaryComponentsExpected:false,
  authorityInputs:[
    {role:'track_authority',path:memoPath,selector:{trackId:spec.trackId},sha256:sha(stableStringify(track))},
    {role:'packet_set_authority',path:manifestPath,selector:{packetSetId:spec.packetSetId},sha256:sha(stableStringify(packetSet))},
    {role:'packet_specification_authority',path:approval.specificationPath,sha256:inputs[approval.specificationPath]},
    {role:'approved_output_authority',path:approval.historicalApprovalPath,sha256:inputs[approval.historicalApprovalPath]},
    {role:'paid_scope_authority',path:approval.decisionPath,sha256:approval.decisionSha256}
  ], officialRuleClaims:'The specification retains its asserted-by-ingestion administrative/notary references. This proves adopted custom-pleading authority, not possession of an official binary or a new legal review.'};
const sourceHash=sha(stableStringify(sourceInputs));
const results=[]; const db=startEphemeralPg();
try {
  for(const row of artifacts.artifacts.filter(a=>a.fixture.startsWith('participant_delivery_'))) {
    const fixture=json(row.fixtureFile); assert.equal(fixture.routeKey,approval.routeId); assert.equal(fixture.generationPurpose,'participant_delivery');
    const bytes=read(row.file); assert.equal(sha(bytes),row.sha256); assert.equal(bytes.length,row.byteLength);
    const approved=legal[row.fixture.endsWith('canonical')?'canonical':'boundary'];
    assert.equal(approved.sha256,row.sha256); assert.equal(approved.pageCount,row.pageCount);
    const reviewed=raster.artifacts.find(a=>a.fixture===row.fixture);
    assert.equal(reviewed.sourcePdfSha256,row.sha256); assert.equal(reviewed.pagesReviewed,row.pageCount); assert.equal(reviewed.pageCount,row.pageCount);
    const pages=fs.readdirSync(reviewed.rasterDirectory).filter(f=>f.endsWith('.png')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    assert.equal(pages.length,row.pageCount);
    assert.deepEqual(pages.map(p=>sha(read(path.join(reviewed.rasterDirectory,p)))),reviewed.pageSha256);
    const rendered=await renderGradeAPacketPdf(composeParticipantDeliveryPacket(spec,fixture));
    assert.deepEqual(rendered,bytes,'current participant renderer changed approved bytes');
    const roundTrip=db.json(`select '${JSON.stringify(fixture).replaceAll("'","''")}'::jsonb`);
    assert.deepEqual(await renderGradeAPacketPdf(composeParticipantDeliveryPacket(spec,roundTrip)),bytes,'PostgreSQL facts change approved packet');
    const pageCount=(await PDFDocument.load(bytes)).getPageCount(); assert.equal(pageCount,row.pageCount);
    const bound={participantUserId:`synthetic:${row.fixture}`,matterId:`synthetic:${row.fixture}:matter`,routeId:approval.routeId,packetFamilyId:spec.packetFamily,factSnapshotSha256:sha(stableStringify(fixture.facts)),specificationSha256:inputs[approval.specificationPath],officialSourceSha256ById:{[`codified-authority:${spec.packetFamily}`]:sourceHash},artifactInputSha256:row.sha256,verificationRevision:fixture.verificationHash};
    const hash=await finalVerificationBoundInputsSha256(bound);
    const normalized=db.json(`select '${JSON.stringify(bound).replaceAll("'","''")}'::jsonb`);
    assert.equal(await finalVerificationBoundInputsSha256(normalized),hash);
    for(const key of Object.keys(bound)) {
      const changed=structuredClone(bound); changed[key]=typeof changed[key]==='object'?{changed:'wrong'}:`${changed[key]}:changed`;
      assert.notEqual(await finalVerificationBoundInputsSha256(changed),hash,`verification did not bind ${key}`);
    }
    results.push({fixture:row.fixture,artifactPath:row.file,artifactSha256:row.sha256,pageCount,documentCount:spec.documents.length,participantDelivery:true,currentRendererByteIdentical:true,postgresJsonbByteIdentical:true,verificationBoundInputs:bound,verificationBoundInputsSha256:hash,postgresVerificationHashIdentical:true,negativeBindingControls:Object.keys(bound).length});
  }
} finally {db.stop();}
assert.equal(results.length,2);
function bindTree(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name); if(entry.isDirectory())bindTree(file);else if(file.endsWith('.ts'))read(file);}}
bindTree('src/lib/rcap/grade-a');
for(const file of ['scripts/verify-ms-paid-packet-proof.mjs','scripts/lib/ms-paid-packet-proof.mjs','src/lib/rcap/render/personalized-packet.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/verification-cas.ts','src/lib/rcap/fulfillment/final-verification-contract.ts','src/lib/rcap/fulfillment/paid-consumer-successor.ts'])read(file);
const proof={schemaVersion:'rcap-ms-paid-packet-proof/v1',generatedBy:'scripts/verify-ms-paid-packet-proof.mjs',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),routeId:approval.routeId,trackId:spec.trackId,packetFamilyId:spec.packetFamily,ownerDecision:approval,sourceAuthority:{boundInputs:sourceInputs,boundInputsSha256:sourceHash},results,inputs,scope:'Local exact approved packet/renderer/source-authority verification only; no hosted acceptance, publication, participant delivery, new legal review or Production authority.'};
const out='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json';
if(process.argv.includes('--write'))fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({routeId:proof.routeId,artifacts:results.map(r=>({fixture:r.fixture,sha256:r.artifactSha256,verificationHash:r.verificationBoundInputsSha256})),sourceAuthorityHash:sourceHash,postgresRoundTrip:'PASS',negativeBindingControls:18,proofWritten:process.argv.includes('--write')},null,2));
