import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { legalAidAcceptedPreview, assertLegalAidAcceptedPreview } from './rcap-legal-aid-preview.mjs';
import { HOSTED_VERCEL_PROJECT_ID } from './rcap-hosted-acceptance-vercel-identity.mjs';

const candidate = JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const preview = candidate.hostedAcceptance.preview;
const inputs = { applicationSha: candidate.applicationSha, projectRef: candidate.acceptanceProjectRef, deploymentId: preview.deploymentId, hostname: preview.hostname };
const binding = legalAidAcceptedPreview(candidate, inputs);
const deployment = { id: preview.deploymentId, projectId: HOSTED_VERCEL_PROJECT_ID, gitSource: { sha: candidate.applicationSha }, target: null, readyState: 'READY', meta: {
  rcapApplicationSha: binding.applicationSha, rcapAcceptanceProjectRef: binding.projectRef,
  rcapReturnOrigin: `https://${binding.hostname}`, rcapWorkerSourceSha: binding.workerSourceSha,
  rcapWorkerDigest: binding.workerDigest, rcapWorkerInputFingerprint: binding.workerInputFingerprint,
  rcapClinicDemoMode: 'none', rcapRouteState: 'staging_scoped',
} };

test('native accepted Preview has ordinary purpose; Legal Aid may reuse it without Clinic regeneration', () => {
  const receipt = JSON.parse(execFileSync('unzip', ['-p', 'hosted-acceptance-evidence/hosted_full-36571290588/11036080387.zip', 'preview-resolution.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(receipt.deploymentId, preview.deploymentId);
  assert.equal(receipt.applicationSha, binding.applicationSha);
  assert.equal(receipt.checks.find(row => row.label === 'deployment_carries_the_exact_clinic_mode').detail, 'none');
  assert.equal(assertLegalAidAcceptedPreview(binding, deployment), true);
});

for (const key of Object.keys(inputs)) test(`wrong caller ${key} refuses`, () => {
  assert.throws(() => legalAidAcceptedPreview(candidate, { ...inputs, [key]: 'wrong' }));
});
for (const key of ['applicationSha', 'acceptanceProjectRef', 'readyState', 'workerSourceSha', 'workerDigest', 'workerInputFingerprint']) test(`inconsistent bound Preview ${key} refuses`, () => {
  const changed = structuredClone(candidate); changed.hostedAcceptance.preview[key] = 'wrong';
  assert.throws(() => legalAidAcceptedPreview(changed, inputs));
});
for (const key of Object.keys(deployment.meta)) test(`wrong deployment ${key} refuses`, () => {
  const changed = structuredClone(deployment); changed.meta[key] = 'wrong';
  assert.throws(() => assertLegalAidAcceptedPreview(binding, changed));
});
for (const [key, value] of [['id','dpl_wrong'],['projectId','wrong'],['gitSource',{sha:'wrong'}],['target','production'],['readyState','BUILDING']]) test(`wrong deployment ${key} refuses`, () => {
  assert.throws(() => assertLegalAidAcceptedPreview(binding, { ...deployment, [key]: value }));
});
test('historical Mississippi deployment purpose and absent target refuse', () => {
  const changed = structuredClone(deployment); changed.meta.rcapPreviewPurpose = 'mississippi_clinic';
  assert.throws(() => assertLegalAidAcceptedPreview(binding, changed));
  delete changed.meta.rcapPreviewPurpose; delete changed.target;
  assert.throws(() => assertLegalAidAcceptedPreview(binding, changed));
});
