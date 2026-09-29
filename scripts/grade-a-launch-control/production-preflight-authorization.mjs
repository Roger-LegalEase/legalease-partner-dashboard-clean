import assert from 'node:assert/strict';
import {TUPLE, PREVIEW} from './verify-hosted-acceptance-evidence.mjs';

// A single successor in the existing release chain. This policy constrains the
// owner record; it is not another authorization ledger or an execution receipt.
export const PRODUCTION_PROJECT_REF = 'wwtwtsmywnckfkdaqqeg';
export const PREFLIGHT_BASE = 'e594e8a1a99bb0c996ef3438b407da7194adb2dc';
export const PREFLIGHT_STATUS = 'HOSTED_ACCEPTED_PRODUCTION_PREFLIGHT_ONLY';
export const PREFLIGHT_OWNER = 'Roger Roman';
export const PREFLIGHT_NOTE = 'I authorize the current frozen Grade A release tuple to proceed to production_preflight only. This authorization does not authorize Production activation, public alias movement, Production database migrations, Production worker deployment, Stripe live orders, or any other Production phase. Preserve the existing rollback target and stop after preflight evidence is collected and independently reviewed.';
export const PREFLIGHT_SCOPE = 'Hosted accepted; only production_preflight authorized for the exact frozen tuple. All later Production phases remain held. No preflight execution or Production receipt is claimed.';
export function validAuthorizationTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function isPreflightOnlyRelease(candidate) {
  return candidate?.releaseBaseSha === PREFLIGHT_BASE || candidate?.status === PREFLIGHT_STATUS
    || candidate?.applicationSha === TUPLE.applicationSha;
}
export function assertPreflightOnlyAuthorization(candidate) {
  assert.equal(candidate.status, PREFLIGHT_STATUS, 'preflight-only status');
  assert.equal(candidate.hostedAcceptanceStatus, PREFLIGHT_STATUS, 'matching release status mirror');
  assert.equal(candidate.releaseBaseSha, PREFLIGHT_BASE, 'preflight-only predecessor');
  assert.equal(candidate.productionAuthorized, true, 'preflight authorization flag');
  for (const [key, value] of Object.entries(TUPLE)) assert.equal(candidate[key], value, `frozen ${key}`);
  assert.equal(candidate.productionProjectRef, PRODUCTION_PROJECT_REF, 'canonical Production project');
  const a = candidate.productionAuthorization;
  assert.ok(validAuthorizationTimestamp(a?.recordedAt), 'actual UTC authorization timestamp');
  assert.deepEqual(a, {
    authorized: true,
    applicationSha: TUPLE.applicationSha,
    workerSourceSha: TUPLE.workerSourceSha,
    workerDigest: TUPLE.workerDigest,
    workerInputFingerprint: TUPLE.workerInputFingerprint,
    productionProjectRef: candidate.productionProjectRef,
    recordedBy: PREFLIGHT_OWNER,
    recordedAt: a.recordedAt,
    phases: ['preflight'],
    note: PREFLIGHT_NOTE,
  }, 'exact owner preflight-only authorization; no later permission or invented receipts');
  const preview = candidate.hostedAcceptance?.preview;
  assert.deepEqual(preview, {...PREVIEW, ...TUPLE, target: null}, 'exact accepted Preview negative control');
  for (const key of ['stagedDeploymentId', 'rollbackDeploymentId', 'smokeRunId', 'smokeArtifactSha256', 'smokeReceipt', 'activationReceipt']) {
    assert.equal(Object.hasOwn(candidate, key), false, `no unexecuted ${key}`);
  }
  return a;
}

// Shared by the existing Production contract and dependency-free early entrypoint gates.
export function requireProductionPhaseAuthorization(candidate, phase) {
  if (isPreflightOnlyRelease(candidate)) {
    try { assertPreflightOnlyAuthorization(candidate); }
    catch { throw new Error('production_phase_not_authorized_for_current_release'); }
  }
  const authorization = candidate?.productionAuthorization;
  if (candidate?.productionAuthorized !== true || authorization?.authorized !== true
    || authorization?.productionProjectRef !== PRODUCTION_PROJECT_REF
    || !Array.isArray(authorization?.phases) || !authorization.phases.includes(phase)
    || candidate?.productionProjectRef !== PRODUCTION_PROJECT_REF
    || typeof authorization?.recordedBy !== 'string' || !authorization.recordedBy.trim()
    || !validAuthorizationTimestamp(authorization?.recordedAt)) {
    throw new Error('production_phase_not_authorized_for_current_release');
  }
  for (const key of ['applicationSha', 'workerSourceSha', 'workerDigest', 'workerInputFingerprint']) {
    if (!candidate?.[key] || authorization[key] !== candidate[key]) {
      throw new Error(`production_authorization_tuple_mismatch:${key}`);
    }
  }
  return authorization;
}
