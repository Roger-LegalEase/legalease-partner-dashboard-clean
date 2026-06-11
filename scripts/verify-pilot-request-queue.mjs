import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PARTNER_PILOT_QUEUE_VERIFY_PORT ?? 3158);
const baseUrl = `http://127.0.0.1:${port}`;
const queuePath = "/internal/pilot-requests";
const updatePath = "/api/internal/pilot-requests/status";
const failures = [];
const checks = [];
const skipped = [];

loadLocalEnv();

const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
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
    failures.push(`${key} is required for pilot request queue verification.`);
  }
}

verifySourceShape();

let server;
let browser;
let testRequestId;

try {
  if (failures.length === 0) {
    testRequestId = await createTestPilotRequest();
    server = await startNextServer();
    browser = await chromium.launch({ headless: true });
    await verifyUnauthenticatedAccess(testRequestId);
    await verifyPartnerUserDenied("partner_admin", requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD, testRequestId);
    if (optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL && optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD) {
      await verifyPartnerUserDenied("partner_staff", optionalEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, optionalEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD, testRequestId);
    } else {
      skipped.push("Partner staff fixture env was not present; partner_staff browser denial check skipped.");
    }
    await verifyInternalAdminAccess(testRequestId);
  }
} finally {
  if (browser) {
    await browser.close();
  }
  if (server) {
    server.kill("SIGTERM");
  }
  if (testRequestId) {
    await deleteTestPilotRequest(testRequestId);
  }
}

if (failures.length > 0) {
  console.error("Pilot request queue verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Pilot request queue verification passed.");
for (const check of checks) {
  console.log(`PASS: ${check}`);
}
for (const skip of skipped) {
  console.log(`SKIP: ${skip}`);
}

function verifySourceShape() {
  const pageSource = readSource("src/app/internal/pilot-requests/page.tsx");
  const repositorySource = readSource("src/lib/partners/pilot-requests.ts");
  const routeSource = readSource("src/app/api/internal/pilot-requests/status/route.ts");
  const clientSource = readSource("src/app/internal/pilot-requests/PilotRequestStatusControl.tsx");
  const migrationSource = readSource("supabase/phase-23-partner-pilot-requests.sql");
  const dashboardDiff = unsafeRestrictedDiff("src/app/partner/dashboard src/app/p/we-must-vote src/app/intake/we-must-vote");

  if (!pageSource.includes("listPilotRequestsForInternalAdmin")) {
    failures.push("Pilot request queue page must load through the gated internal-admin repository.");
  }

  if (!repositorySource.includes("requireInternalAdminSession()")) {
    failures.push("Pilot request repository must call requireInternalAdminSession().");
  }

  const gateIndex = repositorySource.indexOf("requireInternalAdminSession()");
  const adminIndex = repositorySource.indexOf("getSupabaseAdminClient()");
  if (gateIndex === -1 || adminIndex === -1 || gateIndex > adminIndex) {
    failures.push("Pilot request repository must enforce internal_admin before service-role data access.");
  }

  if (!routeSource.includes("updatePilotRequestStatusForInternalAdmin") || !routeSource.includes("SessionPartnerError")) {
    failures.push("Pilot request status route must use the gated update helper and handle session authorization failures.");
  }

  for (const forbidden of ["getSupabaseAdminClient", "SERVICE_ROLE", "service_role", "@/lib/supabase", "supabase/server", "createClient"]) {
    if (clientSource.includes(forbidden)) {
      failures.push(`Pilot request client component includes forbidden server/admin marker: ${forbidden}.`);
    }
  }

  for (const forbidden of ["create policy", "alter policy", "drop policy", " grant ", "anon", "authenticated"]) {
    if (migrationSource.toLowerCase().includes(forbidden)) {
      failures.push(`partner_pilot_requests migration includes forbidden policy/grant marker: ${forbidden}.`);
    }
  }

  if (dashboardDiff.trim()) {
    failures.push(`Restricted routes were modified:\n${dashboardDiff}`);
  }

  checks.push("Source gate shape requires internal_admin before partner_pilot_requests service-role data access.");
  checks.push("Client pilot request queue component has no service-role/admin Supabase imports.");
  checks.push("partner_pilot_requests migration still has no public/anon/authenticated policies.");
  checks.push("Restricted route diff is empty or limited to observability-only additions.");
}

async function verifyUnauthenticatedAccess(id) {
  const page = await browser.newPage();
  await gotoAllowingRedirectAbort(page, `${baseUrl}${queuePath}`);
  const currentUrl = new URL(page.url());
  if (currentUrl.pathname !== "/sign-in" || currentUrl.searchParams.get("next") !== queuePath) {
    failures.push(`Unauthenticated queue access was not redirected to sign-in. Final URL: ${page.url()}`);
  }
  await page.close();

  const response = await fetch(`${baseUrl}${updatePath}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, status: "reviewed" })
  });
  if (response.status !== 401) {
    failures.push(`Unauthenticated status update returned ${response.status}, expected 401.`);
  }

  checks.push("Unauthenticated user cannot load or update pilot requests.");
}

async function verifyPartnerUserDenied(label, email, password, id) {
  const page = await signIn(email, password, queuePath);
  await page.goto(`${baseUrl}${queuePath}`, { waitUntil: "networkidle" });
  const body = await visiblePageText(page);
  if (!body.includes("Internal admin access required")) {
    failures.push(`${label} could load the pilot request queue.`);
  }

  const updateStatus = await postStatusFromPage(page, id, "qualified");
  if (updateStatus !== 403) {
    failures.push(`${label} status update returned ${updateStatus}, expected 403.`);
  }
  await page.close();

  checks.push(`${label} cannot load or update pilot requests.`);
}

async function verifyInternalAdminAccess(id) {
  const page = await signIn(requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD, queuePath);
  await page.goto(`${baseUrl}${queuePath}`, { waitUntil: "networkidle" });
  const body = await visiblePageText(page);
  for (const marker of ["Partner Leads / Pilot Requests", "LegalEase 6C Verification", "pilot-queue-verifier-", "Mississippi record clearing / RCAP"]) {
    if (!body.includes(marker)) {
      failures.push(`Internal admin queue is missing marker: ${marker}.`);
    }
  }

  const invalidStatus = await postStatusFromPage(page, id, "invalid_status");
  if (invalidStatus !== 400) {
    failures.push(`Internal admin invalid status update returned ${invalidStatus}, expected 400.`);
  }

  const validStatus = await postStatusFromPage(page, id, "reviewed");
  if (validStatus !== 200) {
    failures.push(`Internal admin valid status update returned ${validStatus}, expected 200.`);
  }

  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from("partner_pilot_requests")
    .select("status")
    .eq("id", id)
    .single();
  if (error || data?.status !== "reviewed") {
    failures.push(`Internal admin status update did not persist reviewed status: ${error?.message ?? data?.status}`);
  }

  await page.close();
  checks.push("Internal admin can load pilot request queue and update status.");
  checks.push("Invalid status values are rejected server-side.");
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

async function postStatusFromPage(page, id, status) {
  return page.evaluate(
    async ({ updatePath, id, status }) => {
      const response = await fetch(updatePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      return response.status;
    },
    { updatePath, id, status }
  );
}

async function createTestPilotRequest() {
  const adminClient = getAdminClient();
  const unique = Date.now();
  const { data, error } = await adminClient
    .from("partner_pilot_requests")
    .insert({
      contact_name: "Queue Verifier",
      organization_name: "LegalEase 6C Verification",
      email: `pilot-queue-verifier-${unique}@legalease.test`,
      phone: "555-0100",
      role_title: "Verifier",
      organization_type: "Community nonprofit",
      state_or_jurisdiction: "Mississippi",
      community_served: "Verifier-created row for internal admin queue access testing.",
      estimated_people_served: "100",
      interested_workflow: "Mississippi record clearing / RCAP",
      message: "This row is created and deleted by scripts/verify-pilot-request-queue.mjs.",
      consent_to_contact: true,
      source: "verification",
      status: "new"
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to create pilot request verifier row: ${error?.message ?? "missing id"}`);
  }

  return data.id;
}

async function deleteTestPilotRequest(id) {
  const adminClient = getAdminClient();
  await adminClient.from("partner_pilot_requests").delete().eq("id", id);
}

function getAdminClient() {
  return createClient(requiredEnv.NEXT_PUBLIC_SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
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

function canReachServer(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
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
  return page.locator("body").innerText().catch(() => "");
}

function gitDiff(paths) {
  return execFileSync("git", ["diff", "--unified=0", "--", ...paths.split(" ")], {
    cwd: rootDir,
    encoding: "utf8"
  });
}

function unsafeRestrictedDiff(paths) {
  const diff = gitDiff(paths);
  const unsafeLines = diff.split(/\r?\n/).filter((line) => {
    if (!line.startsWith("+") && !line.startsWith("-")) {
      return false;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      return false;
    }
    if (line.startsWith("-")) {
      return true;
    }

    return !isObservabilityOnlyAddedLine(line.slice(1));
  });

  return unsafeLines.join("\n");
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
    trimmed === "});" ||
    trimmed === "});";
}

function readSource(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
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
