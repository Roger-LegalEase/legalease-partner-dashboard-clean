import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { productionEnvironmentMetadataSha256 as fingerprint, readProductionEnvironmentMetadataSha256 as readFingerprint } from './rcap-production-environment-metadata.mjs';

const source = fs.readFileSync(new URL('./rcap-production-canary.mjs', import.meta.url), 'utf8');
const smoke = fs.readFileSync(new URL('./rcap-production-canary-smoke.mjs', import.meta.url), 'utf8');
const entry = (overrides = {}) => ({ key: 'LEGAL_AID_KEY', id: 'env_one', type: 'sensitive', target: ['production'], updatedAt: 1000, ...overrides });
const current = fingerprint([entry()]);
const identity = { APPLICATION_SHA: 'a'.repeat(40), WORKER_SOURCE_SHA: 'b'.repeat(40), WORKER_DIGEST: 'sha256:' + 'c'.repeat(64) };
function functionSource(name, next) {
  const start = source.indexOf(`async function ${name}(`);
  const end = source.indexOf(`async function ${next}(`, start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
function candidate(metadata = current) {
  const meta = { rcapStagedProduction: 'true', rcapApplicationSha: identity.APPLICATION_SHA, rcapWorkerSourceSha: identity.WORKER_SOURCE_SHA, rcapWorkerDigest: identity.WORKER_DIGEST };
  if (metadata !== undefined) meta.rcapProductionEnvironmentMetadataSha256 = metadata;
  return { id: 'dpl_candidate', target: 'production', readyState: 'READY', meta };
}

test('metadata fingerprint is deterministic across entry, target and custom-environment ordering', () => {
  const one = entry({ target: ['preview', 'production'], customEnvironmentIds: ['two', 'one'] });
  const two = entry({ key: 'SECOND', id: 'env_two', configurationId: 'config_two', gitBranch: 'main' });
  assert.match(fingerprint([one, two]), /^[a-f0-9]{64}$/);
  assert.equal(fingerprint([one, two]), fingerprint([two, { ...one, target: ['production', 'preview'], customEnvironmentIds: ['one', 'two'] }]));
});
test('Preview-only additions, updates and removals do not change Production generation', () => {
  for (const preview of [entry({ target: ['preview'] }), entry({ target: ['preview'], key: 'NEW', updatedAt: 9999 })]) {
    assert.equal(fingerprint([entry(), preview]), current);
  }
  assert.equal(fingerprint([entry(), entry({ target: [], customEnvironmentIds: ['custom'] })]), current);
});
for (const [name, entries] of [
  ['addition', [entry(), entry({ key: 'ADDED', id: 'env_added' })]],
  ['update timestamp', [entry({ updatedAt: 1001 })]],
  ['key update', [entry({ key: 'RENAMED' })]],
  ['identifier update', [entry({ id: 'env_new' })]],
  ['type update', [entry({ type: 'encrypted' })]],
  ['configuration update', [entry({ configurationId: 'new_configuration' })]],
  ['branch update', [entry({ gitBranch: 'release' })]],
  ['custom environment update', [entry({ customEnvironmentIds: ['custom'] })]],
  ['removal', []]
]) test(`Production ${name} changes fingerprint`, () => assert.notEqual(fingerprint(entries), current));

test('secret values are never accessed or incorporated, including ignored Preview entries', async () => {
  const entries = [entry(), entry({ target: ['preview'] })];
  for (const item of entries) for (const field of ['value', 'legacyValue', 'contentHint']) {
    Object.defineProperty(item, field, { enumerable: true, get() { throw Error(`secret field accessed: ${field}`); } });
  }
  assert.equal(fingerprint(entries), current);
  assert.equal(await readFingerprint(async () => ({ status: 200, json: { envs: entries } }), 'project'), current);
  assert.equal(fingerprint([entry({ value: 'secret-one' })]), fingerprint([entry({ value: 'secret-two' })]));
});
for (const [name, input] of [
  ['nonarray inventory', null], ['missing key', [entry({ key: undefined })]],
  ['missing identity', [entry({ id: undefined })]], ['missing type', [entry({ type: undefined })]],
  ['missing timestamp', [entry({ updatedAt: undefined })]], ['invalid timestamp', [entry({ updatedAt: -1 })]],
  ['invalid targets', [entry({ target: [42] })]], ['invalid branch', [entry({ gitBranch: {} })]]
]) test(`malformed ${name} fails closed`, () => assert.throws(() => fingerprint(input)));

test('metadata transport performs exactly one read with decryption disabled', async () => {
  const calls = [];
  const actual = await readFingerprint(async (...args) => {
    calls.push(args); return { status: 200, json: { envs: [entry()] } };
  }, 'project/encoded');
  assert.equal(actual, current);
  assert.deepEqual(calls, [['/v9/projects/project%2Fencoded/env?decrypt=false']]);
});
for (const response of [{ status: 403, json: { envs: [] } }, { status: 200, json: {} }]) {
  test(`metadata transport refuses incomplete response ${response.status}`, async () => {
    await assert.rejects(readFingerprint(async () => response, 'project'));
  });
}

for (const [name, hash, count] of [['missing', null, 0], ['wrong', '0'.repeat(64), 0], ['exact', current, 1]]) {
  test(`candidate ${name} fingerprint ${count ? 'is' : 'is not'} reusable`, async () => {
    const staged = candidate(hash); if (hash === null) delete staged.meta.rcapProductionEnvironmentMetadataSha256;
    const calls = [];
    const list = vm.runInNewContext(functionSource('listExactStagedCandidates', 'runVercelCli') + '\nlistExactStagedCandidates', {
      ...identity, deploymentReady: item => item.readyState === 'READY', deploymentId: item => item.id
    });
    const result = await list(async (...args) => { calls.push(args); return { status: 200, json: { deployments: [staged] } }; }, 'project', 'dpl_active', current);
    assert.equal(result.length, count);
    assert.equal(calls.length, 1); assert.equal(calls[0].length, 1);
    assert.match(calls[0][0], /^\/v6\/deployments\?/);
  });
}
test('current fingerprint does not weaken active/READY/application/worker candidate controls', async () => {
  const original = candidate();
  const rejected = [
    { ...original, id: 'dpl_active' }, { ...original, readyState: 'BUILDING' }, { ...original, target: 'preview' },
    ...['rcapStagedProduction', 'rcapApplicationSha', 'rcapWorkerSourceSha', 'rcapWorkerDigest'].map(field => ({ ...original, meta: { ...original.meta, [field]: 'wrong' } }))
  ];
  const list = vm.runInNewContext(functionSource('listExactStagedCandidates', 'runVercelCli') + '\nlistExactStagedCandidates', {
    ...identity, deploymentReady: item => item.readyState === 'READY', deploymentId: item => item.id
  });
  assert.equal((await list(async () => ({ status: 200, json: { deployments: rejected } }), 'project', 'dpl_active', current)).length, 0);
});

for (const failBuild of [false, true]) test(`staging ${failBuild ? 'failure never retries' : 'creates once with fingerprint and no domain assignment'}`, async () => {
  const calls = [];
  const create = vm.runInNewContext(functionSource('createStagedProduction', 'exactDeploymentDetail') + '\ncreateStagedProduction', {
    ...identity, HOSTED_VERCEL_PROJECT_NAME: 'project', INPUT_TOOLS_SHA: 'tools', VERCEL_TOKEN: 'local-test',
    hostedVercelScopedUrl: pathname => pathname, parseJson: JSON.parse, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'dpl_created', target: 'production', gitSource: { sha: identity.APPLICATION_SHA } }) };
    }
  });
  const run = create({ projectId: 'project' }, async pathname => {
    calls.push({ url: pathname }); return { status: 200, json: { readyState: failBuild ? 'ERROR' : 'READY' } };
  }, current);
  if (failBuild) await assert.rejects(run, /no retry/); else await run;
  assert.deepEqual(calls.map(call => call.url), ['/v13/deployments', '/v13/deployments/dpl_created']);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(calls[0].options.method, 'POST'); assert.equal(body.target, 'production');
  assert.equal(body.autoAssignCustomDomains, false);
  assert.equal(body.meta.rcapProductionEnvironmentMetadataSha256, current);
  assert.equal(body.gitSource.sha, identity.APPLICATION_SHA);
  assert.equal(body.env, undefined); assert.equal(body.build?.env, undefined);
});

// Execute the actual smoke setup and guard, substituting a sentinel for the
// later journey. Every dependency is local; no API or transaction can execute.
for (const [name, hash, accepts] of [['missing', null, false], ['wrong', '0'.repeat(64), false], ['stale', fingerprint([entry({ updatedAt: 9999 })]), false], ['exact', current, true]]) {
  test(`smoke ${accepts ? 'accepts' : 'refuses'} ${name} metadata before transactional work`, async () => {
    const start = smoke.indexOf('  requireProductionMigrationRelease(ROOT_DIR, process.env);');
    const end = smoke.indexOf('  const currentIds = new Set();', start);
    assert.ok(start >= 0 && end > start);
    assert.ok(end < smoke.indexOf('  await managementQuery(`', end));
    const staged = candidate(hash); if (hash === null) delete staged.meta.rcapProductionEnvironmentMetadataSha256;
    const observations = [], calls = []; let reachedJourney = false;
    const context = {
      ...identity, ROOT_DIR: '/local-test', process: { env: {} }, VERCEL_TOKEN: 'local-test',
      HOSTED_VERCEL_PROJECT_NAME: 'project', STAGED_DEPLOYMENT_ID: 'dpl_candidate', ROLLBACK_DEPLOYMENT_ID: 'dpl_active',
      requireProductionMigrationRelease() {}, resolveHostedVercelIdentity: async () => ({ projectId: 'project' }),
      hostedVercelScopedUrl: pathname => pathname, deploymentId: item => item.id, ready: item => item.readyState === 'READY',
      evidence: {}, readProductionEnvironmentMetadataSha256: readFingerprint,
      record: (id, passed) => { observations.push({ id, passed }); if (!passed) throw Error(id); },
      getJson: async pathname => {
        calls.push(pathname);
        if (pathname.endsWith('/env?decrypt=false')) return { status: 200, json: { envs: [entry()] } };
        if (pathname === '/v9/projects/project') return { status: 200, json: { name: 'project' } };
        return { status: 200, json: staged };
      },
      journey: () => { reachedJourney = true; }
    };
    const run = vm.runInNewContext('(async () => {\n' + smoke.slice(start, end) + '\njourney(); })()', context);
    if (accepts) await run; else await assert.rejects(run, /staged_production_environment_metadata_is_current/);
    assert.equal(reachedJourney, accepts);
    assert.equal(observations.at(-1).id, 'staged_production_environment_metadata_is_current');
    assert.equal(calls.filter(call => call.endsWith('/env?decrypt=false')).length, 1);
  });
}

test('shared guard wiring precedes discovery and retains read-only environment and no-promotion boundaries', () => {
  const read = source.indexOf('await readProductionEnvironmentMetadataSha256(vercel, vercelIdentity.projectId)');
  const discover = source.indexOf('let stagedCandidates = await listExactStagedCandidates(');
  assert.ok(read >= 0 && discover > read);
  for (const text of [source, smoke]) {
    assert.doesNotMatch(text, /decrypt=true|(?:method:\s*["'](?:PATCH|PUT|DELETE)["'])|vercel\s+(?:promote|alias)|\/v\d+\/projects\/[^\n]+\/env[^\n]+(?:POST|PATCH|DELETE)/i);
  }
});

for (const malformed of [undefined, null, '', 'bad', 'A'.repeat(64)]) {
  test(`discovery and creation refuse malformed fingerprint ${String(malformed)} before transport`, async () => {
    let calls = 0;
    const transport = async () => { calls += 1; throw Error('transport must remain unused'); };
    const sandbox = { ...identity, fetch: transport };
    const list = vm.runInNewContext(functionSource('listExactStagedCandidates', 'runVercelCli') + '\nlistExactStagedCandidates', sandbox);
    const create = vm.runInNewContext(functionSource('createStagedProduction', 'exactDeploymentDetail') + '\ncreateStagedProduction', sandbox);
    await assert.rejects(list(transport, 'project', 'dpl_active', malformed), /current Production environment metadata SHA-256 is required/);
    await assert.rejects(create({ projectId: 'project' }, transport, malformed), /current Production environment metadata SHA-256 is required/);
    assert.equal(calls, 0);
  });
}

test('environment successor scope refuses changed predecessor, paths, inherited tools and ancestry', async () => {
  const { execFileSync } = await import('node:child_process');
  const base = 'ac9befc5972ebd24e5f1aba2e07ee9081d554698';
  const toolsPath = 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
  const prior = JSON.parse(execFileSync('git', ['show', `${base}:${toolsPath}`], { encoding: 'utf8' }));
  const binding = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
  const verifier = fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs', 'utf8');
  const scopeStart = verifier.indexOf('if(environmentCorrection){');
  const scopeEnd = verifier.indexOf('  }else if(seedRerunCorrection){', scopeStart);
  assert.ok(scopeStart >= 0 && scopeEnd > scopeStart);
  const scope = verifier.slice(scopeStart, scopeEnd) + '\n}';
  const ancestryStart = verifier.indexOf("  const head=git(['rev-parse','HEAD']);", verifier.indexOf('function verifyGenerationBinding'));
  const ancestryEnd = verifier.indexOf('  expect(Object.keys(t.files).sort()', ancestryStart);
  assert.ok(ancestryStart >= 0 && ancestryEnd > ancestryStart);
  const ancestry = verifier.slice(ancestryStart, ancestryEnd);
  const files = [toolsPath, 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
    'scripts/rcap-production-canary.mjs', 'scripts/rcap-production-canary-smoke.mjs',
    'scripts/rcap-production-environment-metadata.mjs', 'scripts/rcap-production-environment-metadata.test.mjs',
    'scripts/rcap-hosted-legal-aid-startup.test.mjs'];
  const head = 'a'.repeat(40);
  function run({ mutate = () => {}, delta = files, parents = [head, base] } = {}) {
    const b = structuredClone(binding); mutate(b);
    const sandbox = {
      binding: b, t: b.successorTools, toolsPath, preactivation: true, correction: undefined,
      environmentCorrection: b.successorTools.preactivationProductionEnvironmentMetadataCorrectionBaseSha,
      seedRerunCorrection: b.successorTools.preactivationLegalAidSeedRerunCorrectionBaseSha,
      harnessCorrection: b.successorTools.preactivationHarnessCorrectionBaseSha,
      PRODUCTION_ENVIRONMENT_CORRECTION_BASE: base, PRODUCTION_ENVIRONMENT_CORRECTION_FILES: files,
      LEGAL_AID_SEED_RERUN_CORRECTION_BASE: '652793bb1469192ae3ec8c6dbdb5ae8402c05743',
      HARNESS_CORRECTION_BASE: 'c015c7dbf44596d1f77f405697af9a75c03e045a', commitBase: base,
      expect: (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message),
      git: args => ({ show: JSON.stringify(prior), diff: delta.join('\n'), 'ls-files': '', 'rev-parse': head, 'rev-list': parents.join(' ') })[args[0]]
    };
    vm.runInNewContext(scope + '\n' + ancestry, sandbox);
  }
  run();
  assert.throws(() => run({ mutate: b => { b.successorTools.preactivationProductionEnvironmentMetadataCorrectionBaseSha = '0'.repeat(40); } }), /exact Production environment metadata correction base/);
  assert.throws(() => run({ delta: [...files, 'src/unrelated.ts'] }), /exact Production environment metadata correction paths/);
  assert.throws(() => run({ delta: files.slice(1) }), /exact Production environment metadata correction paths/);
  for (const file of ['scripts/rcap-hosted-legal-aid-browser.mjs', 'scripts/rcap-production-worker-readiness.mjs']) {
    assert.throws(() => run({ mutate: b => { b.successorTools.files[file] = '0'.repeat(64); } }), /preserved tools/);
  }
  assert.throws(() => run({ mutate: b => { b.successorTools.preactivationLegalAidSeedRerunCorrectionBaseSha = '0'.repeat(40); } }), /preserved approved seed correction base/);
  assert.throws(() => run({ mutate: b => { b.successorTools.preactivationHarnessCorrectionBaseSha = '0'.repeat(40); } }), /preserved approved harness correction base/);
  assert.throws(() => run({ mutate: b => { b.applicationSha = '0'.repeat(40); } }), /only bounded Production environment metadata tools correction/);
  assert.throws(() => run({ parents: [head, base, 'b'.repeat(40)] }), /one non-merge tools successor/);
  assert.throws(() => run({ parents: [head, 'b'.repeat(40)] }), /one non-merge tools successor/);
});
