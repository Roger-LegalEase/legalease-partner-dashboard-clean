// Regression: a completed screening result is persisted to the Briefcase as a real matter.
//
// Behavioral: the pure save-result policy (status mapping, partner payment override, no-answers
// output, duplicate selection) is exercised directly. Source: the Phase 55 server-authoritative
// pending-result handoff, retired browser-result writer, partner validation, persistence layer,
// exact-matter redirect, packet-information flow, and after-login retry are verified.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";

const policy = await import("../src/lib/expungement-ai/save-result-policy.ts");
const { statusForResultCode, resolveSavePaymentAllowed, buildSaveInput, isStorableResultCode, normalizePacketType, findItemForSession } = policy;

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function read(rel) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const SESSION = "5fd840f9-e562-4201-8eb0-ae67e71ec8f2";

// 1) Status mapping covers the result codes the Briefcase shows.
assert(statusForResultCode("packet_ready") === "packet_ready", "packet_ready must map to packet_ready status.");
assert(statusForResultCode("guidance_only") === "guidance_saved", "guidance_only must map to guidance_saved status.");
assert(statusForResultCode("not_yet") === "waiting", "not_yet must map to waiting.");
assert(statusForResultCode("likely_not_eligible") === "not_eligible", "likely_not_eligible must map to not_eligible.");

// 2) RCAP partner sessions never carry a payment gate; DTC keeps the engine's value.
assert(resolveSavePaymentAllowed(true, true) === false, "Partner session must force paymentAllowed false (no Stripe).");
assert(resolveSavePaymentAllowed(false, true) === true, "DTC must keep the engine paymentAllowed (the $50 path).");

// 3) packet_ready on a partner session saves without Stripe.
const partnerPacket = buildSaveInput(
  { userId: "u1", jurisdiction: "Mississippi", resultCode: "packet_ready", pathwayLabel: "Mississippi record-clearing", packetType: "custom_pleading", paymentAllowed: true, summary: "saved", nextSteps: ["a", "b"], sourceSessionId: SESSION },
  { isPartnerSession: true }
);
assert(partnerPacket.itemType === "result", "Saved matter must be itemType 'result'.");
assert(partnerPacket.status === "packet_ready", "Partner packet_ready must save as packet_ready status.");
assert(partnerPacket.paymentAllowed === false, "Partner packet_ready must save with paymentAllowed false.");
assert(partnerPacket.paymentStatus === "not_applicable", "Partner packet must not be marked unpaid/payable.");
assert(partnerPacket.sourceSessionId === SESSION, "Saved matter must carry the source session id.");

// 4) guidance_only saves as Guidance saved.
const guidance = buildSaveInput(
  { userId: "u1", jurisdiction: "California", resultCode: "guidance_only", paymentAllowed: false, summary: "saved", nextSteps: ["x"], sourceSessionId: SESSION },
  { isPartnerSession: true }
);
assert(guidance.status === "guidance_saved", "guidance_only must save as guidance_saved.");
assert(guidance.paymentAllowed === false, "guidance_only must never be payable.");

// 5) DTC (no partner session) build keeps the payable result.
const dtc = buildSaveInput(
  { userId: "u1", jurisdiction: "Texas", resultCode: "packet_ready", paymentAllowed: true, summary: "saved", nextSteps: [] },
  { isPartnerSession: false }
);
assert(dtc.paymentAllowed === true && dtc.paymentStatus === "unpaid", "DTC packet_ready must keep paymentAllowed/unpaid.");

// 6) Raw screening answers are never part of the saved shape.
assert(!Object.keys(partnerPacket).includes("answers"), "Saved input must not include screening answers.");

// 7) Validation guards.
assert(isStorableResultCode("packet_ready") && !isStorableResultCode("totally_bogus"), "Result-code validation must gate unknown codes.");
assert(normalizePacketType("guidance_packet") === "guidance_packet" && normalizePacketType("nope") === undefined, "Packet-type validation must gate unknown types.");

// 8) Duplicate protection: an existing matter for the session is reused, not duplicated.
const existing = [{ id: "m1", sourceSessionId: SESSION }, { id: "m2", sourceSessionId: "other" }];
assert(findItemForSession(existing, SESSION)?.id === "m1", "findItemForSession must return the existing matter for the session.");
assert(findItemForSession(existing, undefined) === null, "No session id means no dedupe match.");
assert(findItemForSession([], SESSION) === null, "Empty briefcase yields no dedupe match.");

// --- Source wiring ---
const sources = {
  retiredSave: read("src/app/api/expungement-ai/screening/save-result/route.ts"),
  pendingCreate: read("src/app/api/expungement-ai/screening/pending/route.ts"),
  pendingClaim: read("src/app/api/expungement-ai/screening/pending/claim/route.ts"),
  briefcase: read("src/lib/expungement-ai/briefcase.ts"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  documents: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  matterPage: read("src/app/briefcase/[packetId]/page.tsx"),
  packetInformationPage: read("src/app/briefcase/[packetId]/packet-information/page.tsx"),
  reviewPage: read("src/app/briefcase/[packetId]/review/page.tsx"),
  verificationAction: read("src/components/expungement-ai/PacketVerificationAction.tsx"),
  presentationAuthority: read("src/lib/expungement-ai/briefcase-presentation-authority.ts"),
  packetInformationRoute: read("src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts"),
  verificationCas: read("src/lib/expungement-ai/verification-cas.ts"),
  flow: read("src/components/expungement-ai/screening/ScreeningFlow.tsx"),
  briefcasePage: read("src/app/briefcase/page.tsx"),
  saveIntent: read("src/components/expungement-ai/BriefcaseSaveIntent.tsx")
};

for (const failure of persistenceWiringViolations(sources)) failures.push(failure);

// Negative controls prove this verifier rejects actual Phase 55 persistence regressions rather
// than merely accepting the source shape currently in the tree.
const browserResultWriterRestored = {
  ...sources,
  retiredSave: sources.retiredSave.replace("{ status: 410 }", "{ status: 200 }")
};
assert(
  persistenceWiringViolations(browserResultWriterRestored).some((failure) => failure.includes("retired browser-result writer")),
  "Negative control failed: restoring the browser-result writer was not detected."
);

const nonAuthoritativeClaim = {
  ...sources,
  pendingClaim: sources.pendingClaim.replaceAll("saveAuthoritativeScreeningResultToBriefcase", "saveScreeningResultToBriefcase")
};
assert(
  persistenceWiringViolations(nonAuthoritativeClaim).some((failure) => failure.includes("server-authoritative writer")),
  "Negative control failed: replacing the server-authoritative writer was not detected."
);

const bypassedPendingClaim = {
  ...sources,
  flow: sources.flow.replace('"/api/expungement-ai/screening/pending/claim"', '"/api/expungement-ai/screening/save-result"')
};
assert(
  persistenceWiringViolations(bypassedPendingClaim).some((failure) => failure.includes("claim the stored inputs")),
  "Negative control failed: bypassing the server-verified pending claim was not detected."
);

const rawPresentationFallback = {
  ...sources,
  documents: `${sources.documents}\npacketCompletionActionFor(item)`,
  matterPage: `${sources.matterPage}\npacketInformationModelFor(storedItem)`
};
assert(
  persistenceWiringViolations(rawPresentationFallback).some((failure) => failure.includes("raw writable Briefcase fields")),
  "Negative control failed: raw packet presentation helpers were not rejected."
);

const directCheckoutReview = {
  ...sources,
  reviewPage: sources.reviewPage.replace("<PacketVerificationAction", "<ConsumerCheckoutButton")
};
assert(
  persistenceWiringViolations(directCheckoutReview).some((failure) => failure.includes("delegate post-verification")),
  "Negative control failed: direct Checkout on review was not rejected."
);

if (failures.length) {
  console.error(`verify-rcap-briefcase-result-persistence: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("verify-rcap-briefcase-result-persistence: OK (server-authoritative claim persists; dedup; guidance_saved; partner packet has no Stripe; DTC $50 preserved)");
console.log("Negative controls detected restoration of browser-result persistence, loss of the authoritative writer, bypass of the verified claim, raw presentation fallback, and direct Checkout on review.");

function persistenceWiringViolations(input) {
  const issues = [];
  const require = (condition, message) => {
    if (!condition) issues.push(message);
  };
  const actionStart = input.flow.indexOf("async function handlePacketAction()");
  const actionEnd = input.flow.indexOf("function handleContinue()", actionStart);
  const resultAction = actionStart >= 0 && actionEnd > actionStart
    ? input.flow.slice(actionStart, actionEnd)
    : input.flow;

  require(input.retiredSave.includes("screening_save_result_retired") && input.retiredSave.includes("{ status: 410 }"), "The retired browser-result writer must remain fail-closed with HTTP 410.");
  require(!input.retiredSave.includes("getRcapBriefcaseAuthState") && !input.retiredSave.includes("saveScreeningResultToBriefcase"), "The retired browser-result writer must not retain a persistence path.");

  require(input.pendingCreate.includes("evaluateAuthoritativeScreeningResult"), "Pending-result creation must evaluate submitted screening inputs server-side.");
  require(input.pendingCreate.includes("consumer_pending_screening_results") && input.pendingCreate.includes("screening_answers: body.answers"), "Pending-result creation must store the verified inputs for authenticated re-evaluation.");
  require(input.pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Unknown pending-result product input must default to DTC.");

  require(input.pendingClaim.includes("getRcapBriefcaseAuthState") && input.pendingClaim.includes('error: "auth_required"') && input.pendingClaim.includes("status: 401"), "Pending claims must require the authenticated consumer session.");
  require(input.pendingClaim.includes("evaluateAuthoritativeScreeningResult"), "Pending claims must re-evaluate stored inputs before persistence.");
  require(input.pendingClaim.includes("saveAuthoritativeScreeningResultToBriefcase"), "Pending claims must use the server-authoritative writer.");
  require(input.pendingClaim.includes('data.product === "rcap_partner"') && input.pendingClaim.includes("isRcapPartnerScreeningSession"), "Only a server-validated partner session may receive sponsored persistence posture.");
  require(input.pendingClaim.includes("buildSaveInput") && input.pendingClaim.includes("{ isPartnerSession }"), "The verified partner posture must clamp payment during save-input construction.");
  require(input.pendingClaim.includes('stage: "not_started"') && input.pendingClaim.includes("requiredInputIds"), "Packet-ready saves must attach the prepayment packet-information model.");
  require(input.pendingClaim.includes("redirectTo: `/briefcase/${encodeURIComponent(item.id)}`"), "Pending claims must return the exact saved Briefcase matter.");
  require(!input.pendingClaim.includes("createConsumerPacketCheckout") && !input.pendingClaim.includes("stripe"), "Pending claims must not create Checkout or call Stripe.");

  require(input.briefcase.includes("export async function saveAuthoritativeScreeningResultToBriefcase"), "Persistence must expose the server-authoritative writer.");
  require(input.briefcase.includes("input.item.userId !== input.authenticatedUserId"), "Authoritative persistence must reject owner mismatch.");
  require(input.briefcase.includes('.eq("source_session_id", clamped.sourceSessionId)'), "Authoritative persistence must dedupe by the server-bound source session.");
  require(input.briefcase.includes("artifact_refs_json: clamped.artifactRefs ?? {}"), "New authoritative matters must preserve server-projected artifact metadata.");
  require(input.briefcase.includes('packet_status: clamped.packetStatus ?? "not_started"'), "New authoritative matters must default packet_status to not_started before generation.");
  require(input.briefcase.includes("export async function isRcapPartnerScreeningSession"), "Persistence must expose server-side partner-session validation.");

  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Partner-sponsored matters must not enter checkout.");
  require(input.presentationAuthority.includes("export async function decorateBriefcaseItemForPresentation")
    && input.presentationAuthority.includes("packetProgress")
    && input.presentationAuthority.includes("packetDraft")
    && input.presentationAuthority.includes("readProtectedPacketVerification")
    && input.presentationAuthority.includes("readProtectedPacketArtifact"), "Briefcase presentation must be decorated from protected server authority.");
  require(input.documents.includes("BriefcasePresentationItem")
    && input.documents.includes('item.artifact.status === "ready"')
    && input.documents.includes("item.artifact.canDownload")
    && input.documents.includes("artifact.documents"), "Briefcase documents must use the protected presentation artifact and downloads.");
  require(input.matterPage.includes("decorateBriefcaseItemForPresentation")
    && input.matterPage.includes(".packetDraft.status")
    && input.matterPage.includes(".packetProgress"), "Exact matters must use protected packet draft/progress presentation.");
  require(input.packetInformationPage.includes("decorateBriefcaseItemForPresentation")
    && input.packetInformationPage.includes(".packetDraft.status"), "Packet information must use the protected presentation draft.");
  require(input.reviewPage.includes("decorateBriefcaseItemForPresentation")
    && input.reviewPage.includes("<PacketVerificationAction")
    && !input.reviewPage.includes("<ConsumerCheckoutButton"), "Final review must delegate post-verification payment and generation from protected presentation state.");
  require(input.verificationAction.includes("packetVerificationActions({ verified, packetReady, mode })")
    && input.verificationAction.includes("requestPacketVerification")
    && input.verificationAction.includes("{nextActions.checkout ? (")
    && input.verificationAction.includes("{nextActions.generation?.mode"), "PacketVerificationAction must keep generation and Checkout behind explicit current verification.");
  require(!input.documents.includes("packetCompletionActionFor")
    && !input.documents.includes("packetInformationModelFor")
    && !input.matterPage.includes("packetCompletionActionFor")
    && !input.matterPage.includes("packetInformationModelFor")
    && !input.packetInformationPage.includes("packetInformationModelFor")
    && !input.reviewPage.includes("packetInformationModelFor"), "Participant presentation must never fall back to raw writable Briefcase fields or legacy packet models.");
  require(input.packetInformationRoute.includes("readProtectedPacketVerification")
    && input.packetInformationRoute.includes("protectedPacketInformationModelFor")
    && input.packetInformationRoute.includes("persistProtectedPacketVerification"), "Packet information saves and verification must cross the protected CAS boundary.");
  require(input.verificationCas.includes('rpcName: "persist_consumer_packet_verification"')
    && input.verificationCas.includes("expectedPriorHash")
    && input.verificationCas.includes("expectedPriorRevision"), "Protected packet updates must retain hash/revision compare-and-swap handoff.");

  require(resultAction.includes('"/api/expungement-ai/screening/pending"'), "The completed result action must create a server-side pending result.");
  require(resultAction.includes('"/api/expungement-ai/screening/pending/claim"'), "The completed result action must claim the stored inputs through the server-verified boundary.");
  require(resultAction.includes("answers: toScreeningAnswers(evaluatedAnswers ?? answers)"), "The pending handoff must send the evaluated screening inputs for authoritative evaluation.");
  require(resultAction.includes('body: JSON.stringify({ pendingId: pending.pendingId, next: "/briefcase" })'), "The result action must enter the free Briefcase before payment.");
  require(!resultAction.includes("/expungement-ai/pay") && !resultAction.includes("checkout"), "The result action must not bypass packet information and final review.");

  require(input.briefcasePage.includes("<BriefcaseSaveIntent"), "Briefcase home must retain the after-login pending-claim retry.");
  require(input.saveIntent.includes('"/api/expungement-ai/screening/pending/claim"') && input.saveIntent.includes("pendingId"), "Save-intent component must replay only the stored pending claim after login.");
  require(!input.saveIntent.includes("pending-briefcase-save") && !input.saveIntent.includes('"/api/expungement-ai/screening/save-result"'), "Save-intent component must not replay browser-stashed result identity.");

  return issues;
}
