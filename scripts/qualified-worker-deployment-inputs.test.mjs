import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readQualifiedWorkerPlacementEvidence} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {readReadinessPrerequisites} from './qualified-worker-readonly-capture.mjs';
import {readQualifiedWorkerDeploymentInputs} from './qualified-worker-deployment-inputs.mjs';
const root=process.cwd(),candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')),publication=JSON.parse(fs.readFileSync('data/rcap-render/worker-publication-evidence.json'));
candidate.qualifiedWorkerDatabase.completedSmoke=readReadinessPrerequisites(root);candidate.qualifiedWorkerDatabase.acceptedWorkerReadiness=readQualifiedWorkerPlacementEvidence(root).descriptor;
const workflow=fs.readFileSync('.github/workflows/deploy-rcap-render-worker-production.yml','utf8');
test('current qualified worker prerequisites consume actual accepted preflight/database/smoke and exact sourceSha publication without inventing tag',()=>{
 assert.equal(publication.imageAcceptance.tag,undefined);const p=readQualifiedWorkerDeploymentInputs(root,candidate,publication);assert.equal(p.preflightRunId,40606269080);assert.equal(p.database.runId,40617912474);assert.equal(p.smoke.actualSmokeRunId,40619590234);assert.equal(p.workerPlacementAuthorized,false);assert.equal(p.handoffProven,false);
 for(const change of [p=>p.imageAcceptance.sourceSha='a'.repeat(40),p=>p.imageAcceptance.tag=p.imageAcceptance.sourceSha,p=>p.imageAcceptance.readOnly=false]){const p=structuredClone(publication);change(p);assert.throws(()=>readQualifiedWorkerDeploymentInputs(root,candidate,p));}
});
// Execute the actual inline selector with synthetic gate ports; this proves field/default selection, not a worker phase admission.
const marker="          node --input-type=module <<'JS'\n",at=workflow.indexOf(marker)+marker.length,end=workflow.indexOf('\n          JS',at),code=workflow.slice(at,end).split('\n').map(s=>s.slice(10)).join('\n').replace(/^import .*;\n/gm,'');
const run=new Function('fs','requireProductionPhaseAuthorization','verifyProductionPreflightEvidence','requireCurrentReleaseCandidate','readQualifiedWorkerDeploymentInputs','process','console',code);
function selector(c,p){const calls=[];run({readFileSync:name=>JSON.stringify(name.includes('RELEASE_CANDIDATE')?c:p)},()=>calls.push('phase'),()=>calls.push('legacy'),()=>calls.push('current'),()=>calls.push('qualified'),{cwd:()=>root,env:{INPUT_WORKER_SOURCE_SHA:c.workerSourceSha,INPUT_WORKER_DIGEST:c.workerDigest}},{log:()=>{}});return calls;}
test('actual workflow selector keeps exact phase/current gates and reads qualified sourceSha while preserving legacy tag default',()=>{
 assert.deepEqual(selector(candidate,publication),['phase','current','qualified']);const bad=structuredClone(publication);bad.imageAcceptance.tag=bad.imageAcceptance.sourceSha;delete bad.imageAcceptance.sourceSha;assert.throws(()=>selector(candidate,bad),/image acceptance source/);
 const c={workerSourceSha:'a'.repeat(40),workerDigest:'sha256:'+'b'.repeat(64),productionAuthorized:true},p={sourceSha:c.workerSourceSha,immutableRegistryDigest:c.workerDigest,workflowConclusion:'success',runtimeAccepted:true,imageAcceptance:{conclusion:'success',digest:c.workerDigest,tag:c.workerSourceSha}};assert.deepEqual(selector(c,p),['phase','legacy']);delete p.imageAcceptance.tag;assert.throws(()=>selector(c,p),/image acceptance source/);
});
test('qualified history uses bounded seven-ref captain source and retains strict legacy checkout default',()=>{
 assert.match(workflow,/fetch-depth:.*84a75b6e65dc69e6c371afac44f1284e0debf722.*257 \|\| 0/);assert(workflow.includes('git fetch --no-tags --depth=257 origin captain-release'));const refs=workflow.match(/for required in (.+); do/)[1].split(' ');assert.equal(refs.length,7);assert(workflow.includes('[ "$(git rev-parse HEAD)" = "$GITHUB_SHA" ]'));assert(workflow.includes('readQualifiedWorkerDeploymentInputs(process.cwd(), candidate, publication)'));assert(workflow.includes('else verifyProductionPreflightEvidence(process.cwd())'));assert(!workflow.includes('docker build'));
});
