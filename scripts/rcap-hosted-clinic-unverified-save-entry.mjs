import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {CLINIC,hash,loadClinicNative,admitClinic} from './rcap-hosted-existing-clinic-readonly.mjs';
import {createClinicUnverifiedSaveRuntime,saveExistingClinicDraft} from './rcap-hosted-clinic-unverified-save.mjs';
async function writePrivate(file,value){const h=await fs.open(file,'wx',0o600);try{await h.chmod(0o600);await h.writeFile(JSON.stringify(value)+'\n');await h.sync();}finally{await h.close();}}
async function entry(){
 const binding=JSON.parse(await fs.readFile('scripts/clinic-readonly-native-binding.json'));const raw=await fs.readFile(process.env.CLINIC_NATIVE_DEPLOY_FILE);const native=loadClinicNative(binding,raw,JSON.parse(await fs.readFile(process.env.CLINIC_NATIVE_RUN_FILE)));const config={origin:binding.origin,deploymentId:binding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item)};admitClinic(config,native);
 const input=JSON.parse(process.env.DISPATCH_INPUTS);assert.equal(input.mode,'clinic_unverified_draft_save');assert.equal(input.journey_state,'unverified_draft_save');for(const k of ['clinic_attempt_id','contradiction_job_id','promotion_code','expected_total_cents'])assert(!input[k]);assert.equal(hash(input.resume_matter_id??''),config.savedCaseSha256);for(const[k,v]of Object.entries({application_sha:CLINIC.app,tools_sha:CLINIC.tools,worker_source_sha:CLINIC.worker,worker_digest:CLINIC.digest,supabase_project_ref:CLINIC.project,preview_deployment_id:binding.deploymentId,preview_hostname:new URL(binding.origin).hostname,preview_creation_run_id:String(binding.creationRun)}))assert.equal(input[k],v);
 const output=path.resolve('clinic-unverified-save-evidence');await fs.mkdir(output,{mode:0o700});await fs.chmod(output,0o700);let last={phase:'native_admitted',customerWriteAttempts:0},index=0;
 const checkpoint=async value=>{last={...last,...value};await writePrivate(path.join(output,`checkpoint-${String(++index).padStart(2,'0')}.json`),value);};let result;
 try{
  assert(process.env.SUPABASE_ACCESS_TOKEN?.trim());const r=await fetch(`https://api.supabase.com/v1/projects/${CLINIC.project}/api-keys`,{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});await checkpoint({phase:'existing_anon_key_read',observedHttpStatus:r.status});assert.equal(r.status,200);const keys=await r.json();assert(Array.isArray(keys));const anon=keys.filter(k=>k.name==='anon');assert.equal(anon.length,1);assert(anon[0].api_key);
  result=await saveExistingClinicDraft(config,native,createClinicUnverifiedSaveRuntime(config,{...process.env,SUPABASE_ANON_KEY:anon[0].api_key},{checkpoint}));
 }catch(error){result={schema:'saved-clinic-unverified-draft-save/v1',status:'HOLD_RECONCILE_NO_RETRY',...last,errorClass:['AssertionError','TimeoutError','TypeError'].includes(error.name)?error.name:'Error',finalVerification:false,newConsent:false,sessionRenewal:false,funding:false,enqueue:false,workerAllowed:false};process.exitCode=1;}
 await writePrivate(path.join(output,'result.json'),result);console.log('Clinic typed draft-save checkpoint written.');
}
entry().catch(()=>{console.error('Clinic source/native/input admission held; no retry.');process.exitCode=1;});
