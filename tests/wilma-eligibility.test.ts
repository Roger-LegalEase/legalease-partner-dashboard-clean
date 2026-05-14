import { describe, expect, it } from "vitest";
import {
  evaluateWilmaEligibility,
  parseWilmaEligibilityInput,
  type WilmaEligibilityInput
} from "@/lib/wilma";

const completeInput: WilmaEligibilityInput = {
  applicant: {
    userId: "user_123",
    state: "CA"
  },
  case: {
    sentenceCompleted: "yes",
    hasOpenCase: "no",
    hasOutstandingBalance: "no"
  }
};

describe("Wilma eligibility scaffold", () => {
  it("normalizes and validates eligibility input for backend callers", () => {
    const parsed = parseWilmaEligibilityInput({
      ...completeInput,
      applicant: {
        ...completeInput.applicant,
        state: "ca"
      }
    });

    expect(parsed.applicant.state).toBe("CA");
  });

  it("returns likely eligible when required answers are complete and non-blocking", () => {
    const result = evaluateWilmaEligibility(completeInput, new Date("2026-05-13T12:00:00.000Z"));

    expect(result).toEqual({
      status: "likely_eligible",
      reasons: [],
      evaluatedAt: "2026-05-13T12:00:00.000Z"
    });
  });

  it("requires more information when a required answer is unknown", () => {
    const result = evaluateWilmaEligibility(
      {
        ...completeInput,
        case: {
          ...completeInput.case,
          hasOutstandingBalance: "unknown"
        }
      },
      new Date("2026-05-13T12:00:00.000Z")
    );

    expect(result.status).toBe("needs_information");
    expect(result.reasons).toEqual([
      {
        code: "missing_eligibility_information",
        message: "Required Wilma eligibility answers are incomplete."
      }
    ]);
  });

  it("routes blocking answers to manual review without changing production routes", () => {
    const result = evaluateWilmaEligibility(
      {
        ...completeInput,
        case: {
          ...completeInput.case,
          hasOpenCase: "yes"
        }
      },
      new Date("2026-05-13T12:00:00.000Z")
    );

    expect(result.status).toBe("manual_review");
    expect(result.reasons).toContainEqual({
      code: "open_case",
      message: "Open case information requires review before Wilma eligibility can continue."
    });
  });
});
