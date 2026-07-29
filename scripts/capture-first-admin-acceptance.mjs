// Real first-administrator acceptance capture.
//
// Every screen in this run is a real application screen reached through the
// real flow. Supabase seeding and dev-server lifecycle are the only harness:
// no route, page, or status here is synthesized, and no capture may come from a
// harness route. Screenshots are written outside the repository so nothing
// secret or environment-specific can be committed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3000";
const outputDir =
  process.env.FIRST_ADMIN_CAPTURE_DIR ?? "/tmp/rcap-first-admin-visual-review";
const primaryPartner = "demo-partner";
const secondPartner = "fulton-county";
const thirdPartner = "we-must-vote";

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
const operatorEmail = `first-admin-operator-${runId}@example.test`;
const operatorPassword = `Local-Operator-${runId}!7`;
const primaryAdminEmail = `first-admin-primary-${runId}@example.test`;
const primaryAdminPassword = `Local-Primary-${runId}!9`;
const secondAdminEmail = `first-admin-second-${runId}@example.test`;
const thirdAdminEmail = `first-admin-third-${runId}@example.test`;
const thirdAdminPassword = `Local-Third-${runId}!5`;
const managedPartners = [primaryPartner, secondPartner, thirdPartner];
const managedEmails = [
  operatorEmail,
  primaryAdminEmail,
  secondAdminEmail,
  thirdAdminEmail
];

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const pageProblems = [];
const captures = [];
const ignoredConsolePatterns = [
  /Download the React DevTools/i,
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404/i
];

let browser;
let devServer;

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

try {
  await resetFixture();
  await seedFixture();
  browser = await chromium.launch({ headless: true });

  devServer = await startDevServer({ onboardingEnabled: true });
  const flagOn = await runOnboardingEnabledPhase();
  await stopDevServer(devServer);
  devServer = null;

  devServer = await startDevServer({ onboardingEnabled: false });
  await runOnboardingDisabledPhase(flagOn);
  await stopDevServer(devServer);
  devServer = null;

  writeScreenshotIndex();
  assert.deepEqual(
    pageProblems,
    [],
    `Real screens reported problems:\n${pageProblems.join("\n")}`
  );
  console.log(
    `Captured ${captures.length} real first-administrator screens in ${outputDir}.`
  );
  for (const capture of captures) {
    console.log(`- ${capture.file}: ${capture.title}`);
  }
} finally {
  if (browser) await browser.close();
  if (devServer) await stopDevServer(devServer);
  await resetFixture();
}

async function runOnboardingEnabledPhase() {
  const operator = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const operatorPage = await operator.newPage();
  observe(operatorPage, "operator");
  await signIn(
    operatorPage,
    operatorEmail,
    operatorPassword,
    `/internal/partners/provisioning/${primaryPartner}`
  );

  // Acceptance step 1 - a partner with no administrator.
  await expectStatus(operatorPage, "No administrator configured");
  await capture(
    operatorPage,
    "01-step1-no-administrator-configured.png",
    "Step 1 - internal partner detail reads No administrator configured"
  );
  await assertNoHorizontalOverflow(operatorPage, [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]);
  await assertAuthorizationBoundaries(operator);

  // Acceptance step 2 - explicit review, then a pending invitation with a
  // copyable secure setup link.
  await operatorPage
    .getByRole("button", { name: "Create administrator invitation" })
    .click();
  await operatorPage.getByLabel("Full name").fill("Jordan Taylor");
  await operatorPage.getByLabel("Work email").fill(primaryAdminEmail);
  await operatorPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  const review = operatorPage.getByRole("group", {
    name: "Review administrator access"
  });
  await review.waitFor();
  for (const expected of [
    "Demo Justice Access Partner",
    "Jordan Taylor",
    primaryAdminEmail,
    "Partner Administrator",
    "72 hours",
    "Partner onboarding while setup is incomplete; otherwise partner dashboard"
  ]) {
    await review.getByText(expected, { exact: false }).first().waitFor();
  }
  await capture(
    operatorPage,
    "02-step2-create-invitation-review.png",
    "Step 2 - organization, name, email, role, expiration, and destination review"
  );

  await operatorPage
    .getByRole("button", { name: "Confirm and create invitation" })
    .click();
  const setupLinkField = operatorPage.getByLabel("Secure setup link");
  await setupLinkField.waitFor();
  const primarySetupLink = await setupLinkField.inputValue();
  assert.match(
    primarySetupLink,
    /^http:\/\/127\.0\.0\.1:3000\/partner\/setup\?token=[A-Za-z0-9_-]{43}$/,
    "The copy-link action must yield a real partner setup link."
  );
  await expectStatus(operatorPage, "Invitation pending");
  await operatorPage
    .getByRole("button", { name: "Copy secure setup link" })
    .waitFor();
  await blur(setupLinkField);
  await capture(
    operatorPage,
    "03-step2-invitation-pending.png",
    "Step 2 - status reads Invitation pending with Copy secure setup link available"
  );
  await captureElement(
    operatorPage,
    secureLinkPanel(operatorPage),
    "04-step2-secure-link-ready.png",
    "Step 2 - secure setup link ready to copy (link value blurred)"
  );

  // Acceptance step 3 - copy the link, open it in a clean profile, set a
  // password, and land on /partner/onboarding.
  await unblur(setupLinkField);
  await operatorPage
    .getByRole("button", { name: "Copy secure setup link" })
    .click();
  await operatorPage.getByText("Secure setup link copied.").waitFor();
  const copiedLink = await operatorPage.evaluate(() =>
    navigator.clipboard.readText()
  );
  assert.equal(
    copiedLink,
    primarySetupLink,
    "Copy secure setup link must place the real link on the clipboard."
  );

  const recipient = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const recipientPage = await recipient.newPage();
  observe(recipientPage, "recipient");
  await recipientPage.goto(copiedLink, { timeout: 90_000 });
  await recipientPage
    .getByRole("heading", { name: "Set your LegalEase password" })
    .waitFor({ timeout: 90_000 });
  await recipientPage.getByLabel("New password").waitFor();
  await capture(
    recipientPage,
    "05-step3-set-password-clean-profile.png",
    "Step 3 - copied link opened in a clean profile shows the real password screen"
  );
  await recipientPage.getByLabel("New password").fill(primaryAdminPassword);
  await recipientPage.getByLabel("Confirm password").fill(primaryAdminPassword);
  await recipientPage.getByRole("button", { name: "Set password" }).click();
  await recipientPage.waitForURL(`${baseUrl}/partner/onboarding`, {
    timeout: 120_000
  });
  await recipientPage.locator("h1").first().waitFor();
  await capture(
    recipientPage,
    "06-step3-landed-partner-onboarding.png",
    "Step 3 and flag-on landing - accepted administrator lands on /partner/onboarding"
  );
  await recipient.close();

  // Acceptance step 4 - the internal page reports the real administrator.
  await operatorPage.reload();
  await expectStatus(operatorPage, "Administrator active");
  await operatorPage.getByText(primaryAdminEmail).first().waitFor();
  await operatorPage
    .getByText("Demo Justice Access Partner")
    .first()
    .waitFor();
  await capture(
    operatorPage,
    "07-step4-administrator-active.png",
    "Step 4 - internal partner detail reads Administrator active for the right person and organization"
  );
  await assertSingleActiveMembership(primaryPartner, primaryAdminEmail);

  // Acceptance step 5 - a second invitation for a different partner is revoked
  // and its copied link no longer completes account setup.
  await operatorPage.goto(
    `${baseUrl}/internal/partners/provisioning/${secondPartner}`,
    { timeout: 90_000 }
  );
  await expectStatus(operatorPage, "No administrator configured");
  await operatorPage
    .getByRole("button", { name: "Create administrator invitation" })
    .click();
  await operatorPage.getByLabel("Full name").fill("Riley Morgan");
  await operatorPage.getByLabel("Work email").fill(secondAdminEmail);
  await operatorPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  await operatorPage
    .getByRole("button", { name: "Confirm and create invitation" })
    .click();
  const secondLinkField = operatorPage.getByLabel("Secure setup link");
  await secondLinkField.waitFor();
  const secondSetupLink = await secondLinkField.inputValue();
  assert.notEqual(secondSetupLink, primarySetupLink);
  await expectStatus(operatorPage, "Invitation pending");
  await blur(secondLinkField);
  await capture(
    operatorPage,
    "08-step5-second-partner-invitation-pending.png",
    "Step 5 - a second invitation for a different partner is pending"
  );

  await operatorPage.getByRole("button", { name: "Revoke invitation" }).click();
  await operatorPage
    .getByText("Invitation revoked. Its setup link can no longer be used.")
    .waitFor();
  await expectStatus(operatorPage, "Invitation revoked");

  const revoked = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const revokedPage = await revoked.newPage();
  observe(revokedPage, "revoked-link");
  await revokedPage.goto(secondSetupLink, { timeout: 90_000 });
  await revokedPage
    .getByText("This invite link is no longer active.")
    .waitFor({ timeout: 90_000 });
  assert.equal(
    await revokedPage.getByLabel("New password").count(),
    0,
    "A revoked setup link must not offer account setup."
  );
  await capture(
    revokedPage,
    "09-step5-revoked-link-rejected.png",
    "Step 5 - the revoked setup link cannot complete account setup"
  );
  await revoked.close();
  await assertNoMembership(secondPartner);

  // Invitation expired state on a real screen.
  await operatorPage.goto(
    `${baseUrl}/internal/partners/provisioning/${thirdPartner}`,
    { timeout: 90_000 }
  );
  await operatorPage
    .getByRole("button", { name: "Create administrator invitation" })
    .click();
  await operatorPage.getByLabel("Full name").fill("Casey Rivera");
  await operatorPage.getByLabel("Work email").fill(thirdAdminEmail);
  await operatorPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  await operatorPage
    .getByRole("button", { name: "Confirm and create invitation" })
    .click();
  await operatorPage.getByLabel("Secure setup link").waitFor();
  await expireCurrentInvitation(thirdPartner);
  await operatorPage.reload();
  await expectStatus(operatorPage, "Invitation expired");
  await capture(
    operatorPage,
    "10-invitation-expired.png",
    "Expired invitation state on the internal partner detail page"
  );

  // Mobile state.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  await mobile.addCookies(await operator.cookies());
  const mobilePage = await mobile.newPage();
  observe(mobilePage, "mobile");
  await mobilePage.goto(
    `${baseUrl}/internal/partners/provisioning/${primaryPartner}`,
    { timeout: 90_000 }
  );
  await expectStatus(mobilePage, "Administrator active");
  await assertNoHorizontalOverflow(mobilePage, [{ width: 390, height: 844 }]);
  await capture(
    mobilePage,
    "11-mobile-administrator-active.png",
    "Mobile 390x844 partner access status with no horizontal overflow"
  );
  await mobile.close();
  await operator.close();

  return { primaryAdminEmail, primaryAdminPassword };
}

async function runOnboardingDisabledPhase(flagOn) {
  // Acceptance step 6 - the same accepted administrator lands on the dashboard
  // when onboarding is disabled, and the earlier states still render cleanly.
  const partner = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const partnerPage = await partner.newPage();
  observe(partnerPage, "flag-off-partner");
  await signIn(
    partnerPage,
    flagOn.primaryAdminEmail,
    flagOn.primaryAdminPassword,
    "/partner/dashboard"
  );
  await partnerPage.locator("h1").first().waitFor();
  await capture(
    partnerPage,
    "12-step6-flag-off-partner-dashboard.png",
    "Step 6 - with the onboarding flag off the accepted administrator lands on /partner/dashboard"
  );
  await partner.close();

  const operator = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const operatorPage = await operator.newPage();
  observe(operatorPage, "flag-off-operator");
  await signIn(
    operatorPage,
    operatorEmail,
    operatorPassword,
    `/internal/partners/provisioning/${primaryPartner}`
  );
  await expectStatus(operatorPage, "Administrator active");
  for (const [slug, status] of [
    [secondPartner, "Invitation revoked"],
    [thirdPartner, "Invitation expired"]
  ]) {
    await operatorPage.goto(
      `${baseUrl}/internal/partners/provisioning/${slug}`,
      { timeout: 90_000 }
    );
    await expectStatus(operatorPage, status);
  }

  // A fresh acceptance with the flag off must route to the dashboard, which is
  // the decision under test rather than the sign-in default.
  await operatorPage
    .getByRole("button", { name: "Resend / replace invitation" })
    .click();
  await operatorPage.getByLabel("Full name").fill("Casey Rivera");
  await operatorPage.getByLabel("Work email").fill(thirdAdminEmail);
  await operatorPage
    .getByRole("button", { name: "Review administrator access" })
    .click();
  const review = operatorPage.getByRole("group", {
    name: "Review administrator access"
  });
  await review.getByText("Partner dashboard", { exact: true }).waitFor();
  await operatorPage
    .getByRole("button", { name: "Confirm and replace invitation" })
    .click();
  const linkField = operatorPage.getByLabel("Secure setup link");
  await linkField.waitFor();
  const thirdSetupLink = await linkField.inputValue();

  const recipient = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const recipientPage = await recipient.newPage();
  observe(recipientPage, "flag-off-recipient");
  await recipientPage.goto(thirdSetupLink, { timeout: 90_000 });
  await recipientPage
    .getByRole("heading", { name: "Set your LegalEase password" })
    .waitFor({ timeout: 90_000 });
  await recipientPage.getByLabel("New password").fill(thirdAdminPassword);
  await recipientPage.getByLabel("Confirm password").fill(thirdAdminPassword);
  await recipientPage.getByRole("button", { name: "Set password" }).click();
  await recipientPage.waitForURL(`${baseUrl}/partner/dashboard`, {
    timeout: 120_000
  });
  await recipientPage.locator("h1").first().waitFor();
  await capture(
    recipientPage,
    "13-flag-off-post-acceptance-landing.png",
    "Post-acceptance landing with the onboarding flag off routes to /partner/dashboard"
  );
  await recipient.close();
  await assertSingleActiveMembership(thirdPartner, thirdAdminEmail);
  await operator.close();
}

async function assertAuthorizationBoundaries(operatorContext) {
  const internalApi = `${baseUrl}/api/internal/partners/first-admin/${primaryPartner}`;
  const anonymous = await browser.newContext();
  const anonymousGet = await anonymous.request.get(internalApi);
  assert.equal(anonymousGet.status(), 401, "Anonymous read must be rejected.");
  const anonymousPost = await anonymous.request.post(internalApi, {
    headers: { origin: baseUrl },
    data: { action: "create", fullName: "Anon", email: "anon@example.test" }
  });
  assert.equal(anonymousPost.status(), 401, "Anonymous write must be rejected.");
  await anonymous.close();

  const crossOrigin = await operatorContext.request.post(internalApi, {
    headers: { origin: "http://attacker.example" },
    data: { action: "create" }
  });
  assert.equal(
    crossOrigin.status(),
    403,
    "A cross-origin write with a real operator session must be rejected."
  );

  const acceptGet = await operatorContext.request.get(
    `${baseUrl}/api/partners/first-admin/accept`
  );
  assert.equal(acceptGet.status(), 405, "Acceptance must be POST only.");

  const view = await operatorContext.request.get(internalApi);
  assert.equal(view.status(), 200);
  const body = await view.text();
  assert.doesNotMatch(
    body,
    /token_hash|tokenHash|rawToken|service_role/,
    "The internal read API must not expose token or service-role material."
  );
}

async function signIn(page, email, password, nextPath) {
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(nextPath)}`, {
    timeout: 120_000
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseUrl}${nextPath}`, { timeout: 120_000 });
}

async function expectStatus(page, statusLabel) {
  await page
    .getByRole("heading", { name: statusLabel, exact: true })
    .waitFor({ timeout: 90_000 });
}

async function assertNoHorizontalOverflow(page, viewports) {
  const original = page.viewportSize();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    assert.ok(
      overflow <= 1,
      `Horizontal overflow of ${overflow}px at ${viewport.width}x${viewport.height}.`
    );
  }
  if (original) await page.setViewportSize(original);
}

async function assertSingleActiveMembership(partnerSlug, email) {
  const memberships = await client
    .from("partner_users")
    .select("partner_slug, role, status, invited_email")
    .eq("partner_slug", partnerSlug);
  assert.equal(memberships.error, null, memberships.error?.message);
  assert.deepEqual(memberships.data, [
    {
      partner_slug: partnerSlug,
      role: "partner_admin",
      status: "active",
      invited_email: email
    }
  ]);
  const record = await currentInvitation(partnerSlug);
  assert.equal(
    record.status,
    "accepted",
    "Acceptance must persist the final invitation state."
  );
}

async function assertNoMembership(partnerSlug) {
  const memberships = await client
    .from("partner_users")
    .select("id")
    .eq("partner_slug", partnerSlug);
  assert.equal(memberships.error, null, memberships.error?.message);
  assert.deepEqual(memberships.data, []);
}

async function currentInvitation(partnerSlug) {
  const result = await client
    .from("partner_events")
    .select("id, event_payload")
    .eq("partner_slug", partnerSlug)
    .eq("event_type", "first_admin_invitation_record")
    .maybeSingle();
  assert.equal(result.error, null, result.error?.message);
  assert.ok(result.data, `Expected an invitation record for ${partnerSlug}.`);
  return result.data.event_payload;
}

async function expireCurrentInvitation(partnerSlug) {
  const payload = await currentInvitation(partnerSlug);
  const expired = {
    ...payload,
    expires_at: new Date(Date.now() - 60_000).toISOString()
  };
  const update = await client
    .from("partner_events")
    .update({ event_payload: expired })
    .eq("partner_slug", partnerSlug)
    .eq("event_type", "first_admin_invitation_record");
  assert.equal(update.error, null, update.error?.message);
}

async function seedFixture() {
  const workspaces = await client.from("partner_onboarding").upsert(
    managedPartners.map((partnerSlug) => ({
      partner_slug: partnerSlug,
      status: "setup_in_progress"
    })),
    { onConflict: "partner_slug" }
  );
  assert.equal(workspaces.error, null, workspaces.error?.message);

  const operator = await client.auth.admin.createUser({
    email: operatorEmail,
    password: operatorPassword,
    email_confirm: true,
    user_metadata: { name: "Local First Admin Operator" }
  });
  assert.equal(operator.error, null, operator.error?.message);
  const membership = await client.from("partner_users").insert({
    auth_user_id: operator.data.user.id,
    partner_slug: null,
    role: "internal_admin",
    status: "active",
    invited_email: operatorEmail
  });
  assert.equal(membership.error, null, membership.error?.message);
}

async function resetFixture() {
  await client
    .from("partner_events")
    .delete()
    .in("partner_slug", managedPartners)
    .like("event_type", "first_admin%");
  await client
    .from("partner_events")
    .delete()
    .in("partner_slug", managedPartners)
    .eq("event_type", "partner_admin_membership_created");
  await client.from("partner_users").delete().in("partner_slug", managedPartners);
  await client
    .from("partner_onboarding")
    .delete()
    .in("partner_slug", managedPartners);
  const users = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!users.error) {
    for (const user of users.data.users) {
      if (managedEmails.includes(user.email ?? "")) {
        await client.auth.admin.deleteUser(user.id);
      }
    }
  }
  await client
    .from("partner_users")
    .delete()
    .eq("invited_email", operatorEmail);
}

async function startDevServer({ onboardingEnabled }) {
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: baseUrl,
        RCAP_PARTNER_ONBOARDING_ENABLED: onboardingEnabled ? "true" : "false",
        RCAP_ONBOARDING_PREFILL_ENABLED: onboardingEnabled ? "true" : "false",
        PARTNER_EMAIL_DELIVERY_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/sign-in`);
      if (response.ok) return child;
    } catch {
      // Continue until Next is accepting loopback requests.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next dev server did not become ready.");
}

async function stopDevServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 8_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;
    pageProblems.push(`${label} console: ${text}`);
  });
  page.on("pageerror", (error) => {
    pageProblems.push(`${label} pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      pageProblems.push(
        `${label} response: ${response.status()} ${response.url()}`
      );
    }
  });
}

async function capture(page, file, title, options = {}) {
  assert.ok(
    !page.url().includes("harness"),
    "Acceptance capture must never use a harness route."
  );
  await page.screenshot({
    path: path.join(outputDir, file),
    fullPage: !options.clip,
    ...(options.clip ? { clip: options.clip } : {})
  });
  captures.push({ file, title, url: sanitizeUrl(page.url()) });
}

function secureLinkPanel(page) {
  return page
    .locator('xpath=//div[contains(@class,"#F2FBF7")][.//p[text()="Secure setup link ready"]]')
    .first();
}

async function captureElement(page, locator, file, title) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: path.join(outputDir, file) });
  captures.push({ file, title, url: sanitizeUrl(page.url()) });
}

async function blur(locator) {
  await locator.evaluate((element) => {
    element.style.filter = "blur(7px)";
  });
}

async function unblur(locator) {
  await locator.evaluate((element) => {
    element.style.filter = "";
  });
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function writeScreenshotIndex() {
  const lines = [
    "# First administrator acceptance screenshots",
    "",
    "Captured from real application screens against a loopback-only Supabase",
    "stack. No harness route was used and no secret values are shown: setup",
    "link fields are blurred before capture and URLs are recorded without",
    "query strings.",
    "",
    "| Screenshot | What it shows | Screen |",
    "| --- | --- | --- |",
    ...captures.map(
      (item) => `| ${item.file} | ${item.title} | ${item.url} |`
    ),
    ""
  ];
  fs.writeFileSync(path.join(outputDir, "screenshot-index.md"), lines.join("\n"));
}
