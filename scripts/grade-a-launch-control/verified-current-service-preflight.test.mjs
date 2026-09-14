import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CURRENT_SERVICE_REVIEW,verifiedCurrentServicePreflight} from './verified-current-service-preflight.mjs';
const receipt=JSON.parse(fs.readFileSync(CURRENT_SERVICE_REVIEW));
const read=p=>fs.readFileSync(p);
test('owner-confirmed service successor verifies exact archive and keeps release closed',()=>{
 const r=verifiedCurrentServicePreflight(receipt,read);
 assert.equal(r?.runId,34869440888);assert.equal(r.services.supabase.passedChecks,5);assert.equal(r.services.vercel.passedChecks,4);
 assert.equal(r.candidateAcceptanceEstablished,false);assert.equal(r.releaseAuthorityGranted,false);
});
test('changed evidence, identity, counts, missing custody and authority elevation refuse',()=>{
 for(const mutate of [r=>r.runId++,r=>r.toolsSha='0'.repeat(40),r=>r.applicationAccepted=true,r=>r.releaseAuthorityGranted=true,r=>r.migrationsRan=true,r=>r.deploymentsRan=true,r=>r.services.vercel.passedChecks=0,r=>r.workerRebuildRequired=false,r=>r.custody=[]]){
  const r=structuredClone(receipt);mutate(r);assert.equal(verifiedCurrentServicePreflight(r,read),null);
 }
 for(const suffix of ['original.zip','preflight.json','worker-input-plan.json','jobs.json','artifacts.json','run.json']){
  assert.equal(verifiedCurrentServicePreflight(receipt,p=>p.endsWith(suffix)?Buffer.from('changed'):read(p)),null);
 }
});
