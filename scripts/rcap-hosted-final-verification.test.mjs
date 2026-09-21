import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, register } from 'node:module';
import test from 'node:test';
import { claimAndVerifyHostedFixture, HOSTED_FINAL_REVIEW_ANSWERS } from './rcap-hosted-final-verification.mjs';
import { prepareFixture } from './rcap-hosted-checkout-mapping-evidence.test.mjs';
const { reviewed } = await prepareFixture();
const screeningAnswers = reviewed.commercialFlow.screening.answers;

register('./lib/ts-esm-loader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const ts = require('typescript');
const info = await import('../src/lib/expungement-ai/packet-information.ts');
const presentation = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');

// Load the actual handlers/guard. Only authentication, storage and person lookup
// are doubles; review, hashes, revisions, preflight, builder and HTTP mapping are real.
async function load(relative, overrides) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const deps = { ...overrides };
  for (const match of source.matchAll(/(?:from\s+|import\s+)["']([^"']+)["']/g)) {
    const name = match[1];
    if (name in deps) continue;
    if (name === 'server-only') deps[name] = {};
    else if (name.startsWith('@/')) {
      deps[name] = await import(new URL(`../src/${name.slice(2)}.ts`, import.meta.url));
    } else deps[name] = require(name);
  }
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)((name) => {
    assert.ok(name in deps, `unexpected dependency ${name}`);
    return deps[name];
  }, mod, mod.exports);
  return mod.exports;
}

async function application() {
  const id = 'd1111111-1111-4111-8111-111111111111';
  const trusted = { jurisdiction: 'MS', profileVersion: '2026-06-19-source-conversion-1', matterId: id,
    answers: screeningAnswers, product: 'expungement_ai_dtc', sourceSessionId: 'pending-fixture',
    claimedAt: '2026-09-21T00:00:00Z', partnerBenefitActive: false, partnerSlug: null };
  const item = { id, state: 'MS', paymentStatus: 'unpaid', artifactRefs: {} };
  let protectedRecord = null;
  let paymentReads = 0;
  const auth = { getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, isVerified: true, userId: 'participant' }) };
  const briefcase = { getBriefcaseItem: async () => item };
  const packetHandler = await load('../src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts', {
    '@/lib/rcap/briefcase/auth': auth,
    '@/lib/expungement-ai/briefcase': briefcase,
    '@/lib/expungement-ai/briefcase-presentation-authority': { ...presentation,
      readTrustedBriefcasePresentationSource: async () => ({ ok: true, value: trusted }) },
    '@/lib/expungement-ai/verification-cas': {
      readProtectedPacketVerification: async () => protectedRecord
        ? { ok: true, value: protectedRecord } : { ok: false, reason: 'protected_verification_authority_missing' },
      persistProtectedPacketVerification: async ({ transition }) => {
        assert.equal(transition.expectedPriorRevision, protectedRecord?.revision ?? 0);
        assert.equal(transition.expectedPriorHash, protectedRecord?.status === 'verified' ? protectedRecord.hash : null);
        protectedRecord = transition.nextVerification;
        return { ok: true, value: protectedRecord };
      }
    }
  });
  const guard = await load('../src/lib/expungement-ai/consumer-render-request.ts', {
    '@/lib/expungement-ai/briefcase': briefcase,
    '@/lib/rcap/render/consumer-delivery-control': { resolveConsumerDeliveryAccess: () => ({ allowed: true }) },
    '@/lib/expungement-ai/packet-information': { ...info,
      requireCurrentPacketVerification: async () => info.requireCurrentPacketVerificationRecord(item, protectedRecord) },
    '@/lib/expungement-ai/consumer-identity': {
      consumerMatterIdForItem: () => id, CONSUMER_PERSON_NAMESPACE: 'consumer',
      resolveConsumerPersonId: async () => ({ ok: true, personId: 'person' }) },
    '@/lib/expungement-ai/consumer-payment-authority': {
      CONSUMER_PACKET_PRODUCT_ID: 'expungement_packet',
      consumerPacketPaymentAuthority: async () => { paymentReads++; return { valid: false, reason: 'no_authority_row' }; }
    },
    '@/lib/rcap/render/job-queue': { enqueueVerifiedConsumerRender: () => assert.fail('unpaid fixture enqueued') }
  });
  const render = await load('../src/app/api/expungement-ai/packet/render/route.ts', {
    '@/lib/rcap/briefcase/auth': auth,
    '@/lib/expungement-ai/consumer-render-request': guard
  });
  const call = async (endpoint, { body }) => {
    // Claim transport is isolated here; verification is always the real handler.
    if (endpoint.endsWith('/pending')) return { status: 200, json: { ok: true, claimToken: 'opaque-test-token' } };
    if (endpoint.endsWith('/pending/claim')) return { status: 200, json: { ok: true, matterId: id } };
    const request = new Request('https://fixture.test' + endpoint, { method: 'POST', body: JSON.stringify(body) });
    const response = endpoint.endsWith('/packet-information')
      ? await packetHandler.POST(request, { params: Promise.resolve({ itemId: id }) })
      : await render.POST(request);
    return { status: response.status, json: await response.json() };
  };
  return { call, item, get record() { return protectedRecord; }, get paymentReads() { return paymentReads; } };
}

const fixture = { jurisdiction: 'MS', profileVersion: '2026-06-19-source-conversion-1',
  screeningCorrelationId: 'test', answers: screeningAnswers };
const record = (id, passed, evidence) => assert.ok(passed, `${id}: ${evidence}`);

test('real final-review lifecycle: unverified unpaid -> 403; verified unpaid -> 402 payment refusal', async () => {
  const app = await application();
  const cases = [];
  const id = await claimAndVerifyHostedFixture({ call: app.call, screening: fixture,
    answers: HOSTED_FINAL_REVIEW_ANSWERS,
    record: (id, passed, evidence) => { record(id, passed, evidence); cases.push(id); } });
  assert.ok(cases.includes('unverified_unpaid_render_requires_verification'));
  assert.equal(app.paymentReads, 0, 'verification refusal must occur before payment');
  const current = info.requireCurrentPacketVerificationRecord(app.item, app.record);
  assert.equal(current.revision, 2);
  assert.match(current.hash, /^[a-f0-9]{64}$/);
  const unpaid = await app.call('/api/expungement-ai/packet/render', { body: { briefcaseItemId: id } });
  assert.equal(unpaid.status, 402, JSON.stringify(unpaid));
  assert.equal(unpaid.json.error, 'A recorded payment is required before rendering.');
  assert.equal(unpaid.json.reason, 'no_authority_row');
  assert.equal(app.paymentReads, 1);
});

for (const [label, change] of [
  ['skip explicit final review', (body) => ({ ...body, verify: false })],
  ['invalid date cannot pass accuracy review', (body) => body.verify ? body : ({ ...body,
    answers: { ...body.answers, arrest_date: { value: 'not-a-date', unknown: false } } })]
]) {
  test(label, async () => {
    const app = await application();
    await assert.rejects(claimAndVerifyHostedFixture({ screening: fixture, answers: HOSTED_FINAL_REVIEW_ANSWERS,
      record, call: (endpoint, options) => app.call(endpoint, endpoint.endsWith('/packet-information')
        ? { body: change(options.body) } : options) }), /current_final_verification_established/);
    assert.equal(app.paymentReads, 0);
  });
}

test('tampering with the established verification hash restores verification refusal', async () => {
  const app = await application();
  const id = await claimAndVerifyHostedFixture({ call: app.call, screening: fixture,
    answers: HOSTED_FINAL_REVIEW_ANSWERS, record });
  app.record.hash = '0'.repeat(64);
  const response = await app.call('/api/expungement-ai/packet/render', { body: { briefcaseItemId: id } });
  assert.equal(response.status, 403);
  assert.equal(response.json.reason, 'current final verification is required');
  assert.equal(app.paymentReads, 0);
});
