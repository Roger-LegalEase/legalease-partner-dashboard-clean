// GA-12 Q-cde3ef0a5bed58e60545 / Q-51b8ea53b02426f2f685 / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutations={
 sd_metadata:['south-dakota-sis-facts.ts','"postpay_packet_field"','"prepay_route_splitter"'],
 wy_metadata:['wyoming-1502-facts.ts','"postpay_packet_field"','"prepay_route_splitter"'],
 public_leak:['api/expungement-ai/evaluate/route.ts','!protectedRecordIds.has(id)','true'],
 retained_progress:['api/expungement-ai/screening/progress/route.ts','!retainedRecordIds.has(id)','true'],
 hidden_progress:['api/expungement-ai/screening/progress/route.ts','isDeepStrictEqual(answers[id], draft.row.answers[id])','true']
};
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.slice(11);
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replaceAll(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const S=await import('../src/lib/rcap-engine/south-dakota-sis-facts.ts'),W=await import('../src/lib/rcap-engine/wyoming-1502-facts.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const publicAPI=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {NextRequest}=await import('next/server');
const progressUrl=pathToFileURL(process.cwd()+'/src/app/api/expungement-ai/screening/progress/route.ts').href;
let progressSource=fs.readFileSync(new URL(progressUrl),'utf8');
const from='import { RCAP_DRAFT_COOKIE, authorizedRcapDraft, sealRcapDraft, rcapDraftCookieOptions } from "@/lib/expungement-ai/rcap-screening-draft";';assert(progressSource.includes(from));
progressSource=progressSource.replace(from,`const RCAP_DRAFT_COOKIE='test-draft';const authorizedRcapDraft=async()=> (globalThis as any).__sdWyDraft;const sealRcapDraft=()=> 'isolated';const rcapDraftCookieOptions={httpOnly:true};`);
if(mutation&&mutations[mutation][0].endsWith('/progress/route.ts')){const [,a,b]=mutations[mutation];assert(progressSource.includes(a));progressSource=progressSource.replaceAll(a,b);}
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:progressUrl,source:ts.transpileModule(progressSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const progressAPI=await import(progressUrl),witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
let checks=0,httpCases=0;const counts={};
const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
for(const [state,route,ids,questions]of [['SD',S.SD_SIS_ROUTE,S.SD_SIS_FACT_IDS,S.SD_SIS_QUESTIONS],['WY',W.WY_1502_ROUTE,W.WY_1502_FACT_IDS,W.WY_1502_QUESTIONS]]){
 const profile=getProfileByJurisdiction(state),pub=projectPublicProfile(profile),witness=witnesses.find(w=>w.pathwayKey===state+':'+route);assert(witness);
 const answers={...witness.answers,...(state==='SD'?{sd_sis_teaching_licence:'Yes'}:{case_outcome:'Felony conviction',wy1502_multiple:'Yes'})};
 for(const id of ids)delete answers[id];
 const selected=selectScreeningQuestionIds(profile,pub,answers);counts[state]=selected.length;
 check(state+'/free screening excludes exact record facts',()=>{assert(selected.length<=15);assert(!selected.some(id=>ids.includes(id)));for(const q of questions){assert.equal(q.stage,'packet_information');assert.equal(q.lifecyclePhase,'postpay_packet_field');}});
 const authoritative=evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-record-stage',answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(record),model=P.protectedPacketInformationModelFor(record);assert(model);
 check(state+'/protected intake keeps required review and raw snapshot',()=>{for(const id of P.factualPathwayCorrectionIds(state,route,answers).filter(id=>ids.includes(id)))assert(model.questions.some(q=>q.id===id));assert(authoritative.evaluation.missingQuestionIds.some(id=>ids.includes(id)));assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);assert.deepEqual(record,before);assert.equal(authoritative.evaluation.paymentAllowed,false);});
 const response=await publicAPI.POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-record-stage',answers})}));httpCases++;const result=await response.json();
 check(state+'/public result directs no exact record correction',()=>{assert.equal(response.status,200);assert(!result.missingQuestionIds.some(id=>ids.includes(id)));assert.deepEqual(result.reasons,authoritative.evaluation.reasons);assert.equal(result.paymentAllowed,false);assert.equal(result.consumerPacketAvailable,false);});
 const publicMissing=await publicAPI.POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-record-stage',answers:{...answers,ownership_scope:'No'}})}));httpCases++;
 check(state+'/ownership refusal unchanged',()=>assert.equal((evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-record-stage',answers:{...answers,ownership_scope:'No'}})).evaluation.resultCode,'hard_stop'));
 assert.equal((await publicMissing.json()).resultCode,'hard_stop');
 // NB-1: lead accepted moved-fact uncertainty as the absent-fact result, with protected intake retained.
 for(const id of ids)check(state+'/'+id+'/explicit moved-fact uncertainty matches absence without payment',()=>{
  const full={...witness.answers,...(state==='SD'?{sd_sis_granted:'Yes',sd_sis_discharge_dismissal:'Yes',sd_sis_record_public:'Yes',sd_sis_prior_felony:'No',sd_sis_prior_sis:'No',sd_sis_teaching_licence:'Yes',sd_sis_specified_charge:'No'}:{case_outcome:'Felony conviction',wy1502_citations:'6-3-402(a)',wy1502_completed_deferral:'No',wy1502_multiple:'Yes',wy1502_related:'Yes',wy1502_terms_ended:'2010-01-01',wy1502_program_complete:'Yes',wy1502_restitution_paid:'Yes',wy1502_other_felony:'No',wy1502_firearm:'No',wy1502_prior_relief:'No',wy1502_victim:'No',wy1502_registration:'No'})};
  const unsure={...full,[id]:'I am not sure'},absent={...full};delete absent[id];const before=structuredClone(unsure);
  const run=a=>evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-moved-uncertainty',answers:a});const result=run(unsure),blank=run(absent).evaluation;assert.deepEqual({...result.evaluation,missingQuestionIds:[]},{...blank,missingQuestionIds:[]});assert.deepEqual(blank.missingQuestionIds,[id]);assert.deepEqual(result.evaluation.missingQuestionIds,state==='SD'?[id]:[]);
  assert.equal(result.evaluation.resultCode,state==='SD'?'guidance_only':'needs_review');assert(result.evaluation.reasons.some(r=>r.code===(state==='SD'?'sd.sis_missing':'wy.felony1502_missing')));assert(!result.evaluation.reasons.some(r=>r.code.endsWith('.source_fact_unknown')));assert.equal(result.evaluation.paymentAllowed,false);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:result,screeningAnswers:unsure,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};const saved=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(m);assert(m.questions.some(q=>q.id===id));
  if(state==='SD'){assert(result.evaluation.packetPlan);assert(m.missingInputIds.includes('participant_full_legal_name'));}
  assert.equal(seed.snapshot.screeningAnswers[id],'I am not sure');assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,saved);assert.deepEqual(record,saved);assert.deepEqual(unsure,before);
 });
 const q=questions[0],saved=Object.fromEntries(selected.filter(id=>Object.hasOwn(answers,id)).map(id=>[id,answers[id]]));
 // Raw historical values remain in storage; these are not newly accepted answers.
 for(const raw of ['I am not sure',{value:'legacy literal',unknown:true},['old','shape']]){
  const draft={row:{session_id:'TEST-record-stage',jurisdiction:state,answers:{...saved,[q.id]:raw},current_question_id:'ownership_scope',updated_at:'2026-10-18T00:00:00Z'},db:{from:()=>{throw Error('Unexpected draft write');}}};globalThis.__sdWyDraft=draft;
  for(const [name,a,status]of [['identical raw',draft.row.answers,200],['hidden edit',{...draft.row.answers,[q.id]:'different'},400]]){
   const before=structuredClone(draft.row);const response=await progressAPI.PUT(new NextRequest('http://isolated.invalid/api/expungement-ai/screening/progress',{method:'PUT',headers:{host:'isolated.invalid',origin:'http://isolated.invalid','content-type':'application/json'},body:JSON.stringify({sessionId:'TEST-record-stage',profileVersion:profile.profileVersion,currentQuestionId:'ownership_scope',answers:a})}));httpCases++;
   check(state+'/progress '+name+'/'+JSON.stringify(raw),()=>{assert.equal(response.status,status);assert.deepEqual(draft.row,before);});
  }
 }
 const draft=globalThis.__sdWyDraft;delete draft.row.answers[q.id];
 const injected=await progressAPI.PUT(new NextRequest('http://isolated.invalid/api/expungement-ai/screening/progress',{method:'PUT',headers:{host:'isolated.invalid',origin:'http://isolated.invalid','content-type':'application/json'},body:JSON.stringify({sessionId:'TEST-record-stage',profileVersion:profile.profileVersion,currentQuestionId:'ownership_scope',answers:{...draft.row.answers,[q.id]:'Yes'}})}));httpCases++;
 check(state+'/hidden insertion refused',()=>assert.equal(injected.status,400));
 globalThis.__sdWyDraft=null;
 const refused=await progressAPI.PUT(new NextRequest('http://isolated.invalid/api/expungement-ai/screening/progress',{method:'PUT',headers:{host:'isolated.invalid',origin:'http://isolated.invalid','content-type':'application/json'},body:'{}'}));httpCases++;
 check(state+'/missing draft authority refused',()=>assert.equal(refused.status,403));
}
delete globalThis.__sdWyDraft;
console.log(JSON.stringify({status:'PASS',checks,httpCases,counts,liveCalls:0,storedRawPreserved:true,noPaymentAuthority:true}));
