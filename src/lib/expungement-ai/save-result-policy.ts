/**
 * Pure mapping/validation for saving a completed screening result to the Briefcase.
 *
 * SAFETY: this decides nothing about eligibility, packets, or payment. It maps an already-computed
 * engine result onto a Briefcase create-input, and enforces two product rules:
 *   - RCAP partner sessions never carry a payment gate (paymentAllowed is forced false).
 *   - Raw screening answers are never part of the saved shape (only the result is stored).
 *
 * No server-only or Next imports here so it stays unit-testable.
 */
import type {
  ConsumerBriefcaseItem,
  ConsumerMatterStatus,
  CreateConsumerBriefcaseItemInput,
  ExpungementAiEligibilityResult,
  ExpungementAiResultCode
} from "@/lib/expungement-ai/types";

const RESULT_CODES: ExpungementAiResultCode[] = [
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
];

const PACKET_TYPES: NonNullable<ExpungementAiEligibilityResult["packetType"]>[] = [
  "official_pdf_overlay",
  "custom_pleading",
  "legacy_packet",
  "guidance_packet"
];

export function isStorableResultCode(value: unknown): value is ExpungementAiResultCode {
  return typeof value === "string" && (RESULT_CODES as string[]).includes(value);
}

export function normalizePacketType(value: unknown): ExpungementAiEligibilityResult["packetType"] | undefined {
  return typeof value === "string" && (PACKET_TYPES as string[]).includes(value)
    ? (value as ExpungementAiEligibilityResult["packetType"])
    : undefined;
}

/** Same mapping the engine adapter uses; duplicated here so this module stays import-light. */
export function statusForResultCode(resultCode: ExpungementAiResultCode): ConsumerMatterStatus {
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "packet_ready";
  if (resultCode === "guidance_only" || resultCode === "not_covered_yet") return "guidance_saved";
  if (resultCode === "needs_more_info") return "needs_info";
  if (resultCode === "needs_review") return "needs_review";
  if (resultCode === "not_yet") return "waiting";
  if (resultCode === "likely_not_eligible") return "not_eligible";
  return "hard_stop";
}

/** RCAP partner sessions are sponsored: the consumer is never asked to pay here. */
export function resolveSavePaymentAllowed(isPartnerSession: boolean, evaluationPaymentAllowed: boolean): boolean {
  return isPartnerSession ? false : evaluationPaymentAllowed;
}

export type SaveScreeningResultPayload = {
  userId: string;
  jurisdiction: string;
  resultCode: ExpungementAiResultCode;
  pathwayLabel?: string;
  packetType?: ExpungementAiEligibilityResult["packetType"];
  paymentAllowed: boolean;
  summary: string;
  nextSteps: string[];
  sourceSessionId?: string;
};

/**
 * Build the Briefcase create-input from a completed result. Note what is intentionally absent:
 * the screening answers. Only the result and its plain next steps are persisted.
 */
export function buildSaveInput(
  payload: SaveScreeningResultPayload,
  context: { isPartnerSession: boolean }
): CreateConsumerBriefcaseItemInput {
  const paymentAllowed = resolveSavePaymentAllowed(context.isPartnerSession, payload.paymentAllowed);
  return {
    userId: payload.userId,
    itemType: "result",
    jurisdiction: payload.jurisdiction,
    pathwayLabel: payload.pathwayLabel,
    resultCode: payload.resultCode,
    packetType: payload.packetType,
    paymentAllowed,
    status: statusForResultCode(payload.resultCode),
    summary: payload.summary,
    nextSteps: payload.nextSteps,
    paymentStatus: paymentAllowed ? "unpaid" : "not_applicable",
    sourceSessionId: payload.sourceSessionId
  };
}

/** Duplicate protection: find an already-saved matter for this screening session. */
export function findItemForSession(
  items: ConsumerBriefcaseItem[],
  sourceSessionId: string | undefined
): ConsumerBriefcaseItem | null {
  if (!sourceSessionId) return null;
  return items.find((item) => item.sourceSessionId === sourceSessionId) ?? null;
}
