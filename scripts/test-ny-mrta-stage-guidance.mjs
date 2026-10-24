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
const receiptPath = process.env.RCAP_NY_MRTA_RECEIPT;
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
const { reviewedResultRouteLabel } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const H = await import('../src/lib/rcap-engine/ny-mrta-stage-facts.ts');
const profile = getProfileByJurisdiction('NY'), pub = projectPublicProfile(profile), rows = [], checks = [];
const check = (id, actual, expected) => { checks.push(id); assert.deepEqual(actual, expected, id); };
const base = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Misdemeanor conviction', offense_level: 'Misdemeanor', pending_cases: 'No', state_exclusion_categories: ['None of these'] };
const known = { ...base, ny_mrta_record_category: 'unlawful_possession_conviction', ny_mrta_mixed_case: 'no', ny_mrta_next_step: 'automatic_information' };
const original = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', offense_level: 'Misdemeanor', possible_pathway_context: 'Marijuana-record destruction under the MRTA', pending_cases: 'Yes', resolved_timing_bucket: 'lt_1_year', court_requirements_completed: 'yes', state_exclusion_categories: ['Sex offense or registration'] };
async function call(id, answers) {
 const before = structuredClone(answers), selected = selectScreeningQuestionIds(profile, pub, answers), body = { jurisdiction: 'NY', profileVersion: profile.profileVersion, matterId: 'ny117-' + id, answers };
 const response = await POST(new Request('http://local.test/api/expungement-ai/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })), result = await response.json();
 check(id + '/HTTP200', response.status, 200); check(id + '/raw-preserved', answers, before);
 check(id + '/payment-closed', result.paymentAllowed, false); check(id + '/DTC-closed', result.consumerPacketAvailable, false); check(id + '/sponsorship-closed', result.sponsoredPacketAvailable, false); check(id + '/no-plan', result.packetPlan, undefined);
 for(const missing of result.missingQuestionIds ?? []) { check(id + '/published-missing/' + missing, pub.questions.some(q => q.id === missing), true); check(id + '/offered-missing/' + missing, selected.includes(missing), true); }
 rows.push({ id, body, selected, result }); return result;
}
check('exact-source-guard', H.nyMrtaSourceContract(profile), true);
for (const modified of [{ ...profile, profileVersion: 'tamper' }, { ...profile, source: { ...profile.source, sourceCorpusSha256: 'tamper' } }, { ...profile, jurisdiction: { ...profile.jurisdiction, code: 'NJ' } }, { ...profile, pathways: profile.pathways.map(p => p.id === H.NY_MRTA_ROUTE ? { ...p, automatic: false } : p) }, { ...profile, packetGenerator: { ...profile.packetGenerator, pathways: profile.packetGenerator.pathways.map(p => p.pathwayId === H.NY_MRTA_ROUTE ? { ...p, mode: 'paid' } : p) } }]) {
 check('source-drift-fails-guard', H.nyMrtaSourceContract(modified), false); check('source-drift-no-decision', H.nyMrtaDecision(modified, known), null); check('source-drift-no-new-projection', projectPublicProfile(modified).questions.some(q => H.NY_MRTA_IDS.includes(q.id)), false);
}
for(const args of [[profile, {}], [profile, undefined, {}], [profile, undefined, undefined, {}]]) check('source-memo-form-wiring-tamper', H.nyMrtaSourceContract(...args), false);
check('all-four-offered-source-questions-projected', H.NY_MRTA_IDS.every(id => pub.questions.some(q => q.id === id)), true);
const neg = await call('original-B', structuredClone(original)); check('original-held-not-conviction', neg.resultCode, 'needs_more_info');check('original-asks-record-category', neg.missingQuestionIds, [H.NY_MRTA_IDS[0]]);check('original-no-route', neg.pathwayId, undefined);
const hint = 'Marijuana-record destruction under the MRTA';
for (const category of ['unlawful_possession_conviction','fifth_degree_possession_conviction']) for (const context of [hint, undefined, 'None of these / I am not sure']) {
 const answers = { ...known, ny_mrta_record_category: category, ...(context === undefined ? {} : { possible_pathway_context: context }) };
 const r = await call(category + '/' + String(context), answers);check('natural-automatic-guidance', r.resultCode, 'guidance_only');check('exact-MRTA-route', r.pathwayId, H.NY_MRTA_ROUTE);check('automatic-reason', r.reasons.some(x => x.code === 'ny.mrta_automatic_information'), true);
 for(const id of ['sentence_completion_date','court_requirements_completed','resolved_timing_bucket'])check('no-irrelevant-control/'+id, selectScreeningQuestionIds(profile,pub,answers).includes(id),false);
}
for(const category of ['unknown','other','charge_only',['unlawful_possession_conviction'],{value:'unlawful_possession_conviction',unknown:false}]) { const r=await call('category/'+JSON.stringify(category), {...known,ny_mrta_record_category:category});check('category-no-alias-or-overbroad-denial',r.resultCode,'needs_review');check('category-no-route',r.pathwayId,undefined); }
for(const mixed of [undefined,'yes','unknown',{value:'no',unknown:false}]) {const r=await call('mixed/'+JSON.stringify(mixed),{...known,ny_mrta_mixed_case:mixed});check('mixed-held', ['needs_more_info','needs_review'].includes(r.resultCode),true);check('mixed-no-othercount-relief',r.pathwayId,undefined);}
for(const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted','Acquitted or found not guilty','Felony conviction','Diversion, deferred disposition, supervision, or similar program']) {const r=await call('conflict/'+outcome,{...known,case_outcome:outcome});check('conflicting-original-outcome-held',r.resultCode,'needs_review');check('conflicting-no-route',r.pathwayId,undefined);}
for(const election of [undefined,'unknown','yes',{value:'destruction_information',unknown:false}]) { const r=await call('election/'+JSON.stringify(election),{...known,ny_mrta_next_step:election});check('election-no-auto-request', ['needs_more_info','needs_review'].includes(r.resultCode),true); }
for(const status of [undefined,'unknown','not_checked','record_shows_expunged','not_reflected_or_record_missing']) {
 const r=await call('request/'+String(status),{...known,ny_mrta_next_step:'destruction_information',ny_mrta_expungement_record_status:status});
 check('request-status-effect',r.resultCode,['record_shows_expunged','not_reflected_or_record_missing'].includes(status)?'guidance_only':status===undefined?'needs_more_info':'needs_review');
 check('no-destruction-attestation', r.reasons.every(x=>!x.text.includes('your records have been destroyed')),true);
}
for(const [id,values] of [['sentence_completion_date',[undefined,'yes','no','not_sure']],['court_requirements_completed',[undefined,'yes','no','not_sure']],['resolved_timing_bucket',[undefined,'not_sure','lt_1_year','gt_10_years']]]) for(const value of values) {const r=await call('legacy/'+id+'/'+String(value),{...known,[id]:value});check('no-inapplicable-gate',r.resultCode,'guidance_only');check('no-status-from-legacy',r.reasons.some(x=>x.code==='ny.mrta_automatic_information'),true);}
for(const extra of [{ny_16059_request:'petition'},{ny_16055_final_judgment:'violation'}]) {const r=await call('multiple-election/'+Object.keys(extra)[0],{...known,...extra});check('conflicting-stage-held',r.resultCode,'needs_review');check('no-forced-route',r.pathwayId,undefined);}
const excluded=await call('exclusion',{...known,state_exclusion_categories:['Sex offense or registration']});check('preserved-exclusion-review',excluded.resultCode,'needs_review');
const unsure=await call('scope-unknown',{...known,jurisdiction_scope:'I am not sure'});check('unknown-scope-held',unsure.resultCode,'needs_review');
const pending=await call('pending-preserved',{...known,pending_cases:'Yes'});check('no-invented-global-MRTA-pending-bar',pending.resultCode,'guidance_only');
check('ordinaryNY-no-broad-applicability-removal',H.nyMrtaQuestionApplies(profile,base,'sentence_completion_date'),true);
check('typed16059-precedence-with-only-oldhint',H.nyMrtaDecision(profile,{...base,possible_pathway_context:hint,ny_16059_request:'petition'}),null);
check('typed16055-precedence-with-only-oldhint',H.nyMrtaDecision(profile,{...base,possible_pathway_context:hint,ny_16055_final_judgment:'violation'}),null);

const preservedNY116 = [{"id":"original-B","body":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-original-B","answers":{"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Dismissed, no-billed, nolle prosequi, or not prosecuted","offense_level":"Misdemeanor","possible_pathway_context":"Automatic non-conviction sealing under CPL 160.50 / 160.55","pending_cases":"Yes","resolved_timing_bucket":"lt_1_year","court_requirements_completed":"yes","state_exclusion_categories":["Sex offense or registration"]}},"result":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-original-B","resultCode":"needs_more_info","userLabel":"Check the final judgment category in the court record. The optional pathway name and the original charge do not establish the final outcome.","reasons":[{"code":"ny.partial_seal_missing","text":"Check the final judgment category in the court record. The optional pathway name and the original charge do not establish the final outcome.","sourceRef":"NATIONAL-2026-08-28-C-NY-01;NY-CPL-160-55-AUTOMATIC-PARTIAL-SEAL-CORRECTION"}],"missingQuestionIds":["ny_16055_final_judgment"],"cautions":["A prior interests-of-justice non-sealing order requires motion or lawyer review. A disposition before November 1, 1991 may require the statute's legacy motion procedure. Exact record dates and source verification remain separate; this screening does not decide those facts."],"nextSteps":["Check the final judgment category in the court record. The optional pathway name and the original charge do not establish the final outcome."],"paymentAllowed":false,"consumerPacketAvailable":false,"sponsoredPacketAvailable":false},"selected":["ownership_scope","jurisdiction_scope","case_outcome","offense_level","possible_pathway_context","ny_16055_final_judgment","pending_cases","ny_16059_request","state_exclusion_categories"]},{"id":"violation/undefined","body":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-violation/undefined","answers":{"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Other conviction or adjudication","offense_level":"Infraction or violation","pending_cases":"No","resolved_timing_bucket":"gt_10_years","court_requirements_completed":"yes","state_exclusion_categories":["None of these"],"ny_16055_final_judgment":"violation"}},"result":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-violation/undefined","resultCode":"guidance_only","userLabel":"For a qualifying violation or traffic-infraction judgment, CPL 160.55 provides automatic partial sealing of specified records. It does not seal the court file or confirm that your record has been sealed. No initial petition is ordinarily filed for a qualifying disposition after November 1, 1991.","reasons":[{"code":"ny.partial_seal_guidance","text":"For a qualifying violation or traffic-infraction judgment, CPL 160.55 provides automatic partial sealing of specified records. It does not seal the court file or confirm that your record has been sealed. No initial petition is ordinarily filed for a qualifying disposition after November 1, 1991.","sourceRef":"NATIONAL-2026-08-28-C-NY-01;NY-CPL-160-55-AUTOMATIC-PARTIAL-SEAL-CORRECTION"}],"missingQuestionIds":[],"cautions":["A prior interests-of-justice non-sealing order requires motion or lawyer review. A disposition before November 1, 1991 may require the statute's legacy motion procedure. Exact record dates and source verification remain separate; this screening does not decide those facts."],"nextSteps":["Check the certificate of disposition and official criminal-history result. If the partial seal is missing, ask the sentencing court to transmit or correct the sealing notice and send the certified disposition to DCJS for correction.","A prior interests-of-justice non-sealing order requires motion or lawyer review. A disposition before November 1, 1991 may require the statute's legacy motion procedure. Exact record dates and source verification remain separate; this screening does not decide those facts."],"paymentAllowed":false,"pathwayId":"automatic-non-conviction-sealing-under-cpl-160-50-160-55","pathwayLabel":"Automatic non-conviction sealing under CPL 160.50 / 160.55","consumerPacketAvailable":false,"sponsoredPacketAvailable":false},"selected":["ownership_scope","jurisdiction_scope","case_outcome","offense_level","possible_pathway_context","ny_16055_final_judgment","pending_cases","ny_16059_request","state_exclusion_categories"]},{"id":"unknown/\"unknown\"","body":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-unknown/\"unknown\"","answers":{"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Other conviction or adjudication","offense_level":"Infraction or violation","pending_cases":"No","resolved_timing_bucket":"gt_10_years","court_requirements_completed":"yes","state_exclusion_categories":["None of these"],"ny_16055_final_judgment":"unknown"}},"result":{"jurisdiction":"NY","profileVersion":"2026-06-19-source-conversion-1","matterId":"ny116-unknown/\"unknown\"","resultCode":"needs_review","userLabel":"We cannot confirm the final judgment category from these answers. Check the court record or keep the unsure answer; no conclusion about sealing has been made.","reasons":[{"code":"ny.partial_seal_unknown","text":"We cannot confirm the final judgment category from these answers. Check the court record or keep the unsure answer; no conclusion about sealing has been made.","sourceRef":"NATIONAL-2026-08-28-C-NY-01;NY-CPL-160-55-AUTOMATIC-PARTIAL-SEAL-CORRECTION"}],"missingQuestionIds":["ny_16055_final_judgment"],"cautions":["A prior interests-of-justice non-sealing order requires motion or lawyer review. A disposition before November 1, 1991 may require the statute's legacy motion procedure. Exact record dates and source verification remain separate; this screening does not decide those facts."],"nextSteps":["We cannot confirm the final judgment category from these answers. Check the court record or keep the unsure answer; no conclusion about sealing has been made."],"paymentAllowed":false,"consumerPacketAvailable":false,"sponsoredPacketAvailable":false},"selected":["ownership_scope","jurisdiction_scope","case_outcome","offense_level","possible_pathway_context","ny_16055_final_judgment","pending_cases","ny_16059_request","state_exclusion_categories"]}];
for(const saved of preservedNY116){
 const response=await POST(new Request('http://local.test/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify(saved.body)}));
 check('NY116-exact-saved-response/'+saved.id,await response.json(),saved.result);
 check('NY116-original-selected-questions/'+saved.id,selectScreeningQuestionIds(profile,pub,saved.body.answers),saved.selected);
}
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json', 'utf8')).witnesses;
for (const [suffix, expected] of [['160-58', '4ce79f060eebb597e992b5dbb6caa53a0f5e2d8687f66cda65bd1aa6bd03f7cf'], ['160-59', '76d8be069487af5a6afc6e352f917e52ce6b46cd3814602e7d210b0f191c5f2e']]) {
  const fixture = witnesses.find(w => w.jurisdiction === 'NY' && w.pathwayId.endsWith(suffix));
  const body = { jurisdiction: 'NY', profileVersion: fixture.profileVersion, matterId: 'ny116-sibling-' + suffix, answers: fixture.finalAnswers };
  const response = await POST(new Request('http://local.test/api/expungement-ai/evaluate', { method: 'POST', body: JSON.stringify(body) }));
  check('sibling-' + suffix + '-HTTP', response.status, 200);
  check('sibling-' + suffix + '-full-response-matches-actual-before', hash(await response.json()), expected);
  check('sibling-' + suffix + '-new-control-inactive', selectScreeningQuestionIds(profile, pub, fixture.finalAnswers).includes('ny_16055_final_judgment'), false);
}
const catalog=JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json','utf8'));
const msCopyPredecessor=msAdoptedCopyPredecessorView(catalog);
check('all556-predecessor-entries-preserved',hash(msCopyPredecessor.entries.slice(0,556)),'dcd7d764c0babf97bd3efe4aa0fa61108d4e7e974001f6108563785e6dd12aee');
check('catalog-metadata-unchanged',hash(Object.fromEntries(Object.entries(msCopyPredecessor).filter(([k])=>k!=='entries'))),'9cc075b062460eff354757dd50e3e96fab503ba5cc823407b92a707f9ca868b0');
const pair=e=>({en:e.en,es:e.es});
for(const [route,oldId,newId,code]of [['marijuana-record-destruction-under-the-mrta','NY-RESULT-LABEL-marijuana-record-destruction-under-the-mrta-v1','NYMRTA-CURRENT-STAGE-DISPLAY','ny.mrta_stage_guidance'],['automatic-non-conviction-sealing-under-cpl-160-50-160-55','NY-RESULT-LABEL-automatic-non-conviction-sealing-under-cpl-160-50-160-55-v1','NY16055-CURRENT-ROUTE-DISPLAY','ny.partial_seal_guidance']]){
 const pred=catalog.entries.find(e=>e.id===oldId),succ=catalog.entries.find(e=>e.id===newId);
 check('reader-noreason/'+route,reviewedResultRouteLabel('NY',route,pred.originalEnglish),pair(pred));check('reader-wrongreason/'+route,reviewedResultRouteLabel('NY',route,pred.originalEnglish,['wrong']),pair(pred));check('reader-exact-currentreason/'+route,reviewedResultRouteLabel('NY',route,pred.originalEnglish,[code]),pair(succ));check('reader-wrongstate/'+route,reviewedResultRouteLabel('NJ',route,pred.originalEnglish,[code]),null);
 for(const mode of ['duplicate','missing-predecessor','wrong-reason','wrong-predecessor']){
  const changed=structuredClone(catalog),target=changed.entries.find(e=>e.id===newId);
  if(mode==='duplicate')changed.entries.push(structuredClone(target));if(mode==='missing-predecessor')changed.entries=changed.entries.filter(e=>e.id!==oldId);if(mode==='wrong-reason')target.requiredReasonCode='tampered';if(mode==='wrong-predecessor')target.supersedesDisplayEntryId='tampered';
  const source=fs.readFileSync('src/lib/expungement-ai/reviewed-result-copy.ts','utf8').replace('import catalog from "@/lib/expungement-ai/frontend/reviewed-result-display-copy.json";','const catalog = '+JSON.stringify(changed)+';');
  const javascript=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const reader=(await import('data:text/javascript,'+encodeURIComponent(javascript))).reviewedResultRouteLabel;check('reader-failclosed/'+route+'/'+mode,reader('NY',route,pred.originalEnglish,[code]),null);
 }
}

for(const [key,pair] of Object.entries(H.NY_MRTA_COPY)){check('exact-EN-result-copy/'+key,safeUserFacingEngineText(pair[0],{locale:'en'}),pair[0]);check('exact-ES-result-copy/'+key,safeUserFacingEngineText(pair[0],{locale:'es'}),pair[1]);}
const rendered=[];
for(const question of H.NY_MRTA_QUESTIONS)for(const locale of ['en','es']) {
 const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(x,o)=>resolveRuntimeText(locale,x,o)}},React.createElement(QuestionField,{question,stateCode:'NY',value:undefined,onChange(){}})));
 check('actual-question-prompt/'+question.id+'/'+locale,markup.includes(locale==='en'?question.prompt:question.translations.es.prompt),true);
 check('actual-question-helper/'+question.id+'/'+locale,markup.includes(locale==='en'?question.helperText:question.translations.es.helperText),true);
 for(const value of question.options)check('actual-all-options/'+question.id+'/'+locale+'/'+value,markup.includes(locale==='en'?question.optionDisplay[value].label:question.optionDisplay[value].translations.es.label),true);
 rendered.push({id:question.id,locale,markup});
}
for(const row of [rows.find(r=>r.id==='original-B'),rows.find(r=>r.id==='unlawful_possession_conviction/undefined'),rows.find(r=>r.id==='request/record_shows_expunged'),rows.find(r=>r.id==='request/not_checked')]) for(const locale of ['en','es']) {
 const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(x,o)=>resolveRuntimeText(locale,x,o)}},React.createElement(ScreeningResult,{evaluation:row.result,stateName:'New York',questionPromptById:Object.fromEntries(pub.questions.map(q=>[q.id,q.prompt])),onEditAnswers(){},onPacketAction(){}})));
 check('no-generic-packet-promise/'+row.id+'/'+locale,/prepare the right packet|preparar el paquete correcto/.test(markup),false);
 if(row.result.pathwayId===H.NY_MRTA_ROUTE)check('neutral-stage-label/'+locale,markup.includes(locale==='en'?'New York marijuana-record guidance (MRTA)':'Orientación sobre antecedentes de marihuana en Nueva York (MRTA)'),true);
 const current=row.result.reasons.find(r=>r.code.startsWith('ny.mrta_')&&r.code!=='ny.mrta_stage_guidance');const pair=Object.values(H.NY_MRTA_COPY).find(p=>p[0]===current?.text);check('actual-source-copy/'+row.id+'/'+locale,Boolean(pair&&markup.includes(pair[locale==='en'?0:1])),true);
 for(const id of row.result.missingQuestionIds??[]){const q=pub.questions.find(q=>q.id===id);if(q?.translations?.es?.prompt&&locale==='es')check('localized-actual-missing/'+id,markup.includes(q.translations.es.prompt),true);}
 rendered.push({id:row.id,locale,markup});
}
const result={preservedNY116Responses:preservedNY116.length,preservedSiblingPOSTs:2,status:'PASS_BOUNDED_NY117_CONDITIONAL_STAGE_PUBLIC_CONSUMER',checks:checks.length,rows,rendered,limits:['Actual isolated publicPOST/ENESSSR only; no DB/browser/authenticatedowner/hosted acceptance.','ExistingNY08finishedversionreviewpending; no qualifiedlegal/Spanish approval.','Onlyoriginal117source/offeredconditionalguidance; no irreversibleaction/documentbuilder/commerce/family/output/release/wholeGA42claim.']};
if(receiptPath)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({status:result.status,checks:checks.length,actualHandlerCases:rows.length,actualSSR:rendered.length}));
