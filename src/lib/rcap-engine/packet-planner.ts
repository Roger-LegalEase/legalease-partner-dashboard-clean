import "server-only";

import type { EngineProfile, ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";

export function packetPlanForPathway(profile: EngineProfile, pathwayId: string): ScreeningPacketPlan | undefined {
  const plan = profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === pathwayId);
  if (!plan) return undefined;

  return {
    pathwayId,
    mode: plan.mode,
    formMappingStatus: plan.formMappingStatus,
    sourceFormIds: (plan.formCandidates ?? []).map((candidate) => `${profile.jurisdiction.code}:${candidate.relativePath}:${candidate.sha256}`),
    requiredInputIds: plan.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? [],
    sourceRuleRefs: plan.sourceRuleRefs ?? []
  };
}

export function isPacketPlanFulfillmentReady(plan: ScreeningPacketPlan | undefined) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}
