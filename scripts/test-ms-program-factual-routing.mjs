import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const profile = getProfileByJurisdiction('MS');
const originalPathways = [...profile.pathways];
const originalRules = [...profile.orderedDecisionRules];
const facts = { ...MS_NONCONVICTION_SCREENING_ANSWERS, case_outcome: 'Diversion, deferred disposition, supervision, or similar program' };
delete facts.possible_pathway_context;
const evaluate = answers => evaluateScreening({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-ms-program-stage', answers });
// Independent expected IDs from LD-MS-01's separate admission/completion routes.
const cases = [
  ['99-15-26', 'active', 'nonadjudication-99-15-26-active-case-admission'],
  ['99-15-26', 'completed_and_closed', 'nonadjudication-under-99-15-26'],
  ['99-15-101', 'active', 'pretrial-intervention-active-case-admission'],
  ['99-15-101', 'completed_and_closed', 'pretrial-intervention-or-diversion-expungement'],
  ['41-29-150', 'active', 'controlled-substance-conditional-discharge-active-case-admission'],
  ['41-29-150', 'completed_and_closed', 'first-offense-controlled-substance-conditional-discharge-relief']
];
let checked = 0;
const outcomes = [];
// The existing legal contract calls active-case admission an attorney referral.
// Its compiled guidance rule must not become a packet or a completion clock.
for (const [ms_program_order, stage, pathwayId] of cases.filter(row => row[1] === 'active')) {
  const answers = { ...facts, ms_program_order, ms_program_record_status: stage,
    court_requirements_completed: 'no', sentence_completion_date: 'No', pending_cases: 'Yes' };
  const actual = evaluate(answers);
  assert.equal(actual.resultCode, 'needs_review');
  assert.equal(actual.pathwayId, pathwayId);
  assert.equal(actual.paymentAllowed, false);
  assert.ok(actual.reasons.some(r => r.code === 'ms.active_program_admission_referral'));
  checked++;
}
try {
  for (const [ms_program_order, ms_program_record_status, pathwayId] of cases) {
    const answers = { ...facts, ms_program_order, ms_program_record_status };
    const expected = evaluate(answers);
    assert.equal(expected.pathwayId, pathwayId);
    if (ms_program_record_status === 'active') {
      assert.equal(expected.resultCode, 'needs_review');
      assert.equal(expected.paymentAllowed, false);
      assert.ok(expected.reasons.some(r => r.code === 'ms.active_program_admission_referral'));
    }
    const expectedQuestions = selectScreeningQuestionIds(profile, projectPublicProfile(profile), answers);
    assert.ok(expectedQuestions.includes('ms_program_order'));
    assert.ok(expectedQuestions.includes('ms_program_record_status'));
    outcomes.push({ pathwayId, resultCode: expected.resultCode, paymentAllowed: expected.paymentAllowed, reasons: expected.reasons.map(r => r.code) });
    for (const reverse of [false, true]) {
      profile.pathways = reverse ? [...originalPathways].reverse() : [...originalPathways];
      profile.orderedDecisionRules = reverse ? [...originalRules].reverse() : [...originalRules];
      for (const context of [undefined, ...originalPathways.map(p => p.label)]) {
        const candidate = { ...answers, ...(context ? { possible_pathway_context: context } : {}) };
        assert.deepEqual(evaluate(candidate), expected, `${pathwayId}: context=${context}; reverse=${reverse}`);
        assert.deepEqual(selectScreeningQuestionIds(profile, projectPublicProfile(profile), candidate), expectedQuestions);
        checked++;
      }
    }
  }
} finally {
  profile.pathways = originalPathways;
  profile.orderedDecisionRules = originalRules;
}
for (const [ms_program_order, stage, pathwayId] of cases.filter(row => row[1] === 'active')) {
  const answers = { ...facts, ms_program_order, ms_program_record_status: stage };
  for (const mutation of ['source', 'action', 'missing']) {
    try {
      profile.orderedDecisionRules = originalRules.flatMap(rule => {
        if (rule.when?.backendPathwayId !== pathwayId) return [rule];
        if (mutation === 'missing') return [];
        return [{ ...rule, ...(mutation === 'source' ? { sourceRef: 'unverified-source' }
          : { then: { ...rule.then, frontendAction: 'unverified-action' } }) }];
      });
      const result = evaluate(answers);
      assert.equal(result.paymentAllowed, false);
      assert.ok(!result.reasons.some(r => r.code === 'ms.active_program_admission_referral'));
      checked++;
    } finally { profile.orderedDecisionRules = originalRules; }
  }
}
for (const ms_program_order of ['99-15-26', '99-15-101', '41-29-150']) {
  for (const ms_program_record_status of [undefined, 'completed_without_closure', 'revoked_or_unsuccessful', 'other_or_unknown']) {
    const result = evaluate({ ...facts, ms_program_order, ...(ms_program_record_status ? { ms_program_record_status } : {}) });
    assert.equal(result.resultCode, 'needs_more_info');
    assert.deepEqual(result.missingQuestionIds, ['ms_program_record_status']);
    assert.equal(result.paymentAllowed, false);
    checked++;
  }
  for (const case_outcome of ['Misdemeanor conviction', 'Felony conviction', 'Pardoned conviction']) {
    const result = evaluate({ ...facts, case_outcome, ms_program_order, ms_program_record_status: 'completed_and_closed' });
    assert.equal(result.resultCode, 'needs_more_info');
    assert.equal(result.paymentAllowed, false);
    assert.deepEqual(result.missingQuestionIds, ['case_outcome', 'ms_program_record_status']);
    checked++;
  }
}
for (const ms_program_order of [undefined, 'no_program_order', 'other_or_unknown']) {
  const result = evaluate({ ...facts, ...(ms_program_order ? { ms_program_order } : {}) });
  assert.equal(result.resultCode, 'needs_more_info');
  assert.deepEqual(result.missingQuestionIds, ['ms_program_order']);
  assert.equal(result.paymentAllowed, false);
  checked++;
}
// EN/ES display labels retain identical canonical wire choices. This is copy
// coverage, not a substitute for the protected assisted-language journey.
for (const id of ['ms_program_order', 'ms_program_record_status']) {
  const question = projectPublicProfile(profile).questions.find(q => q.id === id);
  assert.ok(question.translations.es.prompt);
  assert.deepEqual(Object.keys(question.optionDisplay), question.options);
  for (const option of question.options) assert.ok(question.optionDisplay[option].translations.es.label);
  checked++;
}
console.log(JSON.stringify({ status: 'PASS', checked, outcomes, scope: 'Six MS program routes; real evaluator and question selector. No release, protected login, packet or provider proof claimed.' }));
