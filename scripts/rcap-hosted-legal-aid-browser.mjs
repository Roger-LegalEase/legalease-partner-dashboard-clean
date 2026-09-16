#!/usr/bin/env node

// Hosted Legal Aid Clinic Mode acceptance on the exact release Preview: the
// actual MVLP workflow, exercised in a real browser against the acceptance
// project with synthetic identities only.
//
// Reuses one exact Vercel deployment. Deploys nothing, migrates nothing,
// creates no Checkout, completes no payment, runs no worker. The Vercel bypass
// is attached only to in-memory requests for the exact Preview origin; it is
// never placed in a URL, cookie, screenshot, log, or evidence file. No
// password, token, or protected value is written to evidence.
//
// The three training records it leaves behind, kept out of any real
// capacity, report, charge or public listing because the organization here is
// the acceptance copy of MVLP on a draft-then-published synthetic clinic:
//   A — complete application, approved, packet attached, executed and filed;
//   B — application returned for a missing document (needs information);
//   C — application needing confidential review (non-citizen statement),
//       registered on the waitlist because the training clinic has two seats.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import { expectedHostedReturnOrigin, hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";
import { LEGAL_AID_FIXTURE as F } from "./rcap-legal-aid/hosted-fixture.mjs";
import { LEGAL_AID_TABLES } from "./rcap-legal-aid/contract.mjs";

const ROOT = process.cwd();
const { root: EVIDENCE_ROOT } = prepareHostedAcceptanceEvidenceLayout({ rootDir: ROOT });
const EVIDENCE_DIR = path.join(EVIDENCE_ROOT, "legal-aid");
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "browser.json");

const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const DEPLOYMENT_ID = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const PREVIEW_HOSTNAME = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const DEMO_PASSWORD = (process.env.HOSTED_CLINIC_DEMO_PASSWORD ?? "").trim();
const RESEND_API_KEY = (process.env.HOSTED_LEGAL_AID_RESEND_API_KEY ?? "").trim();
const TEST_MAILBOX = (process.env.HOSTED_LEGAL_AID_TEST_MAILBOX ?? "").trim().toLowerCase();
const EMAIL_FROM = (process.env.HOSTED_LEGAL_AID_EMAIL_FROM ?? "").trim();
const CHROMIUM = (process.env.RCAP_BROWSER_CHROMIUM ?? "").trim();
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const PREVIEW = /^[0-9a-f]{40}$/.test(APPLICATION_SHA) ? expectedHostedReturnOrigin(APPLICATION_SHA) : "";
const EXPECTED_HOSTNAME = PREVIEW ? new URL(PREVIEW).host : "";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Synthetic protected value for the training records. It is checked for
// absence from the wire, the answers document and the export at rest.
const SSN = "512346789";
const SSN_FORMATTED = "512-34-6789";
const SSN_MASKED = "•••-••-6789";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const PDF_SHA = crypto.createHash("sha256").update(PDF).digest("hex");

const secrets = [VERCEL_TOKEN, SUPABASE_ACCESS_TOKEN, BYPASS, DEMO_PASSWORD, RESEND_API_KEY].filter(Boolean);
const sanitize = (value) => {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text
    .replace(/(x-vercel-protection-bypass[=:])[A-Za-z0-9._~-]+/gi, "$1***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***")
    .split(SSN).join("***PROTECTED***")
    .split(SSN_FORMATTED).join("***PROTECTED***");
};

const evidence = {
  schemaVersion: "rcap-hosted-legal-aid-browser/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  previewUrl: PREVIEW || null,
  previewDeploymentId: DEPLOYMENT_ID || null,
  partnerSlug: F.partnerSlug,
  eventId: F.eventId,
  eventSlug: F.eventSlug,
  workerRun: false,
  migrationApplied: false,
  checkoutCreated: false,
  paymentCompleted: false,
  productionTouched: false,
  stripeTouched: false,
  protectionBypassTransport: "in-memory header scoped to exact Preview origin",
  secretsRecorded: false,
  protectedValueRecorded: false,
  emailDelivery: RESEND_API_KEY && TEST_MAILBOX && EMAIL_FROM
    ? { mode: "configured", mailbox: TEST_MAILBOX, senderRecorded: false }
    : {
      mode: "not_configured",
      accessNeeded: "Repository secrets on Roger-LegalEase/legalease-partner-dashboard-clean: HOSTED_LEGAL_AID_RESEND_API_KEY (a Resend API key for a nonproduction sending domain), HOSTED_LEGAL_AID_EMAIL_FROM (a verified sender on that domain) and HOSTED_LEGAL_AID_TEST_MAILBOX (the authorized test mailbox address). The deploy step then sets ENABLE_PARTNER_EMAIL_DELIVERY, PARTNER_EMAIL_PROVIDER, RESEND_API_KEY and PARTNER_EMAIL_FROM on the acceptance Preview only, and this phase reads the provider's delivery event for the message.",
      observed: null
    },
  trainingRecords: {},
  screenshots: [],
  cases: {}
};

class BrowserGateFailure extends Error {
  constructor(caseId, message) {
    super(`${caseId}: ${sanitize(message)}`);
    this.name = "BrowserGateFailure";
    this.caseId = caseId;
  }
}

function record(caseId, passed, observed) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new BrowserGateFailure(caseId, observed);
}

function writeEvidence(passed, error = null) {
  evidence.passed = passed;
  if (error) evidence.failure = { caseId: error instanceof BrowserGateFailure ? error.caseId : null, message: sanitize(error instanceof Error ? error.message : error) };
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

const sqlText = (value) => String(value).split("'").join("''");
const shortId = (value) => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);

async function managementQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced below */ }
  if (!response.ok) throw new BrowserGateFailure("acceptance_database_query_succeeded", `HTTP ${response.status}: ${sanitize(text).slice(0, 300)}`);
  return json;
}
const one = async (query) => { const rows = await managementQuery(query); return Array.isArray(rows) ? rows[0] ?? null : null; };

async function supabaseKeys() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
  const list = await response.json().catch(() => null);
  const pick = (name) => Array.isArray(list) ? list.find((entry) => entry.name === name)?.api_key ?? null : null;
  if (!response.ok || !pick("anon") || !pick("service_role")) throw new BrowserGateFailure("acceptance_keys_resolved", `management API status=${response.status}; required keys present=false`);
  return { anon: pick("anon"), service: pick("service_role") };
}

// A session for a seeded synthetic identity, obtained exactly as the
// application obtains one (the password grant against the acceptance
// project), never minted locally.
async function sessionFor(email, keys) {
  const signedIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: keys.anon, Authorization: `Bearer ${keys.anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD })
  });
  const session = await signedIn.json().catch(() => null);
  if (!signedIn.ok || !session?.access_token || !session?.user?.id) throw new BrowserGateFailure("synthetic_cohort_signs_in", `${email.split("@")[0]} sign-in HTTP ${signedIn.status}`);
  return { id: session.user.id, email, session };
}

const SSR_COOKIE_CHUNK_SIZE = 3180;
function authCookies(session) {
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const pairs = [];
  if (value.length <= SSR_COOKIE_CHUNK_SIZE) pairs.push([name, value]);
  else for (let index = 0; index < value.length; index += SSR_COOKIE_CHUNK_SIZE) pairs.push([`${name}.${pairs.length}`, value.slice(index, index + SSR_COOKIE_CHUNK_SIZE)]);
  return pairs.map(([cookieName, cookieValue]) => ({ name: cookieName, value: cookieValue, domain: EXPECTED_HOSTNAME, path: "/", secure: true, httpOnly: true, sameSite: "Strict" }));
}

async function vercelJson(route, identity) {
  const response = await fetch(hostedVercelScopedUrl(route, identity), { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
}

async function newContext(browser, { viewport = { width: 1440, height: 900 }, user = null } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await context.route(`${PREVIEW}/**`, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": BYPASS } });
  });
  if (user) await context.addCookies(authCookies(user.session));
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  return { context, page };
}

// A same-origin request made from inside the page, so Origin/Referer are the
// Preview's own and the session cookie rides along, exactly as the UI does it.
async function api(page, pathname, body, method = "POST") {
  return page.evaluate(async ([p, b, m]) => {
    const response = await fetch(p, { method: m, headers: { "content-type": "application/json" }, body: b === null ? undefined : JSON.stringify(b) });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* keep text */ }
    return { status: response.status, json, text: text.slice(0, 400) };
  }, [pathname, body, method]);
}

async function screenshot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const width = page.viewportSize()?.width ?? 1440;
  const file = path.join(SCREENSHOT_DIR, `${name}-${width}.png`);
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(path.relative(EVIDENCE_ROOT, file));
}

// ---- intake form helpers (the same controls the local e2e drives) ---------
async function next(page) { await page.click("button:has-text('Save and continue')"); await page.waitForTimeout(250); }
async function gotoStep(page, title) { await page.click(`nav[aria-label='Application steps'] button:has-text('${title}')`); await page.waitForSelector(`h2:has-text('${title}')`); }
async function fillStep(page, section, person) {
  const fill = (key, value) => page.fill(`#f-${key.replace(/\W/g, "-")}`, value);
  const pick = (key, value) => page.check(`input[name='${key}'][value='${value}']`);
  switch (section) {
    case "personal":
      await fill("name.first", person.first); await fill("name.last", person.last);
      await fill("phone", person.phone); await fill("email", person.email);
      await fill("address.line1", "100 Training Street"); await fill("address.city", "Jackson");
      await page.selectOption("#f-address-state", "MS"); await fill("address.postal_code", "39201");
      await pick("is_us_citizen", person.citizen ? "yes" : "no"); await pick("gender", "prefer_not_to_say");
      await fill("date_of_birth", "1990-05-14"); await fill("race", "Prefer not to say");
      break;
    case "household":
      await fill("household.adult_count", "2"); await fill("household.child_count", "1"); await fill("household.member_ages", "34, 33, 6");
      await fill("household.disabled_member_count", "0"); await fill("household.occupation", "Warehouse associate"); await fill("household.employer", "Example Logistics");
      break;
    case "receipts":
      for (const key of ["wages", "disability", "food_stamps", "unemployment", "tanf", "family_friend_assistance", "other"]) await fill(`monthly_receipts.${key}`, key === "wages" ? "1200" : key === "food_stamps" ? "250" : "0");
      await page.check("#f-monthly_receipts-pension_retirement-unknown");
      break;
    case "assets":
      await pick("assets.owns_home", "no"); await pick("assets.owns_vehicle", "yes");
      await page.waitForSelector("#f-assets-vehicle_value");
      await fill("assets.vehicle_value", "3500"); await pick("assets.principal_vehicle", "yes");
      break;
    case "accounts":
      await pick("accounts.has_checking", "yes"); await page.waitForSelector("#f-accounts-checking_balance"); await fill("accounts.checking_balance", "140");
      await pick("accounts.has_savings", "no");
      break;
    case "expenses":
      for (const key of ["rent_mortgage", "child_support", "medical", "nursing_home_care", "taxes", "child_care", "transportation", "employment_related"]) await fill(`monthly_expenses.${key}`, key === "rent_mortgage" ? "650" : key === "transportation" ? "120" : "0");
      break;
    case "legal_context":
      await fill("matter_details", "One misdemeanor charge from 2016 that was dismissed; training record.");
      await pick("has_open_mvlp_case", "no"); await pick("has_attorney", "no"); await fill("referral_source", "Community center flyer (training)");
      break;
  }
}
async function signAll(page) {
  for (let guard = 0; guard < 6; guard += 1) {
    const button = page.locator("button:has-text('Sign this statement')").first();
    if ((await button.count()) === 0) return;
    const before = await page.locator("button:has-text('Sign this statement')").count();
    await button.click();
    await page.waitForFunction((n) => [...document.querySelectorAll("button")].filter((b) => b.textContent === "Sign this statement").length < n, before);
  }
}
// The whole application for one training applicant: registration, every
// intake step, the protected value, signatures and submission.
async function applyThroughIntake(page, person, { expectRegistration = "We have your registration", protectedValue = true } = {}) {
  await page.goto(`${PREVIEW}/clinic/${F.eventSlug}/register`);
  await page.waitForSelector("input[name=contactName]");
  await page.fill("input[name=contactName]", `${person.first} ${person.last}`);
  await page.fill("input[name=contactPhone]", person.phone);
  await page.check("input[name=preferredContact][value=text]");
  await page.fill("textarea[name=assistanceNeeds]", person.assistance);
  await page.click("button:has-text('Register for this clinic')");
  await page.waitForSelector(`text=${expectRegistration}`);
  await page.click("a:has-text('Start my application')");
  await page.waitForURL(/\/intake/);
  await page.waitForSelector("text=Step 1 of");
  await page.check("input[name=legal_matter][value=misdemeanor_expungement]");
  await next(page);
  await fillStep(page, "personal", person);
  await next(page);
  await page.waitForSelector("text=Protected information");
  if (protectedValue) {
    await page.fill("input[name=ssn]", SSN_FORMATTED);
    await page.click("button:has-text('Save securely')");
    await page.waitForSelector("text=On file:");
  }
  await next(page);
  for (const section of ["household", "receipts", "assets", "accounts", "expenses", "legal_context"]) { await fillStep(page, section, person); await next(page); }
  await page.waitForSelector("text=Review and sign");
}

async function main() {
  const missing = [
    ["exact application SHA", /^[0-9a-f]{40}$/.test(APPLICATION_SHA)],
    ["acceptance project", PROJECT_REF === EXPECTED_PROJECT_REF],
    ["exact deployment id", /^dpl_[A-Za-z0-9]+$/.test(DEPLOYMENT_ID)],
    ["deterministic Preview hostname", PREVIEW_HOSTNAME === EXPECTED_HOSTNAME],
    ["Vercel token", Boolean(VERCEL_TOKEN)],
    ["Supabase token", Boolean(SUPABASE_ACCESS_TOKEN)],
    ["in-memory bypass header", Boolean(BYPASS)],
    ["synthetic demo password (20+ characters)", DEMO_PASSWORD.length >= 20]
  ].filter(([, present]) => !present).map(([label]) => label);
  record("exact_nonproduction_inputs_present", missing.length === 0, missing.length === 0 ? "all exact nonproduction inputs present" : `missing/mismatched: ${missing.join(", ")}`);

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const [deployment, alias, aliases] = await Promise.all([
    vercelJson(`/v13/deployments/${encodeURIComponent(DEPLOYMENT_ID)}`, identity),
    vercelJson(`/v13/deployments/${encodeURIComponent(EXPECTED_HOSTNAME)}`, identity),
    vercelJson(`/v2/deployments/${encodeURIComponent(DEPLOYMENT_ID)}/aliases`, identity)
  ]);
  const deploymentId = deployment.json?.id ?? deployment.json?.uid ?? null;
  const aliasDeploymentId = alias.json?.id ?? alias.json?.uid ?? null;
  const productionAliases = (aliases.json?.aliases ?? []).filter((entry) => entry?.deployment?.target === "production" || entry?.target === "production");
  record(
    "exact_sha_alias_and_preview_target_verified",
    deployment.ok && alias.ok && deploymentId === DEPLOYMENT_ID && aliasDeploymentId === DEPLOYMENT_ID
      && (deployment.json?.readyState ?? deployment.json?.state) === "READY"
      && (deployment.json?.target === null || deployment.json?.target === "preview")
      && deployment.json?.meta?.rcapApplicationSha === APPLICATION_SHA
      && deployment.json?.meta?.rcapAcceptanceProjectRef === PROJECT_REF
      && deployment.json?.meta?.rcapClinicDemoMode === "mississippi_preview"
      && deployment.json?.meta?.rcapRouteState === "staging_scoped"
      && deployment.json?.meta?.rcapReturnOrigin === PREVIEW
      && productionAliases.length === 0,
    `deployment=${deploymentId}; alias exact=${aliasDeploymentId === DEPLOYMENT_ID}; READY=${deployment.json?.readyState}; target=${JSON.stringify(deployment.json?.target ?? null)}; SHA=${deployment.json?.meta?.rcapApplicationSha}; Production aliases=${productionAliases.length}`
  );

  const health = await fetch(`${PREVIEW}/api/health`, { headers: { "x-vercel-protection-bypass": BYPASS } });
  const healthJson = await health.json().catch(() => null);
  record("header_only_bypass_reaches_exact_application", health.status === 200 && healthJson && typeof healthJson.checks === "object", `GET /api/health=${health.status}`);

  // The one-file Legal Aid migration must already be on the acceptance
  // project (hosted_legal_aid_migrate); this phase applies nothing.
  const schema = await one(`select ${LEGAL_AID_TABLES.map((table) => `to_regclass('public.${table}') is not null as ${table}`).join(", ")},
    (select count(*) from public.rcap_acceptance_legal_aid_migration_ledger) as ledger_rows`);
  const tablesPresent = LEGAL_AID_TABLES.filter((table) => schema?.[table] === true).length;
  record("legal_aid_schema_read_back_without_migrating", tablesPresent === LEGAL_AID_TABLES.length && Number(schema?.ledger_rows) === 1, `${tablesPresent}/${LEGAL_AID_TABLES.length} Legal Aid tables; ledger rows=${schema?.ledger_rows}; no migration command exists in this phase`);

  const seed = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, "seed.json"), "utf8"));
  record("legal_aid_seed_evidence_bound_to_this_preview", seed.passed === true && seed.applicationSha === APPLICATION_SHA && seed.previewDeploymentId === DEPLOYMENT_ID && seed.eventId === F.eventId, `seed passed=${seed.passed}; same SHA and deployment=${seed.applicationSha === APPLICATION_SHA && seed.previewDeploymentId === DEPLOYMENT_ID}`);

  const keys = await supabaseKeys();
  const who = {};
  for (const spec of F.identities) who[spec.key] = await sessionFor(spec.email, keys);
  who.APPLICANT_A = await sessionFor(F.packetApplicantEmail, keys);
  record("synthetic_cohort_signs_in", Object.keys(who).length === F.identities.length + 1, `${Object.keys(who).length} synthetic identities signed in against ${SUPABASE_URL} (hashed ids only: ${Object.entries(who).map(([key, user]) => `${key}=${shortId(user.id)}`).join(", ")})`);

  // Applicant A's genuinely generated Mississippi packet from the Clinic
  // journey on this same Preview. Not a preloaded file: the row must be the
  // sponsored route's own artifact_validated job with a stored artifact.
  const packet = await one(`select j.id, j.status, j.output_sha256, j.output_storage_path, j.route_id, j.sponsored_route_key, j.created_at
    from public.packet_render_jobs j where j.sponsored_consumer_auth_user_id='${who.APPLICANT_A.id}' and j.status in ('artifact_validated','delivered')
    order by j.created_at desc limit 1`);
  record("hosted_generated_mississippi_packet_exists_for_applicant_a", Boolean(packet?.id) && /^[a-f0-9]{64}$/.test(packet?.output_sha256 ?? "") && Boolean(packet?.output_storage_path) && String(packet?.route_id ?? "").startsWith("MS:"),
    packet ? `job=${shortId(packet.id)}; status=${packet.status}; route=${packet.route_id}; sponsored_route=${packet.sponsored_route_key}; sha=${String(packet.output_sha256).slice(0, 12)}…; created=${packet.created_at}` : "no artifact_validated sponsored packet for applicant A on this project; the Clinic journey must have generated one on this Preview");
  evidence.hostedPacket = { jobIdHash: shortId(packet.id), status: packet.status, routeId: packet.route_id, outputSha256: packet.output_sha256, createdAt: packet.created_at };

  const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM, headless: true } : { channel: "chrome", headless: true });
  const contexts = [];
  const open = async (options) => { const c = await newContext(browser, options); contexts.push(c.context); return c.page; };
  try {
    // ------------------------------------------------------------------
    // 1. The interim coordinator (internal administrator) sets the clinic up
    //    from the internal console; a partner administrator approves the
    //    policy profile independently.
    // ------------------------------------------------------------------
    const internal = await open({ user: who.INTERNAL_ADMIN });
    await internal.goto(`${PREVIEW}/internal/clinic/${F.eventId}`);
    record("internal_console_links_legal_aid_setup", (await internal.locator(`a[href='/internal/clinic/${F.eventId}/legal-aid']`).count()) === 1, "internal Clinic Mode console shows 'Legal aid clinic setup'");
    await internal.goto(`${PREVIEW}/internal/clinic/${F.eventId}/legal-aid`);
    await internal.waitForSelector("h1");
    record("internal_legal_aid_setup_page_renders", (await internal.textContent("h1"))?.includes("legal aid clinic setup") === true, `h1=${sanitize(await internal.textContent("h1"))}`);
    await internal.click("button:has-text('Prepare a new draft from the template')");
    await internal.waitForSelector("text=Draft profile prepared");
    const draft = await one(`select id, status, prepared_by from public.legal_aid_policy_profiles where partner_slug='${F.partnerSlug}' order by version desc limit 1`);
    record("interim_coordinator_prepares_policy_profile_draft", draft?.status === "draft" && draft?.prepared_by === who.INTERNAL_ADMIN.id, `draft ${shortId(draft?.id)} prepared by the internal administrator`);
    await internal.reload();
    await internal.click("button:has-text('Approve')");
    await internal.waitForSelector("text=A profile is approved by a second administrator");
    record("preparer_cannot_approve_own_draft", true, "self-approval refused on the internal page");

    const adminA = await open({ user: who.ADMIN_A });
    await adminA.goto(`${PREVIEW}/partner/clinic/${F.eventId}/legal-aid`);
    await adminA.fill("input[placeholder='Approval note (optional)']", "Approved for the acceptance training clinic");
    await adminA.click("button:has-text('Approve')");
    await adminA.waitForSelector("text=Profile approved");
    const approved = await one(`select status, approved_by from public.legal_aid_policy_profiles where id='${draft.id}'`);
    record("independent_administrator_approves_profile", approved?.status === "approved" && approved?.approved_by === who.ADMIN_A.id, "approved by a different administrator (partner admin A)");

    await internal.reload();
    await internal.selectOption("select[name=policyProfileId]", { index: 1 });
    await internal.selectOption("select[name=appointmentPolicy]", "mixed");
    await internal.fill("input[name=participantCostNote]", "The clinic is free. Court filing fees may apply.");
    await internal.fill("textarea[name=publicDescription]", "Bring a photo ID and any court paperwork you have. Attorneys review each case at the clinic. (Acceptance training clinic — synthetic.)");
    await internal.click("button:has-text('Save clinic settings')");
    await internal.waitForSelector("text=Clinic settings saved");
    for (const [key, permissions] of Object.entries(F.staffAssignments)) {
      await internal.reload();
      const partnerUserId = (await one(`select id from public.partner_users where auth_user_id='${who[key].id}' and partner_slug='${F.partnerSlug}'`))?.id;
      await internal.selectOption("select[name=partnerUserId]", partnerUserId);
      for (const permission of permissions) await internal.check(`input[name=permissions][value=${permission}]`);
      await internal.click("button:has-text('Save team member')");
      await internal.waitForSelector("text=Clinic team updated");
    }
    const staffRows = await managementQuery(`select count(*) as n from public.clinic_event_staff where event_id='${F.eventId}' and status='approved'`);
    record("interim_coordinator_assigns_clinic_team", Number(staffRows?.[0]?.n) === 4, `${staffRows?.[0]?.n} approved staff assignments (coordinator, intake volunteer, attorney, notary)`);
    await screenshot(internal, "internal-legal-aid-setup");
    const publish = await api(internal, `/api/clinic/events/${F.eventId}`, { status: "published" }, "PATCH");
    const eventRow = await one(`select status, experience, policy_profile_id from public.clinic_events where id='${F.eventId}'`);
    record("interim_coordinator_publishes_legal_aid_clinic", publish.status === 200 && eventRow?.status === "published" && eventRow?.experience === "legal_aid" && eventRow?.policy_profile_id === draft.id, `PATCH=${publish.status}; status=${eventRow?.status}; experience=${eventRow?.experience}`);

    // ------------------------------------------------------------------
    // 2. Applicant A: real sign-in through the page, registration, the
    //    complete confidential intake, save/refresh/resume, submission.
    // ------------------------------------------------------------------
    const a = await open({ viewport: { width: 390, height: 844 } });
    await a.goto(`${PREVIEW}/p/${F.partnerSlug}/clinics`);
    record("public_clinic_listing_shows_the_published_clinic", (await a.locator(`text=${F.eventName}`).count()) > 0 && !/tenant|Grade A|source hash|release candidate/i.test(await a.content()), "listing shows the training clinic; no internal vocabulary");
    await screenshot(a, "participant-clinics");
    await a.click("a:has-text('Register for this clinic')");
    await a.waitForURL(/sign-in/);
    record("registration_requires_sign_in", /sign-in/.test(a.url()), `redirected to ${new URL(a.url()).pathname}`);
    await a.locator('input[name="email"]').fill(who.APPLICANT_A.email);
    await a.locator('input[name="password"]').fill(DEMO_PASSWORD);
    const authResponse = a.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"));
    await a.getByRole("button", { name: "Sign in", exact: true }).click();
    const auth = await authResponse;
    await a.waitForURL(/\/clinic\/.*\/register/);
    record("participant_signs_in_and_returns_to_registration", auth.ok() && /\/register/.test(a.url()), `password sign-in HTTP ${auth.status()}; returned to ${new URL(a.url()).pathname}`);
    await screenshot(a, "participant-register");
    const personA = { first: "Jordan", last: "Training", phone: "601-555-0100", email: who.APPLICANT_A.email, citizen: true, assistance: "Afternoon only." };
    await applyThroughIntake(a, personA);
    await screenshot(a, "participant-intake-sign");
    const regA = await one(`select status, participant_user_id, contact_name from public.clinic_registrations where event_id='${F.eventId}' and participant_user_id='${who.APPLICANT_A.id}'`);
    record("registration_saved_for_the_right_account", regA?.status === "received" && regA?.contact_name === "Jordan Training", `status=${regA?.status}`);
    const again = await api(a, "/api/legal-aid/registrations", { eventId: F.eventId, idempotencyKey: "second-attempt-key", contactName: "Jordan Training", contactEmail: who.APPLICANT_A.email, preferredContact: "email" });
    record("duplicate_registration_refused", again.json?.outcome === "already_registered", JSON.stringify(again.json));
    // Refresh and resume: the saved draft comes back from the server.
    await a.reload();
    await a.waitForSelector("text=Review and sign");
    await gotoStep(a, "About you");
    record("intake_saved_and_resumed_after_refresh", (await a.inputValue("#f-name-first")) === "Jordan" && (await a.locator(`text=${SSN_MASKED}`).count()) === 0, "first name restored from the saved draft; protected value never rendered on the answers step");
    await gotoStep(a, "Review and sign");
    record("citizen_sees_no_confidential_review_statement", (await a.locator("text=Confidential status review").count()) === 0 && (await a.locator("text=I am a citizen of the United States of America.").count()) === 1, "citizenship statement only");
    await signAll(a);
    await a.click("button:has-text('Submit my application')");
    await a.waitForSelector("text=Your application has been received");
    await screenshot(a, "participant-submitted");
    const intakeA = await one(`select id, status, clinic_case_id, answers::text as answers from public.legal_aid_intakes where event_id='${F.eventId}' and participant_user_id='${who.APPLICANT_A.id}'`);
    record("application_submitted_with_clinic_case", intakeA?.status === "submitted" && Boolean(intakeA?.clinic_case_id), `intake ${shortId(intakeA?.id)} submitted`);
    const restricted = await one(`select ciphertext, display_hint, key_version from public.legal_aid_restricted_fields where intake_id='${intakeA.id}'`);
    record("protected_value_encrypted_at_rest_with_masked_hint", Boolean(restricted) && !String(restricted.ciphertext).includes(SSN) && restricted.display_hint === "6789" && restricted.key_version === "v1" && !String(intakeA.answers).includes(SSN), `key_version=${restricted?.key_version}; hint=${restricted?.display_hint}; answers carry no protected value`);
    const storage = await a.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    record("no_application_data_in_browser_storage", !storage.some((key) => /intake|answer|ssn|legal|signature/i.test(key)), `storage keys: ${storage.join(",") || "(none)"}`);
    await a.goto(`${PREVIEW}/p/${F.partnerSlug}/continue`);
    record("continue_hub_shows_submitted_application_on_a_phone", (await a.locator("text=has been received").count()) > 0 && (await a.evaluate(() => document.documentElement.scrollWidth <= 390)), "no horizontal scroll at 390px");
    await screenshot(a, "participant-continue");
    evidence.trainingRecords.A = { intakeIdHash: shortId(intakeA.id), applicant: "Jordan Training (synthetic)", state: "submitted" };

    // ------------------------------------------------------------------
    // 3. Applicant B (missing document) and applicant C (confidential
    //    review, waitlisted: the training clinic has two seats).
    // ------------------------------------------------------------------
    const b = await open({ user: who.APPLICANT_B });
    const personB = { first: "Taylor", last: "Training", phone: "601-555-0101", email: who.APPLICANT_B.email, citizen: true, assistance: "" };
    await applyThroughIntake(b, personB);
    await signAll(b);
    await b.click("button:has-text('Submit my application')");
    await b.waitForSelector("text=Your application has been received");
    const intakeB = await one(`select id, status from public.legal_aid_intakes where event_id='${F.eventId}' and participant_user_id='${who.APPLICANT_B.id}'`);
    record("applicant_b_submits", intakeB?.status === "submitted", `intake ${shortId(intakeB?.id)}`);

    const c = await open({ user: who.APPLICANT_C });
    const personC = { first: "Casey", last: "Training", phone: "601-555-0102", email: who.APPLICANT_C.email, citizen: false, assistance: "Needs an interpreter (training)." };
    await applyThroughIntake(c, personC, { expectRegistration: "waitlist" });
    const regC = await one(`select status, waitlisted_at from public.clinic_registrations where event_id='${F.eventId}' and participant_user_id='${who.APPLICANT_C.id}'`);
    record("capacity_reached_puts_applicant_c_on_the_waitlist", regC?.status === "waitlisted" && Boolean(regC?.waitlisted_at), `status=${regC?.status}`);
    record("non_citizen_sees_confidential_review_acknowledgment", (await c.locator("text=Confidential status review").count()) === 1, "confidential review statement offered to a non-citizen applicant");
    await signAll(c);
    await c.click("button:has-text('Submit my application')");
    await c.waitForSelector("text=Your application has been received");
    const sigC = await one(`select count(*) as n from public.legal_aid_intake_signatures s join public.legal_aid_intakes i on i.id=s.intake_id where i.participant_user_id='${who.APPLICANT_C.id}' and i.event_id='${F.eventId}' and s.statement_key='noncitizen_review_acknowledgment' and s.status='active'`);
    const intakeC = await one(`select id, status from public.legal_aid_intakes where event_id='${F.eventId}' and participant_user_id='${who.APPLICANT_C.id}'`);
    record("applicant_c_submits_with_confidential_review_acknowledgment", intakeC?.status === "submitted" && Number(sigC?.n) === 1, `intake ${shortId(intakeC?.id)}; acknowledgment signed`);
    evidence.trainingRecords.B = { intakeIdHash: shortId(intakeB.id), applicant: "Taylor Training (synthetic)", state: "submitted; returned for a missing document below" };
    evidence.trainingRecords.C = { intakeIdHash: shortId(intakeC.id), applicant: "Casey Training (synthetic)", state: "submitted; needs confidential review; waitlisted" };

    // Another participant cannot read A's application; a participant cannot
    // call staff actions.
    const otherRead = await api(b, `/api/legal-aid/intakes/${intakeA.id}`, null, "GET");
    const otherStaff = await api(a, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "start_review" });
    record("participants_cannot_read_or_act_on_each_others_applications", otherRead.status === 404 && [401, 403].includes(otherStaff.status), `read=${otherRead.status}; staff action=${otherStaff.status}`);

    // ------------------------------------------------------------------
    // 4. Staff: coordinator review of A, missing-document request on B,
    //    denied access for the intake volunteer, cross-tenant denial.
    // ------------------------------------------------------------------
    const coordinator = await open({ user: who.COORDINATOR });
    await coordinator.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications`);
    record("coordinator_sees_the_three_training_applications", (await coordinator.locator("text=Jordan Training").count()) > 0 && (await coordinator.locator("text=Taylor Training").count()) > 0 && (await coordinator.locator("text=Casey Training").count()) > 0, "A, B and C listed");
    await screenshot(coordinator, "staff-applications");
    // B: returned for a missing document (kept as a training record).
    await coordinator.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeB.id}`);
    await coordinator.click("button:has-text('Start review')");
    await coordinator.waitForSelector("text=Review started");
    await coordinator.fill("input[placeholder='Plain language the applicant will read']", "Please upload a copy of your court paperwork.");
    await coordinator.click("button:has-text('Send request')");
    await coordinator.waitForSelector("text=The applicant will see this request");
    record("applicant_b_returned_for_missing_document", (await one(`select status from public.legal_aid_intakes where id='${intakeB.id}'`))?.status === "needs_information", "B is needs_information");
    await b.goto(`${PREVIEW}/clinic/${F.eventSlug}/intake`);
    await b.waitForSelector("text=Please update your application");
    record("applicant_b_sees_the_information_request", (await b.locator("text=court paperwork").count()) > 0, "request text shown to the applicant");
    evidence.trainingRecords.B.state = "needs_information (missing document)";

    // A: review, financial summary, decision, next step, message, export.
    await coordinator.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeA.id}`);
    await coordinator.waitForSelector("text=Application review");
    await screenshot(coordinator, "staff-review");
    record("financial_summary_needs_a_persons_decision", (await coordinator.locator("text=Needs a person's decision").count()) === 1 && (await coordinator.locator("text=Not counted: food_stamps").count()) === 1, "no invented guideline table; food stamps not counted as cash income");
    await coordinator.click("button:has-text('Start review')");
    await coordinator.waitForSelector("text=Review started");

    const volunteer = await open({ user: who.INTAKE_VOLUNTEER });
    await volunteer.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeA.id}`);
    const volunteerReveal = await api(volunteer, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "reveal_ssn", purpose: "curiosity about the number" });
    const volunteerDecision = await api(volunteer, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "record_decision", decisionType: "program_eligibility", outcome: "approved", rationale: "should not be allowed", evidence: {} });
    record("intake_volunteer_cannot_reveal_or_decide", (await volunteer.locator("text=Reveal once").count()) === 0 && volunteerReveal.status === 403 && volunteerDecision.status === 403, `reveal=${volunteerReveal.status}; decision=${volunteerDecision.status}`);

    const crossTenant = await open({ user: await sessionFor("mvl-demo-admin@rcap-acceptance.test", keys) });
    await crossTenant.goto(`${PREVIEW}/partner/clinic/${F.eventId}/legal-aid`);
    const crossApi = await api(crossTenant, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "start_review" });
    record("other_organizations_administrator_denied_cross_tenant", (await crossTenant.locator("text=Clinic access denied").count()) === 1 && [403, 404].includes(crossApi.status), `page denied; API=${crossApi.status}`);

    await coordinator.reload();
    await coordinator.selectOption("form:has(button:has-text('Record decision')) select >> nth=0", "program_eligibility");
    await coordinator.selectOption("form:has(button:has-text('Record decision')) select >> nth=1", "approved");
    await coordinator.fill("form:has(button:has-text('Record decision')) textarea >> nth=0", "Household within the approved profile's service rules; matter is a misdemeanor expungement. (Training record.)");
    await coordinator.click("button:has-text('Record decision')");
    await coordinator.waitForSelector("text=Decision recorded");
    record("program_decision_recorded_separately_from_legal_eligibility", (await one(`select program_decision from public.legal_aid_intakes where id='${intakeA.id}'`))?.program_decision === "approved", "program_decision=approved");
    await coordinator.fill("input[placeholder='Bring your certified court record to the clinic']", "Bring your photo ID and the court paperwork to the clinic.");
    await coordinator.click("button:has-text('Add next step')");
    await coordinator.waitForSelector("text=Next step saved");
    await coordinator.fill("textarea[name=message]", "Thank you. Your application is approved for the clinic. Please bring your photo ID. (Acceptance training message.)");
    await coordinator.click("button:has-text('Send and record')");
    await coordinator.waitForSelector("text=Recorded", { timeout: 60_000 });
    const followUp = await one(`select communication_state, internal_notes from public.clinic_follow_ups where event_id='${F.eventId}' order by created_at desc limit 1`);
    if (evidence.emailDelivery.mode === "configured") {
      const providerId = /provider message ([A-Za-z0-9-]+)/.exec(String(followUp?.internal_notes ?? ""))?.[1] ?? null;
      let providerEvent = null;
      if (providerId) {
        const lookup = await fetch(`https://api.resend.com/emails/${encodeURIComponent(providerId)}`, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
        const body = await lookup.json().catch(() => null);
        providerEvent = { status: lookup.status, lastEvent: body?.last_event ?? null, to: Array.isArray(body?.to) ? body.to.map((address) => String(address).toLowerCase()) : null };
      }
      evidence.emailDelivery.observed = { communicationState: followUp?.communication_state ?? null, providerMessageIdRecorded: Boolean(providerId), providerEvent };
      record("follow_up_email_actually_delivered_to_the_test_mailbox", followUp?.communication_state === "sent" && providerEvent?.status === 200 && ["sent", "delivered"].includes(providerEvent?.lastEvent ?? "") && (providerEvent?.to ?? []).includes(TEST_MAILBOX), `communication_state=${followUp?.communication_state}; provider last_event=${providerEvent?.lastEvent}; recipient is the authorized test mailbox=${(providerEvent?.to ?? []).includes(TEST_MAILBOX)}`);
    } else {
      evidence.emailDelivery.observed = { communicationState: followUp?.communication_state ?? null };
      record("follow_up_recorded_truthfully_without_email_delivery", followUp?.communication_state === "no_contact", `communication_state=${followUp?.communication_state}: saved, not sent; email delivery is not configured on this Preview (see emailDelivery.accessNeeded). This is not proof of delivery.`);
    }
    await coordinator.click("button:has-text('Export case file')");
    await coordinator.waitForSelector("text=Case file exported");
    const maskedExport = await one(`select id, includes_restricted, storage_path from public.legal_aid_case_exports where intake_id='${intakeA.id}' order by export_version desc limit 1`);
    const maskedJson = await api(coordinator, `/api/legal-aid/exports/${maskedExport.id}?format=json`, null, "GET");
    const maskedPdf = await coordinator.evaluate(async (id) => { const r = await fetch(`/api/legal-aid/exports/${id}?format=pdf`); return { status: r.status, type: r.headers.get("content-type") }; }, maskedExport.id);
    record("masked_case_file_export_downloads_as_json_and_pdf", maskedExport.includes_restricted === false && maskedJson.status === 200 && maskedJson.text.includes(SSN_MASKED) && !maskedJson.text.includes(SSN) && maskedPdf.status === 200 && maskedPdf.type === "application/pdf", `json=${maskedJson.status}; pdf=${maskedPdf.status} ${maskedPdf.type}`);
    await coordinator.fill("input[placeholder=\"e.g. the case number in the partner's records\"]", "MVLP-ACCEPTANCE-TRAINING-001");
    await coordinator.click("button:has-text('Save reference')");
    await coordinator.waitForSelector("text=Case reference saved");

    // ------------------------------------------------------------------
    // 5. Attorney: assignment, audited reveal, the hosted-generated packet
    //    attached as the unsigned execution copy, execution sequence; notary
    //    upload; filing by the coordinator; protected export.
    // ------------------------------------------------------------------
    const attorney = await open({ user: who.ATTORNEY });
    await attorney.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeA.id}`);
    await attorney.click("button:has-text('Take attorney assignment')");
    await attorney.waitForSelector("text=Attorney assigned");
    await attorney.click("button:has-text('Begin attorney review')");
    await attorney.waitForSelector("text=Attorney review in progress");
    await attorney.fill("input[placeholder='e.g. preparing the petition for filing']", "Preparing the expungement petition for filing");
    await attorney.click("button:has-text('Reveal once')");
    await attorney.waitForSelector("text=Revealed for 60 seconds");
    record("attorney_audited_reveal_shows_the_value_once", (await attorney.locator(`text=${SSN_FORMATTED}`).count()) === 1, "revealed once with a recorded purpose");
    await attorney.click("button:has-text('Hide now')");
    await attorney.waitForSelector("option:has-text('Attach later')", { state: "attached" });
    const packetOptions = await attorney.locator("form:has(input[name=documentKey]) select").last().locator("option").allTextContents();
    const packetOffered = packetOptions.some((text) => text.includes(String(packet.output_sha256).slice(0, 8)) || text.includes("artifact_validated"));
    record("hosted_generated_packet_offered_as_unsigned_copy", packetOffered && packetOptions.length === 2, `options=${JSON.stringify(packetOptions)}`);
    await attorney.fill("input[name=documentKey]", "ms-expungement-petition");
    await attorney.fill("input[name=title]", "Petition for Expungement");
    await attorney.locator("form:has(input[name=documentKey]) select").last().selectOption({ index: 1 });
    await attorney.click("button:has-text('Add document')");
    await attorney.waitForSelector("text=Document added");
    const task = await one(`select id, status, unsigned_render_job_id, unsigned_artifact_sha256 from public.legal_aid_document_tasks where intake_id='${intakeA.id}'`);
    record("document_task_bound_to_the_hosted_packet_hash", task?.status === "draft" && task?.unsigned_render_job_id === packet.id && task?.unsigned_artifact_sha256 === packet.output_sha256, `task ${shortId(task?.id)} bound to job ${shortId(packet.id)}`);
    const unsigned = await attorney.evaluate(async ([intake, taskId]) => { const r = await fetch(`/api/legal-aid/staff/intakes/${intake}/unsigned/${taskId}`); const bytes = new Uint8Array(await r.arrayBuffer()); const digest = await crypto.subtle.digest("SHA-256", bytes); return { status: r.status, type: r.headers.get("content-type"), size: bytes.byteLength, sha: [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("") }; }, [intakeA.id, task.id]);
    record("unsigned_copy_is_the_hosted_generated_packet_bytes", unsigned.status === 200 && unsigned.type === "application/pdf" && unsigned.sha === packet.output_sha256 && unsigned.size > 1000, `HTTP ${unsigned.status}; ${unsigned.size} bytes; sha matches the render job=${unsigned.sha === packet.output_sha256}`);
    evidence.hostedPacket.unsignedCopyBytes = unsigned.size;
    for (const label of ["Mark attorney reviewed", "Mark ready for execution", "Mark signature or notary pending"]) {
      await attorney.click(`button:has-text("${label}")`);
      await attorney.waitForSelector("text=Moved to");
      await attorney.reload();
    }
    const skip = await api(attorney, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "transition_document_task", taskId: task.id, status: "filed" });
    record("execution_sequence_enforced_in_order", (await one(`select status from public.legal_aid_document_tasks where id='${task.id}'`))?.status === "signature_or_notary_pending" && skip.json?.success === false, "skipping to filed refused");
    await screenshot(attorney, "staff-documents");

    const notary = await open({ user: who.NOTARY });
    await notary.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeA.id}`);
    await notary.waitForSelector("text=Notarization");
    record("notary_sees_only_the_execution_view", (await notary.locator("text=Monthly Wages").count()) === 0 && (await notary.locator("text=Petition for Expungement").count()) === 1, "no answers or financial detail");
    await screenshot(notary, "staff-notary");
    await notary.setInputFiles("input[name=file]", { name: "petition-signed-notarized.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.from("% executed (synthetic)\n")]) });
    await notary.click("button:has-text('Upload')");
    await notary.waitForSelector("text=Uploaded.");
    await notary.selectOption("select >> nth=0", { index: 1 });
    await notary.click("button:has-text('Record executed copy received')");
    await notary.waitForSelector("text=Recorded. The clinic team will review");
    const executed = await one(`select t.executed_document_id, d.storage_path, d.sha256 from public.legal_aid_document_tasks t left join public.legal_aid_documents d on d.id=t.executed_document_id where t.id='${task.id}'`);
    const notaryReveal = await api(notary, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "reveal_ssn", purpose: "notary should not see this" });
    record("notary_uploads_executed_copy_to_private_storage_and_cannot_reveal", Boolean(executed?.executed_document_id) && String(executed?.storage_path ?? "").startsWith(`legal-aid/${intakeA.id}/`) && notaryReveal.status === 403, `executed doc ${shortId(executed?.executed_document_id)} at a private path; reveal=${notaryReveal.status}`);
    const objectRow = await one(`select count(*) as n from storage.objects where bucket_id='rcap-legal-aid-private' and name='${sqlText(executed.storage_path)}'`);
    record("executed_copy_object_exists_in_the_private_bucket", Number(objectRow?.n) === 1, `storage.objects rows=${objectRow?.n} in rcap-legal-aid-private`);

    await attorney.reload();
    for (const label of ["Mark execution reviewed", "Mark ready to file"]) {
      await attorney.click(`button:has-text("${label}")`);
      await attorney.waitForSelector("text=Moved to");
      await attorney.reload();
    }
    const attorneyFiled = await api(attorney, `/api/legal-aid/staff/intakes/${intakeA.id}`, { action: "transition_document_task", taskId: task.id, status: "filed" });
    record("filing_is_recorded_by_the_coordinator_not_the_attorney", (await attorney.locator("button:has-text('Mark filed')").count()) === 0 && attorneyFiled.json?.success === false, "attorney has no filing control and the server refuses");
    await coordinator.reload();
    await coordinator.click("button:has-text('Mark filed')");
    await coordinator.waitForSelector("text=Moved to");
    record("document_filed_after_execution_review", (await one(`select status from public.legal_aid_document_tasks where id='${task.id}'`))?.status === "filed", "status=filed");
    await attorney.check("input[name=includeRestricted]");
    await attorney.click("button:has-text('Export case file')");
    await attorney.waitForSelector("text=Case file exported");
    const fullExport = await one(`select id, includes_restricted, storage_path from public.legal_aid_case_exports where intake_id='${intakeA.id}' order by export_version desc limit 1`);
    const fullJson = await api(attorney, `/api/legal-aid/exports/${fullExport.id}?format=json`, null, "GET");
    const storedExport = await one(`select count(*) as n from storage.objects where bucket_id='rcap-legal-aid-private' and name in ('${sqlText(fullExport.storage_path)}','${sqlText(String(fullExport.storage_path).replace(/\.pdf$/, ".json"))}')`);
    record("protected_export_includes_value_for_the_attorney_and_is_stored_privately", fullExport.includes_restricted === true && fullJson.status === 200 && fullJson.text.includes("MVLP-ACCEPTANCE-TRAINING-001") && Number(storedExport?.n) >= 1, `includes_restricted=true; json=${fullJson.status}; private objects=${storedExport?.n}`);
    evidence.protectedValueRecorded = false;

    await a.goto(`${PREVIEW}/clinic/${F.eventSlug}/intake`);
    record("participant_sees_approval_next_steps_and_filed_status", (await a.locator("text=You are approved for clinic services").count()) === 1 && (await a.locator("text=Filed with the court.").count()) === 1, "approved view with next step and document status");
    await screenshot(a, "participant-approved");
    evidence.trainingRecords.A.state = "approved; packet attached, executed and filed";

    const audit = await managementQuery(`select action, count(*) as n from public.legal_aid_access_audit where intake_id='${intakeA.id}' group by action order by action`);
    const actions = Object.fromEntries((audit ?? []).map((row) => [row.action, Number(row.n)]));
    record("access_audit_records_views_reveals_exports_and_unsigned_copy", (actions.restricted_revealed ?? 0) >= 2 && (actions.export_created ?? 0) >= 2 && (actions.intake_viewed ?? 0) >= 3 && actions.unsigned_copy_opened === 1, JSON.stringify(actions));

    // ------------------------------------------------------------------
    // 6. Shared-device reset: the applicant signs out on the shared device;
    //    nothing stays in the browser and the application is not reachable
    //    by going back.
    // ------------------------------------------------------------------
    // The application's sign-out is a same-origin POST (GET only redirects).
    const signOut = await a.evaluate(async () => { const r = await fetch("/sign-out", { method: "POST", body: new URLSearchParams({ intent: "sign-out" }), redirect: "follow" }); return { status: r.status, url: r.url }; });
    record("participant_signs_out_on_the_shared_device", [200, 303].includes(signOut.status) && /sign-in/.test(signOut.url), `POST /sign-out -> ${signOut.status} ${new URL(signOut.url).pathname}`);
    await a.waitForTimeout(500);
    await a.goto(`${PREVIEW}/clinic/${F.eventSlug}/intake`);
    await a.waitForTimeout(1500);
    const afterSignOut = { url: new URL(a.url()).pathname, storage: await a.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]), body: await a.innerText("body").catch(() => "") };
    await a.goBack().catch(() => null);
    await a.waitForTimeout(800);
    const backBody = await a.innerText("body").catch(() => "");
    record("shared_device_sign_out_leaves_nothing_behind", /sign-in/.test(afterSignOut.url) && !afterSignOut.storage.some((key) => /intake|answer|ssn|legal|signature/i.test(key)) && !afterSignOut.body.includes("Jordan Training") && !backBody.includes(SSN_MASKED) && !backBody.includes("Review and sign"), `after sign-out: ${afterSignOut.url}; storage=${afterSignOut.storage.length} keys; back navigation shows no application`);

    // ------------------------------------------------------------------
    // 7. Provisioning and first-administrator invitation, then the
    //    administrator handoff with last-administrator protection.
    // ------------------------------------------------------------------
    const provisioned = await api(internal, "/api/internal/partners/provisioning", {
      organizationName: F.handoffOrganizationName, legalOrganizationName: `${F.handoffOrganizationName} Inc.`, partnerSlug: F.handoffPartnerSlug,
      programName: "Handoff training program", programPurpose: "Synthetic organization used only to exercise provisioning and the administrator handoff in the acceptance environment.",
      administratorName: "First Admin Training", administratorEmail: who.FIRST_ADMIN.email,
      clearanceReason: "Hosted acceptance of the MVLP rollout: provisioning and first-administrator flow on synthetic identities only.",
      idempotencyKey: crypto.randomUUID()
    });
    const handoffRow = await one(`select (select count(*) from public.partner_records where partner_slug='${F.handoffPartnerSlug}') as records, (select count(*) from public.partner_onboarding where partner_slug='${F.handoffPartnerSlug}') as workspaces`);
    record("internal_administrator_provisions_a_partner_through_the_app", [200, 201].includes(provisioned.status) && provisioned.json?.ok === true && Number(handoffRow?.records) === 1 && Number(handoffRow?.workspaces) >= 1, `POST=${provisioned.status}; partner rows=${handoffRow?.records}; workspaces=${handoffRow?.workspaces}`);
    await internal.goto(`${PREVIEW}/internal/partners/provisioning/${F.handoffPartnerSlug}`);
    await internal.waitForSelector("h2#partner-access-heading");
    record("first_admin_access_view_starts_with_no_administrator", (await internal.textContent("h2#partner-access-heading"))?.trim() === "No administrator configured", sanitize(await internal.textContent("h2#partner-access-heading")));
    const invitation = await api(internal, `/api/internal/partners/first-admin/${F.handoffPartnerSlug}`, { action: "create", fullName: "First Admin Training", email: who.FIRST_ADMIN.email, idempotencyKey: crypto.randomUUID(), expirationHours: 72 });
    const setupLink = invitation.json?.setupLink ?? null;
    record("first_admin_invitation_created_with_secure_setup_link", invitation.status === 200 && invitation.json?.created === true && typeof setupLink === "string" && setupLink.startsWith(`${PREVIEW}/partner/setup?token=`) && invitation.json?.access?.accessStatus === "invitation_pending", `created=${invitation.json?.created}; access=${invitation.json?.access?.accessStatus}; link host is the Preview=${String(setupLink).startsWith(PREVIEW)}`);
    await screenshot(internal, "internal-first-admin-invitation");

    // The invited email already has one confirmed account, so the link routes
    // through ordinary sign-in and the invitation is consumed only once the
    // session proves the same address.
    const invitee = await open({});
    const claim = await invitee.goto(setupLink);
    await invitee.waitForURL(/sign-in/);
    record("setup_link_for_an_existing_account_routes_through_sign_in", /sign-in/.test(invitee.url()) && claim !== null, `claimed -> ${new URL(invitee.url()).pathname}`);
    await invitee.locator('input[name="email"]').fill(who.FIRST_ADMIN.email);
    await invitee.locator('input[name="password"]').fill(DEMO_PASSWORD);
    await invitee.getByRole("button", { name: "Sign in", exact: true }).click();
    await invitee.waitForTimeout(4000);
    const accepted = await one(`select role, status, partner_slug from public.partner_users where auth_user_id='${who.FIRST_ADMIN.id}'`);
    let acceptedNow = accepted;
    if (!(accepted?.role === "partner_admin" && accepted?.status === "active")) {
      // The sign-in page may land elsewhere; the claim path is idempotent.
      await invitee.goto(`${PREVIEW}/partner/first-admin/claim`).catch(() => null);
      await invitee.waitForTimeout(3000);
      acceptedNow = await one(`select role, status, partner_slug from public.partner_users where auth_user_id='${who.FIRST_ADMIN.id}'`);
    }
    record("first_admin_invitation_accepted_membership_active", acceptedNow?.role === "partner_admin" && acceptedNow?.status === "active" && acceptedNow?.partner_slug === F.handoffPartnerSlug, `membership: ${acceptedNow?.role}/${acceptedNow?.status} on ${acceptedNow?.partner_slug}; landed on ${new URL(invitee.url()).pathname}`);
    await invitee.goto(`${PREVIEW}/partner/clinic`);
    record("first_admin_reaches_the_partner_clinic_console", !/sign-in/.test(invitee.url()) && (await invitee.locator("text=Clinic Mode").count()) > 0, `at ${new URL(invitee.url()).pathname}`);

    // Handoff, step 1: the last administrator cannot be removed.
    const view = await api(internal, `/api/internal/partners/first-admin/${F.handoffPartnerSlug}`, null, "GET");
    const soleAdmin = view.json?.access?.administrators?.[0] ?? null;
    const refused = await api(internal, `/api/internal/partners/first-admin/${F.handoffPartnerSlug}`, { action: "end_access", membershipId: soleAdmin?.membershipId });
    record("last_administrator_cannot_be_removed", view.json?.access?.accessStatus === "administrator_active" && view.json?.access?.administrators?.length === 1 && refused.status === 409 && refused.json?.code === "last_administrator", `access=${view.json?.access?.accessStatus}; end_access=${refused.status} ${refused.json?.code}`);
    // Step 2: the replacement is added as a Partner Administrator (existing
    // confirmed account mapped by the internal add-partner-user path).
    await internal.goto(`${PREVIEW}/internal/partner-users/new`);
    const replacementForm = await internal.evaluate(async ([slug, email]) => {
      const response = await fetch("/internal/partner-users/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ partnerSlug: slug, email, role: "partner_admin", name: "Replacement Admin Training" }) });
      return { status: response.status, text: (await response.text()).slice(0, 300) };
    }, [F.handoffPartnerSlug, who.REPLACEMENT_ADMIN.email]);
    const replacementRow = await one(`select role, status, partner_slug from public.partner_users where auth_user_id='${who.REPLACEMENT_ADMIN.id}'`);
    record("replacement_administrator_mapped_as_partner_admin", replacementRow?.role === "partner_admin" && replacementRow?.status === "active" && replacementRow?.partner_slug === F.handoffPartnerSlug, `invite route=${replacementForm.status}; membership ${replacementRow?.role}/${replacementRow?.status}`);
    const twoAdmins = await api(internal, `/api/internal/partners/first-admin/${F.handoffPartnerSlug}`, null, "GET");
    record("two_active_administrators_flagged_for_attention", twoAdmins.json?.access?.accessStatus === "access_needs_attention" && twoAdmins.json?.access?.administrators?.length === 2, `access=${twoAdmins.json?.access?.accessStatus}; administrators=${twoAdmins.json?.access?.administrators?.length}`);
    // Step 3: the replacement has signed in and can reach the console.
    const replacement = await open({ user: await sessionFor(who.REPLACEMENT_ADMIN.email, keys) });
    await replacement.goto(`${PREVIEW}/partner/clinic`);
    record("replacement_administrator_access_verified_before_handoff", !/sign-in/.test(replacement.url()) && (await replacement.locator("text=Clinic Mode").count()) > 0, `at ${new URL(replacement.url()).pathname}`);
    // Step 4: end the outgoing administrator's access, audited.
    await internal.goto(`${PREVIEW}/internal/partners/provisioning/${F.handoffPartnerSlug}`);
    await internal.waitForSelector("[data-administrator-handoff]");
    await screenshot(internal, "internal-administrator-handoff");
    const ended = await api(internal, `/api/internal/partners/first-admin/${F.handoffPartnerSlug}`, { action: "end_access", membershipId: soleAdmin?.membershipId, confirmEmail: who.FIRST_ADMIN.email });
    const outgoing = await one(`select status from public.partner_users where auth_user_id='${who.FIRST_ADMIN.id}'`);
    const auditRow = await one(`select count(*) as n from public.partner_events where partner_slug='${F.handoffPartnerSlug}' and event_type='partner_admin_membership_ended'`);
    record("outgoing_administrator_access_ended_and_audited", ended.status === 200 && ended.json?.ok === true && outgoing?.status === "disabled" && Number(auditRow?.n) === 1 && ended.json?.access?.accessStatus === "administrator_active", `end_access=${ended.status}; outgoing status=${outgoing?.status}; audit rows=${auditRow?.n}; access now=${ended.json?.access?.accessStatus}`);
    await invitee.goto(`${PREVIEW}/partner/clinic`);
    await invitee.waitForTimeout(1500);
    record("outgoing_administrator_loses_access_on_next_request", /sign-in/.test(invitee.url()) || (await invitee.locator("text=Clinic Mode").count()) === 0, `outgoing now at ${new URL(invitee.url()).pathname}`);
    await replacement.goto(`${PREVIEW}/partner/clinic`);
    record("replacement_keeps_access_after_handoff", !/sign-in/.test(replacement.url()) && (await replacement.locator("text=Clinic Mode").count()) > 0, `replacement at ${new URL(replacement.url()).pathname}`);
    const history = await one(`select count(*) as n from public.partner_events where partner_slug='${F.handoffPartnerSlug}'`);
    record("handoff_preserves_history", Number(history?.n) >= 3 && (await one(`select count(*) as n from auth.users where id='${who.FIRST_ADMIN.id}'`))?.n === "1", `partner_events rows=${history?.n}; outgoing account still exists`);

    // ------------------------------------------------------------------
    // 8. Regression: We Must Vote and Standard Clinic Mode are unchanged.
    // ------------------------------------------------------------------
    const anon = await open({});
    const wmv = await anon.goto(`${PREVIEW}/p/we-must-vote`);
    const wmvBody = await anon.innerText("body").catch(() => "");
    record("we_must_vote_landing_unchanged", wmv?.status() === 200 && /We Must Vote/i.test(wmvBody) && !/legal aid|MVLP/i.test(wmvBody), `HTTP ${wmv?.status()}; page names We Must Vote and nothing of Legal Aid`);
    await anon.goto(`${PREVIEW}/clinic/mississippi-volunteer-lawyers-demo`);
    record("standard_clinic_mode_event_code_entry_unchanged", (await anon.locator("text=Dedicated Clinic Mode").count()) === 1 && (await anon.locator("text=Register").count()) === 0, "standard event still asks for an event code");
    await anon.goto(`${PREVIEW}/clinic/${F.eventSlug}`);
    record("legal_aid_event_routes_to_registration", /\/register|sign-in/.test(anon.url()), `-> ${new URL(anon.url()).pathname}`);
    await anon.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications`);
    record("anonymous_staff_url_redirects_to_sign_in", anon.url().includes("/sign-in"), `-> ${new URL(anon.url()).pathname}`);

    // Desktop captures for the materials.
    const desktop = await open({ user: who.APPLICANT_B });
    await desktop.goto(`${PREVIEW}/p/${F.partnerSlug}/clinics`); await screenshot(desktop, "participant-clinics");
    await desktop.goto(`${PREVIEW}/clinic/${F.eventSlug}/intake`); await screenshot(desktop, "participant-intake-needs-information");
    const staffNarrow = await open({ user: who.COORDINATOR, viewport: { width: 390, height: 844 } });
    await staffNarrow.goto(`${PREVIEW}/clinic/staff/${F.eventId}/applications/${intakeA.id}`);
    await staffNarrow.waitForSelector("text=Application review");
    record("staff_review_has_no_horizontal_scroll_on_a_phone", await staffNarrow.evaluate(() => document.documentElement.scrollWidth <= 390), "390px");
    await screenshot(staffNarrow, "staff-review");

    // Nothing this phase wrote names a real person, a payment or Production.
    const wire = await one(`select count(*) as n from public.legal_aid_intakes i where i.event_id='${F.eventId}' and i.answers::text like '%${SSN}%'`);
    record("protected_value_absent_from_every_stored_answer_document", Number(wire?.n) === 0, "no answers document carries the protected value");
    writeEvidence(true);
    console.log(`LEGAL AID BROWSER PASSED — ${Object.keys(evidence.cases).length} cases on ${PREVIEW}; synthetic training records A/B/C left on the acceptance copy of MVLP; Production, Stripe and the worker untouched.`);
  } finally {
    for (const context of contexts) await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}

main().catch((error) => {
  writeEvidence(false, error);
  console.error(`LEGAL AID BROWSER FAILED — ${sanitize(error instanceof Error ? error.message : error)}`);
  process.exit(1);
});
