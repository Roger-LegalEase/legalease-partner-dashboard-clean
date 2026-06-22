import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const forbiddenReturnKeys = [
  "answers",
  "email",
  "resume_token",
  "resume_token_hash",
  "resultcode",
  "result_code",
  "paymentallowed",
  "payment_allowed",
  "packetplan",
  "packet_plan",
  "briefcase",
  "payment",
  "packet"
];
const forbiddenEntitlementColumns = [
  "email",
  "resume_token",
  "resume_token_hash",
  "result_code",
  "payment_allowed",
  "packet_plan",
  "briefcase_state",
  "answers"
];

try {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  await db.exec(read("supabase/phase-35c-rcap-claim-screening-session.sql"));

  await verifyEntitlementSchema(db);
  await verifySessionPartnerModeColumns(db);
  await verifySuccessfulClaim(db);
  await verifyCapacityFull(db);
  await verifyInactiveAndUnknownPartners(db);
  await verifyInsertFailureRollsBackSlot(db);
  await verifyConcurrentOneSlotClaim(db);
  await verifyNoForbiddenReturnFields(db);
  await verifyNoPiiEntitlementPath(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP partner entitlement verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner entitlement verification passed.");
console.log("Real storage: phase 32 + phase 35 migrations executed in isolated PGlite PostgreSQL.");
console.log("Atomic RPC: active partner success, capacity-full, inactive/unknown fail-closed, rollback, and one-slot concurrent claim verified.");
console.log("Privacy: entitlement/RPC path returns no answers, email, resume token, result, payment, packet, or Briefcase fields.");

async function verifyEntitlementSchema(db) {
  const columns = await db.query(
    `select column_name, is_nullable, column_default
     from information_schema.columns
     where table_schema = 'public' and table_name = 'partner_entitlement'
     order by ordinal_position`
  );
  const byName = Object.fromEntries(columns.rows.map((row) => [row.column_name, row]));
  for (const column of [
    "partner_slug",
    "screenings_allowed",
    "screenings_used",
    "contract_note",
    "period_label",
    "created_at",
    "updated_at"
  ]) {
    assert(byName[column], `partner_entitlement missing column ${column}.`);
  }
  assert(byName.partner_slug.is_nullable === "NO", "partner_slug must be NOT NULL.");
  assert(byName.screenings_allowed.column_default?.includes("0"), "screenings_allowed must default to 0.");
  assert(byName.screenings_used.column_default?.includes("0"), "screenings_used must default to 0.");

  const constraints = await db.query(
    `select conname, pg_get_constraintdef(c.oid) as definition
     from pg_constraint c
     where c.conrelid = 'public.partner_entitlement'::regclass`
  );
  const definitions = constraints.rows.map((row) => `${row.conname}: ${row.definition}`);
  assert(definitions.some((definition) => definition.includes("screenings_allowed") && definition.includes(">= 0")), "Missing screenings_allowed non-negative check.");
  assert(definitions.some((definition) => definition.includes("screenings_used") && definition.includes(">= 0")), "Missing screenings_used non-negative check.");
  assert(!definitions.some((definition) => /screenings_used.*<=.*screenings_allowed|screenings_allowed.*>=.*screenings_used/s.test(definition)), "partner_entitlement must not enforce screenings_used <= screenings_allowed.");

  await db.query(
    "insert into public.partner_records (partner_id, partner_slug, partner_name, program_tier) values ($1, $2, $3, $4)",
    ["ops-lower", "ops-lower", "Ops Lower", "implementation"]
  );
  await db.query(
    "insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used) values ($1, $2, $3)",
    ["ops-lower", 1, 5]
  );
}

async function verifySessionPartnerModeColumns(db) {
  const columns = await db.query(
    `select column_name, is_nullable, column_default
     from information_schema.columns
     where table_schema = 'public' and table_name = 'screening_sessions'`
  );
  const byName = Object.fromEntries(columns.rows.map((row) => [row.column_name, row]));
  assert(byName.partner_slug?.is_nullable === "YES", "screening_sessions.partner_slug must be nullable.");
  assert(byName.flow_mode?.is_nullable === "NO", "screening_sessions.flow_mode must be NOT NULL.");
  assert(byName.flow_mode?.column_default?.includes("'dtc'"), "screening_sessions.flow_mode must default to dtc.");
  assert(byName.claimed_slot_state?.is_nullable === "YES", "screening_sessions.claimed_slot_state must be nullable.");

  await db.query(
    "insert into public.screening_sessions (session_id, jurisdiction) values ($1, $2)",
    ["00000000-0000-4000-8000-000000000001", "MS"]
  );
  const row = await one(db, "select partner_slug, flow_mode, claimed_slot_state from public.screening_sessions where session_id = $1", [
    "00000000-0000-4000-8000-000000000001"
  ]);
  assert(row.partner_slug === null, "DTC default partner_slug must be null.");
  assert(row.flow_mode === "dtc", "DTC default flow_mode must be dtc.");
  assert(row.claimed_slot_state === null, "DTC default claimed_slot_state must be null.");
}

async function verifySuccessfulClaim(db) {
  await seedPartner(db, "active-success", { allowed: 2, used: 0 });
  const claim = await claimSession(db, "active-success", "ms");
  assert(claim.ok === true, "Active partner with capacity should claim successfully.");
  assert(claim.session_id, "Successful claim must return a session_id.");
  assert(claim.screenings_used === 1, "Successful claim must increment screenings_used.");
  assert(claim.screenings_allowed === 2, "Successful claim must return screenings_allowed.");
  assert(Object.keys(claim).sort().join(",") === "ok,reason,screenings_allowed,screenings_used,session_id", "RPC returned an unexpected shape.");

  const session = await one(db, "select * from public.screening_sessions where session_id = $1", [claim.session_id]);
  assert(session.partner_slug === "active-success", "Partner session must stamp partner_slug.");
  assert(session.flow_mode === "rcap", "Partner session must stamp flow_mode rcap.");
  assert(session.claimed_slot_state === "claimed", "Partner session must stamp claimed_slot_state claimed.");
  assert(session.jurisdiction === "MS", "Partner session must normalize jurisdiction.");
  assert(session.status === "in_progress", "Partner session must start in_progress.");
  assert(jsonEqual(session.answers, {}), "Partner session must start with empty answers.");
  assert(session.current_question_id === null && session.furthest_stage === null && session.last_drop_question === null, "Partner session must match initial DTC shape.");
}

async function verifyCapacityFull(db) {
  await seedPartner(db, "full-partner", { allowed: 1, used: 1 });
  const before = await countSessions(db, "full-partner");
  const claim = await claimSession(db, "full-partner", "GA");
  const after = await countSessions(db, "full-partner");
  assert(claim.ok === false && claim.reason === "capacity_full", "Exhausted partner must return capacity_full.");
  assert(claim.session_id === null, "Capacity-full result must not return session_id.");
  assert(claim.screenings_used === 1 && claim.screenings_allowed === 1, "Capacity-full result must return current capacity counts.");
  assert(after === before, "Capacity-full claim must not create a screening session.");
}

async function verifyInactiveAndUnknownPartners(db) {
  await seedPartner(db, "inactive-partner", {
    allowed: 10,
    used: 0,
    paymentStatus: "paid",
    qualificationStatus: "qualified",
    provisioningStatus: "paused"
  });

  for (const slug of ["inactive-partner", "missing-partner"]) {
    const before = await totalSessions(db);
    const claim = await claimSession(db, slug, "IL");
    const after = await totalSessions(db);
    assert(claim.ok === false && claim.reason === "partner_inactive", `${slug} must fail closed as partner_inactive.`);
    assert(claim.session_id === null, `${slug} must not return session_id.`);
    assert(after === before, `${slug} must not create a screening session.`);
  }

  const entitlement = await one(db, "select screenings_used from public.partner_entitlement where partner_slug = $1", ["inactive-partner"]);
  assert(entitlement.screenings_used === 0, "Inactive partner must not consume capacity.");
}

async function verifyInsertFailureRollsBackSlot(db) {
  await seedPartner(db, "rollback-partner", { allowed: 1, used: 0 });
  await rejects(
    () => claimSession(db, "rollback-partner", "TOOLONG"),
    "Invalid jurisdiction should make the function fail."
  );
  const entitlement = await one(db, "select screenings_used from public.partner_entitlement where partner_slug = $1", ["rollback-partner"]);
  assert(entitlement.screenings_used === 0, "Failed claim must roll back the slot increment.");
  assert((await countSessions(db, "rollback-partner")) === 0, "Failed claim must not create a session.");
}

async function verifyConcurrentOneSlotClaim(db) {
  await seedPartner(db, "concurrent-partner", { allowed: 1, used: 0 });
  const claims = await Promise.all([
    claimSession(db, "concurrent-partner", "MS"),
    claimSession(db, "concurrent-partner", "MS")
  ]);
  const successes = claims.filter((claim) => claim.ok);
  const full = claims.filter((claim) => claim.reason === "capacity_full");
  assert(successes.length === 1, `Expected exactly one concurrent success, got ${successes.length}.`);
  assert(full.length === 1, `Expected exactly one concurrent capacity_full result, got ${full.length}.`);
  assert((await countSessions(db, "concurrent-partner")) === 1, "Concurrent one-slot claim must create exactly one session.");
  const entitlement = await one(db, "select screenings_used, screenings_allowed from public.partner_entitlement where partner_slug = $1", ["concurrent-partner"]);
  assert(entitlement.screenings_used === 1 && entitlement.screenings_allowed === 1, "Concurrent claim must not over-increment capacity.");
}

async function verifyNoForbiddenReturnFields(db) {
  const result = await db.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'claim_rcap_screening_session'`
  );
  const returnedColumns = result.rows.map((row) => row.column_name.toLowerCase());
  for (const forbidden of forbiddenReturnKeys) {
    assert(!returnedColumns.includes(forbidden), `RPC return shape must not include ${forbidden}.`);
  }
}

async function verifyNoPiiEntitlementPath(db) {
  const entitlementColumns = await db.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = 'partner_entitlement'`
  );
  const entitlementNames = entitlementColumns.rows.map((row) => row.column_name.toLowerCase());
  for (const forbidden of forbiddenEntitlementColumns) {
    assert(!entitlementNames.includes(forbidden), `partner_entitlement must not include ${forbidden}.`);
  }

  const claim = await claimSession(db, "active-success", "MS");
  assert(claim.ok === true, "Second active-success claim should use remaining capacity.");
  for (const [key, value] of Object.entries(claim)) {
    const lowerKey = key.toLowerCase();
    for (const forbidden of forbiddenReturnKeys) {
      assert(!lowerKey.includes(forbidden), `RPC returned forbidden key ${key}.`);
    }
    assert(typeof value !== "string" || !value.includes("@"), `RPC returned possible email/PII value in ${key}.`);
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
      payment_status,
      qualification_status,
      provisioning_status
    ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [slug, slug, `Partner ${slug}`, "implementation", paymentStatus, qualificationStatus, provisioningStatus]
  );
  await db.query(
    "insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used) values ($1, $2, $3)",
    [slug, allowed, used]
  );
}

async function claimSession(db, partnerSlug, jurisdiction) {
  const result = await db.query(
    "select * from public.claim_rcap_screening_session($1, $2)",
    [partnerSlug, jurisdiction]
  );
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

async function rejects(fn, message) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(message);
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
