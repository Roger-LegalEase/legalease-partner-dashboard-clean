import type { WilmaDecisionStatus, WilmaEligibilityFacts } from "@/wilma/chat/rules";
import type { WilmaAnalyticsEventName, WilmaRiskFlag } from "@/wilma/analytics/types";

export function deriveWilmaRiskFlags(input: {
  facts?: WilmaEligibilityFacts;
  status?: WilmaDecisionStatus;
  reasonCodes?: string[];
  event?: WilmaAnalyticsEventName | string;
}): WilmaRiskFlag[] {
  const flags = new Set<WilmaRiskFlag>();
  const facts = input.facts ?? {};
  const reasonCodes = input.reasonCodes ?? [];

  if (input.status === "outside_supported_scope" || reasonCodes.includes("unsupported_state")) {
    flags.add("unsupported_state");
  }
  if (facts.courtSystem === "federal" || reasonCodes.includes("federal_case_outside_scope")) {
    flags.add("federal_case");
  }
  if (facts.courtSystem === "juvenile" || facts.isAdultCase === false || reasonCodes.some((code) => code.includes("juvenile"))) {
    flags.add("juvenile_case");
  }
  if (facts.hasPendingCriminalCase || reasonCodes.includes("pending_case_disclosed")) {
    flags.add("pending_case");
  }
  if (reasonCodes.includes("legal_advice_request_redirected") || facts.wantsLegalAdvice) {
    flags.add("legal_advice_request");
  }
  if (reasonCodes.includes("no_guarantee_language") || facts.wantsOutcomeGuarantee) {
    flags.add("outcome_guarantee_request");
  }
  if (reasonCodes.includes("legal_advice_request_redirected") || reasonCodes.includes("court_prediction_request")) {
    flags.add("court_prediction_request");
  }
  if (reasonCodes.some(isDisabledConvictionPath)) {
    flags.add("conviction_path_disabled");
  }
  if (
    facts.isViolentOrSeriousFelony ||
    facts.isSexOffenseOrRegistryRelated ||
    facts.isDuiOrDwi ||
    facts.isDomesticOrFamilyRelated ||
    facts.isFirearmOrWeaponRelated ||
    reasonCodes.some((code) => code.includes("statutory_exception") || code.includes("excluded_felony") || code.includes("sex_offense"))
  ) {
    flags.add("high_risk_offense");
  }
  if (input.event === "wilma_document_generation_failed") {
    flags.add("fulfillment_failed");
  }
  if (reasonCodes.includes("extractor_low_confidence")) {
    flags.add("extractor_low_confidence");
  }
  if (reasonCodes.includes("ip_rate_limited")) {
    flags.add("rate_limit_hit");
  }
  if (reasonCodes.includes("message_cap_reached")) {
    flags.add("message_cap_reached");
  }
  if (reasonCodes.includes("session_expired")) {
    flags.add("session_expired");
  }
  if (reasonCodes.includes("bot_protection_failed")) {
    flags.add("bot_protection_failed");
  }
  if (
    reasonCodes.includes("email_session_limit") ||
    reasonCodes.includes("ip_session_limit") ||
    reasonCodes.includes("device_session_limit")
  ) {
    flags.add("repeat_screening_abuse");
  }

  return Array.from(flags);
}

function isDisabledConvictionPath(reasonCode: string): boolean {
  return (
    reasonCode.includes("conviction_path_requires_more_facts") ||
    reasonCode.includes("conviction_sealing_requires_review") ||
    reasonCode.includes("conviction_sealing_path_disabled") ||
    reasonCode.includes("felony_limited_access_requires_review") ||
    reasonCode.includes("felony_expunction_requires_review") ||
    reasonCode.includes("nondisclosure_requires_subengine") ||
    reasonCode.includes("guilty_disposition_requires")
  );
}
