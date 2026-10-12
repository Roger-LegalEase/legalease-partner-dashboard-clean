import { NY_HISTORY_CLOCK_BASE } from './lib/ny-history-clock-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const profile = getProfileByJurisdiction('NY');
const pathway = profile.pathways.find(p => p.id === 'discretionary-conviction-sealing-by-petition-under-cpl-160-59');
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w => w.jurisdiction === 'NY');
const base = { ...witness.finalAnswers, ...NY_HISTORY_CLOCK_BASE, possible_pathway_context: pathway.label,
  case_outcome: 'Misdemeanor conviction', offense_level: 'Misdemeanor',
  ny_16059_total_eligible_convictions: 1, ny_16059_felony_convictions: 0,
  ny_16059_ineligible_offense: 'No', ny_16059_sex_offender_registration: 'No',
  ny_16059_pending_charge: 'No', ny_16059_undisposed_arrest: 'No', ny_16059_post_last_conviction_crime: 'No',
  ny_16059_prior_sealing: 'No', ny_16059_later_conviction_entered: 'No', new_convictions_during_waiting_period: 'No', resolved_timing_bucket: 'gt_10_years' };
const evaluate = change => evaluateScreening({ jurisdiction: 'NY', profileVersion: profile.profileVersion, matterId: 'synthetic-ny-boundary', answers: { ...base, ...change } });
let checked = 0;
// Preserve the accepted candidate outcome. This is evaluator scope only, not
// fulfillment, full statutory proof, or a provider/payment acceptance result.
const positive = evaluate({});
assert.equal(positive.resultCode, 'packet_ready_with_caution');
assert.equal(positive.paymentAllowed, true); checked++;
// CPL 160.59(3)(b)-(c) concern the statutory maximum, not every prior order.
// Section (3)(f) concerns a later conviction, not an unadjudicated allegation.
for (const [id, code] of [
  ['ny_16059_16058_grants', 'ny.ny_16059_16058_order_review'],
  ['ny_16059_post_last_conviction_crime', 'ny.ny_16059_later_conviction_unconfirmed']
]) {
  const result = evaluate({ ...(id === 'ny_16059_16058_grants' ? {ny_16059_16058_treatment_count:1,ny_16059_16058_additional_count:0} : {}), [id]: id === 'ny_16059_16058_grants' ? 'granted' : 'Yes', ...(id === 'ny_16059_post_last_conviction_crime' ? { ny_16059_later_conviction_entered: undefined } : {}) });
  assert.equal(result.resultCode, 'needs_review');
  assert.equal(result.paymentAllowed, false);
  assert.ok(result.reasons.some(r => r.code === code)); checked++;
}
for (const value of [-1, 0, 0.5, 1.5, 'not a count']) {
  const result = evaluate({ ny_16059_requested_total: value });
  assert.equal(result.resultCode, value === 0 ? 'needs_review' : 'needs_more_info'); assert.equal(result.paymentAllowed, false); checked++;
}
for (const value of [-1, 0.5, 'not a count']) {
  const result = evaluate({ ny_16059_requested_felonies: value });
  assert.equal(result.resultCode, value === 0 ? 'needs_review' : 'needs_more_info'); assert.equal(result.paymentAllowed, false); checked++;
}
const inconsistent = evaluate({ ny_16059_history_total: 1, ny_16059_history_felonies: 2 });
assert.equal(inconsistent.resultCode, 'needs_review'); assert.equal(inconsistent.paymentAllowed, false); checked++;
for (const change of [
  { ny_16059_history_total: 3 },
  { ny_16059_history_total: 2, ny_16059_history_felonies: 2 },
  { ny_16059_pending_charge: 'Yes' },
  { new_convictions_during_waiting_period: 'Yes' },
  { ny_16059_requested_excluded: 'Yes' },
  { ny_16059_sex_offender_registration: 'Yes' }
]) {
  const result = evaluate(change);
  assert.equal(result.resultCode, 'likely_not_eligible'); assert.equal(result.paymentAllowed, false); checked++;
}
for (const id of ['ny_16059_later_conviction_entered', 'ny_16059_requested_excluded']) {
  const result = evaluate({ [id]: 'I am not sure' });
  assert.equal(result.resultCode, 'needs_review'); assert.equal(result.paymentAllowed, false); checked++;
}
assert.equal(evaluate({ ny_16059_prior_sealing: 'I am not sure' }).resultCode, 'packet_ready_with_caution'); checked++; // New explicit order facts resolve the ambiguous legacy answer.
// Invalid supplied dates must not roll over or disappear behind a valid
// sibling anchor / broad bucket. Raw saved answers remain available to repair.
for (const id of ['sentencing_date', 'release_date']) {
  for (const value of ['2016-02-30', '2015-02-29', '2010-04-31', '2010-13-01', 'invalid', 'I am not sure', '2099-01-01', '']) {
    const answers = { ...base, sentencing_date: '2010-01-01', release_date: '2011-01-01', [id]: value };
    const before = structuredClone(answers);
    const result = evaluateScreening({ jurisdiction: 'NY', profileVersion: profile.profileVersion, matterId: 'synthetic-ny-anchor', answers });
    assert.equal(result.resultCode, 'needs_more_info');
    assert.equal(result.paymentAllowed, false);
    assert.ok(result.missingQuestionIds.includes(id));
    assert.ok(result.reasons.some(r => r.code === 'ny.ny_16059_anchor_invalid'));
    assert.deepEqual(answers, before); checked++;
  }
}
assert.equal(evaluate({ sentencing_date: '2012-02-29', release_date: '2012-03-01', ny_16059_sentence_incarceration: 'Yes', ny_16059_incarceration_history: 'released', ny_16059_incarceration_periods: '2012-02-29/2012-03-01' }).resultCode, 'packet_ready_with_caution'); checked++;
console.log(JSON.stringify({ status: 'PASS', checked, scope: 'CPL 160.59 legacy ambiguity versus actual bars and count integrity; existing positive preserved. History/clock fixtures now supply independent current facts. Offense-table work and qualified review remain separate.' }));
