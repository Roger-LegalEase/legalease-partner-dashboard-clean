// GA-12 Q-3ab8bb479903ec6dc680 / Q-51b8ea53b02426f2f685 / QD-bd6b15fff22cbe1501cb; review B1/B2, N1/N4.
import fs from 'node:fs';import assert from 'node:assert/strict';import {register}from'node:module';
process.env.RCAP_EVALUATOR_TODAY='2026-10-18';register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutations={
 timing:['wyoming-1502-facts.ts','if (parsed > new Date','if (false && parsed > new Date'],
 reason_clock:['evaluator.ts','wy1502Facts(answers, evaluationToday().toISOString().slice(0, 10))','wy1502Facts(answers, "2099-01-01")'],
 next_step_clock:['evaluator.ts','wy1502Facts(request.answers, evaluationToday().toISOString().slice(0, 10))','wy1502Facts(request.answers, "2099-01-01")'],
 il_trafficking:['illinois-prostitution-facts.ts','if (answers.trafficking_status === "Yes")','if (false)'],
 wy_trafficking:['wyoming-1502-facts.ts','if (a.trafficking_status === "Yes")','if (false)'],
 completion:['illinois-prostitution-facts.ts','return completion === "yes" ? "record_review" : "completion";','return completion === "yes" ? "record_review" : "missing";']
};
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.slice(11);
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');const P=await import('../src/lib/expungement-ai/packet-information.ts');const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const I=await import('../src/lib/rcap-engine/illinois-prostitution-facts.ts'),W=await import('../src/lib/rcap-engine/wyoming-1502-facts.ts');
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
// Captured on ff27a277e before this correction; no predecessor hashes replaced.
const hashes={"IL-trafficking":"a61f68210d7bd74811a85ac36a29fbd8e6f9b1fce56078007afe7b39acd6919f","IL-positive":"bbf4dbd9e0516130c030659388c30fac8185e0cc5c77ffeb0791dffb928a4047","WY-recent":"5a118b467786911283d8af26661cbbcac8b58685c130e81b79c1d66e6dfd19f4","WY-future":"72eab3102ba2129062344dc87f07209c355d675b92e3cc2a288d38a3d58c79a9","WY-positive":"a94816afe801c01534f129a9c04fe08820bd2ea017fbd9e90d7c9131a0b5dae5","WY-trafficking":"dcad6adeba24427fa757b94b8cd415afe3b2a8d12337f9c3d2bb90951e96621c"};
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
for(const state of ['IL','WY']){
 const route=state==='IL'?I.IL_PROSTITUTION_ROUTE:W.WY_1502_ROUTE,w=fixtures.find(f=>f.pathwayKey===state+':'+route),profile=getProfileByJurisdiction(state);
 const base={...w.answers,case_outcome:'Felony conviction',offense_level:'Felony',...(state==='IL'?{il_prostitution_final_record:'Yes'}:{wy1502_citations:{value:'6-3-402',unknown:false},wy1502_completed_deferral:'No',wy1502_multiple:'No',wy1502_terms_ended:{value:'2010-10-18',unknown:false},wy1502_program_complete:'Yes',wy1502_restitution_paid:'Yes',wy1502_other_felony:'No',wy1502_firearm:'No',wy1502_prior_relief:'No',wy1502_victim:'Yes',wy1502_registration:'No'})};
 const evalFor=answers=>evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-il-wy-review-boundary',answers});
 const expected=(answers,code)=>{const before=structuredClone(answers),a=evalFor(answers),r=a.evaluation,copy=state==='IL'?I.IL_PROSTITUTION_COPY:W.WY_1502_COPY;assert.equal(r.pathwayId,route);assert.equal(r.paymentAllowed,false);assert.equal(r.reasons[0].code,(state==='IL'?'il.prostitution_':'wy.felony1502_')+code);assert.equal(r.reasons[0].text,copy[code]);assert.deepEqual(r.nextSteps,[copy[code]]);assert.deepEqual(answers,before);return a;};
 const variants=state==='IL'?[['IL-trafficking',{trafficking_status:'Yes'},'trafficking'],['IL-positive',{trafficking_status:'No'},'record_review']]:[['WY-recent',{wy1502_terms_ended:{value:'2024-01-01',unknown:false}},'timing'],['WY-future',{wy1502_terms_ended:{value:'2030-01-01',unknown:false}},'timing'],['WY-positive',{},'record_review'],['WY-trafficking',{trafficking_status:'Yes'},'trafficking']];
 for(const[name,patch,code]of variants)check(name+'/reviewer counterexample and saved predecessor',()=>{
  const answers={...base,...patch},a=expected(answers,code),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);assert.equal(seed.hash,hashes[name]);
  const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(record);assert(P.protectedPacketInformationModelFor(record));assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);assert.deepEqual(record,before);
  if(name==='WY-recent'){
   const changed=P.packetInformationPatch({protectedVerification:record,answers:{wy1502_terms_ended:{value:'2010-10-18',unknown:false}}});assert(changed);const next=changed.protectedTransition.nextVerification;assert.equal(next.revision,record.revision+1);assert.equal(next.draftSnapshot.paymentAllowed,false);assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId==='wy1502_terms_ended'&&h.value.value==='2024-01-01'));assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,'wy.felony1502_record_review');assert.deepEqual(record,before);
  }
 });
 if(state==='IL'){
  for(const value of ['not_sure','not_applicable'])check('IL completion '+value+' stays a settled hold',()=>{const r=expected({...base,court_requirements_completed:value},'completion').evaluation;assert.deepEqual(r.missingQuestionIds,[]);});
  check('IL ordinary record does not invent trafficking/No',()=>expected({...base,trafficking_status:'No'},'record_review'));
  check('IL uncertain trafficking stays in the existing source-fact hold',()=>{const r=evalFor({...base,trafficking_status:'I am not sure'}).evaluation;assert.equal(r.reasons[0].code,'il.source_fact_unknown');assert.equal(r.paymentAllowed,false);assert.deepEqual(r.missingQuestionIds,[]);});
  check('IL actual record exclusion retained',()=>expected({...base,case_outcome:'Misdemeanor conviction'},'record_conflict'));
 }else{
  for(const [ended,today,code]of [['2016-10-18','2026-10-17','timing'],['2016-10-18','2026-10-18','record_review'],['2016-10-18','2026-10-19','record_review'],['2016-02-29','2026-02-28','timing'],['2016-02-29','2026-03-01','record_review'],['9999-01-01','2026-10-18','timing']])check('WY ten-year boundary/'+ended+'/'+today,()=>{
   const prior=process.env.RCAP_EVALUATOR_TODAY;try{process.env.RCAP_EVALUATOR_TODAY=today;expected({...base,wy1502_terms_ended:{value:ended,unknown:false}},code);}finally{process.env.RCAP_EVALUATOR_TODAY=prior;}
  });
  for(const raw of [undefined,{unknown:true,value:'2024-01-01'}])check('WY blank/unknown date remains unresolved without promotion/'+JSON.stringify(raw),()=>{
   const answers={...base,wy1502_terms_ended:raw},before=structuredClone(answers),r=evalFor(answers).evaluation;assert.equal(r.paymentAllowed,false);assert(!r.reasons.some(x=>x.code==='wy.felony1502_record_review'));assert.equal(r.missingQuestionIds.includes('wy1502_terms_ended'),raw===undefined);assert.deepEqual(answers,before);
  });
  for(const[patch,code]of [[{wy1502_completed_deferral:'Yes'},'deferral'],[{wy1502_firearm:'Yes'},'firearm'],[{wy1502_other_felony:'Yes'},'history'],[{wy1502_terms_ended:{value:'2024-02-30',unknown:false}},'date']])check('WY actual exclusion/invalid date '+code,()=>expected({...base,...patch},code));
 }
}
console.log(JSON.stringify({status:'PASS',checks,savedPredecessors:6,liveCalls:0,paymentAllowed:false}));
