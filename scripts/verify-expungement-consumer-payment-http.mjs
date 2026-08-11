#!/usr/bin/env node
/**
 * P1-P18 — the application-to-job boundary, through the real HTTP surfaces.
 *
 * This is the check the repository did not have. Payment coverage stopped at
 * either the module boundary (calling `reconcile*` directly) or at grepping the
 * handler's source for the string `constructEvent(...)`. Neither would notice a
 * handler that verified a signature and then ignored the verdict, and neither
 * ever executed the raw-body wiring that makes signature verification work at
 * all.
 *
 * So: real route handlers invoked with real `Request` objects, real Stripe
 * signatures produced by the Stripe SDK's own test header generator, and a real
 * Postgres cluster carrying migrations 26 → 53. The only doubles are the
 * Supabase client and the session reader.
 *
 *   node scripts/verify-expungement-consumer-payment-http.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ephemeralPgAvailable()) {
  console.error("verify-expungement-consumer-payment-http requires a local PostgreSQL toolchain.");
  process.exit(1);
}

// A Stripe TEST webhook secret. Signatures below are genuinely computed against
// it by the SDK; nothing here forges a verification result.
const WEBHOOK_SECRET = "whsec_rcap_consumer_payment_http_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_rcap_consumer_payment_http";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_LEGACY_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.NEXT_PUBLIC_EXPUNGEMENT_AI_URL = "http://127.0.0.1:3000";
delete process.env.VERCEL_ENV;
process.env.NODE_ENV = "test";

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/consumer-payment-test-loader.mjs", import.meta.url);

const Stripe = (await import("stripe")).default;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const doubles = await import("./lib/consumer-payment-test-doubles.mjs");
const { bindEphemeralDb, setSession, fixtureUuid } = doubles;

const SEQUENCE = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql"
];

const USER_A = fixtureUuid("user-a");
const USER_B = fixtureUuid("user-b");

const results = [];
function check(id, title, passed, observed) {
  results.push({ id, title, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) console.log(`         observed: ${observed}`);
}

// --- cluster -----------------------------------------------------------------

function boot() {
  const db = startEphemeralPg();
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
  db.sql(`create schema auth`);
  db.sql(`create table auth.users (id uuid primary key, email text)`);
  db.sql(
    `create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
       select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`
  );
  db.sql(`grant usage on schema auth to anon, authenticated, service_role`);
  db.sql(`grant execute on function auth.uid() to anon, authenticated, service_role`);

  db.sql(`create table public.partner_records (id uuid primary key default gen_random_uuid(), partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null, created_at timestamptz not null default now())`);
  db.sql(`create unique index rcap_persons_partner_match_key_idx on public.rcap_persons(partner_slug, match_key)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid(), partner_slug text not null, user_id uuid, briefcase_id uuid, state text not null default 'MS', jurisdiction text, pathway text not null, status text not null default 'draft_started')`);
  db.sql(`create table public.processed_stripe_events (stripe_event_id text primary key, event_type text, related_object_id text, created_at timestamptz not null default now())`);
  db.sql(`create table public.screening_sessions (session_id text primary key, flow_mode text, partner_slug text, partner_benefit_active boolean)`);
  db.sql(`insert into auth.users (id, email) values ('${USER_A}','a@test.local'), ('${USER_B}','b@test.local')`);

  for (const file of SEQUENCE) db.applyFile(path.join(rootDir, file));
  return db;
}

const db = boot();
bindEphemeralDb(db);

// --- real application modules -------------------------------------------------

const webhookRoute = await import("../src/app/api/stripe/webhook/route.ts");
const legacyWebhookRoute = await import("../src/app/api/method/expungement.api.payment.stripe_webhook/route.ts");
const renderRoute = await import("../src/app/api/expungement-ai/packet/render/route.ts");
const { consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");

// --- fixtures -----------------------------------------------------------------

// A real compiled MS pathway, so packet generation succeeds and the webhook
// returns 200 rather than a 500 that would have Stripe retrying forever. Using
// a made-up label here would have tested the payment write against a journey
// that always fails downstream.
const MS_PATHWAY = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

function createItem(userId, label, { paymentAllowed = true, jurisdiction = "MS" } = {}) {
  const id = fixtureUuid(`item/${label}`);
  db.sql(
    `insert into public.consumer_briefcase_items (id, user_id, item_type, jurisdiction, status, payment_allowed, pathway_label, result_code, payment_status, amount_cents)
     values ('${id}','${userId}','packet','${jurisdiction}','packet_ready',${paymentAllowed},'${MS_PATHWAY}','packet_ready','unpaid',5000)`
  );
  return id;
}

function checkoutSession({ itemId, userId, sessionId, amount = 5000, currency = "usd" }) {
  return {
    id: sessionId,
    object: "checkout.session",
    client_reference_id: itemId,
    payment_status: "paid",
    amount_total: amount,
    currency,
    payment_intent: `pi_${sessionId}`,
    metadata: {
      channel: "expungement_ai_consumer",
      user_id: userId,
      briefcase_item_id: itemId
    }
  };
}

function stripeEvent(eventId, session) {
  return {
    id: eventId,
    object: "event",
    api_version: "2024-06-20",
    created: 1_760_000_000,
    type: "checkout.session.completed",
    data: { object: session },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null }
  };
}

/** A genuinely signed request. The signature is produced by the Stripe SDK. */
function signedWebhookRequest(event, { secret = WEBHOOK_SECRET, signature, omitSignature = false } = {}) {
  const payload = JSON.stringify(event);
  const headers = new Headers({ "content-type": "application/json" });
  if (!omitSignature) {
    headers.set(
      "stripe-signature",
      signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret })
    );
  }
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body: payload });
}

/**
 * psql prints a RETURNING row and then the command tag, so a naive trim() picks
 * up "INSERT 0 1" as part of the value. Take the first line that is actually a
 * uuid.
 */
function pickUuid(out) {
  return String(out)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line)) ?? "";
}

function paymentRow(itemId) {
  return db.json(
    `select row_to_json(t) from (select payment_status, amount_cents, currency, provider_event_id, payment_authority, payment_recorded_by
       from public.consumer_briefcase_items where id='${itemId}') t`
  );
}

function jobsFor(itemId) {
  return db.json(
    `select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
       select id, consumer_briefcase_item_id, consumer_auth_user_id, person_id, matter_id, partner_id
       from public.packet_render_jobs where consumer_briefcase_item_id='${itemId}') t`
  );
}

/**
 * Walks a queued job to finalization the way the worker does: claim it, render,
 * validate, finalize. Finalization is where Phase 52 accounting runs, so a
 * consumption row only exists after this.
 */
function driveToFinalize(expectedJobId) {
  const claim = db.json(
    `select row_to_json(t) from (select id, fencing_token from public.claim_packet_render_job('w-http', null, 60)) t`
  );
  if (!claim || (expectedJobId && claim.id !== expectedJobId)) {
    throw new Error(`claim expected ${expectedJobId}, got ${claim && claim.id}`);
  }
  db.sql(`select public.start_packet_render('${claim.id}','${claim.fencing_token}')`);
  db.sql(`select public.start_packet_validation('${claim.id}','${claim.fencing_token}')`);
  const shaA = createHash("sha256").update(`out/${claim.id}`).digest("hex");
  const shaB = createHash("sha256").update(`norm/${claim.id}`).digest("hex");
  return db.json(
    `select row_to_json(t) from (select accounting_result, delivery_eligibility from public.finalize_packet_render_job(
       '${claim.id}','${claim.fencing_token}','a/${claim.id}/${shaA}.pdf','${shaA}','${shaB}','${shaA}','${shaB}',10,1,'sha256:${"c".repeat(64)}')) t`
  );
}

// =============================================================================
console.log("PROVIDER EVENTS — through the real webhook route");

{
  // P1 — a valid signed event records exactly one $50 USD payment.
  const item = createItem(USER_A, "p1");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p1" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p1", session)));
  const row = paymentRow(item);
  check(
    "P1",
    "a valid signed provider event records one $50 USD payment",
    res.status === 200 &&
      row?.payment_status === "paid" &&
      row?.amount_cents === 5000 &&
      row?.currency === "usd" &&
      row?.provider_event_id === "evt_p1" &&
      row?.payment_authority === "server_webhook",
    `${res.status} ${JSON.stringify(row)}`
  );

  // P4 — a replay records no second entitlement.
  const before = db.scalar(`select count(*) from public.consumer_packet_payment_consumption`);
  const replay = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p1", session)));
  const after = db.scalar(`select count(*) from public.consumer_packet_payment_consumption`);
  const recordedBy = paymentRow(item);
  check(
    "P4",
    "a replayed event records no second entitlement",
    replay.status === 200 && before === after && recordedBy?.provider_event_id === "evt_p1",
    `before=${before} after=${after} status=${replay.status}`
  );
}

{
  // P2 — an invalid signature records nothing.
  const item = createItem(USER_A, "p2");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p2" });
  const bad = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(stripeEvent("evt_p2", session)),
    secret: "whsec_a_different_secret_entirely"
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p2", session), { signature: bad }));
  const row = paymentRow(item);
  check(
    "P2",
    "an invalid signature records nothing",
    res.status === 400 && row?.payment_status === "unpaid" && row?.provider_event_id === null,
    `${res.status} ${JSON.stringify(row)}`
  );
}

{
  // P3 — a missing signature records nothing.
  const item = createItem(USER_A, "p3");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p3" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p3", session), { omitSignature: true }));
  const row = paymentRow(item);
  check(
    "P3",
    "a missing signature records nothing",
    res.status === 400 && row?.payment_status === "unpaid" && row?.provider_event_id === null,
    `${res.status} ${JSON.stringify(row)}`
  );
}

{
  // P5 — the wrong amount records nothing, even correctly signed.
  const item = createItem(USER_A, "p5");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p5", amount: 500 });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p5", session)));
  const row = paymentRow(item);
  // A refused event must also not consume its idempotency key. If it did, a
  // corrected retry carrying the same event id would be swallowed as a
  // duplicate and the payment would never be recorded at all.
  const claimed = db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_p5'`);
  check(
    "P5",
    "a signed event for the wrong amount records nothing and burns no idempotency key",
    res.status === 500 && row?.payment_status === "unpaid" && row?.provider_event_id === null && claimed === "0",
    `${res.status} ${JSON.stringify(row)} claimed=${claimed}`
  );
}

{
  // P6 — the wrong currency records nothing.
  const item = createItem(USER_A, "p6");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p6", currency: "eur" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p6", session)));
  const row = paymentRow(item);
  const claimed = db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_p6'`);
  check(
    "P6",
    "a signed event in the wrong currency records nothing and burns no idempotency key",
    res.status === 500 && row?.payment_status === "unpaid" && row?.provider_event_id === null && claimed === "0",
    `${res.status} ${JSON.stringify(row)} claimed=${claimed}`
  );
}

{
  // P7 — a session naming another user's item records nothing.
  const itemA = createItem(USER_A, "p7-a");
  const itemB = createItem(USER_B, "p7-b");
  const crossed = checkoutSession({ itemId: itemB, userId: USER_A, sessionId: "cs_p7" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p7", crossed)));
  const rowA = paymentRow(itemA);
  const rowB = paymentRow(itemB);
  check(
    "P7",
    "a mismatched user or item records nothing",
    rowA?.payment_status === "unpaid" && rowB?.payment_status === "unpaid",
    `status=${res.status} a=${rowA?.payment_status} b=${rowB?.payment_status}`
  );
}

{
  // P8 — the participant cannot call the server-only payment writer.
  const item = createItem(USER_A, "p8");
  const denied = db.sqlExpectError(
    `set role authenticated; select outcome from public.record_consumer_packet_payment('${item}','paid',5000,'usd','stripe','evt_p8','cs','pi','r','server_webhook','forged')`
  );
  db.sql(`reset role`);
  check(
    "P8",
    "a participant cannot execute the server-only payment writer",
    /permission denied/i.test(denied),
    denied.split("\n")[0]
  );
}

{
  // P18 — the legacy endpoint is the same handler, so it cannot skip the check.
  const item = createItem(USER_A, "p18");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p18" });
  const unsigned = new Request("http://localhost/api/method/expungement.api.payment.stripe_webhook", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(stripeEvent("evt_p18", session))
  });
  const res = await legacyWebhookRoute.POST(unsigned);
  const row = paymentRow(item);

  const handlerSource = fs.readFileSync(path.join(rootDir, "src/lib/stripe/webhook-handler.ts"), "utf8");
  const routeFiles = fs
    .readdirSync(path.join(rootDir, "src/app/api"), { recursive: true })
    .filter((entry) => String(entry).endsWith("route.ts"))
    .map((entry) => path.join(rootDir, "src/app/api", String(entry)));
  // Any route that touches Stripe events must go through the one verified
  // handler. A second route that called `reconcile*` itself would be an
  // unsigned writer no matter how careful it looked.
  const rogue = routeFiles.filter((file) => {
    const text = fs.readFileSync(file, "utf8");
    return /reconcileExpungementAiCheckoutEvent|reconcileStripeInvoiceEvent/.test(text)
      && !/handleStripeWebhookPost/.test(text);
  });

  check(
    "P18",
    "no alternate route can write payment facts without signature verification",
    res.status === 400 &&
      row?.payment_status === "unpaid" &&
      rogue.length === 0 &&
      /constructEvent\(rawBody, signature, endpointSecret\)/.test(handlerSource),
    `legacy=${res.status} rogueRoutes=${rogue.map((f) => path.relative(rootDir, f)).join(",") || "none"}`
  );
}

// =============================================================================
console.log("\nCONSUMER ENQUEUE — through the real authenticated route");

function renderRequest(body) {
  return new Request("http://localhost/api/expungement-ai/packet/render", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body)
  });
}

{
  // P15 — the control is closed by default.
  delete process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE;
  const item = createItem(USER_A, "p15");
  setSession({ isAuthenticated: true, userId: USER_A });
  const res = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
  check("P15", "a disabled feature control refuses the route", res.status === 503, `status=${res.status}`);
}

{
  // P16 — a scoped staging state admits only the named context.
  process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE = "staging_scoped";
  process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE = USER_A;
  const itemB = createItem(USER_B, "p16-b");
  setSession({ isAuthenticated: true, userId: USER_B });
  const outside = await renderRoute.POST(renderRequest({ briefcaseItemId: itemB }));
  check(
    "P16",
    "a controlled staging scope permits only the assigned test context",
    outside.status === 503,
    `outsideScope=${outside.status}`
  );
}

process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE = "live";

{
  // P11 — an unpaid item cannot enqueue.
  const item = createItem(USER_A, "p11");
  setSession({ isAuthenticated: true, userId: USER_A });
  const res = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
  if (process.env.DEBUG_HTTP) {
    console.log("DEBUG P11 body:", JSON.stringify(await res.clone().json()));
    console.log("DEBUG jobs table:", db.sql(`select id, consumer_briefcase_item_id, consumer_auth_user_id, partner_id from public.packet_render_jobs`));
    console.log("DEBUG authority:", db.sql(`select * from public.consumer_packet_payment_authority('${item}','${USER_A}')`));
  }
  check(
    "P11",
    "an unpaid item cannot enqueue a delivery-eligible consumer job",
    res.status === 402 && jobsFor(item).length === 0,
    `status=${res.status} jobs=${jobsFor(item).length}`
  );
}

{
  // P9 / P12 — a paid item creates exactly one Phase 53-bound job, and a repeat
  // request returns the same job rather than a second one.
  const item = createItem(USER_A, "p9");
  const session = checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p9" });
  await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p9", session)));

  setSession({ isAuthenticated: true, userId: USER_A });
  const first = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
  const firstBody = await first.json();
  const afterFirst = jobsFor(item);

  check(
    "P9",
    "an authenticated consumer route creates one Phase 53-bound job on the derived matter",
    first.status === 202 &&
      afterFirst.length === 1 &&
      afterFirst[0].consumer_auth_user_id === USER_A &&
      afterFirst[0].consumer_briefcase_item_id === item &&
      afterFirst[0].partner_id === null &&
      afterFirst[0].person_id !== null &&
      afterFirst[0].matter_id === consumerMatterIdForItem(item),
    `${first.status} ${JSON.stringify(afterFirst)}`
  );

  const second = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
  const secondBody = await second.json();
  const afterSecond = jobsFor(item);
  check(
    "P12",
    "the same paid item and matter is idempotent",
    second.status === 202 && afterSecond.length === 1 && secondBody.jobId === firstBody.jobId,
    `jobs=${afterSecond.length} first=${firstBody.jobId} second=${secondBody.jobId}`
  );

  // P10 — a browser-supplied user id is ignored. USER_B is logged in and names
  // USER_A's item while claiming to be USER_A.
  setSession({ isAuthenticated: true, userId: USER_B });
  const spoof = await renderRoute.POST(
    renderRequest({ briefcaseItemId: item, expectedConsumerAuthUserId: USER_A, userId: USER_A })
  );
  const afterSpoof = jobsFor(item);
  check(
    "P10",
    "a browser-supplied user id is ignored or rejected",
    spoof.status === 404 && afterSpoof.length === 1 && afterSpoof[0].consumer_auth_user_id === USER_A,
    `status=${spoof.status} jobs=${afterSpoof.length}`
  );

  // P13 — the same payment on a different matter is refused by the gate.
  //
  // The route cannot construct this: it derives the matter from the item, so one
  // paid item is always one matter. It is driven through the sanctioned function
  // directly to prove the gate holds anyway, which is the part that would matter
  // if a future caller stopped deriving it.
  //
  // The route's own job is finalized first — the conflict only exists once a
  // consumption row does.
  setSession({ isAuthenticated: true, userId: USER_A });
  const firstFinalize = driveToFinalize(firstBody.jobId);
  if (firstFinalize?.accounting_result !== "zero_charge") {
    throw new Error(`the paid consumer job should finalize zero_charge, got ${JSON.stringify(firstFinalize)}`);
  }

  const otherMatter = fixtureUuid("p13-other-matter");
  const packet = pickUuid(db.sql(
    `insert into public.rcap_document_packets (partner_slug, pathway, state) values ('expungement-ai-consumer','${MS_PATHWAY}','MS') returning id`
  ));
  const person = pickUuid(db.sql(
    `select id from public.rcap_persons where partner_slug='expungement-ai-consumer' limit 1`
  ));
  const hash = createHash("sha256").update("p13").digest("hex");
  const otherJob = pickUuid(db
    .sql(
      `select id from public.enqueue_packet_render_job('${packet}','MS:${MS_PATHWAY}','packet_document_v1','1.0.0',null,'MS','1.3.0','${hash}',null,null,'${person}','${otherMatter}',5,'${item}','${USER_A}')`
    ));
  const finalize = driveToFinalize(otherJob);
  check(
    "P13",
    "the same paid item on another matter is blocked",
    finalize?.accounting_result === "consumer_payment_matter_conflict" &&
      finalize?.delivery_eligibility === "accounting_blocked",
    JSON.stringify(finalize)
  );
}

{
  // P14 — a sponsored request stays valid with no consumer payment at all.
  db.sql(`insert into public.partner_records (partner_slug) values ('we-must-vote') on conflict do nothing`);
  const partnerId = pickUuid(db.sql(`select id from public.partner_records where partner_slug='we-must-vote'`));
  const person = pickUuid(db.sql(
    `insert into public.rcap_persons (partner_slug, match_key) values ('we-must-vote','sponsored-p14') returning id`
  ));
  const packet = pickUuid(db.sql(
    `insert into public.rcap_document_packets (partner_slug, pathway, state) values ('we-must-vote','${MS_PATHWAY}','MS') returning id`
  ));
  const hash = createHash("sha256").update("p14").digest("hex");
  const jobId = pickUuid(db
    .sql(
      `select id from public.enqueue_packet_render_job('${packet}','MS:${MS_PATHWAY}','packet_document_v1','1.0.0',null,'MS','1.3.0','${hash}',null,'${partnerId}','${person}','${fixtureUuid("p14-matter")}',5,null,null)`
    ));
  const row = db.json(
    `select row_to_json(t) from (select partner_id, consumer_briefcase_item_id, consumer_auth_user_id from public.packet_render_jobs where id='${jobId}') t`
  );
  check(
    "P14",
    "a sponsored request remains valid without consumer payment",
    Boolean(jobId) && row?.partner_id === partnerId && row?.consumer_briefcase_item_id === null && row?.consumer_auth_user_id === null,
    JSON.stringify(row)
  );
}

{
  // P17 — no application callsite uses the dropped 13-argument signature.
  const appFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) appFiles.push(full);
    }
  };
  walk(path.join(rootDir, "src"));

  const callers = appFiles.filter((file) => /enqueue_packet_render_job/.test(fs.readFileSync(file, "utf8")));
  const unbound = callers.filter((file) => {
    const text = fs.readFileSync(file, "utf8");
    return !/p_consumer_briefcase_item_id/.test(text) || !/p_expected_consumer_auth_user_id/.test(text);
  });
  const legacyResolves = db.sqlExpectError(
    `select public.enqueue_packet_render_job(null::uuid,'r','k','v',null,'p','1','${"a".repeat(64)}',null,null,null,null,5)`
  );
  check(
    "P17",
    "no application callsite uses the old enqueue signature",
    unbound.length === 0 && /does not exist/.test(legacyResolves),
    `unbound=${unbound.map((f) => path.relative(rootDir, f)).join(",") || "none"}`
  );
}

// =============================================================================
const passed = results.filter((r) => r.passed).length;
const report = {
  schemaVersion: "rcap-consumer-payment-http/v1",
  generatedBy: "scripts/verify-expungement-consumer-payment-http.mjs",
  migrationSequence: SEQUENCE,
  totals: { cases: results.length, passed, failed: results.length - passed },
  cases: results
};
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.join(rootDir, "data/rcap-render"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "data/rcap-render/consumer-payment-http.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
}

db.stop();

console.log(`\nverify-expungement-consumer-payment-http: ${passed}/${results.length} cases passed.`);
if (passed !== results.length) {
  console.error("\nThe application-to-job boundary is not proven.");
  process.exit(1);
}
console.log("A signed $50 payment becomes a server-authoritative record and a Phase 53-bound job.");
