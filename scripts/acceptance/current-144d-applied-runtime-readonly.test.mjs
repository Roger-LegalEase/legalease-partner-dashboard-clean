import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TARGET,configuredEffectiveProbeCommand} from './place-144d-worker.mjs';
import {observeCurrentAppliedWorker,observedMachineVersions,requireCurrentReadinessContext} from './current-144d-applied-runtime-readonly.mjs';
// Synthetic transports and references only; no native or customer result is claimed.
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_JOB: 'deploy_144d', GITHUB_WORKFLOW_REF: 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release', GITHUB_REPOSITORY_ID: '1248656766', GITHUB_ACTOR_ID: '287531360',
  GITHUB_REPOSITORY: 'Roger-LegalEase/legalease-partner-dashboard-clean', GITHUB_REF: 'refs/heads/captain-release', GITHUB_RUN_ATTEMPT: '1',
  GITHUB_SHA: '1'.repeat(40), GITHUB_RUN_ID: '123456789', INPUT_WORKER_SOURCE_SHA: TARGET.source, INPUT_WORKER_DIGEST: TARGET.digest,
  RCAP_WORKER_REGISTRY_READONLY: 'false', FLY_API_TOKEN: 'SYNTHETIC_FLY_ONLY', SUPABASE_ACCESS_TOKEN: 'SYNTHETIC_DB_ONLY', RCAP_FLY_IMAGE_DIGEST: TARGET.digest, DOCKER_CONFIG: '/tmp/synthetic-auth-reference',
};
const version = 'SYNTHETICBEFORE001', nextVersion = 'SYNTHETICAFTER0001';
const beforeMachine = () => ({id: TARGET.machine, state: 'started', instance_id: version,
  image_ref: {digest: TARGET.oldMirror, labels: {'org.opencontainers.image.revision': TARGET.oldSource}},
  config: {image: `registry.fly.io/${TARGET.app}@${TARGET.oldMirror}`, env: {NODE_ENV: 'production', ENABLE_SUPABASE_PARTNER_DATA: 'true', RCAP_WORKER_CLAIM_SECONDS: '600', RCAP_WORKER_CONTAINER_DIGEST: TARGET.oldDigest, SUPABASE_URL: `https://${TARGET.project}.supabase.co`, NEXT_PUBLIC_SUPABASE_URL: `https://${TARGET.project}.supabase.co`},
    restart: {policy: 'always'}, guest: {memory_mb: 1024, cpu_kind: 'shared', cpus: 1}, services: [], init: {}, stop_config: {signal: 'SIGTERM', timeout: '30s'}, metadata: {fly_release_id: 'PRIVATE_METADATA_SENTINEL'}, secrets: [{name: 'PRIVATE_SECRET_NAME_SENTINEL', env_var: 'PRIVATE_SECRET_NAME_SENTINEL'}]}});
const image = () => ({Id: TARGET.config, Os: 'linux', Architecture: 'amd64', Config: {Labels: {'org.opencontainers.image.revision': TARGET.source}}, RootFS: {Layers: Array(303).fill('sha256:'+'a'.repeat(64))}, ManifestDigest: TARGET.digest});
const names = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const queueRow = () => ({current_user: 'postgres', session_user: 'postgres', transaction_read_only: 'on', status_counts: {}, ...Object.fromEntries(['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'].map(k => [k, 0])), exposed_work: []});
const effective = () => ({schemaVersion: 'qualified-worker-effective-binding/v1', machineId: TARGET.machine, projectRef: TARGET.project, passed: true, roleProven: true, secretValuesIncluded: false, customerRowsRead: false, queueHeadStatus: 200, configuredUserProven: true});
const currentQualifierEnv={...env,GITHUB_JOB:'identity',GITHUB_WORKFLOW_REF:'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-worker-identity-readonly.yml@refs/heads/captain-release',RCAP_QUALIFIED_WORKER_READINESS:'1',RCAP_WORKER_HANDOFF_HISTORY:''};
const currentBeforeVersion='01M76WE6AKSD7FHTW8NAM1NK13';
const currentWindowStart=Date.parse('2026-11-13T16:24:41Z');
async function currentQualifierScenario(fault=''){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'144d-current-qualifier-'));fs.chmodSync(root,0o700);
  let gets=0,queries=0,execs=0,namesRead=0;const calls=[];
  const machine=()=>{
    const m=beforeMachine();m.instance_id=nextVersion;m.version=nextVersion;m.image_ref={digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}};
    m.config.image=`registry.fly.io/${TARGET.app}@${TARGET.digest}`;m.config.env.RCAP_WORKER_CONTAINER_DIGEST=TARGET.digest;
    m.events=[{type:'exit',timestamp:currentWindowStart+1000,request:{exit_event:{requested_stop:true}}},{type:'start',timestamp:currentWindowStart+2000}];
    if(fault==='alias-absent')delete m.instance_id;
    if(fault==='canonical-absent')delete m.version;
    if(fault==='alias-conflict')m.instance_id='SYNTHETICCONFLICT01';
    if(fault==='old-version'){m.instance_id=currentBeforeVersion;m.version=currentBeforeVersion;}
    if(fault==='no-exit')m.events=m.events.filter(e=>e.type==='start');
    if(fault==='restart-policy')m.config.restart.policy='no';
    if(fault==='mount')m.config.mounts=[{path:'/app',volume:'SYNTHETIC_OVERRIDE'}];
    return m;
  };
  const request=async(url,options)=>{
    calls.push({url,method:options.method});assert.equal(options.redirect,'error');assert(!Object.hasOwn(options.headers,'fly-machine-lease-nonce'));assert(!url.includes('/lease'));
    const reply=x=>new Response(JSON.stringify(x),{status:200});
    if(url===`https://api.supabase.com/v1/projects/${TARGET.project}/database/query`){
      queries++;assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).query.startsWith('BEGIN READ ONLY;'),true);
      const q=queueRow();if(fault==='busy')q.claimed=1;return reply([q]);
    }
    if(url.endsWith('/exec')){
      execs++;assert.equal(url,`https://api.machines.dev/v1/apps/${TARGET.app}/machines/${TARGET.machine}/exec`);assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{command:configuredEffectiveProbeCommand(),timeout:15});
      const p=effective();if(fault==='uid')p.configuredUserProven=false;if(fault==='role')p.roleProven=false;
      return reply({exit_code:0,exit_signal:0,stdout:JSON.stringify(p),stderr:''});
    }
    assert.equal(options.method,'GET');
    if(url===`https://api.machines.dev/v1/apps/${TARGET.app}/machines`)return reply([{id:TARGET.machine}]);
    assert.equal(url,`https://api.machines.dev/v1/apps/${TARGET.app}/machines/${TARGET.machine}`);gets++;
    const m=machine();if(fault==='config-drift'&&gets===2)m.config.guest.cpus=2;return reply(m);
  };
  const command=(tool,args)=>{assert.equal(tool,'flyctl');assert.deepEqual(args,['secrets','list','--app',TARGET.app,'--json']);namesRead++;return JSON.stringify(names.map(Name=>({Name,Digest:'PRIVATE_SECRET_SENTINEL'})));};
  try{
    const r=await observeCurrentAppliedWorker({env:currentQualifierEnv,request,command,root});
    assert.deepEqual([r.mirrorAttempts,r.leaseAttempts,r.updateAttempts],[0,0,0]);assert.equal(r.runtimeQualified,false);assert.equal(r.hostedAccepted,false);assert.equal(r.automaticRetry,false);assert.equal(r.automaticRollback,false);
    assert.equal(r.historicalBeforeDictRetained,false);assert.equal(r.historicalExactBeforeComparisonProven,false);assert.equal(r.originalStartedAtRetained,false);assert.equal(r.approvedPrivateProfileComparisonAvailable,false);assert.equal(r.approvedPrivateProfileEqualityProven,false);
    assert(!JSON.stringify(r).includes('PRIVATE_'));
    const p=path.join(root,'worker-identity-evidence/result.public.json');assert.equal(fs.statSync(p).mode&0o777,0o600);assert.deepEqual(JSON.parse(fs.readFileSync(p)),r);
    return {r,gets,queries,execs,namesRead,calls};
  }finally{fs.rmSync(root,{recursive:true});}
}
test('current applied qualifier: configured999 role queue full-current-config and native pair use existing readonly mechanics',async()=>{
  const s=await currentQualifierScenario();assert.equal(s.r.currentRuntimeObserved,true);assert.equal(s.r.newVersionProven,true);assert.equal(s.r.nativeHandoffProven,true);
  for(const k of ['effectiveBindingProven','configuredNonrootProven','queueWindowProven','configStableDuringCapture','secretNamesStable','currentConfigurationPredicatesProven'])assert.equal(s.r[k],true,k);
  assert.deepEqual([s.gets,s.queries,s.execs,s.namesRead],[2,2,1,2]);assert.equal(s.r.versionFieldEvidence.aliasConflict,false);
});
test('current applied qualifier: actual alias presence is retained, canonicalversion required, conflict and oldversion refuse',async()=>{
  const missingAlias=await currentQualifierScenario('alias-absent');assert.equal(missingAlias.r.versionFieldEvidence.instanceIdPresent,false);assert.equal(missingAlias.r.currentInstanceId,null);assert.equal(missingAlias.r.newInstanceProven,false);assert.equal(missingAlias.r.newVersionProven,true);assert.equal(missingAlias.r.currentRuntimeObserved,true);
  for(const fault of ['canonical-absent','alias-conflict','old-version']){const s=await currentQualifierScenario(fault);assert.equal(s.r.newVersionProven,false);assert.equal(s.r.currentRuntimeObserved,false);}
  assert.equal(observedMachineVersions({version:'PRIVATE_BAD_FORMAT_SENTINEL!'}).providerVersion,null);
});
test('current applied qualifier: missing nativeexit stays unknown while unrelated current-runtime positives remain actual',async()=>{
  const s=await currentQualifierScenario('no-exit');assert.equal(s.r.nativeHandoffProven,false);assert.equal(s.r.currentRuntimeObserved,false);assert(s.r.observationFailures.includes('bounded_native_handoff_pair_unproven'));
  assert.equal(s.r.nativeEventEvidence.count,1);assert.equal(s.r.nativeEventEvidence.records[0].type,'start');assert.equal(s.r.effectiveBindingProven,true);assert.equal(s.r.configStableDuringCapture,true);
});
test('current applied qualifier: uid role queue and fullconfig drift refuse without a mutation or raw output',async()=>{
  for(const fault of ['uid','role','busy','config-drift','restart-policy','mount']){const s=await currentQualifierScenario(fault);assert.equal(s.r.currentRuntimeObserved,false);assert(s.r.refusalCode||s.r.observationFailures.length);}
});
test('current applied qualifier: exact registered purpose subject actor and modes refuse before any transport',async()=>{
  for(const patch of [{GITHUB_JOB:'deploy_144d'},{GITHUB_ACTOR_ID:'999'},{GITHUB_RUN_ATTEMPT:'2'},{RCAP_WORKER_HANDOFF_HISTORY:'1'},{RCAP_QUALIFIED_WORKER_READINESS:''},{INPUT_WORKER_SOURCE_SHA:TARGET.oldSource},{INPUT_WORKER_DIGEST:TARGET.oldDigest}])assert.throws(()=>requireCurrentReadinessContext({...currentQualifierEnv,...patch}));
  let calls=0;await assert.rejects(()=>observeCurrentAppliedWorker({env:{...currentQualifierEnv,GITHUB_ACTOR_ID:'999'},request:()=>{calls++;},command:()=>{calls++;}}));assert.equal(calls,0);
});
