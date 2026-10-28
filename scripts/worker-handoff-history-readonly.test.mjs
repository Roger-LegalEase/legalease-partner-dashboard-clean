import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {HANDOFF_HISTORY_REFS,readHandoffHistoryInputs,reconcileHandoffHistory,captureWorkerHandoffHistory} from './worker-handoff-history-readonly.mjs';
const input=readHandoffHistoryInputs(process.cwd());
function syntheticExit(){return{type:'exit',timestamp:input.from+1000,request:{command:'private-command-must-not-emit',exit_event:{requested_stop:true,exit_code:0,guest_exit_code:0,secret:'private-secret-must-not-emit'}}};}
test('finite history reuses exact strict postguard for available, absent, missing-code and nonclean exit evidence',()=>{
 const available=reconcileHandoffHistory(input,[syntheticExit()]);assert.equal(available.handoffVerified,true);assert.equal(available.handoff.newStartAt,1793159353075);assert.equal(available.newStartSource,'pinned_actual_406283_post_projection');assert(!JSON.stringify(available).includes('private-command'));assert(!JSON.stringify(available).includes('private-secret'));
 const absent=reconcileHandoffHistory(input,[]);assert.equal(absent.handoffVerified,false);assert(absent.missingNativeFields.includes('old_exit_event'));
 const missing=syntheticExit();delete missing.request.exit_event.guest_exit_code;const r=reconcileHandoffHistory(input,[missing]);assert.equal(r.handoffVerified,false);assert(r.missingNativeFields.includes('guest_exit_code'));assert.equal(r.historyProjection.events[0].guestExitCode,null);
 const nonclean=syntheticExit();nonclean.request.exit_event.exit_code=137;assert.equal(reconcileHandoffHistory(input,[nonclean]).handoffVerified,false);const old=syntheticExit();old.timestamp=input.from-1;assert.equal(reconcileHandoffHistory(input,[old]).historyProjection.events.length,0);
 const source=fs.readFileSync('scripts/qualified-worker-placement.mjs','utf8'),prior=execFileSync('git',['show','f7c9aaad0b71bc7a5e2b6f511039132d78006548:scripts/qualified-worker-placement.mjs'],{encoding:'utf8'}),guard=s=>s.slice(s.indexOf('export function assertQualifiedWorkerPoststate'),s.indexOf('\nfunction write('));assert.equal(createHash('sha256').update(guard(source)).digest('hex'),createHash('sha256').update(guard(prior)).digest('hex'));
});
test('history collector makes only one bounded history GET with before/after drift checks and persists safe metadata only',async()=>{
 for(const drift of [false,true]){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'worker-handoff-history-'));try{
   for(const ref of Object.values(HANDOFF_HISTORY_REFS)){const p=path.join(root,ref.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(ref.path,p);}
   const calls=[];let details=0;const r=await captureWorkerHandoffHistory({root,checkExecution:false,env:{FLY_API_TOKEN:'synthetic-token-must-not-emit',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'12345'},fetchImpl:async(url,options)=>{calls.push({url,options});assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert(!options.body);let body;if(url.endsWith('/events?limit=50'))body=[syntheticExit()];else{body={id:'d8de5e4f759278',state:'started',instance_id:input.post.machine.instanceId,image_ref:{digest:input.post.machine.imageDigest,labels:{'org.opencontainers.image.revision':input.post.machine.ociRevision}},config:input.postConfig.config};if(++details===2&&drift)body.instance_id='CHANGEDINSTANCE';}return{status:200,json:async()=>body};}});
   assert.equal(calls.length,3);assert.equal(calls.filter(c=>c.url.endsWith('/events?limit=50')).length,1);assert(calls.every(c=>c.url.startsWith('https://api.machines.dev/v1/apps/legalease-rcap-render-worker/machines/d8de5e4f759278')));assert.equal(r.workerMutated,false);assert.equal(r.queueQueried,false);assert.equal(r.activationAuthorized,false);
   const stored=fs.readFileSync(path.join(root,'worker-identity-evidence/handoff-history.json'),'utf8');for(const secret of ['synthetic-token-must-not-emit','private-command-must-not-emit','private-secret-must-not-emit'])assert(!stored.includes(secret));assert(!stored.includes('NODE_ENV'));assert(r.historyProjection.events.length===1);
   if(drift)assert.equal(r.status,'HOLD_NATIVE_HANDOFF_HISTORY_UNPROVEN');else{assert.equal(r.status,'NATIVE_HANDOFF_VERIFIED_REQUIRES_C_ACCEPTANCE');assert.equal(r.machineUnchangedDuringHistoryRead,true);}
  }finally{fs.rmSync(root,{recursive:true});}
 }
 const workflow=fs.readFileSync('.github/workflows/rcap-worker-identity-readonly.yml','utf8');assert(workflow.includes('handoff_history:'));assert(workflow.includes('node --test scripts/worker-handoff-history-readonly.test.mjs'));assert(!workflow.includes('npm ci'));assert(!workflow.includes('docker '));
});
