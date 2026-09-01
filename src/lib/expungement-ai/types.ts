export type ExpungementAiResultCode =
  | "packet_ready"
  | "packet_ready_with_caution"
  | "needs_more_info"
  | "not_yet"
  | "guidance_only"
  | "not_covered_yet"
  | "likely_not_eligible"
  | "needs_review"
  | "hard_stop";

export type ExpungementAiEligibilityResult = {
  resultCode: ExpungementAiResultCode;
  userLabel: string;
  state: string;
  pathwayLabel?: string;
  confidence: "high" | "medium" | "low" | "blocked";
  paymentAllowed: boolean;
  priceCents?: 5000;
  packetType?: "official_pdf_overlay" | "custom_pleading" | "legacy_packet" | "guidance_packet";
  reasons: string[];
  missingInfo?: string[];
  nextSteps: string[];
  emailCaptureRecommended: boolean;
  reminderRecommended?: boolean;
  disclaimer: string;
  briefcaseItemId?: string;
  /**
   * Server-authored composed-route identity and component-deferral treatment.
   * Present only when the server itself selected an affected composed route;
   * never populated from a client body.
   */
  selectedTrackId?: string | null;
  treatmentClassification?: "component_deferral" | "exact_supported_deferral" | "terminal_treatment_candidate" | null;
  deferralComponentIds?: string[];
  /**
   * The localized participant treatment for a deferred route, assembled by the
   * guidance registry. Typed as a record here so this module stays free of
   * server-only imports.
   */
  componentDeferralTreatment?: Record<string, unknown>;
};

export type ConsumerMatterStatus =
  | "check_saved"
  | "guidance_saved"
  | "packet_ready"
  | "needs_info"
  | "needs_review"
  | "waiting"
  | "not_eligible"
  | "hard_stop";

export type PacketVerificationSnapshot = {
  schemaVersion: "expungement-ai/final-verification/v1";
  verifiedAt: string;
  jurisdiction: string;
  profileVersion: string;
  profileSourceFingerprint: string | null;
  profileAuthorityFingerprint: string;
  pathwayId: string | null;
  resultCode: ExpungementAiResultCode | null;
  paymentAllowed: boolean;
  packetType: ExpungementAiEligibilityResult["packetType"] | null;
  packetPlan: Record<string, unknown> | null;
  requiredInputIds: string[];
  packetFamilyIdentifiers: {
    mode: string | null;
    sourceFormIds: string[];
  };
  selectedTrackId: string | null;
  treatmentClassification: ConsumerBriefcaseItem["treatmentClassification"] | null;
  deferralComponentIds: string[];
  screeningAnswers: Record<string, unknown>;
  packetAnswers: Record<string, unknown>;
  serverFacts: Record<string, unknown>;
  prefilledAnswers: Record<string, unknown>;
  dependencies: {
    commercialFlowVersion: number | null;
    entitlementSource: string | null;
    productId: string | null;
  };
};

export type PacketVerificationRecord = {
  status: "unverified" | "verified" | "invalidated";
  reason: string;
  hash?: string;
  snapshot?: PacketVerificationSnapshot;
  invalidatedAt?: string;
};

export type ConsumerBriefcaseItem = {
  id: string;
  type: "eligibility_check" | "result" | "packet" | "wilma_conversation";
  title: string;
  state: string;
  /**
   * A stored projection of the matter's milestone, kept for query shape and the
   * database check constraint. It is NOT the authority for what the participant
   * is shown or allowed to do.
   *
   * Contract Phase 3 -- the Briefcase derives status from the matter and its
   * verification, entitlement, render and artifact relationships.
   * `humanMatterState()` and `matterCareState()` are that derivation, and both
   * read the result code, the artifact, the packet draft and the payment state
   * rather than this column. Nothing may re-route commercial or packet authority
   * back through it; `scripts/verify-canonical-matter-authority.mjs` fails if
   * anything tries.
   */
  status: ConsumerMatterStatus;
  resultCode?: ExpungementAiResultCode;
  createdAt: string;
  summary: string;
  nextSteps: string[];
  paymentAllowed: boolean;
  pathwayLabel?: string;
  packetType?: ExpungementAiEligibilityResult["packetType"];
  artifactRefs?: Record<string, unknown>;
  /**
   * Server-authored composed-route identity. Never accepted from a client
   * body; written only from an evaluation the server itself produced. Stored
   * inside the existing artifact_refs_json column, so no migration is added
   * for metadata.
   */
  selectedTrackId?: string | null;
  treatmentClassification?: "component_deferral" | "exact_supported_deferral" | "terminal_treatment_candidate" | null;
  deferralComponentIds?: string[];
  paymentStatus?: "not_applicable" | "unpaid" | "paid" | "refunded";
  paymentProvider?: "stripe" | "dry_run";
  checkoutSessionId?: string;
  paymentIntentId?: string;
  amountCents?: 5000;
  packetStatus?: "not_started" | "pending" | "generating" | "ready" | "failed" | "downloaded";
  reminderAt?: string;
  sourceSessionId?: string;
};

export type CreateConsumerBriefcaseItemInput = {
  userId: string;
  itemType: ConsumerBriefcaseItem["type"];
  jurisdiction: string;
  pathwayLabel?: string;
  resultCode?: ExpungementAiResultCode;
  packetType?: ExpungementAiEligibilityResult["packetType"];
  paymentAllowed: boolean;
  status: ConsumerMatterStatus;
  summary: string;
  nextSteps: string[];
  artifactRefs?: Record<string, unknown>;
  /** Server-authored only; persisted inside the existing artifact_refs_json column. */
  selectedTrackId?: string | null;
  treatmentClassification?: "component_deferral" | "exact_supported_deferral" | "terminal_treatment_candidate" | null;
  deferralComponentIds?: string[];
  paymentStatus?: ConsumerBriefcaseItem["paymentStatus"];
  paymentProvider?: ConsumerBriefcaseItem["paymentProvider"];
  checkoutSessionId?: string;
  paymentIntentId?: string;
  amountCents?: 5000;
  receiptUrl?: string;
  packetStatus?: ConsumerBriefcaseItem["packetStatus"];
  reminderAt?: string;
  sourceSessionId?: string;
};

export type ExpungementAiCheckInput = {
  state: string;
  profileVersion?: string;
  matterId?: string;
  answers?: Record<string, string | string[] | number | boolean | null>;
  pathwayLabel?: string;
};
