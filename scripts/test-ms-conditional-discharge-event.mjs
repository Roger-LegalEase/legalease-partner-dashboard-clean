import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if(process.env.RCAP_MS_EVENT_BASELINE){
 const file='src/lib/rcap-engine/evaluator.ts',raw=execFileSync('git',['show',`${process.env.RCAP_MS_EVENT_BASELINE}:${file}`],{encoding:'utf8'});
 register(`data:text/javascript,${encodeURIComponent('let data;export function initialize(d){data=d;}export async function load(u,c,n){return u===data.url?{format:"module",source:data.source,shortCircuit:true}:n(u,c);} ')}`,{data:{url:pathToFileURL(`${process.cwd()}/${file}`).href,source:ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
}
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {MS_CONDITIONAL_DISCHARGE_FACT_IDS:ids,MS_CONDITIONAL_DISCHARGE_PATHWAY:pathway}=await import('../src/lib/rcap-engine/mississippi-conditional-discharge.ts');
const {MS_NONCONVICTION_SCREENING_ANSWERS}=await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const p=getProfileByJurisdiction('MS'),pub=projectPublicProfile(p);
const base={...MS_NONCONVICTION_SCREENING_ANSWERS,case_outcome:'Diversion, deferred disposition, supervision, or similar program',ms_program_order:'41-29-150',ms_program_record_status:'completed_and_closed',ms_program_final_disposition:'discharged_and_dismissed',ms_drug_subsection:'41-29-139(c)',ms_prior_drug_conviction:'no',ms_prior_conditional_discharge:'no',ms_adjudication_deferred:'yes',court_requirements_completed:'yes',discharge_date:'2026-10-12'};delete base.possible_pathway_context;
const evalAnswers=answers=>evaluateAuthoritativeScreeningResult({jurisdiction:'MS',profileVersion:p.profileVersion,matterId:'synthetic-ms-drug-event',answers}).evaluation;
const checks=[],observations=[];const check=(pass,message)=>checks.push({pass:Boolean(pass),message});
const run=(id,patch)=>{const answers={...base,...patch},before=structuredClone(answers),r=evalAnswers(answers);observations.push({id,patch,result:r});check(JSON.stringify(answers)===JSON.stringify(before),id+': raw facts retained');for(const surface of ['checkout creation','consumer payment authority','sponsored entitlement','packet generation','packet credit consumption','participant delivery'])check(!packetFulfillmentAuthority('MS',r.pathwayId,surface,{trackId:null}).allowed,id+': actual authority refuses '+surface);return r;};
for(const subsection of ['41-29-139(c)','41-29-139(d)'])for(const age of ['2026-10-12','2026-10-11','2000-01-01']){
 const r=run('complete-event',{ms_drug_subsection:subsection,discharge_date:age});
 check(r.pathwayId===pathway,'Exact family retained');check(!r.reasons.some(x=>x.code==='ms.waiting_rule_not_executed'),'Completed event has no invented elapsed clock');
 check(['packet_ready','packet_ready_with_caution','needs_review'].includes(r.resultCode),'Completed event reaches independent remaining gates');
}
for(const id of ids)for(const value of [undefined,'unknown','forged']){
 const r=run('missing-'+id,{[id]:value});check(r.resultCode==='needs_more_info'&&r.missingQuestionIds.includes(id),'Exact missing factual predicate is requested');
}
for(const [id,value]of [['ms_drug_subsection','other'],['ms_prior_drug_conviction','yes'],['ms_prior_conditional_discharge','yes'],['ms_adjudication_deferred','no']]){
 const r=run('conflict-'+id,{[id]:value});check(r.resultCode==='needs_review'&&r.reasons.some(x=>x.code==='ms.conditional_discharge_predicate_conflict'),'Predicate conflict is exact-route review');
}
for(const id of ['discharge_date'])for(const value of ['2026-10-13','2026-02-30',{unknown:true}]){
 const r=run('date-conflict-'+id,{[id]:value});check(r.resultCode==='needs_more_info','Future/invalid/unknown entered event date cannot establish completion');
}
for(const [id,value]of [['court_requirements_completed','no'],['pending_cases','Yes'],['financial_obligations','No'],['new_convictions_during_waiting_period','Yes']]){
 const r=run('independent-guard-'+id,{[id]:value});check(r.resultCode==='not_yet','Existing independent guard remains');
}
for(const disposition of [undefined,'discharged_only','other_or_unknown']){
 const r=run('no-dismissal',{ms_program_final_disposition:disposition});check(r.resultCode==='needs_more_info','No proved discharge-and-dismissal event');
}
const questions=selectScreeningQuestionIds(p,pub,base);for(const id of ids){
 check(questions.includes(id),'Relevant fact is actually askable');const q=pub.questions.find(x=>x.id===id);check(Boolean(q?.translations?.es?.prompt),'Draft ES question exists');
 check(q.options.every(o=>q.optionDisplay[o].translations.es.label),'Draft ES options exist');
 check(sanitizeAnswersForQuestionIds(base,[id],[],pub)[id]===base[id],'Independent hidden fact retained');
 for(const patch of [{ms_program_record_status:'active'},{ms_program_order:'99-15-26'},{ms_program_order:'no_program_order'}])check(!selectScreeningQuestionIds(p,pub,{...base,...patch}).includes(id),'Sibling/admission does not ask drug predicates');
}
const expected=evalAnswers(base),oldPaths=[...p.pathways],oldRules=[...p.orderedDecisionRules];
try{for(const reverse of [false,true]){p.pathways=reverse?[...oldPaths].reverse():oldPaths;p.orderedDecisionRules=reverse?[...oldRules].reverse():oldRules;for(const context of [undefined,...oldPaths.map(p=>p.label)]){
 check(JSON.stringify(evalAnswers({...base,...(context?{possible_pathway_context:context}:{})}))===JSON.stringify(expected),'All optional contexts/order/Skip preserve factual route and result');
}}}finally{p.pathways=oldPaths;p.orderedDecisionRules=oldRules;}
for(const patch of [{},{ms_drug_subsection:'41-29-139(d)'},{ms_prior_drug_conviction:'yes'},{ms_prior_conditional_discharge:'yes'},{ms_adjudication_deferred:'unknown'},{discharge_date:'2026-10-13'}]) {
 const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'MS',profileVersion:p.profileVersion,matterId:'synthetic-ms-event-api',answers:{...base,...patch}})}));const body=await response.json();observations.push({id:'actual-public-handler',patch,http:response.status,result:body});check(response.status===200,'Actual stateless API accepts public facts');check(body.consumerPacketAvailable===false&&body.sponsoredPacketAvailable===false,'Actual API refuses both commercial paths');
}
for(const code of ['ms.conditional_discharge_record_facts_missing','ms.conditional_discharge_predicate_conflict','ms.conditional_discharge_event_date_conflict']){const text=observations.flatMap(o=>o.result.reasons??[]).find(r=>r.code===code)?.text;check(Boolean(text)&&resolveRuntimeText('es',text)!==text,'Draft Spanish result copy resolves: '+code);}
if(process.env.RCAP_MS_EVENT_RECEIPT){assert.ok(!fs.existsSync(process.env.RCAP_MS_EVENT_RECEIPT));fs.writeFileSync(process.env.RCAP_MS_EVENT_RECEIPT,JSON.stringify({checks,observations},null,2)+'\n');}
const failed=checks.filter(x=>!x.pass);console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',checks:checks.length,failed,completedEvent:{resultCode:expected.resultCode,reasons:expected.reasons.map(x=>x.code),paymentAllowed:expected.paymentAllowed}}));assert.equal(failed.length,0);
