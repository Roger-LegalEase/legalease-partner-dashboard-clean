// Existing owned Clinic matter only. No intake, fact edits, consent renewal or retry.
import assert from 'node:assert/strict';
import {CLINIC,hash,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {createOriginalResponseObserver} from './rcap-clinic-original-response.mjs';
import {captureOriginalResponseOnce} from './rcap-clinic-screening-profile.mjs';

const PACKET=`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`;
const GENERATE='/api/expungement-ai/packet/generate';
const REVIEW=`/briefcase/${CLINIC.item}/review`;
export function clinicReviewRequest(config,url,method,body,state){
 const u=new URL(url);if(u.origin!==config.origin||u.username||u.password||u.hash)return null;
 if(method==='GET'){
  if(u.pathname.startsWith('/_next/static/'))return !u.search||([...u.searchParams.keys()].length===1&&u.searchParams.has('dpl'))?'read':null;
  if(u.pathname==='/_next/image')return [...u.searchParams.keys()].sort().join(',')==='q,url,w'
   &&u.searchParams.get('url')==='/expungement-ai/wilma-avatar.png'&&u.searchParams.get('q')==='75'
   &&['16','32','48','64','96','128','256','384','640','750','828','1080','1200','1920','2048','3840'].includes(u.searchParams.get('w'))?'read':null;
  if(u.pathname===`/briefcase/${CLINIC.item}/packet-information`){
   const keys=[...u.searchParams.keys()];return new Set(keys).size===keys.length&&keys.every(k=>['_rsc','edit'].includes(k))
    &&(!u.searchParams.has('edit')||/^[a-z][a-z0-9_]{0,99}$/.test(u.searchParams.get('edit')))?'read':null;
  }
  const queryOK=!u.search||([...u.searchParams.keys()].length===1&&u.searchParams.has('_rsc'));
  if(!queryOK)return null;
  return ['/briefcase','/briefcase/matters','/briefcase/documents','/briefcase/settings','/expungement-ai/support','/expungement-ai/check','/expungement-ai/wilma-avatar.png',REVIEW,`/briefcase/${CLINIC.item}`,`/briefcase/matters/${CLINIC.item}`,PACKET,'/api/rcap/release','/favicon.ico'].includes(u.pathname)?'read':null;
 }
 if(method!=='POST'||u.search||!body||typeof body!=='object'||Array.isArray(body))return null;
 if(u.pathname===PACKET&&state.verifyAttempts===0&&state.generateAttempts===0
  &&Object.keys(body).sort().join(',')==='answers,expectedRevision,verify'
  &&body.verify===true&&body.expectedRevision===state.revision
  &&body.answers&&typeof body.answers==='object'&&!Array.isArray(body.answers)&&Object.keys(body.answers).length===0)return 'verify';
 if(u.pathname===GENERATE&&state.verifyAttempts===1&&state.verified===true&&state.generateAttempts===0
  &&Object.keys(body).join(',')==='briefcaseItemId'&&body.briefcaseItemId===CLINIC.item)return 'generate';
 return null;
}
export function projectClinicRequestRefusal(config,request,state,priorRefusalCount=0){
 const method=request.method(),safeMethod=['GET','POST','HEAD','OPTIONS'].includes(method)?method:'other';
 let u;try{u=new URL(request.url());}catch{return {method:safeMethod,reason:'invalid_url',priorRefusalCount};}
 const fixedPublicPaths=new Set(['/_vercel/insights/script.js','/_vercel/speed-insights/script.js','/_vercel/toolbar/script.js','/_next-live/feedback/feedback.js','/_next/image','/favicon.ico','/expungement-ai/wilma-avatar.png']);
 const originClass=u.origin===config.origin?'application':u.origin==='https://vercel.live'?'vercel_live':'other';
 const pathClass=u.pathname===PACKET?'same_case_packet_api':u.pathname===GENERATE?'generation_api':u.pathname.startsWith('/_next/static/')?'next_static':fixedPublicPaths.has(u.pathname)?'fixed_public_asset':'other';
 let body;try{body=request.postDataJSON();}catch{}
 let wouldMatchOperation=null;try{wouldMatchOperation=clinicReviewRequest(config,u.href,method,body,state);}catch{}
 const keys=[...u.searchParams.keys()],bodyObject=body&&typeof body==='object'&&!Array.isArray(body),headers=request.headers?.()??{};
 const reason=wouldMatchOperation&&priorRefusalCount>0?'prior_request_refusal':wouldMatchOperation?'forward_guard_failed':originClass!=='application'?'foreign_origin':method==='GET'?'get_not_admitted':'request_shape_or_path_not_admitted';
 return {method:safeMethod,originClass,pathClass,...(fixedPublicPaths.has(u.pathname)?{fixedPublicPath:u.pathname}:{}),pathSha256:hash(u.pathname),reason,wouldMatchOperation,priorRefusalCount,
  resourceType:['document','stylesheet','image','media','font','script','xhr','fetch','other'].includes(request.resourceType?.())?request.resourceType():'other',
  rscRequest:headers.rsc==='1',prefetchRequest:headers['next-router-prefetch']==='1'||headers.purpose==='prefetch'||String(headers['sec-purpose']??'').includes('prefetch'),
  queryKeyClasses:keys.map(key=>['dpl','_rsc','edit','url','w','q'].includes(key)?key:'other'),duplicateQueryKeys:new Set(keys).size!==keys.length,
  ...(u.pathname==='/_next/image'?{fixedAvatarRequested:u.searchParams.get('url')==='/expungement-ai/wilma-avatar.png',defaultQualityRequested:u.searchParams.get('q')==='75'}:{}),
  verifyRequested:Boolean(bodyObject&&body.verify===true),expectedRevisionMatches:Boolean(bodyObject&&body.expectedRevision===state.revision),answerKeyCount:bodyObject&&body.answers&&typeof body.answers==='object'&&!Array.isArray(body.answers)?Object.keys(body.answers).length:null};
}
export function assertClinicReviewRecovery(r){
 assert.equal(r.schema,'existing-clinic-postsave-get-recovery/v1');assert.equal(r.packetInformationHttp,200);
 assert.equal(r.ownedReviewPathExact,true);assert.equal(r.revision,0);assert.equal(r.readyToGenerate,false);
 for(const k of ['missingInputCount','pendingDerivationCount','recordClarificationCount'])assert.equal(r[k],0);
 assert.equal(r.courtRecordConflict,false);assert.equal(r.nextAction,'review_packet');
 assert.equal(r.originalScreeningSevenRecovered,true);assert.equal(r.original47KnownValuesRecovered,true);
 assert.deepEqual(r.original47RawWireMismatchIds,[]);assert.deepEqual(r.original47KnownValueMismatchIds,[]);
 assert.equal(r.acceptedPayloadReconstructionMatches,false);assert.equal(r.originalPrefillsTenExactComparisonAvailable,false);
 // C accepted actual revision zero; never repair it by replaying the saved facts.
 return r.revision;
}
export async function continueClinicReview({config,native,recovery,context,ports}){
 admitClinic(config,native);assert(config.bypass?.trim());const revision=assertClinicReviewRecovery(recovery);
 for(const k of ['assertContinuousWindow','checkpoint','readQueuedTarget'])assert.equal(typeof ports[k],'function');
 const state={revision,verifyAttempts:0,generateAttempts:0,verified:false,firstEnqueueCapableActionAt:null};
 const observed=[],violations=[],inflight=new Set();let page,verifyCapture,generateCapture;
 // Synchronous checkpoints must finish durable custody before a response can cause auto-generation.
 const record=value=>{const returned=ports.checkpoint(value);assert.equal(returned,undefined,'checkpoint must synchronously persist typed evidence');};
 const responseObserver=createOriginalResponseObserver({...config,authOrigin:`https://${CLINIC.project}.supabase.co`,existingClinicMatterId:CLINIC.item},{bypass:config.bypass,onObservation:value=>{
  observed.push(value);record({phase:'original_response',...value,verifyAttempts:state.verifyAttempts,generateAttempts:state.generateAttempts});
  if(value.operation==='packet_information')state.verified=value.accepted===true;
 }});
 const guard=async route=>{
  const request=route.request();let body;try{body=request.postDataJSON();}catch{}
  const operation=clinicReviewRequest(config,request.url(),request.method(),body,state);
  if(!operation){const diagnostic=projectClinicRequestRefusal(config,request,state,violations.length);violations.push('request_refused');record({phase:'request_refused',...diagnostic,verifyAttempts:state.verifyAttempts,generateAttempts:state.generateAttempts});return route.abort('blockedbyclient');}
  if(operation!=='read'){
   assert.deepEqual(violations,[],'refused traffic requires reconciliation before a customer write');
   await ports.assertContinuousWindow({phase:'before_'+operation,item:CLINIC.item,owner:CLINIC.owner});
   if(operation==='verify')state.firstEnqueueCapableActionAt=new Date().toISOString();
   record({phase:'before_'+operation,payloadSha256:hash(JSON.stringify(body)),expectedRevision:revision,firstEnqueueCapableActionAt:state.firstEnqueueCapableActionAt,verifyAttempts:state.verifyAttempts+(operation==='verify'?1:0),generateAttempts:state.generateAttempts+(operation==='generate'?1:0)});
   state[operation==='verify'?'verifyAttempts':'generateAttempts']++;
  }
  return route.fallback({headers:{...request.headers(),'x-vercel-protection-bypass':config.bypass}});
 };
 const tracked=route=>{const task=guard(route).catch(async()=>{const diagnostic=projectClinicRequestRefusal(config,route.request(),state,violations.length);violations.push('forward_guard_refused');record({phase:'forward_guard_refused',...diagnostic,verifyAttempts:state.verifyAttempts,generateAttempts:state.generateAttempts});await route.abort('blockedbyclient');});inflight.add(task);task.finally(()=>inflight.delete(task)).catch(()=>{});return task;};
 try{
  await context.route('**/*',responseObserver);await context.route('**/*',tracked);
  page=await context.newPage();await ports.assertContinuousWindow({phase:'before_review',item:CLINIC.item,owner:CLINIC.owner});
  const response=await page.goto(config.origin+REVIEW,{waitUntil:'domcontentloaded'});assert.equal(response?.status(),200);
  await page.locator('[data-accuracy-review="true"]').waitFor();
  const button=page.getByRole('button',{name:'Verify and prepare clinic packet',exact:true});
  assert.equal(await button.count(),1);assert.equal(await button.isEnabled(),true);
  record({phase:'normal_owned_review_ready',expectedRevision:revision,verifyAttempts:0,generateAttempts:0});
  const captureConfig={...config,authOrigin:`https://${CLINIC.project}.supabase.co`,existingClinicMatterId:CLINIC.item};
  verifyCapture=captureOriginalResponseOnce(page,'packet_information',captureConfig);
  generateCapture=captureOriginalResponseOnce(page,'generation',captureConfig);
  await button.click();const verified=await verifyCapture.read();assert.equal(verified.readyToGenerate,true);
  const generated=await generateCapture.read();assert.equal(generated.briefcaseItemId,CLINIC.item);
  assert.equal(state.verifyAttempts,1);assert.equal(state.generateAttempts,1);assert.deepEqual(violations,[]);
  await ports.assertContinuousWindow({phase:'after_generate',item:CLINIC.item,owner:CLINIC.owner});
  const target=await ports.readQueuedTarget({firstEnqueueCapableActionAt:state.firstEnqueueCapableActionAt});assert.equal(target.itemId,CLINIC.item);assert.equal(target.ownerId,CLINIC.owner);
  assert.equal(target.clinicEventId,CLINIC.event);assert.equal(target.status,'queued');assert.equal(target.exactTargetJobCount,1);
  assert.match(target.jobId,/^[a-f0-9-]{36}$/);assert.match(target.protectedReceiptSha256,/^[a-f0-9]{64}$/);
  const result={phase:'CLINIC_ONE_QUEUED_JOB_STOP',expectedPriorRevision:revision,verifiedRevision:verified.revision,firstEnqueueCapableActionAt:state.firstEnqueueCapableActionAt,verifyAttempts:1,generateAttempts:1,jobSha256:hash(target.jobId),targetReceiptSha256:target.protectedReceiptSha256,newConsent:false,factEdits:false,workerAttempted:false,protectedDeliveryProven:false};
  record(result);return {result,target};
 }catch(error){
  const result={phase:'HOLD_RECONCILE_NO_RETRY',errorClass:['AssertionError','TimeoutError','TypeError'].includes(error?.name)?error.name:'Error',firstEnqueueCapableActionAt:state.firstEnqueueCapableActionAt,verifyAttempts:state.verifyAttempts,generateAttempts:state.generateAttempts,verifiedResponseObserved:state.verified,originalResponses:observed,refusedRequestCount:violations.length,workerAttempted:false,protectedDeliveryProven:false};
  record(result);return {result,target:null};
 }finally{
  verifyCapture?.dispose();generateCapture?.dispose();await Promise.allSettled([...inflight]);
  await context.unroute('**/*',tracked);await context.unroute('**/*',responseObserver);await page?.close();
 }
}
