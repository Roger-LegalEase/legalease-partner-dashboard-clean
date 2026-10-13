import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
// Expose the real provider's private context for SSR, without changing its code.
const contextFile = 'src/components/expungement-ai/LocalizationProvider.tsx';
const contextUrl = pathToFileURL(`${process.cwd()}/${contextFile}`).href;
const contextSource = ts.transpileModule(fs.readFileSync(contextFile, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register(`data:text/javascript,${encodeURIComponent('let data; export function initialize(value){data=value;} export async function load(url,context,next){return url===data.url?{format:"module",source:data.source,shortCircuit:true}:next(url,context);}')}`, { data: { url: contextUrl, source: contextSource } });
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText, t } = await import('../src/lib/expungement-ai/localization.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const profile = getProfileByJurisdiction('MS'), pub = projectPublicProfile(profile);
const rows = [], renders = [], checks = [], check = (pass, message) => checks.push({ pass: Boolean(pass), message });
for (const order of [undefined, "no_program_order", "other_or_unknown"]) {
  check(!selectScreeningQuestionIds(profile, pub, {...MS_NONCONVICTION_SCREENING_ANSWERS, ms_program_order: order}).includes("ms_program_record_status"), "No program status requested without an identified program");
}
for (const order of ["99-15-26", "99-15-101", "41-29-150"]) {
  check(selectScreeningQuestionIds(profile, pub, {...MS_NONCONVICTION_SCREENING_ANSWERS, ms_program_order: order}).includes("ms_program_record_status"), "Identified program still requests actual status");
}
const evaluate = answers => evaluateAuthoritativeScreeningResult({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-ms-completed-program', answers }).evaluation;
const surfaces = ['checkout creation', 'consumer payment authority', 'sponsored entitlement', 'packet generation', 'packet credit consumption', 'participant delivery'];
const programs = [['99-15-26', 'nonadjudication-under-99-15-26'], ['99-15-101', 'pretrial-intervention-or-diversion-expungement']];
for (const [program, pathway] of programs) {
  const base = { ...MS_NONCONVICTION_SCREENING_ANSWERS, possible_pathway_context: undefined, case_outcome: 'Diversion, deferred disposition, supervision, or similar program', ms_program_order: program, ms_program_record_status: 'completed_and_closed', ms_program_final_disposition: 'dismissed_and_closed', court_requirements_completed: 'yes', ms_program_arrest_release: 'arrested_and_released' };
  const run = (id, patch, expected) => {
    const answers = { ...base, ...patch }, before = JSON.stringify(answers), result = evaluate(answers);
    rows.push({ program, id, answers, result, expected });
    check(result.resultCode === expected, `${program}/${id}: expected ${expected}, got ${result.resultCode}`);
    check(!result.reasons.some(r => r.code === 'ms.waiting_rule_not_executed'), `${id}: actual event rule executes`);
    check(JSON.stringify(answers) === before, `${id}: raw answers unchanged`);
    for (const surface of surfaces) check(!packetFulfillmentAuthority('MS', result.pathwayId, surface, { trackId: null }).allowed, `${id}: actual ${surface} authority remains refused`);
    return result;
  };
  // These are completion-event positives, not an approval, court order or offer.
  for (const date of [undefined, '', '2026-10-12', '2026-10-11', '2000-01-01']) {
    const result = run('complete-' + String(date), { ms_program_completion_date: date }, 'packet_ready_with_caution');
    check(result.pathwayId === pathway, 'Exact program family retained');
  }
  for (const id of ['ms_program_final_disposition', 'ms_program_arrest_release']) for (const value of [undefined, 'unknown', 'forged']) run('missing-' + id + '-' + String(value), { [id]: value }, 'needs_more_info');
  for (const value of ['not_arrested', 'not_released']) run('arrest-release-' + value, { ms_program_arrest_release: value }, 'needs_review');
  for (const id of ['ms_program_completion_date', 'ms_program_disposition_date']) for (const value of ['2026-02-30', '2025-02-29', '2026-10-13', 'not-a-date', { unknown: true }]) {
    const result = run('invalid-' + id + '-' + JSON.stringify(value), { [id]: value }, 'needs_more_info');
    check(result.missingQuestionIds.includes(id), 'Exact invalid supplied date identified');
  }
  run('complete-same-day', { ms_program_completion_date: '2026-10-12', ms_program_disposition_date: '2026-10-12' }, 'packet_ready_with_caution');
  run('leap-day', { ms_program_completion_date: '2024-02-29', ms_program_disposition_date: '2024-03-01' }, 'packet_ready_with_caution');
  run('reversed-completion', { ms_program_completion_date: '2026-10-12', ms_program_disposition_date: '2026-10-11' }, 'needs_review');
  for (const [id, value] of [['court_requirements_completed', 'no'], ['pending_cases', 'Yes'], ['financial_obligations', 'No'], ['new_convictions_during_waiting_period', 'Yes']]) run('guard-' + id, { [id]: value }, 'not_yet');
  for (const value of [undefined, 'not_sure']) run('completion-unconfirmed-' + String(value), { court_requirements_completed: value }, 'needs_more_info');
  for (const stage of [undefined, 'revoked_or_unsuccessful', 'other_or_unknown']) run('stage-' + stage, { ms_program_record_status: stage }, 'needs_more_info');
  run('active-admission', { ms_program_record_status: 'active', court_requirements_completed: 'no' }, 'needs_review');
  for (const outcome of ['Misdemeanor conviction', 'Felony conviction']) run('contradictory-conviction-' + outcome, { case_outcome: outcome }, 'needs_more_info');
  for (const disposition of ['charges_dropped', 'no_disposition']) {
    const expected = program === '99-15-101' ? 'packet_ready_with_caution' : 'needs_more_info';
    run(disposition, { ms_program_record_status: 'completed_without_closure', ms_program_final_disposition: disposition }, expected);
    if (program === '99-15-101' && disposition === 'no_disposition') run('no-disposition-with-date', { ms_program_record_status: 'completed_without_closure', ms_program_final_disposition: disposition, ms_program_disposition_date: '2020-01-01' }, 'needs_review');
  }
  run('closure-contradiction', { ms_program_record_status: 'completed_without_closure', ms_program_final_disposition: 'dismissed_and_closed' }, 'needs_more_info');
  const ids = ['ms_program_arrest_release', 'ms_program_completion_date', 'ms_program_disposition_date'];
  for (const id of ids) {
    const question = pub.questions.find(q => q.id === id);
    check(selectScreeningQuestionIds(profile, pub, base).includes(id), 'Completion fact is actually askable');
    check(Boolean(question?.translations?.es?.prompt), 'Spanish question exists');
    check((question.options ?? []).every(o => question.optionDisplay[o].translations.es.label), 'Spanish options exist');
    for (const patch of [{ ms_program_record_status: 'active' }, { ms_program_order: '41-29-150' }, { ms_program_order: 'no_program_order' }]) check(!selectScreeningQuestionIds(profile, pub, { ...base, ...patch }).includes(id), 'No new questions on drug/admission/sibling paths');
  }
  const saved = { ...base, ms_program_completion_date: '2020-02-29', ms_program_disposition_date: '2020-03-01' };
  const hidden = sanitizeAnswersForQuestionIds(saved, ids, [], pub);
  for (const id of ids) {
    check(hidden[id] === saved[id], 'Previously visible program facts retained when hidden');
    check(sanitizeResumedAnswersForQuestionIds(pub, saved, [])[id] === saved[id], 'Resume preserves hidden program facts');
  }
  const reloaded = JSON.parse(JSON.stringify(hidden));
  check(JSON.stringify(evaluate({ ...saved, ...reloaded })) === JSON.stringify(evaluate(saved)), 'Saved canonical answers round trip without meaning change');
  const paths = [...profile.pathways], rules = [...profile.orderedDecisionRules], expected = evaluate(base), questions = selectScreeningQuestionIds(profile, pub, base);
  try {
    for (const reverse of [false, true]) {
      profile.pathways = reverse ? [...paths].reverse() : paths;
      profile.orderedDecisionRules = reverse ? [...rules].reverse() : rules;
      for (const context of [undefined, ...paths.map(p => p.label)]) {
        const answers = { ...base, possible_pathway_context: context };
        check(JSON.stringify(evaluate(answers)) === JSON.stringify(expected), 'Optional menu/Skip/order never changes complete factual result');
        check(JSON.stringify(selectScreeningQuestionIds(profile, pub, answers)) === JSON.stringify(questions), 'Optional menu/Skip/order never changes questions');
      }
    }
  } finally { profile.pathways = paths; profile.orderedDecisionRules = rules; }
  for (const [caseIndex, patch] of [{}, { court_requirements_completed: 'no' }, { ms_program_arrest_release: 'unknown' }, { ms_program_completion_date: '2026-02-30' }, { ms_program_final_disposition: 'no_disposition', ms_program_record_status: 'completed_without_closure' }].entries()) {
    const answers = { ...base, ...patch }, expected = evaluate(answers);
    const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-ms-completion-handler', answers }) }));
    const body = await response.json(); rows.push({ program, id: 'public-handler-' + caseIndex, patch, http: response.status, result: body });
    check(response.status === 200 && body.resultCode === expected.resultCode, 'Real stateless handler preserves expected outcome');
    check(body.consumerPacketAvailable === false && body.sponsoredPacketAvailable === false, 'Public API does not advertise invented commercial availability');
  }
}
for (const code of ['ms.program_completion_event_missing', 'ms.program_arrest_release_conflict', 'ms.program_completion_date_invalid', 'ms.program_completion_dates_conflict']) {
  const text = rows.flatMap(r => r.result.reasons ?? []).find(r => r.code === code)?.text;
  check(Boolean(text) && resolveRuntimeText('es', text) !== text, 'Spanish result explanation resolves: ' + code);
}
const renderCases = rows.filter(r => r.id === 'complete-undefined');
for (const code of ['ms.program_completion_event_missing', 'ms.program_arrest_release_conflict', 'ms.program_completion_date_invalid', 'ms.program_completion_dates_conflict']) {
  renderCases.push(rows.find(r => r.result.reasons?.some(reason => reason.code === code) && (code !== 'ms.program_completion_event_missing' || r.result.missingQuestionIds.includes('ms_program_arrest_release'))));
}
renderCases.push(rows.find(r => r.id.startsWith('invalid-ms_program_disposition_date')));
for (const row of renderCases) for (const locale of ['en', 'es']) {
  const value = { locale, setLocale: () => {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(ScreeningResult, { evaluation: row.result, stateName: 'Mississippi', hasScreeningSession: false, questionPromptById: Object.fromEntries(pub.questions.map(q => [q.id, q.prompt])), onEditAnswers: () => {}, onPacketAction: () => {} })));
  for (const reason of row.result.reasons.filter(r => r.code.startsWith('ms.program_'))) {
    const expectedText = resolveRuntimeText(locale, reason.text);
    const escaped = renderToStaticMarkup(React.createElement('span', null, expectedText)).slice(6, -7);
    check(markup.includes(escaped), `${row.id}: actual ${locale} result renders the expected explanation`);
    if (locale === 'es') check(!markup.includes(reason.text), `${row.id}: no English reason fallback`);
  }
  for (const id of row.result.missingQuestionIds.filter(id => ['ms_program_arrest_release', 'ms_program_completion_date', 'ms_program_disposition_date'].includes(id))) {
    const question = pub.questions.find(q => q.id === id);
    const prompt = locale === 'es' ? question.translations.es.prompt : question.prompt;
    const escaped = renderToStaticMarkup(React.createElement('span', null, prompt)).slice(6, -7);
    check(markup.includes(escaped), `${id}: actual ${locale} missing-fact prompt renders`);
  }
  renders.push({ program: row.program, id: row.id, locale, markup });
}
const failed = checks.filter(c => !c.pass);
if (process.env.RCAP_MS_COMPLETION_RECEIPT) fs.writeFileSync(process.env.RCAP_MS_COMPLETION_RECEIPT, JSON.stringify({ checks, rows, renders, limits: ['Source/pure/real handler execution only; no hosted staff login or database save acceptance.', 'New legal/Spanish copy is draft, not qualified review or commercial approval.'] }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: failed.length ? 'FAIL' : 'PASS', checks: checks.length, scenarios: rows.length, renders: renders.length, failed }));
assert.equal(failed.length, 0);
