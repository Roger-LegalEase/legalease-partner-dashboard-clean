/**
 * Runtime validation for the frontend contract (see `./contracts.ts`).
 *
 * Safety constraint: treat all profile and evaluation data as UNTRUSTED input. Validate it
 * before rendering, handle missing/unknown fields with a calm error state, and never turn
 * malformed data into a packet-ready or payment-allowed state.
 *
 * Design choices:
 *   - `type` / `screenType` are validated as non-empty strings (open sets), not enums, so an
 *     unfamiliar future type degrades gracefully in the renderer instead of failing the whole
 *     profile. The renderer decides how to handle an unknown type.
 *   - `resultCode` and the packet-plan enums ARE validated as closed enums: an unknown result
 *     code or packet mode is a real contract violation and must surface as an error, never be
 *     guessed.
 *   - `.passthrough()` keeps unknown object keys instead of stripping them, so the engine can
 *     add fields without breaking validation here.
 *
 * Uses the repo's existing `zod` dependency (v4). No new validation dependency is added.
 */
import { z } from "zod";

import {
  FORM_MAPPING_STATUSES,
  PACKET_PLAN_MODES,
  RESULT_CODES,
  type EvaluateRequest,
  type JurisdictionProfile,
  type ScreeningEvaluation,
  type ScreeningProgress,
  type ScreeningProgressRequest
} from "./contracts";

/* ------------------------------------------------------------------ */
/* Jurisdiction profile                                                */
/* ------------------------------------------------------------------ */

export const jurisdictionRefSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1)
  })
  .passthrough();

export const profileTerminologySchema = z
  .object({
    primaryConsumerTerm: z.string().min(1),
    allowedStateTerms: z.array(z.string())
  })
  .passthrough();

export const flowStageSchema = z
  .object({
    order: z.number(),
    id: z.string().min(1),
    screenType: z.string().min(1)
  })
  .passthrough();

export const profileQuestionSchema = z
  .object({
    id: z.string().min(1),
    stage: z.string().min(1),
    prompt: z.string().min(1),
    helperText: z.string().optional(),
    multiline: z.boolean().optional(),
    contactContext: z.object({ representation: z.string(), defendantName: z.string(), county: z.string() }).strict().optional(),
    answerContract: z.enum(["ca_prop64_contacts_v1", "ca_prop64_record_fact_v1", "ca_prop64_decimal_grams_v1", "ca_prop64_caption_fact_v1", "ny_16059_packet_text_v1", "ny_16059_case_records_v2", "ny_16059_applicant_statement_v1", "ny_16059_case_court_text_v1"]).optional(),
    caseRecordReferences: z.object({ firstCaseNumbers: z.string().optional(), additionalCaseNumbers: z.string().optional() }).strict().optional(),
    legacyAnswerText: z.string().optional(),
    savedAnswerNeedsClarification: z.boolean().optional(),
    type: z.string().min(1),
    required: z.boolean(),
    contextOnly: z.boolean(),
    options: z.array(z.string()).nullable(),
    exclusiveOptions: z.array(z.string()).optional(),
    optionDisplay: z.record(z.string(), z.object({
      label: z.string().min(1),
      helperText: z.string().optional(),
      translations: z.object({ es: z.object({ label: z.string().optional(), helperText: z.string().optional() }).passthrough().optional() }).passthrough().optional()
    }).passthrough()).optional(),
    translations: z.object({ es: z.object({ prompt: z.string().optional(), helperText: z.string().optional() }).passthrough().optional() }).passthrough().optional()
  })
  .passthrough()
  .refine((question) => !question.answerContract || question.answerContract === "ca_prop64_record_fact_v1" && question.type === "text_or_unknown"
    && ["court", "charge"].includes(question.id)
    || question.answerContract === "ca_prop64_decimal_grams_v1" && question.type === "number_or_range"
      && ["ca_prop64_flower_grams", "ca_prop64_concentrate_grams"].includes(question.id)
    || question.answerContract === "ca_prop64_caption_fact_v1" && question.type === "text_or_unknown"
      && ["participant_full_legal_name", "ca_prop64_court_case_number", "ca_prop64_filing_court_county"].includes(question.id)
    || question.answerContract === "ny_16059_packet_text_v1" && question.type === "text_or_unknown"
      && ["ny_16059_first_case_numbers", "ny_16059_additional_case_numbers", "ny_16059_case_alias_names", "ny_16059_nysid_number", "ny_16059_future_case_numbers", "ny_16059_future_court"].includes(question.id)
    || question.answerContract === "ca_prop64_contacts_v1" && question.type === "filing_contact" && ["ca_prop64_filer_contact", "ca_prop64_court_address"].includes(question.id)
    || question.answerContract === "ny_16059_case_records_v2" && question.id === "ny_16059_covered_case_records" && question.type === "court_case_records"
    || question.answerContract === "ny_16059_applicant_statement_v1" && question.id === "ny_16059_applicant_statement" && question.type === "text_or_unknown" && question.multiline === true
    || question.answerContract === "ny_16059_case_court_text_v1" && ["ny_16059_other_filing_court_name", "ny_16059_other_filing_court_county", "ny_16059_court_direction_issuer", "ny_16059_court_direction_date_reference", "ny_16059_court_direction_instruction"].includes(question.id) && question.type === "text_or_unknown", "Invalid scoped answer contract")
  .refine(question => !question.contactContext || question.answerContract === "ca_prop64_contacts_v1" && question.type === "filing_contact" && ["ca_prop64_filer_contact", "ca_prop64_court_address"].includes(question.id), "Invalid contact context")
  .refine(question => !question.caseRecordReferences || question.answerContract === "ny_16059_case_records_v2" && question.id === "ny_16059_covered_case_records" && question.type === "court_case_records", "Invalid case references")
  .refine((question) => question.legacyAnswerText === undefined || question.answerContract === "ca_prop64_record_fact_v1"
    || question.id === "sentence_completion_date" && question.type === "yes_no_unsure", "Invalid scoped legacy-answer display");

export const jurisdictionProfileSchema = z
  .object({
    jurisdiction: jurisdictionRefSchema,
    profileVersion: z.string().min(1),
    terminology: profileTerminologySchema,
    flowStages: z.array(flowStageSchema).min(1),
    questions: z.array(profileQuestionSchema)
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/* Evaluation request + response                                       */
/* ------------------------------------------------------------------ */

// Wire answer value the engine accepts (ScreeningAnswerValue).
export const screeningAnswerValueSchema: z.ZodType = z.union([
  z.string(),
  z.array(z.string()),
  z.number(),
  z.boolean(),
  z.null()
]);

export const evaluateRequestSchema = z
  .object({
    jurisdiction: z.string().min(1),
    profileVersion: z.string().min(1),
    matterId: z.string().min(1),
    answers: z.record(z.string(), screeningAnswerValueSchema)
  })
  .passthrough();

export const screeningProgressRequestSchema = evaluateRequestSchema.omit({ matterId: true });
export const screeningProgressSchema = z.object({
  jurisdiction: z.string().min(1),
  profileVersion: z.string().min(1),
  questionIds: z.array(z.string())
}).strict();

export const evaluationReasonSchema = z
  .object({
    code: z.string().min(1),
    text: z.string().min(1),
    sourceRef: z.string().optional()
  })
  .passthrough();

export const packetPlanSchema = z
  .object({
    pathwayId: z.string().min(1),
    mode: z.enum(PACKET_PLAN_MODES),
    formMappingStatus: z.enum(FORM_MAPPING_STATUSES),
    sourceFormIds: z.array(z.string()),
    requiredInputIds: z.array(z.string()),
    sourceRuleRefs: z.array(z.string())
  })
  .passthrough();

export const screeningEvaluationSchema = z
  .object({
    jurisdiction: z.string().min(1),
    profileVersion: z.string().min(1),
    matterId: z.string().min(1),
    pathwayId: z.string().optional(),
    pathwayLabel: z.string().min(1).optional(),
    resultCode: z.enum(RESULT_CODES),
    userLabel: z.string().min(1),
    reasons: z.array(evaluationReasonSchema),
    missingQuestionIds: z.array(z.string()),
    cautions: z.array(z.string()),
    nextSteps: z.array(z.string()),
    paymentAllowed: z.boolean(),
    consumerPacketAvailable: z.boolean().optional(),
    sponsoredPacketAvailable: z.boolean().optional(),
    packetPlan: packetPlanSchema.optional()
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/* Parse helpers (calm success/error, never throw to the renderer)     */
/* ------------------------------------------------------------------ */

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function formatError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

export function parseJurisdictionProfile(input: unknown): ParseResult<JurisdictionProfile> {
  const parsed = jurisdictionProfileSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data as JurisdictionProfile };
  }
  return { ok: false, error: formatError(parsed.error) };
}

export function parseScreeningEvaluation(input: unknown): ParseResult<ScreeningEvaluation> {
  const parsed = screeningEvaluationSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data as ScreeningEvaluation };
  }
  return { ok: false, error: formatError(parsed.error) };
}

export function parseEvaluateRequest(input: unknown): ParseResult<EvaluateRequest> {
  const parsed = evaluateRequestSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data as EvaluateRequest };
  }
  return { ok: false, error: formatError(parsed.error) };
}

export function parseScreeningProgressRequest(input: unknown): ParseResult<ScreeningProgressRequest> {
  const parsed = screeningProgressRequestSchema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data as ScreeningProgressRequest }
    : { ok: false, error: formatError(parsed.error) };
}

export function parseScreeningProgress(input: unknown): ParseResult<ScreeningProgress> {
  const parsed = screeningProgressSchema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data as ScreeningProgress }
    : { ok: false, error: formatError(parsed.error) };
}
