#!/usr/bin/env node
/** Current-source technical proof for the exact approved MS packet set.
 * Reproduce the same owner-approved output bytes after the explicitly reviewed
 * question-contract transition. Preserve both historical proof generations,
 * fixtures and owner decisions. Synthetic charged-conduct/control additions
 * are declared separately and never represent protected participant approval.
 *
 * node scripts/verify-ms-paid-packet-proof.mjs [--output <external-file>|--write]
 * No hosted acceptance, publication, delivery or Production authority.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { PDFDocument } from 'pdf-lib';
import { MS_PAID_PACKET_PROOF, MS_PAID_PACKET_PROOF_PREDECESSOR, MS_PAID_PACKET_PROOF_20260920, MS_PAID_PACKET_PROOF_RETIRED, MS_PROOF_EXECUTION_INPUTS, loadMsPaidPacketProof } from './lib/ms-paid-packet-proof.mjs';
import { QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH, assertQuestionContractOutputInputs } from '../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
import { MS_SUCCESSOR_REVIEW_OUTPUTS, msSuccessorReviewMatter } from './lib/ms-successor-review-matter.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const { MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS } = await import('../src/lib/expungement-ai/packet-route-safety.ts');
const { mississippiNonConvictionPacketSafety } = await import('../src/lib/expungement-ai/packet-information.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { assembleParticipantPacket, participantGuideDate } = await import('../src/lib/rcap/render/participant-packet-assembly.ts');
const { specificationCaseIdentifierFactId } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { stableStringify } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { finalVerificationBoundInputsSha256 } = await import('../src/lib/rcap/fulfillment/final-verification-contract.ts');
const sha = value => createHash('sha256').update(value).digest('hex');
const inputs = {};
const read = file => { const bytes=fs.readFileSync(file); inputs[file]=sha(bytes); return bytes; };
const json = file => JSON.parse(read(file));
const outputFlag=process.argv.indexOf('--output');
const out=outputFlag>=0?path.resolve(process.argv[outputFlag+1]??''):MS_PAID_PACKET_PROOF;
if(outputFlag>=0)assert.ok(!out.startsWith(path.resolve('.')+path.sep),'preview output must be outside source tree');
if(process.argv.includes('--write')||outputFlag>=0)assert.ok(!fs.existsSync(out),'refusing to overwrite an existing proof');
const approval = loadMsPaidConsumerSuccessor(); assert.ok(approval, 'exact owner approval refused');
assert.equal(approval.packetContentsChanged, true, 'this proof measures the changed packet set');
read(approval.decisionPath); read(approval.supersededDecisionPath);
const outputContinuity=assertQuestionContractOutputInputs(read);
const successor=json(QUESTION_CONTRACT_SUCCESSOR_PATH);
const outputProof=json(QUESTION_CONTRACT_OUTPUT_PATH);
read(MS_QUESTION_CONTRACT_PREDECESSOR_PATH);
for(const entry of successor.preservedEvidence)read(entry.path);
for(const entry of outputProof.sources)read(entry.file);
const predecessorProofBytes=read(MS_PAID_PACKET_PROOF_PREDECESSOR);
read(MS_PAID_PACKET_PROOF_20260920); read(MS_PAID_PACKET_PROOF_RETIRED);
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
  questionContractSourceSuccessor:approval.questionContractSourceSuccessor,
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

const syntheticScenario={factId:'ms_charged_trafficking_distribution_manufacture',value:'No',inferredFromLegacyAnswer:false,meaning:'Explicit synthetic charged-conduct scenario. Historical dates/hash retained for PDF comparison only; no current protected participant verification asserted.'};
const withSyntheticScenario=source=>({...source,facts:{...source.facts,[syntheticScenario.factId]:syntheticScenario.value}});
const fixture=withSyntheticScenario(json(approval.reviewFixturePath));
assert.equal(fixture.routeKey,approval.routeId); assert.equal(fixture.generationPurpose,'participant_delivery');
const caseIdentifierFactId=specificationCaseIdentifierFactId(spec);
const matterFor=(source,locale)=>msSuccessorReviewMatter({fixture:source,specification:spec,locale,participantGuideDate,caseIdentifierFactId});
const assembleFor=async(source,output)=>(await assembleParticipantPacket(composeParticipantDeliveryPacket(spec,source),{
  routeKey:approval.routeId,specification:spec,variant:output.variant,locale:output.locale,
  verifiedAt:source.verifiedAt,matter:matterFor(source,output.locale)})).bytes;

const chargedConductSafetyControls=[];
const routeSafetyControlBase={...fixture,facts:{...fixture.facts,...Object.fromEntries(MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS)}};
const routeSafetySyntheticAdditions=Object.fromEntries(MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS.filter(([id])=>fixture.facts[id]===undefined));
for(const [id,value] of MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS)if(fixture.facts[id]!==undefined)assert.equal(fixture.facts[id],value,'existing synthetic fixture conflicts with neutral control');
assert.equal(mississippiNonConvictionPacketSafety(routeSafetyControlBase.facts,fixture.verifiedAt).safe,true,'separately declared synthetic positive route-safety control');
for(const [scenario,value] of [['yes','Yes'],['unknown',{unknown:true}],['absent',undefined],['legacy_only',undefined]]) {
  const negative=structuredClone(routeSafetyControlBase);
  delete negative.facts[syntheticScenario.factId];
  if(value!==undefined)negative.facts[syntheticScenario.factId]=value;
  if(scenario==='legacy_only')negative.facts.trafficking_status='No';
  const safety=mississippiNonConvictionPacketSafety(negative.facts,negative.verifiedAt);
  assert.equal(safety.safe,false,`${scenario} must be refused at the protected pre-readiness route safety gate`);
  assert.equal(safety.reason,'route_changing_answer:'+syntheticScenario.factId);
  chargedConductSafetyControls.push({scenario,refused:true,layer:'mississippiNonConvictionPacketSafety',reason:safety.reason});
}
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
  const boundary=withSyntheticScenario(json(boundaryPath));
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
for(const file of MS_PROOF_EXECUTION_INPUTS)read(file);
for(const file of ['scripts/verify-ms-paid-packet-proof.mjs','scripts/lib/ms-paid-packet-proof.mjs','scripts/lib/ms-successor-review-matter.mjs','src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/render/personalized-packet.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/verification-cas.ts','src/lib/rcap/fulfillment/final-verification-contract.ts','src/lib/rcap/fulfillment/paid-consumer-successor.ts','src/lib/rcap/fulfillment/question-contract-source-successor.mjs'])read(file);
const proof={schemaVersion:'rcap-ms-paid-packet-proof/v4',generatedBy:'scripts/verify-ms-paid-packet-proof.mjs',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),routeId:approval.routeId,trackId:spec.trackId,packetFamilyId:spec.packetFamily,ownerDecision:approval,
  assemblyIdentity:{assemblyKind:approval.assemblyKind,assemblyVersion:approval.assemblyVersion,supplementalGuidePath:approval.supplementalGuidePath,supplementalGuideSha256:approval.supplementalGuideSha256,supplementalGuideContentSha256:approval.supplementalGuideContentSha256,assembledThrough:'src/lib/rcap/render/participant-packet-assembly.ts'},
  supersededProof:{path:MS_PAID_PACKET_PROOF_PREDECESSOR,sha256:sha(predecessorProofBytes),artifactBytesStillReproduce:true,resolvedBy:'exact_current_output_continuity'},
  outputContinuity,
  questionContractSourceSuccessor:approval.questionContractSourceSuccessor,syntheticScenario,routeSafetySyntheticAdditions,chargedConductSafetyControls,currentProtectedJourneyEstablished:false,productionAuthorized:false,
  sourceAuthority:{boundInputs:sourceInputs,boundInputsSha256:sourceHash},results,unapprovedDeterminismControls:unapproved,inputs,scope:'Local exact approved packet/assembly/source-authority verification only; no hosted acceptance, publication, participant delivery, new legal review or Production authority.'};
const bytes=Buffer.from(JSON.stringify(proof,null,2)+'\n');
loadMsPaidPacketProof({readBytes:file=>file===MS_PAID_PACKET_PROOF?bytes:fs.readFileSync(file),stableStringify,approval});
if(process.argv.includes('--write')||outputFlag>=0)fs.writeFileSync(out,bytes,{flag:'wx'});
console.log(JSON.stringify({routeId:proof.routeId,artifacts:results.map(r=>({id:r.id,variant:r.variant,locale:r.locale,pages:r.pageCount,sha256:r.artifactSha256,verificationHash:r.verificationBoundInputsSha256})),sourceAuthorityHash:sourceHash,postgresRoundTrip:'PASS',negativeBindingControls:results.reduce((t,r)=>t+r.negativeBindingControls,0),unapprovedDeterminismControls:unapproved.length,chargedConductSafetyControls:chargedConductSafetyControls.length,proofWritten:process.argv.includes('--write')||outputFlag>=0,proofPath:out},null,2));
