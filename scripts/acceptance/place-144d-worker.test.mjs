import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync as checkQuotedArgv} from 'node:child_process';
import path from 'node:path';
import {TARGET, placeWorker, requireExecutionContext, planUpdate, planRollback, publicResult, configuredEffectiveProbeCommand, safeRegistryFailure, inspectAcceptedImage, readDestinationManifestResponse} from './place-144d-worker.mjs';

import {effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

// Synthetic transport and credentials only. This imports the actual module; no provider is contacted.
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
async function scenario(fault = '', writer = placeWorker) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '144d-writer-test-'));
  const auth = path.join(root,'auth'); fs.mkdirSync(auth,{mode:0o700}); fs.chmodSync(auth,0o700);
  const authPath=path.join(auth,'config.json');
  const authFD=fs.openSync(authPath,'wx',0o600);
  try {fs.fchmodSync(authFD,0o600);fs.writeFileSync(authFD,JSON.stringify({auths:{'registry.fly.io':{auth:Buffer.from('x:SYNTHETIC_REGISTRY_ONLY').toString('base64url')}}}));}finally{fs.closeSync(authFD);}
  if(fault==='http-auth-mode')fs.chmodSync(authPath,0o644);
  if(fault==='http-auth-hardlink')fs.linkSync(authPath,path.join(auth,'second-link'));
  if(fault==='http-auth-symlink'){fs.renameSync(authPath,path.join(auth,'target'));fs.symlinkSync(path.join(auth,'target'),authPath);}
  const original = beforeMachine(), calls = [], commands = [], files = {}, inspections = [], sshCalls = [];
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
      leases++; assert.equal(updates, 0); assert.deepEqual(JSON.parse(options.body), {description: `144d-${env.GITHUB_RUN_ID}`, ttl: 300});
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
    try { result = await writer({env: actualEnv, request, command, inspectImage, ssh, root, now: () => 1000, sleep: async () => { throw Error('unnecessary_poll'); }}); }
    catch (error) { refusal = error.message; }
    const directory = path.join(root, '144d-worker-placement-evidence');
    if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory)) {
      const f = path.join(directory, name); assert.equal(fs.statSync(f).mode & 0o777, 0o600); files[name] = JSON.parse(fs.readFileSync(f));
    }
    const serialized = JSON.stringify({result, files});
    for (const privateValue of ['PRIVATE_SSH_STDOUT_SENTINEL','PRIVATE_SSH_STDERR_SENTINEL','PRIVATE_SERVER_ERROR_SENTINEL','PRIVATE_STATUS_SENTINEL','PRIVATE_METADATA_SENTINEL','PRIVATE_SECRET_NAME_SENTINEL','PRIVATE_SECRET_DIGEST_SENTINEL','PRIVATE_LITERAL_SENTINEL','PRIVATE_TRANSPORT_ERROR_SENTINEL','PRIVATE_AUTH_ERROR_SENTINEL','SYNTHETIC_NONCE','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','configSha256','configCapsule','pre-queue','rollback-config','projectRef']) assert(!serialized.includes(privateValue), privateValue);
    assert(Object.keys(files).every(name => ['result.public.json','attempt.json','mirror-attempt.public.json'].includes(name)));
    if (result) assert.deepEqual(files['result.public.json'], result);
    return {result, refusal, updates, leases, releases, mirrorCopies, calls, files, inspections, sshCalls, registryGets};
  } finally { fs.rmSync(root, {recursive: true}); }
}


test('144d binding: exact subject, existing actor/ref/attempt and E4 baseline only', async () => {
  assert.equal(TARGET.source,'144dad959ee7fb9e1387d693bbcc16767edc6620');
  assert.equal(TARGET.digest,'sha256:18941445ab0bca954eaeb592353fb3350d3b615d8d3e4830841e38901f5efa87');
  assert.equal(TARGET.config,'sha256:b612afebb9953ed124449eb6adbf226837e4e45c8f1eb456fdb47ff91a8d066e');
  assert.equal(TARGET.oldSource,'e4d7faef0960c8b453bb88f2bf56456d3220567f');
  assert.equal(TARGET.oldMirror,TARGET.oldDigest);
  assert.equal(TARGET.oldDigest,'sha256:1858985f511a74725c9d45dea1cb7881f53b0b66422e2786615799dcb8e6d31d');
  for (const patch of [{GITHUB_ACTOR_ID:'999'},{GITHUB_JOB:'deploy_e4d7'},{GITHUB_RUN_ATTEMPT:'2'}, {GITHUB_REF:'refs/heads/main'}, {GITHUB_ACTIONS:'false'}, {GITHUB_WORKFLOW_REF:'wrong'}, {INPUT_WORKER_SOURCE_SHA:TARGET.oldSource},{INPUT_WORKER_DIGEST:TARGET.oldDigest}]) assert.throws(()=>requireExecutionContext({...env,...patch}));
  const actor = await scenario('wrong-actor'); assert.equal(actor.calls.length,0); assert.equal(actor.mirrorCopies,0);
  for (const fault of ['old-baa3','old-digest','queue-busy','wrong-project']) {
    const s=await scenario(fault); assert.equal(s.updates,0); assert.equal(s.leases,0); assert.equal(s.mirrorCopies,0); assert.equal(s.result.runtimeQualified,false);
  }
});
test('144d mirror: exact 303-layer destination reused, E4 inverse and one CAS preserve all other config', async () => {
  const s=await scenario(); assert.equal(s.result.runtimeQualified,true); assert.equal(s.result.registryIdentityProven,true);
  assert.deepEqual([s.mirrorCopies,s.result.mirrorAttempts,s.leases,s.updates,s.releases],[0,0,1,1,1]);
  assert.deepEqual(s.sshCalls.map(x=>x.updatesBefore),[0,1]);
  assert.equal(s.calls.filter(c=>c.url.endsWith('/exec')).length,1);
  assert(s.calls.filter(c=>c.url.endsWith('/exec')).every(c=>!c.liveLease));
  const before=beforeMachine(), planned=planUpdate(before,TARGET.digest);
  const next={...before,instance_id:nextVersion,config:planned.body.config,image_ref:{digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}}};
  assert.deepEqual(planRollback(next,nextVersion).config,before.config);
  assert.throws(()=>planRollback(next,version));
  assert.equal(s.result.configuredNonrootProven,true); assert.equal(s.result.configUnchangedExceptImageFields,true);
  assert.equal(s.result.leaseReleased,true); assert.equal(s.result.hostedAccepted,false);
});
test('144d mirror: typed missing destination allows one copy then immutable readback before lease', async () => {
  const s=await scenario('destination-missing');
  assert.deepEqual([s.mirrorCopies,s.result.mirrorAttempts,s.leases,s.updates,s.releases],[1,1,1,1,1]);
  assert.equal(s.inspections.length,3); assert.equal(s.result.registryIdentityProven,true); assert.equal(s.result.runtimeQualified,true);
  assert.equal(s.files['mirror-attempt.public.json'].mirrorAttempts,1);
  assert.equal(s.files['mirror-attempt.public.json'].updateAttempts,0);
});
test('144d mirror: denial unknown missing-config and identity drift never trigger a copy or lease', async () => {
  for (const fault of ['destination-denied','destination-unknown','destination-config-missing','destination-http-null','destination-http-500','destination-config','destination-layers','mirror-digest','wrong-layers','wrong-config']) {
    const s=await scenario(fault); assert.deepEqual([s.mirrorCopies,s.leases,s.updates],[0,0,0]);
    assert.equal(s.result.runtimeQualified,false); assert.equal(s.result.registryIdentityProven,undefined);
  }
  const s=await scenario('destination-denied'); assert.equal(s.result.childFailure.httpStatus,403); assert.equal(s.result.childFailure.stage,'fly_manifest');
});
test('144d mirror: consumed copy error or copied-config drift refuses before lease, without retry', async () => {
  for (const fault of ['copy-error','copied-config-drift']) {
    const s=await scenario(fault); assert.deepEqual([s.mirrorCopies,s.result.mirrorAttempts,s.leases,s.updates],[1,1,0,0]);
    assert.equal(s.result.runtimeQualified,false); assert.equal(s.result.automaticRetry,false); assert.equal(s.result.automaticRollback,false);
    assert.equal(s.result.effectClassification,'MIRROR_ATTEMPTED_NO_MACHINE_UPDATE');
    if(fault==='copy-error') assert.equal(s.result.childFailure.stage,'mirror_copy');
  }
});
test('144d binding: held-lease proof failure and post-CAS failure retain owned release and consumed counters', async () => {
  for (const fault of ['root-user','ssh-json','postlease-queue-busy']) {
    const s=await scenario(fault); assert.deepEqual([s.leases,s.updates,s.releases],[1,0,1]); assert.equal(s.result.leaseReleased,true); assert.equal(s.mirrorCopies,0);
  }
  for (const fault of ['update-indeterminate','post-config-drift','release-error']) {
    const s=await scenario(fault); assert.deepEqual([s.leases,s.updates,s.releases],[1,1,1]); assert.equal(s.result.runtimeQualified,false);
    assert.equal(s.result.automaticRetry,false); assert.equal(s.result.automaticRollback,false);
  }
});
test('144d output: only allowlisted public fields, never a private config commitment', () => {
  const p=publicResult({W:TARGET.source,D:TARGET.digest,rawConfig:'PRIVATE_RAW',secretNames:['PRIVATE_NAMES'],expectedConfigCommitment:'PRIVATE_HASH',nonce:'PRIVATE_NONCE',runtimeQualified:false});
  assert.deepEqual(p,{W:TARGET.source,D:TARGET.digest,runtimeQualified:false});
});

test('typed HTTP provenance: actual-null CLI plus direct 404 and MANIFEST_UNKNOWN permits one verified copy before lease',async()=>{
  const s=await scenario('http-404');
  assert.deepEqual([s.registryGets,s.mirrorCopies,s.leases,s.updates,s.releases],[1,1,1,1,1]);
  assert.equal(s.result.destinationHttpProof.httpStatus,404);assert.equal(s.result.destinationHttpProof.typedMissingProven,true);
  assert.equal(s.result.registryIdentityProven,true);assert.equal(s.result.runtimeQualified,true);
  assert.equal(s.inspections.length,3);assert.deepEqual(s.sshCalls.map(x=>x.updatesBefore),[0,1]);
});
test('typed HTTP provenance: real response null401403500 malformed or redirected is never copied or leased',async()=>{
  for(const fault of ['http-null','http-401','http-403','http-500','http-malformed','http-redirect','http-wrong-url','http-unknown-code','http-duplicate-errors','http-oversize','http-network','http-wrong-manifest','http-wrong-mime','http-404-challenge']){
    const s=await scenario(fault);assert.deepEqual([s.registryGets,s.mirrorCopies,s.leases,s.updates],[1,0,0,0],fault);
    assert.equal(s.result.refusalCode,'destination_http_proof_unproven_no_copy',fault);assert.equal(s.result.runtimeQualified,false);
    const p=s.result.destinationHttpProof;assert.equal(p.typedMissingProven,false);assert.equal(p.manifestExact,false);assert.equal(p.redirectsFollowed,0);
    assert(!JSON.stringify(s.result).includes('PRIVATE_'),fault);
    if(fault==='http-401'){assert.equal(p.httpStatus,401);assert.equal(p.authenticationChallenge,'BEARER');}
    if(fault==='http-500')assert.equal(p.httpStatus,500);
    if(fault==='http-unknown-code')assert.deepEqual(p.errorCodes,['OTHER']);
  }
});
test('typed HTTP provenance: private reference owner modes links and capture drift fail closed without credential output',async()=>{
  for(const fault of ['http-auth-mode','http-auth-hardlink','http-auth-symlink','http-auth-drift']){
    const s=await scenario(fault);assert.deepEqual([s.mirrorCopies,s.leases,s.updates],[0,0,0]);
    assert.equal(s.registryGets,fault==='http-auth-drift'?1:0);assert.equal(s.result.destinationHttpProof.typedMissingProven,false);
    assert.equal(s.result.destinationHttpProof.diagnosticComplete,false);assert(!JSON.stringify(s.result).includes('SYNTHETIC_REGISTRY_ONLY'));
  }
});
test('typed HTTP provenance: one scoped metadata GET retains postcopy fresh queue and own-lease release',async()=>{
  const s=await scenario('http-after-lease-queue-busy');
  assert.deepEqual([s.registryGets,s.mirrorCopies,s.leases,s.updates,s.releases],[1,1,1,0,1]);
  assert.equal(s.result.leaseReleased,true);assert.equal(s.result.automaticRetry,false);assert.equal(s.result.automaticRollback,false);
  assert.equal(s.result.refusalCode,'queue_claimed_not_zero');
});
test('typed HTTP provenance: copied image identity or consumed copy failure never reaches a lease',async()=>{
  for(const fault of ['copy-error','copied-config-drift']){
    const s=await scenario(fault);assert.deepEqual([s.registryGets,s.mirrorCopies,s.leases,s.updates],[1,1,0,0]);
    assert.equal(s.result.mirrorAttempts,1);assert.equal(s.result.runtimeQualified,false);assert.equal(s.result.automaticRetry,false);
  }
});
