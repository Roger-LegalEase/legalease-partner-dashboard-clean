// Real acceptance capture for the remaining onboarding documents and the
// co-branded page.
//
// Every one of the eleven steps is driven through a real application screen,
// reached by signing in through the real sign-in form. Supabase seeding and the
// dev-server lifecycle are the only harness: no route, page, status, or preview
// here is synthesized, and no capture may come from a harness route.
// Screenshots are written outside the repository.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3000";
const outputDir =
  process.env.PAGE_DOCUMENTS_CAPTURE_DIR ?? "/tmp/rcap-b2a-visual-review";

const partnerA = "demo-partner";
const partnerB = "fulton-county";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Set the local Supabase URL, anon key, and secret key inline.");
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(supabaseUrl).hostname)) {
  throw new Error("Acceptance capture only runs against loopback Supabase.");
}

const runId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const operatorEmail = `b2a-operator-${runId}@example.test`;
const operatorPassword = `Local-Operator-${runId}!7`;
const adminAEmail = `b2a-admin-a-${runId}@example.test`;
const adminAPassword = `Local-AdminA-${runId}!9`;
const adminBEmail = `b2a-admin-b-${runId}@example.test`;
const adminBPassword = `Local-AdminB-${runId}!5`;
const managedEmails = [operatorEmail, adminAEmail, adminBEmail];
const managedPartners = [partnerA, partnerB];

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pageProblems = [];
const captures = [];
const stepResults = [];
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
  await seedTenants();
  browser = await chromium.launch({ headless: true });
  devServer = await startDevServer();

  const operator = await signedInContext(
    operatorEmail,
    operatorPassword,
    `/internal/partners/onboarding/${partnerA}`,
    "operator"
  );
  await seedWorkspaces(operator);

  const partnerAdmin = await signedInContext(
    adminAEmail,
    adminAPassword,
    "/partner/onboarding",
    "partner-a"
  );
  await seedPartnerContent(partnerAdmin);
  await uploadLogo(partnerAdmin);

  await operator.page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });

  await step1(operator);
  await step2(operator);
  await step3(operator, partnerAdmin);
  await step4(operator);
  await step5(operator);
  await step6(operator);
  await step7(operator, partnerAdmin);
  await step8(operator, partnerAdmin);
  await step9(operator);
  await step10(partnerAdmin);
  await step11();

  writeScreenshotIndex();
  assert.deepEqual(
    pageProblems,
    [],
    `Real screens reported problems:\n${pageProblems.join("\n")}`
  );
  console.log(`\nCaptured ${captures.length} real screens in ${outputDir}\n`);
  for (const result of stepResults) {
    console.log(`Step ${result.step}: ${result.status} — ${result.file}`);
  }
} finally {
  if (browser) await browser.close();
  if (devServer) await stopDevServer(devServer);
}

// --- the eleven steps --------------------------------------------------------

async function step1({ page }) {
  await page.getByRole("tab", { name: "Artifacts" }).click();
  for (const label of [
    "Implementation Brief",
    "Operations and Escalation Plan",
    "Dashboard User and Reporting Matrix",
    "Staff Quick Start Guide",
    "Co-branded Page Configuration",
    "Partner Launch Kit"
  ]) {
    await page.getByRole("heading", { name: label, exact: true }).waitFor();
  }
  const unavailable = page.getByText("Not yet available", { exact: true });
  assert.equal(
    await unavailable.count(),
    1,
    "exactly one of the six types may read Not yet available"
  );
  const launchKitRow = artifactRow(page, "Partner Launch Kit");
  await launchKitRow.getByText("Not yet available", { exact: true }).waitFor();
  for (const label of [
    "Implementation Brief",
    "Operations and Escalation Plan",
    "Dashboard User and Reporting Matrix",
    "Staff Quick Start Guide",
    "Co-branded Page Configuration"
  ]) {
    await artifactRow(page, label)
      .getByRole("button", { name: /Generate draft|Regenerate from current data/ })
      .waitFor();
  }
  await record(page, 1, "01-step1-five-of-six-generating.png", "Artifacts area: five types generating, only Partner Launch Kit not yet available");
}

async function step2({ page }) {
  const row = artifactRow(page, "Operations and Escalation Plan");
  await row.getByRole("button", { name: "Generate draft" }).click();
  await row.getByRole("button", { name: "Preview" }).waitFor({ timeout: 60_000 });
  await row.getByRole("button", { name: "Preview" }).click();

  for (const heading of [
    "General participant support",
    "LegalEase technical support",
    "Legal-services referral",
    "Prosecutor objection and contested hearing",
    "Privacy requests",
    "Security concerns",
    "Media inquiries",
    "Capacity escalation",
    "Pausing the program"
  ]) {
    await row.getByText(heading, { exact: true }).first().waitFor();
  }
  // Every route names an owner and a response expectation, or an explicit gap.
  const owners = await row.getByText("Owner", { exact: true }).count();
  const expectations = await row
    .getByText("Response expectation", { exact: true })
    .count();
  assert.ok(owners >= 8, `expected an owner per route, saw ${owners}`);
  assert.ok(
    expectations >= 8,
    `expected a response expectation per route, saw ${expectations}`
  );
  // The media route has no contact yet, so it must show a named gap.
  await row
    .getByText("Not yet provided: Media contact.", { exact: false })
    .waitFor();
  await row.getByText("leave the self-help path", { exact: false }).waitFor();
  await record(page, 2, "02-step2-operations-escalation-plan.png", "Operations and Escalation Plan with owners, response expectations, and a named gap for the missing media contact");
  await row.getByRole("button", { name: "Hide preview" }).click();
}

async function step3({ page }, partner) {
  // Entered on the real portal screen, by the partner, not by the harness.
  await partner.page.goto(
    `${baseUrl}/partner/onboarding/organization_contacts`,
    { timeout: 120_000 }
  );
  await partner.page.getByRole("button", { name: "Add contact" }).click();
  const contactCount = await partner.page
    .getByRole("heading", { name: /^Contact \d+$/ })
    .count();
  const index = contactCount - 1;
  await partner.page
    .getByLabel("Contact role")
    .nth(index)
    .selectOption("media_contact");
  await partner.page.getByLabel("Contact name").nth(index).fill("Priya Raman");
  await partner.page.getByLabel("Contact title").nth(index).fill("Press Officer");
  await partner.page
    .getByLabel("Work email")
    .nth(index)
    .fill("press@demo.test");
  await partner.page
    .getByRole("button", { name: "Save and continue" })
    .click();
  await partner.page.waitForURL(/\/partner\/onboarding\//, { timeout: 120_000 });
  await record(partner.page, 3, "03-step3a-media-contact-entered.png", "Media contact entered on the real onboarding portal screen");

  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Artifacts" }).click();
  const row = artifactRow(page, "Operations and Escalation Plan");
  await row
    .getByRole("button", { name: "Regenerate from current data" })
    .click();
  await row.getByRole("button", { name: "Preview" }).waitFor({ timeout: 60_000 });
  await row.getByRole("button", { name: "Preview" }).click();
  await row.getByText("Priya Raman", { exact: false }).first().waitFor();
  assert.equal(
    await row.getByText("Not yet provided: Media contact.", { exact: false }).count(),
    0,
    "the media gap must be gone once a media contact exists"
  );
  await record(page, 3, "04-step3b-media-contact-in-the-plan.png", "The media contact appears in the regenerated Operations and Escalation Plan");
  await row.getByRole("button", { name: "Hide preview" }).click();
}

async function step4({ page }) {
  const before = await plannedUserState();
  const row = artifactRow(page, "Dashboard User and Reporting Matrix");
  await row.getByRole("button", { name: "Generate draft" }).click();
  await row.getByRole("button", { name: "Preview" }).waitFor({ timeout: 60_000 });
  await row.getByRole("button", { name: "Preview" }).click();

  for (const expected of [
    "Dana Ruiz",
    "Jordan Blake",
    "Partner administrator",
    "Program staff",
    "Every quarter",
    "Monthly"
  ]) {
    await row.getByText(expected, { exact: false }).first().waitFor();
  }
  await record(page, 4, "05-step4-dashboard-user-reporting-matrix.png", "Dashboard User and Reporting Matrix: planned users, requested roles, report recipients, cadence");

  const after = await plannedUserState();
  assert.deepEqual(
    after,
    before,
    "generating the matrix must not change invitation or membership state"
  );
  const memberships = await admin
    .from("partner_users")
    .select("partner_slug, invited_email, role, status")
    .eq("partner_slug", partnerA);
  assert.equal(memberships.error, null, memberships.error?.message);
  assert.equal(
    memberships.data.length,
    1,
    "no membership may be created by generating a plan"
  );
  await row.getByRole("button", { name: "Hide preview" }).click();
}

async function step5({ page }) {
  const row = artifactRow(page, "Staff Quick Start Guide");
  await row.getByRole("button", { name: "Generate draft" }).click();
  await row.getByRole("button", { name: "Preview" }).waitFor({ timeout: 60_000 });
  await row.getByRole("button", { name: "Preview" }).click();
  await row.getByText("Capital Area Legal Aid", { exact: false }).first().waitFor();
  await row.getByText("What staff must not say", { exact: false }).waitFor();
  await row
    .getByText("Do not say a record will be cleared", { exact: false })
    .waitFor();
  await record(page, 5, "06-step5-staff-quick-start-guide.png", "Staff Quick-Start Guide: approved referral language and the statements staff must avoid");
  await row.getByRole("button", { name: "Hide preview" }).click();
}

async function step6({ page }) {
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page
    .getByRole("button", { name: "Prepare draft" })
    .click();
  await page
    .getByRole("heading", { name: "Desktop preview" })
    .waitFor({ timeout: 60_000 });
  await page.getByRole("heading", { name: "Mobile preview, 390 by 844" }).waitFor();

  const desktop = page.locator('[data-preview-variant="desktop"]');
  const mobile = page.locator('[data-preview-variant="mobile"]');
  await desktop.waitFor();
  await mobile.waitFor();
  await desktop.getByText("Clear your record, for free").first().waitFor();
  assert.ok(
    (await desktop.locator("img").count()) >= 1,
    "the desktop preview must render the partner's real logo"
  );
  await desktop
    .getByText("LegalEase-controlled · not partner-editable", { exact: false })
    .first()
    .waitFor();
  assert.ok(
    (await desktop.locator('[data-ownership="legalease_controlled"]').count()) +
      (await desktop.locator("[data-legalease-category]").count()) >
      0,
    "LegalEase-controlled content must be marked in the preview"
  );
  await assertNoPublicationControl(page);
  await record(page, 6, "07-step6-cobranded-desktop-and-mobile.png", "Co-Branded Page area: desktop and mobile previews from the partner's real logo, name, and fields, with LegalEase-controlled content marked and no publish control");
}

async function step7({ page }, partner) {
  await partner.page.goto(`${baseUrl}/partner/onboarding/brand_public_page`, {
    timeout: 120_000
  });
  const logoCard = partner.page
    .locator("div")
    .filter({ has: partner.page.getByRole("heading", { name: "Transparent logo" }) })
    .last();
  await logoCard.getByRole("button", { name: "Remove" }).click();
  await partner.page.getByText("No current file.", { exact: true }).first().waitFor({ timeout: 60_000 });
  await record(partner.page, 7, "08-step7a-logo-removed-in-portal.png", "The partner removes the transparent logo on the real portal screen");

  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page
    .getByRole("button", { name: "Prepare a new draft from current data" })
    .click();
  await page
    .getByRole("heading", { name: "Desktop preview" })
    .waitFor({ timeout: 60_000 });

  const desktop = page.locator('[data-preview-variant="desktop"]');
  await desktop
    .locator('[data-missing-asset="Transparent logo"]')
    .first()
    .waitFor();
  await desktop
    .getByText("Missing: Transparent logo.", { exact: false })
    .first()
    .waitFor();
  await desktop
    .getByText("Upload it in Program setup", { exact: false })
    .first()
    .waitFor();
  await page
    .getByRole("heading", { name: "Missing before this page can be approved" })
    .waitFor();
  await record(page, 7, "09-step7b-missing-logo-named.png", "The preview names the missing transparent logo and the field that sets it instead of rendering a broken page");
}

async function step8({ page }, partner) {
  // Put the logo back so the page under review is complete, then approve.
  await uploadLogo(partner);
  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page
    .getByRole("button", { name: "Prepare a new draft from current data" })
    .click();
  await page
    .getByRole("button", { name: "Approve as LegalEase" })
    .click();
  await page.getByText("Approved by LegalEase", { exact: true }).waitFor({ timeout: 60_000 });

  // A partner-owned value: the public organization description.
  await partner.page.goto(`${baseUrl}/partner/onboarding/brand_public_page`, {
    timeout: 120_000
  });
  await partner.page
    .getByLabel("Approved organization description")
    .fill(
      "Demo Justice Access Partner runs free record-clearing clinics with local volunteers."
    );
  await partner.page.getByRole("button", { name: "Save and continue" }).click();
  await partner.page.waitForURL(/\/partner\/onboarding\//, { timeout: 120_000 });

  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page
    .getByText("Out of date with program data", { exact: true })
    .waitFor({ timeout: 60_000 });
  await page
    .getByText(
      "Both the LegalEase approval and the partner approval are invalidated.",
      { exact: true }
    )
    .waitFor();
  await record(page, 8, "10-step8-partner-change-invalidates-both.png", "A partner-owned change to the public organization description invalidates both the partner and the LegalEase approval");
}

async function step9({ page }) {
  // Regenerate and get both approvals in place.
  await page
    .getByRole("button", { name: "Prepare a new draft from current data" })
    .click();
  await page.getByRole("button", { name: "Approve as LegalEase" }).click();
  await page.getByText("Approved by LegalEase", { exact: true }).waitFor({ timeout: 60_000 });

  const partnerAdmin = await signedInContext(
    adminAEmail,
    adminAPassword,
    "/partner/onboarding/artifacts",
    "partner-a-approve"
  );
  const card = partnerCard(partnerAdmin.page, "Co-branded Page Configuration");
  await card.getByRole("button", { name: "Approve facts and branding" }).click();
  await partnerAdmin.page
    .getByText("You approved this", { exact: true })
    .first()
    .waitFor({ timeout: 60_000 });

  await page.reload({ timeout: 120_000 });
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page.getByText("Approved by the partner", { exact: true }).waitFor();

  // A LegalEase-controlled value: the participant routing and support
  // disclaimer that appears in the page's LegalEase-controlled block.
  await page
    .getByLabel("Participant routing and support statement")
    .fill(
      "LegalEase routes every participant through screening before any document is prepared."
    );
  await page.getByRole("button", { name: "Save LegalEase page language" }).click();
  await page
    .getByText("Saved.", { exact: false })
    .waitFor({ timeout: 60_000 });

  await page.reload({ timeout: 120_000 });
  await page.getByRole("tab", { name: "Co-Branded Page" }).click();
  await page
    .getByText("Out of date with program data", { exact: true })
    .waitFor({ timeout: 60_000 });
  await page
    .getByText(
      "The LegalEase approval is invalidated. The partner approval still stands.",
      { exact: true }
    )
    .waitFor();
  await page.getByText("Approved by the partner", { exact: true }).waitFor();
  await record(page, 9, "11-step9-legalease-change-spares-partner.png", "A LegalEase-controlled disclaimer change invalidates the LegalEase approval while the partner approval survives");
  await partnerAdmin.context.close();
}

async function step10(partner) {
  await partner.page.goto(`${baseUrl}/partner/onboarding/artifacts`, {
    timeout: 120_000
  });
  await partner.page
    .getByRole("heading", { name: "Waiting for your review" })
    .waitFor();

  // Approve the remaining documents so the partner sees the new artifacts and
  // can download an approved resource.
  const operator = await signedInContext(
    operatorEmail,
    operatorPassword,
    `/internal/partners/onboarding/${partnerA}`,
    "operator-approvals"
  );
  await operator.page.getByRole("tab", { name: "Artifacts" }).click();
  for (const label of [
    "Operations and Escalation Plan",
    "Dashboard User and Reporting Matrix",
    "Staff Quick Start Guide"
  ]) {
    const row = artifactRow(operator.page, label);
    await row.getByRole("button", { name: "Approve version" }).click();
    await row.getByText("Approved by LegalEase", { exact: true }).waitFor({ timeout: 60_000 });
  }
  await operator.context.close();

  await partner.page.reload({ timeout: 120_000 });
  for (const label of [
    "Operations and Escalation Plan",
    "Dashboard User and Reporting Matrix",
    "Staff Quick Start Guide"
  ]) {
    await partner.page
      .getByRole("heading", { name: label, exact: true })
      .waitFor();
  }

  // The co-branded page preview, on the partner's own screen.
  const pageCard = partnerCard(partner.page, "Co-branded Page Configuration");
  await pageCard.getByRole("button", { name: "Preview" }).click();
  await partner.page
    .locator('[data-preview-variant="desktop"]')
    .first()
    .waitFor({ timeout: 60_000 });
  await partner.page
    .locator('[data-preview-variant="mobile"]')
    .first()
    .waitFor();
  await assertNoPublicationControl(partner.page);

  const planCard = partnerCard(partner.page, "Operations and Escalation Plan");
  await planCard.getByRole("button", { name: "Approve facts and branding" }).click();
  await partner.page
    .getByRole("heading", { name: "Approved and available to download" })
    .waitFor();

  const download = await partner.page
    .getByRole("link", { name: "Download approved resource" })
    .first()
    .getAttribute("href");
  assert.ok(download?.startsWith("/api/partners/onboarding/artifacts/download"));
  const response = await partner.context.request.get(`${baseUrl}${download}`);
  assert.equal(response.status(), 200, "an approved resource must download");
  assert.equal(response.headers()["content-type"], "application/pdf");
  assert.ok(
    (await response.body()).byteLength > 500,
    "the downloaded document must have real content"
  );
  await record(partner.page, 10, "12-step10-partner-review-and-download.png", "Partner administrator: new artifacts awaiting review, the co-branded page preview, branding approved, and an approved resource downloaded");
}

async function step11() {
  const other = await signedInContext(
    adminBEmail,
    adminBPassword,
    "/partner/onboarding",
    "partner-b"
  );

  // The partner surface is session-scoped, so partner B sees only its own
  // workspace and never partner A's documents.
  await other.page.goto(`${baseUrl}/partner/onboarding/artifacts`, {
    timeout: 120_000
  });
  for (const forbidden of [
    "Operations and Escalation Plan",
    "Co-branded Page Configuration",
    "Demo Justice Access Partner",
    "Priya Raman"
  ]) {
    assert.equal(
      await other.page.getByText(forbidden, { exact: false }).count(),
      0,
      `partner B must not see "${forbidden}"`
    );
  }

  const versionIds = await approvedVersionIdsFor(partnerA);
  assert.ok(versionIds.length > 0, "partner A must have approved versions to guard");
  for (const versionId of versionIds) {
    const download = await other.context.request.get(
      `${baseUrl}/api/partners/onboarding/artifacts/download?versionId=${versionId}`
    );
    assert.ok(
      download.status() >= 400,
      `partner B must not download partner A's version ${versionId}, got ${download.status()}`
    );
  }
  const internalBoard = await other.context.request.get(
    `${baseUrl}/api/internal/partners/onboarding/phase1/${partnerA}/artifacts`
  );
  assert.ok(
    internalBoard.status() >= 400,
    "a partner administrator must not reach the internal artifact board"
  );
  const internalPage = await other.page.goto(
    `${baseUrl}/internal/partners/onboarding/${partnerA}`,
    { timeout: 120_000 }
  );
  assert.ok(
    internalPage.status() >= 400 ||
      (await other.page.getByText("Demo Justice Access Partner").count()) === 0,
    "partner B must not reach partner A's internal onboarding detail"
  );
  await other.page.goto(`${baseUrl}/partner/onboarding/artifacts`, {
    timeout: 120_000
  });
  await record(other.page, 11, "13-step11-other-partner-sees-nothing.png", "An administrator of a different partner reaches none of the first partner's artifacts, page configuration, or downloads");
  await other.context.close();
}

// --- assertions --------------------------------------------------------------

async function assertNoPublicationControl(page) {
  const controls = await page
    .getByRole("button")
    .allInnerTexts()
    .catch(() => []);
  const links = await page.getByRole("link").allInnerTexts().catch(() => []);
  for (const label of [...controls, ...links]) {
    assert.ok(
      !/\b(publish|activate|go live|make live)\b/i.test(label),
      `no control may offer publication or activation, found "${label.trim()}"`
    );
  }
}

async function plannedUserState() {
  const result = await admin
    .from("partner_onboarding_planned_users")
    .select("id, invitation_status, membership_status, training_status")
    .order("created_at", { ascending: true });
  assert.equal(result.error, null, result.error?.message);
  return result.data;
}

async function approvedVersionIdsFor(partnerSlug) {
  const workspace = await admin
    .from("partner_onboarding")
    .select("id")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  const result = await admin
    .from("partner_onboarding_artifact_versions")
    .select("id")
    .eq("workspace_id", workspace.data.id)
    .eq("approval_status", "approved");
  return (result.data ?? []).map((row) => row.id);
}

// --- locators ----------------------------------------------------------------

function artifactRow(page, label) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) })
    .last();
}

function partnerCard(page, label) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) })
    .last();
}

// --- seeding (harness only) --------------------------------------------------

async function seedTenants() {
  const partners = [
    {
      slug: partnerA,
      name: "Demo Justice Access Partner",
      program: "Fresh Start Program"
    },
    { slug: partnerB, name: "Fulton County Reentry", program: "Second Chance" }
  ];
  for (const partner of partners) {
    const record = await admin
      .from("partner_records")
      .upsert(
        {
          partner_id: partner.slug,
          partner_slug: partner.slug,
          partner_name: partner.name,
          organization_name: partner.name,
          program_name: partner.program,
          contact_email: `contact-${partner.slug}@example.test`,
          contact_name: "Program Contact"
        },
        { onConflict: "partner_slug" }
      )
      .select("id")
      .single();
    assert.equal(record.error, null, record.error?.message);
    const entitlement = await admin.from("partner_entitlement").upsert(
      {
        partner_record_id: record.data.id,
        screenings_allowed: 800,
        overage_enabled: false,
        pause_at_cap: true
      },
      { onConflict: "partner_record_id" }
    );
    assert.equal(entitlement.error, null, entitlement.error?.message);
  }

  const operator = await createUser(operatorEmail, operatorPassword);
  const membership = await admin.from("partner_users").insert({
    auth_user_id: operator,
    partner_slug: null,
    role: "internal_admin",
    status: "active",
    invited_email: operatorEmail
  });
  assert.equal(membership.error, null, membership.error?.message);

  for (const [email, password, slug] of [
    [adminAEmail, adminAPassword, partnerA],
    [adminBEmail, adminBPassword, partnerB]
  ]) {
    const userId = await createUser(email, password);
    const inserted = await admin.from("partner_users").insert({
      auth_user_id: userId,
      partner_slug: slug,
      role: "partner_admin",
      status: "active",
      invited_email: email
    });
    assert.equal(inserted.error, null, inserted.error?.message);
  }
}

async function createUser(email, password) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  assert.equal(created.error, null, created.error?.message);
  return created.data.user.id;
}

/** Roger starts each workspace through the real internal route. */
async function seedWorkspaces({ context }) {
  for (const slug of managedPartners) {
    const response = await context.request.post(
      `${baseUrl}/api/internal/partners/onboarding/phase1/${slug}`,
      {
        headers: { origin: baseUrl, "content-type": "application/json" },
        data: {
          action: "create",
          requestId: crypto.randomUUID(),
          payload: { targetLaunchDate: "2026-09-15" }
        }
      }
    );
    assert.ok(
      response.ok(),
      `workspace creation for ${slug} failed: ${response.status()} ${await response.text()}`
    );
  }
}

const SECTION_SEED = {
  organization_contacts: {
    legal_organization_name: "Demo Justice Access Partner, Inc.",
    public_organization_name: "Demo Justice Access Partner",
    organization_type: "nonprofit",
    website: "https://demo.test",
    primary_address: "1 Main Street",
    main_phone: "555-010-1234",
    public_program_name: "Fresh Start Program",
    contacts: [
      {
        role: "program_operator",
        name: "Dana Ruiz",
        title: "Program Manager",
        work_email: "dana@demo.test",
        phone: "555-010-9999"
      },
      {
        role: "technical_security_contact",
        name: "Sam Okafor",
        title: "IT Director",
        work_email: "sam@demo.test"
      },
      {
        role: "legal_services_referral_contact",
        name: "Alex Chen",
        title: "Staff Attorney",
        work_email: "alex@legalaid.test"
      }
    ]
  },
  program_goals: {
    primary_goal: "Clear eligible records for local residents.",
    definition_of_success: "500 residents complete a filing.",
    target_population: "Residents with old, eligible convictions.",
    expected_screening_volume: 800,
    expected_screening_period: "year",
    expected_packet_volume: 500,
    expected_packet_period: "year",
    program_model: "year_round",
    program_start_date: "2026-09-15",
    ongoing: true,
    outreach_channels: ["Community events"],
    current_workflow: "Walk-in clinic twice a month.",
    known_barriers: ["Transportation"]
  },
  geography_audience_language_accessibility: {
    jurisdictions: ["Mississippi"],
    service_area_description: "Statewide, with clinics in two counties.",
    counties: ["Hinds", "Madison"],
    default_county: "Hinds",
    out_of_area_policy: "redirected",
    primary_language: "English",
    enable_spanish: true,
    additional_languages: ["Vietnamese"],
    accessibility_accommodations: "Interpreters on request.",
    population_restrictions: "Adults only."
  },
  access_sponsorship_capacity: {
    participant_access_model: "optional_code",
    code_structure: "limited_use",
    code_source_groups: ["Clinic sign-ups"],
    code_level_capacity: 250,
    capacity_escalation_procedure:
      "At 80 percent of the cap the program operator is notified and decides whether to request more capacity.",
    capacity_escalation_response_expectation: "A decision within two business days"
  },
  brand_public_page: {
    approved_organization_description:
      "Demo Justice Access Partner helps neighbors clear old records.",
    program_headline: "Clear your record, for free",
    program_subheadline: "We help you prepare and file your own paperwork.",
    primary_cta_label: "See if you qualify",
    participant_support_copy:
      "Call or email us and a program staff member will help you."
  },
  staff_dashboard_plan: {
    planned_users: [
      {
        name: "Dana Ruiz",
        work_email: "dana@demo.test",
        requested_role: "partner_administrator",
        special_permissions: ["manage_users", "export_reports"],
        training_attendee: true
      },
      {
        name: "Jordan Blake",
        work_email: "jordan@demo.test",
        requested_role: "program_staff",
        special_permissions: ["view_reports"],
        training_attendee: true
      }
    ],
    user_invitation_authority_role: "partner_administrator",
    code_management_authority_role: "partner_administrator",
    report_export_authority_role: "reporting_viewer",
    access_review_frequency: "Every quarter"
  },
  support_referrals_reporting: {
    participant_support_email: "help@demo.test",
    participant_support_phone: "555-010-2222",
    legal_services_referral_organization: "Capital Area Legal Aid",
    referral_intake_method: "Email referral form",
    referral_intake_details: "Send the referral form to intake@legalaid.test.",
    contested_matter_procedure:
      "The self-help path stops when a prosecutor objects, a contested hearing is scheduled, or individualized advocacy or representation by an attorney is needed, and the approved referral escalation applies.",
    participant_support_response_expectation: "One business day",
    referral_response_expectation: "Three business days",
    contested_matter_response_expectation: "Same business day",
    privacy_request_route:
      "Privacy requests arrive at privacy@demo.test and are logged and answered by the privacy owner.",
    privacy_request_response_expectation: "Ten business days",
    security_concern_route:
      "Suspected security problems go to the IT director immediately by phone, then in writing.",
    security_concern_response_expectation: "Within four hours",
    media_inquiry_response_expectation: "One business day",
    program_pause_route:
      "The executive sponsor or the program operator may ask LegalEase to pause the program in writing.",
    program_pause_response_expectation: "Two business days",
    report_recipients: [{ name: "Dana Ruiz", work_email: "dana@demo.test" }],
    reporting_cadence: "Monthly",
    funder_required_metrics: ["Filings completed"],
    data_use_restrictions: ["No participant names in public reporting"]
  }
};

/**
 * Bulk seeding through the real partner save route with a real partner session.
 * The screens under test are driven separately, by hand, in the steps above.
 */
async function seedPartnerContent({ context }) {
  for (const [sectionKey, data] of Object.entries(SECTION_SEED)) {
    const payload = withStableRowIds(sectionKey, data);
    const { revision, workspaceVersion } = await sectionState(sectionKey);
    const response = await context.request.post(
      `${baseUrl}/api/partners/onboarding/sections/${sectionKey}`,
      {
        headers: { origin: baseUrl, "content-type": "application/json" },
        data: {
          requestId: crypto.randomUUID(),
          expectedRevision: revision,
          expectedWorkspaceVersion: workspaceVersion,
          mode: "draft_save",
          data: payload
        }
      }
    );
    assert.ok(
      response.ok(),
      `seeding ${sectionKey} failed: ${response.status()} ${await response.text()}`
    );
  }

  // Contact references can only be set once the contacts they name exist.
  const contacts = await admin
    .from("partner_onboarding_contacts")
    .select("id, role")
    .is("deleted_at", null);
  const byRole = Object.fromEntries(
    (contacts.data ?? []).map((row) => [row.role, row.id])
  );
  const { revision, workspaceVersion } = await sectionState(
    "support_referrals_reporting"
  );
  const supportPayload = {
    ...withStableRowIds(
      "support_referrals_reporting",
      SECTION_SEED.support_referrals_reporting
    ),
    partner_staff_support_contact_id: byRole.program_operator,
    urgent_escalation_contact_id: byRole.program_operator,
    privacy_request_owner_contact_id: byRole.technical_security_contact,
    program_pause_authority_contact_id: byRole.program_operator,
    report_recipients: await currentRecipients()
  };
  const response = await context.request.post(
    `${baseUrl}/api/partners/onboarding/sections/support_referrals_reporting`,
    {
      headers: { origin: baseUrl, "content-type": "application/json" },
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: revision,
        expectedWorkspaceVersion: workspaceVersion,
        mode: "draft_save",
        data: supportPayload
      }
    }
  );
  assert.ok(
    response.ok(),
    `seeding contact references failed: ${response.status()} ${await response.text()}`
  );

  const capacity = await sectionState("access_sponsorship_capacity");
  const capacityResponse = await context.request.post(
    `${baseUrl}/api/partners/onboarding/sections/access_sponsorship_capacity`,
    {
      headers: { origin: baseUrl, "content-type": "application/json" },
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: capacity.revision,
        expectedWorkspaceVersion: capacity.workspaceVersion,
        mode: "draft_save",
        data: {
          ...SECTION_SEED.access_sponsorship_capacity,
          overage_approver_contact_id: byRole.program_operator
        }
      }
    }
  );
  assert.ok(
    capacityResponse.ok(),
    `seeding the overage approver failed: ${capacityResponse.status()}`
  );
}

function withStableRowIds(sectionKey, data) {
  const clone = JSON.parse(JSON.stringify(data));
  for (const key of ["contacts", "planned_users", "report_recipients"]) {
    if (Array.isArray(clone[key])) {
      clone[key] = clone[key].map((row) => ({
        stable_row_id: row.stable_row_id ?? crypto.randomUUID(),
        ...row
      }));
    }
  }
  return clone;
}

async function currentRecipients() {
  const rows = await admin
    .from("partner_onboarding_report_recipients")
    .select("id, name, work_email")
    .is("deleted_at", null);
  return (rows.data ?? []).map((row) => ({
    stable_row_id: row.id,
    name: row.name,
    work_email: row.work_email
  }));
}

async function sectionState(sectionKey) {
  const workspace = await admin
    .from("partner_onboarding")
    .select("id, aggregate_version")
    .eq("partner_slug", partnerA)
    .maybeSingle();
  assert.ok(workspace.data, "the workspace must exist before seeding sections");
  const section = await admin
    .from("partner_onboarding_sections")
    .select("revision")
    .eq("workspace_id", workspace.data.id)
    .eq("section_key", sectionKey)
    .maybeSingle();
  return {
    revision: section.data?.revision ?? 0,
    workspaceVersion: workspace.data.aggregate_version
  };
}

/** A one-pixel PNG, uploaded through the real asset route. */
async function uploadLogo({ context }) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAOklEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvBtBcAABmFAM2QAAAABJRU5ErkJggg==",
    "base64"
  );
  const workspace = await admin
    .from("partner_onboarding")
    .select("aggregate_version")
    .eq("partner_slug", partnerA)
    .maybeSingle();
  const response = await context.request.post(
    `${baseUrl}/api/partners/onboarding/assets`,
    {
      headers: { origin: baseUrl },
      multipart: {
        category: "transparent_logo",
        requestId: crypto.randomUUID(),
        expectedWorkspaceVersion: String(workspace.data.aggregate_version),
        file: {
          name: "logo.png",
          mimeType: "image/png",
          buffer: png
        }
      }
    }
  );
  assert.ok(
    response.ok(),
    `logo upload failed: ${response.status()} ${await response.text()}`
  );
}

async function resetFixture() {
  const workspaces = await admin
    .from("partner_onboarding")
    .select("id")
    .in("partner_slug", managedPartners);
  for (const workspace of workspaces.data ?? []) {
    await admin
      .from("partner_onboarding_artifacts")
      .delete()
      .eq("workspace_id", workspace.id);
  }
  await admin.from("partner_onboarding").delete().in("partner_slug", managedPartners);
  await admin.from("partner_users").delete().in("partner_slug", managedPartners);
  await admin.from("partner_users").delete().in("invited_email", managedEmails);
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of users.data?.users ?? []) {
    if ((user.email ?? "").startsWith("b2a-")) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

// --- session, server, capture ------------------------------------------------

async function signedInContext(email, password, nextPath, label) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  observe(page, label);
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(nextPath)}`, {
    timeout: 180_000
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseUrl}${nextPath}`, { timeout: 180_000 });
  return { context, page };
}

async function startDevServer() {
  await waitForPortState(false, 30_000);
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      // Next runs as a grandchild of npm; its own process group is what lets
      // the whole tree be signalled, which is what actually frees port 3000.
      detached: true,
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: baseUrl,
        RCAP_PARTNER_ONBOARDING_ENABLED: "true",
        RCAP_ONBOARDING_PREFILL_ENABLED: "true",
        RCAP_ONBOARDING_LAUNCH_PREP_ENABLED: "true",
        PARTNER_EMAIL_DELIVERY_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("Next dev server exited before becoming ready.");
    }
    try {
      const response = await fetch(`${baseUrl}/sign-in`);
      if (response.ok) return child;
    } catch {
      // Keep waiting for Next to accept loopback requests.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next dev server did not become ready.");
}

async function stopDevServer(child) {
  for (const signal of ["SIGTERM", "SIGKILL"]) {
    if (child.exitCode !== null) break;
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        // Already gone.
      }
    }
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 8_000))
    ]);
  }
  await waitForPortState(false, 30_000);
}

async function waitForPortState(shouldBeBound, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let bound = false;
    try {
      await fetch(`${baseUrl}/sign-in`, { signal: AbortSignal.timeout(2_000) });
      bound = true;
    } catch {
      bound = false;
    }
    if (bound === shouldBeBound) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Port 3000 stayed ${shouldBeBound ? "free" : "bound"}.`);
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
      pageProblems.push(`${label} response: ${response.status()} ${response.url()}`);
    }
  });
}

async function record(page, step, file, title) {
  assert.ok(
    !page.url().includes("harness"),
    "acceptance capture must never use a harness route"
  );
  await page.screenshot({ path: path.join(outputDir, file), fullPage: true });
  captures.push({ file, title, url: sanitizeUrl(page.url()), step });
  stepResults.push({ step, status: "passed", file });
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
    "# Onboarding documents and co-branded page acceptance screenshots",
    "",
    "Captured from real application screens against a loopback-only Supabase",
    "stack, driven through the real sign-in form. No harness route was used and",
    "no capture stands in for a screen under test. Synthetic partners and",
    "synthetic users only; URLs are recorded without query strings.",
    "",
    "| Step | Screenshot | What it shows | Screen |",
    "| --- | --- | --- | --- |",
    ...captures.map(
      (item) => `| ${item.step} | ${item.file} | ${item.title} | ${item.url} |`
    ),
    ""
  ];
  fs.writeFileSync(path.join(outputDir, "screenshot-index.md"), lines.join("\n"));
}
