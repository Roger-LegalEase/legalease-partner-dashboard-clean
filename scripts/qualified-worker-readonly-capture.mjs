import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const APP='legalease-rcap-render-worker',PROJECT='wwtwtsmywnckfkdaqqeg',BASE='https://api.machines.dev/v1/apps/'+APP;
const hash=b=>createHash('sha256').update(b).digest('hex');
const E='data/rcap-grade-a/launch-control/qualified-release-evidence/';
export const READINESS_REFS={
 contract:{path:E+'C-WORKER-READINESS-SOURCE-CONTRACT.json',sha256:'eee34ed96c38588909c24a0df18f483d880b92e4f440549df2ceba2c6f59b12c'},
 smokeAcceptance:{path:E+'C-406195-SMOKE-ACCEPTANCE.json',sha256:'12eedb1ba8c7cbe03d21093cb2bb5c50ea8733df76c9c53efc05ef6cc2ed3e6b'},
 smoke:{path:E+'ACTUAL-406195-smoke.json',sha256:'9fd7702305a6cea54ed1bfaf88b5d4c6aab2c01846aa5628efa28b4f025397e9'},
 databaseAcceptance:{path:E+'C-406179-FINAL-DATABASE-ACCEPTANCE.json',sha256:'cdd534190abd576171ff6db85c943873e1600ee84e2a5dfad1fbdfa742ac452c'},
};
export function readReadinessPrerequisites(root){
 const d=Object.fromEntries(Object.entries(READINESS_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual readiness prerequisite '+k);return[k,JSON.parse(b)];}));
 assert.equal(d.contract.schemaVersion,'qualified-production-worker-readiness-first-finite-source-contract/v1');assert.equal(d.contract.authority,'CODEX C');assert.equal(d.contract.accepted,true);assert.equal(d.contract.sourcePreparationScopeAccepted,true);assert.equal(d.contract.readinessCaptureExecutionAdmitted,false);assert.equal(d.contract.actualSmokeAcceptance.sha256,READINESS_REFS.smokeAcceptance.sha256);assert.equal(d.contract.actualDatabaseAcceptanceSha256,READINESS_REFS.databaseAcceptance.sha256);
 const c=d.smokeAcceptance,s=d.smoke;assert.equal(c.schemaVersion,'qualified-production-actual-staged-smoke-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.smokeAccepted,true);assert.equal(c.runId,40619590234);assert.equal(c.executionSha,'a4a38219b034e7bb03339d95db08f54944aab8f8');assert.equal(c.actualSmoke.sha256,READINESS_REFS.smoke.sha256);assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);
 for(const [k,v] of Object.entries({applicationSha:'4c189b682d0a9225a21b9fdf8a2ebc50500029d6',workerSourceSha:'84a75b6e65dc69e6c371afac44f1284e0debf722',workerDigest:'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1',productionProjectRef:PROJECT,stagedDeploymentId:'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz',rollbackDeploymentId:'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6'})){assert.equal(c[k],v);assert.equal(s[k],v);}
 assert.equal(s.passed,true);assert.equal(s.transactionalFixtureRolledBack,true);assert.equal(s.verdicts.length,10);assert(s.verdicts.every(v=>v.passed===true));for(const k of ['realParticipantRecordsCreated','realChargesCreated','checkoutCreated','workerRun','deploymentTriggered','aliasChanged','environmentVariableChanged','productionDatabasePersistentlyMutated','originPersisted','secretsPersisted'])assert.equal(s[k],false);
 assert.deepEqual(s.databaseCompatibility,c.actualDatabaseCompletion);assert.equal(s.databaseCompatibility.acceptance.sha256,READINESS_REFS.databaseAcceptance.sha256);assert.equal(d.databaseAcceptance.authority,'CODEX C');assert.equal(d.databaseAcceptance.databaseCompatibilityAccepted,true);assert.equal(d.databaseAcceptance.migrationExecutionComplete,true);assert.equal(d.databaseAcceptance.runId,40617912474);
 return{actualSmokeRunId:c.runId,actualDatabaseRunId:40617912474,refs:READINESS_REFS};
}
// The same function is tested locally and serialized into the bounded provider exec; no environment value leaves it.
export async function inspectEffectiveWorker({proc,request,ownPid,machineId}){
 const result={schemaVersion:'qualified-worker-effective-binding/v1',passed:false,machineId,projectRef:'wwtwtsmywnckfkdaqqeg',workerPid:null,roleProven:false,queueHeadStatus:null,secretValuesIncluded:false,customerRowsRead:false};
 try{
  const ids=proc.readdirSync('/proc').filter(s=>/^[1-9][0-9]*$/.test(s)&&Number(s)!==ownPid),matches=[];
  for(const id of ids){try{const argv=proc.readFileSync('/proc/'+id+'/cmdline','utf8').split('\0');if(argv.includes('--loop')&&argv.some(a=>a==='scripts/rcap-render-worker.mjs'||a.endsWith('/scripts/rcap-render-worker.mjs')))matches.push(id);}catch{}}
  if(matches.length!==1)throw Error();const pid=matches[0];result.workerPid=Number(pid);
  const env=Object.fromEntries(proc.readFileSync('/proc/'+pid+'/environ','utf8').split('\0').filter(Boolean).map(s=>{const at=s.indexOf('=');return[s.slice(0,at),s.slice(at+1)];}));
  if(env.FLY_MACHINE_ID!==machineId||!env.SUPABASE_SERVICE_ROLE_KEY||env.ENABLE_SUPABASE_PARTNER_DATA!=='true')throw Error();
  const origin=new URL(env.NEXT_PUBLIC_SUPABASE_URL);if(origin.protocol!=='https:'||origin.hostname!=='wwtwtsmywnckfkdaqqeg.supabase.co'||origin.port||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error();
  const key=env.SUPABASE_SERVICE_ROLE_KEY;let credentialKind;
  if(/^sb_secret_[A-Za-z0-9_-]+$/.test(key))credentialKind='authenticated_secret_key_service_role';
  else{const parts=key.split('.');if(parts.length!==3)throw Error();const claims=JSON.parse(Buffer.from(parts[1],'base64url'));if(claims.role!=='service_role'||claims.ref!=='wwtwtsmywnckfkdaqqeg')throw Error();credentialKind='authenticated_jwt_service_role';}
  const headers={apikey:key};if(credentialKind==='authenticated_jwt_service_role')headers.Authorization='Bearer '+key;
  const response=await request(origin.origin+'/rest/v1/packet_render_jobs?select=id&limit=0',{method:'HEAD',headers,redirect:'error',signal:AbortSignal.timeout(10000)});result.queueHeadStatus=response.status;
  if(![200,206].includes(response.status))throw Error();result.roleProven=true;result.credentialKind=credentialKind;result.passed=true;
 }catch{result.refusalCode='effective_worker_binding_unproven';}
 return result;
}
export function effectiveProbeCommand(machineId){
 assert.match(machineId,/^[a-f0-9]{10,20}$/);
 const script='('+inspectEffectiveWorker.toString()+')({proc:require("node:fs"),request:fetch,ownPid:process.pid,machineId:'+JSON.stringify(machineId)+'}).then(r=>process.stdout.write(JSON.stringify(r)))';
 return ['node','-e',script];
}
export const READINESS_QUEUE_SQL=`BEGIN READ ONLY;
with exposed as (
 select status,route_id,renderer_kind,renderer_version,profile_version,(source_sha256 is not null) as source_sha_present,count(*) as jobs
 from public.packet_render_jobs where status in ('queued','claimed','rendering','validating') or (status='failed' and failure_disposition='retryable')
 group by status,route_id,renderer_kind,renderer_version,profile_version,(source_sha256 is not null)
), statuses as (select status,count(*) as jobs from public.packet_render_jobs group by status)
select current_user::text as current_user,session_user::text as session_user,current_setting('transaction_read_only') as transaction_read_only,
 (select coalesce(jsonb_object_agg(status,jobs),'{}'::jsonb) from statuses) as status_counts,
 count(*) filter(where status='queued') as queued,count(*) filter(where status='claimed') as claimed,
 count(*) filter(where status='rendering') as rendering,count(*) filter(where status='validating') as validating,
 count(*) filter(where status in ('claimed','rendering','validating') and claim_expires_at>=now()) as live_leases,
 count(*) filter(where status in ('claimed','rendering','validating') and claim_expires_at<now()) as expired_leases,
 count(*) filter(where status in ('claimed','rendering','validating') and claim_expires_at is null) as missing_leases,
 count(*) filter(where status='queued' and coalesce(next_attempt_at,created_at)<=now()) as eligible_queued,
 count(*) filter(where status='queued' and next_attempt_at>now()) as scheduled_queued,
 count(*) filter(where status='failed' and failure_disposition='retryable') as retryable_failed,
 count(*) filter(where status='failed' and failure_disposition='terminal') as terminal_failed,
 (select count(*) from exposed) as exposure_group_count,
 (select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from (select * from exposed order by status,route_id,renderer_kind,renderer_version,profile_version limit 100) e) as exposed_work
 from public.packet_render_jobs;
COMMIT;`;
const COUNTS=['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'];
const count=v=>{assert(/^(0|[1-9][0-9]*)$/.test(String(v))&&Number.isSafeInteger(Number(v)));return Number(v);};
export function validateQueueCapture(rows){
 assert(Array.isArray(rows)&&rows.length===1);const row=rows[0];assert.equal(row.current_user,'postgres');assert.equal(row.session_user,'postgres');assert.equal(row.transaction_read_only,'on');
 const result={current_user:row.current_user,session_user:row.session_user,transaction_read_only:row.transaction_read_only,...Object.fromEntries(COUNTS.map(k=>[k,count(row[k])]))};
 result.status_counts=Object.fromEntries(Object.entries(row.status_counts).map(([s,n])=>{assert(/^[a-z_]{1,40}$/.test(s));return[s,count(n)];}));
 assert(result.exposure_group_count<=100);assert(Array.isArray(row.exposed_work)&&row.exposed_work.length===result.exposure_group_count);
 result.exposed_work=row.exposed_work.map(g=>{for(const k of ['status','route_id','renderer_kind','renderer_version'])assert(typeof g[k]==='string'&&/^[A-Za-z0-9_./:-]{1,200}$/.test(g[k]));assert(typeof g.source_sha_present==='boolean');assert(typeof g.profile_version==='string'||Number.isSafeInteger(g.profile_version));assert(/^[A-Za-z0-9_.:-]{1,80}$/.test(String(g.profile_version)));return{status:g.status,route_id:g.route_id,renderer_kind:g.renderer_kind,renderer_version:g.renderer_version,profile_version:g.profile_version,source_sha_present:g.source_sha_present,jobs:count(g.jobs)};});
 return result;
}
class RollbackCustodyRefusal extends Error {
 constructor(category,fieldPath){super('rollback_custody_guard_refused');this.category=category;this.fieldPath=fieldPath;}
}
const custody=(condition,category,fieldPath)=>{if(!condition)throw new RollbackCustodyRefusal(category,fieldPath);};
const custodyField=(prefix,key)=>prefix+'.'+(/^(?!sb_(?:secret|publishable)_)(?!eyJ)[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)||/^[0-9]{1,6}$/.test(key)?key:'<unrecognized_name>');
export function rollbackConfigShape(config){
 const result={schemaVersion:'rollback-config-property-shapes/v1',entries:[],truncated:false};
 const walk=(value,fieldPath,depth)=>{if(result.entries.length>=128){result.truncated=true;return;}const jsonType=value===null?'null':Array.isArray(value)?'array':typeof value;result.entries.push({fieldPath,jsonType});if(value&&typeof value==='object'){if(depth>=4){result.truncated=true;return;}for(const key of Object.keys(value)){if(result.entries.length>=128){result.truncated=true;break;}walk(value[key],custodyField(fieldPath,key),depth+1);}}};
 walk(config,'config',0);return result;
}
function validatedNativeStopConfig(value){
 custody(value&&typeof value==='object'&&!Array.isArray(value),'stop_config_shape','config.stop_config');
 for(const key of Object.keys(value))custody(['signal','timeout'].includes(key),'unreviewed_stop_config_field',custodyField('config.stop_config',key));
 custody(['SIGHUP','SIGINT','SIGQUIT','SIGKILL','SIGUSR1','SIGUSR2','SIGTERM'].includes(value.signal),'stop_signal_format','config.stop_config.signal');
 custody(typeof value.timeout==='string'&&value.timeout.length<=32&&/^(?:0|(?:[0-9]{1,6}(?:\.[0-9]{1,9})?(?:ns|us|µs|ms|s|m|h)){1,4})$/.test(value.timeout),'stop_timeout_format','config.stop_config.timeout');
 return{signal:value.signal,timeout:value.timeout,workerLoopHandlesSignal:['SIGTERM','SIGINT'].includes(value.signal)};
}
export function nonsecretRollbackCapsule(machine){
 const config=machine.config;custody(config&&typeof config==='object','configuration_shape','config');
 // shortcut: unfamiliar config stays held for custody review; extend only for a captured nonsecret field.
 for(const k of Object.keys(config))custody(['env','init','metadata','image','restart','guest','services','kill_signal','kill_timeout','auto_destroy','dns','metrics','mounts','secrets','stop_config'].includes(k),'unreviewed_config_field',custodyField('config',k));
 const stopConfig=config.stop_config===undefined?null:validatedNativeStopConfig(config.stop_config);
 custody(/^registry\.fly\.io\/legalease-rcap-render-worker[:@][A-Za-z0-9_.:@-]+$/.test(config.image),'image_reference_format','config.image');custody(!config.services?.length,'unreviewed_inbound_services','config.services');
 const metadataKeys=new Set(['fly_platform_version','fly_process_group','fly_release_id','fly_release_version','fly_flyctl_version','fly_previous_alloc','fly_bluegreen_deployment_tag','rcap_worker_source_sha']);for(const [k,v] of Object.entries(config.metadata??{}))custody(metadataKeys.has(k)&&typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(v),'unreviewed_metadata_field_or_format',custodyField('config.metadata',k));
 for(const [k,v] of Object.entries(config.init??{})){const field=custodyField('config.init',k);custody(['cmd','exec','entrypoint','tty'].includes(k),'unreviewed_init_field',field);if(k==='tty')custody(typeof v==='boolean','init_value_format',field);else custody(Array.isArray(v)&&(v.length===0||JSON.stringify(v)===JSON.stringify(['node','scripts/rcap-render-worker.mjs','--loop'])),'init_command_format',field);}
 custody(!config.files?.length&&!config.containers?.length&&!config.processes?.length,'unreviewed_embedded_configuration','config');
 const allowed=new Set(['NODE_ENV','ENABLE_SUPABASE_PARTNER_DATA','RCAP_WORKER_CLAIM_SECONDS','RCAP_WORKER_CONTAINER_DIGEST','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','FLY_PROCESS_GROUP','PRIMARY_REGION']);
 for(const [k,v] of Object.entries(config.env??{})){const field=custodyField('config.env',k);custody(allowed.has(k),'unreviewed_environment_name',field);custody(typeof v==='string','environment_value_type',field);if(k.endsWith('SUPABASE_URL')){let u;try{u=new URL(v);}catch{custody(false,'public_origin_format',field);}custody(u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')&&!u.username&&!u.password&&!u.search&&!u.hash,'public_origin_format',field);}else if(k==='NODE_ENV')custody(['production','test','development'].includes(v),'environment_value_format',field);else if(k==='ENABLE_SUPABASE_PARTNER_DATA')custody(['true','false'].includes(v),'environment_value_format',field);else if(k==='FLY_PROCESS_GROUP')custody(/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(v),'environment_value_format',field);else if(k==='PRIMARY_REGION')custody(/^[a-z]{3}$/.test(v),'environment_value_format',field);else if(k==='RCAP_WORKER_CLAIM_SECONDS')custody(/^[1-9][0-9]{0,4}$/.test(v),'environment_value_format',field);else custody(/^sha256:[a-f0-9]{64}$/.test(v),'environment_value_format',field);}
 const scan=(v,k='',field='config')=>{if(k==='secrets'){custody(Array.isArray(v)&&v.every(r=>r&&Object.keys(r).every(n=>['name','env_var'].includes(n))&&Object.values(r).every(s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(s))),'secret_reference_shape',field);return;}custody(!/(password|token|private.?key|service.role.key|secret|api.?key|authorization|credential|access.?key)/i.test(k),'literal_credential_field',field);if(typeof v==='string'){custody(!/(sb_secret_|eyJ[A-Za-z0-9_-]{16,}\.)/.test(v),'credential_literal_pattern',field);custody(!/https?:\/\/[^/\s]*@/.test(v),'credentialed_url',field);}else if(v&&typeof v==='object')for(const [key,value] of Object.entries(v))scan(value,key,custodyField(field,key));};scan(config);
 const bytes=Buffer.from(JSON.stringify({machineId:machine.id,instanceId:machine.instance_id??null,imageDigest:machine.image_ref?.digest,immutableImageReference:'registry.fly.io/'+APP+'@'+machine.image_ref?.digest,ociRevision:machine.image_ref?.labels?.['org.opencontainers.image.revision']??null,config})+'\n');
 return{bytes,sha256:hash(bytes),configSha256:hash(JSON.stringify(config)),stopConfig};
}
export async function captureQualifiedWorkerReadiness({env=process.env,fetchImpl=fetch,root=process.cwd(),checkExecution=true,evidenceDirectory='worker-identity-evidence'}={}){
 const prerequisites=readReadinessPrerequisites(root);
 if(checkExecution){assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_REF,'refs/heads/captain-release');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_REPOSITORY?.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),env.GITHUB_SHA);assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'');}
 assert(env.FLY_API_TOKEN&&env.SUPABASE_ACCESS_TOKEN);
 assert(['worker-identity-evidence','production-worker-evidence/pre-effect','production-worker-evidence/post-placement'].includes(evidenceDirectory));
 const directory=path.join(root,evidenceDirectory);fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const write=(name,value,raw=false)=>{const bytes=raw?value:Buffer.from(JSON.stringify(value,null,2)+'\n'),p=path.join(directory,name),fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}assert.equal(hash(fs.readFileSync(p)),hash(bytes));const d=fs.openSync(directory,'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}return{path:name,sha256:hash(bytes)};};
 const result={schemaVersion:'qualified-worker-readonly-readiness/v1',capturedAt:new Date().toISOString(),app:APP,projectRef:PROJECT,prerequisites,executionSha:env.GITHUB_SHA??null,runId:Number(env.GITHUB_RUN_ID)||null,transport:{machineInventory:'GET',processProbe:'POST exec; bounded metadata and zero-row HEAD only',queue:'POST SQL; BEGIN READ ONLY; API read_only=false; postgres/on required'},workerMutated:false,productionDatabaseMutated:false,customerRowsRead:false,secretValuesIncluded:false,compatibilityAccepted:false,handoffProven:false,workerPlacementAuthorized:false,activationAuthorized:false,observations:{},refusals:[]};
 const json=async(url,options)=>{const r=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP_'+r.status);return r.json();};
 const auth={Authorization:'Bearer '+env.FLY_API_TOKEN,'Content-Type':'application/json',Accept:'application/json'};
 try{
  const machines=await json(BASE+'/machines',{method:'GET',headers:auth});assert(Array.isArray(machines)&&machines.length===1);const id=machines[0].id;assert.match(id,/^[a-f0-9]{10,20}$/);
  const m=await json(BASE+'/machines/'+id,{method:'GET',headers:auth});assert.equal(m.id,id);assert.equal(m.state,'started');assert.match(m.image_ref?.digest??'',/^sha256:[a-f0-9]{64}$/);assert.match(m.image_ref?.labels?.['org.opencontainers.image.revision']??'',/^[a-f0-9]{40}$/);
  result.machine={id,state:m.state,instanceId:/^[A-Za-z0-9]{10,50}$/.test(m.instance_id??'')?m.instance_id:null,imageDigest:m.image_ref.digest,immutableImageReference:'registry.fly.io/'+APP+'@'+m.image_ref.digest,ociRevision:m.image_ref.labels['org.opencontainers.image.revision'],exportedDigest:/^sha256:[a-f0-9]{64}$/.test(m.config?.env?.RCAP_WORKER_CONTAINER_DIGEST??'')?m.config.env.RCAP_WORKER_CONTAINER_DIGEST:null,restartPolicy:['always','on-failure','no','never'].includes(m.config?.restart?.policy)?m.config.restart.policy:null,killSignal:['SIGTERM','SIGINT'].includes(m.config?.kill_signal)?m.config.kill_signal:null,killTimeout:/^[0-9]+(?:ms|s|m)?$/.test(String(m.config?.kill_timeout??''))?m.config.kill_timeout:null,memoryMb:Number.isSafeInteger(m.config?.guest?.memory_mb)?m.config.guest.memory_mb:null,serviceCount:m.config?.services===undefined?0:Array.isArray(m.config.services)?m.config.services.length:null};
  try{const capsule=nonsecretRollbackCapsule(m);if(capsule.stopConfig){result.machine.stopConfig=capsule.stopConfig;result.machine.killSignal=capsule.stopConfig.signal;result.machine.killTimeout=capsule.stopConfig.timeout;result.machine.stopConfigSource='native_config.stop_config';}result.rollback={...write('rollback-config.nonsecret.private.json',capsule.bytes,true),configSha256:capsule.configSha256,durableVerified:true};}catch(error){result.refusals.push('rollback_config_contains_unreviewed_or_secret_literal_requires_safe_custody');result.rollbackCustodyRefusal=error instanceof RollbackCustodyRefusal?{category:error.category,fieldPath:error.fieldPath}:{category:'custody_io_or_unclassified_guard',fieldPath:'rollback_artifact'};result.rollbackConfigShape=rollbackConfigShape(m.config);}
  const tasks=await Promise.allSettled([
   (async()=>{const raw=await json(BASE+'/machines/'+id+'/exec',{method:'POST',headers:auth,body:JSON.stringify({command:effectiveProbeCommand(id),timeout:15})});assert(raw.exit_code===undefined||raw.exit_code===0);assert(raw.exit_signal===undefined||raw.exit_signal===0);assert(!raw.stderr);assert(typeof raw.stdout==='string'&&raw.stdout.length<2000);const proof=JSON.parse(raw.stdout);assert.equal(proof.schemaVersion,'qualified-worker-effective-binding/v1');assert.equal(proof.machineId,id);assert.equal(proof.secretValuesIncluded,false);assert.equal(proof.customerRowsRead,false);const safe=Object.fromEntries(['schemaVersion','passed','machineId','projectRef','workerPid','roleProven','queueHeadStatus','secretValuesIncluded','customerRowsRead','credentialKind'].filter(k=>k in proof).map(k=>[k,proof[k]]));assert.equal(safe.projectRef,PROJECT);assert.equal(safe.passed,true);assert.equal(safe.roleProven,true);assert(Number.isSafeInteger(safe.workerPid)&&safe.workerPid>0);assert([200,206].includes(safe.queueHeadStatus));assert(['authenticated_secret_key_service_role','authenticated_jwt_service_role'].includes(safe.credentialKind));return safe;})(),
   (async()=>{const rows=await json('https://api.supabase.com/v1/projects/'+PROJECT+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:READINESS_QUEUE_SQL,read_only:false})});return validateQueueCapture(rows);})()
  ]);
  for(let i=0;i<tasks.length;i++){const key=i===0?'effectiveWorker':'queue';if(tasks[i].status==='fulfilled')result.observations[key]=tasks[i].value;else result.refusals.push(key+'_unproven_'+(/^HTTP_[0-9]{3}$/.test(tasks[i].reason?.message)?tasks[i].reason.message:'refused'));}
  const after=await json(BASE+'/machines/'+id,{method:'GET',headers:auth});assert.equal(after.instance_id,m.instance_id);assert.equal(after.image_ref?.digest,m.image_ref.digest);assert.equal(after.state,'started');assert.equal(hash(JSON.stringify(after.config)),hash(JSON.stringify(m.config)));result.machineUnchangedDuringCapture=true;
 }catch{result.refusals.push('machine_identity_or_config_capture_unproven');}
 result.status=result.refusals.length?'HOLD_READINESS_INCOMPLETE':'READINESS_CAPTURED_REQUIRES_C_REVIEW';write('identity.json',result);return result;
}
