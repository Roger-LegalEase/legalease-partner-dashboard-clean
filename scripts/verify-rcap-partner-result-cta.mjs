// Regression: the screening result CTA must match the server-authoritative flow
// the user arrived through. A UUID-shaped query value is not partner authority.
//
// - Direct-to-consumer (no ?session=): the result discloses the $50 packet
//   price, but saves the matter before the later builder/review pay gate.
// - Partner/session mode (only after the server verifies an active RCAP-benefit
//   session and supplies the prop): the result must NOT show "$50", must offer
//   a Briefcase action, and must route to the exact saved matter, never a
//   consumer payment gate.
//
// Renders the real ScreeningResult and checks the route/flow authority wiring in
// source so the browser cannot opt itself into sponsored presentation.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { ScreeningResult } = await import("../src/components/expungement-ai/screening/ScreeningResult.tsx");
const { isSafeSessionId } = await import("../src/components/expungement-ai/screening/partner-session.ts");
const {
  BriefcaseItemCard,
  BriefcaseOverview,
  MatterStepper,
  PaymentsView
} = await import("../src/components/expungement-ai/BriefcaseViews.tsx");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

// A real v4 session id (the one from the production bug report) and some non-qualifying values.
const VALID_SESSION = "5fd840f9-e562-4201-8eb0-ae67e71ec8f2";
const V7_SESSION = "5fd840f9-e562-7201-8eb0-ae67e71ec8f2"; // version 7 -> outside the v1-5 gate
const GARBAGE_SESSION = "not-a-uuid-1234";

const baseEvaluation = {
  jurisdiction: "MS",
  profileVersion: "test",
  matterId: "matter-test",
  pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  resultCode: "packet_ready",
  userLabel: "A source-defined packet pathway may be available.",
  reasons: [],
  missingQuestionIds: [],
  cautions: [],
  nextSteps: [],
  paymentAllowed: true,
  packetPlan: {
    pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    mode: "state_specific_custom_packet_from_source_rules",
    formMappingStatus: "custom_or_manual_mapping_required",
    sourceFormIds: [],
    requiredInputIds: ["arrest_date", "court"],
    sourceRuleRefs: ["pathways:15-155"]
  }
};

function renderResult(hasScreeningSession) {
  return renderToStaticMarkup(
    React.createElement(ScreeningResult, {
      evaluation: baseEvaluation,
      stateName: "Mississippi",
      questionPromptById: {},
      onEditAnswers: () => {},
      onPacketAction: () => {},
      hasScreeningSession
    })
  );
}

function renderResultWithCode(resultCode, hasScreeningSession, paymentAllowed) {
  return renderToStaticMarkup(
    React.createElement(ScreeningResult, {
      evaluation: {
        ...baseEvaluation,
        resultCode,
        paymentAllowed,
        packetPlan: paymentAllowed ? baseEvaluation.packetPlan : undefined
      },
      stateName: "Mississippi",
      questionPromptById: {},
      onEditAnswers: () => {},
      onPacketAction: () => {},
      hasScreeningSession
    })
  );
}

// Partner result lanes: each result code maps to exactly one forward CTA and never a price.
const PARTNER_LANES = [
  { code: "packet_ready", label: "Continue to packet builder", pay: true },
  { code: "needs_more_info", label: "Continue to my Briefcase", pay: false },
  { code: "guidance_only", label: "View my next steps", pay: false },
  { code: "not_yet", label: "View my Briefcase", pay: false }
];
for (const lane of PARTNER_LANES) {
  const partnerHtml = renderResultWithCode(lane.code, true, lane.pay);
  assert(partnerHtml.includes(lane.label), `Partner lane ${lane.code} must render "${lane.label}".`);
  assert(!/\$50|stripe|checkout/i.test(partnerHtml), `Partner lane ${lane.code} must never render price, Stripe, or Checkout copy.`);
  const dtcHtml = renderResultWithCode(lane.code, false, lane.pay);
  assert(!dtcHtml.includes(lane.label), `DTC must never render the partner lane label "${lane.label}".`);
}

// Shared Briefcase regression: sponsored and guidance matters use the same
// account shell as DTC, but their own cards, steppers, and payment history must
// never inherit consumer checkout copy. Render the real shared components so
// this stays implementation-agnostic.
const fixtureBase = {
  type: "result",
  state: "Mississippi",
  createdAt: "2026-08-15T00:00:00.000Z",
  summary: "Saved result.",
  nextSteps: ["Review your saved next steps."],
  packetReady: false,
  packetStatus: "not_started"
};
const sponsoredPacket = {
  ...fixtureBase,
  id: "11111111-1111-4111-8111-111111111111",
  title: "Mississippi partner-covered packet",
  status: "packet_ready",
  resultCode: "packet_ready_with_caution",
  pathwayLabel: "Non-conviction expungement",
  packetType: "custom_pleading",
  packetReady: true,
  paymentAllowed: false,
  paymentStatus: "not_applicable",
  sourceSessionId: VALID_SESSION
};
const guidanceMatter = {
  ...fixtureBase,
  id: "22222222-2222-4222-8222-222222222222",
  title: "Mississippi guidance",
  status: "guidance_saved",
  resultCode: "guidance_only",
  pathwayLabel: "State-specific next steps",
  packetType: "guidance_packet",
  paymentAllowed: false,
  paymentStatus: "not_applicable",
  sourceSessionId: VALID_SESSION
};
const dtcPacket = {
  ...fixtureBase,
  id: "33333333-3333-4333-8333-333333333333",
  title: "Mississippi consumer packet",
  status: "packet_ready",
  resultCode: "packet_ready_with_caution",
  pathwayLabel: "Non-conviction expungement",
  packetType: "custom_pleading",
  packetReady: true,
  paymentAllowed: true,
  paymentStatus: "unpaid"
};
const dtcPaidPacket = {
  ...dtcPacket,
  id: "44444444-4444-4444-8444-444444444444",
  paymentStatus: "paid"
};

const sponsoredOverviewHtml = renderToStaticMarkup(
  React.createElement(BriefcaseOverview, { items: [sponsoredPacket], userEmail: "synthetic@example.test" })
);
const sponsoredStepperHtml = renderToStaticMarkup(React.createElement(MatterStepper, { item: sponsoredPacket }));
const sponsoredPaymentsHtml = renderToStaticMarkup(React.createElement(PaymentsView, { items: [sponsoredPacket] }));
for (const [surface, html] of [
  ["sponsored Briefcase overview", sponsoredOverviewHtml],
  ["sponsored matter stepper", sponsoredStepperHtml],
  ["sponsored payment history", sponsoredPaymentsHtml]
]) {
  assert(!/\$50|stripe|checkout|continue to payment|you only pay/i.test(html), `${surface} must not leak DTC payment copy.`);
}
assert(!/>Payment</.test(sponsoredStepperHtml), "Sponsored matter stepper must not include a Payment stage.");
assert(/covered through your partner|partner-covered/i.test(sponsoredOverviewHtml), "Sponsored Briefcase overview must explain partner coverage.");

const guidanceOverviewHtml = renderToStaticMarkup(
  React.createElement(BriefcaseOverview, { items: [guidanceMatter], userEmail: "synthetic@example.test" })
);
const guidanceCardHtml = renderToStaticMarkup(React.createElement(BriefcaseItemCard, { item: guidanceMatter }));
const guidanceStepperHtml = renderToStaticMarkup(React.createElement(MatterStepper, { item: guidanceMatter }));
assert(guidanceOverviewHtml.includes("Guidance saved"), "Guidance matter must render its completed Guidance saved value.");
assert(guidanceStepperHtml === "", "Guidance matter must not render a disabled packet stepper.");
assert(!/\$50|stripe|checkout|payment|generate my packet/i.test(`${guidanceOverviewHtml}\n${guidanceCardHtml}`), "Guidance surfaces must not leak packet payment or generation copy.");

const dtcStepperHtml = renderToStaticMarkup(React.createElement(MatterStepper, { item: dtcPacket }));
const dtcPaymentsHtml = renderToStaticMarkup(React.createElement(PaymentsView, { items: [dtcPaidPacket] }));
assert(/>Payment</.test(dtcStepperHtml), "DTC packet matter must retain its Payment stage.");
assert(
  dtcStepperHtml.indexOf("Packet information") < dtcStepperHtml.indexOf("Payment"),
  "DTC matter stepper must put free packet information before the later Payment stage."
);
assert(dtcPaymentsHtml.includes("$50"), "DTC payment history must retain its matter-level $50 price.");

// 1) Only a server-verified partner prop renders the sponsored lane.
const serverVerifiedPartner = renderResult(true);
assert(!serverVerifiedPartner.includes("$50"), "A server-verified partner session must not render '$50'.");
assert(serverVerifiedPartner.includes("Continue to packet builder"), "A server-verified partner session must render the partner packet-builder lane CTA.");
assert(
  serverVerifiedPartner.includes("This screening started through a partner program. You will not be asked to pay here."),
  "A server-verified partner session must render the no-charge partner helper text."
);

// 2) No verified server prop keeps the DTC price disclosure and saves before payment.
const noSession = renderResult(false);
assert(noSession.includes("$50 one time when you are ready to generate this packet"), "No session must render the DTC $50 packet disclosure.");
assert(noSession.includes("Save this matter and continue"), "No session must render the DTC save-before-payment CTA.");
assert(!noSession.includes("Generate my packet - $50"), "The result must not offer immediate pay-and-generate before the builder/review gate.");
assert(!noSession.includes("Continue to packet builder"), "No session must not render a partner lane CTA.");

// 3) URL shape validation is only an input gate for the server lookup. Invalid
// query values are rejected before lookup, and even a valid UUID is not itself
// enough to make the client render partner mode.
for (const bad of [GARBAGE_SESSION, V7_SESSION, ""]) {
  assert(isSafeSessionId(bad) === false, `isSafeSessionId must reject invalid session ${JSON.stringify(bad)}.`);
}
assert(isSafeSessionId(VALID_SESSION) === true, "isSafeSessionId must accept a valid v4 session.");
assert(isSafeSessionId(V7_SESSION) === false, "isSafeSessionId must reject a v7 session.");
assert(isSafeSessionId(null) === false, "isSafeSessionId must reject null.");

// Source wiring: ScreeningFlow derives partner mode only from the server prop,
// never from URL search params or the later client-side save-progress state.
const flowSrc = readFileSync(path.join(process.cwd(), "src/components/expungement-ai/screening/ScreeningFlow.tsx"), "utf8");
assert(!flowSrc.includes("useSearchParams"), "ScreeningFlow must not treat browser search params as partner authority.");
assert(
  /const effectiveInitialSessionId = initialSessionId;/.test(flowSrc),
  "ScreeningFlow must accept partner authority only through the server-validated initialSessionId prop."
);
assert(/const isPartnerSession = Boolean\(effectiveInitialSessionId\);/.test(flowSrc), "Partner mode must derive from effectiveInitialSessionId.");
assert(/useState<string \| undefined>\(effectiveInitialSessionId\)/.test(flowSrc), "sessionId state must initialize from effectiveInitialSessionId.");
assert(!/isPartnerSession = Boolean\(sessionId\)/.test(flowSrc), "Partner mode must NOT derive from the live sessionId state.");
assert(flowSrc.includes("hasScreeningSession={isPartnerSession}"), "ScreeningFlow must pass hasScreeningSession to ScreeningResult.");
// The result action runs through handlePacketAction in both modes. It saves the
// exact matter first; neither partner nor DTC may jump directly from screening
// result to the consumer payment page.
assert(flowSrc.includes("onPacketAction={() => void handlePacketAction()}"), "ScreeningFlow must route the packet action through handlePacketAction.");
assert(flowSrc.includes('/api/expungement-ai/screening/pending'), "Screening result action must persist server-verifiable inputs before claiming a matter.");
assert(flowSrc.includes('/api/expungement-ai/screening/pending/claim'), "Authenticated screening result action must claim the pending result into the exact Briefcase matter.");
assert(flowSrc.includes('product: isPartnerSession ? "rcap_partner" : "expungement_ai_dtc"'), "Pending handoff must keep RCAP and DTC product identity distinct.");
assert(flowSrc.includes("router.push(claimed.redirectTo)"), "Authenticated pending claim must follow the server-authored exact-matter destination.");
assert(!flowSrc.includes('router.push(`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.itemId)}`)'), "DTC result must not bypass the builder/review flow by routing directly to payment.");
assert(!flowSrc.includes('next: "/expungement-ai/pay"'), "Anonymous DTC result handoff must not bypass the saved matter and builder with payment as next.");
assert(!flowSrc.includes('/expungement-ai/packet-ready"'), "DTC packet action must not bypass payment to packet-ready.");

// Source wiring: the route is dynamic and keyed by session mode so partner/DTC never share an instance.
const pageSrc = readFileSync(path.join(process.cwd(), "src/app/expungement-ai/screening/[state]/page.tsx"), "utf8");
assert(/export const dynamic = "force-dynamic";/.test(pageSrc), "Screening route must be force-dynamic so ?session= is always available.");
assert(/key=\{`\$\{state\}:\$\{initialSessionId \?\? "dtc"\}`\}/.test(pageSrc), "ScreeningFlow key must include the session mode.");
assert(pageSrc.includes("isSafeSessionId"), "Screening route must validate the session with the shared isSafeSessionId.");
assert(pageSrc.includes("await isRcapPartnerScreeningSession(candidateSessionId)"), "Screening route must verify active RCAP partner benefit before passing the session prop.");
assert(pageSrc.includes("initialSessionId={initialSessionId}"), "Screening route must pass only the server-verified session id to ScreeningFlow.");

if (failures.length) {
  console.error(`verify-rcap-partner-result-cta: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-partner-result-cta: OK (server-authoritative partner no-price lane; DTC save-before-payment disclosure; session-keyed routing)");
