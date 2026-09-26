import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
const block=source.slice(source.indexOf('      const localRepairPaths = ['),source.indexOf('      const bounded = new Set(['));
const baseline=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'));
function verify(binding,overrideRead){
  vm.runInNewContext(block,{binding,root,path,fs:{readFileSync:p=>overrideRead?.(p)??fs.readFileSync(p)},
    createHash:crypto.createHash,generated:new Set(),execFileSync,git:args=>execFileSync('git',args,{encoding:'utf8'}).trim()});
}
test('successor tools overlay preserves prior receipt and pins only exact held repair bytes',()=>{
  verify(baseline);
  const previous=JSON.parse(execFileSync('git',['show','579febaaddc5a004d824b74f486e567115db4db2:data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'],{encoding:'utf8'}));
  assert.deepEqual(baseline.localQueueLifecycleRepair,previous.localQueueLifecycleRepair);
  for(const mutate of [b=>b.localClinicRuntimeRepair.files['src/app/page.tsx']='a'.repeat(64),
    b=>delete b.localClinicRuntimeRepair.files['scripts/rcap-clinic-worker-context.mjs'],
    b=>b.localClinicRuntimeRepair.baseSha='0'.repeat(40),b=>b.localClinicRuntimeRepair.executionAuthorized=true,
    b=>b.localClinicRuntimeRepair.pushAuthorized=true,
    b=>b.localQueueLifecycleRepair.files['scripts/grade-a-launch-control/verify-release-candidate-binding.mjs']='0'.repeat(64),
    b=>b.localQueueLifecycleRepair.files['scripts/grade-a-launch-control/test-acceptance-queue-tools-binding.mjs']='0'.repeat(64),
    ...['clinicDispatchReady','hostedFullReady','productionAuthorized','deploymentAuthorized','migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized'].map(k=>b=>b[k]=true)]){
    const b=structuredClone(baseline);mutate(b);assert.throws(()=>verify(b));
  }
  for(const file of Object.keys(baseline.localClinicRuntimeRepair.files))assert.throws(()=>verify(baseline,p=>p===path.join(root,file)?Buffer.from('drift'):undefined),file);
});
