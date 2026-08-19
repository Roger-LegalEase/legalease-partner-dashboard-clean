#!/usr/bin/env node
// Destructive lifecycle acceptance for RCAP partner provisioning and the
// existing-user administrator claim.
//
// Runs only against a loopback Supabase stack, because it creates and deletes
// real tenants, real Auth users, and real invitations, and reads the branded
// email out of Mailpit. It is deliberately not in the npm test chain: the chain
// has to run without a database.
//
//   npm run partners:test-provisioning-lifecycle
//
// Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY pointing at loopback, a Mailpit HTTP API on
// http://127.0.0.1:54324, and a Resend-shaped local relay on
// PARTNER_EMAIL_API_BASE_URL that can be told to fail one send via
// POST /__fail-next.
import assert from "node:assert/strict";
import { register } from "node:module";
import { createClient } from "@supabase/supabase-js";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a loopback-only Supabase stack."
  );
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)) {
  throw new Error("This destructive lifecycle test only runs against loopback.");
}
// The acceptance assertions expect the implementation-centre destination, so
// this test establishes the flag rather than inheriting it.
process.env.RCAP_PARTNER_ONBOARDING_ENABLED = "true";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const RELAY = process.env.PARTNER_EMAIL_API_BASE_URL ?? "http://127.0.0.1:54399";

const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const prov = await import("../src/lib/partners/partner-provisioning-service.ts");
const first = await import("../src/lib/partners/first-admin-service.ts");
const domain = await import("../src/lib/partners/first-admin-domain.ts");

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const slugA = `acc-a-${run}`;
const slugB = `acc-b-${run}`;
const slugC = `acc-c-${run}`;
const slugD = `acc-d-${run}`;
const slugE = `acc-e-${run}`;
const emailExisting = `existing-${run}@example.test`;
const emailNew = `newuser-${run}@example.test`;
const emailWrong = `wrong-${run}@example.test`;

const created = { users: [], slugs: [slugA, slugB, slugC, slugD, slugE] };
let pass = 0;
const results = [];
function ok(label) { pass += 1; results.push(label); console.log(`  ok  ${label}`); }

async function mkUser(email, { confirm = true } = {}) {
  const { data, error } = await svc.auth.admin.createUser({
    email, password: "Acceptance-Passw0rd!", email_confirm: confirm
  });
  if (error) throw error;
  created.users.push(data.user.id);
  return data.user;
}

async function mailpit() {
  const res = await fetch(`${MAILPIT}/api/v1/messages`);
  return (await res.json()).messages ?? [];
}
async function clearMail() {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

function values(slug, email, name = "Acceptance Admin") {
  return {
    organizationName: "Acceptance Org",
    legalOrganizationName: "Acceptance Org LLC",
    partnerSlug: slug,
    programName: "Acceptance RCAP Program",
    programPurpose: "Record clearing support for the acceptance cohort.",
    administratorName: name,
    administratorEmail: email,
    clearanceReason: "Local acceptance run for the reviewed provisioning path.",
    idempotencyKey: crypto.randomUUID()
  };
}

try {
  const operator = await mkUser(`operator-${run}@legalease.test`);
  await svc.from("partner_users").insert({
    auth_user_id: operator.id, partner_slug: null, role: "internal_admin", status: "active"
  });
  const outsider = await mkUser(`outsider-${run}@example.test`);

  // ---- PROVISIONING -------------------------------------------------------
  const v = values(slugA, emailExisting);
  const r1 = await prov.provisionPartner({ values: v, operatorUserId: operator.id });
  assert.equal(r1.created, true);
  const st = await prov.readPartnerProvisioningState(slugA);
  assert.equal(st.partnerExists, true); ok("1. one tenant is created");

  const program = await svc.from("partner_records")
    .select("program_name, program_description, legal_name, organization_name, access_mode, payment_status, provisioning_status")
    .eq("partner_slug", slugA).single();
  assert.equal(program.data.program_name, v.programName);
  assert.equal(program.data.program_description, v.programPurpose);
  ok("2. one program is created");

  assert.equal(st.workspaceExists, true); ok("3. one onboarding workspace is created");
  assert.equal(st.pageConfigurationExists, true);
  const cfg = await svc.from("partner_events").select("event_payload")
    .eq("partner_slug", slugA).eq("event_type", "partner_page_configuration_record").single();
  assert.equal(cfg.data.event_payload.publication_state, "private");
  assert.equal(cfg.data.event_payload.public_route_state, "not_found");
  assert.equal(cfg.data.event_payload.participant_intake_state, "inactive");
  ok("4. one private page configuration is created");

  assert.equal(st.sectionCount, 8);
  assert.equal(st.milestoneCount, 16);
  const milestones = await svc.from("partner_onboarding_tasks").select("status").eq("partner_slug", slugA);
  assert.ok(milestones.data.every((m) => m.status === "not_started"));
  const ws = await svc.from("partner_onboarding")
    .select("status, launch_readiness_state, landing_page_ready, internal_approved_at, launched_at, submitted_at, completion_percentage")
    .eq("partner_slug", slugA).single();
  assert.equal(ws.data.launch_readiness_state, "not_ready");
  assert.equal(ws.data.landing_page_ready, false);
  assert.equal(ws.data.internal_approved_at, null);
  assert.equal(ws.data.submitted_at, null);
  assert.equal(ws.data.completion_percentage, 0);
  ok("5. initial milestones are truthful");

  assert.equal(st.publicationAuthorized, false);
  assert.equal(ws.data.launched_at, null);
  ok("6. public route remains 404 (publication not authorized, launched_at null)");

  assert.equal(program.data.access_mode, "invite_only");
  assert.equal(st.activationAuthorized, false);
  ok("7. participant intake remains inactive");

  assert.equal(st.accessCodeCount, 0); ok("8. no access code exists");
  assert.equal(st.entitlementExists, false);
  const billing = await svc.from("partner_billing_requests").select("id").eq("partner_slug", slugA);
  assert.equal((billing.data ?? []).length, 0);
  assert.equal(program.data.payment_status, "unpaid");
  ok("9. no billing or allocation state exists");

  const replay = await prov.provisionPartner({ values: v, operatorUserId: operator.id });
  assert.equal(replay.created, false);
  assert.equal(replay.replayed, true);
  const partnersAfter = await svc.from("partner_records").select("id").eq("partner_slug", slugA);
  assert.equal(partnersAfter.data.length, 1);
  ok("10. same idempotency key returns the original result");

  await assert.rejects(
    prov.provisionPartner({ values: { ...v, idempotencyKey: crypto.randomUUID() }, operatorUserId: operator.id }),
    (e) => e.code === "slug_conflict"
  );
  ok("11. different key with duplicate slug fails closed");

  // Injected child-record failure. The participant page configuration is
  // written at a deterministic id derived from the slug, so parking a row at
  // slugB's id under a DIFFERENT partner makes provisioning slugB fail at that
  // step — after the tenant, workspace, sections and milestones have already
  // been written. Nothing may survive.
  const { data: collisionId } = await svc.rpc("rcap_partner_page_configuration_id", {
    p_partner_slug: slugB
  });
  await svc.from("partner_events").insert({
    id: collisionId,
    partner_slug: slugA,
    event_type: "acceptance_injected_collision",
    event_label: "Injected collision",
    event_payload: {}
  });
  await assert.rejects(
    prov.provisionPartner({ values: values(slugB, emailNew), operatorUserId: operator.id }),
    (e) => e instanceof prov.PartnerProvisioningError
  );
  const rolledSections = await svc.from("partner_onboarding_sections").select("id").eq("workspace_id", collisionId);
  const rolledTasks = await svc.from("partner_onboarding_tasks").select("id").eq("partner_slug", slugB);
  assert.equal(rolledTasks.data.length, 0, "milestones rolled back");
  assert.equal((rolledSections.data ?? []).length, 0);
  const rolled = await svc.from("partner_records").select("id").eq("partner_slug", slugB);
  const rolledWs = await svc.from("partner_onboarding").select("id").eq("partner_slug", slugB);
  const rolledCfg = await svc.from("partner_events").select("id")
    .eq("partner_slug", slugB).eq("event_type", "partner_page_configuration_record");
  assert.equal(rolled.data.length, 0, "partner record rolled back");
  assert.equal(rolledWs.data.length, 0, "workspace rolled back");
  assert.equal(rolledCfg.data.length, 0, "page configuration rolled back");
  ok("12. injected child-record failure rolls back the whole operation");

  // ---- EXISTING CONFIRMED USER -------------------------------------------
  const existingUser = await mkUser(emailExisting);
  const list = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.equal(list.data.users.filter((u) => u.email === emailExisting).length, 1);
  ok("13. exactly one Auth user exists before the invitation");

  const beforeUsers = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.length;
  await prov.provisionPartner({ values: values(slugC, emailExisting), operatorUserId: operator.id });
  const afterUsers = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.length;
  assert.equal(afterUsers, beforeUsers);
  ok("14. provisioning creates no second Auth user");

  await clearMail();
  const invite = await first.createFirstAdminInvitation({
    partnerSlug: slugC, operatorUserId: operator.id,
    values: { fullName: "Existing Admin", email: emailExisting, idempotencyKey: crypto.randomUUID() }
  });
  assert.equal(invite.created, true);
  ok("15. one application invitation is created");

  const deliveryKey = crypto.randomUUID();
  const sent = await first.sendFirstAdminInvitationEmail({
    partnerSlug: slugC, operatorUserId: operator.id,
    invitationId: invite.invitation.invitationId, setupLink: invite.setupLink,
    deliveryIdempotencyKey: deliveryKey
  });
  assert.equal(sent.sent, true);
  await new Promise((r) => setTimeout(r, 600));
  const mail = await mailpit();
  const branded = mail.filter((m) => m.To.some((t) => t.Address === emailExisting));
  assert.equal(branded.length, 1);
  assert.match(branded[0].Subject, /Set up administrator access for/);
  const body = await (await fetch(`${MAILPIT}/api/v1/message/${branded[0].ID}`)).json();
  assert.match(body.HTML, /RCAP <span[^>]*>by LegalEase<\/span>/);
  assert.match(body.HTML, /Set up administrator access/);
  assert.match(body.Text, /Partner Administrator/);
  ok("16. one branded email reaches Mailpit");

  const memBefore = await svc.from("partner_users").select("id").eq("partner_slug", slugC);
  assert.equal(memBefore.data.length, 0);
  ok("17. no membership exists before acceptance");

  // Follow the link: existing confirmed account must not touch Auth.
  const token = new URL(invite.setupLink).searchParams.get("token");
  const claim = await first.claimFirstAdminSetupToken(token);
  assert.equal(claim.mode, "existing_account");
  const afterClaimUsers = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.length;
  assert.equal(afterClaimUsers, afterUsers + 0);
  ok("18a. existing-account link creates no Auth user and no recovery link");

  // Wrong signed-in email first.
  const wrongUser = await mkUser(emailWrong);
  await assert.rejects(
    first.acceptFirstAdminInvitationForExistingUser({ rawToken: token, authUser: wrongUser }),
    (e) => e.code === "wrong_account"
  );
  const memWrong = await svc.from("partner_users").select("id").eq("partner_slug", slugC);
  assert.equal(memWrong.data.length, 0);
  ok("21. wrong signed-in email creates no membership");

  const stillPending = await first.getFirstAdminAccessView(slugC);
  assert.equal(stillPending.invitation.status, "pending");
  ok("22. wrong-email attempt does not consume the invitation");

  const accept = await first.acceptFirstAdminInvitationForExistingUser({ rawToken: token, authUser: existingUser });
  assert.equal(accept.membershipCreated, true);
  const mem = await svc.from("partner_users").select("id, role, status").eq("partner_slug", slugC);
  assert.equal(mem.data.length, 1);
  assert.equal(mem.data[0].role, "partner_admin");
  assert.equal(mem.data[0].status, "active");
  assert.equal(accept.redirectTo, "/partner/onboarding");
  ok("18. correct authenticated email creates exactly one membership");

  const consumed = await first.getFirstAdminAccessView(slugC);
  assert.equal(consumed.accessStatus, "administrator_active");
  ok("19. invitation becomes consumed");

  const replayAccept = await first.acceptFirstAdminInvitationForExistingUser({ rawToken: token, authUser: existingUser });
  assert.equal(replayAccept.replayPrevented, true);
  assert.equal(replayAccept.membershipCreated, false);
  const memReplay = await svc.from("partner_users").select("id").eq("partner_slug", slugC);
  assert.equal(memReplay.data.length, 1);
  ok("20. replay creates no duplicate membership");

  // ---- ZERO-USER PATH -----------------------------------------------------
  await prov.provisionPartner({ values: values(slugD, emailNew), operatorUserId: operator.id });
  const inviteNew = await first.createFirstAdminInvitation({
    partnerSlug: slugD, operatorUserId: operator.id,
    values: { fullName: "New Admin", email: emailNew, idempotencyKey: crypto.randomUUID() }
  });
  const tokenNew = new URL(inviteNew.setupLink).searchParams.get("token");
  const claimNew = await first.claimFirstAdminSetupToken(tokenNew);
  assert.equal(claimNew.mode, "new_account");
  assert.ok(claimNew.actionLink.length > 0);
  const newAuth = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users
    .filter((u) => u.email === emailNew);
  assert.equal(newAuth.length, 1);
  created.users.push(newAuth[0].id);
  ok("Z. zero matching Auth users still uses the new-user administrator setup flow");

  // ---- SECURITY AND RECOVERY ---------------------------------------------
  await prov.provisionPartner({ values: values(slugE, `e-${run}@example.test`), operatorUserId: operator.id });
  const expiredInvite = await first.createFirstAdminInvitation({
    partnerSlug: slugE, operatorUserId: operator.id,
    values: { fullName: "Expiring Admin", email: `e-${run}@example.test`, idempotencyKey: crypto.randomUUID(), expirationHours: 1 }
  });
  const expiredToken = new URL(expiredInvite.setupLink).searchParams.get("token");
  const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await assert.rejects(first.claimFirstAdminSetupToken(expiredToken, future), (e) => e instanceof first.FirstAdminProvisioningError);
  const expiredView = await first.getFirstAdminAccessView(slugE, future);
  assert.equal(expiredView.accessStatus, "invitation_expired");
  const memExpired = await svc.from("partner_users").select("id").eq("partner_slug", slugE);
  assert.equal(memExpired.data.length, 0);
  ok("23. expired invitation fails safely");

  const revokeInvite = await first.createFirstAdminInvitation({
    partnerSlug: slugE, operatorUserId: operator.id, replaceCurrent: true,
    values: { fullName: "Revoked Admin", email: `e-${run}@example.test`, idempotencyKey: crypto.randomUUID() }
  });
  const revokedToken = new URL(revokeInvite.setupLink).searchParams.get("token");
  await first.revokeFirstAdminInvitation({
    partnerSlug: slugE, operatorUserId: operator.id, invitationId: revokeInvite.invitation.invitationId
  });
  await assert.rejects(first.claimFirstAdminSetupToken(revokedToken), (e) => e instanceof first.FirstAdminProvisioningError);
  assert.equal((await svc.from("partner_users").select("id").eq("partner_slug", slugE)).data.length, 0);
  ok("24. revoked invitation fails safely");

  // Partner staff / partner admin / other tenant cannot invoke provisioning.
  const staff = await mkUser(`staff-${run}@example.test`);
  await svc.from("partner_users").insert({
    auth_user_id: staff.id, partner_slug: slugA, role: "partner_staff", status: "active"
  });
  await assert.rejects(
    prov.provisionPartner({ values: values(`denied-staff-${run}`, `x-${run}@example.test`), operatorUserId: staff.id }),
    (e) => e.code === "forbidden"
  );
  ok("25. partner staff cannot invoke provisioning");

  await assert.rejects(
    prov.provisionPartner({ values: values(`denied-admin-${run}`, `y-${run}@example.test`), operatorUserId: existingUser.id }),
    (e) => e.code === "forbidden"
  );
  ok("26. partner admin cannot invoke internal provisioning");

  await assert.rejects(
    prov.provisionPartner({ values: values(`denied-tenant-${run}`, `z-${run}@example.test`), operatorUserId: outsider.id }),
    (e) => e.code === "forbidden"
  );
  // A signed-in user from another tenant also cannot read the tenant through RLS.
  const outsiderClient = anon();
  await outsiderClient.auth.signInWithPassword({ email: `outsider-${run}@example.test`, password: "Acceptance-Passw0rd!" });
  const leak = await outsiderClient.from("partner_onboarding").select("id").eq("partner_slug", slugA);
  assert.equal((leak.data ?? []).length, 0);
  ok("27. another tenant cannot invoke or inspect it");

  const publicClient = anon();
  const publicRead = await publicClient.from("partner_records").select("partner_slug").eq("partner_slug", slugA);
  assert.equal((publicRead.data ?? []).length, 0);
  const publicEvents = await publicClient.from("partner_events").select("id").eq("partner_slug", slugA);
  assert.equal((publicEvents.data ?? []).length, 0);
  ok("28. public user receives no tenant disclosure");

  // Delivery retry. A fresh pending invitation on slugD, sent twice with one
  // delivery key.
  const resendInvite = await first.createFirstAdminInvitation({
    partnerSlug: slugD, operatorUserId: operator.id, replaceCurrent: true,
    values: { fullName: "Resend Admin", email: emailNew, idempotencyKey: crypto.randomUUID() }
  });
  const resendKey = crypto.randomUUID();
  const invitationsBefore = await svc.from("partner_events").select("id")
    .eq("partner_slug", slugD).eq("event_type", "first_admin_invitation_record");
  const resend = await first.sendFirstAdminInvitationEmail({
    partnerSlug: slugD, operatorUserId: operator.id,
    invitationId: resendInvite.invitation.invitationId, setupLink: resendInvite.setupLink,
    deliveryIdempotencyKey: resendKey
  });
  assert.equal(resend.sent, true);
  assert.equal(resend.duplicatePrevented, false);
  const resend2 = await first.sendFirstAdminInvitationEmail({
    partnerSlug: slugD, operatorUserId: operator.id,
    invitationId: resendInvite.invitation.invitationId, setupLink: resendInvite.setupLink,
    deliveryIdempotencyKey: resendKey
  });
  assert.equal(resend2.duplicatePrevented, true);
  const invitationsAfter = await svc.from("partner_events").select("id")
    .eq("partner_slug", slugD).eq("event_type", "first_admin_invitation_record");
  assert.equal(invitationsAfter.data.length, invitationsBefore.data.length);
  assert.equal(invitationsAfter.data.length, 1);
  assert.equal((await svc.from("partner_users").select("id").eq("partner_slug", slugD)).data.length, 0);
  ok("29. email-delivery retry creates no duplicate invitation");

  // Delivery failure. The invitation stays pending and says so.
  const failInvite = await first.createFirstAdminInvitation({
    partnerSlug: slugE, operatorUserId: operator.id, replaceCurrent: true,
    values: { fullName: "Delivery Admin", email: `e-${run}@example.test`, idempotencyKey: crypto.randomUUID() }
  });
  await fetch(`${RELAY}/__fail-next`, { method: "POST" });
  await assert.rejects(
    first.sendFirstAdminInvitationEmail({
      partnerSlug: slugE, operatorUserId: operator.id,
      invitationId: failInvite.invitation.invitationId,
      setupLink: failInvite.setupLink,
      deliveryIdempotencyKey: crypto.randomUUID()
    }),
    (e) => e.code === "delivery_failed"
  );
  const failedView = await first.getFirstAdminAccessView(slugE);
  assert.equal(failedView.invitation.deliveryStatus, "failed");
  assert.equal(failedView.accessStatus, "invitation_pending");
  const failedDelivery = await svc.from("partner_email_deliveries").select("status")
    .eq("partner_slug", slugE).eq("email_type", "first_admin_invitation").order("created_at", { ascending: false }).limit(1);
  assert.equal(failedDelivery.data[0].status, "failed");
  assert.equal((await svc.from("partner_users").select("id").eq("partner_slug", slugE)).data.length, 0);
  ok("30. failed email is presented truthfully");

  console.log(`\nRCAP partner provisioning lifecycle acceptance passed: ${pass} checks.`);
} finally {
  // partner_onboarding_activity is append-only by design: a BEFORE DELETE
  // trigger refuses every row, so deleting a provisioned tenant cannot cascade
  // through it. Cleanup is therefore best-effort, and anything it cannot remove
  // is named rather than silently left behind.
  const stranded = [];
  for (const slug of created.slugs) {
    await svc.from("partner_users").delete().eq("partner_slug", slug);
    await svc.from("partner_email_deliveries").delete().eq("partner_slug", slug);
    await svc.from("partner_events").delete().eq("partner_slug", slug);
    await svc.from("partner_onboarding_tasks").delete().eq("partner_slug", slug);
    await svc.from("partner_onboarding").delete().eq("partner_slug", slug);
    await svc.from("partner_records").delete().eq("partner_slug", slug);
    const { data } = await svc
      .from("partner_records")
      .select("partner_slug")
      .eq("partner_slug", slug)
      .maybeSingle();
    if (data) stranded.push(slug);
  }
  for (const id of created.users) {
    await svc.auth.admin.deleteUser(id).catch(() => {});
  }
  if (stranded.length > 0) {
    console.log("");
    console.log(
      "Synthetic tenants left in place; their append-only onboarding activity refuses deletion:"
    );
    for (const slug of stranded) console.log(`  ${slug}`);
    console.log(
      "Clear them with a privileged session that removes partner_onboarding_activity first, or reset the local stack."
    );
  }
}
