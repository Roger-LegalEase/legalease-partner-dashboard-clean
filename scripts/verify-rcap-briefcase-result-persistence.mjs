// Regression: a completed screening result is persisted to the Briefcase as a real matter.
//
// Behavioral: the pure save-result policy (status mapping, partner payment override, no-answers
// payload, duplicate selection) is exercised directly. Source: the auth-gated save route, the
// dedupe in the persistence layer, the partner CTA wiring, and the after-login retry are verified.
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
const routeSrc = read("src/app/api/expungement-ai/screening/save-result/route.ts");
assert(routeSrc.includes("getRcapBriefcaseAuthState"), "Save route must check the consumer session.");
assert(routeSrc.includes('"auth_required"') && routeSrc.includes("401"), "Save route must 401 when signed out (for sign-in + retry).");
assert(routeSrc.includes("saveScreeningResultToBriefcase"), "Save route must persist via saveScreeningResultToBriefcase.");
assert(routeSrc.includes("isRcapPartnerScreeningSession"), "Save route must detect partner sessions server-side.");
assert(!routeSrc.includes("body.answers") && !routeSrc.includes("toScreeningAnswers"), "Save route must never read raw answers.");

const briefcaseSrc = read("src/lib/expungement-ai/briefcase.ts");
assert(briefcaseSrc.includes("export async function saveScreeningResultToBriefcase"), "Persistence layer must expose saveScreeningResultToBriefcase.");
assert(briefcaseSrc.includes("findItemForSession(await listBriefcaseItems"), "Persistence save must dedupe by source session.");
assert(briefcaseSrc.includes("export async function isRcapPartnerScreeningSession"), "Persistence layer must expose partner-session detection.");

const flowSrc = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
assert(flowSrc.includes('"/api/expungement-ai/screening/save-result"'), "Partner CTA must POST the result to the save route.");
assert(/if \(!isPartnerSession \|\| !evaluation\) \{\s*router\.push\(PACKET_PATH\)/.test(flowSrc), "DTC (no partner session) must keep the PACKET_PATH route, not save.");
assert(flowSrc.includes('"expungement-ai:pending-briefcase-save"') && flowSrc.includes("/expungement-ai/sign-in?next=/briefcase"), "Signed-out save must stash intent and route to sign-in.");
assert(!/payload = \{[^}]*answers/s.test(flowSrc), "Partner save payload must not include raw answers.");

const pageSrc = read("src/app/briefcase/page.tsx");
assert(pageSrc.includes("<BriefcaseSaveIntent"), "Briefcase home must run the after-login save retry.");
const intentSrc = read("src/components/expungement-ai/BriefcaseSaveIntent.tsx");
assert(intentSrc.includes('"/api/expungement-ai/screening/save-result"') && intentSrc.includes("pending-briefcase-save"), "Save-intent component must replay the stashed save after login.");

if (failures.length) {
  console.error(`verify-rcap-briefcase-result-persistence: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("verify-rcap-briefcase-result-persistence: OK (partner result persists; dedup; guidance_saved; partner packet has no Stripe; DTC $50 preserved)");
