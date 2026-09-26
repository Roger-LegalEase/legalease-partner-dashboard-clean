import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { requireCurrentReleaseCandidate } from './grade-a-launch-control/verify-release-candidate-binding.mjs';

// Transport the existing grant, never manufacture a new sponsored permission.
export function clinicWorkerContext({ preview, participantUserId, partnerSlug, eventId, eventName }, authority) {
  const { candidate, binding, grant } = authority;
  assert.equal(preview.previewVerified, true);
  assert.equal(preview.stripeConfigured, false);
  assert.equal(preview.productionAliasCount, 0);
  assert.equal(grant.approved, true);
  for (const k of ['productionAuthorized','publicLaunchAuthorized','liveConsumerPaymentAuthorized','hostedFullAuthorized']) assert.equal(grant[k], false);
  for (const k of ['applicationSha','workerSourceSha','workerDigest']) assert.equal(preview[k], candidate[k]);
  const scope = binding.deploymentScope;
  assert.equal(scope.reuseOnly, true);
  assert.equal(scope.creationAuthorized, false);
  assert.equal(scope.productionPromotion, false);
  assert.equal(preview.deploymentId, scope.existingDeploymentId);
  assert.equal(preview.hostname, scope.existingHostname);
  assert.equal(preview.acceptanceProjectRef, 'hyflxnlhpmiqxvvcoiia');
  assert.equal(preview.acceptanceProjectRef, grant.acceptanceProjectRef);
  assert.equal(preview.clinicDemoMode, grant.channel);
  assert.equal(preview.clinicDemoMode, scope.clinicDemoMode);
  assert.equal(preview.routeState, grant.routeState);
  assert.equal(preview.routeState, scope.routeState);
  assert.equal(preview.routeState, 'staging_scoped');
  assert.equal(partnerSlug, grant.partnerSlug);
  assert.equal(eventId, grant.eventId);
  assert.equal(eventName, grant.eventName);
  assert.ok(grant.participantUserIds.includes(participantUserId));
  assert.equal(scope.stagingScope, grant.participantUserIds.join(','));
  const hash = createHash('sha256').update(scope.stagingScope).digest('hex');
  for (const value of [preview.stagingScopeSha256, scope.stagingScopeSha256, grant.participantScopeSha256]) assert.equal(hash, value);
  return Object.freeze({
    VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview',
    RCAP_SPONSORED_PREVIEW_CHANNEL: grant.channel,
    RCAP_CONSUMER_DELIVERY_ROUTE_STATE: grant.routeState,
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: scope.stagingScope
  });
}

export function currentClinicWorkerContext(input) {
  const candidate = requireCurrentReleaseCandidate();
  const binding = JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'));
  const grant = JSON.parse(fs.readFileSync('data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json'));
  return clinicWorkerContext(input, { candidate, binding, grant });
}

export function clinicWorkerDockerArgs(args, image, runtime) {
  const index = args.indexOf(image);
  assert.ok(index > 0 && index === args.lastIndexOf(image));
  assert.deepEqual(Object.keys(runtime).sort(), ['VERCEL_ENV','VERCEL_TARGET_ENV','RCAP_SPONSORED_PREVIEW_CHANNEL','RCAP_CONSUMER_DELIVERY_ROUTE_STATE','RCAP_CONSUMER_DELIVERY_STAGING_SCOPE'].sort());
  for (const key of Object.keys(runtime)) assert.ok(!args.some(arg => arg === key || arg.startsWith(`${key}=`)), `duplicate runtime input: ${key}`);
  return [...args.slice(0,index), ...Object.entries(runtime).flatMap(([key,value]) => ['-e',`${key}=${value}`]), ...args.slice(index)];
}
