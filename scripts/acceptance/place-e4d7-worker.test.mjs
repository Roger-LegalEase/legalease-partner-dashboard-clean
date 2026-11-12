import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TARGET, placeWorker, requireExecutionContext, planUpdate, planRollback, publicResult, configuredUserState, configuredEffectiveProbeCommand} from './place-e4d7-worker.mjs';

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
async function scenario(fault = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e4d7-writer-test-'));
  const original = beforeMachine(), calls = [], commands = [], files = {};
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
    if (fault === 'registry-denied') throw Error('request_HTTP_403');
    const r = image();
    if (fault === 'wrong-layers') r.RootFS.Layers.pop();
    if (fault === 'wrong-config') r.Id = 'sha256:'+'0'.repeat(64);
    if (fault === 'mirror-digest' && ref.startsWith('registry.fly.io/')) r.ManifestDigest = 'sha256:'+'b'.repeat(64);
    return r;
  };
  const request = async (url, options) => {
    calls.push({url, method: options.method});
    assert.equal(options.redirect, 'error');
    const response = value => ({ok: true, status: 200, json: async () => structuredClone(value)});
    if (url.includes('/database/query')) {
      const body = JSON.parse(options.body); assert(body.query.startsWith('BEGIN READ ONLY;')); assert(!/insert|update|delete/i.test(body.query));
      const q = queueRow(); if (fault === 'queue-busy') q.claimed = 1;
      return response([q]);
    }
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
    try { result = await placeWorker({env: actualEnv, request, command, inspectImage, root, now: () => 1000, sleep: async () => { throw Error('unnecessary_poll'); }}); }
    catch (error) { refusal = error.message; }
    const directory = path.join(root, 'e4d7-worker-placement-evidence');
    if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory)) {
      const f = path.join(directory, name); assert.equal(fs.statSync(f).mode & 0o777, 0o600); files[name] = JSON.parse(fs.readFileSync(f));
    }
    const serialized = JSON.stringify({result, files});
    for (const privateValue of ['PRIVATE_METADATA_SENTINEL','PRIVATE_SECRET_NAME_SENTINEL','PRIVATE_SECRET_DIGEST_SENTINEL','PRIVATE_LITERAL_SENTINEL','PRIVATE_TRANSPORT_ERROR_SENTINEL','PRIVATE_AUTH_ERROR_SENTINEL','SYNTHETIC_NONCE','SYNTHETIC_FLY_ONLY','SYNTHETIC_DB_ONLY','configSha256','configCapsule','pre-queue','rollback-config','projectRef']) assert(!serialized.includes(privateValue), privateValue);
    assert(Object.keys(files).every(name => ['result.public.json','attempt.json'].includes(name)));
    if (result) assert.deepEqual(files['result.public.json'], result);
    return {result, refusal, updates, leases, releases, mirrorCopies, calls, files};
  } finally { fs.rmSync(root, {recursive: true}); }
}

test('exact module: one mirror, own lease/CAS update, stable guards and bounded public result', async () => {
  const s = await scenario(); assert.equal(s.result.runtimeQualified, true); assert.equal(s.updates, 1); assert.equal(s.leases, 1); assert.equal(s.releases, 1); assert.equal(s.mirrorCopies, 1);
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
test('mirror refusal/digest drift and secret drift cannot reach the machine lease/update', async () => {
  for (const fault of ['mirror-error','mirror-digest','secret-drift']) { const s=await scenario(fault); assert.equal(s.result.runtimeQualified,false); assert.equal(s.mirrorCopies,1); assert.equal(s.leases,0); assert.equal(s.updates,0); }
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
