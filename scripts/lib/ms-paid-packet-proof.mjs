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
// Actual verifier and loader execution dependencies, in addition to observed
// output inputs and the immutable predecessor's complete inventory.
export const MS_PROOF_EXECUTION_INPUTS=['scripts/lib/rcap-ephemeral-pg.mjs','scripts/lib/ts-esm-loader.mjs',
  'scripts/lib/server-only-shim.mjs','scripts/lib/next-server-esm-bridge.mjs','package.json','package-lock.json'];
// Exact import paths observed by the actual verifier imports-only probe;
// the full execution must reproduce this set before emitting a current proof.
export const MS_PROOF_OBSERVED_INPUTS=[
  "data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/production-field-map.json",
  "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
  "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json",
  "data/rcap-ledger/packet-correction-required.json",
  "data/rcap-ledger/packet-fulfillment-records.json",
  "data/rcap-ledger/route-kind-adjudications.json",
  "data/rcap-ledger/route-presentation-conflicts.json",
  "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
  "data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json",
  "data/record-clearing/legal-decisions/route-ratification-registry.json",
  "data/record-clearing/legal-design-intake/AK.memo.json",
  "data/record-clearing/legal-design-intake/AL.memo.json",
  "data/record-clearing/legal-design-intake/AR.memo.json",
  "data/record-clearing/legal-design-intake/CA.memo.json",
  "data/record-clearing/legal-design-intake/MT.memo.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/packet-specifications/CT-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202.v1.json",
  "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json",
  "data/record-clearing/packet-specifications/DC-correct-misattributed-arrest.v1.json",
  "data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json",
  "data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json",
  "data/record-clearing/packet-specifications/IL-criminal-identity-theft-mistaken-identity-relief.v1.json",
  "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json",
  "data/record-clearing/packet-specifications/KS-municipal-arrest-record-expungement-under-12-4516a.v1.json",
  "data/record-clearing/packet-specifications/KS-municipal-conviction-or-diversion-expungement-under-12-4516.v1.json",
  "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
  "data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json",
  "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json",
  "data/record-clearing/packet-specifications/NV-probation-specialty-court-dismissal-set-aside-sealing.v1.json",
  "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json",
  "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json",
  "data/record-clearing/packet-specifications/SD-suspended-imposition-of-sentence-sealing.v1.json",
  "data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json",
  "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json",
  "data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-ak-guidance-implementation.json",
  "data/record-clearing/supplemental-guides/DC-actual-innocence-expungement.v1.json",
  "data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json",
  "data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json",
  "data/record-clearing/supplemental-guides/IL-criminal-identity-theft-mistaken-identity-relief.v1.json",
  "data/record-clearing/supplemental-guides/IL-felony-prostitution-relief.v1.json",
  "data/record-clearing/supplemental-guides/MS-additional-misdemeanor-relief.v1.json",
  "data/record-clearing/supplemental-guides/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json",
  "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/record-clearing/supplemental-guides/WY-felony-conviction-expungement.v1.json",
  "scripts/lib/il-prostitution-j-vacate-composition.mjs",
  "scripts/lib/ms-paid-packet-proof.mjs",
  "scripts/lib/ms-successor-review-matter.mjs",
  "scripts/lib/nd-first-offense-possession-composition.mjs",
  "scripts/lib/rcap-ephemeral-pg.mjs",
  "scripts/lib/server-only-shim.mjs",
  "scripts/rcap-custom-pleading/court-facing-rows.mjs",
  "src/components/expungement-ai/screening/answers.ts",
  "src/lib/expungement-ai/ak-courtview-contact.ts",
  "src/lib/expungement-ai/ak-courtview-record-context.ts",
  "src/lib/expungement-ai/ak-pardon-record-context.ts",
  "src/lib/expungement-ai/al-record-context.ts",
  "src/lib/expungement-ai/ar-felony-record-context.ts",
  "src/lib/expungement-ai/ar-nonconviction-record-context.ts",
  "src/lib/expungement-ai/authoritative-screening-result.ts",
  "src/lib/expungement-ai/ca-1203-4-record-context.ts",
  "src/lib/expungement-ai/ca-1203-4a-record-context.ts",
  "src/lib/expungement-ai/ca-prop64-caption-answer.ts",
  "src/lib/expungement-ai/ca-prop64-caption-facts.ts",
  "src/lib/expungement-ai/ca-prop64-caption-successor.ts",
  "src/lib/expungement-ai/ca-prop64-choices.ts",
  "src/lib/expungement-ai/ca-prop64-contact-answer.ts",
  "src/lib/expungement-ai/ca-prop64-contact-questions.ts",
  "src/lib/expungement-ai/ca-prop64-contact-successor.ts",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-preparation.ts",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-questions.ts",
  "src/lib/expungement-ai/ca-prop64-quantity.ts",
  "src/lib/expungement-ai/ca-prop64-record-answer.ts",
  "src/lib/expungement-ai/ca-prop64-record-facts.ts",
  "src/lib/expungement-ai/contact-representation.ts",
  "src/lib/expungement-ai/conviction-fallback-prior-contracts.json",
  "src/lib/expungement-ai/court-completion-fact-meaning.ts",
  "src/lib/expungement-ai/court-completion-reuse.ts",
  "src/lib/expungement-ai/ct-clean-slate-contact.ts",
  "src/lib/expungement-ai/delaware-protected-corrections.ts",
  "src/lib/expungement-ai/frontend/ca-prop64-reviewed-choices.json",
  "src/lib/expungement-ai/frontend/profiles/all51.json",
  "src/lib/expungement-ai/frontend/reviewed-assisted-contact-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-participant-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-question-spanish.json",
  "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-source-question-copy.json",
  "src/lib/expungement-ai/ga-pardon-caption.ts",
  "src/lib/expungement-ai/ga-pardon-category-context.ts",
  "src/lib/expungement-ai/ga-pardon-petition-readiness.ts",
  "src/lib/expungement-ai/ga-pardon-preparation.ts",
  "src/lib/expungement-ai/ks-municipal-contact.ts",
  "src/lib/expungement-ai/localization.ts",
  "src/lib/expungement-ai/mt-deferred-document-inputs.ts",
  "src/lib/expungement-ai/mt-deferred-document-questions.ts",
  "src/lib/expungement-ai/nd-first-offense-family-inputs.ts",
  "src/lib/expungement-ai/nd-first-offense-record-context.ts",
  "src/lib/expungement-ai/ny-16059-case-classification.ts",
  "src/lib/expungement-ai/ny-16059-case-questions.ts",
  "src/lib/expungement-ai/ny-16059-case-records.ts",
  "src/lib/expungement-ai/ny-16059-current-components.ts",
  "src/lib/expungement-ai/ny-16059-current-document-questions.ts",
  "src/lib/expungement-ai/ny-16059-document-preparation.ts",
  "src/lib/expungement-ai/ny-16059-filing-venue.ts",
  "src/lib/expungement-ai/ny-16059-future-applications.ts",
  "src/lib/expungement-ai/ny-16059-packet-facts.ts",
  "src/lib/expungement-ai/ny-16059-packet-successor.ts",
  "src/lib/expungement-ai/ny-16059-sealing-history.ts",
  "src/lib/expungement-ai/ny-16059-statutory-class.ts",
  "src/lib/expungement-ai/ny-16059-transaction-associations.ts",
  "src/lib/expungement-ai/ny-16059-transaction-facts.ts",
  "src/lib/expungement-ai/ny-custody-correction.ts",
  "src/lib/expungement-ai/oregon-disposition-contact-answer.ts",
  "src/lib/expungement-ai/oregon-disposition-contact.ts",
  "src/lib/expungement-ai/packet-collection-overrides.ts",
  "src/lib/expungement-ai/packet-collection.ts",
  "src/lib/expungement-ai/packet-contract-successors.ts",
  "src/lib/expungement-ai/packet-fulfillment-authority.ts",
  "src/lib/expungement-ai/packet-information.ts",
  "src/lib/expungement-ai/packet-route-safety.ts",
  "src/lib/expungement-ai/protected-legacy-answers.ts",
  "src/lib/expungement-ai/question-answer-state.ts",
  "src/lib/expungement-ai/record-fact-clarification.ts",
  "src/lib/expungement-ai/reviewed-contact-contracts.json",
  "src/lib/expungement-ai/reviewed-court-completion-contracts.json",
  "src/lib/expungement-ai/reviewed-packet-contract-successors.json",
  "src/lib/expungement-ai/reviewed-question-copy.ts",
  "src/lib/expungement-ai/reviewed-result-copy.ts",
  "src/lib/expungement-ai/sensitive-packet-facts.ts",
  "src/lib/expungement-ai/verification-cas.ts",
  "src/lib/legal-authority/authority.json",
  "src/lib/legal-authority/conditions.ts",
  "src/lib/legal-authority/index.ts",
  "src/lib/legal-authority/resolve-route.ts",
  "src/lib/legal-authority/routes/mississippi.json",
  "src/lib/legal-authority/routes/national-report-2026-08-28.json",
  "src/lib/legal-authority/routes/national-report-batch-b.json",
  "src/lib/legal-authority/routes/national-report-batch-c.json",
  "src/lib/legal-authority/routes/p0.json",
  "src/lib/legal-authority/routes/route-splits.json",
  "src/lib/legal-authority/routes/single-routes.json",
  "src/lib/legal-authority/types.ts",
  "src/lib/partners/onboarding/rcap-spanish-copy.ts",
  "src/lib/rcap-engine/answer-normalization.ts",
  "src/lib/rcap-engine/arkansas-record-origin.ts",
  "src/lib/rcap-engine/california-1203-4-facts.ts",
  "src/lib/rcap-engine/california-prop64-facts.ts",
  "src/lib/rcap-engine/component-deferral-clamp.ts",
  "src/lib/rcap-engine/composed-route-selector.ts",
  "src/lib/rcap-engine/conviction-relief-request.ts",
  "src/lib/rcap-engine/dc-innocence-location-context.ts",
  "src/lib/rcap-engine/delaware-conviction-questions.ts",
  "src/lib/rcap-engine/delaware-conviction-rules.ts",
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/expungement-ai-adapter.ts",
  "src/lib/rcap-engine/factual-pathway-exclusions.ts",
  "src/lib/rcap-engine/georgia-agency-county-context.ts",
  "src/lib/rcap-engine/georgia-first-offender.ts",
  "src/lib/rcap-engine/georgia-pardon-facts.ts",
  "src/lib/rcap-engine/illinois-cannabis-facts.ts",
  "src/lib/rcap-engine/kansas-district-facts.ts",
  "src/lib/rcap-engine/kansas-record-scope.ts",
  "src/lib/rcap-engine/louisiana-automation-status.ts",
  "src/lib/rcap-engine/maine-nonconviction-facts.ts",
  "src/lib/rcap-engine/mississippi-conditional-discharge.ts",
  "src/lib/rcap-engine/mississippi-exact-timing.ts",
  "src/lib/rcap-engine/mississippi-program-completion.ts",
  "src/lib/rcap-engine/missouri-closed-record-facts.ts",
  "src/lib/rcap-engine/missouri-marijuana-status-facts.ts",
  "src/lib/rcap-engine/montana-deferred-facts.ts",
  "src/lib/rcap-engine/nebraska-nonconviction-facts.ts",
  "src/lib/rcap-engine/nevada-176a-branch.ts",
  "src/lib/rcap-engine/new-york-16059-facts.ts",
  "src/lib/rcap-engine/new-york-16059-questions.ts",
  "src/lib/rcap-engine/north-dakota-first-offense-facts.ts",
  "src/lib/rcap-engine/oregon-disposition-identity.ts",
  "src/lib/rcap-engine/packet-planner.ts",
  "src/lib/rcap-engine/pathway-context.ts",
  "src/lib/rcap-engine/profile-registry.ts",
  "src/lib/rcap-engine/public-profile-projection.ts",
  "src/lib/rcap-engine/route-fact-relevance.ts",
  "src/lib/rcap-engine/screening-question-selection.ts",
  "src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts",
  "src/lib/rcap-engine/unavailable-packet-routes.ts",
  "src/lib/rcap/documents/guidance-packet-registry.ts",
  "src/lib/rcap/fulfillment/consumer-specification-binding.ts",
  "src/lib/rcap/fulfillment/final-verification-contract.ts",
  "src/lib/rcap/fulfillment/grade-a-admission.ts",
  "src/lib/rcap/fulfillment/grade-a-authority.ts",
  "src/lib/rcap/fulfillment/grade-a-packet-proof.ts",
  "src/lib/rcap/fulfillment/grade-a-registry.ts",
  "src/lib/rcap/fulfillment/grade-a-request-context.ts",
  "src/lib/rcap/fulfillment/paid-consumer-successor.ts",
  "src/lib/rcap/fulfillment/question-contract-source-successor.mjs",
  "src/lib/rcap/fulfillment/sponsored-channel-authority.ts",
  "src/lib/rcap/grade-a/composer.ts",
  "src/lib/rcap/grade-a/document-contract.ts",
  "src/lib/rcap/grade-a/families/il-prostitution-j-vacate-set.ts",
  "src/lib/rcap/grade-a/families/nd-first-offense-possession-set.ts",
  "src/lib/rcap/grade-a/packet-specification.ts",
  "src/lib/rcap/grade-a/participant-packet.ts",
  "src/lib/rcap/grade-a/renderer.ts",
  "src/lib/rcap/render/ga-pardon-facts.ts",
  "src/lib/rcap/render/participant-packet-assembly.ts",
  "src/lib/rcap/supplemental/guide-registry.ts",
  "src/lib/rcap/supplemental/guide-renderer.ts",
  "src/lib/server-runtime-environment.ts",
  "src/lib/supabase/server.ts"
];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function assertMsObservedExecution(proof) {
  assert.equal(proof.observedExecution?.kind,'actual_local_module_loads','missing observed execution inventory');
  assert.ok(Array.isArray(proof.observedExecution.modules),'missing observed modules');
  assert.deepEqual(proof.observedExecution.modules.map(entry=>entry.file).sort(),[...MS_PROOF_OBSERVED_INPUTS].sort(),'missing or unexecuted observed module');
  for(const entry of proof.observedExecution.modules){
    assert.deepEqual(Object.keys(entry).sort(),['file','sha256'],'unlisted observed module attributes');
    assert.match(entry.sha256,/^[a-f0-9]{64}$/,'invalid observed module hash');
    assert.equal(proof.inputs[entry.file],entry.sha256,'observed module hash mismatch');
  }
}
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
  assert.deepEqual(Object.keys(proof).sort(),[...Object.keys(predecessor),'outputContinuity','observedExecution'].sort(),'unlisted proof fields');
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
  for(const required of [proof.outputContinuity.path,proof.outputContinuity.continuity.path,proof.outputContinuity.previousContinuity.path,proof.outputContinuity.previousOutput.path,proof.outputContinuity.earlierContinuity.path,proof.outputContinuity.earlierOutput.path,proof.outputContinuity.sameDatePredecessorContinuity.path,proof.outputContinuity.sameDatePredecessorOutput.path,MS_PAID_PACKET_PROOF_20260920,MS_PAID_PACKET_PROOF_RETIRED,QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH, MS_PAID_PACKET_PROOF_PREDECESSOR, proof.generatedBy,approval.decisionPath,approval.supersededDecisionPath,approval.specificationPath,approval.supplementalGuidePath,approval.reviewEvidencePath,approval.historicalApprovalPath,'src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/fulfillment/final-verification-contract.ts'])assert.ok(proof.inputs[required],`missing proof input ${required}`);
  const outputBytes=readBytes(proof.outputContinuity.path);
  assert.equal(hash(outputBytes),proof.outputContinuity.sha256,'current output inventory proof changed');
  const currentOutput=JSON.parse(outputBytes);
  assertMsObservedExecution(proof);
  const requiredInventory=[...new Set([...Object.keys(predecessor.inputs),...currentOutput.sources.map(input=>input.file),
    proof.outputContinuity.path,proof.outputContinuity.continuity.path,proof.outputContinuity.previousContinuity.path,proof.outputContinuity.previousOutput.path,proof.outputContinuity.earlierContinuity.path,proof.outputContinuity.earlierOutput.path,proof.outputContinuity.sameDatePredecessorContinuity.path,proof.outputContinuity.sameDatePredecessorOutput.path,MS_PAID_PACKET_PROOF_PREDECESSOR,...MS_PROOF_EXECUTION_INPUTS,...MS_PROOF_OBSERVED_INPUTS])].sort();
  assert.deepEqual(Object.keys(proof.inputs).sort(),requiredInventory,'incomplete or undeclared MS proof input inventory');
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
