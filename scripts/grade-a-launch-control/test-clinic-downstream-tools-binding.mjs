import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=process.cwd(),source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
const block=source.slice(source.indexOf('      const localRepairPaths = ['),source.indexOf('      const bounded = new Set(['));
const baseline=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'));
const verify=(binding,override)=>vm.runInNewContext(block,{binding,root,path,fs:{readFileSync:p=>override?.(p)??fs.readFileSync(p)},createHash:crypto.createHash,generated:new Set(),execFileSync,git:args=>execFileSync('git',args,{encoding:'utf8'}).trim()});
test('downstream overlay preserves previous receipts, exact inputs and all execution holds',()=>{
  verify(baseline);
  const prior=JSON.parse(execFileSync('git',['show','51ad71a326112eda76f089ef27284b1bc15cba7f:data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'],{encoding:'utf8'}));
  for(const k of ['localQueueLifecycleRepair','localClinicRuntimeRepair'])assert.deepEqual(baseline[k],prior[k]);
  for(const mutate of [b=>b.localClinicDownstreamRepair.files['src/app/page.tsx']='a'.repeat(64),b=>delete b.localClinicDownstreamRepair.files['scripts/rcap-clinic-packet-capacity.mjs'],
    b=>b.localClinicDownstreamRepair.baseSha='0'.repeat(40),b=>b.localClinicDownstreamRepair.executionAuthorized=true,b=>b.localClinicDownstreamRepair.pushAuthorized=true,
    b=>b.localClinicRuntimeRepair.files['scripts/rcap-clinic-failed-target-reconciliation.mjs']='0'.repeat(64),
    ...['clinicDispatchReady','hostedFullReady','productionAuthorized','deploymentAuthorized','migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized'].map(k=>b=>b[k]=true)]){
    const b=structuredClone(baseline);mutate(b);assert.throws(()=>verify(b));
  }
  for(const file of Object.keys(baseline.localClinicDownstreamRepair.files))assert.throws(()=>verify(baseline,p=>p===path.join(root,file)?Buffer.from('drift'):undefined),file);
});
