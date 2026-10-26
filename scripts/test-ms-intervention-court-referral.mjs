// Q3 / GA12 Q-6714952fd5c5f751e9bb / GA17 Q-b020574fb5c9aa41e166: unpaid referral, never a petition.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutations = {
  option_removed: ['public-profile-projection.ts', '"41-29-150", "9-23-23", "other_or_unknown"', '"41-29-150", "other_or_unknown"'],
  referral_removed: ['evaluator.ts', 'interventionCourtReferralReason(profile, answers, preselectedPathway)', 'undefined'],
  wrong_result: ['evaluator.ts', '"guidance_only", [interventionReferral]', '"needs_review", [interventionReferral]'],
  implied_unknown_ignored: ['mississippi-intervention-referral.ts', 'if (answers.ms_icourt_implied_consent !== "no")', 'if (false)'],
  old_status_asked: ['screening-question-selection.ts', 'question.id !== "ms_program_record_status"', 'true'],
  preplea_payment_ignored: ['mississippi-intervention-referral.ts', 'if (answers.ms_icourt_payments === "no")', 'if (answers.ms_icourt_entry_posture === "sentenced_on_guilty_plea" && answers.ms_icourt_payments === "no")']
};
const mutation = process.argv[2];
if (mutation) {
  assert(mutations[mutation], 'Unknown mutation');
  register('data:text/javascript,' + encodeURIComponent(`import {writeSync} from "node:fs";let m;export function initialize(v){m=v}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/'+m[0]))return r;const s=String(r.source);if(s.split(m[1]).length!==2)throw Error('mutation anchor absent or repeated');writeSync(2,JSON.stringify({appliedMutation:m[3]})+String.fromCharCode(10));return {...r,source:s.replace(m[1],m[2])};}`), { data: [...mutations[mutation], mutation] });
}
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
// Reuse the existing MS completion-test seam for the real localized result component.
const contextFile = 'src/components/expungement-ai/LocalizationProvider.tsx';
const contextUrl = pathToFileURL(`${process.cwd()}/${contextFile}`).href;
const contextSource = ts.transpileModule(fs.readFileSync(contextFile, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(v){d=v}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: contextUrl, source: contextSource } });
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { t } = await import('../src/lib/expungement-ai/localization.ts');
const profile = getProfileByJurisdiction('MS'), pub = projectPublicProfile(profile);
assert(pub.questions.find(q => q.id === 'ms_program_order').options.includes('9-23-23'), 'The adopted intervention program must be selectable');
const { MS_INTERVENTION_ROUTE: route, MS_INTERVENTION_COPY: copy, MS_INTERVENTION_QUESTIONS: questions, msInterventionReferralCode } = await import('../src/lib/rcap-engine/mississippi-intervention-referral.ts');
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/conviction-fallback-predecessors.json')).rows.find(r => r.id === 'MS/Misdemeanor conviction/generic/omitted');
assert(fixture);
const base = { ...fixture.answers, ms_program_order: '9-23-23', ms_icourt_completed: 'completed',
  ms_icourt_entry_posture: 'sentenced_on_guilty_plea', ms_icourt_other_terms_done: 'yes', ms_icourt_payments: 'yes',
  ms_icourt_order_status: 'expunction', ms_icourt_docket_status: 'dismissed', ms_icourt_record_visible: 'yes', ms_icourt_implied_consent: 'no' };
delete base.possible_pathway_context;
let checks = 1;
const check = fn => { fn(); checks++; };
const outputs = [], renders = [];
for (const id of ['ms_icourt_entry_posture', 'ms_icourt_order_status', 'ms_icourt_docket_status', 'ms_icourt_record_visible']) {
  for (const bad of [[base[id]], { value: base[id], unknown: true }])
    check(() => assert.equal(msInterventionReferralCode({ ...base, [id]: bad }), 'records_confirmation', 'A malformed or uncertain fact cannot supply a scalar choice'));
}
const rows = [
  ['entered_order', {}],
  ['completed_no_order', { ms_icourt_order_status: 'none' }],
  ['pre_plea_dismissal', { ms_icourt_entry_posture: 'entered_before_plea', ms_icourt_order_status: 'dismissal' }],
  ['records_confirmation', { ms_icourt_entry_posture: 'plea_held_in_abeyance' }],
  ['records_confirmation', { ms_icourt_completed: 'disputed_or_unsure' }],
  ['records_confirmation', { ms_icourt_implied_consent: 'unknown' }],
  ['records_confirmation', { ms_icourt_order_status: 'unknown' }],
  ['records_confirmation', { ms_icourt_docket_status: 'pending' }],
  ['records_confirmation', { ms_icourt_docket_status: 'conviction' }],
  ['records_confirmation', { ms_icourt_completed: undefined }],
  ['records_confirmation', { ms_icourt_record_visible: 'unknown' }],
  ['records_confirmation', { ms_icourt_other_terms_done: 'unknown' }],
  ['records_confirmation', { ms_icourt_payments: 'unknown' }],
  ['incomplete', { ms_icourt_completed: 'not_completed' }],
  ['incomplete', { ms_icourt_other_terms_done: 'no' }],
  ['incomplete', { ms_icourt_payments: 'no' }],
  ['incomplete', { ms_icourt_entry_posture: 'entered_before_plea', ms_icourt_payments: 'no', ms_icourt_order_status: 'dismissal' }],
  ['records_confirmation', { ms_icourt_entry_posture: 'entered_before_plea', ms_icourt_payments: 'unknown', ms_icourt_order_status: 'dismissal' }],
  ['completed_no_order', { ms_icourt_order_status: 'dismissal' }],
  ['completed_no_order', { ms_icourt_order_status: 'completion_only' }],
  ['entered_order', { ms_icourt_order_status: 'dismissal_and_expunction' }],
  ['no_visible_record', { ms_icourt_record_visible: 'no' }],
  ['implied_consent', { ms_icourt_implied_consent: 'yes' }]
];
for (const [code, delta] of rows) {
  const answers = { ...base, ...delta }, before = structuredClone(answers);
  const request = { jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-Q3', answers };
  const a = evaluate(request), e = a.evaluation;
  check(() => assert.equal(e.pathwayId, route));
  check(() => assert.equal(e.resultCode, 'guidance_only'));
  check(() => assert.equal(e.paymentAllowed, false));
  check(() => assert.equal(e.packetPlan, undefined));
  // Existing authoritative adapter labels every guidance result this way; no plan or fulfillment follows.
  check(() => assert.equal(a.packetType, 'guidance_packet'));
  check(() => assert.deepEqual(e.reasons.map(r => r.code), ['ms.icourt_' + code]));
  check(() => assert.deepEqual(e.nextSteps, [copy[code][0]]));
  check(() => assert.equal(resolveRuntimeText('es', e.reasons[0].text), copy[code][1]));
  check(() => assert.deepEqual(answers, before));
  const ids = selectScreeningQuestionIds(profile, pub, answers);
  check(() => assert(!ids.includes('ms_program_record_status') && !ids.includes('ms_program_final_disposition')));
  for (const id of questions.map(q => q.id).filter(id => !['ms_icourt_other_terms_done', 'ms_icourt_payments'].includes(id)))
    check(() => assert(ids.includes(id), 'Actual referral question selected: ' + id));
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, answers, ids);
  check(() => assert.equal(resumed.case_outcome, before.case_outcome));
  check(() => assert.equal(resumed.ms_program_order, '9-23-23'));
  check(() => assert.equal(resumed.ms_icourt_order_status, before.ms_icourt_order_status));
  check(() => assert.equal(ids.includes('ms_icourt_other_terms_done'), answers.ms_icourt_entry_posture === 'sentenced_on_guilty_plea'));
  check(() => assert(ids.includes('ms_icourt_payments'), 'Assessed payments or waivers are asked for every entry posture'));
  const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) }));
  const body = await response.json();
  check(() => assert.equal(response.status, 200));
  check(() => assert.equal(body.pathwayId, route));
  check(() => assert.equal(body.paymentAllowed, false));
  check(() => assert.equal(body.consumerPacketAvailable, false));
  check(() => assert.equal(body.sponsoredPacketAvailable, false));
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: a, screeningAnswers: answers,
    packetAnswers: {}, dependencies: {}, capturedAt: '2026-10-23T00:00:00Z' });
  check(() => assert(seed, 'The guidance facts can be retained in the existing protected draft'));
  // Existing seed projection moves known disposition facts to prefills, preserving their literal value.
  check(() => assert.equal(seed.snapshot.prefilledAnswers.case_outcome, before.case_outcome));
  check(() => assert.equal(seed.snapshot.screeningAnswers.ms_icourt_order_status, before.ms_icourt_order_status));
  const saved = structuredClone(seed.snapshot), reevaluated = P.evaluateProtectedPacketFacts(seed.snapshot).evaluation;
  check(() => assert.equal(reevaluated.pathwayId, route));
  check(() => assert.equal(reevaluated.resultCode, 'guidance_only'));
  check(() => assert.equal(reevaluated.paymentAllowed, false));
  check(() => assert.equal(reevaluated.packetPlan, undefined));
  check(() => assert.deepEqual(seed.snapshot, saved));
  outputs.push({ code, delta, screeningAnswers: before, resumedAnswers: resumed, evaluation: e,
    protectedSnapshot: seed.snapshot, protectedHash: seed.hash, publicResponse: body, selectedQuestionIds: ids });
}
for (const code of Object.keys(copy)) for (const locale of ['en', 'es']) {
  const row = outputs.find(row => row.code === code);
  const value = { locale, setLocale: () => {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value },
    React.createElement(ScreeningResult, { evaluation: row.evaluation, stateName: 'Mississippi', hasScreeningSession: false,
      questionPromptById: Object.fromEntries(pub.questions.map(q => [q.id, q.prompt])) })));
  const escaped = renderToStaticMarkup(React.createElement('span', null, copy[code][locale === 'es' ? 1 : 0])).slice(6, -7);
  check(() => assert(markup.includes(escaped), `${code}: actual ${locale} guidance renders`));
  check(() => assert(!markup.includes('/checkout'), 'Guidance has no checkout link'));
  renders.push({ code, locale, markup });
}
for (const q of questions) {
  check(() => assert.equal(q.required, false));
  check(() => assert(q.translations.es.prompt && q.translations.es.prompt !== q.prompt));
}
const unrelated = { ...base, ms_program_order: '99-15-101' };
const unrelatedIds = selectScreeningQuestionIds(profile, pub, unrelated);
check(() => assert(questions.every(q => !unrelatedIds.includes(q.id)), 'No intervention questions on a different program'));
const baseline = evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-Q3', answers: base }).evaluation;
for (const hint of ['', 'Intervention-court completion — enforcement of the statutory result']) {
  check(() => assert.deepEqual(evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion,
    matterId: 'synthetic-Q3', answers: { ...base, possible_pathway_context: hint } }).evaluation, baseline));
}
for (const delta of [{ ownership_scope: 'No' }, { jurisdiction_scope: 'Federal' }]) {
  const e = evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-Q3', answers: { ...base, ...delta } }).evaluation;
  check(() => assert.notEqual(e.pathwayId, route, 'Original ownership/jurisdiction safeguards run before the referral'));
  check(() => assert.equal(e.paymentAllowed, false));
}
const rules = profile.orderedDecisionRules;
try {
  for (const drift of ['source', 'action', 'missing']) {
    profile.orderedDecisionRules = rules.flatMap(rule => rule.when?.backendPathwayId !== route ? [rule]
      : drift === 'missing' ? [] : [{ ...rule, ...(drift === 'source' ? { sourceRef: 'unreviewed-source' }
        : { then: { ...rule.then, frontendAction: 'unreviewed-action' } }) }]);
    const e = evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-Q3', answers: base }).evaluation;
    check(() => assert(!e.reasons.some(r => r.code.startsWith('ms.icourt_')), 'No referral reason without the exact compiled source rule'));
    check(() => assert.equal(e.paymentAllowed, false));
    check(() => assert.equal(e.packetPlan, undefined));
  }
} finally { profile.orderedDecisionRules = rules; }
console.log(JSON.stringify({ status: 'PASS_MS_INTERVENTION_UNPAID_REFERRAL', checks, cases: rows.length,
  publicHttpCases: rows.length, renderCount: renders.length, route, originalIds: ['Q-6714952fd5c5f751e9bb', 'Q-b020574fb5c9aa41e166'], outputs, renders }));
