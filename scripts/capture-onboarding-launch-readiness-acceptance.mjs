// Real acceptance capture for launch readiness, the partner launch kit, and
// the partner resources area.
//
// Every one of the nine steps is driven through a real application screen,
// reached by signing in through the real sign-in form. Supabase seeding and the
// dev-server lifecycle are the only harness: no route, page, status, check, or
// readiness verdict here is synthesized, and no capture comes from a harness
// route. Screenshots are written outside the repository.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3000";
const outputDir =
  process.env.LAUNCH_READINESS_CAPTURE_DIR ?? "/tmp/rcap-b2b-visual-review";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Set the local Supabase URL, anon key, and secret key inline.");
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(supabaseUrl).hostname)) {
  throw new Error("Acceptance capture only runs against loopback Supabase.");
}

const runId = `${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`
  .replace(/[^a-z0-9]/g, "");

// Per-run slugs. partner_onboarding_activity is append-only by design, so a
// workspace can never be deleted to reset a fixture; each run gets its own
// synthetic tenants instead of trying to tear the last one down.
const partnerA = `b2b-partner-a-${runId}`;
const partnerB = `b2b-partner-b-${runId}`;
const operatorEmail = `b2b-operator-${runId}@example.test`;
const operatorPassword = `Local-Operator-${runId}!7`;
const adminAEmail = `b2b-admin-a-${runId}@example.test`;
const adminAPassword = `Local-AdminA-${runId}!9`;
const adminBEmail = `b2b-admin-b-${runId}@example.test`;
const adminBPassword = `Local-AdminB-${runId}!5`;
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
  /Failed to load resource: the server responded with a status of 404/i,
  // Caused by the automation, not the product: Playwright sets
  // caret-color: transparent on an input while it types, so a reload right
  // afterwards hydrates against a DOM the driver has already touched.
  /A tree hydrated but some attributes of the server rendered HTML/i
];

let browser;
let devServer;

// Wrapped so the whole flow runs after every declaration in this module is
// initialized, rather than tripping over the temporal dead zone.
async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  try {
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

    // Wait for both readiness route handlers to be genuinely servable. The dev
    // server compiles a route handler on first request and answers 404 until
    // that finishes, so a cold action can fail for a reason that has nothing to
    // do with the behaviour under test.
    await waitForRoute(
      operator.context,
      `${baseUrl}/api/internal/partners/onboarding/phase1/${partnerA}/launch-readiness`
    );
    await waitForRoute(
      partnerAdmin.context,
      `${baseUrl}/api/partners/onboarding/launch-readiness`
    );

    await operator.page.goto(
      `${baseUrl}/internal/partners/onboarding/${partnerA}`,
      { timeout: 120_000 }
    );

    await step1(operator);
    await step2(operator);
    await step3(operator);
    await step4(operator, partnerAdmin);
    await step5(operator, partnerAdmin);
    await step6(operator, partnerAdmin);
    await step7(operator);
    await step8(operator, partnerAdmin);
    await step9();

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
}

// --- the nine steps ----------------------------------------------------------

const EXPECTED_GROUPS = [
  "Commercial and procurement",
  "Configuration",
  "Page and brand",
  "Partner team and reporting",
  "Participant journey",
  "Training and resources",
  "Approvals"
];

async function openReadiness(page) {
  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Launch Readiness" }).click();
  await page.locator("[data-readiness-summary]").waitFor({ timeout: 60_000 });
}

async function step1({ page }) {
  await openReadiness(page);
  for (const group of EXPECTED_GROUPS) {
    await page.getByRole("heading", { name: group, exact: true }).waitFor();
  }
  const checks = await page.locator("[data-check-key]").count();
  assert.equal(checks, 15, `expected the full catalogue, saw ${checks}`);
  await record(
    page,
    1,
    "01-step1-readiness-groups.png",
    "Launch Readiness: checks grouped by all seven categories"
  );
}

async function step2({ page }) {
  // Every failing blocking check names an owner and exactly one next action.
  const failing = page.locator(
    '[data-check-blocking="true"]:not([data-check-status="passing"]):not([data-check-status="waived"]):not([data-check-status="not_applicable"])'
  );
  const count = await failing.count();
  assert.ok(count > 0, "this step needs at least one failing blocking check");
  for (let index = 0; index < count; index += 1) {
    const text = await failing.nth(index).innerText();
    assert.match(text, /LegalEase|Partner/, "a failing check must name an owner");
    const nextActions = (text.match(/next:/gi) ?? []).length;
    assert.equal(
      nextActions,
      1,
      `a failing blocking check must ask for exactly one thing, saw ${nextActions}`
    );
  }

  // Every automated check shows the evidence it derived its state from.
  const cards = page.locator("[data-check-key]");
  const total = await cards.count();
  let automated = 0;
  for (let index = 0; index < total; index += 1) {
    const text = await cards.nth(index).innerText();
    if (!text.includes("Derived from program data")) continue;
    automated += 1;
    // innerText returns CSS-transformed text, and the label is uppercased.
    assert.match(text, /evidence:/i, "an automated check must show its evidence");
  }
  assert.equal(automated, 11, `expected eleven automated checks, saw ${automated}`);
  await record(
    page,
    2,
    "02-step2-owners-actions-evidence.png",
    "Every failing blocking check names an owner and one next action; every automated check shows its evidence"
  );
}

async function step3({ page }) {
  const summary = page.locator("[data-readiness-summary]");
  assert.equal(
    await summary.getAttribute("data-readiness-summary"),
    "not_ready",
    "a failing blocking check must keep the page out of a ready state"
  );
  const body = await page.locator("body").innerText();
  const readyClaims = body.match(/ready to launch/gi) ?? [];
  const negated = body.match(/not ready to launch/gi) ?? [];
  assert.equal(
    readyClaims.length,
    negated.length,
    "no part of the page may read ready to launch while a blocking check fails"
  );
  await assertNoLaunchControl(page);
  await record(
    page,
    3,
    "03-step3-not-ready-no-controls.png",
    "With a blocking check failing, nothing reads ready to launch and no publish, activate, invite or send control exists"
  );
}

async function step4({ page }, partner) {
  // Roger records a LegalEase-owned manual check on the real screen.
  const card = page.locator('[data-check-key="communications_approved"]');
  await card.getByRole("button", { name: "Mark complete" }).click();
  await page
    .locator('[data-check-key="communications_approved"][data-check-status="passing"]')
    .waitFor({ timeout: 60_000 })
    .catch(async (error) => {
      // Surface what the screen actually said rather than a bare timeout.
      const alerts = await page.getByRole("alert").allInnerTexts();
      throw new Error(
        `marking the check complete failed: ${alerts.join(" | ") || error.message}`
      );
    });
  await record(
    page,
    4,
    "04-step4a-internal-marked-complete.png",
    "An authorized internal reviewer marks a manual check complete and the summary updates"
  );

  // The same check is not the partner's to record, and no waiver is offered.
  await partner.page.goto(`${baseUrl}/partner/onboarding/resources`, {
    timeout: 120_000
  });
  await partner.page.locator("[data-readiness-summary]").waitFor({ timeout: 60_000 });
  assert.equal(
    await partner.page.locator('[data-check-key="communications_approved"]').count(),
    0,
    "an internal-only check must not appear on the partner surface"
  );
  const partnerBody = await partner.page.locator("body").innerText();
  assert.ok(
    !/\bwaive\b/i.test(partnerBody),
    "the partner surface must offer no waiver control"
  );

  // And the API refuses it outright, not merely the interface.
  const attempt = await partner.context.request.post(
    `${baseUrl}/api/partners/onboarding/launch-readiness`,
    {
      headers: { origin: baseUrl, "content-type": "application/json" },
      data: {
        action: "confirm_check",
        requestId: crypto.randomUUID(),
        payload: { checkKey: "communications_approved" }
      }
    }
  );
  assert.equal(
    attempt.status(),
    403,
    "a partner must not be able to satisfy a LegalEase-owned check"
  );
  const waiveAttempt = await partner.context.request.post(
    `${baseUrl}/api/partners/onboarding/launch-readiness`,
    {
      headers: { origin: baseUrl, "content-type": "application/json" },
      data: {
        action: "record_check",
        requestId: crypto.randomUUID(),
        payload: { checkKey: "staff_training_completed", status: "waived" }
      }
    }
  );
  assert.ok(
    waiveAttempt.status() >= 400,
    "the partner route must expose no waiver action at all"
  );
  await record(
    partner.page,
    4,
    "04-step4b-partner-cannot-record.png",
    "The partner cannot see or record that internal check, and cannot waive any check"
  );
}

async function step5({ page }, partner) {
  // Get the documents approved and the manual checks recorded first, so there
  // is something for the change to knock down. The sections stay open on
  // purpose: an approved section is read-only to the partner, which is the
  // product working as intended, so they are completed and approved in step 6.
  await approveAllArtifacts({ page });
  await recordManualChecks({ page }, partner);
  await openReadiness(page);

  const before = await page
    .locator('[data-check-key="staff_training_completed"]')
    .getAttribute("data-check-status");
  assert.equal(before, "passing", "the partner decision must stand before the change");

  // A real edit on the real portal screen.
  await partner.page.goto(
    `${baseUrl}/partner/onboarding/support_referrals_reporting`,
    { timeout: 120_000 }
  );
  await partner.page.getByLabel("Reporting cadence").fill("Every two weeks");
  await waitForPortalSave(partner.page);

  await openReadiness(page);
  const after = await readCheckStatus(
    page,
    "staff_training_completed",
    "needs_review"
  );
  assert.equal(
    after,
    "needs_review",
    "a material source change must invalidate the recorded decision"
  );
  const currency = await page
    .locator('[data-check-key="artifact_versions_current"]')
    .getAttribute("data-check-status");
  assert.equal(currency, "failing", "the affected documents must read out of date");

  // The artifact approvals went with it.
  await page.getByRole("tab", { name: "Artifacts" }).click();
  await page
    .getByText("Out of date with program data", { exact: true })
    .first()
    .waitFor({ timeout: 60_000 });
  await page
    .getByText(
      "Both the LegalEase approval and the partner approval are invalidated.",
      { exact: true }
    )
    .first()
    .waitFor();
  await page.getByRole("tab", { name: "Launch Readiness" }).click();
  await page.locator("[data-readiness-summary]").waitFor();
  await record(
    page,
    5,
    "05-step5-readiness-invalidated.png",
    "Changing the reporting cadence invalidates readiness and the affected artifact approvals together"
  );
}

async function step6({ page }, partner) {
  // Clear everything the change knocked down.
  await completeAllSections({ context: partner.context });
  await approveAllSections({ context: page.context() });
  await approveAllArtifacts({ page });
  await recordManualChecks({ page }, partner);
  await openReadiness(page);

  const state = await page
    .locator("[data-readiness-summary]")
    .getAttribute("data-readiness-summary");
  if (state !== "ready") {
    const unmet = await page
      .locator(
        '[data-check-blocking="true"]:not([data-check-status="passing"]):not([data-check-status="waived"]):not([data-check-status="not_applicable"])'
      )
      .allInnerTexts();
    throw new Error(`still not ready:\n${unmet.join("\n---\n")}`);
  }
  await page.getByRole("heading", { name: "Ready to launch" }).waitFor();
  await assertNoLaunchControl(page);
  await record(
    page,
    6,
    "06-step6-ready-no-launch-control.png",
    "Every blocking check met: the page reads ready, still with no publish or activate control"
  );
}

async function step7({ page }) {
  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Artifacts" }).click();
  const row = artifactRow(page, "Partner Launch Kit");
  await row
    .getByRole("button", { name: /Generate draft|Regenerate from current data/ })
    .click();
  await row.getByRole("button", { name: "Preview" }).waitFor({ timeout: 60_000 });
  await row.getByRole("button", { name: "Preview" }).click();

  for (const heading of [
    "Short description",
    "Long description",
    "Email copy",
    "SMS copy",
    "Social copy",
    "Flyer copy",
    "Staff referral script",
    "Participant questions",
    "Claims and terminology guardrails"
  ]) {
    await row.getByText(heading, { exact: true }).first().waitFor();
  }

  // The QR resolves to this partner's preview route and nothing else.
  await page.getByRole("tab", { name: "Resources" }).click();
  const qr = page.locator("[data-launch-kit-qr]").first();
  await qr.waitFor({ timeout: 60_000 });
  await assertImageLoaded(qr, "the launch kit QR code");
  const target = await page
    .locator("[data-launch-kit-target]")
    .first()
    .getAttribute("data-launch-kit-target");
  assert.equal(
    target,
    `${baseUrl}/p/${partnerA}`,
    `the QR must resolve to this partner's page, got ${target}`
  );
  const kitText = await page.locator("[data-launch-kit]").innerText();
  const addresses = [
    ...new Set(
      (kitText.match(/https?:\/\/[^\s)]+/g) ?? []).map((url) =>
        url.replace(/[.,;:]+$/, "")
      )
    )
  ];
  assert.deepEqual(
    addresses,
    [`${baseUrl}/p/${partnerA}`],
    `the kit must carry one address, that partner's own: ${addresses.join(", ")}`
  );
  await record(
    page,
    7,
    "07-step7-launch-kit-and-qr.png",
    "The Partner Launch Kit with every copy block, the FAQ, the guardrails, and a QR resolving only to this partner's page"
  );
}

async function step8({ page }, partner) {
  // Approve the kit so the partner can actually receive it.
  await page.getByRole("tab", { name: "Artifacts" }).click();
  const row = artifactRow(page, "Partner Launch Kit");
  await row.getByRole("button", { name: "Approve version" }).click();
  await row
    .getByText("Approved by LegalEase", { exact: true })
    .waitFor({ timeout: 60_000 });

  await partner.page.goto(`${baseUrl}/partner/onboarding/artifacts`, {
    timeout: 120_000
  });
  // A resource becomes available to the partner only once the partner has also
  // reviewed it, which is B1's rule and is left exactly as it was.
  for (let guard = 0; guard < 8; guard += 1) {
    const awaiting = partner.page.getByRole("button", {
      name: "Approve facts and branding"
    });
    if ((await awaiting.count()) === 0) break;
    await awaiting.first().click();
    await partner.page.waitForTimeout(750);
  }
  await partner.page
    .getByRole("heading", { name: "Approved and available to download" })
    .waitFor({ timeout: 60_000 });

  await partner.page.goto(`${baseUrl}/partner/onboarding/resources`, {
    timeout: 120_000
  });
  await partner.page
    .getByRole("heading", { name: "Approved resources" })
    .waitFor({ timeout: 60_000 });
  await partner.page
    .locator('[data-resource-type="staff_quick_start_guide"]')
    .waitFor();
  await partner.page.locator('[data-resource-type="partner_launch_kit"]').waitFor();

  // A real download of a real approved resource.
  const href = await partner.page
    .locator('[data-resource-type="staff_quick_start_guide"]')
    .getByRole("link", { name: "Download" })
    .getAttribute("href");
  const download = await partner.context.request.get(`${baseUrl}${href}`);
  assert.equal(download.status(), 200);
  assert.equal(download.headers()["content-type"], "application/pdf");
  const body = await download.body();
  assert.ok(body.byteLength > 500, "the download must have real content");
  assert.ok(
    !body.subarray(0, 200).toString("utf8").toLowerCase().includes("<!doctype"),
    "a login page must never be returned as a file"
  );

  // The readiness summary is limited to partner-relevant items.
  await partner.page.locator("[data-readiness-summary]").waitFor();
  for (const internalOnly of [
    "commercial_gate_cleared",
    "agreements_and_procurement_recorded",
    "legalease_final_review_complete",
    "communications_approved"
  ]) {
    assert.equal(
      await partner.page.locator(`[data-check-key="${internalOnly}"]`).count(),
      0,
      `${internalOnly} must never reach the partner surface`
    );
  }
  await partner.page.locator('[data-check-key="staff_training_completed"]').waitFor();
  await assertNoLaunchControl(partner.page);
  await record(
    partner.page,
    8,
    "08-step8-partner-resources.png",
    "The partner resources area: the quick-start guide and approved resources, a real download, and a readiness summary with no internal-only checks"
  );
}

async function step9() {
  const other = await signedInContext(
    adminBEmail,
    adminBPassword,
    "/partner/onboarding",
    "partner-b"
  );

  await other.page.goto(`${baseUrl}/partner/onboarding/resources`, {
    timeout: 120_000
  });
  // A document type name is partner B's own vocabulary — its readiness
  // evidence names the documents it is missing. What must never appear is
  // anything identifying partner A.
  const body = await other.page.locator("body").innerText();
  for (const forbidden of [
    "Demo Justice Access Partner",
    partnerA,
    `/p/${partnerA}`,
    "help@demo.test",
    "Capital Area Legal Aid"
  ]) {
    assert.ok(
      !body.includes(forbidden),
      `partner B must not see "${forbidden}"`
    );
  }
  assert.equal(
    await other.page.locator('[data-check-status="passing"]').count(),
    0,
    "partner B must not see partner A's satisfied checks"
  );

  const versionIds = await approvedVersionIdsFor(partnerA);
  assert.ok(versionIds.length > 0, "partner A must have approved versions to guard");
  for (const versionId of versionIds) {
    const download = await other.context.request.get(
      `${baseUrl}/api/partners/onboarding/artifacts/download?versionId=${versionId}`
    );
    assert.ok(
      download.status() >= 400,
      `partner B must not download partner A's version ${versionId}`
    );
  }
  const internalReadiness = await other.context.request.get(
    `${baseUrl}/api/internal/partners/onboarding/phase1/${partnerA}/launch-readiness`
  );
  assert.ok(
    internalReadiness.status() >= 400,
    "a partner administrator must not reach the internal readiness board"
  );
  await record(
    other.page,
    9,
    "09-step9-other-partner-sees-nothing.png",
    "An administrator of a different partner reaches none of the first partner's checks, launch kit, resources, or downloads"
  );
  await other.context.close();
}


/**
 * Reads a check's state off the real screen, giving the page a moment to settle
 * on the value the server actually sent. It reloads rather than waiting blindly,
 * so a wrong answer stays wrong.
 */
async function readCheckStatus(page, checkKey, expected, attempts = 4) {
  let status = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    status = await page
      .locator(`[data-check-key="${checkKey}"]`)
      .getAttribute("data-check-status");
    if (status === expected) return status;
    await openReadiness(page);
  }
  return status;
}


/** Polls a route until the dev server actually serves it. */
async function waitForRoute(context, url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let status = 0;
  while (Date.now() < deadline) {
    const response = await context.request.get(url);
    status = response.status();
    if (status !== 404) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${url} never became servable, last status ${status}`);
}


/** Waits for a control to become live, without a test-runner assertion library. */
async function waitUntilEnabled(locator, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await locator.isEnabled()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("a control never became enabled");
}

// --- step helpers ------------------------------------------------------------


/**
 * Marks each section complete through the real partner completion path, so it
 * reaches submitted the way it does in real use. Seeding, not a screen under
 * test.
 */
async function completeAllSections({ context }) {
  const order = [
    "organization_contacts",
    "program_goals",
    "geography_audience_language_accessibility",
    "access_sponsorship_capacity",
    "brand_public_page",
    "staff_dashboard_plan",
    "support_referrals_reporting",
    "review_authorization"
  ];
  for (const sectionKey of order) {
    const stored = await admin
      .from("partner_onboarding_sections")
      .select("response_data, revision, status")
      .eq("workspace_id", await workspaceIdFor(partnerA))
      .eq("section_key", sectionKey)
      .maybeSingle();
    if (["submitted", "approved", "waived"].includes(stored.data?.status)) continue;

    const workspace = await admin
      .from("partner_onboarding")
      .select("aggregate_version")
      .eq("partner_slug", partnerA)
      .maybeSingle();
    // Collections live in their own tables, not in response_data, so the
    // completion payload has to carry them the way the portal does.
    const data = {
      ...(stored.data?.response_data ?? {}),
      ...(await collectionsFor(sectionKey))
    };
    const response = await context.request.post(
      `${baseUrl}/api/partners/onboarding/sections/${sectionKey}`,
      {
        headers: { origin: baseUrl, "content-type": "application/json" },
        data: {
          requestId: crypto.randomUUID(),
          expectedRevision: stored.data?.revision ?? 0,
          expectedWorkspaceVersion: workspace.data.aggregate_version,
          mode: "section_complete",
          data
        }
      }
    );
    assert.ok(
      response.ok(),
      `completing ${sectionKey} failed: ${response.status()} ${await response.text()}`
    );
  }
}


/** The collection rows a section carries, in the shape the portal submits. */
async function collectionsFor(sectionKey) {
  const workspaceId = await workspaceIdFor(partnerA);
  if (sectionKey === "organization_contacts") {
    const rows = await admin
      .from("partner_onboarding_contacts")
      .select("id, role, name, title, organization, work_email, phone")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    return {
      contacts: (rows.data ?? []).map((row) => ({
        stable_row_id: row.id,
        role: row.role,
        name: row.name,
        title: row.title,
        organization: row.organization,
        work_email: row.work_email,
        phone: row.phone
      }))
    };
  }
  if (sectionKey === "staff_dashboard_plan") {
    const rows = await admin
      .from("partner_onboarding_planned_users")
      .select("id, name, work_email, requested_role, special_permissions, training_attendee")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    return {
      planned_users: (rows.data ?? []).map((row) => ({
        stable_row_id: row.id,
        name: row.name,
        work_email: row.work_email,
        requested_role: row.requested_role,
        special_permissions: row.special_permissions ?? [],
        training_attendee: row.training_attendee
      }))
    };
  }
  if (sectionKey === "support_referrals_reporting") {
    const rows = await admin
      .from("partner_onboarding_report_recipients")
      .select("id, name, work_email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    return {
      report_recipients: (rows.data ?? []).map((row) => ({
        stable_row_id: row.id,
        name: row.name,
        work_email: row.work_email
      }))
    };
  }
  return {};
}

/**
 * Approves every onboarding section through the internal review action a
 * reviewer uses. Seeding, not a screen under test: the screens under test are
 * driven by hand in the steps above.
 */
async function approveAllSections({ context }) {
  for (const sectionKey of [
    "organization_contacts",
    "program_goals",
    "geography_audience_language_accessibility",
    "access_sponsorship_capacity",
    "brand_public_page",
    "staff_dashboard_plan",
    "support_referrals_reporting",
    "review_authorization"
  ]) {
    const workspace = await admin
      .from("partner_onboarding")
      .select("id, aggregate_version")
      .eq("partner_slug", partnerA)
      .maybeSingle();
    const response = await context.request.post(
      `${baseUrl}/api/internal/partners/onboarding/phase1/${partnerA}`,
      {
        headers: { origin: baseUrl, "content-type": "application/json" },
        data: {
          action: "approve_section",
          requestId: crypto.randomUUID(),
          workspaceId: workspace.data.id,
          expectedWorkspaceVersion: workspace.data.aggregate_version,
          payload: {
            sectionKey,
            reason: "Reviewed and approved for launch preparation."
          }
        }
      }
    );
    assert.ok(
      response.ok(),
      `approving ${sectionKey} failed: ${response.status()} ${await response.text()}`
    );
  }
}


/** No control anywhere on the screen may offer to launch anything. */
async function assertNoLaunchControl(page) {
  const labels = [
    ...(await page.getByRole("button").allInnerTexts().catch(() => [])),
    ...(await page.getByRole("link").allInnerTexts().catch(() => []))
  ];
  for (const label of labels) {
    assert.ok(
      !/\b(publish|activate|go live|make live|send|invite|release)\b/i.test(label),
      `no control may offer to launch anything, found "${label.trim()}"`
    );
  }
}

/** Regenerates and approves every document, through the real Artifacts area. */
async function approveAllArtifacts({ page }) {
  await page.goto(`${baseUrl}/internal/partners/onboarding/${partnerA}`, {
    timeout: 120_000
  });
  await page.getByRole("tab", { name: "Artifacts" }).click();
  for (const label of [
    "Implementation Brief",
    "Operations and Escalation Plan",
    "Dashboard User and Reporting Matrix",
    "Staff Quick Start Guide",
    "Co-branded Page Configuration"
  ]) {
    const row = artifactRow(page, label);
    await row
      .getByRole("button", { name: /Generate draft|Regenerate from current data/ })
      .click();
    await row
      .getByText("Current with program data", { exact: true })
      .waitFor({ timeout: 60_000 });
    // Regeneration always yields a fresh draft, so wait for the approve control
    // to become live rather than sampling it before the board has come back.
    const approve = row.getByRole("button", { name: "Approve version" });
    await approve.waitFor({ state: "visible", timeout: 60_000 });
    await waitUntilEnabled(approve);
    await approve.click();
    await row
      .getByText("Approved by LegalEase", { exact: true })
      .waitFor({ timeout: 60_000 });
  }
}

/** Records every manual check on the side that owns it. */
async function recordManualChecks({ page }, partner) {
  await openReadiness(page);
  for (const key of ["communications_approved", "legalease_final_review_complete"]) {
    const card = page.locator(`[data-check-key="${key}"]`);
    const status = await card.getAttribute("data-check-status");
    if (status === "passing" || status === "waived") continue;
    await card
      .getByRole("button", {
        name:
          key === "legalease_final_review_complete"
            ? "Record final review complete"
            : "Mark complete"
      })
      .click();
    await page
      .locator(`[data-check-key="${key}"][data-check-status="passing"]`)
      .waitFor({ timeout: 60_000 });
  }

  await partner.page.goto(`${baseUrl}/partner/onboarding/resources`, {
    timeout: 120_000
  });
  await partner.page.locator("[data-readiness-summary]").waitFor({ timeout: 60_000 });
  for (const [key, name] of [
    ["staff_training_completed", "Confirm complete"],
    ["partner_launch_approval_received", "Record our launch approval"]
  ]) {
    const card = partner.page.locator(`[data-check-key="${key}"]`);
    const status = await card.getAttribute("data-check-status");
    if (status === "passing") continue;
    await card.getByRole("button", { name }).click();
    await partner.page
      .locator(`[data-check-key="${key}"][data-check-status="passing"]`)
      .waitFor({ timeout: 60_000 });
  }
}

/**
 * The portal saves a draft on its own after a change and reports it in its live
 * status region. Waiting on that real indicator is what proves the entry
 * actually persisted, rather than assuming a click succeeded.
 */
/**
 * The portal saves a draft on its own as fields change, so a half-filled
 * collection row can fail on the way to a complete one. This waits for the
 * screen to actually report a saved draft, using the screen's own retry
 * affordance when an intermediate save failed, rather than assuming a keystroke
 * persisted.
 */
async function waitForPortalSave(page) {
  const status = page.getByRole("status").first();
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const text = (await status.innerText().catch(() => "")).trim();
    if (text === "Saved") return;
    const retry = page.getByRole("button", { name: "Try saving again" });
    if ((await retry.count()) > 0) {
      await retry.first().click();
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `the portal never reported a saved draft; last status was "${(
      await status.innerText().catch(() => "")
    ).trim()}"`
  );
}


/**
 * An <img> element can exist while its request failed. This checks the browser
 * actually decoded the bytes, which is what "built from the partner's real
 * logo" has to mean.
 */
async function assertImageLoaded(locator, description) {
  const loaded = await locator.evaluate(
    (image) => image.complete && image.naturalWidth > 0
  );
  assert.ok(loaded, `${description} did not load`);
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
    .eq("workspace_id", await workspaceIdFor(partnerA))
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

/**
 * Both surfaces stamp the artifact type on the card, so a row is addressed by
 * what it is rather than by fragile DOM nesting.
 */
const ARTIFACT_TYPE_BY_LABEL = {
  "Implementation Brief": "implementation_brief",
  "Operations and Escalation Plan": "operations_escalation_plan",
  "Dashboard User and Reporting Matrix": "dashboard_user_reporting_matrix",
  "Staff Quick Start Guide": "staff_quick_start_guide",
  "Partner Launch Kit": "partner_launch_kit",
  "Co-branded Page Configuration": "co_branded_page_configuration"
};

function artifactRow(page, label) {
  const type = ARTIFACT_TYPE_BY_LABEL[label];
  assert.ok(type, `unknown artifact label ${label}`);
  return page.locator(`[data-artifact-type="${type}"]`);
}

function partnerCard(page, label) {
  return artifactRow(page, label);
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
          contact_name: "Program Contact",
          program_tier: "implementation",
          selected_package_id: "community-access-program",
          selected_package_name: "Community Access Program",
          // A cleared commercial gate, so the workspace is not blocked before
          // the documents under test can be prepared.
          payment_status: "paid",
          qualification_status: "qualified",
          provisioning_status: "provisioned",
          paid_at: "2026-06-01T00:00:00.000Z"
        },
        { onConflict: "partner_slug" }
      )
      .select("id")
      .single();
    assert.equal(record.error, null, record.error?.message);
    const entitlement = await admin.from("partner_entitlement").upsert(
      {
        partner_slug: partner.slug,
        screenings_allowed: 800,
        overage_enabled: false,
        pause_at_cap: true
      },
      { onConflict: "partner_slug" }
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

// A function declaration, so the seed is available to the flow above it.
function sectionSeed() {
  return {
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
    known_barriers: ["Transportation"],
    partner_side_outcome_tracking:
      "A quarterly survey of participants who completed a filing."
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
  review_authorization: {
    organization_information_accurate: true,
    program_scope_approved_for_configuration: true,
    brand_assets_authorized_for_use: true,
    no_eligibility_or_outcome_guarantee_understood: true,
    contested_and_representation_matters_follow_escalation_plan: true,
    dashboard_users_authorized: true,
    legalease_may_prepare_draft_implementation_materials: true,
    approver_name: "Dana Ruiz",
    approver_title: "Program Manager"
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
}

/**
 * Bulk seeding through the real partner save route with a real partner session.
 * The screens under test are driven separately, by hand, in the steps above.
 */
async function seedPartnerContent({ context }) {
  for (const [sectionKey, data] of Object.entries(sectionSeed())) {
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
  // Scoped to the workspace this run created: earlier runs leave their own
  // tenants behind, because the activity ledger is append-only.
  const workspaceId = await workspaceIdFor(partnerA);
  const contacts = await admin
    .from("partner_onboarding_contacts")
    .select("id, role")
    .eq("workspace_id", workspaceId)
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
      sectionSeed().support_referrals_reporting
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

  // The primary administrator is a reference to a planned-user row, so it can
  // only be set once those rows exist.
  const plannedUsers = await admin
    .from("partner_onboarding_planned_users")
    .select("id, requested_role")
    .eq("workspace_id", await workspaceIdFor(partnerA))
    .is("deleted_at", null);
  const administrator = (plannedUsers.data ?? []).find(
    (row) => row.requested_role === "partner_administrator"
  );
  const staffState = await sectionState("staff_dashboard_plan");
  const staffResponse = await context.request.post(
    `${baseUrl}/api/partners/onboarding/sections/staff_dashboard_plan`,
    {
      headers: { origin: baseUrl, "content-type": "application/json" },
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: staffState.revision,
        expectedWorkspaceVersion: staffState.workspaceVersion,
        mode: "draft_save",
        data: {
          ...sectionSeed().staff_dashboard_plan,
          planned_users: (plannedUsers.data ?? []).map((row) => {
            const seeded = sectionSeed().staff_dashboard_plan.planned_users.find(
              (user) => user.requested_role === row.requested_role
            );
            return { ...seeded, stable_row_id: row.id };
          }),
          primary_dashboard_administrator_row_id: administrator?.id
        }
      }
    }
  );
  assert.ok(
    staffResponse.ok(),
    `seeding the primary administrator failed: ${staffResponse.status()} ${await staffResponse.text()}`
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
          ...sectionSeed().access_sponsorship_capacity,
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
    .eq("workspace_id", await workspaceIdFor(partnerA))
    .is("deleted_at", null);
  return (rows.data ?? []).map((row) => ({
    stable_row_id: row.id,
    name: row.name,
    work_email: row.work_email
  }));
}

async function workspaceIdFor(partnerSlug) {
  const workspace = await admin
    .from("partner_onboarding")
    .select("id")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  assert.ok(workspace.data, `no workspace for ${partnerSlug}`);
  return workspace.data.id;
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

/** A small synthetic mark, uploaded through the real asset route. */
async function uploadLogo({ context }) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAKAAAAAwCAIAAAAZy+Y5AAAAnElEQVR4nO3aQQ2AMBBFwTpAAThBFnbQWgUcmyaPSUbA37zrjvN9CBvbF7CUwHECxwkcJ3CcwHECxwkcJ3CcwHECx30GPq57qe2X/4TAcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcQLHCRzn8T1O4DiB4wSOEzhO4DiB4wSOEzhO4DiB4wSOm/VjT/BICaPNAAAAAElFTkSuQmCC",
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
    "# Launch readiness, launch kit, and resources acceptance screenshots",
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

await main();
