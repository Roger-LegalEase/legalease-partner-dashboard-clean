import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { loadMsPaidPacketProof, MS_PAID_PACKET_PROOF, MS_PAID_PACKET_PROOF_PREDECESSOR,
  MS_PAID_PACKET_PROOF_20260920, MS_PAID_PACKET_PROOF_RETIRED, MS_PROOF_EXECUTION_INPUTS, MS_PROOF_OBSERVED_INPUTS, assertMsObservedExecution } from './lib/ms-paid-packet-proof.mjs';
// Pure provenance controls, not an output reproduction or database witness.
function observedInventoryControls(candidate){
  assertMsObservedExecution(candidate);
  const mutations=[p=>delete p.observedExecution,p=>p.observedExecution.modules.pop(),p=>p.observedExecution.modules.push(p.observedExecution.modules[0]),p=>{p.observedExecution.modules[0].sha256='0'.repeat(64);},p=>{p.observedExecution.modules[0].file='scripts/invented-unexecuted-source.mjs';},p=>{delete p.inputs[p.observedExecution.modules[0].file];},p=>{p.observedExecution.modules[0].unexecuted=true;}];
  for(const mutate of mutations){const p=structuredClone(candidate);mutate(p);assert.throws(()=>assertMsObservedExecution(p),assert.AssertionError);}
  return mutations.length+1;
}
if(process.argv.includes('--observed-controls-only')){
  const modules=MS_PROOF_OBSERVED_INPUTS.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
  const count=observedInventoryControls({observedExecution:{kind:'actual_local_module_loads',modules},inputs:Object.fromEntries(modules.map(entry=>[entry.file,entry.sha256]))});
  console.log(`PASS: ${count} observed-import schema/tamper/omission controls; no packet reproduction claimed.`);process.exit(0);
}
register('./lib/ts-esm-loader.mjs',import.meta.url);
const { loadMsPaidConsumerSuccessor }=await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const { stableStringify }=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const approval=loadMsPaidConsumerSuccessor();
const proof=JSON.parse(fs.readFileSync(MS_PAID_PACKET_PROOF));
const prior=JSON.parse(fs.readFileSync(MS_PAID_PACKET_PROOF_PREDECESSOR));
const load=(candidate=proof,override)=>loadMsPaidPacketProof({approval,stableStringify,readBytes:file=>file===MS_PAID_PACKET_PROOF?Buffer.from(JSON.stringify(candidate)):override?.file===file?override.bytes:fs.readFileSync(file)});
let checks=0;
function check(name,fn){try{fn();checks++;}catch(error){error.message=`${name}: ${error.message}`;throw error;}}
check('actual observed module inventory refuses omission, drift and invention',()=>assert.equal(observedInventoryControls(proof),8));
check('actual current v4 proof validates three exact approved outputs',()=>{
  const actual=load();assert.equal(actual.proof.schemaVersion,'rcap-ms-paid-packet-proof/v4');
  assert.equal(actual.proof.results.length,3);assert.deepEqual(actual.proof.results,prior.results);
  assert.deepEqual(actual.proof.ownerDecision,prior.ownerDecision);
  assert.equal(actual.proof.outputContinuity.inputCount,112);
  assert.equal(actual.proof.currentProtectedJourneyEstablished,false);
});
for(const [file,reason] of [[MS_PAID_PACKET_PROOF_PREDECESSOR,/October 11 historical proof changed/],[MS_PAID_PACKET_PROOF_20260920,/September 20 historical proof changed|historical evidence changed/],[MS_PAID_PACKET_PROOF_RETIRED,/September 14 historical proof changed|historical evidence changed/]]){
 check(`tampered immutable ancestry ${file}`,()=>assert.throws(()=>load(proof,{file,bytes:Buffer.from('{}')}),reason));
}
const mutations={
 'removed output continuity':p=>delete p.outputContinuity,
 'borrowed old output proof':p=>{p.outputContinuity.path=p.outputContinuity.historicalOutput.path;},
 'invented current count':p=>{p.outputContinuity.inputCount=88;},
 'altered predecessor pin':p=>{p.supersededProof.sha256='0'.repeat(64);},
 'lost earliest predecessor':p=>delete p.inputs[MS_PAID_PACKET_PROOF_RETIRED],
 'lost immediate predecessor':p=>delete p.inputs[MS_PAID_PACKET_PROOF_PREDECESSOR],
 'changed owner approval':p=>{p.ownerDecision.productionAuthorized=true;},
 'changed source authority':p=>{p.sourceAuthority.boundInputsSha256='0'.repeat(64);},
 'changed raster claim':p=>{p.results[0].rasterPagesMatchReview=false;},
 'changed packet identity':p=>{p.results[0].artifactSha256='0'.repeat(64);},
 'failed PostgreSQL control':p=>{p.results[0].postgresJsonbByteIdentical=false;},
 'missing binding control':p=>{p.results[0].negativeBindingControls=8;},
 'changed safety treatment':p=>{p.chargedConductSafetyControls[0].reason='different';},
 'unapproved participant promoted':p=>{p.unapprovedDeterminismControls[0].approved=true;},
 'invented protected acceptance':p=>{p.currentProtectedJourneyEstablished=true;},
 'invented new authority':p=>{p.newCommercialApproval=true;}
};
for(const [name,mutate] of Object.entries(mutations))check(name,()=>{const p=structuredClone(proof);mutate(p);assert.throws(()=>load(p),assert.AssertionError);});
for(const file of Object.keys(proof.inputs))check(`omitted dependency refused: ${file}`,()=>{
 const candidate=structuredClone(proof);delete candidate.inputs[file];
 assert.throws(()=>load(candidate),/incomplete or undeclared MS proof input inventory|missing proof input|observed module hash mismatch/);
});
check('unknown unexecuted input cannot extend the proof inventory',()=>{
 const candidate=structuredClone(proof);candidate.inputs['scripts/invented-unexecuted-source.mjs']='0'.repeat(64);
 assert.throws(()=>load(candidate),/incomplete or undeclared MS proof input inventory/);
});
for(const file of MS_PROOF_EXECUTION_INPUTS)check(`execution helper or lockfile remains source-bound: ${file}`,()=>{
 assert.ok(proof.inputs[file]);
 assert.throws(()=>load(proof,{file,bytes:Buffer.from('changed execution dependency')}),/stale MS packet proof|stale output input/);
});
for(const file of ['scripts/lib/ms-paid-packet-proof.mjs','scripts/verify-ms-paid-packet-proof.mjs','src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/fulfillment/final-verification-contract.ts'])check(`current exact implementation remains pinned ${file}`,()=>assert.throws(()=>load(proof,{file,bytes:Buffer.concat([fs.readFileSync(file),Buffer.from('\n')])}),/stale MS packet proof|stale output input/));
check('proof generator refuses existing private output before any PostgreSQL',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ms-proof-write-guard-'));
 const target=path.join(dir,'preserved.json');fs.writeFileSync(target,'preserve these bytes');
 const before=fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith('rcap-epg-')).sort();
 try{assert.throws(()=>execFileSync(process.execPath,['scripts/verify-ms-paid-packet-proof.mjs','--output',target],{stdio:'pipe'}),error=>/refusing to overwrite an existing proof/.test(String(error.stderr)));
 assert.equal(fs.readFileSync(target,'utf8'),'preserve these bytes');
 assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith('rcap-epg-')).sort(),before);
 }finally{fs.rmSync(dir,{recursive:true});}
});
console.log(`PASS: ${checks} exact MS output-continuity/ancestry/refusal controls; no protected delivery or commercial authorization.`);
