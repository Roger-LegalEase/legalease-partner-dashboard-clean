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
  type ScreeningEvaluation
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
    type: z.string().min(1),
    required: z.boolean(),
    contextOnly: z.boolean(),
    options: z.array(z.string()).nullable()
  })
  .passthrough();

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
    resultCode: z.enum(RESULT_CODES),
    userLabel: z.string().min(1),
    reasons: z.array(evaluationReasonSchema),
    missingQuestionIds: z.array(z.string()),
    cautions: z.array(z.string()),
    nextSteps: z.array(z.string()),
    paymentAllowed: z.boolean(),
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
