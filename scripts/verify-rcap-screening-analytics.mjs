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
  const migration = read("supabase/phase-41b-rcap-screening-analytics.sql");
  assert(migration.includes("do not run against production"), "Migration must carry the DB-process safety header.");
  assert(migration.includes("create table if not exists public.rcap_screening_analytics_events"), "Migration must create the analytics table.");
  assert(migration.includes("is append-only"), "Analytics table must be append-only.");
  assert(migration.includes("emit_rcap_screening_started_event"), "screening_started trigger must exist.");

  // No full answers or record detail stored: check the table's column definitions.
  const tableStart = migration.indexOf("create table if not exists public.rcap_screening_analytics_events");
  const tableBlock = migration.slice(tableStart, migration.indexOf(");", tableStart));
  assert(!/answers|charge|offense|conviction|ssn|dob/i.test(tableBlock), "Analytics columns must not store answers or record detail.");

  // Best-effort, non-blocking wiring in the existing partner paths only.
  const complete = read("src/app/api/expungement-ai/screening/complete/route.ts");
  assert(complete.includes("recordScreeningCompleted(sessionId)"), "Completion route must record completion analytics.");
  const saveResult = read("src/app/api/expungement-ai/screening/save-result/route.ts");
  assert(saveResult.includes("recordScreeningEligibilityResult(sourceSessionId, body.resultCode)"), "Save-result must record eligibility analytics for partner sessions.");
  assert(saveResult.includes("isPartnerSession && sourceSessionId"), "Eligibility analytics must be gated on partner session.");

  // Analytics module is best-effort and stores only coarse categories.
  const lib = read("src/lib/expungement-ai/rcap-screening-analytics.ts");
  assert(lib.includes("never disrupt the screening/result flow"), "Analytics emission must be best-effort.");
  // Records only a coarse outcome category; it must not read/store raw answers.
  assert(lib.includes("record_rcap_screening_analytics_event"), "Analytics module must go through the gated RPC.");
  assert(!/\.answers|"answers"|screening_answers/.test(lib), "Analytics module must not read screening answers.");
}
