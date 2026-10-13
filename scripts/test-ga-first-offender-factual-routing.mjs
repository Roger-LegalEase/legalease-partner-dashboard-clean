import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.env.RCAP_GA_FO_BASELINE) {
  const files = ['src/lib/rcap-engine/evaluator.ts', 'src/lib/rcap-engine/screening-question-selection.ts'];
  const sources = Object.fromEntries(files.map(file => [pathToFileURL(`${process.cwd()}/${file}`).href,
    ts.transpileModule(execFileSync('git', ['show', `${process.env.RCAP_GA_FO_BASELINE}:${file}`], { encoding: 'utf8' }),
      { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText]));
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`, { data: sources });
}
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { georgiaFirstOffenderFromAnswers, GA_FIRST_OFFENDER_FACT_IDS } = await import('../src/lib/rcap-engine/georgia-first-offender.ts');
const profile = getProfileByJurisdiction('GA'), pub = projectPublicProfile(profile);
const pathways = [...profile.pathways], rules = [...profile.orderedDecisionRules];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'GA');
const facts = { ...witnesses[0].finalAnswers, case_outcome: 'Diversion, deferred disposition, supervision, or similar program',
  prior_relief: 'No', ga_original_first_offender: 'yes' };
delete facts.possible_pathway_context;
const evaluate = answers => evaluateScreening({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-original-first-offender', answers });
// Independent legal boundaries: HB162 §§3-4, adopted ga-fo-* crosswalk. A branch
// classification is a candidate fact only; there is no new track/payment grant.
const cases = [
  ['active', '2026-06-30', undefined, 'active_pre2026'],
  ['active', '2026-07-01', undefined, 'sentencing_post2026'],
  ['active', '2026-07-02', undefined, 'sentencing_post2026'],
  ['exonerated_and_discharged', '2020-02-29', '2026-06-30', 'discharged_pre2026'],
  ['exonerated_and_discharged', '2020-02-29', '2026-07-01', 'discharged_post2026'],
  ['exonerated_and_discharged', '2026-07-01', '2026-07-02', 'discharged_post2026'],
  ['revoked_with_adjudication', undefined, undefined, 'revoked']
];
let checked = 0; const outcomes = [];
try {
  for (const [ga_first_offender_status, ga_first_offender_sentence_date, ga_first_offender_discharge_date, branch] of cases) {
    const answers = { ...facts, ga_first_offender_status,
      ...(ga_first_offender_sentence_date ? { ga_first_offender_sentence_date } : {}),
      ...(ga_first_offender_discharge_date ? { ga_first_offender_discharge_date } : {}) };
    const result = evaluate(answers);
    assert.equal(result.pathwayId, 'youthful-first-offender-restriction-route', 'Original treatment cannot fall to an optional retroactive remedy or an arbitrary first route'); checked++;
    assert.equal(result.paymentAllowed, false, 'All existing source/packet safeguards remain');
    assert.equal(georgiaFirstOffenderFromAnswers(answers, '2026-10-12').branch, branch); checked += 2;
    if (branch === 'revoked') {
      assert.ok(result.reasons.some(reason => reason.code === 'ga.original_first_offender_revoked')); checked++;
    }
    const questions = selectScreeningQuestionIds(profile, pub, answers);
    for (const reverse of [false, true]) {
      profile.pathways = reverse ? [...pathways].reverse() : [...pathways];
      profile.orderedDecisionRules = reverse ? [...rules].reverse() : [...rules];
      for (const context of [undefined, '', 'Skip', ...pathways.map(p => p.label)]) {
        const changed = { ...answers, possible_pathway_context: context };
        assert.deepEqual(evaluate(changed), result, `${branch}: ${context}; reverse=${reverse}`);
        assert.deepEqual(selectScreeningQuestionIds(profile, pub, changed), questions); checked += 2;
      }
    }
    outcomes.push({ branch, resultCode: result.resultCode, pathwayId: result.pathwayId, paymentAllowed: result.paymentAllowed, reasons: result.reasons.map(r => r.code) });
  }
} finally { profile.pathways = pathways; profile.orderedDecisionRules = rules; }
const active = { ...facts, ga_first_offender_status: 'active', ga_first_offender_sentence_date: '2020-02-29' };
const discharged = { ...active, ga_first_offender_status: 'exonerated_and_discharged', ga_first_offender_discharge_date: '2026-06-30' };
const incomplete = [
  [{ ga_original_first_offender: undefined }, ['ga_original_first_offender']],
  [{ ga_original_first_offender: 'other_or_unknown' }, ['ga_original_first_offender']],
  [{ ga_first_offender_status: undefined }, ['ga_first_offender_status']],
  [{ ga_first_offender_status: 'completed_without_discharge' }, ['ga_first_offender_status']],
  [{ ga_first_offender_status: 'other_or_unknown' }, ['ga_first_offender_status']],
  ...[undefined, 'I am not sure', '2026-02-29', '2026-13-01', '2020-02-30', '2027-01-01'].map(value => [{ ga_first_offender_sentence_date: value }, ['ga_first_offender_sentence_date']]),
  ...[undefined, 'I am not sure', '2026-02-29', '2027-01-01'].map(value => [{ ga_first_offender_status: 'exonerated_and_discharged', ga_first_offender_discharge_date: value }, ['ga_first_offender_discharge_date']]),
  [{ ga_first_offender_status: 'exonerated_and_discharged', ga_first_offender_discharge_date: '2019-01-01' }, ['ga_first_offender_sentence_date', 'ga_first_offender_discharge_date']],
  ...['Misdemeanor conviction', 'Felony conviction', 'Pardoned conviction'].map(case_outcome => [{ case_outcome }, ['case_outcome', 'ga_first_offender_status']])
];
for (const [change, missing] of incomplete) {
  for (const context of [undefined, ...pathways.map(p => p.label)]) {
    const result = evaluate({ ...active, ...change, possible_pathway_context: context });
    assert.equal(result.resultCode, 'needs_more_info');
    assert.deepEqual(result.missingQuestionIds, missing);
    assert.equal(result.paymentAllowed, false); checked++;
  }
}
// Hiding a field must neither destroy the raw fact nor let an irrelevant retained
// unknown/date answer change selection. Original No never invents §42-8-66.
for (const value of ['no', undefined]) {
  const answers = { ...discharged, case_outcome: 'Misdemeanor conviction', ga_original_first_offender: value };
  const selected = selectScreeningQuestionIds(profile, pub, answers);
  assert.equal(georgiaFirstOffenderFromAnswers(answers).status, 'not_applicable'); checked++;
  for (const id of GA_FIRST_OFFENDER_FACT_IDS.slice(1)) assert.ok(!selected.includes(id));
  const switched = sanitizeAnswersForQuestionIds(answers, pub.questions.map(q => q.id), selected, pub);
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(JSON.stringify(answers)), selected);
  for (const id of GA_FIRST_OFFENDER_FACT_IDS.slice(1)) {
    assert.deepEqual(switched[id], answers[id]); assert.deepEqual(resumed[id], answers[id]); checked += 2;
  }
}
for (const id of GA_FIRST_OFFENDER_FACT_IDS) {
  const q = pub.questions.find(q => q.id === id);
  assert.ok(q && q.translations.es.prompt && q.translations.es.helperText);
  assert.equal(q.lifecyclePhase, 'prepay_route_splitter'); checked++;
  for (const value of q.options ?? []) { assert.ok(q.optionDisplay[value].translations.es.label); checked++; }
}
// Unrelated candidates retain their prior treatment. The adopted GA-02 rule
// requires an explicit conviction class for the legacy generic pardon witness;
// it cannot infer felony from the historical internal route identifier.
const expected = {
  'non-conviction-record-restriction-through-the-agency-prosecutor-process': ['guidance_only', 'ga.guidance_only_no_user_filed_court_petition'],
  'restriction-and-sealing-of-a-pardoned-felony': ['needs_more_info', 'ga.pardon_classification'],
  'retroactive-first-offender-treatment-under-42-8-66': ['needs_more_info', 'ga.route_identified_packet_not_yet_available'],
  'sb-288-misdemeanor-conviction-restriction-and-sealing': ['needs_review', 'ga.waiting_rule_not_executed'],
  'youthful-first-offender-restriction-route': ['needs_review', 'ga.route_presentation_conflicts_with_its_contract']
};
for (const w of witnesses) {
  const r = evaluate(w.finalAnswers), id = w.pathwayKey.slice(3);
  assert.equal(r.pathwayId, id); assert.equal(r.resultCode, expected[id][0]); assert.equal(r.reasons[0].code, expected[id][1]); assert.equal(r.paymentAllowed, false); checked++;
  if (id === 'restriction-and-sealing-of-a-pardoned-felony') {
    assert.deepEqual(r.missingQuestionIds, ['case_outcome']);
    assert.equal(r.packetPlan, undefined); checked += 2;
  }
}
console.log(JSON.stringify({ status: 'PASS', checked, outcomes, scope: 'Original GA First Offender candidate routing, seven stage/date boundaries, clarification, persistence and old candidate preservation. No composed-track, legal approval, packet, consent, payment or release acceptance.' }));
