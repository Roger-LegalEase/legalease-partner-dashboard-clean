import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sources = {
  screeningFlow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  signIn: read("src/components/expungement-ai/ConsumerSignInForm.tsx"),
  callback: read("src/app/auth/set-password/page.tsx"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  briefcaseDetail: read("src/app/briefcase/[packetId]/page.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  packetButton: read("src/components/expungement-ai/PacketGenerateButton.tsx")
};

assert(exists("supabase/phase-38-expungement-pending-screening-results.sql"), "Missing pending-result migration file.");
for (const message of authBriefcaseFlowViolations(sources)) failures.push(message);

const genericBriefcaseRedirect = {
  ...sources,
  pendingClaim: sources.pendingClaim.replace(
    "redirectTo: `/briefcase/${encodeURIComponent(item.id)}`",
    'redirectTo: "/briefcase"'
  )
};
assert(
  authBriefcaseFlowViolations(genericBriefcaseRedirect).some((message) => message.includes("exact saved matter")),
  "Negative control failed: a generic post-auth Briefcase redirect was not detected."
);

if (failures.length) {
  console.error("Expungement.ai DTC auth/free-Briefcase flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC auth/free-Briefcase flow verifier passed.");
console.log("Pending results survive account creation, land on the exact free matter, and reach Checkout only after packet information and accuracy review.");
console.log("Negative control detected loss of the exact-matter post-auth redirect.");

function authBriefcaseFlowViolations(input) {
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  const start = input.screeningFlow.indexOf("async function handlePacketAction()");
  const end = input.screeningFlow.indexOf("function handleContinue()", start);
  const handoff = start >= 0 && end > start ? input.screeningFlow.slice(start, end) : input.screeningFlow;

  require(handoff.includes("/api/expungement-ai/screening/pending"), "Every authoritative DTC result must create a server-side pending result.");
  require(handoff.includes('product: isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending result must preserve explicit DTC versus RCAP attribution.");
  require(handoff.includes("answers: toScreeningAnswers(answers)"), "Pending result must persist screening inputs for server-authoritative re-evaluation.");
  require(handoff.includes('next: "/briefcase"'), "DTC auth handoff must return to the free Briefcase before payment.");
  require(!handoff.includes("/expungement-ai/pay") && !handoff.includes("checkout"), "DTC auth handoff must not bypass packet information and final review.");
  require(!handoff.includes('/expungement-ai/packet-ready"'), "DTC result action must not bypass review and payment to packet-ready.");

  require(input.signIn.includes("emailRedirectTo: expungementAuthRedirectTo(requestContext.nextPath, requestContext.pendingId)"), "DTC sign-up must preserve the product-aware pending-result redirect.");
  require(input.signIn.includes("absoluteExpungementAiUrl"), "DTC auth redirect must retain the Expungement.ai base URL fallback.");
  require(input.signIn.includes("claimPendingResult(requestContext.pendingId, requestContext.nextPath)"), "Authenticated sign-in must claim the pending result before navigation.");
  require(input.signIn.includes("isExactBriefcaseMatterPath"), "Client auth handoff must accept only an exact Briefcase matter path.");
  require(input.callback.includes("claimExpungementPending"), "Email confirmation callback must claim the pending result.");

  require(input.pendingCreate.includes("consumer_pending_screening_results"), "Pending create route must persist to the pending-results table.");
  require(input.pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Pending create route must default unknown product input to DTC.");
  require(input.pendingClaim.includes("evaluateAuthoritativeScreeningResult"), "Pending claim must re-evaluate stored screening inputs.");
  require(input.pendingClaim.includes("saveAuthoritativeScreeningResultToBriefcase"), "Pending claim must persist the server-authoritative result.");
  require(input.pendingClaim.includes('data.product === "rcap_partner"') && input.pendingClaim.includes("isRcapPartnerScreeningSession"), "Partner sponsorship must be validated independently during claim.");
  require(input.pendingClaim.includes("redirectTo: `/briefcase/${encodeURIComponent(item.id)}`"), "Pending claim must route to the exact saved matter.");
  require(!input.pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "Pending claim must not route directly to payment.");

  require(input.briefcaseDetail.includes("Complete packet information") && input.briefcaseDetail.includes("Review for accuracy"), "Exact Briefcase matter must expose packet information and accuracy review.");
  require(input.reviewPage.includes("<ConsumerCheckoutButton") && input.reviewPage.includes('label="Pay $50 and generate my packet"'), "Final accuracy review must own the DTC payment action.");
  require(input.packetButton.includes("/api/expungement-ai/packet/generate"), "Briefcase packet generation must use the existing authenticated API.");
  return issues;
}
