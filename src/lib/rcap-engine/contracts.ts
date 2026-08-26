export type ScreeningResultCode =
  | "packet_ready"
  | "packet_ready_with_caution"
  | "needs_more_info"
  | "not_yet"
  | "guidance_only"
  | "not_covered_yet"
  | "likely_not_eligible"
  | "needs_review"
  | "hard_stop";

export type ScreeningAnswerValue = string | string[] | number | boolean | null;

export type ScreeningEvaluationRequest = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  answers: Record<string, ScreeningAnswerValue>;
  /**
   * The composed-route track id, supplied ONLY by a server-owned selector.
   * The HTTP boundary rejects this field when it appears in a client body: a
   * participant must not be able to name the legal route their own matter is
   * evaluated against. Absent means "no composed route was authoritatively
   * selected".
   */
  selectedTrackId?: string | null;
};

export type ScreeningReason = {
  code: string;
  text: string;
  sourceRef?: string;
};

export type PacketPlanMode =
  | "official_form_overlay_or_source_form_set"
  | "state_specific_custom_packet_from_source_rules"
  | "automatic_relief_verification_and_guidance";

export type FormMappingStatus =
  | "source_candidate_identified"
  | "custom_or_manual_mapping_required"
  | "not_required";

export type ScreeningPacketPlan = {
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
  /** Exact display label resolved from the same compiled profile as pathwayId. */
  pathwayLabel?: string;
  resultCode: ScreeningResultCode;
  userLabel: string;
  reasons: ScreeningReason[];
  missingQuestionIds: string[];
  cautions: string[];
  nextSteps: string[];
  paymentAllowed: boolean;
  packetPlan?: ScreeningPacketPlan;
  /**
   * Set to "component_deferral" when the server-selected composed route has an
   * official-form component that is not supplied. The result is guidance with
   * payment closed; the field exists so every downstream consumer (Briefcase,
   * checkout, render) can recognise the treatment without re-deriving it.
   */
  treatmentClassification?: "component_deferral" | "exact_supported_deferral" | "terminal_treatment_candidate" | null;
  /** The exact server-selected track id, echoed back for persistence. */
  selectedTrackId?: string | null;
  /** Every deferred component id, in route.json order. */
  deferralComponentIds?: string[];
};

export type PublicQuestion = {
  id: string;
  stage: string;
  prompt: string;
  helperText?: string;
  type: string;
  required: boolean;
  contextOnly?: boolean;
  doesNotSelectPathway?: boolean;
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
  options?: unknown;
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

export type PublicJurisdictionProfile = {
  schemaVersion: string;
  profileVersion: string;
  jurisdiction: {
    code: string;
    name: string;
    slug: string;
  };
  terminology: {
    primaryConsumerTerm: string;
    allowedStateTerms: string[];
    avoidUniversalExpungementLabel?: boolean;
  };
  flowStages: Array<{
    order: number;
    id: string;
    questionIds: string[];
    screenType: string;
  }>;
  questions: PublicQuestion[];
  postPaymentPacketCompletion?: {
    requiredPacketCompletionFields: PublicQuestion[];
    officialFormFields: PublicQuestion[];
    customPleadingFields: PublicQuestion[];
    externalDocumentChecklist: PublicQuestion[];
    filingReadinessFields: PublicQuestion[];
    serviceOrMailingFields: PublicQuestion[];
    narrativeFields: PublicQuestion[];
    optionalFields: PublicQuestion[];
  };
  caseOutcomeOptions?: PublicCaseOutcomeOption[];
};

/**
 * The public shape of a case-outcome option. The compiled engine option also carries
 * `candidatePathways` (internal pathway-routing data with no public consumer); it is deliberately
 * not part of this type, so a projection that tried to pass it through would not typecheck.
 */
export type PublicCaseOutcomeOption = {
  value: string;
  label: string;
};

export type EngineProfile = {
  schemaVersion: string;
  profileVersion: string;
  jurisdiction: PublicJurisdictionProfile["jurisdiction"];
  source?: {
    references?: SourceReference[];
    allFolderFiles?: SourceReference[];
    sourceCorpusSha256?: string;
  };
  terminology: PublicJurisdictionProfile["terminology"] & {
    pathwayLabels?: string[];
  };
  flowStages: PublicJurisdictionProfile["flowStages"];
  questions: Array<PublicQuestion & { source?: unknown }>;
  questionLifecycle?: {
    routeConsumers: Record<string, string[]>;
    exactPacketFactIds: string[];
    completionAliasIds: string[];
  };
  caseOutcomeOptions?: unknown[];
  pathways: Array<{
    id: string;
    label: string;
    summary: string;
    sourceRef: string;
    sourceEvidenceRefs?: string[];
    suggestedResultCode?: ScreeningResultCode;
    legalAuthority?: {
      decisionId: string;
      ruleId: string;
      mechanism: string;
      statute: string;
      stage: string;
      outcomeMode: string;
      paymentAuthority: "packet_checkout" | "attorney_review_required" | "closed";
      timing: { kind: string; value?: number; unit?: string; anchorFactId?: string; anchorAlternates?: string[]; anchorText: string };
      requiredFacts: string[];
      screeningFactIds?: string[];
      packetFamily: string | null;
      effectiveFrom?: string;
      supersedes?: { value?: number; unit?: string; note: string };
      notes?: string;
    };
    lawrenceRatification?: {
      status: "ratified_deployable" | "corrected_awaiting_reconfirmation" | "hard_gate_pending" | "hold_guidance";
      packet_capable: boolean;
      payment_allowed_when_engine_confirms: boolean;
      legal_basis: string;
      lawrence_review: string;
    };
  }>;
  orderedDecisionRules: Array<{
    id: string;
    priority: number;
    stage: string;
    when: {
      backendPathwayId?: string;
      requiredFields?: string[];
      fieldsReferenced?: string[];
      caseOutcomes?: string[];
      sourceConditionText?: string;
      duration?: unknown;
      timingAnchorFactId?: string;
      timingAnchorAlternateFactIds?: string[];
    };
    then: {
      suggestedResultCode?: ScreeningResultCode;
      frontendAction?: string;
    };
    sourceRef: string;
    candidatePathwayIds?: string[];
  }>;
  waitingPeriodRules?: unknown[];
  exclusionRules?: unknown[];
  packetGenerator: {
    architecture: string;
    legacyGeneratorAllowed: boolean;
    genericLegalFallbackAllowed: boolean;
    pathways: Array<{
      pathwayId: string;
      pathwayLabel: string;
      mode: PacketPlanMode;
      formCandidates?: SourceReference[];
      formMappingStatus: FormMappingStatus;
      sourceRuleRefs?: string[];
      requiredInputIds?: string[];
    }>;
    requiredInputs: string[];
  };
  copyGuardrails: string[];
  qa?: unknown;
};

export type SourceReference = {
  fileName: string;
  relativePath: string;
  sha256: string;
  sizeBytes?: number;
  kind?: string;
  extension?: string;
};

export type RcapMatterEvaluationInput = ScreeningEvaluationRequest & {
  caseId: string;
};

export type RcapCaseTransition = {
  caseId: string;
  targetStatus:
    | "needs_case_details"
    | "needs_record"
    | "possible_pathway"
    | "possible_exclusion"
    | "unsupported_jurisdiction"
    | "draft_packet_started"
    | "needs_attorney_legal_review"
    | "not_suitable_for_automated_packet"
    | "refile_eligible_after_wait";
  reasonCodes: string[];
};
