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
  assert.equal(actual.proof.outputContinuity.inputCount,198);
  const continuity=actual.proof.outputContinuity;
  assert.equal(continuity.sourcePredecessorOutput.path,'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v20.json');
  assert.equal(continuity.sourcePredecessorContinuity.path,'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v20.json');
  assert.equal(JSON.parse(fs.readFileSync(continuity.sourcePredecessorOutput.path)).sources.length,195);
  assert.deepEqual(continuity.artifactPredecessorOutput,{
    path:'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v19.json',
    sha256:'e5dfd06708c302427c28819ee7e265fe9987bf42e3d71c586d0ba10199bf2884'});
  assert.equal(continuity.artifactPredecessorContinuity.path,
    'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v19.json');
  const previous=JSON.parse(fs.readFileSync(continuity.artifactPredecessorOutput.path));
  const current=JSON.parse(fs.readFileSync(continuity.path));
  assert.deepEqual(previous.counts,{routes:6,outputs:18,byteIdentical:18,pass:130,fail:0});
  assert.equal(previous.sources.length,134);
  assert.deepEqual(current.counts,{routes:6,outputs:18,byteIdentical:15,pass:127,fail:3});
  assert.deepEqual(continuity.artifactSuccessor.rawCounts,current.counts);
  assert.equal(continuity.artifactSuccessor.routeId,'DC:dc_actual_innocence_expungement_16_803');
  assert.deepEqual(continuity.artifactSuccessor.decision,{
    path:'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_DC_ACTUAL_INNOCENCE_2026-10-16.json',
    sha256:'e37dcb06f202f35837f9df37e89febfbc9b61f0febf8d1c74bbf602009cb2858'});
  assert.equal(continuity.artifactSuccessor.artifactDigests.length,3);
  assert.equal(continuity.artifactSuccessor.createsOwnerApproval,false);
  assert.equal(continuity.artifactSuccessor.commercialAuthorityGranted,false);
  assert.equal(continuity.artifactSuccessor.productionAuthorized,false);
  assert.equal(actual.proof.currentProtectedJourneyEstablished,false);
});
for(const [file,reason] of [[MS_PAID_PACKET_PROOF_PREDECESSOR,/October 11 historical proof changed/],[MS_PAID_PACKET_PROOF_20260920,/September 20 historical proof changed|historical evidence changed/],[MS_PAID_PACKET_PROOF_RETIRED,/September 14 historical proof changed|historical evidence changed/]]){
 check(`tampered immutable ancestry ${file}`,()=>assert.throws(()=>load(proof,{file,bytes:Buffer.from('{}')}),reason));
}
const mutations={
 'removed output continuity':p=>delete p.outputContinuity,
 'borrowed old output proof':p=>{p.outputContinuity.path=p.outputContinuity.historicalOutput.path;},
 'invented current count':p=>{p.outputContinuity.inputCount=88;},
 'lost artifact predecessor continuity':p=>{delete p.outputContinuity.artifactPredecessorContinuity;},
 'lost artifact predecessor reproduction':p=>{delete p.outputContinuity.artifactPredecessorOutput;},
 'lost exact DC artifact adoption binding':p=>{delete p.outputContinuity.artifactSuccessor;},
 'lost earlier output continuity':p=>{delete p.outputContinuity.earlierContinuity;},
 'lost earlier output reproduction':p=>{delete p.outputContinuity.earlierOutput;},
 'lost previous output continuity':p=>{delete p.outputContinuity.previousContinuity;},
 'lost previous output reproduction':p=>{delete p.outputContinuity.previousOutput;},
 'lost same-date predecessor continuity':p=>{delete p.outputContinuity.sameDatePredecessorContinuity;},
 'lost same-date predecessor reproduction':p=>{delete p.outputContinuity.sameDatePredecessorOutput;},
 'lost accepted revision continuity':p=>{delete p.outputContinuity.acceptedRevisionContinuity;},
 'lost accepted revision reproduction':p=>{delete p.outputContinuity.acceptedRevisionOutput;},
 'lost prior revision continuity':p=>{delete p.outputContinuity.priorRevisionContinuity;},
 'lost prior revision reproduction':p=>{delete p.outputContinuity.priorRevisionOutput;},
 'lost immediate predecessor continuity':p=>{delete p.outputContinuity.immediatePredecessorContinuity;},
 'lost immediate predecessor reproduction':p=>{delete p.outputContinuity.immediatePredecessorOutput;},
 'lost latest predecessor continuity':p=>{delete p.outputContinuity.latestPredecessorContinuity;},
 'lost latest predecessor reproduction':p=>{delete p.outputContinuity.latestPredecessorOutput;},
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
// These exact six literal reads fail within mandatory DC adoption validation,
// before the later generic MS proof hash loop. Preserve the precise boundary;
// an arbitrary error cannot stand in for the expected refusal.
const dcExecutionRefusals={
 'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_DC_ACTUAL_INNOCENCE_2026-10-16.json':/DC artifact adoption bytes changed/,
 'data/rcap-grade-a/legal-decisions/DC_ACTUAL_INNOCENCE_ARTIFACT_MOVE_2026-10-16.json':/DC exact explained move binding/,
 'data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_DC_ACTUAL_INNOCENCE_2026-10-16.json':/DC exact visual review binding/,
 'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-en.pdf':/DC exact explained move binding/,
 'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-es.pdf':/DC exact explained move binding/,
 'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/court-only.pdf':/DC exact explained move binding/
};
check('all six DC artifact adoption/custody reads are explicit execution inputs',()=>{
 assert.equal(Object.keys(dcExecutionRefusals).length,6);
 for(const file of Object.keys(dcExecutionRefusals))assert.ok(MS_PROOF_EXECUTION_INPUTS.includes(file),file);
});
// The mandatory named source record refuses altered bytes before the generic
// proof-input loop. Keep this exact path/message separate from the six DC cases.
const namedSourceExecutionRefusals={
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-no-phone-contact-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: CA no-phone contact source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-sb288-ct-petition-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: GA SB288/CT petition source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-guide-spanish-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: GA guide Spanish source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ct-prepay-record-facts-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: CT prepay record-facts source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-il-sd-wy-record-facts-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: IL/SD/WY record-facts source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-oh-juvenile-copy-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: OH juvenile copy source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-safe-at-home-20261018-v1.json':{name:'Error',message:'Question-contract source successor refused: CA Safe at Home source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-20261019-v1.json':{name:'Error',message:'Question-contract source successor refused: lead Spanish source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-layer2-20261019-v1.json':{name:'Error',message:'Question-contract source successor refused: lead Spanish layer-2 source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-mn-guard-memo-20261019-v1.json':{name:'Error',message:'Question-contract source successor refused: MN guard memo source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-va-guard-memo-20261019-v1.json':{name:'Error',message:'Question-contract source successor refused: VA guard memo source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-va-spec-successor-gates-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: GA/VA spec successor gates source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-contact-successor-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: GA pardon contact successor source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-spec-pin-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: GA pardon spec-pin source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ny16055-three-terminology-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: NY16055 terminology source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-two-result-copies-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: CA two-result copy source succession record bytes changed'},
 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ms-ga-va-mn-20261017-v1.json':{name:'Error',message:'Question-contract source successor refused: MS/GA/VA/MN source succession record bytes changed'}
};
for(const file of MS_PROOF_EXECUTION_INPUTS)check(`execution dependency remains source-bound: ${file}`,()=>{
 assert.ok(proof.inputs[file]);
 const reason=namedSourceExecutionRefusals[file]??dcExecutionRefusals[file]??/stale MS packet proof|stale output input/;
 assert.throws(()=>load(proof,{file,bytes:Buffer.from('changed execution dependency')}),reason);
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
