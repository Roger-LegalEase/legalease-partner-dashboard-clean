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
  resultCode: ScreeningResultCode;
  userLabel: string;
  reasons: ScreeningReason[];
  missingQuestionIds: string[];
  cautions: string[];
  nextSteps: string[];
  paymentAllowed: boolean;
  packetPlan?: ScreeningPacketPlan;
};

export type PublicQuestion = {
  id: string;
  stage: string;
  prompt: string;
  type: string;
  required: boolean;
  contextOnly?: boolean;
  doesNotSelectPathway?: boolean;
  options?: unknown;
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
  caseOutcomeOptions?: unknown[];
  copyGuardrails: string[];
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
  caseOutcomeOptions?: unknown[];
  pathways: Array<{
    id: string;
    label: string;
    summary: string;
    sourceRef: string;
    sourceEvidenceRefs?: string[];
    suggestedResultCode?: ScreeningResultCode;
  }>;
  orderedDecisionRules: Array<{
    id: string;
    priority: number;
    stage: string;
    when: {
      fieldsReferenced?: string[];
      caseOutcomes?: string[];
      sourceConditionText?: string;
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
