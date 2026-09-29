import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
async function exercise({ mutate = () => {}, changeCandidate = () => {}, existingId = imageId, failRequest = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-readiness-test-'));
  try {
    fs.mkdirSync(path.join(root, 'data/rcap-grade-a/launch-control'), { recursive: true });
    const binding = structuredClone(candidate); changeCandidate(binding);
    fs.writeFileSync(path.join(root, 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'), JSON.stringify(binding));
    const state = valid(); mutate(state);
    const calls = [];
    const env = { FLY_APP_NAME: 'legalease-rcap-render-worker', RCAP_PRODUCTION_PROJECT_REF: candidate.productionProjectRef, RCAP_WORKER_SOURCE_SHA: source, RCAP_WORKER_DIGEST: digest, IMAGE_REPOSITORY: 'ghcr.io/roger-legalease/rcap-render-worker', FLY_API_TOKEN: 'not-a-real-token', SUPABASE_ACCESS_TOKEN: 'not-a-real-token', GITHUB_ENV: path.join(root, 'env'), GITHUB_OUTPUT: path.join(root, 'output') };
    const request = async (url, options) => { calls.push({ url, options }); return { ok: !failRequest, json: async () => url.includes('machines.dev') ? state.machines : [state.queue] }; };
    const command = (program, args) => { calls.push({ program, args });
      if (program === 'flyctl' && args[0] === 'secrets') return JSON.stringify(state.names.map(Name => ({ Name, Digest: 'not-persisted' })));
      if (program === 'docker' && args[0] === 'image') return args.at(-1).startsWith('ghcr.io/') ? imageId : existingId;
      if (program === 'docker' && args[0] === 'pull') return '';
      if (program === 'flyctl' && args.join(' ') === 'auth docker') return '';
      throw Error('unexpected command');
    };
    let evidence, failure;
    try { evidence = await readWorkerReadiness({ env, request, command, root }); } catch (error) { failure = error; }
    return { calls, evidence, failure, output: fs.existsSync(env.GITHUB_OUTPUT) ? fs.readFileSync(env.GITHUB_OUTPUT, 'utf8') : '', environment: fs.existsSync(env.GITHUB_ENV) ? fs.readFileSync(env.GITHUB_ENV, 'utf8') : '' };
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
