import {msAdoptedCopyPredecessorView} from './lib/ms-adopted-copy-predecessor.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-16';
const receiptPath = process.env.RCAP_NY16055_RECEIPT;
if (receiptPath) assert(!fs.existsSync(receiptPath), 'Receipt must be fresh');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const compile = (name, source) => register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}') + '#' + Buffer.from(name).toString('hex'), {
  data: { url: pathToFileURL(name).href, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText }
});
const loc = path.resolve('src/components/expungement-ai/LocalizationProvider.tsx');
compile(loc, fs.readFileSync(loc, 'utf8') + '\nexport {LocalizationContext};');
const { LocalizationContext } = await import(pathToFileURL(loc).href);
const { default: React } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { safeUserFacingEngineText } = await import('../src/lib/expungement-ai/missing-fields.ts');
const { reviewedResultRouteLabel, reviewedResultText } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { resolveRoute } = await import('../src/lib/legal-authority/resolve-route.ts');
const H = await import('../src/lib/rcap-engine/ny-16055-guidance.ts');
const profile = getProfileByJurisdiction('NY'), pub = projectPublicProfile(profile);
const route = profile.pathways.find(p => p.id === H.NY_16055_ROUTE);
const checks = [], rows = [], check = (name, actual, expected) => { checks.push(name); assert.deepEqual(actual, expected, name); };
const original = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', offense_level: 'Misdemeanor', possible_pathway_context: route.label, pending_cases: 'Yes', resolved_timing_bucket: 'lt_1_year', court_requirements_completed: 'yes', state_exclusion_categories: ['Sex offense or registration'] };
const base = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Other conviction or adjudication', offense_level: 'Infraction or violation', pending_cases: 'No', resolved_timing_bucket: 'gt_10_years', court_requirements_completed: 'yes', state_exclusion_categories: ['None of these'] };
async function call(id, answers) {
  const before = structuredClone(answers), body = { jurisdiction: 'NY', profileVersion: profile.profileVersion, matterId: 'ny116-' + id, answers };
  const selected = selectScreeningQuestionIds(profile, pub, answers);
  const response = await POST(new Request('http://local.test/api/expungement-ai/evaluate', { method: 'POST', body: JSON.stringify(body) }));
  const result = await response.json();
  check(id + '/HTTP200', response.status, 200);
  check(id + '/exact-raw-preserved', answers, before);
  check(id + '/payment-closed', result.paymentAllowed, false);
  check(id + '/DTC-closed', result.consumerPacketAvailable, false);
  check(id + '/sponsorship-closed', result.sponsoredPacketAvailable, false);
  check(id + '/no-packet-plan', result.packetPlan, undefined);
  rows.push({ id, body, selected, result });
  return { selected, result };
}
check('source-current', H.ny16055SourceContract(profile), true);
for (const changed of [ { ...profile, profileVersion: 'changed' }, { ...profile, source: { ...profile.source, sourceCorpusSha256: 'changed' } }, { ...profile, jurisdiction: { ...profile.jurisdiction, code: 'NJ' } }, { ...profile, pathways: profile.pathways.map(p => p.id === H.NY_16055_ROUTE ? { ...p, legalAuthority: { ...p.legalAuthority, paymentAuthority: 'packet_checkout' } } : p) } ]) check('source-drift-refused', H.ny16055SourceContract(changed), false);
check('contract-drift-refused', H.ny16055SourceContract(profile, {}), false);
check('new-explicit-question', pub.questions.find(q => q.id === H.NY_16055_JUDGMENT_ID)?.options, H.NY_16055_QUESTION.options);
check('source-drift-does-not-register-fact', projectPublicProfile({ ...profile, profileVersion: 'changed' }).questions.some(q => q.id === H.NY_16055_JUDGMENT_ID), false);
check('other-state-does-not-register-fact', projectPublicProfile(getProfileByJurisdiction('NJ')).questions.some(q => q.id === H.NY_16055_JUDGMENT_ID), false);
const old = await call('original-B', structuredClone(original));
check('original-negative-remains-missing', old.result.resultCode, 'needs_more_info');
check('original-asks-actual-final-judgment', old.result.missingQuestionIds, [H.NY_16055_JUDGMENT_ID]);
check('original-not-qualified', old.result.pathwayId, undefined);
check('no-hidden-completion-question', old.selected.includes('sentence_completion_date'), false);
for (const value of ['violation', 'traffic_infraction']) {
  for (const hint of [undefined, route.label, 'skip', 'Automatic Clean Slate sealing under CPL 160.57']) {
    const answers = { ...base, [H.NY_16055_JUDGMENT_ID]: value, ...(hint === undefined ? {} : { possible_pathway_context: hint }) };
    const { result, selected } = await call(value + '/' + String(hint), answers);
    check('explicit-final-category-guidance', result.resultCode, 'guidance_only');
    check('fact-selected-exact-source-stage', result.pathwayId, H.NY_16055_ROUTE);
    check('current-factual-control-offered', selected.includes(H.NY_16055_JUDGMENT_ID), true);
    check('no-hidden-fact-invented', Object.hasOwn(answers, 'sentence_completion_date'), false);
  }
}
for (const hint of [undefined, route.label, 'skip']) {
  const { result } = await call('coarse-only/' + String(hint), { ...base, ...(hint === undefined ? {} : { possible_pathway_context: hint }) });
  check('coarse-charge-not-final-judgment', result.resultCode, 'needs_more_info');
  check('hint-does-not-select-stage', result.pathwayId, undefined);
  check('fresh-factual-answer-required', result.missingQuestionIds, [H.NY_16055_JUDGMENT_ID]);
}
for (const value of ['unknown', ['violation'], { value: 'violation', unknown: false }, 'unsupported']) {
  const { result } = await call('unknown/' + JSON.stringify(value), { ...base, [H.NY_16055_JUDGMENT_ID]: value });
  check('uncertainty-or-malformed-held', result.resultCode, 'needs_review');
  check('no-wrapped-answer-alias', result.pathwayId, undefined);
}
for (const value of ['favorable_termination', 'criminal_conviction', 'not_final']) {
  const { result } = await call('other-procedure/' + value, { ...base, [H.NY_16055_JUDGMENT_ID]: value });
  check('other-procedure-needs-own-review', result.resultCode, 'needs_review');
  check('no-alternate-procedure-invented', result.pathwayId, undefined);
}
for (const outcome of ['Misdemeanor conviction', 'Felony conviction', 'Dismissed, no-billed, nolle prosequi, or not prosecuted']) {
  const { result } = await call('conflict/' + outcome, { ...base, case_outcome: outcome, [H.NY_16055_JUDGMENT_ID]: 'violation' });
  check('conflict-held', result.resultCode, 'needs_review');
  check('conflict-asks-both-original-and-new', result.missingQuestionIds, ['case_outcome', H.NY_16055_JUDGMENT_ID]);
}
for (const value of ['Yes', 'No', 'I am not sure', { value: 'No', unknown: false }, { unknown: true, value: 'Earlier raw context' }]) {
  const { result } = await call('legacy-completion/' + JSON.stringify(value), { ...base, sentence_completion_date: value, [H.NY_16055_JUDGMENT_ID]: 'violation' });
  check('irrelevant-completion-not-new-bar', result.resultCode, 'guidance_only');
  check('completion-not-derived-into-final-category', result.pathwayId, H.NY_16055_ROUTE);
}
const aliasOnly = await call('legacy-alias-only', { ...base, sentence_completion_date: 'Yes' });
check('old-completion-does-not-attest-final-judgment', aliasOnly.result.missingQuestionIds, [H.NY_16055_JUDGMENT_ID]);
for (const value of [undefined, 'no', 'not_sure', 'not_applicable']) {
  const answers = { ...base, [H.NY_16055_JUDGMENT_ID]: 'violation' };
  if (value === undefined) delete answers.court_requirements_completed;
  else answers.court_requirements_completed = value;
  const { result } = await call('broad-completion/' + String(value), answers);
  check('broad-completion-not-a-16055-predicate/' + String(value), result.resultCode, 'guidance_only');
  check('broad-completion-does-not-gate-or-create-facts/' + String(value), result.missingQuestionIds, []);
}
const bucketResults = [];
for (const value of [undefined, 'not_sure', 'lt_1_year', 'years_1_to_2', 'gt_10_years']) {
  const answers = { ...base, [H.NY_16055_JUDGMENT_ID]: 'violation' };
  if (value === undefined) delete answers.resolved_timing_bucket;
  else answers.resolved_timing_bucket = value;
  const { result } = await call('irrelevant-wait-bucket/' + String(value), answers);
  check('bucket-not-a-verified-disposition-date/' + String(value), Object.hasOwn(answers, 'disposition_date'), false);
  bucketResults.push({ value: String(value), result: result.resultCode, missing: result.missingQuestionIds });
}
check('no-generic-wait-bucket-gate-or-date-inference', bucketResults, [undefined, 'not_sure', 'lt_1_year', 'years_1_to_2', 'gt_10_years'].map(value => ({ value: String(value), result: 'guidance_only', missing: [] })));
const pending = await call('pending-retained-not-new-source-bar', { ...base, pending_cases: 'Yes', [H.NY_16055_JUDGMENT_ID]: 'violation' });
check('no-invented-pending-condition', pending.result.resultCode, 'guidance_only');
for (const value of [['Sex offense or registration'], ['I am not sure']]) {
  const { result } = await call('retained-exclusion/' + value, { ...base, state_exclusion_categories: value, [H.NY_16055_JUDGMENT_ID]: 'violation' });
  check('existing-exclusion-or-uncertainty-not-erased', result.resultCode, 'needs_review');
  check('exclusion-does-not-confirm-stage', result.pathwayId, undefined);
}
for (const change of [{ ownership_scope: 'No' }, { jurisdiction_scope: 'Federal' }]) {
  const { result } = await call('scope-stop/' + JSON.stringify(change), { ...base, ...change, [H.NY_16055_JUDGMENT_ID]: 'violation' });
  check('scope-stop-retained', result.resultCode, 'hard_stop');
}
const ownershipUnknown = await call('ownership-unknown', { ...base, ownership_scope: 'I am not sure', [H.NY_16055_JUDGMENT_ID]: 'violation' });
check('scope-uncertainty-not-qualified', ownershipUnknown.result.resultCode, 'needs_review');
const selectedWithPetition = selectScreeningQuestionIds(profile, pub, { ...base, [H.NY_16055_JUDGMENT_ID]: 'violation', ny_16059_request: 'petition' });
check('typed-16059-election-takes-precedence', selectedWithPetition.includes(H.NY_16055_JUDGMENT_ID), false);
check('typed-16059-helper-inactive', H.ny16055Decision(profile, { ...base, [H.NY_16055_JUDGMENT_ID]: 'violation', ny_16059_request: 'petition' }), null);
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json', 'utf8')).witnesses;
for (const [suffix, expected] of [['160-58', '4ce79f060eebb597e992b5dbb6caa53a0f5e2d8687f66cda65bd1aa6bd03f7cf'], ['160-59', '76d8be069487af5a6afc6e352f917e52ce6b46cd3814602e7d210b0f191c5f2e']]) {
  const fixture = witnesses.find(w => w.jurisdiction === 'NY' && w.pathwayId.endsWith(suffix));
  const body = { jurisdiction: 'NY', profileVersion: fixture.profileVersion, matterId: 'ny116-sibling-' + suffix, answers: fixture.finalAnswers };
  const response = await POST(new Request('http://local.test/api/expungement-ai/evaluate', { method: 'POST', body: JSON.stringify(body) }));
  check('sibling-' + suffix + '-HTTP', response.status, 200);
  check('sibling-' + suffix + '-full-response-matches-actual-before', hash(await response.json()), expected);
  check('sibling-' + suffix + '-new-control-inactive', selectScreeningQuestionIds(profile, pub, fixture.finalAnswers).includes(H.NY_16055_JUDGMENT_ID), false);
}
const canonical = resolveRoute({ jurisdiction: 'NY', pathwayId: H.NY_16055_ROUTE, facts: {}, on: new Date('2026-10-16T00:00:00Z'), phase: 'PRELIMINARY_SCREENING' });
check('canonical-guidance-unchanged', canonical.serviceDisposition, 'process_guidance');
check('canonical-no-family', canonical.packetFamily, null);
for (const key of ['paymentAuthority', 'sponsorshipAuthority', 'generationAuthority', 'commercialDeliveryAuthority']) check('canonical-' + key, canonical[key], 'closed');
const catalog = JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', 'utf8'));
// Exact three returned draft terminology values; qualified NY08 finished-copy
// review remains pending. Preserve every binding and the adopted English.
const exactNyTerminologyEntries = [{"index":548,"copyKey":"other","entry":{"id":"NY16055-SOURCE-OTHER","originalEnglish":"This answer does not establish a final violation or traffic-infraction judgment. A favorable termination, criminal conviction or case without a final judgment needs its own procedure reviewed; no other route has been selected.","kind":"result_reason","en":"This answer does not establish a final violation or traffic-infraction judgment. A favorable termination, criminal conviction or case without a final judgment needs its own procedure reviewed; no other route has been selected.","es":"Esta respuesta no establece una resolución final por una infracción (violation) o infracción de tránsito. Una terminación favorable, una condena penal o un caso sin resolución final requiere revisar su propio procedimiento; no se ha seleccionado otra vía.","reviewStatus":"ENGINEERING_COPY_EXISTING_NY08_QUALIFIED_FINISHED_VERSION_REVIEW_PENDING","adoptedEnglishBasis":"NATIONAL-2026-08-28-C-NY-01;ny_160_55_violation"}},{"index":549,"copyKey":"guidance","entry":{"id":"NY16055-SOURCE-GUIDANCE","originalEnglish":"For a qualifying violation or traffic-infraction judgment, CPL 160.55 provides automatic partial sealing of specified records. It does not seal the court file or confirm that your record has been sealed. No initial petition is ordinarily filed for a qualifying disposition after November 1, 1991.","kind":"result_reason","en":"For a qualifying violation or traffic-infraction judgment, CPL 160.55 provides automatic partial sealing of specified records. It does not seal the court file or confirm that your record has been sealed. No initial petition is ordinarily filed for a qualifying disposition after November 1, 1991.","es":"Para una resolución que reúne los requisitos por una infracción (violation) o infracción de tránsito, CPL 160.55 dispone el sellado parcial automático de determinados registros. No sella el expediente del tribunal ni confirma que sus registros hayan sido sellados. Normalmente no se presenta una petición inicial para una resolución que reúne los requisitos posterior al 1 de noviembre de 1991.","reviewStatus":"ENGINEERING_COPY_EXISTING_NY08_QUALIFIED_FINISHED_VERSION_REVIEW_PENDING","adoptedEnglishBasis":"NATIONAL-2026-08-28-C-NY-01;ny_160_55_violation"}},{"index":554,"copyKey":null,"entry":{"id":"NY16055-CURRENT-ROUTE-DISPLAY","supersedesDisplayEntryId":"NY-RESULT-LABEL-automatic-non-conviction-sealing-under-cpl-160-50-160-55-v1","requiredReasonCode":"ny.partial_seal_guidance","originalEnglish":"Automatic non-conviction sealing under CPL 160.50 / 160.55","kind":"route_display_label","jurisdiction":"NY","pathwayId":"automatic-non-conviction-sealing-under-cpl-160-50-160-55","en":"Partial-sealing guidance for a New York violation or traffic infraction (CPL 160.55)","es":"Orientación sobre el sellado parcial por una infracción (violation) o infracción de tránsito en Nueva York (CPL 160.55)","reviewStatus":"ENGINEERING_COPY_EXISTING_NY08_QUALIFIED_FINISHED_VERSION_REVIEW_PENDING","adoptedEnglishBasis":"NATIONAL-2026-08-28-C-NY-01;ny_160_55_violation"}}];
for(const declared of exactNyTerminologyEntries){
  const {entry,index,copyKey}=declared;
  check(entry.id+'/unique exact catalog entry',catalog.entries.filter(value=>value.id===entry.id),[entry]);
  check(entry.id+'/stable original index',catalog.entries[index],entry);
  if(copyKey){
    check(entry.id+'/literal current source pair',H.NY_16055_COPY[copyKey],[entry.en,entry.es]);
    check(entry.id+'/actual reviewed result consumer',reviewedResultText(entry.originalEnglish),{en:entry.en,es:entry.es});
    for(const locale of ['en','es'])check(entry.id+'/actual runtime translation/'+locale,resolveRuntimeText(locale,entry.originalEnglish),entry[locale]);
  }
}
for(const [rowId,copyKey,reasonCode,status] of [
  ['violation/undefined','guidance','ny.partial_seal_guidance','guidance_only'],
  ['other-procedure/favorable_termination','other','ny.partial_seal_other','needs_review']
]){
  const row=rows.find(value=>value.id===rowId),entry=exactNyTerminologyEntries.find(value=>value.copyKey===copyKey).entry;
  check(rowId+'/natural exact English reason',row.result.reasons.filter(value=>value.code===reasonCode).map(value=>value.text),[entry.en]);
  check(rowId+'/unchanged result and closed authority',[row.result.resultCode,row.result.paymentAllowed,row.result.consumerPacketAvailable,row.result.sponsoredPacketAvailable],[status,false,false,false]);
}

const msCopyPredecessor=msAdoptedCopyPredecessorView(catalog);
check('all545-existing-copy-entries-unchanged', hash(msCopyPredecessor.entries.slice(0, 545)), 'c0a98d4e5a5816d01c073daa49078fd1c9a39ff270094c8c2667b367ce17990f');
check('all-existing-catalog-metadata-unchanged', hash(Object.fromEntries(Object.entries(msCopyPredecessor).filter(([k]) => k !== 'entries'))), '9cc075b062460eff354757dd50e3e96fab503ba5cc823407b92a707f9ca868b0');
const predecessor = catalog.entries.find(e => e.id === 'NY-RESULT-LABEL-automatic-non-conviction-sealing-under-cpl-160-50-160-55-v1');
const successor = catalog.entries.find(e => e.id === 'NY16055-CURRENT-ROUTE-DISPLAY');
const pair = e => ({ en: e.en, es: e.es });
check('no-reason-keeps-historical-display', reviewedResultRouteLabel('NY', H.NY_16055_ROUTE, route.label), pair(predecessor));
check('wrong-reason-keeps-historical-display', reviewedResultRouteLabel('NY', H.NY_16055_ROUTE, route.label, ['ny.partial_seal_unknown']), pair(predecessor));
check('actual-current-reason-admits-exact-successor', reviewedResultRouteLabel('NY', H.NY_16055_ROUTE, route.label, ['ny.partial_seal_guidance']), pair(successor));
const exactRouteTerminology=exactNyTerminologyEntries.find(value=>value.entry.id==='NY16055-CURRENT-ROUTE-DISPLAY').entry;
check('actual-current-route exact returned ENES',reviewedResultRouteLabel('NY',H.NY_16055_ROUTE,route.label,['ny.partial_seal_guidance']),{en:exactRouteTerminology.en,es:exactRouteTerminology.es});
check('wrong-state-does-not-admit-successor', reviewedResultRouteLabel('NJ', H.NY_16055_ROUTE, route.label, ['ny.partial_seal_guidance']), null);
for (const entry of catalog.entries.filter(e => e.kind === 'route_display_label' && e.jurisdiction === 'NY' && e.pathwayId !== H.NY_16055_ROUTE && e.id !== "NYMRTA-CURRENT-STAGE-DISPLAY")) check('other-NY-route-label-unchanged/' + entry.id, reviewedResultRouteLabel('NY', entry.pathwayId, entry.originalEnglish, ['ny.partial_seal_guidance']), pair(entry));
const mrtaOld = catalog.entries.find(e => e.id === "NY-RESULT-LABEL-marijuana-record-destruction-under-the-mrta-v1");
const mrtaCurrent = catalog.entries.find(e => e.id === "NYMRTA-CURRENT-STAGE-DISPLAY");
check('exact-new-MRTA-successor-wrong-NY116-reason-keeps-predecessor', reviewedResultRouteLabel('NY', mrtaOld.pathwayId, mrtaOld.originalEnglish, ['ny.partial_seal_guidance']), pair(mrtaOld));
check('exact-new-MRTA-successor-current-reason-only', reviewedResultRouteLabel('NY', mrtaOld.pathwayId, mrtaOld.originalEnglish, ['ny.mrta_stage_guidance']), pair(mrtaCurrent));
// Feed altered catalog fixtures to the unchanged production reader body. The
// tracked catalog and every historical entry remain untouched by these probes.
async function withCatalog(changed) {
  const source = fs.readFileSync('src/lib/expungement-ai/reviewed-result-copy.ts', 'utf8').replace('import catalog from "@/lib/expungement-ai/frontend/reviewed-result-display-copy.json";', 'const catalog = ' + JSON.stringify(changed) + ';');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return (await import('data:text/javascript,' + encodeURIComponent(javascript))).reviewedResultRouteLabel;
}
for (const [name, change] of [
  ['duplicate-successor', c => c.entries.push(structuredClone(successor))],
  ['missing-predecessor', c => { c.entries = c.entries.filter(e => e.id !== predecessor.id); }],
  ['wrong-source-reason-binding', c => { c.entries.find(e => e.id === successor.id).requiredReasonCode = 'ny.unrelated'; }],
  ['wrong-predecessor-binding', c => { c.entries.find(e => e.id === successor.id).supersedesDisplayEntryId = 'unrelated'; }],
  ['unbound-conflicting-pair', c => { const s = c.entries.find(e => e.id === successor.id); delete s.requiredReasonCode; delete s.supersedesDisplayEntryId; }]
]) {
  const changed = structuredClone(catalog); change(changed);
  check(name + '/ambiguous-label-refused', (await withCatalog(changed))('NY', H.NY_16055_ROUTE, route.label, ['ny.partial_seal_guidance']), null);
}
for (const field of ['pathwayId', 'originalEnglish']) {
  const changed = structuredClone(catalog); changed.entries.find(e => e.id === successor.id)[field] = 'other-route-or-source';
  check(field + '/successor-cannot-cross-scope', (await withCatalog(changed))('NY', H.NY_16055_ROUTE, route.label, ['ny.partial_seal_guidance']), pair(predecessor));
}
for (const [key, [en, es]] of Object.entries(H.NY_16055_COPY)) {
  check(key + '/actual-EN-display', safeUserFacingEngineText(en, { locale: 'en' }), en);
  check(key + '/actual-ES-display', safeUserFacingEngineText(en, { locale: 'es' }), es);
}
const rendered = [];
for (const locale of ['en', 'es']) {
  const question = pub.questions.find(q => q.id === H.NY_16055_JUDGMENT_ID);
  const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value: { locale, setLocale() {}, t: (k, fallback, vars) => t(locale, k, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) } }, React.createElement(QuestionField, { question, stateCode: 'NY', value: undefined, onChange() {} })));
  check(locale + '/actual-final-judgment-question', markup.includes(locale === 'en' ? question.prompt : question.translations.es.prompt), true);
  for (const option of question.options) check(locale + '/all-source-category-options/' + option, markup.includes(locale === 'en' ? question.optionDisplay[option].label : question.optionDisplay[option].translations.es.label), true);
  rendered.push({ id: 'actual-question-field', locale, markup });
}
for (const row of [rows.find(r => r.id === 'original-B'), rows.find(r => r.id === 'violation/undefined'), rows.find(r => r.id === 'unknown/"unknown"'), rows.find(r => r.id === 'other-procedure/favorable_termination')]) {
  for (const locale of ['en', 'es']) {
    const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value: { locale, setLocale() {}, t: (k, fallback, vars) => t(locale, k, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) } }, React.createElement(ScreeningResult, { evaluation: row.result, stateName: 'New York', questionPromptById: Object.fromEntries(pub.questions.map(q => [q.id, q.prompt])), onEditAnswers() {}, onPacketAction() {} })));
    check(row.id + '/' + locale + '/no-packet-promise', /prepare the right packet|preparar el paquete correcto/.test(markup), false);
    if (row.result.pathwayId === H.NY_16055_ROUTE) {
      check(locale + '/current-partial-seal-label', markup.includes(locale === 'en' ? 'Partial-sealing guidance for a New York violation or traffic infraction' : 'Orientación sobre el sellado parcial por una infracción (violation) o infracción de tránsito'), true);
      check(locale + '/no-old-16050-result-label', markup.includes('CPL 160.50 / 160.55'), false);
      check(locale + '/partial-effect-boundary', markup.includes(locale === 'en' ? 'It does not seal the court file' : 'No sella el expediente del tribunal'), true);
    }
    const literalTerminology=exactNyTerminologyEntries.find(value=>value.copyKey && row.result.reasons.some(reason=>reason.text===value.entry.en));
    if(literalTerminology){
      const expected=renderToStaticMarkup(React.createElement('span',null,literalTerminology.entry[locale])).slice(6,-7);
      check(row.id+'/'+locale+'/exact returned terminology rendered',markup.includes(expected),true);
    }
    const text = row.result.reasons.find(r => r.code.startsWith('ny.partial_seal_'))?.text;
    const expected = Object.values(H.NY_16055_COPY).find(pair => pair[0] === text)?.[locale === 'en' ? 0 : 1];
    check(row.id + '/' + locale + '/literal-current-copy-rendered', Boolean(expected && markup.includes(expected)), true);
    if (row.id === 'original-B' && locale === 'es') {
      check('actual-ES-missing-field-prompt-localized', markup.includes(H.NY_16055_QUESTION.translations.es.prompt), true);
      check('actual-ES-missing-field-no-English-prompt', markup.includes(H.NY_16055_QUESTION.prompt), false);
    }
    rendered.push({ id: row.id, locale, markup });
  }
}
const result = { status: 'PASS_BOUNDED_PUBLIC_SOURCE_STAGE', checks: checks.length, rows, rendered, canonical, limits: ['Actual isolated production POST and ENES SSR, no database/browser/authenticated owner/hosted proof.', 'Existing NY08 qualified finished-version review remains pending for new copy; no professional bilingual or legal approval.', 'Only original116; no MRTA/CleanSlate execution, source/family rebuild, output/delivery or wholeGA42 acceptance.'] };
if (receiptPath) fs.writeFileSync(receiptPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ status: result.status, checks: checks.length, actualHandlerCases: rows.length, actualSSR: rendered.length, qualifiedFinishedVersionApproval: false }));
