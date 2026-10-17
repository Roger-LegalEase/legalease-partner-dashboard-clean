import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { loadScRuntimeSuccessor, SC_RUNTIME_CONSUMERS, SC_RUNTIME_SUCCESSOR } from './sc-runtime-successor.mjs';
import { loadScReviewedGuidance } from './sc-reviewed-guidance.mjs';

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const json = x => Buffer.from(JSON.stringify(x));
const admissionPath = 'data/rcap-grade-a/legal-decisions/SC_SOLICITOR_GUIDANCE_ADMISSION_2026-09-14.json';
function fixture() {
  const files = new Map(), historical = new Map();
  const pin = (path, bytes) => { files.set(path, bytes); return {path, sha256: sha(bytes), byteLength: bytes.length}; };
  const baselineBindings = SC_RUNTIME_CONSUMERS.map((path, i) => {
    const ref = pin(path, Buffer.from(`old consumer ${i}`)); historical.set(path, files.get(path)); return ref;
  });
  const consumerBindings = SC_RUNTIME_CONSUMERS.map((path, i) => pin(path, Buffer.from(`reviewed current consumer ${i}`)));
  const rows = Array.from({length: 10}, (_, i) => ({trackId: `sc_${i}`, savedGuidanceExact: true,
    bothLocaleBundlesExact: true, renderSpecRefused: true, claimedWorkerRenderRefused: true,
    paymentPlaceholderDisabled: true, checkoutRefused: true, route: {sellable: false, creditConsumable: false, rendererKind: 'none'}}));
  const originalRuntimeBinding = pin('data/original-runtime.json', json({consumerBindings: baselineBindings, rows}));
  historical.set(originalRuntimeBinding.path, files.get(originalRuntimeBinding.path));
  const originalAdmission = pin(admissionPath, json({runtimeBindingEvidence: originalRuntimeBinding}));
  historical.set(admissionPath, files.get(admissionPath));
  const review = {schemaVersion: 'rcap-sc-guidance-runtime-successor-review/v1', familyId: 'rcap-sc-custom-pleading', status: 'PASS', verdict: 'PASS_COMPLETE_INDEPENDENT',
    acceptanceGranted: true, runtimeBehaviorUnchanged: true,
    baselineCommit: '20d26d6a3bd74521f7f400ca27d98f307fb8d7b6', authorSession: '/root', reviewerSession: '/root/independent-fixture',
    commercialRoutesOpened: 0, failures: [], baselineBindings, consumerBindings, reviewedFiles: consumerBindings, rows};
  review.preservedBindings = [originalAdmission, originalRuntimeBinding,
    ...Array.from({length: 4}, (_, i) => pin(`data/preserved-${i}.json`, json({preserved: true})))];
  review.results = ['exact-four-consumer-baseline', 'current'].map(mode => pin(`data/${mode}-result.json`, json({
    mode, status: 'PASS', failed: [], recordCount: 10, localeBundleCount: 20, commercialRoutesOpened: 0,
    consumerBindings: mode === 'current' ? consumerBindings : baselineBindings, rows,
  })));
  const manifest = {schemaVersion: 'rcap-sc-guidance-runtime-successor/v1', familyId: review.familyId,
    baselineCommit: review.baselineCommit, commercialRoutesOpened: 0, originalAdmission, originalRuntimeBinding};
  return {files, historical, manifest, review, pin};
}
let checks = 0;
function run(f) {
  f.manifest.independentReview = f.pin('data/independent-review.json', json(f.review));
  f.files.set(SC_RUNTIME_SUCCESSOR, json(f.manifest));
  return loadScRuntimeSuccessor('/fixture', {readBytes: p => {
    assert(f.files.has(p), `missing ${p}`); return f.files.get(p);
  }, readHistorical: (commit, p) => {
    assert.equal(commit, f.review.baselineCommit); assert(f.historical.has(p)); return f.historical.get(p);
  }});
}
const good = fixture(), accepted = run(good);
for (const ref of good.review.baselineBindings) {
  assert.deepEqual(accepted.historicalConsumer(ref), good.historical.get(ref.path)); checks++;
}
assert.equal(accepted.historicalConsumer({path: 'private/source.pdf'}), null); checks++;
assert.throws(() => accepted.historicalConsumer({...good.review.baselineBindings[0], sha256: '0'.repeat(64)})); checks++;
const mutations = [
  f => f.review.schemaVersion = 'wrong',
  f => f.review.acceptanceGranted = false,
  f => f.review.runtimeBehaviorUnchanged = false,
  f => f.review.results.pop(),
  f => f.files.set(f.review.results[0].path, Buffer.from('changed actual result')),
  f => f.review.preservedBindings.pop(),
  f => f.files.set(f.review.preservedBindings[5].path, Buffer.from('changed preserved guide')),
  f => f.review.reviewerSession = f.review.authorSession,
  f => f.review.status = 'FAIL',
  f => f.review.verdict = 'PENDING',
  f => f.review.failures.push('missed obligation'),
  f => f.manifest.commercialRoutesOpened = 1,
  f => f.review.commercialRoutesOpened = 1,
  f => f.manifest.baselineCommit = 'main',
  f => f.review.baselineBindings[0].sha256 = '0'.repeat(64),
  f => f.review.consumerBindings = f.review.consumerBindings.slice(1),
  f => f.review.consumerBindings = [...f.review.consumerBindings.slice(1), f.review.consumerBindings[1]],
  f => f.review.reviewedFiles = f.review.reviewedFiles.slice(1),
  f => f.review.reviewedFiles = [...f.review.reviewedFiles, f.review.reviewedFiles[0]],
  f => f.files.set(SC_RUNTIME_CONSUMERS[0], Buffer.from('unreviewed current consumer')),
  f => f.historical.set(SC_RUNTIME_CONSUMERS[0], Buffer.from('different historical consumer')),
  f => f.historical.set(admissionPath, Buffer.from('rewritten historical approval')),
  f => f.historical.set(f.manifest.originalRuntimeBinding.path, Buffer.from('rewritten old review')),
  f => f.review.rows.pop(),
  f => f.review.rows[0].trackId = f.review.rows[1].trackId,
  f => f.review.rows[0].route.sellable = true,
  f => f.review.rows[0].route.creditConsumable = true,
  f => f.review.rows[0].route.rendererKind = 'pdf',
  ...['savedGuidanceExact', 'bothLocaleBundlesExact', 'renderSpecRefused', 'claimedWorkerRenderRefused',
    'paymentPlaceholderDisabled', 'checkoutRefused'].map(key => f => { f.review.rows[0][key] = false; }),
  f => f.review.reviewedFiles = [...f.review.reviewedFiles, {path: '../escape', sha256: sha(Buffer.from('x')), byteLength: 1}],
];
for (const mutate of mutations) {
  const f = fixture(); mutate(f); assert.throws(() => run(f), `mutation ${checks}`); checks++;
}
if (process.argv.includes('--current')) {
  assert(loadScRuntimeSuccessor(process.cwd())); checks++;
  const owner = JSON.parse(fs.readFileSync('data/rcap-grade-a/legal-decisions/OWNER_DELIVERY_TYPE_DECISIONS.json'));
  const refusals = new Map(owner.decisions.filter(r => r.refused && r.familyId).map(r => [r.familyId, r]));
  const admitted = loadScReviewedGuidance(process.cwd(), refusals);
  assert.equal(admitted.terminalTreatment, 'GUIDANCE_READY'); checks++;
  assert.equal(admitted.runtimeExpression.paymentAuthority, 'closed'); checks++;
  assert.equal(admitted.routes.length, 10); checks++;
}
console.log(`SC runtime successor: ${checks} checks PASS; original and current pins, independent reviewer, all-ten scope and authority denials enforced.`);
