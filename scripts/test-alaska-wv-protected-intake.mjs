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
  { route: 'MD:cannabis-specific-expungement', declared: 214,
    key: 'md_cannabis_record_reference', value: 'Frozen fictional docket record; no clerk contact or attached records asserted.',
    prepare: { md_cannabis_basis: 'possession', md_cannabis_only_charge: 'Yes', md_cannabis_fee_choice: 'paid' },
    facts: { md_cannabis_basis: 'possession', md_cannabis_charge_id: '1', md_cannabis_charge_statute: 'CR 5-601', md_cannabis_charge_disposition: 'guilty', md_cannabis_conviction_date: '2022-06-01', md_cannabis_only_charge: 'Yes', md_cannabis_all_charges_listed: 'Yes', md_cannabis_pending_proceeding: 'No', md_cannabis_recital_confirmed: 'Yes', md_cannabis_sentence_complete: 'Yes', md_cannabis_completion_date: '2023-10-29', md_cannabis_case_search_checked: 'Yes', md_cannabis_case_search_result: 'not_shown', md_cannabis_court_record_status: 'exists_unexpunged', md_cannabis_record_reference: 'Frozen fictional docket record; no clerk contact or attached records asserted.', md_cannabis_restitution_status: 'not_ordered', md_cannabis_court_level: 'district', md_cannabis_filing_court_confirmed: 'Yes', md_cannabis_court_transfer: 'none', md_cannabis_case_appealed: 'No', md_cannabis_contested: 'No', md_cannabis_fee_choice: 'paid' },
    excluded: { md_cannabis_pending_proceeding: 'Yes' }, held: { md_cannabis_contested: 'Yes' }, status: 'attorney_review',
    component: 'Official Maryland cannabis petition CC-DC-CR-072D' },
  { route: 'MA:adult-conviction-sealing-under-m-g-l-c-276-100a', declared: 22,
    key: 'ma_100a_all_dispositions_description', value: 'All Massachusetts entries: one misdemeanor conviction; latest court/disposition/custody end2023-10-29; no other entries.',
    facts: { ma_100a_whole_record_reviewed: 'Yes', ma_100a_all_record_classifications_confirmed: 'Yes', ma_100a_all_dispositions_description: 'All Massachusetts entries: one misdemeanor conviction; latest court/disposition/custody end2023-10-29; no other entries.', ma_100a_latest_misdemeanor_event: '2023-10-29', ma_100a_latest_felony_event: 'none', ma_100a_latest_sex_offense_completion: 'none', ma_100a_excluded_firearms_or_public_integrity_record: 'No', ma_100a_recent_finding_three_years: 'No', ma_100a_recent_custody_three_years: 'No' },
    excluded: { ma_100a_excluded_firearms_or_public_integrity_record: 'Yes' }, held: { ma_100a_all_record_classifications_confirmed: 'No' }, status: 'needs_review',
    component: 'Official Commissioner of Probation section100A sealing request' },
  { route: 'AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180', declared: 20,
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
const savedMatters = new Map();
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
for (const c of cases) {
  const state = c.route.slice(0, 2), profile = getProfileByJurisdiction(state);
  const publicIds = new Set(projectPublicProfile(profile).questions.map(q => q.id));
  const witness = witnesses.find(w => w.pathwayKey === c.route);
  assert(witness, 'Existing exact route witness required');
  const answers = Object.fromEntries(Object.entries(witness.finalAnswers).filter(([id]) => publicIds.has(id)));
  if (state === 'MA') {
    assert(publicIds.has('court'));
    answers.court = 'Optional fictional historical court reference';
  }
  const authoritative = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion, matterId: 'synthetic-' + state, answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers,
    dependencies: {}, capturedAt: asOf + 'T00:00:00.000Z' });
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
    assert.equal(I.research115PacketFactIds(c.route, c.facts, true).length, c.declared ?? Object.keys(c.facts).length);
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
    const prepared = c.prepare ? P.packetInformationPatch({ protectedVerification: original, answers: c.prepare }) : null;
    if (c.prepare) assert(prepared?.protectedTransition, 'Ordinary parent selection must save before conditional questions');
    const saved = P.packetInformationPatch({ protectedVerification: prepared?.protectedTransition.nextVerification ?? original, answers: c.facts });
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
    if (state === 'MA') {
      assert(!nextModel.requiredInputIds.includes('court'), 'The whole-record Commissioner request has no mandatory primary court');
      assert(!nextModel.expectedComponents.some(text => /proposed order|prosecutor service/i.test(text)));
      assert.equal(snapshot.screeningAnswers.court, 'Optional fictional historical court reference', 'Optional historical facts must survive a save');
    }
    savedMatters.set(state, next);
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
    check(state + ' bilingual outcome ' + gate.status, () => {
      const es = resolveRuntimeText('es', gate.reason);
      if (gate.reasonEs) assert.equal(es, gate.reasonEs);
      else {
        assert.notEqual(es, gate.reason, 'Known Maryland outcomes must not fall back to untranslated technical text');
        const expected = { qualifying: /072D.*tribunal.*\$30/, excluded: /pendiente|proceso penal/i, attorney_review: /objeción|contenciosa/i, unknown: /inventario|cargos/i };
        assert.match(es, expected[gate.status]);
      }
    });
  }
  check(state + ' fabricated approval and server route changes do not survive save', () => {
    const bad = P.packetInformationPatch({ protectedVerification: original, answers: { [c.key]: c.value, forged_approval: 'Yes', legalSignoffStatus: 'signed_off', paymentAllowed: true, jurisdiction: 'NV', pathwayId: 'other' } });
    assert(bad?.protectedTransition);
    const next = bad.protectedTransition.nextVerification, snapshot = next.draftSnapshot ?? next.snapshot;
    for (const key of ['forged_approval', 'legalSignoffStatus', 'paymentAllowed', 'jurisdiction', 'pathwayId']) assert(!Object.hasOwn(snapshot.packetAnswers, key));
    assert.equal(snapshot.jurisdiction, state); assert.equal(snapshot.pathwayId, c.route.slice(3)); assert.equal(snapshot.paymentAllowed, false);
  });
}
const ak = cases.find(c => c.route.startsWith('AK:')), wv = cases.find(c => c.route.startsWith('WV:'));
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
for (const c of cases.filter(c => ['MD', 'MA'].includes(c.route.slice(0, 2)))) {
  for (const value of ['I am not sure', 'unknown', { unknown: true, value: c.value }]) check(c.route.slice(0, 2) + ' material narrative uncertainty agrees with its actual input control ' + JSON.stringify(value), () => {
    const facts = { ...c.facts, [c.key]: value }, before = JSON.stringify(facts);
    assert.equal(I.research115Eligibility(c.route, facts, asOf).status, 'unknown');
    assert.equal(JSON.stringify(facts), before, 'Evaluation projection must not rewrite raw saved facts');
  });
}
function save(previous, answers) {
  const patch = P.packetInformationPatch({ protectedVerification: previous, answers });
  assert(patch?.protectedTransition); return patch.protectedTransition.nextVerification;
}
check('MD ordinary mixed-charge saves build actual facts without participant unit authorization', () => {
  let next = save(savedMatters.get('MD'), { md_cannabis_only_charge: 'No' });
  next = save(next, { md_cannabis_additional_charge_count: '1' });
  assert(P.protectedPacketInformationModelFor(next).questions.some(q => q.id === 'md_cannabis_other_1_description'));
  next = save(next, { md_cannabis_other_1_id: '2', md_cannabis_other_1_description: 'First-degree assault', md_cannabis_other_1_statute: 'CR 3-202', md_cannabis_other_1_disposition: 'guilty', md_cannabis_other_1_minor_traffic: 'No', md_cannabis_other_1_cannabis: 'No', md_cannabis_charge_inventory: [], md_cannabis_unit_eligible: 'Yes' });
  const model = P.protectedPacketInformationModelFor(next);
  assert.equal(I.research115Eligibility('MD:cannabis-specific-expungement', model.initialAnswers, asOf).status, 'qualifying');
  assert(!Object.hasOwn(model.packetAnswers, 'md_cannabis_charge_inventory')); assert(!Object.hasOwn(model.packetAnswers, 'md_cannabis_unit_eligible'));
  const pwid = save(next, { md_cannabis_basis: 'pwid', md_cannabis_charge_statute: 'CR 5-602', md_cannabis_new_conviction_during_wait: 'No' });
  assert.equal(I.research115Eligibility('MD:cannabis-specific-expungement', P.protectedPacketInformationModelFor(pwid).initialAnswers, asOf).status, 'attorney_review');
  const single = save(next, { md_cannabis_only_charge: 'Yes' }), singleModel = P.protectedPacketInformationModelFor(single);
  assert.equal(singleModel.packetAnswers.md_cannabis_other_1_description, 'First-degree assault');
  assert(!singleModel.questions.some(q => q.id === 'md_cannabis_other_1_description'));
});
check('MD requested waiver selects its documents; missing amounts never default to zero', () => {
  const partial = save(savedMatters.get('MD'), { md_cannabis_fee_choice: 'waiver' });
  const incomplete = P.protectedPacketInformationModelFor(partial);
  assert(incomplete.missingInputIds.includes('md_cannabis_fin_total')); assert.deepEqual(incomplete.expectedComponents, []);
  const financial = { md_cannabis_prepaid_waiver_requested: 'Yes', md_cannabis_unable_to_prepay: 'Yes', md_cannabis_final_costs_requested: 'No', md_cannabis_restricted_case_type: 'No', md_cannabis_fin_household: '1', md_cannabis_fin_period: 'month', md_cannabis_fin_total: '750.00', md_cannabis_fin_income_complete: 'Yes', md_cannabis_fin_property_complete: 'Yes', md_cannabis_fin_debts_complete: 'Yes' };
  for (const key of ['wages', 'commissions', 'ssi', 'retirement', 'unemployment', 'cashAssistance', 'alimony', 'rent', 'other']) financial['md_cannabis_fin_income_' + key] = key === 'wages' ? '750.00' : '0';
  for (const key of ['realEstate', 'vehicles', 'bank', 'stocks', 'other']) financial['md_cannabis_fin_property_' + key] = '0';
  for (const key of ['creditCard', 'carLoan', 'other']) financial['md_cannabis_fin_debt_' + key] = '0';
  const complete = save(partial, financial), model = P.protectedPacketInformationModelFor(complete);
  assert.equal(I.research115Eligibility('MD:cannabis-specific-expungement', model.initialAnswers, asOf).status, 'qualifying');
  assert.equal(model.expectedComponents.length, 4); assert(model.expectedComponents.some(s => s.includes('CC-DC-089'))); assert(model.expectedComponents.some(s => s.includes('MDJ-008')));
  const uncertain = save(complete, { md_cannabis_fin_property_bank: { unknown: true, value: '0' } }), unknown = P.protectedPacketInformationModelFor(uncertain);
  assert(unknown.missingInputIds.includes('md_cannabis_fin_property_bank')); assert.deepEqual(unknown.expectedComponents, []);
  const paid = save(complete, { md_cannabis_fee_choice: 'paid' }), returned = P.protectedPacketInformationModelFor(paid);
  assert.equal(returned.packetAnswers.md_cannabis_fin_total, '750.00'); assert(!returned.questions.some(q => q.id === 'md_cannabis_fin_total'));
  assert.equal(returned.expectedComponents.length, 2);
});
check('MA saved class changes expose the right history and retain inactive facts', () => {
  let next = save(savedMatters.get('MA'), { ma_100a_latest_misdemeanor_event: 'none', ma_100a_latest_felony_event: '2019-10-29' });
  let model = P.protectedPacketInformationModelFor(next);
  assert(model.questions.some(q => q.id === 'ma_100a_recent_finding_seven_years'));
  assert(!model.questions.some(q => q.id === 'ma_100a_recent_finding_three_years'));
  next = save(next, { ma_100a_recent_finding_seven_years: 'No', ma_100a_recent_custody_seven_years: 'No' });
  model = P.protectedPacketInformationModelFor(next);
  assert.equal(I.research115Eligibility('MA:adult-conviction-sealing-under-m-g-l-c-276-100a', model.initialAnswers, asOf).status, 'qualifying');
  assert.equal(model.packetAnswers.ma_100a_recent_finding_three_years, 'No');
});
const { massachusettsAdultSealingMatterFromSnapshot: maMatter } = await import('../src/lib/rcap/documents/massachusetts-adult-sealing-document-facts.ts');
const maFrozen = JSON.parse(fs.readFileSync('scripts/fixtures/ma-adult-sealing-reviewed-whole-record-input.json'));
const maDocumentAnswers = { participant_full_legal_name: 'Casey Bennett', ma_100a_first_name: 'Casey', ma_100a_last_name: 'Bennett', ma_100a_date_of_birth: '1985-05-10', ma_100a_street_address: '60 Pine Street', ma_100a_city: 'Boston', ma_100a_mailing_state: 'MA', ma_100a_postal_code: '02108' };
let maSaved;
check('MA actual saved explicit document facts match the independently frozen matter', () => {
  maSaved = save(savedMatters.get('MA'), { ...maFrozen.facts, ...maDocumentAnswers });
  const snapshot = maSaved.draftSnapshot ?? maSaved.snapshot;
  const expected = structuredClone(maFrozen);
  delete expected.facts.ma_100a_recent_finding_seven_years;
  delete expected.facts.ma_100a_recent_custody_seven_years;
  // The real yes/no controls save their declared wire strings; the frozen renderer input used equivalent booleans.
  Object.assign(expected.facts, { ma_100a_whole_record_reviewed: 'Yes', ma_100a_all_record_classifications_confirmed: 'Yes', ma_100a_excluded_firearms_or_public_integrity_record: 'No', ma_100a_recent_finding_three_years: 'No', ma_100a_recent_custody_three_years: 'No' });
  assert.deepEqual(maMatter({ ...snapshot, verifiedAt: maFrozen.verifiedAt }, maFrozen.matterId), expected);
  assert.equal(snapshot.paymentAllowed, false); assert.notEqual(maSaved.status, 'verified');
});
check('MA optional middle name and alias do not become required completion facts', () => {
  const model = P.protectedPacketInformationModelFor(maSaved);
  for (const id of ['ma_100a_middle_name', 'ma_100a_alias']) {
    const q = model.questions.find(q => q.id === id);
    assert.equal(q.required, false); assert.equal(q.lifecyclePhase, 'optional_or_later');
    assert(!model.missingInputIds.includes(id));
  }
  for (const id of Object.keys(maDocumentAnswers).filter(id => id !== 'participant_full_legal_name')) {
    assert(P.heldPacketCorrectionInputIds(model, model.resultCode).has(id));
    assert(!model.missingInputIds.includes(id));
  }
});
check('MA material document uncertainty stays missing through actual save and cannot map', () => {
  for (const id of ['ma_100a_city', 'participant_full_legal_name']) for (const value of ['no sé', { unknown: true, value: maDocumentAnswers[id] }]) {
    const saved = save(maSaved, { [id]: value }), snapshot = saved.draftSnapshot ?? saved.snapshot;
    assert(P.protectedPacketInformationModelFor(saved).missingInputIds.includes(id));
    assert.throws(() => maMatter({ ...snapshot, verifiedAt: maFrozen.verifiedAt }, maFrozen.matterId), /unknown_document_fact/);
    assert.equal(snapshot.paymentAllowed, false);
  }
});
const { alaskaIdentityDocumentFromSnapshot: akDocument } = await import('../src/lib/rcap/documents/alaska-identity-document-facts.ts');
const akFrozen = JSON.parse(fs.readFileSync('scripts/fixtures/alaska-identity-reviewed-input.json'));
const akDocumentAnswers = { participant_full_legal_name: 'Avery Linden Fiction', ak_seal_first_name: 'Avery', ak_seal_middle_name: 'Linden', ak_seal_last_name: 'Fiction', ak_seal_mailing_address: '900 Fictional Way, Anchorage, AK 99501', ak_seal_phone: '907-555-0104', ak_seal_date_of_birth: '1987-04-14', ak_seal_arrest_date: '2019-05-09', ak_seal_offense_date: '2019-05-08', case_identifier: '3AN-19-01234CR', charge: 'Theft in the fourth degree' };
let akSaved;
check('AK actual saved facts reproduce the independently reviewed eight-field native input', () => {
  akSaved = save(savedMatters.get('AK'), { ...akFrozen.materialScreeningFacts, ak_seal_arrest_or_citation: 'Yes', ak_seal_prosecutor_referral: 'Yes', ...akDocumentAnswers });
  const snapshot = akSaved.draftSnapshot ?? akSaved.snapshot;
  const mapped = akDocument({ ...snapshot, verifiedAt: '2026-10-29T12:00:00Z' }, 'synthetic-AK');
  assert.deepEqual(mapped.facts, akFrozen.facts);
  assert.equal(mapped.materialScreeningFacts.ak_seal_explanation, akFrozen.materialScreeningFacts.ak_seal_explanation);
  assert.deepEqual(mapped.unfilledParticipantFactIds, []);
  assert.equal(snapshot.paymentAllowed, false); assert.notEqual(akSaved.status, 'verified');
});
check('AK optional unknown document facts remain blank/manual and never become material eligibility gates', () => {
  const saved = save(akSaved, { ak_seal_phone: { unknown: true, value: '907-555-0104' }, ak_seal_date_of_birth: 'no sé' });
  const snapshot = saved.draftSnapshot ?? saved.snapshot, model = P.protectedPacketInformationModelFor(saved);
  for (const id of ['ak_seal_suffix', 'ak_seal_phone', 'ak_seal_date_of_birth']) {
    const q = model.questions.find(q => q.id === id); assert.equal(q.required, false); assert.equal(q.lifecyclePhase, 'optional_or_later');
    assert(!model.missingInputIds.includes(id));
  }
  const mapped = akDocument({ ...snapshot, verifiedAt: '2026-10-29T12:00:00Z' }, 'synthetic-AK');
  assert(!Object.hasOwn(mapped.facts, 'participant.phone')); assert(!Object.hasOwn(mapped.facts, 'participant.date_of_birth'));
  assert(mapped.unfilledParticipantFactIds.includes('participant.phone')); assert(mapped.unfilledParticipantFactIds.includes('participant.date_of_birth'));
});
check('AK unsupported and different-agency branches hide document collection while preserving saved history', () => {
  for (const change of [{ ak_seal_basis: 'dismissal_only' }, { ak_seal_record_holder: 'other_agency' }]) {
    const saved = save(akSaved, change), snapshot = saved.draftSnapshot ?? saved.snapshot, model = P.protectedPacketInformationModelFor(saved);
    assert(!model.questions.some(q => q.id === 'ak_seal_first_name'));
    assert(!I.research115PacketFactIds(ak.route, model.initialAnswers).includes('ak_seal_first_name'));
    assert(I.research115PacketFactIds(ak.route, model.initialAnswers, true).includes('ak_seal_first_name'));
    assert.equal(snapshot.packetAnswers.ak_seal_first_name, 'Avery'); assert.equal(snapshot.paymentAllowed, false);
  }
});
check('AK unknown required name stays missing and cannot populate a participant document', () => {
  const saved = save(akSaved, { ak_seal_first_name: { unknown: true, value: 'Avery' } }), snapshot = saved.draftSnapshot ?? saved.snapshot;
  assert(P.protectedPacketInformationModelFor(saved).missingInputIds.includes('ak_seal_first_name'));
  assert.throws(() => akDocument({ ...snapshot, verifiedAt: '2026-10-29T12:00:00Z' }, 'synthetic-AK'), /unknown_document_fact/);
});
check('AK participant draft does not require court, record uploads or unknown optional fields before preparation', () => {
  const model = P.protectedPacketInformationModelFor(akSaved);
  for (const id of ['charge', 'contact_information', 'court', 'criminal_history', 'disposition_date', 'record_type', 'residency_or_location']) {
    assert(!model.requiredInputIds.includes(id), id);
    assert(!model.missingInputIds.includes(id), id);
    const q = model.questions.find(q => q.id === id);
    if (q) { assert.equal(q.required, false, id); assert.equal(q.lifecyclePhase, 'optional_or_later', id); }
  }
  const reference = model.questions.find(q => q.id === 'case_identifier');
  assert.equal(reference.required, false); assert.match(reference.prompt, /trial court/); assert.match(reference.prompt, /police, prosecutor or arrest tracking/);
  assert.equal(model.packetAnswers.charge, 'Theft in the fourth degree');
  assert(!model.expectedComponents.some(c => /court petition|proposed order/i.test(c)));
});
console.log(`${checks}/${checks} protected research-intake controls passed; local integration only, no paid fulfillment or production proof.`);
