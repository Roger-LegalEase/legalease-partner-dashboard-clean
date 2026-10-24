import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { VA_PARDON_FOLLOW_UP } = await import('../src/lib/expungement-ai/va-pardon-follow-up-copy.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetSpecificationFor, composablePacketSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const route = 'regime-1-expungement-available-now', fact = 'pardonType';
const profile = getProfileByJurisdiction('VA');
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses
  .find(row => row.jurisdiction === 'VA' && row.pathwayId === route);
assert(witness);
const answers = { ...witness.finalAnswers, case_outcome: 'Pardoned conviction', pardon_status: 'Yes' };
const make = (raw, input = answers) => {
  const authoritative = evaluate({ jurisdiction: 'VA', profileVersion: profile.profileVersion, matterId: 'synthetic-va-held-context', answers: input });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: input,
    packetAnswers: raw === undefined ? {} : { [fact]: raw }, dependencies: {}, capturedAt: '2026-10-17T00:00:00Z' });
  assert(seed);
  return { status: 'unverified', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
};
const checklist = {
  id: 'implementation-check-1',
  text: 'Obtain the actual absolute pardon and confirm that it concerns a crime the person did not commit.',
  requiredBeforeFiling: false
};
assert.deepEqual(packetSpecificationFor(`VA:${route}`).participantChecklist.find(row => row.id === checklist.id), checklist);
let checks = 0;
for (const [raw, state] of [['Yes', 'known_both'], ['No', 'known_not_both'], ['I am not sure', 'unknown'],
  [undefined, 'unknown'], [{ value: 'Yes', unknown: true }, 'unknown'], [{ value: 'No', unknown: false }, 'known_not_both']]) {
  const record = make(raw), before = structuredClone(record), model = P.protectedPacketInformationModelFor(record);
  assert(model);
  assert.equal(model.pathwayId, route);
  assert.deepEqual(model.vaPardonTypeHeldContext, {
    status: 'HELD_CONTEXT', reportedState: state, participantChecklistItem: checklist,
    // Entry85 adopted the scoped EN/ES guide and four checklist translations.
    languageHold: null, followUp: VA_PARDON_FOLLOW_UP
  });
  assert.equal(model.reviewSafety.safe, false);
  // The retained evaluator flag is true; the unbound specification still
  // refuses fulfillment. This context-only task must preserve both facts.
  assert.equal(record.draftSnapshot.paymentAllowed, true);
  assert.equal(composablePacketSpecificationFor(`VA:${route}`), undefined);
  assert.deepEqual(record, before);
  const noop = P.packetInformationPatch({ existingItem: { id: 'synthetic-va-held-context', jurisdiction: 'VA', artifactRefs: {} },
    protectedVerification: record, answers: {} });
  assert(noop);
  assert.equal(noop.readyToGenerate, false);
  assert.deepEqual(noop.protectedTransition.nextVerification, before);
  checks++;
}
const confirm = raw => {
  const record = make(raw);
  const patch = P.packetInformationPatch({ existingItem: { id: 'synthetic-va-held-context', jurisdiction: 'VA', artifactRefs: {} },
    protectedVerification: record, answers: {}, confirmRecordFacts: [fact] });
  assert(patch);
  assert.equal(patch.readyToGenerate, false);
  return P.protectedPacketInformationModelFor(patch.protectedTransition.nextVerification);
};
const yes = confirm('Yes'), no = confirm('No');
// Compare every model field after normalizing only the reported answer and its
// existing value-bound confirmation, never route/gate/safety/component fields.
function withoutReportedAnswer(model) {
  const copy = structuredClone(model);
  delete copy.vaPardonTypeHeldContext;
  for (const map of ['initialAnswers', 'packetAnswers']) copy[map][fact] = '<reported answer>';
  if (copy.recordFactConfirmations) delete copy.recordFactConfirmations[fact];
  for (const row of copy.verificationSummary) if (row.id === fact) row.value = '<reported answer>';
  for (const row of copy.verificationContext) if (row.key === 'capturedAt') row.value = '<save timestamp>';
  copy.capturedAt = '<save timestamp>';
  return copy;
}
assert.deepEqual(withoutReportedAnswer(yes), withoutReportedAnswer(no)); checks++;
for (const input of [witness.finalAnswers, { ...answers, pardon_status: 'No' }, { ...answers, case_outcome: 'Acquitted or found not guilty' }]) {
  const record = make('Yes', input), model = P.protectedPacketInformationModelFor(record);
  assert(model);
  assert.equal(model.vaPardonTypeHeldContext, undefined); checks++;
}
const changed = make('Yes'); changed.draftSnapshot.profileSourceFingerprint = 'changed';
changed.draftHash = P.protectedPacketDraftHash(changed.draftSnapshot);
assert.equal(P.protectedPacketInformationModelFor(changed), null); checks++;
console.log(JSON.stringify({ status: 'PASS', checks, assignment: 'VA-PARDON-TYPE-HELD-CONTEXT',
  scope: 'held model context only; CC-1474, eligibility and commercial authority unchanged' }));
