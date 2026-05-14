import { describe, expect, it, vi } from "vitest";
import {
  ReportSummaryOutputSchema,
  buildReportSummaryInstructions,
  parseReportSummaryResponse,
  summarizeReport
} from "@/lib/report-summary";

const validSummary = {
  plainEnglishSummary: "The report shows one misdemeanor record and no felony records.",
  whatWasFound: ["One misdemeanor record"],
  possibleImpact: ["Some employers or housing providers may ask follow-up questions."],
  possibleErrors: ["The report does not include enough detail to confirm final disposition."],
  expungementReadiness: {
    status: "needs_review",
    summary: "Deterministic readiness found missing disposition details.",
    reasons: ["The report includes a potentially eligible record."],
    blockers: ["Disposition is unknown."]
  },
  recommendedNextSteps: ["Review the disposition details.", "Consult a qualified attorney."],
  customerQuestions: ["Do you have court paperwork for this record?"],
  disclaimers: [
    "This is not legal advice.",
    "Consult a qualified attorney for advice about your situation."
  ],
  confidence: "medium" as const
};

describe("ReportSummaryOutputSchema", () => {
  it("validates expected structured summary output", () => {
    expect(ReportSummaryOutputSchema.parse(validSummary)).toEqual(validSummary);
  });
});

describe("summarizeReport", () => {
  it("calls OpenAI Responses API with strict json_schema format and persists output", async () => {
    const create = vi.fn(async (request: Record<string, unknown>) => {
      expect(request).toBeDefined();
      return {
        output_text: JSON.stringify(validSummary)
      };
    });
    const upsert = vi.fn(async () => ({}));

    const result = await summarizeReport(
      {
        normalizedReport: {
          records: [{ charge: "Misdemeanor", disposition: "unknown" }]
        },
        expungementReadiness: {
          status: "needs_review",
          reasons: ["Potentially eligible"],
          blockers: ["Disposition unknown"]
        },
        userState: "NY",
        providerReportId: "provider_report_123"
      },
      {
        client: { responses: { create } },
        db: { reportSummary: { upsert } },
        model: "gpt-test-summary"
      }
    );

    expect(result).toEqual(validSummary);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-test-summary",
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            name: "report_summary_output",
            strict: true,
            schema: expect.objectContaining({
              additionalProperties: false,
              required: expect.arrayContaining(["plainEnglishSummary", "confidence"])
            })
          })
        }
      })
    );
    const request = create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(request).toBeDefined();
    const instructions = String(request?.instructions);
    expect(instructions).toContain("Do not provide legal advice.");
    expect(instructions).toContain("Do not invent facts or eligibility.");
    expect(instructions).toContain(
      "Use only the provided normalized report fields and deterministic expungement-readiness output."
    );
    expect(instructions).toContain(
      "Include uncertainty and \"consult a qualified attorney\" disclaimer."
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerReportId: "provider_report_123" },
        create: expect.objectContaining({
          providerReportId: "provider_report_123",
          confidence: "medium",
          model: "gpt-test-summary"
        }),
        update: expect.objectContaining({
          confidence: "medium",
          model: "gpt-test-summary"
        })
      })
    );
  });

  it("rejects invalid model output", () => {
    expect(() =>
      parseReportSummaryResponse({
        output_text: JSON.stringify({
          ...validSummary,
          confidence: "certain"
        })
      })
    ).toThrow();
  });

	  it("includes required safety instructions in the prompt", () => {
    const instructions = buildReportSummaryInstructions("CA");

    expect(instructions).toContain("Do not provide legal advice.");
    expect(instructions).toContain("Do not invent facts or eligibility.");
    expect(instructions).toContain(
      "Use only the provided normalized report fields and deterministic expungement-readiness output."
    );
	    expect(instructions).toContain("consult a qualified attorney");
	  });

  it("stores a safe manual-review state when AI summaries are disabled", async () => {
    const upsert = vi.fn(async () => ({}));
    const create = vi.fn(async () => ({ output_text: JSON.stringify(validSummary) }));

    const { summarizeReportSafely } = await import("@/lib/report-summary");
    const result = await summarizeReportSafely(
      {
        normalizedReport: { records: [] },
        expungementReadiness: { status: "needs_attorney_review" },
        userState: "CA",
        providerReportId: "provider_report_disabled"
      },
      {
        client: { responses: { create } },
        db: { reportSummary: { upsert } },
        configEnv: { AI_SUMMARY_ENABLED: "false" }
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.error).toContain("Manual review is pending");
    }
    expect(create).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerReportId: "provider_report_disabled" },
        create: expect.objectContaining({
          plainEnglishSummary: expect.stringContaining("Manual review is pending")
        })
      })
    );
  });
	});
