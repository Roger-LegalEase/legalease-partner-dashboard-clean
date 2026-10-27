import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {CLINIC,hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {clinicReviewRequest,optionalClinicPreviewFeedback,continueClinicReview} from './rcap-hosted-clinic-review-queue.mjs';
const root=process.env.CLINIC_PERSISTED_RESUME_ROOT;assert(root);
const native=JSON.parse(fs.readFileSync(root+'/hosted-fulfillment-20261027/clinic-purpose-deploy-execution/run-40448248665/extracted/deploy.json'));
const recovery=JSON.parse(fs.readFileSync(root+'/clinic-postsave-get-recovery-actual-execution-20261027/extracted/result.json'));
const actual=name=>JSON.parse(fs.readFileSync(root+'/clinic-refusal-evidence-actual-execution-20261027/extracted/'+name));
assert.equal(actual('checkpoint-009.json').fixedPublicPath,'/_next-live/feedback/feedback.js');assert.deepEqual(actual('checkpoint-009.json').queryKeyClasses,[]);
assert.deepEqual(actual('checkpoint-010.json').queryKeyClasses,['url','w','q','dpl']);assert.equal(actual('checkpoint-012.json').reason,'prior_request_refusal');
const config={origin:native.previewUrl,deploymentId:native.deployment.id,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item),bypass:'mock-only'};
const state={revision:0,verifyAttempts:0,generateAttempts:0,verified:false};
const feedback='https://vercel.live/_next-live/feedback/feedback.js';
const avatar=config.origin+'/_next/image?url=%2Fexpungement-ai%2Fwilma-avatar.png&w=96&q=75&dpl='+config.deploymentId;
const req=(url,method='GET',body,type='script')=>({url:()=>url,method:()=>method,postDataJSON:()=>body,resourceType:()=>type,headers:()=>({})});
assert(optionalClinicPreviewFeedback(req(feedback)));assert.equal(clinicReviewRequest(config,feedback,'GET',undefined,state),null);
for(const request of [req(feedback,'POST'),req(feedback+'?unknown=1'),req(feedback.replace('vercel.live','foreign.test')),req(feedback+'#fragment'),req(feedback,'GET',undefined,'fetch')])assert.equal(optionalClinicPreviewFeedback(request),false);
assert.equal(clinicReviewRequest(config,avatar,'GET',undefined,state),'read');
for(const url of [avatar.replace(config.deploymentId,'dpl_Other'),avatar+'&dpl='+config.deploymentId,avatar+'&unknown=1',avatar.replace('wilma-avatar.png','other.png'),avatar.replace('q=75','q=90')])assert.equal(clinicReviewRequest(config,url,'GET',undefined,state),null);
const packet=config.origin+`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`,generate=config.origin+'/api/expungement-ai/packet/generate';
async function connected(unknownWrite=false){
 const handlers=[],forwarded=[],aborted=[],records=[],page=new EventEmitter();
 async function send(request){let denied=false;async function dispatch(index){
  if(index<0){forwarded.push(request.url());return;}
  const route={request:()=>request,fallback:()=>dispatch(index-1),abort:async()=>{denied=true;aborted.push(request.url());if(request.method()==='POST')page.emit('close');},
   fetch:async()=>{forwarded.push(request.url());return {status:()=>200,body:async()=>Buffer.from(JSON.stringify(request.url()===packet?{ok:true,itemId:CLINIC.item,revision:1,readyToGenerate:true}:{briefcaseItemId:CLINIC.item,packetStatus:'generating'}))};},
   fulfill:async({response})=>page.emit('response',{request:()=>request,status:()=>response.status()})};await handlers[index](route);
 }await dispatch(handlers.length-1);return denied;}
 page.goto=async()=>{if(unknownWrite)await send(req(config.origin+'/api/expungement-ai/checkout','POST',{briefcaseItemId:CLINIC.item},'fetch'));await send(req(feedback));await send(req(avatar,'GET',undefined,'image'));return {status:()=>200};};
 page.locator=()=>({waitFor:async()=>{}});page.getByRole=()=>({count:async()=>1,isEnabled:async()=>true,click:async()=>{const denied=await send(req(packet,'POST',{answers:{},verify:true,expectedRevision:0},'fetch'));if(!denied)await send(req(generate,'POST',{briefcaseItemId:CLINIC.item},'fetch'));}});page.close=async()=>page.emit('close');
 const context={route:async(_p,h)=>handlers.push(h),unroute:async(_p,h)=>handlers.splice(handlers.indexOf(h),1),newPage:async()=>page};
 const ports={checkpoint:value=>{records.push(value);},assertContinuousWindow:async()=>{},readQueuedTarget:async()=>({itemId:CLINIC.item,ownerId:CLINIC.owner,clinicEventId:CLINIC.event,status:'queued',exactTargetJobCount:1,jobId:'11111111-1111-4111-8111-111111111111',protectedReceiptSha256:'a'.repeat(64)})};
 const result=await continueClinicReview({config,native,recovery,context,ports});return {result:result.result,forwarded,aborted,records};
}
const ok=await connected();assert.equal(ok.result.phase,'CLINIC_ONE_QUEUED_JOB_STOP');assert.deepEqual(ok.forwarded,[avatar,packet,generate]);assert.deepEqual(ok.aborted,[feedback]);assert.equal(ok.result.verifyAttempts,1);assert.equal(ok.result.generateAttempts,1);assert(ok.records.some(r=>r.phase==='optional_preview_feedback_blocked'));
const unknown=await connected(true);assert.equal(unknown.result.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(unknown.result.verifyAttempts,0);assert.equal(unknown.result.generateAttempts,0);assert.deepEqual(unknown.forwarded,[avatar]);assert(unknown.records.some(r=>r.phase==='forward_guard_refused'&&r.reason==='prior_request_refusal'));
console.log('ONE focused actual feedback/avatar boundary and connected Verify-once regression PASS; feedback never forwarded, deployment-bound image only, unknown writes still block, all transport mocked.');
