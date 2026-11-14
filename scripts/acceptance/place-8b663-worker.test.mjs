import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync as checkQuotedArgv} from 'node:child_process';
import path from 'node:path';
import {TARGET, placeWorker, requireExecutionContext, planUpdate, planRollback, publicResult, configuredEffectiveProbeCommand, safeRegistryFailure, inspectAcceptedImage, readDestinationManifestResponse, mirrorImage, observeDestinationRegistry} from './place-8b663-worker.mjs';

import {effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

// Synthetic transport and credentials only. This imports the actual module; no provider is contacted.
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_JOB: 'deploy_8b663', GITHUB_WORKFLOW_REF: 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release', GITHUB_REPOSITORY_ID: '1248656766', GITHUB_ACTOR_ID: '287531360',
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
async function scenario(fault = '', writer = placeWorker) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '8b663-writer-test-'));
  const auth = path.join(root,'auth'); fs.mkdirSync(auth,{mode:0o700}); fs.chmodSync(auth,0o700);
  const authPath=path.join(auth,'config.json');
  const authFD=fs.openSync(authPath,'wx',0o600);
  try {fs.fchmodSync(authFD,0o600);fs.writeFileSync(authFD,JSON.stringify({auths:{'registry.fly.io':{auth:Buffer.from('x:SYNTHETIC_REGISTRY_ONLY').toString('base64url')}}}));}finally{fs.closeSync(authFD);}
  if(fault==='http-auth-mode')fs.chmodSync(authPath,0o644);
  if(fault==='http-auth-hardlink')fs.linkSync(authPath,path.join(auth,'second-link'));
  if(fault==='http-auth-symlink'){fs.renameSync(authPath,path.join(auth,'target'));fs.symlinkSync(path.join(auth,'target'),authPath);}
  const original = beforeMachine(), calls = [], commands = [], files = {}, inspections = [], sshCalls = [];
  let simulatedNow=1000, pollReads=0;
  let after, updates = 0, leases = 0, releases = 0, mirrorCopies = 0, nameCalls = 0, destinationReads = 0, registryGets = 0;
  const command = (tool, args, options) => {
    commands.push({tool, args});
    assert.equal(options.env, actualEnv);
    if (tool === 'flyctl') {
      if (args[0] === 'version') return fault === 'ssh-version' ? 'flyctl v0.0.1' : 'flyctl v0.5.8 linux/amd64';
      if (args[0] === 'ssh') { assert.deepEqual(args,['ssh','console','--help']); return fault === 'ssh-interface' ? '--app --command --quiet --pty --user' : '--machine --app --command --quiet --pty --user'; }
      assert.deepEqual(args, ['secrets','list','--app',TARGET.app,'--json']);
      nameCalls++;
      return JSON.stringify((fault === 'secret-missing' ? names.slice(1) : fault === 'secret-drift' && nameCalls > 1 ? [...names, 'ADDED_REFERENCE'] : names).map(Name => ({Name, Digest: 'PRIVATE_SECRET_DIGEST_SENTINEL'})));
    }
    assert.equal(tool, 'skopeo');
    assert.deepEqual(args, ['copy','--preserve-digests','--authfile',path.join(actualEnv.DOCKER_CONFIG,'config.json'),`docker://ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`,`docker://registry.fly.io/${TARGET.app}:${TARGET.source}`]);
    mirrorCopies++;
    assert.equal(leases, 0); assert.equal(updates, 0);
    if (fault === 'copy-error') throw Object.assign(Error('copy failed'), {status:1, stderr:'PRIVATE_AUTH_ERROR_SENTINEL'});
    return '';
  };
  const inspectImage = ref => {
    inspections.push(ref);
    assert.equal(leases, 0); assert.equal(updates, 0);
    if (ref.startsWith('registry.fly.io/')) {
      assert.equal(ref, `registry.fly.io/${TARGET.app}@${TARGET.digest}`);
      destinationReads++;
      if (['destination-missing','copy-error','copied-config-drift'].includes(fault) && destinationReads === 1)
        throw Object.assign(Error('registry_child_failed'), {childFailure: safeRegistryFailure({status:1, stderr:'manifest unknown: unexpected HTTP status code: 404'}, 'fly_manifest', 10)});
      if(fault.startsWith('http-') && destinationReads===1)
        throw Object.assign(Error('registry_child_failed'),{childFailure:safeRegistryFailure({status:1,stderr:'manifest unknown'},'fly_manifest',603)});
      if (['destination-denied','destination-unknown','destination-config-missing','destination-http-null','destination-http-500'].includes(fault))
        throw Object.assign(Error('registry_child_failed'), {childFailure: safeRegistryFailure({status:1, stderr:fault === 'destination-denied' ? 'unauthorized HTTP status 403' : fault === 'destination-config-missing' ? 'manifest unknown: HTTP status 404' : fault === 'destination-http-null' ? 'manifest unknown' : fault === 'destination-http-500' ? 'manifest unknown: HTTP status 500' : 'PRIVATE_AUTH_ERROR_SENTINEL'}, fault === 'destination-config-missing' ? 'fly_config' : 'fly_manifest', 10)});
    }
    if (fault === 'registry-denied') throw Error('request_HTTP_403');
    const r = image();
    if (fault === 'wrong-layers') r.RootFS.Layers = r.RootFS.Layers.slice(0,250);
    if (['destination-config','copied-config-drift'].includes(fault) && ref.startsWith('registry.fly.io/')) r.Id = 'sha256:'+'0'.repeat(64);
    if (fault === 'destination-layers' && ref.startsWith('registry.fly.io/')) r.RootFS.Layers.pop();
    if (fault === 'wrong-config') r.Id = 'sha256:'+'0'.repeat(64);
    if (fault === 'mirror-digest' && ref.startsWith('registry.fly.io/')) r.ManifestDigest = 'sha256:'+'b'.repeat(64);
    return r;
  };
  const request = async (url, options) => {
    if(url===`https://registry.fly.io/v2/${TARGET.app}/manifests/${TARGET.digest}`){
      registryGets++;assert.equal(registryGets,1);assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');
      assert.equal(options.headers.Authorization,'Basic '+Buffer.from('x:SYNTHETIC_REGISTRY_ONLY').toString('base64'));
      assert.deepEqual(Object.keys(options.headers).sort(),['Accept','Authorization']);
      assert.equal(leases,0);assert.equal(updates,0);assert.equal(mirrorCopies,0);
      if(fault==='http-network')throw Error('PRIVATE_HTTP_ERROR_SENTINEL');
      if(fault==='http-null'||fault==='destination-http-null')return {status:null,headers:new Headers()};
      const statuses={'http-401':401,'http-403':403,'http-500':500,'http-redirect':307,'http-wrong-manifest':200};
      const status=statuses[fault]??404;
      let body=JSON.stringify({errors:[{code:fault==='http-unknown-code'?'PRIVATE_ERROR_CODE_SENTINEL':'MANIFEST_UNKNOWN',message:'PRIVATE_HTTP_MESSAGE_SENTINEL',detail:{credential:'PRIVATE_HTTP_DETAIL_SENTINEL'}}]});
      if(fault==='http-malformed')body='PRIVATE_HTTP_BODY_SENTINEL';
      if(fault==='http-duplicate-errors')body=JSON.stringify({errors:[{code:'MANIFEST_UNKNOWN'},{code:'MANIFEST_UNKNOWN'}]});
      if(fault==='http-oversize')body='x'.repeat(8193);
      const headers={'content-type':fault==='http-wrong-mime'?'text/plain':'application/json'};
      if(fault==='http-401'||fault==='http-404-challenge')headers['www-authenticate']='Bearer realm="https://PRIVATE_REALM_SENTINEL.invalid/token"';
      if(fault==='http-redirect')headers.location='https://PRIVATE_REDIRECT_SENTINEL.invalid/';
      const response=new Response(body,{status,headers});
      Object.defineProperty(response,'url',{value:fault==='http-wrong-url'?'https://PRIVATE_WRONG_URL_SENTINEL.invalid/':url});
      if(fault==='http-auth-drift')fs.chmodSync(authPath,0o644);
      return response;
    }
    const liveLease = leases > releases, nonceAttached = Object.hasOwn(options.headers, 'fly-machine-lease-nonce');
    calls.push({url, method: options.method, liveLease, nonceAttached});
    assert.equal(options.redirect, 'error');
    const response = value => ({ok: true, status: 200, json: async () => structuredClone(value)});
    if (url.includes('/database/query')) {
      assert.equal(url, `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`);
      assert.equal(nonceAttached, false); assert.equal(options.headers.Authorization, `Bearer ${actualEnv.SUPABASE_ACCESS_TOKEN}`);
      if (fault === 'postlease-queue-http' && liveLease && !updates) return {ok:false, status:409};
      const body = JSON.parse(options.body); assert(body.query.startsWith('BEGIN READ ONLY;')); assert(!/insert|update|delete/i.test(body.query));
      const q = queueRow(); if (fault === 'queue-busy' || (['postlease-queue-busy','http-after-lease-queue-busy'].includes(fault) && liveLease)) q.claimed = 1;
      return response([q]);
    }
    assert(url === `https://api.machines.dev/v1/apps/${TARGET.app}/machines` || url.startsWith(`https://api.machines.dev/v1/apps/${TARGET.app}/machines/${TARGET.machine}`));
    assert.equal(options.headers.Authorization, `Bearer ${actualEnv.FLY_API_TOKEN}`);
    if (liveLease) {
      if (options.headers['fly-machine-lease-nonce'] !== 'SYNTHETIC_NONCE') return {ok:false, status:409};
    } else assert.equal(nonceAttached, false);
    if (fault === 'postlease-exec-http' && liveLease && url.endsWith('/exec')) return new Response(JSON.stringify({error:'machine lease currently held by PRIVATE_SERVER_ERROR_SENTINEL', status:'conflict'}), {status:409});
    if (fault === 'postlease-exec-unknown' && liveLease && url.endsWith('/exec')) return new Response(JSON.stringify({error:'PRIVATE_SERVER_ERROR_SENTINEL', status:'PRIVATE_STATUS_SENTINEL'}), {status:409});
    if (fault === 'postlease-exec-oversized' && liveLease && url.endsWith('/exec')) return new Response('PRIVATE_SERVER_ERROR_SENTINEL'.repeat(1024), {status:409});
    if (fault === 'postlease-exec-transport' && liveLease && url.endsWith('/exec')) throw Error('PRIVATE_TRANSPORT_ERROR_SENTINEL');
    if (fault === 'postupdate-read-http' && updates && options.method === 'GET') return {ok:false, status:409};
    if (url.endsWith('/exec')) {
      const body = JSON.parse(options.body); assert.equal(body.command[0], 'node'); assert.equal(body.timeout, 15);
      assert.deepEqual(Object.keys(body).sort(), ['command','timeout']); assert.deepEqual(body.command, effectiveProbeCommand(TARGET.machine));
      const proof = effective(); if (fault === 'wrong-project') proof.projectRef = 'wrongproject'; if (fault === 'root-user' && body.command[2].includes('configuredUserProven')) proof.configuredUserProven = false;
      return response({exit_code: 0, stdout: JSON.stringify(proof), stderr: ''});
    }
    if (url.endsWith('/lease')) {
      if (options.method === 'DELETE') { releases++; assert.equal(options.headers['fly-machine-lease-nonce'], 'SYNTHETIC_NONCE'); if (fault === 'release-error') return {ok: false, status: 503}; return response({}); }
      leases++; assert.equal(updates, 0); assert.deepEqual(JSON.parse(options.body), {description: `8b663-${env.GITHUB_RUN_ID}`, ttl: 500});
      return response({data: {nonce: 'SYNTHETIC_NONCE', version: fault === 'lease-drift' ? 'SYNTHETICOTHER001' : version}});
    }
    if (url.endsWith('/machines')) return response([{id: TARGET.machine}]);
    assert(url.endsWith('/'+TARGET.machine));
    if (options.method === 'POST') {
      updates++; assert.equal(updates, 1); assert.equal(leases, 1);
      assert.equal(options.headers['fly-machine-lease-nonce'], 'SYNTHETIC_NONCE');
      const body = JSON.parse(options.body); assert.equal(body.current_version, version); assert.equal(body.skip_launch, false);
      const wanted = structuredClone(original.config); wanted.image = `registry.fly.io/${TARGET.app}@${TARGET.digest}`; wanted.env.RCAP_WORKER_CONTAINER_DIGEST = TARGET.digest;
      assert.deepEqual(body.config, wanted);
      if (fault === 'update-indeterminate') throw Error('PRIVATE_TRANSPORT_ERROR_SENTINEL');
      after = {...structuredClone(original), instance_id: nextVersion, config: body.config, image_ref: {digest: TARGET.digest, labels: {'org.opencontainers.image.revision': TARGET.source}}, events: [{type: 'exit', timestamp: 1001, request: {exit_event: {requested_stop: true}}}, {type:'start', timestamp:1002}]};
      if (fault === 'post-config-drift') after.config.guest.cpus = 2;
      return response(after);
    }
    const current = structuredClone(after ?? original);
    if(updates){pollReads++;if(['late-start','never-start'].includes(fault)&&(fault==='never-start'||pollReads<47))current.state='starting';if(fault==='missing-exit')current.events=current.events.filter(e=>e.type!=='exit');}
    if (fault === 'prelease-config-drift' && calls.filter(c => c.url.endsWith('/'+TARGET.machine) && c.method === 'GET').length > 1) current.config.guest.cpus = 2;
    if (fault === 'mount-override') current.config.mounts = [{path: '/app', volume: 'SYNTHETIC_OVERRIDE'}];
    if (fault === 'old-digest') current.image_ref.digest = 'sha256:'+'f'.repeat(64);
    if (fault === 'old-baa3') current.image_ref.labels['org.opencontainers.image.revision'] = 'baa3c993136ebb11f40ad565a01a9f28983d3b6a';
    if (fault === 'private-config-field') current.config.env.SUPABASE_SERVICE_ROLE_KEY = 'PRIVATE_LITERAL_SENTINEL';
    return response(current);
  };
  const ssh = (tool, args, options) => {
    assert.equal(tool,'flyctl');
    assert.deepEqual(args.slice(0,-1),['ssh','console','--app',TARGET.app,'--machine',TARGET.machine,'--user','root','--quiet','--pty=false','--command']);
    assert.equal(options.shell,false); assert.deepEqual(options.stdio,['ignore','pipe','pipe']);
    assert.equal(options.timeout,20000); assert.equal(options.killSignal,'SIGKILL'); assert.equal(options.maxBuffer,8192);
    assert.equal(options.env.FLY_API_TOKEN, actualEnv.FLY_API_TOKEN);
    for (const key of ['SUPABASE_ACCESS_TOKEN','GH_TOKEN','GITHUB_TOKEN','GHCR_READ_TOKEN','DOCKER_CONFIG']) assert.equal(options.env[key],undefined);
    assert(!args.join(' ').includes('SYNTHETIC_NONCE')); assert.equal(leases,1); assert.equal(releases,0);
    // Parse the actual SSH command with the kernel shell; set/printf never execute the probe.
    const parsed = checkQuotedArgv('/bin/sh',['-c',`set -- ${args.at(-1)}; printf '%s\\0' "$@"`],{stdio:['ignore','pipe','pipe'],timeout:2000,maxBuffer:32768}).toString().split('\0').slice(0,-1);
    assert.deepEqual(parsed, configuredEffectiveProbeCommand());
    sshCalls.push({updatesBefore:updates,configuredProof:true});
    if (fault === 'ssh-denied') return {status:1,signal:null,stdout:'PRIVATE_SSH_STDOUT_SENTINEL',stderr:'create ssh certificate: permission denied PRIVATE_SSH_STDERR_SENTINEL'};
    if (fault === 'ssh-timeout') return {status:null,signal:'SIGKILL',error:{code:'ETIMEDOUT'},stdout:'PRIVATE_SSH_STDOUT_SENTINEL',stderr:'PRIVATE_SSH_STDERR_SENTINEL'};
    if (fault === 'ssh-state') return {status:1,signal:null,stdout:'',stderr:'machine d8de5e4f759278 is not started PRIVATE_SSH_STDERR_SENTINEL'};
    if (fault === 'ssh-stderr') return {status:0,signal:null,stdout:JSON.stringify(effective()),stderr:'PRIVATE_SSH_STDERR_SENTINEL'};
    const proof=effective();
    if (fault === 'root-user') proof.configuredUserProven=false;
    if (fault === 'ssh-project') proof.projectRef='wrongproject';
    if (fault === 'ssh-role') proof.roleProven=false;
    if (fault === 'ssh-machine') proof.machineId='wrongmachine';
    return {status:0,signal:null,stdout:fault === 'ssh-json' ? 'PRIVATE_SSH_STDOUT_SENTINEL' : JSON.stringify(proof),stderr:''};
  };
  const actualEnv = {...env, DOCKER_CONFIG:auth, ...(fault === 'wrong-actor' ? {GITHUB_ACTOR_ID: '999'} : {})};
  try {
    let result, refusal;
    try { result = await writer({env: actualEnv, request, command, inspectImage, ssh, root, now: () => simulatedNow, sleep: async ms => {assert.equal(ms,2000);simulatedNow+=ms;}}); }
    catch (error) { refusal = error.message; }
    const directory = path.join(root, '8b663-worker-placement-evidence');
    if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory)) {
      const f = path.join(directory, name); assert.equal(fs.statSync(f).mode & 0o777, 0o600); files[name] = JSON.parse(fs.readFileSync(f));
    }
    const serialized = JSON.stringify({result, files});
    for (const privateValue of ['PRIVATE_SSH_STDOUT_SENTINEL','PRIVATE_SSH_STDERR_SENTINEL','PRIVATE_SERVER_ERROR_SENTINEL','PRIVATE_STATUS_SENTINEL','PRIVATE_METADATA_SENTINEL','PRIVATE_SECRET_NAME_SENTINEL','PRIVATE_SECRET_DIGEST_SENTINEL','PRIVATE_LITERAL_SENTINEL','PRIVATE_TRANSPORT_ERROR_SENTINEL','PRIVATE_AUTH_ERROR_SENTINEL','SYNTHETIC_NONCE','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','configSha256','configCapsule','pre-queue','rollback-config','projectRef']) assert(!serialized.includes(privateValue), privateValue);
    assert(Object.keys(files).every(name => ['result.public.json','attempt.json','mirror-attempt.public.json'].includes(name)));
    if (result) assert.deepEqual(files['result.public.json'], result);
    return {result, refusal, simulatedNow, pollReads, updates, leases, releases, mirrorCopies, calls, files, inspections, sshCalls, registryGets};
  } finally { fs.rmSync(root, {recursive: true}); }
}


test('8b663 successor: literal newsubject and acceptedA9 rollback baseline, oldsubjects and beforeeffect faults refuse',async()=>{
  assert.equal(TARGET.source,'8b6639b8357bebf56c4c70246ff9e05d004aae2a');assert.equal(TARGET.digest,'sha256:108a234af8b7ed9faee3c836c81a96c9a2cd371030ff2d05ad843c252f424502');assert.equal(TARGET.config,'sha256:0327670ac2c9b7a8967c860d4789c586f8f55813d998e9a2354b11c846a8c02d');assert.equal(TARGET.oldSource,'a9a525726730a3220204ebdc3533a75fcf09b7db');assert.equal(TARGET.oldDigest,'sha256:e874f00331dd903504731ac175e93239379dce4c3996b34ae020e8d494cca2b1');assert.equal(TARGET.oldMirror,TARGET.oldDigest);
  for(const patch of [{GITHUB_JOB:'deploy_a9a525'},{GITHUB_ACTOR_ID:'999'},{GITHUB_RUN_ATTEMPT:'2'},{INPUT_WORKER_SOURCE_SHA:TARGET.oldSource},{INPUT_WORKER_DIGEST:TARGET.oldDigest}])assert.throws(()=>requireExecutionContext({...env,...patch}));
  const a=await scenario('wrong-actor');assert.equal(a.calls.length,0);assert.equal(a.updates,0);
  for(const fault of ['old-baa3','old-digest','queue-busy','wrong-project','mount-override','private-config-field']){const s=await scenario(fault);assert.equal(s.updates,0,fault);assert.equal(s.leases,0,fault);assert.equal(s.mirrorCopies,0,fault);}
});
test('8b663 successor: demonstrated91second start fits boundedwait, fullconfig CAS and heldleaseUID/role proofs retained',async()=>{
  const s=await scenario('late-start');assert.equal(s.result.runtimeQualified,true);assert.equal(s.result.currentRuntimeObserved,true);assert.equal(s.result.nativeHandoffProven,true);assert(s.simulatedNow>=93000&&s.simulatedNow<=181000);assert.deepEqual([s.mirrorCopies,s.leases,s.updates,s.releases],[0,1,1,1]);assert.deepEqual(s.sshCalls.map(x=>x.updatesBefore),[0,1]);
  for(const k of ['registryIdentityProven','configUnchangedExceptImageFields','effectiveBindingProven','configuredNonrootProven','queueWindowProven','secretNamesStable','leaseReleased'])assert.equal(s.result[k],true,k);
});
test('8b663 successor: deadline failure retains safe aftertuple and releases only ownedlease without retry',async()=>{
  const s=await scenario('never-start');assert.equal(s.result.runtimeQualified,false);assert.equal(s.result.refusalCode,'new_machine_version_unproven');assert.equal(s.result.observedState,'starting');assert.equal(s.result.versionFieldEvidence.instanceId,nextVersion);assert.equal(s.result.observedImage.digest,TARGET.digest);assert.equal(s.result.observedImage.markerDigest,TARGET.digest);assert.equal(s.result.observedImage.source,TARGET.source);assert.equal(s.result.leaseReleased,true);assert.equal(s.result.updateAttempts,1);assert.equal(s.result.automaticRetry,false);assert.equal(s.result.automaticRollback,false);assert(s.pollReads<=90);assert.equal(s.simulatedNow,181000);assert.deepEqual([s.mirrorCopies,s.leases,s.updates,s.releases],[0,1,1,1]);
});
test('8b663 successor: missing native exit remains strictfalse after all actualcurrent proofs; UID queue config failures remain fatal',async()=>{
  const s=await scenario('missing-exit');assert.equal(s.result.runtimeQualified,false);assert.equal(s.result.refusalCode,'native_clean_handoff_unproven');assert.equal(s.result.currentRuntimeObserved,true);assert.equal(s.result.afterVersion,nextVersion);assert.notEqual(s.result.nativeHandoffProven,true);assert.equal(s.result.leaseReleased,true);assert.equal(s.result.configUnchangedExceptImageFields,true);assert.equal(s.result.effectiveBindingProven,true);assert.equal(s.result.configuredNonrootProven,true);assert.equal(s.result.queueWindowProven,true);assert.equal(s.result.secretNamesStable,true);assert.deepEqual(s.sshCalls.map(x=>x.updatesBefore),[0,1]);
  for(const fault of ['post-config-drift','root-user','postlease-queue-busy','ssh-role','ssh-project','release-error']){const f=await scenario(fault);assert.equal(f.result.runtimeQualified,false,fault);assert(f.result.refusalCode||f.result.releaseFailure,fault);assert(f.updates<=1&&f.leases<=1&&f.releases<=1,fault);}
});
