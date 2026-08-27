import path from "node:path";
import fs from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

process.env.PARTNER_ACCESS_CODE_PEPPER = "verify-partner-access-code-pepper";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { hashAccessCode } = await import("../src/lib/partners/access-code-crypto.ts");
const { outcomeCategoryForResultCode, packetRouteAvailableForResultCode } = await import(
  "../src/lib/expungement-ai/rcap-screening-analytics.ts"
);

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function seedPartner(db, slug, accessMode, { allowed = 10, used = 0, overageEnabled = false, pauseAtCap = false } = {}) {
  await db.query(
    `insert into public.partner_records
       (partner_id, partner_slug, partner_name, program_tier, access_mode, payment_status, qualification_status, provisioning_status)
     values ($1, $2, $3, 'standard', $4, 'paid', 'qualified', 'provisioned')`,
    [`pid-${slug}`, slug, `${slug} Org`, accessMode]
  );
  await db.query(
    `insert into public.partner_entitlement
       (partner_slug, screenings_allowed, screenings_used, overage_enabled, pause_at_cap)
     values ($1, $2, $3, $4, $5)`,
    [slug, allowed, used, overageEnabled, pauseAtCap]
  );
}

async function insertCode(db, slug, rawCode, campaign) {
  const res = await db.query(
    `insert into public.partner_access_codes (partner_slug, code_hash, code_type, campaign_name)
     values ($1, $2, 'shared', $3) returning id`,
    [slug, hashAccessCode(rawCode), campaign ?? null]
  );
  return res.rows[0].id;
}

async function claim(db, slug, rawCode) {
  const codeHash = rawCode == null ? null : hashAccessCode(rawCode);
  const res = await db.query(
    "select * from public.claim_partner_screening_session($1, $2, $3, $4)",
    [slug, "GA", codeHash, "2026-07-09T00:00:00.000Z"]
  );
  return res.rows[0];
}

async function completeAnalytics(db, sessionId) {
  const res = await db.query(
    "select public.record_rcap_screening_analytics_event($1, 'screening_completed', null, null, $2) as ok",
    [sessionId, "2026-07-09T00:00:00.000Z"]
  );
  return res.rows[0].ok;
}

async function eligibilityAnalytics(db, sessionId, resultCode) {
  const category = outcomeCategoryForResultCode(resultCode);
  const packetRoute = packetRouteAvailableForResultCode(resultCode);
  const res = await db.query(
    "select public.record_rcap_screening_analytics_event($1, 'eligibility_result_recorded', $2, $3, $4) as ok",
    [sessionId, category, packetRoute, "2026-07-09T00:00:00.000Z"]
  );
  return res.rows[0].ok;
}

async function recordPacket(db, sessionId) {
  const res = await db.query("select * from public.record_partner_packet_generation($1, $2)", [sessionId, "2026-07-09T00:00:00.000Z"]);
  return res.rows[0];
}

async function eventsFor(db, sessionId) {
  const res = await db.query(
    "select event_type, outcome_category, partner_access_code_id, packet_route_available from public.rcap_screening_analytics_events where session_id = $1 order by occurred_at, event_type",
    [sessionId]
  );
  return res.rows;
}

async function codeAnalytics(db, slug) {
  const res = await db.query("select * from public.get_partner_code_analytics($1)", [slug]);
  const byCode = {};
  let direct = null;
  for (const row of res.rows) {
    if (row.partner_access_code_id) byCode[row.partner_access_code_id] = row;
    else direct = row;
  }
  return { byCode, direct };
}

async function entitlementUsed(db, slug) {
  const res = await db.query("select screenings_used from public.partner_entitlement where partner_slug = $1", [slug]);
  return Number(res.rows[0].screenings_used);
}

try {
  verifySourceWiring();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec("create schema if not exists auth;");
  await db.exec("create table if not exists auth.users (id uuid primary key);");
  await db.exec("create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;");
  await db.exec("create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;");
  await db.exec(read("supabase/phase-26-consumer-briefcase-items.sql"));
  await db.exec(read("supabase/phase-38-expungement-pending-screening-results.sql"));
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-28-rcap-record-audit-trail.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  await db.exec(read("supabase/phase-41-rcap-partner-access-codes.sql"));
  await db.exec(read("supabase/phase-41b-rcap-screening-analytics.sql"));

  await verifyStartedEmittedByTrigger(db);
  await verifyCompletionRecordedByCode(db);
  await verifyEligibilityRecordedByCode(db);
  await verifyGuidanceRecordedByCode(db);
  await verifyIneligibleDoesNotConsumeCredits(db);
  await verifyCompletionDoesNotConsumeCredits(db);
  await verifyCreditConsumedOnlyOnPacket(db);
  await verifyConversionMetricsAccurate(db);
  await verifyClaimBoundaryAnalytics(db);
  await verifyDtcExcluded(db);
  await verifyRequiredCodeRejectionExcluded(db);
  await verifyAppendOnly(db);
  await verifyRlsPolicies(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP screening analytics verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP screening analytics verification passed.");
console.log("1. screening_started is emitted automatically for partner-benefit sessions.");
console.log("2. Screening completion is recorded by partner code.");
console.log("3. Eligibility/packet-ready result is recorded by partner code.");
console.log("4. Guidance-only result is recorded by partner code.");
console.log("5. Ineligible and completed events do not consume packet credits.");
console.log("6. Packet credit is consumed (and packet_generated emitted) only after successful packet generation.");
console.log("7. Code-level conversion metrics are accurate.");
console.log("8. DTC consumer sessions never appear in partner analytics.");
console.log("9. Required-code rejections create no session and no analytics.");
console.log("10. Analytics events are append-only; updates/deletes are blocked.");
console.log("11. RLS is partner-scoped with an internal-admin policy.");
console.log("12. Authenticated pending claims emit one server-derived result event only after exact-case persistence; retries, failures, invalid partners, and DTC do not emit.");
console.log("13. Source mutations detect a missing call, pre-persistence emission, missing partner guard, and missing claim idempotency.");

async function verifyStartedEmittedByTrigger(db) {
  await seedPartner(db, "an-open", "open");
  const code = await insertCode(db, "an-open", "FRESHSTART", "Spring");
  const c = await claim(db, "an-open", "freshstart");
  const rows = await eventsFor(db, c.session_id);
  const started = rows.filter((r) => r.event_type === "screening_started");
  assert(started.length === 1, "Claiming a partner session must emit exactly one screening_started event.");
  assert(started[0].partner_access_code_id === code, "screening_started must carry the code attribution.");
}

async function verifyCompletionRecordedByCode(db) {
  await seedPartner(db, "an-complete", "required_code");
  const code = await insertCode(db, "an-complete", "STAFF", "Staff");
  const c = await claim(db, "an-complete", "staff");
  const ok = await completeAnalytics(db, c.session_id);
  assert(ok === true, "screening_completed must be recorded for a partner session.");
  const rows = await eventsFor(db, c.session_id);
  const completed = rows.filter((r) => r.event_type === "screening_completed");
  assert(completed.length === 1 && completed[0].partner_access_code_id === code, "Completion must be attributed to the code.");
}

async function verifyEligibilityRecordedByCode(db) {
  await seedPartner(db, "an-elig", "required_code");
  const code = await insertCode(db, "an-elig", "ELIG", "Eligible");
  const c = await claim(db, "an-elig", "elig");
  await eligibilityAnalytics(db, c.session_id, "packet_ready");
  const rows = await eventsFor(db, c.session_id);
  const result = rows.find((r) => r.event_type === "eligibility_result_recorded");
  assert(result, "Eligibility result must be recorded.");
  assert(result.outcome_category === "eligible_packet", "packet_ready must map to eligible_packet.");
  assert(result.packet_route_available === true, "packet_ready must mark packet_route_available true.");
  assert(result.partner_access_code_id === code, "Eligibility result must be attributed to the code.");
}

async function verifyGuidanceRecordedByCode(db) {
  await seedPartner(db, "an-guide", "required_code");
  await insertCode(db, "an-guide", "GUIDE", "Guide");
  const c = await claim(db, "an-guide", "guide");
  await eligibilityAnalytics(db, c.session_id, "guidance_only");
  const rows = await eventsFor(db, c.session_id);
  const result = rows.find((r) => r.event_type === "eligibility_result_recorded");
  assert(result.outcome_category === "guidance_only", "guidance_only must map to guidance_only category.");
  assert(result.packet_route_available === false, "guidance_only must mark packet_route_available false.");
}

async function verifyIneligibleDoesNotConsumeCredits(db) {
  await seedPartner(db, "an-inelig", "required_code", { allowed: 5, used: 0 });
  await insertCode(db, "an-inelig", "NOPE", "Inelig");
  const c = await claim(db, "an-inelig", "nope");
  const before = await entitlementUsed(db, "an-inelig");
  await eligibilityAnalytics(db, c.session_id, "likely_not_eligible");
  const after = await entitlementUsed(db, "an-inelig");
  assert(before === 0 && after === 0, "Recording an ineligible result must not consume any packet credit.");
}

async function verifyCompletionDoesNotConsumeCredits(db) {
  await seedPartner(db, "an-compnc", "open", { allowed: 5, used: 0 });
  const c = await claim(db, "an-compnc", null);
  await completeAnalytics(db, c.session_id);
  assert((await entitlementUsed(db, "an-compnc")) === 0, "Completing a screening must not consume a packet credit.");
}

async function verifyCreditConsumedOnlyOnPacket(db) {
  await seedPartner(db, "an-credit", "open", { allowed: 5, used: 0 });
  const c = await claim(db, "an-credit", null);
  await completeAnalytics(db, c.session_id);
  await eligibilityAnalytics(db, c.session_id, "packet_ready");
  assert((await entitlementUsed(db, "an-credit")) === 0, "No credit consumed before packet generation.");

  const rec = await recordPacket(db, c.session_id);
  assert(rec.recorded === true && rec.counted_as === "included", "Packet generation must consume one included credit.");
  assert((await entitlementUsed(db, "an-credit")) === 1, "Credit consumed exactly on packet generation.");

  const rows = await eventsFor(db, c.session_id);
  assert(rows.filter((r) => r.event_type === "packet_generated").length === 1, "packet_generated must be emitted once.");

  // Retry must not double-emit or double-count.
  await recordPacket(db, c.session_id);
  const rows2 = await eventsFor(db, c.session_id);
  assert(rows2.filter((r) => r.event_type === "packet_generated").length === 1, "Retry must not emit a second packet_generated.");
  assert((await entitlementUsed(db, "an-credit")) === 1, "Retry must not double-count credits.");
}

async function verifyConversionMetricsAccurate(db) {
  await seedPartner(db, "an-conv", "required_code", { allowed: 10, used: 0 });
  const code = await insertCode(db, "an-conv", "CONV", "Conv");

  // Three participants: one packet-ready + generated, one guidance, one ineligible.
  const a = await claim(db, "an-conv", "conv");
  await completeAnalytics(db, a.session_id);
  await eligibilityAnalytics(db, a.session_id, "packet_ready");
  await recordPacket(db, a.session_id);

  const b = await claim(db, "an-conv", "conv");
  await completeAnalytics(db, b.session_id);
  await eligibilityAnalytics(db, b.session_id, "guidance_only");

  const c = await claim(db, "an-conv", "conv");
  await completeAnalytics(db, c.session_id);
  await eligibilityAnalytics(db, c.session_id, "likely_not_eligible");

  const { byCode } = await codeAnalytics(db, "an-conv");
  const row = byCode[code];
  assert(Number(row.screenings_started) === 3, "Started count must be 3.");
  assert(Number(row.screenings_completed) === 3, "Completed count must be 3.");
  assert(Number(row.eligible_packet) === 1, "Eligible-packet count must be 1.");
  assert(Number(row.guidance_only) === 1, "Guidance-only count must be 1.");
  assert(Number(row.ineligible) === 1, "Ineligible count must be 1.");
  assert(Number(row.packets_generated) === 1, "Packets-generated count must be 1.");
  // Conversion from completed screening to generated packet = 1/3.
  const conversion = Number(row.packets_generated) / Number(row.screenings_completed);
  assert(Math.abs(conversion - 1 / 3) < 1e-9, "Conversion metric must be packets/ completed = 1/3.");
}

async function verifyClaimBoundaryAnalytics(db) {
  const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await db.query(
    "insert into auth.users (id) values ($1), ($2) on conflict (id) do nothing",
    [userA, userB]
  );

  await seedPartner(db, "claim-alpha", "open", { allowed: 20, used: 0 });
  await seedPartner(db, "claim-beta", "open", { allowed: 20, used: 0 });

  const packetSession = await claim(db, "claim-alpha", null);
  const packetPending = "10000000-0000-4000-8000-000000000001";
  const packetCase = "20000000-0000-4000-8000-000000000001";
  // The stored coarse field is deliberately wrong. The simulated claim, like
  // the runtime route, must use only the server-authoritative re-evaluation.
  await insertPendingResult(db, {
    pendingId: packetPending,
    product: "rcap_partner",
    sourceSessionId: packetSession.session_id,
    storedResultCode: "likely_not_eligible"
  });

  const failedPersistence = await simulateAuthoritativeClaim(db, {
    pendingId: packetPending,
    userId: userA,
    caseId: packetCase,
    authoritativeResultCode: "packet_ready",
    persistCase: false
  });
  assert(failedPersistence === "persistence_failed", "A claim that fails before exact-case persistence must fail before analytics.");
  assert((await eligibilityEventsFor(db, packetSession.session_id)).length === 0, "Failed persistence must emit no eligibility event.");

  const packetFirst = await simulateAuthoritativeClaim(db, {
    pendingId: packetPending,
    userId: userA,
    caseId: packetCase,
    authoritativeResultCode: "packet_ready"
  });
  assert(packetFirst === "recorded", "The first persisted partner claim must record analytics.");
  const persistedPacket = await db.query(
    "select id, result_code, source_session_id from public.consumer_briefcase_items where id = $1 and user_id = $2",
    [packetCase, userA]
  );
  assert(persistedPacket.rows.length === 1, "Eligibility analytics may emit only after the exact Briefcase case exists.");
  assert(persistedPacket.rows[0].result_code === "packet_ready", "The persisted case must carry the server-derived result posture.");
  const packetEvents = await eligibilityEventsFor(db, packetSession.session_id);
  assert(packetEvents.length === 1, "Packet-capable claim must emit exactly one eligibility event.");
  assert(packetEvents[0].outcome_category === "eligible_packet" && packetEvents[0].packet_route_available === true, "Packet-capable claim must retain eligible_packet classification.");
  assert(packetEvents[0].partner_slug === "claim-alpha", "Packet-capable claim must use the partner attributed by the server session.");

  const packetReplay = await simulateAuthoritativeClaim(db, {
    pendingId: packetPending,
    userId: userA,
    caseId: packetCase,
    authoritativeResultCode: "packet_ready"
  });
  assert(packetReplay === "replayed", "A repeated pending claim must be recognized as a replay.");
  assert((await eligibilityEventsFor(db, packetSession.session_id)).length === 1, "Replaying or refreshing the same claim must not emit a duplicate event.");

  const guidanceSession = await claim(db, "claim-beta", null);
  const guidancePending = "10000000-0000-4000-8000-000000000002";
  await insertPendingResult(db, {
    pendingId: guidancePending,
    product: "rcap_partner",
    sourceSessionId: guidanceSession.session_id,
    storedResultCode: "packet_ready"
  });
  await simulateAuthoritativeClaim(db, {
    pendingId: guidancePending,
    userId: userA,
    caseId: "20000000-0000-4000-8000-000000000002",
    authoritativeResultCode: "guidance_only"
  });
  const guidanceEvents = await eligibilityEventsFor(db, guidanceSession.session_id);
  assert(guidanceEvents.length === 1 && guidanceEvents[0].outcome_category === "guidance_only" && guidanceEvents[0].packet_route_available === false, "Guidance-only claim must emit one guidance_only event.");
  assert(guidanceEvents[0].partner_slug === "claim-beta", "A second partner's result must remain separately attributable.");

  const ineligibleSession = await claim(db, "claim-alpha", null);
  const ineligiblePending = "10000000-0000-4000-8000-000000000003";
  await insertPendingResult(db, {
    pendingId: ineligiblePending,
    product: "rcap_partner",
    sourceSessionId: ineligibleSession.session_id,
    storedResultCode: "packet_ready"
  });
  await simulateAuthoritativeClaim(db, {
    pendingId: ineligiblePending,
    userId: userA,
    caseId: "20000000-0000-4000-8000-000000000003",
    authoritativeResultCode: "likely_not_eligible"
  });
  const ineligibleEvents = await eligibilityEventsFor(db, ineligibleSession.session_id);
  assert(ineligibleEvents.length === 1 && ineligibleEvents[0].outcome_category === "ineligible" && ineligibleEvents[0].packet_route_available === false, "Ineligible claim must emit one ineligible event.");

  const unauthorizedSession = await claim(db, "claim-alpha", null);
  const unauthorizedPending = "10000000-0000-4000-8000-000000000004";
  await insertPendingResult(db, {
    pendingId: unauthorizedPending,
    product: "rcap_partner",
    sourceSessionId: unauthorizedSession.session_id,
    storedResultCode: "packet_ready"
  });
  const unauthorized = await simulateAuthoritativeClaim(db, {
    pendingId: unauthorizedPending,
    userId: userA,
    caseId: "20000000-0000-4000-8000-000000000004",
    authoritativeResultCode: "packet_ready",
    authenticated: false
  });
  assert(unauthorized === "unauthorized" && (await eligibilityEventsFor(db, unauthorizedSession.session_id)).length === 0, "Unauthorized claims must emit no event.");

  const invalidPending = "10000000-0000-4000-8000-000000000005";
  const invalidSession = "30000000-0000-4000-8000-000000000005";
  await insertPendingResult(db, {
    pendingId: invalidPending,
    product: "rcap_partner",
    sourceSessionId: invalidSession,
    storedResultCode: "packet_ready"
  });
  const invalidPartner = await simulateAuthoritativeClaim(db, {
    pendingId: invalidPending,
    userId: userA,
    caseId: "20000000-0000-4000-8000-000000000005",
    authoritativeResultCode: "packet_ready"
  });
  assert(invalidPartner === "non_partner" && (await eligibilityEventsFor(db, invalidSession)).length === 0, "Invalid partner sessions must emit no event.");

  const dtcSession = "30000000-0000-4000-8000-000000000006";
  await db.query(
    "insert into public.screening_sessions (session_id, jurisdiction, flow_mode, partner_benefit_active) values ($1, 'GA', 'dtc', false)",
    [dtcSession]
  );
  const dtcPending = "10000000-0000-4000-8000-000000000006";
  await insertPendingResult(db, {
    pendingId: dtcPending,
    product: "expungement_ai_dtc",
    sourceSessionId: dtcSession,
    storedResultCode: "packet_ready"
  });
  const dtc = await simulateAuthoritativeClaim(db, {
    pendingId: dtcPending,
    userId: userB,
    caseId: "20000000-0000-4000-8000-000000000006",
    authoritativeResultCode: "packet_ready"
  });
  assert(dtc === "non_partner" && (await eligibilityEventsFor(db, dtcSession)).length === 0, "DTC claims must not emit or misclassify an RCAP event.");

  assert((await entitlementUsed(db, "claim-alpha")) === 0 && (await entitlementUsed(db, "claim-beta")) === 0, "Result analytics must not consume packet credits or alter partner entitlement.");
  const generated = await db.query(
    "select count(*)::int as n from public.rcap_screening_analytics_events where partner_slug in ('claim-alpha', 'claim-beta') and event_type in ('packet_generated', 'packet_overage_recorded')"
  );
  assert(Number(generated.rows[0].n) === 0, "Result analytics must not emit packet-generation or payment events.");
}

async function insertPendingResult(db, input) {
  await db.query(
    `insert into public.consumer_pending_screening_results
       (pending_id, product, jurisdiction, result_code, summary, source_session_id, profile_version, matter_id)
     values ($1, $2, 'GA', $3, 'server pending result', $4, 'test-profile-v1', $5)`,
    [input.pendingId, input.product, input.storedResultCode, input.sourceSessionId, `matter-${input.pendingId}`]
  );
}

async function simulateAuthoritativeClaim(db, input) {
  if (input.authenticated === false) return "unauthorized";

  const pending = await db.query(
    "select pending_id, claimed_user_id, product, source_session_id from public.consumer_pending_screening_results where pending_id = $1",
    [input.pendingId]
  );
  if (pending.rows.length !== 1) return "not_found";
  if (pending.rows[0].claimed_user_id && pending.rows[0].claimed_user_id !== input.userId) return "forbidden";
  if (input.persistCase === false) return "persistence_failed";

  const status = input.authoritativeResultCode === "packet_ready"
    ? "packet_ready"
    : input.authoritativeResultCode === "guidance_only"
      ? "guidance_saved"
      : "not_eligible";
  await db.query(
    `insert into public.consumer_briefcase_items
       (id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
        payment_allowed, status, summary_json, next_steps_json, artifact_refs_json,
        payment_status, packet_status, source_session_id)
     values ($1, $2, 'result', 'GA', 'server pathway', $3, $4, false, $5,
             '{"text":"saved"}'::jsonb, '[]'::jsonb, '{}'::jsonb,
             'not_applicable', 'not_started', $6)
     on conflict (id) do nothing`,
    [
      input.caseId,
      input.userId,
      input.authoritativeResultCode,
      input.authoritativeResultCode === "packet_ready" ? "custom_pleading" : "guidance_packet",
      status,
      pending.rows[0].source_session_id ?? input.pendingId
    ]
  );

  const exactCase = await db.query(
    "select id from public.consumer_briefcase_items where id = $1 and user_id = $2 and result_code = $3",
    [input.caseId, input.userId, input.authoritativeResultCode]
  );
  if (exactCase.rows.length !== 1) return "persistence_failed";

  const partner = pending.rows[0].product === "rcap_partner"
    ? await db.query(
      "select session_id from public.screening_sessions where session_id = $1 and flow_mode = 'rcap' and partner_benefit_active is true and partner_slug is not null",
      [pending.rows[0].source_session_id]
    )
    : { rows: [] };

  const claimed = await db.query(
    `update public.consumer_pending_screening_results
        set claimed_at = now(), claimed_user_id = $2
      where pending_id = $1 and claimed_user_id is null
      returning pending_id`,
    [input.pendingId, input.userId]
  );
  if (claimed.rows.length === 0) return "replayed";
  if (partner.rows.length === 0) return "non_partner";

  await eligibilityAnalytics(db, pending.rows[0].source_session_id, input.authoritativeResultCode);
  return "recorded";
}

async function eligibilityEventsFor(db, sessionId) {
  const result = await db.query(
    `select session_id, partner_slug, event_type, outcome_category, packet_route_available
       from public.rcap_screening_analytics_events
      where session_id = $1 and event_type = 'eligibility_result_recorded'
      order by occurred_at, id`,
    [sessionId]
  );
  return result.rows;
}

async function verifyDtcExcluded(db) {
  await db.query(
    `insert into public.screening_sessions (session_id, jurisdiction, flow_mode, partner_benefit_active)
     values ('33333333-3333-3333-3333-333333333333', 'GA', 'dtc', false)`
  );
  const ok = await completeAnalytics(db, "33333333-3333-3333-3333-333333333333");
  assert(ok === false, "DTC completion must be a no-op in partner analytics.");
  const rows = await eventsFor(db, "33333333-3333-3333-3333-333333333333");
  assert(rows.length === 0, "DTC sessions must produce no analytics events (trigger must not fire either).");
}

async function verifyRequiredCodeRejectionExcluded(db) {
  await seedPartner(db, "an-reject", "required_code");
  const before = (await db.query("select count(*)::int as n from public.rcap_screening_analytics_events where partner_slug = 'an-reject'")).rows[0].n;
  const rejected = await claim(db, "an-reject", null); // no code -> no session
  assert(rejected.ok === false && rejected.session_id === null, "Required-code rejection must not create a session.");
  const after = (await db.query("select count(*)::int as n from public.rcap_screening_analytics_events where partner_slug = 'an-reject'")).rows[0].n;
  assert(before === after, "A required-code rejection must produce no analytics events.");
}

async function verifyAppendOnly(db) {
  const row = (await db.query("select id from public.rcap_screening_analytics_events limit 1")).rows[0];
  let blockedUpdate = false;
  let blockedDelete = false;
  try {
    await db.query("update public.rcap_screening_analytics_events set event_type = 'screening_started' where id = $1", [row.id]);
  } catch {
    blockedUpdate = true;
  }
  try {
    await db.query("delete from public.rcap_screening_analytics_events where id = $1", [row.id]);
  } catch {
    blockedDelete = true;
  }
  assert(blockedUpdate, "Analytics events must block UPDATE (append-only).");
  assert(blockedDelete, "Analytics events must block DELETE (append-only).");
}

async function verifyRlsPolicies(db) {
  const policies = (await db.query(
    "select policyname from pg_policies where tablename = 'rcap_screening_analytics_events'"
  )).rows.map((r) => r.policyname);
  assert(policies.includes("rcap_screening_analytics_select_own_partner"), "Missing partner-scoped RLS SELECT policy.");
  assert(policies.includes("rcap_screening_analytics_select_internal_admin"), "Missing internal-admin RLS SELECT policy.");
  const rls = (await db.query("select relrowsecurity from pg_class where relname = 'rcap_screening_analytics_events'")).rows[0];
  assert(rls.relrowsecurity === true, "RLS must be enabled on rcap_screening_analytics_events.");
}

function verifySourceWiring() {
  const sources = {
    migration: read("supabase/phase-41b-rcap-screening-analytics.sql"),
    complete: read("src/app/api/expungement-ai/screening/complete/route.ts"),
    retiredSave: read("src/app/api/expungement-ai/screening/save-result/route.ts"),
    claim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
    lib: read("src/lib/expungement-ai/rcap-screening-analytics.ts")
  };
  const baseline = sourceWiringViolations(sources);
  assert(baseline.length === 0, `Analytics source wiring failed:\n${baseline.join("\n")}`);

  const missingCall = {
    ...sources,
    claim: sources.claim.replace(
      "const analytics = await recordScreeningEligibilityResult(",
      "const analytics = await removedScreeningEligibilityResult("
    )
  };
  assert(
    sourceWiringViolations(missingCall).some((failure) => failure.includes("server-authoritative result event")),
    "Negative control failed: removing the restored runtime call did not turn the verifier red."
  );

  const prePersistenceCall = {
    ...sources,
    claim: sources.claim.replace(
      "item = await saveAuthoritativeScreeningResultToBriefcase({",
      "await recordScreeningEligibilityResult(data.source_session_id ?? \"\", evaluation.resultCode);\n    item = await saveAuthoritativeScreeningResultToBriefcase({"
    )
  };
  assert(
    sourceWiringViolations(prePersistenceCall).some((failure) => failure.includes("only after exact-case persistence")),
    "Negative control failed: moving analytics before persistence did not turn the verifier red."
  );

  const missingPartnerGuard = {
    ...sources,
    claim: sources.claim.replace(
      "if (claim.data && isPartnerSession && data.source_session_id)",
      "if (claim.data && data.source_session_id)"
    )
  };
  assert(
    sourceWiringViolations(missingPartnerGuard).some((failure) => failure.includes("validated partner-session guard")),
    "Negative control failed: removing the partner-session guard did not turn the verifier red."
  );

  const missingIdempotency = {
    ...sources,
    claim: sources.claim.replace('.is("claimed_user_id", null)', '.not("claimed_user_id", "is", null)')
  };
  assert(
    sourceWiringViolations(missingIdempotency).some((failure) => failure.includes("replay-idempotency gate")),
    "Negative control failed: removing claim idempotency did not turn the replay verifier red."
  );
}

function sourceWiringViolations(input) {
  const issues = [];
  const require = (condition, message) => {
    if (!condition) issues.push(message);
  };
  const tableStart = input.migration.indexOf("create table if not exists public.rcap_screening_analytics_events");
  const tableBlock = input.migration.slice(tableStart, input.migration.indexOf(");", tableStart));

  require(input.migration.includes("do not run against production"), "Migration must carry the DB-process safety header.");
  require(input.migration.includes("create table if not exists public.rcap_screening_analytics_events"), "Migration must create the analytics table.");
  require(input.migration.includes("is append-only"), "Analytics table must be append-only.");
  require(input.migration.includes("emit_rcap_screening_started_event"), "screening_started trigger must exist.");
  require(!/answers|charge|offense|conviction|ssn|dob/i.test(tableBlock), "Analytics columns must not store answers or record detail.");

  require(input.complete.includes("recordScreeningCompleted(sessionId)"), "Completion route must record completion analytics.");
  require(!input.retiredSave.includes("recordScreeningEligibilityResult"), "The retired browser-result route must not emit server analytics.");

  const postStart = input.claim.indexOf("export async function POST");
  const postSource = postStart >= 0 ? input.claim.slice(postStart) : input.claim;
  const persistenceIndex = postSource.indexOf("item = await saveAuthoritativeScreeningResultToBriefcase");
  const clinicFollowUpIndex = postSource.indexOf("await createClinicReviewFollowUpForSavedMatter({");
  const protectedClaimGateIndex = postSource.indexOf("initializeProtectedPacketVerification({");
  const claimGateIndex = postSource.indexOf("const claim = isPacketResult");
  const analyticsIndex = postSource.indexOf("recordScreeningEligibilityResult(");
  const responseIndex = postSource.indexOf("return NextResponse.json({", Math.max(analyticsIndex, 0));

  require(analyticsIndex >= 0, "Authenticated claim must emit the server-authoritative result event.");
  require(
    persistenceIndex >= 0
      && clinicFollowUpIndex > persistenceIndex
      && protectedClaimGateIndex > persistenceIndex
      && protectedClaimGateIndex > clinicFollowUpIndex
      && claimGateIndex > protectedClaimGateIndex
      && analyticsIndex > claimGateIndex,
    "Eligibility analytics must run only after exact-case persistence and the first-claim transition."
  );
  require(responseIndex > analyticsIndex, "The successful exact-case response must remain after best-effort analytics.");
  require(
    postSource.includes("if (claim.data && isPartnerSession && data.source_session_id)"),
    "Eligibility analytics must retain the validated partner-session guard."
  );
  require(
    postSource.includes("protectedClaimInitialized = initialized.initialized === true")
      && postSource.includes("? { data: protectedClaimInitialized ? { pending_id: pendingId } : null, error: null }")
      && postSource.includes('.is("claimed_user_id", null)')
      && postSource.includes('.select("pending_id")')
      && postSource.includes("if (claim.data && isPartnerSession"),
    "The atomic protected initializer and the nonpacket null-to-user transition must remain replay-idempotency gates."
  );
  require(
    postSource.includes("data.source_session_id,\n      evaluation.resultCode"),
    "Eligibility analytics must use the validated session and server-derived result code."
  );
  require(
    postSource.includes("if (claim.error)") && postSource.includes("claim_marker_failed"),
    "Claim-marker failure must be logged without failing the persisted participant case."
  );
  require(
    postSource.includes("if (!analytics.ok)") && postSource.includes("analytics.reason"),
    "Analytics storage failure must be sanitized and logged without changing the successful response."
  );
  require(!postSource.includes("createConsumerPacketCheckout") && !postSource.includes("recordPartnerPacketGeneration"), "Result analytics must not alter payment or packet-credit accounting.");

  require(input.lib.includes("never disrupt the screening/result flow"), "Analytics emission must remain best-effort.");
  require(input.lib.includes("record_rcap_screening_analytics_event"), "Analytics module must go through the gated RPC.");
  require(input.lib.includes('data === true') && input.lib.includes('reason: "rpc_failed"'), "Analytics helper must report a sanitized write outcome to the claim route.");
  require(!/\.answers|"answers"|screening_answers/.test(input.lib), "Analytics module must not read screening answers.");

  return issues;
}
