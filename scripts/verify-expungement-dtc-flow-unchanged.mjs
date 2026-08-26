import fs from "node:fs";
import path from "node:path";

// Release guard for the approved direct-to-consumer commercial sequence:
// free screening -> server-authoritative result -> free Briefcase -> packet
// information and accuracy review -> one matter-bound $50 Checkout -> packet.

const root = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const sources = {
  startPage: read("src/app/expungement-ai/start/page.tsx"),
  checkPage: read("src/app/expungement-ai/check/page.tsx"),
  statePicker: read("src/components/expungement-ai/screening/StatePicker.tsx"),
  screeningRoute: read("src/app/expungement-ai/screening/[state]/page.tsx"),
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  screeningResult: read("src/components/expungement-ai/screening/ScreeningResult.tsx"),
  signInForm: read("src/components/expungement-ai/ConsumerSignInForm.tsx"),
  payPage: read("src/app/expungement-ai/pay/page.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  verificationAction: read("src/components/expungement-ai/PacketVerificationAction.tsx"),
  checkoutButton: read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  packetReadyPage: read("src/app/expungement-ai/packet-ready/page.tsx"),
  packetGenerateRoute: read("src/app/api/expungement-ai/packet/generate/route.ts"),
  packetGeneration: read("src/lib/expungement-ai/packet-generation.ts"),
  briefcase: read("src/lib/expungement-ai/briefcase.ts"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  briefcaseViews: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  savePolicy: read("src/lib/expungement-ai/save-result-policy.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts")
};

assert(sources.startPage.includes("/expungement-ai/screening"), "DTC start must route to screening, not account creation.");
assert(!sources.startPage.includes("/expungement-ai/sign-in"), "DTC start must not account-wall free screening.");
assert(sources.checkPage.includes("<StatePicker />"), "DTC check page must render the state picker.");
assert(sources.statePicker.includes('href={`/expungement-ai/screening/${jurisdiction.code}`}'), "DTC state picker must route directly to screening.");
assert(sources.screeningRoute.includes("initialSessionId") && sources.screeningRoute.includes("initialSessionId={initialSessionId}"), "Screening route must keep optional partner session separate from the DTC default.");

for (const message of approvedCommercialFlowViolations(sources)) failures.push(message);

// Negative controls: prove the guard rejects the regressions it is intended to
// catch instead of merely matching whichever source happens to be present.
const prematurePaymentSource = {
  ...sources,
  screeningFlow: packetAction(sources.screeningFlow).replaceAll("/briefcase", "/expungement-ai/pay")
};
assert(
  approvedCommercialFlowViolations(prematurePaymentSource).some((message) => message.includes("free Briefcase before payment")),
  "Negative control failed: a result action that routes to payment before Briefcase was not detected."
);

const missingReviewCheckout = {
  ...sources,
  reviewPage: sources.reviewPage.replace("<PacketVerificationAction", "<RemovedVerificationAction")
};
assert(
  approvedCommercialFlowViolations(missingReviewCheckout).some((message) => message.includes("final verification")),
  "Negative control failed: removing the final-verification action was not detected."
);

const crossMatterClaimRedirect = {
  ...sources,
  pendingClaim: sources.pendingClaim.replace(
    "redirectTo: `/briefcase/${encodeURIComponent(item.id)}`",
    'redirectTo: "/briefcase"'
  )
};
assert(
  approvedCommercialFlowViolations(crossMatterClaimRedirect).some((message) => message.includes("exact saved matter")),
  "Negative control failed: replacing the exact-matter claim redirect was not detected."
);

if (failures.length) {
  console.error("Expungement.ai DTC approved-flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC approved-flow verifier passed.");
console.log("DTC remains screening-first, saves every authoritative result to the free Briefcase, and creates matter-bound Checkout only after packet information and final review.");
console.log("Negative controls detected premature payment, loss of the final-review Checkout action, and loss of exact-matter routing.");

function approvedCommercialFlowViolations(input) {
  const issues = [];
  const require = (condition, message) => {
    if (!condition) issues.push(message);
  };
  const handoff = packetAction(input.screeningFlow);

  require(input.screeningFlow.includes("const isPartnerSession = Boolean(effectiveInitialSessionId);"), "DTC must default to non-partner when no server-validated session is present.");
  require(!input.screeningFlow.includes('type Phase = "questions" | "review"'), "The shared screening flow must not add a payment or account phase.");
  require(handoff.includes("/api/expungement-ai/screening/pending"), "Every completed result must create a server-side pending result before the auth handoff.");
  require(handoff.includes("/api/expungement-ai/screening/pending/claim"), "An authenticated result handoff must claim the server-side pending result.");
  require(handoff.includes('product: isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending results must preserve explicit DTC versus RCAP attribution.");
  require(handoff.includes("sourceSessionId: isPartnerSession ? effectiveInitialSessionId : undefined"), "DTC saves must not carry partner session authority.");
  require(handoff.includes('body: JSON.stringify({ pendingId: pending.pendingId, next: "/briefcase" })'), "Completed results must enter the free Briefcase before payment.");
  require(handoff.includes('new URLSearchParams({ mode: "create", next: "/briefcase" })'), "Anonymous results must return to the free Briefcase after authentication.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "The result action must reach the free Briefcase before payment or Checkout.");
  require(!handoff.includes("/expungement-ai/packet-ready"), "The result action must not bypass review and payment to packet-ready.");

  require(input.screeningResult.includes('fallback: "Save this matter and continue"'), "DTC packet results must use the approved save-before-payment action.");
  require(input.screeningResult.includes('fallback: "Save this guidance"'), "Non-packet guidance results must remain saveable without payment.");
  require(input.screeningResult.includes("DTC_RESULT_ACTIONS[evaluation.resultCode]"), "Every authoritative DTC result must select its approved save action by result code.");
  require(input.screeningResult.includes("$50 one time when you are ready to generate this packet"), "Packet-ready results must retain the one-matter price disclosure.");
  require(input.screeningResult.includes("Save the matter to your free Briefcase, complete the packet information, and review it before payment."), "Packet-ready results must explain the free-Briefcase and review sequence.");

  require(!input.signInForm.includes("partner_slug") && !input.signInForm.includes("programUpdatesConsent"), "Consumer sign-in must not collect or infer partner attribution.");
  require(input.signInForm.includes("save this result in your free Briefcase, complete packet information, and return later"), "DTC account creation must describe the free Briefcase handoff.");
  require(input.signInForm.includes("expungementAuthRedirectTo(requestContext.nextPath, requestContext.pendingId)"), "DTC email verification must preserve the pending exact-result handoff.");
  require(input.signInForm.includes("isExactBriefcaseMatterPath"), "A claimed pending result must accept only an exact Briefcase matter redirect.");

  require(input.pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Pending-result storage must default unknown product input to DTC.");
  require(input.pendingClaim.includes("evaluateAuthoritativeScreeningResult"), "Pending claims must re-evaluate stored screening inputs server-side.");
  require(input.pendingClaim.includes('data.product === "rcap_partner"') && input.pendingClaim.includes("isRcapPartnerScreeningSession"), "Only a validated RCAP source session may receive sponsored save posture.");
  require(input.pendingClaim.includes("saveAuthoritativeScreeningResultToBriefcase"), "Pending claims must persist the server-authoritative result.");
  require(input.pendingClaim.includes("redirectTo: `/briefcase/${encodeURIComponent(item.id)}`"), "Pending claims must route to the exact saved matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claims must not skip the free Briefcase and packet review.");

  require(input.briefcaseDetail.includes("Your Briefcase is free. Complete your packet information and pay only when you&apos;re ready to generate your packet."), "The exact matter must preserve the free-Briefcase boundary.");
  require(input.briefcaseDetail.includes("Complete packet information") && input.briefcaseDetail.includes("Final verification"), "The exact matter must expose packet information before final verification.");
  require(input.briefcaseViews.includes("Packet information") && input.briefcaseViews.includes("Final verification"), "Briefcase overview must preserve packet facts and final-verification stages.");
  require(input.reviewPage.includes("Check each answer before final verification."), "Final verification must follow the complete packet-fact summary.");
  require(input.reviewPage.includes("<PacketVerificationAction"), "The final verification page must own the explicit verification action.");
  require(input.verificationAction.includes("<ConsumerCheckoutButton") && input.verificationAction.includes('label="Pay $50 and generate my packet"'), "Verified consumer review must own the matter-bound Checkout action.");
  require(input.reviewPage.includes('mode={sponsored ? "sponsored" : item.paymentStatus === "paid" ? "paid" : "consumer"}'), "Final review must separate paid and partner-sponsored matters from consumer Checkout.");
  require(input.verificationAction.includes("!verified") && input.verificationAction.includes('action: "verify"'), "Checkout and generation must remain absent until explicit final verification succeeds.");

  require(input.payPage.includes("Compatibility route") && input.payPage.includes("/review"), "Legacy pay URLs must redirect the exact matter to accuracy review.");
  require(input.checkoutButton.includes("/api/expungement-ai/checkout"), "The final-review Checkout button must invoke the checkout API.");
  require(input.checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "Approved Checkout must navigate only to the server-returned Stripe URL.");
  require(input.checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout must use the server-side consumer payment adapter.");
  require(input.checkoutRoute.includes("ConsumerCheckoutReviewRequiredError"), "Checkout must fail closed until packet information has been reviewed.");
  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout must reject partner-sponsored RCAP matters.");

  require(input.packetReadyPage.includes("Compatibility return") && !input.packetReadyPage.includes("recordConsumerPaymentConfirmation"), "Legacy packet-ready return must not write payment or authorize generation.");
  require(input.packetGenerateRoute.includes("generatePaidConsumerPacket"), "Packet generation must use the payment-aware packet generator.");
  require(input.packetGeneration.includes("ConsumerPacketPaymentRequiredError"), "Unpaid DTC packet generation must fail closed.");
  require(input.packetGeneration.includes("paymentRequired: !(await isPartnerSponsoredPacketItem(item))"), "Only server-verified partner sponsorship may bypass consumer payment.");
  require(input.briefcase.includes('.eq("flow_mode", "rcap")') && input.briefcase.includes('.eq("partner_benefit_active", true)'), "Partner sponsorship detection must require persisted RCAP mode and an active benefit.");
  require(input.savePolicy.includes("return isPartnerSession ? false : evaluationPaymentAllowed;"), "Only validated partner context may suppress otherwise-allowed consumer payment.");

  return issues;
}

function packetAction(source) {
  const start = source.indexOf("async function handlePacketAction()");
  const end = source.indexOf("function handleContinue()", start);
  return start >= 0 && end > start ? source.slice(start, end) : source;
}
