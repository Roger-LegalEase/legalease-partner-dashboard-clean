// Verifies the Command Center web-traffic summary API + dashboard: canonical internal-admin
// protection, aggregate grouping by domain, the documented response shape, and dashboard use.

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
