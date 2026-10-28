import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {assertReviewedExposure,assertFreshWorkerPrestate,assertQualifiedWorkerPoststate} from './qualified-worker-placement.mjs';
import {readQualifiedWorkerPlacementEvidence,prepareQualifiedWorkerPlacementRecords,requireQualifiedDatabasePhase,verifyQualifiedDatabaseBinding} from './grade-a-launch-control/qualified-production-database-binding.mjs';
const root=process.cwd(),evidence=readQualifiedWorkerPlacementEvidence(root),head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),file='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',base='36f0f8ccdd9cd6923686fdd34a1674e53cc9aaf1',mirror='sha256:'+'f'.repeat(64),source='84a75b6e65dc69e6c371afac44f1284e0debf722',digest='sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1';
test('exact accepted readiness/rollback capsule are required; new worker-only records retain actual predecessor history',()=>{
 const records=prepareQualifiedWorkerPlacementRecords(root,{toolsSha:head(),releaseBaseSha:base}),c=records[file];assert.equal(Object.keys(records).length,3);assert.deepEqual(c.productionAuthorization.phases,['production_worker_deploy']);assert.equal(c.qualifiedWorkerDatabase.phase,'production_worker_deploy');assert.deepEqual(c.qualifiedWorkerDatabase.acceptedWorkerReadiness,evidence.descriptor);assert.equal(c.supersededRecord.qualifiedWorkerDatabase.phase,'smoke');assert.equal(c.canonicalSourceEquivalent,false);assert.equal(c.canonicalRebuildRequired,true);assert.equal(c.productionAuthorization.stagedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(c.productionAuthorization.rollbackDeploymentId,'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6');assert.equal(evidence.identity.rollback.configSha256,'f843304dd154e5ffe3579b35b1d11de993a1f7ecc0a5c3841748f54bc7382168');
});
test('fresh pre-effect facts hold exact old instance/config/image/binding and unreviewed concurrent spec drift without a global empty-queue rule',()=>{
 assertFreshWorkerPrestate(evidence.identity,evidence);
 for(const mutate of [x=>x.machine.instanceId='changed',x=>x.machine.imageDigest=mirror,x=>x.rollback.configSha256='a'.repeat(64),x=>x.observations.effectiveWorker.projectRef='wrong',x=>x.observations.queue.exposed_work=[{route_id:'unreviewed',renderer_kind:'unknown'}]]){const x=structuredClone(evidence.identity);mutate(x);assert.throws(()=>assertFreshWorkerPrestate(x,evidence));}
 const q=structuredClone(evidence.identity.observations.queue);q.status_counts.succeeded=3;assertReviewedExposure(q,[]);
});
function syntheticPost(){
 const actual=structuredClone(evidence.identity),intent={beforeInstanceId:evidence.identity.machine.instanceId,recordedAt:'2026-10-28T03:20:00.000Z'};
 Object.assign(actual.machine,{instanceId:'NEWINSTANCE0000001',imageDigest:mirror,ociRevision:source,exportedDigest:digest});actual.observations.effectiveWorker.workerPid=123;
 const config=structuredClone(evidence.capsule.config);config.image='registry.fly.io/legalease-rcap-render-worker@'+mirror;config.env.RCAP_WORKER_CONTAINER_DIGEST=digest;config.metadata.fly_release_version='synthetic-new-release';
 const events=[{type:'exit',timestamp:Date.parse(intent.recordedAt)+100,request:{exit_event:{requested_stop:true,exit_code:0,guest_exit_code:0}}},{type:'start',timestamp:Date.parse(intent.recordedAt)+200}];return{actual,intent,config,events};
}
test('postproof requires exact physical mirror/revision/config, effective WWT and native clean requested exit followed by new start',()=>{
 const x=syntheticPost(),r=assertQualifiedWorkerPoststate(x.actual,evidence,x.intent,mirror,x.events,x.config);assert.equal(r.actualHandoffObserved,true);assert.equal(r.newMirrorDigest,mirror);assert.notEqual(mirror,digest);assert.equal(r.configuredSignal,'SIGTERM');assert.equal(r.configuredGrace,'30s');
 for(const mutate of [x=>x.actual.machine.imageDigest=digest,x=>x.actual.machine.ociRevision='a'.repeat(40),x=>x.actual.machine.instanceId=x.intent.beforeInstanceId,x=>x.config.env.NODE_ENV='test',x=>x.events=[],x=>x.events[0].request.exit_event.requested_stop=false,x=>x.events[0].request.exit_event.guest_signal=9,x=>x.events[0].request.exit_event.exit_code=137,x=>x.events[1].timestamp=Date.parse(x.intent.recordedAt)-1]){const y=syntheticPost();mutate(y);assert.throws(()=>assertQualifiedWorkerPoststate(y.actual,evidence,y.intent,mirror,y.events,y.config));}
});
test('contained workflow places only the admitted machine after mirror/fresh proof and preserves legacy flow without automatic retry',()=>{
 const w=fs.readFileSync('.github/workflows/deploy-rcap-render-worker-production.yml','utf8');const mirror=w.indexOf('docker push'),fresh=w.indexOf('node scripts/qualified-worker-placement.mjs pre-effect'),deploy=w.indexOf('          flyctl deploy');assert(mirror<fresh&&fresh<deploy);assert(w.includes('--only-machines "$WORKER_MACHINE_ID" --update-only --deploy-retries 0 --skip-release-command'));assert(w.includes('"${PLACEMENT_FLAGS[@]}"'));assert(w.includes('node scripts/qualified-worker-placement.mjs post-placement'));assert(w.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'));
 const capture=fs.readFileSync('scripts/qualified-worker-readonly-capture.mjs','utf8');assert(capture.includes("'production-worker-evidence/pre-effect','production-worker-evidence/post-placement'"));assert(capture.includes("checkExecution=true"));assert(!/\b(insert|update|delete|truncate)\s+(?:from|into|public\.)/i.test(fs.readFileSync('scripts/qualified-worker-placement.mjs','utf8')));
});
if(process.env.QUALIFIED_WORKER_CONTROLLER_TEST==='1'){
 test('actual frozen worker phase passes current binding and refuses smoke, migration and activation grants',()=>{const c=JSON.parse(fs.readFileSync(file));assert.equal(verifyQualifiedDatabaseBinding(root,c).current,true);assert.deepEqual(requireQualifiedDatabasePhase(c,'production_worker_deploy'),c.productionAuthorization);for(const phase of ['smoke','forward_chain_migrate','activate','public_verify'])assert.throws(()=>requireQualifiedDatabasePhase(c,phase));});
}
