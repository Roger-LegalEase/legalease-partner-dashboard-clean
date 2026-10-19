import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 ky_0:["\"misdemeanor-violation-traffic-conviction\"", "\"unassigned-route\""],
 ky_1:["\"nonconviction-431076\"", "\"unassigned-route\""],
 ky_2:["\"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"", "\"unassigned-route\""],
 ky_context:["[\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"].includes(pathwayId ?? \"\")\n            && contactRepresentationHash(profile) === \"4e84c6d8ba6469a095c50f09cacfb5518c4132d049fbf068513c6eb925e6a364\"", "[\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"].includes(pathwayId ?? \"\")"],

 fl_sealing:['"court-ordered-sealing-943-059"','"unassigned-route"'],
 fl_juvenile:['"early-juvenile-expunction-943-0515"','"unassigned-route"'],
 fl_trafficking:['"human-trafficking-victim-expunction-943-0583"','"unassigned-route"'],
 fl_diversion:['"juvenile-diversion-expunction-943-0582"','"unassigned-route"'],
 fl_defense:['"lawful-self-defense-expunction-943-0578"','"unassigned-route"'],
 ga_automatic:['"automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"','"unassigned-route"'],
 ga_context:['pathwayId === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"\n            && contactRepresentationHash(profile) === "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef"','pathwayId === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"'],

 inactive:['"co_petition_record_type_history", "dc_fl_petition_record_type_history",','"co_petition_record_type_history",'],
 unknown_marker:['dcFlPetitionRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))','false'],
 context:['["dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_nonconviction_16_806"].includes(pathwayId ?? "")\n        && contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830"','["dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_nonconviction_16_806"].includes(pathwayId ?? "")'],
 fl_context:['contactRepresentationHash(profile) === "aca558d3077491f0c09abe838d08b926c0cbe8b194ac1c4500d93520d9a32034"','true'],
 ownership:['dcFlPetitionRecordHistory && !overrideClass && !needsHuman.has(factId)','dcFlPetitionRecordHistory'],
 collection:['if (factId === "record_type" && dcFlPetitionRecordHistory','if (factId === "record_type" && false'],
 loss:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); delete shapesPreserved.packetAnswers.record_type;'],
 priority:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); if (Array.isArray(shapesPreserved.packetAnswers.record_type)) shapesPreserved.packetAnswers.record_type = "Conviction";'],
 question:['function dcFlPetitionRecordHistoryQuestion(question, history) {','function dcFlPetitionRecordHistoryQuestion(question, history) { return question;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],['ky_0','ky_1','ky_2','ky_context','collection','context','fl_context','ownership','fl_sealing','fl_juvenile','fl_trafficking','fl_diversion','fl_defense','ga_automatic','ga_context'].includes(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {dcFlPetitionRecordIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
// GA-17 Q-8105d5d0b28ebd1e4a67 / Q-c8633872a982712e7803 / Q-94c8f0620f0384854d98.
// GA-17 Q-ab7cc6744570b24e17d4 / Q-481c00319478c8236160 / Q-1ee2fb0eca77febaf2b6.
// GA-17 Q-748f73bc4bcf41923fcc / Q-6acd9d8d275e7be59682 / Q-8c94453e5af32f59406d / QD-fb5a90b4c42ab7e486c1.
// Current held consumer proof; the historical blank builder is not re-certified.
const read=p=>JSON.parse(fs.readFileSync(p));
// GA-17 Q-6add858b65f867a82b70 / Q-502bf587f9925e5e6e79 / Q-00caec14a5a59750b527: exact source-bound Kentucky record history.
const cases=[
 {"state": "KY", "route": "misdemeanor-violation-traffic-conviction", "result": "not_covered_yet", "payment": false, "reason": "ky.intentional_unsupported_route"},
 {"state": "KY", "route": "nonconviction-431076", "result": "needs_review", "payment": false, "reason": "ky.waiting_rule_not_executed"},
 {"state": "KY", "route": "void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276", "result": "needs_review", "payment": false, "reason": "ky.waiting_rule_not_executed"},

 {state:'DC',route:'dc_motion_seal_misdemeanor_conviction_5yr_16_806',result:'not_covered_yet',payment:false,reason:'dc.intentional_unsupported_route'},
 {state:'DC',route:'dc_motion_seal_nonconviction_16_806',result:'not_covered_yet',payment:false,reason:'dc.intentional_unsupported_route'},
 {state:'FL',route:'court-ordered-expunction-943-0585',result:'needs_review',payment:false,reason:'fl.waiting_rule_not_executed'},
 {"state":"FL","route":"court-ordered-sealing-943-059","result":"guidance_only","payment":false,"reason":"fl.guidance_only_no_user_filed_court_petition"},
 {"state":"FL","route":"early-juvenile-expunction-943-0515","result":"not_covered_yet","payment":false,"reason":"fl.intentional_unsupported_route"},
 {"state":"FL","route":"human-trafficking-victim-expunction-943-0583","result":"needs_review","payment":false,"reason":"fl.waiting_rule_not_executed"},
 {"state": "FL", "route": "juvenile-diversion-expunction-943-0582", "result": "guidance_only", "payment": false, "reason": "fl.juvenileDiversion_conditional_information"},
 {"state": "FL", "route": "lawful-self-defense-expunction-943-0578", "result": "guidance_only", "payment": false, "reason": "fl.selfDefense_conditional_information"},
 {"state": "GA", "route": "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions", "result": "guidance_only", "payment": false, "reason": "ga.guidance_only_no_user_filed_court_petition"}
];
const predecessorHashes={"misdemeanor-violation-traffic-conviction":"c0899ab93902c859a3cf1c6af06a10d646587e746bcabe46179d1bb1e31d383c","nonconviction-431076":"531875c911e7dc0288319c9d9fe9c6329f37fed9ec3c58790818e17d8e717a7c","void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276":"172efe74ee336e832e100d74ee05d6b1090165a80bd9cf58879f06d0167b82d4","dc_motion_seal_misdemeanor_conviction_5yr_16_806": "2151f25f31aa842d96d4cf4eae4e51c4c06f723a4b990f9e8922dd8c9f6d3fbd", "dc_motion_seal_nonconviction_16_806": "da1a999021ebf099a165e1d30f62c25c58bcb0c4e5ca709f0ccf57f39d8089fb", "court-ordered-expunction-943-0585": "89d9f01b4f3283b3760e4a21fca075bc948a96d2c5d973aa78f023c4dee107c1", "court-ordered-sealing-943-059": "b91cd98fe3b9f673023369ff6f28eee0e5b61282a527b0aa97b96605b90d9df1", "early-juvenile-expunction-943-0515": "f073d4e9daabbfb2953196c4a069094062f9f3ced9ad764c8a2926ec916210b1", "human-trafficking-victim-expunction-943-0583": "e6502befee04de2d1258dc7bffcfa40081f3f49c49be74ed7c792b04275378de", "juvenile-diversion-expunction-943-0582": "0835b875bbe4d563029141334795658e1784baacd5c72c9b90b2b03647a7cd76", "lawful-self-defense-expunction-943-0578": "2167351db9f9e46b127b24b0120f8aea47f568417dd07bd703679ccccfeef1e5", "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions": "e84c65022897f61a29de80a8dd9615737b38e3d9245a17879c1f301bfd52f21c"};
const witnesses=read('data/rcap-ledger/public-witness-fixtures.json').fixtures;
// Synthetic inputs reuse FL conditional-information cases and GA public screening facts.
// They do not establish diversion, certification, restriction, or fulfillment authority.
witnesses.push(...[
  {
    "pathwayKey": "FL:juvenile-diversion-expunction-943-0582",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "age_at_offense": 17,
      "case_outcome": "Juvenile adjudication or offense committed as a minor",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "identity_error": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pending_cases": "No",
      "possible_pathway_context": "Juvenile diversion expunction - 943.0582",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ],
      "trafficking_status": "No"
    }
  },
  {
    "pathwayKey": "FL:lawful-self-defense-expunction-943-0578",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "age_at_offense": 30,
      "case_outcome": "Arrest or citation with no charge filed",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "identity_error": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pending_cases": "No",
      "possible_pathway_context": "Lawful self-defense expunction - 943.0578",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ],
      "trafficking_status": "No"
    }
  },
  {
    "pathwayKey": "GA:automatic-restriction-of-qualifying-post-july-1-2013-non-convictions",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pardon_status": "No",
      "pending_cases": "No",
      "possible_pathway_context": "Automatic restriction of qualifying post-July 1, 2013 non-convictions",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ]
    }
  }
]);
// Run this same behavioural assertion on the predecessor before implementing the correction.
if(process.argv.includes('--regression-only')){
 let failures=0;
 for(const {state,route}of cases){
  const witness=witnesses.find(f=>f.pathwayKey===`${state}:${route}`);assert(witness);
  const authoritative=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-red-'+route,answers:witness.answers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  const model=P.protectedPacketInformationModelFor({status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot});assert(model);
  try{assert(!model.missingInputIds.includes('record_type'));assert(!model.builderQuestions.some(q=>q.id==='record_type'));console.log(JSON.stringify({route,status:'PASS'}));}
  catch(error){failures++;console.error(JSON.stringify({route,failedCheck:'blank generic record labels must not be required',missing:model.missingInputIds.includes('record_type'),error:error.message}));}
 }
 process.exit(failures?1:0);
}
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const rawCases=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure',
 ['Arrest or charge','Court case','Conviction'],['Juvenile matter','Conviction'],
 {unknown:true,value:'Court case'},null];
const records=new Map();let checks=0, httpCases=0;
const check=(name,fn)=>{try{fn();checks++;}catch(error){console.error(JSON.stringify({failedCheck:name,checks}));error.message=name+': '+error.message;throw error;}};
const safety=s=>Object.fromEntries(['pathwayId','resultCode','paymentAllowed','selectedTrackId','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
for(const context of cases){
const {state,route,result,payment,reason}=context,key=`${state}:${route}`;
const witness=witnesses.find(f=>f.pathwayKey===key);assert(witness);
check(key+': exact source purpose and unchanged authority',()=>{
 assert.equal(packetSpecificationFor(key),undefined);
 const profile=getProfileByJurisdiction(state);assert(history(profile,route,undefined));
 assert(!profile.questions.some(q=>q.id==='record_type'));
 for(const change of [p=>p.source.sourceCorpusSha256='wrong',p=>p.questions.push({id:'record_type'})]){const p=structuredClone(profile);change(p);assert(!history(p,route,undefined));}
 for(const other of profile.pathways.filter(p=>!cases.some(c=>c.state===state&&c.route===p.id)))assert(!history(profile,other.id,undefined));assert(!history(profile,route,{routeKey:key}));
 const input={jurisdiction:state,pathwayId:route,requiredInputIds:['record_type'],serverFacts:{},screeningAnswers:{},savedAnswers:{},specification:null,questionById:new Map()};
 const fact=resolvePacketCollection(input).facts[0];assert.equal(fact.source,'dc_fl_petition_record_type_history');assert.equal(fact.active,false);assert.equal(fact.optional,true);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['record_type'])}).facts[0].source,fact.source);
 for(const override of [{classes:{record_type:'unresolved'}},{needsHumanClassification:['record_type']}]){
  const protectedFact=resolvePacketCollection({...input,override:{routeKey:key,note:'synthetic explicit ownership',...override}}).facts[0];
  assert.notEqual(protectedFact.source,fact.source);assert.equal(protectedFact.collection,'unresolved');
 }
 for(const other of profile.pathways.filter(p=>!cases.some(c=>c.state===state&&c.route===p.id)))assert.notEqual(resolvePacketCollection({...input,pathwayId:other.id}).facts[0].source,fact.source);
 const authority=packetFulfillmentAuthority(state,route,'checkout creation');
 assert.equal(authority.allowed,false);
 assert.equal(authority.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
});
for(const [label,delta,expectedResult,expectedReason]of [
 ['refused ownership',{ownership_scope:'No'},'hard_stop',state.toLowerCase()+'.ownership_scope_hard_stop'],
 ['uncertain disposition',{case_outcome:'I am not sure'},'needs_review',state.toLowerCase()+'.source_fact_unknown']
])check(key+': '+label+' keeps its actual predecessor outcome and raw history',()=>{
 const answers={...witness.answers,...delta};
 const a=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-boundary-'+route,answers});
 assert.equal(a.evaluation.resultCode,expectedResult);assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.reasons[0].code,expectedReason);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 for(const raw of rawCases){
  const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers.record_type=structuredClone(raw);
  const r=P.evaluateProtectedPacketFacts(snapshot).evaluation;
  assert.equal(r.resultCode,expectedResult);assert.equal(r.paymentAllowed,false);assert.equal(r.reasons[0].code,expectedReason);
  const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 }
});
for(const [label,outcome] of [['original-witness',witness.answers.case_outcome],['separate-matter-same-route',witness.answers.case_outcome]]){
 const answers={...witness.answers,case_outcome:outcome};
 const a=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-'+route+'-'+label,answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 assert.equal(seed.hash,predecessorHashes[route],"actual captured predecessor draft hash unchanged");
 const original={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 records.set('synthetic-'+route+'-'+label,original);
 check(key+'/'+label+': public packet surface retains optional overlapping history',()=>{
  for(const raw of [undefined,['Arrest or charge','Court case','Conviction'],{unknown:true,value:'Court case'}]){
   const item={state,paymentAllowed:payment,resultCode:result,artifactRefs:{commercialFlow:{
    screening:{pathwayId:route,packetPlan:seed.snapshot.packetPlan,answers},
    packetInformation:{answers:raw===undefined?{}:{record_type:raw},prefilledAnswers:{}}
   }}};
   const before=structuredClone(item);const m=P.packetInformationModelFor(item);assert(m);
   assert(!m.missingInputIds.includes('record_type'));
   if(raw===undefined)assert(!m.builderQuestions.some(q=>q.id==='record_type'));
   else{const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
   assert.deepEqual(item,before);
  }
 });
 check(label+': actual route state, fulfillment refusal and blank-history suppression',()=>{
  assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.resultCode,result);assert.equal(a.evaluation.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...seed.snapshot,state},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
  assert.equal(a.evaluation.reasons[0].code,reason);
  const m=P.protectedPacketInformationModelFor(original);assert(m);
  assert(!m.builderQuestions.some(q=>q.id==='record_type'));assert(!m.missingInputIds.includes('record_type'));
  const q=m.questions.find(q=>q.id==='record_type');if(q){assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
 });
 for(const map of maps)for(const raw of rawCases){
  const record=structuredClone(original);record.draftSnapshot[map].record_type=structuredClone(raw);
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  check(`${label}/${map}/${JSON.stringify(raw)}: no exclusive-value or juvenile inference`,()=>{
   const m=P.protectedPacketInformationModelFor(record);assert(m);const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));assert(q.translations.es.helperText.includes('coincidir'));
   assert(!m.missingInputIds.includes('record_type'));
   if(JSON.stringify(raw)===JSON.stringify(['Juvenile matter','Conviction'])){const retained=m.builderQuestions.find(q=>q.id==='record_type');assert(retained);assert.equal(retained.required,false);}
   const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
   assert.equal(r.pathwayId,route);assert.equal(r.resultCode,result);assert.equal(r.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...record.draftSnapshot,state},route);assert.equal(price.enabled,false);
   assert.equal(r.reasons[0].code,reason);
   assert.deepEqual(safety(record.draftSnapshot),safety(seed.snapshot));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  });
 }
}
}
// Existing unsupported/held results and fulfillment refusal remain separate from history.
// Legal classification and route selection remain governed by their existing answers.
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-dc-fl-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: records.get(id).draftSnapshot.jurisdiction, artifactRefs: {} });
globalThis.__dcFlPetitionHistoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-dc-fl-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-fl-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-fl-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__dcFlPetitionHistoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original] of [...records]){
 const {payment,reason}=cases.find(c=>c.route===original.draftSnapshot.pathwayId);
 const stored=structuredClone(original);
 stored.draftSnapshot.screeningAnswers.record_type=['Arrest or charge','Court case','Conviction'];
 stored.draftSnapshot.prefilledAnswers.record_type={unknown:true,value:'Court case'};
 stored.draftSnapshot.packetAnswers.record_type=['Juvenile matter','Conviction'];
 stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const otherMatters=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;
 check(id+': HTTP no-op keeps overlapping history',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 response=await post(id,{participant_full_legal_name:'Synthetic '+id});httpCases++;
 check(id+': unrelated permitted save preserves all original raw record labels',()=>{assert.equal(response.status,200);const next=records.get(id);for(const map of maps)assert.deepEqual(next.draftSnapshot[map].record_type,stored.draftSnapshot[map].record_type);assert.equal(next.draftSnapshot.paymentAllowed,payment);});
 for(const value of ['Court case','I am not sure']){
  response=await post(id,{record_type:value});httpCases++;const body=await response.json();
  check(id+': explicit optional history amendment '+value+' archives every raw label',()=>{
   assert.equal(response.status,200);const next=records.get(id);assert.equal(next.draftSnapshot.packetAnswers.record_type,value);
   for(const map of maps){const entry=next.draftSnapshot.dependencies.semanticAnswerHistory.find(h=>h.factId==='record_type'&&h.source===map);assert(entry,map);assert.deepEqual(entry.value,stored.draftSnapshot[map].record_type);
    for(const fact of ['case_outcome','offense_level','age_at_offense','age','sentence_completion_date'])assert.deepEqual(next.draftSnapshot[map][fact],stored.draftSnapshot[map][fact]);}
   assert.equal(next.draftSnapshot.paymentAllowed,payment);assert.equal(next.status,'unverified');assert.equal(body.readyToGenerate,false);assert(!body.missingInputIds.includes('record_type'));
   assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,reason);
   for(const[k,v]of otherMatters)assert.deepEqual(records.get(k),v);
  });
 }
 const stable=structuredClone(records.get(id));
 response=await post(id,{record_type:['Court case','Conviction']});httpCases++;const rejected=await response.json();
 check(id+': new unsupported multi-value rewrite refused without losing historical arrays',()=>{
  assert.equal(response.status,422);assert.equal(rejected.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stable);
 });
 const savesBefore=saves;
 for(const [kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-dc-fl-owner';
  response=await post(id,{record_type:'Court case'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+': '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-dc-fl-owner';
}
delete globalThis.__dcFlPetitionHistoryTransport;
console.log(JSON.stringify({status:'PASS_DC_FL_PETITION_OPTIONAL_HISTORY',checks,httpCases,originalIds:["Q-6add858b65f867a82b70","Q-502bf587f9925e5e6e79","Q-00caec14a5a59750b527",'Q-748f73bc4bcf41923fcc','Q-6acd9d8d275e7be59682','Q-8c94453e5af32f59406d','Q-8105d5d0b28ebd1e4a67','Q-c8633872a982712e7803','Q-94c8f0620f0384854d98','Q-ab7cc6744570b24e17d4','Q-481c00319478c8236160','Q-1ee2fb0eca77febaf2b6','QD-fb5a90b4c42ab7e486c1'],routes:cases.map(c=>c.state+':'+c.route),limits:['Existing DC/FL/GA/KY unsupported, held and guidance outcomes retained; actual NO_RECORD/payment refusal unchanged; no whole GA17 closure.','No database, output rendering, source change, hosted authorization or commercial delivery; draft EN/ES needs qualified review.']}));
