import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(rootDir, "src/app/partner/dashboard/page.tsx");
const repositoryPath = path.join(rootDir, "src/lib/partners/partner-dashboard-rls-repository.ts");
const proxyPath = path.join(rootDir, "src/proxy.ts");
const port = Number(process.env.PARTNER_DASHBOARD_RLS_VERIFY_PORT ?? 3137);
let baseUrl = `http://127.0.0.1:${port}`;

loadLocalEnv();

const failures = [];
const requiredEnv = {
  PARTNER_RLS_WMV_ADMIN_EMAIL: process.env.PARTNER_RLS_WMV_ADMIN_EMAIL,
  PARTNER_RLS_WMV_ADMIN_PASSWORD: process.env.PARTNER_RLS_WMV_ADMIN_PASSWORD,
  PARTNER_RLS_DEMO_STAFF_EMAIL: process.env.PARTNER_RLS_DEMO_STAFF_EMAIL,
  PARTNER_RLS_DEMO_STAFF_PASSWORD: process.env.PARTNER_RLS_DEMO_STAFF_PASSWORD,
  PARTNER_RLS_INTERNAL_ADMIN_EMAIL: process.env.PARTNER_RLS_INTERNAL_ADMIN_EMAIL,
  PARTNER_RLS_INTERNAL_ADMIN_PASSWORD: process.env.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD,
  PARTNER_RLS_NO_PARTNER_EMAIL: process.env.PARTNER_RLS_NO_PARTNER_EMAIL,
  PARTNER_RLS_NO_PARTNER_PASSWORD: process.env.PARTNER_RLS_NO_PARTNER_PASSWORD
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    failures.push(`${key} is required for dashboard RLS isolation verification.`);
  }
}

verifySourceShape();

let server;
let browser;

try {
  if (failures.length === 0) {
    server = await startNextServer();
    browser = await chromium.launch({ headless: true });
    await verifyHttpIsolation();
    await verifyPublicRegressions();
  }
} finally {
  if (browser) {
    await browser.close();
  }
  if (server) {
    server.kill("SIGTERM");
  }
}

if (failures.length > 0) {
  console.error("Partner dashboard RLS isolation verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner dashboard RLS isolation verification passed.");
console.log("Route tested: /partner/dashboard");
console.log("Partner identity source: authenticated session only");
console.log("Cross-partner bypass attempts: denied by ignored client-controlled input");
console.log("Internal admin behavior: redirected to /dashboard/partners");
console.log("No-partner authenticated access: denied");
console.log("Unauthenticated access: redirected to sign-in");
console.log("Service role usage in partner dashboard read layer: absent");
console.log("/p/we-must-vote proxy regression: passed");
console.log("Public We Must Vote intake/document smoke: passed");

function verifySourceShape() {
  const routeSource = readSource(routePath);
  const repositorySource = readSource(repositoryPath);
  const proxySource = readSource(proxyPath);

  if (!routeSource.includes("getPartnerDashboardRlsData")) {
    failures.push("/partner/dashboard route must load through the RLS dashboard repository.");
  }

  for (const banned of ["searchParams", "params:", "headers()", "x-partner", "getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (routeSource.includes(banned)) {
      failures.push(`/partner/dashboard route must not reference ${banned}.`);
    }
  }

  if (!repositorySource.includes("resolveSessionPartner()")) {
    failures.push("Dashboard RLS repository must resolve partner identity from the authenticated session.");
  }

  for (const banned of ["getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "searchParams", "headers()", "request.body"]) {
    if (repositorySource.includes(banned)) {
      failures.push(`Dashboard RLS repository must not reference ${banned}.`);
    }
  }

  if (!repositorySource.includes("createServerSupabaseAuthClient")) {
    failures.push("Dashboard RLS repository must use the authenticated server Supabase client.");
  }

  if (!proxySource.includes('"/p/we-must-vote"') || !proxySource.includes('"/partner/dashboard"')) {
    failures.push("Proxy must preserve /p/we-must-vote and include /partner/dashboard session refresh.");
  }
}

async function verifyHttpIsolation() {
  await assertUnauthenticatedRedirect();

  const wmv = await signIn(requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD);
  await assertPartnerDashboard(wmv, {
    label: "We Must Vote partner admin",
    expectedSlug: "we-must-vote",
    forbiddenSlug: "demo-partner"
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expectedSlug: "we-must-vote",
    forbiddenSlug: "demo-partner",
    attempt: "?partner_slug=demo-partner",
    query: "partner_slug=demo-partner"
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expectedSlug: "we-must-vote",
    forbiddenSlug: "demo-partner",
    attempt: "?partnerSlug=demo-partner",
    query: "partnerSlug=demo-partner"
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expectedSlug: "we-must-vote",
    forbiddenSlug: "demo-partner",
    attempt: "x-partner-slug: demo-partner",
    headers: { "x-partner-slug": "demo-partner", "x-legalease-partner-slug": "demo-partner" }
  });
  await wmv.close();

  const demo = await signIn(requiredEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, requiredEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD);
  await assertPartnerDashboard(demo, {
    label: "Demo partner staff",
    expectedSlug: "demo-partner",
    forbiddenSlug: "we-must-vote"
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expectedSlug: "demo-partner",
    forbiddenSlug: "we-must-vote",
    attempt: "?partner_slug=we-must-vote",
    query: "partner_slug=we-must-vote"
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expectedSlug: "demo-partner",
    forbiddenSlug: "we-must-vote",
    attempt: "?partnerSlug=we-must-vote",
    query: "partnerSlug=we-must-vote"
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expectedSlug: "demo-partner",
    forbiddenSlug: "we-must-vote",
    attempt: "x-partner-slug: we-must-vote",
    headers: { "x-partner-slug": "we-must-vote", "x-legalease-partner-slug": "we-must-vote" }
  });
  await demo.close();

  const noPartner = await signIn(requiredEnv.PARTNER_RLS_NO_PARTNER_EMAIL, requiredEnv.PARTNER_RLS_NO_PARTNER_PASSWORD);
  await noPartner.goto(`${baseUrl}/partner/dashboard`, { waitUntil: "networkidle" });
  const noPartnerBody = await visiblePageText(noPartner);
  if (!noPartnerBody?.includes("Partner dashboard access denied")) {
    failures.push("No-partner authenticated user was not denied on /partner/dashboard.");
  }
  await noPartner.close();

  const internal = await signIn(requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD);
  await gotoAllowingRedirectAbort(internal, `${baseUrl}/partner/dashboard`);
  if (!internal.url().startsWith(`${baseUrl}/dashboard/partners`)) {
    failures.push(`Internal admin was not redirected to /dashboard/partners. Final URL: ${internal.url()}`);
  }
  await internal.close();
}

async function assertUnauthenticatedRedirect() {
  const page = await browser.newPage();
  const response = await gotoAllowingRedirectAbort(page, `${baseUrl}/partner/dashboard`);
  const currentUrl = new URL(page.url());
  const redirectedToSignIn =
    currentUrl.origin === baseUrl &&
    currentUrl.pathname === "/sign-in" &&
    currentUrl.searchParams.get("next") === "/partner/dashboard";
  if (!redirectedToSignIn && response?.status() !== 401 && response?.status() !== 403) {
    failures.push(`Unauthenticated /partner/dashboard was not redirected or denied. Final URL: ${page.url()}`);
  }
  await page.close();
}

async function gotoAllowingRedirectAbort(page, url) {
  try {
    return await page.goto(url, { waitUntil: "networkidle" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("net::ERR_ABORTED")) {
      await page.waitForLoadState("networkidle").catch(() => undefined);
      return undefined;
    }

    throw error;
  }
}

async function signIn(email, password) {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/sign-in?next=/partner/dashboard`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText ?? "";
      return !location.pathname.startsWith("/sign-in") ||
        bodyText.includes("We could not sign you in") ||
        bodyText.includes("We could not confirm your signed-in session");
    },
    undefined,
    { timeout: 20000 }
  ).catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return page;
}

async function assertPartnerDashboard(page, { label, expectedSlug, forbiddenSlug }) {
  if (!page.url().startsWith(`${baseUrl}/partner/dashboard`)) {
    failures.push(`${label} did not land on /partner/dashboard after sign-in. Final URL: ${page.url()}`);
    return;
  }

  const resolvedSlug = await page.locator("main").getAttribute("data-partner-dashboard-slug").catch(() => null);
  const body = await visiblePageText(page);
  if (resolvedSlug !== expectedSlug) {
    failures.push(`${label} dashboard did not show expected partner slug ${expectedSlug}.`);
  }
  if (visibleTextIncludesSlug(body, forbiddenSlug)) {
    failures.push(`${label} dashboard appeared to show forbidden partner slug ${forbiddenSlug}.`);
  }
}

async function assertBypassIgnored(page, { label, expectedSlug, forbiddenSlug, attempt, query, headers = {} }) {
  await page.setExtraHTTPHeaders(headers);
  const url = query ? `${baseUrl}/partner/dashboard?${query}` : `${baseUrl}/partner/dashboard`;
  await gotoAllowingRedirectAbort(page, url);
  const resolvedSlug = await page.locator("main").getAttribute("data-partner-dashboard-slug").catch(() => null);
  const body = await visiblePageText(page);
  if (resolvedSlug !== expectedSlug) {
    failures.push(`${label} bypass attempt ${attempt} did not preserve expected partner slug ${expectedSlug}.`);
  }
  if (visibleTextIncludesSlug(body, forbiddenSlug)) {
    failures.push(`${label} bypass attempt ${attempt} exposed forbidden partner slug ${forbiddenSlug}.`);
  }
  await page.setExtraHTTPHeaders({});
}

async function visiblePageText(page) {
  return page.locator("main").innerText().catch(() => page.locator("body").innerText());
}

function visibleTextIncludesSlug(text, slug) {
  const titleCasedSlug = slug
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("-");
  return Boolean(text?.includes(slug) || text?.includes(titleCasedSlug));
}

async function verifyPublicRegressions() {
  const landing = await fetch(`${baseUrl}/p/we-must-vote`);
  if (!landing.ok) {
    failures.push(`/p/we-must-vote regression failed with status ${landing.status}.`);
  } else {
    const landingHtml = await landing.text();
    if (!landingHtml.includes("We Must Vote Record-Clearing Access Pilot")) {
      failures.push("/p/we-must-vote regression did not include the expected We Must Vote static landing marker.");
    }
  }

  const start = await postJson("/api/rcap/intake/start", {
    partnerSlug: "we-must-vote",
    legalDisclaimerAccepted: true
  });
  const sessionId = start.session?.id;
  if (!sessionId) {
    failures.push("Public We Must Vote intake smoke could not start a session.");
    return;
  }

  const steps = [
    ["understand_goal", "old_arrest"],
    ["state", "MS"],
    ["county", "Hinds"],
    ["case_outcome", "dismissed"],
    ["approximate_case_year", "2018"],
    ["has_documents", false],
    ["needs_record_check", false],
    ["contact_information", { firstName: "Dashboard", email: "dashboard-rls-smoke@example.test" }]
  ];

  for (const [stepId, value] of steps) {
    const response = await postJson("/api/rcap/intake/respond", { sessionId, stepId, value });
    if (!response.session) {
      failures.push(`Public We Must Vote intake smoke failed at step ${stepId}.`);
      return;
    }
  }

  const completed = await postJson("/api/rcap/intake/complete", { sessionId });
  if (!completed.session) {
    failures.push("Public We Must Vote intake smoke could not complete the session.");
    return;
  }

  const packet = await postJson("/api/rcap/documents/mississippi/create", {
    partnerSlug: "we-must-vote",
    intakeSessionId: sessionId,
    causeNumber: "DASHBOARD-RLS-SMOKE",
    charge: "Dismissed misdemeanor smoke test",
    courtCounty: "Hinds"
  });
  if (!packet.packet?.id) {
    failures.push("Public We Must Vote document smoke could not save a packet.");
  }
}

async function postJson(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json().catch(() => ({}));
}

async function startNextServer() {
  for (const existingUrl of [baseUrl, "http://127.0.0.1:3000", "http://localhost:3000"]) {
    if (await canReachServer(existingUrl)) {
      baseUrl = existingUrl;
      return { kill() {} };
    }
  }

  const nextBin = path.join(rootDir, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: rootDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await canReachServer(baseUrl)) {
      return child;
    }
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited early.\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  child.kill("SIGTERM");
  throw new Error(`Next dev server did not become ready.\n${output}`);
}

function canReachServer(url = baseUrl) {
  return new Promise((resolve) => {
    const request = http.get(`${url}/sign-in`, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function readSource(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    failures.push(`Unable to read ${path.relative(rootDir, file)}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
