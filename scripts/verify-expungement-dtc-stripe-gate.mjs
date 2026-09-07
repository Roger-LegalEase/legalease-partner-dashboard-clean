import fs from "node:fs";
import path from "node:path";

// Source-shape guard for the approved payment boundary. Saving a result,
// opening the free Briefcase, completing packet information, and reviewing the
// exact matter are all prepayment. Stripe begins only from final review.

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const readOptional = (file) => fs.existsSync(path.join(root, file)) ? read(file) : "";
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sources = {
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  screeningResult: read("src/components/expungement-ai/screening/ScreeningResult.tsx"),
  packetInformationPage: readOptional("src/app/briefcase/[packetId]/packet-information/page.tsx"),
  packetInformationBuilder: readOptional("src/components/expungement-ai/PacketInformationBuilder.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  verificationAction: readOptional("src/components/expungement-ai/PacketVerificationAction.tsx"),
  verificationClient: readOptional("src/components/expungement-ai/packet-verification-client.ts"),
  checkoutButton: read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  paymentAdapter: read("src/lib/expungement-ai/payment-adapter.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  claimService: read("src/lib/expungement-ai/claim/claim-service.ts"),
  claimHandoff: read("src/lib/expungement-ai/claim/claim-handoff.ts"),
  packetReadyPage: read("src/app/expungement-ai/packet-ready/page.tsx"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  briefcaseViews: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  presentationAuthority: read("src/lib/expungement-ai/briefcase-presentation-authority.ts"),
  savePolicy: read("src/lib/expungement-ai/save-result-policy.ts"),
  packageSource: read("package.json")
};

for (const message of stripeBoundaryViolations(sources)) failures.push(message);

// Negative controls prove this guard kills the two highest-risk source
// regressions: Checkout without review and payment immediately after screening.
const reviewGuardRemoved = {
  ...sources,
  ...(sources.verificationAction
    ? {
      verificationAction: sources.verificationAction.replace("nextActions.checkout", "false"),
      verificationClient: sources.verificationClient.replace("if (!verified)", "if (false)")
    }
    : {
      checkoutRoute: sources.checkoutRoute.replaceAll("ConsumerCheckoutReviewRequiredError", "RemovedReviewRequiredError"),
      paymentAdapter: sources.paymentAdapter.replaceAll("ConsumerCheckoutReviewRequiredError", "RemovedReviewRequiredError")
    })
};
const reviewGuardIssues = stripeBoundaryViolations(reviewGuardRemoved);
assert(
  sources.verificationAction
    ? reviewGuardIssues.some((message) => message.includes("verified consumer action"))
      && reviewGuardIssues.some((message) => message.includes("Explicit verification"))
    : reviewGuardIssues.some((message) => message.includes("protected-verification-required")),
  "Negative control failed: removing the protected explicit-verification action guard was not detected."
);

const partialProtectedPresentation = {
  ...sources,
  briefcaseDetail: `${sources.briefcaseDetail}\ndecorateBriefcaseItemForPresentation`,
  verificationAction: "",
  verificationClient: ""
};
assert(
  stripeBoundaryViolations(partialProtectedPresentation).some((message) => message.includes("complete protected presentation component set")),
  "Negative control failed: a partial protected presentation integration selected the legacy UI contract."
);

if (sources.verificationAction && sources.verificationClient) {
  const verificationPayloadWeakened = {
    ...sources,
    verificationClient: sources.verificationClient.replace("verify: true", "verify: false")
  };
  assert(
    stripeBoundaryViolations(verificationPayloadWeakened).some((message) => message.includes("exact explicit-verification POST")),
    "Negative control failed: verify:false was accepted at the protected verification client boundary."
  );

  const consumerModeForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace('mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}', 'mode="consumer"')
  };
  assert(
    stripeBoundaryViolations(consumerModeForced).some((message) => message.includes("protected payment state")),
    "Negative control failed: forcing every protected matter into consumer mode was not detected."
  );

  const verificationStateForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace("initiallyVerified={initiallyVerified}", "initiallyVerified={true}")
  };
  assert(
    stripeBoundaryViolations(verificationStateForced).some((message) => message.includes("protected verification status")),
    "Negative control failed: forcing the protected review action verified was not detected."
  );

  const packetReadyForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace('packetReady={item.artifact.status === "ready"}', "packetReady={false}")
  };
  assert(
    stripeBoundaryViolations(packetReadyForced).some((message) => message.includes("protected artifact readiness")),
    "Negative control failed: disconnecting packet readiness from protected artifact authority was not detected."
  );
}

const prematurePayHandoff = {
  ...sources,
  screeningFlow: packetAction(sources.screeningFlow).replaceAll("submitClaim(pending.claimToken)", 'fetch("/expungement-ai/pay")')
};
assert(
  stripeBoundaryViolations(prematurePayHandoff).some((message) => message.includes("claimed before payment")),
  "Negative control failed: routing a completed screening directly to payment was not detected."
);

if (failures.length) {
  console.error("Expungement.ai DTC Stripe boundary verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC Stripe boundary verifier passed.");
console.log("DTC saves to the free Briefcase, completes protected packet facts and explicit verification, then starts one matter-bound $50 Checkout.");
console.log("Partner-covered matters remain outside consumer Checkout; negative controls detect premature payment and a removed review gate.");

function stripeBoundaryViolations(input) {
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  const handoff = packetAction(input.screeningFlow);
  const protectedPresentationUi = usesProtectedPresentation(input);

  require(input.packageSource.includes('"expungement:verify-dtc-stripe-gate"'), "package.json must expose expungement:verify-dtc-stripe-gate.");
  require(input.screeningResult.includes('fallback: "Save my result and continue"'), "DTC packet-ready result must save the exact matter before payment.");
  require(input.screeningResult.includes("$50 one time when you are ready to generate this packet"), "DTC result must retain its one-matter $50 disclosure.");
  require(input.screeningResult.includes('"A path may be available."') && !input.screeningResult.includes("A path may be available, with cautions"), "Packet-ready caution headline must remain conservative and not warning-led.");

  require(handoff.includes("anonymousSessionId:") && !handoff.includes("product:"), "Attribution must be resolved server-side, never declared by the browser.");
  require(handoff.includes("/api/expungement-ai/screening/pending"), "Completed DTC results must persist server-side before authentication.");
  require(handoff.includes("submitClaim(pending.claimToken)"), "Completed DTC results must be claimed before payment.");
  require(handoff.includes('claimHandoffPath(pending.claimToken, "create", locale)'), "Anonymous DTC auth handoff must retain the single-use claim token and locale.");
  require(handoff.includes("SAVE_RESULT_ERROR") && handoff.includes("setPacketActionError(SAVE_RESULT_ERROR)"), "Result persistence failures must fail closed with a safe save error.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "Screening must not start payment or Checkout before packet information and review.");
  require(!handoff.includes('/expungement-ai/packet-ready"'), "Screening must not route to packet-ready before payment.");
  require(input.claimService.includes('row.product === "rcap_partner" && Boolean(row.partner_slug)'), "Only a validated partner session may carry partner source authority.");

  require(input.pendingCreate.includes('attribution.isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending storage must derive the product from server-resolved attribution.");
  require(input.pendingCreate.includes("resolveScreeningAttribution"), "Pending claim must validate partner sponsorship server-side.");
  require(input.claimService.includes("evaluateAuthoritativeScreeningResult"), "Pending claim must re-evaluate saved screening inputs before commercial routing.");
  require(input.claimService.includes("exactMatterPath(matterId)"), "Pending claim must land on the exact free Briefcase matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claim must not bypass packet information and final review.");
  require(input.savePolicy.includes("return isPartnerSession ? false : evaluationPaymentAllowed;"), "Only validated partner context may suppress otherwise-allowed consumer payment.");

  if (protectedPresentationUi) {
    require(
      Boolean(input.verificationAction)
        && Boolean(input.verificationClient)
        && input.packetInformationPage.includes("decorateBriefcaseItemForPresentation")
        && input.reviewPage.includes("decorateBriefcaseItemForPresentation")
        && input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation")
        && input.briefcaseViews.includes("BriefcasePresentationItem"),
      "Protected UI must provide the complete protected presentation component set; partial integration cannot use the legacy contract."
    );
    require(input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation") && input.briefcaseDetail.includes('item.packetProgress === "not_started"') && input.briefcaseDetail.includes('item.packetProgress === "facts_complete"'), "An unpaid packet matter must expose protected first-open/resume/review progress.");
    require(input.packetInformationPage.includes("decorateBriefcaseItemForPresentation") && input.packetInformationPage.includes('item?.packetDraft.status === "available"'), "Packet information must require the protected presentation draft.");
    require(input.packetInformationBuilder.includes("Save and leave") && input.packetInformationBuilder.includes("Review packet facts"), "The protected builder must preserve save/resume/review actions.");
    require(input.briefcaseViews.includes("BriefcasePresentationItem") && !input.briefcaseViews.includes("ConsumerBriefcaseItem"), "Briefcase overview must consume only the sanitized presentation type.");
    require(input.reviewPage.includes("decorateBriefcaseItemForPresentation") && input.reviewPage.includes("<PacketVerificationAction"), "Final review must use the protected presentation and explicit-verification components.");
    require(input.verificationClient.includes("body: JSON.stringify({ answers, verify: true })"), "The protected client must send the exact explicit-verification POST payload.");
    require(input.reviewPage.includes("initiallyVerified={initiallyVerified}") && input.reviewPage.includes('const initiallyVerified = item?.verificationStatus === "verified" && reviewSafety.safe;'), "The review action must derive its initial state from protected verification status and current review safety.");
    require(input.reviewPage.includes('packetReady={item.artifact.status === "ready"}'), "The review action must derive packet readiness from protected artifact readiness.");
    require(input.reviewPage.includes('mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}'), "The review action mode must derive from protected payment state.");
    require(input.verificationAction.includes("nextActions.checkout") && input.verificationAction.includes('label="Pay $50 and generate my packet"'), "The verified consumer action must own the approved matter-bound payment action.");
    require(input.verificationClient.includes("if (!verified)") && input.verificationClient.includes("checkout: !packetReady"), "Explicit verification must gate Checkout and immutable Ready must suppress duplicate Checkout.");
  } else {
    require(input.reviewPage.includes("<ConsumerCheckoutButton"), "Only final review may expose the approved matter-bound payment action before protected UI integration.");
  }
  require(input.presentationAuthority.includes("row.partner_benefit_active !== true") && input.presentationAuthority.includes("source_linkage_sha256"), "Partner-covered presentation must require the current protected source token.");

  require(input.checkoutButton.includes("/api/expungement-ai/checkout"), "Final-review payment action must invoke the checkout API.");
  require(input.checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "Checkout must navigate only to the server-returned Stripe URL.");
  require(input.checkoutButton.includes("We could not start checkout right now. Please try again."), "Checkout button must fail closed with safe recovery copy.");
  require(input.checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout route must use the consumer payment adapter.");
  require(input.checkoutRoute.includes("ConsumerCheckoutReviewRequiredError"), "Checkout route must preserve its protected-verification-required error boundary.");
  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout route must reject partner-covered matters.");
  require(input.checkoutRoute.includes("We couldn’t start payment for this case. Your information is still saved."), "Unavailable Stripe Checkout must fail closed without losing the matter.");
  require(input.paymentAdapter.includes("ConsumerCheckoutReviewRequiredError") && input.paymentAdapter.includes("requireCurrentPacketVerification(userId, item)"), "Payment adapter must load protected current verification before Checkout.");
  require(input.paymentAdapter.includes("ConsumerCheckoutTemporarilyUnavailableError"), "Missing Stripe configuration must not bypass Checkout.");
  require(input.paymentAdapter.includes("!isProductionRuntime()"), "Dry-run Checkout must remain disabled in production.");
  require(input.paymentAdapter.includes('success_url: successUrl ?? defaultSuccessUrl') && input.paymentAdapter.includes("/briefcase/${encodeURIComponent(item.id)}?payment=return"), "Stripe success must return to the exact Briefcase matter.");

  require(input.packetReadyPage.includes("Compatibility return") && !input.packetReadyPage.includes("recordConsumerPaymentConfirmation"), "Legacy packet-ready return must not write payment or authorize packet access.");
  return issues;
}

function usesProtectedPresentation(input) {
  return Boolean(input.verificationAction)
    || Boolean(input.verificationClient)
    || input.packetInformationPage.includes("decorateBriefcaseItemForPresentation")
    || input.reviewPage.includes("decorateBriefcaseItemForPresentation")
    || input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation")
    || input.briefcaseViews.includes("BriefcasePresentationItem");
}

function packetAction(source) {
  const start = source.indexOf("async function handlePacketAction()");
  const end = source.indexOf("function handleContinue()", start);
  return start >= 0 && end > start ? source.slice(start, end) : source;
}
