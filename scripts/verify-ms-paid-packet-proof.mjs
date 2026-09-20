#!/usr/bin/env node
/**
 * Bounded re-verification of the approved MS successor packet set.
 *
 * WHAT CHANGED, AND WHY THIS PROOF IS A NEW GENERATION
 *
 * The 2026-09-14 proof measured two participant-delivery artifacts composed and
 * rendered WITHOUT the shared §7 guide, under an owner decision that recorded
 * `packetContentsChanged: false`. Those bytes no longer reproduce: the guide is
 * now assembled into the full packet and the specification's own
 * ms-filing-and-next-steps page is retired in its favour. That is a real,
 * intentional, owner-approved change to the packet, not drift to be re-pinned.
 *
 * So this proof is bound to the 2026-09-20 decision and to the three artifacts
 * it names, and it renders them through `assembleParticipantPacket` -- the one
 * production assembly a participant's own download goes through -- rather than
 * through the renderer alone. The old proof is retired, not repaired; the
 * reconciliation ledger records that retirement.
 *
 * No packet, raster, legal approval, source inventory or hosted state is
 * rewritten here, and nothing below authorizes publication or delivery.
 *
 *   node scripts/verify-ms-paid-packet-proof.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { PDFDocument } from 'pdf-lib';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
import { MS_SUCCESSOR_REVIEW_OUTPUTS, msSuccessorReviewMatter } from './lib/ms-successor-review-matter.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { assembleParticipantPacket, participantGuideDate } = await import('../src/lib/rcap/render/participant-packet-assembly.ts');
const { specificationCaseIdentifierFactId } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { stableStringify } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { finalVerificationBoundInputsSha256 } = await import('../src/lib/rcap/fulfillment/final-verification-contract.ts');
const sha = value => createHash('sha256').update(value).digest('hex');
const inputs = {};
const read = file => { const bytes=fs.readFileSync(file); inputs[file]=sha(bytes); return bytes; };
const json = file => JSON.parse(read(file));
const approval = loadMsPaidConsumerSuccessor(); assert.ok(approval, 'exact owner approval refused');
assert.equal(approval.packetContentsChanged, true, 'this proof measures the changed packet set');
read(approval.decisionPath); read(approval.supersededDecisionPath);
const spec = json(approval.specificationPath);
assert.equal(spec.routeKey, approval.routeId); assert.equal(spec.trackId,'ms-nonconv'); assert.equal(spec.packetSetId,'ms-nonconv-set');
assert.equal(spec.legalSectionsBound,true);
assert.equal(spec.documents.some(d=>d.outputStrategy==='official_pdf_fill'||d.officialFormId||d.sourcePdfPath),false);
const guideBytes = read(approval.supplementalGuidePath);
assert.equal(sha(guideBytes), approval.supplementalGuideSha256);
const manifestPath='data/record-clearing/legal-design-packet-set-manifests.json';
const packetSet=json(manifestPath).packetSets.find(p=>p.packetSetId===spec.packetSetId);
assert.equal(packetSet.trackId,spec.trackId);
assert.equal(packetSet.components.some(d=>d.outputStrategy==='official_pdf_fill'||d.officialFormId),false);
const memoPath='data/record-clearing/legal-design-intake/MS.memo.json';
const track=json(memoPath).tracks.find(t=>t.trackId===spec.trackId);
assert.equal(track.outputStrategy,'custom_pleading');
for(const identity of spec.sourceIdentities.filter(i=>i.location)) read(identity.location);
const review=json(approval.reviewEvidencePath);
assert.equal(review.rasterReview.status,'passed');
assert.equal(review.commercialAuthority,false); assert.equal(review.productionAuthorized,false);
assert.equal(review.filingGateEnforced,true);
/* The superseded approval is read, kept and reported -- never re-asserted. Its
 * artifacts were approved under the pre-guide contents and do not reproduce. */
const superseded=json(approval.historicalApprovalPath);
read(approval.historicalRasterReviewPath);
assert.equal(superseded.participantDeliveryReview.state,'approved');
assert.equal(superseded.participantDeliveryReview.consumerPaidAuthorized,false);
assert.equal(superseded.participantDeliveryReview.productionAuthorized,false);
/* The §7 guide is an authority input now: it carries the participant's filing
 * instructions, and the specification retired its own page on that promise. A
 * source authority that did not name it would bind the wrong set of words. */
const sourceInputs={contract:'rcap-codified-authority-bound-inputs/v1',routeId:approval.routeId,familyId:spec.packetFamily,trackId:spec.trackId,packetSetId:spec.packetSetId,implementationStrategy:'custom_pleading',officialBinaryComponentsExpected:false,
  supplementalGuideSupersession:{supersededPacketComponentId:'ms-filing-and-next-steps',assemblyKind:approval.assemblyKind,assemblyVersion:approval.assemblyVersion,guideContentSha256:approval.supplementalGuideContentSha256},
  authorityInputs:[
    {role:'track_authority',path:memoPath,selector:{trackId:spec.trackId},sha256:sha(stableStringify(track))},
    {role:'packet_set_authority',path:manifestPath,selector:{packetSetId:spec.packetSetId},sha256:sha(stableStringify(packetSet))},
    {role:'packet_specification_authority',path:approval.specificationPath,sha256:inputs[approval.specificationPath]},
    {role:'supplemental_guide_authority',path:approval.supplementalGuidePath,sha256:approval.supplementalGuideSha256},
    {role:'approved_output_authority',path:approval.reviewEvidencePath,sha256:approval.reviewEvidenceSha256},
    {role:'paid_scope_authority',path:approval.decisionPath,sha256:approval.decisionSha256},
    {role:'superseded_output_authority',path:approval.historicalApprovalPath,sha256:approval.historicalApprovalSha256}
  ], officialRuleClaims:'The specification retains its asserted-by-ingestion administrative/notary references. This proves adopted custom-pleading authority, not possession of an official binary or a new legal review.'};
const sourceHash=sha(stableStringify(sourceInputs));

const fixture=json(approval.reviewFixturePath);
assert.equal(fixture.routeKey,approval.routeId); assert.equal(fixture.generationPurpose,'participant_delivery');
const caseIdentifierFactId=specificationCaseIdentifierFactId(spec);
const matterFor=(source,locale)=>msSuccessorReviewMatter({fixture:source,specification:spec,locale,participantGuideDate,caseIdentifierFactId});
const assembleFor=async(source,output)=>(await assembleParticipantPacket(composeParticipantDeliveryPacket(spec,source),{
  routeKey:approval.routeId,specification:spec,variant:output.variant,locale:output.locale,
  verifiedAt:source.verifiedAt,matter:matterFor(source,output.locale)})).bytes;

const results=[]; const unapproved=[]; const db=startEphemeralPg();
const roundTrip=value=>db.json(`select '${JSON.stringify(value).replaceAll("'","''")}'::jsonb`);
try {
  for(const output of MS_SUCCESSOR_REVIEW_OUTPUTS) {
    const entry=approval.approvedArtifacts.find(a=>a.id===output.id);
    assert.ok(entry,`the approval names no ${output.id} artifact`);
    assert.equal(entry.variant,output.variant); assert.equal(entry.locale,output.locale);
    const bytes=read(entry.path); assert.equal(sha(bytes),entry.sha256);
    const assembly=await assembleParticipantPacket(composeParticipantDeliveryPacket(spec,fixture),{
      routeKey:approval.routeId,specification:spec,variant:output.variant,locale:output.locale,
      verifiedAt:fixture.verifiedAt,matter:matterFor(fixture,output.locale)});
    assert.deepEqual(assembly.bytes,bytes,`current production assembly changed the approved ${output.id} bytes`);
    assert.equal(assembly.guideAssembled,entry.guideAssembled,`${output.id}: the guide was assembled against the approval`);
    assert.deepEqual(await assembleFor(roundTrip(fixture),output),bytes,`PostgreSQL facts change the approved ${output.id} packet`);
    const reviewed=review.artifacts.find(a=>a.id===output.id);
    const rastered=review.rasterReview.artifacts.find(a=>a.id===output.id);
    assert.equal(reviewed.sha256,entry.sha256); assert.equal(rastered.sourcePdfSha256,entry.sha256);
    const pages=fs.readdirSync(rastered.rasterDirectory).filter(f=>f.endsWith('.png')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    assert.equal(pages.length,entry.pageCount);
    assert.deepEqual(pages.map(p=>sha(read(path.join(rastered.rasterDirectory,p)))),rastered.pageSha256,`${output.id}: the reviewed images are not these images`);
    const pageCount=(await PDFDocument.load(bytes)).getPageCount(); assert.equal(pageCount,entry.pageCount);
    const bound={participantUserId:`synthetic:${output.id}`,matterId:`synthetic:${output.id}:matter`,routeId:approval.routeId,packetFamilyId:spec.packetFamily,factSnapshotSha256:sha(stableStringify(fixture.facts)),specificationSha256:inputs[approval.specificationPath],officialSourceSha256ById:{[`codified-authority:${spec.packetFamily}`]:sourceHash},artifactInputSha256:entry.sha256,verificationRevision:fixture.verificationHash};
    const hash=await finalVerificationBoundInputsSha256(bound);
    assert.equal(await finalVerificationBoundInputsSha256(roundTrip(bound)),hash);
    for(const key of Object.keys(bound)) {
      const changed=structuredClone(bound); changed[key]=typeof changed[key]==='object'?{changed:'wrong'}:`${changed[key]}:changed`;
      assert.notEqual(await finalVerificationBoundInputsSha256(changed),hash,`verification did not bind ${key}`);
    }
    results.push({id:output.id,variant:output.variant,locale:output.locale,guideAssembled:entry.guideAssembled,approved:true,artifactPath:entry.path,artifactSha256:entry.sha256,pageCount,documentCount:spec.documents.length,participantDelivery:true,currentAssemblyByteIdentical:true,postgresJsonbByteIdentical:true,rasterPagesMatchReview:true,verificationBoundInputs:bound,verificationBoundInputsSha256:hash,postgresVerificationHashIdentical:true,negativeBindingControls:Object.keys(bound).length});
  }
  /*
   * ONE CONTROL OVER FACTS NOBODY APPROVED.
   *
   * The superseded proof carried a second participant -- the boundary fixture --
   * whose approved bytes were the pre-guide ones. There are no approved boundary
   * bytes now, and manufacturing some without a review would be inventing an
   * approval. What can honestly be proved on that fixture is the property that
   * does not need one: a second participant's facts assemble deterministically
   * and survive a PostgreSQL round trip. That is recorded here, fenced, and it
   * approves nothing.
   */
  const boundaryPath='data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-b.fixture.json';
  const boundary=json(boundaryPath);
  assert.equal(boundary.generationPurpose,'participant_delivery');
  for(const output of MS_SUCCESSOR_REVIEW_OUTPUTS) {
    const first=await assembleFor(boundary,output);
    assert.deepEqual(await assembleFor(boundary,output),first,`${output.id}: a second participant's assembly is not deterministic`);
    assert.deepEqual(await assembleFor(roundTrip(boundary),output),first,`${output.id}: PostgreSQL facts change a second participant's packet`);
    unapproved.push({id:output.id,variant:output.variant,locale:output.locale,fixturePath:boundaryPath,
      approved:false,reviewed:false,participantDeliverable:false,
      deterministic:true,postgresJsonbByteIdentical:true,unapprovedRenderSha256:sha(first),
      why:'A determinism and durability control over a second participant\'s facts. These bytes carry no review and no approval, and nothing may read this entry as one.'});
  }
} finally {db.stop();}
assert.equal(results.length,3);
assert.equal(new Set(results.map(r=>r.locale)).size,2,'the approved set must prove both delivery languages');
assert.equal(results.filter(r=>r.guideAssembled).length,2);
assert.equal(results.find(r=>r.variant==='court_only').guideAssembled,false,'the court-facing subset carries no guide');
function bindTree(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name); if(entry.isDirectory())bindTree(file);else if(file.endsWith('.ts'))read(file);}}
bindTree('src/lib/rcap/grade-a');
bindTree('src/lib/rcap/supplemental');
for(const file of ['scripts/verify-ms-paid-packet-proof.mjs','scripts/lib/ms-paid-packet-proof.mjs','scripts/lib/ms-successor-review-matter.mjs','src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/render/personalized-packet.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/verification-cas.ts','src/lib/rcap/fulfillment/final-verification-contract.ts','src/lib/rcap/fulfillment/paid-consumer-successor.ts'])read(file);
const proof={schemaVersion:'rcap-ms-paid-packet-proof/v2',generatedBy:'scripts/verify-ms-paid-packet-proof.mjs',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),routeId:approval.routeId,trackId:spec.trackId,packetFamilyId:spec.packetFamily,ownerDecision:approval,
  assemblyIdentity:{assemblyKind:approval.assemblyKind,assemblyVersion:approval.assemblyVersion,supplementalGuidePath:approval.supplementalGuidePath,supplementalGuideSha256:approval.supplementalGuideSha256,supplementalGuideContentSha256:approval.supplementalGuideContentSha256,assembledThrough:'src/lib/rcap/render/participant-packet-assembly.ts'},
  supersededProof:{path:'data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json',decisionPath:approval.supersededDecisionPath,decisionSha256:approval.supersededDecisionSha256,artifactBytesStillReproduce:false,resolvedBy:'retirement_not_repinning'},
  sourceAuthority:{boundInputs:sourceInputs,boundInputsSha256:sourceHash},results,unapprovedDeterminismControls:unapproved,inputs,scope:'Local exact approved packet/assembly/source-authority verification only; no hosted acceptance, publication, participant delivery, new legal review or Production authority.'};
const out='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260920.json';
if(process.argv.includes('--write'))fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({routeId:proof.routeId,artifacts:results.map(r=>({id:r.id,variant:r.variant,locale:r.locale,pages:r.pageCount,sha256:r.artifactSha256,verificationHash:r.verificationBoundInputsSha256})),sourceAuthorityHash:sourceHash,postgresRoundTrip:'PASS',negativeBindingControls:results.reduce((t,r)=>t+r.negativeBindingControls,0),unapprovedDeterminismControls:unapproved.length,proofWritten:process.argv.includes('--write')},null,2));
