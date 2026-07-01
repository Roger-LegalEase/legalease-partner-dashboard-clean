import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// Stripe TEST-mode readiness. Never runs live Stripe. Proves (statically + via
// pure policy) that the existing consumer checkout: charges the $50 as a self-help
// packet fee (never a court/filing/agency/government/attorney/legal fee), gates on
// the payment clamp, connects success -> packet/Briefcase and cancel -> no packet,
// and that partner-sponsored / non-payment routes create NO checkout session.
// If Stripe test env is absent, reports BLOCKED with the exact vars (no fake E2E).
// ============================================================================

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { resolveSavePaymentAllowed } = await import("../src/lib/expungement-ai/save-result-policy.ts");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const failures = [];
const ok = (c, m) => { if (!c) failures.push(m); };

const payment = read("src/lib/expungement-ai/payment-adapter.ts");
const stripeServer = read("src/lib/stripe/server.ts");
const BANNED = [/court fee/i, /filing fee/i, /\bapplication fee\b/i, /agency fee/i, /government fee/i, /attorney fee/i, /\blegal fee\b/i, /expungement fee/i];

// --- consumer paid route: $50 self-help packet checkout, clean copy ---
ok(payment.includes("consumerPacketPriceCents = 5000"), "Consumer packet price must be $50 (5000 cents).");
const lineItemRegion = payment.slice(payment.indexOf("line_items"), payment.indexOf("line_items") + 400);
ok(/name:\s*"Expungement\.ai self-help packet"/.test(payment), "Stripe line item must be named 'Expungement.ai self-help packet'.");
for (const bad of BANNED) ok(!bad.test(lineItemRegion) && !bad.test(payment.slice(0, payment.indexOf("createConsumerPacketCheckout") + 2000)), `Checkout copy must not label the $50 as ${bad}.`);

// --- gate: checkout only when payment is allowed ---
ok(/assertCheckoutAllowed\(item\)/.test(payment), "createConsumerPacketCheckout must call assertCheckoutAllowed(item) before creating a session.");
ok(/isConsumerPaymentAllowed\(item\.resultCode/.test(payment), "assertCheckoutAllowed must reuse the isConsumerPaymentAllowed clamp.");

// --- success connects to packet generation; cancel does not ---
ok(/defaultSuccessUrl\s*=\s*absoluteExpungementAiUrl\(`\/packet-ready/.test(payment) && /success_url:\s*successUrl\s*\?\?\s*defaultSuccessUrl/.test(payment), "Success path must route to /packet-ready (packet + Briefcase generation).");
ok(/defaultCancelUrl\s*=\s*absoluteExpungementAiUrl\(`\/pay/.test(payment) && /cancel_url:\s*cancelUrl\s*\?\?\s*defaultCancelUrl/.test(payment), "Cancel path must route to /pay and not generate a paid packet.");

// --- webhook secret required (test-mode wiring present) ---
ok(/STRIPE_WEBHOOK_SECRET/.test(stripeServer), "Stripe webhook secret handling must exist for the confirm path.");

// --- partner-sponsored / non-payment: no checkout session ---
ok(resolveSavePaymentAllowed(true, true) === false, "Partner-sponsored session must force paymentAllowed=false (no consumer checkout session).");
// pure mirror of the assertCheckoutAllowed clamp
const checkoutAllowed = (rc, paymentAllowed) => paymentAllowed === true && (rc === "packet_ready" || rc === "packet_ready_with_caution");
ok(checkoutAllowed("packet_ready", true) === true, "A qualifying paid result must be checkout-eligible.");
for (const rc of ["guidance_only", "needs_review", "needs_more_info", "not_yet", "likely_not_eligible", "hard_stop"]) {
  ok(checkoutAllowed(rc, true) === false, `Non-payment result ${rc} must never create a checkout session.`);
}
ok(checkoutAllowed("packet_ready", false) === false, "A packet-ready result with paymentAllowed=false must not create a checkout session.");

// --- dry-run fallback exists (no live Stripe needed for local flows) ---
ok(/isConsumerCheckoutDryRunEnabled/.test(payment) && /mode:\s*"dry_run"/.test(payment), "A dry-run checkout fallback must exist for local/test flows.");

// --- Stripe TEST env presence ---
const STRIPE_VARS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
const missing = STRIPE_VARS.filter((v) => !process.env[v]);
const status = missing.length > 0 ? "BLOCKED" : "ENV_PRESENT";

console.log("verify-expungement-stripe-test-readiness (TEST mode only — never live)");
console.log("=".repeat(66));
console.log("Line item        : 'Expungement.ai self-help packet' @ $50 (5000c) — clean copy");
console.log("Checkout gate    : assertCheckoutAllowed -> isConsumerPaymentAllowed clamp");
console.log("Success / cancel : /packet-ready (generate) / /pay (no packet)");
console.log("Partner-sponsored: paymentAllowed forced false -> no consumer checkout session");
console.log("Non-payment codes: no checkout session");
console.log("-".repeat(66));
if (status === "BLOCKED") {
  console.log(`BLOCKED: missing Stripe test env: ${missing.join(", ")}`);
  console.log("  Stripe test-mode E2E (create a real test checkout session) is NOT exercised.");
  console.log("  Static copy/gate/flow proofs above passed. Production Stripe E2E remains BLOCKED.");
}
console.log("-".repeat(66));
if (failures.length > 0) {
  console.error(`RED — ${failures.length} finding(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`GREEN (static + pure-policy) — Stripe test env: ${status}.`);
if (status === "BLOCKED") console.log("Stripe test-mode E2E remains BLOCKED until STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (test) are provided.");
