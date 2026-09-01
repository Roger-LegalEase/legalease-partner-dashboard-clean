import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Set loopback Supabase URL, service-role key, and anon key.");
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(supabaseUrl).hostname)) {
  throw new Error("Platform launch-rails database tests only run against loopback Supabase.");
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const run = `${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
const password = `Rails-${randomUUID()}!9a`;
const ids = {
  partnerA: randomUUID(), partnerB: randomUUID(),
  adminA: randomUUID(), adminA2: randomUUID(), staffA: randomUUID(), viewerA: randomUUID(),
  adminB: randomUUID(), participantA: randomUUID(), participantB: randomUUID(),
  eventA: randomUUID(), eventB: randomUUID(), screeningA: randomUUID(), screeningScoped: randomUUID()
};
const slugs = { a: `rails-a-${run}`, b: `rails-b-${run}` };
const users = [
  [ids.adminA, `admin-a-${run}@example.test`],
  [ids.adminA2, `admin-a2-${run}@example.test`],
  [ids.staffA, `staff-a-${run}@example.test`],
  [ids.viewerA, `viewer-a-${run}@example.test`],
  [ids.adminB, `admin-b-${run}@example.test`],
  [ids.participantA, `participant-a-${run}@example.test`],
  [ids.participantB, `participant-b-${run}@example.test`]
];
let codeId = null;
let assistedSessionId = null;
let workspaceA = null;
let storagePath = null;

try {
  await seed();
  await verifyMembershipAuthority();
  await verifyAccessCodeAuthority();
  await verifyClinicConsentAndReporting();
  await verifyDirectApiAndStorageDenials();
  await verifyAuditEvidence();
} finally {
  await cleanup();
}

console.log("RCAP platform launch-rails local Supabase verification passed (26 assertions).");
console.log("Membership, code scope/lifecycle, Clinic consent/export, direct API, and private Storage boundaries passed.");

async function seed() {
  for (const [id, email] of users) {
    const created = await db.auth.admin.createUser({ id, email, password, email_confirm: true });
    assert.equal(created.error, null, created.error?.message);
  }
  await must(db.from("partner_records").insert([
    partnerRecord(ids.partnerA, slugs.a, "A"), partnerRecord(ids.partnerB, slugs.b, "B")
  ]));
  const onboarding = await must(db.from("partner_onboarding").insert([
    { partner_slug: slugs.a, status: "setup_in_progress" },
    { partner_slug: slugs.b, status: "setup_in_progress" }
  ]).select("id,partner_slug"));
  workspaceA = onboarding.data.find((row) => row.partner_slug === slugs.a)?.id ?? null;
  assert.ok(workspaceA);

  await must(db.from("partner_users").insert([
    member(ids.adminA, slugs.a, "partner_admin", users[0][1]),
    member(ids.adminA2, slugs.a, "partner_admin", users[1][1]),
    member(ids.staffA, slugs.a, "partner_staff", users[2][1]),
    member(ids.viewerA, slugs.a, "partner_viewer", users[3][1]),
    member(ids.adminB, slugs.b, "partner_admin", users[4][1])
  ]));
  const events = await must(db.from("clinic_events").insert([
    clinicEvent(ids.eventA, slugs.a, ids.adminA, `event-a-${run}`),
    clinicEvent(ids.eventB, slugs.b, ids.adminB, `event-b-${run}`)
  ]));
  assert.equal(events.error, null);
}

async function verifyMembershipAuthority() {
  const membershipRows = await must(db.from("partner_users").select("id,auth_user_id")
    .in("auth_user_id", [ids.adminA, ids.adminA2, ids.staffA, ids.viewerA]));
  const byUser = Object.fromEntries(membershipRows.data.map((row) => [row.auth_user_id, row.id]));

  assert.equal(await membershipOutcome(ids.staffA, slugs.a, byUser[ids.viewerA], "change_role", "partner_staff"), "forbidden");
  assert.equal(await membershipOutcome(ids.adminA, slugs.b, byUser[ids.viewerA], "change_role", "partner_staff"), "forbidden");
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.viewerA], "change_role", "partner_staff"), "role_changed");
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.viewerA], "change_role", "partner_staff"), "unchanged");
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.staffA], "revoke", null), "revoked");
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.staffA], "revoke", null), "already_revoked");
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.adminA], "revoke", null), "self_admin_protected");

  await must(db.from("partner_users").update({ status: "disabled" }).eq("auth_user_id", ids.adminA2));
  assert.equal(await membershipOutcome(ids.adminA, slugs.a, byUser[ids.adminA], "change_role", "partner_viewer"), "self_admin_protected");
  const offboarded = await must(db.from("partner_users").select("status,revoked_at").eq("auth_user_id", ids.staffA).single());
  assert.equal(offboarded.data.status, "disabled");
  assert.ok(offboarded.data.revoked_at);
}

async function verifyAccessCodeAuthority() {
  const denied = await createCode(ids.staffA, slugs.a, ids.eventA);
  assert.ok(denied.error, "non-admin code creation must fail");
  const crossTenant = await createCode(ids.adminA, slugs.a, ids.eventB);
  assert.ok(crossTenant.error, "cross-tenant event scope must fail");

  const created = await createCode(ids.adminA, slugs.a, ids.eventA);
  assert.equal(created.error, null, created.error?.message);
  codeId = created.data;
  assert.match(codeId, /^[0-9a-f-]{36}$/i);
  const draft = await must(db.from("partner_access_codes")
    .select("lifecycle_status,is_active,program_id,event_id,jurisdictions")
    .eq("id", codeId).single());
  assert.deepEqual(draft.data, {
    lifecycle_status: "draft", is_active: false, program_id: "record-clearing",
    event_id: ids.eventA, jurisdictions: ["DC"]
  });

  assert.equal(await lifecycle("live"), "partner_not_launch_ready");
  await must(db.from("partner_records").update({ provisioning_status: "active" }).eq("partner_slug", slugs.a));
  await must(db.from("partner_onboarding").update({
    status: "live", landing_page_ready: true,
    internal_approved_at: new Date().toISOString(), launched_at: new Date().toISOString()
  }).eq("partner_slug", slugs.a));
  assert.equal(await lifecycle("live"), "updated");

  const wrongGeography = await db.from("screening_sessions").insert({
    session_id: randomUUID(), jurisdiction: "MD", partner_slug: slugs.a, flow_mode: "rcap",
    partner_benefit_active: true, partner_access_code_id: codeId
  });
  assert.ok(wrongGeography.error, "out-of-scope geography must fail in the database transaction");
  await must(db.from("screening_sessions").insert({
    session_id: ids.screeningScoped, jurisdiction: "DC", partner_slug: slugs.a,
    flow_mode: "rcap", partner_benefit_active: true, partner_access_code_id: codeId
  }));
  const scoped = await must(db.from("screening_sessions")
    .select("program_id,event_id,campaign_name").eq("session_id", ids.screeningScoped).single());
  assert.deepEqual(scoped.data, { program_id: "record-clearing", event_id: ids.eventA, campaign_name: "Launch Clinic" });
  assert.equal(await lifecycle("revoked"), "updated");
  assert.equal(await lifecycle("live"), "already_revoked");
}

async function verifyClinicConsentAndReporting() {
  await must(db.from("partner_users").update({ status: "active" }).eq("auth_user_id", ids.staffA));
  const staffMembership = await must(db.from("partner_users").select("id").eq("auth_user_id", ids.staffA).single());
  const staff = await must(db.from("clinic_event_staff").insert({
    event_id: ids.eventA, partner_user_id: staffMembership.data.id, status: "approved",
    permissions: ["assist", "reporting"], approved_by: ids.adminA
  }).select("id").single());
  await must(db.from("clinic_events").update({ status: "published" }).eq("id", ids.eventA));
  await must(db.from("screening_sessions").insert({
    session_id: ids.screeningA, jurisdiction: "DC", partner_slug: slugs.a,
    flow_mode: "rcap", partner_benefit_active: true
  }));

  const started = await db.rpc("clinic_start_scoped_assisted_session", {
    p_event_id: ids.eventA, p_event_staff_id: staff.data.id,
    p_participant_user_id: ids.participantA, p_screening_session_id: ids.screeningA,
    p_handoff_token_hash: hash(`handoff-${run}`), p_device_nonce_hash: hash(`device-${run}`),
    p_consent_version: "clinic-assistance-v2",
    p_consent_scope: ["screening_navigation", "screening_answers"],
    p_consented_at: new Date().toISOString(), p_ttl_minutes: 30
  });
  assert.equal(started.error, null, started.error?.message);
  assistedSessionId = started.data;
  const consent = await must(db.from("clinic_assisted_sessions")
    .select("participant_user_id,event_staff_id,consent_scope,consented_at,consent_revoked_at,status")
    .eq("id", assistedSessionId).single());
  assert.equal(consent.data.participant_user_id, ids.participantA);
  assert.deepEqual(consent.data.consent_scope, ["screening_answers", "screening_navigation"]);
  assert.equal(consent.data.status, "active");

  const wrongParticipant = await db.rpc("clinic_end_assisted_session", {
    p_session_id: assistedSessionId, p_actor_user_id: ids.participantB, p_reason: "participant_request"
  });
  assert.equal(wrongParticipant.data, "forbidden");
  const ended = await db.rpc("clinic_end_assisted_session", {
    p_session_id: assistedSessionId, p_actor_user_id: ids.participantA, p_reason: "participant_request"
  });
  assert.equal(ended.data, "ended");
  const revoked = await must(db.from("clinic_assisted_sessions")
    .select("status,consent_revoked_at,consent_revoked_by").eq("id", assistedSessionId).single());
  assert.equal(revoked.data.status, "ended");
  assert.ok(revoked.data.consent_revoked_at);
  assert.equal(revoked.data.consent_revoked_by, ids.participantA);

  const report = await db.rpc("clinic_export_event_report", { p_event_id: ids.eventA, p_actor_user_id: ids.staffA });
  assert.equal(report.error, null, report.error?.message);
  assert.equal(report.data.eventId, ids.eventA);
  const crossTenant = await db.rpc("clinic_export_event_report", { p_event_id: ids.eventA, p_actor_user_id: ids.adminB });
  assert.ok(crossTenant.error, "another tenant must not export the event report");
}

async function verifyDirectApiAndStorageDenials() {
  const browser = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const signIn = await browser.auth.signInWithPassword({ email: users[0][1], password });
  assert.equal(signIn.error, null, signIn.error?.message);
  const directMembership = await browser.rpc("manage_partner_membership", {
    p_actor_user_id: ids.adminA, p_partner_slug: slugs.a, p_member_id: randomUUID(),
    p_action: "revoke", p_role: null
  });
  assert.ok(directMembership.error, "authenticated browser must not execute service-only membership RPC");

  storagePath = `partners/${ids.partnerA}/onboarding/${workspaceA}/logo/${randomUUID()}.png`;
  const uploaded = await db.storage.from("rcap-partner-onboarding-private")
    .upload(storagePath, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png", upsert: false });
  assert.equal(uploaded.error, null, uploaded.error?.message);
  const anonymousDownload = await browser.storage.from("rcap-partner-onboarding-private").download(storagePath);
  assert.ok(anonymousDownload.error, "browser-authenticated partner must not directly download private Storage objects");
  const signed = await db.storage.from("rcap-partner-onboarding-private").createSignedUrl(storagePath, 60);
  assert.equal(signed.error, null, signed.error?.message);
  const allowed = await fetch(signed.data.signedUrl);
  assert.equal(allowed.status, 200);
  const tampered = new URL(signed.data.signedUrl);
  tampered.pathname = tampered.pathname.replace(/[^/]+\.png$/u, `${randomUUID()}.png`);
  const denied = await fetch(tampered);
  assert.notEqual(denied.status, 200, "signed URL token must remain bound to the exact object path");
  await browser.auth.signOut();
}

async function verifyAuditEvidence() {
  const membershipAudit = await must(db.from("rcap_record_events").select("event_type")
    .eq("partner_slug", slugs.a).eq("record_type", "partner_membership"));
  assert.ok(membershipAudit.data.some((row) => row.event_type === "partner_membership_revoked"));
  const codeAudit = await must(db.from("rcap_record_events").select("event_type")
    .eq("partner_slug", slugs.a).eq("record_type", "partner_access_code"));
  assert.ok(codeAudit.data.some((row) => row.event_type === "partner_code_created"));
  assert.ok(codeAudit.data.some((row) => row.event_type === "partner_code_revoked"));
  const clinicAudit = await must(db.from("clinic_event_audit").select("action").eq("event_id", ids.eventA));
  for (const action of ["assistance_consented", "assistance_consent_revoked", "report_exported"]) {
    assert.ok(clinicAudit.data.some((row) => row.action === action), `${action} audit event missing`);
  }
}

async function membershipOutcome(actor, slug, memberId, action, role) {
  const result = await db.rpc("manage_partner_membership", {
    p_actor_user_id: actor, p_partner_slug: slug, p_member_id: memberId,
    p_action: action, p_role: role
  });
  assert.equal(result.error, null, result.error?.message);
  return (Array.isArray(result.data) ? result.data[0] : result.data)?.outcome;
}

async function createCode(actor, slug, eventId) {
  return db.rpc("create_partner_access_code", {
    p_actor_user_id: actor, p_partner_slug: slug, p_code_hash: hash(`code-${actor}-${eventId}`),
    p_code_display_hint: "••••CODE", p_campaign_name: "Launch Clinic", p_description: "Local acceptance",
    p_code_type: "limited_use", p_max_uses: 2, p_jurisdictions: ["DC"],
    p_program_id: null, p_event_id: eventId, p_starts_at: null,
    p_expires_at: new Date(Date.now() + 86_400_000).toISOString()
  });
}

async function lifecycle(status) {
  const result = await db.rpc("set_partner_access_code_lifecycle", {
    p_actor_user_id: ids.adminA, p_partner_slug: slugs.a, p_code_id: codeId, p_status: status
  });
  assert.equal(result.error, null, result.error?.message);
  return result.data;
}

function partnerRecord(id, slug, suffix) {
  return {
    partner_id: id, partner_slug: slug, partner_name: `Rails Partner ${suffix}`,
    organization_name: `Rails Organization ${suffix}`, state: "DC", target_state: "DC",
    program_tier: "implementation", payment_status: "paid", qualification_status: "qualified",
    provisioning_status: "provisioned", access_mode: "required_code"
  };
}

function member(authUserId, partnerSlug, role, email) {
  return { auth_user_id: authUserId, partner_slug: partnerSlug, role, status: "active", invited_email: email };
}

function clinicEvent(id, partnerSlug, createdBy, publicSlug) {
  return {
    id, partner_slug: partnerSlug, program_key: "record-clearing", public_slug: publicSlug,
    name: `Launch Clinic ${publicSlug}`, starts_at: new Date(Date.now() - 3_600_000).toISOString(),
    ends_at: new Date(Date.now() + 86_400_000).toISOString(), timezone: "America/New_York",
    location_name: "Local acceptance", geography: "District of Columbia", capacity: 100,
    status: "draft", sponsorship_allocation: 25, created_by: createdBy
  };
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function must(promise) {
  const result = await promise;
  assert.equal(result.error, null, result.error?.message);
  return result;
}

async function cleanup() {
  if (storagePath) await db.storage.from("rcap-partner-onboarding-private").remove([storagePath]);
  // Audit tables are intentionally append-only. Each run uses unique tenant,
  // event, user, and object identifiers and the harness is restricted to an
  // ephemeral loopback stack, so preserving its evidence is the safe cleanup.
}
