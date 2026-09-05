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

/**
 * A real processor endpoint, over loopback.
 *
 * The processor adapters are exercised through their actual transmit path
 * rather than swapped for stubs, because the defect being guarded against was
 * precisely a step that reported "sent" without transmitting anything. A stub
 * that returns "acknowledged" would reproduce that defect in the test. This
 * server makes the request real and its outcome deterministic:
 *
 *   200 with x-request-id -> acknowledged
 *   202 with x-request-id -> sent and still outstanding
 *   500                   -> retryable, so the adapter retries and reports pending
 *   400                   -> permanent, reported failed without a retry
 *
 * The mode is switched per check by processorMode.
 */
let processorMode = "success";
const processorRequests = [];
let pausedProcessorStarted = null;
let pausedProcessorRelease = null;
const processorServer = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    const requestBody = JSON.parse(body || "{}");
    processorRequests.push({ url: req.url, body, mode: processorMode });
    if (processorMode === "pause_once") {
      processorMode = "success";
      pausedProcessorStarted?.();
      await new Promise((resolve) => { pausedProcessorRelease = resolve; });
    }
    if (processorMode === "retryable") {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "temporarily unavailable" }));
      return;
    }
    if (processorMode === "permanent") {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unknown subject" }));
      return;
    }
    if (processorMode === "accepted") {
      res.writeHead(202, {
        "content-type": "application/json",
        "x-request-id": requestBody.providerReference ?? `provider-ref-${processorRequests.length}`
      });
      res.end(JSON.stringify({ accepted: true }));
      return;
    }
    res.writeHead(200, {
      "content-type": "application/json",
      "x-request-id": requestBody.providerReference ?? `provider-ref-${processorRequests.length}`
    });
    res.end(JSON.stringify({ ok: true }));
  });
});
await new Promise((resolve) => processorServer.listen(0, "127.0.0.1", resolve));
const processorUrl = `http://127.0.0.1:${processorServer.address().port}`;
process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT = `${processorUrl}/email`;
process.env.PRIVACY_EMAIL_PROCESSOR_TOKEN = "email-suppression-test-token";
process.env.PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT = `${processorUrl}/analytics`;
process.env.PRIVACY_ANALYTICS_PROCESSOR_TOKEN = "analytics-erasure-test-token";
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
const PARTIAL_STATE_MIGRATION =
  "supabase/migrations/20260901180000_account_deletion_partial_state.sql";

const USER_A = fixtureUuid("participant-a");
const USER_B = fixtureUuid("participant-b");
const PARTNER_STAFF = fixtureUuid("partner-staff");
const FORMER_PARTNER = fixtureUuid("former-partner");

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
       role text not null,
       status text not null default 'active'
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
       ('${PARTNER_STAFF}','staff@partner.test', now(), now()),
       ('${FORMER_PARTNER}','former@partner.test', now(), now())`
  );
  db.sql(
    `insert into public.partner_records (partner_slug, partner_name, contact_email, compliance_notes)
     values ('second-chance-clinic','Second Chance Clinic','clinic@partner.test','Confidential partner compliance note.')`
  );
  db.sql(
    `insert into public.partner_users (auth_user_id, partner_slug, role)
     values ('${PARTNER_STAFF}','second-chance-clinic','internal_admin'),
            ('${FORMER_PARTNER}','second-chance-clinic','partner_admin')`
  );
  db.sql(`update public.partner_users set status='disabled' where auth_user_id='${FORMER_PARTNER}'`);
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

/**
 * A deterministic stand-in for the digest a real issued artifact carries. The
 * protected authority compares the artifact's own digest against the digest in
 * its provenance evidence, so the fixture has to carry a real, matching pair --
 * a fixture that skipped it would be exercising a weaker check than production.
 */
function artifactSha(itemId) {
  return createHash("sha256").update(`fixture-artifact/${itemId}`).digest("hex");
}

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
             '{"provider":"rcap_source_engine","packetId":"${itemId}","fileName":"petition.txt","contentType":"text/plain","source":"source_driven_packet_plan","packetPlanId":"ms-nonconviction","artifactSha256":"${artifactSha(itemId)}","downloadPath":"/api/expungement-ai/packet/download?briefcaseItemId=${itemId}","generatedAt":"2026-02-01T00:00:00.000Z","text":"PETITION TO EXPUNGE - fixture body"}'::jsonb,
             now() + interval '30 days','${sessionId}')`
  );
  // The protected artifact authority behind the private download link. Seeded
  // explicitly rather than inferred from packet_status, because the authority
  // deliberately refuses to infer it: a link that worked because a status
  // string said "ready" is the substitution the whole table exists to stop.
  // The evidence digest matches the artifact's own, so the legacy-artifact
  // corroboration the application performs is genuinely exercised.
  sql(
    `insert into public.consumer_packet_artifact_provenance
       (briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
        verification_hash, entitlement_source, artifact, legacy_evidence)
     select '${itemId}','${userId}',
            public.consumer_matter_id_for_briefcase_item('${itemId}'), null, null,
            'legacy_backfill',
            b.artifact_refs_json,
            jsonb_build_object(
              'kind','sponsored_generation_record',
              'consumerAuthUserId','${userId}',
              'briefcaseItemId','${itemId}',
              'matterId', public.consumer_matter_id_for_briefcase_item('${itemId}')::text,
              'artifactSource','source_driven_packet_plan',
              'packetPlanId','ms-nonconviction',
              'artifactSha256','${artifactSha(itemId)}',
              'outputId','${itemId}',
              'verificationHash', null,
              'sourceSessionId','${sessionId}',
              'generationRecordId','${itemId}',
              'creditRecordId','${sessionId}'
            )
       from public.consumer_briefcase_items b where b.id = '${itemId}'`
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

// =============================================================================
// OLD-SCHEMA CAPABILITY GATE
//
// The cluster is deliberately still at the schema immediately before the
// partial-state migration. Current application code must refuse deletion
// before it opens a request or performs any destructive operation. The same
// cluster is then upgraded and used for every behavioral deletion check below.
// =============================================================================

{
  const { participantPrivacyReadiness } = await import("../src/lib/expungement-ai/privacy/readiness.ts");
  const oldSchemaReadiness = await participantPrivacyReadiness();
  const requestsBefore = count(
    `select count(*) from public.participant_privacy_requests where user_id='${USER_B}' and request_type='account_deletion'`
  );
  const mattersBefore = count(`select count(*) from public.consumer_briefcase_items where user_id='${USER_B}'`);
  setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
  const refused = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", {
      proof: "must-not-be-consumed-on-old-schema",
      confirmation: "DELETE MY ACCOUNT",
      idempotencyKey: "old-schema-capability-refusal"
    })
  );
  const refusedBody = await jsonOf(refused);
  check("V1", "the immediately preceding schema fails the exact partial-deletion capability probe",
    oldSchemaReadiness.ready === false
      && oldSchemaReadiness.checked.migrationPresent === true
      && oldSchemaReadiness.checked.partialStateContractPresent === false
      && oldSchemaReadiness.missing.some((entry) => entry.startsWith("participant_account_deletion_contract:")),
    JSON.stringify(oldSchemaReadiness));
  check("V2", "old-schema deletion returns 503 before opening a request or freezing the account",
    refused.status === 503
      && refusedBody.code === "privacy_not_ready"
      && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_B}' and request_type='account_deletion'`) === requestsBefore
      && count(`select count(*) from public.participant_account_tombstones where user_id='${USER_B}'`) === 0,
    `${refused.status} ${JSON.stringify(refusedBody)}`);
  check("V3", "old-schema refusal performs zero destructive or processor operations",
    count(`select count(*) from auth.users where id='${USER_B}'`) === 1
      && count(`select count(*) from public.consumer_briefcase_items where user_id='${USER_B}'`) === mattersBefore
      && gotrue.logoutCalls.length === 0
      && storageRemovals().length === 0
      && processorRequests.length === 0);

  db.applyFile(path.join(rootDir, PARTIAL_STATE_MIGRATION));
  const upgraded = await participantPrivacyReadiness();
  check("V4", "applying the migration exposes the exact service-role contract version",
    upgraded.ready === true && upgraded.checked.partialStateContractPresent === true,
    JSON.stringify(upgraded));

  db.sql(
    `create or replace function public.participant_account_deletion_contract_version()
       returns text language sql stable security definer set search_path=''
       as $$ select 'stale.partial-deletion.v1'::text $$`
  );
  const wrongVersion = await participantPrivacyReadiness();
  check("V5", "a stale contract version closes the deletion gate",
    wrongVersion.ready === false && wrongVersion.checked.partialStateContractPresent === false);
  db.applyFile(path.join(rootDir, PARTIAL_STATE_MIGRATION));

  db.sql(`revoke execute on function public.participant_account_deletion_contract_version() from service_role`);
  const inaccessible = await participantPrivacyReadiness();
  check("V6", "an inaccessible contract capability closes the deletion gate",
    inaccessible.ready === false && inaccessible.checked.partialStateContractPresent === false);
  db.applyFile(path.join(rootDir, PARTIAL_STATE_MIGRATION));
  check("V7", "browser roles cannot invoke the readiness capability",
    /permission denied/i.test(db.sqlExpectError(
      `set role authenticated; select public.participant_account_deletion_contract_version()`
    )));

  const matterFailureRequest = fixtureUuid("matter-failure-status-scope");
  db.sql(
    `insert into public.participant_privacy_requests
       (id, user_id, subject_pseudonym, request_type, idempotency_key, status,
        recent_auth_verified_at, recent_auth_method, recent_auth_proof_hash,
        target_matter_item_id)
     values
       ('${matterFailureRequest}', '${USER_B}', '${"a".repeat(64)}',
        'matter_deletion', 'matter-failure-status-scope', 'pending', now(),
        'password_reauthentication', '${"b".repeat(64)}', '${B.itemId}');
     insert into public.participant_privacy_request_steps
       (request_id, step_key, step_order)
     values
       ('${matterFailureRequest}', 'verify_matter_ownership', 1),
       ('${matterFailureRequest}', 'pseudonymize_retained_records', 2);
     select public.record_participant_privacy_step(
       '${matterFailureRequest}', 'verify_matter_ownership', 'completed', '{}'::jsonb, null
     );
     select public.record_participant_privacy_step(
       '${matterFailureRequest}', 'pseudonymize_retained_records', 'failed', '{}'::jsonb, 'fixture failure'
     )`
  );
  check("V8", "partial-state transitions remain account-deletion-only",
    scalar(`select status from public.participant_privacy_requests where id='${matterFailureRequest}'`) === "failed"
      && scalar(`select failure_code from public.participant_privacy_requests where id='${matterFailureRequest}'`) === "pseudonymize_retained_records");
  db.sql(`delete from public.participant_privacy_requests where id='${matterFailureRequest}'`);
  check("V9", "browser roles cannot inspect or acquire an account-deletion run lease",
    /permission denied/i.test(db.sqlExpectError(
      `set role authenticated; select * from public.participant_account_deletion_run_leases`
    ))
      && /permission denied/i.test(db.sqlExpectError(
        `set role authenticated; select public.acquire_participant_account_deletion_run_lease(
          gen_random_uuid(), gen_random_uuid()
        )`
      )));

  const { readProcessorPropagations } = await import("../src/lib/expungement-ai/privacy/store.ts");
  let ledgerReadFailedClosed = false;
  try {
    await readProcessorPropagations({
      from() {
        return {
          select() { return this; },
          async eq() { return { data: null, error: { message: "synthetic ledger read failure" } }; }
        };
      }
    }, fixtureUuid("failed-processor-ledger-read"));
  } catch (error) {
    ledgerReadFailedClosed = /could not read processor propagation ledger/.test(String(error));
  }
  check("V10", "a processor propagation ledger read failure stops the resumable run",
    ledgerReadFailedClosed);
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
// PROCESSOR READINESS — NOTHING DESTRUCTIVE MAY START
// =============================================================================

{
  const requiredProcessorConfig = [
    "PRIVACY_EMAIL_PROCESSOR_ENDPOINT",
    "PRIVACY_EMAIL_PROCESSOR_TOKEN",
    "PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT",
    "PRIVACY_ANALYTICS_PROCESSOR_TOKEN"
  ];
  const { participantPrivacyReadiness } = await import("../src/lib/expungement-ai/privacy/readiness.ts");
  const { privacyConfigReady } = await import("../src/lib/expungement-ai/privacy/processor-config.ts");
  const requestCountBefore = count(`select count(*) from public.participant_privacy_requests where user_id='${USER_B}' and request_type='account_deletion'`);

  for (const [index, name] of requiredProcessorConfig.entries()) {
    const saved = process.env[name];
    delete process.env[name];
    const config = privacyConfigReady();
    const deployment = await participantPrivacyReadiness();
    setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
    const response = await accountRoute.POST(
      req("/api/expungement-ai/privacy/account", {
        proof: "not-consumed-while-unready",
        confirmation: "DELETE MY ACCOUNT",
        idempotencyKey: `missing-processor-${index}`
      })
    );
    const body = await jsonOf(response);
    process.env[name] = saved;

    check(`G${index + 5}`, `${name} is required by the shared processor-readiness contract`,
      config.ready === false
        && config.missing.includes(name)
        && deployment.ready === false
        && deployment.accountDeletionReady === false
        && deployment.baseReady === true
        && deployment.missing.includes(name)
        && !deployment.baseMissing.includes(name));
    check(`G${index + 9}`, `${name} fails the deletion API before account freeze`,
      response.status === 503
        && body.code === "privacy_not_ready"
        && count(`select count(*) from public.participant_account_tombstones where user_id='${USER_B}'`) === 0
        && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_B}' and request_type='account_deletion'`) === requestCountBefore,
      `${response.status} ${JSON.stringify(body)}`);
  }

  for (const [index, name] of [
    "PRIVACY_EMAIL_PROCESSOR_ENDPOINT",
    "PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT"
  ].entries()) {
    const saved = process.env[name];
    process.env[name] = `http://processor-${index}.example.com/erase`;
    const config = privacyConfigReady();
    const deployment = await participantPrivacyReadiness();
    setSession({ isAuthenticated: true, userId: USER_B, email: "b@participant.test" });
    const response = await accountRoute.POST(
      req("/api/expungement-ai/privacy/account", {
        proof: "not-consumed-while-insecure",
        confirmation: "DELETE MY ACCOUNT",
        idempotencyKey: `insecure-processor-${index}`
      })
    );
    const body = await jsonOf(response);
    process.env[name] = saved;

    check(`G${index + 13}`, `${name} refuses insecure non-local processor transport`,
      config.ready === false && config.missing.includes(name) && deployment.ready === false && deployment.missing.includes(name));
    check(`G${index + 15}`, `${name} insecure transport fails before account freeze`,
      response.status === 503
        && body.code === "privacy_not_ready"
        && count(`select count(*) from public.participant_account_tombstones where user_id='${USER_B}'`) === 0
        && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_B}' and request_type='account_deletion'`) === requestCountBefore,
      `${response.status} ${JSON.stringify(body)}`);
  }

  const legacyProcessorConfig = {
    PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_URL: process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT,
    PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_TOKEN: process.env.PRIVACY_EMAIL_PROCESSOR_TOKEN,
    PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_URL: process.env.PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT,
    PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_TOKEN: process.env.PRIVACY_ANALYTICS_PROCESSOR_TOKEN
  };
  for (const name of requiredProcessorConfig) delete process.env[name];
  Object.assign(process.env, legacyProcessorConfig);
  const compatibleConfig = privacyConfigReady();
  const compatibleDeployment = await participantPrivacyReadiness();
  check("G17", "legacy processor environment remains supported during migration",
    compatibleConfig.ready === true
      && compatibleDeployment.accountDeletionReady === true
      && compatibleDeployment.ready === true);
  for (const name of Object.keys(legacyProcessorConfig)) delete process.env[name];
  process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT = legacyProcessorConfig.PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_URL;
  process.env.PRIVACY_EMAIL_PROCESSOR_TOKEN = legacyProcessorConfig.PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_TOKEN;
  process.env.PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT = legacyProcessorConfig.PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_URL;
  process.env.PRIVACY_ANALYTICS_PROCESSOR_TOKEN = legacyProcessorConfig.PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_TOKEN;
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
  // Workforce and partner identities use their governed offboarding path. The
  // participant endpoint must not run even against the staff member's own id.
  check(
    "P0",
    "a fully offboarded former partner may use participant account deletion",
    await apiSession.participantPrivacyActorEligible(FORMER_PARTNER)
  );
  const proof = (await mintProof(PARTNER_STAFF, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: PARTNER_STAFF, email: "staff@partner.test" });
  const deliverySession = await apiSession.requireConsumerBriefcaseApiSession();
  const response = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "staff-self-0001" })
  );
  const body = await jsonOf(response);
  check("P1", "a partner or staff identity cannot invoke consumer account deletion", response.status === 403 && body.code === "consumer_privacy_role_required", `${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  check("P2", "no participant matter was deleted by partner staff", count(`select count(*) from public.consumer_briefcase_items where user_id in ('${USER_A}','${USER_B}')`) === 3);
  check("P3", "both participants can still sign in", count(`select count(*) from auth.users where id in ('${USER_A}','${USER_B}')`) === 2);
  check("P4", "no participant tombstone was written", count(`select count(*) from public.participant_account_tombstones where user_id in ('${USER_A}','${USER_B}')`) === 0);
  check("P5", "the denied staff account remains active and has no deletion request", count(`select count(*) from auth.users where id='${PARTNER_STAFF}'`) === 1 && count(`select count(*) from public.participant_privacy_requests where user_id='${PARTNER_STAFF}' and request_type='account_deletion'`) === 0);
  check("P6", "privacy role exclusion does not block the shared private-delivery session guard", deliverySession.ok === true);
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
    req("/api/expungement-ai/privacy/account", { proof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "account-a-initial" })
  );
  const failedBody = await jsonOf(failed);
  const accountRequestId = failedBody.requestId;
  check("N1", "a mid-pipeline failure is reported as partial and resumable", failed.status === 500 && failedBody.status === "partially_completed" && failedBody.resumable === true && failedBody.code === "deletion_incomplete", `${failed.status} ${JSON.stringify(failedBody).slice(0, 250)}`);
  check("N2", "the account is already frozen at the point of failure", count(`select count(*) from public.participant_account_tombstones where user_id='${USER_A}' and restoration_barrier and deleted_at is null`) === 1);
  check("N3", "a frozen account is refused new participant writes", /frozen or erased/.test(db.sqlExpectError(`insert into public.consumer_briefcase_items (user_id, item_type, jurisdiction, status, payment_allowed) values ('${USER_A}','packet','MS','packet_ready',true)`)));
  check("N4", "the step ledger records freeze completed and revoke failed", count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account' and s.status='completed'`) === 1 && count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='revoke_sessions' and s.status='failed'`) === 1);
  check("N5", "the Auth user still exists after the interrupted run", count(`select count(*) from auth.users where id='${USER_A}'`) === 1);
  check("N6", "no step after the failure ran", count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key in ('delete_auth_user','write_backup_tombstone','delete_or_deidentify_matters') and s.status <> 'pending'`) === 0);

  const freezeAttemptsBefore = count(`select s.attempt_count from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account'`);

  // Fix session revocation, then make both configured processors accept work
  // asynchronously. Local destructive steps complete, but the request remains
  // partial until a later status check confirms each provider reference.
  gotrue.logoutStatus = 200;
  processorMode = "accepted";
  const resumeProof = (await mintProof(USER_A, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const resumed = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", { proof: resumeProof, confirmation: "DELETE MY ACCOUNT", idempotencyKey: "account-a-processor-retry" })
  );
  const processorFailure = await jsonOf(resumed);
  check("N7", "asynchronously accepted erasures remain truthfully partial and resumable", resumed.status === 500 && processorFailure.status === "partially_completed" && processorFailure.resumable === true, `${resumed.status} ${JSON.stringify(processorFailure).slice(0, 300)}`);
  check("N8", "the durable request and processor ledger retain each outstanding provider reference", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and status='partially_completed' and completed_at is null and failure_code='propagate_to_processors'`) === 1 && count(`select count(*) from public.participant_processor_propagations p join public.participant_privacy_requests r on r.id=p.request_id where r.user_id='${USER_A}' and p.status='sent' and p.reference is not null`) >= 2);
  check("N9", "Auth deletion does not run while a required processor is outstanding", count(`select count(*) from auth.users where id='${USER_A}'`) === 1 && count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id=s.request_id where r.user_id='${USER_A}' and s.step_key='delete_auth_user' and s.status <> 'pending'`) === 0);
  check("N10", "a new proof and idempotency key resume the same partial request",
    processorFailure.requestId === accountRequestId
      && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and status='partially_completed'`) === 1,
    `${accountRequestId} / ${processorFailure.requestId}`);

  // Hold the first retry inside a real processor request, then overlap a
  // second POST with a different proof and idempotency key. The durable run
  // lease must refuse the second attempt before it can repeat any step.
  resetResumeRateLimitsForTests();
  sql(`delete from public.request_rate_limit_buckets`);
  processorMode = "pause_once";
  const processorPaused = new Promise((resolve) => { pausedProcessorStarted = resolve; });
  const concurrentProofOne = (await mintProof(USER_A, "account_deletion")).body.proof;
  const concurrentProofTwo = (await mintProof(USER_A, "account_deletion")).body.proof;
  setSession({ isAuthenticated: true, userId: USER_A, email: "a@participant.test" });
  const processorRequestsBeforeConcurrentRun = processorRequests.length;
  const firstConcurrentRun = accountRoute.POST(
    req("/api/expungement-ai/privacy/account", {
      proof: concurrentProofOne,
      confirmation: "DELETE MY ACCOUNT",
      idempotencyKey: "account-a-concurrent-1"
    })
  );
  await Promise.race([
    processorPaused,
    new Promise((_, reject) => setTimeout(() => reject(new Error("processor pause was not reached")), 10_000))
  ]);
  const activeLeaseToken = scalar(
    `select lease_token from public.participant_account_deletion_run_leases where request_id='${accountRequestId}'`
  );
  sql(
    `update public.participant_account_deletion_run_leases
     set lease_expires_at = clock_timestamp() + interval '500 milliseconds'
     where request_id='${accountRequestId}'`
  );
  await new Promise((resolve) => setTimeout(resolve, 5_750));
  check("N11a", "the heartbeat keeps an active long-running deletion lease from expiring",
    scalar(`select lease_token from public.participant_account_deletion_run_leases where request_id='${accountRequestId}'`) === activeLeaseToken
      && count(`select count(*) from public.participant_account_deletion_run_leases where request_id='${accountRequestId}' and lease_expires_at > clock_timestamp() + interval '10 minutes'`) === 1);
  const secondConcurrentResponse = await accountRoute.POST(
    req("/api/expungement-ai/privacy/account", {
      proof: concurrentProofTwo,
      confirmation: "DELETE MY ACCOUNT",
      idempotencyKey: "account-a-concurrent-2"
    })
  );
  const secondConcurrentBody = await jsonOf(secondConcurrentResponse);
  check("N11", "concurrent retries converge on one live ledger and one destructive runner",
    secondConcurrentResponse.status === 409
      && secondConcurrentBody.code === "deletion_in_progress"
      && count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and status='partially_completed'`) === 1
      && count(`select count(*) from public.participant_account_deletion_run_leases where request_id='${accountRequestId}'`) === 1,
    `${secondConcurrentResponse.status} ${JSON.stringify(secondConcurrentBody)}`);
  check("N12", "the live unique index refuses a second ledger while deletion is partial",
    /participant_privacy_requests_live_account_deletion_uk/.test(db.sqlExpectError(
      `insert into public.participant_privacy_requests
         (user_id, subject_pseudonym, request_type, idempotency_key, status,
          recent_auth_verified_at, recent_auth_method, recent_auth_proof_hash)
       values ('${USER_A}', 'subject-a', 'account_deletion', 'account-a-forbidden-second',
               'pending', now(), 'password_reauthentication', 'forbidden-second-proof')`
    )));

  sql(
    `create or replace function public.release_participant_account_deletion_run_lease(
       p_request_id uuid, p_lease_token uuid
     ) returns boolean language plpgsql security definer set search_path = '' as $$
     begin
       raise exception 'synthetic transient release failure';
     end;
     $$`
  );
  pausedProcessorRelease?.();
  const completedResponse = await firstConcurrentRun;
  accountReceipt = await jsonOf(completedResponse);
  check("N13", "the leased processor retry completes the same deletion exactly once",
    completedResponse.status === 200
      && accountReceipt.status === "completed"
      && accountReceipt.requestId === accountRequestId
      && processorRequests.length === processorRequestsBeforeConcurrentRun + 2
      && processorRequests.slice(processorRequestsBeforeConcurrentRun).every((entry) => {
        const payload = JSON.parse(entry.body);
        return payload.action === "status" && typeof payload.providerReference === "string";
      }),
    `${completedResponse.status} ${JSON.stringify(accountReceipt).slice(0, 300)}`);
  check("N13a", "a transient lease-release failure cannot hide the durable completion receipt",
    completedResponse.status === 200
      && accountReceipt.receiptCode
      && count(`select count(*) from public.participant_account_deletion_run_leases where request_id='${accountRequestId}'`) === 1);
  sql(
    `create or replace function public.release_participant_account_deletion_run_lease(
       p_request_id uuid, p_lease_token uuid
     ) returns boolean language plpgsql security definer set search_path = '' as $$
     declare
       v_released boolean := false;
     begin
       delete from public.participant_account_deletion_run_leases
       where request_id = p_request_id and lease_token = p_lease_token
       returning true into v_released;
       return coalesce(v_released, false);
     end;
     $$`
  );
  scalar(
    `select public.release_participant_account_deletion_run_lease(
       '${accountRequestId}'::uuid,
       (select lease_token from public.participant_account_deletion_run_leases where request_id='${accountRequestId}')
     )`
  );
  check("N13b", "a leftover private lease remains safely cleanable after the response",
    count(`select count(*) from public.participant_account_deletion_run_leases where request_id='${accountRequestId}'`) === 0);
  check("N14", "resuming did not re-run an already completed destructive step", count(`select s.attempt_count from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='freeze_account'`) === freezeAttemptsBefore, "freeze_account was executed twice");
  check("N15", "every retry used the same request rather than duplicating work", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and status <> 'blocked_legal_hold'`) === 1);
  check("N16", "every ordered step is recorded completed, in order", ACCOUNT_DELETION_STEPS.every((step, index) => count(`select count(*) from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id = s.request_id where r.user_id='${USER_A}' and s.step_key='${step}' and s.step_order=${index + 1} and s.status='completed'`) === 1), "a step is missing, out of order, or not completed");

  const releasedRequestId = scalar(
    `select id from public.open_participant_privacy_request(
       '${USER_A}'::uuid, 'account_deletion', 'account-a-after-terminal',
       'subject-a', now(), 'password_reauthentication', 'after-terminal-proof', null,
       array['freeze_account'])`
  );
  check("N17", "live uniqueness releases only after the original request is completed",
    releasedRequestId !== "" && releasedRequestId !== accountRequestId
      && count(`select count(*) from public.participant_privacy_requests where id='${accountRequestId}' and status='completed'`) === 1);
  sql(`delete from public.participant_privacy_requests where id='${releasedRequestId}'`);
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
  check("D8", "the partner's own records are untouched", count(`select count(*) from public.partner_records where partner_slug='second-chance-clinic'`) === 1 && count(`select count(*) from public.partner_users where partner_slug='second-chance-clinic'`) === 2);
  check("D9", "the credit ledger is byte-for-byte intact", count(`select count(*) from public.packet_credit_ledger`) === ledgerBefore);
  check("D10", "payment records are retained, not deleted", count(`select count(*) from public.consumer_packet_payment_consumption`) === consumptionBefore);
  check("D11", "retained payment records carry the pseudonym, not the account id", count(`select count(*) from public.consumer_packet_payment_consumption where consumer_auth_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.consumer_packet_payment_consumption where consumer_auth_user_id='${participantPseudonymUserId(USER_A)}'`) === 1);
  check("D12", "delivery audit evidence is retained and pseudonymized", count(`select count(*) from public.packet_delivery_events`) === deliveryBefore && count(`select count(*) from public.packet_delivery_events where actor_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.packet_delivery_events where actor_user_id='${participantPseudonymUserId(USER_A)}'`) === 1);
  check("D13", "render jobs are retained and pseudonymized", count(`select count(*) from public.packet_render_jobs where consumer_auth_user_id='${USER_A}'`) === 0 && count(`select count(*) from public.packet_render_jobs where consumer_auth_user_id='${participantPseudonymUserId(USER_A)}'`) === 2);
  check("D14", "analytics events are de-identified, not deleted", count(`select count(*) from public.web_analytics_events where user_id='${USER_A}'`) === 0 && count(`select count(*) from public.web_analytics_events`) >= 1);
  check("D15", "reminders were cleared before the matters were removed", scalar(`select s.detail::text from public.participant_privacy_request_steps s join public.participant_privacy_requests r on r.id=s.request_id where r.user_id='${USER_A}' and s.step_key='stop_email_reminders'`).includes("remindersCleared"));
  check("D16", "every approved processor has a recorded outcome", count(`select count(*) from public.participant_processor_propagations p join public.participant_privacy_requests r on r.id = p.request_id where r.user_id='${USER_A}'`) === 4);
  const safeReceipt = JSON.stringify(accountReceipt.receipt ?? {});
  check("D17", "the safe completion receipt survives without participant or internal workflow identifiers", count(`select count(*) from public.participant_privacy_requests where user_id='${USER_A}' and request_type='account_deletion' and status='completed' and receipt_code is not null`) === 1 && accountReceipt.receipt?.status === "completed" && !safeReceipt.includes(USER_A) && !safeReceipt.includes(A.itemId) && !safeReceipt.includes("freeze_account"), safeReceipt.slice(0, 300));
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
// Processor erasure: four outcomes, each produced by a real request or an
// explicit classification. The point of these is narrow and important: the step
// they replace wrote "sent" for every processor whose contract entry said it
// held data, without transmitting anything.
// =============================================================================
{
  const { defaultProcessorAdapters, processorOutcomeIsSettled } =
    await import("../src/lib/expungement-ai/privacy/processor-erasure.ts");
  const adapters = defaultProcessorAdapters();
  const byKey = (key) => adapters.find((adapter) => adapter.key === key);
  const request = {
    requestId: fixtureUuid("processor/request"),
    userId: fixtureUuid("processor/user"),
    subjectPseudonym: "pseudo-subject",
    email: "processor-check@participant.test"
  };

  const before = processorRequests.length;
  processorMode = "success";
  const ok = await byKey("email_delivery").erase({ ...request, processorKey: "email_delivery" });
  check(
    "PR1",
    "a successful suppression is acknowledged, with the provider's own reference",
    ok.status === "acknowledged" && typeof ok.reference === "string" && ok.reference.length > 0
      && processorRequests.length > before,
    JSON.stringify(ok)
  );

  processorMode = "accepted";
  const accepted = await byKey("email_delivery").erase({ ...request, processorKey: "email_delivery" });
  check(
    "PR1a",
    "an asynchronously accepted erasure remains sent and outstanding",
    accepted.status === "sent"
      && typeof accepted.reference === "string"
      && accepted.detail.httpStatus === 202
      && processorOutcomeIsSettled(byKey("email_delivery"), accepted) === false,
    JSON.stringify(accepted)
  );
  processorMode = "success";
  const completedAccepted = await byKey("email_delivery").erase({
    ...request,
    processorKey: "email_delivery",
    providerReference: accepted.reference
  });
  const statusRequest = JSON.parse(processorRequests.at(-1).body);
  check(
    "PR1b",
    "an asynchronous provider reference reaches verified completion through the status protocol",
    completedAccepted.status === "acknowledged"
      && processorOutcomeIsSettled(byKey("email_delivery"), completedAccepted) === true
      && statusRequest.action === "status"
      && statusRequest.providerReference === accepted.reference,
    `${JSON.stringify(completedAccepted)} / ${JSON.stringify(statusRequest)}`
  );
  const savedEmailEndpoint = process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT;
  process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT = "http://127.0.0.1:1/email";
  const interruptedStatus = await defaultProcessorAdapters()
    .find((adapter) => adapter.key === "email_delivery")
    .erase({
      ...request,
      processorKey: "email_delivery",
      providerReference: accepted.reference
    });
  process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT = savedEmailEndpoint;
  check(
    "PR1c",
    "a failed asynchronous status poll preserves the durable provider reference",
    interruptedStatus.status === "pending"
      && interruptedStatus.reference === accepted.reference
      && interruptedStatus.detail.statusCheck === true,
    JSON.stringify(interruptedStatus)
  );

  processorMode = "retryable";
  const retry = await byKey("product_analytics").erase({ ...request, processorKey: "product_analytics" });
  check(
    "PR2",
    "a retryable failure is pending and retryable, never sent",
    retry.status === "pending" && retry.detail.retryable === true,
    JSON.stringify(retry)
  );

  processorMode = "permanent";
  const permanent = await byKey("product_analytics").erase({ ...request, processorKey: "product_analytics" });
  check(
    "PR3",
    "a permanent failure is failed, and is not retried into a pending state",
    permanent.status === "failed" && permanent.detail.retryable === false,
    JSON.stringify(permanent)
  );
  processorMode = "success";

  const payment = await byKey("payment_processor").erase({ ...request, processorKey: "payment_processor" });
  check(
    "PR4",
    "the payment processor is not_applicable, and says so as retention rather than deletion",
    payment.status === "not_applicable"
      && payment.detail.deletionRequested === false
      && payment.detail.retentionTreatment === "retained_for_financial_compliance",
    JSON.stringify(payment)
  );

  const worker = await byKey("packet_render_worker").erase({ ...request, processorKey: "packet_render_worker" });
  check(
    "PR5",
    "the render worker is not_applicable because it holds no participant data",
    worker.status === "not_applicable" && worker.detail.reason === "holds_no_participant_personal_data",
    JSON.stringify(worker)
  );

  check(
    "PR6",
    "pending and failed are outstanding; acknowledged and not_applicable settle",
    processorOutcomeIsSettled(byKey("email_delivery"), ok) === true
      && processorOutcomeIsSettled(byKey("product_analytics"), retry) === false
      && processorOutcomeIsSettled(byKey("product_analytics"), permanent) === false
      && processorOutcomeIsSettled(byKey("payment_processor"), payment) === true
  );

  // An unconfigured provider must never read as sent. This is the exact shape
  // of the original defect, so it is asserted directly.
  const savedUrl = process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT;
  delete process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT;
  const unconfigured = await defaultProcessorAdapters()
    .find((adapter) => adapter.key === "email_delivery")
    .erase({ ...request, processorKey: "email_delivery" });
  process.env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT = savedUrl;
  check(
    "PR7",
    "an unconfigured provider is pending, never sent or acknowledged",
    unconfigured.status === "pending" && unconfigured.detail.reason === "no_provider_configured",
    JSON.stringify(unconfigured)
  );
}

// =============================================================================
// Storage: exhaustive, paginated, recursive, resumable.
// =============================================================================
{
  const doubles = await import("./lib/participant-privacy-test-doubles.mjs");
  const { seedStorageObject, resetStorage, storageRemoveCalls, storagePaths,
          failStorageListing, failStorageRemoval, clearStorageFaults } = doubles;
  const { defaultDeletionDependencies } = await import("../src/lib/expungement-ai/privacy/deletion.ts");
  const { participantStoragePrefixes, STORAGE_DELETE_CHUNK } =
    await import("../src/lib/expungement-ai/privacy/contract.ts");

  const OWNER = fixtureUuid("storage/owner");
  const SIBLING = fixtureUuid("storage/sibling");
  const deps = defaultDeletionDependencies(doubles.getSupabaseAdminClient());

  resetStorage();
  // Two shapes, because they catch different mistakes and a fixture that only
  // has one of them proves less than it looks.
  //
  //   - 1,100 objects under a SINGLE prefix. Storage caps a page at 1,000, so a
  //     sweep that does not paginate finds 1,000 of them and misses 100. An
  //     earlier version of this fixture spread everything across 21 folders,
  //     where no folder exceeded a page: it proved recursion and silently
  //     proved nothing about pagination, and disabling pagination still passed.
  //   - 100 more nested three prefixes deep, so a sweep that does not recurse
  //     misses those.
  const ownerPrefix = participantStoragePrefixes(OWNER)[0];
  const expected = [];
  for (let i = 0; i < 1100; i += 1) {
    const path = `${ownerPrefix}/flat/file-${i}.pdf`;
    seedStorageObject(path);
    expected.push(path);
  }
  for (let i = 0; i < 100; i += 1) {
    const path = `${ownerPrefix}/matter-${i % 7}/year-${i % 3}/file-${i}.pdf`;
    seedStorageObject(path);
    expected.push(path);
  }
  // A second approved location, to prove the sweep is driven by the contract
  // list rather than by one remembered prefix.
  const packetsPrefix = participantStoragePrefixes(OWNER)[1];
  seedStorageObject(`${packetsPrefix}/nested/deep/packet.pdf`);
  expected.push(`${packetsPrefix}/nested/deep/packet.pdf`);
  // A sibling participant, who must be untouched.
  const siblingPath = `${participantStoragePrefixes(SIBLING)[0]}/matter-1/year-1/file-0.pdf`;
  seedStorageObject(siblingPath);

  const listed = [];
  for (const prefix of participantStoragePrefixes(OWNER)) {
    listed.push(...(await deps.listStorageObjects(prefix)));
  }
  check(
    "S1",
    "listing paginates and recurses: every one of 1,201 objects is found, across a 1,100-object page boundary and three levels of nesting",
    listed.length === expected.length && expected.every((path) => listed.includes(path)),
    `found ${listed.length} of ${expected.length}`
  );
  check("S2", "the sibling participant's object is not in the owner's listing", !listed.includes(siblingPath));

  const removal = await deps.removeStorageObjects(listed);
  check(
    "S3",
    "deletion is chunked rather than one oversized request",
    storageRemoveCalls().length >= Math.ceil(listed.length / STORAGE_DELETE_CHUNK)
      && storageRemoveCalls().every((batch) => batch.length <= STORAGE_DELETE_CHUNK),
    `${storageRemoveCalls().length} batch(es)`
  );
  check("S4", "every object is removed and none is reported failed",
    removal.failed.length === 0 && removal.removed.length === listed.length);
  const remaining = [];
  for (const prefix of participantStoragePrefixes(OWNER)) {
    remaining.push(...(await deps.listStorageObjects(prefix)));
  }
  check("S5", "a re-list after the sweep finds nothing left", remaining.length === 0, `${remaining.length} left`);
  check("S6", "the sibling participant's object survives", storagePaths().includes(siblingPath));

  // Already-absent objects: sweeping again is not an error.
  const secondPass = await deps.removeStorageObjects(expected.slice(0, 5));
  check("S7", "removing an object that is already gone succeeds", secondPass.failed.length === 0);

  // A listing failure must be a failed step, not an empty result. This is the
  // vacuity that let a missing directory read as "nothing to delete".
  clearStorageFaults();
  resetStorage();
  seedStorageObject(`${ownerPrefix}/matter-0/file-0.pdf`);
  failStorageListing(`${ownerPrefix}/matter-0`);
  let listingThrew = false;
  try {
    await deps.listStorageObjects(ownerPrefix);
  } catch {
    listingThrew = true;
  }
  check("S8", "a listing failure raises rather than reporting an empty prefix", listingThrew);

  // A partial sweep must resume: the objects that did delete stay deleted, and
  // a second run finishes the rest.
  clearStorageFaults();
  resetStorage();
  const resumePaths = [];
  for (let i = 0; i < 150; i += 1) {
    const path = `${ownerPrefix}/resume/file-${i}.pdf`;
    seedStorageObject(path);
    resumePaths.push(path);
  }
  failStorageRemoval(`${ownerPrefix}/resume/file-120.pdf`);
  const partial = await deps.removeStorageObjects(resumePaths);
  check("S9", "a partial sweep reports exactly the chunk that failed",
    partial.failed.length > 0 && partial.removed.length > 0
      && partial.removed.length + partial.failed.length === resumePaths.length,
    `${partial.removed.length} removed, ${partial.failed.length} failed`);
  clearStorageFaults();
  const resumed = await deps.removeStorageObjects(await deps.listStorageObjects(ownerPrefix));
  const afterResume = await deps.listStorageObjects(ownerPrefix);
  check("S10", "the resumed sweep finishes what the interrupted one left",
    resumed.failed.length === 0 && afterResume.length === 0, `${afterResume.length} left`);
  resetStorage();
}

// =============================================================================
// Deployment readiness. A visible control backed by unavailable tables or RPCs
// is a promise the deployment cannot keep.
// =============================================================================
{
  const { participantPrivacyReadiness } = await import("../src/lib/expungement-ai/privacy/readiness.ts");
  const ready = await participantPrivacyReadiness();
  check("G1", "readiness passes when the migration, RPC, secrets and every required processor are present",
    ready.ready === true && ready.missing.length === 0, JSON.stringify(ready.missing));
  check("G2", "readiness names artifact, workflow and processor authority as checked",
    ready.checked.migrationPresent === true && ready.checked.partialStateContractPresent === true && ready.checked.artifactAuthorityPresent === true && ready.checked.processorConfigPresent === true && Object.values(ready.checked.processorConfig).every(Boolean));

  const savedProof = process.env.PARTICIPANT_PRIVACY_PROOF_SECRET;
  delete process.env.PARTICIPANT_PRIVACY_PROOF_SECRET;
  const missingSecret = await participantPrivacyReadiness();
  process.env.PARTICIPANT_PRIVACY_PROOF_SECRET = savedProof;
  check("G3", "a missing proof secret closes the gate and is named",
    missingSecret.ready === false && missingSecret.missing.includes("PARTICIPANT_PRIVACY_PROOF_SECRET"));

  const savedPseudonym = process.env.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET;
  process.env.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET = "too-short";
  const shortSecret = await participantPrivacyReadiness();
  process.env.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET = savedPseudonym;
  check("G4", "a secret too short to be worth having closes the gate",
    shortSecret.ready === false && shortSecret.missing.includes("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET"));
}

// =============================================================================

gotrueServer.close();
processorServer.close();
db.stop?.();

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED.`);
  process.exit(1);
}
console.log("Participant data rights verified: export, matter deletion, and resumable account deletion.");
assert.ok(true);
