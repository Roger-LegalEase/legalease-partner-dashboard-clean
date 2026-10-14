import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { assertQuestionContractOutputInputs, QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH } from '../../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';
/** Current source/output proof. Both older proof generations are immutable:
 * 20260920 retains its approved output bytes, while 20260914 remains retired
 * through that predecessor's original guide-supersession record. */
export const MS_PAID_PACKET_PROOF='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20261013.json';
export const MS_PAID_PACKET_PROOF_PREDECESSOR='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20261011.json';
export const MS_PAID_PACKET_PROOF_20260920='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260920.json';
export const MS_PAID_PACKET_PROOF_RETIRED='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json';
/** The approved artifacts, by the ids the owner decision names them under. */
export const MS_APPROVED_ARTIFACT_IDS=['full-en','full-es','court-only'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function loadMsPaidPacketProof({readBytes=file=>fs.readFileSync(file), stableStringify, approval}) {
  const bytes=readBytes(MS_PAID_PACKET_PROOF); const proof=JSON.parse(bytes);
  assert.equal(proof.schemaVersion,'rcap-ms-paid-packet-proof/v4');
  assert.deepEqual(proof.outputContinuity,assertQuestionContractOutputInputs(readBytes));
  assert.deepEqual(proof.questionContractSourceSuccessor, approval.questionContractSourceSuccessor);
  assert.equal(proof.currentProtectedJourneyEstablished, false);
  assert.equal(proof.productionAuthorized, false);
  assert.equal(proof.generatedBy,'scripts/verify-ms-paid-packet-proof.mjs');
  assert.equal(proof.routeId,approval.routeId); assert.equal(proof.trackId,approval.trackId); assert.equal(proof.packetFamilyId,approval.packetFamilyId);
  assert.equal(proof.ownerDecision.decisionSha256,approval.decisionSha256);
  assert.equal(proof.ownerDecision.packetContentsChanged,true,'the live proof must measure the changed packet set');
  // The assembly that produced the bytes is part of what the proof binds. A
  // proof that named another guide, or another assembler, would be measuring a
  // different packet than the one the owner approved.
  const assembly=proof.assemblyIdentity;
  assert.equal(assembly.assemblyKind,approval.assemblyKind); assert.equal(assembly.assemblyVersion,approval.assemblyVersion);
  assert.equal(assembly.supplementalGuideSha256,approval.supplementalGuideSha256);
  assert.equal(assembly.supplementalGuideContentSha256,approval.supplementalGuideContentSha256);
  assert.equal(assembly.assembledThrough,'src/lib/rcap/render/participant-packet-assembly.ts');
  // The executed current reproduction advances technical input freshness only.
  // All three immutable historical generations, output and approval semantics stay.
  const predecessorBytes=readBytes(MS_PAID_PACKET_PROOF_PREDECESSOR);
  assert.equal(hash(predecessorBytes),'887235f1a16fd593646421a1cf35a040effe3bd976fab2d4d90491a86dbfe5d6','October 11 historical proof changed');
  const predecessor=JSON.parse(predecessorBytes);
  assert.equal(predecessor.schemaVersion,'rcap-ms-paid-packet-proof/v3');
  assert.deepEqual(proof.supersededProof,{path:MS_PAID_PACKET_PROOF_PREDECESSOR,sha256:hash(predecessorBytes),artifactBytesStillReproduce:true,resolvedBy:'exact_current_output_continuity'});
  assert.equal(predecessor.supersededProof.path,MS_PAID_PACKET_PROOF_20260920);
  assert.equal(predecessor.supersededProof.artifactBytesStillReproduce,true);
  assert.equal(predecessor.supersededProof.resolvedBy,'exact_question_contract_source_successor');
  const septemberBytes=readBytes(MS_PAID_PACKET_PROOF_20260920);
  assert.equal(hash(septemberBytes),'fb27167b98f3d024b76daa4a9fea88a776177a26c949bb6728c3efc2667adef9','September 20 historical proof changed');
  assert.equal(predecessor.supersededProof.sha256,hash(septemberBytes));
  const september=JSON.parse(septemberBytes);
  assert.equal(september.schemaVersion,'rcap-ms-paid-packet-proof/v2');
  assert.equal(september.supersededProof.path,MS_PAID_PACKET_PROOF_RETIRED);
  assert.equal(september.supersededProof.decisionSha256,approval.supersededDecisionSha256);
  assert.equal(september.supersededProof.artifactBytesStillReproduce,false);
  assert.equal(hash(readBytes(MS_PAID_PACKET_PROOF_RETIRED)),'1a3454cb515003281c33f196b16c788fd3b9c5e18692829169794a5b686f183c','September 14 historical proof changed');
  assert.deepEqual(Object.keys(proof).sort(),[...Object.keys(predecessor),'outputContinuity'].sort(),'unlisted proof fields');
  for(const key of Object.keys(predecessor).filter(key=>!['schemaVersion','sourceSha','inputs','supersededProof'].includes(key)))
    assert.deepEqual(proof[key],predecessor[key],`historical packet meaning changed: ${key}`);
  assert.equal(proof.chargedConductSafetyControls.length,4);
  assert.deepEqual(proof.chargedConductSafetyControls.map(c=>c.scenario).sort(),['absent','legacy_only','unknown','yes']);
  assert.ok(proof.chargedConductSafetyControls.every(c=>c.refused===true
    && c.layer==='mississippiNonConvictionPacketSafety'
    && c.reason==='route_changing_answer:ms_charged_trafficking_distribution_manufacture'));
  assert.deepEqual(proof.routeSafetySyntheticAdditions,{prior_relief:'No',sentence_completion_date:'Yes',financial_obligations:'Yes'});
  assert.equal(proof.syntheticScenario.factId,'ms_charged_trafficking_distribution_manufacture');
  assert.equal(proof.syntheticScenario.value,'No');
  assert.equal(proof.syntheticScenario.inferredFromLegacyAnswer,false);
  for(const required of [proof.outputContinuity.path,proof.outputContinuity.continuity.path,MS_PAID_PACKET_PROOF_20260920,MS_PAID_PACKET_PROOF_RETIRED,QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH, MS_PAID_PACKET_PROOF_PREDECESSOR, proof.generatedBy,approval.decisionPath,approval.supersededDecisionPath,approval.specificationPath,approval.supplementalGuidePath,approval.reviewEvidencePath,approval.historicalApprovalPath,'src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/fulfillment/final-verification-contract.ts'])assert.ok(proof.inputs[required],`missing proof input ${required}`);
  for(const [file,expected] of Object.entries(proof.inputs))assert.equal(hash(readBytes(file)),expected,`stale MS packet proof: ${file}`);
  const source=proof.sourceAuthority;
  assert.deepEqual(source.boundInputs.questionContractSourceSuccessor, approval.questionContractSourceSuccessor);
  assert.equal(source.boundInputs.routeId,approval.routeId); assert.equal(source.boundInputs.familyId,approval.packetFamilyId);
  assert.equal(source.boundInputs.supplementalGuideSupersession.guideContentSha256,approval.supplementalGuideContentSha256);
  assert.equal(hash(stableStringify(source.boundInputs)),source.boundInputsSha256);
  assert.equal(proof.results.length,MS_APPROVED_ARTIFACT_IDS.length);
  assert.deepEqual(proof.results.map(r=>r.id),MS_APPROVED_ARTIFACT_IDS);
  for(const result of proof.results){
    const entry=approval.approvedArtifacts.find(a=>a.id===result.id);
    assert.ok(entry,`the approval names no ${result.id} artifact`);
    for(const key of ['approved','participantDelivery','currentAssemblyByteIdentical','postgresJsonbByteIdentical','postgresVerificationHashIdentical','rasterPagesMatchReview'])assert.equal(result[key],true,`${result.id}: ${key}`);
    assert.equal(result.negativeBindingControls,9);
    assert.equal(result.artifactPath,entry.path); assert.equal(result.artifactSha256,entry.sha256);
    assert.equal(result.pageCount,entry.pageCount); assert.equal(result.variant,entry.variant);
    assert.equal(result.locale,entry.locale); assert.equal(result.guideAssembled,entry.guideAssembled);
    assert.equal(hash(readBytes(result.artifactPath)),result.artifactSha256);
    const inputs=result.verificationBoundInputs;
    assert.equal(inputs.routeId,approval.routeId); assert.equal(inputs.packetFamilyId,approval.packetFamilyId);
    assert.equal(inputs.artifactInputSha256,result.artifactSha256); assert.equal(inputs.specificationSha256,approval.specificationSha256);
    assert.equal(hash(`rcap-final-verification-bound-inputs/v1\n${stableStringify(inputs)}`),result.verificationBoundInputsSha256);
  }
  // Both delivery languages, and a court-facing subset that carries no guide.
  assert.equal(new Set(proof.results.map(r=>r.locale)).size,2);
  assert.equal(proof.results.filter(r=>r.variant==='court_only'&&r.guideAssembled===false).length,1);
  // A determinism control is not an approval and may never present itself as one.
  assert.ok(Array.isArray(proof.unapprovedDeterminismControls));
  assert.deepEqual(proof.unapprovedDeterminismControls.map(c=>c.id),MS_APPROVED_ARTIFACT_IDS);
  for(const control of proof.unapprovedDeterminismControls){
    const output=proof.results.find(result=>result.id===control.id);
    assert.equal(control.variant,output.variant);assert.equal(control.locale,output.locale);
    assert.equal(control.fixturePath,'data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-b.fixture.json');
    assert.ok(proof.inputs[control.fixturePath],'boundary fixture must be source-bound');
    assert.equal(control.postgresJsonbByteIdentical,true);
    assert.match(control.unapprovedRenderSha256,/^[0-9a-f]{64}$/);
    for(const key of ['approved','reviewed','participantDeliverable'])assert.equal(control[key],false,`an unapproved control claims ${key}`);
    assert.equal(control.deterministic,true);
  }
  return {proof,sha256:hash(bytes)};
}
