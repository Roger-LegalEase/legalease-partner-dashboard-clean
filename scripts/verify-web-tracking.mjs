// Verifies the first-party web analytics tracking pipeline is installed across all three product
// surfaces and that the ingestion route validates event names. Static source assertions (the repo
// has no TS runtime loader), mirroring scripts/verify-launch-os-event-routing.mjs.

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

// 1. Tracker rides the root layout → every rendered React surface (expungement.ai, legalease.com
//    React pages, legaleasepartner.com).
assertIncludes("src/app/layout.tsx", [
  "WebAnalyticsTracker",
  "<WebAnalyticsTracker />"
]);
assertIncludes("src/components/analytics/WebAnalyticsTracker.tsx", [
  '"use client"',
  "usePathname",
  "trackPageview"
]);

// 2. Product-surface mapping covers all three surfaces + host aliases.
assertIncludes("src/lib/analytics/product-surface.ts", [
  '"expungement_ai"',
  '"legalease"',
  '"legalease_partner"',
  '"expungement.ai"',
  '"legalease.com"',
  '"legalease.law"',
  '"legaleasepartner.com"',
  "productSurfaceForHost"
]);

// 3. legalease.com static homepage (not a React page) carries its own beacon.
assertIncludes("public/static/legalease/index.html", [
  "/api/analytics/web",
  '"pageview"',
  '"legalease"',
  "le_vid",
  "le_sid"
]);

// 4. Ingestion route validates event names + derives surface from Host, never blocks.
assertIncludes("src/app/api/analytics/web/route.ts", [
  "buildWebAnalyticsRow",
  "recordWebAnalyticsEvent",
  "x-forwarded-host",
  "built.reason",
  "status: 400",
  "status: 204"
]);
assertIncludes("src/lib/analytics/build-event.ts", [
  "isAllowedEventName",
  'reason: "invalid_event_name"',
  "productSurfaceForHost"
]);
assertIncludes("src/lib/analytics/event-names.ts", [
  '"pageview"',
  '"screening_started"',
  '"checkout_completed"',
  '"partner_landing_viewed"',
  "isAllowedEventName"
]);

// 5. DTC funnel instrumentation carries the expungement_ai surface; partner carries legalease_partner.
assertIncludes("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx", [
  "trackFunnelEvent",
  '"checkout_started"',
  '"expungement_ai"'
]);
assertIncludes("src/components/expungement-ai/screening/ScreeningFlow.tsx", [
  '"screening_started"',
  '"screening_result_viewed"',
  '"partner_screening_started"',
  '"partner_result_viewed"'
]);
assertIncludes("src/app/p/[partnerSlug]/page.tsx", [
  "FunnelBeacon",
  '"partner_landing_viewed"',
  '"legalease_partner"'
]);
assertIncludes("src/app/intake/[partnerSlug]/page.tsx", [
  "FunnelBeacon",
  '"partner_intake_started"'
]);

// 6. Server-confirmed checkout completion (not client-trusted).
assertIncludes("src/app/api/expungement-ai/payment/confirm/route.ts", [
  "recordServerFunnelEvent",
  '"checkout_completed"',
  "status.paid"
]);

report("verify-web-tracking");

function report(name) {
  if (failures.length === 0) {
    console.log(`PASS ${name}: all web tracking assertions passed.`);
    process.exit(0);
  }
  console.error(`FAIL ${name}: ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
