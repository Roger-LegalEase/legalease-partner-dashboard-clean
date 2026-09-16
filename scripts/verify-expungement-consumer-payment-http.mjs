#!/usr/bin/env node
/**
 * P1-P19 — the application-to-job boundary, through the real HTTP surfaces.
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
 * Postgres cluster carrying migrations 26 → 55. The only doubles are the
 * Supabase client and the session reader.
 *
 *   node scripts/verify-expungement-consumer-payment-http.mjs
 */

import fs from "node:fs";
import assert from "node:assert/strict";
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
register("./consumer-payment-auth-test-loader.mjs", import.meta.url);
if (process.argv.includes("--admission-trace")) {
  register("./consumer-payment-admission-trace-test-loader.mjs", import.meta.url);
  globalThis.__rcapPaymentAdmissionTrace = event => console.log("ADMISSION_TRACE " + JSON.stringify({
    testGroup: globalThis.__rcapPaymentTestGroup, ...event
  }));
}

if (process.argv.includes("--local-publication-fixture")) {
  const { installLocalPublicationFixture } = await import("./consumer-payment-publication-fixture.mjs");
  await installLocalPublicationFixture();
}

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
  "supabase/phase-53-rcap-consumer-job-binding.sql",
  "supabase/phase-54-rcap-person-namespace-hardening.sql",
  "supabase/phase-55-expungement-matter-payment-binding.sql",
  "supabase/phase-38-expungement-pending-screening-results.sql",
  "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql",
  "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql",
  "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql",
  // Promotion codes: the writer, the constraints and the entitlement probe stop
  // asserting one price and start reconciling the order, so the cases below run
  // against the rule the release actually ships.
  "supabase/migrations/20260917090000_consumer_promotion_codes.sql"
];

const USER_A = fixtureUuid("user-a");
const USER_B = fixtureUuid("user-b");

const results = [];
function check(id, title, passed, observed) {
  results.push({ id, title, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed) console.log(`         observed: ${observed}`);
}

// A failed fulfillment prerequisite must not hide independent signature and
// isolation checks. Every unreached assertion is recorded as FAILED, never skipped.
async function runCaseGroup(ids, execute) {
  globalThis.__rcapPaymentTestGroup = ids;
  try { await execute(); } catch (error) {
    const missing = ids.filter(id => !results.some(row => row.id === id));
    for (const id of missing.length ? missing : [ids[0] + '-execution']) {
      check(id, 'case could not complete its required assertions', false, String(error.message));
    }
  }
  for (const id of ids) if (!results.some(row => row.id === id)) check(id, 'required assertion was not executed', false);
}

// --- cluster -----------------------------------------------------------------

function boot() {
  const db = startEphemeralPg();
  // Fixture or migration failures must tear down this verifier's own cluster.
  // Keep the normal cleanup idempotent with the synchronous exit fallback.
  const stop = db.stop.bind(db);
  let stopped = false;
  db.stop = () => { if (!stopped) { stopped = true; stop(); } };
  process.once("exit", () => db.stop());
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  // Supabase's initial schema grants these API roles USAGE on the extensions
  // schema before application migrations run. Reproduce that platform
  // baseline so Phase 55's schema-qualified pgcrypto calls execute with the
  // same privileges as the acceptance project.
  db.sql(`create schema extensions`);
  db.sql(`grant usage on schema extensions to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
  db.sql(`create schema auth`);
  // Supabase platform helper used by the current pending-result policies.
  // This exists only in the disposable test cluster.
  db.sql(`create function auth.role() returns text language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text) $$`);
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
  db.sql(`create table public.rcap_document_packets (
    id uuid primary key default gen_random_uuid(), partner_slug text not null,
    user_id uuid, briefcase_id uuid, person_id uuid, state text not null default 'MS',
    jurisdiction text, document_type text, pathway text not null,
    status text not null default 'draft_started', petitioner_first_name text,
    petitioner_last_name text, petitioner_city text, petitioner_county text,
    court_county text, court_name text, cause_number text, charge text,
    offense_date text, arrest_date text, arresting_agency text,
    agency_case_number text, disposition_date text, conviction_date text,
    sentence_completion_date text, needs_record_review boolean not null default true,
    generated_plain_text text, filing_instructions text[] not null default '{}',
    county_court_instructions text[] not null default '{}',
    missing_fields text[] not null default '{}', safety_disclaimer text not null
  )`);
  db.sql(`create table public.rcap_document_packet_inputs (
    id uuid primary key default gen_random_uuid(),
    document_packet_id uuid not null references public.rcap_document_packets(id) on delete cascade,
    partner_slug text not null, intake_session_id uuid, input_payload jsonb not null default '{}'::jsonb,
    unique(document_packet_id)
  )`);
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
const { getBriefcaseItemForWebhook } = await import("../src/lib/expungement-ai/briefcase.ts");
const {
  packetInformationPatch: derivePacketInformationPatch,
  requireCurrentPacketVerification,
  requireCurrentPacketVerificationRecord,
  protectedPacketDraftSeedFromAuthoritative
} = await import("../src/lib/expungement-ai/packet-information.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { persistProtectedPacketVerification, readProtectedPacketVerification } = await import("../src/lib/expungement-ai/verification-cas.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");

// --- fixtures -----------------------------------------------------------------

// A real compiled MS pathway, so packet generation succeeds and the webhook
// returns 200 rather than a 500 that would have Stripe retrying forever. Using
// a made-up label here would have tested the payment write against a journey
// that always fails downstream.
const MS_PATHWAY = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

async function createItem(userId, label, { paymentAllowed = true, jurisdiction = "MS" } = {}) {
  const id = fixtureUuid(`item/${label}`);
  const requiredInputIds = [
    "age_at_offense", "case_outcome", "charge", "contact_information", "county", "court",
    "disposition_date", "financial_obligations", "jurisdiction", "offense_category", "offense_level",
    "participant_full_legal_name", "pathway_id", "pending_cases", "prior_relief", "record_type",
    "residency_or_location", "sentence_completion_date", "trafficking_status"
  ];
  const packetPlan = {
    pathwayId: MS_PATHWAY,
    mode: "state_specific_custom_packet_from_source_rules",
    formMappingStatus: "custom_or_manual_mapping_required",
    sourceFormIds: [],
    requiredInputIds,
    sourceRuleRefs: []
  };
  const screeningAnswers = {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    offense_level: "Misdemeanor",
    possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
    resolved_timing_bucket: "gt_10_years",
    court_requirements_completed: "yes"
  };
  const packetAnswers = {
    ...JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json"), "utf8")).facts,
    date_of_birth: "1990-04-12",
    offense_date: "2014-01-10",
    arrest_date: "2014-01-10",
    age_at_offense: { value: "30", unknown: false },
    case_outcome: screeningAnswers.case_outcome,
    charge: { value: "Synthetic misdemeanor charge", unknown: false },
    contact_information: "100 Acceptance Way, Jackson, MS 39201",
    county: { value: "Hinds County", unknown: false },
    court: { value: "Hinds County Circuit Court", unknown: false },
    disposition_date: { value: "2015-01-15", unknown: false },
    financial_obligations: "Yes",
    offense_category: { value: "Misdemeanor", unknown: false },
    offense_level: "Misdemeanor",
    participant_full_legal_name: "Acceptance Consumer",
    pending_cases: "No",
    prior_relief: "No",
    record_type: "Arrest or charge",
    residency_or_location: { value: "Jackson, Mississippi", unknown: false },
    sentence_completion_date: "Yes",
    trafficking_status: "No"
  };
  // The approved participant composer requires the exact filing facts and
  // self-help confirmations. Keep the payment assertions unchanged and seed
  // complete synthetic facts from the already-approved participant fixture.
  const approvedParticipantFacts = JSON.parse(fs.readFileSync(path.join(rootDir,
    "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json"), "utf8")).facts;
  for (const [key, value] of Object.entries(approvedParticipantFacts)) {
    if (!(key in packetAnswers)) packetAnswers[key] = value;
  }
  const commercialFlow = {
    version: 1,
    entitlementSource: "consumer_payment",
    productId: "expungement_packet",
    screening: {
      profileVersion: getProfileByJurisdiction(jurisdiction).profileVersion,
      screeningMatterId: `screening-${id}`,
      pathwayId: MS_PATHWAY,
      pathwayLabel: "Non-conviction expungement for dismissal, no disposition, or acquittal",
      resultCode: "packet_ready",
      paymentAllowed: true,
      packetType: "custom_pleading",
      packetPlan,
      answers: screeningAnswers
    },
    packetInformation: {
      stage: "facts_complete",
      requiredInputIds,
      serverFacts: { jurisdiction, pathway_id: MS_PATHWAY },
      prefilledAnswers: {},
      answers: packetAnswers,
      missingInputIds: [],
      updatedAt: "2026-08-15T00:00:00.000Z",
      reviewedAt: null
    },
    verification: { status: "unverified", reason: "final_verification_not_completed" }
  };
  const artifactRefs = JSON.stringify({ commercialFlow }).replaceAll("'", "''");
  db.sql(
    `insert into public.consumer_briefcase_items
      (id, user_id, item_type, jurisdiction, status, payment_allowed,
       pathway_label, result_code, packet_type, payment_status, amount_cents,
       summary_json, next_steps_json, artifact_refs_json)
     values (
       '${id}','${userId}','packet','${jurisdiction}','packet_ready',${paymentAllowed},
       '${MS_PATHWAY}','packet_ready','custom_pleading','unpaid',5000,
       '{"text":"Synthetic reviewed packet matter."}'::jsonb,
       '["Confirm current local filing requirements."]'::jsonb,
       '${artifactRefs}'::jsonb
     )`
  );
  const inserted = await getBriefcaseItemForWebhook(userId, id);
  // Seed the current protected draft from server evaluation, never from a
  // participant-writable mirror or a fabricated verification verdict.
  const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction, profileVersion: getProfileByJurisdiction(jurisdiction).profileVersion, matterId: id, answers: screeningAnswers });
  assert.equal(authoritative.selectedTrackId, 'ms-nonconv', 'exact MS track is selected by the server');
  const seed = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers, packetAnswers, dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: "expungement_packet" }, capturedAt: new Date().toISOString() });
  const verified = inserted && seed ? derivePacketInformationPatch({ existingItem: inserted, answers: {}, verify: true, protectedVerification: { status: "unverified", reason: "final_verification_not_completed", revision: 0, draftSnapshot: seed.snapshot, draftHash: seed.hash } }) : null;
  if (!inserted || !verified?.readyToGenerate) throw new Error(`fixture ${id} could not be explicitly verified: ${verified?.reviewReason}; missing=${JSON.stringify(verified?.missingInputIds)}`);
  const persisted = await persistProtectedPacketVerification({ consumerAuthUserId: userId, briefcaseItemId: id, transition: verified.protectedTransition });
  if (!persisted.ok) throw new Error(`fixture protected verification persistence failed: ${persisted.reason}`);
  const readback = await requireCurrentPacketVerification(userId, inserted);
  assert.equal(readback.snapshot.selectedTrackId, 'ms-nonconv', 'server track survives protected PostgreSQL persistence');
  assert.equal(readback.hash, verified.protectedTransition.nextVerification.hash, 'final hash survives real jsonb persistence');
  const tampered = structuredClone(persisted.value);
  tampered.snapshot.packetAnswers.participant_full_legal_name = 'Changed after verification';
  assert.throws(() => requireCurrentPacketVerificationRecord(inserted, tampered), /current final verification/i, 'changed facts still invalidate final verification');
  check(`V-${label}`, 'protected verification survives jsonb ordering and rejects altered facts', true);
  return id;
}

async function checkoutSession({
  itemId, userId, sessionId, currency = "usd",
  // The order, described the way Stripe describes one: a regular price, the
  // discount the provider applied, and the total that remains. `amount` is an
  // explicit override so a case can still present a total that does NOT
  // reconcile and prove it is refused.
  regular = 5000, discount = 0, amount = undefined
}) {
  const canonicalOwner = db.scalar(
    `select user_id from public.consumer_briefcase_items where id='${itemId}'`
  ).trim();
  const item = await getBriefcaseItemForWebhook(canonicalOwner, itemId);
  const currentVerification = item
    ? await requireCurrentPacketVerification(canonicalOwner, item)
    : null;
  const verificationHash = currentVerification?.hash ?? null;
  const pathwayId = currentVerification?.snapshot?.pathwayId ?? "";
  if (!verificationHash) throw new Error(`fixture ${itemId} has no current final-verification hash`);
  const matchKey = `consumer:${createHash("sha256")
    .update(`rcap:consumer-person:v1:${canonicalOwner}`)
    .digest("hex")}`;
  const personId = pickUuid(db.sql(
    `insert into public.rcap_persons (partner_slug, match_key)
     values ('expungement-ai-consumer','${matchKey}')
     on conflict (partner_slug, match_key) do update set match_key=excluded.match_key
     returning id`
  ));
  const matterId = consumerMatterIdForItem(itemId);
  db.sql(
    `update public.consumer_briefcase_items
        set payment_provider='stripe', checkout_session_id='${sessionId}',
            payment_product_id='expungement_packet', payment_person_id='${personId}',
            payment_matter_id='${matterId}'
      where id='${itemId}'`
  );

  const total = amount ?? regular - discount;
  const noCost = total === 0;
  return {
    id: sessionId,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    client_reference_id: itemId,
    // Stripe's zero-total flow reports no_payment_required and creates no
    // PaymentIntent. Anything else keeps the paid shape.
    payment_status: noCost ? "no_payment_required" : "paid",
    amount_subtotal: regular,
    amount_total: total,
    total_details: { amount_discount: discount, amount_shipping: 0, amount_tax: 0 },
    currency,
    payment_intent: noCost ? null : `pi_${sessionId}`,
    discounts: discount > 0 ? [{ promotion_code: `promo_${sessionId}` }] : [],
    line_items: {
      object: "list",
      data: [{
        object: "item",
        quantity: 1,
        currency,
        amount_subtotal: regular,
        amount_discount: discount,
        amount_total: total,
        price: {
          object: "price",
          unit_amount: regular,
          currency,
          product: { object: "product", name: "Expungement.ai self-help packet" }
        }
      }]
    },
    metadata: {
      channel: "expungement_ai_consumer",
      user_id: userId,
      briefcase_item_id: itemId,
      product_id: "expungement_packet",
      person_id: personId,
      matter_id: matterId,
      pathway_id: pathwayId,
      verification_hash: verificationHash,
      reviewed_input_hash: verificationHash
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
    `select row_to_json(t) from (select payment_status, amount_cents, regular_price_cents, discount_cents,
            currency, provider_event_id, payment_authority, payment_recorded_by, payment_intent_id
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

// This is an isolated test runtime, never a deployment or public flip. The
// signed webhook must be able to exercise its durable queue boundary.
process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE = "live";

await runCaseGroup(["P1","P4"], async () => {
  // P1 — a valid signed event records exactly one $50 USD payment.
  const item = await createItem(USER_A, "p1");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p1" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p1", session)));
  const row = paymentRow(item);
  const firstJob = jobsFor(item)[0];
  check(
    "P1",
    "a valid signed provider event records one $50 USD payment",
    res.status === 200 &&
      row?.payment_status === "paid" &&
      row?.amount_cents === 5000 &&
      row?.currency === "usd" &&
      row?.provider_event_id === "evt_p1" &&
      row?.payment_authority === "server_webhook" &&
      Boolean(firstJob?.id),
    `${res.status} ${JSON.stringify(row)} jobs=${JSON.stringify(jobsFor(item))}`
  );

  const firstFinalize = driveToFinalize(firstJob?.id);
  if (firstFinalize?.accounting_result !== "zero_charge") {
    throw new Error(`the signed-event durable job should finalize zero_charge, got ${JSON.stringify(firstFinalize)}`);
  }

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
});

await runCaseGroup(["P2"], async () => {
  // P2 — an invalid signature records nothing.
  const item = await createItem(USER_A, "p2");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p2" });
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
});

await runCaseGroup(["P3"], async () => {
  // P3 — a missing signature records nothing.
  const item = await createItem(USER_A, "p3");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p3" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p3", session), { omitSignature: true }));
  const row = paymentRow(item);
  check(
    "P3",
    "a missing signature records nothing",
    res.status === 400 && row?.payment_status === "unpaid" && row?.provider_event_id === null,
    `${res.status} ${JSON.stringify(row)}`
  );
});

await runCaseGroup(["P5"], async () => {
  // P5 — the wrong amount records nothing, even correctly signed.
  const item = await createItem(USER_A, "p5");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p5", amount: 500 });
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
});

await runCaseGroup(["P6"], async () => {
  // P6 — the wrong currency records nothing.
  const item = await createItem(USER_A, "p6");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p6", currency: "eur" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p6", session)));
  const row = paymentRow(item);
  const claimed = db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_p6'`);
  check(
    "P6",
    "a signed event in the wrong currency records nothing and burns no idempotency key",
    res.status === 500 && row?.payment_status === "unpaid" && row?.provider_event_id === null && claimed === "0",
    `${res.status} ${JSON.stringify(row)} claimed=${claimed}`
  );
});

await runCaseGroup(["P19"], async () => {
  // P19 — the Checkout metadata freezes the reviewed answers. A participant
  // edit after Session creation cannot be paid against the earlier review.
  const item = await createItem(USER_A, "p19");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p19" });
  const prior = await readProtectedPacketVerification({ consumerAuthUserId: USER_A, briefcaseItemId: item });
  assert.equal(prior.ok, true);
  // A participant edit now crosses protected CAS; editing the display mirror
  // alone is correctly ignored by the payment authority.
  const edit = derivePacketInformationPatch({
    existingItem: await getBriefcaseItemForWebhook(USER_A, item),
    protectedVerification: prior.value, answers: { pending_cases: 'Yes' }, verify: false
  });
  assert.ok(edit?.protectedTransition);
  const changed = await persistProtectedPacketVerification({ consumerAuthUserId: USER_A, briefcaseItemId: item, transition: edit.protectedTransition });
  assert.equal(changed.ok, true);
  assert.notEqual(changed.value.status, 'verified');
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p19", session)));
  const row = paymentRow(item);
  const claimed = db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_p19'`);
  check(
    "P19",
    "answers changed after Checkout creation cannot receive payment authority",
    res.status === 500
      && row?.payment_status === "unpaid"
      && row?.provider_event_id === null
      && jobsFor(item).length === 0
      && claimed === "0",
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length} claimed=${claimed}`
  );
});

await runCaseGroup(["P21"], async () => {
  // P21 — the hash check itself. P19 proves a non-verified edit is refused, but
  // that refusal comes from the protected-verification lock BEFORE the webhook
  // compares hashes, so removing the comparison leaves P19 green. Here the
  // participant re-verifies after Checkout creation: the current verification is
  // VERIFIED (the lock is satisfied, the metadata still names the same product,
  // person and matter), only its hash differs from the one frozen in the Session.
  // The only remaining defence is `session.metadata.verification_hash !==
  // verification.hash`, and the refusal must carry that check's own reason.
  const { reconcileExpungementAiCheckoutEvent } = await import("../src/lib/expungement-ai/checkout-reconciliation.ts");
  const item = await createItem(USER_A, "p21");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p21" });
  const prior = await readProtectedPacketVerification({ consumerAuthUserId: USER_A, briefcaseItemId: item });
  assert.equal(prior.ok, true);
  assert.equal(prior.value.status, "verified");
  assert.equal(prior.value.hash, session.metadata.verification_hash, "the Session froze the verification current at creation");
  const reverify = derivePacketInformationPatch({
    existingItem: await getBriefcaseItemForWebhook(USER_A, item),
    protectedVerification: prior.value,
    answers: { participant_full_legal_name: "Re-verified Participant After Checkout" },
    verify: true
  });
  assert.ok(reverify?.protectedTransition, "a material edit with verify:true derives a new protected transition");
  assert.equal(reverify.readyToGenerate, true, "the re-verification is itself complete and reviewable");
  const changed = await persistProtectedPacketVerification({ consumerAuthUserId: USER_A, briefcaseItemId: item, transition: reverify.protectedTransition });
  assert.equal(changed.ok, true);
  // Prerequisites of the hash check, established: the lock passes and the hash moved.
  assert.equal(changed.value.status, "verified", "the current verification is VERIFIED, so the protected-verification lock cannot be what refuses");
  assert.notEqual(changed.value.hash, session.metadata.verification_hash, "the current hash differs from the Session's frozen hash");
  const current = await requireCurrentPacketVerification(USER_A, await getBriefcaseItemForWebhook(USER_A, item));
  assert.equal(current.hash, changed.value.hash, "requireCurrentPacketVerification admits the re-verification (execution reaches the hash comparison)");
  // The reconciliation names the hash check as its reason.
  const event = stripeEvent("evt_p21", session);
  let refusal = null;
  try { await reconcileExpungementAiCheckoutEvent(event); } catch (error) { refusal = error; }
  const namedTheHashCheck = refusal instanceof Error && /final verification changed after Checkout creation/.test(refusal.message);
  // And the real webhook surface records nothing.
  const res = await webhookRoute.POST(signedWebhookRequest(event));
  const row = paymentRow(item);
  const claimed = db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_p21'`);
  check(
    "P21",
    "a verified re-verification after Checkout creation is refused by the verification-hash check itself",
    namedTheHashCheck
      && res.status === 500
      && row?.payment_status === "unpaid"
      && row?.provider_event_id === null
      && jobsFor(item).length === 0
      && claimed === "0",
    `refusal=${refusal?.message ?? "none"} status=${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length} claimed=${claimed}`
  );
});

await runCaseGroup(["P7"], async () => {
  // P7 — a session naming another user's item records nothing.
  const itemA = await createItem(USER_A, "p7-a");
  const itemB = await createItem(USER_B, "p7-b");
  const crossed = await checkoutSession({ itemId: itemB, userId: USER_A, sessionId: "cs_p7" });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p7", crossed)));
  const rowA = paymentRow(itemA);
  const rowB = paymentRow(itemB);
  check(
    "P7",
    "a mismatched user or item records nothing",
    rowA?.payment_status === "unpaid" && rowB?.payment_status === "unpaid",
    `status=${res.status} a=${rowA?.payment_status} b=${rowB?.payment_status}`
  );
});

await runCaseGroup(["P8"], async () => {
  // P8 — the participant cannot call the server-only payment writer.
  const item = await createItem(USER_A, "p8");
  const denied = db.sqlExpectError(
    `set role authenticated; select outcome from public.record_consumer_packet_payment(
      '${item}','paid',5000,'usd','stripe','evt_p8','cs','pi','r',
      'server_webhook','forged','expungement_packet',
      '${fixtureUuid("p8-person")}','${consumerMatterIdForItem(item)}')`
  );
  db.sql(`reset role`);
  check(
    "P8",
    "a participant cannot execute the server-only payment writer",
    /permission denied/i.test(denied),
    denied.split("\n")[0]
  );
});

await runCaseGroup(["P18"], async () => {
  // P18 — the legacy endpoint is the same handler, so it cannot skip the check.
  const item = await createItem(USER_A, "p18");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p18" });
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
});

// =============================================================================
console.log("\nCONSUMER ENQUEUE — through the real authenticated route");

function renderRequest(body) {
  return new Request("http://localhost/api/expungement-ai/packet/render", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body)
  });
}

await runCaseGroup(['P20'], async () => {
  const item = await createItem(USER_A, 'p20');
  for (const isVerified of [false, undefined]) {
    setSession({ isAuthenticated: true, isVerified, userId: USER_A });
    const response = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
    assert.equal(response.status, 403, 'an unverified session cannot render');
  }
  check('P20', 'explicitly unverified and unspecified-verification sessions are denied', jobsFor(item).length === 0);
});

await runCaseGroup(["P15"], async () => {
  // P15 — the control is closed by default.
  delete process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE;
  const item = await createItem(USER_A, "p15");
  setSession({ isAuthenticated: true, isVerified: true, userId: USER_A });
  const res = await renderRoute.POST(renderRequest({ briefcaseItemId: item }));
  check("P15", "a disabled feature control refuses the route", res.status === 503, `status=${res.status}`);
});

await runCaseGroup(["P16"], async () => {
  // P16 — a scoped staging state admits only the named context.
  process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE = "staging_scoped";
  process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE = USER_A;
  const itemB = await createItem(USER_B, "p16-b");
  setSession({ isAuthenticated: true, isVerified: true, userId: USER_B });
  const outside = await renderRoute.POST(renderRequest({ briefcaseItemId: itemB }));
  check(
    "P16",
    "a controlled staging scope permits only the assigned test context",
    outside.status === 503,
    `outsideScope=${outside.status}`
  );
});

process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE = "live";

await runCaseGroup(["P11"], async () => {
  // P11 — an unpaid item cannot enqueue.
  const item = await createItem(USER_A, "p11");
  setSession({ isAuthenticated: true, isVerified: true, userId: USER_A });
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
});

await runCaseGroup(["P9","P12","P10","P13"], async () => {
  // P9 / P12 — a paid item creates exactly one Phase 53-bound job, and a repeat
  // request returns the same job rather than a second one.
  const item = await createItem(USER_A, "p9");
  const session = await checkoutSession({ itemId: item, userId: USER_A, sessionId: "cs_p9" });
  await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_p9", session)));

  setSession({ isAuthenticated: true, isVerified: true, userId: USER_A });
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
  setSession({ isAuthenticated: true, isVerified: true, userId: USER_B });
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
  // The route's own job is finalized first. Phase 55 now rejects a different
  // matter before it can even enter the durable queue.
  setSession({ isAuthenticated: true, isVerified: true, userId: USER_A });
  const firstFinalize = driveToFinalize(firstBody.jobId);
  if (firstFinalize?.accounting_result !== "zero_charge") {
    throw new Error(`the paid consumer job should finalize zero_charge, got ${JSON.stringify(firstFinalize)}`);
  }

  const otherMatter = fixtureUuid("p13-other-matter");
  const packet = pickUuid(db.sql(
    `insert into public.rcap_document_packets (partner_slug, pathway, state, safety_disclaimer) values ('expungement-ai-consumer','${MS_PATHWAY}','MS','fixture packet: not legal advice') returning id`
  ));
  const person = afterFirst[0].person_id;
  const hash = createHash("sha256").update("p13").digest("hex");
  const refused = db.sqlExpectError(
    `select id from public.enqueue_packet_render_job('${packet}','MS:${MS_PATHWAY}',
      'packet_document_v1','1.0.0',null,'MS','1.3.0','${hash}',null,null,
      '${person}','${otherMatter}',5,'${item}','${USER_A}')`
  );
  check(
    "P13",
    "the same paid item cannot enqueue another matter",
    /payment binding refused \(matter_mismatch\)/.test(refused),
    refused.split("\n")[0]
  );
});

await runCaseGroup(["P14"], async () => {
  // P14 — a sponsored request stays valid with no consumer payment at all.
  db.sql(`insert into public.partner_records (partner_slug) values ('we-must-vote') on conflict do nothing`);
  const partnerId = pickUuid(db.sql(`select id from public.partner_records where partner_slug='we-must-vote'`));
  const person = pickUuid(db.sql(
    `insert into public.rcap_persons (partner_slug, match_key) values ('we-must-vote','sponsored-p14') returning id`
  ));
  const packet = pickUuid(db.sql(
    `insert into public.rcap_document_packets (partner_slug, pathway, state, safety_disclaimer) values ('we-must-vote','${MS_PATHWAY}','MS','fixture packet: not legal advice') returning id`
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
});

// =============================================================================
console.log("PROMOTION CODES — a discount changes the amount due and nothing else");

// A discounted order is still an order: the packet is still owed, the owner is
// still the owner, and the verification still has to be current. What changes is
// how much was collected, and these cases exist so that "how much" is recorded
// truthfully rather than assumed.

await runCaseGroup(["D1"], async () => {
  // D1 - a percentage discount. 25% off $50 collects $37.50.
  const item = await createItem(USER_A, "d1");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d1", regular: 5000, discount: 1250
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d1", session)));
  const row = paymentRow(item);
  check(
    "D1",
    "a percentage discount records the reduced amount and still queues the packet",
    res.status === 200 && row?.payment_status === "paid" && row?.amount_cents === 3750
      && row?.regular_price_cents === 5000 && row?.discount_cents === 1250
      && jobsFor(item).length === 1,
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D2"], async () => {
  // D2 - a fixed-dollar discount. $10 off $50 collects $40.
  const item = await createItem(USER_A, "d2");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d2", regular: 5000, discount: 1000
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d2", session)));
  const row = paymentRow(item);
  check(
    "D2",
    "a fixed-dollar discount records the reduced amount and still queues the packet",
    res.status === 200 && row?.amount_cents === 4000 && row?.discount_cents === 1000
      && row?.regular_price_cents === 5000 && jobsFor(item).length === 1,
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D3","D6"], async () => {
  // D3 - 100% off. Stripe collects nothing, creates no PaymentIntent, and the
  // packet is owed exactly as it would be on a paid order. The old code ignored
  // this event entirely, so the customer got nothing.
  const item = await createItem(USER_A, "d3");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d3", regular: 5000, discount: 5000
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d3", session)));
  const row = paymentRow(item);
  const jobs = jobsFor(item);
  check(
    "D3",
    "a fully discounted order is settled at zero collected, with no payment intent, and the packet is queued",
    res.status === 200 && row?.payment_status === "paid" && row?.amount_cents === 0
      && row?.regular_price_cents === 5000 && row?.discount_cents === 5000
      && row?.payment_intent_id === null && jobs.length === 1,
    `${res.status} ${JSON.stringify(row)} jobs=${jobs.length}`
  );

  // D6 - replaying the no-cost event creates no second entitlement and no
  // second job. A $0 order is as replayable as a paid one.
  const before = db.scalar(`select count(*) from public.consumer_packet_payment_consumption`);
  const replay = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d3", session)));
  const after = db.scalar(`select count(*) from public.consumer_packet_payment_consumption`);
  check(
    "D6",
    "replaying a no-cost order creates no second entitlement or job",
    replay.status === 200 && before === after && jobsFor(item).length === 1,
    `${replay.status} consumption ${before}->${after} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D4"], async () => {
  // D4 - a session whose parts do not add up. The discount is claimed but the
  // total does not reflect it, so nothing is recorded: this is the case the old
  // fixed-amount rule could not express.
  const item = await createItem(USER_A, "d4");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d4", regular: 5000, discount: 1000, amount: 5000
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d4", session)));
  const row = paymentRow(item);
  check(
    "D4",
    "an order whose discount and total do not reconcile records nothing",
    res.status !== 200 && row?.payment_status !== "paid" && jobsFor(item).length === 0,
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D5"], async () => {
  // D5 - a zero-total session that also claims a charge. Stripe creates no
  // PaymentIntent for a no-cost order, so this is not a session Stripe produced.
  const item = await createItem(USER_A, "d5");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d5", regular: 5000, discount: 5000
  });
  session.payment_intent = "pi_forged_d5";
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d5", session)));
  const row = paymentRow(item);
  check(
    "D5",
    "a zero-total order that claims a payment intent is refused",
    res.status !== 200 && row?.payment_status !== "paid" && jobsFor(item).length === 0,
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D7"], async () => {
  // D7 - a discount larger than the packet. Stripe would not produce it; if one
  // arrives, it is refused rather than recorded as a negative collection.
  const item = await createItem(USER_A, "d7");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d7", regular: 5000, discount: 6000, amount: -1000
  });
  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d7", session)));
  const row = paymentRow(item);
  check(
    "D7",
    "a discount larger than the regular price is refused",
    res.status !== 200 && row?.payment_status !== "paid" && jobsFor(item).length === 0,
    `${res.status} ${JSON.stringify(row)} jobs=${jobsFor(item).length}`
  );
});

await runCaseGroup(["D8", "D9"], async () => {
  // D8, D9 - the customer did not pay. A Checkout Session can end unpaid in
  // several ordinary ways: the card was declined, the customer closed the tab,
  // the session expired, or they clicked cancel. Stripe still emits events for
  // some of those, and the return page is still reachable by refreshing it.
  //
  // Discounts make this worth asserting rather than assuming. A zero-total
  // order is now settled WITHOUT a payment, so "no PaymentIntent" can no longer
  // stand in for "not paid" — the only thing separating a free packet from a
  // declined one is the payment status, and a bug that treated `unpaid` the way
  // `no_payment_required` is treated would hand out packets to people whose
  // cards were refused. Both the webhook and the return-page reconciliation are
  // exercised, because they are two entry points to the same entitlement.
  const item = await createItem(USER_A, "d8");
  const session = await checkoutSession({
    itemId: item, userId: USER_A, sessionId: "cs_d8", regular: 5000, discount: 0, amount: 5000
  });
  // What Stripe reports for a session the customer never completed.
  session.payment_status = "unpaid";
  session.status = "open";
  session.payment_intent = null;

  const res = await webhookRoute.POST(signedWebhookRequest(stripeEvent("evt_d8", session)));
  const afterWebhook = paymentRow(item);
  check(
    "D8",
    "a cancelled, declined or incomplete order grants no entitlement and queues no job",
    afterWebhook?.payment_status !== "paid" && jobsFor(item).length === 0,
    `${res.status} ${JSON.stringify(afterWebhook)} jobs=${jobsFor(item).length}`
  );

  // The return page, refreshed repeatedly on that same unpaid session. It runs
  // the same reconciliation the webhook does; none of the refreshes may settle
  // the order, and none may burn the idempotency key the real payment needs
  // once the customer retries with a card that works.
  const { consumerCheckoutStatusFromSession } =
    await import("../src/lib/expungement-ai/checkout-reconciliation.ts");
  const binding = {
    userId: USER_A,
    briefcaseItemId: item,
    pathwayId: session.metadata.pathway_id ?? null,
    verificationHash: session.metadata.verification_hash
  };
  let settledOnSomeRefresh = false;
  for (let refresh = 0; refresh < 3; refresh += 1) {
    const status = await consumerCheckoutStatusFromSession(session, binding);
    if (status?.paid === true) settledOnSomeRefresh = true;
  }
  const afterRetries = paymentRow(item);
  const keyBurned = Number(
    db.scalar(`select count(*) from public.processed_stripe_events where stripe_event_id='evt_d8'`)
  ) > 0;
  check(
    "D9",
    "repeated return-page refreshes on an unpaid session settle nothing and leave the idempotency key unburned",
    !settledOnSomeRefresh
      && afterRetries?.payment_status !== "paid"
      && jobsFor(item).length === 0
      && !keyBurned,
    `settled=${settledOnSomeRefresh} ${JSON.stringify(afterRetries)} jobs=${jobsFor(item).length} keyBurned=${keyBurned}`
  );
});

await runCaseGroup(["P17"], async () => {
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
});

// =============================================================================
const passed = results.filter((r) => r.passed).length;
const report = {
  schemaVersion: "rcap-consumer-payment-http/v1",
  generatedBy: "scripts/verify-expungement-consumer-payment-http.mjs",
  migrationSequence: SEQUENCE,
  syntheticPublicationFixture: process.argv.includes("--local-publication-fixture"),
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
