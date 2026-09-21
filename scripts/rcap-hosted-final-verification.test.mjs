import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, register } from 'node:module';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
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
// are doubles; review, hashes, preflight, builder and HTTP mapping are real.
// Storage revision numbering below models the authoritative RPC, not the client proposal.
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

// persist_consumer_packet_verification in 20260901120000_dtc_consumer_launch_rails.sql:
// JSONB snapshot equality ignores object key order; absent nullable values are SQL NULL.
function persistVerificationDouble(prior, transition) {
  assert.equal(transition.expectedPriorRevision, prior?.revision ?? 0);
  assert.equal(transition.expectedPriorHash, prior?.status === 'verified' ? prior.hash : null);
  const next = transition.nextVerification;
  const unchanged = prior && ['draftHash', 'status', 'hash', 'draftSnapshot', 'snapshot']
    .every((field) => isDeepStrictEqual(prior[field] ?? null, next[field] ?? null));
  const revision = !prior ? (next.status === 'unverified' ? 0 : 1)
    : unchanged ? prior.revision : prior.revision + 1;
  const value = structuredClone({
    status: next.status, reason: next.reason,
    draftHash: next.draftHash, draftSnapshot: next.draftSnapshot, revision,
    ...(next.hash != null ? { hash: next.hash } : {}),
    ...(next.snapshot != null ? { snapshot: next.snapshot } : {}),
    ...(next.invalidatedAt != null ? { invalidatedAt: next.invalidatedAt } : {})
  });
  return { ok: true, value };
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
        const saved = persistVerificationDouble(protectedRecord, transition);
        protectedRecord = saved.value;
        return saved;
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
  assert.equal(current.revision, 1);
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

// These unit inputs isolate storage numbering. Real snapshot validity and the
// full hosted fixture's revision 1 are exercised by the lifecycle test above.
const draftRecord = {
  status: 'unverified', reason: 'saved', draftHash: 'a'.repeat(64),
  draftSnapshot: { a: 1, b: 2 }, revision: 999
};
const verifiedRecord = {
  ...draftRecord, status: 'verified', hash: 'b'.repeat(64), snapshot: { a: 1, b: 2 }
};
function transitionFor(prior, nextVerification) {
  return { expectedPriorRevision: prior?.revision ?? 0,
    expectedPriorHash: prior?.status === 'verified' ? prior.hash : null, nextVerification };
}
for (const [status, expected] of [['unverified', 0], ['verified', 1], ['invalidated', 1]]) {
  test(`storage double: first ${status} insert uses server revision ${expected}`, () => {
    const next = status === 'verified' ? verifiedRecord : { ...draftRecord, status };
    const saved = persistVerificationDouble(null, transitionFor(null, next));
    assert.equal(saved.value.revision, expected);
    assert.equal(next.revision, 999, 'client proposal is not mutated or trusted');
  });
}
test('storage double: unchanged JSONB snapshots preserve revision despite client proposal and metadata changes', () => {
  const prior = { ...verifiedRecord, revision: 7 };
  const next = { ...prior, revision: 999, reason: 'metadata only', invalidatedAt: '2026-09-21',
    draftSnapshot: { b: 2, a: 1 }, snapshot: { b: 2, a: 1 } };
  assert.equal(persistVerificationDouble(prior, transitionFor(prior, next)).value.revision, 7);
  const unverified = { ...draftRecord, revision: 0 };
  assert.equal(persistVerificationDouble(unverified, transitionFor(unverified,
    { ...unverified, revision: 999, hash: null, snapshot: null })).value.revision, 0);
});
for (const [field, value] of Object.entries({ draftHash: 'c'.repeat(64), status: 'invalidated',
  hash: 'd'.repeat(64), draftSnapshot: { a: 2, b: 2 }, snapshot: { a: 2, b: 2 } })) {
  test(`storage double: material ${field} change increments prior revision`, () => {
    const prior = { ...verifiedRecord, revision: 7 };
    const next = { ...prior, [field]: value, revision: 999 };
    if (field === 'status') { delete next.hash; delete next.snapshot; }
    assert.equal(persistVerificationDouble(prior, transitionFor(prior, next)).value.revision, 8);
  });
}
for (const field of ['expectedPriorRevision', 'expectedPriorHash']) {
  test(`storage double still rejects stale ${field}`, () => {
    const prior = { ...verifiedRecord, revision: 7 };
    const transition = transitionFor(prior, verifiedRecord);
    transition[field] = field === 'expectedPriorRevision' ? 6 : '0'.repeat(64);
    assert.throws(() => persistVerificationDouble(prior, transition), assert.AssertionError);
  });
}
