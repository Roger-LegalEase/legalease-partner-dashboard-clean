#!/usr/bin/env node
// Reuses the recovery scenarios from a01f4fdae/2a5c4ea73/44ed5e395.
// The provider is deterministic; the production adapter, authority client and
// committed PostgreSQL functions execute for real. No binding-success double.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test, { after } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import ts from 'typescript';
import { buildPaymentAdapter, eligibleItem, loadTsWithMocks } from './test-expungement-checkout-guards.mjs';
import { syntax } from './rcap-hosted-surface-inspection.mjs';

const USER = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const PERSON = '33333333-3333-4333-8333-333333333333';
const OTHER = '55555555-5555-4555-8555-555555555555';
const HASH = 'a'.repeat(64), PRODUCT = 'expungement_packet', CATALOG = 'prod_replacement_test';
const MIGRATION = 'supabase/migrations/20260924120000_consumer_checkout_replacement_evidence_guard.sql';
const baselineSource = execFileSync('git', ['show', 'cfec63780a6adca2fb23b7ccebd88b5b14b0beab:src/lib/expungement-ai/payment-adapter.ts'], { encoding: 'utf8' });
const sqlFunction = (file, name) => {
  const match = fs.readFileSync(file, 'utf8').match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\bas\\s+(\\$\\w*\\$)[\\s\\S]*?\\1;`, 'i'));
  assert.ok(match, `actual migration function ${name}`);
  return match[0];
};
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create schema extensions; create extension pgcrypto with schema extensions;
  create role anon; create role authenticated; create role service_role;
  create table consumer_briefcase_items (
    id uuid primary key, user_id uuid, payment_allowed boolean, payment_status text,
    payment_provider text, checkout_session_id text, payment_product_id text,
    payment_person_id uuid, payment_matter_id uuid, amount_cents integer,
    packet_status text, provider_event_id text, updated_at timestamptz,
    payment_intent_id text, payment_authority text, payment_recorded_at timestamptz,
    payment_recorded_by text, receipt_url text, currency text
  );
  create table consumer_packet_verifications (briefcase_item_id uuid primary key, status text, verification_hash text);
  create table packet_render_jobs (briefcase_item_id uuid);
  create table consumer_packet_payment_consumption (consumer_briefcase_item_id uuid);
  create table processed_stripe_events (related_object_id text);
  grant usage on schema public to anon, authenticated, service_role;
  grant select on consumer_briefcase_items to service_role;
`);
const identitySql = 'supabase/phase-55-expungement-matter-payment-binding.sql';
for (const name of ['expungement_packet_product_id', 'consumer_matter_id_for_briefcase_item']) await db.exec(sqlFunction(identitySql, name));
await db.exec(sqlFunction('supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql', 'bind_consumer_checkout_verification'));
await db.exec(fs.readFileSync(MIGRATION, 'utf8')); // Including grants and unique index, unchanged.
const MATTER = (await db.query('select consumer_matter_id_for_briefcase_item($1) id', [ITEM])).rows[0].id;
const originalCatalog = process.env.STRIPE_CONSUMER_PACKET_PRODUCT_ID;
process.env.STRIPE_CONSUMER_PACKET_PRODUCT_ID = CATALOG;
after(async () => { await db.close(); if (originalCatalog === undefined) delete process.env.STRIPE_CONSUMER_PACKET_PRODUCT_ID; else process.env.STRIPE_CONSUMER_PACKET_PRODUCT_ID = originalCatalog; });

async function harness({ baseline = false } = {}) {
  await db.exec('truncate consumer_briefcase_items, consumer_packet_verifications, packet_render_jobs, consumer_packet_payment_consumption, processed_stripe_events');
  await db.query("insert into consumer_briefcase_items(id,user_id,payment_allowed,payment_status,packet_status) values($1,$2,true,'unpaid','not_started')", [ITEM, USER]);
  await db.query("insert into consumer_packet_verifications values($1,'verified',$2)", [ITEM, HASH]);
  const rpcCalls = [], created = [], expired = [], sessions = new Map(), idempotency = new Map();
  let hook = null, afterRpc = null;
  const admin = {
    async rpc(name, args) {
      assert.ok(['bind_consumer_checkout_verification', 'replace_consumer_checkout_session'].includes(name));
      rpcCalls.push({ name, args: structuredClone(args) });
      if (hook) await hook(name, args);
      const names = Object.keys(args); assert.ok(names.every(n => /^p_[a-z_]+$/.test(n)));
      try {
        const result = await db.transaction(async tx => {
          await tx.exec('set local role service_role');
          const result = await tx.query(`select * from public.${name}(${names.map((n,i) => `${n} => $${i+1}`).join(',')})`, Object.values(args));
          return { data: result.rows, error: null };
        });
        return afterRpc ? afterRpc(name, result) : result;
      } catch (error) { return { data: null, error: { message: error.message } }; }
    },
    from(table) {
      assert.equal(table, 'consumer_briefcase_items'); const filters = {};
      return {
        select(columns) { assert.equal(columns, 'checkout_session_id'); return this; },
        eq(key, value) { filters[key] = value; return this; },
        async maybeSingle() { return { error: null, data: (await db.query('select checkout_session_id from consumer_briefcase_items where id=$1 and user_id=$2', [filters.id, filters.user_id])).rows[0] ?? null }; }
      };
    }
  };
  const authority = loadTsWithMocks('src/lib/expungement-ai/consumer-payment-authority.ts', { '@/lib/supabase/server': { getSupabaseAdminClient: () => admin } });
  const stripe = {
    products: { retrieve: async id => ({ id, active: true }) },
    checkout: { sessions: {
      async create(params, { idempotencyKey }) {
        if (idempotency.has(idempotencyKey)) return structuredClone(idempotency.get(idempotencyKey));
        const id = `cs_test_${String.fromCharCode(65 + created.length)}`;
        const price = params.line_items[0].price_data;
        const value = { ...structuredClone(params), id, status: 'open', payment_status: 'unpaid',
          amount_total: 5000, amount_subtotal: 5000, currency: 'usd', total_details: { amount_discount: 0 },
          url: `https://checkout.stripe.com/c/pay/${id}`, line_items: { data: [{ quantity: 1, amount_total: 5000, amount_subtotal: 5000, currency: 'usd', price: { unit_amount: price.unit_amount, product: { id: price.product, name: 'Expungement.ai self-help packet' } } }] } };
        created.push({ id, params, idempotencyKey }); sessions.set(id, value); idempotency.set(idempotencyKey, structuredClone(value)); return structuredClone(value);
      },
      async retrieve(id) {
        if (!sessions.has(id)) throw Object.assign(new Error('not found'), { type: 'invalid_request_error', code: 'resource_missing', statusCode: 404 });
        return structuredClone(sessions.get(id));
      },
      async expire(id) {
        const session = sessions.get(id); assert.equal(session?.status, 'open', `only an OPEN Session can expire: ${id}`);
        expired.push(id); session.status = 'expired'; session.url = null; return structuredClone(session);
      },
      async update(id, params) { const s = sessions.get(id); Object.assign(s.metadata, params.metadata); return structuredClone(s); }
    } }
  };
  const { adapter } = buildPaymentAdapter({ stripeOverride: stripe, authorityOverride: authority, matterId: MATTER, ...(baseline ? { adapterSource: baselineSource } : {}) });
  const row = async () => (await db.query('select * from consumer_briefcase_items where id=$1', [ITEM])).rows[0];
  const ask = async (overrides = {}) => { const current = await row(); return adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: current.checkout_session_id ?? undefined, paymentStatus: current.payment_status, ...overrides }) }); };
  const replace = (overrides = {}) => authority.replaceConsumerCheckoutSession({ userId: USER, briefcaseItemId: ITEM, expectedCheckoutSessionId: 'cs_test_A', checkoutSessionId: 'cs_test_B', paymentProvider: 'stripe', productId: PRODUCT, personId: PERSON, matterId: MATTER, expectedVerificationHash: HASH, ...overrides });
  return { ask, row, replace, authority, stripe, sessions, created, expired, rpcCalls, idempotency,
    setHook: f => { hook = f; }, setAfterRpc: f => { afterRpc = f; } };
}
const wrongProduct = h => { h.sessions.get('cs_test_A').line_items.data[0].price.product.id = 'prod_obsolete'; };
const unavailable = error => error?.name === 'ConsumerCheckoutTemporarilyUnavailableError';

 test('executed #341 adapter reproduces real SQL conflict, expires A and unbound B, leaves predecessor unchanged', async () => {
  const h = await harness({ baseline: true }); await h.ask(); wrongProduct(h);
  await assert.rejects(h.ask(), unavailable);
  assert.equal((await h.row()).checkout_session_id, 'cs_test_A');
  assert.deepEqual(h.expired, ['cs_test_A', 'cs_test_B']);
  assert.equal(h.rpcCalls.at(-1).name, 'bind_consumer_checkout_verification');
 });
 test('A binds and reuses; unresolvable refuses; obsolete OPEN A expires; real RPC binds usable catalog B; retry reuses B', async () => {
  const h = await harness(); const first = await h.ask(); assert.equal(first.checkoutSessionId, 'cs_test_A');
  assert.equal((await h.ask()).outcome, 'checkout_reused'); assert.equal(h.created.length, 1);
  await db.query('update consumer_briefcase_items set checkout_session_id=$1 where id=$2', ['cs_test_missing', ITEM]);
  await assert.rejects(h.ask(), unavailable); assert.equal(h.created.length, 1);
  await db.query('update consumer_briefcase_items set checkout_session_id=$1 where id=$2', [first.checkoutSessionId, ITEM]);
  wrongProduct(h); const before = await h.row(); const replacement = await h.ask(); const afterRow = await h.row();
  assert.equal(replacement.checkoutSessionId, 'cs_test_B'); assert.equal(afterRow.checkout_session_id, replacement.checkoutSessionId);
  for (const key of Object.keys(before).filter(k => !['checkout_session_id', 'updated_at'].includes(k))) assert.deepEqual(afterRow[key], before[key], `preserved ${key}`);
  assert.equal(h.sessions.get('cs_test_A').status, 'expired'); assert.equal(h.sessions.get('cs_test_B').status, 'open'); assert.ok(replacement.checkoutUrl);
  assert.equal(h.created[1].params.line_items[0].price_data.product, CATALOG);
  assert.equal(h.created[1].params.allow_promotion_codes, true);
  assert.equal((await h.ask()).checkoutSessionId, 'cs_test_B'); assert.equal(h.created.length, 2); assert.deepEqual(h.expired, ['cs_test_A']);
  assert.equal(h.rpcCalls.find(c => c.name === 'replace_consumer_checkout_session').args.p_expected_checkout_session_id, 'cs_test_A');
 });

for (const [name, change, reason] of [
  ['wrong owner', { userId: OTHER }, 'item_not_found'], ['wrong item', { briefcaseItemId: OTHER }, 'item_not_found'],
  ['stale verification', { expectedVerificationHash: 'b'.repeat(64) }, 'verification_changed'],
  ['wrong product', { productId: 'other' }, 'checkout_binding_invalid'],
  ['wrong person', { personId: OTHER }, 'checkout_binding_invalid'], ['wrong matter', { matterId: OTHER }, 'checkout_binding_invalid'],
  ['wrong provider', { paymentProvider: 'dry_run' }, 'checkout_binding_invalid'],
  ['missing predecessor', { expectedCheckoutSessionId: '' }, 'checkout_replacement_invalid'],
  ['same Session', { checkoutSessionId: 'cs_test_A' }, 'checkout_replacement_invalid'],
  ['blank successor', { checkoutSessionId: '' }, 'checkout_replacement_invalid'],
]) test(`real RPC refuses ${name} without changing any row field`, async () => {
  const h = await harness(); await h.ask(); const before = await h.row(); const result = await h.replace(change);
  assert.deepEqual(result, { outcome: 'refused', reason }); assert.deepEqual(await h.row(), before);
});
for (const [column, value] of [
  ['payment_status', 'paid'], ['payment_status', 'refunded'], ['payment_status', null],
  ['packet_status', 'pending'], ['packet_status', 'generating'], ['packet_status', 'ready'], ['packet_status', 'downloaded'],
  ['provider_event_id', 'evt_evidence'], ['payment_intent_id', 'pi_evidence'], ['payment_authority', 'stripe_webhook'],
  ['payment_recorded_at', '2026-09-24T00:00:00Z'], ['payment_recorded_by', 'stripe'], ['receipt_url', 'https://example.invalid/receipt'],
  ['amount_cents', 0], ['amount_cents', 5000], ['payment_allowed', false], ['payment_person_id', null], ['payment_product_id', null], ['payment_matter_id', null]
]) test(`real RPC preserves/refuses ${column}=${value}`, async () => {
  const h = await harness(); await h.ask(); await db.query(`update consumer_briefcase_items set ${column}=$1 where id=$2`, [value, ITEM]);
  const before = await h.row(); assert.equal((await h.replace()).outcome, 'refused'); assert.deepEqual(await h.row(), before);
});
for (const [table, column, value] of [
  ['consumer_packet_payment_consumption','consumer_briefcase_item_id',ITEM], ['packet_render_jobs','briefcase_item_id',ITEM],
  ['processed_stripe_events','related_object_id','cs_test_A'], ['processed_stripe_events','related_object_id','cs_test_B']
]) test(`real RPC refuses immutable ${table} evidence (${value === ITEM ? 'matter' : value})`, async () => {
  const h = await harness(); await h.ask(); await db.query(`insert into ${table}(${column}) values($1)`, [value]); const before = await h.row();
  assert.deepEqual(await h.replace(), { outcome: 'refused', reason: 'checkout_payment_evidence_present' }); assert.deepEqual(await h.row(), before);
});
test('another item owns the new Session: refuses without moving either item', async () => {
  const h = await harness(); await h.ask(); await db.query('insert into consumer_briefcase_items(id,user_id,checkout_session_id) values($1,$2,$3)', [OTHER,USER,'cs_test_foreign']);
  const before = await db.query('select * from consumer_briefcase_items order by id');
  assert.deepEqual(await h.replace({ checkoutSessionId: 'cs_test_foreign' }), { outcome: 'refused', reason: 'checkout_session_in_use' });
  assert.deepEqual((await db.query('select * from consumer_briefcase_items order by id')).rows, before.rows);
});
for (const status of ['unverified', 'invalidated']) test(`verification ${status} refuses`, async () => {
  const h = await harness(); await h.ask(); await db.query('update consumer_packet_verifications set status=$1', [status]);
  assert.equal((await h.replace()).reason, 'verification_changed');
});
for (const payment_status of ['paid', 'no_payment_required']) test(`completed Stripe order (${payment_status}) never expires, creates or rebinds`, async () => {
  const h = await harness(); await h.ask(); Object.assign(h.sessions.get('cs_test_A'), { status: 'complete', payment_status }); wrongProduct(h);
  await db.exec("update consumer_packet_verifications set status='invalidated'");
  const calls = h.rpcCalls.length; assert.equal((await h.ask()).outcome, 'payment_pending');
  assert.equal(h.rpcCalls.length, calls); assert.equal(h.created.length, 1); assert.deepEqual(h.expired, []);
});
test('verification changes after provider creation: real CAS refuses, B is never returned or bound', async () => {
  const h = await harness(); await h.ask(); wrongProduct(h);
  h.setHook(async name => { if (name === 'replace_consumer_checkout_session') await db.query('update consumer_packet_verifications set verification_hash=$1', ['b'.repeat(64)]); });
  await assert.rejects(h.ask(), e => unavailable(e) && e.bindingFailure?.reason === 'verification_changed');
  assert.equal((await h.row()).checkout_session_id, 'cs_test_A'); assert.equal(h.sessions.get('cs_test_B').status, 'expired');
});
test('same idempotent replacement in two stale requests converges on B and never expires the winner', async () => {
  const h = await harness(); await h.ask(); wrongProduct(h); const old = await h.stripe.checkout.sessions.retrieve('cs_test_A');
  await h.ask(); const retrieve = h.stripe.checkout.sessions.retrieve;
  h.stripe.checkout.sessions.retrieve = async id => id === old.id ? { ...old, status: 'expired' } : retrieve(id);
  const next = await h.ask({ checkoutSessionId: old.id });
  assert.equal(next.checkoutSessionId, 'cs_test_B'); assert.equal(next.outcome, 'checkout_reused'); assert.equal(h.created.length, 2);
  assert.equal(h.sessions.get('cs_test_B').status, 'open'); assert.deepEqual(h.expired, ['cs_test_A']);
  assert.equal(h.rpcCalls.at(-1).name, 'replace_consumer_checkout_session');
});
test('competing real CAS calls have exactly one winner; stale replay cannot displace it', async () => {
  const h = await harness(); await h.ask(); const results = await Promise.all([h.replace(), h.replace({ checkoutSessionId: 'cs_test_C' })]);
  assert.equal(results.filter(r => r.outcome === 'replaced').length, 1); assert.equal(results.filter(r => r.outcome === 'conflicted').length, 1);
  const winner = (await h.row()).checkout_session_id; assert.equal((await h.replace({ checkoutSessionId: 'cs_test_D' })).outcome, 'conflicted'); assert.equal((await h.row()).checkout_session_id, winner);
});
test('concurrent adapter requests share one replacement and keep the CAS winner open', async () => {
  const h = await harness(); await h.ask();
  await h.stripe.checkout.sessions.expire('cs_test_A');
  const results = await Promise.all([h.ask(), h.ask()]);
  assert.deepEqual(results.map(r => r.checkoutSessionId), ['cs_test_B','cs_test_B']);
  assert.equal(h.created.length, 2); assert.deepEqual(h.expired, ['cs_test_A']);
  assert.equal((await h.row()).checkout_session_id, 'cs_test_B'); assert.equal(h.sessions.get('cs_test_B').status, 'open');
});
test('lost response after a committed CAS does not expire B; retry recovers B without duplication', async () => {
  const h = await harness(); await h.ask(); wrongProduct(h);
  h.setAfterRpc((name, result) => name === 'replace_consumer_checkout_session' ? { data: null, error: { message: 'transport lost after commit' } } : result);
  await assert.rejects(h.ask(), e => unavailable(e) && e.bindingFailure?.outcome === 'unavailable');
  assert.equal((await h.row()).checkout_session_id, 'cs_test_B'); assert.equal(h.sessions.get('cs_test_B').status, 'open');
  h.setAfterRpc(null); assert.equal((await h.ask()).checkoutSessionId, 'cs_test_B'); assert.equal(h.created.length, 2);
});
test('expired idempotency replay is read back; one deterministic successor C binds through the real CAS', async () => {
  const h = await harness(); await h.ask(); wrongProduct(h);
  h.setHook(async name => { if (name === 'replace_consumer_checkout_session') await db.query('update consumer_packet_verifications set verification_hash=$1', ['b'.repeat(64)]); });
  await assert.rejects(h.ask(), unavailable); assert.equal(h.sessions.get('cs_test_B').status, 'expired');
  h.setHook(null); await db.query('update consumer_packet_verifications set verification_hash=$1', [HASH]);
  assert.equal((await h.ask()).checkoutSessionId, 'cs_test_C'); assert.equal(h.created.length, 3);
  assert.ok(h.created[2].idempotencyKey.length <= 255); assert.match(h.created[2].idempotencyKey, /:successor:v2:/);
  assert.equal((await h.row()).checkout_session_id, 'cs_test_C'); assert.equal(h.sessions.get('cs_test_C').status, 'open');
  assert.equal((await h.ask()).checkoutSessionId, 'cs_test_C'); assert.equal(h.created.length, 3);
});
test('a stale snapshot with no Session reloads the bound A and reuses it', async () => {
  const h = await harness(); await h.ask(); assert.equal((await h.ask({ checkoutSessionId: undefined })).checkoutSessionId, 'cs_test_A');
  assert.equal(h.created.length, 1); assert.deepEqual(h.expired, []);
});
test('failed predecessor expiry leaves the binding unchanged and creates no replacement', async () => {
  const h = await harness(); await h.ask(); wrongProduct(h);
  h.stripe.checkout.sessions.expire = async () => ({ id: 'cs_test_A', status: 'complete' });
  await assert.rejects(h.ask(), unavailable); assert.equal(h.created.length, 1); assert.equal((await h.row()).checkout_session_id, 'cs_test_A');
});
test('missing protected verification cannot be accepted even with a null expected hash in direct SQL', async () => {
  const h = await harness(); await h.ask(); await db.exec('delete from consumer_packet_verifications');
  const result = await db.query('select * from replace_consumer_checkout_session($1,$2,$3,$4,$5,$6,$7,$8,$9)', [USER,ITEM,'cs_test_A','cs_test_B','stripe',PRODUCT,PERSON,MATTER,null]);
  assert.equal(result.rows[0].reason, 'verification_changed'); assert.equal((await h.row()).checkout_session_id, 'cs_test_A');
});
for (const role of ['anon', 'authenticated']) test(`${role} cannot execute the security-definer replacement`, async () => {
  const h = await harness(); await h.ask();
  await assert.rejects(db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query('select * from replace_consumer_checkout_session($1,$2,$3,$4,$5,$6,$7,$8,$9)', [USER,ITEM,'cs_test_A','cs_test_B','stripe',PRODUCT,PERSON,MATTER,HASH]);
  }), /permission denied for function replace_consumer_checkout_session/);
  assert.equal((await h.row()).checkout_session_id, 'cs_test_A');
});

// Execute the actual hosted wrong-product block, including its stop, against
// recorded provider/app responses. No copied acceptance predicate.
const parsed = syntax('scripts/rcap-hosted-acceptance-payment.mjs');
const replacementBlock = parsed.nodes.find(n => ts.isIfStatement(n) && n.expression.getText() === 'CATALOG_PRODUCT_ID'
  && n.getText().includes('resumed_checkout_replaces_an_incompatible_open_session'));
assert.ok(replacementBlock);
for (const failure of ['http', 'missing', 'product', 'unexpired', 'unbound', 'expired', 'paid', 'url', null]) test(`hosted replacement ${failure ?? 'valid'}: ${failure ? 'stops before Checkout browser' : 'continues only on B'}`, async () => {
  const verdicts = [], evidence = {}, stop = new Error('finish'); let browserCalls = 0;
  const values = {
    CATALOG_PRODUCT_ID: CATALOG, STRIPE_KEY: 'test-placeholder', consumerPacketPriceCents: 5000, itemId: ITEM, A: { cookie: 'test-cookie' },
    URLSearchParams, evidence, runNamespace: {},
    setStoredSessionId: async () => ({ status: 201 }), storedSessionIdNow: async () => failure === 'unbound' ? 'cs_test_A' : 'cs_test_B',
    callApp: async () => ({ status: failure === 'http' ? 503 : 200, json: { checkoutSessionId: failure === 'missing' ? null : 'cs_test_B' } }),
    stripeSession: async id => id === 'cs_test_obsolete' ? { status: failure === 'unexpired' ? 'open' : 'expired' } : { id, status: failure === 'expired' ? 'expired' : 'open', payment_status: failure === 'paid' ? 'paid' : 'unpaid', url: failure === 'url' ? null : 'https://checkout.stripe.com/c/pay/B' },
    fetch: async url => ({ json: async () => url.endsWith('/checkout/sessions') ? { id: 'cs_test_obsolete' } : { data: [{ price: { product: { id: failure === 'product' ? 'prod_wrong' : CATALOG } } }] } }),
    record: (id, passed, observed) => verdicts.push({ id, passed, observed }), finish: () => { throw stop; },
    browser: async () => { browserCalls++; }
  };
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const run = new AsyncFunction(...Object.keys(values), `let session = {id:'cs_test_original', metadata:{}}; ${replacementBlock.getText()}; await browser(); return session;`);
  if (failure) await assert.rejects(run(...Object.values(values)), e => e === stop);
  else assert.equal((await run(...Object.values(values))).id, 'cs_test_B');
  assert.equal(browserCalls, failure ? 0 : 1); assert.equal(verdicts[0].passed, !failure);
  if (failure) assert.ok(evidence.resumedReplacement.checks.some(c => !c.passed && c.name && 'actual' in c && 'expected' in c));
});
