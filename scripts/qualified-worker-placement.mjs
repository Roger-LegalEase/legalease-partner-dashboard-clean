import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {captureQualifiedWorkerReadiness} from './qualified-worker-readonly-capture.mjs';
const APP='legalease-rcap-render-worker',SOURCE='84a75b6e65dc69e6c371afac44f1284e0debf722',DIGEST='sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function assertReviewedExposure(queue,accepted){
 const spec=g=>JSON.stringify(Object.fromEntries(['route_id','renderer_kind','renderer_version','profile_version','source_sha_present'].map(k=>[k,g[k]])));
 const reviewed=new Set(accepted.map(spec));for(const group of queue.exposed_work)assert(reviewed.has(spec(group)),'Unreviewed concurrent work/spec exposure; hold for exact compatibility review');
 assert.equal(queue.missing_leases,0,'Unreviewed lease ownership');assert.equal(queue.expired_leases,0,'Unreviewed expired lease state');assert.equal(queue.terminal_failed,0,'Terminal queue failure requires review');
}
export function assertFreshWorkerPrestate(actual,accepted){
 assert.equal(actual.status,'READINESS_CAPTURED_REQUIRES_C_REVIEW');assert.equal(actual.machineUnchangedDuringCapture,true);assert.deepEqual(actual.machine,accepted.identity.machine,'Current machine image/instance/config/stop facts drifted');assert.deepEqual(actual.observations.effectiveWorker,accepted.identity.observations.effectiveWorker,'Current effective worker binding drifted');
 assert.equal(actual.rollback.sha256,accepted.descriptor.capsule.sha256);assert.equal(actual.rollback.configSha256,accepted.descriptor.configSha256);assert.equal(actual.rollback.durableVerified,true);assertReviewedExposure(actual.observations.queue,accepted.descriptor.acceptedExposure);
}
export function projectNativeHandoffEvents(events){
 const selected=Array.isArray(events)?events.filter(e=>['exit','start'].includes(e?.type)):[];
 const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:null;
 return{schemaVersion:'qualified-native-handoff-event-projection/v1',truncated:selected.length>32,events:selected.slice(0,32).map(e=>{const exit=e.request?.exit_event;return{type:e.type,timestamp:integer(e.timestamp,Number.MAX_SAFE_INTEGER),...(e.type==='exit'?{requestedStop:typeof exit?.requested_stop==='boolean'?exit.requested_stop:null,exitCode:integer(exit?.exit_code,255),guestExitCode:integer(exit?.guest_exit_code,255),guestSignal:integer(exit?.guest_signal,64),signal:integer(exit?.signal,64),oomKilled:typeof exit?.oom_killed==='boolean'?exit.oom_killed:null}: {})};})};
}
export function assertQualifiedWorkerPoststate(actual,accepted,intent,mirrorDigest,events,postConfig){
 assert.equal(actual.status,'READINESS_CAPTURED_REQUIRES_C_REVIEW');assert.equal(actual.machineUnchangedDuringCapture,true);const m=actual.machine;
 assert.equal(m.id,accepted.identity.machine.id);assert.notEqual(m.instanceId,intent.beforeInstanceId,'New physical machine version required');assert.equal(m.imageDigest,mirrorDigest,'Exact mirrored image required');assert.match(mirrorDigest,/^sha256:[a-f0-9]{64}$/);assert.equal(m.ociRevision,SOURCE);assert.equal(m.exportedDigest,DIGEST);assert.equal(m.restartPolicy,'always');assert.equal(m.serviceCount,0);assert(m.memoryMb>=1024);assert.deepEqual(m.stopConfig,accepted.identity.machine.stopConfig);
 const strip=config=>{const c=structuredClone(config);delete c.image;delete c.env.RCAP_WORKER_CONTAINER_DIGEST;for(const k of ['fly_release_id','fly_release_version','fly_flyctl_version','fly_previous_alloc'])delete c.metadata?.[k];return c;};assert.equal(postConfig.image,'registry.fly.io/'+APP+'@'+mirrorDigest);assert.equal(postConfig.env.RCAP_WORKER_CONTAINER_DIGEST,DIGEST);assert.deepEqual(strip(postConfig),strip(accepted.capsule.config),'Unrelated worker config drifted');
 const binding=actual.observations.effectiveWorker;assert.equal(binding.passed,true);assert.equal(binding.roleProven,true);assert.equal(binding.projectRef,'wwtwtsmywnckfkdaqqeg');assertReviewedExposure(actual.observations.queue,accepted.descriptor.acceptedExposure);
 assert(Array.isArray(events));const fresh=events.filter(e=>Number.isSafeInteger(e.timestamp)&&e.timestamp>=Date.parse(intent.recordedAt));
 const exit=fresh.find(e=>e.type==='exit'&&e.request?.exit_event&&e.request.exit_event.requested_stop===true&&e.request.exit_event.exit_code===0&&e.request.exit_event.guest_exit_code===0&&e.request.exit_event.guest_signal!==9&&e.request.exit_event.signal!==9&&!e.request.exit_event.oom_killed);
 assert(exit,'Native requested clean old-worker exit is unproved; no automatic retry/rollback');const start=fresh.find(e=>e.type==='start'&&e.timestamp>=exit.timestamp);assert(start,'Native new-worker start after old exit is unproved');
 return{machineId:m.id,beforeInstanceId:intent.beforeInstanceId,afterInstanceId:m.instanceId,oldImageDigest:accepted.identity.machine.imageDigest,newMirrorDigest:m.imageDigest,newSource:m.ociRevision,requestedCleanExitAt:exit.timestamp,newStartAt:start.timestamp,configuredSignal:accepted.identity.machine.stopConfig.signal,configuredGrace:accepted.identity.machine.stopConfig.timeout,claimLeaseSeconds:600,canonicalFencingUnchanged:true,actualHandoffObserved:true};
}
function write(root,name,value,raw=false){
 const directory=path.join(root,'production-worker-evidence'),bytes=raw?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.mkdirSync(directory,{recursive:true,mode:0o700});const file=path.join(directory,name),fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}assert.equal(hash(fs.readFileSync(file)),hash(bytes));const d=fs.openSync(directory,'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}return{path:name,sha256:hash(bytes)};
}
export async function verifyQualifiedWorkerTransition({stage,root=process.cwd(),env=process.env,fetchImpl=fetch,capture=captureQualifiedWorkerReadiness}={}){
 const [{requireCurrentReleaseCandidate},{requireProductionPhaseAuthorization},{readQualifiedWorkerPlacementEvidence}]=await Promise.all([import('./grade-a-launch-control/verify-release-candidate-binding.mjs'),import('./grade-a-launch-control/production-preflight-authorization.mjs'),import('./grade-a-launch-control/qualified-production-database-binding.mjs')]);
 assert(['pre-effect','post-placement'].includes(stage));const candidate=requireCurrentReleaseCandidate(root);requireProductionPhaseAuthorization(candidate,'production_worker_deploy');assert.equal(candidate.workerSourceSha,SOURCE);assert.equal(candidate.workerDigest,DIGEST);assert.equal(env.FLY_APP_NAME,APP);assert.equal(env.RCAP_WORKER_SOURCE_SHA??env.WORKER_SOURCE_SHA,SOURCE);assert.equal(env.RCAP_WORKER_DIGEST??env.WORKER_DIGEST,DIGEST);
 const accepted=readQualifiedWorkerPlacementEvidence(root);assert.deepEqual(candidate.qualifiedWorkerDatabase.acceptedWorkerReadiness,accepted.descriptor);
 let result={schemaVersion:'qualified-worker-'+stage+'/v1',passed:false,stage,automaticRetry:false,automaticRollback:false,activationAuthorized:false};
 try{
  const actual=await capture({root,env,fetchImpl,evidenceDirectory:'production-worker-evidence/'+stage});
  if(stage==='pre-effect'){
   assertFreshWorkerPrestate(actual,accepted);const original=fs.readFileSync(path.join(root,accepted.descriptor.capsule.path));assert.equal(hash(original),accepted.descriptor.capsule.sha256);const rollback=write(root,'accepted-rollback-config.nonsecret.private.json',original,true);
   const intent={schemaVersion:'qualified-worker-placement-intent/v1',recordedAt:new Date().toISOString(),machineId:actual.machine.id,beforeInstanceId:actual.machine.instanceId,beforeImageDigest:actual.machine.imageDigest,beforeConfigSha256:actual.rollback.configSha256,rollback,source:SOURCE,ghcrDigest:DIGEST,mirrorDigest:env.RCAP_FLY_IMAGE_DIGEST,mutationOutcome:'PENDING_UNTIL_NATIVE_POSTPROOF',automaticRetry:false,automaticRollback:false};assert.match(intent.mirrorDigest??'',/^sha256:[a-f0-9]{64}$/);write(root,'qualified-placement-intent.json',intent);result={...result,passed:true,intent};
  }else{
   const intent=JSON.parse(fs.readFileSync(path.join(root,'production-worker-evidence/qualified-placement-intent.json')));assert.equal(intent.schemaVersion,'qualified-worker-placement-intent/v1');assert.equal(intent.source,SOURCE);assert.equal(intent.ghcrDigest,DIGEST);assert.equal(intent.mirrorDigest,env.RCAP_FLY_IMAGE_DIGEST);
   const response=await fetchImpl('https://api.machines.dev/v1/apps/'+APP+'/machines/'+accepted.identity.machine.id,{method:'GET',headers:{Authorization:'Bearer '+env.FLY_API_TOKEN,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);const machine=await response.json();result.nativeHandoffEvents=projectNativeHandoffEvents(machine.events);assert.equal(machine.id,actual.machine.id);assert.equal(machine.instance_id,actual.machine.instanceId);assert.equal(machine.image_ref?.digest,actual.machine.imageDigest);assert.equal(hash(JSON.stringify(machine.config)),actual.rollback.configSha256);
   const postCapsule=JSON.parse(fs.readFileSync(path.join(root,'production-worker-evidence/post-placement',actual.rollback.path)));const handoff=assertQualifiedWorkerPoststate(actual,accepted,intent,env.RCAP_FLY_IMAGE_DIGEST,machine.events,postCapsule.config);result={...result,passed:true,handoff,matchingWorkerRequiresCAcceptance:true};
  }
 }catch{result.refusalCode=stage==='pre-effect'?'PRE_EFFECT_DRIFT_OR_UNREVIEWED_WORK_NO_PLACEMENT':'POST_PLACEMENT_OR_HANDOFF_UNPROVEN_NO_RETRY_OR_BLIND_ROLLBACK';}
 write(root,'qualified-worker-'+stage+'.json',result);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await verifyQualifiedWorkerTransition({stage:process.argv[2]});console.log(r.passed?'Qualified worker '+r.stage+' proof recorded; activation held.':r.refusalCode);if(!r.passed)process.exitCode=1;}catch{console.error('Qualified worker transition refused before current phase proof.');process.exitCode=1;}
}
