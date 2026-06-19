import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.COMMAND_CENTER_READINESS_VERIFY_PORT ?? 3174);
let baseUrl = `http://127.0.0.1:${port}`;
const readinessPath = "/internal/command-center/readiness";
const failures = [];
const checks = [];
const skipped = [];

loadLocalEnv();

const requiredEnv = {
  PARTNER_RLS_WMV_ADMIN_EMAIL: process.env.PARTNER_RLS_WMV_ADMIN_EMAIL,
  PARTNER_RLS_WMV_ADMIN_PASSWORD: process.env.PARTNER_RLS_WMV_ADMIN_PASSWORD,
  PARTNER_RLS_INTERNAL_ADMIN_EMAIL: process.env.PARTNER_RLS_INTERNAL_ADMIN_EMAIL,
  PARTNER_RLS_INTERNAL_ADMIN_PASSWORD: process.env.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD
};

const optionalEnv = {
  PARTNER_RLS_DEMO_STAFF_EMAIL: process.env.PARTNER_RLS_DEMO_STAFF_EMAIL,
  PARTNER_RLS_DEMO_STAFF_PASSWORD: process.env.PARTNER_RLS_DEMO_STAFF_PASSWORD
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    failures.push(`${key} is required for Command Center readiness verification.`);
  }
}

verifySourceShape();

let server;
let browser;

try {
  if (failures.length === 0) {
    server = await startNextServer();
    browser = await chromium.launch({ headless: true });
    await verifyUnauthenticatedDenied();
    await verifyPartnerDenied("partner_admin", requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD);
    if (optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL && optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD) {
      await verifyPartnerDenied("partner_staff", optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD);
    } else {
      skipped.push("Partner staff fixture env was not present; partner_staff denial check skipped.");
    }
    await verifyInternalAdminAllowedAndSafe();
    await verifyHealthShape();
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
  console.error("Command Center readiness verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Command Center readiness verification passed.");
for (const check of checks) {
  console.log(`PASS: ${check}`);
}
for (const skip of skipped) {
  console.log(`SKIP: ${skip}`);
}

function verifySourceShape() {
  const pageSource = readSource("src/app/internal/command-center/readiness/page.tsx");
  const contractSource = readSource("src/lib/partners/command-center-readiness.ts");
  const packageSource = readSource("package.json");
  const healthSource = readSource("src/app/api/health/route.ts");
  const restrictedDiff = unsafeRestrictedDiff([
    "src/app/partner/dashboard",
    "src/app/p/we-must-vote",
    "src/app/intake/we-must-vote",
    "src/app/request-pilot",
    "src/app/internal/pilot-requests",
    "src/app/api/internal/pilot-requests/status",
    "src/app/dashboard/partners",
    "src/app/internal/partners/admin",
    "src/app/api/health"
  ]);
  const publicReadinessRoutes = findPublicReadinessRoutes();

  if (!pageSource.includes("resolveInternalAdminPageAccess(\"/internal/command-center/readiness\")")) {
    failures.push("Readiness page must call the internal admin page gate for its own route.");
  }

  const gateIndex = pageSource.indexOf("resolveInternalAdminPageAccess(");
  const summarizeIndex = pageSource.indexOf("summarizeReadiness()");
  if (gateIndex === -1 || summarizeIndex === -1 || gateIndex > summarizeIndex) {
    failures.push("Readiness page must run the internal_admin gate before rendering readiness contract details.");
  }

  if (!readSource("src/lib/partners/internal-admin-gate.tsx").includes("requireInternalAdminSession()")) {
    failures.push("Internal admin gate helper must enforce requireInternalAdminSession().");
  }

  for (const forbidden of forbiddenSourceMarkers()) {
    if (pageSource.includes(forbidden) || contractSource.includes(forbidden)) {
      failures.push(`Readiness source contains forbidden marker: ${forbidden}.`);
    }
  }

  if (!packageSource.includes("partners:verify-command-center-readiness")) {
    failures.push("package.json must expose partners:verify-command-center-readiness.");
  }

  if (!healthSource.includes("checks: {\n    db: \"ok\" | \"fail\";") || !healthSource.includes("checks: {\n      db\n    }")) {
    failures.push("/api/health source shape changed away from ok/timestamp/checks.db.");
  }

  if (restrictedDiff.trim()) {
    failures.push(`Restricted routes were modified:\n${restrictedDiff}`);
  }

  const requestPilotSource = readSource("src/app/api/request-pilot/route.ts");
  for (const marker of [
    "createLaunchOsEvent",
    'sourceProduct: "rcap_partner"',
    'loopCategory: "partner_followup"',
    "os_mirror_failed"
  ]) {
    if (!requestPilotSource.includes(marker)) {
      failures.push(`/api/request-pilot launch OS mirror is missing marker: ${marker}.`);
    }
  }

  if (publicReadinessRoutes.length > 0) {
    failures.push(`Public readiness route files were found:\n${publicReadinessRoutes.join("\n")}`);
  }

  checks.push("Readiness source uses the existing internal_admin gate before rendering contract details.");
  checks.push("Readiness contract is static and contains no forbidden source markers.");
  checks.push("/api/health source remains limited to ok, timestamp, and checks.db.");
  checks.push("Restricted route diff is empty.");
  checks.push("No public readiness endpoint or page was added.");
}

async function verifyUnauthenticatedDenied() {
  const page = await browser.newPage();
  await gotoAllowingRedirectAbort(page, `${baseUrl}${readinessPath}`);
  const currentUrl = new URL(page.url());
  if (currentUrl.pathname !== "/sign-in" || currentUrl.searchParams.get("next") !== readinessPath) {
    failures.push(`Unauthenticated readiness access was not redirected to sign-in. Final URL: ${page.url()}`);
  }
  await page.close();
  checks.push("Unauthenticated users cannot access Command Center readiness.");
}

async function verifyPartnerDenied(label, email, password) {
  const page = await signIn(email, password, readinessPath);
  await page.goto(`${baseUrl}${readinessPath}`, { waitUntil: "networkidle" });
  const body = await visiblePageText(page);

  if (!body.includes("Internal admin access denied")) {
    failures.push(`${label} was not denied on Command Center readiness. Final URL: ${page.url()}`);
  }
  if (body.includes("Command Center readiness") || body.includes("Production deployment checklist")) {
    failures.push(`${label} rendered readiness content.`);
  }

  await page.close();
  checks.push(`${label} cannot access Command Center readiness.`);
}

async function verifyInternalAdminAllowedAndSafe() {
  const page = await signIn(requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD, readinessPath);
  await page.goto(`${baseUrl}${readinessPath}`, { waitUntil: "networkidle" });
  const body = await visiblePageText(page);

  for (const marker of [
    "Command Center readiness",
    "Partner acquisition pipeline",
    "Partner dashboard",
    "Security controls",
    "Production deployment checklist",
    "Deferred items",
    "Rate limiter production secret",
    "Required before deploy",
    "Production deployment",
    "Not started"
  ]) {
    if (!body.includes(marker)) {
      failures.push(`Internal admin readiness page is missing marker: ${marker}.`);
    }
  }

  assertNoSensitiveLeakage(body, "rendered readiness page");
  await page.close();
  checks.push("internal_admin can access Command Center readiness.");
  checks.push("Rendered readiness page does not include known PII, secrets, tokens, or sensitive internals.");
}

async function verifyHealthShape() {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  const keys = Object.keys(body).sort();
  const checkKeys = Object.keys(body.checks ?? {}).sort();

  if (keys.join(",") !== "checks,ok,timestamp") {
    failures.push(`/api/health top-level keys changed: ${keys.join(",")}`);
  }
  if (checkKeys.join(",") !== "db") {
    failures.push(`/api/health check keys changed: ${checkKeys.join(",")}`);
  }
  if (typeof body.ok !== "boolean" || typeof body.timestamp !== "string" || !["ok", "fail"].includes(body.checks?.db)) {
    failures.push("/api/health value shape changed.");
  }

  checks.push("/api/health still returns only ok, timestamp, and checks.db.");
}

async function signIn(email, password, nextPath) {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(nextPath)}`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
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

async function visiblePageText(page) {
  return page.locator("main").innerText().catch(() => page.locator("body").innerText());
}

async function startNextServer() {
  if (await canReachServer(baseUrl)) {
    return { kill() {} };
  }

  const nextBin = path.join(rootDir, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: rootDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: `http://localhost:${port}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 60000;
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
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function assertNoSensitiveLeakage(text, label) {
  const haystack = text.toLowerCase();
  const envValues = Object.entries(process.env)
    .filter(([key, value]) => shouldCheckEnvValue(key, value))
    .map(([key, value]) => [key, value]);

  for (const [key, value] of envValues) {
    if (text.includes(value)) {
      failures.push(`${label} leaked raw environment value for ${key}.`);
    }
  }

  for (const marker of forbiddenRenderedMarkers()) {
    if (haystack.includes(marker.toLowerCase())) {
      failures.push(`${label} contains forbidden rendered marker: ${marker}.`);
    }
  }
}

function shouldCheckEnvValue(key, value) {
  if (!value || value.length < 8) {
    return false;
  }
  return /EMAIL|PHONE|PASSWORD|SECRET|KEY|TOKEN|COOKIE|SUPABASE|URL/i.test(key);
}

function forbiddenRenderedMarkers() {
  const markers = [
    "service_role",
    "service-role",
    "supabase.co",
    "access token",
    "refresh token",
    "cookie",
    "request body",
    "raw env",
    "table dump",
    "create policy",
    "security definer",
    "rpc",
    "rls policy",
    "partner_pilot_requests",
    "request_rate_limit_buckets",
    "getSupabaseAdminClient"
  ];

  for (const key of [
    "PARTNER_RLS_WMV_ADMIN_EMAIL",
    "PARTNER_RLS_INTERNAL_ADMIN_EMAIL",
    "PARTNER_RLS_DEMO_STAFF_EMAIL"
  ]) {
    if (process.env[key]) {
      markers.push(process.env[key]);
    }
  }

  return markers;
}

function forbiddenSourceMarkers() {
  return [
    "process.env",
    "getSupabaseAdminClient",
    "createServerSupabaseAuthClient",
    "createClient(",
    "service_role",
    "SERVICE_ROLE",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "PARTNER_RLS_",
    "partner_pilot_requests",
    "request_rate_limit_buckets",
    ".from(",
    ".rpc(",
    "select(",
    "insert(",
    "update(",
    "delete()"
  ];
}

function findPublicReadinessRoutes() {
  const appDir = path.join(rootDir, "src/app");
  const files = listFiles(appDir).filter((file) => /\/(page|route)\.(ts|tsx)$/.test(file));
  return files
    .map((file) => path.relative(rootDir, file))
    .filter((file) => file.includes("readiness") && !file.startsWith("src/app/internal/"));
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function unsafeRestrictedDiff(pathspecs) {
  const diff = execFileSync("git", ["diff", "--unified=0", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const unsafeLines = diff.split(/\r?\n/).filter((line) => {
    if (!line.startsWith("+") && !line.startsWith("-")) {
      return false;
    }
    return !line.startsWith("+++") && !line.startsWith("---");
  });

  return unsafeLines.join("\n");
}

function readSource(relativePath) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    failures.push(`Unable to read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
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
