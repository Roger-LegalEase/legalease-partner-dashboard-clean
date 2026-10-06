import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import { workerDisposition, readWorkerReadiness, REQUIRED_NAMES } from './rcap-production-worker-readiness.mjs';
const candidate = JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const source = candidate.workerSourceSha, digest = candidate.workerDigest;
const mirror = 'sha256:' + 'a'.repeat(64), imageId = 'sha256:' + 'b'.repeat(64);
function valid() { return { source, digest, imageEquivalent: true, names: [...REQUIRED_NAMES], queue: { stale_queued: 0, queued: 0, claimed: 0, terminal_failed: 0 }, machines: [{ id: 'fixture-machine', state: 'started', image_ref: { digest: mirror, labels: { 'org.opencontainers.image.revision': source } }, config: { image: 'registry.fly.io/legalease-rcap-render-worker:accepted', env: { RCAP_WORKER_CONTAINER_DIGEST: digest, ENABLE_SUPABASE_PARTNER_DATA: 'true', SECRET_VALUE: 'must-not-persist' }, restart: { policy: 'always' }, guest: { memory_mb: 1024 }, services: [] } }] }; }
test('exact accepted worker is NO_WRITE_PASS', () => assert.equal(workerDisposition(valid()), 'NO_WRITE_PASS'));
for (const [name, mutate] of [
  ['empty app', x => x.machines = []],
  ['stopped worker', x => x.machines[0].state = 'stopped'],
  ['suspended worker', x => x.machines[0].state = 'suspended'],
  ['different immutable image', x => x.imageEquivalent = false],
  ['different revision', x => x.machines[0].image_ref.labels['org.opencontainers.image.revision'] = '0'.repeat(40)],
  ['wrong environment digest', x => x.machines[0].config.env.RCAP_WORKER_CONTAINER_DIGEST = mirror],
  ['disabled backend', x => x.machines[0].config.env.ENABLE_SUPABASE_PARTNER_DATA = 'false'],
  ['wrong restart', x => x.machines[0].config.restart.policy = 'on-failure'],
  ['inbound service', x => x.machines[0].config.services = [{}]],
  ['insufficient memory', x => x.machines[0].config.guest.memory_mb = 512],
]) test(`${name}: bounded deployment needed`, () => { const x = valid(); mutate(x); assert.equal(workerDisposition(x), 'WRITE_REQUIRED_AND_PROVEN'); });
for (const [name, mutate] of [
  ['multiple machines', x => x.machines.push(x.machines[0])],
  ['unknown machine state', x => x.machines[0].state = 'replacing'],
  ['malformed machines', x => x.machines = {}],
  ['malformed config', x => x.machines[0].config = null],
  ['malformed services', x => x.machines[0].config.services = {}],
  ['missing secret', x => x.names.pop()],
  ['missing queue', x => x.queue = null],
  ['missing counter', x => delete x.queue.claimed],
  ['null counter', x => x.queue.stale_queued = null],
  ['invalid counter', x => x.queue.stale_queued = 'NaN'],
  ['negative counter', x => x.queue.claimed = -1],
  ['stale queued jobs', x => x.queue.stale_queued = 1],
  ['terminal backlog', x => x.queue.terminal_failed = 1],
]) test(`${name}: refuses before write`, () => { const x = valid(); mutate(x); assert.throws(() => workerDisposition(x), /worker_/); });
async function exercise({ mutate = () => {}, changeCandidate = () => {}, existingId = imageId, failRequest = false, changeEnv = () => {}, commandError = null, requestError = null, acceptedId = imageId } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-readiness-test-'));
  try {
    fs.mkdirSync(path.join(root, 'data/rcap-grade-a/launch-control'), { recursive: true });
    const binding = structuredClone(candidate); changeCandidate(binding);
    fs.writeFileSync(path.join(root, 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'), JSON.stringify(binding));
    const state = valid(); mutate(state);
    const calls = [];
    const env = { FLY_APP_NAME: 'legalease-rcap-render-worker', RCAP_PRODUCTION_PROJECT_REF: candidate.productionProjectRef, RCAP_WORKER_SOURCE_SHA: source, RCAP_WORKER_DIGEST: digest, IMAGE_REPOSITORY: 'ghcr.io/roger-legalease/rcap-render-worker', FLY_API_TOKEN: 'not-a-real-token', SUPABASE_ACCESS_TOKEN: 'not-a-real-token', GITHUB_ENV: path.join(root, 'env'), GITHUB_OUTPUT: path.join(root, 'output') };
    changeEnv(env);
    const request = async (url, options) => { calls.push({ url, options }); if (requestError) throw Error(requestError); return { ok: !failRequest, json: async () => url.includes('machines.dev') ? state.machines : [state.queue] }; };
    const command = (program, args) => { calls.push({ program, args }); if (commandError) throw Error(commandError);
      if (program === 'flyctl' && args[0] === 'secrets') return JSON.stringify(state.names.map(Name => ({ Name, Digest: 'not-persisted' })));
      if (program === 'docker' && args[0] === 'image') return args.at(-1).startsWith('ghcr.io/') ? acceptedId : existingId;
      if (program === 'docker' && args[0] === 'pull') return '';
      if (program === 'flyctl' && args.join(' ') === 'auth docker') return '';
      throw Error('unexpected command');
    };
    let evidence, failure;
    try { evidence = await readWorkerReadiness({ env, request, command, root }); } catch (error) { failure = error; }
    return { calls, evidence, failure, stored: JSON.parse(fs.readFileSync(path.join(root, 'production-worker-evidence/production-worker-readiness.json'))), output: fs.existsSync(env.GITHUB_OUTPUT) ? fs.readFileSync(env.GITHUB_OUTPUT, 'utf8') : '', environment: fs.existsSync(env.GITHUB_ENV) ? fs.readFileSync(env.GITHUB_ENV, 'utf8') : '' };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('mirror proof uses immutable image config digest, sanitized evidence and read-only APIs', async () => {
  const r = await exercise(); assert.ifError(r.failure); assert.equal(r.evidence.disposition, 'NO_WRITE_PASS');
  assert.equal(r.environment, `RCAP_FLY_IMAGE_DIGEST=${mirror}\n`);
  assert.equal(r.output, 'disposition=NO_WRITE_PASS\n');
  assert.ok(r.calls.some(c => c.program === 'docker' && c.args[0] === 'pull' && c.args[1].endsWith('@' + mirror)));
  const db = r.calls.find(c => c.url?.includes('supabase')); const body = JSON.parse(db.options.body); assert.equal(body.read_only, true); assert.match(body.query, /^select /);
  assert.doesNotMatch(JSON.stringify(r.evidence), /must-not-persist|not-a-real-token|not-persisted|SECRET_VALUE/);
  assert.ok(!r.calls.some(c => c.args?.some(arg => ['push', 'deploy', 'set'].includes(arg))));
});
test('same revision and environment cannot substitute for immutable mirror image identity', async () => {
  const r = await exercise({ existingId: 'sha256:' + 'c'.repeat(64) }); assert.ifError(r.failure); assert.equal(r.evidence.disposition, 'WRITE_REQUIRED_AND_PROVEN'); assert.equal(r.environment, '');
});
test('matching accepted manifest needs no mirror login or pull', async () => {
  const r = await exercise({ mutate: x => x.machines[0].image_ref.digest = digest }); assert.ifError(r.failure); assert.equal(r.evidence.disposition, 'NO_WRITE_PASS'); assert.ok(!r.calls.some(c => c.args?.[0] === 'pull' || c.args?.[0] === 'auth'));
});
test('unknown image digest refuses', async () => { const r = await exercise({ mutate: x => delete x.machines[0].image_ref.digest }); assert.match(r.failure.message, /image_digest_unreadable/); assert.equal(r.output, ''); });
test('untrusted image registry refuses', async () => { const r = await exercise({ mutate: x => x.machines[0].config.image = 'untrusted.example/worker:latest' }); assert.match(r.failure.message, /registry_unexpected/); });
test('remote inventory failure never permits deploy', async () => { const r = await exercise({ failRequest: true }); assert.match(r.failure.message, /request_failed/); assert.equal(r.output, ''); });
test('missing names refuse before registry access', async () => { const r = await exercise({ mutate: x => x.names = [] }); assert.match(r.failure.message, /secret_names_missing/); assert.ok(!r.calls.some(c => c.program === 'docker')); });
test('phase authorization refuses before any service access', async () => { const r = await exercise({ changeCandidate: x => x.productionAuthorization.phases = ['preflight'] }); assert.ok(r.failure); assert.equal(r.calls.length, 0); });
test('workflow orders authorization and immutable pull before inventory and conditionally writes only afterward', () => {
  const yaml = fs.readFileSync('.github/workflows/deploy-rcap-render-worker-production.yml', 'utf8');
  const guard = yaml.indexOf('requireProductionPhaseAuthorization(candidate');
  const pull = yaml.indexOf('docker pull "$REF"');
  const inventory = yaml.indexOf('run: node scripts/rcap-production-worker-readiness.mjs');
  const push = yaml.indexOf('docker push "$MIRROR"');
  const verify = yaml.indexOf('run: node scripts/verify-rcap-production-worker-execution.mjs');
  assert.ok(guard < pull && pull < inventory && inventory < push && push < verify);
  assert.match(yaml, /if: steps\.worker_readiness\.outputs\.disposition == 'WRITE_REQUIRED_AND_PROVEN'/);
  assert.match(yaml, /node-version: 22/);
});


for(const [name,options,code] of [
 ['more than one Machine',{mutate:x=>x.machines.push(structuredClone(x.machines[0]))},'worker_machine_inventory_unsafe'],
 ['unsafe Machine state',{mutate:x=>x.machines[0].state='replacing'},'worker_machine_state_unsafe'],
 ['unreadable Machine config',{mutate:x=>x.machines[0].config=null},'worker_machine_config_unreadable'],
 ['malformed services',{mutate:x=>x.machines[0].config.services={}},'worker_machine_config_unreadable'],
 ['unexpected image registry',{mutate:x=>x.machines[0].config.image='untrusted.example/SECRET'},'worker_image_registry_unexpected'],
 ['unreadable image digest',{mutate:x=>x.machines[0].image_ref.digest='SECRET'},'worker_image_digest_unreadable'],
 ['unreadable accepted image',{acceptedId:'SECRET'},'worker_accepted_image_unreadable'],
 ['unreadable existing image',{existingId:'SECRET'},'worker_existing_image_unreadable'],
 ['missing secret name',{mutate:x=>x.names.pop()},'worker_required_secret_names_missing'],
 ['unreadable queue',{mutate:x=>x.queue=null},'worker_queue_unreadable'],
 ['stale queue',{mutate:x=>x.queue.stale_queued=1},'worker_queue_unhealthy'],
 ['terminal backlog',{mutate:x=>x.queue.terminal_failed=1},'worker_queue_unhealthy'],
 ['tuple mismatch',{changeEnv:e=>e.RCAP_WORKER_SOURCE_SHA='SECRET'},'worker_tuple_mismatch'],
 ['target mismatch',{changeEnv:e=>e.FLY_APP_NAME='SECRET'},'worker_target_mismatch'],
 ['missing credentials',{changeEnv:e=>delete e.FLY_API_TOKEN},'worker_credentials_absent'],
 ['HTTP refusal',{failRequest:true},'worker_inventory_request_failed'],
 ['thrown request with secret payload',{requestError:'SECRET'},'worker_inventory_request_failed'],
 ['thrown command with secret payload',{commandError:'SECRET'},'worker_secret_inventory_unreadable'],
 ['phase refusal',{changeCandidate:c=>c.productionAuthorization.phases=['preflight']},'production_phase_not_authorized_for_current_release'],
])test(`refusal persists first code and sanitized evidence: ${name}`,async()=>{
 const r=await exercise(options);
 assert.equal(r.failure?.message,code);assert.equal(r.failure?.code,code);
 assert.equal(r.stored.refusalCode,code);assert.equal(r.stored.disposition,'REFUSED');
 assert.equal(r.stored.productionDatabaseMutated,false);assert.equal(r.stored.workerMutated,false);
 assert.equal(r.output,'');assert.equal(r.environment,'');
 assert.doesNotMatch(JSON.stringify(r.stored),/SECRET|must-not-persist|not-a-real-token|not-persisted|fixture-machine/);
 assert.ok(!r.calls.some(c=>c.args?.some(arg=>['push','deploy','scale','destroy','stop','restart','set'].includes(arg))));
});
for(const [name,mutate,expected]of [
 ['one exact existing Machine',()=>{},'NO_WRITE_PASS'],
 ['missing worker',x=>x.machines=[],'WRITE_REQUIRED_AND_PROVEN'],
 ['one safely replaceable worker',x=>x.machines[0].state='stopped','WRITE_REQUIRED_AND_PROVEN'],
])test(`success evidence: ${name} = ${expected}`,async()=>{
 const r=await exercise({mutate});assert.ifError(r.failure);
 assert.deepEqual(r.stored,r.evidence);assert.equal(r.stored.disposition,expected);assert.equal(r.stored.refusalCode,null);
 assert.equal(r.stored.machineCount,r.stored.machines.length);
 assert.deepEqual(r.stored.requiredSecretPresence,Object.fromEntries(REQUIRED_NAMES.map(n=>[n,true])));
 assert.deepEqual(r.stored.queue,{stale_queued:0,queued:0,claimed:0,terminal_failed:0});
 if(r.stored.machine){
  assert.equal(r.stored.machine.imageDigest,mirror);assert.equal(r.stored.machine.ociRevision,source);
  assert.equal(r.stored.machine.imageRegistryExpected,true);assert.equal(r.stored.machine.imageEquivalent,true);
  assert.equal(r.stored.machine.environmentDigestMatches,true);assert.equal(r.stored.machine.partnerDataEnabledMatches,true);
  assert.equal(r.stored.machine.restartPolicy,'always');assert.equal(r.stored.machine.inboundServiceCount,0);assert.equal(r.stored.machine.memoryMb,1024);
 }
});
test('first refusal stays first; observed machine and queue diagnostics survive',async()=>{
 const r=await exercise({mutate:x=>{x.names=[];x.queue.stale_queued=3;x.queue.queued=4;x.queue.claimed=1;x.queue.terminal_failed=2;x.machines[0].state='replacing';}});
 assert.equal(r.failure.message,'worker_required_secret_names_missing');
 assert.equal(r.stored.machines[0].state,'replacing');
 assert.deepEqual(r.stored.queue,{stale_queued:3,queued:4,claimed:1,terminal_failed:2});
 assert.equal(r.stored.requiredSecretPresence.SUPABASE_SERVICE_ROLE_KEY,false);
});
test('untrusted operational strings never enter evidence, environment fields are booleans only',async()=>{
 const r=await exercise({mutate:x=>{const m=x.machines[0];m.state='SECRET';m.image_ref.digest='SECRET';m.image_ref.labels['org.opencontainers.image.revision']='SECRET';m.config.restart.policy='SECRET';m.config.guest.memory_mb='SECRET';m.config.env.RCAP_WORKER_CONTAINER_DIGEST='SECRET';m.config.env.ENABLE_SUPABASE_PARTNER_DATA='SECRET';}});
 assert.equal(r.stored.machine.state,'unrecognized');assert.equal(r.stored.machine.imageDigest,null);assert.equal(r.stored.machine.ociRevision,null);
 assert.equal(r.stored.machine.restartPolicy,null);assert.equal(r.stored.machine.memoryMb,null);
 assert.equal(r.stored.machine.environmentDigestMatches,false);assert.equal(r.stored.machine.partnerDataEnabledMatches,false);
 assert.doesNotMatch(JSON.stringify(r.stored),/SECRET/);
});
test('readiness refusal artifact upload is unconditional and exact error code reaches the CLI',()=>{
 const yaml=fs.readFileSync('.github/workflows/deploy-rcap-render-worker-production.yml','utf8');
 assert.match(yaml,/name: Upload the production worker execution evidence\s+if: always\(\)\s+uses: actions\/upload-artifact@v4/);
 assert.match(yaml,/path: production-worker-evidence\//);
 const script=fs.readFileSync('scripts/rcap-production-worker-readiness.mjs','utf8');
 assert.match(script,/error instanceof WorkerReadinessRefusal \? error.code/);
 assert.doesNotMatch(script,/\['(?:scale|destroy|stop|restart|deploy|push)'/);
});

test('disposition predicates are byte-identical to approved Captain',()=>{
 const baseline=execFileSync('git',['show','c015c7dbf44596d1f77f405697af9a75c03e045a:scripts/rcap-production-worker-readiness.mjs'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const now=fs.readFileSync('scripts/rcap-production-worker-readiness.mjs','utf8');
 const body=s=>s.slice(s.indexOf('export function workerDisposition'),s.indexOf('export async function readWorkerReadiness'));
 assert.equal(body(now),body(baseline));
});
test('clean native-only worker CLI startup persists exact refusal before any service',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worker-readiness-startup-'));
 try{
  fs.mkdirSync(path.join(root,'data/rcap-grade-a/launch-control'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'),JSON.stringify(candidate));
  const preload=path.join(root,'no-service.cjs');
  fs.writeFileSync(preload,"globalThis.fetch=()=>{throw Error('UNEXPECTED_SERVICE');};");
  const log=path.join(root,'cli.log'),fd=fs.openSync(log,'w');
  let r;
  try{r=spawnSync(process.execPath,['--require',preload,path.resolve('scripts/rcap-production-worker-readiness.mjs')],{
   cwd:root,stdio:['ignore',fd,fd],env:{PATH:process.env.PATH,RCAP_WORKER_SOURCE_SHA:source,RCAP_WORKER_DIGEST:digest,
   FLY_APP_NAME:'legalease-rcap-render-worker',IMAGE_REPOSITORY:'ghcr.io/roger-legalease/rcap-render-worker',RCAP_PRODUCTION_PROJECT_REF:candidate.productionProjectRef}
  });}finally{fs.closeSync(fd);}
  assert.ifError(r.error);assert.equal(r.status,1);
  const output=fs.readFileSync(log,'utf8');assert.match(output,/worker_credentials_absent/);assert.doesNotMatch(output,/UNEXPECTED_SERVICE/);
  const e=JSON.parse(fs.readFileSync(path.join(root,'production-worker-evidence/production-worker-readiness.json')));
  assert.equal(e.refusalCode,'worker_credentials_absent');assert.equal(e.productionDatabaseMutated,false);assert.equal(e.workerMutated,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
