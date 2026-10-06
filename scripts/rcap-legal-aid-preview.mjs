import assert from 'node:assert/strict';
import { requireCurrentReleaseCandidate } from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import { HOSTED_VERCEL_PROJECT_ID } from './rcap-hosted-acceptance-vercel-identity.mjs';

// Legal Aid reuses the accepted ordinary Preview. It does not regenerate a
// Clinic packet or acquire the historical Mississippi-demo deployment purpose.
export function legalAidAcceptedPreview(candidate, inputs) {
  const preview = candidate.hostedAcceptance?.preview;
  assert.ok(preview, 'legal_aid_accepted_preview_missing');
  assert.equal(inputs.applicationSha, candidate.applicationSha);
  assert.equal(inputs.projectRef, candidate.acceptanceProjectRef);
  assert.equal(inputs.projectRef, 'hyflxnlhpmiqxvvcoiia');
  assert.equal(inputs.deploymentId, preview.deploymentId);
  assert.equal(inputs.hostname, preview.hostname);
  assert.equal(preview.applicationSha, candidate.applicationSha);
  assert.equal(preview.acceptanceProjectRef, inputs.projectRef);
  assert.equal(preview.readyState, 'READY');
  for (const key of ['workerSourceSha', 'workerDigest', 'workerInputFingerprint']) assert.equal(preview[key], candidate[key]);
  return { ...inputs, workerSourceSha: candidate.workerSourceSha, workerDigest: candidate.workerDigest, workerInputFingerprint: candidate.workerInputFingerprint };
}

export function requireLegalAidAcceptedPreview(inputs, rootDir = process.cwd()) {
  return legalAidAcceptedPreview(requireCurrentReleaseCandidate(rootDir), inputs);
}

export function assertLegalAidAcceptedPreview(binding, deployment) {
  assert.equal(deployment?.id ?? deployment?.uid, binding.deploymentId);
  assert.equal(deployment.projectId, HOSTED_VERCEL_PROJECT_ID);
  assert.equal(deployment.gitSource?.sha, binding.applicationSha);
  assert.equal(deployment.readyState ?? deployment.state, 'READY');
  assert.ok(Object.hasOwn(deployment, 'target') && [null, 'preview'].includes(deployment.target));
  const expected = {
    rcapApplicationSha: binding.applicationSha,
    rcapAcceptanceProjectRef: binding.projectRef,
    rcapReturnOrigin: `https://${binding.hostname}`,
    rcapWorkerSourceSha: binding.workerSourceSha,
    rcapWorkerDigest: binding.workerDigest,
    rcapWorkerInputFingerprint: binding.workerInputFingerprint,
    rcapClinicDemoMode: 'none',
    rcapRouteState: 'staging_scoped',
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(deployment.meta?.[key], value, `legal_aid_preview_mismatch:${key}`);
  assert.ok(deployment.meta.rcapPreviewPurpose === undefined || deployment.meta.rcapPreviewPurpose === '');
  return true;
}
