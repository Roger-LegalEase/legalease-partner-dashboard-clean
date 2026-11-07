import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TARGET, requireImage, requirePoststate} from './place-baa3-worker.mjs';
import {nonsecretRollbackCapsule, validateQueueCapture} from '../qualified-worker-readonly-capture.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, code) => { if (!condition) throw Error(code); };
const SAME_INSTANCE = '01M6VGGKD7Q5TACPZN8W84F8KN';
export const BAA3_TRANSITION_REFS = Object.freeze({
  criterion: {path:'data/rcap-grade-a/launch-control/qualified-release-evidence/C-406283-406313-SAFE-WORKER-ACCEPTANCE.json',sha256:'01ed18aea807d2ef726676749958d129a795b575ad6a5e3fff65c97354299bee'},
  evidence: {path:'scripts/acceptance/evidence/baa3-transition-423955-423988.json',sha256:'4e0bb5d95c2822f42a8dd147ae8b82758c97241ef67ae8be0d8975a76b6ed178'},
  acceptance: {path:'data/rcap-grade-a/launch-control/qualified-release-evidence/C-423955-423988-BAA3-SAFE-WORKER-ACCEPTANCE.json',sha256:'069ae56e4826aaf0d32130f5bad93c4b5e0b43e65a8e347e1a0974e7a8e9b9f1'},
});
function read(root, ref) {
  const bytes = fs.readFileSync(path.join(root,ref.path));
  check(hash(bytes) === ref.sha256, 'accepted_baa3_evidence_changed');
  return JSON.parse(bytes);
}
function extracted(section, name) {
  const file = section.files[name];
  check(typeof file?.rawJson === 'string' && hash(file.rawJson) === file.sha256, 'actual_artifact_entry_changed');
  return JSON.parse(file.rawJson);
}
export function requireNoExposedWork(queue) {
  validateQueueCapture([queue]);
  for (const key of ['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'])
    check(queue[key] === 0, 'accepted_baa3_no_exposed_work_basis_not_met');
  assert.deepEqual(queue.status_counts, {}, 'accepted_baa3_queue_inventory_not_empty');
  assert.deepEqual(queue.exposed_work, [], 'accepted_baa3_exposure_not_empty');
}
function requireEffectiveWorker(proof) {
  check(proof?.schemaVersion === 'qualified-worker-effective-binding/v1' && proof.machineId === TARGET.machine && proof.projectRef === TARGET.project && proof.passed === true && proof.roleProven === true && [200,206].includes(proof.queueHeadStatus) && proof.secretValuesIncluded === false && proof.customerRowsRead === false, 'accepted_baa3_effective_binding_unproven');
}
export function nativeSnapshot(snapshot) {
  return {id:snapshot.machineId,state:snapshot.state,instance_id:snapshot.instanceId,image_ref:{digest:snapshot.imageDigest,labels:{'org.opencontainers.image.revision':snapshot.ociRevision}},config:snapshot.config};
}
// This validates the current worker independently of historical exit telemetry.
// The scoped acceptance below never applies to another version or exposed work.
export function requireAcceptedBaa3CurrentState(prior, before, after, readiness) {
  for (const machine of [before,after]) {
    check(machine?.id === TARGET.machine && machine.state === 'started' && machine.instance_id === SAME_INSTANCE && machine.instance_id !== prior.begin.beforeVersion, 'accepted_baa3_machine_version_changed');
    check(machine.image_ref?.digest === TARGET.digest && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source, 'accepted_baa3_image_changed');
    assert.deepEqual(machine.config, prior.config, 'accepted_baa3_unrelated_config_changed');
  }
  const capsule = nonsecretRollbackCapsule(before), finalCapsule = nonsecretRollbackCapsule(after);
  check(capsule.configSha256 === finalCapsule.configSha256 && readiness.rollback?.configSha256 === capsule.configSha256 && readiness.rollback.durableVerified === true, 'accepted_baa3_config_custody_unproven');
  check(readiness.status === 'READINESS_CAPTURED_REQUIRES_C_REVIEW' && readiness.machineUnchangedDuringCapture === true && Array.isArray(readiness.refusals) && readiness.refusals.length === 0, 'accepted_baa3_current_readiness_unproven');
  const identity = readiness.machine;
  check(identity?.id === TARGET.machine && identity.instanceId === SAME_INSTANCE && identity.state === 'started' && identity.imageDigest === TARGET.digest && identity.ociRevision === TARGET.source && identity.exportedDigest === TARGET.digest, 'accepted_baa3_readiness_identity_changed');
  check(readiness.workerMutated === false && readiness.productionDatabaseMutated === false && readiness.customerRowsRead === false && readiness.secretValuesIncluded === false, 'accepted_baa3_readback_effects_changed');
  requireEffectiveWorker(readiness.observations.effectiveWorker);
  check(Number.isSafeInteger(readiness.observations.effectiveWorker.workerPid) && readiness.observations.effectiveWorker.workerPid > 0, 'accepted_baa3_actual_process_missing');
  requireNoExposedWork(readiness.observations.queue);
  return {machineId:TARGET.machine,instanceId:SAME_INSTANCE,source:TARGET.source,imageDigest:TARGET.digest,configSha256:capsule.configSha256,effectiveProject:TARGET.project,capturedAt:readiness.capturedAt};
}

export function reviewRetainedBaa3Transition(root, prior) {
  const criterion = read(root,BAA3_TRANSITION_REFS.criterion), evidence = read(root,BAA3_TRANSITION_REFS.evidence);
  check(criterion.accepted === true && criterion.wholeMatchingWorkerTransitionAccepted === true && criterion.ownerOriginalRequirement.literalCleanExitCodesRequiredByOwner === false && criterion.priorDecisionsPreserved.soleCleanExitTelemetryHoldSupersededByOriginalCriterionEquivalentProof === true && criterion.additionalHistoricalForensicsRequired === false && criterion.oldVersionCaptureRequired === false, 'existing_safe_transition_criterion_unproven');
  check(evidence.schemaVersion === 'baa3-actual-transition-evidence/v1' && evidence.placement.runId === 42395572844 && evidence.readback.runId === 42398847137 && evidence.placement.workflowConclusion === 'failure' && evidence.readback.workflowConclusion === 'failure', 'actual_baa3_run_identity_mismatch');
  check(evidence.placement.artifactSha256 === 'a288281005595806ffa4f080ce6b1209dc491f31e28346f1c8ea959167db70a8' && evidence.readback.artifactSha256 === '6da123340994f9978ebc48424259207fbbffc645886011e4d3f56381a5854d97', 'actual_baa3_artifact_identity_mismatch');
  check(prior.begin.beforeVersion === '01M609ZC1E1YMKEP4RQXM6HRBK' && prior.input.files['baa3-worker-placement-evidence/rollback-config.nonsecret.private.json'].sha256 === criterion.actualEvidence.actualPostConfig.sha256, 'accepted_predecessor_rollback_not_preserved');
  for (const name of ['pre-queue.json','leased-queue.json']) requireNoExposedWork(extracted(evidence.placement,name));
  requireEffectiveWorker(extracted(evidence.placement,'pre-effective-binding.json'));
  const images = extracted(evidence.placement,'registry-images.json');
  for (const image of [images.source,images.mirror]) { requireImage(image); check(image.ManifestDigest === TARGET.digest, 'actual_registry_identity_mismatch'); }
  assert.deepEqual(images.source.RootFS, images.mirror.RootFS);
  const readiness = extracted(evidence.readback,'identity.json'), result = extracted(evidence.readback,'baa3-reconciliation-result.json');
  check(readiness.runId === 42398847137 && readiness.executionSha === evidence.readback.executionSha && readiness.app === TARGET.app && readiness.projectRef === TARGET.project, 'actual_readiness_run_mismatch');
  check(result.actualPlacementRunId === 42395572844 && result.originalUpdateAttempts === 1 && result.updateAttempts === 0 && result.workerMutated === false && result.runtimeQualified === false && result.handoffProven === false && result.hostedAccepted === false && result.refusalCode === 'placement_transition_history_ambiguous', 'original_failed_readback_rewritten');
  for (const [key,name] of Object.entries({currentBefore:'baa3-current-before.json',currentAfter:'baa3-current-after.json',nativeEvents:'baa3-native-events.json'})) check(result[key].sha256 === evidence.readback.files[name].sha256, 'actual_readback_reference_mismatch');
  check(readiness.rollback.sha256 === evidence.readback.files['rollback-config.nonsecret.private.json'].sha256, 'actual_current_rollback_reference_mismatch');
  const before = nativeSnapshot(extracted(evidence.readback,'baa3-current-before.json')), after = nativeSnapshot(extracted(evidence.readback,'baa3-current-after.json'));
  const machine = requireAcceptedBaa3CurrentState(prior,before,after,readiness);
  const native = extracted(evidence.readback,'baa3-native-events.json');
  assert.deepEqual(native.observedStepWindow,prior.input.window);
  check(native.actualPlacementRunId === 42395572844 && native.events.filter(e=>e.type==='start').length === 1 && native.events.every(e=>['launch','start'].includes(e.type) && Number.isSafeInteger(e.timestamp) && e.timestamp >= prior.from && e.timestamp <= prior.to), 'actual_start_history_mismatch');
  // Preserve and reproduce the diagnostic failure instead of manufacturing an exit.
  for (const current of [before,after]) assert.throws(()=>requirePoststate({...current,events:native.events},{instance_id:prior.begin.beforeVersion},{config:prior.config},TARGET.digest,prior.from),/^Error: native_clean_handoff_unproven$/);
  return {criterion:BAA3_TRANSITION_REFS.criterion,evidence:BAA3_TRANSITION_REFS.evidence,placementRunId:42395572844,readbackRunId:42398847137,placementArtifactSha256:evidence.placement.artifactSha256,readbackArtifactSha256:evidence.readback.artifactSha256,observedStepWindow:prior.input.window,currentCaptureAt:readiness.capturedAt,machine,safeMatchingWorkerTransitionAccepted:true,currentWorkerIdentityAndBindingAccepted:true,historicalCleanExitObserved:false,oldExitEventObserved:false,strictPostGuardPassed:false,originalWorkflowConclusions:['failure','failure'],hostedAccepted:false,postCaptureIsImmediate:false,continuousQueueObservationClaimed:false,loadedHandoffAccepted:false};
}

export function readAcceptedBaa3Transition(root, prior) {
  const assessment = reviewRetainedBaa3Transition(root,prior), acceptance = read(root,BAA3_TRANSITION_REFS.acceptance);
  check(acceptance.accepted === true && acceptance.authority === 'CHATGPT_INDEPENDENT_ENGINEERING_REVIEW' && acceptance.schemaVersion === 'qualified-production-safe-matching-worker-transition-original-scope-independent-acceptance/v1', 'scoped_baa3_acceptance_unproven');
  assert.deepEqual(acceptance.actualAssessment,assessment,'scoped_baa3_acceptance_does_not_match_actual_evidence');
  return {...assessment,acceptance:BAA3_TRANSITION_REFS.acceptance,acceptedAt:acceptance.at};
}
