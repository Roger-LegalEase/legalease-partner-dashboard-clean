import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { selectDeclaredKyFixture } from '../../grade-a-packet-factory-24h/ky-declared-delivery.mjs';
import { fixtures } from '../chat5/ky-nonconviction.mjs';

const root = process.cwd();
const directory = 'data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill';
const recordPath = `${directory}/product-wiring.json`;
const recordBytes = fs.readFileSync(path.join(root, recordPath));
const record = JSON.parse(recordBytes);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inputs = fixtures();
const checks = [];
const test = (name, run) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
const clone = value => structuredClone(value);
const binding = record.binding.conditionalDelivery;
let pages = 0;
for (const fixture of binding.fixtureBindings) {
  test(`Installed record selects exact retained ${fixture.fixture} output`, () => {
    const selected = selectDeclaredKyFixture(record, inputs[fixture.fixture], fixture.fixture);
    const bytes = fs.readFileSync(path.join(root, selected.file));
    assert.equal(sha256(bytes), fixture.sha256);
    assert.equal(bytes.length, fixture.byteLength);
    assert.deepEqual(selected.components, fixture.components);
    assert.deepEqual(selected.componentPages, fixture.componentPages);
    assert.equal(selected.components.includes('AOC-497'), fixture.selection.includeProposedOrder);
    assert.equal(selected.components.includes('AOC-497.2'), true);
    assert.equal(selected.runtimeInstalled, false);
    assert.equal(selected.grantsDeliveryAuthority, false);
    assert.equal(selected.grantsEligibility, false);
    assert.equal(selected.filingPermitted, false);
    pages += selected.pageCount;
  });
}
test('Actual generated record remains declared-only with closed commercial flags', () => {
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.currentState.runtimeSelectable, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  assert.equal(record.binding.filingPermitted, false);
  assert.equal(binding.runtimeInstalled, false);
  assert.equal(binding.fixtureBindings.length, 13);
  assert.equal(pages, 90);
});
test('Another participant cannot reuse the installed canonical output', () => {
  const input = clone(inputs.canonical);
  input.participant = { ...input.participant, independentReviewChangedParticipant: 'synthetic-other-participant' };
  assert.throws(() => selectDeclaredKyFixture(record, input, 'canonical'));
});
test('An installed boundary election cannot borrow canonical facts', () => {
  assert.throws(() => selectDeclaredKyFixture(record, inputs.canonical, 'boundary'));
});
test('A source digest changed in the installed declaration is refused', () => {
  const altered = clone(record);
  altered.binding.conditionalDelivery.sourceBindings['AOC-497.2'].sha256 = '0'.repeat(64);
  assert.throws(() => selectDeclaredKyFixture(altered, inputs.canonical, 'canonical'));
});
test('An altered selected output digest is refused', () => {
  const altered = clone(record);
  altered.binding.conditionalDelivery.fixtureBindings[0].sha256 = '0'.repeat(64);
  assert.throws(() => selectDeclaredKyFixture(altered, inputs.canonical, 'canonical'));
});
test('An altered proposed-order role cannot replace the petition', () => {
  const altered = clone(record);
  altered.binding.conditionalDelivery.fixtureBindings[0].componentPages[0].documentId = 'AOC-497';
  assert.throws(() => selectDeclaredKyFixture(altered, inputs.canonical, 'canonical'));
});
test('Asserting installed status cannot promote the actual declaration', () => {
  const altered = clone(record);
  altered.status = 'INSTALLED';
  assert.throws(() => selectDeclaredKyFixture(altered, inputs.canonical, 'canonical'));
});
test('Filesystem identity mismatch is refused by the actual declaration', () => {
  assert.throws(() => selectDeclaredKyFixture(record, inputs.canonical, 'canonical', { hashFile: () => '0'.repeat(64) }));
});
test('No test mutated the retained generated declaration', () => {
  assert.equal(sha256(fs.readFileSync(path.join(root, recordPath))), sha256(recordBytes));
});
const failed = checks.filter(check => !check.passed).length;
const evidence = {
  schemaVersion: 'rcap-independent-ky-installed-declaration-review/v1',
  reviewer: 'release_scope independent engineering sub-agent',
  recordedAt: new Date().toISOString(),
  verdict: failed ? 'FAIL_REPAIR_REQUIRED' : 'PASS_BOUNDED_ENGINEERING_DELTA',
  candidatePublicationCommit: '32b4cd6639edb8fc43cb9e9b3afdb92371111a78',
  evidencePublicationCommit: null,
  record: { path: recordPath, sha256: sha256(recordBytes) },
  checks,
  passed: checks.length - failed,
  failed,
  measured: { completePdfsSelected: binding.fixtureBindings.length, completePages: pages },
  limitations: [
    'The actual generated filesystem record was exercised, not merely a synthetic declaration.',
    'Only exact synthetic fixture selection is installed here; no participant-personalized render or commercial authority is proven.',
    'No new raster, page review, artifact rendering, entitlement, production or live delivery was performed.'
  ],
  retainedFilesMutated: false,
  runtimeIntakeCounters: null,
  runtimeInstalled: false,
  productionTouched: false
};
const destination = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-ky-declared-installed.json';
fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ verdict: evidence.verdict, passed: evidence.passed, failed, evidence: destination }));
if (failed) process.exitCode = 1;
