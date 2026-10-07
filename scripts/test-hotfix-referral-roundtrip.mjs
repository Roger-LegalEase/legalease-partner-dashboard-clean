// Disposable loopback Auth/Postgres only. No invitation or delivery calls.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { register } from "node:module";
import { request } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "127.0.0.1", "Loopback only");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { provisionPartner } = await import("../src/lib/partners/partner-provisioning-service.ts");
const service = await import("../src/lib/partners/onboarding/service.ts");
const BASE = process.env.JOURNEY_BASE_URL ?? "http://127.0.0.1:3139";
assert.equal(new URL(BASE).hostname, "127.0.0.1", "Loopback app only");
const run = Date.now().toString(36), slugs = [], users = [], passwords = new Map(), requests = [];
async function session(user) {
  const cookies = new Map();
  const auth = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: items => items.forEach(c => cookies.set(c.name, c.value)) } });
  assert.equal((await auth.auth.signInWithPassword({ email: user.email, password: passwords.get(user.id) })).error, null);
  const api = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "), origin: BASE } });
  requests.push(api);
  return { api, auth };
}
async function load(api) {
  const response = await api.get("/api/partners/onboarding/workspace");
  assert.equal(response.status(), 200);
  return (await response.json()).onboarding;
}
async function user(label) {
  const password = `Test-${randomBytes(16).toString("hex")}!9`;
  const result = await db.auth.admin.createUser({ email: `${label}-${run}@example.test`, password, email_confirm: true });
  assert.equal(result.error, null);
  users.push(result.data.user.id);
  passwords.set(result.data.user.id, password);
  return result.data.user;
}
async function save(api, sectionKey, data, mode = "draft_save") {
  const portal = await load(api);
  const section = portal.sections.find(s => s.key === sectionKey);
  const response = await api.post(`/api/partners/onboarding/sections/${sectionKey}`, { data: { expectedRevision: section.revision, expectedWorkspaceVersion: portal.workspace.aggregateVersion, requestId: crypto.randomUUID(), mode, data } });
  const result = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(result));
  return result;
}
try {
  const operator = await user("referral-operator");
  assert.equal((await db.from("partner_users").insert({ auth_user_id: operator.id, partner_slug: null, role: "internal_admin", status: "active" })).error, null);
  for (let index = 0; index < 2; index++) {
    const slug = `referral-${index}-${run}`;
    slugs.push(slug);
    await provisionPartner({ operatorUserId: operator.id, values: { organizationName: "Referral Test", legalOrganizationName: "Referral Test LLC", partnerSlug: slug, programName: "Isolated referral test", programPurpose: "Local policy round-trip verification only.", administratorName: "Synthetic Administrator", administratorEmail: `unissued-${index}-${run}@example.test`, clearanceReason: "Isolated authorized provisioning test.", idempotencyKey: crypto.randomUUID() } });
    const workspace = await db.from("partner_onboarding").select("id,aggregate_version").eq("partner_slug", slug).single();
    assert.equal(workspace.error, null);
    await service.applyInternalOnboardingReview({ authUserId: operator.id, partnerSlug: slug, role: "internal_admin" }, { workspaceId: workspace.data.id, expectedWorkspaceVersion: workspace.data.aggregate_version, requestId: crypto.randomUUID(), operation: { action: "commercial_gate", outcome: "cleared_by_authorized_internal_override", overrideReason: "Local policy round-trip verification." } });
  }
  const partner = await user("referral-partner");
  assert.equal((await db.from("partner_users").insert({ auth_user_id: partner.id, partner_slug: slugs[0], role: "partner_admin", status: "active" })).error, null);
  const { api, auth } = await session(partner);
  const originalFixture = artifactSourceFixture();
  const rowIds = new Map([
    ...originalFixture.data.organization_contacts.contacts,
    ...originalFixture.data.staff_dashboard_plan.planned_users,
    ...originalFixture.data.support_referrals_reporting.report_recipients
  ].map(row => [row.stable_row_id, crypto.randomUUID()]));
  const fixture = JSON.parse(JSON.stringify(originalFixture, (key, value) => typeof value === "string" && rowIds.has(value) ? rowIds.get(value) : value));
  await save(api, "organization_contacts", fixture.data.organization_contacts);
  // Complete legacy data still saves through the actual JSON RPC unchanged.
  await save(api, "support_referrals_reporting", fixture.data.support_referrals_reporting, "section_complete");
  for (const mode of ["established_organization", "general_resources", "no_referrals"]) {
    const support = { ...fixture.data.support_referrals_reporting, referral_arrangement: mode, contested_matter_procedure: `${fixture.data.support_referrals_reporting.contested_matter_procedure} Staff notify the participant and the internal program lead.` };
    await save(api, "support_referrals_reporting", support, "section_complete");
    const reloaded = await load(api);
    assert.equal(reloaded.data.support_referrals_reporting.referral_arrangement, mode);
    assert.equal(reloaded.data.support_referrals_reporting.legal_services_referral_organization, support.legal_services_referral_organization, "Inactive history is retained");
  }
  const otherRead = await auth.from("partner_onboarding_workspace_safe").select("id").eq("partner_slug", slugs[1]);
  assert.equal(otherRead.error, null);assert.equal(otherRead.data.length, 0);
  const otherWorkspace = await db.from("partner_onboarding").select("id").eq("partner_slug", slugs[1]).single();assert.equal(otherWorkspace.error, null);
  const before = await db.from("partner_onboarding_sections").select("response_data,revision").eq("workspace_id", otherWorkspace.data.id).eq("section_key", "support_referrals_reporting").single();assert.equal(before.error, null);
  const portal = await load(api);
  const attempted = await api.post("/api/partners/onboarding/sections/support_referrals_reporting", { data: { partnerSlug: slugs[1], workspaceId: crypto.randomUUID(), expectedRevision: portal.sections.find(s=>s.key==="support_referrals_reporting").revision, expectedWorkspaceVersion: portal.workspace.aggregateVersion, requestId: crypto.randomUUID(), mode: "draft_save", data: { ...portal.data.support_referrals_reporting, referral_arrangement: "general_resources" } } });
  assert.equal(attempted.status(), 200); // Client tenant selectors grant no authority.
  const after = await db.from("partner_onboarding_sections").select("response_data,revision").eq("workspace_id", otherWorkspace.data.id).eq("section_key", "support_referrals_reporting").single();assert.equal(after.error, null);assert.deepEqual(after.data, before.data);
  const staff = await user("referral-staff");assert.equal((await db.from("partner_users").insert({ auth_user_id: staff.id, partner_slug: slugs[0], role: "partner_staff", status: "active" })).error, null);
  const staffSession = await session(staff);
  assert.equal((await staffSession.api.post("/api/partners/onboarding/sections/support_referrals_reporting", { data: {} })).status(), 403);
  const anonymous = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });requests.push(anonymous);
  assert.equal((await anonymous.post("/api/partners/onboarding/sections/support_referrals_reporting", { data: {} })).status(), 401);
  console.log("Actual JSON writer: legacy and all three modes save/reload; inactive history retained; staff/cross-tenant writes denied PASS");
} finally {
  for (const api of requests) await api.dispose();
  let retained = 0;
  for (const slug of slugs) {
    await db.from("partner_users").delete().eq("partner_slug", slug);
    if ((await db.from("partner_records").delete().eq("partner_slug", slug)).error) retained++;
  }
  for (const id of users) { await db.from("partner_users").delete().eq("auth_user_id", id); if ((await db.auth.admin.deleteUser(id)).error) retained++; }
  if (retained) console.log("Disposable synthetic fixtures retained by audit/foreign-key protections; no protections disabled.");
}
