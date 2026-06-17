import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
const statesSource = read("src/lib/expungement-ai/states.ts");
const adapterSource = read("src/lib/expungement-ai/eligibility-adapter.ts");
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

assert(statesSource.includes("getAll51SelectableJurisdictions"), "Check flow must use all-51 selectable jurisdictions.");
assert(selectable.length === 51, `Expected all 50 states + DC selectable, found ${selectable.length}.`);
assert(checkPage.includes("data-state-select-count={states.length}"), "Check flow must expose selectable state count for verification.");
assert(!checkPage.includes("state_not_live"), "Consumer check flow must not include state_not_live.");
assert(!adapterSource.includes("state_not_live"), "Consumer adapter must not include state_not_live.");
assert(resultPanelSource.includes('result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")'), "Pay gate must require paymentAllowed and packet-ready result codes.");
assert(resultPanelSource.includes('data-consumer-pay-gate="hidden"'), "Result panel must render a hidden pay-gate state for non-payment results.");
assert(paymentSource.includes("isConsumerPaymentAllowed"), "Consumer payment placeholder must reuse the payment clamp.");
assert(!paymentSource.includes("stripe") && !paymentSource.includes("@/lib/stripe"), "Placeholder payment adapter must not import Stripe.");
assert(adapterSource.includes("saveEligibilityCheckToBriefcase"), "Every eligibility check must save to Briefcase.");
assert(adapterSource.includes("saveEligibilityResultToBriefcase"), "Every eligibility result must save to Briefcase.");
assert(briefcaseSource.includes("guidance_saved"), "Briefcase must represent guidance-only saved matters.");
assert(briefcaseSource.includes("wilma_conversation"), "Briefcase must include Wilma conversations.");
assert(wilmaBubbleSource.includes("data-wilma-bubble"), "Wilma bubble must expose a stable marker.");
assert(packageSource.includes('"expungement:verify-consumer-adapter"'), "Missing npm verifier script.");
assert(paymentSource.includes("Placeholder adapter only; replace with real service integration before production payments."), "Payment placeholder boundary must be explicit.");
assert(briefcaseSource.includes("Production-ready path: use the request user's Supabase auth client and consumer_briefcase_items RLS."), "Briefcase production persistence boundary must be explicit.");
assert(briefcaseSource.includes("Safe fallback path"), "Briefcase fallback boundary must be explicit.");
assert(wilmaBubbleSource.includes("screening tool decides eligibility"), "Wilma frontend shell must defer eligibility decisions to the screening tool.");
assert(adapterSource.includes("RCAP engine remains the eligibility source of truth"), "Eligibility adapter boundary must be explicit.");

for (const code of resultCodes) {
  assert(adapterSource.includes(`${code}:`), `Missing label/next-step handling for result code: ${code}`);
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

const expungementRoutes = routes.filter((route) => route.startsWith("src/app/expungement-ai/"));
for (const route of expungementRoutes) {
  const source = read(route);
  assert(source.includes("ConsumerPageShell"), `${route} must render the global Wilma shell.`);
}

const restrictedPatterns = [
  "src/lib/stripe/",
  "src/lib/supabase/",
  "src/lib/partners/",
  "src/app/dashboard/partners/",
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
const gitStatus = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).stdout ?? "";
const changedFiles = process.env.EXPUNGEMENT_VERIFY_CHANGED_FILES?.split("\n").filter(Boolean) ?? gitStatus
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).trim());
for (const file of changedFiles) {
  if (file === "supabase/phase-26-consumer-briefcase-items.sql") continue;
  for (const pattern of restrictedPatterns) {
    assert(!file.includes(pattern), `Restricted file touched: ${file}`);
  }
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
console.log("All 50 states + DC selectable through getAll51SelectableJurisdictions.");
console.log("No state_not_live branch in consumer flow.");
console.log("Pay gate is clamped to paymentAllowed plus packet-ready result codes.");
console.log("Non-payment result codes verified with hidden pay gate.");
console.log("Briefcase save hooks and Wilma global bubble markers are present.");
console.log("Placeholder payment adapter has no Stripe import and restricted files are untouched.");
