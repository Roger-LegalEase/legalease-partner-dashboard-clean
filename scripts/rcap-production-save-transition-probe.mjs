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
import { chromium, webkit } from "playwright";

const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const PROBE_ACCOUNT_EMAIL = "rcap-production-probe@rcap-acceptance.test";
const PHASE_REPRODUCE = "save_transition_reproduce";
const PHASE_VERIFY = "save_transition_verify";
const SUPPORTED_BROWSERS = Object.freeze(["chromium", "webkit"]);

const SCREENING_PATH = "/expungement-ai/screening/ms";
const EVALUATE_PATH = "/api/expungement-ai/evaluate";
const PENDING_PATH = "/api/expungement-ai/screening/pending";
const CLAIM_PATH = "/api/expungement-ai/screening/pending/claim";
const SIGN_IN_PATH = "/expungement-ai/sign-in";
const MATTERS_PATH = "/briefcase/matters";

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
const CHROMIUM_EXECUTABLE = process.env.RCAP_BROWSER_CHROMIUM?.trim() || "";
const BROWSERS = (process.env.RCAP_PROBE_BROWSERS ?? "chromium,webkit")
  .split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-save-transition-${PHASE}.json`);
const SHOTS_DIR = path.join(EVIDENCE_DIR, "save-transition-screenshots", PHASE);

// --- input contract -----------------------------------------------------------
if (PHASE !== PHASE_REPRODUCE && PHASE !== PHASE_VERIFY) {
  fail(`RCAP_PRODUCTION_PHASE must be ${PHASE_REPRODUCE} or ${PHASE_VERIFY}.`);
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
  return {
    authStatus,
    captchaWidgetPresent,
    claimStatus: claimResponse?.status() ?? null,
    claimError: typeof claimJson?.error === "string" ? claimJson.error : null,
    claimMatterId: validUuid(claimJson?.matterId) ? claimJson.matterId : null,
    claimRedirectMatterId: exactBriefcaseItemId(claimJson?.redirectTo),
    xVercelId: claimResponse ? header(claimResponse, "x-vercel-id") : null
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
  const jurisdictionVisible = await page.getByText("MS", { exact: true }).first().isVisible().catch(() => false);
  const pathwayLabelVisible = await page.getByText(NON_CONVICTION_PATHWAY_LABEL, { exact: false }).first()
    .waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
  const notFound = await page.getByText(MATTER_NOT_FOUND, { exact: true }).isVisible().catch(() => false);
  const observation = {
    path: safePathname(page.url()),
    rendered,
    title,
    titleContainsMS: /\bMS\b/.test(title),
    jurisdictionVisible,
    pathwayLabelVisible,
    notFound
  };
  if (!(rendered && observation.titleContainsMS && jurisdictionVisible && pathwayLabelVisible && !notFound)) {
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
      `auth HTTP ${firstSignIn.authStatus}; claim HTTP ${firstSignIn.claimStatus}${firstSignIn.claimError ? ` ${firstSignIn.claimError}` : ""}; matter id ${firstSignIn.claimMatterId ?? "none"}; captcha widget present ${firstSignIn.captchaWidgetPresent}`
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
      firstRender.rendered && firstReload.rendered && firstRender.titleContainsMS && firstReload.pathwayLabelVisible,
      `${MATTERS_PATH}/${firstMatterId} rendered "${firstRender.title}" with MS and the non-conviction pathway label, and again after reload`
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
