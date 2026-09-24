import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, register } from 'node:module';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import { syntax } from './rcap-hosted-surface-inspection.mjs';
import { claimAndVerifyHostedFixture, HOSTED_FINAL_REVIEW_ANSWERS } from './rcap-hosted-final-verification.mjs';
import { prepareFixture } from './rcap-hosted-checkout-mapping-evidence.test.mjs';
const { reviewed } = await prepareFixture();
const screeningAnswers = reviewed.commercialFlow.screening.answers;

register('./lib/ts-esm-loader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const ts = require('typescript');
const info = await import('../src/lib/expungement-ai/packet-information.ts');
const presentation = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const { claimTokenHash } = await import('../src/lib/expungement-ai/claim/claim-token.ts');
const { consumerMatterIdForItem } = await import('../src/lib/expungement-ai/consumer-identity.ts');

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
  const pendingId = 'd2222222-2222-4222-8222-222222222222';
  const item = { id, userId: 'participant', state: 'MS', paymentStatus: 'unpaid', artifactRefs: {} };
  let pendingRow = null;
  let claimPayload = null;
  // Transport/storage doubles only. The pending handler, evaluator and claim
  // service decide every persisted field (including attribution); no locale is
  // invented here. The real claim SQL inserts p_matter.artifact_refs_json as-is.
  const storage = {
    from(table) {
      assert.equal(table, 'consumer_pending_screening_results');
      return {
        insert: async (row) => { pendingRow = { ...row, pending_id: pendingId }; return { error: null }; },
        select() { return this; },
        eq(key, value) { assert.equal(key, 'claim_token_hash'); this.hash = value; return this; },
        async maybeSingle() { return { data: pendingRow?.claim_token_hash === this.hash ? pendingRow : null, error: null }; }
      };
    },
    async rpc(name, args) {
      assert.equal(name, 'claim_pending_screening_result');
      assert.equal(claimTokenHash(args.p_claim_token), pendingRow.claim_token_hash);
      assert.equal(args.p_user_id, item.userId);
      claimPayload = structuredClone(args.p_matter);
      Object.assign(item, { sourceSessionId: claimPayload.source_session_id,
        state: claimPayload.jurisdiction, pathwayLabel: claimPayload.pathway_label,
        resultCode: claimPayload.result_code, packetType: claimPayload.packet_type,
        paymentStatus: claimPayload.payment_status, paymentAllowed: claimPayload.payment_allowed,
        artifactRefs: structuredClone(claimPayload.artifact_refs_json) });
      return { data: { outcome: 'claimed', matter_id: id }, error: null };
    }
  };
  const pendingHandler = await load('../src/app/api/expungement-ai/screening/pending/route.ts', {
    '@/lib/supabase/server': { getSupabaseAdminClient: () => storage }
  });
  const claimService = await load('../src/lib/expungement-ai/claim/claim-service.ts', {
    '@/lib/supabase/server': { getSupabaseAdminClient: () => storage }
  });
  let protectedRecord = null;
  let paymentReads = 0;
  const auth = { getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, isVerified: true, userId: 'participant' }) };
  const ownedItem = async (userId, itemId) => userId === item.userId && itemId === id && claimPayload ? item : null;
  const briefcase = { getBriefcaseItem: ownedItem, getBriefcaseItemForWebhook: ownedItem };
  const readProtected = async ({ consumerAuthUserId, briefcaseItemId }) =>
    await ownedItem(consumerAuthUserId, briefcaseItemId) && protectedRecord
      ? { ok: true, value: protectedRecord } : { ok: false, reason: 'protected_verification_authority_missing' };
  const verifiedInfo = await load('../src/lib/expungement-ai/packet-information.ts', {
    '@/lib/expungement-ai/verification-cas': { readProtectedPacketVerification: readProtected }
  });
  const personalized = await load('../src/lib/rcap/render/personalized-packet.ts', {
    '@/lib/expungement-ai/briefcase': briefcase,
    '@/lib/expungement-ai/packet-information': verifiedInfo
  });
  const packetHandler = await load('../src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts', {
    '@/lib/rcap/briefcase/auth': auth,
    '@/lib/expungement-ai/briefcase': briefcase,
    '@/lib/expungement-ai/briefcase-presentation-authority': { ...presentation,
      readTrustedBriefcasePresentationSource: async () => ({ ok: true, value: {
        jurisdiction: pendingRow.jurisdiction, profileVersion: pendingRow.profile_version,
        matterId: pendingRow.screening_correlation_id, answers: pendingRow.screening_answers,
        product: pendingRow.product, sourceSessionId: item.sourceSessionId,
        claimedAt: '2026-09-21T00:00:00Z', partnerBenefitActive: false, partnerSlug: null
      } }) },
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
    const request = new Request('https://fixture.test' + endpoint, { method: 'POST', body: JSON.stringify(body) });
    if (endpoint.endsWith('/pending/claim')) {
      const claim = await claimService.claimPendingScreeningResult({ claimToken: body.claimToken,
        authenticatedUserId: item.userId, accountVerified: true });
      return { status: claim.ok ? 200 : 403, json: claim.ok
        ? { ok: true, matterId: claim.matterId } : { ok: false, error: claim.reason } };
    }
    const response = endpoint.endsWith('/pending') ? await pendingHandler.POST(request)
      : endpoint.endsWith('/packet-information')
      ? await packetHandler.POST(request, { params: Promise.resolve({ itemId: id }) })
      : await render.POST(request);
    return { status: response.status, json: await response.json() };
  };
  return { call, item, personalized, get pending() { return pendingRow; }, get claimPayload() { return claimPayload; },
    get record() { return protectedRecord; }, get paymentReads() { return paymentReads; } };
}

const fixture = { jurisdiction: 'MS', profileVersion: '2026-06-19-source-conversion-1',
  screeningCorrelationId: 'test', answers: screeningAnswers };
const record = (id, passed, evidence) => assert.ok(passed, `${id}: ${evidence}`);

async function claimed(locale) {
  const app = await application();
  await claimAndVerifyHostedFixture({ call: app.call, screening: { ...fixture, locale },
    answers: HOSTED_FINAL_REVIEW_ANSWERS, record });
  return app;
}
async function prepareBeforePayment(app, userId = app.item.userId) {
  const verification = await app.personalized.currentPersonalizedVerification(userId, app.item.id);
  const prepared = app.personalized.preparePersonalizedPacket({ authUserId: userId,
    briefcaseItemId: app.item.id, personId: 'consumer-person', matterId: consumerMatterIdForItem(app.item.id),
    verificationHash: verification.hash, snapshot: verification.snapshot, deliveryLocale: verification.deliveryLocale });
  return { verification, prepared };
}

test('#338 old direct-SQL fixture reproduces the real pre-charge locale refusal', async () => {
  const app = await claimed('en');
  // These are exactly the two keys written by the old payment INSERT. Keep the
  // verification valid so failure is specifically the omitted attribution.
  app.item.artifactRefs = { commercialFlow: app.item.artifactRefs.commercialFlow,
    selectedTrackId: app.item.artifactRefs.selectedTrackId };
  assert.doesNotThrow(() => info.requireCurrentPacketVerificationRecord(app.item, app.record));
  await assert.rejects(prepareBeforePayment(app), (error) =>
    error.name === 'DeliveryLocaleUnavailableError' && error.claimed === undefined);
  assert.equal(app.paymentReads, 0);
});
for (const locale of ['en', 'es']) {
  test(`#338 explicit ${locale} survives real pending/claim/final review and personalized preparation`, async () => {
    const app = await claimed(locale);
    assert.equal(app.pending.locale, locale);
    assert.equal(app.claimPayload.artifact_refs_json.attribution.locale, locale);
    assert.equal(app.item.artifactRefs.attribution.locale, locale);
    assert.equal(app.item.sourceSessionId, app.pending.pending_id);
    assert.equal(app.item.artifactRefs.attribution.product, 'expungement_ai_dtc');
    const { verification, prepared } = await prepareBeforePayment(app);
    assert.equal(verification.deliveryLocale, locale);
    assert.equal(verification.hash, app.record.hash);
    assert.equal(verification.snapshot.selectedTrackId, 'ms-nonconv');
    assert.equal(prepared.payload.renderInputPayload.deliveryLocale, locale);
    assert.equal(prepared.payload.renderInputPayload.verificationHash, verification.hash);
    assert.equal(prepared.payload.renderInputPayload.authUserId, app.item.userId);
    assert.equal(prepared.payload.renderPacket.briefcase_id, app.item.id);
    assert.equal(prepared.spec.packetId, prepared.payload.renderPacket.id);
    assert.equal(prepared.spec.inputHash, prepared.payload.renderInputPayload.inputHash);
    assert.equal((await prepareBeforePayment(app)).prepared.spec.packetId, prepared.spec.packetId);
    assert.equal(app.item.paymentStatus, 'unpaid');
    assert.equal(app.paymentReads, 0);
  });
}
for (const locale of [undefined, null, 'fr']) {
  test(`#338 missing/unsupported ${String(locale)} is refused, never converted to English`, async () => {
    const app = await claimed(locale);
    await assert.rejects(prepareBeforePayment(app), { name: 'DeliveryLocaleUnavailableError' });
    assert.equal(app.paymentReads, 0);
  });
}
test('#338 recorded delivery language participates in packet/input identity, independently of the verified facts', async () => {
  const app = await claimed('en');
  const en = await prepareBeforePayment(app);
  app.item.artifactRefs.attribution.locale = 'es';
  const es = await prepareBeforePayment(app);
  assert.equal(es.verification.hash, en.verification.hash, 'same protected facts');
  assert.deepEqual(es.verification.snapshot, en.verification.snapshot);
  assert.equal(es.verification.deliveryLocale, 'es');
  assert.notEqual(es.prepared.spec.packetId, en.prepared.spec.packetId);
  assert.notEqual(es.prepared.spec.inputHash, en.prepared.spec.inputHash);
});
test('#338 personalized preparation still refuses wrong owner and tampered verification', async () => {
  const app = await claimed('en');
  await assert.rejects(prepareBeforePayment(app, 'other-participant'), /owner unavailable/);
  app.record.hash = '0'.repeat(64);
  await assert.rejects(prepareBeforePayment(app), /current final verification/);
  assert.equal(app.paymentReads, 0);
});

const paymentSource = fs.readFileSync(new URL('./rcap-hosted-acceptance-payment.mjs', import.meta.url), 'utf8');
const paymentSyntax = syntax('payment.mjs', paymentSource);
const paymentFunction = (name) => paymentSyntax.nodes.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name).getText();
async function paymentInputs() {
  const start = paymentSource.indexOf('const { packetInformationModelFor, packetInformationReviewSafety } =');
  const end = paymentSource.indexOf('// --- 3. Claim and verify', start);
  assert.ok(start >= 0 && end > start);
  const preparation = paymentSource.slice(start, end).replaceAll('"../src/', `"${new URL('../src/', import.meta.url).href}`);
  const script = `import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
    import {buildRenderJobSpec} from '${new URL('../src/lib/rcap/render/job-contract.ts', import.meta.url).href}';
    const rootDir=${JSON.stringify(process.cwd())}; const JOURNEY_STATE='';
    let itemId='d1111111-1111-4111-8111-111111111111'; let route={state:'MS'}; const evidence={};
    function record(id, passed, detail) { if (!passed) throw Error(id+': '+detail); }
    function finish() { throw Error('payment fixture preparation refused'); }
    ${preparation}
    export {reviewed, derived, route};`;
  return import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`);
}
function paymentContext(app, locale, inputs, sqlStatus = 201) {
  const evidence = {};
  const cases = new Map();
  const context = { ...inputs, evidence, SYNTHETIC_PARTICIPANT_LOCALE: locale,
    A: { id: app.item.userId, cookie: 'isolated-auth-transport' }, itemId: 'screening-correlation',
    runNamespace: {}, callApp: app.call, claimAndVerifyHostedFixture,
    verdicts: cases, console: { log() {}, error() {} },
    finish: () => { throw new Error('EVIDENCE_FINISHED'); },
    redactSecrets: (text) => text.replaceAll('secret-test-value', '[REDACTED]'),
    process: { env: {} }, SUPABASE_URL: 'https://fixture.invalid',
    serviceRoleKey: async () => 'isolated-storage-key',
    personalized: app.personalized,
    identity: { consumerMatterIdForItem, resolveConsumerPersonId: async () => ({ ok: true, personId: 'consumer-person' }) },
    sqlText: (text) => String(text).replaceAll("'", "''"),
    PROJECT_REF: 'isolated-project', SUPABASE_ACCESS_TOKEN: 'isolated-management-key',
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.supabase.com/v1/projects/isolated-project/database/query');
      const { query } = JSON.parse(options.body);
      assert.match(query, /from public\.consumer_briefcase_items/);
      assert.ok(query.includes(app.item.id) && query.includes(app.item.userId));
      return new Response(JSON.stringify([{ ...app.claimPayload, id: app.item.id, user_id: app.item.userId,
        source_pending_result_id: app.pending.pending_id, checkout_session_id: null, provider_event_id: null }]),
      { status: sqlStatus });
    }
  };
  vm.createContext(context);
  vm.runInContext(paymentFunction('sql'), context);
  vm.runInContext(paymentFunction('seededItemReadbackAgreement'), context);
  vm.runInContext(paymentFunction('record'), context);
  vm.runInContext(paymentFunction('prechargeStep'), context);
  vm.runInContext(paymentFunction('personalizedPacketIdFromRunner')
    .replace('await import("../src/lib/rcap/render/personalized-packet.ts")', 'personalized')
    .replace('await import("../src/lib/expungement-ai/consumer-identity.ts")', 'identity'), context);
  return { context, evidence, cases };
}
for (const locale of ['en', 'es']) {
  test(`#338 actual payment fixture and runner prepare ${locale} before charge through participant APIs`, async () => {
    const app = await application();
    const input = await paymentInputs();
    const { context, evidence, cases } = paymentContext(app, locale, input);
    const start = paymentSource.indexOf('let preflightRoute = null;');
    const end = paymentSource.indexOf('// --- 3b. What the published image', start);
    await vm.runInContext(`(async () => { ${paymentSource.slice(start, end)} })()`, context);
    assert.ok([...cases.values()].every((c) => c.passed), JSON.stringify([...cases]));
    assert.equal(context.itemId, app.item.id);
    assert.equal(context.runNamespace.briefcaseItemId, app.item.id, 'replay scope follows the claimed ID');
    assert.equal(evidence.seededItem.sourceSessionId, app.pending.pending_id);
    assert.equal(evidence.seededItem.deliveryLocale, locale);
    assert.equal(evidence.seededItemAgreement.sqlStatus, 201);
    assert.equal(evidence.seededItemAgreement.passed, true);
    const id = await context.personalizedPacketIdFromRunner(context.A, app.item.id);
    const actual = await prepareBeforePayment(app);
    assert.equal(id, actual.prepared.spec.packetId);
    assert.equal(evidence.personalizedPreparation.deliveryLocale, locale);
    assert.equal(evidence.personalizedPreparation.verificationHash, app.record.hash);
    assert.equal(evidence.personalizedPreparation.inputHash, actual.prepared.spec.inputHash);
    assert.equal(app.paymentReads, 0);
  });
}
test('#338 pre-charge exception records a failed verdict and writes payment evidence before exit', async () => {
  const app = await claimed('en');
  delete app.item.artifactRefs.attribution;
  const { context, evidence, cases } = paymentContext(app, 'en', await paymentInputs());
  const writes = [];
  Object.assign(context, { verdicts: cases, REQUIRED_CASES: ['not_run_after_exception'], JURISDICTION_SCOPE: {},
    fs: { writeFileSync: (file, body) => writes.push({ file, document: JSON.parse(body) }) },
    path: { join: (...parts) => parts.join('/') }, EVIDENCE_DIR: 'isolated-evidence', console: { log() {}, error() {} },
    process: { env: {}, exit: (code) => { assert.equal(code, 1); throw new Error('EVIDENCE_FINISHED'); } } });
  // Use the actual finish() writer as well as the actual exception boundary.
  vm.runInContext(paymentFunction('finish'), context);
  await assert.rejects(context.personalizedPacketIdFromRunner(context.A, app.item.id), /EVIDENCE_FINISHED/);
  assert.equal(evidence.prechargeFailure.name, 'DeliveryLocaleUnavailableError');
  assert.equal(evidence.prechargeFailure.stage, 'personalized_packet_identity');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].file, 'isolated-evidence/payment.json');
  assert.equal(writes[0].document.passed, false);
  assert.ok(writes[0].document.failedCases.includes('precharge_preparation_exception'));
  assert.match(writes[0].document.cases.precharge_preparation_exception.observed, /DeliveryLocaleUnavailableError/);
  assert.equal(app.paymentReads, 0);
});

test('#338 actual claimed-row predicate refuses identity, locale and premature payment/work mutations', async () => {
  const app = await claimed('en');
  const inputs = await paymentInputs();
  const row = { ...app.claimPayload, id: app.item.id, user_id: app.item.userId,
    source_pending_result_id: app.pending.pending_id, checkout_session_id: null, provider_event_id: null };
  const accepts = (seeded) => paymentReadbackProof({ status: 200, ok: true, json: [seeded] },
    { ...inputs, itemId: app.item.id, ownerId: app.item.userId }).passed;
  assert.equal(accepts(row), true);
  for (const [name, change] of [
    ['wrong owner', (r) => { r.user_id = 'other'; }],
    ['missing source session', (r) => { r.source_session_id = null; }],
    ['wrong source pending result', (r) => { r.source_pending_result_id = 'other'; }],
    ['missing attribution', (r) => { delete r.artifact_refs_json.attribution; }],
    ['wrong selected locale', (r) => { r.artifact_refs_json.attribution.locale = 'es'; }],
    ['wrong attribution product', (r) => { r.artifact_refs_json.attribution.product = 'rcap_partner'; }],
    ['lost selected track', (r) => { delete r.artifact_refs_json.selectedTrackId; }],
    ['premature paid status', (r) => { r.payment_status = 'paid'; }],
    ['premature Session', (r) => { r.checkout_session_id = 'cs_test_wrong'; }],
    ['premature work', (r) => { r.packet_status = 'queued'; }],
    ['premature provider event', (r) => { r.provider_event_id = 'evt_wrong'; }]
  ]) {
    const changed = structuredClone(row); change(changed);
    assert.equal(accepts(changed), false, name);
  }
});

// Evaluate the production helper AND its actual caller's verdict expression.
// No hosted credentials, participant answers, database write or Stripe call.
function paymentReadbackProof(readback, inputs) {
  const initializer = (name) => paymentSyntax.nodes.find((n) => ts.isVariableDeclaration(n)
    && n.name.getText() === name).initializer.getText();
  const context = { readback, ...inputs, A: { id: inputs.ownerId }, SYNTHETIC_PARTICIPANT_LOCALE: 'en',
    SUPABASE_ACCESS_TOKEN: 'secret-test-value', VERCEL_TOKEN: '', BYPASS: '', STRIPE_KEY: '', WEBHOOK_SECRET: '', ANON_KEY: '' };
  const proof = vm.runInNewContext(`${paymentFunction('redactSecrets')}
    ${paymentFunction('seededItemReadbackAgreement')}
    const agreement = ${initializer('agreement')};
    const agrees = ${initializer('agrees')};
    ({ passed: agrees, failedConditions: agreement.failedConditions });`, context);
  return JSON.parse(JSON.stringify(proof));
}

async function paymentSqlResponse(status, body) {
  const context = vm.createContext({ PROJECT_REF: 'isolated-project', SUPABASE_ACCESS_TOKEN: 'isolated-key',
    fetch: async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }) });
  vm.runInContext(paymentFunction('sql'), context);
  return context.sql('select recorded_response_only');
}

async function recordedPaymentReadback() {
  const { derived, route } = await paymentInputs();
  // Run 35933049147's status and directly verified fields. The route values
  // come from the existing fixture; the source-session identifier is sanitized.
  const inputs = { derived: structuredClone(derived), route: structuredClone(route),
    itemId: 'c7f4bcab-869d-4cd3-b51a-c963060527e2', ownerId: 'b6dc86a3-12bb-490d-b130-48d95d426a1e' };
  const row = { id: inputs.itemId, user_id: inputs.ownerId, status: 'packet_ready',
    result_code: 'packet_ready_with_caution', packet_type: 'custom_pleading', pathway_label: route.pathwayLabel,
    source_session_id: 'recorded-source-session', source_pending_result_id: 'recorded-source-session',
    artifact_refs_json: { attribution: { product: 'expungement_ai_dtc', locale: 'en' }, selectedTrackId: derived.trackId },
    payment_status: 'unpaid', payment_allowed: true, checkout_session_id: null, packet_status: 'not_started', provider_event_id: null };
  return { inputs, row };
}

for (const status of [200, 201]) {
  test(`#35933049147 actual SQL helper and predicate accept valid HTTP ${status}, preserving raw status`, async () => {
    const { row, inputs } = await recordedPaymentReadback();
    const response = await paymentSqlResponse(status, [row]);
    assert.equal(response.status, status);
    assert.equal(response.ok, true);
    assert.deepEqual(paymentReadbackProof(response, inputs), { passed: true, failedConditions: [] });
  });
}
for (const status of [300, 302, 400, 401, 403, 409, 422, 429, 500, 503]) {
  test(`#35933049147 HTTP ${status} cannot pass with the exact plausible row`, async () => {
    const { row, inputs } = await recordedPaymentReadback();
    const response = await paymentSqlResponse(status, [row]);
    assert.equal(response.status, status);
    assert.equal(response.ok, false);
    assert.deepEqual(paymentReadbackProof(response, inputs), { passed: false,
      failedConditions: [{ name: 'sql_http_success', actual: status, expected: 'HTTP 200-299 (Response.ok)' }] });
  });
}
for (const [name, body, condition] of [
  ['non-JSON body', () => '<html>error</html>', 'sql_rows_shape'],
  ['JSON null', () => null, 'sql_rows_shape'],
  ['JSON string', () => '"error"', 'sql_rows_shape'],
  ['empty object', () => ({}), 'sql_rows_shape'],
  ['error body', () => ({ error: 'query failed' }), 'sql_rows_shape'],
  ['error body containing plausible rows', (row) => ({ error: 'query failed', rows: [row] }), 'sql_rows_shape'],
  ['single row without array', (row) => row, 'sql_rows_shape'],
  ['empty rows', () => [], 'sql_row_count'],
  ['multiple rows', (row) => [row, row], 'sql_row_count'],
  ['null row', () => [null], 'sql_row_shape'],
  ['array row', (row) => [[row]], 'sql_row_shape'],
  ['scalar row', () => ['row'], 'sql_row_shape'],
  ['error row', () => [{ error: 'query failed' }], 'item_id']
]) {
  test(`#35933049147 successful HTTP cannot hide ${name}`, async () => {
    const { row, inputs } = await recordedPaymentReadback();
    for (const status of [200, 201]) {
      const proof = paymentReadbackProof(await paymentSqlResponse(status, body(row)), inputs);
      assert.equal(proof.passed, false);
      assert.ok(proof.failedConditions.some((failure) => failure.name === condition), JSON.stringify(proof));
    }
  });
}

for (const [condition, label, change] of [
  ...Object.entries({ id: 'other', user_id: 'other', result_code: 'guidance_only', packet_type: 'guidance_packet',
    pathway_label: 'other', status: 'review', payment_status: 'paid', payment_allowed: false,
    checkout_session_id: 'cs_test_premature', packet_status: 'queued', provider_event_id: 'evt_premature',
    source_pending_result_id: null, source_session_id: 'other' }).map(([key, value]) => [
    ({ id: 'item_id', user_id: 'owner_id', status: 'item_status', source_session_id: 'source_session_linkage' })[key] ?? key,
    key, (row) => { row[key] = value; }]),
  ['payment_allowed', 'truthy payment allowance', (r) => { r.payment_allowed = 1; }],
  ['checkout_session_id', 'missing checkout column', (r) => { delete r.checkout_session_id; }],
  ['provider_event_id', 'missing event column', (r) => { delete r.provider_event_id; }],
  ['source_pending_result_id', 'non-string source ids', (r) => { r.source_pending_result_id = r.source_session_id = 1; }],
  ['attribution_product', 'wrong product', (r) => { r.artifact_refs_json.attribution.product = 'rcap_partner'; }],
  ['attribution_product', 'missing attribution', (r) => { delete r.artifact_refs_json.attribution; }],
  ...[undefined, null, 'es', 'fr'].map((locale) => ['attribution_locale', `locale ${locale}`,
    (r) => { r.artifact_refs_json.attribution.locale = locale; }]),
  ['selected_track_id', 'wrong track', (r) => { r.artifact_refs_json.selectedTrackId = 'other'; }],
  ['selected_track_id', 'missing track', (r) => { delete r.artifact_refs_json.selectedTrackId; }],
  ...Object.entries({ jurisdiction: 'IL', rendererKind: 'none', routeKind: 'legacy_retired', authorityAllowed: false,
    profileId: 'IL', profileVersion: '', routeId: 'MS:other' }).map(([key, value]) => [
    ({ jurisdiction: 'jurisdiction', rendererKind: 'renderer_kind', routeKind: 'route_kind',
      authorityAllowed: 'fulfillment_authority', profileId: 'profile_id', profileVersion: 'profile_version', routeId: 'route_id' })[key],
    key, (_row, inputs) => { inputs.derived[key] = value; }]),
  ['fulfillment_authority', 'truthy authority', (_r, i) => { i.derived.authorityAllowed = 'true'; }],
  ['profile_version', 'non-string profile version', (_r, i) => { i.derived.profileVersion = 1; }],
  ['route_id', 'wrong compiled pathway', (_r, i) => { i.derived.compiledPathwayId = 'other'; }],
  ['jurisdiction', 'wrong expected jurisdiction', (_r, i) => { i.route.state = 'IL'; }]
]) {
  test(`#35933049147 ${label} remains refused with named actual/expected diagnostics`, async () => {
    const { row, inputs } = await recordedPaymentReadback();
    change(row, inputs);
    const proof = paymentReadbackProof(await paymentSqlResponse(201, [row]), inputs);
    assert.equal(proof.passed, false);
    const failure = proof.failedConditions.find((f) => f.name === condition);
    assert.ok(failure, JSON.stringify(proof));
    assert.ok(Object.hasOwn(failure, 'actual') && Object.hasOwn(failure, 'expected'));
  });
}

test('#35933049147 diagnostics redact secrets and never serialize participant answers or error bodies', async () => {
  const { row, inputs } = await recordedPaymentReadback();
  row.artifact_refs_json.answers = { confidential: 'participant-answer-sentinel' };
  row.result_code = { confidential: 'participant-answer-sentinel' };
  row.artifact_refs_json.attribution.locale = 'secret-test-value';
  const proof = paymentReadbackProof(await paymentSqlResponse(201, [row]), inputs);
  assert.deepEqual(proof.failedConditions, [
    { name: 'result_code', actual: '<object>', expected: 'packet_ready_with_caution' },
    { name: 'attribution_locale', actual: '***REDACTED***', expected: 'en' }
  ]);
  assert.doesNotMatch(JSON.stringify(proof), /participant-answer-sentinel|secret-test-value/);
  const errorProof = paymentReadbackProof(await paymentSqlResponse(201,
    { error: 'secret-test-value participant-answer-sentinel', rows: [row] }), inputs);
  assert.doesNotMatch(JSON.stringify(errorProof), /participant-answer-sentinel|secret-test-value/);
});

test('#35933049147 actual harness records the failed SQL subcondition and stops before charge', async () => {
  const app = await application();
  const { context, evidence, cases } = paymentContext(app, 'en', await paymentInputs(), 401);
  const start = paymentSource.indexOf('let preflightRoute = null;');
  const end = paymentSource.indexOf('// --- 3b. What the published image', start);
  await assert.rejects(vm.runInContext(`(async () => { ${paymentSource.slice(start, end)} })()`, context), /EVIDENCE_FINISHED/);
  const verdict = cases.get('seeded_item_agrees_with_the_authoritative_resolver');
  assert.equal(verdict.passed, false);
  assert.match(verdict.observed, /SQL=401; rows=1; failedSubconditions=\[\{"name":"sql_http_success","actual":401,"expected":"HTTP 200-299/);
  assert.equal(evidence.seededItemAgreement.sqlStatus, 401);
  assert.equal(evidence.seededItemAgreement.failedConditions.length, 1);
  assert.equal(evidence.seededItem, null, 'invalid readback bodies must not be serialized into evidence');
  assert.equal(app.paymentReads, 0);
});

test('#338 synthetic language is an explicit selection; diagnostic messages use the actual secret redactor', async () => {
  const selection = paymentSyntax.nodes.find((n) => ts.isVariableDeclaration(n)
    && n.name.getText() === 'SYNTHETIC_PARTICIPANT_LOCALE').initializer;
  assert.ok(ts.isStringLiteral(selection));
  assert.equal(selection.text, 'en');
  const app = await claimed('en');
  const { context, evidence } = paymentContext(app, 'en', await paymentInputs());
  Object.assign(context, { SUPABASE_ACCESS_TOKEN: 'secret-test-value', VERCEL_TOKEN: '', BYPASS: '',
    STRIPE_KEY: '', WEBHOOK_SECRET: '', ANON_KEY: '' });
  vm.runInContext(paymentFunction('redactSecrets'), context);
  await assert.rejects(context.prechargeStep('claim_and_final_verification', async () => {
    throw new Error('transport secret-test-value failed');
  }), /EVIDENCE_FINISHED/);
  assert.equal(evidence.prechargeFailure.message, 'transport ***REDACTED*** failed');
});

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
