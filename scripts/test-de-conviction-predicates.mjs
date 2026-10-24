import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DE_CONVICTION_BASE } from './lib/de-conviction-fixture.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register(`data:text/javascript,${encodeURIComponent('let d; export function initialize(data){d=data;} export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { delawareConvictionDecision, DE_CONVICTION_FACT_IDS, DE_CONVICTION_QUESTIONS, DE_REASON_TEXT, DE_COURT, DE_SBI } = await import('../src/lib/rcap-engine/delaware-conviction-rules.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText, t } = await import('../src/lib/expungement-ai/localization.ts');
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const profile = getProfileByJurisdiction('DE'), pub = projectPublicProfile(profile);
const rows = [], checks = [], renders = [], check = (pass, message) => checks.push({ pass: Boolean(pass), message });
const evaluate = answers => evaluateAuthoritativeScreeningResult({ jurisdiction: 'DE', profileVersion: profile.profileVersion, matterId: 'synthetic-de-boundary', answers }).evaluation;
const felony = { case_outcome: 'Felony conviction', offense_level: 'Felony', de_case_scope: 'one_felony' };
const violations = { case_outcome: 'Other conviction or adjudication', offense_level: 'Infraction or violation', de_case_scope: 'one_violations' };
function run(id, patch, expected, years) {
  const answers = { ...DE_CONVICTION_BASE, ...patch }, before = JSON.stringify(answers);
  const result = evaluate(answers), decision = delawareConvictionDecision(answers, process.env.RCAP_EVALUATOR_TODAY);
  rows.push({ id, evaluationDate: process.env.RCAP_EVALUATOR_TODAY, answers, expected, result, decision });
  check(result.resultCode === expected, `${id}: expected ${expected}, got ${result.resultCode} (${result.reasons.map(r => r.code)})`);
  if (years !== undefined) check(decision.years === years, `${id}: independent statutory period ${years}`);
  check(before === JSON.stringify(answers), `${id}: raw answers unchanged`);
  for (const surface of ['checkout creation', 'consumer payment authority', 'sponsored entitlement', 'packet generation', 'packet credit consumption', 'participant delivery']) check(!packetFulfillmentAuthority('DE', result.pathwayId, surface, { trackId: null }).allowed, `${id}: ${surface} remains refused`);
  return { result, decision, answers };
}
// Independent clause table: values transcribed from official §§4373(a),4374(a),
// not derived from the implementation's selected branch or duration.
const tiers = [
  ['court-a1', 3, true, {}],
  ['court-a2', 7, true, { de_mandatory_exclusions: ['11_1257'] }],
  ['court-a3', 7, true, felony],
  ['court-a4', 5, true, { de_case_scope: 'multiple_cases' }],
  ['mandatory-violation', 3, false, { ...violations, de_request: 'sbi' }],
  ['mandatory-misdemeanor', 5, false, { de_request: 'sbi' }],
  ['mandatory-drug', 5, false, { ...felony, de_request: 'sbi', de_special_convictions: '16_4756' }],
  ...['11_828', '11_861b2', '11_903', '16_4757', '16_4758', '16_4760'].map(code => [`mandatory-${code}`, 10, true, { ...felony, de_request: 'sbi', de_special_convictions: code }])
];
for (const [id, years, laterOf, patch] of tiers) for (const [day, elapsed] of [['13', false], ['12', true], ['11', true]]) {
  const anchor = `${2026 - years}-10-${day}`, positive = patch.de_request === 'sbi' ? 'guidance_only' : 'packet_ready_with_caution';
  for (const anchorId of ['conviction_date', 'release_date']) {
    const input = { ...patch, de_incarceration: 'released', conviction_date: anchorId === 'conviction_date' ? anchor : '2000-01-01', release_date: anchorId === 'release_date' ? anchor : '2000-01-01' };
    const ready = anchorId === 'release_date' && !laterOf || elapsed;
    run(`${id}-${day}-${anchorId}`, input, ready ? positive : 'not_yet', years);
  }
}
for (const special of ['16_4764', '16_4771', 'marijuana_paraphernalia', '4_904ef']) run(`mandatory-no-wait-${special}`, { de_request: 'sbi', de_special_convictions: special, conviction_date: '2026-10-12', de_other_convictions: ['other'] }, 'guidance_only', 0);
for (const flag of ['domestic', 'child', 'vulnerable', 'subparts', '11_625_sexual_charge', '11_763', '11_764', '11_765', '11_820', '11_841B', '11_916', '11_917', '11_1211', '11_1250', '11_1256', '11_1257', '11_1257A', '11_1304', '11_1313', '11_1332', '11_1335', '11_1341', '11_1343', '11_1355', '11_1443', '11_1445', '11_1456', '11_1457']) {
  run(`listed-court-${flag}`, { de_mandatory_exclusions: [flag] }, 'packet_ready_with_caution', 7);
  run(`listed-sbi-${flag}`, { de_request: 'sbi', de_mandatory_exclusions: [flag] }, 'likely_not_eligible');
  run(`listed-multi-${flag}`, { de_case_scope: 'multiple_cases', de_mandatory_exclusions: [flag] }, 'needs_review');
}
for (const flag of ['11_628A', '11_766', '11_767', '11_791', '11_1106']) for (const de_request of ['sbi', 'court']) run(`common-${flag}-${de_request}`, { de_request, de_common_exclusions: [flag] }, 'likely_not_eligible');
for (const flag of ['violent_felony', '16_1136', '31_3913', '31_309']) run(`court-bar-${flag}`, { ...felony, de_court_exclusions: [flag] }, 'likely_not_eligible');
run('title21-exception-court', { de_motor_vehicle: 'exceptions' }, 'packet_ready_with_caution', 3);
run('title21-exception-sbi', { de_request: 'sbi', de_motor_vehicle: 'exceptions' }, 'likely_not_eligible');
run('title21-other-court', { de_motor_vehicle: 'other' }, 'likely_not_eligible');
for (const history of ['underage', 'marijuana', 'paraphernalia', 'title21']) for (const de_request of ['court', 'sbi']) run(`history-safe-${history}-${de_request}`, { de_request, de_other_convictions: [history], new_convictions_during_waiting_period: 'Yes' }, de_request === 'court' ? 'packet_ready_with_caution' : 'guidance_only');
for (const de_request of ['court', 'sbi']) run(`history-other-${de_request}`, { de_request, de_other_convictions: ['other'] }, 'likely_not_eligible');
run('multiple-other-mandatory', { de_case_scope: 'multiple_cases', de_other_convictions: ['mandatory_standalone'], de_other_cases_individually_eligible: 'yes' }, 'packet_ready_with_caution', 5);
run('multiple-other-unconfirmed', { de_case_scope: 'multiple_cases', de_other_convictions: ['mandatory_standalone'] }, 'needs_more_info');
run('single-other-mandatory', { de_other_convictions: ['mandatory_standalone'] }, 'likely_not_eligible');
for (const pending of ['underage', 'marijuana', 'title21']) run(`pending-safe-${pending}`, { pending_cases: 'Yes', de_pending_charges: [pending] }, 'packet_ready_with_caution');
run('pending-other', { de_pending_charges: ['other'] }, 'not_yet');
for (const scope of ['incarceration', 'parole', 'probation']) run(`supervision-${scope}`, { de_supervision: scope }, 'not_yet');
run('sentence-incomplete', { sentence_completion_date: 'No' }, 'not_yet');
run('restitution-unpaid', { de_financial_status: 'unpaid_restitution' }, 'not_yet');
run('fines-unpaid', { de_financial_status: 'unpaid_other' }, 'not_yet');
run('court-waiver-request-not-order', { de_financial_status: 'nonwilful_fines', financial_obligations: 'No' }, 'needs_review');
run('court-waiver-entered', { de_financial_status: 'court_resolved' }, 'packet_ready_with_caution');
for (const [id, patch] of [['pending', { pending_cases: 'Yes' }], ['history', { new_convictions_during_waiting_period: 'Yes' }], ['money', { financial_obligations: 'No' }], ['class', { offense_level: 'Felony' }], ['no-incarceration', { release_date: '2000-01-01' }]]) run(`contradiction-${id}`, patch, 'needs_review');
for (const de_request of ['court', 'sbi']) run(`prior-felony-${de_request}`, { ...felony, de_request, de_special_convictions: '11_828', de_prior_expungement: 'felony', de_prior_expungement_date: '2020-01-01', conviction_date: '2021-01-01' }, de_request === 'court' ? 'likely_not_eligible' : 'not_yet');
run('prior-grant-pre-cutoff', { de_prior_expungement: 'conviction', de_prior_expungement_date: '2019-12-27' }, 'packet_ready_with_caution');
run('prior-grant-post-cutoff', { de_prior_expungement: 'conviction', de_prior_expungement_date: '2019-12-28' }, 'not_yet');
run('mandatory-prior-grant-exception', { de_request: 'sbi', de_prior_expungement: 'conviction', de_prior_expungement_date: '2026-10-11' }, 'guidance_only');
process.env.RCAP_EVALUATOR_TODAY = '2030-10-12';
try {
  for (const [day, expected] of [['13', 'not_yet'], ['12', 'packet_ready_with_caution'], ['11', 'packet_ready_with_caution']]) run(`prior-ten-year-${day}`, { de_prior_expungement: 'conviction', de_prior_expungement_date: `2020-10-${day}` }, expected);
} finally { process.env.RCAP_EVALUATOR_TODAY = '2026-10-12'; }
for (const [day, expected] of [['13', 'needs_review'], ['12', 'packet_ready_with_caution'], ['11', 'packet_ready_with_caution']]) run(`old-charge-${day}`, { de_all_charges: 'old_unresolved', de_latest_unresolved_charge_date: `2019-10-${day}`, de_active_warrant: 'no', de_recent_case_activity: 'no' }, expected);
for (const field of ['de_active_warrant', 'de_recent_case_activity']) run(`old-charge-${field}`, { de_all_charges: 'old_unresolved', de_latest_unresolved_charge_date: '2000-01-01', de_active_warrant: 'no', de_recent_case_activity: 'no', [field]: 'yes' }, 'needs_review');
run('whole-case-exclusion', { de_all_charges: 'other_ineligible' }, 'needs_review');
for (const field of ['de_request', 'de_case_scope', 'de_common_exclusions', 'de_mandatory_exclusions', 'de_court_exclusions', 'de_other_convictions', 'de_pending_charges', 'de_supervision', 'de_financial_status', 'de_incarceration']) for (const value of [undefined, 'unknown', 'forged']) {
  const multi = DE_CONVICTION_QUESTIONS.find(q => q.id === field).type === 'multi_select';
  const input = multi && value !== undefined ? [value] : value;
  if (multi && value === 'forged') {
    assert.throws(() => evaluate({ ...DE_CONVICTION_BASE, [field]: input }), { name: 'InvalidAnswerError', invalidQuestionIds: [field] });
    check(true, `${field}: malformed public choice is rejected before evaluation`);
  } else run(`missing-${field}-${String(value)}`, { [field]: input }, 'needs_more_info');
}
for (const field of ['conviction_date', 'release_date', 'de_prior_expungement_date', 'de_latest_unresolved_charge_date']) for (const value of [undefined, '', '2026-02-30', '2025-02-29', '2026-10-13', { unknown: true }, 'not-a-date']) {
  const patch = field === 'release_date' ? { de_incarceration: 'released' } : field === 'de_prior_expungement_date' ? { de_prior_expungement: 'conviction' } : field === 'de_latest_unresolved_charge_date' ? { de_all_charges: 'old_unresolved', de_active_warrant: 'no', de_recent_case_activity: 'no' } : {};
  const r = run(`invalid-${field}-${JSON.stringify(value)}`, { ...patch, [field]: value }, 'needs_more_info');
  check(r.result.missingQuestionIds.includes(field), `${field}: exact missing/invalid anchor requested`);
}
run('leap-date', { conviction_date: '2020-02-29' }, 'packet_ready_with_caution');
run('generic-disposition-irrelevant', { disposition_date: '2026-10-11', resolved_timing_bucket: 'lt_1_year' }, 'packet_ready_with_caution');
const saved = { ...DE_CONVICTION_BASE, release_date: '2001-01-01', de_incarceration: 'released' };
for (const sanitize of [answers => sanitizeAnswersForQuestionIds(answers, DE_CONVICTION_FACT_IDS, [], pub), answers => sanitizeResumedAnswersForQuestionIds(pub, answers, pub.questions.filter(q => !DE_CONVICTION_FACT_IDS.includes(q.id)).map(q => q.id))]) {
  const reloaded = JSON.parse(JSON.stringify(sanitize(saved)));
  for (const id of DE_CONVICTION_FACT_IDS.filter(id => saved[id] !== undefined)) check(JSON.stringify(reloaded[id]) === JSON.stringify(saved[id]), `saved-${id}: factual meaning retained across hidden/resumed branch`);
  check(JSON.stringify(evaluate(reloaded)) === JSON.stringify(evaluate(saved)), 'Canonical saved answers preserve evaluation');
}
for (const q of DE_CONVICTION_QUESTIONS) {
  check(Boolean(q.translations?.es?.prompt) && resolveRuntimeText('es', q.prompt) === q.translations.es.prompt, `${q.id}: EN/ES question/result prompts agree`);
  for (const option of q.options ?? []) check(Boolean(q.optionDisplay?.[option]?.translations?.es?.label), `${q.id}/${option}: ES option`);
}
const paths = [...profile.pathways], rules = [...profile.orderedDecisionRules];
try {
  for (const patch of [{}, { de_request: 'sbi' }, { de_case_scope: 'multiple_cases' }]) {
    const a = { ...DE_CONVICTION_BASE, ...patch }, expected = evaluate(a), questions = selectScreeningQuestionIds(profile, pub, a);
    for (const reverse of [false, true]) {
      profile.pathways = reverse ? [...paths].reverse() : paths; profile.orderedDecisionRules = reverse ? [...rules].reverse() : rules;
      for (const context of [undefined, 'None of these / I am not sure', ...paths.map(p => p.label)]) {
        check(JSON.stringify(evaluate({ ...a, possible_pathway_context: context })) === JSON.stringify(expected), 'Complete facts/request invariant to optional menu/Skip/rule order');
        check(JSON.stringify(selectScreeningQuestionIds(profile, pub, { ...a, possible_pathway_context: context })) === JSON.stringify(questions), 'Question set invariant to optional menu/order');
      }
    }
  }
} finally { profile.pathways = paths; profile.orderedDecisionRules = rules; }
for (const outcome of ['Pardoned conviction', 'Juvenile adjudication or offense committed as a minor', 'Dismissed, no-billed, nolle prosequi, or not prosecuted']) check(!selectScreeningQuestionIds(profile, pub, { ...DE_CONVICTION_BASE, case_outcome: outcome }).some(id => DE_CONVICTION_FACT_IDS.includes(id)), 'No adult-conviction questions on separate mechanisms');
for (const id of ['court-a1-12-conviction_date', 'court-a2-13-conviction_date', 'court-a4-12-conviction_date', 'mandatory-misdemeanor-12-conviction_date', 'listed-sbi-child', 'pending-safe-title21', 'restitution-unpaid', 'invalid-release_date-undefined', 'contradiction-class', 'old-charge-12']) {
  const row = rows.find(r => r.id === id); assert.ok(row, id);
  const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jurisdiction: 'DE', profileVersion: profile.profileVersion, matterId: 'synthetic-de-handler', answers: row.answers }) }));
  const body = await response.json(); check(response.status === 200 && body.resultCode === row.expected, `${id}: actual public handler ${response.status}/${body.resultCode}`);
  check(body.consumerPacketAvailable === false && body.sponsoredPacketAvailable === false, `${id}: both public commercial availability flags false`);
  rows.push({ id: `http-${id}`, expected: row.expected, http: response.status, result: body });
}
for (const [id, patch] of [['invalid-choice', { de_common_exclusions: ['forged'] }], ['conflicting-choices', { de_common_exclusions: ['none', '11_766'] }], ['unsupported-field', { court_requirements_completed: 'no' }]]) {
  const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jurisdiction: 'DE', profileVersion: profile.profileVersion, matterId: 'synthetic-de-invalid-handler', answers: { ...DE_CONVICTION_BASE, ...patch } }) }));
  const body = await response.json();
  check(response.status === 400, `${id}: actual public request validation refuses malformed facts`);
  rows.push({ id: `http-${id}`, http: response.status, result: body, expectedHttp: 400 });
}
// GA-20 Q-2d2f30305ce851b6d00f / Q-90d4c888e6c6a44246bf: preserve each procedure's exclusions and exceptions in both languages.
const renderCases = ['court-a1-12-conviction_date', 'mandatory-misdemeanor-12-conviction_date', 'court-a2-13-conviction_date', 'listed-sbi-child', 'court-waiver-request-not-order', 'invalid-release_date-undefined', 'contradiction-class',
  'common-11_766-court', 'court-bar-violent_felony', 'listed-court-child', 'listed-multi-child',
  'title21-exception-court', 'title21-exception-sbi', 'title21-other-court',
  'history-safe-marijuana-court', 'history-other-court', 'prior-felony-court'].map(id => {
  const row = rows.find(r => r.id === id);assert(row, id);return row;
});
for (const row of renderCases) for (const locale of ['en', 'es']) {
  const value = { locale, setLocale: () => {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(ScreeningResult, { evaluation: row.result, stateName: 'Delaware', questionPromptById: Object.fromEntries(pub.questions.map(q => [q.id, q.prompt])), hasScreeningSession: false, onEditAnswers: () => {}, onPacketAction: () => {} })));
  for (const reason of row.result.reasons.filter(r => Object.values(DE_REASON_TEXT).includes(r.text))) {
    const text = resolveRuntimeText(locale, reason.text), escaped = renderToStaticMarkup(React.createElement('span', null, text)).slice(6, -7);
    check(markup.includes(escaped), `${row.id}/${locale}: actual localized reason rendered`);
    if (locale === 'es') check(text !== reason.text && !markup.includes(reason.text), `${row.id}: no English reason fallback`);
  }
  for (const text of Object.values(DE_REASON_TEXT).filter(text => !row.result.reasons.some(reason => reason.text === text))) {
    const translated = resolveRuntimeText(locale, text);
    const escaped = renderToStaticMarkup(React.createElement('span', null, translated)).slice(6, -7);
    check(!markup.includes(escaped), `${row.id}/${locale}: unrelated Delaware reason is not shown: ${text}`);
  }
  for (const id of row.result.missingQuestionIds.filter(id => DE_CONVICTION_FACT_IDS.includes(id))) {
    const q = DE_CONVICTION_QUESTIONS.find(q => q.id === id), prompt = locale === 'es' ? q.translations.es.prompt : q.prompt;
    check(markup.includes(renderToStaticMarkup(React.createElement('span', null, prompt)).slice(6, -7)), `${id}/${locale}: missing prompt rendered`);
  }
  renders.push({ id: row.id, locale, markup });
}
check(rows.find(r => r.id === 'court-a1-12-conviction_date').result.pathwayId === DE_COURT, 'Exact court route retained');
check(rows.find(r => r.id === 'mandatory-misdemeanor-12-conviction_date').result.pathwayId === DE_SBI, 'Exact mandatory route retained');
const failed = checks.filter(c => !c.pass);
if (process.env.RCAP_DE_RECEIPT) fs.writeFileSync(process.env.RCAP_DE_RECEIPT, JSON.stringify({ checks, rows, renders, limits: ['Synthetic local/real stateless handler/SSR; no protected database persistence, court approval, independent legal/language review or release acceptance.'] }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: failed.length ? 'FAIL' : 'PASS', checks: checks.length, scenarios: rows.length, renders: renders.length, failed }));
assert.equal(failed.length, 0);
