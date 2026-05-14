import { z } from "zod";
import {
  wilmaEligibilityAnswers,
  type WilmaEligibilityInput,
  type WilmaEligibilityReason,
  type WilmaEligibilityResult
} from "@/types/wilma";

const answerSchema = z.enum(wilmaEligibilityAnswers);

export const wilmaEligibilityRuleVersion = "wilma_eligibility_v1";

export const wilmaApplicantProfileSchema = z.object({
  userId: z.string().min(1),
  state: z
    .union([z.string().length(2), z.literal("unknown")])
    .transform((state) => (state === "unknown" ? state : state.toUpperCase())),
  county: z.string().min(1).optional(),
  dateOfBirth: z.string().date().optional()
});

export const wilmaCaseProfileSchema = z.object({
  caseId: z.string().min(1).optional(),
  jurisdiction: z.string().min(1).optional(),
  offenseCategory: z.string().min(1).optional(),
  dispositionDate: z.string().date().optional(),
  sentenceCompleted: answerSchema,
  hasOpenCase: answerSchema,
  hasOutstandingBalance: answerSchema
});

export const wilmaEligibilityInputSchema = z.object({
  applicant: wilmaApplicantProfileSchema,
  case: wilmaCaseProfileSchema
});

export const wilmaEligibilityRequiredFields = [
  "applicant.userId",
  "applicant.state",
  "case.sentenceCompleted",
  "case.hasOpenCase",
  "case.hasOutstandingBalance"
] as const;

type WilmaEligibilityRequiredField = (typeof wilmaEligibilityRequiredFields)[number];

type EligibilityRule = {
  field: WilmaEligibilityRequiredField;
  blockingAnswer?: "no" | "yes";
  reason: WilmaEligibilityReason;
};

const eligibilityRules: EligibilityRule[] = [
  {
    field: "case.sentenceCompleted",
    blockingAnswer: "no",
    reason: {
      code: "sentence_incomplete",
      message: "Sentence completion must be confirmed before Wilma eligibility can continue."
    }
  },
  {
    field: "case.hasOpenCase",
    blockingAnswer: "yes",
    reason: {
      code: "open_case",
      message: "Open case information requires review before Wilma eligibility can continue."
    }
  },
  {
    field: "case.hasOutstandingBalance",
    blockingAnswer: "yes",
    reason: {
      code: "outstanding_balance",
      message: "Outstanding balance information requires review before Wilma eligibility can continue."
    }
  }
];

function answerForField(input: WilmaEligibilityInput, field: WilmaEligibilityRequiredField): string {
  switch (field) {
    case "applicant.userId":
      return input.applicant.userId;
    case "applicant.state":
      return input.applicant.state;
    case "case.sentenceCompleted":
      return input.case.sentenceCompleted;
    case "case.hasOpenCase":
      return input.case.hasOpenCase;
    case "case.hasOutstandingBalance":
      return input.case.hasOutstandingBalance;
  }
}

export function parseWilmaEligibilityInput(input: unknown): WilmaEligibilityInput {
  return wilmaEligibilityInputSchema.parse(input);
}

export function evaluateWilmaEligibility(
  input: WilmaEligibilityInput,
  evaluatedAt = new Date()
): WilmaEligibilityResult {
  const normalizedInput = parseWilmaEligibilityInput(input);
  const reasons: WilmaEligibilityReason[] = [];
  const hasUnknownAnswer = wilmaEligibilityRequiredFields.some(
    (field) => answerForField(normalizedInput, field) === "unknown"
  );

  for (const rule of eligibilityRules) {
    if (rule.blockingAnswer && answerForField(normalizedInput, rule.field) === rule.blockingAnswer) {
      reasons.push(rule.reason);
    }
  }

  if (reasons.length > 0) {
    return { status: "manual_review", ruleVersion: wilmaEligibilityRuleVersion, reasons, evaluatedAt: evaluatedAt.toISOString() };
  }

  if (hasUnknownAnswer) {
    return {
      status: "needs_information",
      ruleVersion: wilmaEligibilityRuleVersion,
      reasons: [
        {
          code: "missing_eligibility_information",
          message: "Required Wilma eligibility answers are incomplete."
        }
      ],
      evaluatedAt: evaluatedAt.toISOString()
    };
  }

  return {
    status: "likely_eligible_for_document_prep",
    ruleVersion: wilmaEligibilityRuleVersion,
    reasons: [],
    evaluatedAt: evaluatedAt.toISOString()
  };
}
