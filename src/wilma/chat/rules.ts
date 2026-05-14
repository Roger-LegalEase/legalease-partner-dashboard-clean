export const WILMA_RULE_VERSION = "wilma_service_fit_pr3_v1";

export const wilmaSupportedStates = ["IL", "PA", "MD", "DC", "MS", "TX"] as const;

export type SupportedState = (typeof wilmaSupportedStates)[number];

export type WilmaDecisionStatus =
  | "collecting_information"
  | "likely_eligible_for_document_prep"
  | "not_a_fit_for_this_service"
  | "needs_more_information"
  | "outside_supported_scope";

export type WilmaDocumentTarget =
  | "expungement_petition"
  | "sealing_petition"
  | "limited_access_petition"
  | "nondisclosure_petition"
  | "record_request_packet"
  | "resource_only"
  | "none";

export type WilmaDisposition =
  | "arrest_only_no_charges"
  | "dismissed"
  | "charges_dropped"
  | "nolle_prosequi"
  | "not_guilty"
  | "acquitted"
  | "no_disposition"
  | "pbj"
  | "stet"
  | "supervision"
  | "deferred_adjudication"
  | "conviction"
  | "vacated"
  | "reversed"
  | "pardoned"
  | "pending"
  | "unknown";

export type WilmaEligibilityFacts = {
  state?: SupportedState;
  caseState?: string;
  userAge?: number;
  isAdultCase?: boolean;
  courtSystem?: "state" | "federal" | "juvenile" | "municipal" | "unknown";
  county?: string;
  courtName?: string;
  caseNumber?: string;
  arrestDate?: string;
  dispositionDate?: string;
  sentenceCompletionDate?: string;
  disposition?: WilmaDisposition;
  hasPendingCriminalCase?: boolean;
  hasNewConvictionDuringWaitingPeriod?: boolean;
  allChargesResolved?: boolean;
  sameCriminalEpisodeHasConvictionOrPending?: boolean;
  offenseLevel?:
    | "class_c_misdemeanor"
    | "class_b_misdemeanor"
    | "class_a_misdemeanor"
    | "misdemeanor"
    | "felony"
    | "summary"
    | "unknown";
  offenseCategory?: string;
  offenseStatute?: string;
  isTrafficOnly?: boolean;
  isDuiOrDwi?: boolean;
  isSexOffenseOrRegistryRelated?: boolean;
  isViolentOrSeriousFelony?: boolean;
  isDomesticOrFamilyRelated?: boolean;
  isFirearmOrWeaponRelated?: boolean;
  isPublicOfficialOfficialDutyRelated?: boolean;
  finesCostsRestitutionPaid?: boolean;
  hasPriorExpungementOrExpunction?: boolean;
  isFirstOffender?: boolean;
  txIndictmentOrInformationPresented?: boolean;
  txDismissalReason?:
    | "veterans_treatment_court"
    | "mental_health_court"
    | "pretrial_intervention"
    | "mistake_false_info_no_probable_cause"
    | "void_charging_instrument"
    | "other"
    | "unknown";
  txProsecutorCertificationNoNeed?: boolean;
  txLimitationsExpired?: boolean;
  txCommunitySupervisionOrdered?: boolean;
  txCommunitySupervisionViolationWarrant?: boolean;
  txAbscondedAfterRelease?: boolean;
  dcInterestsOfJusticeFactsProvided?: boolean;
  dcActualInnocenceClaim?: boolean;
  dcOffenseSeverityGroup?: "1" | "2" | "3" | "4_or_lower" | "unknown";
  wantsLegalAdvice?: boolean;
  wantsOutcomeGuarantee?: boolean;
  wantsCollateralConsequenceAdvice?: boolean;
  hasMultipleCases?: boolean;
  hasFullRecord?: boolean;
  hasRecordIdentifiers?: boolean;
  hasCourtCertificationNoDisposition?: boolean;
  hasPardonProof?: boolean;
  waiverPathSelected?: boolean;
};

export type WilmaServiceFitDecision = {
  status: WilmaDecisionStatus;
  documentTarget: WilmaDocumentTarget;
  allowPaidCta: boolean;
  requiresEmailGate: boolean;
  reasonCodes: string[];
  ruleId: string;
  ruleVersion: string;
  evaluatedAt: string;
};

export const WILMA_RULE_FLAGS = {
  IL: {
    enableNonConvictionExpungement: true,
    enableVacatedReversedExpungement: true,
    enableConvictionSealing: false
  },
  PA: {
    enableNonConvictionExpungement: true,
    enableSummaryExpungement: true,
    enableMisdemeanorLimitedAccess: true,
    enableFelonyLimitedAccess: false
  },
  MD: {
    enableFavorableDispositionExpungement: true,
    enableEarlyWaiverPath: true,
    enablePbjStetPath: false,
    enableGuiltyDispositionPath: false,
    enableCannabisPath: false
  },
  DC: {
    enableNonConvictionSealingByMotion: true,
    enableActualInnocenceExpungement: false,
    enableConvictionSealing: false,
    automaticReliefActive: false
  },
  MS: {
    enableNonConvictionExpunction: true,
    enableFirstOffenderMisdemeanorExpunction: true,
    enableFelonyExpunction: false,
    enableTraffickingVictimRelief: false
  },
  TX: {
    enableExpunction: true,
    enableNondisclosure: false
  }
} as const;

const nonConvictionDispositions = new Set<WilmaDisposition>([
  "arrest_only_no_charges",
  "dismissed",
  "charges_dropped",
  "nolle_prosequi",
  "not_guilty",
  "acquitted"
]);

const favorableMdDispositions = new Set<WilmaDisposition>([
  "dismissed",
  "nolle_prosequi",
  "not_guilty",
  "acquitted"
]);

const qualifyingTxDismissalReasons = new Set<NonNullable<WilmaEligibilityFacts["txDismissalReason"]>>([
  "veterans_treatment_court",
  "mental_health_court",
  "pretrial_intervention",
  "mistake_false_info_no_probable_cause",
  "void_charging_instrument"
]);

// Wilma determines whether the user appears to fit LegalEase's self-help document-preparation workflow.
// Wilma does not guarantee expungement, sealing, nondisclosure, court approval, or legal eligibility.
export function evaluateWilmaServiceFit(
  facts: WilmaEligibilityFacts,
  evaluatedAt = new Date()
): WilmaServiceFitDecision {
  const globalDecision = evaluateGlobalGates(facts, evaluatedAt);
  if (globalDecision) {
    return globalDecision;
  }

  switch (facts.state) {
    case "IL":
      return evaluateIllinois(facts, evaluatedAt);
    case "PA":
      return evaluatePennsylvania(facts, evaluatedAt);
    case "MD":
      return evaluateMaryland(facts, evaluatedAt);
    case "DC":
      return evaluateDc(facts, evaluatedAt);
    case "MS":
      return evaluateMississippi(facts, evaluatedAt);
    case "TX":
      return evaluateTexas(facts, evaluatedAt);
    default:
      return decision(evaluatedAt, "G-002", "outside_supported_scope", "none", ["unsupported_state"]);
  }
}

function evaluateGlobalGates(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision | null {
  if (!facts.state) {
    return decision(evaluatedAt, "G-001", "collecting_information", "none", ["missing_state"]);
  }
  if (!isSupportedState(facts.state)) {
    return decision(evaluatedAt, "G-002", "outside_supported_scope", "none", ["unsupported_state"]);
  }
  if (facts.courtSystem === "federal") {
    return decision(evaluatedAt, "G-004", "not_a_fit_for_this_service", "none", ["federal_case_outside_scope"]);
  }
  if (facts.caseState && facts.caseState.toUpperCase() !== facts.state) {
    return decision(evaluatedAt, "G-005", "outside_supported_scope", "none", ["case_not_in_selected_state"]);
  }
  if (facts.courtSystem === "juvenile" || facts.isAdultCase === false) {
    return decision(evaluatedAt, "G-006", "needs_more_information", "none", ["juvenile_case_not_in_adult_flow"]);
  }
  if (!facts.disposition || facts.disposition === "unknown") {
    return decision(evaluatedAt, "G-007", "collecting_information", "none", ["missing_disposition"]);
  }
  if (facts.disposition === "pending" || facts.hasPendingCriminalCase) {
    return decision(evaluatedAt, "G-008", "needs_more_information", "none", ["pending_case_disclosed"]);
  }
  if (facts.disposition === "conviction" && (!facts.offenseLevel || facts.offenseLevel === "unknown")) {
    return decision(evaluatedAt, "G-009", "needs_more_information", "none", [
      "conviction_path_requires_more_facts"
    ]);
  }
  if (facts.hasMultipleCases && (facts.state === "PA" || facts.state === "MD" || facts.state === "DC" || facts.state === "TX")) {
    return decision(evaluatedAt, "G-011", "needs_more_information", "none", [
      "multiple_case_analysis_required"
    ]);
  }

  return null;
}

function evaluateIllinois(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (isMinorTrafficOnly(facts)) {
    return decision(evaluatedAt, "IL-005", "not_a_fit_for_this_service", "none", [
      "il_minor_traffic_not_supported"
    ]);
  }
  if (nonConvictionDispositions.has(facts.disposition as WilmaDisposition)) {
    return decision(evaluatedAt, "IL-001", "likely_eligible_for_document_prep", "expungement_petition", [
      "il_supported_state",
      "non_conviction_disposition",
      "adult_state_court_case"
    ]);
  }
  if ((facts.disposition === "vacated" || facts.disposition === "reversed") && WILMA_RULE_FLAGS.IL.enableVacatedReversedExpungement) {
    return decision(evaluatedAt, "IL-002", "likely_eligible_for_document_prep", "expungement_petition", [
      "il_vacated_or_reversed_conviction"
    ]);
  }
  if (facts.disposition === "supervision") {
    return decision(evaluatedAt, "IL-003", "needs_more_information", "expungement_petition", [
      "il_supervision_path_requires_more_facts"
    ]);
  }
  if (facts.disposition === "conviction") {
    return decision(evaluatedAt, "IL-004", "needs_more_information", "sealing_petition", [
      "il_conviction_sealing_requires_review"
    ]);
  }

  return moreFacts(evaluatedAt, "IL-007", "resource_only", ["il_cannabis_specific_flow_not_enabled"]);
}

function evaluatePennsylvania(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (!facts.hasRecordIdentifiers) {
    return decision(evaluatedAt, "PA-000", "needs_more_information", "record_request_packet", [
      "pa_record_request_needed"
    ]);
  }
  if (facts.disposition === "no_disposition") {
    return decision(evaluatedAt, "PA-001", "likely_eligible_for_document_prep", "expungement_petition", [
      "pa_no_disposition_18_months",
      "no_action_pending"
    ]);
  }
  if (facts.disposition === "acquitted" && facts.allChargesResolved && !facts.sameCriminalEpisodeHasConvictionOrPending) {
    return decision(evaluatedAt, "PA-003", "likely_eligible_for_document_prep", "expungement_petition", [
      "pa_full_acquittal_path"
    ]);
  }
  if (facts.disposition === "acquitted") {
    return moreFacts(evaluatedAt, "PA-004", "none", ["pa_partial_acquittal_same_episode_review"]);
  }
  if (nonConvictionDispositions.has(facts.disposition as WilmaDisposition)) {
    return decision(evaluatedAt, "PA-002", "likely_eligible_for_document_prep", "expungement_petition", [
      "pa_nonconviction_expungement_path"
    ]);
  }
  if (facts.disposition === "pardoned") {
    return decision(evaluatedAt, "PA-006", "likely_eligible_for_document_prep", "expungement_petition", [
      "pa_unconditional_pardon_path"
    ]);
  }
  if (facts.offenseLevel === "summary" && !facts.hasNewConvictionDuringWaitingPeriod) {
    return decision(evaluatedAt, "PA-005", "likely_eligible_for_document_prep", "expungement_petition", [
      "pa_summary_offense_5_year_path"
    ]);
  }
  if (hasPaLimitedAccessException(facts)) {
    return decision(evaluatedAt, "PA-009", "not_a_fit_for_this_service", "none", [
      "pa_limited_access_statutory_exception"
    ]);
  }
  if (facts.offenseLevel === "misdemeanor" && facts.finesCostsRestitutionPaid && !facts.hasNewConvictionDuringWaitingPeriod) {
    return decision(evaluatedAt, "PA-007", "likely_eligible_for_document_prep", "limited_access_petition", [
      "pa_limited_access_misdemeanor_path"
    ]);
  }
  if (facts.offenseLevel === "felony") {
    return moreFacts(evaluatedAt, "PA-008", "limited_access_petition", [
      "pa_limited_access_felony_requires_review"
    ]);
  }

  return moreFacts(evaluatedAt, "PA-004", "none", ["pa_partial_acquittal_same_episode_review"]);
}

function evaluateMaryland(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (facts.hasPendingCriminalCase) {
    return decision(evaluatedAt, "MD-008", "not_a_fit_for_this_service", "none", [
      "md_pending_criminal_proceeding_block"
    ]);
  }
  if (favorableMdDispositions.has(facts.disposition as WilmaDisposition) && WILMA_RULE_FLAGS.MD.enableFavorableDispositionExpungement) {
    return decision(evaluatedAt, "MD-001", "likely_eligible_for_document_prep", "expungement_petition", [
      "md_favorable_disposition_3_year_path"
    ]);
  }
  if (facts.disposition === "pbj") {
    return moreFacts(evaluatedAt, "MD-004", "expungement_petition", [
      "md_pbj_requires_waiting_period_analysis"
    ]);
  }
  if (facts.disposition === "stet") {
    return moreFacts(evaluatedAt, "MD-005", "expungement_petition", [
      "md_stet_requires_waiting_period_analysis"
    ]);
  }
  if (facts.disposition === "conviction") {
    return moreFacts(evaluatedAt, "MD-007", "expungement_petition", [
      "md_guilty_disposition_requires_10_110_analysis"
    ]);
  }

  return moreFacts(evaluatedAt, "MD-010", "expungement_petition", [
    "md_cannabis_specific_flow_not_enabled"
  ]);
}

function evaluateDc(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (!WILMA_RULE_FLAGS.DC.automaticReliefActive && facts.offenseCategory?.toLowerCase().includes("automatic")) {
    return decision(evaluatedAt, "DC-000", "needs_more_information", "resource_only", [
      "dc_automatic_relief_not_currently_active"
    ]);
  }
  if (!facts.hasFullRecord) {
    return moreFacts(evaluatedAt, "DC-006", "record_request_packet", [
      "dc_full_record_required_for_motion"
    ]);
  }
  if (facts.dcActualInnocenceClaim) {
    return moreFacts(evaluatedAt, "DC-002", "expungement_petition", [
      "dc_actual_innocence_requires_evidence_review"
    ]);
  }
  if (facts.dcOffenseSeverityGroup === "1" || facts.dcOffenseSeverityGroup === "2" || facts.dcOffenseSeverityGroup === "3") {
    return decision(evaluatedAt, "DC-005", "not_a_fit_for_this_service", "none", ["dc_osg_1_2_3_block"]);
  }
  if (nonConvictionDispositions.has(facts.disposition as WilmaDisposition) && facts.dcInterestsOfJusticeFactsProvided) {
    return decision(evaluatedAt, "DC-001", "likely_eligible_for_document_prep", "sealing_petition", [
      "dc_nonconviction_sealing_by_motion_path"
    ]);
  }
  if (nonConvictionDispositions.has(facts.disposition as WilmaDisposition)) {
    return decision(evaluatedAt, "DC-007", "collecting_information", "sealing_petition", [
      "dc_interests_of_justice_facts_missing"
    ]);
  }
  if (facts.disposition === "conviction" && facts.offenseLevel === "misdemeanor") {
    return moreFacts(evaluatedAt, "DC-003", "sealing_petition", [
      "dc_misdemeanor_conviction_sealing_path_disabled"
    ]);
  }
  if (facts.disposition === "conviction" && facts.offenseLevel === "felony") {
    return moreFacts(evaluatedAt, "DC-004", "sealing_petition", [
      "dc_felony_severity_grid_review_required"
    ]);
  }

  return moreFacts(evaluatedAt, "DC-006", "record_request_packet", [
    "dc_full_record_required_for_motion"
  ]);
}

function evaluateMississippi(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (facts.isPublicOfficialOfficialDutyRelated) {
    return decision(evaluatedAt, "MS-008", "not_a_fit_for_this_service", "none", [
      "ms_public_official_official_duties_block"
    ]);
  }
  if (nonConvictionDispositions.has(facts.disposition as WilmaDisposition) || facts.disposition === "no_disposition") {
    return decision(evaluatedAt, "MS-001", "likely_eligible_for_document_prep", "expungement_petition", [
      "ms_nonconviction_expunction_path"
    ]);
  }
  if (facts.offenseLevel === "misdemeanor" && facts.isTrafficOnly) {
    return decision(evaluatedAt, "MS-003", "not_a_fit_for_this_service", "none", [
      "ms_traffic_misdemeanor_block"
    ]);
  }
  if (facts.offenseLevel === "misdemeanor" && facts.isFirstOffender && !facts.isTrafficOnly) {
    return decision(evaluatedAt, "MS-002", "likely_eligible_for_document_prep", "expungement_petition", [
      "ms_first_offender_misdemeanor_path"
    ]);
  }
  if (facts.offenseLevel === "felony" && hasMsExcludedFelonyFacts(facts)) {
    return decision(evaluatedAt, "MS-007", "not_a_fit_for_this_service", "none", ["ms_excluded_felony"]);
  }
  if (facts.offenseLevel === "felony") {
    return moreFacts(evaluatedAt, "MS-004", "expungement_petition", [
      "ms_felony_expunction_requires_review"
    ]);
  }

  return moreFacts(evaluatedAt, "MS-009", "expungement_petition", [
    "ms_trafficking_victim_relief_requires_review"
  ]);
}

function evaluateTexas(facts: WilmaEligibilityFacts, evaluatedAt: Date): WilmaServiceFitDecision {
  if (facts.sameCriminalEpisodeHasConvictionOrPending) {
    return decision(evaluatedAt, "TX-EXP-009", "not_a_fit_for_this_service", "none", [
      "tx_same_criminal_episode_block"
    ]);
  }
  if (facts.txCommunitySupervisionViolationWarrant) {
    return decision(evaluatedAt, "TX-EXP-010", "not_a_fit_for_this_service", "none", [
      "tx_community_supervision_violation_warrant_block"
    ]);
  }
  if (facts.txAbscondedAfterRelease) {
    return decision(evaluatedAt, "TX-EXP-011", "not_a_fit_for_this_service", "none", [
      "tx_absconding_after_release_block"
    ]);
  }
  if (facts.isTrafficOnly && facts.offenseCategory?.toLowerCase().includes("driver")) {
    return decision(evaluatedAt, "TX-EXP-012", "not_a_fit_for_this_service", "none", [
      "tx_driver_license_record_block"
    ]);
  }
  if (facts.courtSystem === "municipal" && facts.offenseCategory?.toLowerCase().includes("civil")) {
    return decision(evaluatedAt, "TX-EXP-013", "not_a_fit_for_this_service", "none", [
      "tx_civil_matter_not_expunction"
    ]);
  }
  if (facts.disposition === "acquitted") {
    return decision(evaluatedAt, "TX-EXP-001", "likely_eligible_for_document_prep", "expungement_petition", [
      "tx_trial_court_acquittal_path"
    ]);
  }
  if (facts.disposition === "pardoned") {
    return decision(evaluatedAt, "TX-EXP-006", "likely_eligible_for_document_prep", "expungement_petition", [
      "tx_pardon_path"
    ]);
  }
  if (facts.txLimitationsExpired) {
    return decision(evaluatedAt, "TX-EXP-005", "likely_eligible_for_document_prep", "expungement_petition", [
      "tx_limitations_expired_path"
    ]);
  }
  if (facts.disposition === "no_disposition" && facts.txIndictmentOrInformationPresented === false) {
    return decision(evaluatedAt, "TX-EXP-003", "likely_eligible_for_document_prep", "expungement_petition", [
      "tx_no_indictment_or_information_waiting_period_path"
    ]);
  }
  if ((facts.disposition === "dismissed" || facts.disposition === "charges_dropped") && qualifyingTxDismissalReasons.has(facts.txDismissalReason ?? "unknown")) {
    return decision(evaluatedAt, "TX-EXP-004", "likely_eligible_for_document_prep", "expungement_petition", [
      "tx_dismissed_or_quashed_qualifying_reason_path"
    ]);
  }
  if (facts.disposition === "deferred_adjudication") {
    return moreFacts(evaluatedAt, "TX-ND-001", "nondisclosure_petition", [
      "tx_411_072_nondisclosure_requires_subengine"
    ]);
  }
  if (facts.disposition === "conviction") {
    return moreFacts(evaluatedAt, "TX-ND-004", "nondisclosure_petition", [
      "tx_conviction_nondisclosure_requires_subengine"
    ]);
  }

  return moreFacts(evaluatedAt, "TX-EXP-008", "expungement_petition", [
    "tx_handgun_special_path_requires_review"
  ]);
}

function decision(
  evaluatedAt: Date,
  ruleId: string,
  status: WilmaDecisionStatus,
  documentTarget: WilmaDocumentTarget,
  reasonCodes: string[]
): WilmaServiceFitDecision {
  const allowPaidCta = status === "likely_eligible_for_document_prep";

  return {
    status,
    documentTarget,
    allowPaidCta,
    requiresEmailGate: allowPaidCta,
    reasonCodes,
    ruleId,
    ruleVersion: WILMA_RULE_VERSION,
    evaluatedAt: evaluatedAt.toISOString()
  };
}

function moreFacts(evaluatedAt: Date, ruleId: string, documentTarget: WilmaDocumentTarget, reasonCodes: string[]) {
  return decision(evaluatedAt, ruleId, "needs_more_information", documentTarget, reasonCodes);
}

function isSupportedState(state: string): state is SupportedState {
  return (wilmaSupportedStates as readonly string[]).includes(state);
}

function isMinorTrafficOnly(facts: WilmaEligibilityFacts): boolean {
  return facts.isTrafficOnly === true && facts.offenseLevel !== "felony";
}

function hasPaLimitedAccessException(facts: WilmaEligibilityFacts): boolean {
  return Boolean(
    facts.isSexOffenseOrRegistryRelated ||
      facts.isViolentOrSeriousFelony ||
      facts.isDomesticOrFamilyRelated ||
      facts.isFirearmOrWeaponRelated ||
      facts.offenseLevel === "felony"
  );
}

function hasMsExcludedFelonyFacts(facts: WilmaEligibilityFacts): boolean {
  return Boolean(
    facts.isViolentOrSeriousFelony ||
      facts.isSexOffenseOrRegistryRelated ||
      facts.isFirearmOrWeaponRelated ||
      facts.isDuiOrDwi ||
      facts.offenseCategory?.toLowerCase().includes("trafficking")
  );
}
