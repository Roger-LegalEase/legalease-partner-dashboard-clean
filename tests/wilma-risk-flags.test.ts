import { describe, expect, it } from "vitest";
import { deriveWilmaRiskFlags } from "@/wilma/analytics/riskFlags";

describe("Wilma PR7A risk flags", () => {
  it("flags unsupported, federal, juvenile, pending, legal-advice, guarantee, and prediction signals", () => {
    expect(new Set(
      deriveWilmaRiskFlags({
        facts: {
          courtSystem: "federal",
          isAdultCase: false,
          hasPendingCriminalCase: true,
          wantsLegalAdvice: true,
          wantsOutcomeGuarantee: true
        },
        status: "outside_supported_scope",
        reasonCodes: ["unsupported_state", "legal_advice_request_redirected", "no_guarantee_language"]
      })
    )).toEqual(new Set([
      "legal_advice_request",
      "outcome_guarantee_request",
      "court_prediction_request",
      "unsupported_state",
      "federal_case",
      "juvenile_case",
      "pending_case"
    ]));
  });

  it("flags disabled conviction paths, high-risk offenses, failed fulfillment, and low-confidence extraction", () => {
    expect(new Set(
      deriveWilmaRiskFlags({
        facts: {
          isViolentOrSeriousFelony: true,
          isSexOffenseOrRegistryRelated: true
        },
        event: "wilma_document_generation_failed",
        reasonCodes: [
          "il_conviction_sealing_requires_review",
          "extractor_low_confidence"
        ]
      })
    )).toEqual(new Set([
      "conviction_path_disabled",
      "high_risk_offense",
      "fulfillment_failed",
      "extractor_low_confidence"
    ]));
  });
});
