import assert from "node:assert/strict";
import { register } from "node:module";
import { createClient } from "@supabase/supabase-js";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a loopback-only Supabase stack."
  );
}
const parsedUrl = new URL(supabaseUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname)) {
  throw new Error("This destructive lifecycle test only runs against loopback.");
}

// The acceptance assertions below expect the onboarding destination, so this
// test must establish that flag rather than inherit it. Without this, a shell
// that has not exported the flag fails on a redirect mismatch that looks like a
// routing regression and is only an unset variable.
process.env.RCAP_PARTNER_ONBOARDING_ENABLED = "true";

const {
  acceptFirstAdminInvitation,
  claimFirstAdminSetupToken,
  createFirstAdminInvitation,
  FirstAdminProvisioningError,
  getFirstAdminAccessView,
  revokeFirstAdminInvitation
} = await import("../src/lib/partners/first-admin-service.ts");

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const runId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const fixtures = [
  {
    slug: `first-admin-test-a-${runId}`,
    email: `admin-a-${runId}@example.test`,
    name: "Alpha Administrator"
  },
  {
    slug: `first-admin-test-b-${runId}`,
    email: `admin-b-${runId}@example.test`,
    name: "Beta Administrator"
  }
];
let initialWinner;
let replacementA;
let invitationB;

try {
  await seedTenants();
  await verifyConcurrentCreationAndReplacement();
  await verifyTenantBoundaries();
  await verifyConcurrentAcceptanceAndReplay();
  await verifyPersistedAuditTrail();
} finally {
  await cleanup();
}

console.log("First administrator Supabase lifecycle verification passed.");
console.log("- Real partner_events rows enforce one current invitation per tenant.");
console.log("- Concurrent creation leaves one winner and replacement invalidates its old token.");
console.log("- Cross-tenant invitation actions are rejected.");
console.log("- Real Supabase Auth claims and concurrent acceptance create one membership per tenant.");
console.log("- Acceptance replay is idempotent and lifecycle audits are persisted.");

async function seedTenants() {
  const records = fixtures.map((fixture, index) => ({
    partner_id: `first-admin-test-${index}-${runId}`,
    partner_slug: fixture.slug,
    partner_name: `First Admin Test ${index + 1}`,
    organization_name: `First Admin Test Organization ${index + 1}`,
    legal_name: `First Admin Test Organization ${index + 1}, Inc.`,
    target_state: index === 0 ? "Mississippi" : "Georgia",
    program_tier: "implementation",
    selected_package_name: "Implementation Program",
    payment_status: "paid",
    qualification_status: "qualified",
    provisioning_status: "provisioning"
  }));
  const recordInsert = await client.from("partner_records").insert(records);
  assert.equal(recordInsert.error, null, recordInsert.error?.message);

  const workspaceInsert = await client.from("partner_onboarding").insert(
    fixtures.map((fixture) => ({
      partner_slug: fixture.slug,
      status: "setup_in_progress"
    }))
  );
  assert.equal(workspaceInsert.error, null, workspaceInsert.error?.message);
}

async function verifyConcurrentCreationAndReplacement() {
  const tenant = fixtures[0];
  const attempts = await Promise.allSettled([
    createInvitation(tenant, crypto.randomUUID()),
    createInvitation(tenant, crypto.randomUUID())
  ]);
  const winners = attempts.filter((result) => result.status === "fulfilled");
  const conflicts = attempts.filter(
    (result) =>
      result.status === "rejected" &&
      result.reason instanceof FirstAdminProvisioningError &&
      ["invitation_conflict", "invitation_pending"].includes(result.reason.code)
  );
  assert.equal(winners.length, 1, "Exactly one concurrent creation must win.");
  assert.equal(conflicts.length, 1, "The stale concurrent creation must fail.");
  initialWinner = winners[0].value;
  assert.ok(initialWinner.setupLink);

  const records = await currentInvitationRows(tenant.slug);
  assert.equal(records.length, 1);
  assert.equal(records[0].event_payload.invitation_id, initialWinner.invitation.invitationId);

  replacementA = await createFirstAdminInvitation({
    partnerSlug: tenant.slug,
    operatorUserId: crypto.randomUUID(),
    replaceCurrent: true,
    values: {
      fullName: tenant.name,
      email: tenant.email,
      idempotencyKey: crypto.randomUUID(),
      expirationHours: 72
    }
  });
  assert.ok(replacementA.setupLink);
  await assert.rejects(
    () => claimFirstAdminSetupToken(tokenFrom(replacementOrInitial("initial"))),
    (error) =>
      error instanceof FirstAdminProvisioningError &&
      error.code === "invitation_inactive",
    "The superseded token must not create an Auth claim."
  );
}

async function verifyTenantBoundaries() {
  invitationB = await createInvitation(fixtures[1], crypto.randomUUID());
  await assert.rejects(
    () =>
      revokeFirstAdminInvitation({
        partnerSlug: fixtures[1].slug,
        invitationId: replacementA.invitation.invitationId,
        operatorUserId: crypto.randomUUID()
      }),
    (error) =>
      error instanceof FirstAdminProvisioningError &&
      error.code === "invitation_not_found",
    "An invitation ID from tenant A must be unusable against tenant B."
  );

  const [rowsA, rowsB] = await Promise.all(
    fixtures.map((fixture) => currentInvitationRows(fixture.slug))
  );
  assert.equal(rowsA.length, 1);
  assert.equal(rowsB.length, 1);
  assert.equal(rowsA[0].partner_slug, fixtures[0].slug);
  assert.equal(rowsB[0].partner_slug, fixtures[1].slug);
  assert.notEqual(
    rowsA[0].event_payload.token_hash,
    rowsB[0].event_payload.token_hash
  );
}

async function verifyConcurrentAcceptanceAndReplay() {
  await Promise.all([
    claimFirstAdminSetupToken(tokenFrom(replacementOrInitial("replacement"))),
    claimFirstAdminSetupToken(tokenFrom(invitationB.setupLink))
  ]);
  const users = await Promise.all(fixtures.map((fixture) => authUser(fixture.email)));

  const tenantAAttempts = await Promise.allSettled([
    acceptFirstAdminInvitation(users[0]),
    acceptFirstAdminInvitation(users[0])
  ]);
  assert.ok(
    tenantAAttempts.some((result) => result.status === "fulfilled"),
    "One concurrent acceptance must succeed."
  );
  await acceptFirstAdminInvitation(users[1]);

  for (const [index, fixture] of fixtures.entries()) {
    const memberships = await client
      .from("partner_users")
      .select("auth_user_id, partner_slug, role, status")
      .eq("partner_slug", fixture.slug);
    assert.equal(memberships.error, null, memberships.error?.message);
    assert.deepEqual(memberships.data, [
      {
        auth_user_id: users[index].id,
        partner_slug: fixture.slug,
        role: "partner_admin",
        status: "active"
      }
    ]);

    const access = await getFirstAdminAccessView(fixture.slug);
    assert.equal(access.accessStatus, "administrator_active");
    assert.equal(access.administrator?.email, fixture.email);
  }

  const replay = await acceptFirstAdminInvitation(users[0]);
  assert.equal(replay.membershipCreated, false);
  assert.equal(replay.replayPrevented, true);
  assert.equal(replay.redirectTo, "/partner/onboarding");
}

async function verifyPersistedAuditTrail() {
  for (const fixture of fixtures) {
    const result = await client
      .from("partner_events")
      .select("event_type, event_payload")
      .eq("partner_slug", fixture.slug);
    assert.equal(result.error, null, result.error?.message);
    const types = new Set(result.data.map((row) => row.event_type));
    assert.ok(types.has("first_admin_invitation_created"));
    assert.ok(types.has("first_admin_invitation_claimed"));
    assert.ok(types.has("first_admin_invitation_accepted"));
    assert.ok(types.has("partner_admin_membership_created"));
    for (const row of result.data) {
      assert.equal(
        "token_hash" in (row.event_payload ?? {}),
        row.event_type === "first_admin_invitation_record",
        "Only the deterministic current-state row may contain a token hash."
      );
    }
  }
}

function createInvitation(fixture, idempotencyKey) {
  return createFirstAdminInvitation({
    partnerSlug: fixture.slug,
    operatorUserId: crypto.randomUUID(),
    values: {
      fullName: fixture.name,
      email: fixture.email,
      idempotencyKey,
      expirationHours: 72
    }
  });
}

async function currentInvitationRows(partnerSlug) {
  const result = await client
    .from("partner_events")
    .select("id, partner_slug, event_type, event_payload")
    .eq("partner_slug", partnerSlug)
    .eq("event_type", "first_admin_invitation_record");
  assert.equal(result.error, null, result.error?.message);
  return result.data;
}

async function authUser(email) {
  const result = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.equal(result.error, null, result.error?.message);
  const user = result.data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email
  );
  assert.ok(user, `Expected an Auth user for ${email}.`);
  return user;
}

function replacementOrInitial(which) {
  return which === "initial" ? initialWinner.setupLink : replacementA.setupLink;
}

function tokenFrom(setupLink) {
  const token = new URL(setupLink).searchParams.get("token");
  assert.ok(token);
  return token;
}

async function cleanup() {
  const list = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!list.error) {
    for (const user of list.data.users) {
      if (fixtures.some((fixture) => fixture.email === user.email?.toLowerCase())) {
        await client.auth.admin.deleteUser(user.id);
      }
    }
  }
  await client
    .from("partner_records")
    .delete()
    .in("partner_slug", fixtures.map((fixture) => fixture.slug));
}
