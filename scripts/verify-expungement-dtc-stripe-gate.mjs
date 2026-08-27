import fs from "node:fs";
import path from "node:path";

// Source-shape guard for the approved payment boundary. Saving a result,
// opening the free Briefcase, completing packet information, and reviewing the
// exact matter are all prepayment. Stripe begins only from final review.

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sources = {
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  screeningResult: read("src/components/expungement-ai/screening/ScreeningResult.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  checkoutButton: read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  paymentAdapter: read("src/lib/expungement-ai/payment-adapter.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  packetReadyPage: read("src/app/expungement-ai/packet-ready/page.tsx"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  briefcaseViews: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  savePolicy: read("src/lib/expungement-ai/save-result-policy.ts"),
  packageSource: read("package.json")
};

for (const message of stripeBoundaryViolations(sources)) failures.push(message);

// Negative controls prove this guard kills the two highest-risk source
// regressions: Checkout without review and payment immediately after screening.
const reviewGuardRemoved = {
  ...sources,
  checkoutRoute: sources.checkoutRoute.replaceAll("ConsumerCheckoutReviewRequiredError", "RemovedReviewRequiredError"),
  paymentAdapter: sources.paymentAdapter.replaceAll("ConsumerCheckoutReviewRequiredError", "RemovedReviewRequiredError")
};
assert(
  stripeBoundaryViolations(reviewGuardRemoved).some((message) => message.includes("review-required")),
  "Negative control failed: removing the review-required Checkout guard was not detected."
);

const prematurePayHandoff = {
  ...sources,
  screeningFlow: packetAction(sources.screeningFlow).replaceAll("/briefcase", "/expungement-ai/pay")
};
assert(
  stripeBoundaryViolations(prematurePayHandoff).some((message) => message.includes("before payment")),
  "Negative control failed: routing a completed screening directly to payment was not detected."
);

if (failures.length) {
  console.error("Expungement.ai DTC Stripe boundary verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC Stripe boundary verifier passed.");
console.log("DTC saves to the free Briefcase, completes packet information and final review, then starts one matter-bound $50 Checkout.");
console.log("Partner-covered matters remain outside consumer Checkout; negative controls detect premature payment and a removed review gate.");

function stripeBoundaryViolations(input) {
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  const handoff = packetAction(input.screeningFlow);

  require(input.packageSource.includes('"expungement:verify-dtc-stripe-gate"'), "package.json must expose expungement:verify-dtc-stripe-gate.");
  require(input.screeningResult.includes('fallback: "Save this matter and continue"'), "DTC packet-ready result must save the exact matter before payment.");
  require(input.screeningResult.includes("$50 one time when you are ready to generate this packet"), "DTC result must retain its one-matter $50 disclosure.");
  require(input.screeningResult.includes('"result.lane_packet_builder"') && input.screeningResult.includes('"Continue to packet builder"'), "Partner packet-ready action must remain price-free.");
  require(input.screeningResult.includes("hasScreeningSession ?"), "Result actions must branch partner and DTC presentation explicitly.");
  require(input.screeningResult.includes('"A path may be available."') && !input.screeningResult.includes("A path may be available, with cautions"), "Packet-ready caution headline must remain conservative and not warning-led.");

  require(handoff.includes('product: isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending-result handoff must mark DTC versus RCAP explicitly.");
  require(handoff.includes("/api/expungement-ai/screening/pending"), "Completed DTC results must persist server-side before authentication.");
  require(handoff.includes('next: "/briefcase"'), "Completed DTC results must enter the free Briefcase before payment.");
  require(handoff.includes('params.set("pending", pending.pendingId)'), "Anonymous DTC auth handoff must retain the pending result id.");
  require(handoff.includes("SAVE_RESULT_ERROR") && handoff.includes("setPacketActionError(SAVE_RESULT_ERROR)"), "Result persistence failures must fail closed with a safe save error.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "Screening must not start payment or Checkout before packet information and review.");
  require(!handoff.includes('/expungement-ai/packet-ready"'), "Screening must not route to packet-ready before payment.");
  require(handoff.includes("isPartnerSession ? effectiveInitialSessionId : undefined"), "Only a validated partner session may carry partner source authority.");

  require(input.pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Pending storage must default unknown product input to DTC.");
  require(input.pendingClaim.includes('data.product === "rcap_partner"') && input.pendingClaim.includes("isRcapPartnerScreeningSession"), "Pending claim must validate partner sponsorship server-side.");
  require(input.pendingClaim.includes("evaluateAuthoritativeScreeningResult"), "Pending claim must re-evaluate saved screening inputs before commercial routing.");
  require(input.pendingClaim.includes("redirectTo: `/briefcase/${encodeURIComponent(item.id)}`"), "Pending claim must land on the exact free Briefcase matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claim must not bypass packet information and final review.");
  require(input.savePolicy.includes("return isPartnerSession ? false : evaluationPaymentAllowed;"), "Only validated partner context may suppress otherwise-allowed consumer payment.");

  require(input.briefcaseDetail.includes("Complete packet information") && input.briefcaseDetail.includes("Review for accuracy"), "An unpaid packet matter must expose its prepayment builder and accuracy review.");
  require(input.briefcaseViews.includes("Complete packet information") && input.briefcaseViews.includes("Review for accuracy"), "Briefcase overview must preserve the prepayment builder and review sequence.");
  require(input.reviewPage.includes("Check each answer before you pay."), "Final review must tell the consumer to check answers before payment.");
  require(input.reviewPage.includes("<ConsumerCheckoutButton") && input.reviewPage.includes('label="Pay $50 and generate my packet"'), "Only final review may expose the approved matter-bound payment action.");
  require(input.reviewPage.includes("sponsored ? (") && input.reviewPage.includes('item.paymentStatus === "paid"'), "Final review must keep sponsored and already-paid paths outside a new consumer Checkout.");

  require(input.checkoutButton.includes("/api/expungement-ai/checkout"), "Final-review payment action must invoke the checkout API.");
  require(input.checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "Checkout must navigate only to the server-returned Stripe URL.");
  require(input.checkoutButton.includes("We could not start checkout right now. Please try again."), "Checkout button must fail closed with safe recovery copy.");
  require(input.checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout route must use the consumer payment adapter.");
  require(input.checkoutRoute.includes("ConsumerCheckoutReviewRequiredError"), "Checkout route must preserve its review-required error boundary.");
  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout route must reject partner-covered matters.");
  require(input.checkoutRoute.includes("We couldn’t start payment for this case. Your information is still saved."), "Unavailable Stripe Checkout must fail closed without losing the matter.");
  require(input.paymentAdapter.includes("ConsumerCheckoutReviewRequiredError") && input.paymentAdapter.includes("requireCurrentPacketVerification(userId, item)"), "Payment adapter must load protected current verification before Checkout.");
  require(input.paymentAdapter.includes("ConsumerCheckoutTemporarilyUnavailableError"), "Missing Stripe configuration must not bypass Checkout.");
  require(input.paymentAdapter.includes("!isProductionRuntime()"), "Dry-run Checkout must remain disabled in production.");
  require(input.paymentAdapter.includes('success_url: successUrl ?? defaultSuccessUrl') && input.paymentAdapter.includes("/briefcase/${encodeURIComponent(item.id)}?payment=return"), "Stripe success must return to the exact Briefcase matter.");

  require(input.packetReadyPage.includes("Compatibility return") && !input.packetReadyPage.includes("recordConsumerPaymentConfirmation"), "Legacy packet-ready return must not write payment or authorize packet access.");
  return issues;
}

function packetAction(source) {
  const start = source.indexOf("async function handlePacketAction()");
  const end = source.indexOf("function handleContinue()", start);
  return start >= 0 && end > start ? source.slice(start, end) : source;
}
