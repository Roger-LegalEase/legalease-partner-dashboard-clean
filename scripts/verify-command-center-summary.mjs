// Verifies the canonical Command Center summary boundary and inventories every
// remaining COMMAND_CENTER_API_KEY route so a legacy authority cannot disappear
// from the security map.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  const full = path.join(rootDir, relativePath);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(relativePath, markers) {
  const source = read(relativePath);
  for (const marker of markers) {
    assert(source.includes(marker), `${relativePath} missing marker: ${marker}`);
  }
}

// 1. Summary API uses the canonical UUID-bound session guard and fails closed.
const summaryRoute = read("src/app/api/internal/analytics/summary/route.ts");
for (const marker of [
  "requireInternalAdminRouteAccess",
  "SessionPartnerError",
  "getWebAnalyticsSummary",
  "Authentication required.",
  "Internal administrator access required.",
  '{ status: unauthenticated ? 401 : 403',
  '{ status: 503 }'
]) {
  assert(summaryRoute.includes(marker), `summary route missing canonical-auth marker: ${marker}`);
}
for (const forbidden of ["COMMAND_CENTER_API_KEY", "timingSafeEqual", '"Bearer "']) {
  assert(!summaryRoute.includes(forbidden), `summary route retains competing authority: ${forbidden}`);
}

// 2. Summary aggregation groups by domain + funnels, aggregate-only (no visitor/session rows leaked).
assertIncludes("src/lib/analytics/web-analytics-repository.ts", [
  "byDomain",
  "topPages",
  "topReferrers",
  "utmCampaigns",
  "screeningStarted",
  "checkoutCompleted",
  "partnerLandingViewed",
  "aggregateSummary",
  "getWebAnalyticsSummary"
]);
// The summary must not select visitor/session/ip columns into its public output shape.
const repo = read("src/lib/analytics/web-analytics-repository.ts");
assert(!/WebAnalyticsSummary[\s\S]*ip_hash/.test(repo), "summary type must not expose ip_hash");

// 3. Dashboard page consumes the summary and is internal-admin gated.
assertIncludes("src/app/internal/command-center/web-traffic/page.tsx", [
  "getWebAnalyticsSummary",
  "resolveInternalAdminPageAccess",
  "Traffic by domain",
  "Expungement.ai funnel",
  "RCAP partner funnel"
]);

// 4. Documented response shape present in the integration doc.
assertIncludes("docs/WEB_ANALYTICS.md", [
  "/api/internal/analytics/summary",
  "UUID-bound internal-admin session",
  '"byDomain"',
  '"funnels"'
]);

// 5. The remaining API-key route is a separately inventoried aggregate-only authority.
const authorizationMap = JSON.parse(read("docs/security/rcap-internal-admin-authorization-map.json") || "{}");
const commandCenterInventory = (authorizationMap.nonInternalAuthorities ?? [])
  .filter((entry) => entry.authority === "COMMAND_CENTER_API_KEY");
const discoveredCommandCenterRoutes = findApiKeyRoutes("src/app/api", "COMMAND_CENTER_API_KEY");
assert(
  JSON.stringify(commandCenterInventory.map((entry) => entry.route).sort()) === JSON.stringify(discoveredCommandCenterRoutes.sort()),
  `COMMAND_CENTER_API_KEY inventory mismatch: map=${commandCenterInventory.map((entry) => entry.route).join(",") || "none"}; source=${discoveredCommandCenterRoutes.join(",") || "none"}`
);
assert(commandCenterInventory.length === 1, "exactly one non-internal COMMAND_CENTER_API_KEY route must be inventoried");
const metricsInventory = commandCenterInventory.find((entry) => entry.route === "GET /api/metrics/signups");
assert(Boolean(metricsInventory), "GET /api/metrics/signups is absent from the authorization inventory");
for (const [field, expected] of [
  ["aggregateOnly", true],
  ["tenantScope", "global aggregate; no tenant selector and no tenant-level breakdown"],
  ["rateLimiting", "none at the route layer"],
  ["personalDataPresent", false],
  ["partnerLevelDataPresent", false],
  ["matterDataPresent", false],
  ["paymentRecordDataPresent", false],
  ["paymentDerivedAggregatePresent", true],
  ["participantDataPresent", false],
  ["canInvokeInternalAction", false],
  ["internalAdminBoundary", false]
]) {
  assert(metricsInventory?.[field] === expected, `metrics inventory has an inaccurate ${field}`);
}
assert(Boolean(metricsInventory?.authenticationMechanism), "metrics inventory must name its authentication mechanism");
assert(Boolean(metricsInventory?.returnedDataClass), "metrics inventory must name its data class");
assert(Boolean(metricsInventory?.internalAdminBoundaryReason), "metrics inventory must explain its boundary disposition");
assert(Boolean(metricsInventory?.lifecycle), "metrics inventory must state its lifecycle/owner disposition");

const metricsRoute = read("src/app/api/metrics/signups/route.ts");
for (const marker of [
  "export async function GET",
  "process.env.COMMAND_CENTER_API_KEY",
  "timingSafeEqual",
  '{ count: "exact", head: true }',
  "registered: registered.count as number",
  "paid: paid.count as number"
]) {
  assert(metricsRoute.includes(marker), `metrics route missing aggregate-authority marker: ${marker}`);
}
assert((metricsRoute.match(/\.select\("\*", \{ count: "exact", head: true \}\)/gu) ?? []).length === 2, "metrics route must retain exactly two count-only queries");
assert(!/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/u.test(metricsRoute), "metrics API key must not authorize a mutation method");
assert(!/(rateLimit|rateLimiter|checkRateLimit|@upstash)/iu.test(metricsRoute), "inventory says no route-local rate limiting but route appears to contain one");

report("verify-command-center-summary");

function report(name) {
  if (failures.length === 0) {
    console.log(`PASS ${name}: all Command Center summary assertions passed.`);
    process.exit(0);
  }
  console.error(`FAIL ${name}: ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

function findApiKeyRoutes(relativeDirectory, environmentVariable) {
  const routes = [];
  const absoluteDirectory = path.join(rootDir, relativeDirectory);
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relative = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...findApiKeyRoutes(relative, environmentVariable));
      continue;
    }
    if (entry.name !== "route.ts") continue;
    const source = fs.readFileSync(path.join(rootDir, relative), "utf8");
    if (!source.includes(environmentVariable)) continue;
    const pathname = `/${relative.replace(/^src\/app\//u, "").replace(/\/route\.ts$/u, "")}`;
    const methods = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/gu)].map((match) => match[1]);
    if (methods.length === 0) failures.push(`${relative} uses ${environmentVariable} without an inventoried HTTP method`);
    routes.push(...methods.map((method) => `${method} ${pathname}`));
  }
  return routes;
}
