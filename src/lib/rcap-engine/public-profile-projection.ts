import "server-only";

import type { EngineProfile, PublicJurisdictionProfile } from "@/lib/rcap-engine/contracts";
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

export function projectPublicProfile(profile: EngineProfile): PublicJurisdictionProfile {
  const designerProfile = getDesignerPublicProfiles()[profile.jurisdiction.code];
  if (designerProfile) {
    return {
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
    };
  }

  const questionIds = new Set(profile.questions.map((question) => question.id));
  return {
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
  };
}
