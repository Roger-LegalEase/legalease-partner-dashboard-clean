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
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.JOURNEY_BASE_URL ?? "http://127.0.0.1:3139";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SHOTS = process.env.JOURNEY_SCREENSHOT_DIR ?? "/tmp";
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
const adminEmail = `journey-admin-${run}@example.test`;
const operatorEmail = `journey-operator-${run}@legalease.test`;
const cleanupUsers = [];

async function mkUser(email) {
  const { data, error } = await svc.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw error;
  cleanupUsers.push(data.user.id);
  return data.user;
}

const browser = await chromium.launch();
try {
  const operator = await mkUser(operatorEmail);
  await svc.from("partner_users").insert({
    auth_user_id: operator.id, partner_slug: null, role: "internal_admin", status: "active"
  });
  // The administrator already has exactly one confirmed account. This is the
  // production canary's identity state.
  await mkUser(adminEmail);
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });

  // --- internal operator provisioning ------------------------------------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in?next=/internal/partners/provisioning/new`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', operatorEmail);
  await page.fill('input[name="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/internal/partners/provisioning/new", { timeout: 30000 });
  await page.waitForSelector('[data-provisioning-state="details"]');
  console.log("  ok  operator reaches the provisioning form");

  await page.fill('input[name="organizationName"]', "Journey Org");
  await page.fill('input[name="legalOrganizationName"]', "Journey Org LLC");
  await page.fill('input[name="partnerSlug"]', slug);
  await page.fill('input[name="programName"]', "Journey RCAP Acceptance");
  await page.fill('textarea[name="programPurpose"]', "Record clearing support for the journey acceptance cohort.");
  await page.fill('input[name="administratorName"]', "Journey Administrator");
  await page.fill('input[name="administratorEmail"]', adminEmail);
  await page.fill('textarea[name="clearanceReason"]', "Local browser acceptance for the reviewed provisioning path.");
  await page
    .locator('[data-provisioning-state="details"]')
    .getByRole("button", { name: "Review what will be created", exact: true })
    .click();
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

  await page.click('button:has-text("Continue to first administrator invitation")');
  await page.waitForURL(`**/internal/partners/provisioning/${slug}`, { timeout: 30000 });
  await page.waitForSelector("text=No administrator configured", { timeout: 30000 });
  console.log("  ok  the operator continues to the existing first-administrator invitation panel");

  // --- first administrator invitation ------------------------------------
  await page.click('button:has-text("Create administrator invitation")');
  await page.waitForSelector('h3:has-text("Create administrator access")');
  await page.fill('label:has-text("Full name") input', "Journey Administrator");
  await page.fill('label:has-text("Work email") input', adminEmail);
  await page.click('button:has-text("Review administrator access")');
  await page.click('button:has-text("Confirm and create invitation")');
  await page.waitForSelector("text=Invitation pending", { timeout: 30000 });
  await page.click('button:has-text("Send invitation")');
  await page.waitForSelector("text=Invitation sent through the configured email provider.", { timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/journey-3-invited.png`, fullPage: true });
  console.log("  ok  one invitation is created and delivered");

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

  const state = await svc.from("partner_onboarding").select("launched_at, landing_page_ready, internal_approved_at").eq("partner_slug", slug).single();
  assert.equal(state.data.launched_at, null);
  assert.equal(state.data.landing_page_ready, false);
  assert.equal(state.data.internal_approved_at, null);
  const publicPage = await fetch(`${BASE}/p/${slug}`);
  assert.equal(publicPage.status, 404, `public route returned ${publicPage.status}`);
  console.log("  ok  the public participant page still returns 404 after acceptance");

  console.log("\nBrowser journey passed.");
} finally {
  await browser.close();
  await svc.from("partner_users").delete().eq("partner_slug", slug);
  await svc.from("partner_email_deliveries").delete().eq("partner_slug", slug);
  await svc.from("partner_events").delete().eq("partner_slug", slug);
  await svc.from("partner_onboarding_tasks").delete().eq("partner_slug", slug);
  await svc.from("partner_onboarding").delete().eq("partner_slug", slug);
  await svc.from("partner_records").delete().eq("partner_slug", slug);
  for (const id of cleanupUsers) await svc.auth.admin.deleteUser(id).catch(() => {});
}
