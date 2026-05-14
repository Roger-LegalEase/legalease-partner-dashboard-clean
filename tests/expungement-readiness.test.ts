import { describe, expect, it } from "vitest";
import { evaluateExpungementReadiness } from "@/lib/expungement";

describe("evaluateExpungementReadiness", () => {
  it("flags missing information for attorney review", () => {
    const result = evaluateExpungementReadiness({
      state: "CA",
      normalizedReport: {
        records: [{ id: "record_1", charge: "Unknown charge" }]
      }
    });

    expect(result.status).toBe("needs_attorney_review");
    expect(result.missingInformation).toEqual(
      expect.arrayContaining([
        "Record 1 (Unknown charge): record type is missing or unknown.",
        "Record 1 (Unknown charge): disposition information is missing.",
        "Record 1 (Unknown charge): offense date is missing."
      ])
    );
    expect(result.disclaimer).toContain("not legal advice");
  });

  it("treats conviction records more conservatively than arrest-only records", () => {
    const arrestOnly = evaluateExpungementReadiness({
      state: "CA",
      normalizedReport: {
        records: [{ recordType: "arrest", dispositionCategory: "dismissed", offenseDate: "2020-01-01" }]
      }
    });
    const conviction = evaluateExpungementReadiness({
      state: "CA",
      normalizedReport: {
        records: [{ recordType: "conviction", dispositionCategory: "conviction", offenseDate: "2020-01-01" }]
      }
    });

    expect(arrestOnly.status).toBe("possibly_ready");
    expect(conviction.status).toBe("needs_attorney_review");
  });

  it("flags pending cases as disqualifiers requiring attorney review", () => {
    const result = evaluateExpungementReadiness({
      state: "CA",
      normalizedReport: {
        records: [
          {
            recordType: "charge",
            dispositionCategory: "pending",
            pendingCase: true,
            offenseDate: "2024-01-01"
          }
        ]
      }
    });

    expect(result.status).toBe("needs_attorney_review");
    expect(result.disqualifiers).toEqual(
      expect.arrayContaining(["Record 1: pending case or pending disposition requires attorney review."])
    );
  });

  it("handles multiple record items with mixed readiness signals", () => {
    const result = evaluateExpungementReadiness({
      state: "CA",
      normalizedReport: {
        records: [
          {
            charge: "Dismissed charge",
            recordType: "arrest",
            dispositionCategory: "dismissed",
            offenseDate: "2019-01-01"
          },
          {
            charge: "Conviction charge",
            recordType: "conviction",
            dispositionCategory: "conviction",
            offenseDate: "2020-01-01"
          }
        ]
      }
    });

    expect(result.status).toBe("needs_attorney_review");
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons.join(" ")).toContain("Dismissed charge");
    expect(result.reasons.join(" ")).toContain("Conviction charge");
  });
});
