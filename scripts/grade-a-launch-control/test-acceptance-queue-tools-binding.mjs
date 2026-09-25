import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';

// Execute the actual finite-overlay verifier block; no edits to a shared tree
// and no temporary Git commit needed to test the self-referential SHA boundary.
const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
const block=source.slice(source.indexOf('      const localRepairPaths = ['),source.indexOf('      const bounded = new Set(['));
const baseline=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'));
function verify(binding,overrideRead) {
 const localFs={readFileSync:p=>overrideRead?.(p) ?? fs.readFileSync(p)};
 const context=vm.createContext({binding,fs:localFs,path,root:process.cwd(),createHash:crypto.createHash,generated:new Set(),git:()=>''});
 vm.runInContext(block,context);
}
test('local tools pins are finite, exact, fail closed and never grant execution',()=>{
 verify(baseline);
 for(const mutate of [
  b=>b.localQueueLifecycleRepair.files['src/app/page.tsx']='a'.repeat(64),
  b=>delete b.localQueueLifecycleRepair.files['scripts/rcap-hosted-acceptance-payment.mjs'],
  b=>b.localQueueLifecycleRepair.files['scripts/rcap-hosted-acceptance-payment.mjs']='0'.repeat(64),
  b=>b.localQueueLifecycleRepair.executionAuthorized=true,
  b=>b.localQueueLifecycleRepair.pushAuthorized=true,
  b=>b.localQueueLifecycleRepair.baseSha='0'.repeat(40),
  b=>b.clinicDispatchReady=true,
  b=>b.housekeepingReplayAuthorized=true,
  b=>b.migrationReplayAuthorized=true,
  b=>b.additionalWorkerPublicationAuthorized=true,
  b=>b.imageAcceptanceRerunAuthorized=true,
  b=>b.productionAuthorized=true
 ]) {const b=structuredClone(baseline);mutate(b);assert.throws(()=>verify(b));}
 for(const file of Object.keys(baseline.localQueueLifecycleRepair.files)) {
  assert.throws(()=>verify(baseline,p=>p===path.join(process.cwd(),file)?Buffer.from('different bytes'):undefined),file);
 }
});
