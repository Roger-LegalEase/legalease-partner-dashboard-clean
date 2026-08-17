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
  packetGeneration: read("src/lib/expungement-ai/packet-generation.ts"),
  checkoutRoute: read("src/app/api/expungement-ai/checkout/route.ts"),
  documents: read("src/components/expungement-ai/BriefcaseViews.tsx"),
  matterPage: read("src/app/briefcase/[packetId]/page.tsx"),
  generateRoute: read("src/app/api/rcap/documents/[packetId]/generate/route.ts"),
  msForm: read("src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx"),
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

if (failures.length) {
  console.error(`verify-rcap-briefcase-result-persistence: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("verify-rcap-briefcase-result-persistence: OK (server-authoritative claim persists; dedup; guidance_saved; partner packet has no Stripe; DTC $50 preserved)");
console.log("Negative controls detected restoration of browser-result persistence, loss of the authoritative writer, and bypass of the verified claim.");

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

  require(input.packetGeneration.includes("paymentRequired: !(await isPartnerSponsoredPacketItem(item))"), "Partner-sponsored packet generation must not require payment.");
  require(input.packetGeneration.includes('resultCode === "packet_ready" || resultCode === "packet_ready_with_caution"'), "Only packet-ready result codes may generate packets.");
  require(input.packetGeneration.includes('item.packetStatus === "ready" && existing'), "Duplicate generation must return an existing ready artifact instead of regenerating.");
  require(input.packetGeneration.includes("attachPacketToBriefcaseItem") && input.packetGeneration.includes('packetStatus: "ready"'), "Packet generation must attach artifact refs and mark packet_status ready.");
  require(input.packetGeneration.includes("mississippi_petition_information_required"), "Mississippi partner saves must retain the completion action when packet fields are missing.");
  require(input.packetGeneration.includes("attachMississippiLegacyPacketArtifact") && input.packetGeneration.includes("mississippi_legacy_petition_packet"), "Generated Mississippi legacy PDFs must attach as distinguishable consumer artifacts.");

  require(input.checkoutRoute.includes("isPartnerSponsoredPacketItem") && input.checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Partner-sponsored matters must not enter checkout.");
  require(input.documents.includes("packetCompletionActionFor") && input.documents.includes("Complete packet information"), "Briefcase views must expose packet information before generation.");
  require(input.documents.includes("Download") && input.documents.includes("artifact.downloadPath"), "Briefcase documents must expose generated packet downloads.");
  require(input.matterPage.includes("packetInformationModelFor") && input.matterPage.includes("Complete packet information") && input.matterPage.includes("Review for accuracy"), "Exact matters must expose packet information and accuracy review before consumer payment.");
  require(input.generateRoute.includes("consumerBriefcaseItemId") && input.generateRoute.includes("attachMississippiLegacyPacketArtifact"), "Shared document generation must bridge generated Mississippi PDFs back to the consumer Briefcase.");
  require(input.msForm.includes("consumerBriefcaseItemId") && input.msForm.includes("generate"), "Mississippi information form must carry the consumer matter id through generation.");

  require(resultAction.includes('"/api/expungement-ai/screening/pending"'), "The completed result action must create a server-side pending result.");
  require(resultAction.includes('"/api/expungement-ai/screening/pending/claim"'), "The completed result action must claim the stored inputs through the server-verified boundary.");
  require(resultAction.includes("answers: toScreeningAnswers(answers)"), "The pending handoff must send screening inputs for authoritative evaluation.");
  require(resultAction.includes('body: JSON.stringify({ pendingId: pending.pendingId, next: "/briefcase" })'), "The result action must enter the free Briefcase before payment.");
  require(!resultAction.includes("/expungement-ai/pay") && !resultAction.includes("checkout"), "The result action must not bypass packet information and final review.");

  require(input.briefcasePage.includes("<BriefcaseSaveIntent"), "Briefcase home must retain the after-login pending-claim retry.");
  require(input.saveIntent.includes('"/api/expungement-ai/screening/pending/claim"') && input.saveIntent.includes("pendingId"), "Save-intent component must replay only the stored pending claim after login.");
  require(!input.saveIntent.includes("pending-briefcase-save") && !input.saveIntent.includes('"/api/expungement-ai/screening/save-result"'), "Save-intent component must not replay browser-stashed result identity.");

  return issues;
}
