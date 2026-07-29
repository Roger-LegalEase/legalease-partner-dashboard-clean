import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3000";
const partnerSlug = "demo-partner";
const outputDir = path.join(
  root,
  "docs/rcap/onboarding/first-admin-acceptance"
);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "Set the local Supabase URL, anon key, and service-role key inline."
  );
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(supabaseUrl).hostname)) {
  throw new Error("Acceptance capture only runs against loopback Supabase.");
}

const runId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const internalEmail = `first-admin-operator-${runId}@example.test`;
const invitedEmail = `first-admin-partner-${runId}@example.test`;
const internalPassword = `Local-Operator-${runId}!7`;
const partnerPassword = `Local-Partner-${runId}!9`;
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const createdAuthUserIds = new Set();
const browserErrors = [];
let devServer;
let browser;

fs.mkdirSync(outputDir, { recursive: true });

try {
  await resetFirstAdminFixture();
  await seedInternalAdmin();
  devServer = startDevServer();
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const adminPage = await adminContext.newPage();
  observe(adminPage, "operator");

  await adminPage.goto(
    `${baseUrl}/sign-in?next=/internal/partners/provisioning/${partnerSlug}`
  );
  await adminPage.getByLabel("Email").fill(internalEmail);
  await adminPage.getByLabel("Password").fill(internalPassword);
  await adminPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await adminPage.waitForURL(
    `${baseUrl}/internal/partners/provisioning/${partnerSlug}`
  );
  await adminPage.getByText("No administrator configured", { exact: true }).first().waitFor();
  await capture(adminPage, "01-no-administrator.png");

  await adminPage
    .getByRole("button", { name: "Create administrator invitation" })
    .click();
  await adminPage.getByLabel("Full name").fill("Jordan Taylor");
  await adminPage.getByLabel("Work email").fill(invitedEmail);
  await adminPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  await adminPage
    .getByRole("heading", { name: "Review administrator access" })
    .waitFor();
  await capture(adminPage, "02-operator-review.png");

  await adminPage
    .getByRole("button", { name: "Confirm and create invitation" })
    .click();
  const setupInput = adminPage.getByLabel("Secure setup link");
  await setupInput.waitFor();
  const revokedSetupLink = await setupInput.inputValue();
  assert.match(revokedSetupLink, /^http:\/\/127\.0\.0\.1:3000\/partner\/setup\?token=/);
  await redactSetupLink(setupInput);
  await capture(adminPage, "03-pending-secure-link.png");

  await adminPage.getByRole("button", { name: "Revoke invitation" }).click();
  await adminPage
    .getByText("Invitation revoked. Its setup link can no longer be used.")
    .waitFor();
  const revokedContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const revokedPage = await revokedContext.newPage();
  observe(revokedPage, "revoked");
  await revokedPage.goto(revokedSetupLink);
  await revokedPage.getByText("This invite link is no longer active.").waitFor();
  await capture(revokedPage, "04-revoked-link-rejected.png");
  await revokedContext.close();

  await adminPage
    .getByRole("button", { name: "Resend / replace invitation" })
    .click();
  await adminPage.getByLabel("Work email").fill(invitedEmail);
  await adminPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  await adminPage
    .getByRole("button", { name: "Confirm and replace invitation" })
    .click();
  await setupInput.waitFor();
  const activeSetupLink = await setupInput.inputValue();

  const partnerContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const partnerPage = await partnerContext.newPage();
  observe(partnerPage, "partner");
  await partnerPage.goto(activeSetupLink);
  await partnerPage
    .getByRole("heading", { name: "Set your LegalEase password" })
    .waitFor();
  await partnerPage.getByLabel("New password").waitFor();
  await capture(partnerPage, "05-real-password-setup.png");

  await partnerPage.getByLabel("New password").fill(partnerPassword);
  await partnerPage.getByLabel("Confirm password").fill(partnerPassword);
  await partnerPage.getByRole("button", { name: "Set password" }).click();
  await partnerPage.waitForURL(`${baseUrl}/partner/onboarding`, {
    timeout: 30_000
  });
  await partnerPage
    .getByText("Partner onboarding", { exact: false })
    .first()
    .waitFor();
  await capture(partnerPage, "06-accepted-partner-onboarding.png");

  await adminPage.reload();
  await adminPage.getByText("Administrator active", { exact: true }).first().waitFor();
  await assertAcceptedMembership();
  await partnerContext.close();
  await adminContext.close();

  assert.deepEqual(
    browserErrors,
    [],
    `Browser console/network errors:\n${browserErrors.join("\n")}`
  );
  console.log(`Captured six real first-admin screens in ${path.relative(root, outputDir)}.`);
} finally {
  if (browser) await browser.close();
  if (devServer) await stopDevServer(devServer);
  await resetFirstAdminFixture();
}

async function resetFirstAdminFixture() {
  const eventResult = await client
    .from("partner_events")
    .select("event_payload")
    .eq("partner_slug", partnerSlug)
    .like("event_type", "first_admin%");
  if (!eventResult.error) {
    for (const row of eventResult.data) {
      const authUserId = row.event_payload?.auth_user_id;
      if (typeof authUserId === "string") createdAuthUserIds.add(authUserId);
    }
  }
  const partnerUsers = await client
    .from("partner_users")
    .select("auth_user_id")
    .eq("partner_slug", partnerSlug);
  if (!partnerUsers.error) {
    for (const row of partnerUsers.data) createdAuthUserIds.add(row.auth_user_id);
  }
  await client
    .from("partner_events")
    .delete()
    .eq("partner_slug", partnerSlug)
    .in("event_type", [
      "first_admin_invitation_record",
      "first_admin_invitation_created",
      "first_admin_invitation_delivery_requested",
      "first_admin_invitation_delivery_succeeded",
      "first_admin_invitation_delivery_failed",
      "first_admin_invitation_replaced",
      "first_admin_invitation_revoked",
      "first_admin_invitation_expired",
      "first_admin_invitation_claimed",
      "first_admin_invitation_accepted",
      "first_admin_replay_prevented"
    ]);
  await client
    .from("partner_events")
    .delete()
    .eq("partner_slug", partnerSlug)
    .eq("event_type", "partner_admin_membership_created");
  await client.from("partner_users").delete().eq("partner_slug", partnerSlug);

  const users = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!users.error) {
    for (const user of users.data.users) {
      if (
        createdAuthUserIds.has(user.id) ||
        user.email === internalEmail ||
        user.email === invitedEmail
      ) {
        await client.auth.admin.deleteUser(user.id);
      }
    }
  }
}

async function seedInternalAdmin() {
  const created = await client.auth.admin.createUser({
    email: internalEmail,
    password: internalPassword,
    email_confirm: true,
    user_metadata: { name: "Local First Admin Operator" }
  });
  assert.equal(created.error, null, created.error?.message);
  assert.ok(created.data.user);
  createdAuthUserIds.add(created.data.user.id);
  const membership = await client.from("partner_users").insert({
    auth_user_id: created.data.user.id,
    partner_slug: null,
    role: "internal_admin",
    status: "active",
    invited_email: internalEmail
  });
  assert.equal(membership.error, null, membership.error?.message);
}

function startDevServer() {
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: baseUrl,
        RCAP_PARTNER_ONBOARDING_ENABLED: "true",
        RCAP_ONBOARDING_PREFILL_ENABLED: "true",
        PARTNER_EMAIL_DELIVERY_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/sign-in`);
      if (response.ok) return;
    } catch {
      // Continue until Next is accepting loopback requests.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next dev server did not become ready.");
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`${label} pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      browserErrors.push(
        `${label} response: ${response.status()} ${response.url()}`
      );
    }
  });
}

async function capture(page, fileName) {
  assert.ok(
    !page.url().includes("__first-admin-harness"),
    "Acceptance capture must never use a harness route."
  );
  await page.screenshot({
    path: path.join(outputDir, fileName),
    fullPage: true
  });
}

async function redactSetupLink(locator) {
  await locator.evaluate((element) => {
    element.style.filter = "blur(7px)";
  });
}

async function assertAcceptedMembership() {
  const membership = await client
    .from("partner_users")
    .select("partner_slug, role, status, invited_email")
    .eq("partner_slug", partnerSlug);
  assert.equal(membership.error, null, membership.error?.message);
  assert.deepEqual(membership.data, [
    {
      partner_slug: partnerSlug,
      role: "partner_admin",
      status: "active",
      invited_email: invitedEmail
    }
  ]);
}

async function stopDevServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
