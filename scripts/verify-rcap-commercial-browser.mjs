import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Hosted browser proof for the sponsored RCAP lane only. This intentionally
// stops at the packet-information builder: it never calls Stripe, creates a
// consumer checkout, generates a packet, or runs a worker.
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
const guidanceItemId = requiredUuid("RCAP_BROWSER_GUIDANCE_ITEM_ID");
const partnerSlug = process.env.RCAP_BROWSER_PARTNER_SLUG?.trim() || "we-must-vote";
const evidenceDir = path.resolve(
  process.env.RCAP_BROWSER_EVIDENCE_DIR?.trim() ||
    path.join(process.cwd(), "hosted-acceptance-evidence", "rcap-commercial-flow")
);

if (process.env.RCAP_BROWSER_ALLOW_MUTATION !== "1") {
  fail("RCAP_BROWSER_ALLOW_MUTATION=1 is required because this proof claims one sponsored screening result into the synthetic user's Briefcase.");
}
assertSafeAcceptanceOrigin(baseUrl);
fs.mkdirSync(evidenceDir, { recursive: true });

const failures = [];
const browserErrors = [];
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

  // 1. The canonical partner entry must remain on the acceptance origin. On
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
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const authResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/auth/v1/token") && response.url().includes("grant_type=password"),
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authResponse = await authResponsePromise;
  check(authResponse.ok(), `Supabase password sign-in returned ${authResponse.status()}.`);
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === `/intake/${partnerSlug}`);

  const authCookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(authCookies.length > 0, "Supabase session cookie was not written on the acceptance origin.");
  const startButton = page.getByRole("button", { name: /Start your record-clearing screening/i });
  check(await startButton.isVisible(), "Authenticated intake did not render the sponsored screening start control.");

  // 3. Start one sponsored screening and answer the deterministic Mississippi
  // non-conviction fixture. The engine remains authoritative for the result.
  await startButton.click();
  await page.waitForURL((url) => url.pathname === "/expungement-ai/screening/ms" && validUuid(url.searchParams.get("session")));
  await answerChoice(page, "Are you asking about your own record?", "Yes");
  await answerChoice(page, "Did this case happen in Mississippi (not a federal case)?", "State or local");
  await answerChoice(page, "How did the case end?", "The case was dropped or thrown out");
  await answerChoice(page, "What kind of charge was it?", "Misdemeanor");
  await answerChoice(page, "Do any of these sound like your situation?", "Non-conviction expungement for dismissal, no disposition, or acquittal");
  await answerChoice(page, "About how long ago did this case end or get resolved?", "More than 10 years ago");
  await answerChoice(page, "Have you completed everything the court ordered in this case?", "Yes", true);

  await page.getByRole("heading", { name: /A path may be available|You may be able to prepare an expungement packet/i }).waitFor({ state: "visible" });
  await expectText(page, "This screening started through a partner program. You will not be asked to pay here.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner result");
  await screenshotPair(page, "01-partner-covered-result");

  // 4. Persist and claim the server-re-evaluated pending result. Capture the
  // exact item id from the claim response instead of guessing from Briefcase.
  const pendingResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/screening/pending",
    { timeout: 20_000 }
  );
  const claimResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/expungement-ai/screening/pending/claim",
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Continue to packet builder", exact: true }).click();
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

  // 5. The sponsored packet-information builder is available without a price
  // or Stripe action. Stop here; generation and worker execution are outside
  // this proof.
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

  // 6. A separately seeded guidance-only matter proves that the completed
  // guidance value has no disabled packet stepper or consumer payment copy.
  await page.goto(new URL(`/briefcase/${guidanceItemId}`, baseUrl).href, { waitUntil: "networkidle" });
  await expectText(page, "Next steps saved");
  await expectText(page, "Next steps");
  check(!(await page.getByText("We couldn't find that matter", { exact: true }).isVisible().catch(() => false)), "Seeded guidance-only matter is not owned by the signed-in synthetic user.");
  check((await page.locator("main").getByText("Payment", { exact: true }).count()) === 0, "Guidance-only matter renders a Payment step.");
  check((await page.getByRole("link", { name: /checkout|pay \$50|continue to payment/i }).count()) === 0, "Guidance-only matter renders a payment action.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "guidance-only matter");
  await screenshotPair(page, "04-guidance-only-matter");

  if (browserErrors.length > 0) {
    failures.push(...browserErrors);
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  console.log("RCAP commercial browser proof passed.");
  console.log(`Partner start: ${new URL(`/p/${partnerSlug}`, baseUrl).href}`);
  console.log(`Packet-covered item: ${packetItemId}`);
  console.log(`Guidance item: ${guidanceItemId}`);
  console.log(`Evidence directory: ${evidenceDir}`);
} catch (error) {
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

function assertSafeAcceptanceOrigin(origin) {
  const url = new URL(origin);
  const host = url.hostname.toLowerCase();
  const safe = host === "127.0.0.1" || host === "localhost" || host.endsWith(".trycloudflare.com") || host.endsWith(".github.dev") || host.endsWith(".test");
  if (url.protocol !== "https:" && host !== "127.0.0.1" && host !== "localhost") {
    fail("RCAP_BROWSER_BASE_URL must use HTTPS outside localhost.");
  }
  if (!safe) fail("RCAP_BROWSER_BASE_URL must be a local, Codespaces, test, or Cloudflare acceptance origin. Production and Vercel origins are refused.");
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
