import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(rootDir, "src/app/partner/dashboard/page.tsx");
const repositoryPath = path.join(rootDir, "src/lib/partners/partner-dashboard-rls-repository.ts");
const resolverPath = path.join(rootDir, "src/lib/partners/session-partner.ts");
const proxyPath = path.join(rootDir, "src/proxy.ts");
const rcapProfilesRlsMigrationPath = path.join(rootDir, "supabase/phase-22-enable-rls-rcap-user-profiles.sql");
const port = Number(process.env.PARTNER_DASHBOARD_RLS_VERIFY_PORT ?? 3137);
let baseUrl = `http://127.0.0.1:${port}`;

loadLocalEnv();

const failures = [];
const checks = [];
const skipped = [];
const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
for (const check of checks) {
  console.log(`PASS: ${check}`);
}
for (const skip of skipped) {
  console.log(`SKIP: ${skip}`);
}

function verifySourceShape() {
  const routeSource = readSource(routePath);
  const repositorySource = readSource(repositoryPath);
  const resolverSource = readSource(resolverPath);
  const proxySource = readSource(proxyPath);
  const rcapProfilesRlsMigrationSource = readSource(rcapProfilesRlsMigrationPath);

  if (fs.existsSync(path.join(rootDir, "src/app/partner/dashboard/[partnerSlug]"))) {
    failures.push("/partner/dashboard must not have a [partnerSlug] dynamic route.");
  }

  const partnerDashboardFiles = listFiles(path.join(rootDir, "src/app/partner"));
  const unexpectedPartnerDashboardRoutes = partnerDashboardFiles.filter((file) => {
    const relative = path.relative(path.join(rootDir, "src/app/partner"), file);
    return relative.includes("dashboard") && relative !== "dashboard/page.tsx";
  });
  if (unexpectedPartnerDashboardRoutes.length > 0) {
    failures.push(`/partner/dashboard must remain the only authenticated partner cockpit route. Found: ${unexpectedPartnerDashboardRoutes.map((file) => path.relative(rootDir, file)).join(", ")}`);
  }

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

  if (!resolverSource.includes("supabase.auth.getUser()") || !resolverSource.includes(".eq(\"auth_user_id\", userData.user.id)")) {
    failures.push("Session partner resolver must derive partner identity from the authenticated Supabase user only.");
  }

  for (const banned of ["getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "request.body", "searchParams", "headers()", "localStorage"]) {
    if (resolverSource.includes(banned)) {
      failures.push(`Session partner resolver must not reference ${banned}.`);
    }
  }

  if (!proxySource.includes('"/p/we-must-vote"') || !proxySource.includes('"/partner/dashboard"')) {
    failures.push("Proxy must preserve /p/we-must-vote and include /partner/dashboard session refresh.");
  }

  if (!rcapProfilesRlsMigrationSource.includes("alter table public.rcap_user_profiles enable row level security;")) {
    failures.push("rcap_user_profiles RLS migration must remain recorded.");
  }

  const dashboardSources = `${routeSource}\n${repositorySource}\n${resolverSource}`;
  if (dashboardSources.includes("rcap_user_profiles")) {
    failures.push("Partner dashboard read path must not reference or rely on rcap_user_profiles.");
  }

  const mississippiResourceMatches = routeSource.match(/"\/resources\/mississippi\/[^"]+"/g) ?? [];
  const absoluteMississippiResourceMatches = routeSource.match(/"https?:\/\/[^"]*\/resources\/mississippi\/[^"]+"/g) ?? [];
  if (mississippiResourceMatches.length < 3 || absoluteMississippiResourceMatches.length > 0) {
    failures.push("Commit 4 Mississippi resource links must remain relative /resources/mississippi/... paths.");
  }
  if (/github\.dev|codespaces/i.test(routeSource)) {
    failures.push("Partner dashboard must not hardcode github.dev or Codespaces resource URLs.");
  }

  checks.push("Route shape and identity source are parameterless and session-derived.");
  checks.push("Service-role/admin client is absent from the dashboard route, resolver, and RLS repository.");
  checks.push("rcap_user_profiles RLS migration is present and the dashboard does not rely on rcap_user_profiles.");
  checks.push("Commit 4 Mississippi resource links remain relative and contain no github.dev/Codespaces URLs.");
}

async function verifyHttpIsolation() {
  await assertUnauthenticatedRedirect();

  const wmvRls = await loadRlsSnapshot({
    label: "We Must Vote partner admin",
    email: requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL,
    password: requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD,
    expectedSlug: "we-must-vote",
    expectedRole: "partner_admin",
    forbiddenSlug: "demo-partner"
  });
  const demoRls = await loadRlsSnapshot({
    label: "Demo partner staff",
    email: requiredEnv.PARTNER_RLS_DEMO_STAFF_EMAIL,
    password: requiredEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD,
    expectedSlug: "demo-partner",
    expectedRole: "partner_staff",
    forbiddenSlug: "we-must-vote"
  });

  const wmv = await signIn(requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD);
  await assertPartnerDashboard(wmv, {
    label: "We Must Vote partner admin",
    expected: wmvRls,
    forbidden: demoRls
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expected: wmvRls,
    forbidden: demoRls,
    attempt: "?partner_slug=demo-partner",
    query: "partner_slug=demo-partner"
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expected: wmvRls,
    forbidden: demoRls,
    attempt: "?partnerSlug=demo-partner",
    query: "partnerSlug=demo-partner"
  });
  await assertBypassIgnored(wmv, {
    label: "We Must Vote partner admin",
    expected: wmvRls,
    forbidden: demoRls,
    attempt: "x-partner-slug: demo-partner",
    headers: { "x-partner-slug": "demo-partner", "x-legalease-partner-slug": "demo-partner" }
  });
  await assertSlugPathNotAccepted(wmv, {
    label: "We Must Vote partner admin",
    forbiddenSlug: "demo-partner"
  });
  await wmv.close();

  const demo = await signIn(requiredEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, requiredEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD);
  await assertPartnerDashboard(demo, {
    label: "Demo partner staff",
    expected: demoRls,
    forbidden: wmvRls
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expected: demoRls,
    forbidden: wmvRls,
    attempt: "?partner_slug=we-must-vote",
    query: "partner_slug=we-must-vote"
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expected: demoRls,
    forbidden: wmvRls,
    attempt: "?partnerSlug=we-must-vote",
    query: "partnerSlug=we-must-vote"
  });
  await assertBypassIgnored(demo, {
    label: "Demo partner staff",
    expected: demoRls,
    forbidden: wmvRls,
    attempt: "x-partner-slug: we-must-vote",
    headers: { "x-partner-slug": "we-must-vote", "x-legalease-partner-slug": "we-must-vote" }
  });
  await assertSlugPathNotAccepted(demo, {
    label: "Demo partner staff",
    forbiddenSlug: "we-must-vote"
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

  checks.push("Unauthenticated access redirects to /sign-in?next=/partner/dashboard.");
  checks.push("Internal admin redirects to /dashboard/partners and no-partner authenticated access is denied.");
  checks.push("Two real partner sessions reached /partner/dashboard through the app sign-in path.");
  checks.push("Rendered dashboard aggregates match direct authenticated RLS reads for both partners.");
  checks.push("Query, header, and slug-path identity tampering did not change the resolved partner.");
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

async function assertPartnerDashboard(page, { label, expected, forbidden }) {
  if (!page.url().startsWith(`${baseUrl}/partner/dashboard`)) {
    failures.push(`${label} did not land on /partner/dashboard after sign-in. Final URL: ${page.url()}`);
    return;
  }

  const resolvedSlug = await page.locator("main").getAttribute("data-partner-dashboard-slug").catch(() => null);
  const resolvedRole = await page.locator("main").getAttribute("data-partner-dashboard-role").catch(() => null);
  const body = await visiblePageText(page);
  if (resolvedSlug !== expected.slug) {
    failures.push(`${label} dashboard did not show expected partner slug ${expected.slug}.`);
  }
  if (resolvedRole !== expected.role) {
    failures.push(`${label} dashboard did not show expected role ${expected.role}.`);
  }
  assertDashboardBodyMatchesSnapshot(body, label, expected, forbidden);
}

function assertDashboardBodyMatchesSnapshot(body, label, expected, forbidden) {
  if (!visibleTextContains(body, `Welcome back, ${expected.partnerLabel}`)) {
    failures.push(`${label} dashboard did not render expected partner label ${expected.partnerLabel}.`);
  }
  if (visibleTextContains(body, `Welcome back, ${forbidden.partnerLabel}`) || visibleTextContains(body, `/intake/${forbidden.slug}`)) {
    failures.push(`${label} dashboard rendered forbidden partner identity from ${forbidden.slug}.`);
  }

  const allExpectedAggregatesZero =
    expected.intake.totalSessions === 0 &&
    expected.intake.completedSessions === 0 &&
    expected.documents.totalPackets === 0 &&
    expected.briefcaseItems === 0;
  const expectedMetricFragments = allExpectedAggregatesZero
    ? [`${formatMetric(expected.intake.totalSessions)}\nstarted`, `${formatMetric(expected.intake.completedSessions)}\ncompleted`, `${formatMetric(expected.documents.totalPackets)}\npackets`, `${formatMetric(expected.briefcaseItems)}\nsaved`]
    : [`${formatMetric(expected.intake.totalSessions)}\npeople started`, `${formatMetric(expected.intake.completedSessions)}\ncompleted intake`, `${formatMetric(expected.documents.totalPackets)}\npackets ready`];
  const expectedFragments = [
    ...expectedMetricFragments,
    `Started ${formatMetric(expected.intake.totalSessions)}`,
    `Completed ${formatMetric(expected.intake.completedSessions)}`,
    `Packet ${formatMetric(expected.documents.totalPackets)}`,
    `Saved ${formatMetric(expected.briefcaseItems)}`
  ];

  for (const fragment of expectedFragments) {
    if (!visibleTextContains(body, fragment)) {
      failures.push(`${label} dashboard did not render expected RLS-backed aggregate: ${fragment.replace(/\n/g, " ")}.`);
    }
  }

  const allForbiddenAggregatesZero =
    forbidden.intake.totalSessions === 0 &&
    forbidden.intake.completedSessions === 0 &&
    forbidden.documents.totalPackets === 0 &&
    forbidden.briefcaseItems === 0;
  const forbiddenMetricFragments = allForbiddenAggregatesZero
    ? [`${formatMetric(forbidden.intake.totalSessions)}\nstarted`, `${formatMetric(forbidden.intake.completedSessions)}\ncompleted`, `${formatMetric(forbidden.documents.totalPackets)}\npackets`, `${formatMetric(forbidden.briefcaseItems)}\nsaved`]
    : [`${formatMetric(forbidden.intake.totalSessions)}\npeople started`, `${formatMetric(forbidden.intake.completedSessions)}\ncompleted intake`, `${formatMetric(forbidden.documents.totalPackets)}\npackets ready`];
  const forbiddenFragments = [
    ...forbiddenMetricFragments,
    `Started ${formatMetric(forbidden.intake.totalSessions)}`,
    `Completed ${formatMetric(forbidden.intake.completedSessions)}`,
    `Packet ${formatMetric(forbidden.documents.totalPackets)}`,
    `Saved ${formatMetric(forbidden.briefcaseItems)}`
  ];

  if (!snapshotsHaveSameVisibleAggregates(expected, forbidden)) {
    const distinctiveForbiddenFragments = forbiddenFragments.filter((fragment) => {
      return !fragment.startsWith("0\n") && !fragment.endsWith(" 0");
    });

    if (distinctiveForbiddenFragments.length === 0) {
      skipped.push(`${label} forbidden aggregate absence by visible number: ${forbidden.slug} currently has only zero-value visible aggregates.`);
      return;
    }

    for (const fragment of distinctiveForbiddenFragments) {
      if (visibleTextContains(body, fragment)) {
        failures.push(`${label} dashboard rendered forbidden RLS-backed aggregate from ${forbidden.slug}: ${fragment.replace(/\n/g, " ")}.`);
      }
    }
  } else {
    skipped.push(`${label} forbidden aggregate absence by visible number: ${expected.slug} and ${forbidden.slug} currently have identical visible aggregate counts.`);
  }
}

async function assertBypassIgnored(page, { label, expected, forbidden, attempt, query, headers = {} }) {
  await page.setExtraHTTPHeaders(headers);
  const url = query ? `${baseUrl}/partner/dashboard?${query}` : `${baseUrl}/partner/dashboard`;
  await gotoAllowingRedirectAbort(page, url);
  const resolvedSlug = await page.locator("main").getAttribute("data-partner-dashboard-slug").catch(() => null);
  const resolvedRole = await page.locator("main").getAttribute("data-partner-dashboard-role").catch(() => null);
  const body = await visiblePageText(page);
  if (resolvedSlug !== expected.slug) {
    failures.push(`${label} bypass attempt ${attempt} did not preserve expected partner slug ${expected.slug}.`);
  }
  if (resolvedRole !== expected.role) {
    failures.push(`${label} bypass attempt ${attempt} did not preserve expected role ${expected.role}.`);
  }
  assertDashboardBodyMatchesSnapshot(body, `${label} bypass attempt ${attempt}`, expected, forbidden);
  await page.setExtraHTTPHeaders({});
}

async function assertSlugPathNotAccepted(page, { label, forbiddenSlug }) {
  const response = await gotoAllowingRedirectAbort(page, `${baseUrl}/partner/dashboard/${forbiddenSlug}`);
  const resolvedSlug = await page.locator("main").getAttribute("data-partner-dashboard-slug").catch(() => null);
  const body = await page.locator("body").innerText().catch(() => "");

  if (response?.status() !== 404 && resolvedSlug === forbiddenSlug) {
    failures.push(`${label} slug-path tampering resolved forbidden partner slug ${forbiddenSlug}.`);
  }
  if (body?.includes(`data-partner-dashboard-slug="${forbiddenSlug}"`)) {
    failures.push(`${label} slug-path tampering exposed forbidden dashboard markup for ${forbiddenSlug}.`);
  }
}

async function loadRlsSnapshot({ label, email, password, expectedSlug, expectedRole, forbiddenSlug }) {
  const client = createClient(requiredEnv.NEXT_PUBLIC_SUPABASE_URL, requiredEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.user) {
    failures.push(`${label} direct RLS sign-in failed: ${signInError?.message ?? "No user returned."}`);
  }

  const role = await rpcValue(client, "current_partner_role");
  const slug = await rpcValue(client, "current_partner_slug");
  if (slug !== expectedSlug) {
    failures.push(`${label} direct RLS resolved partner slug ${String(slug)} instead of ${expectedSlug}.`);
  }
  if (role !== expectedRole) {
    failures.push(`${label} direct RLS resolved role ${String(role)} instead of ${expectedRole}.`);
  }

  await assertOnlyOwnRows(client, label, "partner_records", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "partner_metrics", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "partner_assets", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "partner_events", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "rcap_intake_sessions", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "rcap_document_packets", expectedSlug, forbiddenSlug);
  await assertOnlyOwnRows(client, label, "rcap_briefcase_items", expectedSlug, forbiddenSlug);

  const [partner, intakeRows, documentRows, briefcaseItems] = await Promise.all([
    selectMaybeSingle(client, label, "partner_records", "partner_slug, partner_name, organization_name, service_area"),
    selectRows(client, label, "rcap_intake_sessions", "status, eligibility_signal, created_at, completed_at"),
    selectRows(client, label, "rcap_document_packets", "status, created_at"),
    countRows(client, label, "rcap_briefcase_items")
  ]);

  return {
    slug: expectedSlug,
    role: expectedRole,
    partnerLabel: getPartnerDisplayLabel(expectedSlug, partner),
    intake: summarizeIntake(intakeRows),
    documents: summarizeDocuments(documentRows),
    briefcaseItems
  };
}

async function assertOnlyOwnRows(client, label, table, ownSlug, otherSlug) {
  const { data: ownRows, error: ownError } = await client.from(table).select("partner_slug").eq("partner_slug", ownSlug);
  if (ownError) {
    if (isMissingOptionalTable(ownError)) {
      skipped.push(`${label} ${table}: table does not exist in this environment.`);
      return;
    }
    failures.push(`${label} could not read own ${table} rows: ${ownError.message}`);
    return;
  }

  if ((ownRows ?? []).some((row) => row.partner_slug !== ownSlug)) {
    failures.push(`${label} received non-own ${table} rows while querying ${ownSlug}.`);
  }

  const { data: otherRows, error: otherError } = await client.from(table).select("partner_slug").eq("partner_slug", otherSlug);
  if (otherError) {
    failures.push(`${label} other-partner ${table} query errored instead of returning no rows: ${otherError.message}`);
    return;
  }

  if ((otherRows ?? []).length !== 0) {
    failures.push(`${label} could read ${otherRows.length} ${table} row(s) for ${otherSlug}.`);
  }
}

async function rpcValue(client, functionName) {
  const { data, error } = await client.rpc(functionName);
  if (error) {
    failures.push(`${functionName} RPC failed: ${error.message}`);
    return undefined;
  }

  return data;
}

async function selectMaybeSingle(client, label, table, columns) {
  const { data, error } = await client.from(table).select(columns).maybeSingle();
  if (error) {
    failures.push(`${label} could not read ${table}: ${error.message}`);
    return null;
  }

  return data;
}

async function selectRows(client, label, table, columns) {
  const { data, error } = await client.from(table).select(columns).order("created_at", { ascending: false }).limit(250);
  if (error) {
    failures.push(`${label} could not read ${table}: ${error.message}`);
    return [];
  }

  return data ?? [];
}

async function countRows(client, label, table) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) {
    failures.push(`${label} could not count ${table}: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

function summarizeIntake(rows) {
  return {
    totalSessions: rows.length,
    completedSessions: rows.filter((row) => row.status === "completed" || Boolean(row.completed_at)).length
  };
}

function summarizeDocuments(rows) {
  return {
    totalPackets: rows.length
  };
}

function getPartnerDisplayLabel(partnerSlug, partner) {
  if (partnerSlug === "we-must-vote") {
    return "We Must Vote";
  }

  return partner?.organization_name ?? partner?.partner_name ?? toTitleCase(partnerSlug);
}

function snapshotsHaveSameVisibleAggregates(left, right) {
  return left.intake.totalSessions === right.intake.totalSessions &&
    left.intake.completedSessions === right.intake.completedSessions &&
    left.documents.totalPackets === right.documents.totalPackets &&
    left.briefcaseItems === right.briefcaseItems;
}

function isMissingOptionalTable(error) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message ?? "");
}

function visibleTextContains(body, fragment) {
  return normalizeVisibleText(body).includes(normalizeVisibleText(fragment));
}

function normalizeVisibleText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

async function visiblePageText(page) {
  return page.locator("main").innerText().catch(() => page.locator("body").innerText());
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

  checks.push("/p/we-must-vote proxy marker regression passed.");
  checks.push("Public We Must Vote intake/document smoke passed.");
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

function readSource(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    failures.push(`Unable to read ${path.relative(rootDir, file)}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }

    return [entryPath];
  });
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

function toTitleCase(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatMetric(value) {
  return Math.round(value).toLocaleString();
}
