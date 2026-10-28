import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectEffectiveWorker,effectiveProbeCommand,READINESS_QUEUE_SQL,validateQueueCapture,nonsecretRollbackCapsule,captureQualifiedWorkerReadiness,READINESS_REFS,readReadinessPrerequisites} from './qualified-worker-readonly-capture.mjs';
const id='d8de5e4f759278',project='wwtwtsmywnckfkdaqqeg',origin='https://'+project+'.supabase.co',secret='sb_secret_SYNTHETIC_WITHHELD_123456';
function procFixture({key=secret,url=origin,matching=1,workerMachine=id}={}){
 const environment={FLY_MACHINE_ID:workerMachine,NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',SUPABASE_SERVICE_ROLE_KEY:key,ENABLE_SUPABASE_PARTNER_DATA:'true'};
 return{readdirSync:()=>['1',...(matching===2?['2']:[]),'99','self'],readFileSync:p=>{if(p.endsWith('/cmdline'))return matching?'node\0scripts/rcap-render-worker.mjs\0--loop\0':'node\0-e\0inspector-only\0';return Object.entries(environment).map(([k,v])=>k+'='+v).join('\0');}};
}
const jwt=role=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role,ref:project})).toString('base64url')+'.synthetic_signature';
test('effective proof selects actual worker PID and source-selected URL/key, accepts privileged authenticated HEAD and withholds values',async()=>{
 for(const key of [secret,jwt('service_role')]){const calls=[],r=await inspectEffectiveWorker({proc:procFixture({key}),ownPid:99,machineId:id,request:async(u,o)=>{calls.push({u,o});return{status:200};}});assert.equal(r.passed,true);assert.equal(r.workerPid,1);assert.equal(r.roleProven,true);assert.equal(calls.length,1);assert.equal(calls[0].u,origin+'/rest/v1/packet_render_jobs?select=id&limit=0');assert.equal(calls[0].o.method,'HEAD');assert.equal(calls[0].o.redirect,'error');assert.equal(calls[0].o.headers.apikey,key);if(key.startsWith('sb_secret_'))assert.deepEqual(calls[0].o.headers,{apikey:key});else assert.deepEqual(calls[0].o.headers,{apikey:key,Authorization:'Bearer '+key});assert(!JSON.stringify(r).includes(key));assert(!JSON.stringify(r).includes(origin));}
 const command=effectiveProbeCommand(id);assert.equal(command[0],'node');assert.equal(command[1],'-e');assert.equal(command.length,3);assert(!command[2].includes(secret));assert.throws(()=>effectiveProbeCommand('bad; echo token'));
});
test('anon200, wrong effective target, missing/ambiguous worker PID and failed authenticated HEAD never prove binding',async()=>{
 for(const options of [{key:jwt('anon')},{key:'sb_publishable_foo'},{url:'https://hyflxnlhpmiqxvvcoiia.supabase.co'},{url:'https://user:password@'+project+'.supabase.co'},{matching:0},{matching:2},{workerMachine:'other'}]){let calls=0;const r=await inspectEffectiveWorker({proc:procFixture(options),ownPid:99,machineId:id,request:async()=>{calls++;return{status:200};}});assert.equal(r.passed,false);assert.equal(calls,0);assert(!JSON.stringify(r).includes(secret));}
 const r=await inspectEffectiveWorker({proc:procFixture(),ownPid:99,machineId:id,request:async()=>{throw Error(secret);}});assert.equal(r.passed,false);assert(!JSON.stringify(r).includes(secret));
 const denied=await inspectEffectiveWorker({proc:procFixture(),ownPid:99,machineId:id,request:async()=>({status:401})});assert.equal(denied.passed,false);assert.equal(denied.roleProven,false);
});
function queue(){return{current_user:'postgres',session_user:'postgres',transaction_read_only:'on',queued:2,claimed:1,rendering:1,validating:1,live_leases:3,expired_leases:0,missing_leases:0,eligible_queued:1,scheduled_queued:1,retryable_failed:0,terminal_failed:0,exposure_group_count:1,status_counts:{queued:2,claimed:1,rendering:1,validating:1,succeeded:4},exposed_work:[{status:'queued',route_id:'ordinary-route',renderer_kind:'packet_document_v1',renderer_version:'1',profile_version:'1',source_sha_present:false,jobs:2}]};}
test('same-snapshot postgres/on aggregate retains in-flight/retry/exposure facts without an empty-queue claim',()=>{
 const r=validateQueueCapture([queue()]);assert.equal(r.rendering,1);assert.equal(r.validating,1);assert.equal(r.scheduled_queued,1);assert.equal(r.exposed_work.length,1);assert.match(READINESS_QUEUE_SQL,/^BEGIN READ ONLY;/);assert.match(READINESS_QUEUE_SQL,/COMMIT;$/);assert(!/\b(insert|update|delete|truncate|claim_next|release_expired|requeue_retryable)\b/i.test(READINESS_QUEUE_SQL));
 for(const change of [{current_user:'supabase_read_only_user'},{session_user:'supabase_read_only_user'},{transaction_read_only:'off'},{rendering:null},{live_leases:-1},{exposure_group_count:101}])assert.throws(()=>validateQueueCapture([{...queue(),...change}]));
});
function machine(){return{id,state:'started',instance_id:'INSTANCE00000001',image_ref:{digest:'sha256:'+'a'.repeat(64),labels:{'org.opencontainers.image.revision':'5e04eafd7eaed7e71722862e651fb787ebbd296d'}},config:{image:'registry.fly.io/legalease-rcap-render-worker:old',env:{NODE_ENV:'production',ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'600',RCAP_WORKER_CONTAINER_DIGEST:'sha256:'+'b'.repeat(64),NEXT_PUBLIC_SUPABASE_URL:origin},init:{},metadata:{fly_platform_version:'v2'},guest:{memory_mb:1024},restart:{policy:'always'},services:[],kill_signal:'SIGTERM',kill_timeout:'30s'}};}
test('rollback capsule preserves complete reviewed nonsecret config and refuses credential literals and unknown payloads',()=>{
 const m=machine(),c=nonsecretRollbackCapsule(m);assert.deepEqual(JSON.parse(c.bytes).config,m.config);assert.equal(c.sha256.length,64);assert(c.bytes.toString().includes(origin));
 for(const mutate of [m=>m.config.env.SUPABASE_SERVICE_ROLE_KEY=secret,m=>m.config.env.OTHER_SECRET=secret,m=>m.config.metrics={headers:{Authorization:'Bearer '+secret}},m=>m.config.metrics={apiKey:'opaque-secret-literal'},m=>m.config.metadata.extra=secret,m=>m.config.files=[{raw_value:secret}],m=>m.config.init.exec=['node','-e','console.log(secret)'],m=>m.config.env.SUPABASE_URL='https://user:password@example.supabase.co']){const x=machine();mutate(x);assert.throws(()=>nonsecretRollbackCapsule(x));}
});
async function capture({denyExec=false,restrictedRole=false,secretConfig=false,drift=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-worker-readonly-')),calls=[];
 try{
  for(const ref of Object.values(READINESS_REFS)){const p=path.join(root,ref.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(ref.path,p);}
  const m=machine();if(secretConfig)m.config.env.SUPABASE_SERVICE_ROLE_KEY=secret;let detail=0;
  const result=await captureQualifiedWorkerReadiness({root,checkExecution:false,env:{FLY_API_TOKEN:'synthetic-fly-token',SUPABASE_ACCESS_TOKEN:'synthetic-management-token',GITHUB_SHA:'c'.repeat(40),GITHUB_RUN_ID:'12345'},fetchImpl:async(url,o)=>{
   calls.push({url,o});let body;
   if(url.endsWith('/exec')){assert.equal(o.method,'POST');const b=JSON.parse(o.body);assert(Array.isArray(b.command));assert.equal(b.command[0],'node');assert.equal(b.cmd,undefined);assert.equal(b.timeout,15);if(denyExec)return{ok:false,status:403};body={exit_code:0,stdout:JSON.stringify({schemaVersion:'qualified-worker-effective-binding/v1',passed:true,machineId:id,projectRef:project,workerPid:1,roleProven:true,queueHeadStatus:200,credentialKind:'authenticated_secret_key_service_role',secretValuesIncluded:false,customerRowsRead:false})};}
   else if(url.endsWith('/database/query')){const b=JSON.parse(o.body);assert.equal(b.query,READINESS_QUEUE_SQL);assert.equal(b.read_only,false);body=[{...queue(),...(restrictedRole?{current_user:'supabase_read_only_user'}:{})}];}
   else if(url.endsWith('/machines')){assert.equal(o.method,'GET');body=[m];}else{assert.equal(o.method,'GET');body=structuredClone(m);if(++detail===2&&drift)body.instance_id='CHANGED000000001';}
   return{ok:true,json:async()=>body};
  }});
  const stored=fs.readFileSync(path.join(root,'worker-identity-evidence/identity.json'),'utf8'),files=fs.readdirSync(path.join(root,'worker-identity-evidence'));
  const capsule=files.includes('rollback-config.nonsecret.private.json')?fs.readFileSync(path.join(root,'worker-identity-evidence/rollback-config.nonsecret.private.json'),'utf8'):'';
  assert(!stored.includes(secret));assert(!capsule.includes(secret));assert(!stored.includes('synthetic-fly-token'));assert(!stored.includes('synthetic-management-token'));
  return{result,calls,files};
 }finally{fs.rmSync(root,{recursive:true});}
}
test('bounded capture persists actual-class facts/capsule then stops without deployment, compatibility or handoff claims',async()=>{
 const {result:r,calls,files}=await capture();assert.equal(r.status,'READINESS_CAPTURED_REQUIRES_C_REVIEW');assert.equal(r.workerPlacementAuthorized,false);assert.equal(r.compatibilityAccepted,false);assert.equal(r.handoffProven,false);assert.equal(r.observations.queue.queued,2);assert.equal(r.machineUnchangedDuringCapture,true);assert(files.includes('rollback-config.nonsecret.private.json'));assert.equal(calls.length,5);assert(calls.every(c=>c.o.method==='GET'||c.url.endsWith('/exec')||c.url.endsWith('/database/query')));
});
test('exec403 still preserves independent queue/capsule facts; role mismatch, unsafe custody and machine drift hold with no mutation',async()=>{
 for(const options of [{denyExec:true},{restrictedRole:true},{secretConfig:true},{drift:true}]){const {result:r,files}=await capture(options);assert.equal(r.status,'HOLD_READINESS_INCOMPLETE');assert.equal(r.workerMutated,false);assert.equal(r.workerPlacementAuthorized,false);if(options.denyExec){assert(r.refusals.includes('effectiveWorker_unproven_HTTP_403'));assert(r.observations.queue);assert(r.rollback);}if(options.secretConfig){assert(!files.includes('rollback-config.nonsecret.private.json'));assert(r.observations.queue);assert(r.observations.effectiveWorker);}}
});
test('actual prerequisites required and workflow keeps legacy default, explicit reviewed capture, no install or image operation',()=>{
 assert.equal(readReadinessPrerequisites(process.cwd()).actualSmokeRunId,40619590234);
 assert.throws(()=>readReadinessPrerequisites(os.tmpdir()));
 const w=fs.readFileSync('.github/workflows/rcap-worker-identity-readonly.yml','utf8');assert(w.includes('default: false'));assert(w.includes('SUPABASE_ACCESS_TOKEN'));assert(w.includes('if: always()'));assert(!/npm ci|docker |flyctl deploy|flyctl stop|push:/.test(w));
});
