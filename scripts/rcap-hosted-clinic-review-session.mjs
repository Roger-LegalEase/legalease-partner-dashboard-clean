import assert from 'node:assert/strict';
import {CLINIC,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {createClinicRecoveryRuntime,projectClinicSavedRecovery} from './rcap-hosted-clinic-postsave-recovery.mjs';
import {assertConsumerPurposeRelease} from './rcap-hosted-consumer-purpose-release.mjs';
import {applyAnalyticsOptOut} from './rcap-clinic-resume-browser-reset.mjs';
import {assertClinicReviewRecovery,continueClinicReview} from './rcap-hosted-clinic-review-queue.mjs';
import {createClinicPrivateDownloadPorts} from './rcap-hosted-clinic-private-delivery.mjs';

export function clinicOwnerBrowserCookies(header,origin){
 assert.equal(new URL(origin).protocol,'https:');assert.equal(typeof header,'string');assert(header.length>0);
 const cookies=header.split(';').map(part=>{
  const index=part.indexOf('=');assert(index>0);const name=part.slice(0,index).trim(),value=part.slice(index+1);
  assert(new RegExp(`^sb-${CLINIC.project}-auth-token(?:\\.[0-9]+)?$`).test(name));assert(value.length>0);
  return {name,value,domain:new URL(origin).hostname,path:'/',secure:true,httpOnly:false,sameSite:'Lax'};
 });
 assert.equal(new Set(cookies.map(c=>c.name)).size,cookies.length);return cookies;
}
// Only a real normal-owner grant supplies these cookies; no invented browser identity.
export async function runClinicReviewSession({config,native,witness,recovery,env,chromium,ports,fetcher=fetch}){
 admitClinic(config,native);assertClinicReviewRecovery(recovery);
 for(const name of ['assertContinuousWindow','checkpoint','readQueuedTarget'])assert.equal(typeof ports[name],'function');
 assert.equal(config.bypass,env.VERCEL_AUTOMATION_BYPASS_SECRET);assert(config.bypass?.trim());
 let cookieHeader='',browser,context,phase='before_owner_auth';
 const record=value=>{assert.equal(ports.checkpoint(value),undefined,'typed checkpoint must persist synchronously');};
 try{
  await ports.assertContinuousWindow({phase,item:CLINIC.item,owner:CLINIC.owner});
  const io=await createClinicRecoveryRuntime(config,env,witness,{fetcher:async(url,options)=>{
   if(new URL(url).origin===config.origin&&new URL(url).pathname.endsWith('/packet-information')){
    assert.equal(options.method,'GET');assert.equal(new URL(url).search,'?editingFact=social_security_number');
    cookieHeader=options.headers.Cookie;
   }
   return fetcher(url,options);
  },onObservation:value=>record({phase:'normal_owner_transport',...value})});
  assertConsumerPurposeRelease(await io.get('/api/rcap/release'),'clinic_deploy');await io.login();
  phase='current_owned_facts';const response=await io.get(`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`);
  record({phase:'current_owned_model_response',observedHttpStatus:response.status});
  const current={schema:'existing-clinic-postsave-get-recovery/v1',...projectClinicSavedRecovery(response,witness)};
  record({phase:'current_owned_model_projection',...current});assertClinicReviewRecovery(current);
  const cookies=clinicOwnerBrowserCookies(cookieHeader,config.origin);
  phase='normal_review_browser';browser=await chromium.launch({headless:true,...(env.RCAP_BROWSER_CHROMIUM?{executablePath:env.RCAP_BROWSER_CHROMIUM}:{})});
  context=await browser.newContext({serviceWorkers:'block'});await applyAnalyticsOptOut(context);await context.addCookies(cookies);
  record({phase:'normal_owner_browser_session',normalOwnerExact:true,authCookieCount:cookies.length,rawCookiesPersisted:false});
  const queued=await continueClinicReview({config,native,recovery:current,context,ports});
  if(queued.target)queued.downloadPorts=createClinicPrivateDownloadPorts({config,env,target:queued.target,ownerCookieHeader:cookieHeader,checkpoint:ports.checkpoint,assertContinuousWindow:ports.assertContinuousWindow,fetcher});
  return queued;
 }catch(error){
  const result={phase:'HOLD_RECONCILE_NO_RETRY',failureStage:phase,errorClass:['AssertionError','TimeoutError','TypeError'].includes(error?.name)?error.name:'Error',customerWriteAttempts:phase==='normal_review_browser'?null:0,workerAttempted:false,protectedDeliveryProven:false};record(result);return {result,target:null};
 }finally{
  await context?.close();await browser?.close();
 }
}
