import path from "node:path";
import fs from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

// Deterministic pepper so hashAccessCode matches what we store in the DB.
process.env.PARTNER_ACCESS_CODE_PEPPER = "verify-partner-access-code-pepper";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { hashAccessCode, normalizeAccessCode } = await import("../src/lib/partners/access-code-crypto.ts");
const { PartnerAccessCodeError } = await import("../src/lib/partners/partner-access-codes.ts");
const { accessCodeErrorResponse } = await import(
  "../src/app/api/partners/access-codes/error-response.ts"
);

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function claim(db, slug, jurisdiction, rawCode, now) {
  const codeHash = rawCode == null ? null : hashAccessCode(rawCode);
  const res = await db.query(
    "select * from public.claim_partner_screening_session($1, $2, $3, $4)",
    [slug, jurisdiction, codeHash, now ?? "2026-07-09T00:00:00.000Z"]
  );
  return res.rows[0];
}

async function record(db, sessionId, now) {
  const res = await db.query(
    "select * from public.record_partner_packet_generation($1, $2)",
    [sessionId, now ?? "2026-07-09T00:00:00.000Z"]
  );
  return res.rows[0];
}

async function verifyRouteErrorResponses() {
  const cases = [
    ["unknown_partner", 404],
    ["not_found", 404],
    ["invalid_input", 400],
    ["duplicate_code", 409],
    ["supabase_unconfigured", 503],
    ["read_failed", 500],
    ["write_failed", 500]
  ];

  for (const [code, expectedStatus] of cases) {
    const response = accessCodeErrorResponse(
      new PartnerAccessCodeError(code, `safe ${code} message`),
      "route-helper-verifier",
      "read"
    );
    assert(response.status === expectedStatus, `${code} must map to HTTP ${expectedStatus}`);
    const body = await response.json();
    assert(body.success === false && body.code === code, `${code} response shape changed`);
  }
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

async function insertCode(db, slug, rawCode, opts = {}) {
  const {
    codeType = "shared",
    maxUses = null,
    isActive = true,
    startsAt = null,
    expiresAt = null,
    campaign = null
  } = opts;
  const res = await db.query(
    `insert into public.partner_access_codes
       (partner_slug, code_hash, code_type, max_uses, is_active, starts_at, expires_at, campaign_name)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [slug, hashAccessCode(rawCode), codeType, maxUses, isActive, startsAt, expiresAt, campaign]
  );
  return res.rows[0].id;
}

try {
  verifySourceWiring();
  await verifyRouteErrorResponses();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  // Minimal Supabase auth stubs so phase-21 (FK to auth.users, auth.uid()) applies.
  await db.exec("create schema if not exists auth;");
  await db.exec("create table if not exists auth.users (id uuid primary key);");
  await db.exec("create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-28-rcap-record-audit-trail.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));

  // Seed a legacy partner-mode session BEFORE phase-41 to prove the backfill.
  await db.query(
    `insert into public.partner_records
       (partner_id, partner_slug, partner_name, program_tier, payment_status, qualification_status, provisioning_status)
     values ('pid-legacy', 'legacy-partner', 'Legacy Org', 'standard', 'paid', 'qualified', 'provisioned')`
  );
  await db.query(
    `insert into public.screening_sessions
       (session_id, jurisdiction, partner_slug, flow_mode, claimed_slot_state)
     values ('11111111-1111-1111-1111-111111111111', 'GA', 'legacy-partner', 'rcap', 'claimed')`
  );

  await db.exec(read("supabase/phase-41-rcap-partner-access-codes.sql"));

  await verifyBackfill(db);
  await verifyLegacyClaimBenefitFlag(db);
  await verifyNormalizationHashing();
  await verifyOpenMode(db);
  await verifyRequiredCodeMode(db);
  await verifyOptionalCodeMode(db);
  await verifyInviteOnlySingleUse(db);
  await verifyLimitedUse(db);
  await verifyExpiredAndDisabled(db);
  await verifyCrossPartnerIsolation(db);
  await verifyValidateRpc(db);
  await verifyIncludedCreditAndDedup(db);
  await verifyNonBenefitNeverConsumes(db);
  await verifyOverageBilling(db);
  await verifyPauseAtCap(db);
  await verifyAuditEvents(db);
  await verifyRlsPolicies(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP partner access codes verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner access codes verification passed.");
console.log("1. Migration applies clean and backfills existing partner-mode sessions to partner_benefit_active.");
console.log("2. Code normalization is case/space-insensitive and hashed (no raw codes stored).");
console.log("3. open mode attributes with or without a code; required/invite modes require a valid code.");
console.log("4. Invalid, inactive, expired, and exhausted codes never grant partner benefit.");
console.log("5. Single-use and limited-use codes are atomically capped and cannot be reused past their limit.");
console.log("6. Partner A codes cannot activate Partner B benefits.");
console.log("7. Packet allocation is consumed exactly once per successful partner-benefit packet; retries do not double-count.");
console.log("8. Screenings, non-benefit sessions, and consumer sessions never consume allocation.");
console.log("9. Overage packets beyond the cap are billed at overage_packet_price_cents ($50 default); pause_at_cap blocks sponsored generation.");
console.log("10. Audit events are appended for code use, credit consumption, and overage.");
console.log("11. partner_access_codes RLS is partner-scoped with an internal-admin policy.");

async function verifyBackfill(db) {
  const row = (await db.query(
    "select partner_benefit_active, attribution_source from public.screening_sessions where session_id = '11111111-1111-1111-1111-111111111111'"
  )).rows[0];
  assert(row.partner_benefit_active === true, "Existing partner-mode session must be backfilled to partner_benefit_active = true.");
  assert(row.attribution_source === "partner_page", "Existing partner-mode session must be backfilled to attribution_source = partner_page.");
}

async function verifyLegacyClaimBenefitFlag(db) {
  // The existing open-link claim RPC must now stamp partner_benefit_active so
  // open-link sessions can consume allocation, without any app-layer change.
  await seedPartner(db, "legacy-open", "open");
  const res = (await db.query(
    "select * from public.claim_rcap_screening_session($1, $2)",
    ["legacy-open", "GA"]
  )).rows[0];
  assert(res.ok === true, "Legacy open-link claim must still succeed.");
  const session = (await db.query(
    "select partner_benefit_active, attribution_source from public.screening_sessions where session_id = $1",
    [res.session_id]
  )).rows[0];
  assert(session.partner_benefit_active === true, "Legacy open-link claim must set partner_benefit_active = true.");
  assert(session.attribution_source === "partner_page", "Legacy open-link claim must attribute to partner_page.");
}

async function verifyNormalizationHashing() {
  assert(normalizeAccessCode("  wmv 2026 ") === "WMV2026", "Normalization must trim, strip spaces, and uppercase.");
  assert(hashAccessCode("wmv2026") === hashAccessCode("  WMV 2026 "), "Hashing must be case/space-insensitive.");
  assert(hashAccessCode("wmv2026") !== "wmv2026", "Hashing must not be the raw code.");
}

async function verifyOpenMode(db) {
  await seedPartner(db, "open-partner", "open");
  await insertCode(db, "open-partner", "FRESHSTART", { campaign: "Spring" });

  const noCode = await claim(db, "open-partner", "GA", null);
  assert(noCode.ok === true, "open mode: no-code claim must succeed.");
  assert(noCode.benefit_active === true, "open mode: no-code claim must be partner-benefit.");
  assert(noCode.attribution_source === "partner_page", "open mode: no-code claim must attribute to partner_page.");
  assert(noCode.code_id === null, "open mode: no-code claim must not attach a code.");

  const withCode = await claim(db, "open-partner", "GA", "freshstart");
  assert(withCode.ok === true && withCode.attribution_source === "partner_code", "open mode: valid code claim must attribute to partner_code.");
  assert(withCode.campaign_name === "Spring", "open mode: valid code claim must carry the campaign.");

  const uses = (await db.query("select uses_count from public.partner_access_codes where partner_slug = 'open-partner'")).rows[0];
  assert(Number(uses.uses_count) === 1, "open mode: shared code use must be recorded once for a code-attributed claim.");
}

async function verifyRequiredCodeMode(db) {
  await seedPartner(db, "req-partner", "required_code");
  await insertCode(db, "req-partner", "STAFF", { campaign: "Staff" });

  const missing = await claim(db, "req-partner", "GA", null);
  assert(missing.ok === false, "required_code: missing code must not grant benefit.");
  assert(missing.reason === "code_required", "required_code: missing code must return code_required.");
  assert(missing.session_id === null, "required_code: missing code must not create a partner session.");

  const invalid = await claim(db, "req-partner", "GA", "nope");
  assert(invalid.ok === false && invalid.reason === "invalid", "required_code: invalid code must return invalid and no benefit.");

  const valid = await claim(db, "req-partner", "GA", "staff");
  assert(valid.ok === true && valid.benefit_active === true && valid.attribution_source === "partner_code", "required_code: valid code must grant partner-code benefit.");
}

async function verifyOptionalCodeMode(db) {
  await seedPartner(db, "opt-partner", "optional_code");
  await insertCode(db, "opt-partner", "CHURCH1", { campaign: "Church" });

  const noCode = await claim(db, "opt-partner", "GA", null);
  assert(noCode.ok === true && noCode.attribution_source === "partner_page", "optional_code: no code must still attribute to partner_page.");

  const valid = await claim(db, "opt-partner", "GA", "church1");
  assert(valid.ok === true && valid.attribution_source === "partner_code", "optional_code: valid code must attribute to partner_code.");

  const invalid = await claim(db, "opt-partner", "GA", "wrong");
  assert(invalid.ok === false && invalid.reason === "invalid", "optional_code: an entered invalid code must be surfaced as invalid.");
}

async function verifyInviteOnlySingleUse(db) {
  await seedPartner(db, "invite-partner", "invite_only");
  await insertCode(db, "invite-partner", "INVITE1", { codeType: "single_use" });

  const first = await claim(db, "invite-partner", "GA", "invite1");
  assert(first.ok === true && first.attribution_source === "partner_code", "invite_only: first single-use claim must succeed.");

  const second = await claim(db, "invite-partner", "GA", "invite1");
  assert(second.ok === false && second.reason === "exhausted", "invite_only: single-use code must be exhausted after one use.");

  const uses = (await db.query("select uses_count from public.partner_access_codes where partner_slug = 'invite-partner'")).rows[0];
  assert(Number(uses.uses_count) === 1, "invite_only: single-use code uses_count must never exceed 1.");
}

async function verifyLimitedUse(db) {
  await seedPartner(db, "limited-partner", "required_code");
  await insertCode(db, "limited-partner", "CLINICJULY", { codeType: "limited_use", maxUses: 2 });

  const a = await claim(db, "limited-partner", "GA", "clinicjuly");
  const b = await claim(db, "limited-partner", "GA", "clinicjuly");
  const c = await claim(db, "limited-partner", "GA", "clinicjuly");
  assert(a.ok === true && b.ok === true, "limited_use: first two claims must succeed.");
  assert(c.ok === false && c.reason === "exhausted", "limited_use: third claim beyond max_uses must be exhausted.");

  const uses = (await db.query("select uses_count from public.partner_access_codes where partner_slug = 'limited-partner'")).rows[0];
  assert(Number(uses.uses_count) === 2, "limited_use: uses_count must never exceed max_uses.");
}

async function verifyExpiredAndDisabled(db) {
  await seedPartner(db, "exp-partner", "required_code");
  await insertCode(db, "exp-partner", "OLDCODE", { expiresAt: "2026-01-01T00:00:00.000Z" });
  await insertCode(db, "exp-partner", "OFFCODE", { isActive: false });
  await insertCode(db, "exp-partner", "FUTURECODE", { startsAt: "2027-01-01T00:00:00.000Z" });

  const expired = await claim(db, "exp-partner", "GA", "oldcode", "2026-07-09T00:00:00.000Z");
  assert(expired.ok === false && expired.reason === "expired", "Expired code must return expired.");

  const disabled = await claim(db, "exp-partner", "GA", "offcode");
  assert(disabled.ok === false && disabled.reason === "inactive", "Disabled code must return inactive.");

  const future = await claim(db, "exp-partner", "GA", "futurecode");
  assert(future.ok === false && future.reason === "inactive", "Not-yet-active code must return inactive.");
}

async function verifyCrossPartnerIsolation(db) {
  await seedPartner(db, "partner-a", "required_code");
  await seedPartner(db, "partner-b", "required_code");
  await insertCode(db, "partner-a", "SHARED2026", { campaign: "A" });

  const wrongPartner = await claim(db, "partner-b", "GA", "shared2026");
  assert(wrongPartner.ok === false && wrongPartner.reason === "invalid", "Partner A's code must not validate for Partner B.");

  const rightPartner = await claim(db, "partner-a", "GA", "shared2026");
  assert(rightPartner.ok === true, "Partner A's own code must validate for Partner A.");
}

async function verifyValidateRpc(db) {
  await seedPartner(db, "val-partner", "required_code");
  const id = await insertCode(db, "val-partner", "VALID1", { campaign: "V" });

  const ok = (await db.query("select * from public.validate_partner_access_code($1, $2, $3)", ["val-partner", hashAccessCode("valid1"), "2026-07-09T00:00:00.000Z"])).rows[0];
  assert(ok.valid === true && ok.campaign_name === "V" && ok.code_id === id, "validate RPC must confirm a valid code with campaign + id.");

  const bad = (await db.query("select * from public.validate_partner_access_code($1, $2, $3)", ["val-partner", hashAccessCode("nope"), "2026-07-09T00:00:00.000Z"])).rows[0];
  assert(bad.valid === false && bad.reason === "invalid", "validate RPC must reject an unknown code.");

  // Validation must never mutate uses.
  const uses = (await db.query("select uses_count from public.partner_access_codes where id = $1", [id])).rows[0];
  assert(Number(uses.uses_count) === 0, "validate RPC must not increment uses_count.");
}

async function verifyIncludedCreditAndDedup(db) {
  await seedPartner(db, "credit-partner", "open", { allowed: 5, used: 0 });
  const claimed = await claim(db, "credit-partner", "GA", null);

  const first = await record(db, claimed.session_id);
  assert(first.recorded === true && first.counted_as === "included", "First packet generation must consume one included credit.");
  assert(Number(first.screenings_used) === 1, "Included credit must increment screenings_used to 1.");

  const dup = await record(db, claimed.session_id);
  assert(dup.recorded === false && dup.reason === "already_recorded", "Duplicate packet generation must not double-count.");

  const ent = (await db.query("select screenings_used from public.partner_entitlement where partner_slug = 'credit-partner'")).rows[0];
  assert(Number(ent.screenings_used) === 1, "Retry must leave screenings_used at exactly 1.");
}

async function verifyNonBenefitNeverConsumes(db) {
  // A DTC / consumer session must never consume partner allocation.
  await db.query(
    `insert into public.screening_sessions (session_id, jurisdiction, flow_mode, partner_benefit_active)
     values ('22222222-2222-2222-2222-222222222222', 'GA', 'dtc', false)`
  );
  const res = await record(db, "22222222-2222-2222-2222-222222222222");
  assert(res.recorded === false && res.reason === "not_partner_benefit", "A non-benefit session must never consume allocation.");
}

async function verifyOverageBilling(db) {
  // allowed = used = 1 -> already at cap, overage enabled.
  await seedPartner(db, "overage-partner", "open", { allowed: 1, used: 1, overageEnabled: true });
  const claimed = await claim(db, "overage-partner", "GA", null);

  const res = await record(db, claimed.session_id);
  assert(res.recorded === true && res.counted_as === "overage", "Packet beyond the cap with overage enabled must be recorded as overage.");
  assert(Number(res.overage_packets) === 1, "Overage packet count must increment to 1.");
  assert(Number(res.overage_amount_cents) === 5000, "Overage amount must be $50 (5000 cents) per packet.");

  // Second overage packet accrues another $50.
  const claimed2 = await claim(db, "overage-partner", "GA", null);
  const res2 = await record(db, claimed2.session_id);
  assert(Number(res2.overage_packets) === 2 && Number(res2.overage_amount_cents) === 10000, "Second overage packet must accrue a second $50.");
}

async function verifyPauseAtCap(db) {
  await seedPartner(db, "pause-partner", "open", { allowed: 1, used: 1, overageEnabled: true, pauseAtCap: true });
  const claimed = await claim(db, "pause-partner", "GA", null);

  const res = await record(db, claimed.session_id);
  assert(res.recorded === false && res.counted_as === "capped", "pause_at_cap must block sponsored packet consumption at the cap.");
  assert(Number(res.overage_packets) === 0, "pause_at_cap must not accrue overage.");

  const session = (await db.query("select claimed_slot_state from public.screening_sessions where session_id = $1", [claimed.session_id])).rows[0];
  assert(session.claimed_slot_state === "claimed", "pause_at_cap must leave the slot claimed (no consumption).");
}

async function verifyAuditEvents(db) {
  const codeUsed = (await db.query("select count(*)::int as n from public.rcap_record_events where event_type = 'partner_code_used'")).rows[0];
  assert(codeUsed.n > 0, "Code redemption must append a partner_code_used audit event.");

  const consumed = (await db.query("select count(*)::int as n from public.rcap_record_events where event_type = 'partner_packet_credit_consumed'")).rows[0];
  assert(consumed.n > 0, "Included credit consumption must append a partner_packet_credit_consumed audit event.");

  const overage = (await db.query("select count(*)::int as n from public.rcap_record_events where event_type = 'partner_packet_overage_recorded'")).rows[0];
  assert(overage.n > 0, "Overage must append a partner_packet_overage_recorded audit event.");
}

async function verifyRlsPolicies(db) {
  const policies = (await db.query(
    "select policyname from pg_policies where tablename = 'partner_access_codes'"
  )).rows.map((r) => r.policyname);
  assert(policies.includes("partner_access_codes_select_own_partner"), "Missing partner-scoped RLS SELECT policy.");
  assert(policies.includes("partner_access_codes_select_internal_admin"), "Missing internal-admin RLS SELECT policy.");

  const rls = (await db.query(
    "select relrowsecurity from pg_class where relname = 'partner_access_codes'"
  )).rows[0];
  assert(rls.relrowsecurity === true, "RLS must be enabled on partner_access_codes.");
}

function verifySourceWiring() {
  const migration = read("supabase/phase-41-rcap-partner-access-codes.sql");
  assert(migration.includes("do not run against production"), "Migration must carry the DB-process safety header.");
  assert(migration.includes("create table if not exists public.partner_access_codes"), "Migration must create partner_access_codes.");
  assert(migration.includes("security definer"), "RPCs must be SECURITY DEFINER.");
  assert(migration.includes("grant execute on function public.record_partner_packet_generation"), "Packet recording RPC must be granted to service_role.");
  assert(!migration.includes("create or replace function public.record_rcap_partner_packet_generation"), "Phase 41 must not mutate the phase-39 hard-cap RPC.");

  // Server never stores raw codes and never exposes the hash to a browser.
  const crypto = read("src/lib/partners/access-code-crypto.ts");
  assert(crypto.includes("createHash(\"sha256\")"), "Codes must be hashed, not stored raw.");
  const lib = read("src/lib/partners/partner-access-codes.ts");
  assert(!lib.includes("code_hash,") || lib.includes("code_hash: hashAccessCode"), "code_hash must only be written, never selected into views.");
  assert(!/SAFE_COLUMNS[^;]*code_hash/.test(lib), "Display views must never select code_hash.");
  assert(lib.includes("hashAccessCode(normalized)"), "Validation must hash the normalized code before lookup.");

  // Attribution is server-resolved; the browser cannot assert partner benefit.
  const intakeLib = read("src/lib/expungement-ai/rcap-partner-intake.ts");
  assert(intakeLib.includes('.rpc("claim_partner_screening_session"'), "Code-aware claim must call the server RPC.");
  assert(intakeLib.includes("hashAccessCode(normalizedCode)"), "Code-aware claim must hash the code server-side.");
  assert(!intakeLib.includes("partner_benefit_active: true"), "App layer must not force partner benefit; the RPC resolves it.");

  // Intake page: code module for code modes, standard-consumer escape hatch,
  // and the existing open path preserved.
  const intakePage = read("src/app/intake/[partnerSlug]/page.tsx");
  assert(intakePage.includes("form action={startRcapPartnerScreening}"), "Open-mode intake form must be preserved.");
  assert(intakePage.includes("claimPartnerScreeningSessionWithCode"), "Code modes must use the code-aware claim.");
  assert(intakePage.includes("If you received an access code from"), "Code entry copy must be present.");
  assert(intakePage.includes("Continue through the standard Expungement.ai experience"), "Required-code users must be offered the standard consumer path.");
  assert(intakePage.includes("/expungement-ai/screening/"), "Standard-consumer escape hatch must route to the DTC screening path.");

  // Packet route: partner cap accounting isolated behind partner-sponsorship,
  // idempotent consumption, and pause_at_cap honored.
  const packetRoute = read("src/app/api/expungement-ai/packet/generate/route.ts");
  assert(packetRoute.includes("isPartnerSponsoredPacketItem"), "Cap accounting must be gated on partner sponsorship.");
  assert(packetRoute.includes("recordPartnerPacketGeneration"), "Successful partner packets must record cap consumption.");
  assert(packetRoute.includes("pausedAtCap"), "pause_at_cap must be honored before generating a sponsored packet.");

  // Public validation route: rate-limited and minimal.
  const validateRoute = read("src/app/api/rcap/access-code/validate/route.ts");
  assert(validateRoute.includes("checkAccessCodeValidationRateLimit"), "Public code validation must be rate-limited.");
  assert(!validateRoute.includes("code_hash"), "Public validation must never surface a hash.");

  // Cross-partner isolation is enforced at the app layer for all mutations.
  const scopeAuth = read("src/lib/partners/partner-scope-auth.ts");
  assert(scopeAuth.includes("cannot manage another organization"), "Partner scope auth must reject cross-partner access.");
  const codesRoute = read("src/app/api/partners/access-codes/route.ts");
  const codesErrorResponse = read("src/app/api/partners/access-codes/error-response.ts");
  const toggleRoute = read("src/app/api/partners/access-codes/toggle/route.ts");
  assert(codesRoute.includes("resolveAuthorizedPartnerSlug"), "Code management must resolve an authorized partner slug.");
  assert(codesRoute.includes('from "./error-response"'), "Code management route must import its error mapper.");
  assert(!codesRoute.includes("export function accessCodeErrorResponse"), "Route must not export a non-route helper.");
  assert(codesErrorResponse.includes("export function accessCodeErrorResponse"), "Moved error mapper must remain directly covered.");
  assert(codesErrorResponse.includes("instanceof PartnerAccessCodeError"), "Moved error mapper must preserve typed error handling.");
  assert(toggleRoute.includes("resolveAuthorizedPartnerSlug"), "Code toggle must resolve an authorized partner slug.");
  assert(lib.includes('.eq("partner_slug", slug) // never allow cross-partner mutation'), "Toggle must be scoped to the owning partner slug.");
}
