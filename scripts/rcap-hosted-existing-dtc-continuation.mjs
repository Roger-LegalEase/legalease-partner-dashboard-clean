#!/usr/bin/env node
// Continue the accepted case only. This caller never launches a worker or creates a participant.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deliveryRefusal, privateObjectRefusal, cardEntryEvidence } from './rcap-hosted-response-contract.mjs';

export const DTC = Object.freeze({
  item: 'd13233f6-d9c7-41e1-9bb5-8a454d747503', owner: 'b6dc86a3-12bb-490d-b130-48d95d426a1e',
  stranger: 'bdfefe78-def5-40c9-bbb0-e9e311eb2da6', project: 'hyflxnlhpmiqxvvcoiia', revision: 8,
  app: '4feb8e94b3dee4085fe05ea75d78853fe21e5097', tools: '98f89f0db0bcb60088341c35595a072edd9031a4',
  worker: '16908485a94f475448657cea90583a4d352da9a3',
  digest: 'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',
  origin: 'https://legalease-rcap-4feb8e94b3de-roger947s-projects.vercel.app',
  closedDeployment: 'dpl_Eg2n58h38JhnU9uuXQ7Nk46QXGuL', product: 'prod_VHEHkvH7dSvGv7', amount: 5000
});
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha = /^[a-f0-9]{64}$/;
export const hash = value => createHash('sha256').update(value).digest('hex');
const jsonHash = value => hash(JSON.stringify(value));
const requireEqual = (actual, expected, label) => assert.deepEqual(actual, expected, label);

export function assertStage(stage, baseline) {
  for (const key of ['app', 'tools', 'worker', 'digest', 'project', 'origin']) requireEqual(stage[key], DTC[key], key);
  assert.match(stage.deploymentId ?? '', /^dpl_[a-zA-Z0-9]+$/);
  assert.notEqual(stage.deploymentId, DTC.closedDeployment, 'closed preview cannot take payment');
  requireEqual(stage.mode, 'configured_sandbox_preview');
  requireEqual(stage.commercialMode, 'staging_scoped');
  requireEqual(stage.owner, DTC.owner);
  requireEqual(stage.item, DTC.item);
  requireEqual(stage.testPurchaseReleased, true, 'exact test purchase must be released by coordinator');
  requireEqual(stage.webhookEndpointId, 'we_1U4AKGRWROAHlAKyNFChAnWr');
  requireEqual(baseline.item, DTC.item); requireEqual(baseline.owner, DTC.owner);
  requireEqual(baseline.revision, DTC.revision); assert.match(baseline.verificationHash ?? '', sha);
  assert.equal(baseline.route?.jurisdiction, 'MS');
  for (const key of ['pathwayId', 'selectedTrackId', 'profileVersion']) assert.ok(baseline.route[key], `retained ${key} required`);
}
export function assertMatter(state, baseline) {
  requireEqual(state.id, DTC.item); requireEqual(state.user_id, DTC.owner);
  requireEqual(state.status, 'verified'); requireEqual(state.revision, DTC.revision);
  requireEqual(state.verification_hash, baseline.verificationHash); requireEqual(state.route, baseline.route);
  requireEqual(state.sponsored_count, 0, 'DTC must not consume sponsored credit');
}
function assertSession(session, baseline, id, paid = false) {
  requireEqual(session.id, id); requireEqual(session.livemode, false);
  requireEqual(session.currency, 'usd'); requireEqual(session.amount_total, DTC.amount);
  requireEqual(session.mode, 'payment');
  requireEqual(session.metadata?.briefcase_item_id, DTC.item);
  requireEqual(session.metadata?.user_id, DTC.owner);
  requireEqual(session.metadata?.verification_hash, baseline.verificationHash);
  requireEqual(session.metadata?.pathway_id, baseline.route.pathwayId);
  requireEqual(session.metadata?.jurisdiction, 'MS');
  requireEqual(session.metadata?.product_id, 'expungement_packet');
  for (const key of ['person_id', 'matter_id']) assert.match(session.metadata?.[key] ?? '', uuid);
  const success = new URL(session.success_url);
  requireEqual(success.origin, DTC.origin); requireEqual(success.pathname, `/briefcase/${DTC.item}`);
  requireEqual(success.searchParams.get('payment'), 'return');
  requireEqual(success.searchParams.get('session_id'), '{CHECKOUT_SESSION_ID}');
  if (paid) { requireEqual(session.payment_status, 'paid'); requireEqual(session.status, 'complete'); }
}
function assertJob(job, session, id) {
  requireEqual(job.id, id); requireEqual(job.consumer_briefcase_item_id, DTC.item);
  requireEqual(job.consumer_auth_user_id, DTC.owner); requireEqual(job.partner_id, null);
  requireEqual(job.person_id, session.metadata.person_id); requireEqual(job.matter_id, session.metadata.matter_id);
  requireEqual(job.consumer_verification_hash, session.metadata.verification_hash);
}

export async function preflightPaymentReceipts(outputDir, save) {
  for (const label of ['checkout-created', 'provider-paid', 'queued']) {
    try { await fs.access(path.join(outputDir, `${label}.private.json`)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    throw new Error('prior payment receipt requires diagnosis before any Checkout request');
  }
  await save('payment-attempt', { item: DTC.item });
}

export async function payAndQueue({ stage, baseline }, io) {
  assertStage(stage, baseline); await io.preflightPayment(); await io.verifyTarget(stage);
  const before = await io.readMatter(); assertMatter(before, baseline);
  assert.notEqual(before.payment_status, 'paid', 'existing payment requires explicit recovery, never another purchase');
  requireEqual(before.checkout_session_id, null, 'stored Checkout requires recovery before continuation');
  requireEqual(before.job_count, 0, 'existing job requires recovery before continuation');
  const checkout = await io.app('/api/expungement-ai/checkout', 'owner', { briefcaseItemId: DTC.item });
  assert.equal(checkout.status, 200); const c = checkout.json;
  requireEqual(c.briefcaseItemId, DTC.item); requireEqual(c.amountCents, DTC.amount); requireEqual(c.currency, 'usd');
  requireEqual(c.mode, 'stripe'); requireEqual(c.alreadyPaid, false); requireEqual(c.paymentPending, false);
  assert.match(c.checkoutSessionId ?? '', /^cs_test_/);
  assert.equal(new URL(c.checkoutUrl).origin, 'https://checkout.stripe.com');
  // Persist before opening Stripe so an interruption cannot silently create a second purchase.
  await io.save('checkout-created', { item: DTC.item, sessionId: c.checkoutSessionId, deploymentId: stage.deploymentId });
  let session = await io.session(c.checkoutSessionId); assertSession(session, baseline, c.checkoutSessionId);
  requireEqual(session.url, c.checkoutUrl); requireEqual(session.status, 'open');
  const lines = await io.lineItems(session.id);
  requireEqual(lines.has_more, false); requireEqual(lines.data.length, 1);
  requireEqual(lines.data[0].price?.product, DTC.product); requireEqual(lines.data[0].quantity, 1);
  requireEqual(lines.data[0].amount_total, DTC.amount);
  const browser = await io.completeCheckout({ checkoutUrl: session.url,
    expectedReturnUrl: session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id) });
  requireEqual(browser.completed, true); assert.ok(cardEntryEvidence(browser.notes ?? []));
  session = await io.session(session.id); assertSession(session, baseline, c.checkoutSessionId, true);
  const intent = await io.paymentIntent(session.payment_intent);
  requireEqual(intent.id, session.payment_intent); requireEqual(intent.livemode, false); requireEqual(intent.status, 'succeeded');
  requireEqual(intent.amount_received, DTC.amount); requireEqual(intent.currency, 'usd');
  await io.save('provider-paid', { item: DTC.item, sessionId: session.id, paymentIntent: intent.id });
  const paid = await io.waitPaid(); assertMatter(paid, baseline);
  requireEqual(paid.payment_status, 'paid'); requireEqual(paid.payment_authority, 'server_webhook');
  requireEqual(paid.checkout_session_id, session.id); requireEqual(paid.payment_valid, true);
  requireEqual(paid.payment_person_id, session.metadata.person_id); requireEqual(paid.payment_matter_id, session.metadata.matter_id);
  requireEqual(paid.payment_product_id, session.metadata.product_id);
  assert.match(paid.provider_event_id ?? '', /^evt_/);
  const event = await io.event(paid.provider_event_id);
  requireEqual(event.id, paid.provider_event_id); requireEqual(event.livemode, false); requireEqual(event.type, 'checkout.session.completed');
  requireEqual(event.data?.object?.id, session.id);
  requireEqual(event.data?.object?.payment_intent, intent.id);
  const queued = await io.app('/api/expungement-ai/packet/render', 'owner', { briefcaseItemId: DTC.item });
  requireEqual(queued.status, 202); requireEqual(queued.json?.briefcaseItemId, DTC.item);
  assert.match(queued.json?.jobId ?? '', uuid);
  const receipt = { status: 'awaiting-separately-authorized-worker', item: DTC.item, owner: DTC.owner,
    deploymentId: stage.deploymentId, stageHash: jsonHash(stage), baseline, sessionId: session.id,
    paymentIntent: intent.id, providerEvent: event.id, metadata: session.metadata, jobId: queued.json.jobId };
  // Save the actual 202 job before its readback; never discover a substitute job from the backlog.
  await io.save('queued', receipt);
  assertJob(await io.readJob(receipt.jobId), session, receipt.jobId);
  return receipt;
}

export async function verifyDelivery({ stage, baseline, payment, worker }, io) {
  assertStage(stage, baseline); await io.verifyTarget(stage);
  requireEqual(payment.stageHash, jsonHash(stage)); requireEqual(payment.baseline, baseline);
  requireEqual(payment.status, 'awaiting-separately-authorized-worker');
  requireEqual(payment.item, DTC.item); requireEqual(payment.owner, DTC.owner);
  assert.match(payment.jobId ?? '', uuid); assert.match(payment.sessionId ?? '', /^cs_test_/);
  requireEqual(worker.jobId, payment.jobId); requireEqual(worker.project, DTC.project);
  requireEqual(worker.worker, DTC.worker); requireEqual(worker.digest, DTC.digest);
  requireEqual(worker.nativeExitCode, 0); requireEqual(worker.exclusiveWindowConfirmed, true);
  requireEqual(worker.otherClaimableOrRecoverableJobs, 0);
  const state = await io.readMatter(); assertMatter(state, baseline);
  requireEqual(state.payment_valid, true); requireEqual(state.checkout_session_id, payment.sessionId);
  const session = await io.session(payment.sessionId); assertSession(session, baseline, payment.sessionId, true);
  requireEqual(session.payment_intent, payment.paymentIntent); requireEqual(session.metadata, payment.metadata);
  const job = await io.readJob(payment.jobId); assertJob(job, session, payment.jobId);
  assert.ok(['artifact_validated', 'delivered'].includes(job.status));
  requireEqual(job.delivery_eligibility, 'eligible');
  assert.ok(['zero_charge', 'consumed', 'already_consumed', 'overage_consumed'].includes(job.accounting_result));
  assert.match(job.output_sha256 ?? '', sha); assert.ok(job.output_byte_count > 0 && job.page_count > 0);
  requireEqual(job.output_storage_path, `packet-artifacts/consumer/${job.matter_id}/${job.id}/${job.output_sha256}.pdf`);
  const provenance = await io.readProvenance();
  requireEqual(provenance.render_job_id, job.id); requireEqual(provenance.consumer_auth_user_id, DTC.owner);
  requireEqual(provenance.matter_id, job.matter_id); requireEqual(provenance.verification_hash, baseline.verificationHash);
  requireEqual(provenance.entitlement_source, 'consumer_payment');
  const download = `/api/rcap/packets/${job.id}/download`;
  const checks = [];
  for (const actor of ['owner', 'owner', 'freshOwner']) {
    const response = await io.app(download, actor);
    requireEqual(response.status, 200); assert.match(response.contentType, /^application\/pdf\b/i);
    assert.equal(response.bytes.subarray(0, 5).toString(), '%PDF-');
    requireEqual(response.bytes.length, job.output_byte_count); requireEqual(hash(response.bytes), job.output_sha256);
    if (!checks.length) await io.savePdf(response.bytes);
    checks.push({ actor, status: response.status, sha256: hash(response.bytes) });
  }
  for (const [url, actor] of [[download, 'anonymous'], [download, 'stranger'],
    [`/api/expungement-ai/packet/download?briefcaseItemId=${DTC.item}`, 'stranger']]) {
    const response = await io.app(url, actor);
    assert.equal(response.fromProtectionLayer, false, 'platform refusal is not an application access denial');
    assert.notEqual(response.bytes.subarray(0, 5).toString(), '%PDF-');
    assert.ok(!/^application\/pdf\b/i.test(response.contentType));
    assert.ok(deliveryRefusal(response, DTC.origin)); checks.push({ url, actor, status: response.status });
  }
  const publicObject = await io.publicObject(job.output_storage_path);
  assert.ok(privateObjectRefusal(publicObject.status));
  assert.notEqual(publicObject.bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(!/^application\/pdf\b/i.test(publicObject.contentType));
  const result = { status: 'protected-delivery-observed', item: DTC.item, jobId: job.id,
    outputSha256: job.output_sha256, pageCount: job.page_count, checks, publicObjectStatus: publicObject.status,
    documentVisualAcceptance: 'still requires review of actual downloaded PDF', hostedJourneyAcceptance: 'review pending' };
  await io.save('delivery', result); return result;
}

export function matterQuery() {
  return `begin transaction read only;
select b.id,b.user_id,b.payment_status,b.payment_authority,b.checkout_session_id,b.provider_event_id,
b.payment_person_id,b.payment_matter_id,b.payment_product_id,v.status,v.revision,v.verification_hash,
jsonb_build_object('jurisdiction',v.verification_snapshot->'jurisdiction','pathwayId',v.verification_snapshot->'pathwayId',
'selectedTrackId',v.verification_snapshot->'selectedTrackId','profileVersion',v.verification_snapshot->'profileVersion') as route,
(select count(*)::int from public.clinic_packet_funding f where f.briefcase_item_id=b.id and f.funding_mode='sponsored') as sponsored_count,
(select count(*)::int from public.packet_render_jobs j where j.consumer_briefcase_item_id=b.id) as job_count,
(select valid from public.consumer_packet_payment_authority(b.id,b.user_id,public.expungement_packet_product_id(),b.payment_person_id,b.payment_matter_id)) as payment_valid
from public.consumer_briefcase_items b join public.consumer_packet_verifications v on v.briefcase_item_id=b.id and v.consumer_auth_user_id=b.user_id
where b.id='${DTC.item}'; commit;`;
}

export async function runtime(config, env, { checkoutBrowser } = {}) {
  const { default: Stripe } = await import('stripe');
  const completeHostedCheckout = checkoutBrowser ?? (await import('./rcap-stripe-checkout-browser.mjs')).completeHostedCheckout;
  const { resolveHostedVercelIdentity, hostedVercelScopedUrl } = await import('./rcap-hosted-acceptance-vercel-identity.mjs');
  assert.match(env.STRIPE_SECRET_KEY ?? '', /^sk_test_/);
  for (const key of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_ANON_KEY', 'VERCEL_TOKEN', 'VERCEL_AUTOMATION_BYPASS_SECRET', 'DTC_OWNER_EMAIL', 'DTC_OWNER_PASSWORD', 'DTC_STRANGER_EMAIL', 'DTC_STRANGER_PASSWORD']) assert.ok(env[key], `${key} required from existing authorized custody`);
  assert.ok(path.isAbsolute(config.outputDir) && !config.outputDir.startsWith('/tmp/'), 'unique evidence must remain persistent');
  await fs.mkdir(config.outputDir, { recursive: true, mode: 0o700 });
  assert.ok(!(await fs.realpath(config.outputDir)).startsWith('/tmp/'), 'persistent output cannot resolve into scratch');
  const save = (label, value) => fs.writeFile(path.join(config.outputDir, `${label}.private.json`), JSON.stringify(value, null, 2)+'\n', { mode: 0o600, flag: 'wx' });
  const protection = JSON.parse(await fs.readFile(config.protectionStateFile, 'utf8'));
  const platform = protection.cookies.filter(c => c.name === '_vercel_jwt');
  requireEqual(platform.length, 1);
  const cookieHeader = cookies => cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const accounts = new Map();
  const login = async actor => {
    const prefix = actor === 'stranger' ? 'DTC_STRANGER' : 'DTC_OWNER';
    assert.ok(env[`${prefix}_EMAIL`].endsWith('@rcap-acceptance.test'));
    const response = await fetch(`https://${DTC.project}.supabase.co/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env[`${prefix}_EMAIL`], password: env[`${prefix}_PASSWORD`] }), redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'existing account normal login required'); const session = await response.json();
    requireEqual(session.user?.id, actor === 'stranger' ? DTC.stranger : DTC.owner);
    const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString('base64')}`;
    const chunks = encoded.match(/.{1,3180}/g);
    const cookies = chunks.map((value,i) => ({ name: `sb-${DTC.project}-auth-token${chunks.length > 1 ? '.'+i : ''}`, value, domain: new URL(DTC.origin).hostname, path: '/', secure: true, httpOnly: false, sameSite: 'Lax' }));
    accounts.set(actor, cookies); return cookies;
  };
  const responseValue = async response => {
    const bytes = Buffer.from(await response.arrayBuffer()); let json = null;
    try { json = JSON.parse(bytes.toString()); } catch { /* PDF or HTML */ }
    return { status: response.status, contentType: response.headers.get('content-type') ?? '', location: response.headers.get('location'),
      fromProtectionLayer: response.headers.has('x-vercel-mitigated') || /Vercel Authentication|Authentication Required/.test(bytes.toString('utf8',0,30000)), bytes, json };
  };
  const app = async (url, actor, body) => {
    const cookies = actor === 'anonymous' ? [] : accounts.get(actor) ?? await login(actor);
    return responseValue(await fetch(new URL(url, DTC.origin), { method: body ? 'POST' : 'GET',
      headers: { Cookie: cookieHeader([...platform, ...cookies]), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(30000) }));
  };
  const sqlOne = async query => {
    assert.ok(query.startsWith('begin transaction read only;'));
    const response = await fetch(`https://api.supabase.com/v1/projects/${DTC.project}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'protected readback failed'); const rows = await response.json();
    requireEqual(rows.length, 1, 'exact single protected row required'); return rows[0];
  };
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 0 });
  const readMatter = () => sqlOne(matterQuery());
  return {
    save, app, readMatter,
    preflightPayment: () => preflightPaymentReceipts(config.outputDir, save),
    async verifyTarget(stage) {
      const identity = await resolveHostedVercelIdentity();
      const response = await fetch(hostedVercelScopedUrl(`/v13/deployments/${stage.deploymentId}`, identity), {
        headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      requireEqual(response.status, 200); const deployment = await response.json();
      requireEqual(deployment.id, stage.deploymentId); requireEqual(deployment.readyState, 'READY');
      requireEqual(deployment.projectId, identity.projectId); assert.notEqual(deployment.target, 'production');
      requireEqual(deployment.meta?.rcapApplicationSha, DTC.app);
      requireEqual(deployment.meta?.rcapWorkerSourceSha, DTC.worker);
      requireEqual(deployment.meta?.rcapWorkerDigest, DTC.digest);
      requireEqual(deployment.meta?.rcapAcceptanceProjectRef, DTC.project);
      requireEqual(deployment.meta?.rcapStripeConfigured, 'true');
      requireEqual(deployment.meta?.rcapCatalogProduct, DTC.product);
      requireEqual(deployment.meta?.rcapRouteState, 'staging_scoped');
      requireEqual(deployment.meta?.rcapStagingScopeSha256, hash(DTC.owner));
      requireEqual(deployment.meta?.rcapReturnOrigin, DTC.origin);
      assert.ok(deployment.alias?.includes(new URL(DTC.origin).hostname));
      const endpoint = await stripe.webhookEndpoints.retrieve(stage.webhookEndpointId);
      requireEqual(endpoint.livemode, false); requireEqual(endpoint.status, 'enabled');
      const webhookUrl = new URL(config.expectedWebhookUrl);
      requireEqual(webhookUrl.origin, DTC.origin); requireEqual(webhookUrl.pathname, '/api/stripe/webhook');
      requireEqual(endpoint.url, config.expectedWebhookUrl, 'existing approved private protection query must match exactly');
      assert.ok(endpoint.enabled_events.includes('checkout.session.completed') || endpoint.enabled_events.includes('*'));
    },
    session: id => stripe.checkout.sessions.retrieve(id), lineItems: id => stripe.checkout.sessions.listLineItems(id),
    paymentIntent: id => { assert.match(id ?? '', /^pi_/); return stripe.paymentIntents.retrieve(id); },
    event: id => stripe.events.retrieve(id),
    async completeCheckout(options) { return completeHostedCheckout({ ...options, email: env.DTC_OWNER_EMAIL, previewProtectionBypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET,
      sessionCookies: [...platform, ...(accounts.get('owner') ?? await login('owner'))], screenshotDir: null }); },
    async waitPaid() {
      for (let attempt=0; attempt<30; attempt++) {
        const state = await readMatter(); if (state.payment_status === 'paid') return state;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      throw new Error('real provider webhook reconciliation pending; preserve receipt and stop');
    },
    readJob: id => { assert.match(id, uuid); return sqlOne(`begin transaction read only; select id,status,person_id,matter_id,partner_id,consumer_briefcase_item_id,consumer_auth_user_id,consumer_verification_hash,delivery_eligibility,accounting_result,output_sha256,output_storage_path,output_byte_count,page_count from public.packet_render_jobs where id='${id}'; commit;`); },
    readProvenance: () => sqlOne(`begin transaction read only; select render_job_id,consumer_auth_user_id,matter_id,verification_hash,entitlement_source from public.consumer_packet_artifact_provenance where briefcase_item_id='${DTC.item}'; commit;`),
    savePdf: bytes => fs.writeFile(path.join(config.outputDir, 'actual-owner-packet.private.pdf'), bytes, { mode: 0o600, flag: 'wx' }),
    publicObject: async storagePath => responseValue(await fetchResponse(storagePath))
  };
  async function fetchResponse(storagePath) {
    return fetch(`https://${DTC.project}.supabase.co/storage/v1/object/public/rcap-packet-artifacts-private/${storagePath}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const [phase, filename] = argv;
  assert.ok(['payment', 'delivery'].includes(phase) && filename, 'usage: script payment|delivery persistent-private-config.json');
  const config = JSON.parse(await fs.readFile(filename, 'utf8'));
  assertStage(config.stage, config.baseline);
  const io = await runtime(config, env);
  if (phase === 'payment') return payAndQueue(config, io);
  return verifyDelivery({ ...config, payment: JSON.parse(await fs.readFile(config.paymentReceiptFile, 'utf8')),
    worker: JSON.parse(await fs.readFile(config.workerReceiptFile, 'utf8')) }, io);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(result => console.log(JSON.stringify({ status: result.status, item: result.item, jobId: result.jobId })))
    .catch(() => { console.error('Existing-case continuation stopped; preserve private receipts and diagnose before retrying.'); process.exitCode=1; });
}
