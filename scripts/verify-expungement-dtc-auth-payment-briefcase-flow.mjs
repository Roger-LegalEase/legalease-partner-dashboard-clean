import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const readOptional = (file) => exists(file) ? read(file) : "";
const assert = (condition, message) => { if (!condition) failures.push(message); };
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const sources = {
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  signIn: read("src/components/expungement-ai/ConsumerSignInForm.tsx"),
  callback: read("src/app/auth/set-password/page.tsx"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  claimService: read("src/lib/expungement-ai/claim/claim-service.ts"),
  claimHandoff: read("src/lib/expungement-ai/claim/claim-handoff.ts"),
  packetInformationPage: readOptional("src/app/briefcase/[packetId]/packet-information/page.tsx"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  verificationAction: readOptional("src/components/expungement-ai/PacketVerificationAction.tsx"),
  verificationClient: readOptional("src/components/expungement-ai/packet-verification-client.ts"),
  packetButton: read("src/components/expungement-ai/PacketGenerateButton.tsx")
};

const pendingSchemaSource = [
  "supabase/phase-38-expungement-pending-screening-results.sql",
  "supabase/migrations/20260728213131_remote_schema.sql"
].filter(exists).map(read).join("\n");
assert(pendingSchemaSource.includes('CREATE TABLE IF NOT EXISTS "public"."consumer_pending_screening_results"')
  || pendingSchemaSource.includes("create table if not exists public.consumer_pending_screening_results"), "Missing pending-result schema authority.");
for (const message of authBriefcaseFlowViolations(sources)) failures.push(message);

const genericBriefcaseRedirect = {
  ...sources,
  claimService: sources.claimService.replace("exactMatterPath(matterId)", '"/briefcase"')
};
assert(
  authBriefcaseFlowViolations(genericBriefcaseRedirect).some((message) => message.includes("exact saved matter")),
  "Negative control failed: a generic post-auth Briefcase redirect was not detected."
);

const browserStashedToken = {
  ...sources,
  claimHandoff: `${sources.claimHandoff}\nlocalStorage.setItem("claim", claimToken);`
};
assert(
  authBriefcaseFlowViolations(browserStashedToken).some((message) => message.includes("browser storage")),
  "Negative control failed: a claim token written to browser storage was not detected."
);

const idAuthorizedClaim = {
  ...sources,
  screeningFlow: sources.screeningFlow.replace("anonymousSessionId:", "pendingId: pending.pendingId, anonymousSessionId:")
};
assert(
  authBriefcaseFlowViolations(idAuthorizedClaim).some((message) => message.includes("pending identifier")),
  "Negative control failed: reintroducing a pending identifier into the browser handoff was not detected."
);

const partialProtectedPresentation = {
  ...sources,
  briefcaseDetail: `${sources.briefcaseDetail}\ndecorateBriefcaseItemForPresentation`,
  verificationAction: "",
  verificationClient: ""
};
assert(
  authBriefcaseFlowViolations(partialProtectedPresentation).some((message) => message.includes("complete protected presentation component set")),
  "Negative control failed: partial protected Briefcase integration selected the legacy contract."
);

if (sources.verificationAction && sources.verificationClient) {
  const unevaluatedPendingAnswers = {
    ...sources,
    screeningFlow: sources.screeningFlow.replace(
      "answers: toScreeningAnswers(evaluatedAnswers ?? answers)",
      "answers: toScreeningAnswers(answers)"
    )
  };
  assert(
    authBriefcaseFlowViolations(unevaluatedPendingAnswers).some((message) => message.includes("evaluated answer set")),
    "Negative control failed: pending persistence accepted the stale pre-evaluation answer set."
  );

  const verificationGateRemoved = {
    ...sources,
    verificationClient: sources.verificationClient.replace("if (!verified)", "if (false)")
  };
  assert(
    authBriefcaseFlowViolations(verificationGateRemoved).some((message) => message.includes("explicit protected verification")),
    "Negative control failed: Checkout became reachable before explicit protected verification."
  );

  const directCheckoutRestored = {
    ...sources,
    reviewPage: sources.reviewPage.replace("<PacketVerificationAction", "<ConsumerCheckoutButton")
  };
  assert(
    authBriefcaseFlowViolations(directCheckoutRestored).some((message) => message.includes("PacketVerificationAction")),
    "Negative control failed: direct review-page Checkout bypassed the protected action policy."
  );
}

if (failures.length) {
  console.error("Expungement.ai DTC auth/free-Briefcase flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC auth/free-Briefcase flow verifier passed.");
console.log("Pending results survive account creation, land on the exact free matter, and reach Checkout only after packet information and explicit final verification.");
console.log("Negative controls detect stale pre-evaluation persistence, partial protected UI, pre-verification Checkout, and loss of exact-matter routing.");

function authBriefcaseFlowViolations(input) {
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  const start = input.screeningFlow.indexOf("async function handlePacketAction()");
  const end = input.screeningFlow.indexOf("function handleContinue()", start);
  const handoff = start >= 0 && end > start ? input.screeningFlow.slice(start, end) : input.screeningFlow;
  const protectedPresentationUi = usesProtectedPresentation(input);

  require(handoff.includes("/api/expungement-ai/screening/pending"), "Every authoritative DTC result must create a server-side pending result.");
  // Attribution is resolved on the server from its own record of the anonymous
  // session. A browser that names the product is a browser that can claim
  // sponsorship it was never granted, so it no longer gets a say.
  require(handoff.includes("anonymousSessionId:"), "Pending result must name the anonymous session so the server can resolve attribution.");
  require(!handoff.includes('product: isPartnerSession'), "The browser must not declare DTC versus RCAP attribution.");
  require(
    handoff.includes(protectedPresentationUi
      ? "answers: toScreeningAnswers(evaluatedAnswers ?? answers)"
      : "answers: toScreeningAnswers(answers)"),
    protectedPresentationUi
      ? "Pending result must persist the evaluated answer set used by the authoritative result."
      : "Pending result must persist screening inputs for server-authoritative re-evaluation."
  );
  require(handoff.includes("claimHandoffPath(pending.claimToken"), "DTC auth handoff must carry the claim token, not a pending identifier.");
  require(!handoff.includes("pendingId"), "Possession of a pending identifier must not authorize anything.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "DTC auth handoff must not bypass packet information and final review.");
  require(!handoff.includes('/expungement-ai/packet-ready"'), "DTC result action must not bypass review and payment to packet-ready.");

  require(input.signIn.includes("emailRedirectTo: expungementAuthRedirectTo(requestContext)"), "DTC sign-up must carry the validated continuation through email verification.");
  require(input.signIn.includes("absoluteExpungementAiUrl"), "DTC auth redirect must retain the Expungement.ai base URL fallback.");
  require(input.signIn.includes("submitClaim(requestContext.claimToken)"), "Authenticated sign-in must claim the pending result before navigation.");
  // Comments may name browser storage; calls into it are the violation.
  for (const [label, source] of [["sign-in form", input.signIn], ["claim handoff", input.claimHandoff]]) {
    require(
      !/\b(?:local|session)Storage\s*(?:\.|\[)/.test(stripComments(source)),
      `The claim token must never be stashed in browser storage (${label}).`
    );
  }
  require(input.claimHandoff.includes("isExactMatterPath(redirectTo)"), "Client auth handoff must accept only an exact matter path.");
  require(input.claimHandoff.includes("stripClaimTokenFromUrl"), "The claim token must be removed from the browser URL after use.");
  require(input.callback.includes("claimExpungementPending"), "Email confirmation callback must claim the pending result.");

  require(input.pendingCreate.includes("consumer_pending_screening_results"), "Pending create route must persist to the pending-results table.");
  require(input.pendingCreate.includes("claim_token_hash: claimTokenHash(claimToken)"), "Pending create route must store the claim token hashed at rest.");
  require(!input.pendingCreate.includes("pending_id"), "Pending create route must not return a pending identifier to the browser.");
  require(input.pendingCreate.includes("resolveScreeningAttribution"), "Pending create route must resolve attribution server-side.");
  const claimService = input.claimService;
  require(claimService.includes("evaluateAuthoritativeScreeningResult"), "Pending claim must re-evaluate stored screening inputs.");
  require(claimService.includes('supabase.rpc("claim_pending_screening_result"'), "Pending claim must persist through the one atomic claim transaction.");
  require(claimService.includes("clampAuthoritativeMatterInput"), "Pending claim must apply the server-authoritative matter clamps.");
  require(claimService.includes('row.product === "rcap_partner" && Boolean(row.partner_slug)'), "Partner sponsorship must be read from the server's own pending record during claim.");
  require(claimService.includes("exactMatterPath(matterId)"), "Pending claim must route to the exact saved matter.");
  require(input.pendingClaim.includes("claimPendingScreeningResult("), "The claim route must go through the shared claim service.");
  require(input.pendingClaim.includes("accountVerified: auth.isVerified === true"), "An unverified account must not receive a matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claim must not route directly to payment.");

  if (protectedPresentationUi) {
    require(
      Boolean(input.verificationAction)
        && Boolean(input.verificationClient)
        && input.packetInformationPage.includes("decorateBriefcaseItemForPresentation")
        && input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation")
        && input.reviewPage.includes("decorateBriefcaseItemForPresentation"),
      "Protected UI must provide the complete protected presentation component set; partial integration cannot use the legacy contract."
    );
    require(
      input.briefcaseDetail.includes('item?.packetDraft.status === "available"')
        && input.briefcaseDetail.includes('item.packetProgress === "not_started"')
        && input.briefcaseDetail.includes('item.packetProgress === "facts_complete"')
        && input.briefcaseDetail.includes("Complete packet information")
        && input.briefcaseDetail.includes("Review packet facts"),
      "Exact Briefcase matter must use protected packet draft/progress presentation."
    );
    require(
      input.packetInformationPage.includes('item?.packetDraft.status === "available"'),
      "Packet information must require the protected presentation draft."
    );
    require(
      input.reviewPage.includes("<PacketVerificationAction")
        && input.reviewPage.includes('item?.packetDraft.status === "available"')
        && !input.reviewPage.includes("<ConsumerCheckoutButton"),
      "Final verification must delegate payment to the protected PacketVerificationAction."
    );
    require(
      input.verificationAction.includes("const nextActions = packetVerificationActions({ verified, packetReady, mode })")
        && input.verificationAction.includes("nextActions.checkout")
        && input.verificationClient.includes("if (!verified)")
        && input.verificationClient.includes("checkout: !packetReady")
        && input.verificationClient.includes("body: JSON.stringify({ answers, verify: true })"),
      "Consumer Checkout must remain gated by explicit protected verification and absent after immutable Ready."
    );
  } else {
    require(input.briefcaseDetail.includes("Complete packet information") && input.briefcaseDetail.includes("Review for accuracy"), "Exact Briefcase matter must expose packet information and accuracy review.");
    require(input.reviewPage.includes("<ConsumerCheckoutButton") && input.reviewPage.includes('label="Pay $50 and generate my packet"'), "Final accuracy review must own the DTC payment action.");
  }
  require(input.packetButton.includes("/api/expungement-ai/packet/generate"), "Briefcase packet generation must use the existing authenticated API.");
  return issues;
}

function usesProtectedPresentation(input) {
  return Boolean(input.verificationAction)
    || Boolean(input.verificationClient)
    || input.packetInformationPage.includes("decorateBriefcaseItemForPresentation")
    || input.reviewPage.includes("decorateBriefcaseItemForPresentation")
    || input.briefcaseDetail.includes("decorateBriefcaseItemForPresentation");
}
