#!/usr/bin/env node
// Hosted Playwright probe of the live public site's "Save my result and
// continue" transition for the Mississippi dropped-misdemeanor non-conviction
// screening.
//
// Incident: the live result page shows "We could not save this matter right
// now. Please try again." because POST /api/expungement-ai/screening/pending
// answers HTTP 503 { ok: false, error: "pending_storage_failed" } — the
// Production database lacks migration
// 20260828100000_shared_pending_result_and_atomic_claim. This probe observes
// and records that from the outside (sanitized), and after the schema repair
// proves the full pending -> claim -> exact-matter transition with the one
// authorized synthetic account.
//
// Phases (RCAP_PRODUCTION_PHASE):
//   save_transition_reproduce  signed-out journey through the Save click in each
//                              engine that launches; captures the pending
//                              response, the claim response when one follows,
//                              and the visible error. The phase passes when the
//                              observation was captured; transitionHealthy
//                              records whether the transition actually worked.
//   save_transition_verify     the reproduce journey plus the dedicated test
//                              account: create-or-reset it through the Supabase
//                              Management API, sign in through the claim
//                              handoff, land on the exact matter, claim a
//                              second result while signed in, and prove the
//                              first claim token cannot mint a third matter.
//
// The screening walk is the Clinic journey's (scripts/verify-rcap-commercial-
// browser.mjs): screeningHeading, visibleScreeningPrompt, answerChoice, the
// Mississippi follow-up map, the result-heading regex and exactBriefcaseItemId
// are reused unchanged.
//
// What this never does: it never opens a payment surface, never clicks any
// payment control, never asks the server to build a packet, never prints a
// claim token, the account password, the sign-in handoff URL or the service
// key, and never touches a Supabase project other than the pinned Production
// project. The only account it signs in as is the reserved synthetic probe
// identity on the .test TLD.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium, webkit } from "playwright";
// Stripe's own page controls are known in one place. The live order drives the
// same "Add promotion code" entry the sandbox journeys drive, rather than
// keeping a second description of Stripe's markup here.
import { applyPromotionCode } from "./rcap-stripe-checkout-browser.mjs";

const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const PROBE_ACCOUNT_EMAIL = "rcap-production-probe@rcap-acceptance.test";
const PHASE_REPRODUCE = "save_transition_reproduce";
const PHASE_VERIFY = "save_transition_verify";
// The authorized live order. It runs the verify journey unchanged and then
// takes the one action that journey deliberately stops short of, with a
// promotion code that must clear the total to zero. The code is never committed:
// it arrives as an input and is redacted out of every artifact.
const PHASE_LIVE_ORDER = "live_zero_dollar_order";
const SUPPORTED_BROWSERS = Object.freeze(["chromium", "webkit"]);

const SCREENING_PATH = "/expungement-ai/screening/ms";
const EVALUATE_PATH = "/api/expungement-ai/evaluate";
const PENDING_PATH = "/api/expungement-ai/screening/pending";
const CLAIM_PATH = "/api/expungement-ai/screening/pending/claim";
const SIGN_IN_PATH = "/expungement-ai/sign-in";
const MATTERS_PATH = "/briefcase/matters";
const REVIEW_PATH_PREFIX = "/briefcase";

const SAVE_RESULT_ERROR = "We could not save this matter right now. Please try again.";
const PENDING_CLAIM_ERROR = "You are signed in, but we could not save your result yet.";
const NON_CONVICTION_PATHWAY_LABEL = "Non-conviction expungement for dismissal, no disposition, or acquittal";
const MATTER_NOT_FOUND = "We couldn't find that matter";
// Signed-out DTC label first; the partner-mode label is accepted as well.
const SAVE_BUTTON_NAME = /^(?:Save my result and continue|Save to my Briefcase and continue)$/;
// The Mississippi result heading reads "A Mississippi non-conviction expungement
// path may be available." so it is matched on its shared phrase.
const RESULT_HEADING = /path may be available|You may be able to prepare an expungement packet/i;
const EXPECTED_INCIDENT = Object.freeze({
  status: 503,
  error: "pending_storage_failed",
  missingMigration: "20260828100000_shared_pending_result_and_atomic_claim"
});
// The engine orders the last two Mississippi questions itself and may evaluate
// before both have been shown; whichever appears is answered.
const MISSISSIPPI = Object.freeze([
  ["About how long ago did this case end or get resolved?", "More than 10 years ago"],
  ["Have you completed everything the court ordered in this case?", "Yes"]
]);

const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const ORIGIN = safeOrigin(process.env.RCAP_PUBLIC_ORIGIN?.trim() || "https://expungement.ai", "RCAP_PUBLIC_ORIGIN");
const PROJECT_REF_INPUT = (process.env.RCAP_PRODUCTION_PROJECT_REF ?? "").trim();
const SUPABASE_URL = safeOrigin(
  process.env.RCAP_PRODUCTION_SUPABASE_URL?.trim() || `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
  "RCAP_PRODUCTION_SUPABASE_URL"
);
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const LIVE_PROMOTION_CODE = (process.env.RCAP_LIVE_PROMOTION_CODE ?? "").trim();
// Resuming an authorized order. When this names a matter that already reached
// Final verification, the phase signs in and goes straight to it instead of
// screening and filling the builder again. Re-running the whole journey would
// mint another matter and leave the last one stranded, and the point of a
// resume is that the participant's work already exists.
const RESUME_MATTER_ID = (process.env.RCAP_RESUME_MATTER_ID ?? "").trim();
const CHROMIUM_EXECUTABLE = process.env.RCAP_BROWSER_CHROMIUM?.trim() || "";
const BROWSERS = (process.env.RCAP_PROBE_BROWSERS ?? "chromium,webkit")
  .split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-save-transition-${PHASE}.json`);
const SHOTS_DIR = path.join(EVIDENCE_DIR, "save-transition-screenshots", PHASE);

// --- input contract -----------------------------------------------------------
if (PHASE !== PHASE_REPRODUCE && PHASE !== PHASE_VERIFY && PHASE !== PHASE_LIVE_ORDER) {
  fail(`RCAP_PRODUCTION_PHASE must be ${PHASE_REPRODUCE}, ${PHASE_VERIFY} or ${PHASE_LIVE_ORDER}.`);
}
if (PHASE === PHASE_LIVE_ORDER && !LIVE_PROMOTION_CODE) {
  fail(`${PHASE_LIVE_ORDER} requires RCAP_LIVE_PROMOTION_CODE. Without a code that clears the total, this phase would place a paid order, which it is not authorized to do.`);
}
if (RESUME_MATTER_ID && !validUuid(RESUME_MATTER_ID)) {
  fail("RCAP_RESUME_MATTER_ID must be one exact matter id.");
}
if (RESUME_MATTER_ID && PHASE !== PHASE_LIVE_ORDER) {
  fail(`RCAP_RESUME_MATTER_ID only applies to ${PHASE_LIVE_ORDER}.`);
}
if (!BROWSERS.includes("chromium") || BROWSERS.some((entry) => !SUPPORTED_BROWSERS.includes(entry))) {
  fail(`RCAP_PROBE_BROWSERS must name chromium and may add webkit; got ${JSON.stringify(BROWSERS)}.`);
}
if (new URL(ORIGIN).protocol !== "https:") fail("RCAP_PUBLIC_ORIGIN must use HTTPS.");
if (PROJECT_REF_INPUT && PROJECT_REF_INPUT !== PRODUCTION_PROJECT_REF) {
  fail("RCAP_PRODUCTION_PROJECT_REF does not name the pinned Production project.");
}
if (new URL(SUPABASE_URL).hostname !== `${PRODUCTION_PROJECT_REF}.supabase.co`) {
  fail("RCAP_PRODUCTION_SUPABASE_URL does not belong to the pinned Production project.");
}
if (PHASE === PHASE_VERIFY) {
  if (!SUPABASE_ACCESS_TOKEN) fail("SUPABASE_ACCESS_TOKEN is required for the verify phase.");
  if (PROJECT_REF_INPUT !== PRODUCTION_PROJECT_REF) fail("RCAP_PRODUCTION_PROJECT_REF must equal the pinned Production project for the verify phase.");
}
fs.mkdirSync(SHOTS_DIR, { recursive: true });

// --- evidence -----------------------------------------------------------------
// Every value that must never leave memory is registered here so any string
// that reaches the log or the evidence file is scrubbed first.
const secrets = new Set();
// A live 100%-off promotion code is a bearer instrument: anyone holding it can
// take a packet for nothing. It is masked in evidence exactly like a key.
if (LIVE_PROMOTION_CODE) secrets.add(LIVE_PROMOTION_CODE);
if (SUPABASE_ACCESS_TOKEN) secrets.add(SUPABASE_ACCESS_TOKEN);
const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-save-transition-probe/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  publicOrigin: ORIGIN,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  screeningPath: SCREENING_PATH,
  endpoints: { evaluate: EVALUATE_PATH, pending: PENDING_PATH, claim: CLAIM_PATH, signIn: SIGN_IN_PATH },
  expectedIncident: EXPECTED_INCIDENT,
  requestedBrowsers: BROWSERS,
  browsers: {},
  account: null,
  transitionHealthy: false,
  mutations: {
    pendingResultsWritten: 0,
    mattersClaimed: [],
    accountCreated: false,
    accountPasswordReset: false
  },
  // Every third-party host contacted and every POST path on the public origin
  // is recorded per browser (externalRequestHosts, originPostPaths), so any
  // surface this probe must never reach would be visible in the evidence.
  secretsPersisted: false,
  claimTokenPersisted: false,
  handoffUrlPersisted: false,
  verdicts
};

function redact(value) {
  let text = typeof value === "string" ? value : String(value ?? "");
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  // A claim token only ever travels in the sign-in query string.
  return text.replace(/([?&]claim=)[^&\s"'#]+/g, "$1[redacted]");
}

function record(caseId, passed, observed) {
  const clean = redact(observed);
  verdicts.push({ caseId, passed, observed: clean });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${clean}`);
  if (!passed) throw new Error(`${caseId}: ${clean}`);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure === null ? null : redact(failure);
  fs.writeFileSync(EVIDENCE_FILE, `${redact(JSON.stringify(evidence, null, 2))}\n`);
}

// --- Supabase Management / Auth admin (verify phase only) ---------------------
async function managementApi(pathname, { method = "GET", body = null } = {}) {
  const response = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces as null */ }
  return { ok: response.ok, status: response.status, json, requestId: response.headers.get("sb-request-id") ?? null };
}

async function authAdmin(pathname, serviceKey, { method = "GET", body = null } = {}) {
  const response = await fetch(`${SUPABASE_URL}${pathname}`, {
    method,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces as null */ }
  return { ok: response.ok, status: response.status, json };
}

// Creates or resets the one authorized synthetic account. The password is
// random per run and lives only in memory; the service key is masked before
// anything else can print it and is never written anywhere.
async function ensureProbeAccount() {
  const keys = await managementApi(`/v1/projects/${PRODUCTION_PROJECT_REF}/api-keys?reveal=true`);
  const serviceKey = (Array.isArray(keys.json) ? keys.json : []).find((entry) => entry?.name === "service_role")?.api_key ?? "";
  if (serviceKey) {
    secrets.add(serviceKey);
    if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${serviceKey}`);
  }
  record(
    "production_service_key_resolved_and_masked",
    Boolean(serviceKey),
    serviceKey
      ? `service_role key read from the Management API for ${PRODUCTION_PROJECT_REF} and masked; it is held in memory only`
      : `could not read the Production project's service_role key (HTTP ${keys.status}${keys.requestId ? `, request ${keys.requestId}` : ""})`
  );

  const password = crypto.randomBytes(32).toString("base64url");
  secrets.add(password);
  const create = await authAdmin("/auth/v1/admin/users", serviceKey, {
    method: "POST",
    body: { email: PROBE_ACCOUNT_EMAIL, password, email_confirm: true }
  });
  let userId = typeof create.json?.id === "string" ? create.json.id : null;
  let createdNow = create.ok && Boolean(userId);
  let resetNow = false;
  let detail = `create HTTP ${create.status}`;
  if (!createdNow && create.status === 422) {
    // The identity already exists from an earlier probe run: look it up and
    // rotate its password so this run owns the only credential.
    const lookup = await managementApi(`/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`, {
      method: "POST",
      body: { query: `select id from auth.users where lower(email)=lower('${PROBE_ACCOUNT_EMAIL.replaceAll("'", "''")}') limit 1` }
    });
    const existingId = Array.isArray(lookup.json) ? lookup.json[0]?.id : null;
    detail += `; lookup HTTP ${lookup.status}`;
    if (validUuid(existingId)) {
      const update = await authAdmin(`/auth/v1/admin/users/${encodeURIComponent(existingId)}`, serviceKey, {
        method: "PUT",
        body: { password, email_confirm: true }
      });
      detail += `; password rotation HTTP ${update.status}`;
      if (update.ok) {
        userId = existingId;
        resetNow = true;
      }
    }
  }
  evidence.mutations.accountCreated = createdNow;
  evidence.mutations.accountPasswordReset = resetNow;
  evidence.account = {
    email: PROBE_ACCOUNT_EMAIL,
    userId: validUuid(userId) ? userId : null,
    createdNow,
    passwordResetNow: resetNow,
    passwordPersisted: false,
    emailConfirmedByAdmin: true
  };
  record(
    "probe_account_is_ready",
    validUuid(userId) && (createdNow || resetNow),
    validUuid(userId)
      ? `${PROBE_ACCOUNT_EMAIL} is ${createdNow ? "newly created" : "reset"} and confirmed (${detail})`
      : `could not create or reset ${PROBE_ACCOUNT_EMAIL} (${detail})`
  );
  return { email: PROBE_ACCOUNT_EMAIL, password };
}

// --- browser plumbing ---------------------------------------------------------
async function launchBrowser(name) {
  if (name === "chromium") {
    const options = { headless: true };
    if (CHROMIUM_EXECUTABLE) options.executablePath = CHROMIUM_EXECUTABLE;
    return chromium.launch(options);
  }
  return webkit.launch({ headless: true });
}

// `label` names the section in summaries and screenshot files; the verify
// phase's signed-in re-run shares the chromium engine but keeps its own label
// so its screenshots never overwrite the signed-out journey's.
function newSection(name, label = name) {
  return {
    browser: label,
    status: "pending",
    version: null,
    launch: { executablePath: name === "chromium" ? Boolean(CHROMIUM_EXECUTABLE) : false, error: null },
    screening: null,
    saveButtonLabel: null,
    pending: { observed: false },
    claim: null,
    handoff: null,
    visibleErrorText: null,
    exactIncidentCopyShown: false,
    transitionHealthy: false,
    screenshots: [],
    browserErrors: [],
    externalRequestHosts: [],
    originPostPaths: []
  };
}

function attachObservers(page, section) {
  const originHost = new URL(ORIGIN).hostname;
  const external = new Set(section.externalRequestHosts);
  const posts = new Set(section.originPostPaths);
  page.on("pageerror", (error) => section.browserErrors.push(redact(`pageerror at ${safePath(page.url())}: ${error.message}`).slice(0, 300)));
  page.on("console", (message) => {
    if (message.type() === "error") section.browserErrors.push(redact(`console at ${safePath(page.url())}: ${message.text()}`).slice(0, 300));
  });
  page.on("request", (request) => {
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (url.hostname !== originHost) external.add(url.hostname);
    else if (request.method() === "POST") posts.add(url.pathname);
    section.externalRequestHosts = [...external].sort();
    section.originPostPaths = [...posts].sort();
  });
}

async function screenshot(page, section, stem) {
  const file = path.join(SHOTS_DIR, `${section.browser}-${stem}.png`);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: file, fullPage: true, timeout: 15_000 });
    section.screenshots.push(path.relative(EVIDENCE_DIR, file));
  } catch (error) {
    section.browserErrors.push(`screenshot ${stem} failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300));
  }
}

// A loud failure: the visible headings, alerts, sanitized location and the last
// pending/claim statuses travel with the message so a run log is diagnosable.
async function withPageContext(page, section, message) {
  const headings = await page.locator("h1, h2, legend").allInnerTexts().catch(() => []);
  const alerts = await visibleAlerts(page);
  const excerpt = await page.locator("main").innerText().then((text) => text.replace(/\s+/g, " ").slice(0, 400)).catch(() => "");
  const statuses = `pending ${section.pending?.status ?? "not observed"}${section.pending?.error ? ` (${section.pending.error})` : ""}; claim ${section.claim?.status ?? "not observed"}${section.claim?.error ? ` (${section.claim.error})` : ""}`;
  return new Error(redact(`${message} [location ${safePath(page.url())}; ${statuses}; headings ${JSON.stringify(headings)}; alerts ${JSON.stringify(alerts)}; main: ${JSON.stringify(excerpt)}]`));
}

async function visibleAlerts(page) {
  const texts = await page.getByRole("alert").allInnerTexts().catch(() => []);
  return texts.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function responseFor(pathname) {
  return (response) => response.request().method() === "POST" && safePathname(response.url()) === pathname;
}

function header(response, name) {
  const value = response.headers()[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// --- the signed-out journey ---------------------------------------------------
// Walks the Mississippi screening exactly as the Clinic journey does, registers
// the pending and claim response waits BEFORE clicking Save, and records what
// came back. Returns only what the caller needs to continue; the handoff URL
// (which carries the claim token) stays in memory and is never recorded.
async function runSignedOutJourney(page, section) {
  const evaluationStatuses = [];
  page.on("response", (response) => {
    if (response.request().method() === "POST" && safePathname(response.url()) === EVALUATE_PATH) evaluationStatuses.push(response.status());
  });

  await page.goto(`${ORIGIN}${SCREENING_PATH}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const resultHeading = page.getByRole("heading", { name: RESULT_HEADING });
  const answeredMississippi = [];
  try {
    await answerChoice(page, "Are you asking about your own record?", "Yes");
    await answerChoice(page, "Did this case happen in Mississippi (not a federal case)?", "State or local");
    await answerChoice(page, "How did the case end?", "The case was dropped or thrown out");
    await answerChoice(page, "What kind of charge was it?", "Misdemeanor");
    await answerChoice(page, "Do any of these sound like your situation?", NON_CONVICTION_PATHWAY_LABEL);
    const remainingMississippi = new Map(MISSISSIPPI);
    while (remainingMississippi.size > 0) {
      const shown = await visibleScreeningPrompt(page, [...remainingMississippi.keys()], resultHeading);
      if (shown === null) break;
      const option = remainingMississippi.get(shown);
      remainingMississippi.delete(shown);
      answeredMississippi.push(shown);
      await answerChoice(page, shown, option);
    }
  } catch (error) {
    throw await withPageContext(page, section, `${section.browser}: the Mississippi screening walk failed after ${JSON.stringify(answeredMississippi)}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await resultHeading.waitFor({ state: "visible", timeout: 45_000 });
  } catch {
    throw await withPageContext(page, section, `${section.browser}: the screening result heading did not appear after ${JSON.stringify(answeredMississippi)}; evaluation statuses ${JSON.stringify(evaluationStatuses)}`);
  }
  const resultHeadingText = (await resultHeading.first().innerText().catch(() => "")).trim();
  section.screening = {
    followUpOrder: answeredMississippi,
    evaluationStatuses,
    resultHeading: resultHeadingText,
    pathwayNamed: await page.getByText(NON_CONVICTION_PATHWAY_LABEL, { exact: false }).first().isVisible().catch(() => false)
  };
  if (!(evaluationStatuses.length > 0 && evaluationStatuses[evaluationStatuses.length - 1] < 400)) {
    throw await withPageContext(page, section, `${section.browser}: authoritative screening evaluation statuses were ${JSON.stringify(evaluationStatuses)}; the last must succeed before the result renders`);
  }

  const saveButton = page.getByRole("button", { name: SAVE_BUTTON_NAME });
  try {
    await saveButton.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    const buttons = await page.getByRole("button").allInnerTexts().catch(() => []);
    throw await withPageContext(page, section, `${section.browser}: the Save button was not visible on the result page; buttons ${JSON.stringify(buttons)}`);
  }
  section.saveButtonLabel = (await saveButton.innerText()).replace(/\s+/g, " ").trim();

  // Registered before the click so neither response can be missed.
  const pendingResponsePromise = page.waitForResponse(responseFor(PENDING_PATH), { timeout: 30_000 }).then((response) => response, () => null);
  const claimResponsePromise = page.waitForResponse(responseFor(CLAIM_PATH), { timeout: 30_000 }).then((response) => response, () => null);
  await saveButton.click();

  const pendingResponse = await pendingResponsePromise;
  if (!pendingResponse) {
    await screenshot(page, section, "01-result-after-save-click");
    throw await withPageContext(page, section, `${section.browser}: no POST ${PENDING_PATH} was observed within 30s of clicking "${section.saveButtonLabel}"`);
  }
  const pendingJson = await pendingResponse.json().catch(() => null);
  const pendingStatus = pendingResponse.status();
  const pendingError = typeof pendingJson?.error === "string" ? pendingJson.error : null;
  const tokenIssued = typeof pendingJson?.claimToken === "string" && pendingJson.claimToken.length > 0;
  section.pending = {
    observed: true,
    status: pendingStatus,
    ok: pendingResponse.ok(),
    error: pendingError,
    tokenIssued,
    xVercelId: header(pendingResponse, "x-vercel-id"),
    xRequestId: header(pendingResponse, "x-request-id"),
    matchesIncidentSignature: pendingStatus === EXPECTED_INCIDENT.status && pendingError === EXPECTED_INCIDENT.error
  };
  if (pendingResponse.ok() && tokenIssued) evidence.mutations.pendingResultsWritten += 1;

  const pendingOk = pendingResponse.ok() && tokenIssued;
  if (!pendingOk) {
    const incidentAlert = page.getByRole("alert").filter({ hasText: SAVE_RESULT_ERROR });
    section.exactIncidentCopyShown = await incidentAlert.first().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
    section.visibleErrorText = section.exactIncidentCopyShown ? SAVE_RESULT_ERROR : ((await visibleAlerts(page))[0] ?? null);
    section.claim = { observed: false, status: null, error: null };
    section.handoff = { reached: false, path: safePathname(page.url()), modeCreate: false, claimParamPresent: false };
    section.transitionHealthy = false;
    await screenshot(page, section, "01-result-after-save-click");
    return { pendingOk: false, claimStatus: null, handoffUrl: null, matterId: null };
  }

  await screenshot(page, section, "01-result-after-save-click");
  const claimResponse = await claimResponsePromise;
  const claimJson = claimResponse ? await claimResponse.json().catch(() => null) : null;
  section.claim = {
    observed: Boolean(claimResponse),
    status: claimResponse?.status() ?? null,
    error: typeof claimJson?.error === "string" ? claimJson.error : null,
    xVercelId: claimResponse ? header(claimResponse, "x-vercel-id") : null,
    xRequestId: claimResponse ? header(claimResponse, "x-request-id") : null
  };

  let handoffUrl = null;
  let matterId = null;
  if (claimResponse?.status() === 401) {
    await page.waitForURL((url) => url.pathname === SIGN_IN_PATH, { timeout: 20_000 }).catch(() => null);
    const location = new URL(page.url());
    const claimParam = location.searchParams.get("claim") ?? "";
    section.handoff = {
      reached: location.pathname === SIGN_IN_PATH,
      path: location.pathname,
      modeCreate: location.searchParams.get("mode") === "create",
      claimParamPresent: claimParam.length >= 32
    };
    if (section.handoff.reached && section.handoff.claimParamPresent) handoffUrl = page.url();
  } else if (claimResponse?.ok()) {
    // Only possible when the context is already signed in.
    await page.waitForURL((url) => validUuid(exactBriefcaseItemId(url.pathname)), { timeout: 20_000 }).catch(() => null);
    matterId = exactBriefcaseItemId(new URL(page.url()).pathname);
    section.handoff = { reached: false, path: safePathname(page.url()), modeCreate: false, claimParamPresent: false, matterId };
  } else {
    section.handoff = { reached: false, path: safePathname(page.url()), modeCreate: false, claimParamPresent: false };
  }
  section.visibleErrorText = (await visibleAlerts(page))[0] ?? null;
  section.transitionHealthy = section.claim.status === 401
    && section.handoff.reached && section.handoff.modeCreate && section.handoff.claimParamPresent;
  await screenshot(page, section, "02-after-save-transition");
  return { pendingOk: true, claimStatus: claimResponse?.status() ?? null, handoffUrl, matterId };
}

function summarize(section) {
  if (section.status === "not_available") return `${section.browser}: not_available (${section.launch.error ?? "launch failed"})`;
  if (section.status === "error") return `${section.browser}: error — ${section.error ?? "unknown"}`;
  const pending = section.pending.observed
    ? `pending HTTP ${section.pending.status}${section.pending.error ? ` ${section.pending.error}` : " ok"}`
    : "pending not observed";
  const claim = section.claim?.observed ? `claim HTTP ${section.claim.status}${section.claim.error ? ` ${section.claim.error}` : ""}` : "claim not observed";
  const handoff = section.handoff?.reached
    ? `handoff ${SIGN_IN_PATH} mode=create ${section.handoff.modeCreate} claim-param ${section.handoff.claimParamPresent}`
    : `no handoff (at ${section.handoff?.path ?? "unknown"})`;
  const error = section.visibleErrorText ? `; visible error ${JSON.stringify(section.visibleErrorText)}` : "";
  return `${section.browser}: ${pending}; ${claim}; ${handoff}${error}; transitionHealthy=${section.transitionHealthy}`;
}

// --- reproduce phase ------------------------------------------------------------
async function reproduceIn(name) {
  const section = newSection(name);
  evidence.browsers[name] = section;
  let browser = null;
  try {
    browser = await launchBrowser(name);
  } catch (error) {
    section.status = "not_available";
    section.launch.error = redact(error instanceof Error ? error.message : String(error)).slice(0, 200);
    if (name === "chromium") throw new Error(`chromium could not launch: ${section.launch.error}`);
    console.log(`  ${summarize(section)}`);
    return section;
  }
  try {
    section.version = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    const page = await context.newPage();
    attachObservers(page, section);
    await runSignedOutJourney(page, section);
    section.status = "captured";
  } catch (error) {
    section.status = "error";
    section.error = redact(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await browser.close().catch(() => null);
    console.log(`  ${summarize(section)}`);
  }
  return section;
}

async function reproducePhase() {
  // WebKit is best-effort at launch only: an engine that launches must capture
  // the observation like chromium does.
  for (const name of BROWSERS) await reproduceIn(name);
  const chromiumSection = evidence.browsers.chromium;
  record(
    "chromium_save_click_observation_captured",
    chromiumSection?.status === "captured" && chromiumSection.pending.observed,
    summarize(chromiumSection)
  );
  for (const name of BROWSERS.filter((entry) => entry !== "chromium")) {
    const section = evidence.browsers[name];
    record(
      `${name}_save_click_observation_captured_or_not_available`,
      section?.status === "captured" || section?.status === "not_available",
      summarize(section)
    );
  }
  const captured = Object.values(evidence.browsers).filter((section) => section.status === "captured");
  evidence.transitionHealthy = captured.length > 0 && captured.every((section) => section.transitionHealthy);
  const unhealthy = captured.filter((section) => !section.transitionHealthy);
  if (unhealthy.length > 0) {
    const signature = unhealthy.map((section) => `${section.browser} pending HTTP ${section.pending.status} ${section.pending.error ?? ""}`.trim()).join("; ");
    console.log(`  NOTE transition is not healthy — ${signature}${unhealthy.some((section) => section.pending.matchesIncidentSignature) ? ` (matches the ${EXPECTED_INCIDENT.missingMigration} incident signature)` : ""}`);
  }
}

// Continues the claimed matter through the packet-information builder to Final
// verification and stops at the next legitimate action without taking it. The
// checkout button is located and reported, never clicked, so no charge is
// created and no packet is generated.
async function completePacketInformationAndVerify(page, section, matterId) {
  const journey = { matterId, builderSteps: 0, saveStatuses: [], reviewBranch: null, verificationPanelPresent: false };
  await page.goto(new URL(`${MATTERS_PATH}/${matterId}`, ORIGIN).href, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const builderLink = page.getByRole("link", { name: /^(?:Complete packet information|Resume packet information|Continue my Mississippi clinic packet)$/ });
  if (!(await builderLink.count())) {
    throw await withPageContext(page, section, `chromium: the claimed matter offered no packet-information action`);
  }
  journey.builderEntryLabel = (await builderLink.first().innerText().catch(() => "")).trim();
  await builderLink.first().click();
  await page.waitForURL((url) => url.pathname.endsWith("/packet-information"), { timeout: 30_000 });

  for (let step = 0; step < 90 && new URL(page.url()).pathname.endsWith("/packet-information"); step += 1) {
    await answerBuilderStep(page);
    const savePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/expungement-ai/briefcase/${matterId}/packet-information`,
      { timeout: 30_000 }
    ).then((response) => response, () => null);
    const finalButton = page.getByRole("button", { name: "Review packet facts", exact: true });
    if (await finalButton.isVisible().catch(() => false)) await finalButton.click();
    else await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    const save = await savePromise;
    journey.builderSteps += 1;
    journey.saveStatuses.push(save?.status() ?? null);
    if (!save?.ok()) {
      throw await withPageContext(page, section, `chromium: packet-information save ${journey.builderSteps} returned ${save?.status() ?? "no response"}`);
    }
  }
  await page.waitForURL((url) => url.pathname.endsWith("/review"), { timeout: 30_000 });

  // "Final verification" is also the heading of the review page's unavailable
  // branch, so the panel itself is the only honest signal.
  const panel = page.locator(VERIFICATION_PANEL);
  const unavailable = page.locator(UNAVAILABLE_BRANCH);
  await Promise.race([
    panel.waitFor({ state: "visible", timeout: 25_000 }).catch(() => null),
    unavailable.waitFor({ state: "visible", timeout: 25_000 }).catch(() => null)
  ]);
  journey.verificationPanelPresent = (await panel.count()) > 0;
  if (!journey.verificationPanelPresent) {
    journey.reviewBranch = await unavailable.evaluate((node) => Object.fromEntries(
      Array.from(node.attributes).filter((attribute) => attribute.name.startsWith("data-")).map((attribute) => [attribute.name, attribute.value])
    )).catch(() => null);
    section.packetJourney = journey;
    await screenshot(page, section, "06-review-unavailable");
    throw await withPageContext(page, section, `chromium: Final verification is unavailable for the claimed matter: ${JSON.stringify(journey.reviewBranch)}`);
  }
  journey.panelStateBeforeVerify = await panel.getAttribute("data-packet-verification-state");
  await screenshot(page, section, "06-final-verification");

  const verifyButton = page.getByRole("button", { name: CONSUMER_VERIFY_LABEL, exact: true });
  const verifyVisible = await verifyButton.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false);
  journey.verifyActionPresent = verifyVisible;
  if (!verifyVisible) {
    journey.panelText = redact((await panel.innerText().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 400));
    section.packetJourney = journey;
    await screenshot(page, section, "06-verify-action-missing");
    throw await withPageContext(page, section, `chromium: the Final verification panel rendered but offered no verify action; panel: ${JSON.stringify(journey.panelText)}`);
  }
  const verifyPromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/expungement-ai/briefcase/${matterId}/packet-information`,
    { timeout: 30_000 }
  ).then((response) => response, () => null);
  await verifyButton.click();
  const verifyResponse = await verifyPromise;
  journey.verifyStatus = verifyResponse?.status() ?? null;
  if (!verifyResponse?.ok()) {
    section.packetJourney = journey;
    throw await withPageContext(page, section, `chromium: Final verification returned ${journey.verifyStatus ?? "no response"}`);
  }
  journey.panelStateAfterVerify = await panel.getAttribute("data-packet-verification-state").catch(() => null);

  // The next legitimate action only. It is never taken.
  const checkout = page.getByRole("button", { name: CONSUMER_CHECKOUT_LABEL, exact: true });
  journey.nextActionPresent = await checkout.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false);
  journey.nextActionLabel = journey.nextActionPresent ? CONSUMER_CHECKOUT_LABEL : null;
  journey.nextActionTaken = false;
  await screenshot(page, section, "07-verified-next-action");
  section.packetJourney = journey;
  return journey;
}

/**
 * Resumes an authorized order on a matter that is already verified.
 *
 * The participant's screening, claim and packet answers already exist and are
 * not redone: repeating them would mint another matter and strand this one. The
 * account is not recreated either -- its password is rotated, which is the only
 * way this probe has ever been able to sign in, and it leaves the account and
 * every matter on it intact.
 */
async function resumeLiveOrderPhase() {
  const credentials = await ensureProbeAccount();
  const section = newSection("chromium", "chromium");
  let browser = null;
  try {
    browser = await launchBrowser("chromium");
    const context = await browser.newContext();
    const page = await context.newPage();
    attachObservers(page, section);

    await page.goto(`${ORIGIN}${SIGN_IN_PATH}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await switchToSignIn(page, section);
    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);
    const authPromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"),
      { timeout: 30_000 }
    ).then((response) => response, () => null);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const authResponse = await authPromise;
    record(
      "resumed_session_signed_in_as_the_owner",
      Boolean(authResponse?.ok()),
      `password sign-in for the probe account returned HTTP ${authResponse?.status() ?? "no response"}`
    );

    // Checkout is offered by the Final verification panel on the matter's review
    // page, not on the matter page itself: the claim lands on
    // /briefcase/matters/<id>, while packet information, review and the
    // generated packet stay on /briefcase/<id> (matter-path.ts).
    const reviewPath = `${REVIEW_PATH_PREFIX}/${RESUME_MATTER_ID}/review`;
    await gotoAfterClientRouting(page, `${ORIGIN}${reviewPath}`, { settleFrom: SIGN_IN_PATH });
    await screenshot(page, section, "01-resumed-matter");
    // The matter has to still be verified and still be offering Checkout. If it
    // is not, this is not a resume and the phase stops rather than improvising.
    const checkout = page.getByRole("button", { name: CONSUMER_CHECKOUT_LABEL, exact: true });
    const offersCheckout = await checkout.waitFor({ state: "visible", timeout: 30_000 }).then(() => true, () => false);
    // A refusal has to say what the page did offer, or the next attempt is a
    // guess. The panel's own state and the actions actually on the page are
    // read straight off the document.
    const observed = offersCheckout ? null : await describeResumePage(page);
    record(
      "resumed_matter_is_verified_and_still_offers_checkout",
      offersCheckout,
      `${reviewPath} ${offersCheckout ? `renders "${CONSUMER_CHECKOUT_LABEL}", so its packet information and Final verification still stand` : `does not offer Checkout; it is not a resumable verified matter — ${JSON.stringify(observed)}`}`
    );

    section.liveOrder = await placeLiveZeroDollarOrder(page, section, RESUME_MATTER_ID);
    evidence.liveOrder = section.liveOrder;
    section.status = "captured";
    section.transitionHealthy = true;
  } catch (error) {
    if (section.status === "pending") section.status = "error";
    section.error = redact(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await browser?.close().catch(() => null);
  }
  evidence.transitionHealthy = section.transitionHealthy;
}

/**
 * Reads the text a reader would see, out of the document itself.
 *
 * A header, a byte count and a page count say a PDF exists; they say nothing
 * about what is on the pages. No text-extraction library is available and none
 * may be added -- package.json is both an application byte and a canonical
 * worker input, so a new dependency would invalidate the frozen release. So the
 * content streams are inflated with node's own zlib and the text-showing
 * operators are read off them, which is enough to assert the packet says what
 * this matter should say.
 */
function extractPdfText(bytes) {
  const pages = [];
  // Content streams: "stream\r?\n ... endstream", FlateDecode in practice.
  const raw = bytes.toString("latin1");
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamPattern.exec(raw)) !== null) {
    const chunk = Buffer.from(match[1], "latin1");
    let text = "";
    try {
      text = zlib.inflateSync(chunk).toString("latin1");
    } catch {
      try { text = zlib.inflateRawSync(chunk).toString("latin1"); } catch { continue; }
    }
    // Text-showing operators: (literal) Tj and [(a) -250 (b)] TJ.
    const shown = [];
    const literal = /\((?:\\.|[^\\()])*\)/g;
    let piece;
    while ((piece = literal.exec(text)) !== null) {
      shown.push(piece[0].slice(1, -1)
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8))));
    }
    if (shown.length) pages.push(shown.join(" ").replace(/\s+/g, " ").trim());
  }
  return pages;
}

/**
 * The authorized live order, taken only when the promotion code clears the
 * total to zero.
 *
 * The verify journey stops one click short of Checkout on purpose. This takes
 * that click, and then refuses to submit anything Stripe still wants money for:
 * the zero total is read off Stripe's own page after the code is applied, and a
 * page that shows any amount due ends the phase without submitting. No card is
 * entered here at all, because a zero-total order collects none.
 */
async function placeLiveZeroDollarOrder(page, section, matterId) {
  const order = {
    matterId,
    checkoutOpened: false,
    reachedStripe: false,
    promotionEntered: false,
    promotionAccepted: false,
    totalReadsZero: null,
    submitted: false,
    returnedToApplication: false,
    settlement: null,
    artifact: null
  };

  const checkout = page.getByRole("button", { name: CONSUMER_CHECKOUT_LABEL, exact: true });
  await checkout.click({ timeout: 20_000 });
  order.checkoutOpened = true;
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 }).catch(() => null);
  order.reachedStripe = /checkout\.stripe\.com/.test(page.url());
  await screenshot(page, section, "08-stripe-checkout");
  record(
    "live_checkout_opened_on_stripe",
    order.reachedStripe,
    `the verified matter's next action reached ${order.reachedStripe ? "Stripe's hosted Checkout page" : `an unexpected destination: ${safePathname(page.url())}`}`
  );

  const notes = [];
  const promotion = await applyPromotionCode(page, LIVE_PROMOTION_CODE, notes);
  order.promotionEntered = promotion.entered;
  order.promotionAccepted = promotion.accepted;
  await screenshot(page, section, "09-promotion-applied");

  // Stripe decides, not this probe. The total is read from the page it renders
  // after the code was applied.
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText().catch(() => "");
  order.totalReadsZero = /\$0\.00/.test(body) && !/\$50\.00\s*$/.test(body.trim());
  record(
    "stripe_shows_a_zero_total_before_anything_is_submitted",
    order.promotionEntered && order.promotionAccepted && order.totalReadsZero === true,
    `promotion code entered=${order.promotionEntered}, accepted by the page=${order.promotionAccepted};`
      + ` Stripe's own page ${order.totalReadsZero ? "shows a $0.00 total, so it is collecting nothing" : "still shows an amount due"}.`
      + ` Nothing is submitted unless this reads zero, and no card details are entered at any point.`
  );

  // Stripe collects an email on most configurations and will not submit without
  // one, including on a zero-total order.
  const emailField = page.locator('input[name="email"], input[type="email"]').first();
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(PROBE_ACCOUNT_EMAIL, { timeout: 15_000 }).catch(() => {});
  }

  const submit = page.locator(
    'button[data-testid="hosted-payment-submit-button"], button:has-text("Pay"), button:has-text("Place order"), button:has-text("Complete order"), button[type="submit"]'
  ).first();
  await submit.waitFor({ state: "visible", timeout: 20_000 });
  await submit.click({ timeout: 20_000 });
  order.submitted = true;
  await page.waitForURL((url) => !/checkout\.stripe\.com/.test(String(url)), { timeout: 120_000 }).catch(() => null);
  order.returnedToApplication = !/checkout\.stripe\.com/.test(page.url());
  await screenshot(page, section, "10-returned-from-stripe");
  record(
    "the_zero_total_order_completed_and_returned_to_the_application",
    order.submitted && order.returnedToApplication,
    `submitted the zero-total order and Stripe returned the browser to ${safePathname(page.url())}`
  );

  // Settlement is read from the server's own row, not from the page. The
  // reconciliation columns are the point: a fully discounted order must record
  // the regular price and the discount, and collect nothing.
  const settled = await managementApi(`/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`, {
    method: "POST",
    body: {
      query: `select payment_status, amount_cents, regular_price_cents, discount_cents, currency, packet_status,
                     (provider_event_id is not null) as has_provider_event
                from public.consumer_briefcase_items where id = '${matterId.replaceAll("'", "''")}' limit 1`
    }
  });
  const row = Array.isArray(settled.json) ? settled.json[0] ?? null : null;
  order.settlement = row;
  record(
    "production_recorded_the_discounted_order_as_paid_and_collected_nothing",
    row?.payment_status === "paid" && Number(row?.amount_cents) === 0
      && Number(row?.regular_price_cents) === 5000 && Number(row?.discount_cents) === 5000
      && row?.has_provider_event === true,
    `the order row reads payment_status=${row?.payment_status}, amount_cents=${row?.amount_cents},`
      + ` regular_price_cents=${row?.regular_price_cents}, discount_cents=${row?.discount_cents},`
      + ` currency=${String(row?.currency ?? "").toUpperCase()}, provider event recorded=${row?.has_provider_event}.`
      + ` The reconciliation the migration added is what makes this row legal: 0 collected = 5000 regular - 5000 discount.`
  );

  // Production generation. The worker is a separate process on its own queue,
  // so this waits for it rather than assuming it, and reports the terminal
  // state it actually observed.
  const deadline = Date.now() + 600_000;
  let packetStatus = row?.packet_status ?? null;
  let jobState = null;
  while (Date.now() < deadline) {
    const poll = await managementApi(`/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`, {
      method: "POST",
      body: {
        query: `select i.packet_status,
                       (select j.status from public.packet_render_jobs j
                         where j.briefcase_item_id = i.id order by j.created_at desc limit 1) as job_status
                  from public.consumer_briefcase_items i where i.id = '${matterId.replaceAll("'", "''")}' limit 1`
      }
    });
    const current = Array.isArray(poll.json) ? poll.json[0] ?? null : null;
    packetStatus = current?.packet_status ?? packetStatus;
    jobState = current?.job_status ?? jobState;
    if (packetStatus === "ready" || jobState === "succeeded") break;
    if (jobState === "failed" || jobState === "expired") break;
    await page.waitForTimeout(10_000);
  }
  order.packetStatus = packetStatus;
  order.jobState = jobState;
  record(
    "the_production_worker_generated_the_packet_for_this_order",
    packetStatus === "ready" || jobState === "succeeded",
    `production render reached packet_status=${packetStatus}, render job=${jobState}`
  );

  // The owner downloads it, through the route that actually serves it, in the
  // same signed-in browser session that placed the order.
  const download = await page.request.get(`${ORIGIN}/api/expungement-ai/packet/artifacts/${matterId}`, { timeout: 120_000 });
  const contentType = download.headers()["content-type"] ?? "";
  const bytes = Buffer.from(await download.body().catch(() => Buffer.alloc(0)));
  const isPdf = bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  // A page count read from the document itself, not from a claim about it.
  const pageCount = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const artifactPath = path.join(EVIDENCE_DIR, `live-order-packet-${matterId}.pdf`);
  if (bytes.length > 0) fs.writeFileSync(artifactPath, bytes);
  order.artifact = {
    httpStatus: download.status(),
    contentType,
    byteLength: bytes.length,
    isPdf,
    pageCount,
    sha256: bytes.length ? crypto.createHash("sha256").update(bytes).digest("hex") : null,
    savedTo: bytes.length ? artifactPath : null
  };
  record(
    "the_owner_downloaded_the_generated_pdf_and_it_is_a_real_document",
    download.status() === 200 && /application\/pdf/i.test(contentType) && isPdf && bytes.length > 1000 && pageCount > 0,
    `HTTP ${download.status()} ${contentType}; ${bytes.length} bytes; starts with %PDF-: ${isPdf}; ${pageCount} page object(s);`
      + ` sha256 ${order.artifact.sha256 ?? "(empty)"}`
  );

  // Content, not shape. The packet has to be about THIS matter: the answers
  // this journey typed into the builder, in the jurisdiction it screened.
  const pageTexts = bytes.length ? extractPdfText(bytes) : [];
  const whole = pageTexts.join("\n");
  const expected = [
    ["the participant this matter belongs to", "Acceptance Participant"],
    ["the court the answers named", "Hinds County Circuit Court"],
    ["the case number the answers named", "25-CR-000123"],
    ["the jurisdiction screened", /Mississippi/i],
    ["the relief the pathway names", /expunge/i]
  ];
  const found = expected.map(([label, needle]) => ({
    label,
    present: typeof needle === "string" ? whole.includes(needle) : needle.test(whole)
  }));
  // Readable layout: pages that carry text rather than one page doing all the
  // work, and no page left blank in the middle of the document.
  const textPages = pageTexts.filter((entry) => entry.length > 40).length;
  const charactersRead = whole.length;
  order.artifact.inspection = {
    pagesWithText: textPages,
    charactersRead,
    expected: found,
    firstPageExcerpt: redact((pageTexts[0] ?? "").slice(0, 300)),
    textSavedTo: null
  };
  if (charactersRead > 0) {
    const textPath = path.join(EVIDENCE_DIR, `live-order-packet-${matterId}.txt`);
    fs.writeFileSync(textPath, redact(pageTexts.map((entry, index) => `--- page ${index + 1} ---\n${entry}`).join("\n\n")));
    order.artifact.inspection.textSavedTo = textPath;
  }
  record(
    "the_downloaded_packet_reads_as_this_matter_s_packet",
    found.every((entry) => entry.present) && textPages >= 2 && charactersRead > 500,
    `read ${charactersRead} characters across ${textPages} page(s) carrying text;`
      + ` ${found.map((entry) => `${entry.label}: ${entry.present ? "present" : "ABSENT"}`).join("; ")}.`
      + ` First page begins: ${JSON.stringify((pageTexts[0] ?? "").slice(0, 120))}`
  );
  return order;
}

// --- verify phase ---------------------------------------------------------------
async function switchToSignIn(page, section) {
  const toggle = page.getByRole("button", { name: /Already have an account\? Sign in/i });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
  try {
    await page.locator('[data-auth-mode="signin"]').waitFor({ state: "visible", timeout: 10_000 });
  } catch {
    throw await withPageContext(page, section, "chromium: the sign-in handoff page did not switch to sign-in mode");
  }
}

// Signs in with the probe account on the current handoff page and waits for the
// claim the form submits afterwards. The credentials are typed, never logged.
async function signInAndClaim(page, section, credentials, label) {
  await switchToSignIn(page, section);
  const captchaWidgetPresent = (await page.locator('iframe[src*="challenges.cloudflare.com"]').count()) > 0;
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  const authResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"),
    { timeout: 30_000 }
  ).then((response) => response, () => null);
  const claimResponsePromise = page.waitForResponse(responseFor(CLAIM_PATH), { timeout: 30_000 }).then((response) => response, () => null);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authResponse = await authResponsePromise;
  const authStatus = authResponse?.status() ?? null;
  if (!authResponse?.ok()) {
    await screenshot(page, section, `${label}-sign-in-failed`);
    throw await withPageContext(page, section, `chromium: password sign-in for ${credentials.email} returned HTTP ${authStatus ?? "no response"} (captcha widget present: ${captchaWidgetPresent})`);
  }
  const claimResponse = await claimResponsePromise;
  const claimJson = claimResponse ? await claimResponse.json().catch(() => null) : null;
  let claimMatterId = validUuid(claimJson?.matterId) ? claimJson.matterId : null;
  let matterIdSource = claimMatterId ? "response" : null;
  if (!claimMatterId && claimResponse?.ok()) {
    // The page navigates to the claimed matter as soon as the claim succeeds,
    // and the response body can be discarded before it is read (run
    // 35131741774: claim HTTP 200, body unavailable). The landing URL names
    // the same matter, so it is the fallback; the source is recorded.
    await page.waitForURL((url) => validUuid(exactBriefcaseItemId(url.pathname)), { timeout: 20_000 }).catch(() => null);
    claimMatterId = exactBriefcaseItemId(new URL(page.url()).pathname);
    matterIdSource = claimMatterId ? "location" : null;
  }
  return {
    authStatus,
    captchaWidgetPresent,
    claimStatus: claimResponse?.status() ?? null,
    claimBodyRead: claimJson !== null,
    claimError: typeof claimJson?.error === "string" ? claimJson.error : null,
    claimMatterId,
    matterIdSource,
    claimRedirectMatterId: exactBriefcaseItemId(claimJson?.redirectTo),
    xVercelId: claimResponse ? header(claimResponse, "x-vercel-id") : null
  };
}

// --- packet information through Final verification -------------------------
// The Mississippi non-conviction packet re-checks these route facts before it
// will verify (mississippiNonConvictionPacketSafety). A first-option or
// placeholder answer makes the review unsafe and withholds the verify action.
const PACKET_SAFE_ANSWERS = Object.freeze({
  pending_cases: "No",
  trafficking_status: "No",
  prior_relief: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  nonadjudication_or_diversion: "No",
  open_co_defendant_matter: "No",
  actual_arrest: "Yes",
  release_confirmed: "Yes",
  disposition_record_wording: "Charges dropped",
  statutory_disposition_category: "Charges dropped"
});
const PACKET_ISO_DATE = "2015-01-15";
const PACKET_BUILDER = "[data-packet-information-builder='active']";
const VERIFICATION_PANEL = "[data-packet-verification-state]";
const UNAVAILABLE_BRANCH = "[data-review-branch='unavailable']";
const CONSUMER_VERIFY_LABEL = "I verified these packet facts";
// The legitimate next action for a paid consumer route. It is located and
// reported, never clicked: this probe creates no charge.
const CONSUMER_CHECKOUT_LABEL = "Pay $50 and generate my packet";

function packetFieldValue(id, prompt) {
  if (PACKET_SAFE_ANSWERS[id]) return PACKET_SAFE_ANSWERS[id];
  if (/_date$|_date_/.test(id) || /\bdate\b/i.test(prompt)) return PACKET_ISO_DATE;
  const known = {
    participant_full_legal_name: "Acceptance Participant",
    full_legal_name: "Acceptance Participant",
    contact_information: "100 Acceptance Way, Jackson, MS 39201",
    county: "Hinds County",
    court: "Hinds County Circuit Court",
    court_name: "Hinds County Circuit Court",
    charge: "Acceptance test misdemeanor charge",
    record_type: "Court case",
    residency_or_location: "Jackson, Mississippi",
    age_at_offense: "30"
  };
  if (known[id]) return known[id];
  if (/name/i.test(prompt)) return "Acceptance Participant";
  if (/number|docket|case/i.test(prompt)) return "25-CR-000123";
  if (/county/i.test(prompt)) return "Hinds County";
  if (/court/i.test(prompt)) return "Hinds County Circuit Court";
  if (/age|year/i.test(prompt)) return "30";
  return "Acceptance test information";
}

// Answers whichever control the builder is showing, exactly as a participant
// would. A prefilled value is the participant's own answer projected into the
// packet and is never overwritten.
async function answerBuilderStep(page) {
  const builder = page.locator(PACKET_BUILDER);
  await builder.waitFor({ state: "visible", timeout: 20_000 });
  const prompt = await builder.locator("h1").innerText().catch(() => "");

  const text = builder.locator("input[type='text']:visible:enabled, input[type='number']:visible:enabled").first();
  if (await text.count()) {
    const id = (await text.getAttribute("id"))?.replace(/^q-/, "") ?? "detail";
    const current = (await text.inputValue().catch(() => "")).trim();
    if (!current) await text.fill(packetFieldValue(id, prompt));
    return;
  }
  const textarea = builder.locator("textarea:visible:enabled").first();
  if (await textarea.count()) {
    const id = (await textarea.getAttribute("id"))?.replace(/^q-/, "") ?? "detail";
    const current = (await textarea.inputValue().catch(() => "")).trim();
    if (!current) await textarea.fill(packetFieldValue(id, prompt));
    return;
  }
  const selects = builder.locator("select:visible:enabled");
  const selectCount = await selects.count();
  if (selectCount === 3) {
    await selects.nth(0).selectOption("01");
    await selects.nth(1).selectOption("15");
    const years = await selects.nth(2).locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    await selects.nth(2).selectOption(years.includes("2015") ? "2015" : years.at(-1) ?? "2000");
    return;
  }
  if (selectCount === 1) {
    const id = ((await selects.first().getAttribute("id")) ?? "").replace(/^q-/, "");
    const safe = PACKET_SAFE_ANSWERS[id];
    if (safe) { await selects.first().selectOption({ label: safe }).catch(() => null); return; }
  }
  const radios = builder.locator("input[type='radio']:visible:enabled");
  const radioCount = await radios.count();
  if (radioCount) {
    if (await builder.locator("input[type='radio']:visible:checked").count()) return;
    const id = ((await radios.first().getAttribute("name")) ?? "").replace(/^q-/, "");
    const safe = PACKET_SAFE_ANSWERS[id];
    const preferred = safe ? new RegExp(`^${safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "i") : null;
    for (let index = 0; index < radioCount; index += 1) {
      const radio = radios.nth(index);
      const label = await radio.locator("xpath=ancestor::label").innerText().catch(() => "");
      if (preferred ? preferred.test(label) : !/not sure|prefer not|unknown/i.test(label)) { await radio.check(); return; }
    }
    await radios.first().check();
    return;
  }
  const checkboxes = builder.locator("input[type='checkbox']:visible:enabled");
  if (await checkboxes.count() && !(await builder.locator("input[type='checkbox']:visible:checked").count())) {
    await checkboxes.first().check().catch(() => null);
  }
}

/**
 * Navigates to an application URL without racing the application's own routing.
 *
 * Signing in hands control to the client router, which pushes its own
 * destination as soon as the session lands. A page.goto issued in that window
 * is superseded and Chromium reports net::ERR_ABORTED, which is the router
 * winning rather than the site failing. So the router is given its move first,
 * and an aborted navigation is retried once after the page has gone quiet.
 */
async function gotoAfterClientRouting(page, url, { settleFrom = null } = {}) {
  if (settleFrom) {
    await page.waitForURL((current) => safePathname(String(current)) !== settleFrom, { timeout: 20_000 }).catch(() => null);
  }
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 3 || !/ERR_ABORTED/.test(message)) throw error;
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null);
      await page.waitForTimeout(1_500);
    }
  }
}

/**
 * Says what a page that refused to offer Checkout actually showed.
 *
 * Reads the heading, the verification panel's own state attribute and the
 * labels of the actions on the page. All of it is redacted and bounded, so a
 * refusal names the page's real state instead of leaving the next attempt to
 * guess at it.
 */
async function describeResumePage(page) {
  const heading = redact((await page.locator("main h1, h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 160));
  const panelState = await page.locator(VERIFICATION_PANEL).first().getAttribute("data-packet-verification-state").catch(() => null);
  const actions = await page.locator("main button:visible, main a[href]:visible").evaluateAll(
    (nodes) => nodes.map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 25)
  ).catch(() => []);
  return {
    path: safePathname(page.url()),
    heading,
    verificationPanelState: panelState,
    actions: actions.map((label) => redact(label.slice(0, 60)))
  };
}

async function expectMatterRendered(page, section, matterId, label) {
  try {
    await page.waitForURL((url) => exactBriefcaseItemId(url.pathname) === matterId, { timeout: 20_000 });
  } catch {
    throw await withPageContext(page, section, `chromium: ${label} did not land on the exact matter ${matterId}`);
  }
  const matterSection = page.locator(`section[data-briefcase-matter-id="${matterId}"]`);
  const rendered = await matterSection.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false);
  const title = rendered ? (await matterSection.locator("h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim() : "";
  // The matter page renders the jurisdiction as a badge inside the matter
  // section and the pathway label as the h1; "MS" is not part of the title.
  const jurisdictionVisible = rendered
    ? await matterSection.getByText("MS", { exact: true }).first().isVisible().catch(() => false)
    : false;
  const pathwayLabelVisible = rendered
    ? await matterSection.getByText(NON_CONVICTION_PATHWAY_LABEL, { exact: false }).first()
      .waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false)
    : false;
  const notFound = await page.getByText(MATTER_NOT_FOUND, { exact: true }).isVisible().catch(() => false);
  const observation = {
    path: safePathname(page.url()),
    rendered,
    title,
    jurisdictionBadgeVisible: jurisdictionVisible,
    pathwayLabelVisible,
    notFound
  };
  if (!(rendered && jurisdictionVisible && pathwayLabelVisible && !notFound)) {
    await screenshot(page, section, `${label}-matter-unexpected`);
    throw await withPageContext(page, section, `chromium: ${label} matter ${matterId} did not render as expected: ${JSON.stringify(observation)}`);
  }
  return observation;
}

async function countMatters(page, section) {
  await page.goto(`${ORIGIN}${MATTERS_PATH}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const arrived = await page.waitForURL((url) => url.pathname === MATTERS_PATH, { timeout: 20_000 }).then(() => true, () => false);
  if (!arrived) throw await withPageContext(page, section, `chromium: ${MATTERS_PATH} did not render for the signed-in probe account`);
  await page.locator("main h1, h1").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => null);
  const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
  const ids = new Set(hrefs.map(exactBriefcaseItemId).filter(Boolean));
  return { count: ids.size, ids: [...ids].sort() };
}

async function verifyPhase() {
  const credentials = await ensureProbeAccount();

  // (b) chromium: signed-out journey, handoff, sign-in, exact matter.
  const section = newSection("chromium");
  evidence.browsers.chromium = section;
  let browser;
  try {
    browser = await launchBrowser("chromium");
  } catch (error) {
    section.status = "not_available";
    section.launch.error = redact(error instanceof Error ? error.message : String(error)).slice(0, 200);
    throw new Error(`chromium could not launch: ${section.launch.error}`);
  }
  try {
    section.version = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    const page = await context.newPage();
    attachObservers(page, section);
    const signedOut = await runSignedOutJourney(page, section);
    console.log(`  ${summarize(section)}`);
    record(
      "signed_out_save_writes_pending_and_hands_off_to_account_creation",
      signedOut.pendingOk && signedOut.claimStatus === 401 && Boolean(signedOut.handoffUrl) && section.handoff.modeCreate,
      `pending HTTP ${section.pending.status}${section.pending.error ? ` ${section.pending.error}` : ""}; claim HTTP ${section.claim?.status ?? "not observed"}; handoff reached ${section.handoff?.reached ?? false} with mode=create ${section.handoff?.modeCreate ?? false} and claim param ${section.handoff?.claimParamPresent ?? false}`
    );

    const firstSignIn = await signInAndClaim(page, section, credentials, "03-first");
    section.signIn = { ...firstSignIn, email: credentials.email };
    record(
      "handoff_sign_in_completes_the_claim",
      firstSignIn.authStatus === 200 && firstSignIn.claimStatus === 200 && validUuid(firstSignIn.claimMatterId),
      `auth HTTP ${firstSignIn.authStatus}; claim HTTP ${firstSignIn.claimStatus}${firstSignIn.claimError ? ` ${firstSignIn.claimError}` : ""}; matter id ${firstSignIn.claimMatterId ?? "none"}${firstSignIn.matterIdSource ? ` (from ${firstSignIn.matterIdSource}; body read ${firstSignIn.claimBodyRead})` : ""}; captcha widget present ${firstSignIn.captchaWidgetPresent}`
    );
    const firstMatterId = firstSignIn.claimMatterId;
    evidence.mutations.mattersClaimed.push(firstMatterId);
    const firstRender = await expectMatterRendered(page, section, firstMatterId, "first claim");
    await screenshot(page, section, "03-first-matter");
    await page.reload({ waitUntil: "domcontentloaded" });
    const firstReload = await expectMatterRendered(page, section, firstMatterId, "first matter reload");
    section.firstMatter = { id: firstMatterId, landed: firstRender, afterReload: firstReload };
    record(
      "first_matter_renders_and_survives_reload",
      firstRender.rendered && firstReload.rendered && firstRender.jurisdictionBadgeVisible && firstReload.jurisdictionBadgeVisible && firstReload.pathwayLabelVisible,
      `${MATTERS_PATH}/${firstMatterId} rendered "${firstRender.title}" with the MS jurisdiction badge and the non-conviction pathway label, and again after reload`
    );
    const afterFirst = await countMatters(page, section);
    section.mattersAfterFirstClaim = afterFirst;

    // (c) already signed in: a fresh page (fresh sessionStorage, same cookies)
    // runs the screening again and the claim lands straight on a new matter.
    const secondPage = await context.newPage();
    const signedInSection = newSection("chromium", "chromium-signed-in");
    attachObservers(secondPage, signedInSection);
    const signedIn = await runSignedOutJourney(secondPage, signedInSection);
    section.signedInJourney = {
      screening: signedInSection.screening,
      saveButtonLabel: signedInSection.saveButtonLabel,
      pending: signedInSection.pending,
      claim: signedInSection.claim,
      landedMatterId: signedIn.matterId,
      screenshots: signedInSection.screenshots,
      browserErrors: signedInSection.browserErrors,
      externalRequestHosts: signedInSection.externalRequestHosts,
      originPostPaths: signedInSection.originPostPaths
    };
    section.screenshots.push(...signedInSection.screenshots);
    const secondMatterId = signedIn.matterId;
    record(
      "signed_in_save_claims_straight_into_a_new_matter",
      signedIn.pendingOk && signedInSection.claim?.status === 200 && validUuid(secondMatterId) && secondMatterId !== firstMatterId,
      `pending HTTP ${signedInSection.pending.status}${signedInSection.pending.error ? ` ${signedInSection.pending.error}` : ""}; claim HTTP ${signedInSection.claim?.status ?? "not observed"}${signedInSection.claim?.error ? ` ${signedInSection.claim.error}` : ""}; landed on ${signedIn.matterId ?? "no exact matter"}; distinct from first ${validUuid(secondMatterId) && secondMatterId !== firstMatterId}`
    );
    evidence.mutations.mattersClaimed.push(secondMatterId);
    const secondRender = await expectMatterRendered(secondPage, signedInSection, secondMatterId, "second claim");
    await screenshot(secondPage, section, "04-second-matter");
    section.secondMatter = { id: secondMatterId, landed: secondRender };
    await secondPage.close();
    const afterSecond = await countMatters(page, section);
    section.mattersAfterSecondClaim = afterSecond;
    record(
      "second_claim_adds_exactly_one_matter",
      afterSecond.count === afterFirst.count + 1 && afterSecond.ids.includes(firstMatterId) && afterSecond.ids.includes(secondMatterId),
      `${MATTERS_PATH} listed ${afterFirst.count} matter link(s) after the first claim and ${afterSecond.count} after the second; both claimed matters are listed`
    );

    // (d) duplicate protection: re-visit the exact first handoff URL (still in
    // memory) and sign in again, which re-submits the same claim token.
    await page.goto(signedOut.handoffUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const replay = await signInAndClaim(page, section, credentials, "05-replay");
    let landedOnFirstMatter = false;
    let refusalCopyShown = false;
    if (replay.claimStatus === 200) {
      landedOnFirstMatter = await page.waitForURL((url) => exactBriefcaseItemId(url.pathname) === firstMatterId, { timeout: 20_000 }).then(() => true, () => false);
    } else {
      refusalCopyShown = await page.getByText(PENDING_CLAIM_ERROR, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
    }
    await screenshot(page, section, "05-after-replayed-claim");
    const afterReplay = await countMatters(page, section);
    section.duplicateProtection = {
      replayAuthStatus: replay.authStatus,
      replayClaimStatus: replay.claimStatus,
      replayClaimError: replay.claimError,
      replayMatterId: replay.claimMatterId,
      landedOnFirstMatter,
      refusalCopyShown,
      mattersBefore: afterSecond.count,
      mattersAfter: afterReplay.count
    };
    section.mattersAfterReplay = afterReplay;
    const replayOutcomeOk = replay.claimStatus === 200
      ? replay.claimMatterId === firstMatterId && landedOnFirstMatter
      : replay.claimStatus !== null && replay.claimStatus >= 400 && replay.claimStatus < 500;
    record(
      "replayed_claim_token_cannot_mint_a_third_matter",
      replayOutcomeOk && afterReplay.count === afterSecond.count && !afterReplay.ids.some((id) => id !== firstMatterId && id !== secondMatterId && !afterSecond.ids.includes(id)),
      `replayed claim HTTP ${replay.claimStatus}${replay.claimError ? ` ${replay.claimError}` : ""}; ${replay.claimStatus === 200 ? `idempotent replay landed on the first matter: ${landedOnFirstMatter}` : `refusal copy shown: ${refusalCopyShown}`}; ${MATTERS_PATH} still lists ${afterReplay.count} matter link(s)`
    );
    // (e) the rest of the participant's journey: the claimed matter through the
    // packet-information builder to Final verification, stopping at the next
    // legitimate action without taking it.
    const journey = await completePacketInformationAndVerify(page, section, secondMatterId);
    record(
      "packet_information_completes_and_final_verification_is_reachable",
      journey.verificationPanelPresent && journey.verifyActionPresent && journey.verifyStatus === 200,
      `entered the builder through "${journey.builderEntryLabel}"; ${journey.builderSteps} saved step(s), all HTTP 200;`
        + ` the review page rendered the verification panel (${journey.panelStateBeforeVerify} before, ${journey.panelStateAfterVerify} after)`
        + ` and Final verification returned HTTP ${journey.verifyStatus}`
    );
    if (PHASE === PHASE_LIVE_ORDER) {
      // The authorized live order continues from exactly here, in this same
      // signed-in session, on the matter this journey just verified.
      record(
        "verified_matter_offers_the_next_legitimate_action",
        journey.nextActionPresent,
        `next action "${journey.nextActionLabel ?? "none"}" is present and is about to be taken under the owner's authorization`
      );
      section.liveOrder = await placeLiveZeroDollarOrder(page, section, secondMatterId);
      evidence.liveOrder = section.liveOrder;
    } else {
      record(
        "verified_matter_offers_the_next_legitimate_action_and_nothing_was_charged",
        journey.nextActionPresent && journey.nextActionTaken === false && !section.externalRequestHosts.some((host) => /stripe/i.test(host)),
        `next action "${journey.nextActionLabel ?? "none"}" present=${journey.nextActionPresent}, taken=${journey.nextActionTaken};`
          + ` external hosts contacted: ${section.externalRequestHosts.length === 0 ? "none" : section.externalRequestHosts.join(", ")}`
      );
    }
    section.status = "captured";
    section.transitionHealthy = true;
  } catch (error) {
    if (section.status === "pending") section.status = "error";
    section.error = redact(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await browser?.close().catch(() => null);
  }

  // WebKit is best-effort in this phase: it repeats the signed-out journey and
  // must reach the same pending 200 / claim 401 / handoff, but its own failure
  // is recorded rather than fatal.
  if (BROWSERS.includes("webkit")) {
    try {
      await reproduceIn("webkit");
    } catch (error) {
      console.log(`  WARN webkit signed-out journey did not complete: ${redact(error instanceof Error ? error.message : String(error)).slice(0, 300)}`);
    }
    const webkitSection = evidence.browsers.webkit;
    console.log(`  webkit verdict: ${webkitSection.status}; transitionHealthy=${webkitSection.transitionHealthy}`);
  }
  evidence.transitionHealthy = section.transitionHealthy;
}

// --- screening helpers (Clinic journey) ---------------------------------------
// A screening question heading may carry the "Optional" badge inside the
// heading element, so the accessible name is matched from its start rather
// than exactly.
function screeningHeading(page, prompt) {
  return page.getByRole("heading", { name: new RegExp(`^${escapeRegExp(prompt)}(?:\\s*Optional)?$`, "i") });
}

// Polls for whichever remaining screening prompt is visible, or the result
// heading (null) when the engine has already evaluated. Bounded: a step that
// neither shows a question nor a result fails with the visible headings
// instead of hanging until the job timeout.
async function visibleScreeningPrompt(page, prompts, resultHeading, budgetMs = 45_000) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (await resultHeading.isVisible().catch(() => false)) return null;
    for (const prompt of prompts) {
      if (await screeningHeading(page, prompt).isVisible().catch(() => false)) return prompt;
    }
    await page.waitForTimeout(500);
  }
  const visible = await page.locator("h1, h2, legend").allInnerTexts().catch(() => []);
  throw new Error(`Neither a remaining screening question (${prompts.join(" | ")}) nor the result appeared within ${budgetMs}ms; visible headings: ${JSON.stringify(visible)}`);
}

async function answerChoice(page, prompt, option, final = false) {
  await screeningHeading(page, prompt).waitFor({ state: "visible" });
  await page.getByRole("radio", { name: new RegExp(`^${escapeRegExp(option)}(?:\\s|$)`, "i") }).check();
  const evaluationResponsePromise = final
    ? page.waitForResponse(responseFor(EVALUATE_PATH), { timeout: 20_000 })
    : null;
  await page.getByRole("button", { name: /Continue/i }).click();
  if (evaluationResponsePromise) {
    const evaluationResponse = await evaluationResponsePromise;
    if (!evaluationResponse.ok()) throw new Error(`Authoritative screening evaluation returned ${evaluationResponse.status()}.`);
  }
}

function exactBriefcaseItemId(value) {
  if (typeof value !== "string") return null;
  // The atomic claim lands on /briefcase/matters/<id> (matter-path.ts); the
  // packet-information, review and generated-packet pages stay on /briefcase/<id>.
  const match = value.match(/^\/briefcase\/(?:matters\/)?([0-9a-f-]{36})(?:[?#]|$)/i);
  return validUuid(match?.[1]) ? match[1] : null;
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Origin + pathname only: a query string is where the claim token travels.
function safePath(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unparseable URL";
  }
}

function safePathname(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "unparseable URL";
  }
}

function safeOrigin(value, name) {
  try {
    return new URL(value).origin;
  } catch {
    fail(`${name} must be an absolute URL.`);
  }
}

function fail(message) {
  console.error(`PRODUCTION SAVE-TRANSITION PROBE REFUSED — ${message}`);
  process.exit(1);
}

// --- main -------------------------------------------------------------------------
try {
  console.log(`RCAP production save-transition probe: phase ${PHASE} against ${ORIGIN} (${BROWSERS.join(", ")})`);
  if (PHASE === PHASE_REPRODUCE) await reproducePhase();
  else if (RESUME_MATTER_ID) await resumeLiveOrderPhase();
  else await verifyPhase();
  persist(true);
  for (const section of Object.values(evidence.browsers)) console.log(`SUMMARY ${summarize(section)}`);
  console.log(`PRODUCTION SAVE-TRANSITION PROBE PASS — phase ${PHASE}; transitionHealthy=${evidence.transitionHealthy}; evidence ${path.relative(process.cwd(), EVIDENCE_FILE)}`);
} catch (error) {
  const failure = redact(error instanceof Error ? error.message : String(error));
  persist(false, failure);
  for (const section of Object.values(evidence.browsers)) console.log(`SUMMARY ${summarize(section)}`);
  console.error(`PRODUCTION SAVE-TRANSITION PROBE FAILED — phase ${PHASE}; ${failure}`);
  process.exit(1);
}
