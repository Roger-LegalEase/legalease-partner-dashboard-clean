import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync as checkQuotedArgv} from 'node:child_process';
import path from 'node:path';
import {TARGET, placeWorker, requireExecutionContext, planUpdate, planRollback, publicResult, configuredUserState, configuredEffectiveProbeCommand, safeRegistryFailure, inspectAcceptedImage, probeDestinationRegistry, diagnoseEffectiveExec, classifyExecFailure, requireObservedConfiguration, requireObservedHandoff, observeAppliedWorker} from './place-e4d7-worker.mjs';

import {effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

// Synthetic transport and credentials only. This imports the actual module; no provider is contacted.
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_JOB: 'deploy_e4d7', GITHUB_WORKFLOW_REF: 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release', GITHUB_REPOSITORY_ID: '1248656766', GITHUB_ACTOR_ID: '287531360',
  GITHUB_REPOSITORY: 'Roger-LegalEase/legalease-partner-dashboard-clean', GITHUB_REF: 'refs/heads/captain-release', GITHUB_RUN_ATTEMPT: '1',
  GITHUB_SHA: '1'.repeat(40), GITHUB_RUN_ID: '123456789', INPUT_WORKER_SOURCE_SHA: TARGET.source, INPUT_WORKER_DIGEST: TARGET.digest,
  RCAP_WORKER_REGISTRY_READONLY: 'false', FLY_API_TOKEN: 'SYNTHETIC_FLY_ONLY', SUPABASE_ACCESS_TOKEN: 'SYNTHETIC_DB_ONLY', RCAP_FLY_IMAGE_DIGEST: TARGET.digest, DOCKER_CONFIG: '/tmp/synthetic-auth-reference',
};
const version = 'SYNTHETICBEFORE001', nextVersion = 'SYNTHETICAFTER0001';
const beforeMachine = () => ({id: TARGET.machine, state: 'started', instance_id: version,
  image_ref: {digest: TARGET.oldMirror, labels: {'org.opencontainers.image.revision': TARGET.oldSource}},
  config: {image: `registry.fly.io/${TARGET.app}@${TARGET.oldMirror}`, env: {NODE_ENV: 'production', ENABLE_SUPABASE_PARTNER_DATA: 'true', RCAP_WORKER_CLAIM_SECONDS: '600', RCAP_WORKER_CONTAINER_DIGEST: TARGET.oldDigest, SUPABASE_URL: `https://${TARGET.project}.supabase.co`, NEXT_PUBLIC_SUPABASE_URL: `https://${TARGET.project}.supabase.co`},
    restart: {policy: 'always'}, guest: {memory_mb: 1024, cpu_kind: 'shared', cpus: 1}, services: [], init: {}, stop_config: {signal: 'SIGTERM', timeout: '30s'}, metadata: {fly_release_id: 'PRIVATE_METADATA_SENTINEL'}, secrets: [{name: 'PRIVATE_SECRET_NAME_SENTINEL', env_var: 'PRIVATE_SECRET_NAME_SENTINEL'}]}});
const image = () => ({Id: TARGET.config, Os: 'linux', Architecture: 'amd64', Config: {Labels: {'org.opencontainers.image.revision': TARGET.source}}, RootFS: {Layers: Array(250).fill('sha256:'+'a'.repeat(64))}, ManifestDigest: TARGET.digest});
const names = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const queueRow = () => ({current_user: 'postgres', session_user: 'postgres', transaction_read_only: 'on', status_counts: {}, ...Object.fromEntries(['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'].map(k => [k, 0])), exposed_work: []});
const effective = () => ({schemaVersion: 'qualified-worker-effective-binding/v1', machineId: TARGET.machine, projectRef: TARGET.project, passed: true, roleProven: true, secretValuesIncluded: false, customerRowsRead: false, queueHeadStatus: 200, configuredUserProven: true});
async function scenario(fault = '', writer = placeWorker) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e4d7-writer-test-'));
  const original = beforeMachine(), calls = [], commands = [], files = {}, inspections = [], sshCalls = [];
  let after, updates = 0, leases = 0, releases = 0, mirrorCopies = 0, nameCalls = 0;
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
    if (fault === 'mirror-error') throw Error('PRIVATE_AUTH_ERROR_SENTINEL');
    return '';
  };
  const inspectImage = ref => {
    inspections.push(ref);
    assert.equal(leases, 0); assert.equal(updates, 0);
    if (ref.startsWith('registry.fly.io/')) {
      assert.equal(ref, `registry.fly.io/${TARGET.app}@${TARGET.digest}`);
      if (fault === 'destination-missing') throw Object.assign(Error('registry_child_failed'), {childFailure: safeRegistryFailure({status:1, stderr:'manifest unknown'}, 'fly_manifest', 10)});
    }
    if (fault === 'registry-denied') throw Error('request_HTTP_403');
    const r = image();
    if (fault === 'wrong-layers') r.RootFS.Layers.pop();
    if (fault === 'destination-config' && ref.startsWith('registry.fly.io/')) r.Id = 'sha256:'+'0'.repeat(64);
    if (fault === 'destination-layers' && ref.startsWith('registry.fly.io/')) r.RootFS.Layers.pop();
    if (fault === 'wrong-config') r.Id = 'sha256:'+'0'.repeat(64);
    if (fault === 'mirror-digest' && ref.startsWith('registry.fly.io/')) r.ManifestDigest = 'sha256:'+'b'.repeat(64);
    return r;
  };
  const request = async (url, options) => {
    const liveLease = leases > releases, nonceAttached = Object.hasOwn(options.headers, 'fly-machine-lease-nonce');
    calls.push({url, method: options.method, liveLease, nonceAttached});
    assert.equal(options.redirect, 'error');
    const response = value => ({ok: true, status: 200, json: async () => structuredClone(value)});
    if (url.includes('/database/query')) {
      assert.equal(url, `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`);
      assert.equal(nonceAttached, false); assert.equal(options.headers.Authorization, `Bearer ${actualEnv.SUPABASE_ACCESS_TOKEN}`);
      if (fault === 'postlease-queue-http' && liveLease && !updates) return {ok:false, status:409};
      const body = JSON.parse(options.body); assert(body.query.startsWith('BEGIN READ ONLY;')); assert(!/insert|update|delete/i.test(body.query));
      const q = queueRow(); if (fault === 'queue-busy' || (fault === 'postlease-queue-busy' && liveLease)) q.claimed = 1;
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
      if (writer === diagnoseEffectiveExec) { assert.deepEqual(Object.keys(body).sort(), ['command','timeout']); assert.deepEqual(body.command, effectiveProbeCommand(TARGET.machine)); }
      const proof = effective(); if (fault === 'wrong-project') proof.projectRef = 'wrongproject'; if (fault === 'root-user' && body.command[2].includes('configuredUserProven')) proof.configuredUserProven = false;
      return response({exit_code: 0, stdout: JSON.stringify(proof), stderr: ''});
    }
    if (url.endsWith('/lease')) {
      if (options.method === 'DELETE') { releases++; assert.equal(options.headers['fly-machine-lease-nonce'], 'SYNTHETIC_NONCE'); if (fault === 'release-error') return {ok: false, status: 503}; return response({}); }
      leases++; assert.equal(updates, 0); assert.deepEqual(JSON.parse(options.body), {description: `e4d7-${env.GITHUB_RUN_ID}`, ttl: 300});
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
  const actualEnv = {...env, ...(fault === 'wrong-actor' ? {GITHUB_ACTOR_ID: '999'} : {})};
  try {
    let result, refusal;
    try { result = await writer({env: actualEnv, request, command, inspectImage, ssh, root, now: () => 1000, sleep: async () => { throw Error('unnecessary_poll'); }}); }
    catch (error) { refusal = error.message; }
    const directory = path.join(root, 'e4d7-worker-placement-evidence');
    if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory)) {
      const f = path.join(directory, name); assert.equal(fs.statSync(f).mode & 0o777, 0o600); files[name] = JSON.parse(fs.readFileSync(f));
    }
    const serialized = JSON.stringify({result, files});
    for (const privateValue of ['PRIVATE_SSH_STDOUT_SENTINEL','PRIVATE_SSH_STDERR_SENTINEL','PRIVATE_SERVER_ERROR_SENTINEL','PRIVATE_STATUS_SENTINEL','PRIVATE_METADATA_SENTINEL','PRIVATE_SECRET_NAME_SENTINEL','PRIVATE_SECRET_DIGEST_SENTINEL','PRIVATE_LITERAL_SENTINEL','PRIVATE_TRANSPORT_ERROR_SENTINEL','PRIVATE_AUTH_ERROR_SENTINEL','SYNTHETIC_NONCE','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','configSha256','configCapsule','pre-queue','rollback-config','projectRef']) assert(!serialized.includes(privateValue), privateValue);
    assert(Object.keys(files).every(name => ['result.public.json','attempt.json'].includes(name)));
    if (result) assert.deepEqual(files['result.public.json'], result);
    return {result, refusal, updates, leases, releases, mirrorCopies, calls, files, inspections, sshCalls};
  } finally { fs.rmSync(root, {recursive: true}); }
}

test('owned lease request contract: exact retained mirror, scoped nonce and one guarded update', async () => {
  const s = await scenario(); assert.equal(s.result.runtimeQualified, true); assert.equal(s.updates, 1); assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.mirrorCopies, 0);
  assert.equal(s.result.mirrorAttempts, 0); assert.equal(s.result.registryIdentityProven, true);
  assert.deepEqual(s.inspections, [`ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, `registry.fly.io/${TARGET.app}@${TARGET.digest}`]);
  assert.equal(s.sshCalls.length, 2);
  assert(s.calls.some(c => c.liveLease && c.method === 'GET' && c.nonceAttached));
  assert(s.calls.filter(c => !c.liveLease || c.url.includes('/database/query')).every(c => !c.nonceAttached));
  assert.equal(s.result.configUnchangedExceptImageFields, true); assert.equal(s.result.hostedAccepted, false); assert.equal(s.result.automaticRetry, false); assert.equal(s.result.automaticRollback, false); assert.equal(s.result.handoff.requestedStop, true);
});
test('actual context and tuple checks refuse forks, other actors, reruns and old/partial subjects', async () => {
  for (const patch of [{GITHUB_ACTIONS:'false'}, {GITHUB_JOB:'another_job'}, {GITHUB_WORKFLOW_REF:'wrong'}, {GITHUB_EVENT_NAME:'push'}, {GITHUB_REPOSITORY_ID:'999'}, {GITHUB_REF:'refs/heads/main'}, {GITHUB_RUN_ATTEMPT:'2'}, {INPUT_WORKER_SOURCE_SHA:TARGET.oldSource}, {INPUT_WORKER_DIGEST:TARGET.oldDigest}]) assert.throws(() => requireExecutionContext({...env,...patch}), /refused/);
  const s = await scenario('wrong-actor'); assert.equal(s.refusal, 'execution_context_refused'); assert.equal(s.calls.length,0); assert.equal(s.mirrorCopies,0);
});
test('registry denial and wrong image config/layers stop before any Fly read or effect', async () => {
  for (const fault of ['registry-denied','wrong-layers','wrong-config']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.calls.length,0); assert.equal(s.mirrorCopies,0); assert.equal(s.updates,0); }
});
test('old target, secret names, busy queue, wrong effective project and private config refuse before mirror/lease/update', async () => {
  for (const fault of ['old-digest','secret-missing','queue-busy','wrong-project','private-config-field','mount-override']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.mirrorCopies,0); assert.equal(s.leases,0); assert.equal(s.updates,0); }
});
test('owned lease request contract: absent or mismatched retained mirror refuses without a copy or lease', async () => {
  for (const fault of ['destination-missing','destination-config','destination-layers','mirror-digest','secret-drift']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.result.mirrorAttempts,0); assert.equal(s.mirrorCopies,0); assert.equal(s.leases,0); assert.equal(s.updates,0); assert.equal(s.result.registryIdentityProven ?? false, fault === 'secret-drift'); }
});
test('lease version drift releases only its own nonce and never updates', async () => {
  const s=await scenario('lease-drift'); assert.equal(s.result.refusalCode,'lease_version_unproven'); assert.equal(s.leases,1); assert.equal(s.releases,1); assert.equal(s.updates,0);
});
test('indeterminate first update and poststate drift remain consumed; no retry/rollback', async () => {
  for (const fault of ['update-indeterminate','post-config-drift']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.updates,1); assert.equal(s.result.updateAttempts,1); assert.equal(s.releases,1); assert.equal(s.result.automaticRetry,false); assert.equal(s.result.automaticRollback,false); }
});
test('own lease-release failure cannot report a qualified runtime', async () => {
  const s=await scenario('release-error'); assert.equal(s.result.runtimeQualified,false); assert.equal(s.result.leaseReleased,false); assert.equal(s.updates,1); assert.equal(s.releases,1);
});
test('two-field inverse exactly preserves unrelated config and requires Root-reviewed current version', () => {
  const before=beforeMachine(), original=structuredClone(before), plan=planUpdate(before,TARGET.digest);
  assert.deepEqual(before,original);
  const current={...before,instance_id:nextVersion,config:plan.body.config,image_ref:{digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}}};
  const rollback=planRollback(current,nextVersion); assert.deepEqual(rollback.config,before.config); assert.equal(rollback.current_version,nextVersion);
  assert.throws(() => planRollback(current,version), /rollback_current_version_unproven/);
  assert.throws(() => planRollback({...current,image_ref:before.image_ref},nextVersion), /rollback_subject_drift/);
});
test('public projection excludes full configuration, raw queue/effective/capsule, hashes and unreviewed fields', () => {
  assert.deepEqual(publicResult({W:TARGET.source,D:TARGET.digest,config:beforeMachine().config,configSha256:'PRIVATE_HASH',raw:{token:'PRIVATE_VALUE'},postMachineProof:{},queue:{},effective:{},rollback:{}}),{W:TARGET.source,D:TARGET.digest});
});

test('configured actual-worker UID and both traversal roots are required by the preserved effective probe', () => {
  const proc = {readFileSync: file => {assert.equal(file, '/proc/42/status'); return 'Uid: 999 999 999 999\n';}, statSync: file => {assert(['/', '/app'].includes(file)); return {mode: 0o40755};}};
  assert.equal(configuredUserState(proc,42),true);
  assert.equal(configuredUserState({...proc,readFileSync:()=> 'Uid: 0 0 0 0\n'},42),false);
  assert.equal(configuredUserState({...proc,statSync:()=>({mode:0o40754})},42),false);
  const command=configuredEffectiveProbeCommand(); assert.deepEqual(command.slice(0,2),['node','-e']); assert(command[2].includes('inspectEffectiveWorker')); assert(command[2].includes('configuredUserProven')); new Function(command[2]);
});


test('safe registry diagnostic preserves only structural child facts and recognized HTTP/missing reports', () => {
  const raw = Object.assign(new Error('PRIVATE_DIAGNOSTIC_MARKER headers/config'), {code:'ETIMEDOUT', status:null, signal:'SIGTERM', killed:true, stdout:Buffer.from('PRIVATE_DIAGNOSTIC_MARKER'), stderr:Buffer.from('status code: 403 PRIVATE_DIAGNOSTIC_MARKER')});
  const facts=safeRegistryFailure(raw,'mirror_copy',180003);
  assert.deepEqual(facts,{stage:'mirror_copy',code:'ETIMEDOUT',status:null,signal:'SIGTERM',killed:true,timeout:true,elapsedMs:180003,httpStatus:403,reportedReason:'HTTP_STATUS_REPORTED',httpClass:'AUTH_4XX',manifestMissingReported:false,authenticationRefusedReported:false});
  assert(!JSON.stringify(facts).includes('PRIVATE_DIAGNOSTIC_MARKER'));
  const unknown=safeRegistryFailure({code:'PRIVATE_DIAGNOSTIC_MARKER',signal:'PRIVATE_DIAGNOSTIC_MARKER',status:'403',stderr:'https://private.invalid/403 PRIVATE_DIAGNOSTIC_MARKER'},'PRIVATE_DIAGNOSTIC_MARKER',-1);
  assert.equal(unknown.code,null);assert.equal(unknown.signal,null);assert.equal(unknown.status,null);assert.equal(unknown.httpStatus,null);assert.equal(unknown.elapsedMs,null);assert.equal(unknown.timeout,null);assert.equal(unknown.manifestMissingReported,false);assert(!JSON.stringify(unknown).includes('PRIVATE_DIAGNOSTIC_MARKER'));
  const missing=safeRegistryFailure({status:1,stderr:'manifest unknown: manifest unknown'},'fly_manifest',7);assert.equal(missing.manifestMissingReported,true);assert.equal(missing.httpStatus,null);
  const ambiguous=safeRegistryFailure({stderr:'status code: 401\nstatus code: 404'},'fly_manifest',7);assert.equal(ambiguous.httpStatus,null);assert.equal(ambiguous.manifestMissingReported,false);
});
test('safe registry diagnostic survives unchanged helper redaction and distinguishes manifest/config stages', () => {
  for(const config of [false,true]) {
    let seen=[];const command=(tool,args,options)=>{seen.push(args);assert.equal(tool,'skopeo');assert.equal(options.timeout,30000);assert.equal(options.maxBuffer,1048576);
      if(config&&!args.includes('--config'))return Buffer.from('{}');
      throw Object.assign(Error('PRIVATE_DIAGNOSTIC_MARKER'),{code:'ETIMEDOUT',status:null,signal:'SIGTERM',stderr:Buffer.from('PRIVATE_DIAGNOSTIC_MARKER')});
    };
    assert.throws(()=>inspectAcceptedImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`,{env,command}),error=>{
      assert.equal(error.message,'registry_inspection_failed');assert.equal(error.childFailure.stage,config?'fly_config':'fly_manifest');assert.equal(error.childFailure.timeout,true);assert(!JSON.stringify(error.childFailure).includes('PRIVATE_DIAGNOSTIC_MARKER'));return true;
    });assert.equal(seen.length,config?2:1);
  }
});
function diagnosticHarness(fault='') {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'e4d7-diagnostic-test-'));fs.chmodSync(root,0o700);
  const auth=path.join(root,'auth');fs.mkdirSync(auth,{mode:0o700});fs.chmodSync(auth,0o700);
  const fd=fs.openSync(path.join(auth,'config.json'),'wx',0o600);try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,'SYNTHETIC_PRIVATE_AUTH_NOT_READ');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  const actualEnv={...env,DOCKER_CONFIG:auth,RCAP_WORKER_REGISTRY_READONLY:'true'}, calls=[],inspections=[];
  const failure=(text,status=1)=>Object.assign(Error('PRIVATE_DIAGNOSTIC_MARKER'),{status,stderr:Buffer.from(text)});
  const inspectImage=ref=>{
    inspections.push(ref);assert.equal(ref,`registry.fly.io/${TARGET.app}@${TARGET.digest}`);
    if(['missing','denied','unknown404','timedout-missing'].includes(fault)) {
      const native=failure(fault==='missing'?'manifest unknown: manifest unknown':fault==='denied'?'status code: 403 PRIVATE_DIAGNOSTIC_MARKER':'status code: 404 PRIVATE_DIAGNOSTIC_MARKER');
      if(fault==='timedout-missing')Object.assign(native,{code:'ETIMEDOUT',status:null,signal:'SIGTERM',stderr:Buffer.from('manifest unknown: manifest unknown')});
      const error=Error('registry_inspection_failed');error.childFailure=safeRegistryFailure(native,'fly_manifest',3);throw error;
    }
    const accepted=image();if(fault==='wrong-config')accepted.Id='sha256:'+'0'.repeat(64);return accepted;
  };
  const command=(tool,args,options)=>{
    calls.push({tool,args});assert.equal(tool,'skopeo');assert.equal(args[0],'inspect');assert(!args.includes('copy'));assert(args.includes('--raw'));assert.equal(args.at(-1),`docker://registry.fly.io/${TARGET.app}:${TARGET.source}`);assert.equal(options.timeout,30000);
    if(fault==='different-tag')return Buffer.from('SYNTHETIC_DIFFERENT_MANIFEST_NOT_EXPORTED');
    throw failure('manifest unknown: manifest unknown PRIVATE_DIAGNOSTIC_MARKER');
  };
  return {root,actualEnv,calls,inspections,run:()=>probeDestinationRegistry({env:actualEnv,command,inspectImage,root}),cleanup:()=>fs.rmSync(root,{recursive:true})};
}
function requireDiagnosticPrivacy(h,result) {
  const text=fs.readFileSync(path.join(h.root,'e4d7-worker-placement-evidence/result.public.json'),'utf8');assert.deepEqual(JSON.parse(text),result);
  for(const value of ['PRIVATE_DIAGNOSTIC_MARKER','SYNTHETIC_PRIVATE_AUTH_NOT_READ','SYNTHETIC_DIFFERENT_MANIFEST_NOT_EXPORTED','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','authFile','stderr','stdout','registryAuth','configSha256'])assert(!text.includes(value),value);
  assert.equal(fs.statSync(path.join(h.root,'e4d7-worker-placement-evidence/result.public.json')).mode&0o777,0o600);
  assert.equal(result.mirrorAttempts,0);assert.equal(result.leaseAttempts,0);assert.equal(result.updateAttempts,0);assert.equal(result.runtimeQualified,false);assert.equal(result.hostedAccepted,false);assert.equal(result.copyWriteCapabilityTested,false);assert.equal(result.effectClassification,'READ_ONLY_NO_PROVIDER_WRITES');
}
test('destination registry diagnostic accepts exact digest reuse while reporting missing known W tag with zero effects',()=>{
  const h=diagnosticHarness();try{const result=h.run();requireDiagnosticPrivacy(h,result);assert.equal(result.acceptedDigestReusable,true);assert.equal(result.destinationDigest.state,'EXACT');assert.equal(result.destinationTag.state,'MISSING_REPORTED');assert.equal(result.diagnosticComplete,true);assert.equal(h.calls.length,1);assert.equal(h.inspections.length,1);assert.throws(()=>h.run(),/EEXIST/);}finally{h.cleanup();}
});
test('destination registry diagnostic distinguishes named missing references from an unproven authorization-masked404',()=>{
  for(const fault of ['missing','unknown404','timedout-missing']){const h=diagnosticHarness(fault);try{const result=h.run();requireDiagnosticPrivacy(h,result);assert.equal(result.acceptedDigestReusable,false);assert.equal(result.diagnosticComplete,fault==='missing');assert.equal(h.calls.length,fault==='missing'?1:0);assert.equal(result.destinationDigest.state,fault==='missing'?'MISSING_REPORTED':'FAILED');}finally{h.cleanup();}}
});
test('destination registry diagnostic stops after auth or identity refusal without trying another reference',()=>{
  for(const fault of ['denied','wrong-config']){const h=diagnosticHarness(fault);try{const result=h.run();requireDiagnosticPrivacy(h,result);assert.equal(result.diagnosticComplete,false);assert.equal(result.acceptedDigestReusable,false);assert.equal(h.calls.length,0);assert.equal(result.destinationTag.state,'NOT_ATTEMPTED_AFTER_REFUSAL');}finally{h.cleanup();}}
});
test('destination registry diagnostic refuses a different tag digest without exposing its body/hash or recopying',()=>{
  const h=diagnosticHarness('different-tag');try{const result=h.run();requireDiagnosticPrivacy(h,result);assert.equal(result.destinationTag.state,'OTHER_DIGEST_REFUSED');assert.equal(result.acceptedDigestReusable,true);assert.equal(result.diagnosticComplete,true);}finally{h.cleanup();}
});
test('destination registry diagnostic requires real context/private modes and cannot enter the writer',async()=>{
  const h=diagnosticHarness();try{
    assert.throws(()=>probeDestinationRegistry({env:{...h.actualEnv,GITHUB_ACTOR_ID:'999'},command:()=>{throw Error('forbidden');},root:h.root}),/execution_context_refused/);
    assert.throws(()=>probeDestinationRegistry({env:{...h.actualEnv,RCAP_WORKER_REGISTRY_READONLY:'false'},command:()=>{throw Error('forbidden');},root:h.root}),/readonly_diagnostic_mode_required/);
    await assert.rejects(placeWorker({env:h.actualEnv,root:h.root}),/readonly_mode_refuses_writer/);
    fs.chmodSync(path.join(h.actualEnv.DOCKER_CONFIG,'config.json'),0o644);assert.throws(()=>h.run(),/private_registry_auth_modes_refused/);assert.equal(h.calls.length,0);assert.equal(h.inspections.length,0);
  }finally{h.cleanup();}
});


test('safe registry diagnostic Skopeo-format classes retain facts without exposing native output', () => {
  const cases = [
    ['Requesting bearer token: invalid status code from registry 403 (Forbidden)',403,'TOKEN_EXCHANGE_FAILURE',false],
    ['Error pinging docker registry registry.fly.io: StatusCode: 404, body withheld',404,'REGISTRY_PING_FAILURE',false],
    ['reading manifest sha256:example: manifest unknown',null,'MANIFEST_UNKNOWN_REPORTED',true],
    ['name unknown: repository not found',null,'REPOSITORY_UNKNOWN_REPORTED',false],
    ['unauthorized',null,'AUTHENTICATION_REFUSED_REPORTED',false],
    ['x509: certificate signed by unknown authority',null,'TLS_VERIFICATION_OR_HANDSHAKE_FAILURE',false],
    ['dial tcp: lookup registry.fly.io: no such host',null,'DNS_LOOKUP_FAILURE',false],
    ['dial tcp: connection refused',null,'NETWORK_CONNECTION_FAILURE',false],
    ['error getting credentials - err: exec: docker-credential-example: executable file not found',null,'CREDENTIAL_HELPER_FAILURE',false],
    ['invalid auth format base64',null,'AUTHFILE_FORMAT_FAILURE',false],
    ['unknown flag: --authfile',null,'TOOL_INTERFACE_REFUSED',false],
    ['unsupported manifest MIME type',null,'MANIFEST_MEDIA_TYPE_REFUSED',false],
    ['status code: 401\nStatusCode: 404',null,'MULTIPLE_HTTP_STATUSES_REPORTED',false],
    ['Unrecognized native reason https://credential@example.invalid/403',null,'UNCLASSIFIED',false],
  ];
  for (const [text,http,reason,missing] of cases) {
    const error=Object.assign(Error('PRIVATE_DIAGNOSTIC_SECRET_MARKER'),{status:1,signal:null,stderr:Buffer.from(text+' PRIVATE_DIAGNOSTIC_SECRET_MARKER'),stdout:Buffer.from('PRIVATE_DIAGNOSTIC_SECRET_MARKER')});
    const facts=safeRegistryFailure(error,'fly_manifest',764);assert.equal(facts.status,1);assert.equal(facts.timeout,false);assert.equal(facts.elapsedMs,764);assert.equal(facts.httpStatus,http,text);assert.equal(facts.reportedReason,reason,text);assert.equal(facts.manifestMissingReported,missing,text);
    const encoded=JSON.stringify(facts);for(const value of ['PRIVATE_DIAGNOSTIC_SECRET_MARKER','credential@example','docker-credential-example','stderr','stdout','authfile'])assert(!encoded.includes(value),value);
    assert.equal(facts.code,null);assert.equal(facts.signal,null);assert.equal(facts.killed,null);
  }
});


test('owned lease request contract: safe operation attribution and consumed first failures preserve privacy', async () => {
  for (const [fault, operation, updates, code] of [
    ['postlease-queue-http', 'SUPABASE_QUEUE_READONLY_QUERY', 0, 'request_HTTP_409'],
    ['ssh-denied', 'FLY_MACHINE_EFFECTIVE_SSH', 0, 'effective_ssh_transport_refused'],
    ['ssh-timeout', 'FLY_MACHINE_EFFECTIVE_SSH', 0, 'effective_ssh_transport_refused'],
    ['postupdate-read-http', 'FLY_MACHINE_READ', 1, 'request_HTTP_409'],
  ]) {
    const s = await scenario(fault);
    assert.equal(s.result.refusalCode, code); assert.equal(s.result.requestFailureOperation, operation);
    assert.equal(s.result.runtimeQualified, false); assert.equal(s.result.mirrorAttempts, 0); assert.equal(s.mirrorCopies, 0);
    assert.equal(s.updates, updates); assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.result.leaseReleased, true);
    assert.equal(s.result.automaticRetry, false); assert.equal(s.result.automaticRollback, false);
    assert.equal(s.result.effectClassification, updates ? 'MACHINE_UPDATE_ATTEMPTED_EFFECT_UNPROVEN' : 'LEASE_ATTEMPTED_NO_MACHINE_UPDATE');
  }
  const release = await scenario('release-error');
  assert.equal(release.result.runtimeQualified, false); assert.equal(release.result.leaseReleased, false);
  assert.equal(release.result.releaseFailureOperation, 'FLY_MACHINE_LEASE_RELEASE');
  assert.equal(release.updates, 1); assert.equal(release.releases, 1); assert.equal(release.mirrorCopies, 0);
});


test('exec refusal diagnostic: exact existing probe under own lease has zero image or machine update calls', async () => {
  const s = await scenario('', diagnoseEffectiveExec);
  assert.equal(s.result.operation, 'OWNED_LEASE_EFFECTIVE_EXEC_DIAGNOSTIC');
  assert.equal(s.result.execProbePassed, true); assert.equal(s.result.diagnosticComplete, true);
  assert.equal(s.result.runtimeQualified, false); assert.equal(s.result.hostedAccepted, false);
  assert.equal(s.updates, 0); assert.equal(s.mirrorCopies, 0); assert.equal(s.inspections.length, 0);
  assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.result.leaseReleased, true);
  assert.equal(s.result.machineUnchangedDuringDiagnostic, true);
  assert.equal(s.calls.filter(c => c.url.endsWith('/exec')).length, 2);
  assert(s.calls.some(c => c.liveLease && c.url.endsWith('/exec') && c.nonceAttached));
});
test('exec refusal diagnostic: bounded actual response classification preserves original HTTP and private output', async () => {
  for (const [fault, state, reasons] of [
    ['postlease-exec-http','JSON_OBJECT',['LEASE_CONFLICT_REPORTED']],
    ['postlease-exec-unknown','JSON_OBJECT',['UNCLASSIFIED']],
    ['postlease-exec-oversized','TOO_LARGE',['UNCLASSIFIED']],
  ]) {
    const s = await scenario(fault, diagnoseEffectiveExec);
    assert.equal(s.result.refusalCode, 'request_HTTP_409'); assert.equal(s.result.requestFailureOperation, 'FLY_MACHINE_EFFECTIVE_EXEC');
    assert.equal(s.result.execFailure.httpStatus, 409); assert.equal(s.result.execFailure.phase, 'UNDER_OWN_LEASE');
    assert.equal(s.result.execFailure.bodyState, state); assert.deepEqual(s.result.execFailure.reportedReasons, reasons);
    assert.equal(s.result.diagnosticComplete, true); assert.equal(s.result.runtimeQualified, false);
    assert.equal(s.updates, 0); assert.equal(s.mirrorCopies, 0); assert.equal(s.inspections.length, 0);
    assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.result.leaseReleased, true);
  }
});
test('exec refusal diagnostic: existing queue role actor version and cleanup refusals cannot become an update', async () => {
  for (const fault of ['queue-busy','wrong-project','wrong-actor','lease-drift','release-error']) {
    const s = await scenario(fault, diagnoseEffectiveExec);
    assert.equal(s.updates, 0); assert.equal(s.mirrorCopies, 0); assert.equal(s.inspections.length, 0);
    if (s.result) { assert.equal(s.result.diagnosticComplete, false); assert.equal(s.result.runtimeQualified, false); assert.equal(s.result.effectClassification, s.leases ? 'LEASE_ATTEMPTED_NO_MACHINE_UPDATE' : 'NO_WRITES_ATTEMPTED'); }
    if (fault === 'lease-drift') { assert.equal(s.result.refusalCode, 'lease_version_unproven'); assert.equal(s.releases, 1); assert(!s.calls.some(c => c.liveLease && c.url.endsWith('/exec'))); }
    if (fault === 'release-error') { assert.equal(s.result.leaseReleased, false); assert.equal(s.releases, 1); }
  }
});
test('exec refusal diagnostic: classifier emits only fixed semantic labels and unknown stays unknown', () => {
  for (const [error, expected] of [
    ['invalid command request', 'REQUEST_SCHEMA_REPORTED'], ['machine is not running', 'STATE_CONFLICT_REPORTED'],
    ['current version mismatch', 'VERSION_CONFLICT_REPORTED'], ['another exec in progress', 'EXEC_BUSY_REPORTED'],
    ['permission denied', 'PERMISSION_REFUSAL_REPORTED'], ['exec not supported', 'EXEC_UNSUPPORTED_REPORTED'],
    ['connection refused', 'EXEC_TRANSPORT_REPORTED'], ['deadline exceeded', 'EXEC_DEADLINE_REPORTED'],
    ['PRIVATE_SERVER_ERROR_SENTINEL', 'UNCLASSIFIED'],
  ]) {
    const r = classifyExecFailure(409, JSON.stringify({error, message:'PRIVATE_SERVER_ERROR_SENTINEL', status:'PRIVATE_STATUS_SENTINEL', nonce:'PRIVATE_NONCE_SENTINEL', config:{token:'PRIVATE_TOKEN_SENTINEL'}}));
    assert(r.reportedReasons.includes(expected)); assert.equal(r.httpStatus,409); assert.deepEqual(r.statusCodes,[]);
    for (const value of ['PRIVATE_', 'nonce', 'config', 'token']) assert(!JSON.stringify(r).includes(value));
  }
  assert.equal(classifyExecFailure(409,'not JSON PRIVATE_SERVER_ERROR_SENTINEL').bodyState,'NON_JSON');
  assert.equal(classifyExecFailure(409,'[]').bodyState,'JSON_OTHER');
});


test('held lease SSH correction: fixed command proves configured UID and binding before and after one zero-copy CAS', async () => {
  const s=await scenario();
  assert.equal(s.result.runtimeQualified,true); assert.equal(s.result.configuredNonrootProven,true);
  assert.equal(s.result.registryIdentityProven,true); assert.equal(s.mirrorCopies,0); assert.equal(s.result.mirrorAttempts,0);
  assert.equal(s.updates,1); assert.equal(s.leases,1); assert.equal(s.releases,1); assert.equal(s.result.leaseReleased,true);
  assert.deepEqual(s.sshCalls.map(c=>c.updatesBefore),[0,1]);
  assert.equal(s.calls.filter(c=>c.url.endsWith('/exec')).length,1);
  assert(s.calls.filter(c=>c.url.endsWith('/exec')).every(c=>!c.liveLease));
  assert.equal(s.result.configUnchangedExceptImageFields,true); assert.equal(s.result.nativeHandoffProven,true);
  assert.equal(s.result.hostedAccepted,false); assert.equal(s.result.automaticRetry,false); assert.equal(s.result.automaticRollback,false);
});
test('held lease SSH correction: transport state parse UID role and target failures release own lease before any update', async () => {
  for (const [fault, code] of [
    ['ssh-denied','effective_ssh_transport_refused'], ['ssh-timeout','effective_ssh_transport_refused'],
    ['ssh-state','effective_ssh_transport_refused'], ['ssh-stderr','effective_ssh_transport_refused'],
    ['ssh-json','effective_binding_proof_json_refused'], ['root-user','configured_nonroot_runtime_unproven'],
    ['ssh-project','effective_binding_unproven'], ['ssh-role','effective_binding_unproven'], ['ssh-machine','effective_binding_unproven'],
  ]) {
    const s=await scenario(fault); assert.equal(s.result.refusalCode,code);
    assert.equal(s.result.requestFailureOperation,'FLY_MACHINE_EFFECTIVE_SSH');
    assert.equal(s.updates,0); assert.equal(s.mirrorCopies,0); assert.equal(s.leases,1); assert.equal(s.releases,1); assert.equal(s.result.leaseReleased,true);
    assert.equal(s.result.runtimeQualified,false); assert.equal(s.sshCalls.length,1);
    if(fault==='ssh-denied') assert.equal(s.result.transportFailure.reportedReason,'SSH_CAPABILITY_REFUSED_REPORTED');
    if(fault==='ssh-timeout') {assert.equal(s.result.transportFailure.code,'ETIMEDOUT');assert.equal(s.result.transportFailure.timeout,true);assert.equal(s.result.transportFailure.signal,'SIGKILL');}
    if(fault==='ssh-state') assert.equal(s.result.transportFailure.reportedReason,'TARGET_NOT_STARTED_REPORTED');
  }
});
test('held lease SSH correction: interface lease queue and config guards fail closed; consumed failures never retry', async () => {
  for(const fault of ['ssh-version','ssh-interface','lease-drift','postlease-queue-busy','prelease-config-drift']) {
    const s=await scenario(fault);assert.equal(s.updates,0);assert.equal(s.mirrorCopies,0);assert.equal(s.result.runtimeQualified,false);
    assert.equal(s.sshCalls.length,0);
    if(['lease-drift','postlease-queue-busy'].includes(fault)){assert.equal(s.leases,1);assert.equal(s.releases,1);assert.equal(s.result.leaseReleased,true);}
    else assert.equal(s.leases,0);
  }
  for(const fault of ['post-config-drift','update-indeterminate','release-error']) {
    const s=await scenario(fault);assert.equal(s.updates,1);assert.equal(s.releases,1);assert.equal(s.result.runtimeQualified,false);
    assert.equal(s.result.automaticRetry,false);assert.equal(s.result.automaticRollback,false);assert.equal(s.mirrorCopies,0);
  }
});


test('applied worker observer: current config predicates do not claim private profile equality', () => {
  const machine=beforeMachine();machine.config.image=`registry.fly.io/${TARGET.app}@${TARGET.digest}`;machine.config.env.RCAP_WORKER_CONTAINER_DIGEST=TARGET.digest;
  machine.image_ref={digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}};
  assert.doesNotThrow(()=>requireObservedConfiguration(machine));
  const otherValidConfig=structuredClone(machine);otherValidConfig.config.guest.cpus=2;
  assert.doesNotThrow(()=>requireObservedConfiguration(otherValidConfig));
  for(const mutate of [m=>m.image_ref.digest=TARGET.oldDigest,m=>m.image_ref.labels['org.opencontainers.image.revision']=TARGET.oldSource,m=>m.config.env.RCAP_WORKER_CONTAINER_DIGEST=TARGET.oldDigest,m=>m.state='stopped',m=>m.config.env.SUPABASE_SERVICE_ROLE_KEY='PRIVATE_LITERAL_SENTINEL']){
    const bad=structuredClone(machine);mutate(bad);assert.throws(()=>requireObservedConfiguration(bad));
  }
});
test('applied worker observer: one native clean pair must belong to this bounded new transition', () => {
  const window={writerStepStartMs:1000,writerResultLoggedMs:2000,firstAppliedIdentityMs:5000};
  const events=[{type:'exit',timestamp:2200,request:{exit_event:{requested_stop:true}}},{type:'start',timestamp:2500}];
  assert.equal(requireObservedHandoff({events},window).startAt,2500);
  for(const bad of [[],events.map(e=>({...e,timestamp:e.timestamp-5000})),[...events,{type:'start',timestamp:3000}],[{...events[0],request:{exit_event:{requested_stop:false,exit_code:1}}},events[1]]])assert.throws(()=>requireObservedHandoff({events:bad},window));
});
test('applied worker observer: public projection keeps explicit historical gaps and excludes private capture operands', () => {
  const r=publicResult({W:TARGET.source,D:TARGET.digest,currentRuntimeObserved:true,historicalExactBeforeComparisonProven:false,originalStartedAtRetained:false,rawConfig:beforeMachine().config,expectedConfigCommitment:'PRIVATE_HASH',fullBeforeMachine:'PRIVATE_CAPTURE',secretNames:['PRIVATE_REFERENCE']});
  assert.equal(r.currentRuntimeObserved,true);assert.equal(r.historicalExactBeforeComparisonProven,false);assert.equal(r.originalStartedAtRetained,false);
  assert(!JSON.stringify(r).includes('PRIVATE_'));assert(!observeAppliedWorker.toString().includes('mirrorImage('));assert(!observeAppliedWorker.toString().includes('FLY_MACHINE_LEASE_ACQUIRE'));assert(!observeAppliedWorker.toString().includes('FLY_MACHINE_UPDATE'));
});


test('applied worker observer: public confidentiality excludes any private profile operand or comparison dependency', () => {
  const source=fs.readFileSync(new URL('./place-e4d7-worker.mjs',import.meta.url),'utf8');
  const postupdate=JSON.parse(source.match(/const POSTUPDATE = Object.freeze\((\{[^\n]+\})\);/)[1]);
  assert.deepEqual(Object.keys(postupdate),['writerRunId','beforeVersion','writerStepStartMs','writerResultLoggedMs','firstAppliedIdentityMs']);
  assert(!/expectedConfigCommitment|expectedCommitment|configMatchesApprovedDelta|approved_current_configuration_mismatch/.test(source));
  assert.equal(requireObservedConfiguration.length,1);
  const projected=publicResult({currentConfigurationPredicatesProven:true,approvedPrivateProfileComparisonAvailable:false,approvedPrivateProfileEqualityProven:false,currentRuntimeObserved:true,historicalBeforeDictRetained:false,historicalExactBeforeComparisonProven:false,rawConfig:'PRIVATE_FIXTURE',approvedProfile:'PRIVATE_FIXTURE'});
  assert.deepEqual(projected,{currentRuntimeObserved:true,currentConfigurationPredicatesProven:true,approvedPrivateProfileComparisonAvailable:false,approvedPrivateProfileEqualityProven:false,historicalExactBeforeComparisonProven:false,historicalBeforeDictRetained:false});
  assert(!JSON.stringify(projected).includes('PRIVATE_FIXTURE'));
});
test('applied worker observer: current runtime separates unavailable private and historical equality from full config stability', async () => {
  for(const drift of [false,true]) {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'e4d7-observer-config-fields-'));let gets=0,execs=0,queries=0,metadata=0;
    const machine=()=>{const m=beforeMachine();m.instance_id=nextVersion;m.version='SYNTHETICPROVIDER001';m.config.image=`registry.fly.io/${TARGET.app}@${TARGET.digest}`;m.config.env.RCAP_WORKER_CONTAINER_DIGEST=TARGET.digest;m.config.guest.cpus=2;m.image_ref={digest:TARGET.digest,labels:{'org.opencontainers.image.revision':TARGET.source}};m.events=[{type:'exit',timestamp:Date.parse('2026-11-12T03:23:25Z'),request:{exit_event:{requested_stop:true}}},{type:'start',timestamp:Date.parse('2026-11-12T03:23:40Z')}];return m;};
    const request=async(url,options)=>{
      assert.equal(options.redirect,'error');assert(!Object.hasOwn(options.headers,'fly-machine-lease-nonce'));assert(!url.includes('/lease'));
      const reply=v=>new Response(JSON.stringify(v),{status:200});
      if(url.endsWith('/database/query')){queries++;assert.equal(options.method,'POST');assert(JSON.parse(options.body).query.startsWith('BEGIN READ ONLY;'));return reply([queueRow()]);}
      if(url.endsWith('/exec')){execs++;assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{command:configuredEffectiveProbeCommand(),timeout:15});return reply({exit_code:0,exit_signal:0,stderr:'',stdout:JSON.stringify(effective())});}
      assert.equal(options.method,'GET');if(url.endsWith('/machines'))return reply([{id:TARGET.machine}]);
      assert.equal(url,`https://api.machines.dev/v1/apps/${TARGET.app}/machines/${TARGET.machine}`);gets++;const m=machine();if(drift&&gets===2)m.config.guest.cpus=3;return reply(m);
    };
    const command=(tool,args)=>{assert.equal(tool,'flyctl');assert.deepEqual(args,['secrets','list','--app',TARGET.app,'--json']);metadata++;return JSON.stringify(names.map(Name=>({Name})));};
    try {
      const result=await observeAppliedWorker({env,request,command,root});
      assert.equal(result.currentConfigurationPredicatesProven,true);assert.equal(result.approvedPrivateProfileComparisonAvailable,false);assert.equal(result.approvedPrivateProfileEqualityProven,false);
      assert.equal(result.currentRuntimeObserved,!drift);assert.equal(result.runtimeQualified,false);assert.equal(result.hostedAccepted,false);
      assert.equal(result.historicalBeforeDictRetained,false);assert.equal(result.historicalExactBeforeComparisonProven,false);assert.equal(result.originalStartedAtRetained,false);
      assert.deepEqual([result.mirrorAttempts,result.leaseAttempts,result.updateAttempts],[0,0,0]);
      assert.deepEqual([gets,execs,queries,metadata],[2,1,2,drift?1:2]);
      if(drift)assert.equal(result.refusalCode,'postupdate_capture_state_or_configuration_drift');else assert.equal(result.configStableDuringCapture,true);
      const bytes=fs.readFileSync(path.join(root,'e4d7-worker-placement-evidence/result.public.json'),'utf8');assert.deepEqual(JSON.parse(bytes),result);assert(!bytes.includes('PRIVATE_'));assert(!Object.hasOwn(result,'configMatchesApprovedDelta'));
    } finally {fs.rmSync(root,{recursive:true});}
  }
});
