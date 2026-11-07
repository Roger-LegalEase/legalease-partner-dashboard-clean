import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TARGET as T, planUpdate, requirePoststate, requireImage, requireIdleQueue, placeWorker} from './place-baa3-worker.mjs';
const mirror = 'sha256:' + 'a'.repeat(64);
const before = () => ({id:T.machine, state:'started', instance_id:'01OLDINSTANCE0000', image_ref:{digest:T.oldMirror,labels:{'org.opencontainers.image.revision':T.oldSource}}, config:{image:`registry.fly.io/${T.app}@${T.oldMirror}`,env:{RCAP_WORKER_CONTAINER_DIGEST:T.oldDigest,ENABLE_SUPABASE_PARTNER_DATA:'true',NODE_ENV:'production'},restart:{policy:'always'},guest:{memory_mb:1024,cpus:1,cpu_kind:'shared'},services:[],stop_config:{signal:'SIGTERM',timeout:'30s'},init:{cmd:['node','scripts/rcap-render-worker.mjs','--loop']},metadata:{fly_process_group:'app'}}});
const image = () => ({Id:T.config, Os:'linux', Architecture:'amd64',Config:{Labels:{'org.opencontainers.image.revision':T.source}},RootFS:{Layers:Array(153).fill('sha256:'+'b'.repeat(64))}});
const queue = () => ({current_user:'postgres',session_user:'postgres',transaction_read_only:'on',status_counts:{},...Object.fromEntries(['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'].map(k=>[k,0])),exposed_work:[]});
const post = (body) => ({...before(),instance_id:'01NEWINSTANCE0000',config:structuredClone(body.config),image_ref:{digest:mirror,labels:{'org.opencontainers.image.revision':T.source}},events:[{type:'exit',timestamp:1001,request:{exit_event:{requested_stop:true,exit_code:0,guest_exit_code:0,guest_signal:0,signal:0,oom_killed:false}}},{type:'start',timestamp:1002}]});
test('update changes only image and accepted digest; preserves native version and rollback',()=>{
 const m=before(), old=structuredClone(m),p=planUpdate(m,mirror);
 assert.deepEqual(m,old);assert.equal(p.body.current_version,m.instance_id);assert.equal(p.body.skip_launch,false);
 const restored=structuredClone(p.body.config);restored.image=m.config.image;restored.env.RCAP_WORKER_CONTAINER_DIGEST=m.config.env.RCAP_WORKER_CONTAINER_DIGEST;assert.deepEqual(restored,m.config);
 assert.deepEqual(JSON.parse(p.rollback.bytes).config,m.config);requirePoststate(post(p.body),m,p.body,mirror,1000);
});
test('wrong source/machine, public services and secret literal cannot reach update plan',()=>{
 for(const change of [m=>m.id='different',m=>m.image_ref.labels['org.opencontainers.image.revision']='0'.repeat(40),m=>m.config.services=[{ports:[{port:443}]}],m=>m.config.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-secret',m=>m.config.stop_config.timeout='1s']){const m=before();change(m);assert.throws(()=>planUpdate(m,mirror));}
});
test('immutable image configuration/platform/source and 153 layers remain mandatory',()=>{
 requireImage(image());for(const change of [m=>m.Id='sha256:'+'0'.repeat(64),m=>m.Architecture='arm64',m=>m.Config.Labels['org.opencontainers.image.revision']=T.oldSource,m=>m.RootFS.Layers.pop()]){const m=image();change(m);assert.throws(()=>requireImage(m));}
});
test('config drift, forced exit or missing clean native handoff refuse postqualification',()=>{
 const m=before(),p=planUpdate(m,mirror);for(const change of [m=>m.config.guest.cpus=2,m=>m.events[0].request.exit_event.oom_killed=true,m=>m.events[0].request.exit_event.signal=9,m=>m.events=[],m=>m.image_ref.digest=T.oldMirror]){const after=post(p.body);change(after);assert.throws(()=>requirePoststate(after,m,p.body,mirror,1000));}
});
test('unreviewed active or eligible work is held before mutation',()=>{
 requireIdleQueue(queue());for(const key of ['claimed','live_leases','expired_leases','eligible_queued','terminal_failed']){const q=queue();q[key]=1;assert.throws(()=>requireIdleQueue(q));}
});
function harness({lost=false,deny=false,drift=false,leaseVersion=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'baa3-runtime-control-test-')),m=before(),calls=[];let body;
 const env={GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_REF:'refs/heads/captain-release',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',FLY_API_TOKEN:'SYNTHETIC_TEST_ONLY',SUPABASE_ACCESS_TOKEN:'SYNTHETIC_TEST_ONLY',RCAP_FLY_IMAGE_DIGEST:mirror};
 const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
 const request=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body});
  if(url.endsWith('/database/query'))return response([queue()]);
  if(url.endsWith('/exec'))return response({exit_code:0,exit_signal:0,stderr:'',stdout:JSON.stringify({schemaVersion:'qualified-worker-effective-binding/v1',machineId:T.machine,projectRef:T.project,passed:true,roleProven:true,secretValuesIncluded:false,customerRowsRead:false,queueHeadStatus:200})});
  if(url.endsWith('/lease'))return response(options.method==='DELETE'?{ok:true}:{data:{nonce:'synthetic_lease',version:leaseVersion?'01WRONGVERSION00':m.instance_id}});
  if(url.endsWith('/machines'))return response([m]);
  if(options.method==='POST'){body=JSON.parse(options.body);if(lost)throw Error('SYNTHETIC transport');if(deny)return response({},403);return response(post(body));}
  const value=body?post(body):structuredClone(m);if(drift&&body)value.config.guest.memory_mb=2048;return response(value);
 };
 return{root,calls,env,request,command:()=>JSON.stringify([image()]),now:()=>1000,sleep:async()=>{},close:()=>fs.rmSync(root,{recursive:true})};
}
test('one complete simulated update binds lease/version, effective role and zero queue with no extra mutation',async()=>{
 const h=harness();try{const r=await placeWorker(h);assert.equal(r.runtimeQualified,true);assert.equal(r.updateAttempts,1);assert.equal(r.leaseReleased,true);const writes=h.calls.filter(c=>c.method==='POST'&&c.url.endsWith('/'+T.machine));assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0].body).current_version,before().instance_id);assert.equal(h.calls.filter(c=>c.method==='DELETE').length,1);assert.equal(fs.readFileSync(path.join(h.root,'baa3-worker-placement-evidence/result.json'),'utf8').includes('SYNTHETIC_TEST_ONLY'),false);}finally{h.close();}
});
test('denied or lost update is one consumed attempt without retry or rollback',async()=>{
 for(const opts of [{deny:true},{lost:true},{drift:true}]){const h=harness(opts);try{const r=await placeWorker(h);assert.equal(r.runtimeQualified,false);assert.equal(r.updateAttempts,1);assert.equal(h.calls.filter(c=>c.method==='POST'&&c.url.endsWith('/'+T.machine)).length,1);assert.equal(r.automaticRollback,false);}finally{h.close();}}
});
test('lease version mismatch performs zero machine updates and releases only own lease',async()=>{
 const h=harness({leaseVersion:true});try{const r=await placeWorker(h);assert.equal(r.runtimeQualified,false);assert.equal(r.updateAttempts,0);assert.equal(r.leaseReleased,true);assert.equal(h.calls.filter(c=>c.method==='POST'&&c.url.endsWith('/'+T.machine)).length,0);}finally{h.close();}
});
test('only the accepted BAA3 workflow route is wired; no build, old deployment or retry',()=>{
 const root=new URL('../../',import.meta.url);
 const workflow=fs.readFileSync(new URL('.github/workflows/rcap-baa3-worker-placement.yml',root),'utf8');
 for(const value of [T.source,T.digest,'refs/heads/captain-release','GITHUB_RUN_ATTEMPT','node scripts/acceptance/place-baa3-worker.mjs','permissions:','packages: read','cancel-in-progress: false'])assert(workflow.includes(value));
 for(const forbidden of ['docker build','flyctl deploy','npm ci','--force','--retry'])assert(!workflow.includes(forbidden));
 const dispatcher=fs.readFileSync(new URL('.github/workflows/rcap-f1-ephemeral-staging.yml',root),'utf8');assert(dispatcher.includes("if: inputs.mode == 'baa3_worker_deploy'"));assert(dispatcher.includes('uses: ./.github/workflows/rcap-baa3-worker-placement.yml'));
});

test('new physical version must be present, well-formed and distinct',()=>{
 const m=before(),planned=planUpdate(m,mirror);
 for(const value of [undefined,null,'',42,'bad',m.instance_id]){const after=post(planned.body);after.instance_id=value;assert.throws(()=>requirePoststate(after,m,planned.body,mirror,1000));}
});

test('retained actual postproof binds version, config and exact clean native handoff',async()=>{
 const h=harness();try{const result=await placeWorker(h);assert.equal(result.runtimeQualified,true);
 assert.equal(h.calls.at(-2).method,'GET');assert(h.calls.at(-2).url.endsWith('/'+T.machine));
 const dir=path.join(h.root,'baa3-worker-placement-evidence');
 const bytes=fs.readFileSync(path.join(dir,'post-machine-and-handoff.json'));
 const proof=JSON.parse(bytes);assert.equal(proof.machineId,T.machine);assert.equal(proof.beforeVersion,before().instance_id);assert.equal(proof.afterVersion,'01NEWINSTANCE0000');assert.equal(proof.flyMirrorDigest,mirror);assert.equal(proof.ociRevision,T.source);assert.equal(proof.acceptedDigestMarker,T.digest);
 assert.equal(proof.handoff.requestedStop,true);assert.equal(proof.handoff.exitCode,0);assert.equal(proof.handoff.guestExitCode,0);assert.equal(proof.handoff.exitAt,1001);assert.equal(proof.handoff.startAt,1002);
 const crypto=await import('node:crypto');assert.equal(result.postMachineProof.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
 const capsule=fs.readFileSync(path.join(dir,proof.configCapsule.path));assert.equal(proof.configCapsule.sha256,crypto.createHash('sha256').update(capsule).digest('hex'));assert.equal(JSON.parse(capsule).config.env.RCAP_WORKER_CONTAINER_DIGEST,T.digest);
 assert(!bytes.toString().includes('SYNTHETIC_TEST_ONLY'));
 }finally{h.close();}
});

test('unexpected CLI custody failure never relabels a possibly consumed update as preexecution',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=fs.readFileSync(new URL('./place-baa3-worker.mjs',import.meta.url),'utf8');
 const main=source.slice(source.lastIndexOf('  placeWorker().then'),source.lastIndexOf('\n}'));
 const errors=[],state={exitCode:0};let consumed=0;
 await runInNewContext(main,{placeWorker:async()=>{consumed++;throw Error('synthetic post-update custody failure');},console:{log:()=>assert.fail('No success result exists'),error:s=>errors.push(s)},process:state});
 assert.equal(consumed,1);assert.equal(state.exitCode,1);assert.equal(errors.length,1);assert(!errors[0].includes('before execution'));assert(errors[0].includes('update may already be consumed'));assert(errors[0].includes('no automatic retry'));
});

test('retained handoff proof carries its exact applied timestamp cutoff',()=>{
 const m=before(),planned=planUpdate(m,mirror);const proof=requirePoststate(post(planned.body),m,planned.body,mirror,1000);
 assert.equal(proof.notBeforeEpochMs,1000);assert(proof.handoff.exitAt>=proof.notBeforeEpochMs);assert(proof.handoff.startAt>=proof.handoff.exitAt);
});
