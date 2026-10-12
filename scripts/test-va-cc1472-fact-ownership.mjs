import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const spec = JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json'));
const expected = { date_of_birth: 5, full_name_at_time_of_arrest: 6, charges_to_be_expunged: 7, final_disposition_dates_and_courts: 8, mailing_address: 13, phone_number: 13 };
// Expectations transcribed from the official CC-1472 instructions, 11/15,
// pages 1 and 3. This checks semantic ownership, not unmeasured PDF placement.
for (const [id, element] of Object.entries(expected)) {
  const fact = spec.requiredFacts.find(f => f.factId === id);
  assert.ok(fact, id);
  assert.match(fact.use, new RegExp(`element ${element}\\b`));
  assert.ok(spec.officialForm.elementInventory.participantPrepared.some(e => e.element === element));
}
assert.ok(!spec.requiredFacts.some(f => f.factId === 'email_address'));
assert.ok(spec.fieldOwnership.participantOwnedFacts.includes('email_address'), 'legacy ownership retained');
for (const id of ['mailing_address', 'phone_number']) {
  const fact = spec.requiredFacts.find(f => f.factId === id);
  assert.match(fact.use, /actual signer/);
  assert.match(fact.use, /only when the participant is the signer/);
  assert.match(fact.use, /do not substitute a helper/);
}
assert.equal(spec.officialForm.officialFormId, 'CC-1472');
assert.equal(spec.branchModel.branchA.participantFilingRequired, false);
assert.equal(spec.legalSectionsBound, false);
assert.equal(spec.officialForm.overlayGeometry.status, 'NOT_MEASURED');
assert.deepEqual(spec.officialForm.elementInventory.clerkPrepared.map(e => e.element), [14, 15, 16]);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const { specificationSha256, ...body } = spec;
assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable(body))).digest('hex'), specificationSha256);
console.log(JSON.stringify({ status: 'PASS', mappedFacts: 6, unsupportedEmailRequirementRemoved: true, legacyEmailOwnershipPreserved: true, actualPdfPlacement: 'NOT_RUN: exact official CC-1472 binary unavailable; refusal retained' }));
