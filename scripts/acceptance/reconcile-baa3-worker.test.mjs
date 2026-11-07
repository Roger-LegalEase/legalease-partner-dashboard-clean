import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TARGET} from './place-baa3-worker.mjs';
import {READINESS_REFS, READINESS_QUEUE_SQL, effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';
import {readConsumedPlacement, readOnlyTransport, reconcileWorker} from './reconcile-baa3-worker.mjs';
import {BAA3_TRANSITION_REFS, readAcceptedBaa3Transition, requireNoExposedWork} from './baa3-safe-transition.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const BASE = `https://api.machines.dev/v1/apps/${TARGET.app}/machines`, MACHINE = `${BASE}/${TARGET.machine}`;
const QUEUE = `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`;
function harness({exit = {requested_stop:true}, missing = false, drift = false, later = false, accepted = false, queueFault = false, wrongVersion = false, imageFault = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baa3-reconciliation-test-'));
  for (const p of ['scripts/acceptance/evidence/baa3-placement-42395572844.json', ...Object.values(READINESS_REFS).map(r => r.path), ...(accepted ? Object.values(BAA3_TRANSITION_REFS).map(r=>r.path) : [])]) {
    fs.mkdirSync(path.dirname(path.join(root,p)), {recursive:true}); fs.copyFileSync(path.join(repository,p), path.join(root,p));
  }
  const prior = readConsumedPlacement(root), calls = [];
  const machine = {id:TARGET.machine,state:'started',instance_id:'01SYNTHETICNEWINSTANCE',image_ref:{digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}},config:prior.config};
  if(accepted)machine.instance_id='01M6VGGKD7Q5TACPZN8W84F8KN';
  if(wrongVersion)machine.instance_id='01DIFFERENTINSTANCEVERSION';
  if(imageFault)machine.image_ref.digest=TARGET.oldMirror;
  let machineReads = 0;
  const events = missing ? [] : [{type:'exit',timestamp:prior.from+6000,request:{MonitorEvent:{exit_event:exit}}},{type:'start',timestamp:prior.from+20000}];
  if(later)events.push({type:'start',timestamp:prior.to+1000});
  const counts = ['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'];
  const queue = {current_user:'postgres',session_user:'postgres',transaction_read_only:'on',status_counts:{},exposed_work:[],...Object.fromEntries(counts.map(k=>[k,0]))};
  if(queueFault){queue.queued=1;queue.scheduled_queued=1;queue.status_counts={queued:1};}
  const response = value => ({ok:true,status:200,json:async()=>structuredClone(value)});
  const request = async (url,options) => {
    calls.push({url,method:options.method,body:options.body});
    if(url===BASE)return response([machine]);
    if(url===MACHINE){machineReads++;const value=structuredClone(machine);if(drift&&machineReads===4)value.config.guest.cpus++;return response(value);}
    if(url===`${MACHINE}/events?limit=50`)return response(events);
    if(url===QUEUE)return response([queue]);
    if(url===`${MACHINE}/exec`)return response({exit_code:0,exit_signal:0,stderr:'',stdout:JSON.stringify({schemaVersion:'qualified-worker-effective-binding/v1',passed:true,machineId:TARGET.machine,projectRef:TARGET.project,workerPid:77,roleProven:true,queueHeadStatus:200,credentialKind:'authenticated_secret_key_service_role',secretValuesIncluded:false,customerRowsRead:false})});
    assert.fail(`Unexpected request ${url}`);
  };
  const env = {GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_REF:'refs/heads/captain-release',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'456',FLY_API_TOKEN:'SYNTHETIC_TEST_ONLY',SUPABASE_ACCESS_TOKEN:'SYNTHETIC_TEST_ONLY'};
  return {root,env,request,calls,checkExecution:false,close:()=>fs.rmSync(root,{recursive:true})};
}

test('read-only continuation uses the real existing readiness collector and verifies the consumed update without another mutation',async()=>{
  const h=harness();try{
    const result=await reconcileWorker(h);assert.equal(result.runtimeQualified,true);assert.equal(result.handoffProven,true);assert.equal(result.updateAttempts,0);assert.equal(result.workerMutated,false);assert.equal(result.hostedAccepted,false);
    assert.equal(h.calls.filter(c=>c.method==='POST').length,2);assert(h.calls.filter(c=>c.method==='POST').every(c=>[QUEUE,`${MACHINE}/exec`].includes(c.url)));
    const proof=JSON.parse(fs.readFileSync(path.join(h.root,'worker-identity-evidence/baa3-reconciled-handoff.json')));
    assert.equal(proof.actualPlacementRunId,42395572844);assert.equal(proof.beforeVersion,'01M609ZC1E1YMKEP4RQXM6HRBK');assert.equal(proof.exactOriginalPostCutoffKnown,false);assert(proof.timeBoundSource.includes('not the unrecorded exact POST cutoff'));
    assert(proof.handoff.nativePayloads[0].defaultedFields.includes('exit_code'));
    const observed=JSON.parse(fs.readFileSync(path.join(h.root,'worker-identity-evidence/baa3-native-events.json')));assert.deepEqual(observed.events[0].request.MonitorEvent.exit_event,{requested_stop:true});
    for(const file of fs.readdirSync(path.join(h.root,'worker-identity-evidence')))assert(!fs.readFileSync(path.join(h.root,'worker-identity-evidence',file),'utf8').includes('SYNTHETIC_TEST_ONLY'));
  }finally{h.close();}
});

test('failed handoff keeps observed machine and native evidence instead of losing it',async()=>{
  for(const fault of [{exit:{requested_stop:true,exit_code:1}},{exit:{requested_stop:true,oom_killed:true}},{exit:{requested_stop:true,guest_signal:9}},{exit:{}},{missing:true}]){
    const h=harness(fault);try{const result=await reconcileWorker(h);assert.equal(result.runtimeQualified,false);assert.equal(result.updateAttempts,0);for(const file of ['baa3-current-before.json','baa3-current-after.json','baa3-native-events.json','baa3-reconciliation-result.json'])assert(fs.existsSync(path.join(h.root,'worker-identity-evidence',file)));assert.equal(JSON.parse(fs.readFileSync(path.join(h.root,'worker-identity-evidence/baa3-current-after.json'))).state,'started');}finally{h.close();}
  }
});

test('drift and later machine transitions cannot be attributed to the consumed update',async()=>{
  for(const fault of [{drift:true},{later:true}]){const h=harness(fault);try{const result=await reconcileWorker(h);assert.equal(result.runtimeQualified,false);assert.equal(result.updateAttempts,0);assert(['read_only_config_drift','later_or_undated_machine_transition_unproven'].includes(result.refusalCode));}finally{h.close();}}
});

test('transport rejects every mutation route and any alteration of the accepted read-only probes',async()=>{
  const calls=[],request=readOnlyTransport(async(url,options)=>{calls.push({url,options});return {ok:true};});
  const allowed=[
    [MACHINE,{method:'GET'}],
    [`${MACHINE}/exec`,{method:'POST',body:JSON.stringify({command:effectiveProbeCommand(TARGET.machine),timeout:15})}],
    [QUEUE,{method:'POST',body:JSON.stringify({query:READINESS_QUEUE_SQL,read_only:false})}],
  ];
  for(const [url,options] of allowed)await request(url,options);
  for(const [url,options] of [[MACHINE,{method:'POST',body:'{}'}],[MACHINE,{method:'DELETE'}],[`${MACHINE}/lease`,{method:'POST'}],[`${MACHINE}/start`,{method:'POST'}],[`${MACHINE}/exec`,{method:'POST',body:JSON.stringify({command:['rm','-rf','/'],timeout:15})}],[QUEUE,{method:'POST',body:JSON.stringify({query:'DELETE FROM packet_render_jobs',read_only:false})}]])await assert.rejects(request(url,options),/read_only_operation_refused/);
  assert.equal(calls.length,allowed.length);
});

test('a changed consumed-attempt input is refused before any provider read',async()=>{
  const h=harness();try{fs.appendFileSync(path.join(h.root,'scripts/acceptance/evidence/baa3-placement-42395572844.json'),'\n');await assert.rejects(reconcileWorker(h),/consumed_placement_input_changed/);assert.equal(h.calls.length,0);}finally{h.close();}
});

test('actual retained BAA3 evidence closes the scoped transition without inventing historical exits or hosted results',()=>{
  const before=Object.values(BAA3_TRANSITION_REFS).map(r=>fs.readFileSync(path.join(repository,r.path)));
  const accepted=readAcceptedBaa3Transition(repository,readConsumedPlacement(repository));
  assert.equal(accepted.placementRunId,42395572844);assert.equal(accepted.readbackRunId,42398847137);
  assert.equal(accepted.safeMatchingWorkerTransitionAccepted,true);assert.equal(accepted.currentWorkerIdentityAndBindingAccepted,true);
  for(const key of ['historicalCleanExitObserved','oldExitEventObserved','strictPostGuardPassed','hostedAccepted','postCaptureIsImmediate','continuousQueueObservationClaimed','loadedHandoffAccepted'])assert.equal(accepted[key],false,key);
  assert.deepEqual(accepted.originalWorkflowConclusions,['failure','failure']);
  assert.equal(accepted.machine.instanceId,'01M6VGGKD7Q5TACPZN8W84F8KN');
  assert.equal(accepted.currentCaptureAt,'2026-11-07T17:58:43.022Z');
  Object.values(BAA3_TRANSITION_REFS).forEach((r,i)=>assert.deepEqual(fs.readFileSync(path.join(repository,r.path)),before[i]));
});

test('accepted current worker checks reuse the actual acceptance and do not repeat old-exit forensics',async()=>{
  const h=harness({accepted:true,missing:true});try{
    const result=await reconcileWorker(h);
    assert.equal(result.runtimeQualified,true);assert.equal(result.safeMatchingWorkerTransitionAccepted,true);
    assert.equal(result.currentWorkerIdentityAndBindingAccepted,true);assert.equal(result.handoffProven,false);
    assert.equal(result.strictPostGuardPassed,false);assert.equal(result.historicalCleanExitObserved,false);assert.equal(result.hostedAccepted,false);
    assert.equal(result.updateAttempts,0);assert.equal(result.workerMutated,false);
    assert(!h.calls.some(c=>c.url.includes('/events')));
    assert(h.calls.filter(c=>c.method==='POST').every(c=>[QUEUE,`${MACHINE}/exec`].includes(c.url)));
    const proof=JSON.parse(fs.readFileSync(path.join(h.root,'worker-identity-evidence/baa3-accepted-current-readiness.json')));
    assert.equal(proof.historicalExitCapturePerformed,false);assert.equal(proof.acceptedTransition.readbackRunId,42398847137);
  }finally{h.close();}
});

test('a current version, image, configuration or queue change cannot borrow the scoped acceptance',async()=>{
  for(const fault of [{wrongVersion:true},{imageFault:true},{drift:true},{queueFault:true}]){
    const h=harness({accepted:true,...fault});try{const result=await reconcileWorker(h);assert.equal(result.runtimeQualified,false);assert.notEqual(result.safeMatchingWorkerTransitionAccepted,true);assert.equal(result.updateAttempts,0);assert.equal(result.hostedAccepted,false);}finally{h.close();}
  }
});

test('no-exposed-work proof includes all job and lease states, full status counts and read-only provenance',()=>{
  const evidence=JSON.parse(fs.readFileSync(path.join(repository,BAA3_TRANSITION_REFS.evidence.path)));
  const queue=JSON.parse(evidence.placement.files['leased-queue.json'].rawJson);requireNoExposedWork(queue);
  for(const key of ['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'])assert.throws(()=>requireNoExposedWork({...queue,[key]:1}),undefined,key);
  assert.throws(()=>requireNoExposedWork({...queue,status_counts:{completed:1}}));
  assert.throws(()=>requireNoExposedWork({...queue,transaction_read_only:'off'}));
  assert.throws(()=>requireNoExposedWork({...queue,exposed_work:[{}]}));
});

test('changed criterion, current artifacts or acceptance cannot be substituted before provider access',async()=>{
  for(const ref of Object.values(BAA3_TRANSITION_REFS)){
    const h=harness({accepted:true});try{fs.appendFileSync(path.join(h.root,ref.path),'\n');await assert.rejects(reconcileWorker(h),/accepted_baa3_evidence_changed/);assert.equal(h.calls.length,0);}finally{h.close();}
  }
});
