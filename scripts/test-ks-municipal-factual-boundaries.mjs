import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.env.RCAP_KS_SCOPE_BASELINE) {
  const sources = Object.fromEntries(['src/lib/rcap-engine/evaluator.ts', 'src/lib/rcap-engine/screening-question-selection.ts'].map(file => [pathToFileURL(`${process.cwd()}/${file}`).href,
    ts.transpileModule(execFileSync('git', ['show', `${process.env.RCAP_KS_SCOPE_BASELINE}:${file}`], { encoding: 'utf8' }), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText]));
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`, { data: sources });
}
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateScreening, isCourtFiledPetitionRoute } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { KS_MUNICIPAL_CONVICTION, KS_MUNICIPAL_ARREST, KS_RECORD_SCOPE_FACT_IDS } = await import('../src/lib/rcap-engine/kansas-record-scope.ts');
const p = getProfileByJurisdiction('KS'), pub = projectPublicProfile(p), pathways = [...p.pathways], rules = [...p.orderedDecisionRules];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'KS');
const evaluate = answers => evaluateScreening({ jurisdiction: 'KS', profileVersion: p.profileVersion, matterId: 'synthetic-ks-scope', answers });
const summary = r => ({ pathwayId: r.pathwayId, resultCode: r.resultCode, paymentAllowed: r.paymentAllowed, reasons: r.reasons.map(r => r.code) });
if (process.env.RCAP_KS_SCOPE_SNAPSHOT) { console.log(JSON.stringify(witnesses.map(w => summary(evaluate(w.finalAnswers))))); process.exit(0); }
const base = { ...witnesses[0].finalAnswers, ks_record_court_scope: 'municipal_ordinance', case_outcome: 'Misdemeanor conviction' };
let checked = 0; const outcomes = [];
// City ordinance facts select the municipal family, even with a district label.
const corrected = evaluate(base);
assert.equal(corrected.pathwayId, KS_MUNICIPAL_CONVICTION, 'Municipal ordinance conviction must not become a district conviction from the optional label'); checked++;
const cases = [
  [base, KS_MUNICIPAL_CONVICTION],
  [{ ...base, case_outcome: 'Diversion, deferred disposition, supervision, or similar program', ks_diversion_fulfilled: 'yes' }, KS_MUNICIPAL_CONVICTION],
  [{ ...base, case_outcome: 'Diversion, deferred disposition, supervision, or similar program', ks_diversion_fulfilled: 'no' }, KS_MUNICIPAL_CONVICTION],
  ...['Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty'].map(case_outcome => [{ ...base, case_outcome }, KS_MUNICIPAL_ARREST])
];
for (const [answers, route] of cases) {
  const expected = evaluate(answers), questions = selectScreeningQuestionIds(p, pub, answers);
  assert.equal(expected.pathwayId, route); assert.equal(expected.paymentAllowed, false); checked += 2;
  outcomes.push(summary(expected));
  for (const reverse of [false, true]) {
    p.pathways = reverse ? [...pathways].reverse() : [...pathways]; p.orderedDecisionRules = reverse ? [...rules].reverse() : [...rules];
    for (const context of [undefined, '', ...pathways.map(p => p.label)]) {
      const variant = { ...answers, possible_pathway_context: context };
      assert.deepEqual(evaluate(variant), expected); assert.deepEqual(selectScreeningQuestionIds(p, pub, variant), questions); checked += 2;
    }
  }
  p.pathways = [...pathways]; p.orderedDecisionRules = [...rules];
}
for (const [change, missing] of [
  [{ ks_record_court_scope: 'other_or_unknown' }, ['ks_record_court_scope']],
  ...['Felony conviction', 'Other conviction or adjudication', 'Juvenile adjudication or offense committed as a minor', 'Pardoned conviction', 'I am not sure'].map(case_outcome => [{ case_outcome }, ['ks_record_court_scope', 'case_outcome']]),
  ...[undefined, 'other_or_unknown'].map(ks_diversion_fulfilled => [{ case_outcome: 'Diversion, deferred disposition, supervision, or similar program', ks_diversion_fulfilled }, ['ks_diversion_fulfilled']])
]) {
  for (const context of [undefined, ...pathways.map(p => p.label)]) {
    const r = evaluate({ ...base, ...change, possible_pathway_context: context });
    assert.equal(r.resultCode, 'needs_more_info'); assert.deepEqual(r.missingQuestionIds, missing); assert.equal(r.paymentAllowed, false); checked += 3;
  }
}
for (const scope of ['district_state_law', 'municipal_appealed_to_district']) {
  for (const outcome of ['Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty']) {
    for (const context of [undefined, ...pathways.map(p => p.label)]) {
      const r = evaluate({ ...base, ks_record_court_scope: scope, case_outcome: outcome, possible_pathway_context: context });
      assert.equal(r.pathwayId, undefined); assert.equal(r.resultCode, 'needs_review');
      assert.equal(r.reasons[0].code, 'ks.district_arrest_route_requires_binding'); assert.equal(r.paymentAllowed, false); checked += 4;
    }
  }
}
const unfinished = evaluate(cases[2][0]);
assert.equal(unfinished.resultCode, 'needs_review'); assert.equal(unfinished.reasons[0].code, 'ks.municipal_diversion_not_fulfilled'); checked += 2;
// Known hidden facts survive a change of record scope/outcome and save/resume.
for (const answers of [
  { ...cases[1][0], ks_record_court_scope: 'district_state_law' },
  { ...cases[1][0], case_outcome: 'Acquitted or found not guilty' }
]) {
  const selected = selectScreeningQuestionIds(p, pub, answers);
  assert.ok(!selected.includes('ks_diversion_fulfilled')); checked++;
  for (const restored of [sanitizeAnswersForQuestionIds(answers, pub.questions.map(q => q.id), selected, pub),
    sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(JSON.stringify(answers)), selected)]) {
    for (const id of KS_RECORD_SCOPE_FACT_IDS) { assert.equal(restored[id], answers[id]); checked++; }
  }
}
for (const id of KS_RECORD_SCOPE_FACT_IDS) {
  const q = pub.questions.find(q => q.id === id); assert.ok(q?.translations.es.prompt && q.translations.es.helperText); checked++;
  for (const value of q.options) { assert.ok(q.optionDisplay[value].translations.es.label); checked++; }
}
// The adopted KS02 contract and statute describe a petition. Correct the
// inaccurate guidance claim without declaring its unavailable packet ready.
assert.equal(isCourtFiledPetitionRoute(p, pathways.find(p => p.id === KS_MUNICIPAL_ARREST)), true); checked++;
for (const [answers, route] of cases.filter(([, route]) => route === KS_MUNICIPAL_ARREST)) {
  const r = evaluate(answers);
  assert.equal(r.resultCode, 'needs_more_info');
  assert.equal(r.reasons[0].code, 'ks.route_identified_packet_not_yet_available'); checked += 2;
}
const before = JSON.parse(fs.readFileSync(new URL('./fixtures/ks-scope-legacy-baseline.json', import.meta.url)));
// Retain the actual baseline file; explicitly account for the one corrected
// historical misclassification instead of overwriting its expected outcome.
const after = witnesses.map(w => summary(evaluate(w.finalAnswers)));
for (let i = 0; i < before.length; i++) {
  if (before[i].pathwayId === KS_MUNICIPAL_ARREST) {
    assert.equal(before[i].resultCode, 'guidance_only');
    assert.deepEqual(after[i], { pathwayId: KS_MUNICIPAL_ARREST, resultCode: 'needs_more_info', paymentAllowed: false,
      reasons: ['ks.route_identified_packet_not_yet_available'] }); checked += 2;
  } else { assert.deepEqual(after[i], before[i]); checked++; }
}
console.log(JSON.stringify({status:'PASS',checked,legacyWitnessesPreserved:witnesses.length - 1,legacyKindCorrected:1,outcomes,
  scope:'Municipal versus district record candidates, fulfillment distinction, specific clarification, optional menu/order invariance and raw-answer preservation. No new statutory eligibility, packet or commercial authority; other district discriminators and exact municipal timing/grounds remain open.'}));
