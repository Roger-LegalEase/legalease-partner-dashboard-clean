#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const baseUrl = String(process.env.EXPAI_CORRECTIONS_B_BASE_URL ?? "").trim();
if (!baseUrl) throw new Error("EXPAI_CORRECTIONS_B_BASE_URL is required");
assertNonproductionOrigin(baseUrl);

const assignment = JSON.parse(
  fs.readFileSync(path.join(root, "data/expungement-ai/corrections-b/assignment.json"), "utf8")
);
const plan = assignment.flows;
if (plan.length !== 27 || new Set(plan.map((flow) => flow.flowId)).size !== 27) {
  throw new Error("Corrections-B browser plan must contain exactly 27 unique flows");
}

const evidenceDir = path.resolve(
  process.env.EXPAI_CORRECTIONS_B_EVIDENCE_DIR
    ?? path.join("/tmp", `legalease-corrections-b-browser-${Date.now()}`)
);
fs.mkdirSync(evidenceDir, { recursive: true });

const expectedByRoute = {
  "AL:non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a": "guidance_only",
  "AR:situation-c-felony-convictions": "needs_review",
  "CA:prop-64-completed-sentence-application-11361-8": "likely_not_eligible",
  "CA:tool-1-dismissal-set-aside": "packet_ready_with_caution",
  "CA:tool-2-automatic-relief": "guidance_only",
  "CA:tool-3-petition-based-felony-sealing": "needs_review",
  "CA:tool-4-arrest-record-sealing": "packet_ready_with_caution",
  "CA:tool-5-proposition-64-marijuana-relief": "guidance_only",
  "HI:dui-under-21-conviction": "needs_review",
  "IA:minor-prostitution-7251": "guidance_only",
  "IA:public-intoxication-12346": "needs_review",
  "IA:underage-alcohol-12347": "needs_review",
  "IL:clean-slate-automatic-sealing": "guidance_only",
  "IN:conviction-expungement-with-records-marked-expunged": "guidance_only",
  "IN:juvenile-allegation-expungement": "needs_more_info",
  "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8": "likely_not_eligible",
  "MI:automatic-clean-slate-set-aside-under-mcl-780-621g": "guidance_only",
  "NH:out-of-state-federal-or-military-record-guidance": "guidance_only",
  "OH:juvenile-sealing-and-expungement": "guidance_only",
  "OK:one-eligible-nonviolent-felony-conviction-expungement": "guidance_only",
  "OK:up-to-two-felony-deferred-dismissal-expungement": "needs_review",
  "TX:automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07": "guidance_only",
  "TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a": "needs_review",
  "TX:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period": "needs_review",
  "TX:first-offense-dwi-nondisclosure": "needs_review"
};

const closedRoutes = new Set([
  "AL:non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a",
  "CA:tool-2-automatic-relief",
  "CA:tool-3-petition-based-felony-sealing",
  "CA:tool-5-proposition-64-marijuana-relief",
  "IA:minor-prostitution-7251",
  "IA:public-intoxication-12346",
  "IA:underage-alcohol-12347",
  "IL:clean-slate-automatic-sealing",
  "IN:conviction-expungement-with-records-marked-expunged",
  "IN:juvenile-allegation-expungement",
  "MI:automatic-clean-slate-set-aside-under-mcl-780-621g",
  "NH:out-of-state-federal-or-military-record-guidance",
  "OH:juvenile-sealing-and-expungement",
  "OK:one-eligible-nonviolent-felony-conviction-expungement",
  "OK:up-to-two-felony-deferred-dismissal-expungement",
  "TX:automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07",
  "TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a",
  "TX:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period",
  "TX:first-offense-dwi-nondisclosure"
]);

const CLEAR_RECORD = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  state_exclusion_categories: ["None of these"],
  pending_cases: "No",
  new_convictions_during_waiting_period: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  court_requirements_completed: "yes",
  special_preconditions_confirmed: "Yes",
  trafficking_status: "No",
  pardon_status: "No",
  record_documents: "Yes",
  resolved_timing_bucket: "gt_10_years"
};

const failures = [];
const results = [];
let browser;

try {
  const executablePath = process.env.EXPAI_CORRECTIONS_B_CHROMIUM?.trim();
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  for (let index = 0; index < plan.length; index += 1) {
    const flow = plan[index];
    const isPartner = flow.authoritySponsorshipMode === "partner_sponsored_session_no_consumer_charge";
    const mobile = isPartner || index % 2 === 1;
    console.log(`[${index + 1}/27] start ${flow.flowId} (${mobile ? "mobile" : "desktop"})`);
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      colorScheme: "light",
      ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {})
    });
    const result = await crawlOne(context, flow, mobile ? "mobile-390x844" : "desktop-1440x1000");
    results.push(result);
    await context.close();
    console.log(
      `[${index + 1}/27] ${flow.flowId}: ${result.observedResultCode ?? "ERROR"}`
      + ` screens=${result.screens.length} product_errors=${result.productErrors.length}`
    );
    if (result.productErrors.length > 0) {
      console.log(`[${index + 1}/27] error ${result.productErrors[0]}`);
    }

    if (result.observedResultCode !== result.expectedResultCode) {
      failures.push(`${flow.flowId}: expected ${result.expectedResultCode}, observed ${result.observedResultCode}`);
    }
    if (result.landedPathwayId && result.landedPathwayId !== flow.routeKey.slice(3)) {
      failures.push(`${flow.flowId}: landed on ${result.landedPathwayId}, expected ${flow.routeKey.slice(3)}`);
    }
    if (closedRoutes.has(flow.routeKey) && result.paymentCopyVisible) {
      failures.push(`${flow.flowId}: closed route displayed consumer payment copy`);
    }
    if (result.productErrors.length > 0) {
      failures.push(`${flow.flowId}: product browser errors: ${result.productErrors.join(" | ")}`);
    }
  }
} finally {
  await browser?.close().catch(() => {});
}

const report = {
  schemaVersion: "expai-corrections-b-browser/v1",
  authoritySha: assignment.authoritySha,
  baseOrigin: new URL(baseUrl).origin,
  syntheticOnly: true,
  authenticatedWrites: false,
  checkoutClicked: false,
  flowCount: results.length,
  desktopCount: results.filter((result) => result.viewport.startsWith("desktop")).length,
  mobileCount: results.filter((result) => result.viewport.startsWith("mobile")).length,
  partnerVariantCount: results.filter((result) => result.requestedPartnerVariant).length,
  partnerBrowserLimitation: "A partner presentation requires a server-validated active-benefit session. Local browser replay preserves both candidate-exact partner rows and sends a safe UUID, but without a configured Supabase partner session the server correctly falls back to DTC. Partner no-charge authority is asserted by scripts/verify-expungement-corrections-b.mjs.",
  failures,
  results
};
const reportPath = path.join(evidenceDir, "results.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`browser_evidence=${reportPath}`);
console.log(`flows=${report.flowCount} desktop=${report.desktopCount} mobile=${report.mobileCount} partner_variants=${report.partnerVariantCount}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("corrections-b browser shard: OK (27/27 exact flow variants)");

async function crawlOne(context, flow, viewport) {
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  page.setDefaultNavigationTimeout(45_000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  let evaluationResponse = null;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${safePath(request.url())} ${request.failure()?.errorText ?? "failed"}`);
  });
  page.on("response", async (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${safePath(response.url())}`);
    if (response.request().method() !== "POST" || safePath(response.url()) !== "/api/expungement-ai/evaluate") return;
    evaluationResponse = await response.json().catch(() => null);
  });

  const requestedPartnerVariant = flow.authoritySponsorshipMode === "partner_sponsored_session_no_consumer_charge";
  const partnerQuery = requestedPartnerVariant
    ? "?session=11111111-1111-4111-8111-111111111111"
    : "";
  // The public screening route accepts the two-letter jurisdiction code. Candidate rows carry
  // full-name semantic routes, so preserve those in the evidence while exercising the shipped UI
  // contract used by StatePicker and resume links.
  const browserEntryPath = `/expungement-ai/screening/${flow.jurisdiction}${partnerQuery}`;
  const entryUrl = `${baseUrl}${browserEntryPath}`;
  const screens = [];

  try {
    await page.goto(entryUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator("h1[id^='q-']").first().waitFor({ state: "visible", timeout: 30_000 });
    const answers = flow.fixture?.answers ?? {};
    for (let guard = 0; guard < 60; guard += 1) {
      if (evaluationResponse) break;
      const question = page.locator("h1[id^='q-']").first();
      if (!(await question.count().catch(() => 0))) break;
      const questionId = await question.getAttribute("id").then((id) => id?.replace(/^q-/, "").replace(/-prompt$/, ""));
      const contextOnly = questionId
        ? (await page.locator(`#q-${questionId}-context`).count().catch(() => 0)) > 0
        : false;
      const optional = contextOnly
        || (await question.getByText(/^Optional$/i).count().catch(() => 0)) > 0;
      const desired = questionId
        ? answers[questionId]
          ?? (questionId === "possible_pathway_context" ? flow.pathwayContextSteer : undefined)
          ?? CLEAR_RECORD[questionId]
        : undefined;
      const selected = optional && desired === undefined
        ? null
        : await answerCurrentScreen(page, desired);
      screens.push({ questionId, desired: desired ?? null, selected });
      const continueButton = page.getByRole("button", { name: /^Continue\b/i }).first();
      if (!(await continueButton.count().catch(() => 0))) break;
      await continueButton.click({ timeout: 5_000 });
      await page.waitForTimeout(300);
    }

    const evaluationDeadline = Date.now() + 10_000;
    while (!evaluationResponse && Date.now() < evaluationDeadline) await page.waitForTimeout(100);
    if (!evaluationResponse) throw new Error("Timed out waiting for the evaluate response");
    await page.waitForTimeout(500);
    const observedResultCode = evaluationResponse.resultCode ?? null;
    const bodyText = await page.locator("body").innerText();
    const routeText = await page.locator("p.rounded-full").first().textContent().catch(() => null);
    const landedPathwayId = evaluationResponse.pathwayId ?? null;
    const paymentCopyVisible = /\$50 one time|pay and generate|continue to checkout/i.test(bodyText);
    const partnerNoPayVisible = /partner program|will not be asked to pay here/i.test(bodyText);
    const screenshot = path.join(evidenceDir, `${flow.flowId}__${viewport}__terminal.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const environmentErrors = consoleErrors.filter((error) => (
      /Failed to load resource: the server responded with a status of (400|404)|status of 503|analytics/i.test(error)
    ));
    const environmentHttpErrors = httpErrors.filter((error) => (
      /\s\/_next\/image$|\s\/expungement-ai\/(favicon\.ico|icon-(192|512)\.png|wilma-avatar\.png)$/i.test(error)
    ));
    const productErrors = [
      ...pageErrors,
      ...consoleErrors.filter((error) => !environmentErrors.includes(error)),
      ...httpErrors.filter((error) => !environmentHttpErrors.includes(error))
    ];
    return {
      flowId: flow.flowId,
      routeKey: flow.routeKey,
      viewport,
      authorityPublicRoute: flow.publicRoute,
      entryPath: browserEntryPath.replace(partnerQuery, partnerQuery ? "?session=<safe-test-uuid>" : ""),
      requestedPartnerVariant,
      serverValidatedPartnerPresentation: partnerNoPayVisible,
      expectedResultCode: expectedByRoute[flow.routeKey],
      observedResultCode,
      landedPathwayId,
      routeText: routeText?.trim() ?? null,
      paymentCopyVisible,
      screens,
      consoleErrors,
      pageErrors,
      failedRequests,
      httpErrors,
      productErrors,
      screenshot
    };
  } catch (error) {
    return {
      flowId: flow.flowId,
      routeKey: flow.routeKey,
      viewport,
      authorityPublicRoute: flow.publicRoute,
      entryPath: browserEntryPath.replace(partnerQuery, partnerQuery ? "?session=<safe-test-uuid>" : ""),
      requestedPartnerVariant,
      serverValidatedPartnerPresentation: false,
      expectedResultCode: expectedByRoute[flow.routeKey],
      observedResultCode: null,
      landedPathwayId: null,
      routeText: null,
      paymentCopyVisible: false,
      screens,
      consoleErrors,
      pageErrors,
      failedRequests,
      httpErrors,
      productErrors: [String(error?.message ?? error)]
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function preferredOption(options, desired) {
  if (desired !== undefined && desired !== null) {
    const wanted = Array.isArray(desired) ? desired.map(String) : [String(desired)];
    const exact = options.find((option) => wanted.includes(option));
    if (exact) return exact;
    const normalized = wanted.map((value) => value.trim().toLowerCase());
    const caseInsensitive = options.find((option) => normalized.includes(option.trim().toLowerCase()));
    if (caseInsensitive) return caseInsensitive;
  }
  return options.find((option) => /^(no\b|none|yes)/i.test(option)) ?? options[0];
}

async function answerCurrentScreen(page, desired) {
  const radios = page.locator("input[type=radio]");
  const checkboxes = page.locator("input[type=checkbox]");
  const selects = page.locator("select");
  const numberInputs = page.locator("input[type=number]");
  const textInputs = page.locator("input[type=text]");

  if (await radios.count() > 0) {
    const options = (await radios.evaluateAll((nodes) => nodes.map((node) => node.value))).filter(Boolean);
    const chosen = preferredOption(options, desired);
    const target = page.locator(`input[type=radio][value=${JSON.stringify(chosen)}]`);
    await (await target.count() ? target.first() : radios.first()).check({ force: true });
    return chosen;
  }
  if (await selects.count() >= 3) {
    const iso = typeof desired === "string" && /^\d{4}-\d{2}-\d{2}$/.test(desired)
      ? desired
      : "2012-06-01";
    const [year, month, day] = iso.split("-");
    await selects.nth(0).selectOption(month).catch(() => selects.nth(0).selectOption({ index: 1 }));
    await selects.nth(1).selectOption(day).catch(() => selects.nth(1).selectOption({ index: 1 }));
    await selects.nth(2).selectOption(year).catch(() => selects.nth(2).selectOption({ index: 1 }));
    return iso;
  }
  if (await checkboxes.count() > 0) {
    const options = (await checkboxes.evaluateAll((nodes) => nodes.map((node) => node.value)))
      .filter((value) => value && value !== "on");
    if (options.length > 0) {
      const chosen = preferredOption(options, desired);
      const target = page.locator(`input[type=checkbox][value=${JSON.stringify(chosen)}]`);
      await (await target.count() ? target.first() : checkboxes.first()).check({ force: true });
      return [chosen];
    }
    if (typeof desired === "string" && /not sure|unknown|don.t know/i.test(desired)) {
      await checkboxes.first().check({ force: true });
      return { unknown: true };
    }
  }
  if (await numberInputs.count() > 0) {
    const value = typeof desired === "string" && /^\d+$/.test(desired) ? desired : "30";
    await numberInputs.first().fill(value);
    return value;
  }
  if (await textInputs.count() > 0) {
    const value = typeof desired === "string" && desired.trim()
      ? desired
      : "CORRECTIONS-B SYNTHETIC VALUE";
    await textInputs.first().fill(value);
    return value;
  }
  return null;
}

function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "<unparseable>";
  }
}

function assertNonproductionOrigin(value) {
  const host = new URL(value).hostname.toLowerCase();
  const forbidden = new Set([
    "expungement.ai",
    "www.expungement.ai",
    "legalease.com",
    "www.legalease.com",
    "legaleasepartner.com",
    "www.legaleasepartner.com"
  ]);
  if (forbidden.has(host)) throw new Error(`Refusing production browser target ${host}`);
}
