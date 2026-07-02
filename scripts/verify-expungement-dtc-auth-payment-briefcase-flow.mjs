import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const signIn = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const callback = read("src/app/auth/set-password/page.tsx");
const pendingCreate = read("src/app/api/expungement-ai/screening/pending/route.ts");
const pendingClaim = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const packetButton = read("src/components/expungement-ai/PacketGenerateButton.tsx");

assert(exists("supabase/phase-38-expungement-pending-screening-results.sql"), "Missing pending-result migration file.");
assert(screeningFlow.includes("/api/expungement-ai/screening/save-result"), "DTC must try authenticated result save.");
assert(screeningFlow.includes("/api/expungement-ai/screening/pending"), "Anonymous DTC must create server pending result.");
assert(screeningFlow.includes('next: "/expungement-ai/pay"'), "DTC signup must preserve payment next.");
assert(screeningFlow.includes('product: "expungement_ai_dtc"'), "DTC pending product must be explicit.");
assert(screeningFlow.includes("answers"), "Pending result must persist screening answers server-side.");
assert(signIn.includes("emailRedirectTo: expungementAuthRedirectTo(nextPath, pendingId)"), "DTC signUp must set product-aware emailRedirectTo.");
assert(signIn.includes("absoluteExpungementAiUrl"), "DTC auth redirect must use Expungement.ai base URL fallback.");
assert(callback.includes("claimExpungementPending"), "Auth callback must claim pending result after email verification.");
assert(pendingCreate.includes("consumer_pending_screening_results"), "Pending create route must write pending table.");
assert(pendingClaim.includes("saveScreeningResultToBriefcase"), "Pending claim must attach result to authenticated Briefcase.");
assert(pendingClaim.includes("/expungement-ai/pay?briefcaseItemId="), "DTC pending claim must redirect to payment item.");
assert(pendingClaim.includes('data.product === "rcap_partner"'), "Partner pending claim must bypass Stripe.");
assert(briefcaseViews.includes("Continue to payment"), "Briefcase must expose payment-pending CTA.");
assert(briefcaseViews.includes("Finish my packet information"), "Briefcase must expose packet-info CTA.");
assert(packetButton.includes("/api/expungement-ai/packet/generate"), "Briefcase must generate packets through existing API.");
assert(!screeningFlow.includes("/expungement-ai/packet-ready\""), "DTC result action must not bypass payment to packet-ready.");

if (failures.length) {
  console.error("Expungement.ai DTC auth/payment/briefcase flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Expungement.ai DTC auth/payment/briefcase flow verifier passed.");
