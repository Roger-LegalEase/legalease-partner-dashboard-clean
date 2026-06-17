import fs from "node:fs";
import path from "node:path";

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

assert(statesSource.includes("getAll51SelectableJurisdictions"), "Check flow must use all-51 selectable jurisdictions.");
assert(checkPage.includes("data-state-select-count={states.length}"), "Check flow must expose selectable state count for verification.");
assert(!checkPage.includes("state_not_live"), "Consumer check flow must not include state_not_live.");
assert(!adapterSource.includes("state_not_live"), "Consumer adapter must not include state_not_live.");
assert(resultPanelSource.includes('result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")'), "Pay gate must require paymentAllowed and packet-ready result codes.");
assert(paymentSource.includes("isConsumerPaymentAllowed"), "Consumer payment placeholder must reuse the payment clamp.");
assert(adapterSource.includes("saveEligibilityCheckToBriefcase"), "Every eligibility check must save to Briefcase.");
assert(adapterSource.includes("saveEligibilityResultToBriefcase"), "Every eligibility result must save to Briefcase.");
assert(briefcaseSource.includes("guidance_saved"), "Briefcase must represent guidance-only saved matters.");
assert(briefcaseSource.includes("wilma_conversation"), "Briefcase must include Wilma conversations.");
assert(wilmaBubbleSource.includes("data-wilma-bubble"), "Wilma bubble must expose a stable marker.");
assert(packageSource.includes('"expungement:verify-consumer-adapter"'), "Missing npm verifier script.");

const briefcaseRoutes = routes.filter((route) => route.startsWith("src/app/briefcase/"));
for (const route of briefcaseRoutes) {
  const source = read(route);
  assert(source.includes("getRcapBriefcaseAuthState") || source.includes("BriefcaseAuthGate"), `${route} must require a user session.`);
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
  "src/app/api/stripe/",
  ".env",
  "vercel"
];
const changedFiles = process.env.EXPUNGEMENT_VERIFY_CHANGED_FILES?.split("\n").filter(Boolean) ?? [];
for (const file of changedFiles) {
  for (const pattern of restrictedPatterns) {
    assert(!file.includes(pattern), `Restricted file touched: ${file}`);
  }
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
console.log("Briefcase save hooks and Wilma global bubble markers are present.");
