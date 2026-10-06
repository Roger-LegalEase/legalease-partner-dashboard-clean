#!/usr/bin/env node
// One focused browser journey for RCAP partner provisioning:
//
//   internal operator provisioning
//     -> existing-user invitation acceptance
//     -> Implementation Center landing
//
// Deliberately narrow. The portal's responsive and accessibility matrix has its
// own suites; what is unproven without a browser is that the three surfaces
// actually hand off to each other, that the operator never sees a raw
// identifier or a claim that provisioning means launch, and that following the
// emailed link with an existing confirmed account creates no second Auth user
// and leaks no token into a URL.
//
// Loopback only. It creates and deletes a synthetic tenant and synthetic users.
//
//   npm run partners:journey-provisioning
//
// Requires a running application (JOURNEY_BASE_URL, default
// http://127.0.0.1:3139) whose NEXT_PUBLIC_PARTNER_APP_URL is that same origin,
// a loopback Supabase stack, and Mailpit on MAILPIT_URL.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { register } from "node:module";
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.JOURNEY_BASE_URL ?? "http://127.0.0.1:3139";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SHOTS = process.env.JOURNEY_SCREENSHOT_DIR ?? `/tmp/legalease-provisioning-${Date.now()}`;
mkdirSync(SHOTS, { recursive: true });
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { applyInternalOnboardingReview } = await import("../src/lib/partners/onboarding/service.ts");
const PW = "Journey-Passw0rd!";
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(BASE).hostname)) {
  throw new Error("This journey only runs against a loopback application.");
}
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !["127.0.0.1", "localhost", "::1"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  )
) {
  throw new Error("This journey only runs against a loopback Supabase stack.");
}
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const run = `${Date.now().toString(36)}`;
const slug = `journey-${run}`;
const newSlug = `journey-new-${run}`;
const adminEmail = `journey-admin-${run}@example.test`;
const operatorEmail = `journey-operator-${run}@legalease.test`;
const cleanupUsers = [];

async function mkUser(email) {
  const { data, error } = await svc.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw error;
  cleanupUsers.push(data.user.id);
  return data.user;
}

const browser = await (process.argv.includes("--webkit") ? webkit : chromium).launch();
try {
  const operator = await mkUser(operatorEmail);
  await svc.from("partner_users").insert({
    auth_user_id: operator.id, partner_slug: null, role: "internal_admin", status: "active"
  });
  // The administrator already has exactly one confirmed account. This is the
  // production canary's identity state.
  await mkUser(adminEmail);
  // Capture this run's synthetic recipient only; preserve other agents' mail.

  // --- internal operator provisioning ------------------------------------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE}/sign-in?next=/internal/partners/provisioning`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', operatorEmail);
  await page.fill('input[name="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/internal/partners/provisioning", { timeout: 30000 });
  const beforeTotal = Number(await page.getByText("Total partners", { exact: true }).locator("..").locator("p").first().textContent());
  if (beforeTotal === 0) await page.getByText("No partner records yet. Provision a new partner to begin.").waitFor();
  await page.getByRole("link", { name: "Provision a new partner" }).click();
  await page.waitForSelector('[data-provisioning-state="details"]');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => Object.keys(document.querySelector('input[name=partnerSlug]') ?? {}).some(key => key.startsWith('__reactProps')));
  console.log("  ok  operator reaches the provisioning form");

  await page.fill('input[name="organizationName"]', "Journey Org");
  await page.fill('input[name="legalOrganizationName"]', "Journey Org LLC");
  await page.fill('input[name="partnerSlug"]', slug);
  await page.fill('input[name="programName"]', "Journey RCAP Acceptance");
  await page.fill('textarea[name="programPurpose"]', "Record clearing support for the journey acceptance cohort.");
  await page.fill('input[name="administratorName"]', "Journey Administrator");
  await page.fill('input[name="administratorEmail"]', adminEmail);
  await page.fill('textarea[name="clearanceReason"]', "Local browser acceptance for the reviewed provisioning path.");
  await page.fill('input[name="partnerSlug"]', "https://outside.example.test");

  await page.locator("#partner-page-error").filter({hasText:"Enter only the final part"}).waitFor();
  await page.locator('[data-provisioning-state=details] button[type=submit]').click();

  await page.locator('#partner-page-error').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#partner-page-error').textContent()).includes("Enter only the final part"));
  assert.equal(await page.locator('input[name="partnerSlug"]').evaluate(e => e === document.activeElement), true);
  assert.ok((await page.locator('#partner-page-address').textContent()).startsWith(`Resulting address: ${BASE}/p/`));
  await page.fill('input[name="partnerSlug"]', slug);
  await page.locator('[data-provisioning-state=details] button[type=submit]').click();
  await page.waitForSelector('[data-provisioning-state="review"]');
  const reviewText = await page.textContent('[data-provisioning-state="review"]');
  for (const phrase of [
    "Records this creates", "Records this does not create",
    "Publication", "Private", "Program activation", "Inactive",
    "No invitation is sent", "No access code is created", "No billing state"
  ]) {
    assert.ok(reviewText.includes(phrase), `review is missing "${phrase}"`);
  }
  const primaryButtons = await page.locator('[data-provisioning-state="review"] button:has-text("Provision partner")').count();
  assert.equal(primaryButtons, 1, "there must be exactly one primary provisioning action");
  await page.screenshot({ path: `${SHOTS}/journey-1-review.png`, fullPage: true });
  console.log("  ok  the review step shows what is and is not created, with one primary action");

  await page.click('button:has-text("Provision partner")');
  await page.waitForSelector('[data-provisioning-state="complete"]', { timeout: 30000 });
  const doneText = await page.textContent('[data-provisioning-state="complete"]');
  assert.ok(doneText.includes("Provisioning is not launch"));
  assert.ok(doneText.includes("Administrator access"));
  assert.ok(doneText.includes("Not invited"));
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(doneText), "a raw UUID reached the operator");
  await page.screenshot({ path: `${SHOTS}/journey-2-provisioned.png`, fullPage: true });
  console.log("  ok  provisioning completes and never implies launch");

  const workspace = await svc.from("partner_onboarding").select("id,aggregate_version").eq("partner_slug", slug).single();
  assert.equal(workspace.error, null);
  await applyInternalOnboardingReview({ authUserId: operator.id, partnerSlug: slug, role: "internal_admin" }, { workspaceId: workspace.data.id, expectedWorkspaceVersion: workspace.data.aggregate_version, requestId: crypto.randomUUID(), operation: { action: "commercial_gate", outcome: "cleared_by_authorized_internal_override", overrideReason: "Isolated WP-02 unpaid/cleared display test." } });
  const indexPage = await ctx.newPage();
  await indexPage.goto(`${BASE}/internal/partners/provisioning`);
  await indexPage.reload();
  const row = indexPage.locator(`[data-partner-slug="${slug}"]`);
  assert.equal(await row.count(), 1, "Provisioned partner appears exactly once after refresh");
  assert.ok((await row.textContent()).includes("Invoice: Unpaid"));
  assert.ok((await row.textContent()).includes("Commercial clearance: Cleared by authorized override"));
  const afterTotal = Number(await indexPage.getByText("Total partners", { exact: true }).locator("..").locator("p").first().textContent());
  assert.equal(afterTotal, beforeTotal + 1);
  await row.getByRole('link', { name: 'Provisioning detail' }).click();
  await indexPage.waitForURL(`**/internal/partners/provisioning/${slug}`);
  await indexPage.close();
  console.log("  ok  real index, matching totals, separate unpaid/cleared facts and detail link");
  await page.click('button:has-text("Continue to first administrator invitation")');
  await page.waitForURL(`**/internal/partners/provisioning/${slug}`, { timeout: 30000 });
  await page.waitForSelector("text=No administrator configured", { timeout: 30000 });
  console.log("  ok  the operator continues to the existing first-administrator invitation panel");

  // --- first administrator invitation ------------------------------------
  await page.click('button:has-text("Create administrator invitation")');
  await page.waitForSelector('h3:has-text("Create administrator access")');
  await page.fill('label:has-text("Full name") input', "Journey Administrator");
  await page.fill('label:has-text("Work email") input', operatorEmail);
  await page.click('button:has-text("Review administrator access")');
  await page.getByText("This email already has incompatible internal or partner access.", { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Confirm and create invitation' }).count(), 0);
  await page.fill('label:has-text("Work email") input', adminEmail);
  await page.click('button:has-text("Review administrator access")');
  await page.click('button:has-text("Confirm and create invitation")');
  await page.waitForSelector("text=Invitation pending", { timeout: 30000 });
  await page.click('button:has-text("Send invitation")');
  await page.waitForSelector("text=Invitation sent through the configured email provider.", { timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/journey-3-invited.png`, fullPage: true, mask: [page.locator('input[aria-label="Secure setup link"]')] });
  console.log("  ok  one invitation is created and delivered to the local mailbox");

  await new Promise((r) => setTimeout(r, 800));
  const mail = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
  const message = mail.messages.find((m) => m.To.some((t) => t.Address === adminEmail));
  assert.ok(message, "no invitation reached Mailpit");
  const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
  const link = /href="([^"]*\/partner\/setup\?token=[^"]+)"/.exec(full.HTML)[1];
  console.log("  ok  the branded invitation carries the application setup link");

  // --- existing-user acceptance ------------------------------------------
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const adminPage = await adminCtx.newPage();
  const beforeUsers = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.length;
  await adminPage.goto(link, { waitUntil: "networkidle" });
  await adminPage.waitForURL("**/sign-in**", { timeout: 30000 });
  const afterUsers = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.length;
  assert.equal(afterUsers, beforeUsers, "an Auth user was created for an existing account");
  const url = new URL(adminPage.url());
  assert.equal(url.searchParams.get("next"), "/partner/first-admin/claim");
  assert.ok(!url.search.includes("token"), "the token leaked into the sign-in URL");
  await adminPage.screenshot({ path: `${SHOTS}/journey-4-signin.png`, fullPage: true });
  console.log("  ok  an existing confirmed account is sent to the ordinary sign-in, with no Auth call");

  const membershipsBefore = await svc.from("partner_users").select("id").eq("partner_slug", slug);
  assert.equal(membershipsBefore.data.length, 0);

  await adminPage.fill('input[name="email"]', adminEmail);
  await adminPage.fill('input[name="password"]', PW);
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL("**/partner/onboarding", { timeout: 45000 });
  const landing = await adminPage.textContent("body");
  assert.ok(/Implementation/.test(landing), "the administrator did not land on the Implementation Center");
  await adminPage.screenshot({ path: `${SHOTS}/journey-5-implementation-center.png`, fullPage: true });
  console.log("  ok  the invited administrator lands on the Implementation Center");

  const memberships = await svc.from("partner_users").select("id, role, status").eq("partner_slug", slug);
  assert.equal(memberships.data.length, 1);
  assert.equal(memberships.data[0].role, "partner_admin");
  console.log("  ok  exactly one active partner_admin membership exists");

  await adminPage.goto(`${BASE}/internal/partners/provisioning`);
  await adminPage.getByText('Protected administrative workspace').waitFor({state:'hidden'});assert.equal(await adminPage.getByRole('heading',{name:'Partner Provisioning',exact:true}).count(),0);
  const denied = await adminPage.evaluate(async slug => { const r = await fetch(`/api/internal/partners/first-admin/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'validate', email: 'denial@example.test' }) }); return r.status; }, slug);
  assert.equal(denied, 403);
  const anonymous = await browser.newContext();const anonymousPage = await anonymous.newPage();await anonymousPage.goto(`${BASE}/internal/partners/provisioning`);assert.equal(new URL(anonymousPage.url()).pathname, '/sign-in');await anonymous.close();
  console.log("  ok  partner and anonymous index/preflight denial");

  const state = await svc.from("partner_onboarding").select("launched_at, landing_page_ready, internal_approved_at").eq("partner_slug", slug).single();
  assert.equal(state.data.launched_at, null);
  assert.equal(state.data.landing_page_ready, false);
  assert.equal(state.data.internal_approved_at, null);
  const publicPage = await fetch(`${BASE}/p/${slug}`);
  assert.equal(publicPage.status, 404, `public route returned ${publicPage.status}`);
  console.log("  ok  the public participant page still returns 404 after acceptance");

  // The new-identity path must still establish a password and accept the
  // invitation; it is distinct from ordinary recovery and existing sign-in.
  const newEmail = `journey-new-${run}@example.test`;
  const second = await ctx.request.post(`${BASE}/api/internal/partners/provisioning`, { headers: { origin: BASE }, data: { organizationName: "New Identity Journey", legalOrganizationName: "New Identity Journey LLC", partnerSlug: newSlug, programName: "Synthetic new-admin program", programPurpose: "Local new-administrator acceptance verification.", administratorName: "New Administrator", administratorEmail: newEmail, clearanceReason: "Local authorized provisioning test.", idempotencyKey: crypto.randomUUID() } });
  assert.equal(second.status(), 200);
  await page.goto(`${BASE}/internal/partners/provisioning/${newSlug}`);
  await page.getByRole('button', { name: 'Create administrator invitation' }).click();
  await page.fill('label:has-text("Full name") input', "New Administrator");await page.fill('label:has-text("Work email") input', newEmail);
  await page.getByRole('button', { name: 'Review administrator access' }).click();await page.getByRole('button', { name: 'Confirm and create invitation' }).click();
  const setupInput = page.locator('input[aria-label="Secure setup link"]');await setupInput.waitFor();const newLink = await setupInput.inputValue();
  const newCtx = await browser.newContext();const newPage = await newCtx.newPage();await newPage.goto(newLink);await newPage.locator('#new-password').waitFor();
  const newAuth = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find(u => u.email === newEmail);assert.ok(newAuth);cleanupUsers.push(newAuth.id);
  const beforeNewMembership = await svc.from('partner_users').select('id').eq('partner_slug', newSlug);assert.equal(beforeNewMembership.data.length, 0);
  await newPage.fill('#new-password', PW);await newPage.fill('#confirm-password', PW);await newPage.locator('button[type=submit]').click();await newPage.waitForURL('**/partner/onboarding');
  const newMembership = await svc.from('partner_users').select('auth_user_id,role,status').eq('partner_slug', newSlug);assert.equal(newMembership.data.length, 1);assert.equal(newMembership.data[0].auth_user_id, newAuth.id);assert.equal(newMembership.data[0].role, 'partner_admin');await newCtx.close();
  console.log("  ok  new identity sets a password then accepts one membership; existing identity uses ordinary sign-in");
  console.log("\nBrowser journey passed.");
} finally {
  await browser.close();
  for (const tenantSlug of [slug, newSlug]) {
  await svc.from("partner_users").delete().eq("partner_slug", tenantSlug);
  await svc.from("partner_records").delete().eq("partner_slug", tenantSlug);
  }
  const leftoverNew = (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find(u => u.email === `journey-new-${run}@example.test`);
  if (leftoverNew && !cleanupUsers.includes(leftoverNew.id)) cleanupUsers.push(leftoverNew.id);
  await svc.from("partner_users").delete().eq("partner_slug", slug);
  await svc.from("partner_email_deliveries").delete().eq("partner_slug", slug);
  await svc.from("partner_events").delete().eq("partner_slug", slug);
  await svc.from("partner_onboarding_tasks").delete().eq("partner_slug", slug);
  await svc.from("partner_onboarding").delete().eq("partner_slug", slug);
  await svc.from("partner_records").delete().eq("partner_slug", slug);
  for (const id of cleanupUsers) await svc.auth.admin.deleteUser(id).catch(() => {});
}
