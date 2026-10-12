import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NY_HISTORY_CLOCK_BASE, NY_LEGACY_BASE } from './lib/ny-history-clock-fixture.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register(`data:text/javascript,${encodeURIComponent('let d; export function initialize(data){d=data;} export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { ny16059Clock, NY_16059_FACT_IDS, NY_16059_QUESTIONS, NY_16059_REASON_COPY, NY_16059_ROUTE, NY_16059_LEGACY_IDS } = await import('../src/lib/rcap-engine/new-york-16059-facts.ts');
const { saveScreeningSession, loadScreeningSession } = await import('../src/lib/expungement-ai/screening-session-persistence.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText, t } = await import('../src/lib/expungement-ai/localization.ts');
const { ScreeningResult } = await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const profile = getProfileByJurisdiction('NY'), pub = projectPublicProfile(profile);
const rows = [], checks = [], renders = [], check = (pass, message) => checks.push({ pass: Boolean(pass), message });
const evaluate = answers => evaluateAuthoritativeScreeningResult({ jurisdiction: 'NY', profileVersion: profile.profileVersion, matterId: 'synthetic-ny-history-clock', answers }).evaluation;
function run(id, patch, expected, today = '2026-10-12') {
 process.env.RCAP_EVALUATOR_TODAY = today;
 const answers = {...NY_HISTORY_CLOCK_BASE,...patch}, before=structuredClone(answers), result=evaluate(answers), clock=ny16059Clock(answers,today);
 rows.push({id,expected,today,answers,result,clock});
 check(result.resultCode===expected,`${id}: expected ${expected}, got ${result.resultCode} (${result.reasons.map(r=>r.code)})`);
 check(JSON.stringify(answers)===JSON.stringify(before),`${id}: raw answers retained`);
 for(const surface of ['checkout creation','consumer payment authority','sponsored entitlement','packet generation','packet credit consumption','participant delivery']) check(!packetFulfillmentAuthority('NY',result.pathwayId,surface,{trackId:null}).allowed,`${id}: ${surface} held`);
 return rows.at(-1);
}
// Expectations follow CPL160.59(1)(a),(2),(3)(b,c,e,f,h),(4),(5), the retained
// NY source decision and official pro se instructions. No evaluator-derived oracle.
run('one-misdemeanor',{},'packet_ready_with_caution');
for(const total of [1,2,3,4])for(const felonies of [0,1,2,3]) run(`history-${total}-${felonies}`,{ny_16059_history_total:total,ny_16059_history_felonies:felonies},felonies>total?'needs_review':total>2||felonies>1?'likely_not_eligible':'packet_ready_with_caution');
run('other-ineligible-history-counts',{ny_16059_history_total:3,ny_16059_requested_excluded:'No',ny_16059_ineligible_offense:'Yes'},'likely_not_eligible');
run('other-ineligible-not-target-bar',{ny_16059_history_total:2,ny_16059_requested_excluded:'No',ny_16059_ineligible_offense:'Yes'},'packet_ready_with_caution');
run('target-ineligible',{ny_16059_requested_excluded:'Yes'},'likely_not_eligible');
for(const value of [undefined,'I am not sure','forged']) run(`target-unconfirmed-${value}`,{ny_16059_requested_excluded:value},'needs_review');
run('two-requested',{ny_16059_history_total:2,ny_16059_requested_total:2},'packet_ready_with_caution');
run('single-act-eligible-group',{ny_16059_history_total:3,ny_16059_requested_total:3,ny_16059_grouping:'single_act'},'packet_ready_with_caution');
run('single-act-two-felonies',{case_outcome:'Felony conviction',offense_level:'Felony',ny_16059_history_total:2,ny_16059_history_felonies:2,ny_16059_requested_total:2,ny_16059_requested_felonies:2,ny_16059_grouping:'single_act'},'packet_ready_with_caution');
run('same-act-ineligible-not-grouped',{ny_16059_history_total:3,ny_16059_requested_total:3,ny_16059_grouping:'single_act',ny_16059_requested_excluded:'Yes'},'needs_review');
for(const grouping of ['connected','other_groups'])run(`grouping-${grouping}`,{ny_16059_grouping:grouping,ny_16059_transaction_time_circumstance:'Yes',ny_16059_transaction_integral_purpose:'No',ny_16059_transaction_shared_docket_only:'No',ny_16059_transaction_multiple_victims:'No'},'needs_review');
for(const status of ['none','denied','pending','mixed'])run(`application-${status}`,{ny_16059_application_status:status},'packet_ready_with_caution');
run('one-prior-order-remaining',{ny_16059_history_total:2,ny_16059_granted_total:1,ny_16059_application_status:'granted',ny_16059_prior_sealing:'Yes'},'packet_ready_with_caution');
run('prior-felony-misdemeanor-request',{ny_16059_history_total:2,ny_16059_history_felonies:1,ny_16059_granted_total:1,ny_16059_granted_felonies:1,ny_16059_application_status:'granted'},'packet_ready_with_caution');
run('exhausted',{ny_16059_history_total:3,ny_16059_granted_total:2,ny_16059_application_status:'granted'},'likely_not_eligible');
run('16058-grant-needs-order-review',{ny_16059_16058_grants:'granted',ny_16059_16058_treatment_count:1,ny_16059_16058_additional_count:0},'needs_review');
for(const patch of [{ny_16059_requested_total:0},{ny_16059_requested_total:2},{ny_16059_requested_felonies:1},{ny_16059_granted_total:1},{ny_16059_application_status:'granted'},{case_outcome:'Felony conviction',offense_level:'Felony'}])run(`contradiction-${JSON.stringify(patch)}`,patch,'needs_review');
for(const id of ['ny_16059_history_total','ny_16059_history_felonies','ny_16059_requested_total','ny_16059_requested_felonies','ny_16059_granted_total','ny_16059_granted_felonies'])for(const value of [undefined,-1,0.5,'I am not sure','not a count',''])run(`count-${id}-${value}`,{[id]:value},'needs_more_info');
for(const id of ['ny_16059_grouping','ny_16059_application_status','ny_16059_16058_grants'])for(const value of [undefined,'unknown'])run(`missing-${id}-${value}`,{[id]:value},'needs_more_info');
run('legacy-only',Object.fromEntries(NY_16059_FACT_IDS.map(id=>[id,undefined])),'needs_more_info');
// Independent fixed dates: one day before/on/after ten calendar years.
for(const [date,expected]of [['2016-10-13','not_yet'],['2016-10-12','packet_ready_with_caution'],['2016-10-11','packet_ready_with_caution']])run(`anniversary-${date}`,{sentencing_date:date},expected);
run('bucket-not-anchor',{sentencing_date:undefined},'needs_more_info');
for(const id of ['sentencing_date','release_date','ny_16059_earliest_conviction_date'])for(const value of ['2016-02-30','2015-02-29','2099-01-01','unknown','','2010-13-01'])run(`invalid-${id}-${value}`,{[id]:value},'needs_more_info');
run('leap-before',{sentencing_date:'2016-02-29'},'not_yet','2026-02-28');
run('leap-on',{sentencing_date:'2016-02-29'},'packet_ready_with_caution','2026-03-01');
// 2018 non-sentence detention is 365 excluded days; overlapping inputs form a
// union, not two clocks. Fixed threshold is 2027-10-12, independently calculated.
const detention={sentencing_date:'2016-10-12',ny_16059_incarceration_history:'released',ny_16059_incarceration_periods:'2018-01-01/2019-01-01'};
for(const[today,expected]of [['2027-10-11','not_yet'],['2027-10-12','packet_ready_with_caution'],['2027-10-13','packet_ready_with_caution']]){const row=run(`detention-${today}`,detention,expected,today);check(row.clock.eligibleOn==='2027-10-12','Exact 365-day extension');}
for(const periods of ['2018-06-01/2019-01-01\n2018-01-01/2018-08-01','2018-01-01/2019-01-01\n2018-01-01/2019-01-01','2018-01-01/2018-06-01\n2018-06-01/2019-01-01']){const row=run(`union-${periods}`,{...detention,ny_16059_incarceration_periods:periods},'packet_ready_with_caution','2027-10-12');check(row.clock.excludedDays===365,'Union counts each day once');}
const sentenced={ny_16059_sentence_incarceration:'Yes',ny_16059_incarceration_history:'released',sentencing_date:'2010-01-01',release_date:'2011-01-01',ny_16059_incarceration_periods:'2010-01-01/2011-01-01'};
run('release-before',sentenced,'not_yet','2020-12-31');
run('release-interpretation-boundary',sentenced,'needs_review','2021-01-01');
run('release-both-interpretations-met',sentenced,'packet_ready_with_caution','2022-01-01');
run('release-required',{...sentenced,release_date:undefined},'needs_more_info');
run('periods-required',{...sentenced,ny_16059_incarceration_periods:undefined},'needs_more_info');
run('still-incarcerated',{ny_16059_incarceration_history:'current'},'not_yet');
for(const raw of ['2019-01-01/2018-01-01','2018-02-30/2019-01-01','2018-01-01/2099-01-01','2018-01-01/unknown','2018-01-01','unknown',''])run(`bad-period-${raw}`,{...detention,ny_16059_incarceration_periods:raw},'needs_more_info');
run('sentence-before-conviction',{ny_16059_earliest_conviction_date:'2011-01-01'},'needs_review');
run('release-before-sentence',{...sentenced,release_date:'2008-01-01'},'needs_review');
run('release-period-conflict',{...sentenced,release_date:'2012-01-01'},'needs_review');
run('denied-incarceration-with-release',{release_date:'2011-01-01'},'needs_review');
run('later-conviction',{ny_16059_later_conviction_entered:'Yes'},'likely_not_eligible');
run('undisposed-arrest',{ny_16059_undisposed_arrest:'Yes'},'likely_not_eligible');
for (const id of NY_16059_LEGACY_IDS) run(`legacy-uncertain-${id}`,{[id]:'I am not sure'},'packet_ready_with_caution');
run('exact-date-resolves-bucket',{resolved_timing_bucket:'I am not sure'},'packet_ready_with_caution');
run('old-crime-not-new-conviction',{ny_16059_post_last_conviction_crime:'Yes'},'packet_ready_with_caution');
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
for (const id of ['sentencing_date','ny_16059_earliest_conviction_date']) check(selectScreeningQuestionIds(profile,pub,NY_HISTORY_CLOCK_BASE).includes(id),`${id}: actual timing input reachable`);
check(selectScreeningQuestionIds(profile,pub,{...NY_HISTORY_CLOCK_BASE,...sentenced}).includes('release_date'),'Release input reachable when required');
check(!selectScreeningQuestionIds(profile,pub,NY_HISTORY_CLOCK_BASE).includes('release_date'),'No unnecessary release input for noncustodial sentence');
const paths=[...profile.pathways],rules=[...profile.orderedDecisionRules];
try{const expected=evaluate(NY_HISTORY_CLOCK_BASE),selected=selectScreeningQuestionIds(profile,pub,NY_HISTORY_CLOCK_BASE);for(const reverse of [false,true]){profile.pathways=reverse?[...paths].reverse():paths;profile.orderedDecisionRules=reverse?[...rules].reverse():rules;for(const context of [undefined,'None of these / I am not sure',...paths.map(p=>p.label)]){const a={...NY_HISTORY_CLOCK_BASE,possible_pathway_context:context};check(JSON.stringify(evaluate(a))===JSON.stringify(expected),'Complete facts menu/Skip/order invariant');check(JSON.stringify(selectScreeningQuestionIds(profile,pub,a))===JSON.stringify(selected),'Question set menu/order invariant');}}}finally{profile.pathways=paths;profile.orderedDecisionRules=rules;}
// Execute the real serialization/save/load service with an isolated in-memory
// storage adapter. This tests its storage contract, NOT auth/RLS or a database.
let stored;const storage={async saveSession(input){stored={...structuredClone(input),sessionId:'synthetic-ny-storage',createdAt:'2026-10-12T00:00:00Z',updatedAt:'2026-10-12T00:00:00Z'};return stored;},async loadSession(id){return id===stored?.sessionId?structuredClone(stored):null;}};
for(const patch of [{},{ny_16059_prior_sealing:'Yes',ny_16059_total_eligible_convictions:99},{...detention}, {ny_16059_history_total:'I am not sure'}]){
 const raw={...NY_HISTORY_CLOCK_BASE,...patch},hidden=[...NY_16059_FACT_IDS,...NY_16059_LEGACY_IDS,'sentencing_date','release_date'];
 const kept=sanitizeAnswersForQuestionIds(raw,hidden,[],pub);await saveScreeningSession(storage,{jurisdiction:'NY',answers:kept});const saved=await loadScreeningSession(storage,'synthetic-ny-storage');
 const resumed=sanitizeResumedAnswersForQuestionIds(pub,saved.answers,pub.questions.filter(q=>!hidden.includes(q.id)).map(q=>q.id));
 for(const id of hidden.filter(id=>raw[id]!==undefined))check(JSON.stringify(resumed[id])===JSON.stringify(raw[id]),`${id}: raw value survives real serializer/service and resume sanitizer`);
 check(JSON.stringify(evaluate(resumed))===JSON.stringify(evaluate(raw)),'Storage-contract reload preserves evaluation');
}
for(const q of NY_16059_QUESTIONS){check(resolveRuntimeText('es',q.prompt)===q.translations.es.prompt,`${q.id}: Spanish missing prompt`);for(const option of q.options??[])check(Boolean(q.optionDisplay?.[option]?.translations?.es?.label),`${q.id}/${option}: translated choice`);}
const sampled=['one-misdemeanor','history-3-0','one-prior-order-remaining','16058-grant-needs-order-review','bucket-not-anchor','invalid-release_date-2016-02-30','later-conviction','undisposed-arrest','legacy-only','same-act-ineligible-not-grouped','release-interpretation-boundary'];
for(const id of sampled){const row=rows.find(r=>r.id===id);process.env.RCAP_EVALUATOR_TODAY=row.today;const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'NY',profileVersion:profile.profileVersion,matterId:'synthetic-ny-handler',answers:row.answers})}));const body=await response.json();check(response.status===200&&body.resultCode===row.expected,`${id}: real handler ${response.status}/${body.resultCode}`);check(body.consumerPacketAvailable===false&&body.sponsoredPacketAvailable===false,`${id}: API commercial holds`);rows.push({id:`http-${id}`,http:response.status,result:body});}
const bad=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'NY',profileVersion:profile.profileVersion,answers:{...NY_HISTORY_CLOCK_BASE,ny_16059_application_status:'forged'}})}));check(bad.status===400,'Invalid choice rejected by real API');rows.push({id:'http-invalid-choice',http:bad.status,result:await bad.json()});
for(const id of sampled)for(const locale of ['en','es']){const row=rows.find(r=>r.id===id),value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation:row.result,stateName:'New York',questionPromptById:Object.fromEntries(pub.questions.map(q=>[q.id,q.prompt])),hasScreeningSession:false,onEditAnswers:()=>{},onPacketAction:()=>{}})));for(const reason of row.result.reasons.filter(r=>Object.values(NY_16059_REASON_COPY).some(([en])=>en===r.text))){const text=resolveRuntimeText(locale,reason.text);check(markup.includes(renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)),`${id}/${locale}: reason rendered`);if(locale==='es')check(text!==reason.text,`${id}: no English fallback`);}for(const fact of row.result.missingQuestionIds.filter(id=>NY_16059_FACT_IDS.includes(id))){const q=NY_16059_QUESTIONS.find(q=>q.id===fact),text=locale==='es'?q.translations.es.prompt:q.prompt;check(markup.includes(renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)),`${id}/${locale}/${fact}: missing prompt rendered`);}renders.push({id,locale,markup});}
const failed=checks.filter(c=>!c.pass);if(process.env.RCAP_NY_HISTORY_RECEIPT)fs.writeFileSync(process.env.RCAP_NY_HISTORY_RECEIPT,JSON.stringify({checks,rows,renders,limits:['Local evaluator, real stateless handler, SSR and real save/load service with isolated in-memory adapter. NOT authenticated DB persistence, qualified legal/language approval or independent acceptance.']},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',checks:checks.length,scenarios:rows.length,renders:renders.length,failed}));assert.equal(failed.length,0);
