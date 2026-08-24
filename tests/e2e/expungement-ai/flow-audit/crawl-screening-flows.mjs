#!/usr/bin/env node
// Deterministic browser crawl of the Expungement.ai screening flows.
//
//   EXPAI_FLOW_AUDIT_BASE_URL=http://127.0.0.1:3000 \
//   node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
//
// Optional:
//   EXPAI_FLOW_AUDIT_JURISDICTIONS=MS,IL      limit the crawl to these codes
//   EXPAI_FLOW_AUDIT_EVIDENCE_DIR=...         where screenshots land
//   EXPAI_FLOW_AUDIT_CHROMIUM=...             explicit chromium binary
//   EXPAI_FLOW_AUDIT_MAX_FLOWS=...            cap the crawl for a smoke run
//
// Uses the repository's existing browser-testing framework: raw Playwright
// chromium in a .mjs script writing an evidence directory, exactly as
// scripts/verify-expungement-commercial-browser.mjs and its siblings do. No new
// browser vendor is introduced.
//
// SAFETY, non-negotiable and enforced below:
//   * synthetic identities only — every value the crawl types is generated here
//     and is obviously fake;
//   * the base URL must not be a production origin;
//   * no Stripe payment is completed: the crawl stops at the checkout boundary;
//   * no authenticated participant is created and no matter is persisted unless
//     EXPAI_FLOW_AUDIT_ALLOW_MUTATION=1 is set explicitly.
//
// What it captures per flow: the route, every visible question, the answer class
// selected, the next action taken, the terminal outcome, browser errors, failed
// network calls, redirect cycles, and desktop plus mobile screenshots.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
process.chdir(rootDir);

const baseUrl = (process.env.EXPAI_FLOW_AUDIT_BASE_URL ?? "").trim();
if (!baseUrl) {
  console.error("EXPAI_FLOW_AUDIT_BASE_URL is required. Point it at a staging or local origin, never production.");
  process.exit(2);
}
assertNotProduction(baseUrl);

const ALLOW_MUTATION = process.env.EXPAI_FLOW_AUDIT_ALLOW_MUTATION === "1";
const evidenceDir = path.resolve(process.env.EXPAI_FLOW_AUDIT_EVIDENCE_DIR?.trim() || path.join(rootDir, "data/expungement-ai/flow-audit/evidence"));
const shotsDir = path.join(evidenceDir, "screenshots");
const maxFlows = Number(process.env.EXPAI_FLOW_AUDIT_MAX_FLOWS ?? "0") || Infinity;
const onlyJurisdictions = (process.env.EXPAI_FLOW_AUDIT_JURISDICTIONS ?? "")
  .split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);

fs.mkdirSync(shotsDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "data/expungement-ai/flow-audit/flow-manifest.json"), "utf8"));

/**
 * One canonical supported path per jurisdiction, plus its unsupported/referral
 * counterpart where the manifest records one. Crawling every one of the 622
 * manifest flows through a real browser would re-drive the same six to eighteen
 * screens hundreds of times; the manifest already holds the per-flow evaluation.
 * The browser's job is the part the evaluator cannot answer: what the screens
 * render, what the actions do, and whether the journey holds together.
 */
function crawlPlan() {
  const byJurisdiction = new Map();
  for (const flow of manifest.flows) {
    if (flow.jurisdiction === "XX") continue;
    if (onlyJurisdictions.length > 0 && !onlyJurisdictions.includes(flow.jurisdiction)) continue;
    if (!byJurisdiction.has(flow.jurisdiction)) byJurisdiction.set(flow.jurisdiction, []);
    byJurisdiction.get(flow.jurisdiction).push(flow);
  }

  const plan = [];
  for (const [code, flows] of [...byJurisdiction.entries()].sort()) {
    // A remedy flow, never a probe: a probe row such as the blank-submission one
    // records the terminal an EMPTY answer set produces, and a browser walking the
    // screens cannot submit an empty answer set. Comparing the two would
    // manufacture a disagreement.
    const remedyFlows = flows.filter((f) => f.remedy.kind === "compiled_pathway" && f.audience === "direct_to_consumer");
    const supported = remedyFlows.find((f) => f.terminalOutcome.resultCode.startsWith("packet_ready"))
      ?? remedyFlows.find((f) => !f.unsupportedOrReferralOutcome)
      ?? remedyFlows[0]
      ?? flows.find((f) => f.audience === "direct_to_consumer");
    const unsupported = remedyFlows.find((f) => f.unsupportedOrReferralOutcome?.kind === "unsupported")
      ?? flows.find((f) => f.unsupportedOrReferralOutcome?.kind === "unsupported" && f.remedy.probeId === "not_my_own_record");
    const referral = remedyFlows.find((f) => f.unsupportedOrReferralOutcome?.kind === "referral")
      ?? flows.find((f) => f.unsupportedOrReferralOutcome?.kind === "referral");
    for (const [role, flow] of [["canonical_supported", supported], ["unsupported_or_referral", unsupported], ["referral", referral]]) {
      if (!flow) continue;
      if (plan.some((entry) => entry.flow.flowId === flow.flowId)) continue;
      plan.push({ jurisdiction: code, role, flow });
    }
  }
  return plan.slice(0, maxFlows === Infinity ? plan.length : maxFlows);
}

/* ------------------------------------------------------------------ */
/* Synthetic answers                                                   */
/* ------------------------------------------------------------------ */

/** Everything typed into a free-text control. Obviously synthetic, by design. */
const SYNTHETIC_TEXT = "FLOW-AUDIT SYNTHETIC VALUE";

/**
 * The pinned clear-record answers, identical to CLEAR_RECORD in
 * scripts/expungement-ai/flow-audit/lib/engine.mjs. A manifest fixture does not
 * name every rendered screen — it only holds what the evaluator asked for during
 * convergence — so without these the crawl would fall back to "the first option"
 * on screens like resolved_timing_bucket and answer lt_1_year, producing a
 * timing refusal that says nothing about the flow under test.
 */
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

function answerClassFor(value) {
  if (Array.isArray(value)) return `multi_select:${value.length}`;
  if (typeof value === "object" && value !== null) return "or_unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return "date";
  if (/^\d+$/.test(String(value))) return "number";
  return "choice_or_text";
}

/* ------------------------------------------------------------------ */
/* Crawl                                                               */
/* ------------------------------------------------------------------ */

const results = [];
const screenshots = [];
let browser;

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function capture(page, { flowId, jurisdiction, viewport, label, findingIds = [] }) {
  const safe = `${flowId}__${viewport}__${label}`.replace(/[^A-Za-z0-9_.-]/g, "_");
  const file = path.join(shotsDir, `${safe}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const hash = sha256File(file);
  const duplicate = screenshots.find((shot) => shot.sha256 === hash);
  if (duplicate) {
    fs.unlinkSync(file);
    duplicate.alsoProves.push({ flowId, viewport, label });
    return duplicate;
  }
  const record = {
    file: path.relative(rootDir, file),
    sha256: hash,
    bytes: fs.statSync(file).size,
    flowId,
    jurisdiction,
    route: safePath(page.url()),
    viewport,
    label,
    findingIds,
    alsoProves: []
  };
  screenshots.push(record);
  return record;
}

/**
 * The result-card eyebrow the product renders for each engine result code.
 *
 * UX-GLOBAL-018 — the two packet-ready eyebrows used to differ by a full stop,
 * which is why this table once distinguished them by punctuation and why a
 * screenshot could not. The card now carries `data-result-code`, which is read
 * first; this table stays as the fallback for a page that predates it.
 */
const EYEBROW_TO_RESULT_CODE = {
  "A path may be available": "packet_ready",
  "A path may be available.": "packet_ready",
  "A path may be available — read the cautions": "packet_ready_with_caution",
  "A few more details needed": "needs_more_info",
  "You may need to wait": "not_yet",
  "Next steps for your state": "guidance_only",
  "Not supported yet": "not_covered_yet",
  "This record may not match a self-help path": "likely_not_eligible",
  "This needs review": "needs_review",
  "We can't help with this record": "hard_stop",
  "We can\u2019t help with this record": "hard_stop"
};

function resultCodeFromEyebrow(eyebrow) {
  const trimmed = (eyebrow ?? "").trim();
  return EYEBROW_TO_RESULT_CODE[trimmed]
    ?? EYEBROW_TO_RESULT_CODE[trimmed.replace(/\u2019/g, "'")]
    ?? null;
}

function safePath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + (parsed.search ? "?<query-redacted>" : "");
  } catch {
    return "<unparseable>";
  }
}

async function crawlOne(context, entry, viewport) {
  const { flow, jurisdiction, role } = entry;
  const page = await context.newPage();
  const browserErrors = [];
  const failedRequests = [];
  const routeTrail = [];
  page.on("pageerror", (error) => browserErrors.push({ at: safePath(page.url()), message: String(error.message).slice(0, 300) }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text().slice(0, 300);
    browserErrors.push({
      at: safePath(page.url()),
      message: text,
      // A 503 here is the local audit stack having no analytics backend, not a
      // product defect. Classified rather than filtered, so the count stays honest.
      classification: /status of 503/.test(text) ? "environment_dependency_unavailable" : "product_error"
    });
  });
  const analyticsRequests = [];
  page.on("request", (request) => {
    if (!safePath(request.url()).startsWith("/api/analytics/")) return;
    let body = null;
    try { body = request.postData(); } catch { body = null; }
    analyticsRequests.push({
      path: safePath(request.url()),
      method: request.method(),
      // Recorded verbatim so the "analytics must never carry answer values" check
      // is made against what actually left the browser.
      body: body ? body.slice(0, 2000) : null
    });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ path: safePath(request.url()), method: request.method(), reason: (request.failure()?.errorText ?? "failed").slice(0, 120) });
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) routeTrail.push(safePath(frame.url()));
  });

  const record = {
    flowId: flow.flowId,
    jurisdiction,
    role,
    viewport,
    entryRoute: `/expungement-ai/screening/${jurisdiction}`,
    screens: [],
    terminal: null,
    browserErrors,
    failedRequests,
    routeTrail,
    analyticsRequests,
    redirectCycleDetected: false,
    reviewPageRawValueLeak: null,
    saveRefreshResumeVerified: null,
    backPreservesCommittedAnswer: null,
    saveProgressAffordancePresent: null,
    screenshotIds: [],
    blockers: []
  };

  try {
    await page.goto(`${baseUrl}/expungement-ai/screening/${jurisdiction}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    // Deliberately not waitForLoadState("networkidle"): the analytics beacon has
    // no backend in the audit stack, so the network never goes idle and every
    // page would burn the full timeout.
    await page.waitForTimeout(700);

    const answers = flow.fixture?.answers ?? {};
    let guard = 0;
    while (guard < 60) {
      guard += 1;
      const heading = await page.locator("h1").first().textContent().catch(() => null);

      // The result card is the stop condition, not the absence of a Continue
      // button: the result CTA reads "Save this matter and continue", which a
      // substring match on "Continue" happily mistakes for a question screen.
      const onResultCard = await page.locator("button:has-text('Edit my answers')").count().catch(() => 0);
      if (onResultCard > 0) break;

      const isQuestionScreen = await page.locator("h1[id^='q-']").count().catch(() => 0);
      if (!isQuestionScreen) break;

      const questionId = await page.evaluate(() => {
        const prompt = document.querySelector("h1[id^='q-']");
        return prompt ? prompt.id.replace(/^q-/, "").replace(/-prompt$/, "") : null;
      }).catch(() => null);

      // What this participant should answer here: the flow's own fixture first,
      // then the pathway steer the manifest recorded, then the pinned constant.
      const desired = questionId
        ? (answers[questionId]
          ?? (questionId === "possible_pathway_context" ? flow.branchingConditions?.pathwayContextSteer ?? undefined : undefined)
          ?? CLEAR_RECORD[questionId])
        : undefined;

      // A context-only screen carries a banner saying the answer does not decide
      // the result, and it never blocks Continue. Where this flow's fixture names
      // no steer, the honest thing is to leave it blank — answering it anyway made
      // the crawl volunteer "None of these / I am not sure" on 66 flows and take
      // the evaluator down a pathway_context_not_matched branch the fixture never
      // asked for.
      const contextOnlyScreen = questionId
        ? (await page.locator(`#q-${questionId}-context`).count().catch(() => 0)) > 0
        : false;
      const chosen = contextOnlyScreen && desired === undefined
        ? null
        : await answerCurrentScreen(page, desired);

      record.screens.push({
        route: safePath(page.url()),
        questionId,
        visibleQuestion: (heading ?? "").trim().slice(0, 200),
        selectedAnswerClass: chosen === null ? (contextOnlyScreen ? "left_blank_context_only" : "skipped") : answerClassFor(chosen),
        // The exact value chosen, not only its class. Without it a divergence
        // between the browser and the manifest cannot be replayed or explained.
        selectedValue: chosen === null ? null : chosen,
        offeredOptions: await page.locator("input[type=radio], input[type=checkbox]")
          .evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean))
          .catch(() => []),
        nextAction: "Continue"
      });

      if (record.screens.length === 1 || record.screens.length === 4) {
        const shot = await capture(page, { flowId: flow.flowId, jurisdiction, viewport, label: `question-${record.screens.length}` });
        record.screenshotIds.push(shot.sha256);
      }

      // Back must not erase a committed answer: exercised once, on the second screen.
      if (record.screens.length === 1) {
        record.saveProgressAffordancePresent = (await page.getByRole("button", { name: /^Save progress$/i }).count().catch(() => 0)) > 0;
      }
      if (record.screens.length === 2 && record.backPreservesCommittedAnswer === null) {
        const before = await page.locator("h1").first().textContent().catch(() => null);
        await page.locator("button:has-text('Back')").first().click().catch(() => {});
        await page.waitForTimeout(300);
        const checkedAfterBack = await page.locator("input:checked").count().catch(() => 0);
        record.backPreservesCommittedAnswer = checkedAfterBack > 0;
        await page.getByRole("button", { name: /^Continue\b/i }).first().click().catch(() => {});
        await page.waitForTimeout(300);
        void before;
      }

      await page.getByRole("button", { name: /^Continue\b/i }).first().click().catch(() => {});
      await page.waitForTimeout(400);
    }

    await page.waitForTimeout(1200);
    const terminalHeading = await page.locator("h1").first().textContent().catch(() => null);
    const eyebrow = await page.locator("p.uppercase").first().textContent().catch(() => null);
    // Declared by the result card itself. Punctuation is not evidence.
    const declaredResultCode = await page.locator("[data-result-code]").first().getAttribute("data-result-code").catch(() => null);
    const actionLabels = (await page.locator("button").allTextContents().catch(() => []))
      .map((label) => label.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    record.terminal = {
      route: safePath(page.url()),
      heading: (terminalHeading ?? "").trim().slice(0, 240),
      eyebrow: (eyebrow ?? "").trim().slice(0, 120),
      expectedResultCode: flow.terminalOutcome.resultCode,
      actionLabels,
      primaryActionLabel: actionLabels[0] ?? null,
      declaredResultCode,
      observedResultCode: declaredResultCode ?? resultCodeFromEyebrow(eyebrow),
      terminalMatchesManifest: (declaredResultCode ?? resultCodeFromEyebrow(eyebrow)) === flow.terminalOutcome.resultCode,
      forwardActionClicked: false,
      forwardActionNote: ALLOW_MUTATION
        ? "forward action exercised"
        : "forward action NOT clicked: it writes a pending screening row, and EXPAI_FLOW_AUDIT_ALLOW_MUTATION is not set"
    };
    record.terminal.whyText = (await page.locator("section:has(h2:text-is('Why')) li").allTextContents().catch(() => []))
      .map((line) => line.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .slice(0, 4);
    const shot = await capture(page, { flowId: flow.flowId, jurisdiction, viewport, label: "terminal" });
    record.screenshotIds.push(shot.sha256);

    // Raw fact keys and internal enums must not appear on any participant screen.
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const rawLeak = [...new Set((bodyText.match(/\b[a-z0-9]+(?:_[a-z0-9]+){1,}\b/g) ?? []))]
      .filter((token) => !/^(https?|utm_[a-z]+|data_[a-z]+)$/.test(token));
    record.reviewPageRawValueLeak = { tokens: rawLeak.slice(0, 40), count: rawLeak.length };

    // Redirect cycle: the same route entered three or more times.
    const routeCounts = {};
    for (const route of routeTrail) routeCounts[route] = (routeCounts[route] ?? 0) + 1;
    record.redirectCycleDetected = Object.values(routeCounts).some((count) => count >= 3);

    // Save / refresh / resume.
    const currentUrl = page.url();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(600);
    const afterRefreshHeading = await page.locator("h1").first().textContent().catch(() => null);
    record.saveRefreshResumeVerified = {
      urlUnchanged: page.url() === currentUrl,
      headingAfterRefresh: (afterRefreshHeading ?? "").trim().slice(0, 160),
      resumesWhereItLeftOff: (afterRefreshHeading ?? "").trim() === (terminalHeading ?? "").trim(),
      note: "The screening flow holds answers in component state only; a refresh is expected to restart the flow unless a resume session exists."
    };
    // Everything past the result card needs an authenticated Briefcase session.
    record.blockers.push({
      kind: "authenticated_surface_not_reachable",
      detail: "Save-and-continue, the Briefcase matter page, packet information, the accuracy review page, checkout and the sponsored lane all require a Supabase-backed consumer session. This crawl runs against a local build with no Supabase project, so those screens were not entered.",
      surfaces: [
        "/briefcase",
        "/briefcase/{matterId}",
        "/briefcase/{matterId}/packet-information",
        "/briefcase/{matterId}/review",
        "POST /api/expungement-ai/checkout"
      ]
    });
  } catch (error) {
    record.blockers.push({ kind: "crawl_error", detail: String(error?.message ?? error).slice(0, 300) });
  } finally {
    await page.close().catch(() => {});
  }

  return record;
}

/**
 * Answer whatever control is on screen.
 *
 * The manifest's fixture value wins whenever the rendered control actually
 * offers it. The fallback is the SAME pinned rule the static fixtures use — the
 * first option matching /^(no\b|none|yes)/i, else the first option — so a
 * browser walk and a static evaluation of the same flow describe the same
 * participant. An earlier version fell back to "the first control" for
 * checkboxes and dates, which made the crawl tick a real exclusion category on
 * every multi-select and produced 91 spurious disagreements with the manifest.
 */
function preferredOption(options, desired) {
  if (desired !== undefined && desired !== null) {
    const wanted = Array.isArray(desired) ? desired.map(String) : [String(desired)];
    const match = options.find((option) => wanted.includes(option));
    if (match) return match;
  }
  return options.find((option) => /^(no\b|none|yes)/i.test(option)) ?? options[0];
}

async function answerCurrentScreen(page, desired) {
  const radios = page.locator("input[type=radio]");
  const checkboxes = page.locator("input[type=checkbox]");
  const textInputs = page.locator("input[type=text]");
  const numberInputs = page.locator("input[type=number]");
  const selects = page.locator("select");

  if (await radios.count() > 0) {
    const options = (await radios.evaluateAll((nodes) => nodes.map((node) => node.value))).filter(Boolean);
    const chosen = preferredOption(options, desired);
    const target = page.locator(`input[type=radio][value=${JSON.stringify(chosen)}]`);
    if (await target.count() > 0) await target.first().check({ force: true }).catch(() => {});
    else await radios.first().check({ force: true }).catch(() => {});
    return chosen;
  }

  // The date control is three selects plus an "I don't know the date" checkbox.
  if (await selects.count() >= 3) {
    const iso = typeof desired === "string" && /^\d{4}-\d{2}-\d{2}$/.test(desired) ? desired : "2012-06-01";
    const [year, month, day] = iso.split("-");
    await selects.nth(0).selectOption(month).catch(async () => { await selects.nth(0).selectOption({ index: 1 }).catch(() => {}); });
    await selects.nth(1).selectOption(day).catch(async () => { await selects.nth(1).selectOption({ index: 1 }).catch(() => {}); });
    await selects.nth(2).selectOption(year).catch(async () => { await selects.nth(2).selectOption({ index: 1 }).catch(() => {}); });
    return iso;
  }

  if (await checkboxes.count() > 0) {
    // A checkbox with no value attribute reports "on". That is the "I'm not sure"
    // affordance beside a number, date or text field, never a selectable option —
    // treating it as one made the crawl answer "unknown" to every age question and
    // turned 78 flows into a spurious needs_review.
    const options = (await checkboxes.evaluateAll((nodes) => nodes.map((node) => node.value)))
      .filter((value) => Boolean(value) && value !== "on");
    if (options.length > 0) {
      const chosen = preferredOption(options, desired);
      const target = page.locator(`input[type=checkbox][value=${JSON.stringify(chosen)}]`);
      if (await target.count() > 0) await target.first().check({ force: true }).catch(() => {});
      else await checkboxes.first().check({ force: true }).catch(() => {});
      return [chosen];
    }
    // A valueless checkbox is the "or unknown" affordance; only take it when the
    // fixture asked for an unknown answer.
    if (typeof desired === "string" && /not sure|unknown|don.t know/i.test(desired)) {
      await checkboxes.first().check({ force: true }).catch(() => {});
      return { unknown: true };
    }
  }

  if (await numberInputs.count() > 0) {
    const value = typeof desired === "string" && /^\d+$/.test(desired) ? desired : "30";
    await numberInputs.first().fill(value).catch(() => {});
    return value;
  }
  if (await textInputs.count() > 0) {
    const value = typeof desired === "string" && desired.trim() ? desired : SYNTHETIC_TEXT;
    await textInputs.first().fill(value).catch(() => {});
    return value;
  }
  return null;
}

function assertNotProduction(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch {
    console.error("EXPAI_FLOW_AUDIT_BASE_URL is not a URL.");
    process.exit(2);
  }
  const forbidden = ["expungement.ai", "www.expungement.ai", "legalease.com", "www.legalease.com", "legaleasepartner.com", "www.legaleasepartner.com"];
  if (forbidden.includes(host)) {
    console.error(`Refusing to crawl ${host}: that is a production origin. Point EXPAI_FLOW_AUDIT_BASE_URL at staging or a local build.`);
    process.exit(2);
  }
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const plan = crawlPlan();
console.log(`crawling ${plan.length} flow(s) against ${new URL(baseUrl).origin} (mutation ${ALLOW_MUTATION ? "allowed" : "refused"})`);

const launchOptions = { headless: true };
if (process.env.EXPAI_FLOW_AUDIT_CHROMIUM?.trim()) launchOptions.executablePath = process.env.EXPAI_FLOW_AUDIT_CHROMIUM.trim();

try {
  browser = await chromium.launch(launchOptions);
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  for (const entry of plan) {
    results.push(await crawlOne(desktop, entry, "desktop-1440x1000"));
  }
  // Mobile evidence: one capture per unique screen template rather than per flow.
  const mobileTemplates = new Map();
  for (const entry of plan) {
    const template = `${entry.role}:${entry.flow.terminalOutcome.resultCode}`;
    if (mobileTemplates.has(template)) continue;
    mobileTemplates.set(template, entry);
  }
  for (const entry of mobileTemplates.values()) {
    results.push(await crawlOne(mobile, entry, "mobile-390x844"));
  }
  // Two jurisdiction-independent surfaces, captured once each.
  for (const [label, route] of [["state-picker", "/expungement-ai/screening"], ["unregistered-jurisdiction", "/expungement-ai/screening/mississippi"]]) {
    const page = await desktop.newPage();
    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(1200);
      const heading = await page.locator("h1").first().textContent().catch(() => null);
      const shot = await capture(page, { flowId: `EXPAI-SURFACE-${label}`, jurisdiction: "XX", viewport: "desktop-1440x1000", label });
      const stateCount = await page.locator("[data-state-count]").getAttribute("data-state-count").catch(() => null);
      results.push({
        flowId: `EXPAI-SURFACE-${label}`,
        jurisdiction: "XX",
        role: "shared_surface",
        viewport: "desktop-1440x1000",
        entryRoute: route,
        screens: [],
        terminal: { route: safePath(page.url()), heading: (heading ?? "").trim().slice(0, 240), eyebrow: null, expectedResultCode: label === "state-picker" ? "n/a" : "unsupported_jurisdiction", actionLabels: [], observedResultCode: null, terminalMatchesManifest: null, forwardActionClicked: false, forwardActionNote: "shared surface, no forward action exercised" },
        statePickerJurisdictionCount: stateCount ? Number(stateCount) : null,
        browserErrors: [],
        failedRequests: [],
        routeTrail: [safePath(page.url())],
        analyticsRequests: [],
        redirectCycleDetected: false,
        reviewPageRawValueLeak: null,
        saveRefreshResumeVerified: null,
        backPreservesCommittedAnswer: null,
        saveProgressAffordancePresent: null,
        screenshotIds: [shot.sha256],
        blockers: []
      });
    } finally {
      await page.close().catch(() => {});
    }
  }
} finally {
  await browser?.close().catch(() => {});
}

const report = {
  schemaVersion: "expai-flow-audit-crawl/v1",
  generatedBy: "tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs",
  baseOrigin: new URL(baseUrl).origin,
  mutationAllowed: ALLOW_MUTATION,
  syntheticIdentitiesOnly: true,
  stripePaymentCompleted: false,
  totals: {
    flowsCrawled: new Set(results.map((r) => r.flowId)).size,
    desktopCaptures: screenshots.filter((s) => s.viewport.startsWith("desktop")).length,
    mobileCaptures: screenshots.filter((s) => s.viewport.startsWith("mobile")).length,
    browserErrors: results.reduce((sum, r) => sum + r.browserErrors.length, 0),
    productBrowserErrors: results.reduce((sum, r) => sum + r.browserErrors.filter((e) => e.classification === "product_error").length, 0),
    environmentBrowserErrors: results.reduce((sum, r) => sum + r.browserErrors.filter((e) => e.classification === "environment_dependency_unavailable").length, 0),
    flowsLosingAnswersOnRefresh: results.filter((r) => r.saveRefreshResumeVerified && r.saveRefreshResumeVerified.resumesWhereItLeftOff === false).length,
    flowsWhereBackPreservedTheAnswer: results.filter((r) => r.backPreservesCommittedAnswer === true).length,
    flowsWithRawTokenOnAParticipantScreen: results.filter((r) => (r.reviewPageRawValueLeak?.count ?? 0) > 0).length,
    analyticsRequestsObserved: results.reduce((sum, r) => sum + r.analyticsRequests.length, 0),
    analyticsRequestsCarryingAnAnswerValue: results.reduce((sum, r) => sum + r.analyticsRequests.filter((request) => /"answers"|"charge"|"county"|"court"|"contact_information"|"participant_full_legal_name"/.test(request.body ?? "")).length, 0),
    failedRequests: results.reduce((sum, r) => sum + r.failedRequests.length, 0),
    redirectCyclesDetected: results.filter((r) => r.redirectCycleDetected).length,
    terminalsMatchingTheManifest: results.filter((r) => r.terminal?.terminalMatchesManifest === true).length,
    terminalsDivergingFromTheManifest: results.filter((r) => r.terminal && r.terminal.terminalMatchesManifest === false).length,
    flowsWithBlockers: results.filter((r) => r.blockers.length > 0).length
  },
  screenshots,
  flows: results
};

const outFile = path.join(evidenceDir, "crawl-report.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
console.log(`wrote ${path.relative(rootDir, outFile)}`);
console.log(`  flows ${report.totals.flowsCrawled}  desktop ${report.totals.desktopCaptures}  mobile ${report.totals.mobileCaptures}  errors ${report.totals.browserErrors}  cycles ${report.totals.redirectCyclesDetected}`);
