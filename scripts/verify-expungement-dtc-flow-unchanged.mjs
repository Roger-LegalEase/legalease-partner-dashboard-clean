import fs from "node:fs";
import path from "node:path";

// Release guard for the approved direct-to-consumer commercial sequence:
// free screening -> server-authoritative result -> free Briefcase -> packet
// information and accuracy review -> one matter-bound $50 Checkout -> packet.

const root = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const readOptional = (file) => fs.existsSync(path.join(root, file)) ? read(file) : "";
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
  packetInformationPage: readOptional("src/app/briefcase/[packetId]/packet-information/page.tsx"),
  packetInformationBuilder: readOptional("src/components/expungement-ai/PacketInformationBuilder.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  verificationAction: readOptional("src/components/expungement-ai/PacketVerificationAction.tsx"),
  verificationClient: readOptional("src/components/expungement-ai/packet-verification-client.ts"),
  checkoutButton: read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  packetReadyPage: read("src/app/expungement-ai/packet-ready/page.tsx"),
  packetGenerateRoute: read("src/app/api/expungement-ai/packet/generate/route.ts"),
  packetGeneration: read("src/lib/expungement-ai/packet-generation.ts"),
  briefcase: read("src/lib/expungement-ai/briefcase.ts"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  briefcaseViews: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  presentationAuthority: read("src/lib/expungement-ai/briefcase-presentation-authority.ts"),
  savePolicy: read("src/lib/expungement-ai/save-result-policy.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  claimService: read("src/lib/expungement-ai/claim/claim-service.ts"),
  claimHandoff: read("src/lib/expungement-ai/claim/claim-handoff.ts")
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
  screeningFlow: packetAction(sources.screeningFlow).replaceAll("submitClaim(pending.claimToken)", 'fetch("/expungement-ai/pay")')
};
assert(
  approvedCommercialFlowViolations(prematurePaymentSource).some((message) => message.includes("single-use token")),
  "Negative control failed: a result action that routes to payment instead of claiming was not detected."
);

const missingReviewCheckout = {
  ...sources,
  ...(sources.verificationAction
    ? { verificationAction: sources.verificationAction.replace("nextActions.checkout", "false") }
    : { reviewPage: sources.reviewPage.replace("<ConsumerCheckoutButton", "<RemovedCheckoutButton") })
};
assert(
  approvedCommercialFlowViolations(missingReviewCheckout).some((message) => message.includes(sources.verificationAction ? "verified consumer action" : "final accuracy review")),
  "Negative control failed: removing the protected verified-consumer Checkout action was not detected."
);

const partialProtectedPresentation = {
  ...sources,
  briefcaseDetail: `${sources.briefcaseDetail}\ndecorateBriefcaseItemForPresentation`,
  verificationAction: "",
  verificationClient: ""
};
assert(
  approvedCommercialFlowViolations(partialProtectedPresentation).some((message) => message.includes("complete protected presentation component set")),
  "Negative control failed: a partial protected presentation integration selected the legacy UI contract."
);

if (sources.verificationAction && sources.verificationClient) {
  const verificationPayloadWeakened = {
    ...sources,
    verificationClient: sources.verificationClient.replace("verify: true", "verify: false")
  };
  assert(
    approvedCommercialFlowViolations(verificationPayloadWeakened).some((message) => message.includes("exact explicit-verification POST")),
    "Negative control failed: verify:false was accepted at the protected verification client boundary."
  );

  const consumerModeForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace('mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}', 'mode="consumer"')
  };
  assert(
    approvedCommercialFlowViolations(consumerModeForced).some((message) => message.includes("protected payment state")),
    "Negative control failed: forcing every protected matter into consumer mode was not detected."
  );

  const verificationStateForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace("initiallyVerified={initiallyVerified}", "initiallyVerified={true}")
  };
  assert(
    approvedCommercialFlowViolations(verificationStateForced).some((message) => message.includes("protected verification status")),
    "Negative control failed: forcing the protected review action verified was not detected."
  );

  const packetReadyForced = {
    ...sources,
    reviewPage: sources.reviewPage.replace('packetReady={item.artifact.status === "ready"}', "packetReady={false}")
  };
  assert(
    approvedCommercialFlowViolations(packetReadyForced).some((message) => message.includes("protected artifact readiness")),
    "Negative control failed: disconnecting packet readiness from protected artifact authority was not detected."
  );
}

const crossMatterClaimRedirect = {
  ...sources,
  claimService: sources.claimService.replace("exactMatterPath(matterId)", '"/briefcase"')
};
assert(
  approvedCommercialFlowViolations(crossMatterClaimRedirect).some((message) => message.includes("exact saved matter")),
  "Negative control failed: replacing the exact-matter claim redirect was not detected."
);

const sponsoredEntitlementOmitted = {
  ...sources,
  packetGeneration: sources.packetGeneration.replaceAll(
    "entitlement: sponsorship.sponsored ? sponsorship.entitlement : undefined",
    "entitlement: undefined"
  )
};
assert(
  approvedCommercialFlowViolations(sponsoredEntitlementOmitted).some((message) => message.includes("sponsored_credit entitlement")),
  "Negative control failed: omitting the protected sponsored entitlement was not detected."
);

const sponsoredEntitlementFalsified = {
  ...sources,
  packetGeneration: sources.packetGeneration.replace(
    'kind: "sponsored_credit",\n      idempotencyKey,\n      alreadyConsumed: packetAlreadyGenerated(item),\n      serverVerified: true',
    'kind: "sponsored_credit",\n      idempotencyKey,\n      alreadyConsumed: packetAlreadyGenerated(item),\n      serverVerified: false'
  )
};
assert(
  approvedCommercialFlowViolations(sponsoredEntitlementFalsified).some((message) => message.includes("server-verified sponsored entitlement")),
  "Negative control failed: falsifying serverVerified on the sponsored entitlement was not detected."
);

const sponsoredConsumerFallback = {
  ...sources,
  packetGeneration: sources.packetGeneration.replace(
    "if (!paymentRequired && (",
    "if (false && ("
  )
};
assert(
  approvedCommercialFlowViolations(sponsoredConsumerFallback).some((message) => message.includes("before any consumer-payment probe")),
  "Negative control failed: allowing sponsored generation to reach consumer-payment fallback was not detected."
);

if (failures.length) {
  console.error("Expungement.ai DTC approved-flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC approved-flow verifier passed.");
console.log("DTC remains screening-first, saves every authoritative result to the free Briefcase, and creates matter-bound Checkout only after protected packet facts and explicit verification.");
console.log("Negative controls detected premature payment, loss of the protected verified-consumer Checkout action, and loss of exact-matter routing.");

function approvedCommercialFlowViolations(input) {
  const issues = [];
  const require = (condition, message) => {
    if (!condition) issues.push(message);
  };
  const handoff = packetAction(input.screeningFlow);
  const protectedPresentationUi = usesProtectedPresentation(input);

  require(input.screeningFlow.includes("const isPartnerSession = Boolean(effectiveInitialSessionId);"), "DTC must default to non-partner when no server-validated session is present.");
  require(!input.screeningFlow.includes('type Phase = "questions" | "review"'), "The shared screening flow must not add a payment or account phase.");
  require(handoff.includes("/api/expungement-ai/screening/pending"), "Every completed result must create a server-side pending result before the auth handoff.");
  require(input.claimHandoff.includes("/api/expungement-ai/screening/pending/claim"), "An authenticated result handoff must claim the server-side pending result.");
  require(handoff.includes("anonymousSessionId:"), "Pending results must name the anonymous session so attribution is resolved server-side.");
  require(!handoff.includes("product:"), "The browser must not declare DTC versus RCAP attribution.");
  // Sponsorship is now decided by the server from its own record of the
  // anonymous session, so a DTC browser cannot assert partner authority at all.
  require(input.claimService.includes('row.product === "rcap_partner" && Boolean(row.partner_slug)'), "DTC saves must not carry partner session authority.");
  require(handoff.includes("submitClaim(pending.claimToken)"), "Completed results must be claimed through the single-use token.");
  require(handoff.includes('claimHandoffPath(pending.claimToken, "create", locale)'), "Anonymous results must carry the claim and locale through authentication.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "The result action must reach the free Briefcase before payment or Checkout.");
  require(!handoff.includes("/expungement-ai/packet-ready"), "The result action must not bypass review and payment to packet-ready.");

  require(input.screeningResult.includes('fallback: "Save my result and continue"'), "DTC packet results must use the approved save-before-payment action.");
  require(input.screeningResult.includes('fallback: "Save this guidance"'), "Non-packet guidance results must remain saveable without payment.");
  require(input.screeningResult.includes("DTC_RESULT_ACTIONS[evaluation.resultCode]"), "Every authoritative DTC result must select its approved save action by result code.");
  require(input.screeningResult.includes("$50 one time when you are ready to generate this packet"), "Packet-ready results must retain the one-matter price disclosure.");
  require(input.screeningResult.includes("Save the matter to your free Briefcase, complete the packet information, and review it before payment."), "Packet-ready results must explain the free-Briefcase and review sequence.");

  require(!input.signInForm.includes("partner_slug") && !input.signInForm.includes("programUpdatesConsent"), "Consumer sign-in must not collect or infer partner attribution.");
  require(input.signInForm.includes("save this result in your free Briefcase, complete packet information, and return later"), "DTC account creation must describe the free Briefcase handoff.");
  require(input.signInForm.includes("expungementAuthRedirectTo(requestContext)"), "DTC email verification must preserve the validated claim, locale, and exact-result handoff.");
  require(input.claimHandoff.includes("isExactMatterPath(redirectTo)"), "A claimed pending result must accept only an exact matter redirect.");

  require(input.pendingCreate.includes('attribution.isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending-result storage must derive the product from server-resolved attribution.");
  require(input.claimService.includes("evaluateAuthoritativeScreeningResult"), "Pending claims must re-evaluate stored screening inputs server-side.");
  require(input.pendingCreate.includes("resolveScreeningAttribution"), "Only a validated RCAP source session may receive sponsored save posture.");
  require(input.claimService.includes('supabase.rpc("claim_pending_screening_result"'), "Pending claims must persist through the one atomic claim transaction.");
  require(input.claimService.includes("exactMatterPath(matterId)"), "Pending claims must route to the exact saved matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claims must not skip the free Briefcase and packet review.");

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
    require(input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation") && input.briefcaseDetail.includes('item.packetProgress === "not_started"') && input.briefcaseDetail.includes('item.packetProgress === "facts_complete"'), "The exact matter must expose protected first-open/resume/review progress without raw-row fallback.");
    require(input.packetInformationPage.includes("decorateBriefcaseItemForPresentation") && input.packetInformationPage.includes('item?.packetDraft.status === "available"'), "Packet information must consume the protected presentation draft.");
    require(input.packetInformationBuilder.includes("Review packet facts") && input.packetInformationBuilder.includes("Save and leave"), "The protected packet builder must preserve save/resume/review actions.");
    require(input.briefcaseViews.includes("BriefcasePresentationItem") && !input.briefcaseViews.includes("ConsumerBriefcaseItem"), "Briefcase overview must consume only the sanitized presentation type.");
    require(input.reviewPage.includes("decorateBriefcaseItemForPresentation") && input.reviewPage.includes('item?.packetDraft.status === "available"'), "Final review must consume the protected packet draft.");
    require(input.reviewPage.includes("<PacketVerificationAction") && !input.reviewPage.includes("packetInformationModelFor(storedItem)"), "Final review must delegate commerce actions to explicit protected verification.");
    require(input.verificationClient.includes("body: JSON.stringify({ answers, verify: true })"), "The protected client must send the exact explicit-verification POST payload.");
    require(input.reviewPage.includes("initiallyVerified={initiallyVerified}") && input.reviewPage.includes('const initiallyVerified = item?.verificationStatus === "verified" && reviewSafety.safe;'), "The review action must derive its initial state from protected verification status and current review safety.");
    require(input.reviewPage.includes('packetReady={item.artifact.status === "ready"}'), "The review action must derive packet readiness from protected artifact readiness.");
    require(input.reviewPage.includes('mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}'), "The review action mode must derive from protected payment state.");
    require(input.verificationAction.includes("const nextActions = packetVerificationActions({ verified, packetReady, mode })") && input.verificationAction.includes("nextActions.checkout"), "The verified consumer action must own matter-bound Checkout.");
    require(input.verificationClient.includes("if (!verified)") && input.verificationClient.includes("checkout: !packetReady"), "No consumer Checkout may exist before explicit verification or after immutable Ready access.");
  } else {
    require(input.reviewPage.includes("<ConsumerCheckoutButton"), "The final accuracy review must own matter-bound Checkout until the protected presentation UI is integrated.");
  }

  require(input.payPage.includes("Compatibility route") && input.payPage.includes("/review"), "Legacy pay URLs must redirect the exact matter to accuracy review.");
  require(input.checkoutButton.includes("/api/expungement-ai/checkout"), "The final-review Checkout button must invoke the checkout API.");
  require(input.checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "Approved Checkout must navigate only to the server-returned Stripe URL.");
  require(input.checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout must use the server-side consumer payment adapter.");
  require(input.checkoutRoute.includes("ConsumerCheckoutReviewRequiredError"), "Checkout must fail closed until packet information has been reviewed.");
  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout must reject partner-sponsored RCAP matters.");

  require(input.packetReadyPage.includes("Compatibility return") && !input.packetReadyPage.includes("recordConsumerPaymentConfirmation"), "Legacy packet-ready return must not write payment or authorize generation.");
  require(input.packetGenerateRoute.includes("generatePaidConsumerPacket"), "Packet generation must use the payment-aware packet generator.");
  require(input.packetGeneration.includes("ConsumerPacketPaymentRequiredError"), "Unpaid DTC packet generation must fail closed.");
  require(
    input.packetGeneration.includes("readTrustedBriefcasePresentationSource")
      && input.packetGeneration.includes("requireCurrentPacketSponsorshipAuthority")
      && input.packetGeneration.includes("paymentRequired: !partnerSponsored"),
    "Only the current protected owner/item/source sponsorship token may bypass consumer payment."
  );
  const sponsoredGuard = input.packetGeneration.indexOf("if (!paymentRequired && (");
  const consumerPaymentProbe = input.packetGeneration.indexOf("if (paymentRequired && !(dryRunMode");
  const sponsoredEntitlementStart = input.packetGeneration.indexOf('kind: "sponsored_credit"');
  const sponsoredEntitlementEnd = input.packetGeneration.indexOf("  };", sponsoredEntitlementStart);
  const sponsoredEntitlementSource = sponsoredEntitlementStart >= 0 && sponsoredEntitlementEnd > sponsoredEntitlementStart
    ? input.packetGeneration.slice(sponsoredEntitlementStart, sponsoredEntitlementEnd)
    : "";
  require(
    (input.packetGeneration.match(/entitlement: sponsorship\.sponsored \? sponsorship\.entitlement : undefined/g) ?? []).length === 2,
    "Every sponsored generation/status admission must receive the protected sponsored_credit entitlement."
  );
  require(
    sponsoredEntitlementSource.includes('kind: "sponsored_credit"')
      && sponsoredEntitlementSource.includes("serverVerified: true")
      && input.packetGeneration.includes('createHash("sha256")')
      && input.packetGeneration.includes("rcap-sponsored-credit/v1")
      && input.packetGeneration.includes("source.value.sourceSessionId")
      && input.packetGeneration.includes("item.id")
      && input.packetGeneration.includes("matterId"),
    "The server-verified sponsored entitlement must carry a stable nonempty session/item/matter idempotency key."
  );
  require(
    sponsoredGuard >= 0 && consumerPaymentProbe > sponsoredGuard
      && input.packetGeneration.slice(sponsoredGuard, consumerPaymentProbe).includes('entitlement?.kind !== "sponsored_credit"')
      && input.packetGeneration.slice(sponsoredGuard, consumerPaymentProbe).includes("entitlement.serverVerified !== true")
      && input.packetGeneration.slice(sponsoredGuard, consumerPaymentProbe).includes("!entitlement.idempotencyKey"),
    "Missing or falsified sponsorship must fail closed before any consumer-payment probe."
  );
  require(
    input.packetGeneration.includes('if (source.value.product !== "rcap_partner")')
      && input.packetGeneration.includes("!source.value.partnerBenefitActive")
      && input.packetGeneration.includes("source.value.matterId !== matterId"),
    "serverVerified may be set only after protected product, benefit, partner, source-session, owner/item, and matter binding."
  );
  require(
    input.packetGenerateRoute.includes("entitlement: packet.protectedSponsorship.entitlement")
      && !input.packetGenerateRoute.includes("body?.entitlement")
      && !input.packetGenerateRoute.includes("body?.sponsorship")
      && !input.packetGenerateRoute.includes("body?.partner"),
    "The final sponsored generate route must use only its server-resolved entitlement and authority."
  );
  require(input.presentationAuthority.includes("row.partner_benefit_active !== true") && input.presentationAuthority.includes("source_linkage_sha256"), "Current sponsorship must require active protected partner benefit and exact linkage digest.");
  require(input.briefcase.includes('.eq("flow_mode", "rcap")') && input.briefcase.includes('.eq("partner_benefit_active", true)'), "Partner sponsorship detection must require persisted RCAP mode and an active benefit.");
  require(input.savePolicy.includes("return isPartnerSession ? false : evaluationPaymentAllowed;"), "Only validated partner context may suppress otherwise-allowed consumer payment.");

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
