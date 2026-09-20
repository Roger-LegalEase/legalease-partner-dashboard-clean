#!/usr/bin/env node
// Independent declared-binding review. No participant fulfillment is exercised.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bindDeclaredKyDelivery, selectDeclaredKyFixture, KY_FAMILY, KY_ROUTE, KY_DIRECTORY} from '../../grade-a-packet-factory-24h/ky-declared-delivery.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const out = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-ky-declared-engineering.json';
const sourcePath = 'scripts/grade-a-packet-factory-24h/ky-declared-delivery.mjs';
const record = {family: KY_FAMILY, routeKeys: [KY_ROUTE], status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none',
  currentState: {generationAllowed: false, runtimeSelectable: false},
  binding: {routeKeys: [KY_ROUTE], paymentEligible: false, sponsorshipEligible: false}, proposedRepresentation: {}};
const family = {familyId: KY_FAMILY, directory: KY_DIRECTORY, routeKeys: [KY_ROUTE]};
const report = JSON.parse(read(KY_DIRECTORY + '/reports/rendered-artifacts.json'));
const facts = name => JSON.parse(read(KY_DIRECTORY + '/fixtures/' + name + '.facts.json'));
const checks = [];
function check(name, fn) {try {fn(); checks.push({name, passed: true});} catch(e) {checks.push({name, passed: false, error: e.message});}}
let bound;
check('Actual filesystem binding covers all thirteen outputs without mutating the declaration', () => {
  const before = JSON.stringify(record); bound = bindDeclaredKyDelivery(record, family);
  assert.equal(JSON.stringify(record), before);
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.length, 13);
  assert.equal(bound.binding.conditionalDelivery.outputInventory.pages, 90);
  assert.equal(bound.binding.conditionalDelivery.reviewInputBinding.filesMeasured, 51);
  assert.equal(bound.binding.acceptanceReceipt, null);
});
check('Each exact election selects its own complete reviewed bytes and remains synthetic', () => {
  for (const artifact of report.pdfs) {
    const selected = selectDeclaredKyFixture(bound, facts(artifact.fixture), artifact.fixture);
    assert.equal(selected.file, artifact.file); assert.equal(selected.sha256, hash(read(selected.file)));
    assert.equal(selected.grantsDeliveryAuthority, false); assert.equal(selected.grantsEligibility, false);
    assert.equal(selected.filingPermitted, false); assert.equal(selected.syntheticFixture, true);
    assert.equal(selected.runtimeInstalled, false);
  }
});
check('Declaration cannot promote current or proposed runtime generation', () => {
  assert.equal(bound.currentState.generationAllowed, false); assert.equal(bound.currentState.runtimeSelectable, false);
  assert.equal(bound.binding.paymentEligible, false); assert.equal(bound.binding.sponsorshipEligible, false);
  assert.equal(bound.proposedRepresentation.generationAllowed, false);
  assert.equal(bound.proposedRepresentation.runtimeSelectable, false);
  assert.equal(bound.proposedRepresentation.defaultComponentId, null);
});
check('A true synthetic flag does not permit another persons changed facts', () => {
  const input = facts('canonical'); input.participant.phoneLocal = 'different-synthetic-contact';
  assert.throws(() => selectDeclaredKyFixture(bound, input, 'canonical'), /FIXTURE_INPUT_MISMATCH/);
});
check('Additional claimant assertions cannot borrow a canned fixture', () => {
  const input = facts('canonical'); input.verificationApproved = true;
  assert.throws(() => selectDeclaredKyFixture(bound, input, 'canonical'), /FIXTURE_INPUT_MISMATCH/);
});
check('No prototype property is an approved fixture identity', () => {
  assert.throws(() => selectDeclaredKyFixture(bound, facts('canonical'), '__proto__'), /EXPLICIT_SUPPORTED_FIXTURE_REQUIRED/);
});
check('Changing declared source identity invalidates the prior binding at selection', () => {
  const stale = structuredClone(bound); stale.binding.conditionalDelivery.sourceBindings['AOC-497'].sha256 = '0'.repeat(64);
  assert.throws(() => selectDeclaredKyFixture(stale, facts('canonical'), 'canonical'), /Declared KY binding changed/);
});
check('Boundary phones and private identifiers remain manual obligations rather than completed facts', () => {
  const selected = selectDeclaredKyFixture(bound, facts('boundary'), 'boundary');
  assert.equal(selected.manualCompletions.filter(b => b.field === 'phone number').length, 2);
  assert.equal(selected.manualCompletions.filter(b => b.kind === 'private_identifier_manual_completion').length, 2);
  assert.equal(selected.manualCompletions.filter(b => b.kind === 'signature_or_date_participant_completion').length, 1);
  assert.equal(selected.officialActorObligations.length, 1);
  assert(!selected.writtenFields.some(w => w.documentId === 'AOC-497' && w.kind === 'explicit_selection'));
});
check('A foreign route cannot be added through only the family argument', () => {
  assert.throws(() => bindDeclaredKyDelivery(record, {...family, routeKeys: [...family.routeKeys, 'foreign-route']}));
});
check('An asserted installed state cannot reuse the declared-only selector', () => {
  const changed = structuredClone(bound); changed.status = 'INSTALLED';
  assert.throws(() => selectDeclaredKyFixture(changed, facts('canonical'), 'canonical'));
});
check('The complete retained PDFs are unchanged after every control', () => {
  for (const artifact of report.pdfs) assert.equal(hash(read(artifact.file)), artifact.sha256);
});
const result = {schemaVersion: 'rcap-independent-ky-declared-engineering/v1', reviewer: 'release_scope independent engineering sub-agent', recordedAt: new Date().toISOString(),
  verdict: checks.every(c => c.passed) ? 'PASS_BOUNDED_ENGINEERING_DELTA' : 'FAIL', checks, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
  sourcePath, sourceSha256: hash(read(sourcePath)), originalCandidateReviewCommit: 'c0df1418c07a636564412b113e80f6a7b213fff9',
  independentAssessment: 'Exact source/fact/report/output binding and explicit fixture election are enforced. Real participant values require a fresh authorized render; no synthetic marker, caller receipt or selected fixture creates that authority.',
  receiptBoundary: 'Optional raster input is identity/coverage checked only; caller provenance admission remains the existing acceptanceIdentity/L6 responsibility. This module grants no runtime or production authority.',
  retainedFilesMutated: false, freshPacketRenders: 0, freshPageReview: false, runtimeIntakeCounters: null, runtimeInstalled: false, productionTouched: false};
fs.writeFileSync(path.join(root, out), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({verdict: result.verdict, passed: result.passed, failed: result.failed, failures: checks.filter(c => !c.passed), report: out}));
if(result.failed)process.exitCode=1;
