import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const startPage = read("src/app/expungement-ai/start/page.tsx");
const checkPage = read("src/app/expungement-ai/check/page.tsx");
const statePicker = read("src/components/expungement-ai/screening/StatePicker.tsx");
const screeningRoute = read("src/app/expungement-ai/screening/[state]/page.tsx");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const signInForm = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const payPage = read("src/app/expungement-ai/pay/page.tsx");
const checkoutButton = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
const checkoutRoute = read("src/app/api/expungement-ai/checkout/route.ts");
const packetReadyPage = read("src/app/expungement-ai/packet-ready/page.tsx");
const packetGenerateRoute = read("src/app/api/expungement-ai/packet/generate/route.ts");
const packetGeneration = read("src/lib/expungement-ai/packet-generation.ts");
const briefcaseDetail = read("src/app/briefcase/[packetId]/page.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const savePolicy = read("src/lib/expungement-ai/save-result-policy.ts");
const pendingCreate = read("src/app/api/expungement-ai/screening/pending/route.ts");
const pendingClaim = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");

assert(startPage.includes("/expungement-ai/screening"), "DTC start must route to screening, not account creation.");
assert(!startPage.includes("/expungement-ai/sign-in"), "DTC start must not account-wall free screening.");
assert(checkPage.includes("<StatePicker />"), "DTC check page must render the state picker.");
assert(statePicker.includes('href={`/expungement-ai/screening/${jurisdiction.code}`}'), "DTC state picker must route directly to screening.");
assert(screeningRoute.includes("initialSessionId") && screeningRoute.includes('initialSessionId={initialSessionId}'), "Screening route must keep optional partner session separate from DTC default.");

assert(screeningFlow.includes('const isPartnerSession = Boolean(effectiveInitialSessionId);'), "DTC must default to non-partner when no validated session is present.");
assert(!screeningFlow.includes('type Phase = "questions" | "review"'), "DTC screening flow must not have a new review/account phase in the shared component.");
assert(screeningFlow.includes('if (!isPartnerSession)'), "DTC packet action must remain explicitly separated from partner session mode.");
assert(screeningFlow.includes('next: "/expungement-ai/pay"'), "Anonymous DTC possible-path result must preserve payment as next destination.");
assert(screeningFlow.includes('router.push(`/expungement-ai/sign-in?${params.toString()}`)'), "DTC account creation must happen only after a possible-path result and pending save.");
assert(screeningFlow.includes('router.push(`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.itemId)}`)'), "Authenticated DTC possible-path result must go to payment.");
assert(!dtcBranch(screeningFlow).includes("router.push(BRIEFCASE_PATH)"), "DTC branch must not route directly to Briefcase.");
assert(!dtcBranch(screeningFlow).includes("/expungement-ai/packet-ready"), "DTC branch must not route directly to packet-ready.");

assert(screeningResult.includes("showPacketAction = isPaymentAllowed(evaluation);"), "DTC result CTA must stay clamped to paymentAllowed and packet-ready result codes.");
assert(screeningResult.includes('hasScreeningSession ? translate("result.save_briefcase", "Continue to my Briefcase") : translate("payment.generate_packet", "Generate my packet - $50")'), "DTC result CTA must remain Generate my packet - $50 when no partner session exists.");
assert(!screeningResult.includes("Your Briefcase will still save your screening and next steps."), "Partner-only saved-screening lane copy must not be in shared DTC result UI.");

assert(!signInForm.includes("partner_slug"), "Consumer sign-in form must not include partner attribution fields.");
assert(!signInForm.includes("programUpdatesConsent"), "Consumer sign-in form must not include partner support consent.");
assert(signInForm.includes("Create an account to save your result, continue to checkout"), "DTC account creation copy must remain payment-oriented after result.");
assert(signInForm.includes("expungementAuthRedirectTo(nextPath, pendingId)"), "DTC email verification must preserve next/pending redirect.");

assert(payPage.includes("assertCheckoutAllowed(item);"), "DTC pay page must still require checkout eligibility.");
assert(checkoutButton.includes("/api/expungement-ai/checkout"), "DTC pay page must invoke checkout API.");
assert(checkoutButton.includes("window.location.assign(payload.checkoutUrl)"), "DTC checkout must navigate to Stripe checkout URL.");
assert(checkoutRoute.includes("isPartnerSponsoredPacketItem") && checkoutRoute.includes("Checkout is not used for partner-sponsored RCAP sessions."), "Checkout route must reject partner-sponsored items without weakening DTC checkout.");
assert(packetReadyPage.includes("getConsumerCheckoutStatus"), "DTC packet-ready must remain post-payment confirmation, not first payment gate.");

assert(packetGenerateRoute.includes("generatePaidConsumerPacket"), "Packet generation API must use the payment-aware packet generator.");
assert(packetGeneration.includes("paymentRequired: !(await isPartnerSponsoredPacketItem(item))"), "Unknown/DTC packet generation must default to payment required.");
assert(packetGeneration.includes("ConsumerPacketPaymentRequiredError"), "DTC unpaid packet generation must still fail closed.");
assert(!packetGeneration.includes("recordPartnerPacketUsage"), "Partner cap accounting must not be wired into DTC packet generation until isolated from the consumer path.");

assert(briefcaseDetail.includes("item.paymentAllowed && item.paymentStatus !== \"paid\""), "Unpaid DTC Briefcase matter must show Continue to payment.");
assert(briefcaseDetail.includes("<PacketGenerateButton briefcaseItemId={item.id} />"), "Paid DTC Briefcase matter must still show packet generation UI.");
assert(!briefcaseDetail.includes("Your screening is saved. Open this matter any time"), "Partner-only saved-screening UI must not alter DTC Briefcase detail.");
assert(briefcaseViews.includes("Continue to payment"), "Briefcase overview must keep unpaid DTC payment CTA.");
assert(briefcaseViews.includes("Finish my packet information"), "Briefcase overview must keep paid packet-builder CTA.");

assert(savePolicy.includes("isPartnerSession ? false : evaluationPaymentAllowed"), "Only validated partner context may suppress payment on saved results.");
assert(pendingCreate.includes('product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc"'), "Pending results must default to DTC product.");
assert(pendingClaim.includes('data.product === "rcap_partner" || !item.paymentAllowed') && pendingClaim.includes('/expungement-ai/pay?briefcaseItemId='), "DTC pending claim must route paid results to payment, not Briefcase.");

if (failures.length) {
  console.error("Expungement.ai DTC frozen-flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC frozen-flow verifier passed.");
console.log("DTC remains screening-first, account-after-result, Stripe-required, and paid-Briefcase packet-generation UI is unchanged.");

function dtcBranch(source) {
  const start = source.indexOf("if (!isPartnerSession)");
  const end = source.indexOf("// Partner mode saves only the result.");
  if (start < 0 || end < 0 || end <= start) return "";
  return source.slice(start, end);
}
