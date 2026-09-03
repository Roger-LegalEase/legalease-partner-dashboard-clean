import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";

// Hosted browser proof for the sponsored RCAP lane only. It crosses the
// synchronous sponsored-generation boundary after explicit final verification;
// it never calls Stripe, creates a consumer checkout, or runs a worker.
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
  await answerChoice(page, "About how long ago did this case end or get resolved?", "More than 10 years ago");
  await answerChoice(page, "Have you completed everything the court ordered in this case?", "Yes", true);

  await page.getByRole("heading", { name: /A path may be available|You may be able to prepare an expungement packet/i }).waitFor({ state: "visible" });
  await expectText(page, "Your packet is covered by your partner program.");
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
  const builderLink = page.getByRole("link", { name: "Complete packet information", exact: true });
  check(await builderLink.isVisible(), "Partner-covered Mississippi matter did not expose Complete packet information.");
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
  await expectText(page, "Final verification");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner final verification");
  check((await page.getByRole("button", { name: "Generate my packet", exact: true }).count()) === 0, "Sponsored generation was available before explicit verification.");
  check(generationRequests.length === 0, "Sponsored generation was requested before explicit verification.");
  await screenshotPair(page, "04-partner-facts-before-verification");

  // 5. Verification uses the shared packet-information boundary. Only its
  // ready response may reveal the sponsored generation action.
  const verificationResponsePromise = packetInformationResponse(page, packetItemId);
  const generationResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/packet/generate",
    { timeout: 30_000 }
  );
  await page.getByRole("button", { name: "Verify and prepare clinic packet", exact: true }).click();
  const verificationResponse = await verificationResponsePromise;
  check(verificationResponse.ok(), `Partner final verification returned ${verificationResponse.status()}.`);
  const generationResponse = await generationResponsePromise;
  const generationResponseBody = await generationResponse.json().catch(() => null);
  check(generationResponse.ok(), `Sponsored packet generation returned ${generationResponse.status()}.`);
  check(generationRequests.length === 1, `Expected one sponsored generation request after verification; saw ${generationRequests.length}.`);
  await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}`, { timeout: 20_000 });
  assertNoCommercialCopy(await page.locator("main").innerText(), "generated partner packet action");
  await screenshotPair(page, "05-partner-packet-generated");

  const download = page.getByRole("link", { name: /Download Mississippi non-conviction expungement packet/i });
  await download.waitFor({ state: "visible" });
  const downloadHref = await download.getAttribute("href");
  check(Boolean(downloadHref), "Generated packet has no private download link.");
  if (!downloadHref) throw new Error(failures.join("\n"));
  const firstDownload = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
  const firstBytes = await firstDownload.body();
  const secondDownload = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
  const secondBytes = await secondDownload.body();
  const firstHash = crypto.createHash("sha256").update(firstBytes).digest("hex");
  const secondHash = crypto.createHash("sha256").update(secondBytes).digest("hex");
  check(firstDownload.status() === 200 && /^application\/pdf/i.test(firstDownload.headers()["content-type"] ?? ""), `First private packet download returned ${firstDownload.status()}.`);
  check(secondDownload.status() === 200 && firstHash === secondHash, `Repeat packet download returned ${secondDownload.status()} with stable bytes=${firstHash === secondHash}.`);
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
    await negativeContext.close();

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

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

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

async function answerChoice(page, prompt, option, final = false) {
  await page.getByRole("heading", { name: prompt, exact: true }).waitFor({ state: "visible" });
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

async function answerCurrentBuilderQuestion(page) {
  const builder = page.locator("[data-packet-information-builder='active']");
  await builder.waitFor({ state: "visible" });

  const enabledText = builder.locator("input[type='text']:visible:enabled, input[type='number']:visible:enabled").first();
  if (await enabledText.count()) {
    const id = (await enabledText.getAttribute("id"))?.replace(/^q-/, "") ?? "detail";
    const prompt = await builder.locator("h1").innerText();
    await enabledText.fill(valueForPacketField(id, prompt));
    return;
  }

  const selects = builder.locator("select:visible:enabled");
  if (await selects.count() === 3) {
    await selects.nth(0).selectOption("01");
    await selects.nth(1).selectOption("15");
    const years = await selects.nth(2).locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    await selects.nth(2).selectOption(years.includes("2015") ? "2015" : years.at(-1) ?? "2000");
    return;
  }

  const radios = builder.locator("input[type='radio']:visible:enabled");
  if (await radios.count()) {
    if (await builder.locator("input[type='radio']:visible:checked").count()) return;
    const controlId = ((await radios.first().getAttribute("name")) ?? "choice").replace(/^q-/, "");
    const preferred = ["pending_cases", "prior_relief", "trafficking_status"].includes(controlId) ? /^No(?:\s|$)/i : null;
    for (let index = 0; index < await radios.count(); index += 1) {
      const radio = radios.nth(index);
      const label = await radio.locator("xpath=ancestor::label").innerText().catch(() => "");
      if (preferred ? preferred.test(label) : !/not sure|prefer not|unknown/i.test(label)) {
        await radio.check();
        return;
      }
    }
    await radios.first().check();
    return;
  }

  const checkboxes = builder.locator("input[type='checkbox']:visible:enabled");
  if (await checkboxes.count() && !(await builder.locator("input[type='checkbox']:visible:checked").count())) {
    for (let index = 0; index < await checkboxes.count(); index += 1) {
      const checkbox = checkboxes.nth(index);
      const label = await checkbox.locator("xpath=ancestor::label").innerText().catch(() => "");
      if (!/not sure|prefer not|unknown|don't know/i.test(label)) {
        await checkbox.check();
        return;
      }
    }
  }
}

function packetInformationResponse(page, itemId) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST"
      && new URL(response.url()).pathname === `/api/expungement-ai/briefcase/${itemId}/packet-information`,
    { timeout: 20_000 }
  );
}

function valueForPacketField(id, prompt) {
  const values = {
    participant_full_legal_name: "Acceptance Participant",
    full_legal_name: "Acceptance Participant",
    contact_information: "100 Acceptance Way, Jackson, MS 39201",
    county: "Hinds County",
    court: "Hinds County Circuit Court",
    court_name: "Hinds County Circuit Court",
    charge: "Acceptance test misdemeanor charge",
    criminal_history: "Acceptance test non-conviction record",
    offense_category: "Misdemeanor",
    record_type: "Court case",
    residency_or_location: "Jackson, Mississippi",
    city: "Jackson",
    cause_number: "25-CR-000123",
    case_number: "25-CR-000123",
    docket_number: "25-CR-000123",
    age_at_offense: "30"
  };
  if (values[id]) return values[id];
  if (/name/i.test(prompt)) return "Acceptance Participant";
  if (/number|docket|case/i.test(prompt)) return "25-CR-000123";
  if (/county/i.test(prompt)) return "Hinds County";
  if (/court/i.test(prompt)) return "Hinds County Circuit Court";
  if (/age|year/i.test(prompt)) return "30";
  return "Acceptance test information";
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
  const match = value.match(/^\/briefcase\/([0-9a-f-]{36})(?:[?#]|$)/i);
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
  const projectRef = required("RCAP_BROWSER_ACCEPTANCE_PROJECT_REF");
  const expectedScopeSha256 = clinicMode ? required("RCAP_BROWSER_EXPECTED_SCOPE_SHA256") : null;
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId) || !/^[0-9a-f]{40}$/.test(applicationSha)) {
    fail("Hosted browser mutation requires an exact deployment id and application SHA.");
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
