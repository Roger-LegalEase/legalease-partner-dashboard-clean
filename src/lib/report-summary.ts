import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Env } from "@/lib/env";
import { env } from "@/lib/env";

export const ReportSummaryOutputSchema = z.object({
  plainEnglishSummary: z.string(),
  whatWasFound: z.array(z.string()),
  possibleImpact: z.array(z.string()),
  possibleErrors: z.array(z.string()),
  expungementReadiness: z.unknown(),
  recommendedNextSteps: z.array(z.string()),
  customerQuestions: z.array(z.string()),
  disclaimers: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"])
});

export type ReportSummaryOutput = z.infer<typeof ReportSummaryOutputSchema>;

type ReportSummaryClient = {
  responses: {
    create(args: Record<string, unknown>): Promise<{ output_text?: string }>;
  };
};

type ReportSummaryDatabase = {
  reportSummary: {
    upsert(args: {
      where: { providerReportId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
  };
};

export type ReportSummaryFailure = {
  providerReportId: string;
  error: string;
  createdAt: string;
};

export async function summarizeReport(
  input: {
    normalizedReport: Record<string, unknown>;
    expungementReadiness: Record<string, unknown>;
    userState: string;
    providerReportId?: string;
  },
	  dependencies: {
	    client?: ReportSummaryClient;
	    db?: ReportSummaryDatabase;
	    model?: string;
	    configEnv?: Pick<Env, "AI_SUMMARY_ENABLED">;
	  } = {}
): Promise<ReportSummaryOutput> {
  if (!dependencies.client) {
    return fallbackReportSummary(input.expungementReadiness);
  }

  const response = await dependencies.client.responses.create({
    model: dependencies.model ?? "gpt-5-mini",
    instructions: buildReportSummaryInstructions(input.userState),
    input: JSON.stringify({
      normalizedReport: input.normalizedReport,
      expungementReadiness: input.expungementReadiness
    }),
    text: {
      format: {
        type: "json_schema",
        name: "report_summary_output",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: Object.keys(ReportSummaryOutputSchema.shape),
          properties: {
            plainEnglishSummary: { type: "string" },
            whatWasFound: { type: "array", items: { type: "string" } },
            possibleImpact: { type: "array", items: { type: "string" } },
            possibleErrors: { type: "array", items: { type: "string" } },
            expungementReadiness: {},
            recommendedNextSteps: { type: "array", items: { type: "string" } },
            customerQuestions: { type: "array", items: { type: "string" } },
            disclaimers: { type: "array", items: { type: "string" } },
            confidence: { type: "string", enum: ["low", "medium", "high"] }
          }
        }
      }
    }
  });
  const summary = parseReportSummaryResponse(response);

  if (input.providerReportId && dependencies.db) {
    await dependencies.db.reportSummary.upsert({
      where: { providerReportId: input.providerReportId },
      create: {
        providerReportId: input.providerReportId,
        plainEnglishSummary: summary.plainEnglishSummary,
        whatWasFound: summary.whatWasFound,
        possibleImpact: summary.possibleImpact,
        possibleErrors: summary.possibleErrors,
        expungementReadiness: summary.expungementReadiness,
        recommendedNextSteps: summary.recommendedNextSteps,
        customerQuestions: summary.customerQuestions,
        disclaimers: summary.disclaimers,
        confidence: summary.confidence,
        model: dependencies.model ?? "gpt-5-mini",
        rawOutput: reportSummaryToJson(summary)
      },
      update: {
        plainEnglishSummary: summary.plainEnglishSummary,
        whatWasFound: summary.whatWasFound,
        possibleImpact: summary.possibleImpact,
        possibleErrors: summary.possibleErrors,
        expungementReadiness: summary.expungementReadiness,
        recommendedNextSteps: summary.recommendedNextSteps,
        customerQuestions: summary.customerQuestions,
        disclaimers: summary.disclaimers,
        confidence: summary.confidence,
        model: dependencies.model ?? "gpt-5-mini",
        rawOutput: reportSummaryToJson(summary)
      }
    });
  }

  return summary;
}

export async function summarizeReportSafely(
  input: Parameters<typeof summarizeReport>[0],
  dependencies: Parameters<typeof summarizeReport>[1] = {}
): Promise<{ ok: true; summary: ReportSummaryOutput } | { ok: false; failure: ReportSummaryFailure }> {
  if ((dependencies.configEnv ?? env).AI_SUMMARY_ENABLED !== "true") {
    const failure = {
      providerReportId: input.providerReportId ?? "unknown",
      error: "AI summary generation is paused for beta. Manual review is pending.",
      createdAt: new Date().toISOString()
    };
    await persistFailedReportSummary(input, dependencies, failure);
    return { ok: false, failure };
  }

  try {
    return { ok: true, summary: await summarizeReport(input, dependencies) };
  } catch {
    const failure = {
      providerReportId: input.providerReportId ?? "unknown",
      error: "AI summary generation failed. Retry is available from admin.",
      createdAt: new Date().toISOString()
    };

    await persistFailedReportSummary(input, dependencies, failure);

    return { ok: false, failure };
  }
}

async function persistFailedReportSummary(
  input: Parameters<typeof summarizeReport>[0],
  dependencies: Parameters<typeof summarizeReport>[1],
  failure: ReportSummaryFailure
): Promise<void> {
  const db = dependencies?.db;
  if (!input.providerReportId || !db) {
    return;
  }

  const safeSummary = failedReportSummary(input.expungementReadiness, failure);
  await db.reportSummary.upsert({
    where: { providerReportId: input.providerReportId },
    create: {
      providerReportId: input.providerReportId,
      plainEnglishSummary: safeSummary.plainEnglishSummary,
      whatWasFound: safeSummary.whatWasFound,
      possibleImpact: safeSummary.possibleImpact,
      possibleErrors: safeSummary.possibleErrors,
      expungementReadiness: safeSummary.expungementReadiness,
      recommendedNextSteps: safeSummary.recommendedNextSteps,
      customerQuestions: safeSummary.customerQuestions,
      disclaimers: safeSummary.disclaimers,
      confidence: safeSummary.confidence,
      model: dependencies?.model ?? "unknown",
      rawOutput: { failure } as unknown as Prisma.InputJsonValue
    },
    update: {
      plainEnglishSummary: safeSummary.plainEnglishSummary,
      whatWasFound: safeSummary.whatWasFound,
      possibleImpact: safeSummary.possibleImpact,
      possibleErrors: safeSummary.possibleErrors,
      expungementReadiness: safeSummary.expungementReadiness,
      recommendedNextSteps: safeSummary.recommendedNextSteps,
      customerQuestions: safeSummary.customerQuestions,
      disclaimers: safeSummary.disclaimers,
      confidence: safeSummary.confidence,
      model: dependencies?.model ?? "unknown",
      rawOutput: { failure } as unknown as Prisma.InputJsonValue
    }
  });
}

export function buildReportSummaryInstructions(userState: string): string {
  return [
    `Summarize this background report for a customer in ${userState}.`,
    "Do not provide legal advice.",
    "Do not invent facts or eligibility.",
    "Use only the provided normalized report fields and deterministic expungement-readiness output.",
    "Include uncertainty and \"consult a qualified attorney\" disclaimer."
  ].join(" ");
}

export function parseReportSummaryResponse(response: { output_text?: string }): ReportSummaryOutput {
  if (!response.output_text) {
    throw new Error("Report summary response did not include output_text.");
  }

  return ReportSummaryOutputSchema.parse(JSON.parse(response.output_text));
}

export function reportSummaryToJson(summary: ReportSummaryOutput): Prisma.InputJsonValue {
  return summary as unknown as Prisma.InputJsonValue;
}

function fallbackReportSummary(expungementReadiness: Record<string, unknown>): ReportSummaryOutput {
  return {
    plainEnglishSummary: "Summary regeneration is queued for this report.",
    whatWasFound: [],
    possibleImpact: [],
    possibleErrors: [],
    expungementReadiness,
	    recommendedNextSteps: [
	      "Review the regenerated summary when processing completes."
	    ],
    customerQuestions: [],
    disclaimers: [
      "This is not legal advice.",
	      "Consult a qualified attorney for advice about your situation."
    ],
    confidence: "low"
  };
}

function failedReportSummary(
  expungementReadiness: Record<string, unknown>,
  failure: ReportSummaryFailure
): ReportSummaryOutput {
  return {
    plainEnglishSummary: failure.error,
    whatWasFound: [],
    possibleImpact: [],
    possibleErrors: ["Summary generation did not complete."],
    expungementReadiness,
    recommendedNextSteps: ["An administrator can retry summary generation."],
    customerQuestions: [],
    disclaimers: [
      "This is not legal advice.",
      "Consult a qualified attorney for advice about your situation."
    ],
    confidence: "low"
  };
}
