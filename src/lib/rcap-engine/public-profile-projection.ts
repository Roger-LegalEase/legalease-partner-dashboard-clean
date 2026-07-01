import "server-only";

import type { EngineProfile, PublicJurisdictionProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { getDesignerPublicProfiles } from "@/lib/rcap-engine/profile-registry";

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

const WILMA_FACT_QUESTIONS: PublicQuestion[] = [
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
  const additions = WILMA_FACT_QUESTIONS.filter((question) => !existingIds.has(question.id));
  if (additions.length === 0) return profile;
  const questions = [...profile.questions, ...additions];
  return {
    ...profile,
    questions,
    flowStages: profile.flowStages.map((stage) => stage.id === "timing_and_completion"
      ? { ...stage, questionIds: [...new Set([...(stage.questionIds ?? []), ...additions.filter((question) => question.stage === "timing_and_completion").map((question) => question.id)])] }
      : stage.id === "state_specific_eligibility"
        ? { ...stage, questionIds: [...new Set([...(stage.questionIds ?? []), ...additions.filter((question) => question.stage === "state_specific_eligibility").map((question) => question.id)])] }
      : stage)
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
      questions: designerProfile.questions.map((question) => ({
        ...question,
        options: normalizeQuestionOptions(question.options),
        contextOnly: question.contextOnly === true,
        doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true
      })),
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
    questions: profile.questions.map((question) => ({
      id: question.id,
      stage: question.stage,
      prompt: question.prompt,
      helperText: question.helperText,
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly === true,
      doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true,
      options: normalizeQuestionOptions(question.options),
      optionDisplay: question.optionDisplay
    })),
    caseOutcomeOptions: profile.caseOutcomeOptions,
    copyGuardrails: profile.copyGuardrails
  });
}
