import "server-only";

import { createRequire } from "node:module";
import type { EngineProfile, PublicJurisdictionProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { getDesignerPublicProfiles } from "@/lib/rcap-engine/profile-registry";

type QuestionLifecyclePhase = NonNullable<PublicQuestion["lifecyclePhase"]>;
type TranslatedProfileQuestion = {
  id: string;
  translations?: {
    es?: {
      prompt?: string;
      helperText?: string;
    };
  };
  optionDisplay?: Record<string, {
    label?: string;
    helperText?: string;
    translations?: {
      es?: {
        label?: string;
        helperText?: string;
      };
    };
  }>;
};
type TranslatedProfile = { questions?: TranslatedProfileQuestion[] };
const require = createRequire(import.meta.url);
const TRANSLATED_PROFILES = require("../expungement-ai/frontend/profiles/all51.json") as Record<string, TranslatedProfile>;

const POSTPAY_STAGES = new Set(["record_readiness", "case_details", "packet_information"]);
const PREPAY_PHASES = new Set<QuestionLifecyclePhase>([
  "prepay_required",
  "prepay_route_splitter",
  "prepay_hard_disqualifier",
  "prepay_timing_gate",
  "prepay_soft_confidence"
]);

const STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS: Record<string, Set<string>> = {
  CA: new Set([
    "ca_prop64_qualifying_marijuana_offense",
    "ca_prop64_lesser_or_no_offense",
    "ca_prop64_branch",
    "ca_prop64_relief_requested"
  ]),
  HI: new Set(["hi_court_order_confirmed"]),
  IN: new Set(["in_prosecutor_consent_confirmed"]),
  MS: new Set(["disposition_date"]),
  NY: new Set([
    "ny_16059_total_eligible_convictions",
    "ny_16059_felony_convictions",
    "ny_16059_ineligible_offense",
    "ny_16059_sex_offender_registration",
    "ny_16059_pending_charge",
    "ny_16059_post_last_conviction_crime",
    "ny_16059_prior_sealing",
    "ny_16058_treatment_program_completed"
  ]),
  WI: new Set([
    "wi_expungement_ordered_at_sentencing",
    "wi_no_probation_jail_prison"
  ])
};
const STATE_SPECIFIC_REQUIRED_PREPAY_FACT_IDS: Record<string, Set<string>> = {
  MS: new Set(["disposition_date"])
};

/**
 * Normalize a question's `options` to the public contract: a non-empty array of strings, or `null`.
 *
 * Some compiled profiles carry `options: ""` (an empty string) for free-text questions such as the
 * "county" prompt. The public contract — and the frontend Zod schema that validates it — require
 * `string[] | null`, so an empty string makes the entire profile fail validation and the screening
 * flow renders the "could not load these questions" error. Coercing any non-array (or empty array)
 * value to `null` keeps real choice lists intact while turning malformed/empty options into the
 * correct "no options" signal for text/number/date questions.
 */
function normalizeQuestionOptions(options: unknown): string[] | null {
  if (Array.isArray(options) && options.length > 0 && options.every((opt) => typeof opt === "string")) {
    return options as string[];
  }
  return null;
}

function questionText(question: PublicQuestion) {
  const options = Array.isArray(question.options) ? question.options.join(" ") : "";
  return `${question.id} ${question.stage} ${question.prompt ?? ""} ${question.helperText ?? ""} ${options}`.toLowerCase();
}

function lifecyclePhaseForQuestion(question: PublicQuestion): QuestionLifecyclePhase {
  if (question.lifecyclePhase) return question.lifecyclePhase;
  const text = questionText(question);

  if (POSTPAY_STAGES.has(question.stage)) {
    if (/patch|psp|sbi|scope report|chr\/scope|criminal[- ]history report|background check|fingerprint|certificate|certified|disposition|judgment|discharge paperwork|court paperwork|records handy|document|report/.test(text)) {
      return "postpay_external_document";
    }
    if (/court|county|docket|case number|case_identifier|case_number|charge|statute|arrest date|filing location/.test(text)) {
      return "postpay_official_form_field";
    }
    return "postpay_packet_field";
  }

  if (question.id === "ownership_scope" || question.id === "jurisdiction_scope") return "prepay_required";
  if (question.id === "case_outcome" || question.id === "offense_level" || question.id === "possible_pathway_context") return "prepay_route_splitter";
  if (/pending|open cases|sex offense|registration|violent|excluded|exclusion|domestic violence|traffick|identity theft|pardon|prior relief|court order|prosecutor consent|qualifying marijuana|lesser or no offense|offense bar|felony convictions|eligible convictions/.test(text)) {
    return "prepay_hard_disqualifier";
  }
  if (/date|time|wait|waiting|finished|completed|sentence|probation|parole|supervision|release|conviction count|branch applies|relief requested/.test(text)) {
    return "prepay_timing_gate";
  }
  if (question.contextOnly === true || question.doesNotSelectPathway === true || question.required === false) return "prepay_soft_confidence";
  return "prepay_required";
}

function isPrepayQuestion(question: PublicQuestion) {
  return PREPAY_PHASES.has(lifecyclePhaseForQuestion(question));
}

function postpayStageForPhase(phase: QuestionLifecyclePhase) {
  if (phase === "postpay_external_document" || phase === "postpay_filing_readiness") return "record_readiness";
  if (phase === "postpay_official_form_field" || phase === "postpay_service_or_mailing") return "case_details";
  return "packet_information";
}

function phaseForWilmaFact(question: PublicQuestion, jurisdictionCode: string): QuestionLifecyclePhase {
  if (STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS[jurisdictionCode]?.has(question.id)) {
    return lifecyclePhaseForQuestion(question);
  }
  const text = questionText(question);
  if (/patch|psp|sbi|scope|chr|fingerprint|certificate|certified|report|document|attachment|court order/.test(text)) return "postpay_external_document";
  if (/fee|restitution|fine|cost|paid|ready/.test(text)) return "postpay_filing_readiness";
  if (/statement|explain|hardship|rehabilitation|manifest|substantial justice/.test(text)) return "postpay_narrative";
  if (/prosecutor|service|mail|agency|custodian|address/.test(text)) return "postpay_service_or_mailing";
  return "postpay_packet_field";
}

function normalizePublicQuestion(question: PublicQuestion, jurisdictionCode: string, source: "designer" | "engine" | "wilma"): PublicQuestion {
  const lifecyclePhase = source === "wilma"
    ? phaseForWilmaFact(question, jurisdictionCode)
    : lifecyclePhaseForQuestion(question);
  const requiredPrepayFact = STATE_SPECIFIC_REQUIRED_PREPAY_FACT_IDS[jurisdictionCode]?.has(question.id) === true;
  const normalized = {
    ...question,
    lifecyclePhase,
    stage: PREPAY_PHASES.has(lifecyclePhase) ? question.stage : postpayStageForPhase(lifecyclePhase),
    options: normalizeQuestionOptions(question.options),
    required: requiredPrepayFact ? true : question.required,
    contextOnly: question.contextOnly === true,
    doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true
  };
  return normalized;
}

function withDisplayTranslations(question: PublicQuestion, jurisdictionCode: string): PublicQuestion {
  const translatedQuestion = TRANSLATED_PROFILES[jurisdictionCode]?.questions?.find((item) => item.id === question.id);
  if (!translatedQuestion) return question;
  const optionDisplay = { ...(question.optionDisplay ?? {}) };
  for (const [option, display] of Object.entries(translatedQuestion.optionDisplay ?? {})) {
    optionDisplay[option] = {
      ...(optionDisplay[option] ?? { label: display.label ?? option }),
      ...(optionDisplay[option]?.helperText ? {} : display.helperText ? { helperText: display.helperText } : {}),
      translations: display.translations
    };
  }
  return {
    ...question,
    translations: translatedQuestion.translations,
    optionDisplay: Object.keys(optionDisplay).length ? optionDisplay : question.optionDisplay
  };
}

function normalizeFlowStages(profile: PublicJurisdictionProfile, questions: PublicQuestion[]) {
  const idsByStage = new Map<string, string[]>();
  for (const question of questions) {
    if (!idsByStage.has(question.stage)) idsByStage.set(question.stage, []);
    idsByStage.get(question.stage)?.push(question.id);
  }
  return profile.flowStages.map((stage) => ({
    ...stage,
    questionIds: [...new Set(idsByStage.get(stage.id) ?? [])]
  }));
}

function postPaymentPacketCompletion(questions: PublicQuestion[]): NonNullable<PublicJurisdictionProfile["postPaymentPacketCompletion"]> {
  const postpay = questions.filter((question) => !isPrepayQuestion(question));
  return {
    requiredPacketCompletionFields: postpay.filter((question) => question.lifecyclePhase === "postpay_packet_field"),
    officialFormFields: postpay.filter((question) => question.lifecyclePhase === "postpay_official_form_field"),
    customPleadingFields: postpay.filter((question) => question.lifecyclePhase === "postpay_custom_pleading_field"),
    externalDocumentChecklist: postpay.filter((question) => question.lifecyclePhase === "postpay_external_document"),
    filingReadinessFields: postpay.filter((question) => question.lifecyclePhase === "postpay_filing_readiness"),
    serviceOrMailingFields: postpay.filter((question) => question.lifecyclePhase === "postpay_service_or_mailing"),
    narrativeFields: postpay.filter((question) => question.lifecyclePhase === "postpay_narrative"),
    optionalFields: postpay.filter((question) => question.lifecyclePhase === "optional_or_later" || question.lifecyclePhase === "prepay_soft_confidence")
  };
}

const WILMA_FACT_QUESTIONS: PublicQuestion[] = [
  {
    id: "disposition_date",
    stage: "timing_and_completion",
    prompt: "What date did the case end or get resolved?",
    helperText: "You can usually find this on the court docket, judgment, dismissal, or disposition record. Use your best court-record date.",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "waiting_rule_id",
    stage: "timing_and_completion",
    prompt: "Which source waiting-period row matches this record?",
    helperText: "Wilma-assisted structured fact from the selected state profile; do not guess.",
    type: "text_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "sentence_completion_actual_date",
    stage: "timing_and_completion",
    prompt: "What date does the record show the sentence was fully completed?",
    helperText: "probation, parole, supervision, treatment, restitution, fines, and community service, if applicable",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "sentence_completion_date",
    stage: "timing_and_completion",
    prompt: "Is the sentence complete, including incarceration, probation, parole, supervision, treatment, and community service?",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "financial_obligations",
    stage: "timing_and_completion",
    prompt: "Are all fines, fees, costs, and restitution listed for this case paid or otherwise satisfied?",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "pending_cases",
    stage: "timing_and_completion",
    prompt: "Does the person currently have any pending criminal charge?",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "release_date",
    stage: "timing_and_completion",
    prompt: "What release date appears in the record?",
    helperText: "use only if the source route measures time from release or incarceration release",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "sentencing_date",
    stage: "timing_and_completion",
    prompt: "What sentencing date appears in the record?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "discharge_date",
    stage: "timing_and_completion",
    prompt: "What discharge date appears in the record?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "last_conviction_date",
    stage: "timing_and_completion",
    prompt: "What is the most recent conviction date shown in the record?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "conviction_date",
    stage: "timing_and_completion",
    prompt: "What exact conviction date appears in the record?",
    helperText: "use only when the source route measures the wait from conviction",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "probation_parole_supervision_end_date",
    stage: "timing_and_completion",
    prompt: "What date did probation, parole, or supervision end?",
    helperText: "use the court or supervision record date; do not estimate",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "new_convictions_during_waiting_period",
    stage: "timing_and_completion",
    prompt: "Does the record show any new conviction during the waiting period?",
    helperText: "Wilma may help locate the fact, but the answer must come from records or the user's confirmed history",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "eligible_conviction_count",
    stage: "timing_and_completion",
    prompt: "How many convictions appear to be in the selected eligible route family?",
    helperText: "structured fact only; Wilma does not decide legal eligibility",
    type: "number_or_range",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "eligible_conviction_class",
    stage: "timing_and_completion",
    prompt: "What offense class or level does the record show for the selected route?",
    helperText: "for example misdemeanor, gross misdemeanor, felony class, or other source label shown in the record",
    type: "text_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "route_family_detail",
    stage: "timing_and_completion",
    prompt: "Which source route family detail does the record support?",
    helperText: "for example petition, automatic, prosecutor restriction, pardon/certificate, dismissal type, or conviction class",
    type: "text_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "special_preconditions_confirmed",
    stage: "timing_and_completion",
    prompt: "Are all source-listed special preconditions confirmed from records?",
    helperText: "answer no or not sure if any required source fact is missing",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "wi_expungement_ordered_at_sentencing",
    stage: "timing_and_completion",
    prompt: "For Wisconsin adult conviction expungement, did the sentencing court order expungement at sentencing?",
    helperText: "CR-266 support is only for records where the sentencing order already included expungement",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "wi_no_probation_jail_prison",
    stage: "timing_and_completion",
    prompt: "For Wisconsin CR-266 support, does the sentencing record show no probation, jail, or prison sentence?",
    helperText: "if probation, jail, or prison was ordered, do not use the narrow CR-266 packet path",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "hi_court_order_confirmed",
    stage: "timing_and_completion",
    prompt: "For a Hawaii HCJDC conviction-expungement application, do you already have a signed Court Order Granting Expungement that you can attach?",
    helperText: "the HCJDC conviction application requires the court order to be attached; without it this is guidance only, not a paid application packet",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_total_eligible_convictions",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, how many total eligible convictions would be included?",
    helperText: "structured fact only; Wilma may help locate convictions but does not decide eligibility",
    type: "number_or_range",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_felony_convictions",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, how many of those convictions are felonies?",
    helperText: "structured fact only; answer from court or criminal-history records",
    type: "number_or_range",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_ineligible_offense",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, does any conviction appear to be a sex offense, Article 263 offense, felony Article 125 offense, violent felony, Class A felony, or ineligible attempt/conspiracy?",
    helperText: "fact collection only; if unsure, route to review before any packet decision",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_sex_offender_registration",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, does the record require sex-offender registration?",
    helperText: "fact collection only; if unsure, route to review before any packet decision",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_pending_charge",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, is any criminal charge currently pending?",
    helperText: "fact collection only; pending charges block the packet route",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_post_last_conviction_crime",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, has there been any crime after the most recent conviction?",
    helperText: "fact collection only; if unsure, route to review before any packet decision",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16059_prior_sealing",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.59, has a prior sealing cap or prior sealing order been identified?",
    helperText: "fact collection only; if unsure, route to review before any packet decision",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ny_16058_treatment_program_completed",
    stage: "timing_and_completion",
    prompt: "For NY CPL 160.58, does the record confirm Article 220/221 or CPL 410.91 treatment, diversion, or DTAP completion?",
    helperText: "fact collection only; CPL 160.58 is not a standalone three-year route",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "in_prosecutor_consent_confirmed",
    stage: "timing_and_completion",
    prompt: "For Indiana higher-felony expungement, is prosecutor consent confirmed?",
    helperText: "fact collection only for IC 35-38-9 higher-felony tiers",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ca_prop64_qualifying_marijuana_offense",
    stage: "timing_and_completion",
    prompt: "For California HSC 11361.8, is the conviction a qualifying marijuana offense?",
    helperText: "structured fact only; Wilma may help locate record facts but does not decide eligibility",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ca_prop64_lesser_or_no_offense",
    stage: "timing_and_completion",
    prompt: "For California HSC 11361.8, would the offense be no offense or a lesser offense under Prop 64/AUMA?",
    helperText: "structured fact only; answer no or not sure if the record does not confirm this",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ca_prop64_branch",
    stage: "timing_and_completion",
    prompt: "Which California HSC 11361.8 branch applies?",
    helperText: "currently-serving petition, completed-sentence application, or automatic/background guidance",
    type: "text_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ca_prop64_relief_requested",
    stage: "timing_and_completion",
    prompt: "For a completed-sentence HSC 11361.8 application, what relief is requested?",
    helperText: "dismissal/sealing, redesignation, or not sure",
    type: "text_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  }
];

function withWilmaFactQuestions(profile: PublicJurisdictionProfile): PublicJurisdictionProfile {
  const existingIds = new Set(profile.questions.map((question) => question.id));
  const additions = WILMA_FACT_QUESTIONS
    .filter((question) => !existingIds.has(question.id))
    .map((question) => normalizePublicQuestion(question, profile.jurisdiction.code, "wilma"));
  if (additions.length === 0) {
    return {
      ...profile,
      flowStages: normalizeFlowStages(profile, profile.questions),
      postPaymentPacketCompletion: postPaymentPacketCompletion(profile.questions)
    };
  }
  const questions = [...profile.questions, ...additions];
  return {
    ...profile,
    postPaymentPacketCompletion: postPaymentPacketCompletion(questions),
    questions,
    flowStages: normalizeFlowStages(profile, questions)
  };
}

export function projectPublicProfile(profile: EngineProfile): PublicJurisdictionProfile {
  const designerProfile = getDesignerPublicProfiles()[profile.jurisdiction.code];
  if (designerProfile) {
    return withWilmaFactQuestions({
      schemaVersion: profile.schemaVersion,
      profileVersion: profile.profileVersion,
      jurisdiction: designerProfile.jurisdiction,
      terminology: {
        primaryConsumerTerm: designerProfile.terminology.primaryConsumerTerm,
        allowedStateTerms: designerProfile.terminology.allowedStateTerms,
        avoidUniversalExpungementLabel: profile.terminology.avoidUniversalExpungementLabel
      },
      flowStages: designerProfile.flowStages.map((stage) => ({
        order: stage.order,
        id: stage.id,
        questionIds: stage.questionIds ?? designerProfile.questions.filter((question) => question.stage === stage.id).map((question) => question.id),
        screenType: stage.screenType
      })),
      questions: designerProfile.questions.map((question) => withDisplayTranslations(normalizePublicQuestion(question, profile.jurisdiction.code, "designer"), profile.jurisdiction.code)),
      caseOutcomeOptions: designerProfile.caseOutcomeOptions,
      copyGuardrails: profile.copyGuardrails
    });
  }

  const questionIds = new Set(profile.questions.map((question) => question.id));
  return withWilmaFactQuestions({
    schemaVersion: profile.schemaVersion,
    profileVersion: profile.profileVersion,
    jurisdiction: profile.jurisdiction,
    terminology: {
      primaryConsumerTerm: profile.terminology.primaryConsumerTerm,
      allowedStateTerms: profile.terminology.allowedStateTerms,
      avoidUniversalExpungementLabel: profile.terminology.avoidUniversalExpungementLabel
    },
    flowStages: profile.flowStages.map((stage) => ({
      order: stage.order,
      id: stage.id,
      questionIds: stage.questionIds?.filter((id) => questionIds.has(id)) ?? profile.questions.filter((question) => question.stage === stage.id).map((question) => question.id),
      screenType: stage.screenType
    })),
    questions: profile.questions.map((question) => withDisplayTranslations(normalizePublicQuestion({
      id: question.id,
      stage: question.stage,
      prompt: question.prompt,
      helperText: question.helperText,
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly === true,
      doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true,
      options: question.options,
      optionDisplay: question.optionDisplay
    }, profile.jurisdiction.code, "engine"), profile.jurisdiction.code)),
    caseOutcomeOptions: profile.caseOutcomeOptions,
    copyGuardrails: profile.copyGuardrails
  });
}
