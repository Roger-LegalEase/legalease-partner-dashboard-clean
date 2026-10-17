import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-13';
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { kansasRecordScopeFromAnswers } = await import('../src/lib/rcap-engine/kansas-record-scope.ts');
const { KS_DISTRICT_FACT_IDS } = await import('../src/lib/rcap-engine/kansas-district-facts.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const p = getProfileByJurisdiction('KS'), pub = projectPublicProfile(p);
const pathways = [...p.pathways], rules = [...p.orderedDecisionRules];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'KS');
const base = { ...witnesses[0].finalAnswers, ks_record_court_scope: 'district_state_law', case_outcome: 'Misdemeanor conviction', ks_district_request: 'record_expungement' };
delete base.possible_pathway_context;
const evaluate = answers => evaluateScreening({ jurisdiction: 'KS', profileVersion: p.profileVersion, matterId: 'synthetic-ks-district', answers });
const checks = [], scenarios = [];
function check(name, actual, expected) { checks.push({ name, actual, expected, pass: JSON.stringify(actual) === JSON.stringify(expected) }); }
for (const value of ['Misdemeanor conviction', 'Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty']) {
  const question = pub.questions.find(q => q.id === 'case_outcome');
  check(`actual case outcome offered ${value}`, question.options.includes(value), true);
  check(`Spanish case outcome displayed ${value}`, Boolean(question.optionDisplay[value]?.translations?.es?.label
    && question.optionDisplay[value].translations.es.label !== question.optionDisplay[value].label), true);
}
check('independent paid fact reachable', selectScreeningQuestionIds(p, pub, base).includes('financial_obligations'), true);
const program = 'Diversion, deferred disposition, supervision, or similar program';
// Independent expected candidate identities come from KS.memo / §§21-6614,
// 22-4908, not from whichever label happened to win the old selector.
const cases = [
  ['ordinary-misdemeanor', {}, 'conviction-or-diversion-216614'],
  ['ordinary-felony', { case_outcome: 'Felony conviction' }, 'conviction-or-diversion-216614'],
  ['fulfilled-diversion', { case_outcome: program, ks_district_program_record: 'diversion_agreement', ks_district_diversion_fulfilled: 'yes' }, 'conviction-or-diversion-216614'],
  ['unfulfilled-diversion', { case_outcome: program, ks_district_program_record: 'diversion_agreement', ks_district_diversion_fulfilled: 'no' }, 'conviction-or-diversion-216614'],
  ['completed-specialty', { ks_district_request: 'specialty_completion', ks_specialty_program_basis: 'court_established_20_173', ks_specialty_requirements_completed: 'yes' }, 'specialty-court-accelerated'],
  ['coercion-current', { ks_district_request: 'coercion_prostitution', ks_prostitution_record_statute: '21-6419', ks_coercion_acts: 'yes' }, 'prostitution-coercion'],
  ['coercion-former-diversion', { case_outcome: program, ks_district_program_record: 'diversion_agreement', ks_district_request: 'coercion_prostitution', ks_prostitution_record_statute: 'former_21-3512', ks_coercion_acts: 'yes' }, 'prostitution-coercion'],
  ['combined-registration', { ks_district_request: 'registration_and_expungement', ks_registration_basis: 'drug_only' }, 'drug-registration-relief-coordination']
];
const hints = [undefined, '', 'Skip', 'I am not sure', 'No estoy seguro', ...pathways.map(p => p.label), ...Object.values(pub.questions.find(q => q.id === 'possible_pathway_context')?.optionDisplay ?? {}).map(d => d.translations?.es?.label).filter(Boolean)];
try {
  for (const scope of ['district_state_law']) for (const [name, patch, expectedRoute] of cases) {
    const answers = { ...base, ...patch, ks_record_court_scope: scope }, before = JSON.stringify(answers);
    const expected = evaluate(answers), selected = selectScreeningQuestionIds(p, pub, answers);
    check(`${scope}/${name} candidate`, expected.pathwayId, expectedRoute);
    check(`${scope}/${name} no new authority`, expected.paymentAllowed, false);
    check(`${scope}/${name} no source mutation`, JSON.stringify(answers), before);
    for (const reverse of [false, true]) {
      p.pathways = reverse ? [...pathways].reverse() : [...pathways];
      p.orderedDecisionRules = reverse ? [...rules].reverse() : [...rules];
      for (const hint of hints) {
        const variant = { ...answers, possible_pathway_context: hint };
        check(`${scope}/${name}/${reverse}/${hint} evaluation`, evaluate(variant), expected);
        check(`${scope}/${name}/${reverse}/${hint} questions`, selectScreeningQuestionIds(p, pub, variant), selected);
      }
    }
    p.pathways = [...pathways]; p.orderedDecisionRules = [...rules];
    scenarios.push({ name, scope, answers, evaluation: expected });
  }
} finally { p.pathways = pathways; p.orderedDecisionRules = rules; }
const incomplete = [
  [{ ks_district_request: undefined }, ['ks_district_request']],
  [{ ks_district_request: 'unknown' }, ['ks_district_request']],
  [{ ks_district_request: ['specialty_completion'] }, ['ks_district_request']],
  [{ ks_record_court_scope: ['district_state_law'] }, ['ks_record_court_scope']],
  [{ case_outcome: program }, ['ks_district_program_record']],
  [{ case_outcome: program, ks_district_program_record: 'diversion_agreement' }, ['ks_district_diversion_fulfilled']],
  [{ ks_district_request: 'specialty_completion' }, ['ks_specialty_program_basis']],
  [{ ks_district_request: 'specialty_completion', ks_specialty_program_basis: 'court_established_20_173' }, ['ks_specialty_requirements_completed']],
  [{ ks_district_request: 'coercion_prostitution' }, ['ks_prostitution_record_statute']],
  [{ ks_district_request: 'coercion_prostitution', ks_prostitution_record_statute: '21-6419' }, ['ks_coercion_acts']],
  [{ ks_district_request: 'registration_and_expungement' }, ['ks_registration_basis']],
  [{ ks_district_request: 'registration_and_expungement', case_outcome: program }, ['case_outcome', 'ks_district_request']],
  [{ ks_district_request: 'specialty_completion', case_outcome: program }, ['case_outcome', 'ks_district_request']],
  [{ case_outcome: 'Juvenile adjudication or offense committed as a minor' }, ['case_outcome']]
];
for (const [patch, ids] of incomplete) for (const hint of hints) {
  const answers = { ...base, ...patch, possible_pathway_context: hint }, r = evaluate(answers);
  check(`missing ${JSON.stringify(patch)}/${hint}`, [r.resultCode, r.missingQuestionIds, r.paymentAllowed], ['needs_more_info', ids, false]);
  const selected = selectScreeningQuestionIds(p, pub, answers);
  for (const id of ids) check(`reachable ${JSON.stringify(patch)}/${hint}/${id}`, selected.includes(id), true);
}
const reviewCases = [
  ...cases.map(([, patch]) => [{ ...patch, ks_record_court_scope: 'municipal_appealed_to_district' }, 'appeal_scope']),
  [{ ks_district_request: 'registration_only' }, 'registration_only'],
  ...['sex_or_violent', 'mixed', 'not_required'].map(ks_registration_basis => [{ ks_district_request: 'registration_and_expungement', ks_registration_basis }, 'registration_basis']),
  [{ case_outcome: program, ks_district_program_record: 'other_program' }, 'program_record'],
  [{ ks_district_request: 'specialty_completion', ks_specialty_program_basis: 'other_program' }, 'specialty_program'],
  [{ ks_district_request: 'specialty_completion', ks_specialty_program_basis: 'court_established_20_173', ks_specialty_requirements_completed: 'no' }, 'specialty_program'],
  [{ ks_district_request: 'coercion_prostitution', ks_prostitution_record_statute: 'other' }, 'coercion_record'],
  ...['no', 'prefer_not_to_answer'].map(ks_coercion_acts => [{ ks_district_request: 'coercion_prostitution', ks_prostitution_record_statute: '21-6419', ks_coercion_acts }, 'coercion_acts'])
];
for (const [patch, code] of reviewCases) {
  const answers = { ...base, ...patch }, expected = evaluate(answers);
  check(`review ${code}`, [expected.resultCode, expected.reasons[0].code, expected.paymentAllowed], ['needs_review', `ks.district_${code}_review`, false]);
  for (const hint of hints) check(`review invariant ${code}/${hint}`, evaluate({ ...answers, possible_pathway_context: hint }), expected);
  scenarios.push({ name: code, answers, evaluation: expected });
}
// Retained facts for other requested procedures must neither redirect the person
// nor disappear when those questions become inapplicable on save/resume.
const allFacts = Object.assign({}, ...cases.map(([, patch]) => patch), { ks_district_program_record: 'diversion_agreement', ks_district_diversion_fulfilled: 'yes' });
for (const request of ['record_expungement', 'specialty_completion', 'coercion_prostitution', 'registration_and_expungement', 'registration_only']) {
  const answers = { ...base, ...allFacts, case_outcome: 'Misdemeanor conviction', ks_district_request: request };
  const ids = selectScreeningQuestionIds(p, pub, answers);
  for (const restored of [sanitizeAnswersForQuestionIds(answers, pub.questions.map(q => q.id), ids, pub), sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(JSON.stringify(answers)), ids)]) {
    for (const id of KS_DISTRICT_FACT_IDS) check(`raw retained ${request}/${id}`, restored[id], answers[id]);
    check(`result retained ${request}`, evaluate(restored), evaluate(answers));
  }
  const selected = kansasRecordScopeFromAnswers(answers);
  check(`no automatic priority ${request}`, selected.status === 'selected' ? selected.pathwayId : selected.code,
    { record_expungement: 'conviction-or-diversion-216614', specialty_completion: 'specialty-court-accelerated', coercion_prostitution: 'prostitution-coercion', registration_and_expungement: 'drug-registration-relief-coordination', registration_only: 'registration_only' }[request]);
}
for (const id of KS_DISTRICT_FACT_IDS) {
  const q = pub.questions.find(q => q.id === id);
  check(`published ${id}`, Boolean(q && q.translations.es.prompt && q.translations.es.helperText), true);
  for (const value of q.options) check(`Spanish wire ${id}/${value}`, Boolean(q.optionDisplay[value].translations.es.label), true);
}
for (const { name, answers, evaluation } of scenarios) {
  const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jurisdiction: 'KS', profileVersion: p.profileVersion, matterId: 'synthetic-ks-district', answers }) }));
  const body = await response.json();
  check(`actual handler ${name}`, [response.status, body.resultCode, body.pathwayId, body.paymentAllowed], [200, evaluation.resultCode, evaluation.pathwayId, false]);
  for (const reason of evaluation.reasons) if (reason.code.startsWith('ks.district_')) check(`Spanish reason ${name}`, resolveRuntimeText('es', reason.text) !== reason.text, true);
}
check('all six candidates retained', p.pathways.map(p => p.id), pathways.map(p => p.id));
const failed = checks.filter(c => !c.pass), report = { status: failed.length ? 'FAIL' : 'PASS', checks: checks.length, scenarios: scenarios.length, failed, details: checks, scenarioDetails: scenarios,
  limits: ['Candidate selection, actual stateless handler, question reachability and raw save/resume helpers. No protected database/browser acceptance, statutory eligibility, output, independent language or professional approval.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: report.checks, scenarios: report.scenarios, failed }, null, 2));
assert.equal(failed.length, 0);
