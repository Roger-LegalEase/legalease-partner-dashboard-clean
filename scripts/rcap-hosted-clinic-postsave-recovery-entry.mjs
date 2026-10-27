import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {CLINIC,hash,loadClinicNative,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {admitAcceptedClinicSave,createClinicRecoveryRuntime,recoverSavedClinicDraft} from './rcap-hosted-clinic-postsave-recovery.mjs';
async function writePrivate(file,value){const h=await fs.open(file,'wx',0o600);try{await h.chmod(0o600);await h.writeFile(JSON.stringify(value)+'\n');await h.sync();}finally{await h.close();}}
async function entry(){
 const binding=JSON.parse(await fs.readFile('scripts/clinic-readonly-native-binding.json'));
 const native=loadClinicNative(binding,await fs.readFile(process.env.CLINIC_NATIVE_DEPLOY_FILE),JSON.parse(await fs.readFile(process.env.CLINIC_NATIVE_RUN_FILE)));
 const config={origin:binding.origin,deploymentId:binding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item)};admitClinic(config,native);
 const input=JSON.parse(process.env.DISPATCH_INPUTS);for(const[k,v]of Object.entries({mode:'clinic_saved_recovery',journey_state:'post_save_recovery_readonly',application_sha:CLINIC.app,tools_sha:CLINIC.tools,worker_source_sha:CLINIC.worker,worker_digest:CLINIC.digest,supabase_project_ref:CLINIC.project,preview_deployment_id:binding.deploymentId,preview_hostname:new URL(binding.origin).hostname,preview_creation_run_id:String(binding.creationRun)}))assert.equal(input[k],v);assert.equal(hash(input.resume_matter_id??''),config.savedCaseSha256);for(const k of ['clinic_attempt_id','contradiction_job_id','promotion_code','expected_total_cents','clinic_resume_authorization','clinic_session_closure_authorization','sponsor_case'])assert(!input[k]);assert.equal(input.sponsor_items??'[]','[]');assert([undefined,false,'false'].includes(input.sponsor_fulfillment));
 const prior=JSON.parse(await fs.readFile('scripts/clinic-accepted-save-native-binding.json'));assert.equal(prior.runId,40469558949);assert.equal(prior.artifactId,12718199071);
 const witness={};for(const[key,name]of Object.entries({before:'checkpoint-05.json',response:'checkpoint-06.json',result:'result.json'})){const bytes=await fs.readFile(path.join(process.env.CLINIC_ACCEPTED_SAVE_DIR,name));assert.equal(hash(bytes),prior.files[name]);witness[key]=JSON.parse(bytes);}admitAcceptedClinicSave(witness);
 const output=path.resolve('clinic-postsave-recovery-evidence');await fs.mkdir(output,{mode:0o700});await fs.chmod(output,0o700);let index=0,last={phase:'native_and_saved_cas_admitted',customerWrites:0},observation={};
 const checkpoint=async value=>{last={...last,...value};await writePrivate(path.join(output,`checkpoint-${String(++index).padStart(2,'0')}.json`),value);};let result;
 try{
  assert(process.env.SUPABASE_ACCESS_TOKEN?.trim());const r=await fetch(`https://api.supabase.com/v1/projects/${CLINIC.project}/api-keys`,{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});await checkpoint({phase:'existing_anon_key_read',observedHttpStatus:r.status,customerWrites:0});assert.equal(r.status,200);const keys=await r.json();assert(Array.isArray(keys));const anon=keys.filter(k=>k.name==='anon');assert.equal(anon.length,1);assert(anon[0].api_key);
  const io=await createClinicRecoveryRuntime(config,{...process.env,SUPABASE_ANON_KEY:anon[0].api_key},witness,{onObservation:value=>{observation=value;}});
  result=await recoverSavedClinicDraft(config,native,witness,io,checkpoint);
 }catch(error){result={schema:'existing-clinic-postsave-get-recovery/v1',status:'HOLD_RECOVERY_ONLY_NO_POST',...last,...observation,customerWrites:0,errorClass:['AssertionError','TimeoutError','TypeError'].includes(error.name)?error.name:'Error',newConsent:false,sessionRenewal:false,confirmation:false,participantVerificationAllowed:false,funding:false,enqueue:false,workerAllowed:false};process.exitCode=1;}
 await writePrivate(path.join(output,'result.json'),result);console.log('Clinic owner GET-only recovery typed result written.');
}
entry().catch(()=>{console.error('Clinic GET-only recovery source/native/input admission held.');process.exitCode=1;});
