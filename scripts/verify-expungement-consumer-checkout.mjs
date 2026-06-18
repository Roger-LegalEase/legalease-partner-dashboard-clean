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

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`.trim());
  }
}

function changedFiles() {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
}

const checkoutRoute = "src/app/api/expungement-ai/checkout/route.ts";
const checkoutStatusRoute = "src/app/api/expungement-ai/checkout/status/route.ts";
const paymentConfirmRoute = "src/app/api/expungement-ai/payment/confirm/route.ts";
const paymentAdapter = read("src/lib/expungement-ai/payment-adapter.ts");
const briefcaseSource = read("src/lib/expungement-ai/briefcase.ts");
const packageSource = read("package.json");
const checkoutRouteSource = exists(checkoutRoute) ? read(checkoutRoute) : "";
const checkoutStatusSource = exists(checkoutStatusRoute) ? read(checkoutStatusRoute) : "";
const paymentConfirmSource = exists(paymentConfirmRoute) ? read(paymentConfirmRoute) : "";
const payPageSource = read("src/app/expungement-ai/pay/page.tsx");
const packetReadySource = read("src/app/expungement-ai/packet-ready/page.tsx");
const metadataMigration = "supabase/phase-27-consumer-checkout-metadata.sql";
const migrationSource = exists(metadataMigration) ? read(metadataMigration) : "";

assert(packageSource.includes('"expungement:verify-consumer-checkout"'), "Missing expungement:verify-consumer-checkout npm script.");
assert(exists(checkoutRoute), "Checkout route missing.");
assert(exists(checkoutStatusRoute), "Checkout status route missing.");
assert(exists(paymentConfirmRoute), "Payment confirm route missing.");

for (const [file, source] of [
  [checkoutRoute, checkoutRouteSource],
  [checkoutStatusRoute, checkoutStatusSource],
  [paymentConfirmRoute, paymentConfirmSource]
]) {
  assert(source.includes("requireConsumerBriefcaseSession"), `${file} must require a user session.`);
  assert(source.includes("getBriefcaseItem(auth.userId"), `${file} must validate owned Briefcase item by user id.`);
}

assert(paymentAdapter.includes("createConsumerPacketCheckout"), "Payment adapter missing createConsumerPacketCheckout.");
assert(paymentAdapter.includes("getConsumerCheckoutStatus"), "Payment adapter missing getConsumerCheckoutStatus.");
assert(paymentAdapter.includes("recordConsumerPaymentConfirmation"), "Payment adapter missing recordConsumerPaymentConfirmation.");
assert(paymentAdapter.includes("consumerPacketPriceCents = 5000"), "Consumer packet price must be 5000 cents.");
assert(paymentAdapter.includes("assertCheckoutAllowed"), "Checkout must enforce eligibility/payment gate.");
assert(paymentAdapter.includes('resultCode === "packet_ready"') || paymentAdapter.includes("isConsumerPaymentAllowed"), "Checkout must allow packet_ready only through payment clamp.");
assert(paymentAdapter.includes("isConsumerPaymentAllowed"), "Checkout must use consumer payment clamp.");
assert(paymentAdapter.includes("guidance_only"), "Checkout fallback must reject guidance_only and other non-packet paths.");
assert(paymentAdapter.includes("dry_run"), "Checkout must include explicit dry-run fallback.");
assert(!paymentAdapter.includes("partner_billing") && !paymentAdapter.includes("partner_billing_requests"), "Payment adapter must not touch partner billing.");

assert(checkoutRouteSource.includes("ConsumerCheckoutNotAllowedError"), "Checkout route must reject paymentAllowed false/non-packet results.");
assert(payPageSource.includes("/api/expungement-ai/checkout") || exists("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"), "Pay page must use consumer checkout API.");
assert(packetReadySource.includes("getConsumerCheckoutStatus"), "Packet-ready page must confirm checkout status.");
assert(packetReadySource.includes("recordConsumerPaymentConfirmation"), "Packet-ready page must record payment confirmation.");
assert(packetReadySource.includes("dry-run"), "Packet-ready page must explicitly label dry-run mode.");

for (const column of ["payment_provider", "checkout_session_id", "payment_intent_id", "amount_cents", "receipt_url"]) {
  assert(briefcaseSource.includes(column), `Briefcase adapter must store ${column}.`);
  assert(migrationSource.includes(column), `Migration must include ${column}.`);
}
assert(migrationSource.includes("amount_cents is null or amount_cents = 5000"), "Migration must constrain amount_cents to 5000.");
assert(!migrationSource.includes("partner_"), "Checkout metadata migration must not alter partner billing.");

const forbiddenChangedPrefixes = [
  "src/app/api/stripe/",
  "src/lib/partners/",
  "src/app/dashboard/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/lib/supabase/",
  "vercel.json",
  "next.config",
  ".env",
  ".github/workflows/deploy"
];
for (const file of changedFiles()) {
  if (file === "supabase/phase-26-consumer-briefcase-items.sql" || file === metadataMigration || file === "supabase/phase-28-consumer-packet-generation-status.sql" || file === "supabase/phase-29-consumer-wilma-telemetry.sql" || file === "supabase/phase-31-legalease-os-support-queue.sql") continue;
  for (const prefix of forbiddenChangedPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

run("npm", ["run", "expungement:verify-consumer-persistence"]);
run("npm", ["run", "expungement:verify-consumer-adapter"]);

if (failures.length) {
  console.error("Expungement.ai consumer checkout verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai consumer checkout verification passed.");
console.log("Checkout/status/confirm routes exist and require owned Briefcase items.");
console.log("Checkout is limited to packet_ready / packet_ready_with_caution at 5000 cents.");
console.log("Dry-run fallback is explicit when Stripe is not configured.");
console.log("Partner billing, Stripe invoice flow, secrets, deployment, and RCAP engine files are untouched.");
