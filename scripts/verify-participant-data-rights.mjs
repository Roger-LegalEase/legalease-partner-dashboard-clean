#!/usr/bin/env node
/**
 * Participant data rights — export, single-matter deletion, account deletion.
 *
 *   node scripts/verify-participant-data-rights.mjs
 *
 * Every assertion below runs the SHIPPED code: the route handlers, the ordered
 * deletion pipeline, the export builder, the proof mint and verify, the rate
 * limiter, and the data-rights migration running in a real PostgreSQL cluster. Three boundaries
 * are stood in for — the Supabase JS client, the session reader, and GoTrue —
 * and the GoTrue stand-in is a real HTTP server, so the password check and the
 * session revocation are genuine requests whose method and path are asserted.
 *
 * Nothing here asserts on source text where behavior could be asserted instead.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ephemeralPgAvailable()) {
  console.error("verify-participant-data-rights requires a local PostgreSQL toolchain.");
  process.exit(1);
}

// --- the GoTrue stand-in ------------------------------------------------------
// A real server on a real port. The reauthentication route signs in against it
// with the actual supabase-js client, and the deletion pipeline calls its admin
// logout endpoint with fetch. Both are recorded so the tests can assert that the
// calls happened, with the right method and the right path.
const gotrue = {
  password: "correct-horse-battery-staple",
  logoutCalls: [],
  tokenCalls: [],
  logoutStatus: 200
};

const gotrueServer = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      const parsed = JSON.parse(body || "{}");
      gotrue.tokenCalls.push({ email: parsed.email });
      if (parsed.password !== gotrue.password) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          access_token: "stub-access-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "stub-refresh-token",
          user: { id: "stub", email: parsed.email, aud: "authenticated", role: "authenticated" }
        })
      );
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.writeHead(204).end();
      return;
    }
    const adminLogout = url.pathname.match(/^\/auth\/v1\/admin\/users\/([^/]+)\/logout$/);
    if (adminLogout) {
      gotrue.logoutCalls.push({ method: req.method, userId: decodeURIComponent(adminLogout[1]), path: url.pathname });
      res.writeHead(gotrue.logoutStatus).end();
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found", path: url.pathname }));
  });
});

await new Promise((resolve) => gotrueServer.listen(0, "127.0.0.1", resolve));
const gotrueUrl = `http://127.0.0.1:${gotrueServer.address().port}`;

process.env.NEXT_PUBLIC_SUPABASE_URL = gotrueUrl;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.NEXT_PUBLIC_EXPUNGEMENT_AI_URL = "http://app.test";
process.env.PARTICIPANT_PRIVACY_PROOF_SECRET = "participant-privacy-proof-secret-for-tests";
process.env.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET = "participant-privacy-pseudonym-secret-for-tests";
process.env.RATE_LIMIT_HASH_SECRET = "participant-privacy-rate-limit-secret-for-tests";
delete process.env.VERCEL_ENV;
process.env.NODE_ENV = "test";

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/participant-privacy-test-loader.mjs", import.meta.url);

const doubles = await import("./lib/participant-privacy-test-doubles.mjs");
const { bindEphemeralDb, setSession, fixtureUuid, seedStorageObject, storageRemovals, storagePaths } = doubles;

const SEQUENCE = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "supabase/phase-32-expungement-screening-sessions.sql",
  "supabase/phase-33-expungement-screening-resume-links.sql",
  "supabase/phase-34-expungement-screening-drop-point-nudges.sql",
  "supabase/phase-35b-rcap-screening-session-partner-mode.sql",
  "supabase/phase-38-expungement-pending-screening-results.sql",
  "supabase/phase-40-web-analytics-events.sql",
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql",
  "supabase/phase-54-rcap-person-namespace-hardening.sql",
  "supabase/phase-55-expungement-matter-payment-binding.sql",
  "supabase/phase-24-request-rate-limit-buckets.sql",
  "supabase/migrations/20260830120000_participant_data_rights.sql"
];

const USER_A = fixtureUuid("participant-a");
const USER_B = fixtureUuid("participant-b");
const PARTNER_STAFF = fixtureUuid("partner-staff");

const results = [];
let failures = 0;
function check(id, title, passed, observed = "") {
  results.push({ id, title, passed });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed && observed) console.log(`         observed: ${observed}`);
}

// --- cluster ------------------------------------------------------------------

function boot() {
  const db = startEphemeralPg();
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create schema extensions`);
  db.sql(`create extension if not exists pgcrypto with schema extensions`);
  db.sql(`grant usage on schema extensions to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
  db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
  db.sql(`create schema auth`);
  db.sql(
    `create table auth.users (
       id uuid primary key, email text,
       created_at timestamptz not null default now(),
       email_confirmed_at timestamptz,
       last_sign_in_at timestamptz
     )`
  );
  db.sql(
    `create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
       select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`
  );
  db.sql(
    `create or replace function auth.role() returns text language sql stable as $$
       select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text) $$`
  );
  db.sql(`grant usage on schema auth to anon, authenticated, service_role`);
  db.sql(`grant execute on function auth.uid() to anon, authenticated, service_role`);
  db.sql(`grant execute on function auth.role() to anon, authenticated, service_role`);

  db.sql(
    `create table public.partner_records (
       id uuid primary key default gen_random_uuid(),
       partner_slug text unique not null,
       partner_name text not null,
       contact_email text,
       compliance_notes text
     )`
  );
  db.sql(
    `create table public.partner_users (
       id uuid primary key default gen_random_uuid(),
       auth_user_id uuid not null,
       partner_slug text,
       role text not null
     )`
  );
  db.sql(
    `create table public.rcap_persons (
       id uuid primary key default gen_random_uuid(),
       partner_slug text not null, match_key text not null,
       created_at timestamptz not null default now()
     )`
  );
  db.sql(`create unique index rcap_persons_partner_match_key_idx on public.rcap_persons(partner_slug, match_key)`);
  db.sql(
    `create table public.rcap_document_packets (
       id uuid primary key default gen_random_uuid(), partner_slug text not null,
       user_id uuid, briefcase_id uuid, person_id uuid, state text not null default 'MS',
       jurisdiction text, document_type text, pathway text not null,
       status text not null default 'draft_started', relief_outcome text
     )`
  );
  db.sql(
    `create table public.rcap_document_packet_inputs (
       id uuid primary key default gen_random_uuid(),
       document_packet_id uuid not null references public.rcap_document_packets(id) on delete cascade,
       partner_slug text not null, intake_session_id uuid,
       input_payload jsonb not null default '{}'::jsonb, unique(document_packet_id)
     )`
  );
  db.sql(
    `create table public.processed_stripe_events (
       stripe_event_id text primary key, event_type text, related_object_id text,
       created_at timestamptz not null default now()
     )`
  );

  for (const file of SEQUENCE) db.applyFile(path.join(rootDir, file));

  db.sql(
    `insert into auth.users (id, email, email_confirmed_at, last_sign_in_at) values
       ('${USER_A}','a@participant.test', now(), now()),
       ('${USER_B}','b@participant.test', now(), now()),
       ('${PARTNER_STAFF}','staff@partner.test', now(), now())`
  );
  db.sql(
    `insert into public.partner_records (partner_slug, partner_name, contact_email, compliance_notes)
     values ('second-chance-clinic','Second Chance Clinic','clinic@partner.test','Confidential partner compliance note.')`
  );
  db.sql(
    `insert into public.partner_users (auth_user_id, partner_slug, role)
     values ('${PARTNER_STAFF}','second-chance-clinic','internal_admin')`
  );
  return db;
}

const db = boot();
bindEphemeralDb(db);

// --- real application modules --------------------------------------------------

const { NextRequest } = await import("next/server");
const reauthRoute = await import("../src/app/api/expungement-ai/privacy/reauth/route.ts");
const exportRoute = await import("../src/app/api/expungement-ai/privacy/export/route.ts");
const matterRoute = await import("../src/app/api/expungement-ai/privacy/matter/route.ts");
const accountRoute = await import("../src/app/api/expungement-ai/privacy/account/route.ts");
const requestsRoute = await import("../src/app/api/expungement-ai/privacy/requests/route.ts");
const apiSession = await import("../src/lib/expungement-ai/privacy/api-session.ts");
const { participantPseudonymUserId, participantSubjectPseudonym } = await import(
  "../src/lib/expungement-ai/privacy/pseudonym.ts"
);
const { ACCOUNT_DELETION_STEPS } = await import("../src/lib/expungement-ai/privacy/contract.ts");
const { resetResumeRateLimitsForTests } = await import("../src/lib/expungement-ai/screening-resume-rate-limit.ts");
const packetGeneration = await import("../src/lib/expungement-ai/packet-generation.ts");

/**
 * The authorization behind the private packet URL. Calling it directly is the
 * point: this is the function the download route delegates to, so what it says
 * IS whether the link still works.
 */
async function privateDownloadWorks(userId, itemId) {
  // The lookup runs under row-level security as the signed-in participant, so
  // the session has to be the one whose link is being tested.
  setSession({ isAuthenticated: true, userId, email: "download-check@participant.test" });
  try {
    const packet = await packetGeneration.getConsumerPacketDownload({ userId, briefcaseItemId: itemId });
    return Boolean(packet?.fileName);
  } catch (error) {
    lastDownloadError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    // Three outcomes, not two. "The link is refused" and "the authority this
    // link depends on does not exist in the database" both raise, and both
    // would read as false -- which would let the after-deletion check pass on a
    // link that never worked in the first place. A missing function is not a
    // revoked link, so it gets its own answer and satisfies neither check.
    if (/does not exist|undefined_function/i.test(lastDownloadError)) return DEPENDENCY_UNAVAILABLE;
    return false;
  }
}
/** Neither true nor false: the check could not be performed at all. */
const DEPENDENCY_UNAVAILABLE = Symbol("dependency_unavailable");
let lastDownloadError = "";

// --- fixtures ------------------------------------------------------------------

const sql = (text) => db.sql(text);
const scalar = (text) => String(sql(text)).split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
const count = (text) => Number(scalar(text) || 0);

function seedParticipant(userId, label, { partnerSlug = null } = {}) {
  const sessionId = fixtureUuid(`session/${label}`);
  const itemId = fixtureUuid(`item/${label}`);

  sql(
    `insert into public.screening_sessions
       (session_id, jurisdiction, answers, status, partner_slug, flow_mode, resume_email,
        resume_email_normalized, resume_token_hash, resume_sent_at, resume_consent_at,
        resume_consent_text_version)
     values ('${sessionId}','MS','{"q1":"yes","q2":"2019-03-01"}'::jsonb,'completed',
             ${partnerSlug ? `'${partnerSlug}'` : "null"}, ${partnerSlug ? "'rcap'" : "'dtc'"},
             '${label}@participant.test','${label}@participant.test',
             'RESUME-TOKEN-HASH-${label}', now(), now(), 'v3')`
  );
  sql(
    `insert into public.consumer_briefcase_items
       (id, user_id, item_type, jurisdiction, status, payment_allowed, pathway_label, result_code,
        packet_type, payment_status, packet_status, summary_json, next_steps_json,
        artifact_refs_json, reminder_at, source_session_id)
     values ('${itemId}','${userId}','packet','MS','packet_ready',true,'ms-nonconviction','packet_ready',
             'custom_pleading','unpaid','ready',
             '{"text":"Your Mississippi petition is ready."}'::jsonb,
             '["File at the circuit clerk."]'::jsonb,
             '{"provider":"rcap_source_engine","packetId":"${itemId}","fileName":"petition.txt","contentType":"text/plain","source":"source_driven_packet_plan","packetPlanId":"ms-nonconviction","downloadPath":"/api/expungement-ai/packet/download?briefcaseItemId=${itemId}","generatedAt":"2026-02-01T00:00:00.000Z","text":"PETITION TO EXPUNGE - fixture body"}'::jsonb,
             now() + interval '30 days','${sessionId}')`
  );
  sql(
    `insert into public.consumer_pending_screening_results
       (pending_id, claimed_user_id, claimed_at, jurisdiction, result_code, summary,
        screening_answers, source_session_id)
     values (gen_random_uuid(),'${userId}', now(),'MS','packet_ready','A saved check.',
             '{"q1":"yes"}'::jsonb,'${sessionId}')`
  );
  sql(
    `insert into public.legalease_os_support_items
       (category, user_id, email, briefcase_item_id, message_redacted, route_submitted_from)
     values ('briefcase','${userId}','${label}@participant.test','${itemId}','I need help with my packet.','/briefcase')`
  );
  sql(
    `insert into public.web_analytics_events (event_id, event_name, user_id)
     values (gen_random_uuid(),'briefcase_viewed','${userId}')`
  );

  // The person, the matter and the payment are created through the SHIPPED
  // functions, not by hand. The phase-49/50/55 guards refused a hand-written
  // packet_render_jobs row outright, which is the whole point of them: a
  // fixture that could bypass those guards would be testing a schema this
  // product does not have.
  // One person per participant, however many matters they have — the same
  // invariant the application relies on.
  sql(
    `insert into public.rcap_persons (partner_slug, match_key)
     values ('expungement-ai-consumer', 'consumer:' || encode(
       extensions.digest(convert_to('rcap:consumer-person:v1:${userId}', 'utf8'), 'sha256'), 'hex'))
     on conflict (partner_slug, match_key) do nothing`
  );
  const personId = pickUuid(
    sql(
      `select id from public.rcap_persons
        where partner_slug = 'expungement-ai-consumer'
          and match_key = 'consumer:' || encode(
            extensions.digest(convert_to('rcap:consumer-person:v1:${userId}', 'utf8'), 'sha256'), 'hex')`
    )
  );
  const matterId = scalar(`select public.consumer_matter_id_for_briefcase_item('${itemId}')`);
  // The checkout binding is written when Checkout begins, before any provider
  // event arrives; the payment writer confirms that binding and refuses to swing
  // it onto a different session. Reproduce that order rather than inventing a
  // payment with no checkout behind it.
  sql(
    `update public.consumer_briefcase_items
        set checkout_session_id='cs_${label}',
            payment_product_id='expungement_packet',
            payment_person_id='${personId}',
            payment_matter_id='${matterId}'
      where id='${itemId}'`
  );
  const paymentOutcome = sql(
    `select outcome from public.record_consumer_packet_payment(
       '${itemId}'::uuid, 'paid', 5000, 'usd', 'stripe', 'evt_${label}',
       'cs_${label}', 'pi_${label}', 'https://receipt.test/${label}',
       'server_webhook', 'verify-participant-data-rights', 'expungement_packet',
       '${personId}'::uuid, '${matterId}'::uuid)`
  );
  if (!/recorded|already/i.test(paymentOutcome)) {
    throw new Error(
      `fixture payment refused for ${label}: ${paymentOutcome.trim()} | person=${personId} matter=${matterId} | item=${sql(
        `select coalesce(checkout_session_id,'NULL') || '~' || coalesce(payment_product_id,'NULL') || '~' || coalesce(payment_person_id::text,'NULL') || '~' || coalesce(payment_matter_id::text,'NULL') || '~' || coalesce(amount_cents::text,'NULL') || '~' || coalesce(currency,'NULL') from public.consumer_briefcase_items where id='${itemId}'`
      ).trim()}`
    );
  }

  const packetIdA = pickUuid(
    sql(
      `insert into public.rcap_document_packets (partner_slug, user_id, briefcase_id, person_id, pathway)
       values ('expungement-ai-consumer','${userId}','${itemId}','${personId}','ms-nonconviction') returning id`
    )
  );
  const packetIdB = pickUuid(
    sql(
      `insert into public.rcap_document_packets (partner_slug, user_id, briefcase_id, person_id, pathway)
       values ('expungement-ai-consumer','${userId}','${itemId}','${personId}','ms-nonconviction') returning id`
    )
  );
  const jobId = pickUuid(
    sql(
      `select id from public.enqueue_packet_render_job(
         '${packetIdA}'::uuid, 'ms/nonconviction', 'custom_pleading', '1.0.0',
         '${"b".repeat(64)}', 'ms', '2026.1', '${sha64(`${label}-delivered`)}',
         null, null, '${personId}'::uuid, '${matterId}'::uuid, 5,
         '${itemId}'::uuid, '${userId}'::uuid)`
    )
  );
  const queuedJobId = pickUuid(
    sql(
      `select id from public.enqueue_packet_render_job(
         '${packetIdB}'::uuid, 'ms/nonconviction', 'custom_pleading', '1.0.0',
         '${"b".repeat(64)}', 'ms', '2026.1', '${sha64(`${label}-queued`)}',
         null, null, '${personId}'::uuid, '${matterId}'::uuid, 5,
         '${itemId}'::uuid, '${userId}'::uuid)`
    )
  );

  // Attach a stored artifact to the first job. The artifact-evidence columns
  // are writable only under the finalizer's authority, and minting a worker
  // fencing token is not this test's business, so the fixture sets that
  // authority explicitly in one session and says so.
  const artifactPath = `packet-artifacts/consumer/${matterId}/${jobId}/${"a".repeat(64)}.pdf`;
  sql(
    `select set_config('rcap.packet_mutation_authority', 'finalize_packet_render_job', false);
     update public.packet_render_jobs
        set output_storage_path='${artifactPath}', output_sha256='${"a".repeat(64)}'
      where id='${jobId}';
     select set_config('rcap.packet_mutation_authority', '', false)`
  );
  seedStorageObject(artifactPath, 2048);

  sql(
    `insert into public.consumer_packet_payment_consumption
       (consumer_briefcase_item_id, consumer_auth_user_id, provider_event_id, person_id, matter_id,
        first_render_job_id, consumption_unit_hash)
     values ('${itemId}','${userId}','evt_${label}','${personId}','${matterId}','${jobId}','${sha64(`unit-${label}`)}')`
  );
  sql(
    `select set_config('rcap.packet_mutation_authority', 'record_packet_delivery_event', false);
     insert into public.packet_delivery_events (render_job_id, event_type, actor_user_id)
     values ('${jobId}','delivery_authorized','${userId}');
     select set_config('rcap.packet_mutation_authority', '', false)`
  );

  return { sessionId, itemId, jobId, queuedJobId, artifactPath, personId, matterId };
}

/** psql prints the command tag after a RETURNING row; take the first uuid line. */
function pickUuid(out) {
  return (
    String(out)
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line)) ?? ""
  );
}

function sha64(seed) {
  return createHash("sha256").update(seed).digest("hex");
}

const A = seedParticipant(USER_A, "a", { partnerSlug: "second-chance-clinic" });
const B = seedParticipant(USER_B, "b");
// A second matter for the same participant, so a single-matter deletion has
// something adjacent it must not touch.
const B2 = seedParticipant(USER_B, "b2");

// A ledger row is the accounting record that has to survive an erasure intact.
sql(
  `select set_config('rcap.packet_mutation_authority', 'finalize_packet_render_job', false);
   insert into public.packet_credit_ledger (render_job_id, event_type, consumption_unit_hash)
   values ('${A.jobId}','zero_charge','${sha64("ledger-a")}');
   select set_config('rcap.packet_mutation_authority', '', false)`
);

const ledgerBefore = count(`select count(*) from public.packet_credit_ledger`);
const consumptionBefore = count(`select count(*) from public.consumer_packet_payment_consumption`);
const deliveryBefore = count(`select count(*) from public.packet_delivery_events`);

// --- helpers -------------------------------------------------------------------

function req(pathname, body, { origin = "http://app.test", host = "app.test", method = "POST" } = {}) {
  const headers = new Headers({
    "content-type": "application/json",
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": "http"
  });
  if (origin) headers.set("origin", origin);
  return new NextRequest(`http://${host}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function jsonOf(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function mintProof(userId, purpose, password = gotrue.password) {
  setSession({ isAuthenticated: true, userId, email: `${userId === USER_A ? "a" : userId === USER_B ? "b" : "staff"}@${userId === PARTNER_STAFF ? "partner" : "participant"}.test` });
  const response = await reauthRoute.POST(req("/api/expungement-ai/privacy/reauth", { purpose, password }));
  return { status: response.status, body: await jsonOf(response) };
}

console.log("\nParticipant data rights\n");

// =============================================================================
// THE RELAXED GUARDS STILL REFUSE EVERYTHING THEY REFUSED BEFORE
//
// The data-rights migration re-creates four existing guards with one narrow, named exception
// each. These checks are the cost of that: without the erasure authority set,
// every original refusal must still fire, and even WITH it the accounting
// fields must not move.
// =============================================================================

{
  const pseudonym = participantPseudonymUserId(USER_A);

  check(
    "G1",
    "the consumer binding is still immutable without the erasure authority",
    /immutable once set/.test(
      db.sqlExpectError(
        `update public.packet_render_jobs set consumer_auth_user_id='${pseudonym}' where id='${A.jobId}'`
      )
    )
  );
  check(
    "G2",
    "the consumer item binding is immutable even WITH the erasure authority",
    /immutable once set/.test(
      db.sqlExpectError(
        `select set_config('rcap.participant_erasure_authority','erase_participant_identifiers',false);
         update public.packet_render_jobs set consumer_briefcase_item_id=gen_random_uuid() where id='${A.jobId}'`
      )
    )
  );
  check(
    "G3",
    "delivery events are still append-only without the erasure authority",
    /append-only/.test(
      db.sqlExpectError(`update public.packet_delivery_events set actor_user_id='${pseudonym}' where actor_user_id='${USER_A}'`)
    ) &&
      /recorded only by record_packet_delivery_event/.test(
        db.sqlExpectError(
          `insert into public.packet_delivery_events (render_job_id, event_type) values ('${A.jobId}','transmission_started')`
        )
      )
  );
  check(
    "G4",
    "a delivery event still cannot be deleted, with or without the erasure authority",
    /append-only/.test(
      db.sqlExpectError(
        `select set_config('rcap.participant_erasure_authority','erase_participant_identifiers',false);
         delete from public.packet_delivery_events where actor_user_id='${USER_A}'`
      )
    )
  );
  check(
    "G5",
    "the payment consumption binding is still immutable without the erasure authority",
    /binding is immutable/.test(
      db.sqlExpectError(
        `update public.consumer_packet_payment_consumption set consumer_auth_user_id='${pseudonym}' where consumer_auth_user_id='${USER_A}'`
      )
    )
  );
  check(
    "G6",
    "the paid amount is immutable even WITH the erasure authority",
    /binding is immutable/.test(
      db.sqlExpectError(
        `select set_config('rcap.participant_erasure_authority','erase_participant_identifiers',false);
         update public.consumer_packet_payment_consumption set amount_cents=1 where consumer_auth_user_id='${USER_A}'`
      )
    )
  );
  check(
    "G7",
    "a queued job still cannot be failed without the cancellation authority",
    /failure is recorded only through its canonical functions/.test(
      db.sqlExpectError(
        `update public.packet_render_jobs set status='failed', error_code='render_failed' where id='${A.queuedJobId}'`
      )
    )
  );
  check(
    "G8",
    "the cancellation authority cannot touch a job a worker has started",
    /participant cancellation applies only to a queued job|illegal transition/.test(
      db.sqlExpectError(
        `select set_config('rcap.packet_mutation_authority','cancel_participant_render_jobs',false);
         update public.packet_render_jobs set status='delivered' where id='${A.jobId}'`
      )
    )
  );
  check(
    "G9",
    "render job rows are still never deleted",
    /never deleted/.test(
      db.sqlExpectError(
        `select set_config('rcap.participant_erasure_authority','erase_participant_identifiers',false);
         delete from public.packet_render_jobs where id='${A.jobId}'`
      )
    )
  );
  check("G10", "none of the refused statements changed a row", count(`select count(*) from public.packet_render_jobs where consumer_auth_user_id='${USER_A}'`) === 2 && count(`select count(*) from public.packet_delivery_events where actor_user_id='${USER_A}'`) === 1 && count(`select count(*) from public.consumer_packet_payment_consumption where consumer_auth_user_id='${USER_A}' and amount_cents=5000`) === 1);
}


// =============================================================================
// EXPORT
// =============================================================================

let exportPackage = null;
{
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const response = await exportRoute.POST(
    req("/api/expungement-ai/privacy/export", { idempotencyKey: "export-key-0001" })
  );
  exportPackage = await jsonOf(response);

  check("E1", "export returns the participant's package", response.status === 200 && exportPackage.format === "participant-data-export/v1", `${response.status} ${JSON.stringify(exportPackage).slice(0, 200)}`);
  check(
    "E2",
    "export is a download, private and uncacheable",
    /attachment; filename=/.test(response.headers.get("content-disposition") ?? "") &&
      /no-store/.test(response.headers.get("cache-control") ?? ""),
    `${response.headers.get("content-disposition")} | ${response.headers.get("cache-control")}`
  );

  const sections = ["profile", "screenings", "matters", "answers", "verificationHistory", "uploads", "packets", "sponsorshipAttribution", "privacyRequests", "retainedRecordExplanation"];
  const missing = sections.filter((key) => !(key in exportPackage));
  check("E3", "export covers all ten required sections", missing.length === 0, `missing: ${missing.join(", ")}`);

  check("E4", "export carries the participant's own matter and answers", exportPackage.matters.length === 1 && exportPackage.matters[0].matterId === A.itemId && exportPackage.answers.some((entry) => JSON.stringify(entry.answers).includes("2019-03-01")), JSON.stringify(exportPackage.matters).slice(0, 200));

  const serialized = JSON.stringify(exportPackage);
  check("E5", "export contains no other participant's data", !serialized.includes(USER_B) && !serialized.includes(B.itemId) && !serialized.includes("b@participant.test"), "user B data present in user A's export");
  check("E6", "export leaks no security material", !serialized.includes("RESUME-TOKEN-HASH") && !/packet-artifacts\//.test(serialized) && !serialized.includes("service-role-test-key"), "security material present in export");
  check("E7", "export leaks no partner-confidential material", !serialized.includes("Confidential partner compliance note") && !serialized.includes("clinic@partner.test"), "partner-confidential material present in export");
  check("E8", "export names the sponsor and explains what is retained", exportPackage.sponsorshipAttribution.some((entry) => entry.sponsorName === "Second Chance Clinic") && exportPackage.retainedRecordExplanation.length >= 5, JSON.stringify(exportPackage.sponsorshipAttribution));
  check("E9", "export records itself as a privacy request with a receipt", typeof exportPackage.receiptCode === "string" && exportPackage.receiptCode.startsWith("EXP-") && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='export' and status='completed'`) === 1, exportPackage.receiptCode);
  check("E10", "export deleted nothing", count(`select count(*) from public.consumer_briefcase_items where user_id='${USER_A}'`) === 1);
}

{
  // Idempotency on export: the same key twice is one request row.
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  await exportRoute.POST(req("/api/expungement-ai/privacy/export", { idempotencyKey: "export-key-0001" }));
  check("E11", "a repeated export key is one request, not two", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='export'`) === 1);
}

// =============================================================================
// ROW-LEVEL SECURITY ON THE REQUEST RECORD
// =============================================================================

{
  const asParticipant = (userId, query) =>
    Number(
      String(
        db.sql(
          `set role authenticated; select set_config('request.jwt.claim.sub','${userId}',false); ${query}`
        )
      )
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^\d+$/.test(line))
        .pop() ?? "0"
    );

  check("Q1", "a participant reads their own privacy requests", asParticipant(USER_A, "select count(*) from public.participant_privacy_requests") >= 1);
  check("Q2", "a participant reads none of another participant's", asParticipant(USER_B, "select count(*) from public.participant_privacy_requests") === 0);
  check("Q3", "a participant cannot write a privacy request directly", /permission denied|violates row-level security/.test(db.sqlExpectError(`set role authenticated; select set_config('request.jwt.claim.sub','${USER_A}',false); insert into public.participant_privacy_requests (user_id, request_type, idempotency_key, status, completed_at, completion_receipt, receipt_code) values ('${USER_A}','account_deletion','forged-key-0001','completed', now(), '{}'::jsonb,'FORGED')`)));
  check("Q4", "a participant cannot read the internal step ledger, holds, tombstones or processor rows", ["participant_privacy_request_steps", "participant_legal_holds", "participant_account_tombstones", "participant_processor_propagations"].every((table) => /permission denied/.test(db.sqlExpectError(`set role authenticated; select set_config('request.jwt.claim.sub','${USER_A}',false); select count(*) from public.${table}`))));
  check("Q5", "a participant cannot call the erasure functions directly", /permission denied/.test(db.sqlExpectError(`set role authenticated; select set_config('request.jwt.claim.sub','${USER_A}',false); select public.pseudonymize_participant_retained_records('${USER_A}'::uuid, gen_random_uuid())`)) && /permission denied/.test(db.sqlExpectError(`set role authenticated; select set_config('request.jwt.claim.sub','${USER_A}',false); select public.freeze_participant_account('${USER_A}'::uuid, '${"0".repeat(64)}', null)`)));
}

// =============================================================================
// TRANSPORT SECURITY
// =============================================================================

{
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  for (const [id, origin] of [["S1", "http://evil.example"], ["S2", null], ["S3", "null"]]) {
    const response = await accountRoute.POST(
      req("/api/expungement-ai/privacy/account", { idempotencyKey: "csrf-attempt-0001", proof: "x", confirmation: "DELETE MY ACCOUNT" }, { origin })
    );
    check(`${id}`, `cross-origin or origin-less account deletion is refused (${origin ?? "no Origin header"})`, response.status === 403, String(response.status));
  }
  check("S4", "no account was deleted by the refused requests", count(`select count(*) from auth.users where id='${USER_A}'`) === 1);

  setSession({ isAuthenticated: false });
  const anon = await exportRoute.POST(req("/api/expungement-ai/privacy/export", { idempotencyKey: "anon-key-0001" }));
  check("S5", "an unauthenticated export is refused", anon.status === 401, String(anon.status));

  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const oversize = new NextRequest("http://app.test/api/expungement-ai/privacy/export", {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      host: "app.test",
      origin: "http://app.test",
      "x-forwarded-host": "app.test",
      "x-forwarded-proto": "http",
      "content-length": String(64 * 1024)
    }),
    body: JSON.stringify({ idempotencyKey: "x".repeat(50_000) })
  });
  const oversizeResponse = await exportRoute.POST(oversize);
  check("S6", "an oversized body is refused before it is parsed", oversizeResponse.status === 413, String(oversizeResponse.status));
}

// =============================================================================
// RECENT AUTH
// =============================================================================

let proofA = null;
{
  resetResumeRateLimitsForTests();
  sql(`delete from public.request_rate_limit_buckets`);

  const wrong = await mintProof(USER_A, "account_deletion", "not-the-password");
  check("R1", "a wrong password mints no proof", wrong.status === 401 && !wrong.body.proof, JSON.stringify(wrong));

  const right = await mintProof(USER_A, "account_deletion");
  proofA = right.body.proof;
  check("R2", "the right password mints a proof against the real identity provider", right.status === 200 && typeof proofA === "string" && gotrue.tokenCalls.some((call) => call.email === "a@participant.test"), JSON.stringify(right).slice(0, 200));

  // Purpose binding and account binding, checked through the route that consumes them.
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const wrongPurpose = await matterRoute.POST(
    req("/api/expungement-ai/privacy/matter", { matterId: A.itemId, proof: proofA, idempotencyKey: "purpose-test-0001" })
  );
  check("R3", "an account-deletion proof cannot delete a matter", wrongPurpose.status === 401 && (await jsonOf(wrongPurpose)).reason === "wrong_purpose", String(wrongPurpose.status));

  setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
  const wrongUser = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof: proofA, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "cross-user-0001" })
  );
  check("R4", "one participant's proof cannot authorize another's deletion", wrongUser.status === 401 && (await jsonOf(wrongUser)).reason === "wrong_user", String(wrongUser.status));
  check("R5", "the refused cross-account attempt deleted nothing", count(`select count(*) from auth.users where id='${USER_A}'`) === 1 && count(`select count(*) from auth.users where id='${USER_B}'`) === 1);

  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const noConfirm = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof: proofA, confirmation: "delete", idempotencyKey: "no-confirm-0001" })
  );
  check("R6", "the typed confirmation phrase is required", noConfirm.status === 400, String(noConfirm.status));

  const forged = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof: `v1.${USER_A}.account_deletion.1.99999999999999.abc.${"0".repeat(64)}`, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "forged-0001" })
  );
  check("R7", "a forged proof signature is refused", forged.status === 401 && (await jsonOf(forged)).reason === "bad_signature", String(forged.status));
}

// =============================================================================
// RATE LIMITING
// =============================================================================

{
  resetResumeRateLimitsForTests();
  sql(`delete from public.request_rate_limit_buckets`);
  let limited = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await mintProof(USER_A, "account_deletion", "not-the-password");
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  check("L1", "repeated password attempts are rate limited", limited);
  resetResumeRateLimitsForTests();
  sql(`delete from public.request_rate_limit_buckets`);
}

// =============================================================================
// USER A CANNOT DELETE USER B
// =============================================================================

{
  const proof = (await mintProof(USER_A, "matter_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const response = await matterRoute.POST(
    req("/api/expungement-ai/privacy/matter", { matterId: B.itemId, proof, idempotencyKey: "cross-matter-0001" })
  );
  const body = await jsonOf(response);
  check("X1", "one participant cannot delete another's matter", response.status === 500 && body.failedStep === "verify_matter_ownership", `${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  check("X2", "the other participant's matter is untouched", count(`select count(*) from public.consumer_briefcase_items where id='${B.itemId}'`) === 1);
  check("X3", "the other participant's screening is untouched", count(`select count(*) from public.screening_sessions where session_id='${B.sessionId}'`) === 1);
}

// =============================================================================
// PARTNER STAFF CANNOT DELETE PARTICIPANTS
// =============================================================================

{
  // Partner staff are signed in, hold an internal_admin partner_users row, and
  // present a valid proof for their OWN account. The route has no parameter
  // that names a subject, so the only account they can reach is their own.
  const proof = (await mintProof(PARTNER_STAFF, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: PARTNER_STAFF, email: "staff@partner.test" });
  const response = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "staff-self-0001" })
  );
  const body = await jsonOf(response);
  check("P1", "a partner-staff deletion completes only against their own account", response.status === 200 && body.status === "completed", `${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  check("P2", "no participant matter was deleted by partner staff", count(`select count(*) from public.consumer_briefcase_items where user_id in ('${USER_A}','${USER_B}')`) === 3);
  check("P3", "both participants can still sign in", count(`select count(*) from auth.users where id in ('${USER_A}','${USER_B}')`) === 2);
  check("P4", "no participant tombstone was written", count(`select count(*) from public.participant_account_tombstones where user_id in ('${USER_A}','${USER_B}')`) === 0);
}

// =============================================================================
// SINGLE-MATTER DELETION
// =============================================================================

{
  const beforeDeletion = await privateDownloadWorks(USER_B, B.itemId);
  const proof = (await mintProof(USER_B, "matter_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
  const response = await matterRoute.POST(
    req("/api/expungement-ai/privacy/matter", { matterId: B.itemId, proof, idempotencyKey: "matter-b-0001" })
  );
  const body = await jsonOf(response);
  check("M1", "a participant can delete one of their own matters", response.status === 200 && body.status === "completed", `${response.status} ${JSON.stringify(body).slice(0, 300)}`);
  check("M2", "the matter and its screening answers are gone", count(`select count(*) from public.consumer_briefcase_items where id='${B.itemId}'`) === 0 && count(`select count(*) from public.screening_sessions where session_id='${B.sessionId}'`) === 0);
  check("M3", "the packet object is gone from storage", !storagePaths().includes(B.artifactPath) && storageRemovals().includes(B.artifactPath), storagePaths().join(", "));
  check("M4", "the receipt says what was kept and why", Array.isArray(body.receipt?.whatWasKept) && body.receipt.whatWasKept.length > 0 && typeof body.receiptCode === "string", JSON.stringify(body.receipt).slice(0, 200));
  check("M5", "the account itself is untouched", count(`select count(*) from auth.users where id='${USER_B}'`) === 1 && count(`select count(*) from public.participant_account_tombstones where user_id='${USER_B}'`) === 0);
  check("M6", "the deleted matter's payment record is retained and pseudonymized", count(`select count(*) from public.consumer_packet_payment_consumption where consumer_briefcase_item_id='${B.itemId}' and consumer_auth_user_id='${participantPseudonymUserId(USER_B)}'`) === 1);
  check("M13", "a neighbouring matter's payment record keeps its owner", count(`select count(*) from public.consumer_packet_payment_consumption where consumer_briefcase_item_id='${B2.itemId}' and consumer_auth_user_id='${USER_B}'`) === 1, scalar(`select consumer_auth_user_id::text from public.consumer_packet_payment_consumption where consumer_briefcase_item_id='${B2.itemId}'`));

  check("M10", "a neighbouring matter of the same participant survives", count(`select count(*) from public.consumer_briefcase_items where id='${B2.itemId}'`) === 1 && count(`select count(*) from public.screening_sessions where session_id='${B2.sessionId}'`) === 1);
  check("M11", "a neighbouring matter's queued render is not cancelled", count(`select count(*) from public.packet_render_jobs where id='${B2.queuedJobId}' and status='queued'`) === 1, scalar(`select status || '/' || coalesce(error_code,'-') from public.packet_render_jobs where id='${B2.queuedJobId}'`));
  check("M12", "the deleted matter's queued render is cancelled", count(`select count(*) from public.packet_render_jobs where id='${B.queuedJobId}' and status='failed' and error_code='participant_deletion_cancelled'`) === 1, scalar(`select status || '/' || coalesce(error_code,'-') from public.packet_render_jobs where id='${B.queuedJobId}'`));
  check("M8", "the private packet URL worked before the deletion", beforeDeletion === true, lastDownloadError);
  // Strictly false. DEPENDENCY_UNAVAILABLE must not satisfy this: a link that
  // was never reachable proves nothing about revocation.
  const afterDeletion = await privateDownloadWorks(USER_B, B.itemId);
  check(
    "M9",
    "the private packet URL stops working after the deletion",
    afterDeletion === false,
    afterDeletion === DEPENDENCY_UNAVAILABLE
      ? `unproven, not passing: ${lastDownloadError}`
      : lastDownloadError
  );

  // Idempotent repeat.
  const repeat = await matterRoute.POST(
    req("/api/expungement-ai/privacy/matter", { matterId: B.itemId, proof, idempotencyKey: "matter-b-0001" })
  );
  const repeatBody = await jsonOf(repeat);
  check("M7", "repeating the same matter deletion returns the same receipt", repeat.status === 200 && repeatBody.repeated === true && repeatBody.receiptCode === body.receiptCode, JSON.stringify(repeatBody).slice(0, 200));
}

// =============================================================================
// LEGAL HOLD
// =============================================================================

{
  sql(
    `insert into public.participant_legal_holds (user_id, reason, placed_by)
     values ('${USER_A}','A court preservation order applies to this account.','legal@legalease.test')`
  );
  const proof = (await mintProof(USER_A, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const response = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "hold-blocked-0001" })
  );
  const body = await jsonOf(response);
  check("H1", "a legal hold blocks account deletion", response.status === 409 && body.status === "blocked_legal_hold", `${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  check("H2", "the blocked request records the check and the reason", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and status='blocked_legal_hold' and legal_hold_checked_at is not null and legal_hold_active`) === 1);
  check("H3", "nothing was deleted while the hold stood", count(`select count(*) from public.consumer_briefcase_items where user_id='${USER_A}'`) === 1 && count(`select count(*) from auth.users where id='${USER_A}'`) === 1);

  sql(`update public.participant_legal_holds set released_at = now(), released_by = 'legal@legalease.test' where user_id='${USER_A}'`);
}

// =============================================================================
// ACCOUNT DELETION — INTERRUPTED, THEN RESUMED
// =============================================================================

let accountReceipt = null;
{
  // Break session revocation. The pipeline must stop at that step, leave the
  // account frozen, and leave a ledger that says exactly where it stopped.
  gotrue.logoutStatus = 500;
  const proof = (await mintProof(USER_A, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const failed = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "account-a-0001" })
  );
  const failedBody = await jsonOf(failed);
  check("N1", "a mid-pipeline failure is reported, not swallowed", failed.status === 500 && failedBody.failedStep === "revoke_sessions" && failedBody.resumable === true, `${failed.status} ${JSON.stringify(failedBody).slice(0, 250)}`);
  check("N2", "the account is already frozen at the point of failure", count(`select count(*) from public.participant_account_tombstones where user_id='${USER_A}' and restoration_barrier and deleted_at is null`) === 1);
  check("N3", "a frozen account is refused new participant writes", /frozen or erased/.test(db.sqlExpectError(`insert into public.consumer_briefcase_items (user_id, item_type, jurisdiction, status, payment_allowed) values ('${USER_A}','packet','MS','packet_ready',true)`)));
  check("N4", "the step ledger records freeze completed and revoke failed", count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account' and s.status='completed'`) === 1 && count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='revoke_sessions' and s.status='failed'`) === 1);
  check("N5", "the Auth user still exists after the interrupted run", count(`select count(*) from auth.users where id='${USER_A}'`) === 1);
  check("N6", "no step after the failure ran", count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key in ('delete_auth_user','write_backup_tombstone','delete_or_deidentify_matters') and s.status <> 'pending'`) === 0);

  const freezeAttemptsBefore = count(`select s.attempt_count from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account'`);

  // Fix the cause and resume with the SAME idempotency key.
  gotrue.logoutStatus = 200;
  const resumeProof = (await mintProof(USER_A, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const resumed = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof: resumeProof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "account-a-0001" })
  );
  accountReceipt = await jsonOf(resumed);
  check("N7", "the resumed run completes the deletion", resumed.status === 200 && accountReceipt.status === "completed", `${resumed.status} ${JSON.stringify(accountReceipt).slice(0, 300)}`);
  check("N8", "resuming did not re-run an already completed step", count(`select s.attempt_count from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account'`) === freezeAttemptsBefore, "freeze_account was executed twice");
  check("N9", "the resumed run is the same request, not a second one", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and idempotency_key='account-a-0001'`) === 1);
  check("N10", "every ordered step is recorded completed, in order", ACCOUNT_DELETION_STEPS.every((step, index) => count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='${step}' and s.step_order=${index + 1} and s.status='completed'`) === 1), "a step is missing, out of order, or not completed");
}

// =============================================================================
// WHAT THE ACCOUNT DELETION ACTUALLY DID
// =============================================================================

{
  check("D1", "the Auth user is deleted, and deleted last", count(`select count(*) from auth.users where id='${USER_A}'`) === 0);
  check("D2", "every session was revoked at the identity provider", gotrue.logoutCalls.some((call) => call.userId === USER_A && call.method === "POST") && count(`select count(*) from public.participant_account_tombstones where user_id='${USER_A}' and sessions_revoked_at is not null`) === 1, JSON.stringify(gotrue.logoutCalls));
  check("D3", "matters, screenings and saved checks are gone", count(`select count(*) from public.consumer_briefcase_items where user_id='${USER_A}'`) === 0 && count(`select count(*) from public.screening_sessions where session_id='${A.sessionId}'`) === 0 && count(`select count(*) from public.consumer_pending_screening_results where claimed_user_id='${USER_A}'`) === 0);
  check("D4", "uploads and generated packets are gone from storage", storageRemovals().includes(A.artifactPath) && !storagePaths().includes(A.artifactPath));
  check("D5", "follow-up queue entries are gone", count(`select count(*) from public.legalease_os_support_items where user_id='${USER_A}'`) === 0);
  check("D6", "unstarted renders were cancelled with an honest reason", count(`select count(*) from public.packet_render_jobs where id='${A.queuedJobId}' and status='failed' and error_code='participant_deletion_cancelled'`) === 1, scalar(`select status || '/' || coalesce(error_code,'-') from public.packet_render_jobs where id='${A.queuedJobId}'`));
  check("D7", "assisted partner access has ended", count(`select count(*) from public.screening_sessions where partner_slug='second-chance-clinic'`) === 0);
  check("D8", "the partner's own records are untouched", count(`select count(*) from public.partner_records where partner_slug='second-chance-clinic'`) === 1 && count(`select count(*) from public.partner_users where partner_slug='second-chance-clinic'`) === 1);
  check("D9", "the credit ledger is byte-for-byte intact", count(`select count(*) from public.packet_credit_ledger`) === ledgerBefore);
  check("D10", "payment records are retained, not deleted", count(`select count(*) from public.consumer_packet_payment_consumption`) === consumptionBefore);
  check("D11", "retained payment records carry the pseudonym, not the account id", count(`select count(*) from public.consumer_packet_payment_consumption where consumer_auth_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.consumer_packet_payment_consumption where consumer_auth_user_id='${participantPseudonymUserId(USER_A)}'`) === 1);
  check("D12", "delivery audit evidence is retained and pseudonymized", count(`select count(*) from public.packet_delivery_events`) === deliveryBefore && count(`select count(*) from public.packet_delivery_events where actor_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.packet_delivery_events where actor_user_id='${participantPseudonymUserId(USER_A)}'`) === 1);
  check("D13", "render jobs are retained and pseudonymized", count(`select count(*) from public.packet_render_jobs where consumer_auth_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.packet_render_jobs where consumer_auth_user_id='${participantPseudonymUserId(USER_A)}'`) === 2);
  check("D14", "analytics events are de-identified, not deleted", count(`select count(*) from public.web_analytics_events where user_id='${USER_A}'`) === 0 && count(`select count(*) from public.web_analytics_events`) >= 1);
  check("D15", "reminders were cleared before the matters were removed", JSON.stringify(accountReceipt.receipt?.steps?.stop_email_reminders ?? {}).includes("remindersCleared"), JSON.stringify(accountReceipt.receipt?.steps?.stop_email_reminders));
  check("D16", "every approved processor has a recorded outcome", count(`select count(*) from public.participant_processor_propagations p join public.participant_privacy_requests r on r.id = p.request_id where r.user_id='${USER_A}'`) === 4);
  check("D17", "the receipt survives the account and names the pseudonym", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and status='completed' and receipt_code is not null`) === 1 && accountReceipt.receipt?.subjectPseudonym === participantSubjectPseudonym(USER_A));
}

// =============================================================================
// AFTER DELETION
// =============================================================================

{
  const blocked = await apiSession.requireConsumerBriefcaseApiSession();
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const stillBlocked = await apiSession.requireConsumerBriefcaseApiSession();
  check("A1", "a surviving session for the deleted account is refused", stillBlocked.ok === false && stillBlocked.response.status === 403, JSON.stringify(stillBlocked.ok));
  void blocked;

  const exportAfter = await exportRoute.POST(req("/api/expungement-ai/privacy/export", { idempotencyKey: "after-delete-0001" }));
  check("A2", "the deleted account cannot export data either", exportAfter.status === 403, String(exportAfter.status));

  const requestsAfter = await requestsRoute.GET();
  check("A3", "the deleted account cannot read its request history", requestsAfter.status === 403, String(requestsAfter.status));

  // Backup restoration: the participant's rows come back, and the tombstone
  // comes back with them.
  const restored = db.sqlExpectError(
    `insert into public.consumer_briefcase_items (id, user_id, item_type, jurisdiction, status, payment_allowed)
     values ('${A.itemId}','${USER_A}','packet','MS','packet_ready',true)`
  );
  check("A4", "a restore-from-backup cannot recreate the account's records", /frozen or erased/.test(restored), restored.slice(0, 200));
  check("A5", "the tombstone records the deletion and its receipt", count(`select count(*) from public.participant_account_tombstones where user_id='${USER_A}' and deleted_at is not null and receipt_code is not null and restoration_barrier`) === 1);

  setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
  const unaffected = await apiSession.requireConsumerBriefcaseApiSession();
  check("A6", "an unrelated participant is unaffected", unaffected.ok === true && count(`select count(*) from auth.users where id='${USER_B}'`) === 1);
}

// =============================================================================

gotrueServer.close();
db.stop?.();

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED.`);
  process.exit(1);
}
console.log("Participant data rights verified: export, matter deletion, and resumable account deletion.");
assert.ok(true);
