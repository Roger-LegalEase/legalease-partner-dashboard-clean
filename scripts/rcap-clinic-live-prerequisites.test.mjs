import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {collectClinicLivePrerequisites,readCurrentClinicGate} from './rcap-clinic-live-prerequisites.mjs';
test('live adapter makes one fixed-project read-only aggregate and retains all blockers without catalog contents',async()=>{
 let reads=0;
 const result=await collectClinicLivePrerequisites({env:{SUPABASE_ACCESS_TOKEN:'mock-existing-context',VERCEL_TOKEN:'mock'},
  querySql:'begin transaction read only; select current_database(); commit;',
  fetchImpl:async(address,options)=>{
    if(String(address)===`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`) {
      reads++;const body=JSON.parse(options.body);assert.equal(body.read_only,true);assert.equal(options.redirect,'error');
      return new Response(JSON.stringify([{clinic_known_compatibility_prerequisites:{privateSentinel:'not-recorded'}}]),{status:200});
    }
    throw Error('unproven preview fixture');
  },
  qualifyDatabase:({catalog,projectRef,appSha})=>{
    assert.equal(catalog.privateSentinel,'not-recorded');assert.equal(projectRef,CLINIC_SETUP.project);assert.equal(appSha,CLINIC_SETUP.app);
    return {status:'BLOCKED',checks:[{id:'missing_claim_overload',ok:false},{id:'missing_retry_columns',ok:false}],blockers:[{id:'missing_claim_overload'},{id:'missing_retry_columns'}]};
  }});
 assert.equal(reads,1);assert.equal(result.status,'BLOCKED');
 for(const id of ['missing_claim_overload','missing_retry_columns','exact_current_preview','shipped_and_server_captcha'])assert.ok(result.blockers.some(check=>check.id===id));
 assert.ok(!JSON.stringify(result).includes('not-recorded'));assert.ok(!JSON.stringify(result).includes('mock-existing-context'));
});
test('browser admission rejects stale, other-run, unknown CAPTCHA and incomplete prerequisite artifacts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-gate-unit-'));const file=path.join(dir,'gate.json');
 const env={GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1'},now=Date.now();
 const gate={schemaVersion:'clinic_setup_live_readonly_prerequisites/v1',status:'READY',projectRef:CLINIC_SETUP.project,
  applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:'123',runAttempt:'1',capturedAt:new Date(now).toISOString(),
  checks:['database_complete_compatibility','exact_current_preview','shipped_and_server_captcha'].map(id=>({id,ok:true})),blockers:[],
  preview:{previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId},captchaPolicy:{project:CLINIC_SETUP.project,serverCaptchaRequired:false,
    frontend:{applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}}};
 try {
  fs.writeFileSync(file,JSON.stringify(gate));assert.equal(readCurrentClinicGate(file,env,now).status,'READY','unit-only artifact contract; no hosted readiness claim');
  for(const change of [d=>{d.status='BLOCKED';},d=>{d.runId='456';},d=>{d.capturedAt=new Date(now-300001).toISOString();},
   d=>{d.captchaPolicy.serverCaptchaRequired=true;},d=>{d.captchaPolicy.frontend.clientCaptchaRequired=null;},d=>{d.checks.shift();}]) {
    const changed=structuredClone(gate);change(changed);fs.writeFileSync(file,JSON.stringify(changed));assert.throws(()=>readCurrentClinicGate(file,env,now));
  }
 } finally {fs.rmSync(dir,{recursive:true});}
});
