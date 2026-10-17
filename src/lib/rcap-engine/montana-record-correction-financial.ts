import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const MT_RECORD_FINANCIAL_ROUTES = [
  "doj-record-removal-update-request",
  "non-conviction-criminal-history-removal-through-criss"
] as const;

/** LD-MT-02 administrative correction and LD-MT-03 nonconviction removal
 * concern the record/disposition, not payment of a sentence. This narrow
 * question applicability contract does not select a route, establish that
 * CRISS acted, supply a dismissal/order or open a document/payment authority.
 * Convictions and unresolved outcomes retain their existing source review. */
export function montanaRecordFinancialApplies(profile: EngineProfile,
  pathwayId: string | null | undefined, answers: Readonly<Record<string, unknown>>, id: string): boolean {
  if (id !== "financial_obligations" || !montanaRecordFinancialContract(profile, pathwayId)) return true;
  return !["Arrest or citation with no charge filed", "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    "Acquitted or found not guilty"].some(outcome => answers.case_outcome === outcome);
}

export function montanaRecordFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "MT" || !MT_RECORD_FINANCIAL_ROUTES.some(id => id === pathwayId)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "a415dd4d99328420d5b3c632c62da96ea554f371ce2f93cd00be7af5c6790395") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  const authority = route?.legalAuthority;
  const posture = route as { filingRequired?: unknown; routeType?: unknown } | undefined;
  // Retained authority fields are guard inputs, not new intake questions.
  const expectedFacts = pathwayId === MT_RECORD_FINANCIAL_ROUTES[0]
    ? ["Record source and error?", "Disposition/order?", "Agency response?", "Marijuana statute/conduct/quantity?",
      "Sentence status?", "Completion?", "Requested expungement versus redesignation?"]
    : ["Arrest date?", "Charge filing?", "Final disposition?", "Invalidation order?", "CRISS record status?",
      "Agency/court reporting?", "Pre/post-July 1, 2017 record?"];
  if (JSON.stringify(authority?.requiredFacts) !== JSON.stringify(expectedFacts)
    || JSON.stringify(authority?.screeningFactIds) !== JSON.stringify(["case_outcome"])) return false;
  return pathwayId === MT_RECORD_FINANCIAL_ROUTES[0]
    ? authority?.decisionId === "LD-MT-02" && authority.ruleId === "MT-DOJ-CORRECTION-VS-16-12-113-MARIJUANA-SPLIT"
      && authority.statute === "Mont. Code Ann. § 44-5-215" && authority.stage === "single_stage"
      && authority.outcomeMode === "agency_application" && authority.paymentAuthority === "packet_checkout"
      && posture?.filingRequired === true && posture.routeType === "administrative"
    : authority?.decisionId === "LD-MT-03" && authority.ruleId === "MT-44-5-202-NONCONVICTION-AUTOMATIC-CORRECTION"
      && authority.statute === "Mont. Code Ann. § 44-5-202" && authority.stage === "automatic"
      && authority.outcomeMode === "guidance_status" && authority.paymentAuthority === "closed"
      && posture?.filingRequired === false && posture.routeType === "automatic_guidance";
}
