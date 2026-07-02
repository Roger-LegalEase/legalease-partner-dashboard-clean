import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };

const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const checkoutButton = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
const checkoutRoute = read("src/app/api/expungement-ai/checkout/route.ts");
const paymentAdapter = read("src/lib/expungement-ai/payment-adapter.ts");
const pendingCreate = read("src/app/api/expungement-ai/screening/pending/route.ts");
const pendingClaim = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");
const packetReadyPage = read("src/app/expungement-ai/packet-ready/page.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const savePolicy = read("src/lib/expungement-ai/save-result-policy.ts");
const packageSource = read("package.json");

assert(packageSource.includes('"expungement:verify-dtc-stripe-gate"'), "package.json must expose expungement:verify-dtc-stripe-gate.");

assert(screeningResult.includes('translate("payment.generate_packet", "Generate my packet - $50")'), "DTC packet CTA must say Generate my packet - $50.");
assert(screeningResult.includes('translate("result.save_briefcase", "Continue to my Briefcase")'), "Partner-covered packet CTA must say Continue to my Briefcase.");
assert(screeningResult.includes("hasScreeningSession ?"), "Result CTA must branch partner vs DTC explicitly.");
assert(screeningResult.includes('"A path may be available."'), "packet_ready_with_caution headline must remain A path may be available.");
assert(!screeningResult.includes("A path may be available, with cautions"), "Result headline must not be warning-led.");

assert(screeningFlow.includes('product: "expungement_ai_dtc"'), "Anonymous DTC pending create must mark product=expungement_ai_dtc.");
assert(screeningFlow.includes('next: "/expungement-ai/pay"'), "Anonymous DTC signup must preserve payment next.");
assert(screeningFlow.includes('params.set("pending", pending.pendingId)'), "Anonymous DTC must require pending id before account handoff.");
assert(screeningFlow.includes("CHECKOUT_START_ERROR"), "DTC checkout handoff must have a fail-closed error state.");
assert(screeningFlow.includes("setPacketActionError(CHECKOUT_START_ERROR)"), "DTC save/pending failures must show checkout error.");
assert(!screeningFlow.includes('router.push("/briefcase");\n          return;\n        }\n      } catch {\n        // Continue into pending handoff'), "DTC save-result failure must not route directly to Briefcase.");
assert(!screeningFlow.includes('router.push("/briefcase");') && !screeningFlow.includes("router.push('/briefcase');"), "DTC branch must not push /briefcase directly.");
assert(!screeningFlow.includes('/expungement-ai/packet-ready"'), "DTC result action must not route to packet-ready before payment.");
assert(screeningFlow.includes("isPartnerSession ? effectiveInitialSessionId : undefined"), "Only partner sessions may send sourceSessionId in result save payload.");

assert(pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Pending create must default to DTC product.");
assert(pendingClaim.includes('sourceSessionId: data.product === "rcap_partner" ? data.pending_id : undefined'), "DTC pending claim must not masquerade as sourceSessionId/partner session.");
assert(pendingClaim.includes('data.product === "rcap_partner" || !item.paymentAllowed') && pendingClaim.includes('/expungement-ai/pay?briefcaseItemId='), "Pending claim must send DTC paid results to payment and partner-covered results to Briefcase.");

assert(savePolicy.includes("isPartnerSession ? false : evaluationPaymentAllowed"), "Only validated partner session context may suppress payment.");
assert(checkoutButton.includes("/api/expungement-ai/checkout"), "Authenticated DTC pay page must invoke checkout API.");
assert(checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "Authenticated DTC checkout must navigate to checkoutUrl.");
assert(checkoutButton.includes("We could not start checkout right now. Please try again."), "Checkout button must fail closed with safe checkout error.");
assert(checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout route must create consumer packet checkout.");
assert(checkoutRoute.includes("isPartnerSponsoredPacketItem") && checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout route must reject partner-covered items.");
assert(checkoutRoute.includes("We could not start checkout right now. Please try again."), "Missing Stripe config must fail closed with safe error.");
assert(paymentAdapter.includes("ConsumerCheckoutTemporarilyUnavailableError"), "Missing Stripe config must not bypass checkout.");
assert(paymentAdapter.includes("!isProductionRuntime()"), "Dry-run checkout must be disabled in production.");
assert(paymentAdapter.includes('success_url: successUrl ?? defaultSuccessUrl'), "Stripe checkout must own packet-ready success redirect.");
assert(packetReadyPage.includes("getConsumerCheckoutStatus"), "packet-ready must confirm checkout status before DTC unlock.");
assert(packetReadyPage.includes("This page only shows") && packetReadyPage.includes("after payment confirmation"), "packet-ready must not act as the first DTC payment gate.");
assert(briefcaseViews.includes("Continue to payment"), "Briefcase must route unpaid DTC packet-ready items back to payment.");
assert(briefcaseViews.includes("item.paymentAllowed && item.paymentStatus !== \"paid\""), "Unpaid DTC Briefcase item must not unlock packet builder.");

if (failures.length) {
  console.error("Expungement.ai DTC Stripe gate verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC Stripe gate verifier passed.");
console.log("DTC packet-ready actions require save-to-pay or pending-to-pay; no Briefcase/packet-ready fail-open before Stripe.");
console.log("Partner-covered sessions keep the Briefcase bypass and consumer checkout rejects partner-sponsored items.");
