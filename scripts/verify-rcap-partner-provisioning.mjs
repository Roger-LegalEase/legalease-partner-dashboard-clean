#!/usr/bin/env node
// The focused verifier for RCAP partner provisioning and the existing-user
// administrator claim.
//
// It runs with no database and no network, so it can sit in the required chain.
// What it proves is the shape of the capability rather than one run of it: that
// there is exactly one provisioning implementation, that the transaction and
// idempotency guarantees are actually written into the seam that carries them,
// that the initial state is private and inactive with no access code or billing
// side effect, that provisioning is internal-only, that both invitation paths
// exist and neither creates a duplicate Auth user or leans on password
// recovery, that a wrong signed-in email is refused before anything is
// consumed, and that the canary command defaults to dry-run and demands exact
// confirmations before it will touch Production.
//
// The runtime counterpart, which does all of this against a live loopback
// stack, is scripts/test-rcap-partner-provisioning-lifecycle.mjs.
//
//   node scripts/verify-rcap-partner-provisioning.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const MIGRATION = "supabase/migrations/20260819120000_rcap_partner_provisioning.sql";
const SERVICE = "src/lib/partners/partner-provisioning-service.ts";
const DOMAIN = "src/lib/partners/partner-provisioning-domain.ts";
const FIRST_ADMIN = "src/lib/partners/first-admin-service.ts";
const FIRST_ADMIN_DOMAIN = "src/lib/partners/first-admin-domain.ts";
const ROUTE = "src/app/api/internal/partners/provisioning/route.ts";
const CLAIM_ROUTE = "src/app/partner/first-admin/claim/route.ts";
const SETUP_ROUTE = "src/app/partner/setup/route.ts";
const CANARY = "scripts/provision-rcap-production-canary.mjs";
const SELF = "scripts/verify-rcap-partner-provisioning.mjs";

const migration = read(MIGRATION);
const service = read(SERVICE);
const firstAdmin = read(FIRST_ADMIN);
const canary = read(CANARY);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const provisioningDomain = await import(
  "../src/lib/partners/partner-provisioning-domain.ts"
);
const firstAdminDomain = await import(
  "../src/lib/partners/first-admin-domain.ts"
);

// --- one canonical provisioning service -------------------------------------

check("exactly one module calls the provisioning RPC", () => {
  const callers = walk(path.join(root, "src"))
    .concat(walk(path.join(root, "scripts")))
    .filter((file) => /\.(ts|tsx|mjs)$/.test(file))
    .filter((file) => path.relative(root, file) !== SELF)
    .filter((file) =>
      fs.readFileSync(file, "utf8").includes('"rcap_service_provision_partner"')
    )
    .map((file) => path.relative(root, file));
  assert.deepEqual(callers, [SERVICE], `unexpected RPC callers: ${callers}`);
});

check("every provisioning caller goes through provisionPartner", () => {
  const callers = walk(path.join(root, "src"))
    .concat(walk(path.join(root, "scripts")))
    .filter((file) => /\.(ts|tsx|mjs)$/.test(file))
    .filter((file) => path.relative(root, file) !== SERVICE)
    .filter((file) => path.relative(root, file) !== SELF)
    .filter((file) => /\bprovisionPartner\s*\(/.test(fs.readFileSync(file, "utf8")))
    .map((file) => path.relative(root, file));
  // The HTTP route, the canary command, the verifier's runtime counterpart, and
  // this verifier. Nothing else may reach it, and none of them may write.
  assert.deepEqual(
    callers.sort(),
    [CANARY, "scripts/test-rcap-partner-provisioning-lifecycle.mjs", ROUTE].sort()
  );
  for (const caller of callers) {
    const source = read(caller);
    assert.ok(
      !/from\("partner_records"\)[\s\S]{0,80}\.insert\(/.test(source),
      `${caller} writes partner_records directly`
    );
    assert.ok(
      !/from\("partner_onboarding"\)[\s\S]{0,80}\.insert\(/.test(source),
      `${caller} writes partner_onboarding directly`
    );
  }
});

// --- transaction and idempotency -------------------------------------------

check("provisioning is one database function, not a sequence of writes", () => {
  assert.match(
    migration,
    /create or replace function public\.rcap_service_provision_partner\(/
  );
  for (const table of [
    "public.partner_records",
    "public.partner_onboarding",
    "public.partner_onboarding_sections",
    "public.partner_onboarding_tasks",
    "public.partner_events",
    "public.partner_onboarding_idempotency"
  ]) {
    assert.ok(
      migration.includes(`insert into ${table}`),
      `${table} is not written inside the transaction`
    );
  }
});

check("a replayed request returns the original result and writes nothing", () => {
  const replay = migration.slice(
    migration.indexOf("from public.partner_onboarding_idempotency i"),
    migration.indexOf("-- Exact slug uniqueness")
  );
  assert.match(replay, /where i\.request_id = p_request_id\s*\n\s*for update/);
  assert.match(replay, /Idempotency request mismatch/);
  assert.match(replay, /false\b/);
  assert.ok(
    !/insert into/.test(replay),
    "the replay branch must not write"
  );
});

check("the idempotency record is written last, inside the same transaction", () => {
  assert.ok(
    migration.indexOf("insert into public.partner_onboarding_idempotency") >
      migration.indexOf("insert into public.partner_records"),
    "the idempotency record must not precede the tenant"
  );
});

check("exact slug uniqueness and ambiguity both fail closed", () => {
  assert.match(migration, /Partner slug already exists/);
  assert.match(migration, /Ambiguous existing records for partner slug/);
  assert.match(migration, /pr\.partner_slug = p_partner_slug\s*\n\s*or pr\.partner_id = p_partner_slug/);
});

// --- private and inactive initial state -------------------------------------

check("the initial state is private, inactive, and not launched", () => {
  assert.match(migration, /'invite_only'/);
  assert.match(migration, /'unpaid'/);
  assert.match(migration, /'blocked_payment_required'/);
  assert.match(migration, /landing_page_ready[\s\S]{0,400}?false/);
  assert.match(migration, /'publication_state', 'private'/);
  assert.match(migration, /'public_route_state', 'not_found'/);
  assert.match(migration, /'participant_intake_state', 'inactive'/);
  assert.ok(
    !/internal_approved_at\s*,/.test(
      migration.slice(
        migration.indexOf("insert into public.partner_onboarding ("),
        migration.indexOf("returning * into v_workspace")
      )
    ),
    "internal_approved_at must be left null"
  );
  assert.ok(
    !/launched_at/.test(
      migration.slice(
        migration.indexOf("insert into public.partner_onboarding ("),
        migration.indexOf("returning * into v_workspace")
      )
    ),
    "launched_at must be left null"
  );
});

check("the operator preview states publication and activation separately", () => {
  const states = new Map(
    provisioningDomain.INITIAL_PROVISIONED_STATES.map((s) => [s.key, s.value])
  );
  assert.equal(states.get("publication"), "Private");
  assert.equal(states.get("program_activation"), "Inactive");
  assert.equal(states.get("participant_intake"), "Inactive");
  assert.equal(states.get("launch_readiness"), "Not ready");
  assert.equal(states.get("setup_information"), "Not started");
  assert.equal(states.get("legalease_review"), "Not submitted");
  assert.equal(states.get("access_code"), "Absent");
  assert.equal(states.get("allocation"), "Absent");
  assert.equal(states.get("billing"), "None");
  assert.equal(states.get("public_page"), "Not found");
  assert.equal(states.get("sitemap_navigation"), "Absent");
  assert.equal(states.get("launched_at"), "Not launched");
});

check("no access code, allocation, or billing side effect is written", () => {
  for (const table of [
    "partner_access_codes",
    "partner_entitlement",
    "partner_packet_entitlement",
    "partner_billing_requests",
    "packet_credit_ledger"
  ]) {
    assert.ok(
      !migration.includes(`insert into public.${table}`),
      `provisioning writes ${table}`
    );
  }
  // Comments are stripped first, and the one section key that legitimately
  // contains "sponsorship" is the onboarding section a partner fills in later,
  // not a claim of any kind.
  const statements = migration
    .replace(/--[^\n]*/g, "")
    .replace(/'access_sponsorship_capacity'/g, "");
  assert.ok(
    !/stripe|invoice|checkout|purchase_order|sponsorship|payment_intent/i.test(
      statements
    ),
    "provisioning touches billing vocabulary"
  );
});

check("no Auth user, membership, or invitation is created by provisioning", () => {
  assert.ok(!/insert into public\.partner_users/.test(migration));
  assert.ok(!/auth\.users/.test(migration.replace(/-- .*/g, "")));
  assert.ok(!service.includes("auth.admin"));
  assert.ok(!service.includes("createFirstAdminInvitation"));
  const notCreated = new Set(
    provisioningDomain.RECORDS_NOT_CREATED.map((r) => r.key)
  );
  for (const key of ["auth_user", "membership", "invitation", "access_code", "allocation", "billing", "publication"]) {
    assert.ok(notCreated.has(key), `the preview omits "${key}"`);
  }
});

// --- internal-only invocation ----------------------------------------------

check("the database refuses a non-internal actor", () => {
  assert.match(
    migration,
    /perform public\.rcap_service_assert_internal_actor\(p_actor_user_id\);/
  );
  assert.ok(
    migration.indexOf("rcap_service_assert_internal_actor") <
      migration.indexOf("insert into public.partner_records"),
    "authorization must precede the first write"
  );
});

check("execution is granted only to the server-side role", () => {
  for (const role of ['from public;', 'from "anon";', 'from "authenticated";']) {
    assert.ok(
      migration.includes(`rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) ${role}`),
      `execution is not revoked ${role}`
    );
  }
  assert.match(
    migration,
    /grant execute on function public\.rcap_service_provision_partner\([^)]*\) to "service_role";/
  );
});

check("the migration sets a fixed safe search_path and is not destructive", () => {
  const functions = migration.match(/set search_path to ''/g) ?? [];
  assert.equal(functions.length, 2, "both functions must pin search_path");
  assert.ok(
    !/\b(drop|truncate|delete from|alter table [^;]*drop)\b/i.test(
      migration.replace(/--[^\n]*/g, "")
    ),
    "the migration contains a destructive operation"
  );
});

check("the HTTP route denies everyone but an internal administrator", () => {
  const route = read(ROUTE);
  assert.match(route, /requireInternalAdminSession\(\)/);
  assert.ok(
    route.indexOf("await requireInternalAdminSession()") <
      route.indexOf("await provisionPartner({"),
    "authorization must precede provisioning"
  );
  assert.match(route, /isFirstAdminSameOriginRequest/);
  assert.match(
    route,
    /This operation is not available for your account\./,
    "the denial must be generic"
  );
});

check("no raw identifier, database error, or service-role detail is returned", () => {
  assert.ok(
    !/partner_record_id:|workspace_id:/.test(
      service.slice(service.indexOf("return {"), service.indexOf("* Read-only provisioning facts"))
    ),
    "the result surfaces raw identifiers"
  );
  assert.match(service, /pageConfigurationCreated: Boolean\(row\.page_configuration_id\)/);
  const copy = provisioningDomain.provisioningFailureCopy("write_failed");
  assert.ok(!/sql|postgres|supabase|constraint|uuid/i.test(copy));
  for (const code of [
    "invalid_input",
    "forbidden",
    "slug_conflict",
    "ambiguous_existing_records",
    "idempotency_conflict",
    "not_configured",
    "anything_else"
  ]) {
    const message = provisioningDomain.provisioningFailureCopy(code);
    assert.ok(message.length > 0);
    assert.ok(!/service.role|42501|23505|22023/i.test(message));
  }
});

// --- both invitation paths --------------------------------------------------

check("the account path is decided by count and confirmation", () => {
  const decide = firstAdminDomain.decideFirstAdminAccountPath;
  assert.equal(decide({ matchCount: 0, confirmed: false }), "create_new_account");
  assert.equal(
    decide({ matchCount: 1, confirmed: true }),
    "existing_confirmed_account"
  );
  assert.equal(decide({ matchCount: 1, confirmed: false }), "ambiguous");
  assert.equal(decide({ matchCount: 2, confirmed: true }), "ambiguous");
  assert.equal(decide({ matchCount: 7, confirmed: false }), "ambiguous");
});

check("an existing confirmed account triggers no Supabase Auth call", () => {
  const branch = firstAdmin.slice(
    firstAdmin.indexOf('if (path === "existing_confirmed_account")'),
    firstAdmin.indexOf("const claiming: FirstAdminInvitationPayload")
  );
  assert.ok(branch.length > 0);
  // Comments in the branch say what it does NOT do, so they are stripped before
  // looking for the calls it must not make.
  const code = branch.replace(/\/\/[^\n]*/g, "");
  for (const forbidden of [
    "generateLink",
    "inviteUserByEmail",
    "resetPasswordForEmail",
    "updateUserById",
    "createUser",
    "deleteUser",
    "setSession"
  ]) {
    assert.ok(
      !code.includes(forbidden),
      `the existing-account branch calls ${forbidden}`
    );
  }
  assert.ok(!/auth\.admin/.test(code), "the existing-account branch reaches Auth admin");
});

check("password recovery is never used as membership authorization", () => {
  assert.ok(
    !/type: "recovery"/.test(firstAdmin),
    "a recovery link is still generated"
  );
  assert.ok(
    !firstAdmin.includes("inviteUserByEmail"),
    "generic inviteUserByEmail is used"
  );
  assert.ok(
    !/updateUser\(\{\s*password/.test(firstAdmin),
    "an existing password is changed"
  );
});

check("every matching Auth user is counted, not just the first", () => {
  assert.ok(firstAdmin.includes("async function findAuthUsersByEmail"));
  assert.ok(!firstAdmin.includes("async function findAuthUserByEmail"));
  const fn = firstAdmin.slice(
    firstAdmin.indexOf("async function findAuthUsersByEmail"),
    firstAdmin.indexOf("function isConfirmedAuthUser")
  );
  assert.ok(fn.includes("matches.push(user)"));
  assert.ok(!fn.includes(".find("), "the lookup still short-circuits on first match");
});

check("the invitation survives sign-in in an HttpOnly, path-scoped cookie", () => {
  const cookie = read("src/lib/partners/first-admin-claim-cookie.ts");
  assert.match(cookie, /httpOnly: true/);
  assert.match(cookie, /sameSite: "lax"/);
  assert.match(cookie, /secure: process\.env\.NODE_ENV === "production"/);
  const setup = read(SETUP_ROUTE);
  assert.match(setup, /firstAdminClaimCookie\(token\)/);
  assert.match(setup, /\/sign-in\?next=/);
  assert.ok(
    !/token=\$\{/.test(read(CLAIM_ROUTE)),
    "the claim route puts the token in a URL"
  );
});

// --- exact-email claim, wrong-email denial, replay --------------------------

check("the email match is checked against the live session before any write", () => {
  const fn = firstAdmin.slice(
    firstAdmin.indexOf("export async function acceptFirstAdminInvitationForExistingUser")
  );
  const emailCheck = fn.indexOf("sessionEmail !== invitation.email");
  const firstWrite = fn.indexOf("compareAndSetInvitation");
  const insert = fn.indexOf('.from("partner_users")\n      .insert(');
  assert.ok(emailCheck > 0, "no email match is performed");
  assert.ok(emailCheck < firstWrite, "the invitation changes before the email match");
  assert.ok(emailCheck < insert || insert === -1);
  assert.match(fn, /normalizeEmail\(input\.authUser\.email\)/);
  assert.match(fn, /first_admin_invitation_wrong_account/);
  assert.match(
    fn,
    /throw new FirstAdminProvisioningError\(\s*"wrong_account"/
  );
});

check("a wrong signed-in email leaks nothing about the tenant", () => {
  const claimRoute = read(CLAIM_ROUTE);
  assert.match(claimRoute, /case "wrong_account":\s*\n\s*return "wrong_signed_in_email";/);
  const page = read("src/app/partner/first-admin/claim/unavailable/page.tsx");
  // The page renders one fixed recovery presentation and nothing from the
  // invitation: no slug, no organization, no address.
  assert.ok(!/partnerSlug|organizationName|administratorEmail/.test(page));
  assert.ok(!/searchParams\)\.(?!code)/.test(page));
  assert.match(page, /invitation_unavailable/);
});

check("exactly one membership is created and replay creates none", () => {
  const fn = firstAdmin.slice(
    firstAdmin.indexOf("export async function acceptFirstAdminInvitationForExistingUser"),
    firstAdmin.indexOf("export async function acceptFirstAdminInvitation(")
  );
  assert.equal(
    (fn.match(/\.from\("partner_users"\)\s*\n\s*\.insert\(/g) ?? []).length,
    1,
    "membership is inserted more than once"
  );
  assert.match(fn, /role: FIRST_ADMIN_ROLE/);
  assert.match(fn, /status: "active"/);
  assert.match(fn, /replayPrevented: true/);
  assert.match(fn, /first_admin_replay_prevented/);
  assert.match(fn, /otherAdmins\.length > 0/);
});

check("expired and revoked invitations reach a designed recovery state", () => {
  const claimRoute = read(CLAIM_ROUTE);
  assert.match(claimRoute, /recoveryCodeFor/);
  assert.match(claimRoute, /invitation_unavailable/);
  const presentation = read(
    "src/lib/partners/onboarding/brand-page-presentation.ts"
  );
  for (const code of [
    "invitation_expired",
    "invitation_revoked",
    "invitation_already_used",
    "wrong_signed_in_email"
  ]) {
    assert.ok(presentation.includes(`${code}: {`), `no designed state for ${code}`);
  }
  assert.match(
    read("src/components/partners/PartnerRecoveryState.tsx"),
    /partners@legalease\.com/
  );
});

// --- delivery idempotency ---------------------------------------------------

check("delivery carries its own key and a retry sends nothing", () => {
  assert.match(firstAdmin, /deliveryIdempotencyKey\?: unknown/);
  assert.match(
    firstAdmin,
    /invitation\.delivery_idempotency_key === deliveryKey &&\s*\n\s*invitation\.delivery_status === "sent"/
  );
  assert.match(firstAdmin, /return \{ sent: true, duplicatePrevented: true \};/);
  assert.match(firstAdmin, /first_admin_invitation_delivery_failed/);
});

// --- the canary command -----------------------------------------------------

check("the canary defaults to dry-run", () => {
  assert.match(canary, /const mode = args\.execute \? "execute" : "dry-run";/);
  assert.match(canary, /Choose either --dry-run or --execute, not both\./);
  assert.match(canary, /report\("Dry run only\. Nothing was written\."\);/);
  const dryRunExit = canary.indexOf('report("Dry run only. Nothing was written.");');
  assert.ok(
    dryRunExit < canary.indexOf("await provisionPartner("),
    "the dry run can reach a write"
  );
});

check("the canary accepts exactly the reviewed options", () => {
  const declared = canary
    .slice(canary.indexOf("const OPTIONS = ["), canary.indexOf("];", canary.indexOf("const OPTIONS = [")))
    .match(/"([a-z-]+)"/g)
    .map((v) => v.replace(/"/g, ""));
  assert.deepEqual(declared.sort(), [
    "admin-email",
    "admin-name",
    "confirm-production-ref",
    "confirm-source-sha",
    "dry-run",
    "execute",
    "idempotency-key",
    "legal-organization-name",
    "organization-name",
    "partner-slug",
    "program-name",
    "program-purpose",
    "project-ref"
  ]);
});

check("Production execution requires every exact confirmation", () => {
  for (const guard of [
    "--execute requires --confirm-production-ref.",
    "--execute requires --confirm-source-sha.",
    "--execute requires --project-ref.",
    "--confirm-production-ref does not match --project-ref exactly.",
    "The repository is not clean.",
    "HEAD does not match --confirm-source-sha.",
    "The expected merged source is not in HEAD's ancestry.",
    "A secure server-side Supabase environment is required",
    "A tenant already exists for that page address.",
    "More than one Auth user matches the administrator email.",
    "The administrator email already holds a partner membership.",
    "The initial state is not private and inactive.",
    "An access code already exists for that page address."
  ]) {
    assert.ok(canary.includes(guard), `missing execution guard: ${guard}`);
  }
});

check("the canary refuses localhost only when execution targets Production", () => {
  assert.match(
    canary,
    /if \(targetsLoopback && args\["confirm-production-ref"\] !== "local"\)/
  );
  assert.ok(
    canary.includes(
      "Execution confirmed a Production project ref while the Supabase environment is loopback."
    )
  );
  // Nothing may refuse loopback outright: the command has to stay testable.
  assert.ok(
    !/if \(targetsLoopback\) \{\s*\n\s*fail/.test(canary),
    "loopback is refused unconditionally"
  );
});

check("the canary is a wrapper with no writes of its own", () => {
  assert.ok(!canary.includes(".insert("));
  assert.ok(!canary.includes(".upsert("));
  assert.ok(!canary.includes(".update("));
  assert.ok(!canary.includes("rcap_service_provision_partner"));
  assert.match(canary, /await import\("\.\.\/src\/lib\/partners\/partner-provisioning-service\.ts"\)/);
  assert.match(canary, /await import\("\.\.\/src\/lib\/partners\/first-admin-service\.ts"\)/);
});

check("the canary never publishes, activates, or creates an access code", () => {
  for (const forbidden of [
    "landing_page_ready",
    "launched_at",
    "internal_approved_at",
    "partner_access_codes",
    "access_mode"
  ]) {
    assert.ok(!canary.includes(forbidden), `the canary touches ${forbidden}`);
  }
  assert.match(canary, /Stopped before human acceptance\./);
  assert.match(canary, /Nothing was published and nothing was activated\./);
});

check("the canary output carries no secret or complete identifier", () => {
  assert.ok(!/SERVICE_ROLE_KEY\}|serviceRoleKey\}/.test(canary));
  assert.ok(!/report\(`[^`]*\$\{[a-zA-Z.]*[Ii]d\}/.test(canary.replace(/requestId/g, "")));
  assert.match(canary, /function maskEmail\(email\)/);
});

// --- validation -------------------------------------------------------------

check("provisioning input validation rejects the unsafe shapes", () => {
  const base = {
    organizationName: "Rythm Labs",
    legalOrganizationName: "Rythm Labs LLC",
    partnerSlug: "rythm-labs-test",
    programName: "Rythm Labs RCAP Acceptance",
    programPurpose: "Record clearing support for the acceptance cohort.",
    administratorName: "Lee Roman",
    administratorEmail: "roger@rythmlabs.com",
    clearanceReason: "Reviewed production canary provisioning.",
    idempotencyKey: "11111111-1111-4111-8111-111111111111"
  };
  assert.equal(
    provisioningDomain.validatePartnerProvisioningInput(base).ok,
    true
  );
  // A typed slug is normalized rather than rejected, and the normalized value is
  // what reaches the database, which validates the same shape again.
  const cased = provisioningDomain.validatePartnerProvisioningInput({
    ...base,
    partnerSlug: "  Rythm-Labs  "
  });
  assert.equal(cased.ok, true);
  assert.equal(cased.value.partnerSlug, "rythm-labs");
  assert.equal(
    provisioningDomain.validatePartnerProvisioningInput({
      ...base,
      administratorEmail: "  ROGER@Rythmlabs.com "
    }).value.administratorEmail,
    "roger@rythmlabs.com"
  );

  for (const [field, value] of [
    ["partnerSlug", "-leading"],
    ["partnerSlug", "trailing-"],
    ["partnerSlug", "under_score"],
    ["partnerSlug", "has space"],
    ["administratorEmail", "not-an-email"],
    ["idempotencyKey", "not-a-uuid"],
    ["clearanceReason", "short"],
    ["programPurpose", "brief"],
    ["organizationName", ""],
    ["legalOrganizationName", ""],
    ["programName", ""],
    ["administratorName", ""]
  ]) {
    const result = provisioningDomain.validatePartnerProvisioningInput({
      ...base,
      [field]: value
    });
    assert.equal(result.ok, false, `${field}=${JSON.stringify(value)} was accepted`);
  }
});

console.log(`\nRCAP partner provisioning verification passed: ${passed} checks.`);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}
