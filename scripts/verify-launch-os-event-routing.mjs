import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
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

assertIncludes("src/proxy.ts", [
  "routePublicProductHost",
  '"legaleasepartner.com"',
  'return pathname === "/" ? "/partners" : null',
  '"expungement.ai"',
  '"/packet-ready"',
  'return pathname === "/" ? "/static/expungement-ai/index.html" : `/expungement-ai${pathname}`',
  '"legalease.com"',
  '"legalease.law"',
  'return pathname === "/" ? "/static/legalease/index.html" : `/legalease${pathname}`',
  '"cleartherecord.org"',
  '"/internal/command-center/readiness"',
  "NextResponse.redirect(url, 307)",
  "isPassthroughPath",
  'pathname.startsWith("/api/")',
  'pathname.startsWith("/_next/")'
]);

assertIncludes("src/lib/legalease/launch-os-events.ts", [
  'sourceProduct: LaunchOsSourceProduct',
  '"legalease_os_support_items"',
  "source_product",
  "source_domain",
  "source_route",
  "partner_slug",
  "workflow_type",
  "loop_category",
  '"support_triage"',
  '"partner_followup"',
  '"rcap_intake_review"',
  '"payment_exception"',
  '"packet_exception"',
  '"waitlist_followup"',
  "redactSupportMessage",
  "sourceDomainFromRequest"
]);

assertIncludes("src/lib/legalease/correspondence.ts", [
  "sourceDomain",
  'source_product: "legalease"',
  "source_domain",
  "workflow_type",
  "waitlist_followup",
  "support_triage"
]);

assertIncludes("src/lib/expungement-ai/support-os-adapter.ts", [
  'source_product: "expungement_ai"',
  "source_domain",
  "source_route",
  "workflow_type",
  "loop_category",
  "payment_exception",
  "packet_exception",
  "support_triage"
]);

for (const route of [
  "src/app/api/legalease/contact/route.ts",
  "src/app/api/legalease/waitlist/route.ts",
  "src/app/api/expungement-ai/support/route.ts"
]) {
  assertIncludes(route, ["sourceDomainFromRequest"]);
}

assertIncludes("src/app/api/request-pilot/route.ts", [
  "createLaunchOsEvent",
  'sourceProduct: "rcap_partner"',
  'sourceRoute: "/api/request-pilot"',
  'workflowType: "partner_pilot_request"',
  'loopCategory: "partner_followup"',
  "os_mirror_failed"
]);

for (const route of [
  "src/app/api/rcap/intake/start/route.ts",
  "src/app/api/rcap/intake/complete/route.ts"
]) {
  assertIncludes(route, [
    "createLaunchOsEvent",
    'sourceProduct: "rcap_partner"',
    'loopCategory: "rcap_intake_review"',
    "sourceDomainFromRequest"
  ]);
}

assertIncludes("src/lib/expungement-ai/payment-adapter.ts", [
  "price_data",
  "unit_amount: consumerPacketPriceCents",
  "consumerPacketPriceCents = 5000",
  "assertCheckoutAllowed",
  "isConsumerPaymentAllowed",
  "packetStatus: \"ready\""
]);

for (const envName of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_APP_URL"]) {
  assert(read("scripts/verify-stripe-readiness.mjs").includes(envName), `Stripe readiness verifier missing ${envName}.`);
}

const touchedSources = [
  "src/lib/legalease/launch-os-events.ts",
  "src/lib/legalease/correspondence.ts",
  "src/lib/expungement-ai/support-os-adapter.ts",
  "src/app/api/request-pilot/route.ts",
  "src/app/api/rcap/intake/start/route.ts",
  "src/app/api/rcap/intake/complete/route.ts"
].map(read).join("\n");

for (const forbidden of ["console.log", "console.info", "console.error", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
  assert(!touchedSources.includes(forbidden), `Launch OS event routing source contains forbidden marker: ${forbidden}`);
}

if (failures.length) {
  console.error("Launch OS event routing verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch OS event routing verification passed.");
console.log("Standalone domain routing, LegalEase OS launch events, RCAP partner mirrors, and Stripe inline checkout markers are present.");
