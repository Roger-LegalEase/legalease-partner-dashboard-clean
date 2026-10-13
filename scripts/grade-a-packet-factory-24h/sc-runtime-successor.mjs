import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const SC_RUNTIME_SUCCESSOR = 'data/rcap-grade-a/legal-decisions/SC_GUIDANCE_RUNTIME_SUCCESSOR_2026-10-13.json';
export const SC_RUNTIME_CONSUMERS = [
  'src/lib/rcap/documents/guidance-packet-registry.ts',
  'src/lib/rcap/documents/packet-route-resolver.ts',
  'src/lib/rcap/render/job-contract.ts',
  'src/lib/expungement-ai/payment-adapter.ts',
];
const FAMILY = 'rcap-sc-custom-pleading';
const BASELINE = '20d26d6a3bd74521f7f400ca27d98f307fb8d7b6';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const safe = relative => assert(typeof relative === 'string' && !path.isAbsolute(relative)
  && !relative.includes('\\') && !relative.split('/').some(p => ['', '.', '..'].includes(p)), 'SC successor: unsafe path');
const identity = ref => ({ path: ref.path, sha256: ref.sha256, byteLength: ref.byteLength });

/** Existing SC guidance acceptance remains immutable. Only an independently
 * measured, exact four-consumer successor may carry its runtime proof forward.
 * Every other source, guide, review and owner-decision pin is still current-bound.
 */
export function loadScRuntimeSuccessor(root, overrides = {}) {
  const read = overrides.readBytes ?? (relative => fs.readFileSync(path.join(root, relative)));
  const historical = overrides.readHistorical ?? ((commit, relative) => execFileSync('git', ['show', `${commit}:${relative}`],
    { cwd: root, maxBuffer: 2 ** 24, stdio: ['ignore', 'pipe', 'ignore'] }));
  if (!overrides.readBytes && !fs.existsSync(path.join(root, SC_RUNTIME_SUCCESSOR))) return null;
  const exact = (ref, bytes) => {
    safe(ref.path); assert.match(ref.sha256, /^[a-f0-9]{64}$/);
    assert(Number.isSafeInteger(ref.byteLength) && ref.byteLength > 0);
    assert.equal(sha(bytes), ref.sha256, `SC successor: stale ${ref.path}`);
    assert.equal(bytes.length, ref.byteLength, `SC successor: length ${ref.path}`);
    return bytes;
  };
  const current = ref => { safe(ref.path); return exact(ref, read(ref.path)); };
  const manifest = JSON.parse(read(SC_RUNTIME_SUCCESSOR));
  assert.equal(manifest.schemaVersion, 'rcap-sc-guidance-runtime-successor/v1');
  assert.equal(manifest.familyId, FAMILY);
  assert.equal(manifest.baselineCommit, BASELINE);
  assert.equal(manifest.commercialRoutesOpened, 0);
  assert.equal(manifest.originalAdmission.path, 'data/rcap-grade-a/legal-decisions/SC_SOLICITOR_GUIDANCE_ADMISSION_2026-09-14.json');
  const admission = JSON.parse(current(manifest.originalAdmission));
  exact(manifest.originalAdmission, historical(BASELINE, manifest.originalAdmission.path));
  assert.deepEqual(manifest.originalRuntimeBinding, admission.runtimeBindingEvidence);
  const original = JSON.parse(current(manifest.originalRuntimeBinding));
  exact(manifest.originalRuntimeBinding, historical(BASELINE, manifest.originalRuntimeBinding.path));
  const review = JSON.parse(current(manifest.independentReview));
  assert.equal(review.schemaVersion, 'rcap-sc-guidance-runtime-successor-review/v1');
  assert.equal(review.familyId, FAMILY);
  assert.equal(review.status, 'PASS');
  assert.equal(review.verdict, 'PASS_COMPLETE_INDEPENDENT');
  assert.equal(review.acceptanceGranted, true);
  assert.equal(review.runtimeBehaviorUnchanged, true);
  assert.equal(review.baselineCommit, BASELINE);
  assert.equal(review.authorSession, '/root');
  assert(review.reviewerSession && review.reviewerSession !== review.authorSession);
  assert.equal(review.commercialRoutesOpened, 0);
  assert.deepEqual(review.failures, []);
  assert.deepEqual(review.baselineBindings, original.consumerBindings);
  assert.equal(review.results.length, 2);
  const results = review.results.map(ref => JSON.parse(current(ref)));
  assert.deepEqual(results.map(r => r.mode).sort(), ['current', 'exact-four-consumer-baseline']);
  for (const result of results) {
    assert.equal(result.status, 'PASS'); assert.deepEqual(result.failed, []);
    assert.equal(result.recordCount, 10); assert.equal(result.localeBundleCount, 20);
    assert.equal(result.commercialRoutesOpened, 0);
    assert.deepEqual(result.consumerBindings, result.mode === 'current' ? review.consumerBindings : original.consumerBindings);
  }
  assert.deepEqual(results.find(r => r.mode === 'current').rows, review.rows);
  assert(review.preservedBindings.length >= 6);
  review.preservedBindings.forEach(current);
  const pins = review.consumerBindings;
  assert.deepEqual(pins.map(r => r.path).sort(), [...SC_RUNTIME_CONSUMERS].sort());
  assert(Array.isArray(review.reviewedFiles) && review.reviewedFiles.length >= 4);
  assert.equal(new Set(review.reviewedFiles.map(r => r.path)).size, review.reviewedFiles.length);
  review.reviewedFiles.forEach(current);
  for (const pin of pins) {
    assert.deepEqual(identity(review.reviewedFiles.find(r => r.path === pin.path) ?? {}), identity(pin));
    current(pin);
  }
  assert.deepEqual(review.rows.map(r => r.trackId).sort(), original.rows.map(r => r.trackId).sort());
  assert.equal(review.rows.length, 10);
  for (const row of review.rows) {
    assert.deepEqual(row.route, original.rows.find(r => r.trackId === row.trackId).route);
    assert(row.savedGuidanceExact && row.bothLocaleBundlesExact && row.renderSpecRefused
      && row.claimedWorkerRenderRefused && row.paymentPlaceholderDisabled && row.checkoutRefused);
    assert.equal(row.route.sellable, false);
    assert.equal(row.route.creditConsumable, false);
    assert.equal(row.route.rendererKind, 'none');
  }
  const oldBytes = new Map();
  for (const ref of original.consumerBindings) {
    safe(ref.path); oldBytes.set(ref.path, exact(ref, historical(BASELINE, ref.path)));
  }
  return {
    reviewReference: manifest.independentReview,
    historicalConsumer(ref) {
      if (!SC_RUNTIME_CONSUMERS.includes(ref.path)) return null;
      assert.deepEqual(identity(ref), identity(original.consumerBindings.find(r => r.path === ref.path)), 'SC successor: unknown predecessor pin');
      return oldBytes.get(ref.path);
    },
  };
}
