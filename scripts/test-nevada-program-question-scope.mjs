import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.env.RCAP_NV_SCOPE_BASELINE) {
  const files=['src/lib/rcap-engine/evaluator.ts','src/lib/rcap-engine/screening-question-selection.ts','src/components/expungement-ai/screening/screens.ts'];
  const sources=Object.fromEntries(files.map(file=>[pathToFileURL(`${process.cwd()}/${file}`).href,ts.transpileModule(execFileSync('git',['show',`${process.env.RCAP_NV_SCOPE_BASELINE}:${file}`],{encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText]));
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`,{data:sources});
}
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const {evaluateScreening}=await import('../src/lib/rcap-engine/evaluator.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeAnswersForQuestionIds,sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const NV=await import('../src/lib/rcap-engine/nevada-176a-branch.ts');
const profile=getProfileByJurisdiction('NV'),pub=projectPublicProfile(profile),ids=NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS;
const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w=>w.jurisdiction==='NV');
const evaluate=answers=>evaluateScreening({jurisdiction:'NV',profileVersion:profile.profileVersion,matterId:'synthetic-nv-question-ownership',answers});
let checked=0;const outcomes=[];
for(const witness of witnesses){
 const own=witness.pathwayKey===NV.NEVADA_176A_ROUTE_KEY,answers=structuredClone(witness.finalAnswers);
 // Missing-fact ownership is an explicit test premise, independent of the new
 // generated synthetic witness's supplied 176A answers and valid refusal.
 if(own) for(const id of ids) delete answers[id];
 const before=JSON.stringify(answers);const actual=evaluate(answers);const questions=selectScreeningQuestionIds(profile,pub,answers);
 if(own){
  assert.equal(actual.resultCode,'needs_more_info');assert.equal(actual.paymentAllowed,false);
  for(const id of ids){assert.ok(actual.missingQuestionIds.includes(id));assert.ok(questions.includes(id));checked++;}
 }else{
  assert.ok(!(actual.missingQuestionIds??[]).some(id=>ids.includes(id)),`${witness.pathwayKey}: unrelated program facts cannot be required`);checked++;
  for(const id of ids){assert.ok(!questions.includes(id),`${witness.pathwayKey}: do not display ${id}`);checked++;}
  for(const value of ['I am not sure','No — neither was the charge',null]){
   const retained={...answers,...Object.fromEntries(ids.map(id=>[id,value]))};
   assert.deepEqual(evaluate(retained),actual,'independent sibling outcome unchanged by retained program facts');checked++;
   const switched=sanitizeAnswersForQuestionIds(retained,pub.questions.map(q=>q.id),questions,pub);
   const resumed=sanitizeResumedAnswersForQuestionIds(pub,retained,questions);
   for(const id of ids){assert.deepEqual(switched[id],retained[id]);assert.deepEqual(resumed[id],retained[id]);checked+=2;}
  }
 }
 assert.equal(JSON.stringify(answers),before);checked++;
 outcomes.push({routeKey:witness.pathwayKey,resultCode:actual.resultCode,pathwayId:actual.pathwayId,missing:actual.missingQuestionIds});
}
for(const id of ids){
 assert.ok(selectScreeningQuestionIds(profile,pub,{}).includes(id),'unresolved route retains the existing initial questions');
 assert.equal(NV.nevada176AQuestionApplies('OTHER','sibling',id),true);checked+=2;
}
const family=witnesses.find(w=>w.pathwayKey===NV.NEVADA_176A_ROUTE_KEY);
const base={...family.finalAnswers,[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:NV.NEVADA_176A_EXCLUDED_CHARGE_NO,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_NAMED,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL};
for(const id of ids){
 const partial={...base};delete partial[id];const r=evaluate(partial);
 assert.equal(r.resultCode,'needs_more_info');assert.equal(r.paymentAllowed,false);assert.ok(r.missingQuestionIds.includes(id));checked++;
 assert.equal(pub.questions.find(q=>q.id===id).required,true);checked++;
}
// Returning to the original program route retains its exact exclusion guard.
const barred=evaluate({...base,[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:NV.NEVADA_176A_EXCLUDED_CHARGE_YES});
assert.equal(barred.resultCode,'likely_not_eligible');assert.equal(barred.paymentAllowed,false);checked++;
console.log(JSON.stringify({status:'PASS',checked,outcomes,scope:'Eight retained NV witnesses; route-specific missing/display/uncertainty and raw-answer preservation. Existing 176A branch verifier separately exercises timing/automatic/petition/document/negative safeguards. Not legal or hosted acceptance.'},null,2));
