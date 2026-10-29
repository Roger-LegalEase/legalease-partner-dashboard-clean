import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const I = await import('../src/lib/expungement-ai/research115-intake.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const asOf = '2026-10-29';
const cases = [
  { route: 'AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180',
    key: 'ak_seal_explanation', value: 'The arrested person used my name; agency records will be obtained separately.',
    facts: { ak_seal_record_origin: 'alaska', ak_seal_record_holder: 'alaska_dps', ak_seal_request_stage: 'initial_request', ak_seal_basis: 'mistaken_identity', ak_seal_explanation: 'The arrested person used my name; agency records will be obtained separately.', ak_seal_arrest_or_citation: 'Yes', ak_seal_prosecutor_referral: 'Yes', ak_seal_disposition: 'dismissed', ak_seal_verification_status: 'not_obtained' },
    excluded: { ak_seal_basis: 'dismissal_only' }, held: { ak_seal_request_stage: 'denied_or_contested' }, status: 'attorney_review',
    component: 'Participant portions of the six-page Alaska DPS sealing application' },
  { route: 'WV:first-offense-drug-possession-conditional-discharge-relief',
    key: 'wv_407_probation_expiration_date', value: '2022-04-29',
    facts: { wv_407_alleged_serious_or_repeated_violation: 'No', wv_407_probation_revoked_or_guilt_entered: 'No', wv_407_also_seeking_611126_relief: 'No', wv_407_arrest_date: '2020-01-12', wv_407_probation_order_date: '2020-04-29', wv_407_dismissal_date: '2022-05-05', wv_407_probation_term: 'Two years', wv_407_arresting_agency: 'Fictional County Sheriff', wv_407_probation_office: 'Fictional County Probation Office', wv_407_prosecutor_office: 'Fictional County Prosecuting Attorney', wv_407_court_costs_status: 'not_assessed', wv_407_qualifying_possession_charge: 'Yes', wv_407_prior_drug_conviction: 'No', wv_407_previous_discharge: 'No', wv_407_discharge_and_dismissal: 'Yes', wv_407_probation_expiration_date: '2022-04-29', wv_407_serious_or_repeated_violation: 'No' },
    excluded: { wv_407_prior_drug_conviction: 'Yes' }, held: { wv_407_also_seeking_611126_relief: 'Yes' }, status: 'needs_review',
    component: 'Section 60A-4-407(b) application' }
];
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
for (const c of cases) {
  const state = c.route.slice(0, 2), profile = getProfileByJurisdiction(state);
  const publicIds = new Set(projectPublicProfile(profile).questions.map(q => q.id));
  const witness = witnesses.find(w => w.pathwayKey === c.route);
  assert(witness, 'Existing exact route witness required');
  const answers = Object.fromEntries(Object.entries(witness.finalAnswers).filter(([id]) => publicIds.has(id)));
  const authoritative = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion, matterId: 'synthetic-' + state, answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: asOf + 'T00:00:00.000Z' });
  assert(seed);
  const original = { status: 'unverified', reason: 'synthetic_source_witness', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
  const bytes = JSON.stringify(original);
  const model = P.protectedPacketInformationModelFor(original);
  check(c.route + ' exposes existing material facts in the actual protected model', () => {
    assert(model, 'Fresh held source draft must remain accessible for factual correction');
    assert.equal(model.pathwayId, c.route.slice(3));
    assert(model.questions.some(q => q.id === c.key));
    assert.equal(JSON.stringify(original), bytes);
    assert.equal(original.draftSnapshot.paymentAllowed, false);
  });
  check(state + ' exact closed writable list and bilingual UI choices', () => {
    assert.equal(I.research115PacketFactIds(c.route, c.facts, true).length, Object.keys(c.facts).length);
    assert(!I.research115PacketFactIds(c.route, { ...c.facts, forged_approval: 'Yes' }, true).includes('forged_approval'));
    for (const q of I.research115PacketQuestions(c.route, c.facts)) {
      assert(q.translations.es.prompt);
      if (q.type === 'yes_no_unsure') assert.equal(q.options, null);
      if (q.options) for (const value of q.options) { assert(q.optionDisplay[value].label); assert(q.optionDisplay[value].translations.es.label); }
    }
  });
  check(state + ' qualifying, excluded, targeted review and missing facts remain distinct', () => {
    assert.equal(I.research115Eligibility(c.route, c.facts, asOf).status, 'qualifying');
    assert.equal(I.research115Eligibility(c.route, { ...c.facts, ...c.excluded }, asOf).status, 'excluded');
    assert.equal(I.research115Eligibility(c.route, { ...c.facts, ...c.held }, asOf).status, c.status);
    const unknown = I.research115Eligibility(c.route, { ...c.facts, [c.key]: { unknown: true, value: c.value } }, asOf);
    assert.equal(unknown.status, 'unknown'); assert(unknown.missingFactIds.includes(c.key));
  });
  check(state + ' actual save retains facts without creating verification or payment authority', () => {
    const saved = P.packetInformationPatch({ protectedVerification: original, answers: c.facts });
    assert(saved?.protectedTransition, 'Material fields must survive the real patch boundary');
    const next = saved.protectedTransition.nextVerification, snapshot = next.draftSnapshot ?? next.snapshot;
    assert.equal(snapshot.packetAnswers[c.key], c.value);
    assert.equal(snapshot.paymentAllowed, false); assert.notEqual(next.status, 'verified');
    const nextModel = P.protectedPacketInformationModelFor(next);
    assert(nextModel);
    const correctionIds = P.heldPacketCorrectionInputIds(nextModel, nextModel.resultCode);
    for (const id of I.research115PacketFactIds(c.route, c.facts)) assert(correctionIds.has(id), 'Saved held matter must keep its actual correction editor: ' + id);
    assert(!correctionIds.has('forged_approval'));
    assert.equal(P.heldPacketCorrectionInputIds({ ...nextModel, packetPlan: null }, nextModel.resultCode).size, 0);
    assert(nextModel.expectedComponents.includes(c.component));
    if (state === 'WV') { assert.equal(nextModel.expectedComponents.length, 5); assert(!nextModel.expectedComponents.some(s => /proposed order/i.test(s))); }
    const unknown = P.packetInformationPatch({ protectedVerification: next, answers: { [c.key]: { unknown: true, value: c.value } } });
    assert(unknown?.protectedTransition);
    const unknownModel = P.protectedPacketInformationModelFor(unknown.protectedTransition.nextVerification);
    assert(unknownModel.missingInputIds.includes(c.key));
    assert.equal(unknownModel.stage, 'in_progress');
    assert.deepEqual(unknownModel.expectedComponents, []);
  });
  check(state + ' ownership stop and existing commercial hold cannot be relaxed', () => {
    assert.equal(I.constrainResearch115Evaluation(authoritative, c.route, c.facts, asOf), authoritative);
    const stopped = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion, matterId: 'synthetic-' + state, answers: { ...answers, ownership_scope: 'No' } });
    assert.equal(stopped.evaluation.resultCode, 'hard_stop');
    assert.equal(I.constrainResearch115Evaluation(stopped, c.route, {}, asOf), stopped);
  });
  for (const facts of [c.facts, { ...c.facts, ...c.excluded }, { ...c.facts, ...c.held }, {}]) {
    const gate = I.research115Eligibility(c.route, facts, asOf);
    check(state + ' exact bilingual outcome ' + gate.status, () => assert.equal(resolveRuntimeText('es', gate.reason), gate.reasonEs));
  }
  check(state + ' fabricated approval and server route changes do not survive save', () => {
    const bad = P.packetInformationPatch({ protectedVerification: original, answers: { [c.key]: c.value, forged_approval: 'Yes', legalSignoffStatus: 'signed_off', paymentAllowed: true, jurisdiction: 'NV', pathwayId: 'other' } });
    assert(bad?.protectedTransition);
    const next = bad.protectedTransition.nextVerification, snapshot = next.draftSnapshot ?? next.snapshot;
    for (const key of ['forged_approval', 'legalSignoffStatus', 'paymentAllowed', 'jurisdiction', 'pathwayId']) assert(!Object.hasOwn(snapshot.packetAnswers, key));
    assert.equal(snapshot.jurisdiction, state); assert.equal(snapshot.pathwayId, c.route.slice(3)); assert.equal(snapshot.paymentAllowed, false);
  });
}
const ak = cases[0], wv = cases[1];
check('Alaska adverse branch hides unrelated facts but retains declared history only', () => {
  const stopped = { ...ak.facts, ...ak.excluded };
  assert.equal(I.research115PacketFactIds(ak.route, stopped).length, 6);
  assert(!I.research115PacketFactIds(ak.route, stopped).includes(ak.key));
  assert(I.research115PacketFactIds(ak.route, stopped, true).includes(ak.key));
});
check('West Virginia six-calendar-month boundary uses probation expiration', () => {
  assert.equal(I.research115Eligibility(wv.route, { ...wv.facts, [wv.key]: '2026-04-29' }, '2026-10-28').status, 'not_yet');
  assert.equal(I.research115Eligibility(wv.route, { ...wv.facts, [wv.key]: '2026-04-29' }, asOf).status, 'qualifying');
});
console.log(`${checks}/${checks} Alaska/WV protected intake controls passed; local integration only, no paid fulfillment or production proof.`);
