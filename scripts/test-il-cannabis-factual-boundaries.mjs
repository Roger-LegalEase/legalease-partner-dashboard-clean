import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.env.RCAP_IL_CANNABIS_BASELINE) {
  const sources = Object.fromEntries(['src/lib/rcap-engine/evaluator.ts', 'src/lib/rcap-engine/screening-question-selection.ts'].map(file => [pathToFileURL(`${process.cwd()}/${file}`).href,
    ts.transpileModule(execFileSync('git', ['show', `${process.env.RCAP_IL_CANNABIS_BASELINE}:${file}`], { encoding: 'utf8' }), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText]));
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`, { data: sources });
}
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { IL_CANNABIS_PATHWAY, IL_CANNABIS_FACT_IDS, illinoisCannabisFromAnswers } = await import('../src/lib/rcap-engine/illinois-cannabis-facts.ts');
const p = getProfileByJurisdiction('IL'), pub = projectPublicProfile(p), pathways = [...p.pathways], rules = [...p.orderedDecisionRules];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'IL');
const evaluate = answers => evaluateScreening({ jurisdiction: 'IL', profileVersion: p.profileVersion, matterId: 'synthetic-il-cannabis-boundary', answers });
if (process.env.RCAP_IL_CANNABIS_SNAPSHOT) {
  console.log(JSON.stringify(witnesses.map(w => evaluate(w.finalAnswers))));
  process.exit(0);
}
const legacy = witnesses.find(w => w.pathwayKey === `IL:${IL_CANNABIS_PATHWAY}`).finalAnswers;
const motion = { ...legacy, case_outcome: 'Misdemeanor conviction', il_cannabis_statute: '720_ILCS_550_4',
  il_cannabis_next_step: 'vacate_conviction', il_cannabis_conviction_class: 'misdemeanor', il_cannabis_nonfinancial_complete: 'yes' };
let checked = 0; const outcomes = [];
// Source independent: §5.2(i)(3) and adopted il-cannabis-vacate use nonfinancial
// completion. An unchanged actual unpaid answer cannot itself create a wait.
const unpaid = { ...motion, financial_obligations: 'No' }, unchanged = structuredClone(unpaid);
const corrected = evaluate(unpaid);
assert.equal(corrected.resultCode, 'needs_review', 'Unpaid balance alone is not an unmet nonfinancial condition');
assert.ok(corrected.reasons.some(r => r.code === 'il.cannabis_motion_source_contract_review'));
assert.equal(corrected.paymentAllowed, false); assert.deepEqual(unpaid, unchanged); checked += 4;
for (const financial_obligations of ['Yes', 'No', 'I am not sure', undefined]) {
  assert.deepEqual(evaluate({ ...motion, financial_obligations }), corrected); checked++;
}
const cases = [
  motion,
  { ...motion, il_cannabis_statute: '720_ILCS_550_5', case_outcome: 'Felony conviction', il_cannabis_conviction_class: 'class_4_felony' },
  { ...motion, il_cannabis_nonfinancial_complete: 'no' },
  { ...motion, case_outcome: 'Felony conviction', il_cannabis_conviction_class: 'other_felony' },
  ...['Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty',
    'Diversion, deferred disposition, supervision, or similar program', 'Misdemeanor conviction', 'Felony conviction']
    .map(case_outcome => ({ ...motion, case_outcome, il_cannabis_next_step: 'status_check' }))
];
try {
  for (const answers of cases) {
    const result = evaluate(answers), questions = selectScreeningQuestionIds(p, pub, answers);
    assert.equal(result.pathwayId, IL_CANNABIS_PATHWAY); assert.equal(result.paymentAllowed, false); checked += 2;
    if (answers.il_cannabis_nonfinancial_complete === 'no') {
      assert.equal(result.resultCode, 'not_yet'); assert.ok(result.reasons.some(r => r.code === 'il.cannabis_nonfinancial_conditions_incomplete')); checked++;
    }
    for (const reverse of [false, true]) {
      p.pathways = reverse ? [...pathways].reverse() : [...pathways]; p.orderedDecisionRules = reverse ? [...rules].reverse() : [...rules];
      for (const context of [undefined, '', 'Skip', ...pathways.map(p => p.label)]) {
        const changed = { ...answers, possible_pathway_context: context };
        assert.deepEqual(evaluate(changed), result);
        assert.deepEqual(selectScreeningQuestionIds(p, pub, changed), questions); checked += 2;
      }
    }
    outcomes.push({ case_outcome: answers.case_outcome, election: answers.il_cannabis_next_step, recordClass: answers.il_cannabis_conviction_class, resultCode: result.resultCode, reasons: result.reasons.map(r => r.code) });
  }
} finally { p.pathways = pathways; p.orderedDecisionRules = rules; }
const partials = [
  [{ il_cannabis_statute: 'other_or_unknown' }, ['il_cannabis_statute']],
  [{ il_cannabis_next_step: undefined }, ['il_cannabis_next_step']],
  [{ il_cannabis_next_step: 'invented_election' }, ['il_cannabis_next_step']],
  [{ il_cannabis_conviction_class: undefined }, ['il_cannabis_conviction_class']],
  [{ il_cannabis_conviction_class: 'other_or_unknown' }, ['il_cannabis_conviction_class']],
  [{ il_cannabis_nonfinancial_complete: undefined }, ['il_cannabis_nonfinancial_complete']],
  [{ il_cannabis_nonfinancial_complete: 'other_or_unknown' }, ['il_cannabis_nonfinancial_complete']],
  [{ case_outcome: 'Felony conviction' }, ['case_outcome', 'il_cannabis_conviction_class']],
  [{ il_cannabis_conviction_class: 'class_4_felony' }, ['case_outcome', 'il_cannabis_conviction_class']],
  ...['Other conviction or adjudication', 'Juvenile adjudication or offense committed as a minor', 'Pardoned conviction', 'I am not sure',
    'Diversion, deferred disposition, supervision, or similar program'].map(case_outcome => [{ case_outcome }, ['case_outcome']]),
  [{ case_outcome: 'Acquitted or found not guilty' }, ['case_outcome', 'il_cannabis_next_step']]
];
for (const [change, missing] of partials) {
  for (const context of [undefined, ...pathways.map(p => p.label)]) {
    const r = evaluate({ ...motion, ...change, possible_pathway_context: context });
    assert.equal(r.resultCode, 'needs_more_info'); assert.deepEqual(r.missingQuestionIds, missing); assert.equal(r.paymentAllowed, false); checked++;
  }
}
// Choosing other remedies does not erase the actual statute or old saved facts,
// and cannot be converted by this new helper into the cannabis motion election.
for (const answers of [{ ...motion, il_cannabis_next_step: 'other_relief' }, { ...motion, il_cannabis_statute: 'other_statute' }]) {
  assert.equal(illinoisCannabisFromAnswers(answers).status, 'not_applicable'); checked++;
  const selected = selectScreeningQuestionIds(p, pub, answers);
  for (const id of ['il_cannabis_conviction_class', 'il_cannabis_nonfinancial_complete']) assert.ok(!selected.includes(id));
  const switched = sanitizeAnswersForQuestionIds(answers, pub.questions.map(q => q.id), selected, pub);
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(JSON.stringify(answers)), selected);
  for (const id of IL_CANNABIS_FACT_IDS) { assert.equal(switched[id], answers[id]); assert.equal(resumed[id], answers[id]); checked += 2; }
}
// All other timing guards remain. Broad completion answers have not been
// rewritten to financial-only answers; their remaining ambiguity is explicit.
for (const change of [{ pending_cases: 'Yes' }, { new_convictions_during_waiting_period: 'Yes' },
  { court_requirements_completed: 'no' }, { sentence_completion_date: 'No' }]) {
  const r = evaluate({ ...unpaid, ...change }); assert.equal(r.resultCode, 'not_yet'); assert.equal(r.paymentAllowed, false); checked++;
}
const special = evaluate({ ...unpaid, special_preconditions_confirmed: 'No' });
assert.equal(special.resultCode, 'needs_review'); assert.ok(special.reasons.some(r => r.code === 'il.special_preconditions_unconfirmed')); checked++;
for (const id of IL_CANNABIS_FACT_IDS) {
  const q = pub.questions.find(q => q.id === id); assert.ok(q?.translations.es.prompt && q.translations.es.helperText); checked++;
  for (const value of q.options ?? []) { assert.ok(q.optionDisplay[value].translations.es.label); checked++; }
}
// Preserve the actual legacy outcomes against this change's accepted baseline;
// these historical synthetic witnesses are not positive source/legal evidence.
const before = [
  {
    "pathwayId": "adult-conviction-sealing",
    "resultCode": "packet_ready_with_caution",
    "paymentAllowed": true,
    "reasons": [
      "il.compiled_rule_match.rule-06-order-of-supervision-successfully-completed-expungement"
    ]
  },
  {
    "pathwayId": "adult-non-conviction-expungement",
    "resultCode": "not_covered_yet",
    "paymentAllowed": false,
    "reasons": [
      "il.intentional_unsupported_route"
    ]
  },
  {
    "pathwayId": "cannabis-specific-automatic-or-petition-expungement",
    "resultCode": "needs_review",
    "paymentAllowed": false,
    "reasons": [
      "il.waiting_rule_not_executed"
    ]
  },
  {
    "pathwayId": "criminal-identity-theft-mistaken-identity-relief",
    "resultCode": "needs_review",
    "paymentAllowed": false,
    "reasons": [
      "il.waiting_rule_not_executed"
    ]
  },
  {
    "pathwayId": "expungement-after-eligible-supervision-or-qualified-probation",
    "resultCode": "needs_review",
    "paymentAllowed": false,
    "reasons": [
      "il.waiting_rule_not_executed"
    ]
  },
  {
    "pathwayId": "felony-prostitution-relief",
    "resultCode": "likely_not_eligible",
    "paymentAllowed": false,
    "reasons": [
      "il.il_prostitution_felony_required_not_eligible"
    ]
  },
  {
    "pathwayId": "human-trafficking-survivor-vacatur-and-expungement",
    "resultCode": "not_covered_yet",
    "paymentAllowed": false,
    "reasons": [
      "il.intentional_unsupported_route"
    ]
  },
  {
    "pathwayId": "juvenile-automatic-or-petition-expungement",
    "resultCode": "not_covered_yet",
    "paymentAllowed": false,
    "reasons": [
      "il.intentional_unsupported_route"
    ]
  }
];
const summarize = r => ({pathwayId:r.pathwayId,resultCode:r.resultCode,paymentAllowed:r.paymentAllowed,reasons:r.reasons.map(r=>r.code)});
assert.deepEqual(witnesses.map(w => summarize(evaluate(w.finalAnswers))), before); checked += witnesses.length;
console.log(JSON.stringify({ status: 'PASS', checked, legacyWitnessesPreserved: witnesses.length, outcomes,
  scope: 'IL cannabis candidate facts and explicit election, nonfinancial versus money-paid boundary, final class clarification, hidden-answer retention, unchanged guards. Source/form conflicts and automatic-cohort conditions remain unresolved; no packet, payment, hosted or release acceptance.' }));
