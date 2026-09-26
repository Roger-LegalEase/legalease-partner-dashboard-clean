import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { MISSISSIPPI_SYNTHETIC_ROUTE } from "./rcap-ms-nonconviction-synthetic-facts.mjs";
import { answerBuilderStep } from "./rcap-packet-builder-filler.mjs";
import { chromium } from "playwright";
import { hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";
import { currentClinicWorkerContext, clinicWorkerDockerArgs } from "./rcap-clinic-worker-context.mjs";

// Hosted browser proof for the sponsored RCAP lane only. It crosses the
// durable sponsored-generation boundary after explicit final verification.
// Clinic mode permits one target-first immutable worker cycle; no Stripe or Checkout.
//
// Required fixture/runtime contract:
// - an active `we-must-vote` partner_record (paid or demo_paid, qualified,
//   provisioned or active, target_state MS, access_mode open);
// - a `partner_entitlement` row for that slug;
// - a confirmed, enabled synthetic Supabase user matching the email/password;
// - one guidance-only consumer_briefcase_items row owned by that exact user,
//   with payment_allowed=false, payment_status=not_applicable, and a
//   source_session_id bound to a we-must-vote `flow_mode=rcap`,
//   `partner_benefit_active=true` screening session; pass its id as
//   RCAP_BROWSER_GUIDANCE_ITEM_ID;
// - acceptance Supabase public + service runtime configuration, with CAPTCHA
//   disabled or otherwise satisfied by the hosted test environment.
//
// Invocation (values are intentionally read from the environment and never
// printed): RCAP_BROWSER_BASE_URL, RCAP_BROWSER_EMAIL,
// RCAP_BROWSER_PASSWORD, RCAP_BROWSER_GUIDANCE_ITEM_ID, and
// RCAP_BROWSER_ALLOW_MUTATION=1. RCAP_BROWSER_CHROMIUM and
// RCAP_BROWSER_EVIDENCE_DIR are optional.

const baseUrl = requiredUrl("RCAP_BROWSER_BASE_URL");
const email = required("RCAP_BROWSER_EMAIL");
const password = required("RCAP_BROWSER_PASSWORD");
const guidanceItemId = process.env.RCAP_BROWSER_GUIDANCE_ITEM_ID?.trim()
  ? requiredUuid("RCAP_BROWSER_GUIDANCE_ITEM_ID")
  : null;
const partnerSlug = process.env.RCAP_BROWSER_PARTNER_SLUG?.trim() || "we-must-vote";
const clinicEventId = process.env.RCAP_BROWSER_CLINIC_EVENT_ID?.trim() || "";
const clinicEventSlug = process.env.RCAP_BROWSER_CLINIC_EVENT_SLUG?.trim() || "";
const clinicEventName = process.env.RCAP_BROWSER_CLINIC_EVENT_NAME?.trim() || "";
const clinicAccessCode = process.env.RCAP_BROWSER_CLINIC_ACCESS_CODE?.trim() || "";
const bypassSecret = process.env.RCAP_BROWSER_VERCEL_BYPASS_SECRET?.trim() || "";
const clinicMode = Boolean(clinicEventSlug);
const result = { schemaVersion: "rcap-sponsored-browser-result/v1", clinicMode, partnerSlug };
const evidenceDir = path.resolve(
  process.env.RCAP_BROWSER_EVIDENCE_DIR?.trim() ||
    path.join(process.cwd(), "hosted-acceptance-evidence", "rcap-commercial-flow")
);

if (process.env.RCAP_BROWSER_ALLOW_MUTATION !== "1") {
  fail("RCAP_BROWSER_ALLOW_MUTATION=1 is required because this proof claims one sponsored screening result into the synthetic user's Briefcase.");
}
if (clinicMode && (!validUuid(clinicEventId) || !clinicEventName || clinicAccessCode.length < 8)) {
  fail("Clinic mode requires an exact event id, slug, name, and 8+ character access code.");
}
fs.mkdirSync(evidenceDir, { recursive: true });
const environmentClassification = await verifyExactHostedPreview(baseUrl, bypassSecret);
result.environmentClassification = environmentClassification;

const failures = [];
// The Mississippi non-conviction packet re-checks these route facts before
// final verification (mississippiNonConvictionPacketSafety): a first-option
// or placeholder answer makes the review unsafe and hides the verify action
// (run 35120640545). These are the demo fixture's safe answers.
// Prompts the builder renders as free text although the profile validates them
// as dates (the packet specification carries no question type for them).
const browserErrors = [];
const generationRequests = [];
const stripeRequests = [];
let screeningSessionId = null;
let participantUserId = null;
let browser;

try {
  const launchOptions = { headless: true };
  const executablePath = process.env.RCAP_BROWSER_CHROMIUM?.trim();
  if (executablePath) launchOptions.executablePath = executablePath;
  browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light"
  });
  await attachBypass(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(`pageerror at ${safeRequestPath(page.url())}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console at ${safeRequestPath(page.url())}: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const detail = request.failure()?.errorText ?? "request failed";
    if (!/ERR_ABORTED/i.test(detail)) {
      browserErrors.push(`requestfailed: ${request.method()} ${safeRequestPath(request.url())} (${detail})`);
    }
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (/stripe\.com$/i.test(requestUrl.hostname) || /\/checkout(?:\/|$)|\/stripe(?:\/|$)/i.test(requestUrl.pathname)) {
      stripeRequests.push({ method: request.method(), origin: requestUrl.origin, path: requestUrl.pathname });
    }
    if (request.method() === "POST" && requestUrl.pathname === "/api/expungement-ai/packet/generate") {
      generationRequests.push({ method: request.method(), path: requestUrl.pathname });
    }
    if (request.method() === "POST" && requestUrl.pathname === "/api/expungement-ai/screening/pending") {
      const body = request.postDataJSON?.();
      if (validUuid(body?.anonymousSessionId)) screeningSessionId = body.anonymousSessionId;
    }
  });

  // 1. Enter either the bounded Clinic event or the canonical partner page.
  // Both paths create the sponsored screening session server-side; Clinic mode
  // additionally proves the event-code and participant-owned assistance chain.
  if (clinicMode) {
    const clinicEntry = new URL(`/clinic/${encodeURIComponent(clinicEventSlug)}`, baseUrl).href;
    const landingResponse = await page.goto(clinicEntry, { waitUntil: "networkidle" });
    check(landingResponse?.ok(), `Clinic entry returned ${landingResponse?.status() ?? "no response"}.`);
    await expectText(page, clinicEventName);
    await page.getByLabel("Event access code").fill(clinicAccessCode);
    await page.getByRole("button", { name: "Continue to participant consent", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/assist` || url.pathname === "/expungement-ai/sign-in");
    if (new URL(page.url()).pathname === "/expungement-ai/sign-in") {
      await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/clinic/${clinicEventSlug}/assist`)}`, baseUrl).href);
      const signedIn = await signIn(page, email, password);
      participantUserId = signedIn?.user?.id ?? signedIn?.id ?? null;
    }
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/assist`);
    await page.locator('select[name="eventStaffId"]').selectOption({ index: 1 });
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Start assisted nationwide screening", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/screening/ms`);
    await expectText(page, "Shared-device privacy is active");
    result.clinicEntry = clinicEntry;
  } else {
  // The canonical partner entry must remain on the acceptance origin. On
  // production the protected static launch remains unchanged; preview hosts
  // deliberately render the dynamic page whose CTA is relative.
  const partnerEntry = new URL(`/p/${encodeURIComponent(partnerSlug)}`, baseUrl).href;
  const landingResponse = await page.goto(partnerEntry, { waitUntil: "networkidle" });
  check(landingResponse?.ok(), `Partner entry returned ${landingResponse?.status() ?? "no response"}.`);
  await expectText(page, "We Must Vote");
  const entryCta = page.getByRole("link", { name: /Start Mississippi Record Review|Start My Free Screening/i }).first();
  check(await entryCta.isVisible(), "Partner entry CTA is not visible.");
  const entryHref = await entryCta.getAttribute("href");
  check(entryHref === `/intake/${partnerSlug}`, `Partner entry CTA must be same-origin /intake/${partnerSlug}; got ${entryHref ?? "missing href"}.`);
  await entryCta.click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === `/intake/${partnerSlug}`);

  // 2. Fresh-context account round trip. The auth response must leave the
  // browser and succeed, then the server-rendered intake must see the session.
  const signInLink = page.getByRole("link", { name: "Sign in to continue", exact: true });
  check(await signInLink.isVisible(), "Signed-out partner intake did not show Sign in to continue.");
  await signInLink.click();
  await page.waitForURL((url) => url.pathname === "/expungement-ai/sign-in" && url.searchParams.get("mode") === "signin");
  const signedIn = await signIn(page, email, password);
  participantUserId = signedIn?.user?.id ?? signedIn?.id ?? null;
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === `/intake/${partnerSlug}`);

  const authCookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(authCookies.length > 0, "Supabase session cookie was not written on the acceptance origin.");
  const startButton = page.getByRole("button", { name: /Start your record-clearing screening/i });
  check(await startButton.isVisible(), "Authenticated intake did not render the sponsored screening start control.");

  // 3. Start one sponsored screening and answer the deterministic Mississippi
  // non-conviction fixture. The engine remains authoritative for the result.
  await startButton.click();
  await page.waitForURL((url) => url.pathname === "/expungement-ai/screening/ms" && validUuid(url.searchParams.get("session")));
  }

  const authCookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(authCookies.length > 0, "Supabase session cookie was not written on the acceptance origin.");

  // 2. Answer the deterministic Mississippi non-conviction fixture.
  await answerChoice(page, "Are you asking about your own record?", "Yes");
  await answerChoice(page, "Did this case happen in Mississippi (not a federal case)?", "State or local");
  await answerChoice(page, "How did the case end?", "The case was dropped or thrown out");
  await answerChoice(page, "What kind of charge was it?", "Misdemeanor");
  await answerChoice(page, "Do any of these sound like your situation?", "Non-conviction expungement for dismissal, no disposition, or acquittal");
  // The engine orders the last two Mississippi questions itself and may
  // evaluate before both have been shown (run 35115205679 timed out waiting
  // for the timing question first; run 35115970406 hung because a swallowed
  // timeout never resolved once the result appeared). Answer whichever is
  // shown, stop as soon as the result heading is visible, and fail loudly
  // with the visible headings if neither appears within the budget.
  const resultHeading = page.getByRole("heading", { name: /path may be available|You may be able to prepare an expungement packet/i });
  const evaluationStatuses = [];
  page.on("response", (response) => {
    if (response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/evaluate") {
      evaluationStatuses.push(response.status());
    }
  });
  const remainingMississippi = new Map([
    ["About how long ago did this case end or get resolved?", "More than 10 years ago"],
    ["Have you completed everything the court ordered in this case?", "Yes"]
  ]);
  const answeredMississippi = [];
  while (remainingMississippi.size > 0) {
    const shown = await visibleScreeningPrompt(page, [...remainingMississippi.keys()], resultHeading);
    if (shown === null) break;
    const option = remainingMississippi.get(shown);
    remainingMississippi.delete(shown);
    answeredMississippi.push(shown);
    await answerChoice(page, shown, option);
  }
  result.mississippiFollowUpOrder = answeredMississippi;

  // The Mississippi clinic result heading reads "A Mississippi non-conviction
  // expungement path may be available." (run 35118996706 timed out on the
  // exact "A path may be available" form), so the heading is matched on its
  // shared phrase; a timeout reports what was visible instead of nothing.
  try {
    await resultHeading.waitFor({ state: "visible", timeout: 45_000 });
  } catch {
    const visible = await page.locator("h1, h2").allInnerTexts().catch(() => []);
    throw new Error(`Screening result heading did not appear after ${JSON.stringify(answeredMississippi)}; evaluation statuses ${JSON.stringify(evaluationStatuses)}; visible headings: ${JSON.stringify(visible)}`);
  }
  check(evaluationStatuses.length > 0 && evaluationStatuses[evaluationStatuses.length - 1] < 400, `Authoritative screening evaluation statuses were ${JSON.stringify(evaluationStatuses)}; the last must succeed before the result renders.`);
  await page.locator('[data-partner-context="saved"]').filter({
    hasText: /^Your partner program information is saved\. Packet coverage is confirmed before preparation\.$/
  }).waitFor({ state: "visible" });
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner result");
  await screenshotPair(page, "01-partner-covered-result");

  // 3. Persist and claim the server-re-evaluated pending result. Capture the
  // exact item id from the claim response instead of guessing from Briefcase.
  const pendingResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/screening/pending",
    { timeout: 20_000 }
  );
  const claimResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/screening/pending/claim",
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Save to my Briefcase and continue", exact: true }).click();
  const pendingResponse = await pendingResponsePromise;
  check(pendingResponse.ok(), `Partner pending-result write returned ${pendingResponse.status()}.`);
  const claimResponse = await claimResponsePromise;
  const claimed = await claimResponse.json().catch(() => null);
  check(claimResponse.ok(), `Partner pending-result claim returned ${claimResponse.status()}.`);
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && validUuid(exactBriefcaseItemId(url.pathname)));
  const packetItemId = exactBriefcaseItemId(new URL(page.url()).pathname);
  check(validUuid(packetItemId), "Partner pending-result claim did not land on an exact Briefcase item.");
  if (!validUuid(packetItemId)) throw new Error(failures.join("\n"));
  if (validUuid(claimed?.itemId)) check(claimed.itemId === packetItemId, "Partner claim response and exact matter URL disagree.");
  if (exactBriefcaseItemId(claimed?.redirectTo)) check(exactBriefcaseItemId(claimed.redirectTo) === packetItemId, "Partner claim redirect and exact matter URL disagree.");

  await page.getByText("MS", { exact: true }).first().waitFor({ state: "visible" });
  await expectText(page, "Non-conviction expungement for dismissal, no disposition, or acquittal");
  check(!(await page.getByText("We couldn't find that matter", { exact: true }).isVisible().catch(() => false)), "Saved partner matter was not visible to the authenticated user.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner-covered Briefcase matter");
  await screenshotPair(page, "02-partner-covered-briefcase-matter");

  // 4. Complete the sponsored packet-information builder. Saving the final
  // fact must reach review without starting generation.
  // The Briefcase labels a Mississippi clinic packet "Continue my Mississippi
  // clinic packet"; other partner-covered matters keep "Complete packet information".
  const builderLink = page.getByRole("link", { name: /^(?:Complete packet information|Continue my Mississippi clinic packet)$/ });
  check(await builderLink.isVisible(), "Partner-covered Mississippi matter did not expose the packet-information link.");
  const builderHref = await builderLink.getAttribute("href");
  const builderUrl = builderHref ? new URL(builderHref, baseUrl) : null;
  check(builderUrl?.origin === new URL(baseUrl).origin, "Packet-information CTA must stay on the current acceptance origin.");
  await builderLink.click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname.includes(`/briefcase/${packetItemId}/`) && url.pathname.endsWith("/packet-information"));
  await expectText(page, "Complete packet information");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner packet-information builder");
  await screenshotPair(page, "03-partner-covered-packet-builder");

  for (let step = 0; step < 80 && new URL(page.url()).pathname.endsWith("/packet-information"); step += 1) {
    await answerCurrentBuilderQuestion(page);
    const saveResponsePromise = packetInformationResponse(page, packetItemId);
    const finalButton = page.getByRole("button", { name: "Review packet facts", exact: true });
    if (await finalButton.isVisible().catch(() => false)) {
      await finalButton.click();
    } else {
      await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    }
    const saveResponse = await saveResponsePromise;
    check(saveResponse.ok(), `Partner packet-information save returned ${saveResponse.status()}.`);
    if (!saveResponse.ok()) break;
  }
  await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}/review`, { timeout: 20_000 });
  // The review page has an outer "We can’t review this matter yet" branch
  // whose heading also matches a partial "Review and confirm" text wait (runs
  // 35120640545 and 35122300936). Require the actual verification panel and
  // report the page's own branch diagnostics when it is absent.
  const verificationPanel = page.locator("[data-packet-verification-state]");
  const unavailableBranch = page.locator("[data-review-branch='unavailable']");
  await Promise.race([
    verificationPanel.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null),
    unavailableBranch.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null)
  ]);
  if (!(await verificationPanel.count())) {
    const branch = await unavailableBranch.evaluate((node) => Object.fromEntries(
      Array.from(node.attributes).filter((attribute) => attribute.name.startsWith("data-")).map((attribute) => [attribute.name, attribute.value])
    )).catch(() => null);
    const crumbs = await page.locator("nav").first().innerText().catch(() => "");
    await screenshotPair(page, "04-partner-review-unavailable");
    throw new Error(`The review page rendered its unavailable branch instead of the verification panel: ${JSON.stringify(branch)}; breadcrumb ${JSON.stringify(crumbs.replace(/\s+/g, " ").trim())}`);
  }
  await expectText(page, "Review and confirm");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner final verification");
  check((await page.getByRole("button", { name: "Generate my packet", exact: true }).count()) === 0, "Sponsored generation was available before explicit verification.");
  check(generationRequests.length === 0, "Sponsored generation was requested before explicit verification.");
  await screenshotPair(page, "04-partner-facts-before-verification");

  // 5. Verification uses the shared packet-information boundary. Only its
  // ready response may reveal the sponsored generation action.
  // The verify action renders only when the saved facts are complete and
  // route-safe; report the review panel instead of an unhandled timeout
  // (run 35120640545 crashed while the click waited on a missing button).
  const verifyButton = page.getByRole("button", { name: "Verify and prepare clinic packet", exact: true });
  try {
    await verifyButton.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    const panel = await page.locator("[data-packet-verification-state]").innerText().catch(() => "(no verification panel)");
    const reviewResult = await page.locator("main").innerText().then((text) => text.match(/Result[\s\S]{0,160}/)?.[0] ?? "").catch(() => "");
    throw new Error(`Verify action unavailable on the review page. Panel: ${JSON.stringify(panel)}. ${reviewResult}`);
  }
  const verificationResponsePromise = packetInformationResponse(page, packetItemId);
  const generationResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/packet/generate",
    { timeout: 30_000 }
  );
  await verifyButton.click();
  const verificationResponse = await verificationResponsePromise;
  check(verificationResponse.ok(), `Partner final verification returned ${verificationResponse.status()}.`);
  const generationResponse = await generationResponsePromise;
  const generationResponseBody = await generationResponse.json().catch(() => null);
  check(generationResponse.ok(), `Sponsored packet generation returned ${generationResponse.status()}.`);
  check(generationRequests.length === 1, `Expected one sponsored generation request after verification; saw ${generationRequests.length}.`);
  // The durable job must finish before the Briefcase can expose its artifact.
  // Reuse the payment harness's exact claim-order and worker-cycle contract.
  let clinicProof = null;
  if (clinicMode) {
    assert.equal(failures.length, 0, failures.join("\n"));
    const ports = await clinicDeliveryPorts({ packetItemId, participantUserId, screeningSessionId });
    clinicProof = await runClinicTargetCycle(ports, {
      packetItemId, participantUserId, screeningSessionId, clinicEventId,
      generatedItemId: generationResponseBody?.briefcaseItemId
    });
    result.naturalDelivery = clinicProof.evidence;
    clinicProof.ports = ports;
  }
  await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}`, { timeout: 20_000 });
  // Refresh only the existing matter view; this is not another generation or download.
  if (clinicMode) await page.reload({ waitUntil: "networkidle" });
  assertNoCommercialCopy(await page.locator("main").innerText(), "generated partner packet action");
  await screenshotPair(page, "05-partner-packet-generated");

  const download = page.getByRole("link", { name: /Download Mississippi non-conviction expungement packet/i });
  await download.waitFor({ state: "visible" });
  const downloadHref = await download.getAttribute("href");
  check(Boolean(downloadHref), "Generated packet has no private download link.");
  if (!downloadHref) throw new Error(failures.join("\n"));
  const downloadUrl = new URL(downloadHref, baseUrl);
  assert.equal(downloadUrl.origin, new URL(baseUrl).origin, "download must stay on the verified Preview");
  const downloadOnce = async () => {
    const response = await context.request.get(downloadUrl.href, { headers: bypassHeaders() });
    return { status: response.status(), contentType: response.headers()["content-type"] ?? "", bytes: await response.body() };
  };
  let firstBytes, firstHash, secondHash;
  if (clinicProof) {
    const delivery = await proveClinicFirstDelivery({
      ...clinicProof.ports, downloadOnce,
      generationCount: () => generationRequests.length
    }, clinicProof.target, clinicProof.evidence);
    firstBytes = delivery.firstBytes;
    firstHash = delivery.firstHash;
    secondHash = delivery.secondHash;
  } else {
    const firstDownload = await downloadOnce();
    firstBytes = firstDownload.bytes;
    firstHash = pdfSha(firstBytes);
    check(firstDownload.status === 200 && /^application\/pdf/i.test(firstDownload.contentType), `First private packet download returned ${firstDownload.status}.`);
    const secondDownload = await downloadOnce();
    secondHash = pdfSha(secondDownload.bytes);
    check(secondDownload.status === 200 && firstHash === secondHash, `Repeat packet download returned ${secondDownload.status} with stable bytes=${firstHash === secondHash}.`);
  }
  result.packetItemId = packetItemId;
  result.screeningSessionId = screeningSessionId;
  result.generationResponseBody = generationResponseBody;
  result.downloadPath = new URL(downloadHref, baseUrl).pathname;
  result.artifactSha256 = firstHash;
  result.artifactBytes = firstBytes.length;
  result.repeatDownloadSha256 = secondHash;

  if (clinicMode) {
    const negativeEmail = required("RCAP_BROWSER_NEGATIVE_EMAIL");
    const negativePassword = required("RCAP_BROWSER_NEGATIVE_PASSWORD");
    const negativeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await attachBypass(negativeContext);
    const negativePage = await negativeContext.newPage();
    await negativePage.goto(new URL("/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase", baseUrl).href);
    await signIn(negativePage, negativeEmail, negativePassword);
    await negativePage.waitForURL((url) => url.pathname === "/briefcase");
    const denied = await negativeContext.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    check(denied.status() === 404, `Participant B private artifact denial returned ${denied.status()} instead of indistinguishable 404.`);
    if (clinicProof) clinicProof.evidence.strangerStatus = denied.status();
    await negativeContext.close();
    const anonymousContext = await browser.newContext();
    await attachBypass(anonymousContext);
    const anonymous = await anonymousContext.request.get(downloadUrl.href, { headers: bypassHeaders() });
    assert.ok([401, 404].includes(anonymous.status()), `Anonymous artifact denial returned ${anonymous.status()}`);
    if (clinicProof) clinicProof.evidence.anonymousStatus = anonymous.status();
    await anonymousContext.close();

    const staffEmail = required("RCAP_BROWSER_STAFF_EMAIL");
    const staffPassword = required("RCAP_BROWSER_STAFF_PASSWORD");
    const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await attachBypass(staffContext);
    const staffPage = await staffContext.newPage();
    await staffPage.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/clinic/staff/${clinicEventId}/queue`)}`, baseUrl).href);
    await signIn(staffPage, staffEmail, staffPassword);
    await staffPage.waitForURL((url) => url.pathname === `/clinic/staff/${clinicEventId}/queue`);
    await expectText(staffPage, clinicEventName);
    const participantSuffix = typeof participantUserId === "string" ? participantUserId.slice(-8) : "";
    check(participantSuffix.length === 8, "Participant A auth identity was not captured for the event-scoped staff proof.");
    const participantStatus = staffPage.getByLabel(`Packet status for participant ending ${participantSuffix}`);
    await participantStatus.waitFor({ state: "visible" });
    const staffCaseIsPacketReady = await participantStatus.inputValue() === "packet_ready";
    check(staffCaseIsPacketReady, "Event staff did not see Participant A's newly prepared packet case.");
    await expectText(staffPage, "Packet prepared");
    result.staffView = `/clinic/staff/${clinicEventId}/queue`;
    result.staffParticipantReference = `…${participantSuffix}`;
    await staffContext.close();

    await page.evaluate(async () => {
      localStorage.setItem("rcap-reset-proof", "participant-a");
      sessionStorage.setItem("rcap-reset-proof", "participant-a");
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("rcap-reset-proof", 1);
        request.onsuccess = () => { request.result.close(); resolve(null); };
        request.onerror = () => reject(request.error);
      });
      await caches.open("rcap-reset-proof");
    });
    const resetResponsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/clinic/session/reset"
    );
    await page.getByRole("button", { name: "End clinic session / Reset device", exact: true }).click();
    const resetResponse = await resetResponsePromise;
    const resetBody = await resetResponse.json().catch(() => null);
    check(resetResponse.status() === 200, "Clinic reset endpoint did not return 200.");
    check(resetBody?.signOutConfirmed === true, "Clinic reset did not confirm server-side participant sign-out.");
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}`);
    const participantCookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-"));
    check(participantCookies.length === 0, `Clinic reset retained ${participantCookies.length} participant cookie(s).`);
    const storageState = await page.evaluate(async () => ({
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      indexedDB: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : -1,
      cacheStorage: (await caches.keys()).length,
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length
    }));
    check(Object.values(storageState).every((count) => count === 0), `Clinic reset retained browser storage: ${JSON.stringify(storageState)}.`);
    const revokedDownload = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    check([401, 404].includes(revokedDownload.status()), `Clinic reset left Participant A's private download usable (${revokedDownload.status()}).`);
    const cleanEntryPath = `/clinic/${clinicEventSlug}`;
    await page.evaluate((path) => {
      history.replaceState({ resetProof: "back" }, "", path);
      history.pushState({ resetProof: "forward" }, "", path);
    }, cleanEntryPath);
    await page.goBack({ waitUntil: "domcontentloaded" });
    check((await page.evaluate(() => history.state?.resetProof)) === "back", "Browser Back did not traverse the clean reset history entry.");
    check(new URL(page.url()).pathname === cleanEntryPath, `Browser Back restored participant state at ${new URL(page.url()).pathname}.`);
    await page.goForward({ waitUntil: "domcontentloaded" });
    check((await page.evaluate(() => history.state?.resetProof)) === "forward", "Browser Forward did not traverse the clean reset history entry.");
    check(new URL(page.url()).pathname === cleanEntryPath, `Browser Forward restored participant state at ${new URL(page.url()).pathname}.`);
    const historyTraversal = [];
    for (const direction of ["back", "back", "back", "forward", "forward", "forward"]) {
      if (direction === "back") await page.goBack({ waitUntil: "domcontentloaded" });
      else await page.goForward({ waitUntil: "domcontentloaded" });
      const observedPath = new URL(page.url()).pathname;
      const participantContentVisible = (await page.locator("body").innerText()).includes(packetItemId);
      historyTraversal.push({ direction, observedPath, participantContentVisible });
      check(observedPath === cleanEntryPath && !participantContentVisible,
        `Browser ${direction} traversal restored participant state at ${observedPath}.`);
    }

    await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/briefcase/${packetItemId}`)}`, baseUrl).href);
    await signIn(page, negativeEmail, negativePassword);
    await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}` || url.pathname === "/briefcase");
    const sameDeviceDenied = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    const sameDeviceParticipantBDenial = sameDeviceDenied.status() === 404;
    check(sameDeviceParticipantBDenial, `Participant B on the reset device received ${sameDeviceDenied.status()} instead of indistinguishable 404 for Participant A's artifact.`);
    result.participantBDenied = denied.status() === 404;
    result.staffViewPassed = participantSuffix.length === 8 && staffCaseIsPacketReady;
    result.deviceResetPassed = resetBody?.signOutConfirmed === true
      && participantCookies.length === 0
      && Object.values(storageState).every((count) => count === 0)
      && [401, 404].includes(revokedDownload.status())
      && sameDeviceParticipantBDenial;
    result.deviceReset = { storageState, revokedDownloadStatus: revokedDownload.status(), historyTraversal, sameDeviceParticipantBDenial };
  }

  // 6. The legacy sponsored harness also keeps its guidance-only negative
  // guidance value has no disabled packet stepper or consumer payment copy.
  if (guidanceItemId) {
  await page.goto(new URL(`/briefcase/${guidanceItemId}`, baseUrl).href, { waitUntil: "networkidle" });
  await expectText(page, "Next steps saved");
  await expectText(page, "Next steps");
  check(!(await page.getByText("We couldn't find that matter", { exact: true }).isVisible().catch(() => false)), "Seeded guidance-only matter is not owned by the signed-in synthetic user.");
  check((await page.locator("main").getByText("Payment", { exact: true }).count()) === 0, "Guidance-only matter renders a Payment step.");
  check((await page.getByRole("link", { name: /checkout|pay \$50|continue to payment/i }).count()) === 0, "Guidance-only matter renders a payment action.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "guidance-only matter");
  await screenshotPair(page, "06-guidance-only-matter");
  }

  if (browserErrors.length > 0) {
    failures.push(...browserErrors);
  }
  check(stripeRequests.length === 0, `Clinic journey observed ${stripeRequests.length} Stripe or Checkout request(s).`);
  if (result.naturalDelivery) {
    result.naturalDelivery.stripeRequests = stripeRequests.length;
    result.naturalDelivery.checkoutRequests = stripeRequests.filter(r => /checkout/i.test(r.path)).length;
    result.naturalDelivery.productionMutation = false;
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
  if (result.naturalDelivery) writeClinicReceipt("complete", result.naturalDelivery);

  console.log("RCAP commercial browser proof passed.");
  console.log(`Partner start: ${new URL(`/p/${partnerSlug}`, baseUrl).href}`);
  console.log(`Packet-covered item: ${packetItemId}`);
  if (guidanceItemId) console.log(`Guidance item: ${guidanceItemId}`);
  console.log(`Evidence directory: ${evidenceDir}`);
  result.passed = true;
  result.productionTouched = environmentClassification.previewVerified ? false : null;
  result.stripeTouched = environmentClassification.stripeConfigured === false && stripeRequests.length === 0 ? false : null;
  result.stripeEvidence = { deploymentConfigured: environmentClassification.stripeConfigured, browserRequests: stripeRequests };
  fs.writeFileSync(path.join(evidenceDir, "sponsored-browser-result.json"), `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  result.passed = false;
  result.failure = error instanceof Error ? error.message : String(error);
  result.productionTouched = environmentClassification.previewVerified ? false : null;
  result.stripeTouched = environmentClassification.stripeConfigured === false && stripeRequests.length === 0 ? false : null;
  result.stripeEvidence = { deploymentConfigured: environmentClassification.stripeConfigured, browserRequests: stripeRequests };
  fs.writeFileSync(path.join(evidenceDir, "sponsored-browser-result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.error("RCAP commercial browser proof failed.");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
}

// A screening question heading may carry the "Optional" badge inside the
// heading element (run 35118102472 saw "…court ordered in this case?OPTIONAL"),
// so the accessible name is matched from its start rather than exactly.
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
    ? page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/evaluate",
      { timeout: 20_000 }
    )
    : null;
  await page.getByRole("button", { name: /Continue/i }).click();
  if (evaluationResponsePromise) {
    const evaluationResponse = await evaluationResponsePromise;
    check(evaluationResponse.ok(), `Authoritative screening evaluation returned ${evaluationResponse.status()}.`);
  }
}

/**
 * Answer whatever the builder is showing, through the shared filler.
 *
 * This was a third copy of the filling logic, keyed on one `<h1>` per screen
 * and one control beneath it. The builder now renders one packet-information
 * section per screen, several questions under one heading, so that shape no
 * longer describes the page. The shared filler answers every unanswered
 * control on the screen by field identity, and it holds the one answer map, so
 * the copies cannot drift apart again.
 *
 * A prefilled value is the participant's own screening answer projected into
 * the packet (run 35122300936 overwrote case_outcome and failed the public
 * validator). The shared filler never overwrites one.
 */
async function answerCurrentBuilderQuestion(page) {
  await answerBuilderStep(page, { routeKey: MISSISSIPPI_SYNTHETIC_ROUTE });
}

function packetInformationResponse(page, itemId) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST"
      && new URL(response.url()).pathname === `/api/expungement-ai/briefcase/${itemId}/packet-information`,
    { timeout: 20_000 }
  );
}


async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
}

async function signIn(page, accountEmail, accountPassword) {
  await page.locator('input[name="email"]').fill(accountEmail);
  await page.locator('input[name="password"]').fill(accountPassword);
  const authResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"),
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authResponse = await authResponsePromise;
  check(authResponse.ok(), `Supabase password sign-in returned ${authResponse.status()}.`);
  return authResponse.json().catch(() => null);
}

async function attachBypass(context) {
  if (!bypassSecret) return;
  await context.route(`${baseUrl}/**`, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), ...bypassHeaders() } });
  });
}

function bypassHeaders() {
  return bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {};
}

async function screenshotPair(page, stem) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

function assertNoCommercialCopy(text, surface) {
  for (const pattern of [/\$50/i, /stripe/i, /checkout/i, /pay \$?50/i, /continue to payment/i, /before payment/i, /payment confirmed/i]) {
    check(!pattern.test(text), `${surface} leaked consumer commercial copy (${pattern}).`);
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function requiredUrl(name) {
  const value = required(name);
  try {
    return new URL(value).origin;
  } catch {
    fail(`${name} must be an absolute URL.`);
  }
}

function requiredUuid(name) {
  const value = required(name);
  if (!validUuid(value)) fail(`${name} must be a UUID.`);
  return value;
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function exactBriefcaseItemId(value) {
  if (typeof value !== "string") return null;
  // The atomic claim lands on /briefcase/matters/<id> (matter-path.ts); the
  // packet-information, review and generated-packet pages stay on /briefcase/<id>.
  const match = value.match(/^\/briefcase\/(?:matters\/)?([0-9a-f-]{36})(?:[?#]|$)/i);
  return validUuid(match?.[1]) ? match[1] : null;
}

async function verifyExactHostedPreview(origin, bypass) {
  const url = new URL(origin);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" && host !== "127.0.0.1" && host !== "localhost") {
    fail("RCAP_BROWSER_BASE_URL must use HTTPS outside localhost.");
  }
  if (host === "127.0.0.1" || host === "localhost" || host.endsWith(".trycloudflare.com") || host.endsWith(".github.dev") || host.endsWith(".test")) {
    return { previewVerified: false, localAcceptanceOrigin: true, stripeConfigured: null };
  }
  if (!host.endsWith(".vercel.app") || !bypass) {
    fail("Hosted browser mutation requires an exact protected Vercel Preview identity.");
  }

  const token = required("RCAP_BROWSER_VERCEL_TOKEN");
  const deploymentId = required("RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID");
  const applicationSha = required("RCAP_BROWSER_APPLICATION_SHA");
  const workerSourceSha = required("RCAP_BROWSER_WORKER_SOURCE_SHA");
  const workerDigest = required("RCAP_BROWSER_WORKER_DIGEST");
  const projectRef = required("RCAP_BROWSER_ACCEPTANCE_PROJECT_REF");
  const expectedScopeSha256 = clinicMode ? required("RCAP_BROWSER_EXPECTED_SCOPE_SHA256") : null;
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId) || !/^[0-9a-f]{40}$/.test(applicationSha)
    || !/^[0-9a-f]{40}$/.test(workerSourceSha) || !/^sha256:[0-9a-f]{64}$/.test(workerDigest)) {
    fail("Hosted browser mutation requires an exact deployment id, application SHA, worker source and immutable digest.");
  }
  if (clinicMode && projectRef !== "hyflxnlhpmiqxvvcoiia") {
    fail("Clinic browser mutation is restricted to the pinned acceptance Supabase project.");
  }

  const identity = await resolveHostedVercelIdentity({ token });
  const api = async (route) => {
    const response = await fetch(hostedVercelScopedUrl(route, identity), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) fail(`Vercel identity check failed for ${route} with HTTP ${response.status}.`);
    return response.json();
  };
  const deployment = await api(`/v13/deployments/${encodeURIComponent(deploymentId)}`);
  const meta = deployment.meta ?? {};
  const alias = await api(`/v13/deployments/${encodeURIComponent(host)}`);
  const aliases = await api(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`);
  const productionAliases = (aliases.aliases ?? []).filter((entry) => entry.target === "production" || entry.deployment?.target === "production");
  const exact = (deployment.id ?? deployment.uid) === deploymentId
    && (alias.id ?? alias.uid) === deploymentId
    && (deployment.readyState ?? deployment.status) === "READY"
    && (deployment.target === null || deployment.target === "preview")
    && deployment.projectId === identity.projectId
    && deployment.gitSource?.sha === applicationSha
    && meta.rcapWorkerSourceSha === workerSourceSha
    && meta.rcapWorkerDigest === workerDigest
    && meta.rcapApplicationSha === applicationSha
    && meta.rcapAcceptanceProjectRef === projectRef
    && meta.rcapRouteState === "staging_scoped"
    && (!clinicMode || meta.rcapClinicDemoMode === "mississippi_preview")
    && (!clinicMode || meta.rcapStagingScopeSha256 === expectedScopeSha256)
    && (!clinicMode || meta.rcapStripeConfigured === "false")
    && productionAliases.length === 0;
  if (!exact) fail("Hosted browser mutation refused: Vercel did not confirm the exact READY nonproduction Clinic Preview, scope hash, no-Stripe posture, and acceptance project metadata.");
  return {
    previewVerified: true,
    deploymentId,
    hostname: host,
    applicationSha,
    workerSourceSha,
    workerDigest,
    acceptanceProjectRef: projectRef,
    routeState: meta.rcapRouteState,
    clinicDemoMode: meta.rcapClinicDemoMode,
    stagingScopeSha256: meta.rcapStagingScopeSha256,
    stripeConfigured: meta.rcapStripeConfigured === "true",
    productionAliasCount: productionAliases.length
  };
}

function safeRequestPath(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unparseable request URL";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// These two controllers are also executed with fault-injected ports by the
// existing Clinic contract verifier. Every write is either the ONE canonical
// worker cycle or an actual browser request. Database probes are SELECT only.
function pdfSha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function runClinicTargetCycle(ports, fixture) {
  const rows = await ports.targetJobs();
  assert.equal(rows.length, 1, "Clinic fixture must enqueue exactly one target job");
  const target = rows[0];
  assert.equal(fixture.generatedItemId, fixture.packetItemId, "generation response must name the fresh fixture item");
  assert.equal(target.sponsored_consumer_briefcase_item_id, fixture.packetItemId);
  assert.equal(target.briefcase_item_id, fixture.packetItemId);
  assert.equal(target.sponsored_consumer_auth_user_id, fixture.participantUserId);
  assert.equal(target.sponsored_session_id, fixture.screeningSessionId);
  assert.equal(target.sponsored_clinic_event_id, fixture.clinicEventId);
  assert.equal(target.route_id, "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal");
  assert.equal(target.sponsored_route_key, target.route_id);
  assert.equal(target.sponsored_verification_hash, target.current_verification_hash);
  assert.match(target.sponsored_verification_hash ?? "", /^[a-f0-9]{64}$/);
  assert.ok(target.matter_id && target.partner_id);
  assert.equal(target.renderer_kind, "packet_document_v1", "accepted worker must support the target renderer");
  assert.equal(target.status, "queued");
  assert.equal(target.attempt_count, 0, "fresh fixture cannot reuse a processed job");
  const accountingBefore = await ports.accounting();
  const claimOrder = await ports.readClaimOrder(target.id, target.renderer_kind);
  assert.equal(claimOrder.readOutcome, "read");
  assert.equal(claimOrder.targetIsClaimable, true);
  assert.equal(claimOrder.predictedFirstClaim, target.id, "historical predecessor blocks this proof");
  assert.equal(claimOrder.targetClaimRank, 1);
  assert.equal(claimOrder.claimablePredecessors, 0);
  await ports.requireNoHistoricalHousekeeping(target.id);
  const evidence = {
    participantId: fixture.participantUserId, briefcaseItemId: fixture.packetItemId,
    screeningSessionId: fixture.screeningSessionId, targetRenderJobId: target.id,
    verificationHash: target.sponsored_verification_hash, matterId: target.matter_id,
    route: target.route_id, rendererKind: target.renderer_kind,
    workerDigest: ports.workerDigest, preview: ports.preview,
    claimOrder, targetBefore: target, accountingBeforeWorker: accountingBefore,
    completionObservedBeforeRepeatDownload: false, receiptRepairPerformed: false
  };
  await ports.receipt("before-worker", evidence);
  const cycle = await ports.runOneCycle(target.id);
  await ports.receipt("worker-result", { ...evidence, cycle });
  assert.equal(cycle.exitCode, 0, `worker failed: ${JSON.stringify(cycle.cycleResult)}`);
  assert.equal(cycle.cycleResult?.jobId, target.id, "worker stdout must identify the target");
  assert.equal(cycle.cycleResult?.outcome, "finalized", `target failure: ${JSON.stringify(cycle.cycleResult)}`);
  assert.deepEqual(Array.from(cycle.rowsThatMoved ?? []).sort(), [target.id], "worker must not mutate historical jobs");
  const finalRows = await ports.targetJobs();
  assert.equal(finalRows.length, 1);
  const finalized = finalRows[0];
  for (const key of ["id", "matter_id", "route_id", "sponsored_verification_hash", "sponsored_consumer_auth_user_id", "sponsored_consumer_briefcase_item_id", "sponsored_session_id", "sponsored_clinic_event_id"]) {
    assert.equal(finalized[key], target[key], `worker changed ${key}`);
  }
  assert.equal(finalized.status, "artifact_validated", "first download must begin before delivered");
  assert.equal(finalized.delivery_eligibility, "eligible");
  assert.equal(finalized.container_digest, ports.workerDigest);
  assert.match(finalized.output_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.ok(finalized.output_storage_path?.includes(target.id));
  assert.ok(finalized.output_storage_path?.includes(finalized.output_sha256));
  assert.ok(Number(finalized.output_byte_count) > 0);
  evidence.workerCycle = cycle;
  evidence.finalizedSha256 = finalized.output_sha256;
  evidence.finalizedBytes = Number(finalized.output_byte_count);
  evidence.storagePath = finalized.output_storage_path;
  evidence.accountingAfterWorker = await ports.accounting();
  await ports.receipt("artifact-ready", evidence);
  return { target: finalized, evidence };
}

async function proveClinicFirstDelivery(ports, target, evidence) {
  const before = await ports.deliveryState(target.id);
  assert.equal(before.job.id, target.id);
  assert.equal(before.job.status, "artifact_validated");
  assert.equal(before.job.delivered_at, null);
  assert.deepEqual(before.events, [], "fresh target must have no prior delivery requests");
  evidence.preDownload = before;
  evidence.sponsorshipBeforeDownload = await ports.accounting();
  await ports.receipt("before-first-owner", evidence);
  const first = await ports.downloadOnce();
  const firstBytes = first.bytes;
  const firstHash = pdfSha(firstBytes);
  Object.assign(evidence, { ownerHttpStatus: first.status, ownerByteCount: firstBytes.length,
    ownerSha256: firstHash, firstResponseConsumedAt: new Date().toISOString() });
  await ports.receipt("first-owner-response", evidence);
  assert.equal(first.status, 200);
  assert.match(first.contentType, /^application\/pdf/i);
  assert.ok(firstBytes.length > 0);
  assert.equal(firstBytes.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.equal(firstBytes.length, Number(target.output_byte_count));
  assert.equal(firstHash, target.output_sha256, "first owner bytes must match finalized artifact");
  let state;
  // Same bounded read-only completion wait already used by post-payment proof.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    state = await ports.deliveryState(target.id);
    if (state.events.some(e => ["transmission_failed", "transmission_aborted"].includes(e.event_type))) break;
    if (state.job.status === "delivered" && state.events.some(e => e.event_type === "transmission_completed")) break;
    await ports.sleep(500);
  }
  evidence.firstRequestReadback = state;
  await ports.receipt("first-owner-readback", evidence);
  assert.equal(state.job.id, target.id);
  assert.equal(state.job.status, "delivered", "first request must complete naturally before repeat");
  assert.ok(Number.isFinite(Date.parse(state.job.delivered_at)));
  assert.equal(state.job.output_sha256, target.output_sha256);
  assert.equal(state.job.output_storage_path, target.output_storage_path);
  assert.deepEqual(state.events.map(e => e.event_type), ["delivery_authorized", "transmission_started", "transmission_completed"]);
  const eventTimes = state.events.map(e => Date.parse(e.created_at));
  assert.ok(eventTimes.every(Number.isFinite));
  assert.ok(eventTimes.every((time, i) => i === 0 || time >= eventTimes[i - 1]));
  const actualJob = await ports.getRenderJob(target.id);
  assert.equal(actualJob?.id, target.id);
  assert.equal(actualJob.status, "delivered");
  assert.equal(actualJob.outputSha256, target.output_sha256);
  assert.equal(actualJob.outputStoragePath, target.output_storage_path);
  Object.assign(evidence, { deliveryEvents: state.events, delivered_at: state.job.delivered_at,
    getRenderJob: actualJob, completionObservedBeforeRepeatDownload: true });
  await ports.receipt("completion-before-repeat", evidence);
  // This is deliberately unreachable on any missing/failed first receipt.
  const second = await ports.downloadOnce();
  const secondHash = pdfSha(second.bytes);
  assert.equal(second.status, 200);
  assert.equal(secondHash, firstHash, "repeat owner bytes must remain identical");
  evidence.repeatDownloadSha256 = secondHash;
  evidence.sponsorshipAfterRepeat = await ports.accounting();
  assert.deepEqual(evidence.sponsorshipAfterRepeat, evidence.sponsorshipBeforeDownload, "repeat must not consume sponsorship again");
  assert.equal(ports.generationCount(), 1, "repeat must not generate another packet");
  await ports.receipt("repeat-owner-response", evidence);
  return { firstBytes, firstHash, secondHash };
}

function writeClinicReceipt(name, value) {
  fs.writeFileSync(path.join(evidenceDir, `natural-delivery-${name}.json`), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

async function clinicDeliveryPorts({ packetItemId, participantUserId, screeningSessionId }) {
  assert.equal(environmentClassification.previewVerified, true);
  // The provider-verified object is the release identity; supplied inputs must
  // still match it before any credential read or worker operation.
  for (const [field, name] of Object.entries({
    deploymentId: "RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID",
    applicationSha: "RCAP_BROWSER_APPLICATION_SHA",
    workerSourceSha: "RCAP_BROWSER_WORKER_SOURCE_SHA",
    workerDigest: "RCAP_BROWSER_WORKER_DIGEST",
    acceptanceProjectRef: "RCAP_BROWSER_ACCEPTANCE_PROJECT_REF"
  })) assert.equal(environmentClassification[field], required(name));
  assert.equal(environmentClassification.hostname, new URL(baseUrl).hostname.toLowerCase());
  assert.equal(environmentClassification.clinicDemoMode, "mississippi_preview");
  assert.equal(environmentClassification.routeState, "staging_scoped");
  assert.equal(environmentClassification.stripeConfigured, false);
  for (const id of [packetItemId, participantUserId, screeningSessionId, clinicEventId]) assert.ok(validUuid(id));
  const project = environmentClassification.acceptanceProjectRef;
  assert.equal(project, "hyflxnlhpmiqxvvcoiia");
  const workerSource = environmentClassification.workerSourceSha;
  const workerDigest = environmentClassification.workerDigest;
  const image = `ghcr.io/roger-legalease/rcap-render-worker@${workerDigest}`;
  const workerRuntime = currentClinicWorkerContext({ preview: environmentClassification,
    participantUserId, partnerSlug, eventId: clinicEventId, eventName: clinicEventName });
  writeClinicReceipt("worker-runtime-context", workerRuntime);
  const managementToken = required("SUPABASE_ACCESS_TOKEN");
  const supabaseUrl = `https://${project}.supabase.co`;
  const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${project}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${managementToken}` } });
  assert.ok(keyResponse.ok, "acceptance service credential read failed");
  const service = (await keyResponse.json()).find(k => k.name === "service_role")?.api_key;
  assert.ok(service);
  const claims = JSON.parse(Buffer.from(service.split(".")[1], "base64url"));
  assert.equal(claims.ref, project); assert.equal(claims.role, "service_role");
  const sql = async query => {
    assert.match(query.trim(), /^(select|with)\s/i, "Clinic harness database calls must be read-only");
    const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: "POST", headers: { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ query })
    });
    const json = await response.json();
    assert.ok(response.ok && Array.isArray(json), `Clinic readback failed: HTTP ${response.status}`);
    return { ok: true, status: response.status, json };
  };
  const targetJobs = async () => (await sql(`
    select j.id,j.route_id,j.renderer_kind,j.status,j.attempt_count,j.max_attempts,j.matter_id,j.partner_id,
      j.briefcase_item_id,j.sponsored_route_key,j.sponsored_session_id,j.sponsored_clinic_event_id,
      j.sponsored_consumer_briefcase_item_id,j.sponsored_consumer_auth_user_id,j.sponsored_verification_hash,
      j.output_sha256,j.output_storage_path,j.output_byte_count,j.container_digest,j.delivery_eligibility,
      v.verification_hash as current_verification_hash
    from public.packet_render_jobs j left join public.consumer_packet_verifications v
      on v.briefcase_item_id=j.sponsored_consumer_briefcase_item_id and v.consumer_auth_user_id=j.sponsored_consumer_auth_user_id and v.status='verified'
    where j.briefcase_item_id='${packetItemId}' or j.sponsored_consumer_briefcase_item_id='${packetItemId}'
    order by j.created_at,j.id
  `)).json;
  const accounting = async () => (await sql(`select jsonb_build_object(
    'entitlement',(select to_jsonb(e) from public.partner_entitlement e where e.partner_slug='${partnerSlug.replaceAll("'", "''")}'),
    'generationEvents',(select coalesce(jsonb_agg(to_jsonb(a) order by a.occurred_at,a.id),'[]'::jsonb) from public.rcap_screening_analytics_events a where a.session_id='${screeningSessionId}' and a.event_type='packet_generated'),
    'jobs',(select coalesce(jsonb_agg(j.id order by j.id),'[]'::jsonb) from public.packet_render_jobs j where j.sponsored_consumer_briefcase_item_id='${packetItemId}')
  ) as accounting`)).json[0].accounting;
  const paymentSource = fs.readFileSync("scripts/rcap-hosted-acceptance-payment.mjs", "utf8");
  const ast = ts.createSourceFile("payment.mjs", paymentSource, ts.ScriptTarget.Latest, true);
  const names = ["TERMINAL_SUCCESS", "WORKER_CLAIM_SECONDS", "CLAIM_STATE_FIELDS", "jobRowOrNull", "readJob", "claimablePredicate", "readClaimOrder", "claimStateSnapshot", "rowsThatChanged", "parseCycleResult", "classifyCycle", "cycleBoundary", "claimedTupleFor", "runOneCycle"];
  const declarations = names.map(name => {
    const matches = [];
    const visit = node => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node.getText(ast));
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === name)) matches.push(node.getText(ast));
      ts.forEachChild(node, visit);
    };
    visit(ast); assert.equal(matches.length, 1, `one canonical declaration required: ${name}`);
    return matches[0];
  }).join("\n");
  const diagnostics = { cycles: [] };
  const redact = value => [service, managementToken, bypassSecret].reduce((text, secret) => secret ? text.split(secret).join("[REDACTED]") : text, String(value ?? ""))
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "[REDACTED]")
    .replace(/sk_(test|live)_[A-Za-z0-9]{10,}/g, "[REDACTED]")
    .replace(/whsec_[A-Za-z0-9]{10,}/g, "[REDACTED]");
  const context = vm.createContext({ crypto, fs, path, Buffer, console, Date, sql,
    sqlText: value => String(value).replaceAll("'", "''"), redact, redactSecrets: redact,
    diagnostics, itemId: packetItemId, targetJobId: null, EVIDENCE_DIR: evidenceDir,
    containerName: `rcap-clinic-${packetItemId}`, service, SUPABASE_URL: supabaseUrl,
    WORKER_PARTNER_DATA_FLAG: "true", WORKER_DIGEST_REF: image,
    spawnSync(command, args, options) {
      assert.equal(command, "docker"); assert.ok(args.includes(image)); assert.equal(args.at(-1), "--once");
      // Same invocation and credential, transported via environment rather than argv.
      const scopedArgs = clinicWorkerDockerArgs(args, image, workerRuntime);
      return spawnSync(command, scopedArgs.map(arg => arg.startsWith("SUPABASE_SERVICE_ROLE_KEY=") ? "SUPABASE_SERVICE_ROLE_KEY" : arg), {
        ...options, env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: service }
      });
    }
  });
  vm.runInContext(declarations, context);
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = service;
  register("./lib/ts-esm-loader.mjs", import.meta.url);
  const { getRenderJob } = await import("../src/lib/rcap/render/job-queue.ts");
  return {
    workerDigest, preview: environmentClassification, targetJobs, accounting, getRenderJob,
    receipt: writeClinicReceipt, sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    readClaimOrder: (id, kind) => context.readClaimOrder(id, kind),
    async requireNoHistoricalHousekeeping(targetId) {
      const rows = (await sql(`select id from public.packet_render_jobs where id<>'${targetId}' and (
        (status='queued' and attempt_count>=max_attempts)
        or (status in ('claimed','rendering','validating') and claim_expires_at<now())
        or (status='failed' and failure_disposition='retryable'))`)).json;
      assert.equal(rows.length, 0, "historical housekeeping would occur; do not run the worker");
    },
    async runOneCycle(id) {
      assert.equal(diagnostics.cycles.length, 0, "exactly one Clinic worker cycle");
      context.targetJobId = id;
      await context.runOneCycle(1, id, { targetCycles: 0, backlogCycles: 0, noJobCycles: 0, unprovenCycles: 0, backlogJobsClaimed: [] });
      assert.equal(diagnostics.cycles.length, 1);
      return JSON.parse(JSON.stringify(diagnostics.cycles[0]));
    },
    async deliveryState(id) {
      assert.ok(validUuid(id));
      const rows = (await sql(`select jsonb_build_object(
        'job',(select jsonb_build_object('id',id,'status',status,'delivered_at',delivered_at,'output_sha256',output_sha256,'output_storage_path',output_storage_path) from public.packet_render_jobs where id='${id}'),
        'events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'event_type',event_type,'created_at',created_at) order by created_at,id),'[]'::jsonb) from public.packet_delivery_events where render_job_id='${id}')
      ) as state`)).json;
      assert.equal(rows.length, 1); return rows[0].state;
    }
  };
}
