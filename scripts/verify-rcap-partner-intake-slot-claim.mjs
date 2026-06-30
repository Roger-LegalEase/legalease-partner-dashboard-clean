import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

try {
  verifySourceWiring();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  await db.exec(read("supabase/phase-35c-rcap-claim-screening-session.sql"));

  await verifyActivePartnerStartsExactlyOneSession(db);
  await verifyUnknownAndInactiveFailClosed(db);
  await verifyCapacityFullNoFallback(db);
  await verifyHardCap(db);
  await verifyConcurrentOneSlotStart(db);
  await verifyDtcDefaults(db);
  await verifyNoResultPaymentPacketBriefcasePath(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP partner intake slot-claim verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner intake slot-claim verification passed.");
console.log("Page-load behavior: source verified to resolve context without calling the claim RPC.");
console.log("Persistence: active, unknown, inactive, capacity-full, hard-cap, rollback/no-stranded-slot, and one-slot concurrency verified in PGlite.");
console.log("DTC defaults remain dtc/null/null, and ScreeningFlow source has no partner branding branch.");

function verifySourceWiring() {
  const page = read("src/app/intake/[partnerSlug]/page.tsx");
  const intakeLib = read("src/lib/expungement-ai/rcap-partner-intake.ts");
  const statePage = read("src/app/expungement-ai/screening/[state]/page.tsx");
  const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
  const allowlist = read("scripts/rcap-scope-allowlist.mjs");

  assert(page.includes("resolveRcapPartnerIntakeContext(partnerSlug)"), "Partner intake page must resolve partner context on load.");
  assert(page.includes("form action={startRcapPartnerScreening}"), "Partner intake start must require an explicit form action.");
  assert(page.includes("claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction })"), "Start action must call the RPC wrapper.");
  assert(page.includes("This link is not active right now"), "Inactive-link copy is missing.");
  assert(page.includes("This program is currently full"), "Program-full headline copy is missing.");
  assert(page.includes("Please check back later or contact the organization that shared this link."), "Program-full body copy is missing.");
  assert(!page.includes("RcapWilmaIntakeChat"), "Partner intake must not use the old Wilma intake chat path.");
  assert(!page.includes("/expungement-ai/start"), "Partner intake must not fall back to DTC start.");

  const claimCallIndex = page.indexOf("claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction })");
  const actionIndex = page.indexOf("async function startRcapPartnerScreening");
  assert(actionIndex >= 0 && claimCallIndex > actionIndex, "Claim RPC must only be called inside the explicit start action.");

  assert(intakeLib.includes('.rpc("claim_rcap_screening_session"'), "Partner intake helper must call claim_rcap_screening_session RPC.");
  for (const forbidden of [
    '.from("partner_entitlement")',
    ".from('partner_entitlement')",
    '.from("screening_sessions").insert',
    ".from('screening_sessions').insert",
    '.from("screening_sessions").upsert',
    ".from('screening_sessions').upsert",
    "screenings_used + 1"
  ]) {
    assert(!intakeLib.includes(forbidden), `App path must not include app-level claim/insert primitive: ${forbidden}`);
    assert(!page.includes(forbidden), `Page must not include app-level claim/insert primitive: ${forbidden}`);
  }

  assert(statePage.includes("initialSessionId"), "State screening page must accept initial session id from the partner start redirect.");
  assert(screeningFlow.includes("initialSessionId?: string"), "ScreeningFlow must accept an optional initial session id.");
  assert(!screeningFlow.includes("partnerSlug") && !screeningFlow.includes("partnerName") && !screeningFlow.includes("logoUrl"), "ScreeningFlow must not receive or render partner branding.");
  assert(allowlist.includes("RCAP_PARTNER_MODE_FILES"), "Centralized RCAP partner-mode allowlist group missing.");
  assert(allowlist.includes("src/app/intake/[partnerSlug]/page.tsx"), "Partner intake page must be centralized in scope allowlist.");
}

async function verifyActivePartnerStartsExactlyOneSession(db) {
  await seedPartner(db, "active-one", { allowed: 2, used: 0 });
  const before = await countSessions(db, "active-one");
  const claim = await claimSession(db, "active-one", "MS");
  const after = await countSessions(db, "active-one");
  assert(claim.ok === true, "Active partner with capacity must start successfully.");
  assert(after === before + 1, "Active partner start must create exactly one session.");

  const session = await one(db, "select * from public.screening_sessions where session_id = $1", [claim.session_id]);
  assert(session.partner_slug === "active-one", "RCAP session must stamp partner_slug.");
  assert(session.flow_mode === "rcap", "RCAP session must stamp flow_mode rcap.");
  assert(session.claimed_slot_state === "claimed", "RCAP session must stamp claimed slot state.");
  assert(jsonEqual(session.answers, {}), "RCAP session must start with empty answers only.");
}

async function verifyUnknownAndInactiveFailClosed(db) {
  await seedPartner(db, "inactive-one", {
    allowed: 3,
    used: 0,
    paymentStatus: "paid",
    qualificationStatus: "qualified",
    provisioningStatus: "paused"
  });

  for (const slug of ["missing-one", "inactive-one"]) {
    const beforeTotal = await totalSessions(db);
    const beforeUsed = slug === "inactive-one" ? await usedSlots(db, slug) : null;
    const claim = await claimSession(db, slug, "MS");
    assert(claim.ok === false && claim.reason === "partner_inactive", `${slug} must fail closed as inactive.`);
    assert((await totalSessions(db)) === beforeTotal, `${slug} must not create a session.`);
    if (beforeUsed !== null) {
      assert((await usedSlots(db, slug)) === beforeUsed, `${slug} must not consume a slot.`);
    }
  }
}

async function verifyCapacityFullNoFallback(db) {
  await seedPartner(db, "full-one", { allowed: 1, used: 1 });
  const before = await countSessions(db, "full-one");
  const claim = await claimSession(db, "full-one", "MS");
  assert(claim.ok === false && claim.reason === "capacity_full", "Exhausted partner must return capacity_full.");
  assert((await countSessions(db, "full-one")) === before, "Capacity-full start must create no session.");
  assert((await usedSlots(db, "full-one")) === 1, "Capacity-full start must not strand or over-consume a slot.");
}

async function verifyHardCap(db) {
  await seedPartner(db, "hard-cap", { allowed: 3, used: 0 });
  const claims = [];
  for (let index = 0; index < 4; index += 1) {
    claims.push(await claimSession(db, "hard-cap", "MS"));
  }
  assert(claims.filter((claim) => claim.ok).length === 3, "Hard cap N must allow exactly N starts.");
  assert(claims[3].ok === false && claims[3].reason === "capacity_full", "Hard cap N+1 start must fail capacity_full.");
  assert((await countSessions(db, "hard-cap")) === 3, "Hard cap must create exactly N sessions.");
  assert((await usedSlots(db, "hard-cap")) === 3, "Hard cap must consume exactly N slots.");
}

async function verifyConcurrentOneSlotStart(db) {
  await seedPartner(db, "concurrent-start", { allowed: 1, used: 0 });
  const claims = await Promise.all([
    claimSession(db, "concurrent-start", "MS"),
    claimSession(db, "concurrent-start", "MS")
  ]);
  assert(claims.filter((claim) => claim.ok).length === 1, "One remaining slot must allow exactly one concurrent start.");
  assert(claims.filter((claim) => claim.reason === "capacity_full").length === 1, "The losing concurrent start must return capacity_full.");
  assert((await countSessions(db, "concurrent-start")) === 1, "Concurrent starts must create exactly one session.");
  assert((await usedSlots(db, "concurrent-start")) === 1, "Concurrent starts must consume exactly one slot.");
}

async function verifyDtcDefaults(db) {
  await db.query(
    "insert into public.screening_sessions (session_id, jurisdiction) values ($1, $2)",
    ["00000000-0000-4000-8000-00000000d7c0", "MS"]
  );
  const session = await one(db, "select partner_slug, flow_mode, claimed_slot_state from public.screening_sessions where session_id = $1", [
    "00000000-0000-4000-8000-00000000d7c0"
  ]);
  assert(session.partner_slug === null, "DTC session partner_slug must remain null.");
  assert(session.flow_mode === "dtc", "DTC session flow_mode must remain dtc.");
  assert(session.claimed_slot_state === null, "DTC session claimed_slot_state must remain null.");
}

async function verifyNoResultPaymentPacketBriefcasePath(db) {
  await seedPartner(db, "privacy-start", { allowed: 1, used: 0 });
  const claim = await claimSession(db, "privacy-start", "MS");
  const serializedClaim = JSON.stringify(claim).toLowerCase();
  for (const forbidden of ["result", "payment", "packet", "briefcase", "email", "resume", "answer"]) {
    assert(!serializedClaim.includes(forbidden), `Partner start RPC returned forbidden field/value: ${forbidden}`);
  }

  const session = await one(db, "select * from public.screening_sessions where session_id = $1", [claim.session_id]);
  for (const forbidden of ["result_code", "payment_allowed", "packet_plan", "briefcase_state"]) {
    assert(!(forbidden in session), `Partner start created forbidden session field: ${forbidden}`);
  }
}

async function seedPartner(db, slug, options = {}) {
  const {
    allowed,
    used,
    paymentStatus = "paid",
    qualificationStatus = "qualified",
    provisioningStatus = "provisioned"
  } = options;
  await db.query(
    `insert into public.partner_records (
      partner_id,
      partner_slug,
      partner_name,
      program_tier,
      target_state,
      payment_status,
      qualification_status,
      provisioning_status
    ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [slug, slug, `Partner ${slug}`, "implementation", "MS", paymentStatus, qualificationStatus, provisioningStatus]
  );
  await db.query(
    "insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used) values ($1, $2, $3)",
    [slug, allowed, used]
  );
}

async function claimSession(db, partnerSlug, jurisdiction) {
  const result = await db.query("select * from public.claim_rcap_screening_session($1, $2)", [partnerSlug, jurisdiction]);
  return result.rows[0];
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params);
  assert(result.rows.length === 1, `Expected one row for query: ${sql}`);
  return result.rows[0];
}

async function countSessions(db, partnerSlug) {
  const row = await one(db, "select count(*)::integer as count from public.screening_sessions where partner_slug = $1", [partnerSlug]);
  return row.count;
}

async function totalSessions(db) {
  const row = await one(db, "select count(*)::integer as count from public.screening_sessions");
  return row.count;
}

async function usedSlots(db, partnerSlug) {
  const row = await one(db, "select screenings_used from public.partner_entitlement where partner_slug = $1", [partnerSlug]);
  return row.screenings_used;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function jsonEqual(actual, expected) {
  const normalized = typeof actual === "string" ? JSON.parse(actual) : actual;
  return JSON.stringify(normalized) === JSON.stringify(expected);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
