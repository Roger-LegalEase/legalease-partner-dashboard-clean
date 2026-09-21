import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const pathway = 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const identity = { jurisdiction: 'MS', pathwayId: pathway, selectedTrackId: 'ms-nonconv', routeKind: 'legacy_retired' };
const expectedPaths = [...fs.readFileSync('scripts/verify-ms-render-runtime-trace.mjs', 'utf8')
  .matchAll(/^  "(data\/[^"\n]+)",$/gm)].map(match => match[1]);
assert.equal(expectedPaths.length, 13);
function load(file, deps, logger = console) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'console', js)(name => {
    if (name in deps) return deps[name];
    if (name.startsWith('node:')) return require(name);
    return {}; // Unused services must not be invoked in these refused-render cases.
  }, mod, mod.exports, logger);
  return mod.exports;
}
function harness({ warm = false, missing = null, logThrows = false } = {}) {
  let populated = warm;
  const events = [], logs = [], reads = [];
  const diagnostic = load('src/lib/expungement-ai/target4-render-diagnostic.ts', {
    'node:fs': { readFileSync(file) {
      events.push('file-read');
      const relative = path.relative(process.cwd(), file);
      assert.ok(expectedPaths.includes(relative), `unbounded read: ${relative}`);
      reads.push(relative);
      if (relative === missing) throw Object.assign(new Error('SECRET_ERROR_PARTICIPANT'), { code: 'ENOENT' });
      return Buffer.from('private-evidence-bytes');
    } },
    '@/lib/rcap/fulfillment/paid-consumer-successor': { loadMsPaidConsumerSuccessor() {
      events.push('successor'); return missing ? null : { decisionId: 'MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3' };
    } },
    '@/lib/rcap/documents/factory-v2-registry': {
      factoryV2RegistryCacheIsPopulated() { events.push('peek'); return populated; },
      previewFactoryV2MigrationExists() { events.push('migration'); return !missing; },
      factoryV2RouteFor(...args) {
        assert.equal(populated, true, 'diagnostic initialized a cold cache');
        assert.deepEqual(args, ['MS', pathway, 'ms-nonconv']);
        events.push('factory');
        return missing ? null : { packetFamilyId: 'ms-nonconv-set', registryTrackIds: ['ms-nonconv'], retiredLegacyRouteMigration: {} };
      }
    }
  }, { info(marker, json) {
    if (logThrows) throw new Error('LOGGER_SECRET');
    assert.equal(marker, 'rcap_target4_render_runtime');
    logs.push(JSON.parse(json));
  } });
  return { diagnostic, events, logs, reads, normalResolve() { events.push('normal-resolve'); populated = true; } };
}
const originalEnv = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = 'preview';
process.on('exit', () => {
  if (originalEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalEnv;
});

test('production/development/unset environments perform no diagnostic work', () => {
  for (const env of ['production', 'development', undefined]) {
    if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
    const h = harness();
    assert.equal(h.diagnostic.createTarget4RenderDiagnostic(), undefined);
    assert.deepEqual(h.events, []);
  }
  process.env.VERCEL_ENV = 'preview';
});
test('each protected identity gate rejects siblings, missing tracks and aliases', () => {
  const h = harness();
  const observe = h.diagnostic.createTarget4RenderDiagnostic();
  for (const delta of [{ jurisdiction: 'IL' }, { jurisdiction: 'ms' }, { pathwayId: 'other' },
    { selectedTrackId: null }, { selectedTrackId: 'ms-other' }]) observe({ ...identity, ...delta });
  assert.deepEqual(h.events, ['peek']);
  assert.deepEqual(h.logs, []);
});
test('cold cache is observed without initialization, even if callback sees an early refusal', () => {
  const h = harness();
  const observe = h.diagnostic.createTarget4RenderDiagnostic();
  assert.deepEqual(h.events, ['peek']);
  observe(identity);
  assert.ok(!h.events.includes('factory'));
  assert.equal(h.logs[0].factoryLookupPerformed, false);
  assert.equal(h.logs[0].cachePopulatedAtRequestEntry, false);
});
test('records all thirteen bounded byte hashes after normal resolution, without PII', () => {
  const h = harness();
  const observe = h.diagnostic.createTarget4RenderDiagnostic();
  h.normalResolve();
  observe({ ...identity, participantName: 'PII_SENTINEL', authUserId: 'USER_SENTINEL' });
  assert.deepEqual(h.reads, expectedPaths);
  assert.ok(h.events.indexOf('normal-resolve') < h.events.indexOf('file-read'));
  const report = h.logs[0];
  assert.equal(report.cachePopulatedAtRequestEntry, false);
  assert.equal(report.cachePopulatedAfterNormalResolution, true);
  assert.equal(report.factoryRoutePresent, true);
  assert.equal(report.packetFamilyId, 'ms-nonconv-set');
  assert.deepEqual(report.registryTrackIds, ['ms-nonconv']);
  assert.equal(report.finalRouteKind, 'legacy_retired'); // Actual normal result, not the diagnostic re-read.
  const hash = createHash('sha256').update('private-evidence-bytes').digest('hex');
  assert.ok(report.files.every(file => file.exists === true && file.sha256 === hash));
  assert.doesNotMatch(JSON.stringify(report), /PII_SENTINEL|USER_SENTINEL|private-evidence-bytes/);
});
test('warm cache and missing file are distinguished, without raw exceptions', () => {
  const h = harness({ warm: true, missing: expectedPaths[2] });
  h.diagnostic.createTarget4RenderDiagnostic()(identity);
  const report = h.logs[0];
  assert.equal(report.cachePopulatedAtRequestEntry, true);
  assert.deepEqual(report.files[2], { path: expectedPaths[2], exists: false, sha256: null, readError: 'ENOENT' });
  assert.equal(report.paidSuccessor.present, false);
  assert.equal(report.migrationExistsOnFreshRead, false);
  assert.equal(report.factoryRoutePresent, false);
  assert.doesNotMatch(JSON.stringify(report), /SECRET_ERROR_PARTICIPANT/);
});

async function renderThroughActualHandler({ logThrows = false, verified = true, protectedIdentity = identity } = {}) {
  const h = harness({ logThrows });
  const snapshot = { ...protectedIdentity, screeningAnswers: { name: 'PII_SENTINEL' }, prefilledAnswers: {}, packetAnswers: {}, serverFacts: {} };
  const guard = load('src/lib/expungement-ai/consumer-render-request.ts', {
    '@/lib/rcap/render/consumer-delivery-control': { resolveConsumerDeliveryAccess: () => ({ allowed: true }) },
    '@/lib/expungement-ai/briefcase': { getBriefcaseItem: async () => ({ id: 'ITEM_SENTINEL', state: 'MS' }) },
    '@/lib/expungement-ai/packet-information': {
      requireCurrentPacketVerification: async () => { if (!verified) throw new Error('unverified'); return { snapshot, hash: 'HASH_SENTINEL' }; },
      protectedPacketInformationModelFor: () => ({ stage: 'ready_to_generate', missingInputIds: [], reviewedAt: 'now', initialAnswers: {}, serverFacts: {} })
    },
    '@/lib/expungement-ai/render-preflight': { renderPreflight: () => ({ ready: true }) },
    '@/lib/rcap/render/job-contract': { buildRenderJobSpec() { h.normalResolve(); return { spec: null, route: { routeKind: 'legacy_retired', reason: 'retired' } }; } }
  });
  const handler = load('src/app/api/expungement-ai/packet/render/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/rcap/briefcase/auth': { getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, isVerified: true, userId: 'USER_SENTINEL' }) },
    '@/lib/expungement-ai/consumer-render-request': guard,
    '@/lib/expungement-ai/target4-render-diagnostic': h.diagnostic
  });
  const response = await handler.POST(new Request('https://preview.test/api/expungement-ai/packet/render', {
    method: 'POST', body: JSON.stringify({ briefcaseItemId: 'ITEM_SENTINEL', ...identity })
  }));
  return { h, status: response.status, body: await response.json() };
}
test('actual render handler observes only after the normal builder; response unchanged on logging failure', async () => {
  const good = await renderThroughActualHandler();
  const broken = await renderThroughActualHandler({ logThrows: true });
  assert.equal(good.status, 403);
  assert.deepEqual(good.body, broken.body);
  assert.equal(broken.status, good.status);
  assert.equal(good.h.logs.length, 1);
  assert.ok(good.h.events.indexOf('normal-resolve') < good.h.events.indexOf('factory'));
  assert.doesNotMatch(JSON.stringify(good.h.logs), /PII_SENTINEL|USER_SENTINEL|ITEM_SENTINEL|HASH_SENTINEL/);
});
test('body identity cannot enable diagnostics without exact protected verification', async () => {
  for (const options of [{ verified: false }, { protectedIdentity: { ...identity, selectedTrackId: 'other' } }]) {
    const { h, status } = await renderThroughActualHandler(options);
    assert.equal(status, 403);
    assert.equal(h.logs.length, 0);
    assert.equal(h.reads.length, 0);
  }
});
