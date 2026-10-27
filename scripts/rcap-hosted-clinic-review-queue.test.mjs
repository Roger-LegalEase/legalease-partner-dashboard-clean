import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {CLINIC,hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {clinicReviewRequest,assertClinicReviewRecovery,continueClinicReview} from './rcap-hosted-clinic-review-queue.mjs';
import {clinicOwnerBrowserCookies,runClinicReviewSession} from './rcap-hosted-clinic-review-session.mjs';
import {planClinicUnverifiedSave} from './rcap-hosted-clinic-unverified-save-plan.mjs';
import {MS_NONCONVICTION_SCREENING_ANSWERS} from './lib/rcap-ms-nonconviction-fixture.mjs';
const root=process.env.CLINIC_PERSISTED_RESUME_ROOT;assert(root);
const recovery=JSON.parse(fs.readFileSync(root+'/clinic-postsave-get-recovery-actual-execution-20261027/extracted/result.json'));
const native=JSON.parse(fs.readFileSync(root+'/hosted-fulfillment-20261027/clinic-purpose-deploy-execution/run-40448248665/extracted/deploy.json'));
const config={origin:native.previewUrl,deploymentId:native.deployment.id,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item),bypass:'mock-only'};
const packet=config.origin+`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`,generate=config.origin+'/api/expungement-ai/packet/generate';
const body={answers:{},verify:true,expectedRevision:0},state={revision:0,verifyAttempts:0,generateAttempts:0,verified:false};
let checks=0;const check=fn=>{fn();checks++;};
check(()=>assert.equal(assertClinicReviewRecovery(recovery),0));
for(const mutate of [r=>r.revision=1,r=>r.missingInputCount=1,r=>r.recordClarificationCount=1,r=>r.original47KnownValueMismatchIds=['county'],r=>r.originalScreeningSevenRecovered=false,r=>r.acceptedPayloadReconstructionMatches=true]){
 const r=structuredClone(recovery);mutate(r);check(()=>assert.throws(()=>assertClinicReviewRecovery(r)));
}
check(()=>assert.equal(clinicReviewRequest(config,packet,'POST',body,state),'verify'));
for(const [url,method,payload,s] of [
 [packet,'POST',{...body,answers:{county:'do-not-write'}},state],
 [packet,'POST',{...body,verify:false},state],
 [packet,'POST',{...body,expectedRevision:1},state],
 [packet,'POST',{...body,confirmRecordFacts:['county']},state],
 [packet+'?editingFact=social_security_number','POST',body,state],
 [packet.replace(config.origin,'https://other.test'),'POST',body,state],
 [packet,'POST',body,{...state,verifyAttempts:1}],
 [generate,'POST',{briefcaseItemId:CLINIC.item},state],
 [generate,'POST',{briefcaseItemId:CLINIC.item},{...state,verifyAttempts:1,verified:true,generateAttempts:1}],
 [generate,'POST',{briefcaseItemId:CLINIC.item,dryRunMode:true},{...state,verifyAttempts:1,verified:true}],
 [generate,'POST',{briefcaseItemId:'another-matter'},{...state,verifyAttempts:1,verified:true}],
 [config.origin+'/api/expungement-ai/checkout','POST',{briefcaseItemId:CLINIC.item},state],
 [config.origin+'/api/rcap/packets/another-job/download','GET',null,state],
 [packet+'?editingFact=social_security_number','GET',null,state]
])check(()=>assert.equal(clinicReviewRequest(config,url,method,payload,s),null));
check(()=>assert.equal(clinicReviewRequest(config,generate,'POST',{briefcaseItemId:CLINIC.item},{...state,verifyAttempts:1,verified:true}),'generate'));
check(()=>assert.equal(clinicReviewRequest(config,config.origin+'/_next/static/chunks/app.js?dpl=mock','GET',null,state),'read'));

function mockContext({verifyStatus=200,windowFailure,duplicateGenerate=false}={}){
 const handlers=[],records=[],forwarded=[],windows=[];const page=new EventEmitter();
 let buttonClicks=0,closed=false;
 const request=async(url,body)=>{
  const req={url:()=>url,method:()=> 'POST',postDataJSON:()=>body,headers:()=>({'Content-Type':'application/json'})};
  let aborted=false;
  const dispatch=async index=>{
   if(index<0)throw Error('unguarded mock network');
   const route={request:()=>req,fallback:()=>dispatch(index-1),abort:async()=>{aborted=true;page.emit('close');},
    fetch:async()=>{forwarded.push(url);const reply=url===packet?{ok:true,itemId:CLINIC.item,revision:1,readyToGenerate:true}:{briefcaseItemId:CLINIC.item,packetStatus:'generating'};return {status:()=>url===packet?verifyStatus:200,body:async()=>Buffer.from(JSON.stringify(reply))};},
    fulfill:async({response})=>{page.emit('response',{request:()=>req,status:()=>response.status()});}
   };
   await handlers[index](route);
  };
  await dispatch(handlers.length-1);return aborted;
 };
 const context={route:async(_pattern,handler)=>handlers.push(handler),unroute:async(_pattern,handler)=>{const i=handlers.indexOf(handler);assert(i>=0);handlers.splice(i,1);},newPage:async()=>page};
 page.goto=async()=>({status:()=>200});page.locator=()=>({waitFor:async()=>{}});
 page.getByRole=()=>({count:async()=>1,isEnabled:async()=>true,click:async()=>{buttonClicks++;await request(packet,body);if(verifyStatus===200){await request(generate,{briefcaseItemId:CLINIC.item});if(duplicateGenerate)await request(generate,{briefcaseItemId:CLINIC.item});}}});
 page.close=async()=>{closed=true;page.emit('close');};
 const ports={assertContinuousWindow:async({phase})=>{windows.push(phase);if(phase===windowFailure)throw Error('mock window refusal');},checkpoint:value=>{records.push(structuredClone(value));},readQueuedTarget:async()=>({itemId:CLINIC.item,ownerId:CLINIC.owner,clinicEventId:CLINIC.event,status:'queued',exactTargetJobCount:1,jobId:'11111111-1111-4111-8111-111111111111',protectedReceiptSha256:'a'.repeat(64)})};
 return {context,ports,records,forwarded,windows,inspect:()=>({buttonClicks,closed,handlers:handlers.length})};
}
const success=mockContext();const completed=await continueClinicReview({config,native,recovery,context:success.context,ports:success.ports});
check(()=>assert.equal(completed.result.phase,'CLINIC_ONE_QUEUED_JOB_STOP'));
check(()=>assert.deepEqual(success.forwarded,[packet,generate]));
check(()=>assert.deepEqual(success.windows,['before_review','before_verify','before_generate','after_generate']));
check(()=>assert.deepEqual(success.inspect(),{buttonClicks:1,closed:true,handlers:0}));
check(()=>assert(success.records.findIndex(r=>r.phase==='before_verify')<success.records.findIndex(r=>r.operation==='packet_information')));
check(()=>assert(success.records.findIndex(r=>r.operation==='packet_information')<success.records.findIndex(r=>r.phase==='before_generate')));
check(()=>assert(!JSON.stringify(success.records).includes('mock-only')));
const duplicate=mockContext({duplicateGenerate:true});const duplicateResult=await continueClinicReview({config,native,recovery,context:duplicate.context,ports:duplicate.ports});
check(()=>assert.equal(duplicateResult.result.phase,'HOLD_RECONCILE_NO_RETRY'));
check(()=>assert.deepEqual(duplicate.forwarded,[packet,generate]));
const window=mockContext({windowFailure:'before_generate'});const windowResult=await continueClinicReview({config,native,recovery,context:window.context,ports:window.ports});
check(()=>assert.equal(windowResult.result.phase,'HOLD_RECONCILE_NO_RETRY'));
check(()=>assert.deepEqual(window.forwarded,[packet]));
check(()=>assert.equal(windowResult.result.verifyAttempts,1));
check(()=>assert.equal(windowResult.result.generateAttempts,0));
check(()=>assert.equal(clinicOwnerBrowserCookies(`sb-${CLINIC.project}-auth-token=mock`,config.origin)[0].domain,new URL(config.origin).hostname));
for(const header of ['',`sb-other-auth-token=mock`,`sb-${CLINIC.project}-auth-token=`,`sb-${CLINIC.project}-auth-token=mock; sb-${CLINIC.project}-auth-token=mock`])check(()=>assert.throws(()=>clinicOwnerBrowserCookies(header,config.origin)));
const read=name=>JSON.parse(fs.readFileSync(root+'/clinic-draft-save-actual-execution-20261027/continuation-after-zero-cas-timeout/extracted/'+name));
const witness={before:read('checkpoint-05.json'),response:read('checkpoint-06.json'),result:read('result.json')};
const ids=JSON.parse(fs.readFileSync(new URL('./clinic-original-question-ids.fixture.json',import.meta.url)));
const initial={ok:true,revision:0,reviewPath:`/briefcase/${CLINIC.item}/review`,readyToGenerate:false,nextAction:'continue_packet',courtRecordConflict:false,answers:{...MS_NONCONVICTION_SCREENING_ANSWERS},questions:ids.map(id=>({id,type:'text',prompt:id})),missingInputIds:ids,pendingDerivations:[],resumeSectionId:null};
const planned=planClinicUnverifiedSave(initial);
const current={...initial,answers:{...initial.answers,...planned.body.answers},missingInputIds:[],recordClarificationIds:[],reviewQuestions:initial.questions,sections:[],nextAction:'review_packet',reviewReason:'not_verified'};
const env={SUPABASE_ACCESS_TOKEN:'mock-only',SUPABASE_ANON_KEY:'mock-only',HOSTED_CLINIC_DEMO_PASSWORD:'mock-only',VERCEL_AUTOMATION_BYPASS_SECRET:'mock-only'};
const runSession=async(userId=CLINIC.owner)=>{
 const h=mockContext(),calls=[];let browserLaunches=0,contextsClosed=0,browsersClosed=0,cookies;
 h.context.addInitScript=async()=>{};h.context.addCookies=async value=>{cookies=value;};h.context.close=async()=>{contextsClosed++;};
 const chromium={launch:async()=>{browserLaunches++;return {newContext:async options=>{assert.equal(options.serviceWorkers,'block');return h.context;},close:async()=>{browsersClosed++;}};}};
 const fetcher=async(url,options)=>{
  calls.push({url,method:options.method});
  if(new URL(url).origin!==config.origin){assert.equal(options.method,'POST');assert(!options.headers['x-vercel-protection-bypass']);return new Response(JSON.stringify({user:{id:userId},access_token:'private-mock-token'}),{status:200});}
  assert.equal(options.method,'GET');assert.equal(options.headers['x-vercel-protection-bypass'],'mock-only');
  if(url.endsWith('/api/rcap/release'))return new Response(JSON.stringify({application:'RCAP 2.0',policyVersion:'rcap2.2',buildSha:CLINIC.app,runtimeSha:CLINIC.app,sourceBound:false}),{status:503});
  assert.equal(new URL(url).search,'?editingFact=social_security_number');assert(options.headers.Cookie);return new Response(JSON.stringify(current),{status:200});
 };
 const result=await runClinicReviewSession({config,native,witness,recovery,env,chromium,ports:h.ports,fetcher});
 return {...h,result,calls,browserLaunches,contextsClosed,browsersClosed,cookies};
};
const session=await runSession();
check(()=>assert.equal(session.result.result.phase,'CLINIC_ONE_QUEUED_JOB_STOP'));
check(()=>assert.equal(session.calls.length,3));
check(()=>assert.equal(session.calls.filter(c=>c.method==='POST').length,1));
check(()=>assert.deepEqual(session.forwarded,[packet,generate]));
check(()=>assert.equal(session.browserLaunches,1));
check(()=>assert.equal(session.contextsClosed,1));
check(()=>assert.equal(session.browsersClosed,1));
check(()=>assert(session.cookies.every(c=>c.domain===new URL(config.origin).hostname&&c.secure===true)));
check(()=>assert(!JSON.stringify(session.records).includes('private-mock-token')));
const wrong=await runSession('11111111-1111-4111-8111-111111111111');
check(()=>assert.equal(wrong.result.result.phase,'HOLD_RECONCILE_NO_RETRY'));
check(()=>assert.equal(wrong.browserLaunches,0));
check(()=>assert.equal(wrong.forwarded.length,0));
check(()=>assert.equal(wrong.result.result.customerWriteAttempts,0));
console.log(`${checks} focused Clinic normal owner/session/current facts/review/empty verification/one generation/window/custody checks PASS; browser and transport mocked, no live calls.`);
