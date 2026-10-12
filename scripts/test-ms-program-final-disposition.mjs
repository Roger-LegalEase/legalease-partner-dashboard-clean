import assert from 'node:assert/strict';
import ts from 'typescript';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file='src/lib/rcap-engine/composed-route-selector.ts';
if(process.env.RCAP_MS_FINAL_BASELINE){
 const raw=execFileSync('git',['show',`${process.env.RCAP_MS_FINAL_BASELINE}:${file}`],{encoding:'utf8'});
 const sources={[pathToFileURL(`${process.cwd()}/${file}`).href]:ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
 register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data){sources=data;} export async function load(url,context,next){return url in sources?{format:"module",source:sources[url],shortCircuit:true}:next(url,context);} ')}`,{data:sources});
}
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const {mississippiProgramRouteFromAnswers}=await import('../src/lib/rcap-engine/composed-route-selector.ts');
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {evaluateScreening}=await import('../src/lib/rcap-engine/evaluator.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {MS_NONCONVICTION_SCREENING_ANSWERS}=await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const p=getProfileByJurisdiction('MS'),pub=projectPublicProfile(p),field='ms_program_final_disposition';
let checks=0;const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const base={...MS_NONCONVICTION_SCREENING_ANSWERS,case_outcome:'Diversion, deferred disposition, supervision, or similar program',ms_program_order:'99-15-101',ms_program_record_status:'completed_without_closure',ms_program_final_disposition:'no_disposition'};delete base.possible_pathway_context;
const pretrial='pretrial-intervention-or-diversion-expungement';
check(mississippiProgramRouteFromAnswers(base),{status:'selected',pathwayId:pretrial},'No disposition after completed pretrial intervention is not a missing nonadjudication dismissal');
const evaluate=answers=>evaluateScreening({jurisdiction:'MS',profileVersion:p.profileVersion,matterId:'synthetic-ms-final-disposition',answers});
const table=[['99-15-26','nonadjudication-under-99-15-26',['dismissed_and_closed']],['99-15-101',pretrial,['dismissed_and_closed','charges_dropped','no_disposition']],['41-29-150','first-offense-controlled-substance-conditional-discharge-relief',['discharged_and_dismissed']]];
for(const [ms_program_order,pathwayId,accepted]of table){
 for(const value of ['dismissed_and_closed','charges_dropped','no_disposition','discharged_and_dismissed','discharged_only','other_or_unknown']){
  for(const stage of ['completed_and_closed','completed_without_closure']){
   const answers={...base,ms_program_order,ms_program_record_status:stage,[field]:value},before=structuredClone(answers);
   const selected=accepted.includes(value)&&(stage==='completed_and_closed'||ms_program_order==='99-15-101'&&['charges_dropped','no_disposition'].includes(value));
   const selection=mississippiProgramRouteFromAnswers(answers);check(selection.status,selected?'selected':'clarification');
   check(answers,before,'Raw final disposition is not rewritten');
   const evaluated=evaluate(answers);check(evaluated.paymentAllowed,false,'Selection alone never opens these currently held program packets');
   if(selected)check(evaluated.pathwayId,pathwayId);
  }
 }
 // Missing new fact preserves the exact old candidate, without treating it as a proved event.
 check(mississippiProgramRouteFromAnswers({...base,ms_program_order,ms_program_record_status:'completed_and_closed',[field]:undefined}),{status:'selected',pathwayId});
 // The separately held active-admission candidate ignores a previous completion answer.
 check(mississippiProgramRouteFromAnswers({...base,ms_program_order,ms_program_record_status:'active',[field]:'discharged_only'}).status,'selected');
}
const expected=evaluate(base),questions=selectScreeningQuestionIds(p,pub,base),oldPaths=[...p.pathways],oldRules=[...p.orderedDecisionRules];
try{for(const reverse of [false,true]){p.pathways=reverse?[...oldPaths].reverse():[...oldPaths];p.orderedDecisionRules=reverse?[...oldRules].reverse():[...oldRules];for(const context of [undefined,...oldPaths.map(x=>x.label)]){
 const answers={...base,...(context?{possible_pathway_context:context}:{})};check(evaluate(answers),expected);check(selectScreeningQuestionIds(p,pub,answers),questions);
}}}finally{p.pathways=oldPaths;p.orderedDecisionRules=oldRules;}
check(questions.includes(field),true);
check(questions.indexOf('ms_program_order')<questions.indexOf('ms_program_record_status')&&questions.indexOf('ms_program_record_status')<questions.indexOf(field),true);
const publicResult=evaluateAuthoritativeScreeningResult({jurisdiction:'MS',profileVersion:p.profileVersion,matterId:'synthetic-ms-public-final',answers:base});
check(publicResult.evaluation.pathwayId,pretrial);check(publicResult.evaluation.paymentAllowed,false);
for(const change of [{ms_program_record_status:'active'},{ms_program_order:'no_program_order'},{ms_program_order:'other_or_unknown'}])check(selectScreeningQuestionIds(p,pub,{...base,...change}).includes(field),false);
const q=pub.questions.find(q=>q.id===field);check(Boolean(q?.translations?.es?.prompt),true);for(const option of q.options)check(Boolean(q.optionDisplay[option]?.translations?.es?.label),true);
check(sanitizeAnswersForQuestionIds(base,[field],[],pub)[field],base[field]);
console.log(JSON.stringify({status:'PASS',checks,actual:{pathwayId:expected.pathwayId,resultCode:expected.resultCode,paymentAllowed:expected.paymentAllowed,reasons:expected.reasons.map(r=>r.code)},scope:'Three existing program candidates, exact final-disposition distinctions and no-disposition pretrial branch; no elapsed-clock, full statutory predicate or commercial closure.'}));
