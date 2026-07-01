/**
 * TEMPORARY FRONTEND CONTRACT MIRROR
 * ----------------------------------
 * This file is a temporary, frontend-owned mirror of the shared transport contract
 * documented in `00_SHARED_FRONTEND_CONTRACT.md` (and the frontend handoff package at
 * `docs/expungement-ai/frontend-handoff/`). Codex owns the canonical backend contract file
 * while the frontend and backend branches are built in parallel.
 *
 * During integration this file will be replaced with an import from the canonical shared
 * contract after the backend branch lands on `main`. Until then:
 *
 *   - The frontend renders these shapes. It NEVER authors profiles or computes evaluations.
 *   - The engine is the source of truth for legal outcomes and returned values.
 *   - If the live endpoint's response differs from these types, the ENGINE wins: update the
 *     frontend's field reads here, never silently coerce or redesign the contract.
 *
 * Boundary endpoints (wired only in the adapter layer, never elsewhere):
 *   GET  /api/expungement-ai/profiles/{state}  -> JurisdictionProfile
 *   POST /api/expungement-ai/evaluate          -> ScreeningEvaluation
 */

/* ------------------------------------------------------------------ */
/* Jurisdiction profile (GET /profiles/{state})                        */
/* ------------------------------------------------------------------ */

/**
 * Known consumer question types observed across all 51 jurisdiction profiles.
 * The handoff brief enumerated six; the real profile data also uses `text`,
 * `yes_no_unsure`, and `yes_no_prefer_not_to_say`. Treated as an open set:
 * the renderer must handle an unknown type with a calm fallback, never a crash.
 */
export const KNOWN_QUESTION_TYPES = [
  "single_choice",
  "multi_select",
  "date_or_unknown",
  "number_or_range",
  "text",
  "text_or_unknown",
  "yes_no_unsure",
  "yes_no_prefer_not_to_say"
] as const;

export type KnownQuestionType = (typeof KNOWN_QUESTION_TYPES)[number];

/** Open string union: a known type, or any future type the engine introduces. */
export type QuestionType = KnownQuestionType | (string & {});

/**
 * Known flow-stage screen types observed across all 51 profiles. Consumer screens are
 * derived from `flowStages` order. Raw `source_question_*` rows (the engine's evaluation
 * surface) are never rendered as consumer screens.
 */
export const KNOWN_SCREEN_TYPES = [
  "question_sequence",
  "conditional_question_sequence",
  "record_help_or_question",
  "form_fields",
  "progress_transition",
  "result_card",
  "state_packet_form",
  "checkout",
  "status",
  "matter_timeline"
] as const;

export type KnownScreenType = (typeof KNOWN_SCREEN_TYPES)[number];
export type ScreenType = KnownScreenType | (string & {});

export type JurisdictionRef = {
  code: string;
  name: string;
  slug: string;
};

export type ProfileTerminology = {
  primaryConsumerTerm: string;
  allowedStateTerms: string[];
};

export type FlowStage = {
  order: number;
  id: string;
  screenType: ScreenType;
};

export type ProfileQuestion = {
  id: string;
  stage: string;
  prompt: string;
  helperText?: string;
  type: QuestionType;
  required: boolean;
  /**
   * Context/pathway questions are optional and non-routing: rendered as optional, labeled so
   * they clearly do not decide the result, never blocking Continue, and never selecting the
   * pathway.
   */
  contextOnly: boolean;
  lifecyclePhase?:
    | "prepay_required"
    | "prepay_route_splitter"
    | "prepay_hard_disqualifier"
    | "prepay_timing_gate"
    | "prepay_soft_confidence"
    | "postpay_packet_field"
    | "postpay_official_form_field"
    | "postpay_custom_pleading_field"
    | "postpay_external_document"
    | "postpay_filing_readiness"
    | "postpay_narrative"
    | "postpay_service_or_mailing"
    | "optional_or_later"
    | "guidance_only";
  /** Present (non-empty) only for `single_choice` and `multi_select` in the source data. */
  options: string[] | null;
  /** Optional presentation-only labels keyed by the unchanged option value. */
  optionDisplay?: Record<string, {
    label: string;
    helperText?: string;
    translations?: {
      es?: {
        label?: string;
        helperText?: string;
      };
    };
  }>;
  translations?: {
    es?: {
      prompt?: string;
      helperText?: string;
    };
  };
};

export type JurisdictionProfile = {
  jurisdiction: JurisdictionRef;
  profileVersion: string;
  terminology: ProfileTerminology;
  flowStages: FlowStage[];
  questions: ProfileQuestion[];
  postPaymentPacketCompletion?: {
    requiredPacketCompletionFields: ProfileQuestion[];
    officialFormFields: ProfileQuestion[];
    customPleadingFields: ProfileQuestion[];
    externalDocumentChecklist: ProfileQuestion[];
    filingReadinessFields: ProfileQuestion[];
    serviceOrMailingFields: ProfileQuestion[];
    narrativeFields: ProfileQuestion[];
    optionalFields: ProfileQuestion[];
  };
};

/* ------------------------------------------------------------------ */
/* Evaluation (POST /evaluate)                                         */
/* ------------------------------------------------------------------ */

/**
 * UI-side answer value held in component state while the user fills the flow. `{ value, unknown }`
 * models the "or unknown" / "prefer not to say" affordances on the open field types. This is the
 * frontend's working shape; it is converted to the wire shape (`ScreeningAnswerValue`) before the
 * request is sent (see `toScreeningAnswers`).
 */
export type AnswerValue =
  | string
  | string[]
  | number
  | { value?: string | number | null; unknown?: boolean }
  | null;

/**
 * The wire answer value the engine accepts (matches `ScreeningAnswerValue` in
 * `src/lib/rcap-engine/contracts.ts`). The engine stringifies values for routing; "unknown"
 * affordances are sent as a recognizable non-empty token, never an object.
 */
export type ScreeningAnswerValue = string | string[] | number | boolean | null;

/**
 * The frozen evaluate request shape (matches the engine's `ScreeningEvaluationRequest`).
 *   POST /api/expungement-ai/evaluate
 */
export type EvaluateRequest = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  answers: Record<string, ScreeningAnswerValue>;
};

/** The nine result codes. The engine returns exactly one; the frontend renders it. */
export const RESULT_CODES = [
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
] as const;

export type ResultCode = (typeof RESULT_CODES)[number];

/** The only two result codes for which payment may ever be allowed. */
export const PAYMENT_ELIGIBLE_RESULT_CODES = [
  "packet_ready",
  "packet_ready_with_caution"
] as const satisfies readonly ResultCode[];

export type EvaluationReason = {
  code: string;
  text: string;
  sourceRef?: string;
};

export const PACKET_PLAN_MODES = [
  "official_form_overlay_or_source_form_set",
  "state_specific_custom_packet_from_source_rules",
  "automatic_relief_verification_and_guidance"
] as const;

export type PacketPlanMode = (typeof PACKET_PLAN_MODES)[number];

export const FORM_MAPPING_STATUSES = [
  "source_candidate_identified",
  "custom_or_manual_mapping_required",
  "not_required"
] as const;

export type FormMappingStatus = (typeof FORM_MAPPING_STATUSES)[number];

export type PacketPlan = {
  pathwayId: string;
  mode: PacketPlanMode;
  formMappingStatus: FormMappingStatus;
  sourceFormIds: string[];
  requiredInputIds: string[];
  sourceRuleRefs: string[];
};

export type ScreeningEvaluation = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  pathwayId?: string;
  resultCode: ResultCode;
  userLabel: string;
  reasons: EvaluationReason[];
  missingQuestionIds: string[];
  cautions: string[];
  nextSteps: string[];
  paymentAllowed: boolean;
  packetPlan?: PacketPlan;
};

/* ------------------------------------------------------------------ */
/* Payment-visibility guard (single source of truth for the UI gate)   */
/* ------------------------------------------------------------------ */

/**
 * The checkout / generate-packet path is shown ONLY when the engine returned
 * `paymentAllowed === true`, which is only ever valid for the two packet-ready codes.
 * This double-checks the result code so a malformed `paymentAllowed: true` on any other
 * code can never open the pay gate. The server is assumed to enforce this too; the client
 * is never the sole gate.
 */
export function isPaymentAllowed(
  evaluation: Pick<ScreeningEvaluation, "resultCode" | "paymentAllowed">
): boolean {
  return (
    evaluation.paymentAllowed === true &&
    (PAYMENT_ELIGIBLE_RESULT_CODES as readonly string[]).includes(evaluation.resultCode)
  );
}

/* ------------------------------------------------------------------ */
/* Compile-time reconciliation with the canonical engine contract      */
/* ------------------------------------------------------------------ */

/**
 * The engine's canonical contract now lives on `main` at `src/lib/rcap-engine/contracts.ts`.
 * These type-only checks fail the build if this frontend mirror drifts from it, so the mirror
 * stays honest until it can be replaced by a direct import. (Type-only import: erased at runtime,
 * safe in the client bundle.)
 */
import type {
  ScreeningEvaluation as EngineScreeningEvaluation,
  ScreeningEvaluationRequest as EngineScreeningEvaluationRequest
} from "@/lib/rcap-engine/contracts";

type Expect<T extends true> = T;
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Exported so they count as "used"; their only purpose is to fail typecheck on contract drift.
export type EvaluationMatchesEngine = Expect<MutuallyAssignable<ScreeningEvaluation, EngineScreeningEvaluation>>;
export type RequestMatchesEngine = Expect<MutuallyAssignable<EvaluateRequest, EngineScreeningEvaluationRequest>>;
