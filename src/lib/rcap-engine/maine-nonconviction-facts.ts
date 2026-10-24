import type { EngineProfile } from "@/lib/rcap-engine/contracts";

/** §703(2)(H), ME.memo/me-nonconv and the adopted ME-03 guidance scope:
 * the adult acquittal record-information branch has no financial predicate.
 * This suppresses an irrelevant question only. It never promises confidentiality,
 * equates an insanity disposition with acquittal, creates CR-218, or opens payment.
 * Other outcomes and unknown/juvenile ages retain their existing review.
 */
export const ME_NONCONVICTION_ROUTE = "adult-non-conviction-record-relief";

export function maineNonconvictionQuestionApplies(
  jurisdiction: string,
  pathwayId: string | null | undefined,
  answers: Record<string, unknown>,
  questionId: string
): boolean {
  if (questionId !== "financial_obligations" || jurisdiction !== "ME"
    || pathwayId !== ME_NONCONVICTION_ROUTE
    || answers.case_outcome !== "Acquitted or found not guilty") return true;
  return !knownAdultAge(answers.age_at_offense);
}

function knownAdultAge(value: unknown): boolean {
  let rawAge = value;
  if (rawAge && typeof rawAge === "object" && !Array.isArray(rawAge)) {
    const wrapped = rawAge as Record<string, unknown>;
    if (wrapped.unknown !== false || Object.keys(wrapped).some(key => !["value", "unknown"].includes(key))) return false;
    rawAge = wrapped.value;
  }
  const age = typeof rawAge === "number" ? rawAge
    : typeof rawAge === "string" && /^\d+$/.test(rawAge.trim()) ? Number(rawAge) : NaN;
  return Number.isSafeInteger(age) && age >= 18;
}

/** The retained CR-218 candidate belongs to conviction sealing, not this
 * adopted non-conviction guidance contract. Preserve unknown/future contracts
 * for review rather than applying this correction to an unmatched source. */
export function isMaineNonconvictionGuidanceWithoutCr218(profile: EngineProfile, pathwayId: string): boolean {
  const pathway = profile.pathways.find(candidate => candidate.id === pathwayId);
  const posture = pathway as { filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find(candidate => candidate.pathwayId === pathwayId);
  const form = plan?.formCandidates?.[0];
  return profile.jurisdiction.code === "ME" && pathwayId === ME_NONCONVICTION_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "807065d4f7af52ad4f58e107f776833df6cd828ece6ab950f81c4efe3e5ac577"
    && pathway?.legalAuthority?.decisionId === "NATIONAL-2026-08-28-B-ME-03"
    && pathway.legalAuthority.ruleId === "ME-703-2-DEFERRED-DISPOSITION-NOT-ESTABLISHED"
    && pathway.legalAuthority.outcomeMode === "guidance_status" && pathway.legalAuthority.paymentAuthority === "closed"
    && posture?.filingRequired === false && posture.routeType === "automatic_guidance"
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "source_candidate_identified"
    && plan.sourceRuleRefs?.length === 2 && plan.sourceRuleRefs[0] === "section:134-145" && plan.sourceRuleRefs[1] === "corpus-unit:51"
    && plan.formCandidates?.length === 1 && form?.relativePath === "LegalEase Maine/MJB-Form-cr-218.pdf"
    && form.sha256 === "82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4";
}

/** Correction context only. Dismissal keeps its existing unresolved financial
 * predicate; neither outcome establishes completed confidential treatment. */
export function maineNonconvictionCorrectionApplies(jurisdiction: string, pathwayId: string | null | undefined, answers: Record<string, unknown>): boolean {
  return jurisdiction === "ME" && pathwayId === ME_NONCONVICTION_ROUTE
    && ["Acquitted or found not guilty", "Dismissed, no-billed, nolle prosequi, or not prosecuted"].includes(String(answers.case_outcome))
    && knownAdultAge(answers.age_at_offense);
}

export function maineMissingFinancialCorrectionPathway(jurisdiction: string, pathwayId: string | null | undefined, answers: Record<string, unknown>, missingQuestionIds: string[]): boolean {
  return maineNonconvictionCorrectionApplies(jurisdiction, pathwayId, answers)
    && answers.case_outcome === "Dismissed, no-billed, nolle prosequi, or not prosecuted"
    && missingQuestionIds.length === 1 && missingQuestionIds[0] === "financial_obligations";
}
