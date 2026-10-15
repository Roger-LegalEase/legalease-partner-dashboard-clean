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
// Later source-bound guidance corrections retain the paid-only fact meaning.
// Reuse their exact contracts and test source/route drift restores financial visibility and question drift
// refuses the guidance exemption; no state-wide or eligibility/payment exemption.
const {newMexicoGuidanceFinancialContract,newMexicoGuidanceFinancialApplies}=await import('../src/lib/rcap-engine/new-mexico-guidance-financial.ts');
const {newJerseyMarijuanaStatusFinancialContract,newJerseyMarijuanaStatusFinancialApplies}=await import('../src/lib/rcap-engine/new-jersey-marijuana-status-financial.ts');
const {oklahomaCleanSlateFinancialContract,oklahomaCleanSlateFinancialApplies}=await import('../src/lib/rcap-engine/oklahoma-clean-slate-financial.ts');
const {southCarolinaGuidanceFinancialContract,southCarolinaGuidanceFinancialApplies}=await import('../src/lib/rcap-engine/south-carolina-guidance-financial.ts');
const guardedGuidanceScopes={
 'NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1':{guard:newJerseyMarijuanaStatusFinancialContract,applies:newJerseyMarijuanaStatusFinancialApplies,source:'de497e48a96cd33958cf00f9896c843a5edad96ab164135c22965fe0ca76f302'},
 'NM:cannabis-expungement':{guard:newMexicoGuidanceFinancialContract,applies:newMexicoGuidanceFinancialApplies,source:'1db8637956e22f092855ca55f218d7c1fa8026609f5308cea4de746c17aa94ea'},
 'NM:dna-sample-profile-expungement':{guard:newMexicoGuidanceFinancialContract,applies:newMexicoGuidanceFinancialApplies,source:'1db8637956e22f092855ca55f218d7c1fa8026609f5308cea4de746c17aa94ea'},
 'OK:clean-slate-automatic-expungement':{guard:oklahomaCleanSlateFinancialContract,applies:oklahomaCleanSlateFinancialApplies,source:'789b97517326e5da1664befc1f2d5a88d0e8e0f750e2dcf51c5aca7b2d8b5f8d'},
 'SC:diversion-or-program-completion-expungement':{guard:southCarolinaGuidanceFinancialContract,applies:southCarolinaGuidanceFinancialApplies,source:'34d2edab3183e544d742a65e93d26f1803d70f0e762ed1dda73e890e0be12acf'},
 'SC:pardon-guidance-for-otherwise-ineligible-convictions':{guard:southCarolinaGuidanceFinancialContract,applies:southCarolinaGuidanceFinancialApplies,source:'34d2edab3183e544d742a65e93d26f1803d70f0e762ed1dda73e890e0be12acf'},
};
const {wy1401Contract,wy1401QuestionApplies,WY_1401_ROUTE}=await import('../src/lib/rcap-engine/wyoming-1401-facts.ts');
const {southDakotaGuidanceFinancialContract,southDakotaGuidanceFinancialApplies}=await import('../src/lib/rcap-engine/south-dakota-guidance-financial.ts');
const {westVirginiaGuidanceFinancialContract,westVirginiaGuidanceFinancialApplies}=await import('../src/lib/rcap-engine/west-virginia-guidance-financial.ts');
Object.assign(guardedGuidanceScopes,{
 'SD:automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases':{guard:southDakotaGuidanceFinancialContract,applies:southDakotaGuidanceFinancialApplies,source:'9751a66fc4ad5ef892db26209da7a07121035065b07f216db1bfa6689c6f1100'},
 'SD:pardon-based-sealing':{guard:southDakotaGuidanceFinancialContract,applies:southDakotaGuidanceFinancialApplies,source:'9751a66fc4ad5ef892db26209da7a07121035065b07f216db1bfa6689c6f1100'},
 'WV:pardon-based-expungement':{guard:westVirginiaGuidanceFinancialContract,applies:westVirginiaGuidanceFinancialApplies,source:'8e1e8ee4cc4663878e60f00976d8f13456911eac223a1d43e43825adebccf1aa'},
});
const observedWy1401Scopes=[];
const observedGuardedScopes=[];
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
 }else if(guardedGuidanceScopes[contract.routeKey]){
  const scope=guardedGuidanceScopes[contract.routeKey];
  assert.equal(contract.factId,'financial_obligations');
  assert.equal(p.profileVersion,'2026-06-19-source-conversion-1');
  assert.equal(p.source.sourceCorpusSha256,scope.source);
  assert.equal(scope.guard(p,route.id),true,contract.routeKey+': exact retained source/question/route projection required');
  assert.equal(selected.includes(contract.factId),false,contract.routeKey+': exact informational guidance does not require payment completeness');
  assert.equal(scope.guard(p,'not-the-reviewed-route'),false);checked+=6;
  for(const [mutationIndex,mutate] of [
   changed=>{changed.source.sourceCorpusSha256='unreviewed-source';},
   changed=>{changed.profileVersion='unreviewed-profile';},
   changed=>{changed.questions.find(q=>q.id===contract.factId).prompt='Are amounts paid or otherwise satisfied?';},
   changed=>{changed.pathways.find(q=>q.id===route.id).sourceRef='unreviewed-route-source';},
  ].entries()){
   const changed=structuredClone(p);mutate(changed);
   assert.equal(scope.guard(changed,route.id),false,contract.routeKey+': drift cannot inherit guidance applicability');
   assert.equal(scope.applies(changed,route.id,{},contract.factId),true,contract.routeKey+': drift cannot suppress the financial fact through guidance');checked+=2;
   // A changed prompt also invalidates the separately pinned paid-only meaning
   // contract, so the lifecycle alias rule no longer promises its visibility.
   // Source/profile/route drift leaves that meaning intact and must show it.
   if(mutationIndex!==2){
    const driftSelected=selectScreeningQuestionIds(changed,projectPublicProfile(changed),{possible_pathway_context:route.label});
    assert.ok(driftSelected.includes(contract.factId),contract.routeKey+': source/profile/route drift retains financial visibility');checked++;
   }else{
    assert.equal(isIndependentPaidFinancialFact(contract.routeKey,changed.questions.find(q=>q.id===contract.factId)),false);checked++;
   }
  }
  observedGuardedScopes.push(contract.routeKey);
 }else if(contract.routeKey===`WY:${WY_1401_ROUTE}`){
  assert.equal(wy1401Contract(p,route.id),true);
  assert.equal(p.source.sourceCorpusSha256,'8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa');
  assert.equal(selected.includes(contract.factId),false,'WY1401 exact incident predicates replace irrelevant conviction-debt collection');
  assert.equal(route.filingRequired,true);assert.equal(route.automatic,false);checked+=5;
  const changed=structuredClone(p);changed.source.sourceCorpusSha256='unreviewed-source';
  assert.equal(wy1401Contract(changed,route.id),false);
  assert.equal(wy1401QuestionApplies(changed,route.id,{},contract.factId),true);
  assert.ok(selectScreeningQuestionIds(changed,projectPublicProfile(changed),{possible_pathway_context:route.label}).includes(contract.factId));checked+=3;
  observedWy1401Scopes.push(contract.routeKey);
 }else{
  assert.ok(selected.includes(contract.factId),contract.routeKey+': independent paid fact must not be hidden as a completion alias');checked++;
 }
 // The exact guidance ignores generic payment completeness. Compare all raw
 // values without granting an eligibility or waiver result. Then exercise the
 // retained generic paid-meaning contract with only its source guard invalidated.
 let timingProfile=p;
 if(guardedGuidanceScopes[contract.routeKey]){
  const baseline=evaluateCompiledTiming(p,{...completed,financial_obligations:'Yes'},rule,route);
  for(const financial of ['Yes','No','I am not sure',undefined,null]){
   const input={...completed,financial_obligations:financial},before=structuredClone(input);
   assert.deepEqual(evaluateCompiledTiming(p,input,rule,route),baseline,contract.routeKey+': financial value cannot gate exact guidance');
   assert.deepEqual(input,before);checked+=2;
  }
  for(const change of [{court_requirements_completed:'no'},{sentence_completion_date:'No'},{pending_cases:'Yes'},{new_convictions_during_waiting_period:'Yes'}]){
   const r=evaluateCompiledTiming(p,{...completed,...change},rule,route);
   assert.equal(r.status,'not_yet');assert.ok(r.reason.code.endsWith('.timing_or_completion_blocker'));checked+=2;
  }
  timingProfile=structuredClone(p);timingProfile.source.sourceCorpusSha256='unreviewed-source';
 }
 const answers=structuredClone(completed),before=structuredClone(answers),result=evaluateCompiledTiming(timingProfile,answers,rule,route);
 assert.equal(result.status,'needs_review',contract.routeKey+': satisfaction versus payment needs clarification, not an inferred wait');
 assert.ok(result.reason.code.endsWith('.payment_and_completion_meaning_unconfirmed'));
 assert.deepEqual(answers,before);checked+=3;
 assert.equal(courtCompletionContractsFor(contract.routeKey).filter(c=>c.targetFactId===contract.factId).length,0);checked++;
 // The specific review cannot replace separate known unfinished conditions.
 for(const change of [{court_requirements_completed:'no'},{sentence_completion_date:'No'},{pending_cases:'Yes'},{new_convictions_during_waiting_period:'Yes'}]){
  const r=evaluateCompiledTiming(timingProfile,{...answers,...change},rule,route);assert.equal(r.status,'not_yet');assert.ok(r.reason.code.endsWith('.timing_or_completion_blocker'));checked+=2;
 }
 for(const completion of [undefined,'no','not_sure','not_applicable']){
  const r=evaluateCompiledTiming(timingProfile,{...answers,court_requirements_completed:completion},rule,route);assert.equal(r.status,'not_yet');checked++;
 }
 for(const financial of ['Yes','I am not sure',undefined]){
  const r=evaluateCompiledTiming(timingProfile,{...answers,financial_obligations:financial},rule,route);assert.ok(!r.reason?.code.endsWith('.payment_and_completion_meaning_unconfirmed'));checked++;
 }
 assert.equal(isIndependentPaidFinancialFact(contract.routeKey,{...question,prompt:'Are amounts paid or otherwise satisfied?'}),false);
 assert.equal(isIndependentPaidFinancialFact(contract.routeKey,{...question,helperText:'different meaning'}),false);
 assert.equal(isIndependentPaidFinancialFact('XX:not-a-registered-route',question),false);checked+=3;
}
assert.deepEqual(observedStatusScopes.sort(),Object.keys(statusGuidanceScopes).sort());checked++;
assert.deepEqual(observedGuardedScopes.sort(),Object.keys(guardedGuidanceScopes).sort());checked++;
assert.deepEqual(observedWy1401Scopes,[`WY:${WY_1401_ROUTE}`]);checked++;
console.log(JSON.stringify({status:'PASS',checked,originalPaidContracts:catalog.independentPaidFactContracts.length,positiveCarryContracts:catalog.contracts.length,
 statusGuidanceRelevanceOnly:observedStatusScopes,sourceGuardedGuidanceRelevanceOnly:observedGuardedScopes,wy1401CollectionRelevanceOnly:observedWy1401Scopes,
 scope:'Isolated actual timing helper,139 exact paid-only contracts; no inferred payment/waiver exception, independent blockers and input bytes preserved. Exact adopted status-guidance relevance scopes and nine source-guarded guidance scopes do not infer paid-answer meaning; generic paid-meaning controls for those nine execute with source applicability invalidated; unreviewed source/profile/route drift restores financial visibility and changed question meaning refuses both reviewed contracts. This is not139 protected journeys or proof that a waiver satisfies any jurisdiction rule.'}));
