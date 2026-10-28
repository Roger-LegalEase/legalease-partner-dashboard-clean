import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assertQualifiedWorkerPoststate,projectNativeHandoffEvents} from './qualified-worker-placement.mjs';
const DIR='data/rcap-grade-a/launch-control/qualified-release-evidence/',APP='legalease-rcap-render-worker',MACHINE='d8de5e4f759278';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const HANDOFF_HISTORY_REFS={
 partial:{path:DIR+'C-406283-PHYSICAL-WORKER-PARTIAL-ACCEPTANCE.json',sha256:'4e3999c3dceded278337400754c96f14204db235cda0190a3667632772b8914a'},
 intent:{path:DIR+'ACTUAL-406283-intent.json',sha256:'09706af17308ae748ef6543c65d94f9462aae41ba016284350bf18a6dd8c5e07'},
 post:{path:DIR+'ACTUAL-406283-post-identity.json',sha256:'b2e683ea34261ab38e5ebb0f6bad5a331830b15039c460d229badd9c9ce1ce0b'},
 postConfig:{path:DIR+'ACTUAL-406283-post-config.json',sha256:'9d9ac0ecdd249e8f6b8aad4ad622146571fdda630432f434c39f1569fc416a29'},
 postReceipt:{path:DIR+'ACTUAL-406283-post-handoff.json',sha256:'0862d25b8184933661b67ba25b9684ab8e16fb07252793175ce98da9edca25ae'},
 oldIdentity:{path:DIR+'ACTUAL-406256-identity.json',sha256:'2b07395c45b6c8f6c8f6e55c40925d9ed0f0959ac866a66177048a6165275073'},
 oldConfig:{path:DIR+'ACTUAL-406256-rollback-config.json',sha256:'c1809cb5c0d04b5c43d0c68c2688decbc61e0daca03fa1db30a537860067f760'},
 oldAcceptance:{path:DIR+'C-406256-READINESS-ACCEPTANCE.json',sha256:'ed60a2b5abc4a4f9cc3b4a30b8e0d0c0aaad0359c0ba65f3f4d81ee0b8d9a07b'},
};
export function readHandoffHistoryInputs(root){
 const d=Object.fromEntries(Object.entries(HANDOFF_HISTORY_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual handoff input '+k);return[k,JSON.parse(b)];})),c=d.partial;
 assert.equal(c.schemaVersion,'qualified-production-actual-worker-placement-individual-criteria-independent-decision/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40628380931);assert.equal(c.executionSha,'f7c9aaad0b71bc7a5e2b6f511039132d78006548');assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.physicalMatchingWorkerAccepted,true);assert.equal(c.wholeMatchingWorkerTransitionAccepted,false);assert.equal(c.actualHandoffAccepted,false);assert.equal(c.activationAdmitted,false);assert.equal(c.readOnlyHistoricalEvidencePreparationAdmitted,true);assert.equal(c.repeatWorkerDeploymentAdmitted,false);
 const accepted=c.acceptedIndividualCriteria;assert.equal(accepted.actualImmutablePlacementIntent.sha256,HANDOFF_HISTORY_REFS.intent.sha256);assert.equal(accepted.postPlacementIdentity.sha256,HANDOFF_HISTORY_REFS.post.sha256);assert.equal(accepted.postPlacementSafeNativeConfig.sha256,HANDOFF_HISTORY_REFS.postConfig.sha256);assert.equal(c.nativeHandoffEvidence.receipt.sha256,HANDOFF_HISTORY_REFS.postReceipt.sha256);assert.deepEqual(d.post.machine,accepted.machine);assert.deepEqual(d.post.observations.effectiveWorker,accepted.effectiveWorker);assert.deepEqual(d.post.observations.queue,accepted.postQueue);
 assert.equal(d.oldAcceptance.authority,'CODEX C');assert.equal(d.oldAcceptance.rollbackCustodyAccepted,true);assert.deepEqual(d.oldIdentity.machine,d.oldAcceptance.acceptedMachine);assert.equal(d.intent.beforeInstanceId,d.oldIdentity.machine.instanceId);assert.equal(d.intent.machineId,MACHINE);assert.equal(d.post.machine.id,MACHINE);assert.equal(d.post.machine.instanceId,'01M609ZC1E1YMKEP4RQXM6HRBK');assert.equal(d.post.machine.imageDigest,d.intent.mirrorDigest);assert.equal(d.post.machine.ociRevision,'84a75b6e65dc69e6c371afac44f1284e0debf722');assert.equal(d.post.machine.exportedDigest,'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1');assert.equal(d.post.status,'READINESS_CAPTURED_REQUIRES_C_REVIEW');assert.deepEqual(d.postReceipt.nativeHandoffEvents,c.nativeHandoffEvidence.projection);
 const starts=d.postReceipt.nativeHandoffEvents.events.filter(e=>e.type==='start');assert.equal(starts.length,1);assert.equal(starts[0].timestamp,1793159353075);const from=Date.parse(d.intent.recordedAt);assert(Number.isSafeInteger(from)&&from<starts[0].timestamp);
 return{...d,accepted:{identity:d.oldIdentity,capsule:d.oldConfig,descriptor:{acceptedExposure:d.oldAcceptance.acceptedQueue.exposed_work}},from,to:starts[0].timestamp,knownStart:starts[0]};
}
function currentMachineProof(machine,input){
 const expected=input.post.machine;assert.equal(machine.id,MACHINE);assert.equal(machine.state,'started');assert.equal(machine.instance_id??machine.version,expected.instanceId);assert.equal(machine.image_ref?.digest,expected.imageDigest);assert.equal(machine.image_ref?.labels?.['org.opencontainers.image.revision'],expected.ociRevision);assert.equal(hash(JSON.stringify(machine.config)),input.post.rollback.configSha256);
 return{machineId:MACHINE,instanceId:expected.instanceId,imageDigest:expected.imageDigest,ociRevision:expected.ociRevision,configSha256:input.post.rollback.configSha256};
}
export function reconcileHandoffHistory(input,events){
 assert(Array.isArray(events)&&events.length<=50,'Bounded event array required');const window=events.filter(e=>Number.isSafeInteger(e?.timestamp)&&e.timestamp>=input.from&&e.timestamp<=input.to&&['exit','start'].includes(e.type));
 const projection=projectNativeHandoffEvents(window),combined=window.slice();if(!combined.some(e=>e.type==='start'&&e.timestamp===input.to))combined.push(input.knownStart);
 const result={historyProjection:projection,newStartSource:'pinned_actual_406283_post_projection',window:{from:input.from,to:input.to},missingNativeFields:[],handoffVerified:false};
 const exits=window.filter(e=>e.type==='exit');if(!exits.length)result.missingNativeFields.push('old_exit_event');for(const event of exits){for(const key of ['requested_stop','exit_code','guest_exit_code'])if(event.request?.exit_event?.[key]===undefined)result.missingNativeFields.push(key);}
 try{result.handoff=assertQualifiedWorkerPoststate(input.post,input.accepted,input.intent,input.intent.mirrorDigest,combined,input.postConfig.config);result.handoffVerified=true;}catch{result.refusalCode='NATIVE_CLEAN_EXIT_OR_CHRONOLOGY_UNPROVEN';}
 return result;
}
export async function captureWorkerHandoffHistory({root=process.cwd(),env=process.env,fetchImpl=fetch,checkExecution=true}={}){
 const input=readHandoffHistoryInputs(root);
 if(checkExecution){assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_REF,'refs/heads/captain-release');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_REPOSITORY?.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),env.GITHUB_SHA);assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'');}
 assert(env.FLY_API_TOKEN);const base='https://api.machines.dev/v1/apps/'+APP+'/machines/'+MACHINE;
 const result={schemaVersion:'worker-readonly-native-handoff-history/v1',capturedAt:new Date().toISOString(),executionSha:env.GITHUB_SHA??null,runId:Number(env.GITHUB_RUN_ID)||null,actualPlacementRunId:40628380931,refs:HANDOFF_HISTORY_REFS,transport:'GET only: current machine before, events?limit=50, current machine after',workerMutated:false,queueQueried:false,customerRowsRead:false,secretValuesIncluded:false,activationAuthorized:false,wholeWorkerTransitionRequiresCAcceptance:true,status:'HOLD_NATIVE_HANDOFF_HISTORY_UNPROVEN'};
 const get=async url=>{const r=await fetchImpl(url,{method:'GET',headers:{Authorization:'Bearer '+env.FLY_API_TOKEN,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});if(r.status!==200)throw Error('HTTP_'+r.status);return r.json();};
 try{result.currentBefore=currentMachineProof(await get(base),input);const history=await get(base+'/events?limit=50'),reconciled=reconcileHandoffHistory(input,history);Object.assign(result,{historyProjection:reconciled.historyProjection,window:reconciled.window,missingNativeFields:reconciled.missingNativeFields,newStartSource:reconciled.newStartSource});result.currentAfter=currentMachineProof(await get(base),input);assert.deepEqual(result.currentBefore,result.currentAfter);result.machineUnchangedDuringHistoryRead=true;Object.assign(result,reconciled);result.status=result.handoffVerified?'NATIVE_HANDOFF_VERIFIED_REQUIRES_C_ACCEPTANCE':'HOLD_NATIVE_HANDOFF_HISTORY_UNPROVEN';}catch(error){result.refusalCode=/^HTTP_[0-9]{3}$/.test(error?.message)?error.message:'HISTORY_OR_CURRENT_INSTANCE_DRIFT_REFUSED';}
 const directory=path.join(root,'worker-identity-evidence');fs.mkdirSync(directory,{recursive:true,mode:0o700});const p=path.join(directory,'handoff-history.json'),bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}assert.equal(hash(fs.readFileSync(p)),hash(bytes));const dir=fs.openSync(directory,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}return result;
}
