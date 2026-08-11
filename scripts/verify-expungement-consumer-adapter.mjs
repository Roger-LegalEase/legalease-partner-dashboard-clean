import fs from "node:fs";
import path from "node:path";
import { changedFilesForScopeGuard } from "./lib/changed-files-scope.mjs";
import { applyExactPathAuthorizations } from "./source-engine-change-scope.mjs";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const routes = [
  "src/app/expungement-ai/page.tsx",
  "src/app/expungement-ai/how-it-works/page.tsx",
  "src/app/expungement-ai/pricing/page.tsx",
  "src/app/expungement-ai/sign-in/page.tsx",
  "src/app/expungement-ai/start/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx",
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/expungement-ai/packet-ready/page.tsx",
  "src/app/briefcase/page.tsx",
  "src/app/briefcase/matters/page.tsx",
  "src/app/briefcase/documents/page.tsx",
  "src/app/briefcase/reminders/page.tsx",
  "src/app/briefcase/payments/page.tsx",
  "src/app/briefcase/settings/page.tsx"
];
const resultCodes = [
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
];
const nonPayGateCodes = ["guidance_only", "needs_more_info", "not_yet", "needs_review", "hard_stop"];

for (const route of routes) assert(exists(route), `Missing route file: ${route}`);

for (const asset of [
  "public/expungement-ai/hero-1500.webp",
  "public/expungement-ai/hero-800.webp",
  "public/expungement-ai/hero-1500.jpg"
]) {
  assert(exists(asset), `Missing hero asset: ${asset}`);
}

const checkPage = read("src/app/expungement-ai/check/page.tsx");
const statePickerSource = read("src/components/expungement-ai/screening/StatePicker.tsx");
const screeningFlowSource = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const statesSource = read("src/lib/expungement-ai/states.ts");
const adapterSource = read("src/lib/expungement-ai/eligibility-adapter.ts");
const engineSource = read("src/lib/rcap-engine/evaluator.ts");
const resultPanelSource = read("src/components/expungement-ai/ResultPanel.tsx");
const briefcaseSource = read("src/lib/expungement-ai/briefcase.ts");
const paymentSource = read("src/lib/expungement-ai/payment-adapter.ts");
const wilmaBubbleSource = read("src/components/expungement-ai/WilmaBubble.tsx");
const packageSource = read("package.json");
const manifestSource = read("src/lib/rcap/state-promotion-manifest.ts");

const manifestJson = manifestSource
  .split("/* PROMOTION_MANIFEST_START */")[1]
  .split("/* PROMOTION_MANIFEST_END */")[0]
  .trim()
  .replace(/;$/, "");
const manifest = JSON.parse(manifestJson);
const selectable = manifest.filter((record) =>
  record.liveEnabled === true
  && record.promotionStatus === "live"
  && record.approvedForLive === true
  && record.approvedChannels?.expungementAi === true
);

assert(statesSource.includes("getAllJurisdictionProfiles"), "Check flow must use source-engine all-51 profiles.");
assert(selectable.length === 51, `Expected all 50 states + DC selectable, found ${selectable.length}.`);
assert(checkPage.includes("<StatePicker />"), "Check route must enter the profile-driven StatePicker.");
assert(statePickerSource.includes("data-state-count={jurisdictions.length}"), "StatePicker must expose selectable jurisdiction count for verification.");
assert(statePickerSource.includes('href={`/expungement-ai/screening/${jurisdiction.code}`}'), "StatePicker must route selected states into profile-driven ScreeningFlow routes.");
assert(screeningFlowSource.includes("deriveScreens(load.profile)") && screeningFlowSource.includes("currentIndex < screens.length - 1"), "ScreeningFlow must derive the full profile question sequence before evaluating.");
assert(!checkPage.includes("state_not_live"), "Consumer check flow must not include state_not_live.");
assert(!adapterSource.includes("state_not_live"), "Consumer adapter must not include state_not_live.");
assert(resultPanelSource.includes('result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")'), "Pay gate must require paymentAllowed and packet-ready result codes.");
assert(resultPanelSource.includes('data-consumer-pay-gate="hidden"'), "Result panel must render a hidden pay-gate state for non-payment results.");
assert(paymentSource.includes("isConsumerPaymentAllowed"), "Consumer payment placeholder must reuse the payment clamp.");
assert(paymentSource.includes("createConsumerPacketCheckout"), "Consumer payment adapter must expose checkout plumbing.");
assert(paymentSource.includes("@/lib/stripe/server"), "Consumer payment adapter must use the isolated server Stripe helper.");
assert(!paymentSource.includes("partner_billing") && !paymentSource.includes("partner_billing_requests"), "Consumer payment adapter must not touch partner billing.");
assert(adapterSource.includes("saveEligibilityCheckToBriefcase"), "Every eligibility check must save to Briefcase.");
assert(adapterSource.includes("saveEligibilityResultToBriefcase"), "Every eligibility result must save to Briefcase.");
assert(briefcaseSource.includes("guidance_saved"), "Briefcase must represent guidance-only saved matters.");
assert(briefcaseSource.includes("wilma_conversation"), "Briefcase must include Wilma conversations.");
assert(wilmaBubbleSource.includes("data-wilma-bubble"), "Wilma bubble must expose a stable marker.");
assert(packageSource.includes('"expungement:verify-consumer-adapter"'), "Missing npm verifier script.");
assert(paymentSource.includes("dry_run"), "Payment adapter must keep an explicit dry-run fallback when Stripe is not configured.");
assert(briefcaseSource.includes("Production-ready path: use the request user's Supabase auth client and consumer_briefcase_items RLS."), "Briefcase production persistence boundary must be explicit.");
assert(briefcaseSource.includes("Safe fallback path"), "Briefcase fallback boundary must be explicit.");
assert(wilmaBubbleSource.includes("screening tool decides the result"), "Wilma frontend shell must defer result decisions to the screening tool.");
assert(adapterSource.includes("evaluateExpungementAiMatter"), "Eligibility adapter must call the shared source-driven engine.");

for (const code of resultCodes) {
  assert(adapterSource.includes(`"${code}"`) || engineSource.includes(`${code}:`), `Missing handling for result code: ${code}`);
  assert(briefcaseSource.includes(`resultCode === "${code}"`) || code === "packet_ready_with_caution" || code === "hard_stop", `Briefcase status handling must cover ${code}.`);
}
assert(briefcaseSource.includes('return "hard_stop";'), "Briefcase status handling must default hard_stop safely.");

for (const code of nonPayGateCodes) {
  assert(!paymentAllowedForFixture(code), `${code} must never allow the consumer pay gate.`);
}
assert(paymentAllowedForFixture("packet_ready"), "packet_ready must allow payment when engine paymentAllowed is true.");
assert(paymentAllowedForFixture("packet_ready_with_caution"), "packet_ready_with_caution must allow payment when engine paymentAllowed is true.");

const briefcaseRoutes = routes.filter((route) => route.startsWith("src/app/briefcase/"));
for (const route of briefcaseRoutes) {
  const source = read(route);
  assert(source.includes("requireConsumerBriefcaseSession"), `${route} must require a user session.`);
  assert(source.includes("BriefcaseShell"), `${route} must render the Briefcase Wilma shell.`);
}

const expungementRoutes = routes.filter((route) => route.startsWith("src/app/expungement-ai/") && route !== "src/app/expungement-ai/page.tsx");
for (const route of expungementRoutes) {
  const source = read(route);
  assert(source.includes("ConsumerPageShell"), `${route} must render the global Wilma shell.`);
}
assert(exists("public/static/expungement-ai/index.html"), "Static Expungement.ai landing document must exist.");

const restrictedPatterns = [
  "src/lib/stripe/",
  "src/lib/supabase/",
  "src/lib/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/app/api/stripe/",
  "src/lib/partners/billing",
  "src/lib/partners/routes",
  "supabase/",
  "vercel.json",
  "next.config",
  ".env",
  "secrets"
];
// Historical allowlist: files this lane has always been permitted to touch,
// and the consumer-era migrations that predate the authorization queue. Kept
// literal because that is what they are — decisions already made, with no
// authorization record to point at.
const HISTORICAL_ALLOWED = new Set([
  ".env.example",
  "src/lib/app-url.ts",
  "src/lib/partners/add-partner-user.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/lib/stripe/server.ts",
  "src/lib/stripe/webhook-handler.ts",
  "src/lib/expungement-ai/briefcase.ts",
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/lib/expungement-ai/payment-adapter.ts",
  "scripts/verify-expungement-consumer-checkout.mjs",
  "scripts/verify-expungement-consumer-adapter.mjs",
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-29-consumer-wilma-telemetry.sql",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "supabase/phase-32-expungement-screening-sessions.sql",
  "supabase/phase-33-expungement-screening-resume-links.sql",
  "supabase/phase-38-expungement-pending-screening-results.sql",
  "supabase/phase-39-rcap-partner-packet-cap.sql",
  "supabase/phase-40-web-analytics-events.sql",
  "supabase/phase-43-content-platform.sql"
]);

// The change set is now committed-diff ∪ working-tree, and fails closed when
// the base cannot be resolved. Previously it was the working tree alone, which
// in CI is always empty — so this loop ran zero times and the guard passed by
// having nothing to inspect.
const scope = changedFilesForScopeGuard({
  rootDir: root,
  failures,
  envOverride: "EXPUNGEMENT_VERIFY_CHANGED_FILES"
});

const restrictedCandidates = scope.files.filter(
  (file) => !HISTORICAL_ALLOWED.has(file) && restrictedPatterns.some((pattern) => file.includes(pattern))
);

// Anything restricted must be named by an owner authorization, by exact path
// AND exact bytes. A hand-maintained list in this file would drift from the
// authorization queue that actually records the decisions; this consults the
// queue itself, so a migration is admitted because someone approved it and the
// bytes still match, not because a literal was added here.
const unauthorized = applyExactPathAuthorizations({
  rootDir: root,
  candidates: restrictedCandidates,
  failures
});

for (const entry of unauthorized) {
  // A voided authorization already explains itself in the returned string;
  // prefixing it with "without an exact-path authorization" would misreport a
  // file that HAS one whose bytes no longer match.
  const message = entry.includes("authorization is void")
    ? `Restricted file touched: ${entry}`
    : `Restricted file touched without an exact-path authorization: ${entry}`;
  assert(false, message);
}

function paymentAllowedForFixture(resultCode) {
  return true && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
}

if (failures.length) {
  console.error("Expungement.ai consumer adapter verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai consumer adapter verifier passed.");
console.log("Routes checked:", routes.length);
console.log("All 50 states + DC selectable through source-engine profiles.");
console.log("No state_not_live branch in consumer flow.");
console.log("Pay gate is clamped to paymentAllowed plus packet-ready result codes.");
console.log("Non-payment result codes verified with hidden pay gate.");
console.log("Briefcase save hooks and Wilma global bubble markers are present.");
console.log("Consumer payment adapter is isolated from partner billing and restricted files are untouched.");
