import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const MO_CLOSED_RECORD_ROUTE = "closed-record-outcome-under-rsmo-610-105";

/** §610.105.1 and the adopted MO-02 status-verification scope do not make
 * financial satisfaction a predicate for this status-verification route. This controls only the
 * relevance of an existing question on the selected closure-guidance route.
 * It does not determine final termination, completed closure, SIS/SES status,
 * restricted access, or a person's distinct request for §610.140 expungement.
 */
export function missouriClosedRecordQuestionApplies(
  jurisdiction: string, pathwayId: string | null | undefined,
  _answers: Record<string, unknown>, questionId: string, profile?: EngineProfile
): boolean {
  return !(jurisdiction === "MO" && pathwayId === MO_CLOSED_RECORD_ROUTE
    && questionId === "financial_obligations" && Boolean(profile)
    && isMissouriClosureGuidanceWithoutIdentityForm(profile!, MO_CLOSED_RECORD_ROUTE));
}

/** The exact retained §610.145 mistaken-identity form is not a §610.105
 * participant filing. Preserve every unmatched source contract and sibling. */
export function isMissouriClosureGuidanceWithoutIdentityForm(profile: EngineProfile, pathwayId: string): boolean {
  const pathway = profile.pathways.find(candidate => candidate.id === pathwayId);
  const posture = pathway as { filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find(candidate => candidate.pathwayId === pathwayId);
  const form = plan?.formCandidates?.[0];
  return profile.jurisdiction.code === "MO" && pathwayId === MO_CLOSED_RECORD_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "ddb1a8ea6c0d878f5a81d59e2a7e32cd7927436e9fb6fee8e8e8629ba7c62304"
    && pathway?.legalAuthority?.decisionId === "LD-MO-02"
    && pathway.legalAuthority.ruleId === "MO-610.105-610.122-610.145-THREE-CORRECTION-MECHANISMS"
    && pathway.legalAuthority.outcomeMode === "automatic_relief" && pathway.legalAuthority.paymentAuthority === "closed"
    && posture?.filingRequired === false && posture.routeType === "automatic"
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "source_candidate_identified"
    && JSON.stringify(plan.sourceRuleRefs) === JSON.stringify(["section:7-22", "section:134-155", "corpus-unit:9", "corpus-unit:59", "corpus-unit:58"])
    && plan.formCandidates?.length === 1 && form?.relativePath === "LegalEase Missouri/petition-for-expungement-mistaken-identity.pdf"
    && form.sha256 === "5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8";
}
