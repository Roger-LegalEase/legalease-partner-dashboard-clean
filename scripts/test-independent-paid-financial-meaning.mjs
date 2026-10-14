import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file='src/lib/rcap-engine/evaluator.ts';
const source=process.env.RCAP_PAID_FACT_BASELINE ? execFileSync('git',['show',`${process.env.RCAP_PAID_FACT_BASELINE}:${file}`],{encoding:'utf8'}) : fs.readFileSync(file,'utf8');
const sources={ [pathToFileURL(`${process.cwd()}/${file}`).href]:ts.transpileModule(source+'\nexport { evaluateCompiledTiming };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText };
register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`,{data:sources});
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const {evaluateCompiledTiming}=await import('../src/lib/rcap-engine/evaluator.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {isIndependentPaidFinancialFact,courtCompletionContractsFor}=await import('../src/lib/expungement-ai/court-completion-reuse.ts');
const catalog=JSON.parse(fs.readFileSync('src/lib/expungement-ai/reviewed-court-completion-contracts.json'));
const rule={id:'synthetic-money-meaning',sourceRef:'synthetic-control-not-legal-eligibility',when:{},then:{}};
const completed={court_requirements_completed:'yes',sentence_completion_date:'Yes',financial_obligations:'No',pending_cases:'No',new_convictions_during_waiting_period:'No',special_preconditions_confirmed:'Yes'};
// These exact adopted status-guidance contracts make payment irrelevant to
// reading guidance. Their retained paid-only answer meaning is still tested
// below; inactivity must never become a completion alias or a waiver finding.
const statusGuidanceScopes={
 'LA:automated-expungement-status-verification-art-985-2':{
  source:'aa83d703e56d1ee4964a1cb360a32e226d13feb58c24522eea9ade21517f0ff5',decision:'LD-LA-05',
  rule:'LA-985-985.1-985.2-985.3-983H-FIVE-PROCEDURE-MAP',outcome:'guidance_status',type:'automatic_guidance'},
 'MO:closed-record-outcome-under-rsmo-610-105':{
  source:'ddb1a8ea6c0d878f5a81d59e2a7e32cd7927436e9fb6fee8e8e8629ba7c62304',decision:'LD-MO-02',
  rule:'MO-610.105-610.122-610.145-THREE-CORRECTION-MECHANISMS',outcome:'automatic_relief',type:'automatic'}
};
const observedStatusScopes=[];
let checked=0;
for(const contract of catalog.independentPaidFactContracts){
 const p=getProfileByJurisdiction(contract.routeKey.slice(0,2)),route=p.pathways.find(p=>p.id===contract.routeKey.slice(3));
 const question=p.questions.find(q=>q.id===contract.factId);
 assert.ok(route);assert.ok(isIndependentPaidFinancialFact(contract.routeKey,question));checked+=2;
 const selected=selectScreeningQuestionIds(p,projectPublicProfile(p),{possible_pathway_context:route.label});
 const statusScope=statusGuidanceScopes[contract.routeKey];
 if(statusScope){
  assert.equal(contract.factId,'financial_obligations');
  assert.equal(p.profileVersion,'2026-06-19-source-conversion-1');
  assert.equal(p.source.sourceCorpusSha256,statusScope.source);
  assert.equal(route.legalAuthority.decisionId,statusScope.decision);
  assert.equal(route.legalAuthority.ruleId,statusScope.rule);
  assert.equal(route.legalAuthority.outcomeMode,statusScope.outcome);
  assert.equal(route.legalAuthority.paymentAuthority,'closed');
  assert.equal(route.routeType,statusScope.type);assert.equal(route.filingRequired,false);
  assert.equal(selected.includes(contract.factId),false,contract.routeKey+': payment is irrelevant to the exact status guidance');
  observedStatusScopes.push(contract.routeKey);checked+=10;
 }else{
  assert.ok(selected.includes(contract.factId),contract.routeKey+': independent paid fact must not be hidden as a completion alias');checked++;
 }
 const answers=structuredClone(completed),before=structuredClone(answers),result=evaluateCompiledTiming(p,answers,rule,route);
 assert.equal(result.status,'needs_review',contract.routeKey+': satisfaction versus payment needs clarification, not an inferred wait');
 assert.ok(result.reason.code.endsWith('.payment_and_completion_meaning_unconfirmed'));
 assert.deepEqual(answers,before);checked+=3;
 assert.equal(courtCompletionContractsFor(contract.routeKey).filter(c=>c.targetFactId===contract.factId).length,0);checked++;
 // The specific review cannot replace separate known unfinished conditions.
 for(const change of [{court_requirements_completed:'no'},{sentence_completion_date:'No'},{pending_cases:'Yes'},{new_convictions_during_waiting_period:'Yes'}]){
  const r=evaluateCompiledTiming(p,{...answers,...change},rule,route);assert.equal(r.status,'not_yet');assert.ok(r.reason.code.endsWith('.timing_or_completion_blocker'));checked+=2;
 }
 for(const completion of [undefined,'no','not_sure','not_applicable']){
  const r=evaluateCompiledTiming(p,{...answers,court_requirements_completed:completion},rule,route);assert.equal(r.status,'not_yet');checked++;
 }
 for(const financial of ['Yes','I am not sure',undefined]){
  const r=evaluateCompiledTiming(p,{...answers,financial_obligations:financial},rule,route);assert.ok(!r.reason?.code.endsWith('.payment_and_completion_meaning_unconfirmed'));checked++;
 }
 assert.equal(isIndependentPaidFinancialFact(contract.routeKey,{...question,prompt:'Are amounts paid or otherwise satisfied?'}),false);
 assert.equal(isIndependentPaidFinancialFact(contract.routeKey,{...question,helperText:'different meaning'}),false);
 assert.equal(isIndependentPaidFinancialFact('XX:not-a-registered-route',question),false);checked+=3;
}
assert.deepEqual(observedStatusScopes.sort(),Object.keys(statusGuidanceScopes).sort());checked++;
console.log(JSON.stringify({status:'PASS',checked,originalPaidContracts:catalog.independentPaidFactContracts.length,positiveCarryContracts:catalog.contracts.length,
 statusGuidanceRelevanceOnly:observedStatusScopes,
 scope:'Isolated actual timing helper,139 exact paid-only contracts; no inferred payment/waiver exception, independent blockers and input bytes preserved. Two exact adopted status-guidance relevance scopes do not alter paid-answer meaning. This is not139 protected journeys or proof that a waiver satisfies any jurisdiction rule.'}));
