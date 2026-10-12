import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const profile = getProfileByJurisdiction('NY');
const pathway = profile.pathways.find(p => p.id === 'discretionary-conviction-sealing-by-petition-under-cpl-160-59');
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w => w.jurisdiction === 'NY');
const base = { ...witness.finalAnswers, possible_pathway_context: pathway.label,
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
  ['ny_16059_prior_sealing', 'ny.ny_16059_prior_sealing_scope_unconfirmed'],
  ['ny_16059_post_last_conviction_crime', 'ny.ny_16059_later_conviction_unconfirmed']
]) {
  const result = evaluate({ [id]: 'Yes', ...(id === 'ny_16059_post_last_conviction_crime' ? { ny_16059_later_conviction_entered: undefined } : {}) });
  assert.equal(result.resultCode, 'needs_review');
  assert.equal(result.paymentAllowed, false);
  assert.ok(result.reasons.some(r => r.code === code)); checked++;
}
for (const value of [-1, 0, 0.5, 1.5, 'not a count']) {
  const result = evaluate({ ny_16059_total_eligible_convictions: value });
  assert.equal(result.resultCode, 'needs_review'); assert.equal(result.paymentAllowed, false); checked++;
}
for (const value of [-1, 0.5, 'not a count']) {
  const result = evaluate({ ny_16059_felony_convictions: value });
  assert.equal(result.resultCode, 'needs_review'); assert.equal(result.paymentAllowed, false); checked++;
}
const inconsistent = evaluate({ ny_16059_total_eligible_convictions: 1, ny_16059_felony_convictions: 2 });
assert.equal(inconsistent.resultCode, 'needs_review'); assert.equal(inconsistent.paymentAllowed, false); checked++;
for (const change of [
  { ny_16059_total_eligible_convictions: 3 },
  { ny_16059_total_eligible_convictions: 2, ny_16059_felony_convictions: 2 },
  { ny_16059_pending_charge: 'Yes' },
  { new_convictions_during_waiting_period: 'Yes' },
  { ny_16059_ineligible_offense: 'Yes' },
  { ny_16059_sex_offender_registration: 'Yes' }
]) {
  const result = evaluate(change);
  assert.equal(result.resultCode, 'likely_not_eligible'); assert.equal(result.paymentAllowed, false); checked++;
}
for (const id of ['ny_16059_prior_sealing', 'ny_16059_later_conviction_entered', 'ny_16059_ineligible_offense']) {
  const result = evaluate({ [id]: 'I am not sure' });
  assert.equal(result.resultCode, 'needs_review'); assert.equal(result.paymentAllowed, false); checked++;
}
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
assert.equal(evaluate({ sentencing_date: '2012-02-29', release_date: '2012-03-01' }).resultCode, 'packet_ready_with_caution'); checked++;
console.log(JSON.stringify({ status: 'PASS', checked, scope: 'CPL 160.59 legacy ambiguity versus actual bars and count integrity; existing positive preserved. Full history, grouping, clock and offense-table corrections remain open.' }));
