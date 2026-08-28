import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Hosted browser proof for the direct-to-consumer commercial journey. This
// intentionally stops on Stripe Checkout before card entry. It creates one
// synthetic screening matter and one test-mode Checkout Session, then retries
// the final CTA once and requires the application to return that same Session.
//
// Required environment variables are read but never printed:
// DTC_BROWSER_BASE_URL, DTC_BROWSER_EMAIL, DTC_BROWSER_PASSWORD, and
// DTC_BROWSER_ALLOW_MUTATION=1. DTC_BROWSER_CHROMIUM and
// DTC_BROWSER_EVIDENCE_DIR are optional.

const baseUrl = requiredUrl("DTC_BROWSER_BASE_URL");
const email = required("DTC_BROWSER_EMAIL");
const password = required("DTC_BROWSER_PASSWORD");
const evidenceDir = path.resolve(
  process.env.DTC_BROWSER_EVIDENCE_DIR?.trim()
    || path.join(process.cwd(), "hosted-acceptance-evidence", "dtc-commercial-flow")
);

if (process.env.DTC_BROWSER_ALLOW_MUTATION !== "1") {
  fail("DTC_BROWSER_ALLOW_MUTATION=1 is required because this proof saves one synthetic matter and creates one Stripe Sandbox Checkout Session.");
}
assertSafeAcceptanceOrigin(baseUrl);
fs.mkdirSync(evidenceDir, { recursive: true });

const failures = [];
const browserErrors = [];
const checkoutRequests = [];
const checkoutPayloads = [];
const packetFields = [];
let browser;
let page;

try {
  const launchOptions = { headless: true };
  const executablePath = process.env.DTC_BROWSER_CHROMIUM?.trim();
  if (executablePath) launchOptions.executablePath = executablePath;
  browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light"
  });
  page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(`pageerror at ${safeRequestPath(page.url())}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/^Failed to load resource: the server responded with a status of 401 \(\)$/i.test(message.text())) {
      browserErrors.push(`console at ${safeRequestPath(page.url())}: ${message.text()}`);
    }
  });
  page.on("request", (request) => {
    if (request.method() === "POST" && safePath(request.url()) === "/api/expungement-ai/checkout") {
      checkoutRequests.push({ method: request.method(), path: safePath(request.url()) });
    }
  });
  page.on("requestfailed", (request) => {
    const detail = request.failure()?.errorText ?? "request failed";
    if (!/ERR_ABORTED/i.test(detail)) {
      browserErrors.push(`requestfailed: ${request.method()} ${safeRequestPath(request.url())} (${detail})`);
    }
  });

  // 1. Public landing to the anonymous state-specific free guided check.
  const landingResponse = await page.goto(baseUrl, { waitUntil: "networkidle" });
  check(landingResponse?.ok(), `DTC landing returned ${landingResponse?.status() ?? "no response"}.`);
  await expectText(page, "Start with a free guided check");
  const landingCta = page.getByRole("link", { name: /Check my record free/i }).first();
  check(await landingCta.isVisible(), "Landing did not show the free record-check CTA.");
  await landingCta.click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === "/expungement-ai/start");
  await page.getByRole("link", { name: /Start free/i }).click();
  await page.waitForURL((url) => url.pathname === "/expungement-ai/screening");
  await page.getByRole("link", { name: /Mississippi\s+MS/i }).click();
  await page.waitForURL((url) => url.pathname.toLowerCase() === "/expungement-ai/screening/ms");

  // 2. Authoritative packet-ready Mississippi route from an anonymous context.
  await answerChoice(page, "Are you asking about your own record?", "Yes");
  await answerChoice(page, "Did this case happen in Mississippi (not a federal case)?", "State or local");
  await answerChoice(page, "How did the case end?", "The case was dropped or thrown out");
  await answerChoice(page, "What kind of charge was it?", "Misdemeanor");
  await answerChoice(page, "Do any of these sound like your situation?", "Non-conviction expungement for dismissal, no disposition, or acquittal");
  await answerChoice(page, "About how long ago did this case end or get resolved?", "More than 10 years ago");
  await answerChoice(page, "Have you completed everything the court ordered in this case?", "Yes", true);

  await page.getByRole("heading", { name: /A path may be available|You may be able to prepare an expungement packet/i }).waitFor({ state: "visible" });
  await expectText(page, "Mississippi");
  await expectText(page, "$50 one time when you are ready to generate this packet");
  check(checkoutRequests.length === 0, "Checkout was requested from the screening result.");
  await screenshotPair(page, "01-dtc-packet-ready-result");

  // 3. Save the exact pending result, sign in, and require an exact matter
  // redirect rather than an empty generic Briefcase.
  const pendingResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && safePath(response.url()) === "/api/expungement-ai/screening/pending",
    { timeout: 20_000 }
  );
  const unauthenticatedClaimPromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && safePath(response.url()) === "/api/expungement-ai/screening/pending/claim",
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Save to my Briefcase and continue", exact: true }).click();
  const pendingResponse = await pendingResponsePromise;
  check(pendingResponse.ok(), `DTC pending-result write returned ${pendingResponse.status()}.`);
  const unauthenticatedClaim = await unauthenticatedClaimPromise;
  check(unauthenticatedClaim.status() === 401, `Anonymous pending claim returned ${unauthenticatedClaim.status()} instead of 401.`);
  await page.waitForURL((url) => url.pathname === "/expungement-ai/sign-in" && validUuid(url.searchParams.get("pending")));

  const pendingId = new URL(page.url()).searchParams.get("pending");
  check(validUuid(pendingId), "Sign-in handoff did not retain the exact pending result id.");
  const signInSubmit = page.getByRole("button", { name: "Sign in", exact: true });
  if (!(await signInSubmit.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Already have an account? Sign in", exact: true }).click();
  }
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const authResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"),
    { timeout: 20_000 }
  );
  const authenticatedClaimPromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && safePath(response.url()) === "/api/expungement-ai/screening/pending/claim",
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authResponse = await authResponsePromise;
  check(authResponse.ok(), `Supabase password sign-in returned ${authResponse.status()}.`);
  const authenticatedClaim = await authenticatedClaimPromise;
  const claimed = await authenticatedClaim.json().catch(() => null);
  check(authenticatedClaim.ok(), `Authenticated pending claim returned ${authenticatedClaim.status()}.`);
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && validUuid(exactBriefcaseItemId(url.pathname)));
  const itemId = exactBriefcaseItemId(new URL(page.url()).pathname);
  check(validUuid(itemId), "Authenticated pending claim did not land on an exact Briefcase item.");
  if (!validUuid(itemId)) throw new Error(failures.join("\n"));
  if (validUuid(claimed?.itemId)) check(claimed.itemId === itemId, "Pending claim response and exact matter URL disagree.");
  if (exactBriefcaseItemId(claimed?.redirectTo)) check(exactBriefcaseItemId(claimed.redirectTo) === itemId, "Pending claim redirect and exact matter URL disagree.");

  await expectText(page, "A self-help packet may be available");
  await expectText(page, "Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet.");
  check(await page.locator(`[data-briefcase-matter-id="${itemId}"]`).isVisible(), "Exact saved DTC matter did not render.");
  check(checkoutRequests.length === 0, "Checkout was requested while saving the matter.");
  await screenshotPair(page, "02-free-briefcase-matter");

  // 4. Open the free pre-payment builder, save and leave once, then resume.
  const builderLink = page.getByRole("link", { name: "Complete packet information", exact: true });
  check(await builderLink.isVisible(), "Saved packet matter did not expose Complete packet information.");
  await builderLink.click();
  await page.waitForURL((url) => url.pathname === `/briefcase/${itemId}/packet-information`);
  await expectText(page, "Complete packet information");
  check(checkoutRequests.length === 0, "Checkout was requested before the packet builder.");
  await screenshotPair(page, "03-free-packet-builder");

  const firstQuestion = await currentBuilderQuestionId(page);
  await answerCurrentBuilderQuestion(page);
  const firstSaveResponsePromise = packetInformationResponse(page, itemId);
  await page.getByRole("button", { name: "Save and leave", exact: true }).click();
  const firstSaveResponse = await firstSaveResponsePromise;
  check(firstSaveResponse.ok(), `Builder save-and-leave returned ${firstSaveResponse.status()}.`);
  await page.waitForURL((url) => url.pathname === `/briefcase/${itemId}`);
  await expectText(page, "Packet details in progress");

  const resumeLink = page.getByRole("link", { name: "Resume packet information", exact: true });
  check(await resumeLink.isVisible(), "Saved packet progress did not expose a resume action.");
  await resumeLink.click();
  await page.waitForURL((url) => url.pathname === `/briefcase/${itemId}/packet-information`);
  check(await currentBuilderQuestionId(page) === firstQuestion, "Resumed builder did not restore its first saved question and answer state.");
  check(await currentBuilderQuestionHasAnswer(page), "Resumed builder did not retain the saved answer.");

  // 5. Complete every required packet field. The builder may use any profile
  // question type; the helper answers its actual rendered control, not a
  // hardcoded packet-field list.
  for (let step = 0; step < 80 && safePath(page.url()).endsWith("/packet-information"); step += 1) {
    await answerCurrentBuilderQuestion(page);
    const saveResponsePromise = packetInformationResponse(page, itemId);
    const finalButton = page.getByRole("button", { name: "Review packet facts", exact: true });
    if (await finalButton.isVisible().catch(() => false)) {
      await finalButton.click();
    } else {
      await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    }
    const saveResponse = await saveResponsePromise;
    check(saveResponse.ok(), `Packet-information save returned ${saveResponse.status()}.`);
    if (!saveResponse.ok()) break;
    await page.waitForTimeout(30);
  }
  await page.waitForURL((url) => url.pathname === `/briefcase/${itemId}/review`, { timeout: 20_000 });
  await expectText(page, "Final verification");
  await expectText(page, "$50 one time after final verification");
  const finalCta = page.getByRole("button", { name: "Pay $50 and generate my packet", exact: true });
  check((await finalCta.count()) === 0, "Checkout was requested before explicit final verification.");
  check((await page.getByText("All required information is here.", { exact: false }).count()) > 0, "Final verification still reports missing packet information.");
  check(checkoutRequests.length === 0, "Checkout was requested before final verification.");
  await screenshotPair(page, "04-packet-facts-before-verification");

  const verificationResponsePromise = packetInformationResponse(page, itemId);
  await page.getByRole("button", { name: "I verified these packet facts" }).click();
  const verificationResponse = await verificationResponsePromise;
  check(verificationResponse.ok(), `Explicit packet verification returned ${verificationResponse.status()}.`);
  check(await finalCta.isVisible(), "Verified review did not render the exact final $50 CTA.");
  check(checkoutRequests.length === 0, "Checkout was requested by final verification instead of the checkout CTA.");
  await screenshotPair(page, "05-verified-final-cta");

  // 6. Create Checkout only at final review and stop before card entry.
  const firstCheckoutResponsePromise = checkoutResponse(page);
  await finalCta.click();
  const firstCheckoutResponse = await firstCheckoutResponsePromise;
  check(firstCheckoutResponse.ok(), `Final-review Checkout returned ${firstCheckoutResponse.status()}.`);
  await page.waitForURL((url) => url.hostname.endsWith("stripe.com"), { timeout: 30_000 });
  const firstCheckout = await stripeCheckoutProof(page.url(), itemId);
  check(firstCheckout.amountCents === 5000, `Checkout amount was ${String(firstCheckout.amountCents)} instead of 5000.`);
  check(firstCheckout.currency === "usd", `Checkout currency was ${String(firstCheckout.currency)} instead of usd.`);
  check(firstCheckout.alreadyPaid === false, `First Checkout alreadyPaid was ${String(firstCheckout.alreadyPaid)} instead of false.`);
  check(firstCheckout.briefcaseItemId === itemId, "Checkout response was not bound to the exact saved matter.");
  check(typeof firstCheckout.checkoutSessionId === "string" && firstCheckout.checkoutSessionId.startsWith("cs_test_"), "Checkout did not return a Stripe Sandbox Session.");
  check(typeof firstCheckout.checkoutUrl === "string" && new URL(firstCheckout.checkoutUrl).hostname.endsWith("stripe.com"), "Checkout did not return a Stripe-hosted URL.");

  check(checkoutRequests.length === 1, `Expected exactly one browser Checkout request; saw ${checkoutRequests.length}.`);

  const cookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(cookies.length > 0, "Authenticated session cookie was lost during the DTC journey.");
  if (browserErrors.length > 0) failures.push(...browserErrors);
  if (failures.length > 0) throw new Error(failures.join("\n"));

  fs.writeFileSync(path.join(evidenceDir, "browser-proof.json"), `${JSON.stringify({
    ok: true,
    startPath: "/expungement-ai",
    itemId,
    resultState: "MS",
    verificationResponseStatus: verificationResponse.status(),
    checkoutRequestCount: checkoutRequests.length,
    checkoutSessionId: firstCheckout.checkoutSessionId,
    checkoutSessionReused: false,
    packetFields,
    amountCents: firstCheckout.amountCents,
    currency: firstCheckout.currency,
    firstCheckoutResponse: firstCheckout,
    stoppedBeforeCardEntry: true
  }, null, 2)}\n`);

  console.log("Expungement.ai DTC commercial browser proof passed.");
  console.log(`DTC start: ${new URL("/expungement-ai", baseUrl).href}`);
  console.log(`Saved matter: ${itemId}`);
  console.log(`Checkout Session: ${firstCheckout.checkoutSessionId}`);
  console.log(`Evidence directory: ${evidenceDir}`);
} catch (error) {
  console.error("Expungement.ai DTC commercial browser proof failed.");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  if (page) {
    console.error(`Last browser path: ${safeRequestPath(page.url())}`);
    console.error(`Visible page text: ${(await page.locator("main").innerText().catch(() => "unavailable")).slice(0, 2_000)}`);
    if (browserErrors.length > 0) console.error(`Browser errors: ${browserErrors.join(" | ")}`);
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
}

async function answerChoice(page, prompt, option, final = false) {
  await page.getByRole("heading", { name: prompt, exact: true }).waitFor({ state: "visible" });
  await page.getByRole("radio", { name: new RegExp(`^${escapeRegExp(option)}(?:\\s|$)`, "i") }).check();
  const evaluationResponsePromise = final
    ? page.waitForResponse(
      (response) => response.request().method() === "POST" && safePath(response.url()) === "/api/expungement-ai/evaluate",
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
    const id = await enabledText.getAttribute("id");
    const fieldId = id?.replace(/^q-/, "") ?? "detail";
    const prompt = await builder.locator("h1").innerText();
    const value = valueForPacketField(fieldId, prompt);
    await enabledText.fill(value);
    recordPacketField(fieldId, prompt, await enabledText.getAttribute("type") ?? "text", value);
    return;
  }

  const selects = builder.locator("select:visible:enabled");
  if (await selects.count() === 3) {
    await selects.nth(0).selectOption("01");
    await selects.nth(1).selectOption("15");
    const yearValues = await selects.nth(2).locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    const year = yearValues.includes("2015") ? "2015" : yearValues.at(-1) ?? "2000";
    await selects.nth(2).selectOption(year);
    const hiddenId = (await builder.locator("input[type='hidden'][id^='q-']").getAttribute("id"))?.replace(/^q-/, "") ?? "date";
    recordPacketField(hiddenId, await builder.locator("h1").innerText(), "date (month/day/year selects)", `${year}-01-15`);
    return;
  }

  const radios = builder.locator("input[type='radio']:visible:enabled");
  if (await radios.count()) {
    const checked = builder.locator("input[type='radio']:visible:checked");
    if (await checked.count()) return;
    const controlId = ((await radios.first().getAttribute("name")) ?? "choice").replace(/^q-/, "");
    const preferred = ["pending_cases", "prior_relief", "trafficking_status"].includes(controlId) ? /^No(?:\s|$)/i : null;
    for (let index = 0; index < await radios.count(); index += 1) {
      const radio = radios.nth(index);
      const label = await radio.locator("xpath=ancestor::label").innerText().catch(() => "");
      if ((preferred ? preferred.test(label) : !/not sure|prefer not|unknown/i.test(label))) {
        await radio.check();
        recordPacketField(controlId, await builder.locator("h1").innerText(), "single choice", label.trim());
        return;
      }
    }
    await radios.first().check();
    return;
  }

  const checkboxes = builder.locator("input[type='checkbox']:visible:enabled");
  if (await checkboxes.count()) {
    const checked = builder.locator("input[type='checkbox']:visible:checked");
    if (await checked.count()) return;
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

async function currentBuilderQuestionId(page) {
  const builder = page.locator("[data-packet-information-builder='active']");
  const control = builder.locator("input[id^='q-'], select").first();
  const id = await control.getAttribute("id").catch(() => null);
  if (id) return id;
  return (await builder.locator("h1").innerText()).trim();
}

async function currentBuilderQuestionHasAnswer(page) {
  const builder = page.locator("[data-packet-information-builder='active']");
  const checked = await builder.locator("input:checked").count();
  if (checked > 0) return true;
  const values = await builder.locator("input[type='text'], input[type='number'], input[type='hidden']").evaluateAll((inputs) => inputs.map((input) => input.value).filter(Boolean));
  if (values.length > 0) return true;
  const selected = await builder.locator("select").evaluateAll((selects) => selects.map((select) => select.value).filter(Boolean));
  return selected.length > 0;
}

function packetInformationResponse(page, itemId) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST"
      && safePath(response.url()) === `/api/expungement-ai/briefcase/${itemId}/packet-information`,
    { timeout: 20_000 }
  );
}

function checkoutResponse(page) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST" && safePath(response.url()) === "/api/expungement-ai/checkout",
    { timeout: 30_000 }
  ).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    checkoutPayloads.push({
      status: response.status(), topLevelKeys: Object.keys(payload).sort(),
      checkoutSessionId: payload?.checkoutSessionId, briefcaseItemId: payload?.briefcaseItemId,
      amountCents: payload?.amountCents, currency: payload?.currency,
      alreadyPaid: payload?.alreadyPaid, paymentPending: payload?.paymentPending,
      checkoutUrl: payload?.checkoutUrl, mode: payload?.mode, outcome: payload?.outcome
    });
    return response;
  });
}

async function stripeCheckoutProof(checkoutUrl, itemId) {
  const sessionId = new URL(checkoutUrl).pathname.split("/").find((part) => part.startsWith("cs_test_"));
  const key = process.env.HOSTED_STRIPE_TEST_SECRET?.trim();
  if (!sessionId || !key?.startsWith("sk_test_")) return {};
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const session = await response.json();
  return {
    checkoutSessionId: session.id,
    checkoutUrl,
    briefcaseItemId: session.metadata?.briefcase_item_id,
    amountCents: session.amount_total,
    currency: session.currency,
    alreadyPaid: session.payment_status === "paid",
    livemode: session.livemode,
    itemMatches: session.metadata?.briefcase_item_id === itemId
  };
}

function recordPacketField(id, label, inputType, value) {
  if (!packetFields.some((field) => field.id === id)) packetFields.push({ id, label: label.trim(), inputType, value });
}

function valueForPacketField(id, prompt) {
  const values = {
    participant_full_legal_name: "Acceptance Consumer",
    full_legal_name: "Acceptance Consumer",
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
    agency_case_number: "TEST-000123",
    otn: "TEST-OTN-000123",
    age_at_offense: "30"
  };
  if (values[id]) return values[id];
  if (/name/i.test(prompt)) return "Acceptance Consumer";
  if (/number|docket|case/i.test(prompt)) return "25-CR-000123";
  if (/county/i.test(prompt)) return "Hinds County";
  if (/court/i.test(prompt)) return "Hinds County Circuit Court";
  if (/age|year/i.test(prompt)) return "30";
  return "Acceptance test information";
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
}

async function screenshotPair(page, stem) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function requiredUrl(name) {
  const value = required(name);
  try {
    const parsed = new URL(value);
    return new URL("/expungement-ai", parsed.origin).href;
  } catch {
    fail(`${name} must be an absolute URL.`);
  }
}

function assertSafeAcceptanceOrigin(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const safe = host === "127.0.0.1" || host === "localhost" || host.endsWith(".trycloudflare.com") || host.endsWith(".github.dev") || host.endsWith(".test");
  if (url.protocol !== "https:" && host !== "127.0.0.1" && host !== "localhost") {
    fail("DTC_BROWSER_BASE_URL must use HTTPS outside localhost.");
  }
  if (!safe) fail("DTC_BROWSER_BASE_URL must be a local, Codespaces, test, or Cloudflare acceptance origin. Production and Vercel origins are refused.");
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function exactBriefcaseItemId(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\/briefcase\/([0-9a-f-]{36})(?:[?#]|$)/i);
  return validUuid(match?.[1]) ? match[1] : null;
}

function safePath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
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
