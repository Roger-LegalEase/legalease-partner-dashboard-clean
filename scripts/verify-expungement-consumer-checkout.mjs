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
const stripeServer = read("src/lib/stripe/server.ts");
const stripeWebhookRoute = read("src/app/api/stripe/webhook/route.ts");
const stripeWebhookHandler = read("src/lib/stripe/webhook-handler.ts");
const legacyStripeWebhookRoute = "src/app/api/method/expungement.api.payment.stripe_webhook/route.ts";
const legacyStripeWebhookSource = exists(legacyStripeWebhookRoute) ? read(legacyStripeWebhookRoute) : "";
const checkoutReconciliation = read("src/lib/expungement-ai/checkout-reconciliation.ts");
const briefcaseSource = read("src/lib/expungement-ai/briefcase.ts");
const packageSource = read("package.json");
const envExampleSource = read(".env.example");
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
assert(paymentAdapter.includes("isConsumerCheckoutDryRunEnabled"), "Checkout must gate dry-run through an explicit helper.");
assert(paymentAdapter.includes('EXPUNGEMENT_AI_CHECKOUT_DRY_RUN === "true"'), "Dry-run checkout must require EXPUNGEMENT_AI_CHECKOUT_DRY_RUN=true.");
assert(paymentAdapter.includes("!isProductionRuntime()"), "Dry-run checkout must be impossible in production runtime.");
assert(paymentAdapter.includes("ConsumerCheckoutTemporarilyUnavailableError"), "Missing Stripe config must fail closed with a temporary-unavailable error.");
assert(!/payment_status:\s*["']paid["']/.test(paymentAdapter), "The payment adapter must not write a paid payment status; the server-only writer owns that.");
assert(!paymentAdapter.includes("updateBriefcasePaymentMetadata("), "The participant-authenticated payment writer must not return; phase 52 revokes those columns from authenticated.");
assert(!paymentAdapter.includes("partner_billing") && !paymentAdapter.includes("partner_billing_requests"), "Payment adapter must not touch partner billing.");

assert(stripeServer.includes("isProductionRuntime"), "Stripe server helper must expose production runtime detection.");
assert(stripeServer.includes('value.startsWith("sk_test_")'), "Production must reject sk_test_ Stripe keys.");
assert(stripeServer.includes('value.startsWith("sk_live_")'), "Production must require sk_live_ Stripe keys.");
assert(stripeServer.includes("stripeServerClientKey"), "Stripe server helper must not reuse a cached client after env changes in tests.");
assert(envExampleSource.includes("EXPUNGEMENT_AI_CHECKOUT_DRY_RUN="), ".env.example must document the dry-run opt-in flag without a value.");
assert(envExampleSource.includes("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="), ".env.example must document the Stripe publishable key placeholder.");

assert(checkoutRouteSource.includes("ConsumerCheckoutNotAllowedError"), "Checkout route must reject paymentAllowed false/non-packet results.");
assert(checkoutRouteSource.includes("ConsumerCheckoutTemporarilyUnavailableError"), "Checkout route must return a safe unavailable error when Stripe is not configured.");
assert(payPageSource.includes("/api/expungement-ai/checkout") || exists("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"), "Pay page must use consumer checkout API.");
assertPacketReadyCompatibilityReturn(packetReadySource, failures);

// Negative control: a browser-return route that restores a participant-
// authenticated payment writer must make this verifier fail.
const packetReadyNegativeControlFailures = [];
assertPacketReadyCompatibilityReturn(
  packetReadySource.replace(
    "redirect(item ?",
    "recordConsumerPaymentConfirmation(auth.userId, briefcaseItemId);\n  redirect(item ?"
  ),
  packetReadyNegativeControlFailures
);
assert(
  packetReadyNegativeControlFailures.some((failure) => failure.includes("payment confirmation")),
  "Packet-ready negative control must detect a restored browser-return payment writer."
);

assert(stripeWebhookRoute.includes("STRIPE_WEBHOOK_SECRET"), "Canonical Stripe webhook route must use STRIPE_WEBHOOK_SECRET.");
assert(stripeWebhookHandler.includes("reconcileExpungementAiCheckoutEvent"), "Stripe webhook handler must dispatch consumer Checkout events.");
assert(stripeWebhookHandler.includes("reconcileStripeInvoiceEvent"), "Stripe webhook handler must preserve partner invoice reconciliation.");
assert(exists(legacyStripeWebhookRoute), "Legacy Expungement.ai Stripe webhook compatibility route must exist while live Stripe points at it.");
assert(!legacyStripeWebhookSource.includes("@/app/api/stripe/webhook/route"), "Legacy Stripe webhook route must not delegate to the canonical route before verification.");
assert(legacyStripeWebhookSource.includes("STRIPE_LEGACY_WEBHOOK_SECRET"), "Legacy Stripe webhook route must verify with STRIPE_LEGACY_WEBHOOK_SECRET.");
assert(legacyStripeWebhookSource.includes('runtime = "nodejs"') && legacyStripeWebhookSource.includes('dynamic = "force-dynamic"'), "Legacy Stripe webhook route must declare static App Router route config locally.");
// Webhook success, one enqueue, pending-before-artifact, canonical pathway
// identity, current verification hash, replay, wrong matter and sponsorship are
// exercised below through executable Stripe/Supabase fixtures. Source-string
// spelling is not acceptance evidence for those behaviors.
assert(!/\.from\("consumer_briefcase_items"\)[\s\S]{0,200}?\.update\(/.test(checkoutReconciliation), "Consumer Checkout webhook must not write payment columns directly.");
assert(!checkoutReconciliation.includes("generatePaidConsumerPacket"), "Consumer Checkout webhook must not synchronously generate a legacy artifact.");
assert(!checkoutReconciliation.includes("console.") && !checkoutReconciliation.includes("logSecurity"), "Consumer Checkout webhook must not log customer data, metadata values, payment IDs, or secrets.");

for (const column of ["payment_provider", "checkout_session_id", "payment_intent_id", "amount_cents", "receipt_url"]) {
  assert(briefcaseSource.includes(column), `Briefcase adapter must store ${column}.`);
  assert(migrationSource.includes(column), `Migration must include ${column}.`);
}
assert(migrationSource.includes("amount_cents is null or amount_cents = 5000"), "Migration must constrain amount_cents to 5000.");
assert(!migrationSource.includes("partner_"), "Checkout metadata migration must not alter partner billing.");

const forbiddenChangedPrefixes = [
  "src/lib/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/lib/supabase/",
  "vercel.json",
  "next.config",
  ".env",
  ".github/workflows/deploy"
];
for (const file of changedFiles()) {
  if ([
    ".env.example",
    "src/lib/app-url.ts",
    "src/lib/partners/add-partner-user.ts",
    "src/app/api/stripe/webhook/route.ts",
    "src/lib/stripe/server.ts",
    "src/lib/expungement-ai/briefcase.ts",
    "src/lib/expungement-ai/checkout-reconciliation.ts",
    "src/lib/expungement-ai/packet-generation.ts",
    "src/lib/expungement-ai/payment-adapter.ts",
    "src/app/api/method/expungement.api.payment.stripe_webhook/route.ts",
    "scripts/verify-expungement-consumer-checkout.mjs",
    "scripts/verify-expungement-consumer-adapter.mjs"
  ].includes(file)) continue;
  if (file === "supabase/phase-26-consumer-briefcase-items.sql" || file === metadataMigration || file === "supabase/phase-28-consumer-packet-generation-status.sql" || file === "supabase/phase-29-consumer-wilma-telemetry.sql" || file === "supabase/phase-31-legalease-os-support-queue.sql" || file === "supabase/phase-32-expungement-screening-sessions.sql" || file === "supabase/phase-33-expungement-screening-resume-links.sql") continue;
  for (const prefix of forbiddenChangedPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

function assertPacketReadyCompatibilityReturn(source, targetFailures) {
  if (!source.includes("Compatibility return")) {
    targetFailures.push("Packet-ready route must remain a documented compatibility return.");
  }
  if (!source.includes("requireConsumerBriefcaseSession")) {
    targetFailures.push("Packet-ready compatibility return must require a consumer session.");
  }
  if (!source.includes("getBriefcaseItem(auth.userId, briefcaseItemId)")) {
    targetFailures.push("Packet-ready compatibility return must use an owner-scoped matter lookup.");
  }
  if (!source.includes("redirect(")) {
    targetFailures.push("Packet-ready compatibility return must redirect to Briefcase.");
  }
  if (/\bgetConsumerCheckoutStatus\s*\(/.test(source)) {
    targetFailures.push("Packet-ready compatibility return must not retrieve Stripe state.");
  }
  if (/\brecordConsumerPaymentConfirmation\s*\(/.test(source)) {
    targetFailures.push("Packet-ready compatibility return must not write payment confirmation.");
  }
  if (/\bgenerate(?:PaidConsumer|Consumer)?Packet\w*\s*\(/.test(source)) {
    targetFailures.push("Packet-ready compatibility return must not generate a packet.");
  }
}

run(process.execPath, ["scripts/test-expungement-checkout-guards.mjs"]);

if (failures.length) {
  console.error("Expungement.ai consumer checkout verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai consumer checkout verification passed.");
console.log("Checkout/status/confirm routes exist and require owned Briefcase items.");
console.log("Checkout is limited to packet_ready / packet_ready_with_caution at 5000 cents.");
console.log("Dry-run fallback is explicit, opt-in only, and disabled in production.");
console.log("Legacy packet-ready returns are owner-scoped redirects and cannot write payment or generate packets.");
console.log("Consumer Checkout webhooks reconcile paid sessions idempotently while preserving partner invoice flow.");
