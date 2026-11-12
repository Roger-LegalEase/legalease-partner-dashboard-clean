import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TARGET, placeWorker, requireExecutionContext, planUpdate, planRollback, publicResult, configuredUserState, configuredEffectiveProbeCommand, safeRegistryFailure, inspectAcceptedImage, probeDestinationRegistry} from './place-e4d7-worker.mjs';

// Synthetic transport and credentials only. This imports the actual module; no provider is contacted.
const env = {
  GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_JOB: 'deploy_e4d7', GITHUB_WORKFLOW_REF: 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release', GITHUB_REPOSITORY_ID: '1248656766', GITHUB_ACTOR_ID: '287531360',
  GITHUB_REPOSITORY: 'Roger-LegalEase/legalease-partner-dashboard-clean', GITHUB_REF: 'refs/heads/captain-release', GITHUB_RUN_ATTEMPT: '1',
  GITHUB_SHA: '1'.repeat(40), GITHUB_RUN_ID: '123456789', INPUT_WORKER_SOURCE_SHA: TARGET.source, INPUT_WORKER_DIGEST: TARGET.digest,
  FLY_API_TOKEN: 'SYNTHETIC_FLY_ONLY', SUPABASE_ACCESS_TOKEN: 'SYNTHETIC_DB_ONLY', RCAP_FLY_IMAGE_DIGEST: TARGET.digest, DOCKER_CONFIG: '/tmp/synthetic-auth-reference',
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
  const original = beforeMachine(), calls = [], commands = [], files = {}, inspections = [];
  let after, updates = 0, leases = 0, releases = 0, mirrorCopies = 0, nameCalls = 0;
  const command = (tool, args, options) => {
    commands.push({tool, args});
    assert.equal(options.env, actualEnv);
    if (tool === 'flyctl') {
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
      const q = queueRow(); if (fault === 'queue-busy') q.claimed = 1;
      return response([q]);
    }
    assert(url === `https://api.machines.dev/v1/apps/${TARGET.app}/machines` || url.startsWith(`https://api.machines.dev/v1/apps/${TARGET.app}/machines/${TARGET.machine}`));
    assert.equal(options.headers.Authorization, `Bearer ${actualEnv.FLY_API_TOKEN}`);
    if (liveLease) {
      if (options.headers['fly-machine-lease-nonce'] !== 'SYNTHETIC_NONCE') return {ok:false, status:409};
    } else assert.equal(nonceAttached, false);
    if (fault === 'postlease-exec-http' && liveLease && url.endsWith('/exec')) return {ok:false, status:409};
    if (fault === 'postlease-exec-transport' && liveLease && url.endsWith('/exec')) throw Error('PRIVATE_TRANSPORT_ERROR_SENTINEL');
    if (fault === 'postupdate-read-http' && updates && options.method === 'GET') return {ok:false, status:409};
    if (url.endsWith('/exec')) {
      const body = JSON.parse(options.body); assert.equal(body.command[0], 'node'); assert.equal(body.timeout, 15);
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
    if (fault === 'mount-override') current.config.mounts = [{path: '/app', volume: 'SYNTHETIC_OVERRIDE'}];
    if (fault === 'old-digest') current.image_ref.digest = 'sha256:'+'f'.repeat(64);
    if (fault === 'private-config-field') current.config.env.SUPABASE_SERVICE_ROLE_KEY = 'PRIVATE_LITERAL_SENTINEL';
    return response(current);
  };
  const actualEnv = {...env, ...(fault === 'wrong-actor' ? {GITHUB_ACTOR_ID: '999'} : {})};
  try {
    let result, refusal;
    try { result = await writer({env: actualEnv, request, command, inspectImage, root, now: () => 1000, sleep: async () => { throw Error('unnecessary_poll'); }}); }
    catch (error) { refusal = error.message; }
    const directory = path.join(root, 'e4d7-worker-placement-evidence');
    if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory)) {
      const f = path.join(directory, name); assert.equal(fs.statSync(f).mode & 0o777, 0o600); files[name] = JSON.parse(fs.readFileSync(f));
    }
    const serialized = JSON.stringify({result, files});
    for (const privateValue of ['PRIVATE_METADATA_SENTINEL','PRIVATE_SECRET_NAME_SENTINEL','PRIVATE_SECRET_DIGEST_SENTINEL','PRIVATE_LITERAL_SENTINEL','PRIVATE_TRANSPORT_ERROR_SENTINEL','PRIVATE_AUTH_ERROR_SENTINEL','SYNTHETIC_NONCE','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','configSha256','configCapsule','pre-queue','rollback-config','projectRef']) assert(!serialized.includes(privateValue), privateValue);
    assert(Object.keys(files).every(name => ['result.public.json','attempt.json'].includes(name)));
    if (result) assert.deepEqual(files['result.public.json'], result);
    return {result, refusal, updates, leases, releases, mirrorCopies, calls, files, inspections};
  } finally { fs.rmSync(root, {recursive: true}); }
}

test('owned lease request contract: exact retained mirror, scoped nonce and one guarded update', async () => {
  const s = await scenario(); assert.equal(s.result.runtimeQualified, true); assert.equal(s.updates, 1); assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.mirrorCopies, 0);
  assert.equal(s.result.mirrorAttempts, 0); assert.equal(s.result.registryIdentityProven, true);
  assert.deepEqual(s.inspections, [`ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, `registry.fly.io/${TARGET.app}@${TARGET.digest}`]);
  assert(s.calls.some(c => c.liveLease && c.url.endsWith('/exec') && c.nonceAttached));
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
  for (const fault of ['update-indeterminate','post-config-drift','root-user']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.updates,1); assert.equal(s.result.updateAttempts,1); assert.equal(s.releases,1); assert.equal(s.result.automaticRetry,false); assert.equal(s.result.automaticRollback,false); }
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
    ['postlease-exec-http', 'FLY_MACHINE_EFFECTIVE_EXEC', 0, 'request_HTTP_409'],
    ['postlease-exec-transport', 'FLY_MACHINE_EFFECTIVE_EXEC', 0, 'request_transport_or_timeout_indeterminate'],
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
