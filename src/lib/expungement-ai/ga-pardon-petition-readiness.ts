import "server-only";

import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { GA_PARDON_ROUTE, GA_PARDON_SOURCE, georgiaPardonFacts } from "@/lib/rcap-engine/georgia-pardon-facts";
import { isPacketPlanFulfillmentReady, packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { resolveRoute } from "@/lib/legal-authority/resolve-route";
import { packetFulfillmentAuthority } from "@/lib/expungement-ai/packet-fulfillment-authority";
import routeRatificationRegistry from "@/../data/record-clearing/legal-decisions/route-ratification-registry.json";

// Historical registry projection of the then-unimplemented substantive gate.
// The ratification worksheet (2026-07-01, lines 12–14) names missing gate code,
// not a required favorable court order. The adopted October 13 GA-02 source and
// its exact exclusion/history/traffic matcher implement that gate. Recognize
// only this unchanged legacy row; never rewrite the registry or infer current
// output approval from legal-design adoption.
const IMPLEMENTED_LEGACY_GATE = {
  routeKey: `GA:${GA_PARDON_ROUTE}`,
  status: "hard_gate_pending",
  cautionOverride: false,
  intentionalUnsupported: false,
  inEvaluator: true,
  inCompiledProfile: true,
  compiledStatusAsFound: "hard_gate_pending",
  difference: null,
  staleRecord: false,
  decisionAuthority: "Lawrence (counsel), recorded through docs/RCAP_HELD_ROUTE_RATIFICATION_WORKSHEET.md and the evaluator's ratification sets",
  legalBasis: "Lawrence named substantive gate required before selling"
} as const;

/** GA-02 permits a petition before the court performs its discretionary balance.
 * That is distinct from permission to offer a current packet. Read every authority
 * from the existing server contracts; neither screening answers nor a caller's
 * assertion of approval can open this branch. NO_RECORD keeps the existing held
 * preparation workflow, with no plan, payment or verification authority.
 */
export function georgiaPardonPetitionPlan(profile: EngineProfile, answers: Record<string, unknown>, on: Date) {
  const routeKey = `GA:${GA_PARDON_ROUTE}`;
  if (profile.jurisdiction.code !== "GA" || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812"
    || GA_PARDON_SOURCE !== "GA-02:2026-10-13;GA.memo:ga-pardon-j7;OCGA35-3-37(j)(7)"
    || !Number.isFinite(on.getTime())) return null;
  // The matcher also serves historical diagnostics. Readiness must not coerce
  // an array/class wrapper or overlook an explicitly uncertain global history.
  // The route-specific pending-charge answer remains required by the matcher;
  // an absent redundant legacy global answer does not invent another question.
  if (typeof answers.case_outcome !== "string"
    || !["Misdemeanor conviction", "Felony conviction"].includes(answers.case_outcome)
    || Object.hasOwn(answers, "pending_cases") && answers.pending_cases !== "No" && answers.pending_cases !== false) return null;
  const facts = georgiaPardonFacts(answers, on.toISOString().slice(0, 10));
  if (facts.status !== "review" || !["court_review", "court_review_traffic"].includes(facts.code) || facts.ids.length) return null;
  const ratifications = routeRatificationRegistry.routes.filter(entry => entry.routeKey === routeKey);
  if (ratifications.length !== 1) return null;
  const ratification = ratifications[0];
  const implementedLegacyGate = Object.keys(ratification).length === Object.keys(IMPLEMENTED_LEGACY_GATE).length
    && Object.entries(IMPLEMENTED_LEGACY_GATE).every(([key, value]) => ratification[key as keyof typeof ratification] === value);
  if (!implementedLegacyGate && !(ratification.status === "ratified_deployable" && ratification.intentionalUnsupported === false)) return null;
  const plan = packetPlanForPathway(profile, GA_PARDON_ROUTE);
  if (!isPacketPlanFulfillmentReady(plan) || plan?.mode !== "state_specific_custom_packet_from_source_rules") return null;
  const resolution = resolveRoute({ jurisdiction: "GA", pathwayId: GA_PARDON_ROUTE, on, phase: "PRELIMINARY_SCREENING" });
  if (resolution.routeKey !== routeKey || resolution.contract?.routeKey !== routeKey
    || resolution.serviceDisposition !== "participant_packet" || resolution.outcomeMode !== "participant_packet"
    || resolution.paymentAuthority !== "packet_checkout" || resolution.generationAuthority !== "open"
    || resolution.delivery?.legallyResolved !== true || resolution.delivery.generationAllowed !== true
    || resolution.delivery.paymentAllowed !== true || resolution.delivery.commerciallyDeliverable !== true
    || resolution.missingFacts.length || resolution.rejectedFacts.length || resolution.unsatisfiedPreconditions.length
    || resolution.notYetApplicablePreconditions.length || resolution.selectedFailureDisposition) return null;
  // Exact source-selected track: another instrument on this same route is not
  // the adopted pardon petition. This gate also binds current specification,
  // provider, output approval, observation and the consumer surface posture.
  const fulfillment = packetFulfillmentAuthority("GA", GA_PARDON_ROUTE, "consumer payment authority", { trackId: "ga-pardon-j7" });
  if (!fulfillment.allowed || fulfillment.record.routeKey !== routeKey) return null;
  return plan ?? null;
}
