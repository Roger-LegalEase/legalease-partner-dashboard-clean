import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CLINIC,hash,loadClinicNative,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {createClinicGhaPorts} from './clinic-worker-once-preparation/clinic-gha-ports.mjs';
import {RECOVERY_IMAGE,admitRecoveryPublication} from './clinic-worker-once-preparation/clinic-recovery-image.mjs';
import {createClinicFailedJobRecoveryBinding,RECOVERY_JOB} from './clinic-worker-once-preparation/clinic-failed-job-recovery.mjs';
import {createClinicPrivateDownloadPorts} from './rcap-hosted-clinic-private-delivery.mjs';
const BINDING=new URL('./clinic-worker-once-preparation/clinic-recovery-native-binding.json',import.meta.url);
export function admitClinicRecoveryDispatch(input){
 const b=JSON.parse(fs.readFileSync(BINDING));assert.equal(b.runtimeAccepted,false);assert.equal(b.qualificationAccepted,true,'HOLD: actual new image qualification not accepted');assert.match(b.qualificationSha256??'',/^[a-f0-9]{64}$/);
 for(const[k,v]of Object.entries({mode:'clinic_failed_job_recovery',journey_state:'existing_failed_job_once_private',application_sha:CLINIC.app,tools_sha:CLINIC.tools,worker_source_sha:RECOVERY_IMAGE.source,worker_digest:RECOVERY_IMAGE.digest,supabase_project_ref:CLINIC.project,resume_matter_id:CLINIC.item,contradiction_job_id:RECOVERY_JOB}))assert.equal(input[k],v);
 for(const k of ['clinic_attempt_id','sponsor_case','promotion_code','expected_total_cents','clinic_resume_authorization','clinic_session_closure_authorization'])assert(!input[k]);assert.equal(input.sponsor_items??'[]','[]');assert([undefined,false,'false'].includes(input.sponsor_fulfillment));assert.match(input.clinic_worker_control_binding_sha256??'',/^[a-f0-9]{64}$/);
 return b;
}
export function admitClinicFailedRecovery({input,publicationBytes,publicationRun,qualificationBytes,failedStateBytes}){
 const b=admitClinicRecoveryDispatch(input);assert.equal(hash(qualificationBytes),b.qualificationSha256);
 const qualification=JSON.parse(qualificationBytes);assert.equal(qualification.image,RECOVERY_IMAGE.image);assert.equal(qualification.sourceSha,RECOVERY_IMAGE.source);for(const k of ['physicalPullVerified','ociSourceVerified','nonRoot','msClaimedRouteFactoryV2','runtimeClosureVerified','noCredentials','noNetwork','noQueueOperations'])assert.equal(qualification[k],true);
 assert.equal(hash(failedStateBytes),b.failedStateSha256);admitRecoveryPublication(publicationBytes,publicationRun);return b;
}
function privateJson(file,value){const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
async function entry(){
 const input=JSON.parse(process.env.DISPATCH_INPUTS);
 admitClinicFailedRecovery({input,publicationBytes:fs.readFileSync(process.env.CLINIC_RECOVERY_PUBLICATION_FILE),publicationRun:JSON.parse(fs.readFileSync(process.env.CLINIC_RECOVERY_PUBLICATION_RUN_FILE)),qualificationBytes:fs.readFileSync(process.env.CLINIC_RECOVERY_IMAGE_QUALIFICATION_FILE),failedStateBytes:fs.readFileSync(process.env.CLINIC_RECOVERY_FAILED_STATE_FILE)});
 const binding=JSON.parse(fs.readFileSync('scripts/clinic-readonly-native-binding.json')),native=loadClinicNative(binding,fs.readFileSync(process.env.CLINIC_NATIVE_DEPLOY_FILE),JSON.parse(fs.readFileSync(process.env.CLINIC_NATIVE_RUN_FILE)));
 const config={origin:binding.origin,deploymentId:binding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item)};admitClinic(config,native);
 assert.equal(input.preview_deployment_id,binding.deploymentId);assert.equal(input.preview_hostname,new URL(binding.origin).hostname);assert.equal(input.preview_creation_run_id,String(binding.creationRun));
 const output=path.resolve('clinic-failed-job-recovery-evidence');fs.mkdirSync(output,{mode:0o700});let index=0,attempted=false,result;
 const checkpoint=value=>{if(value.attempted)attempted=true;privateJson(path.join(output,`checkpoint-${String(++index).padStart(3,'0')}.json`),value);};
 try{
  assert(process.env.SUPABASE_ACCESS_TOKEN?.trim());const r=await fetch(`https://api.supabase.com/v1/projects/${CLINIC.project}/api-keys`,{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);const keys=await r.json();assert(Array.isArray(keys));const anon=keys.filter(k=>k.name==='anon'),service=keys.filter(k=>k.name==='service_role');assert.equal(anon.length,1);assert.equal(service.length,1);assert(anon[0].api_key&&service[0].api_key);
  const env={...process.env,SUPABASE_ANON_KEY:anon[0].api_key,SUPABASE_SERVICE_ROLE_KEY:service[0].api_key,NEXT_PUBLIC_SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'120',RCAP_WORKER_CONTAINER_DIGEST:RECOVERY_IMAGE.digest};
  Object.assign(config,{bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,executionToolsSha:env.GITHUB_SHA,workerControlBindingSha256:input.clinic_worker_control_binding_sha256,applicationSha:CLINIC.app,creatorNativeSha256:binding.nativeSha256,clinicNativeAdmissionVerified:true});
  const ports=await createClinicGhaPorts({env,config,checkpoint,workerFactory:createClinicFailedJobRecoveryBinding,workerIdentity:RECOVERY_IMAGE});result=await ports.recoverExistingFailedJob(ports.window);
  if(result.phase==='EXISTING_JOB_FINALIZED_POSTSTATE_VERIFIED'){
   await ports.assertContinuousWindow({phase:'during_fulfillment'});assert(env.HOSTED_CLINIC_DEMO_PASSWORD?.trim());const response=await fetch(`https://${CLINIC.project}.supabase.co/auth/v1/token?grant_type=password`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{apikey:env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:'mvl-demo-participant-a@rcap-acceptance.test',password:env.HOSTED_CLINIC_DEMO_PASSWORD})});checkpoint({phase:'recovery_normal_owner_grant_response',observedHttpStatus:response.status});assert.equal(response.status,200);const auth=await response.json();assert.equal(auth.user?.id,CLINIC.owner);assert.equal(auth.user?.email,'mvl-demo-participant-a@rcap-acceptance.test');assert(auth.access_token);
   const encoded='base64-'+Buffer.from(JSON.stringify(auth)).toString('base64'),cookie=encoded.match(/.{1,3180}/g).map((v,i,a)=>`sb-${CLINIC.project}-auth-token${a.length>1?'.'+i:''}=${v}`).join('; ');
   const downloads=createClinicPrivateDownloadPorts({config,env,target:ports.getRecoveryTarget(),ownerCookieHeader:cookie,checkpoint,assertContinuousWindow:ports.assertContinuousWindow});const delivery=await ports.retrieveRecoveredPrivateArtifact(downloads);
   result={...result,phase:'EXISTING_CLINIC_JOB_RECOVERED_AND_PRIVATE_DELIVERY_OBSERVED',protectedDeliveryProven:true,delivery};
  }else process.exitCode=1;
 }catch{result={schemaVersion:'clinic-existing-failed-job-recovery-safe/v1',phase:attempted?'STOP_RECONCILE_NO_RETRY':'HOLD_NO_WORKER',attempted,protectedDeliveryProven:false};process.exitCode=1;}
 privateJson(path.join(output,'result.json'),result);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)entry().catch(()=>{console.error('Clinic recovery admission held; no automatic replay.');process.exitCode=1;});
