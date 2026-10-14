// Original Q-881219f601f85edb6881. Independent factual-contract slice only.
// No evaluator, protected owner, generated form or closure claim.
import assert from 'node:assert/strict';import fs from 'node:fs';import{register}from'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {MT_DEFERRED_ROUTE:route,MT_DEFERRED_QUESTIONS:questions,MT_DEFERRED_FACT_IDS:ids,isMontanaDeferredContract:contract,montanaDeferredFactApplies:applies,montanaDeferredFacts:facts}=await import('../src/lib/rcap-engine/montana-deferred-facts.ts');
const profile=getProfileByJurisdiction('MT'),memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MT.memo.json')).tracks.find(t=>t.trackId==='mt_deferred_dismissal');
assert(JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json')).originalMissingWitnesses.some(x=>x.questionRecordId==='Q-881219f601f85edb6881'&&x.routeKey==='MT:'+route));
assert(memo.controllingAuthority.citations.includes('Mont. Code Ann. § 46-18-204'));assert.equal(memo.outputStrategy,'composed');
for(const id of ['deferredNotSuspended','deferralPeriodExpired','conditionsCompleted','revocationPetitionFiled','clerkContacted'])assert(memo.participantInputs.some(q=>q.key===id));
assert(memo.controllingAuthority.summary.includes('SHALL')&&memo.controllingAuthority.summary.includes('MAY'));assert(memo.participantInputs.find(q=>q.key==='conditionsCompleted').question.includes('fines and fees'));
assert(memo.legalDesignDecision.limitations.some(x=>x.statement.includes('DS-100')&&x.statement.includes('never generated')));
const base={mt_deferred_order_type:'deferred',mt_deferred_offense_grade:'felony',mt_deferred_term_status:'expired',mt_deferred_conditions_status:'yes',mt_deferred_financial_order_status:'paid',mt_deferred_revocation_petition:'no',mt_deferred_dismissal_order:'no',mt_deferred_court_record_status:'not_checked',mt_deferred_criss_record_status:'not_checked',financial_obligations:'No',court_requirements_completed:'no'};
assert.equal(facts(profile,route,base).context,'felony_statutory_request_context');
const cases=[
 ['felony full term',{mt_deferred_term_status:'expired'},'felony_statutory_request_context'],
 ['felony court termination',{mt_deferred_term_status:'terminated_by_order'},'felony_statutory_request_context'],
 ['misdemeanor discretionary',{mt_deferred_offense_grade:'misdemeanor'},'misdemeanor_discretionary_request_context'],
 ['misdemeanor revocation does not invent mandatory test',{mt_deferred_offense_grade:'misdemeanor',mt_deferred_revocation_petition:'yes'},'misdemeanor_discretionary_request_context'],
 ['felony revocation petition',{mt_deferred_revocation_petition:'yes'},'mandatory_limb_unavailable'],
 ['suspended sentence',{mt_deferred_order_type:'suspended'},'outside_deferred_mechanism'],
 ['other sentence',{mt_deferred_order_type:'other'},'outside_deferred_mechanism'],
 ['ongoing term',{mt_deferred_term_status:'still_running'},'term_not_terminated'],
 ['uncompleted conditions',{mt_deferred_conditions_status:'no'},'conditions_need_review'],
 ['actual remaining balance',{mt_deferred_financial_order_status:'balance_remaining'},'conditions_need_review'],
 ['explicit written waiver',{mt_deferred_financial_order_status:'waived_by_order'},'felony_statutory_request_context'],
 ['none ordered',{mt_deferred_financial_order_status:'none_ordered'},'felony_statutory_request_context'],
 ['unknown actual balance',{mt_deferred_financial_order_status:'unknown'},'facts_unresolved'],
 ['no actual order fact',{mt_deferred_order_type:undefined},'facts_unresolved'],
 ['confidential court does not prove CRISS updated',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'confidential',mt_deferred_criss_record_status:'not_updated'},'existing_order_followup'],
 ['updated CRISS does not prove court confidential',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'public',mt_deferred_criss_record_status:'updated'},'existing_order_followup'],
 ['dismissal status unknown',{mt_deferred_dismissal_order:'unknown'},'facts_unresolved'],
 ['existing order with unknown repository',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'confidential',mt_deferred_criss_record_status:'unknown'},'facts_unresolved']
];
for(const[name,patch,context]of cases){const answers={...base,...patch},original=structuredClone(answers);assert.equal(facts(profile,route,answers).context,context,name);assert.deepEqual(answers,original);}
for(const finance of ['Yes','No','I am not sure',undefined])for(const generic of ['yes','no','unknown']){
 const answers={financial_obligations:finance,court_requirements_completed:generic,possible_pathway_context:profile.pathways.find(p=>p.id===route).label};assert.deepEqual(facts(profile,route,answers),{context:'facts_unresolved',ids:['mt_deferred_order_type']});
 const complete={...base,financial_obligations:finance,court_requirements_completed:generic};assert.equal(facts(profile,route,complete).context,'felony_statutory_request_context');assert(applies(profile,route,complete,'financial_obligations'));
}
for(const q of questions){assert(q.prompt&&q.translations.es.prompt);assert(q.doesNotSelectPathway);for(const option of q.options)assert(q.optionDisplay[option].label&&q.optionDisplay[option].translations.es.label);
 for(const value of [undefined,'',[],[base[q.id]],{}, {value:base[q.id],unknown:false},'unknown']){
  const answers={...base,mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'confidential',mt_deferred_criss_record_status:'updated',[q.id]:value};assert.equal(facts(profile,route,answers).context,'facts_unresolved',q.id+JSON.stringify(value));
 }
}
assert.equal(ids.length,9);assert.equal(new Set(ids).size,9);
assert(!applies(profile,route,base,'mt_deferred_criss_record_status'));assert(applies(profile,route,{...base,mt_deferred_dismissal_order:'yes'},'mt_deferred_criss_record_status'));
for(const[name,mutate]of [['state',p=>p.jurisdiction.code='MO'],['version',p=>p.profileVersion='other'],['source',p=>p.source.sourceCorpusSha256='other'],...Object.entries({decisionId:'other',ruleId:'other',stage:'petition',outcomeMode:'packet_assembly',paymentAuthority:'open'}).map(([key,value])=>[key,p=>p.pathways.find(p=>p.id===route).legalAuthority[key]=value])]){
 const p=structuredClone(profile);mutate(p);assert(!contract(p,route),name);assert.equal(facts(p,route,base).context,'not_applicable');assert(!applies(p,route,base,ids[0]));
}
for(const sibling of profile.pathways.filter(p=>p.id!==route)){assert(!contract(profile,sibling.id));assert.equal(facts(profile,sibling.id,base).context,'not_applicable');assert(applies(profile,sibling.id,base,'financial_obligations'));}
console.log(JSON.stringify({status:'PASS_MT_DEFERRED_FACTUAL_CONTRACT_ONLY',originalIdentity:'Q-881219f601f85edb6881',cases:cases.map(c=>c[0]),rawHistoryNotInferred:true,sourceContractGuards:true,remaining:['Real evaluator/public/protected integration','Wrong MMRTA form mapping correction','Actual ENES owner and document acceptance','Independent review']}));
