import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const spec = JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json'));
const historical = spec.historicalSupersededSpecification.record;
let checks = 0;
const check = fn => { fn(); checks++; };
const expected = { date_of_birth: 5, full_name_at_time_of_arrest: 6, charges_to_be_expunged: 7, final_disposition_dates_and_courts: 8, mailing_address: 13, phone_number: 13 };
// Retained historical expectations from CC-1472 instructions, 11/15,
// pages 1 and 3. VA-01 does not establish that form as current authority.
function historicalOwnership(record) {
  for (const [id, element] of Object.entries(expected)) {
    const fact = record.requiredFacts.find(f => f.factId === id);
    assert.ok(fact, id);
    assert.match(fact.use, new RegExp(`element ${element}\\b`));
    assert.ok(record.officialForm.elementInventory.participantPrepared.some(e => e.element === element));
  }
  assert.ok(!record.requiredFacts.some(f => f.factId === 'email_address'));
  assert.ok(record.fieldOwnership.participantOwnedFacts.includes('email_address'), 'legacy ownership retained');
  for (const id of ['mailing_address', 'phone_number']) {
    const fact = record.requiredFacts.find(f => f.factId === id);
    assert.match(fact.use, /actual signer/);
    assert.match(fact.use, /only when the participant is the signer/);
    assert.match(fact.use, /do not substitute a helper/, 'historical contact cannot be silently reassigned to a helper');
  }
  assert.equal(record.officialForm.officialFormId, 'CC-1472');
  assert.equal(record.branchModel.branchA.participantFilingRequired, false);
  assert.equal(record.legalSectionsBound, false);
  assert.equal(record.officialForm.overlayGeometry.status, 'NOT_MEASURED');
  assert.deepEqual(record.officialForm.elementInventory.clerkPrepared.map(e => e.element), [14, 15, 16]);
}
function currentOwnership(record) {
  assert.equal(record.officialForm.officialFormId, null, 'CC-1472 is not established current authority');
  assert.equal(record.procedureAdoption.decisionId, 'VA-01');
  assert.equal(record.legalSectionsBound, false);
  assert.deepEqual(record.fieldOwnership.participantAtSigningFields, []);
  assert.deepEqual(record.fieldOwnership.participantAtServiceFields, [], 'no established participant service');
  assert.deepEqual(record.fieldOwnership.participantOwnedFacts, historical.fieldOwnership.participantOwnedFacts, 'legacy participant ownership must survive');
  for (const id of ['date_of_birth', 'mailing_address', 'phone_number', 'email_address']) {
    assert.ok(!record.requiredFacts.some(f => f.factId === id), 'no invented required contact for an unbound instrument');
  }
}
check(() => historicalOwnership(historical));
check(() => currentOwnership(spec));
for (const id of ['mailing_address', 'phone_number']) {
  const bad = structuredClone(historical);
  bad.requiredFacts.find(f => f.factId === id).use = 'element 13 actual signer only when the participant is the signer; substitute a helper';
  check(() => assert.throws(() => historicalOwnership(bad), /historical contact cannot be silently reassigned/));
}
const promoted = structuredClone(spec); promoted.officialForm.officialFormId = 'CC-1472';
check(() => assert.throws(() => currentOwnership(promoted), /not established current authority/));
const service = structuredClone(spec); service.fieldOwnership.participantAtServiceFields = historical.fieldOwnership.participantAtServiceFields;
check(() => assert.throws(() => currentOwnership(service), /no established participant service/));
const lostOwner = structuredClone(spec); lostOwner.fieldOwnership.participantOwnedFacts = [];
check(() => assert.throws(() => currentOwnership(lostOwner), /legacy participant ownership must survive/));
check(() => assert.deepEqual(spec.artifactBinding.fixtures, historical.artifactBinding.fixtures));
for (const fixture of spec.artifactBinding.fixtures) {
  const bytes = fs.readFileSync(fixture.file);
  check(() => assert.equal(bytes.length, fixture.byteLength));
  check(() => assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), fixture.sha256));
}
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const { specificationSha256, ...body } = spec;
check(() => assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable(body))).digest('hex'), specificationSha256));
console.log(JSON.stringify({ status: 'PASS', checks, historicalMappedFacts: 6, unsupportedEmailRequirementRemoved: true, legacyEmailOwnershipPreserved: true, currentAuthority: 'VA-01 modified procedure; actual receiving-court instrument unbound', actualPdfPlacement: 'NOT_RUN: historical geometry is NOT_MEASURED and current document acceptance remains NOT_VERIFIED' }));
