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
  if (candidate?.releaseBaseSha === PREACTIVATION_BASE || candidate?.status === PREACTIVATION_STATUS) {
    try { assertPreactivationAuthorization(candidate); }
    catch { throw new Error('production_phase_not_authorized_for_current_release'); }
  } else if (isPreflightOnlyRelease(candidate)) {
    try { assertPreflightOnlyAuthorization(candidate); }
    catch { throw new Error('production_phase_not_authorized_for_current_release'); }
  }
  if (phase === 'activate' && candidate?.productionAuthorization?.activation?.state === 'consumed_successfully') {
    throw new Error('production_activate_authorization_consumed');
  }
  if (phase === 'public_verify' && candidate?.productionAuthorization?.publicVerification?.state === 'consumed_successfully') {
    throw new Error('production_public_verify_authorization_consumed');
  }
  let publicVerificationAuthorized = false;
  if (phase === 'public_verify') {
    try { assertPreactivationAuthorization(candidate); assertPublicVerificationAuthorization(candidate); publicVerificationAuthorized = true; }
    catch { throw new Error('production_phase_not_authorized_for_current_release'); }
  }
  let activationAuthorized = false;
  if (phase === 'activate') {
    try { assertPreactivationAuthorization(candidate); assertActivationAuthorization(candidate); activationAuthorized = true; }
    catch { throw new Error('production_phase_not_authorized_for_current_release'); }
  }
  const authorization = candidate?.productionAuthorization;
  if (candidate?.productionAuthorized !== true || authorization?.authorized !== true
    || authorization?.productionProjectRef !== PRODUCTION_PROJECT_REF
    || !Array.isArray(authorization?.phases) || !(phase === 'activate' ? activationAuthorized : phase === 'public_verify' ? publicVerificationAuthorized : authorization.phases.includes(phase))
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

export const PREACTIVATION_BASE = 'c1c36946287f06a457701ed849f576b310a90f72';
export const PREACTIVATION_STATUS = 'HOSTED_ACCEPTED_PRODUCTION_PREACTIVATION_ONLY';
export const PREACTIVATION_PHASES = Object.freeze(['preflight','clinic_migrate','forward_chain_readback','forward_chain_migrate','legal_aid_keys_read','legal_aid_keys_create','legal_aid_readback','legal_aid_migrate','production_worker_deploy','smoke','restage']);
export const RESTAGE_AUTHORITY = Object.freeze({
  "authorizedBy": "Roger Roman",
  "note": "I authorize one replacement Production-target staged deployment of application e312a5efa7b4882e0fbf61a5ff0ae7891ac23226, using the already-created Production keys and unchanged accepted worker. Preserve rollback deployment dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK. Do not move public aliases, recreate keys, replay migrations, or redeploy the worker. Bind the exact replacement deployment into the existing release controls for Production smoke. Activation remains separately authorized.",
  "marker": "legal-aid-keys-20260930",
  "oldStagedDeploymentId": "dpl_4Kmyt51JN8P4D7iB1GC3VaZcN2hp",
  "rollbackDeploymentId": "dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK",
  "keyCreationReceipt": {
    "runId": "36647758735",
    "artifactId": "11069905932",
    "artifactZipSha256": "sha256:659d9f54f6d1baf11a5958d6ef3d29ede7d23ca61b0fcf5fed8abe7f873d06a0"
  },
  "legalAidMigrationReceipt": {
    "runId": "36733627937",
    "artifactId": "11106556356",
    "conclusion": "success"
  }
});
export const PREACTIVATION_NOTE = 'I authorize the current frozen Grade A release to proceed through the bounded pre-activation Production sequence only: Production readbacks, only the migrations or key creation proven necessary by those readbacks, deployment of the already-accepted immutable worker, and production_smoke. This does not authorize production_activate, public alias movement, public verification, save-transition live verification, zero-dollar live order, or any other live Production customer transaction. Bind preflight run 36600904357, preserve rollback deployment dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK, and use staged deployment dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc bound to successful restage run 36764240971 under the existing restage authority.';
export const PREACTIVATION_SCOPE = 'Hosted accepted; successful Production preflight bound. Only the bounded pre-activation sequence is authorized, subject to the existing independent readback-derived write controls. Activation, public verification, alias movement and live customer transactions remain held.';
export const BOUND_PREFLIGHT = Object.freeze({
 runId:36600904357, runAttempt:1, artifactId:11048744402,
 artifactSha256:'sha256:bcd5d9c3d0eecc8556ed0b54dc660eab94737b4f152c2994611c52d2b4d6bcff',
 toolsSha:PREACTIVATION_BASE, conclusion:'success',
 evidencePath:'hosted-acceptance-evidence/production-preflight-36600904357',
});
export const STAGED_DEPLOYMENT = 'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc';
export const BOUND_RESTAGE = Object.freeze({
  "runId": 36764240971,
  "runAttempt": 1,
  "conclusion": "success",
  "artifactId": 11119334551,
  "artifactName": "rcap-production-restage-36764240971",
  "artifactZipSha256": "sha256:4d2fa07b0386090b11a94fcf09dff4ccb5fb2bdd1449a1c09b16b49d25f3794d",
  "replacementStagedDeploymentId": "dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc",
  "rollbackDeploymentId": "dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK",
  "applicationSha": "e312a5efa7b4882e0fbf61a5ff0ae7891ac23226",
  "workerSourceSha": "5e04eafd7eaed7e71722862e651fb787ebbd296d",
  "workerDigest": "sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1",
  "toolsSha": "38051f337879cfecbcafb89c2f3816c2c4a6c456",
  "productionProjectRef": "wwtwtsmywnckfkdaqqeg",
  "evidencePath": "hosted-acceptance-evidence/production-restage-36764240971"
});
// Successful execution evidence only. This grants no additional owner phase.
export const BOUND_SMOKE = Object.freeze({
  "runId": 36779982696,
  "runAttempt": 1,
  "conclusion": "success",
  "artifactId": 11127253731,
  "artifactName": "rcap-production-smoke-36779982696",
  "artifactZipSha256": "sha256:c7a4cba1ff2369ea0f17c0b3183964ed02d3508083c62b758919682f96b52a87",
  "smokeArtifactSha256": "4e18b47b2c45f06a241d1565fb5b43a45354330184f0d7a9f2ac81ec10d34bf6",
  "toolsSha": "eb5099862b664d82449ee20e90798fe9fc275a26",
  "applicationSha": "e312a5efa7b4882e0fbf61a5ff0ae7891ac23226",
  "workerSourceSha": "5e04eafd7eaed7e71722862e651fb787ebbd296d",
  "workerDigest": "sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1",
  "productionProjectRef": "wwtwtsmywnckfkdaqqeg",
  "stagedDeploymentId": "dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc",
  "rollbackDeploymentId": "dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK",
  "evidencePath": "hosted-acceptance-evidence/production-smoke-36779982696"
});
export const ROLLBACK_DEPLOYMENT = 'dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK';
export function assertPreactivationAuthorization(candidate) {
 assert.equal(candidate.status,candidate.productionAuthorization?.publicVerification ? (candidate.productionAuthorization.publicVerification.state === 'consumed_successfully' ? PUBLIC_VERIFICATION_CLOSED_STATUS : PUBLIC_VERIFICATION_STATUS) : candidate.productionAuthorization?.activation ? (candidate.productionAuthorization.activation.state === 'consumed_successfully' ? ACTIVATION_CLOSED_STATUS : ACTIVATION_STATUS) : PREACTIVATION_STATUS,'bounded release status');
 assert.equal(candidate.hostedAcceptanceStatus,PREACTIVATION_STATUS,'matching status mirror');
 assert.equal(candidate.releaseBaseSha,PREACTIVATION_BASE,'approved preflight predecessor');
 assert.equal(candidate.productionAuthorized,true);
 for(const [key,value] of Object.entries(TUPLE)) assert.equal(candidate[key],value,`frozen ${key}`);
 assert.equal(candidate.productionProjectRef,PRODUCTION_PROJECT_REF);
 const a=candidate.productionAuthorization;
 if (Object.hasOwn(a, 'activation')) assertActivationAuthorization(candidate);
 if (Object.hasOwn(a, 'publicVerification')) assertPublicVerificationAuthorization(candidate);
 assert.ok(validAuthorizationTimestamp(a?.recordedAt),'actual UTC timestamp');
 assert.ok(Date.parse(a.recordedAt)<=Date.now(),'no future authorization');
 assert.ok(validAuthorizationTimestamp(a.restage?.recordedAt) && Date.parse(a.restage.recordedAt)<=Date.now() && Date.parse(a.restage.recordedAt)>=Date.parse('2026-09-30T00:00:00Z'),'actual restage owner timestamp');
 assert.deepEqual(a,{
  authorized:true,applicationSha:TUPLE.applicationSha,workerSourceSha:TUPLE.workerSourceSha,
  workerDigest:TUPLE.workerDigest,workerInputFingerprint:TUPLE.workerInputFingerprint,
  productionProjectRef:PRODUCTION_PROJECT_REF,recordedBy:PREFLIGHT_OWNER,recordedAt:a.recordedAt,
  phases:[...PREACTIVATION_PHASES],note:PREACTIVATION_NOTE,
  stagedDeploymentId:STAGED_DEPLOYMENT,rollbackDeploymentId:ROLLBACK_DEPLOYMENT,
  smokeRunId:BOUND_SMOKE.runId,smokeArtifactSha256:BOUND_SMOKE.smokeArtifactSha256,smokeReceipt:{...BOUND_SMOKE},
  ...(Object.hasOwn(a,'activation') ? {activation:a.activation} : {}),
  ...(Object.hasOwn(a,'publicVerification') ? {publicVerification:a.publicVerification} : {}),
  preflight:{...BOUND_PREFLIGHT},restage:{...RESTAGE_AUTHORITY,recordedAt:a.restage.recordedAt,successfulReceipt:{...BOUND_RESTAGE}},
 },'exact bounded owner authorization and native preflight identity');
 assert.deepEqual(candidate.hostedAcceptance?.preview,{...PREVIEW,...TUPLE,target:null},'accepted Preview control');
 for(const key of ['stagedDeploymentId','rollbackDeploymentId','smokeRunId','smokeArtifactSha256','smokeReceipt','activationReceipt'])
  assert.equal(Object.hasOwn(candidate,key),false,`no parallel or unexecuted ${key}`);
 return a;
}

// A dedicated one-attempt owner decision; the historical phase list is unchanged.
export const ACTIVATION_BASE = '61846b86c29a0b08fb49b815ce706958ecc62a3b';
export const ACTIVATION_STATUS = "HOSTED_ACCEPTED_PRODUCTION_ACTIVATION_AUTHORIZED";
export const ACTIVATION_SCOPE = "Successful preactivation evidence complete. Roger Roman authorizes exactly one production_activate for the bound existing staged deployment and automatic rollback only; activation has not executed. The historical preactivation phase list and note retain their scope. Public verification, save-transition live probes and live customer transactions remain unauthorized. No general deployment authority is granted.";
export const ACTIVATION_NOTE = "I authorize exactly one `production_activate` for the frozen LegalEase Grade A release: application `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`, worker source `5e04eafd7eaed7e71722862e651fb787ebbd296d`, worker digest `sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1`, staged deployment `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`, rollback deployment `dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK`, and successful smoke run `36779982696`. This authorization permits the Production promotion/public-domain movement required by `production_activate` and the existing automatic rollback control if post-promotion verification fails. It does not authorize a rebuild, new deployment, migration, key creation, worker redeployment, Stripe/live order, save-transition live probe, or any other live customer transaction. Stop after activation evidence is collected.";
export function assertActivationAuthorization(candidate) {
 const a = candidate?.productionAuthorization;
 const decision = a?.activation;
 assert.ok(decision && validAuthorizationTimestamp(decision.recordedAt), 'actual activation UTC timestamp');
 assert.ok(Date.parse(decision.recordedAt) >= Date.parse('2026-09-30T21:47:50.000Z') && Date.parse(decision.recordedAt) <= Date.now(), 'activation timestamp belongs after its exact predecessor');
 const consumed = decision.state === 'consumed_successfully';
 assert.equal(candidate.status, a.publicVerification ? (a.publicVerification.state === 'consumed_successfully' ? PUBLIC_VERIFICATION_CLOSED_STATUS : PUBLIC_VERIFICATION_STATUS) : consumed ? ACTIVATION_CLOSED_STATUS : ACTIVATION_STATUS, 'activation lifecycle status');
 assert.equal(candidate.scope, a.publicVerification ? (a.publicVerification.state === 'consumed_successfully' ? PUBLIC_VERIFICATION_CLOSED_SCOPE : PUBLIC_VERIFICATION_SCOPE) : consumed ? ACTIVATION_CLOSED_SCOPE : ACTIVATION_SCOPE, 'exact activation scope');
 assert.deepEqual(decision, {
  authorizedBy: 'Roger Roman', recordedAt: decision.recordedAt, note: ACTIVATION_NOTE,
  sourceBaseSha: ACTIVATION_BASE, operation: 'production_activate', maxAttempts: 1,
  state: consumed ? 'consumed_successfully' : 'authorized_not_executed',
  ...(consumed ? {executedAttempts: 1, activationReceipt: {...BOUND_ACTIVATION}} : {}),
  applicationSha: TUPLE.applicationSha, workerSourceSha: TUPLE.workerSourceSha,
  workerDigest: TUPLE.workerDigest, workerInputFingerprint: TUPLE.workerInputFingerprint,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  stagedDeploymentId: STAGED_DEPLOYMENT, rollbackDeploymentId: ROLLBACK_DEPLOYMENT,
  smokeRunId: BOUND_SMOKE.runId, smokeArtifactSha256: BOUND_SMOKE.smokeArtifactSha256,
  smokeReceipt: {...BOUND_SMOKE},
  permittedActions: ['promote_existing_staged_deployment', 'required_public_domain_movement', 'automatic_rollback_on_failed_post_promotion_verification'],
 }, 'exact one-time activation owner decision; no unrelated authority');
 assert.deepEqual(a.smokeReceipt, BOUND_SMOKE, 'exact successful smoke receipt');
 for (const record of [candidate, a, ...(consumed ? [] : [decision])]) assert.equal(Object.hasOwn(record, 'activationReceipt'), false, 'activation receipt only on the consumed decision');
 return decision;
}

// Successful execution closes the original decision; this is evidence, not a new owner decision.
export const ACTIVATION_CLOSURE_BASE = "47d2f0b87e6dcda358f8f24a8c0eca71bfd02b6a";
export const ACTIVATION_CLOSED_STATUS = "HOSTED_ACCEPTED_PRODUCTION_ACTIVATED_AUTHORIZATION_CONSUMED";
export const ACTIVATION_CLOSED_SCOPE = "Exact frozen Production release activated successfully in run 36791436905 attempt 1; native activation evidence bound and one-time production_activate authority consumed. Recorded rollback remains READY according to the activation receipt. Public verification has not run and is not separately authorized. Save-transition and live-order phases remain unauthorized. No next live phase or final Grade A closure is authorized or claimed.";
export const BOUND_ACTIVATION = Object.freeze({
  "runId": 36791436905,
  "runAttempt": 1,
  "conclusion": "success",
  "artifactId": 11132063144,
  "artifactName": "rcap-production-activate-36791436905",
  "artifactZipSha256": "sha256:facf4ac3497fe15263102f8f6f7a274b55091118e3eb702f1e3ea133dbca9140",
  "activationArtifactSha256": "1a3ca55cfda23eca9da0be0029f11a1259e98ddefce57c11cb7e3f7f1ce12780",
  "toolsSha": "47d2f0b87e6dcda358f8f24a8c0eca71bfd02b6a",
  "applicationSha": "e312a5efa7b4882e0fbf61a5ff0ae7891ac23226",
  "workerSourceSha": "5e04eafd7eaed7e71722862e651fb787ebbd296d",
  "workerDigest": "sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1",
  "productionProjectRef": "wwtwtsmywnckfkdaqqeg",
  "stagedDeploymentId": "dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc",
  "rollbackDeploymentId": "dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK",
  "smokeRunId": 36779982696,
  "smokeArtifactSha256": "4e18b47b2c45f06a241d1565fb5b43a45354330184f0d7a9f2ac81ec10d34bf6",
  "evidencePath": "hosted-acceptance-evidence/production-activate-36791436905"
});


// One owner decision for the existing public verifier, not general Production authority.
export const PUBLIC_VERIFICATION_BASE = '994606291c25a9dfcf4b8b5dc3a44b01f17e2ae8';
export const PUBLIC_VERIFICATION_STATUS = 'HOSTED_ACCEPTED_PRODUCTION_PUBLIC_VERIFICATION_AUTHORIZED';
export const PUBLIC_VERIFICATION_SCOPE = 'Production is live; successful activation evidence is bound and activation authority is consumed. Exactly one production_public_verify is owner-authorized and has not executed. Verification is read-only for release infrastructure and business/customer state; stateless screening progress/evaluate POSTs and ordinary anonymous analytics telemetry are permitted. No publicVerificationReceipt exists. Save-transition, live-order and all other customer transactions remain unauthorized. Final Grade A closure is not claimed.';
export const PUBLIC_VERIFICATION_ACTIONS = Object.freeze([
 'vercel_get_only_control_plane_readback', 'public_https_readback',
 'anonymous_public_screening_walk', 'stateless_screening_progress_requests',
 'stateless_screening_evaluation_request', 'ordinary_anonymous_analytics_telemetry',
 'public_verification_evidence_collection',
]);
export const PUBLIC_VERIFICATION_PROHIBITIONS = Object.freeze([
 'save_my_result', 'pending_screening_result_creation', 'pending_result_claim',
 'briefcase_matter_creation', 'account_creation', 'participant_customer_record_mutation',
 'packet_generation', 'worker_launch', 'checkout', 'stripe', 'charges', 'payment',
 'deployment_creation', 'promotion', 'rollback', 'alias_movement',
 'environment_variable_mutation', 'migration', 'key_creation',
 'privileged_production_database_mutation', 'save_transition_reproduce',
 'save_transition_verify', 'live_zero_dollar_order', 'other_live_customer_transaction',
]);
export function assertPublicVerificationAuthorization(candidate) {
 const a = candidate?.productionAuthorization;
 const decision = a?.publicVerification;
 assertActivationAuthorization(candidate);
 assert.equal(a.activation.state, 'consumed_successfully', 'successful activation already consumed');
 assert.deepEqual(a.activation.activationReceipt, BOUND_ACTIVATION, 'exact successful activation receipt');
 assert.ok(validAuthorizationTimestamp(decision?.recordedAt), 'actual public verification UTC timestamp');
 // Commit time of the exact immutable predecessor, also checked from Git by release binding.
 assert.ok(Date.parse(decision.recordedAt) >= Date.parse('2026-10-01T00:00:06.000Z') && Date.parse(decision.recordedAt) <= Date.now(), 'public verification timestamp belongs after exact predecessor');
 const consumed = decision.state === 'consumed_successfully';
 assert.equal(candidate.status, consumed ? PUBLIC_VERIFICATION_CLOSED_STATUS : PUBLIC_VERIFICATION_STATUS);
 assert.equal(candidate.scope, consumed ? PUBLIC_VERIFICATION_CLOSED_SCOPE : PUBLIC_VERIFICATION_SCOPE);
 assert.deepEqual(decision, {
  authorizedBy: 'Roger Roman', recordedAt: decision.recordedAt, note: 'I authorize it',
  sourceBaseSha: PUBLIC_VERIFICATION_BASE, operation: 'production_public_verify',
  maxAttempts: 1, state: consumed ? 'consumed_successfully' : 'authorized_not_executed',
  applicationSha: TUPLE.applicationSha, workerSourceSha: TUPLE.workerSourceSha,
  workerDigest: TUPLE.workerDigest, workerInputFingerprint: TUPLE.workerInputFingerprint,
  productionProjectRef: PRODUCTION_PROJECT_REF, activatedDeploymentId: STAGED_DEPLOYMENT,
  rollbackDeploymentId: ROLLBACK_DEPLOYMENT, activationRunId: BOUND_ACTIVATION.runId,
  activationArtifactSha256: BOUND_ACTIVATION.activationArtifactSha256, publicDomain: 'expungement.ai',
  permittedActions: [...PUBLIC_VERIFICATION_ACTIONS], prohibitedActions: [...PUBLIC_VERIFICATION_PROHIBITIONS],
  ...(consumed ? {executedAttempts: 1, publicVerificationReceipt: {...BOUND_PUBLIC_VERIFICATION}} : {}),
 }, 'exact one-time public verification decision and business-state restrictions');
 for (const record of [candidate, a, ...(consumed ? [] : [decision])]) assert.equal(Object.hasOwn(record, 'publicVerificationReceipt'), false, 'public verification receipt only on consumed decision');
 return decision;
}

// Successful public verification is evidence, never authority for a next live phase.
export const PUBLIC_VERIFICATION_CLOSURE_BASE = 'acd2757432e47c537a6f2c6ab4550f8cd4836f42';
export const PUBLIC_VERIFICATION_CLOSED_STATUS = 'HOSTED_ACCEPTED_PRODUCTION_PUBLIC_VERIFIED_AUTHORIZATION_CONSUMED';
export const PUBLIC_VERIFICATION_CLOSED_SCOPE = 'Production is live; activation passed and is closed. Public verification passed in run 36861106020 attempt 1; exact native evidence is bound and the one-time public-verification authority is consumed. Rollback remains READY according to that live verification. Ordinary anonymous analytics/funnel telemetry was authorized; no zero-telemetry-write claim is made. Live customer packet generation has not yet been independently proven on this activated Production tuple. No packet-canary authority exists. Save-transition, live-order, payment and other customer transactions remain unauthorized. Final end-to-end Grade A packet closure is not claimed.';
export const BOUND_PUBLIC_VERIFICATION = Object.freeze({
  "runId": 36861106020,
  "runAttempt": 1,
  "conclusion": "success",
  "artifactId": 11160824476,
  "artifactName": "rcap-production-public-verify-36861106020",
  "artifactZipSha256": "sha256:d3f772fd09a8f58b9d81d5dca5694faceae830e53b40926e8f4b2bf038156b3e",
  "publicVerificationArtifactSha256": "60635536a545c4bd14910f6f2af34d92d98801d594bafe151cdd9625350b9bd9",
  "toolsSha": "acd2757432e47c537a6f2c6ab4550f8cd4836f42",
  "applicationSha": "e312a5efa7b4882e0fbf61a5ff0ae7891ac23226",
  "workerSourceSha": "5e04eafd7eaed7e71722862e651fb787ebbd296d",
  "workerDigest": "sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1",
  "productionProjectRef": "wwtwtsmywnckfkdaqqeg",
  "activatedDeploymentId": "dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc",
  "rollbackDeploymentId": "dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK",
  "activationRunId": 36791436905,
  "publicDomain": "expungement.ai",
  "evidencePath": "hosted-acceptance-evidence/production-public-verify-36861106020"
});
