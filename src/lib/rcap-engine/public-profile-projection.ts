import "server-only";

import type { EngineProfile, PublicJurisdictionProfile } from "@/lib/rcap-engine/contracts";
import { getDesignerPublicProfiles } from "@/lib/rcap-engine/profile-registry";

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
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly === true,
      doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true,
      options: question.options ?? null
    })),
    caseOutcomeOptions: profile.caseOutcomeOptions,
    copyGuardrails: profile.copyGuardrails
  };
}
