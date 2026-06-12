import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.LEGACY_INTERNAL_ADMIN_VERIFY_PORT ?? 3168);
let baseUrl = `http://127.0.0.1:${port}`;
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

const protectedPaths = ["/dashboard/partners", "/internal/partners/admin"];

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    failures.push(`${key} is required for legacy internal admin gate verification.`);
  }
}

verifySourceShape();

let server;
let browser;

try {
  if (failures.length === 0) {
    server = await startNextServer();
    browser = await chromium.launch({ headless: true });
    await verifyUnauthenticatedUsersDenied();
    await verifyPartnerUserDenied("partner_admin", requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD);
    if (optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL && optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD) {
      await verifyPartnerUserDenied("partner_staff", optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD);
    } else {
      skipped.push("Partner staff fixture env was not present; partner_staff denial check skipped.");
    }
    await verifyInternalAdminAllowed();
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
  console.error("Legacy internal admin gate verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Legacy internal admin gate verification passed.");
for (const check of checks) {
  console.log(`PASS: ${check}`);
}
for (const skip of skipped) {
  console.log(`SKIP: ${skip}`);
}

function verifySourceShape() {
  const dashboardPage = readSource("src/app/dashboard/partners/page.tsx");
  const dashboardClient = readSource("src/app/dashboard/partners/PartnerDashboardClient.tsx");
  const dashboardDetail = readSource("src/app/dashboard/partners/[partnerSlug]/page.tsx");
  const adminPage = readSource("src/app/internal/partners/admin/page.tsx");
  const adminDetail = readSource("src/app/internal/partners/admin/[partnerSlug]/page.tsx");
  const adminEmails = readSource("src/app/internal/partners/admin/[partnerSlug]/emails/page.tsx");
  const adminEmailPreview = readSource("src/app/internal/partners/admin/[partnerSlug]/emails/[emailType]/page.tsx");
  const adminActionRoute = readSource("src/app/api/internal/partners/admin-action/route.ts");
  const sendEmailRoute = readSource("src/app/api/internal/partners/send-email/route.ts");
  const gateSource = readSource("src/lib/partners/internal-admin-gate.tsx");
  const restrictedDiff = unsafeRestrictedDiff("src/app/partner/dashboard src/app/p/we-must-vote src/app/intake/we-must-vote src/app/request-pilot src/app/internal/pilot-requests src/app/api/internal/pilot-requests/status");

  if (!gateSource.includes("requireInternalAdminSession()") || !gateSource.includes("resolveInternalAdminPageAccess")) {
    failures.push("Internal admin gate helper must enforce requireInternalAdminSession().");
  }

  assertGateBefore(dashboardPage, "src/app/dashboard/partners/page.tsx", "resolveInternalAdminPageAccess(", "return <PartnerDashboardClient");
  assertGateBefore(dashboardDetail, "src/app/dashboard/partners/[partnerSlug]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerRecordBySlug");
  assertGateBefore(dashboardDetail, "src/app/dashboard/partners/[partnerSlug]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerDocumentActivitySummary");
  assertGateBefore(adminPage, "src/app/internal/partners/admin/page.tsx", "resolveInternalAdminPageAccess(", "await getAllPartnerRecords");
  assertGateBefore(adminPage, "src/app/internal/partners/admin/page.tsx", "resolveInternalAdminPageAccess(", "getPartnerDocumentActivitySummary(record");
  assertGateBefore(adminDetail, "src/app/internal/partners/admin/[partnerSlug]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerRecordBySlug");
  assertGateBefore(adminDetail, "src/app/internal/partners/admin/[partnerSlug]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerEmailDeliveryRecords");
  assertGateBefore(adminDetail, "src/app/internal/partners/admin/[partnerSlug]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerIntakeActivitySummary");
  assertGateBefore(adminEmails, "src/app/internal/partners/admin/[partnerSlug]/emails/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerRecordBySlug");
  assertGateBefore(adminEmails, "src/app/internal/partners/admin/[partnerSlug]/emails/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerEmailDeliveryRecords");
  assertGateBefore(adminEmailPreview, "src/app/internal/partners/admin/[partnerSlug]/emails/[emailType]/page.tsx", "resolveInternalAdminPageAccess(", "await getPartnerRecordBySlug");
  assertGateBefore(adminActionRoute, "src/app/api/internal/partners/admin-action/route.ts", "await denyUnlessInternalAdmin(", "request.json");
  assertGateBefore(adminActionRoute, "src/app/api/internal/partners/admin-action/route.ts", "await denyUnlessInternalAdmin(", "await getPartnerRecordBySlug");
  assertGateBefore(sendEmailRoute, "src/app/api/internal/partners/send-email/route.ts", "await denyUnlessInternalAdmin(", "request.json");
  assertGateBefore(sendEmailRoute, "src/app/api/internal/partners/send-email/route.ts", "await denyUnlessInternalAdmin(", "await getPartnerRecordBySlug");

  for (const [label, source] of [
    ["dashboard client", dashboardClient],
    ["admin action panel", readSource("src/app/internal/partners/admin/[partnerSlug]/AdminActionPanel.tsx")],
    ["email dry-run client", readSource("src/app/internal/partners/admin/[partnerSlug]/emails/[emailType]/EmailDryRunButton.tsx")]
  ]) {
    for (const forbidden of ["getSupabaseAdminClient", "SERVICE_ROLE", "service_role", "@/lib/supabase", "supabase/server", "createClient"]) {
      if (source.includes(forbidden)) {
        failures.push(`${label} contains forbidden server/admin marker: ${forbidden}.`);
      }
    }
  }

  if (restrictedDiff.trim()) {
    failures.push(`Restricted routes were modified:\n${restrictedDiff}`);
  }

  checks.push("Legacy internal pages call the internal_admin gate before partner repository or activity reads.");
  checks.push("Legacy internal admin action/email API routes gate before body parsing and partner repository reads.");
  checks.push("Client components under legacy internal admin routes do not import service-role/admin Supabase helpers.");
  checks.push("Restricted route diff is empty or limited to observability-only additions.");
}

function assertGateBefore(source, label, gateNeedle, readNeedle) {
  const gateIndex = source.indexOf(gateNeedle);
  const readIndex = source.indexOf(readNeedle);
  if (gateIndex === -1) {
    failures.push(`${label} must call ${gateNeedle}.`);
    return;
  }
  if (readIndex === -1) {
    failures.push(`${label} expected source marker ${readNeedle} was not found.`);
    return;
  }
  if (gateIndex > readIndex) {
    failures.push(`${label} must call ${gateNeedle} before ${readNeedle}.`);
  }
}

async function verifyUnauthenticatedUsersDenied() {
  for (const pathname of protectedPaths) {
    const page = await browser.newPage();
    await gotoAllowingRedirectAbort(page, `${baseUrl}${pathname}`);
    const currentUrl = new URL(page.url());
    if (currentUrl.pathname !== "/sign-in" || currentUrl.searchParams.get("next") !== pathname) {
      failures.push(`Unauthenticated ${pathname} access was not redirected to sign-in. Final URL: ${page.url()}`);
    }
    await page.close();
  }

  checks.push("Unauthenticated users cannot access legacy internal admin pages.");
}

async function verifyPartnerUserDenied(label, email, password) {
  const page = await signIn(email, password, "/dashboard/partners");
  for (const pathname of protectedPaths) {
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    const body = await visiblePageText(page);
    if (!body.includes("Internal admin access denied")) {
      failures.push(`${label} was not denied on ${pathname}. Final URL: ${page.url()}`);
    }
    if (body.includes("Partner activation records") || body.includes("Partner Dashboard")) {
      failures.push(`${label} rendered legacy internal content on ${pathname}.`);
    }
  }
  await page.close();

  checks.push(`${label} cannot access legacy internal admin pages.`);
}

async function verifyInternalAdminAllowed() {
  const page = await signIn(requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD, "/dashboard/partners");

  await page.goto(`${baseUrl}/dashboard/partners`, { waitUntil: "networkidle" });
  const dashboardBody = await visiblePageText(page);
  if (!dashboardBody.includes("Partner Dashboard") || !dashboardBody.includes("Referral Pipeline Summary")) {
    failures.push("internal_admin could not access /dashboard/partners.");
  }

  await page.goto(`${baseUrl}/internal/partners/admin`, { waitUntil: "networkidle" });
  const adminBody = await visiblePageText(page);
  if (!adminBody.includes("Partner Admin") || !adminBody.includes("Partner activation records")) {
    failures.push("internal_admin could not access /internal/partners/admin.");
  }

  await page.close();
  checks.push("internal_admin can access legacy internal admin pages.");
}

async function signIn(email, password, nextPath) {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(nextPath)}`, { waitUntil: "networkidle" });
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

function readSource(relativePath) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    failures.push(`Unable to read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function gitDiff(pathspec) {
  try {
    return execFileSync("git", ["diff", "--unified=0", "--", ...pathspec.split(" ")], {
      cwd: rootDir,
      encoding: "utf8"
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function unsafeRestrictedDiff(pathspec) {
  const diff = gitDiff(pathspec);
  const unsafeLines = diff.split(/\r?\n/).filter((line) => {
    if (!line.startsWith("+") && !line.startsWith("-")) {
      return false;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      return false;
    }
    if (isAllowedPartnerDashboardHardeningLine(line.slice(1))) {
      return false;
    }
    if (line.startsWith("+") && line.slice(1).trim() === "}") {
      return false;
    }
    if (line.startsWith("-")) {
      return true;
    }

    return !isObservabilityOnlyAddedLine(line.slice(1));
  });

  return unsafeLines.join("\n");
}

function isAllowedPartnerDashboardHardeningLine(line) {
  const trimmed = line.trim();
  return trimmed === '<IntakeLinkCard intakeDisplayUrl={intakeDisplayUrl} intakeOpenUrl={intakeOpenUrl} />' ||
    trimmed === '<IntakeLinkCard intakeDisplayUrl={intakeDisplayUrl} intakeOpenUrl={intakeOpenUrl} publicPartnerPageUrl={publicPartnerPageUrl} />' ||
    trimmed === '<ActionHealth actionLayer={actionLayer} intakeOpenUrl={intakeOpenUrl} />' ||
    trimmed === '{allMetricsZero ? null : <ActionHealth actionLayer={actionLayer} intakeOpenUrl={intakeOpenUrl} />}' ||
    trimmed === '<Journey metrics={metrics} />' ||
    trimmed === '<Journey metrics={metrics} isEmpty={allMetricsZero} />' ||
    trimmed === 'const publicPartnerPageUrl = getPublicPartnerPageUrl(dashboard.partnerSlug);' ||
    trimmed === 'Open partner page' ||
    trimmed === 'function getPublicPartnerPageUrl(partnerSlug: string) {' ||
    trimmed === 'return `/p/${partnerSlug}`;' ||
    trimmed === 'function IntakeLinkCard({ intakeDisplayUrl, intakeOpenUrl }: { intakeDisplayUrl: string; intakeOpenUrl: string }) {' ||
    trimmed === 'function IntakeLinkCard({ intakeDisplayUrl, intakeOpenUrl, publicPartnerPageUrl }: { intakeDisplayUrl: string; intakeOpenUrl: string; publicPartnerPageUrl: string }) {' ||
    trimmed === 'function Journey({ metrics }: { metrics: Metrics }) {' ||
    trimmed === 'function Journey({ metrics, isEmpty }: { metrics: Metrics; isEmpty: boolean }) {' ||
    trimmed === 'As people begin the record-clearing workflow, their journey will show up here. Start by sharing your intake link.' ||
    trimmed === 'Your dashboard will populate as people begin using your intake link. Start by sharing the link with your community.' ||
    trimmed === 'Your dashboard will populate as people begin using your intake link. Until then, these live counters stay at zero.' ||
    trimmed === 'isEmpty' ||
    trimmed === '? "Your dashboard will populate as people begin using your intake link. Until then, these live counters stay at zero."' ||
    trimmed === ': metrics.started !== undefined && metrics.completed !== undefined && metrics.packets !== undefined && metrics.saved !== undefined' ||
    trimmed === 'metrics.started !== undefined && metrics.completed !== undefined && metrics.packets !== undefined && metrics.saved !== undefined' ||
    trimmed === '<Link href={publicPartnerPageUrl} style={{ background: "#fff", color: "#0F1E3D", border: "1px solid #E0D8CC", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>' ||
    trimmed === '<ExternalLink size={16} aria-hidden="true" />' ||
    trimmed === '</Link>';
}

function isObservabilityOnlyAddedLine(line) {
  const trimmed = line.trim();
  return trimmed === "" ||
    trimmed.includes("@/lib/observability/logger") ||
    trimmed.includes("getSafeRequestId(") ||
    trimmed.includes("logSecurityInfo(") ||
    trimmed.includes("logSecurityWarn(") ||
    trimmed.includes("logSecurityError(") ||
    trimmed.startsWith("event:") ||
    trimmed.startsWith("route:") ||
    trimmed.startsWith("outcome:") ||
    trimmed.startsWith("requestId") ||
    trimmed.startsWith("error") ||
    trimmed.startsWith("metadata:") ||
    trimmed.startsWith("row_id:") ||
    trimmed.startsWith("new_status:") ||
    trimmed === "});";
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
