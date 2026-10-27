import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CLINIC,hash,loadClinicNative,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {admitAcceptedClinicSave} from './rcap-hosted-clinic-postsave-recovery.mjs';
import {admitClinicReviewRecovery} from './rcap-hosted-clinic-review-admission.mjs';
import {runClinicReviewSession} from './rcap-hosted-clinic-review-session.mjs';
import {createClinicGhaPorts} from './clinic-worker-once-preparation/clinic-gha-ports.mjs';

export async function completeClinicFlow({ports,review,checkpoint}){
 for(const name of ['verifyPreparedImageBeforeVerify','runOnceAfterActualGenerate','retrieveOwnerPrivateArtifact'])assert.equal(typeof ports[name],'function');
 const image=await ports.verifyPreparedImageBeforeVerify();assert.equal(image.digest,CLINIC.digest);assert.equal(image.sourceSha,CLINIC.worker);assert.equal(image.nonRoot,true);assert.equal(image.ephemeralGithubExecutor,true);
 const queued=await review();if(queued.result.phase!=='CLINIC_ONE_QUEUED_JOB_STOP')return queued.result;
 checkpoint({...queued.result,phase:'actual_clinic_queue_handoff'});
 const worker=await ports.runOnceAfterActualGenerate({...queued.target,window:ports.window});
 if(worker.status!=='TARGET_FINALIZED_POSTSTATE_VERIFIED')return {phase:'STOP_WORKER_RECONCILIATION_NO_RETRY',queue:queued.result,worker,protectedDeliveryProven:false};
 assert.equal(worker.targetJobSha256,hash(queued.target.jobId));assert.equal(worker.workerSourceSha,CLINIC.worker);assert.equal(worker.attempted,true);
 assert.equal(worker.schemaVersion,'clinic-worker-once-safe/v1');assert.equal(worker.image,'ghcr.io/roger-legalease/rcap-render-worker@'+CLINIC.digest);assert.equal(worker.windowReceiptSha256,ports.window.custodyReceiptSha256);
 const delivery=await ports.retrieveOwnerPrivateArtifact(queued.downloadPorts);
 for(const key of ['ownerPrivateRetrievalProven','repeatOwnerAccessProven','freshOwnerAccessProven','anonymousDenied','strangerDenied','publicObjectDenied'])assert.equal(delivery[key],true);
 assert.equal(delivery.targetJobSha256,hash(queued.target.jobId));assert.equal(delivery.ownerReadCount,3);assert.equal(delivery.naturalDeliveryEventsAdded,9);
 return {schemaVersion:'existing-clinic-protected-journey-safe/v1',phase:'CLINIC_PROTECTED_DELIVERY_OBSERVED',queue:queued.result,worker,delivery,newCase:false,newFacts:false,newConsent:false,acceptanceOwner:'CODEX C',rawPdfPersisted:false};
}
function privateJson(file,value){const fd=fs.openSync(file,'wx',0o600);try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
async function entry(){
 const binding=JSON.parse(fs.readFileSync('scripts/clinic-readonly-native-binding.json'));
 const native=loadClinicNative(binding,fs.readFileSync(process.env.CLINIC_NATIVE_DEPLOY_FILE),JSON.parse(fs.readFileSync(process.env.CLINIC_NATIVE_RUN_FILE)));
 const config={origin:binding.origin,deploymentId:binding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item)};admitClinic(config,native);
 const input=JSON.parse(process.env.DISPATCH_INPUTS);
 for(const[k,v]of Object.entries({mode:'clinic_saved_full_journey',journey_state:'review_verify_generate_once_private',application_sha:CLINIC.app,tools_sha:CLINIC.tools,worker_source_sha:CLINIC.worker,worker_digest:CLINIC.digest,supabase_project_ref:CLINIC.project,preview_deployment_id:binding.deploymentId,preview_hostname:new URL(binding.origin).hostname,preview_creation_run_id:String(binding.creationRun)}))assert.equal(input[k],v);
 assert.equal(input.resume_matter_id,CLINIC.item);assert.match(input.clinic_worker_control_binding_sha256??'',/^[a-f0-9]{64}$/);
 for(const key of ['clinic_attempt_id','sponsor_case','contradiction_job_id','promotion_code','expected_total_cents','clinic_resume_authorization','clinic_session_closure_authorization'])assert(!input[key]);assert.equal(input.sponsor_items??'[]','[]');assert([undefined,false,'false'].includes(input.sponsor_fulfillment));
 const prior=JSON.parse(fs.readFileSync('scripts/clinic-accepted-save-native-binding.json')),witness={};
 for(const[key,name]of Object.entries({before:'checkpoint-05.json',response:'checkpoint-06.json',result:'result.json'})){const bytes=fs.readFileSync(path.join(process.env.CLINIC_ACCEPTED_SAVE_DIR,name));assert.equal(hash(bytes),prior.files[name]);witness[key]=JSON.parse(bytes);}admitAcceptedClinicSave(witness);
 const recoveryBinding=JSON.parse(fs.readFileSync('scripts/clinic-review-recovery-native-binding.json'));
 const entries=new Map(Object.keys(recoveryBinding.entries).map(name=>[name,fs.readFileSync(path.join(process.env.CLINIC_RECOVERY_ENTRIES_DIR,name))]));
 const recovery=admitClinicReviewRecovery({archive:fs.readFileSync(process.env.CLINIC_RECOVERY_ARCHIVE_FILE),entries,run:JSON.parse(fs.readFileSync(process.env.CLINIC_RECOVERY_RUN_FILE))});
 const output=path.resolve('clinic-full-journey-evidence');fs.mkdirSync(output,{mode:0o700});fs.chmodSync(output,0o700);let index=0,last={phase:'all_native_admitted'},result;
 const checkpoint=value=>{last={...last,...value};privateJson(path.join(output,`checkpoint-${String(++index).padStart(3,'0')}.json`),value);};
 try{
  config.bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;config.executionToolsSha=process.env.GITHUB_SHA;config.workerControlBindingSha256=input.clinic_worker_control_binding_sha256;config.applicationSha=CLINIC.app;config.creatorNativeSha256=binding.nativeSha256;config.clinicNativeAdmissionVerified=true;
  assert(process.env.SUPABASE_ACCESS_TOKEN?.trim());
  const response=await fetch(`https://api.supabase.com/v1/projects/${CLINIC.project}/api-keys`,{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});
  checkpoint({phase:'existing_acceptance_keys_read',observedHttpStatus:response.status});assert.equal(response.status,200);const keys=await response.json();assert(Array.isArray(keys));const anon=keys.filter(key=>key.name==='anon'),service=keys.filter(key=>key.name==='service_role');assert.equal(anon.length,1);assert.equal(service.length,1);assert(anon[0].api_key);assert(service[0].api_key);
  const runtimeEnv={...process.env,SUPABASE_ANON_KEY:anon[0].api_key,SUPABASE_SERVICE_ROLE_KEY:service[0].api_key,NEXT_PUBLIC_SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'120',RCAP_WORKER_CONTAINER_DIGEST:CLINIC.digest};
  const ports=await createClinicGhaPorts({env:runtimeEnv,config,checkpoint});
  const {chromium}=await import('playwright');
  result=await completeClinicFlow({ports,checkpoint,review:()=>runClinicReviewSession({config,native,witness,recovery,env:runtimeEnv,chromium,ports})});
  if(result.phase!=='CLINIC_PROTECTED_DELIVERY_OBSERVED')process.exitCode=1;
 }catch(error){result={schemaVersion:'existing-clinic-protected-journey-safe/v1',...last,phase:'HOLD_RECONCILE_NO_RETRY',errorClass:['AssertionError','TimeoutError','TypeError'].includes(error?.name)?error.name:'Error',rawPdfPersisted:false};process.exitCode=1;}
 privateJson(path.join(output,'result.json'),result);console.log('Clinic existing-matter typed journey result written.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)entry().catch(()=>{console.error('Clinic source/native/input admission held; no automatic replay.');process.exitCode=1;});
